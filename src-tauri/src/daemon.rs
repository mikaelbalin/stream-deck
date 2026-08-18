use std::sync::{Arc, Mutex};
use std::time::Duration;

use elgato_streamdeck::info::Kind;
use elgato_streamdeck::{AsyncStreamDeck, StreamDeckInput};
use hidapi::HidApi;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::unix::OwnedWriteHalf;
use tokio::net::{UnixListener, UnixStream};
use tokio::sync::broadcast;

use crate::bindings::binding_for_pedal;
use crate::ipc::{socket_path, DaemonEvent};
use crate::keyboard::Keyboard;

/// Info about a freshly connected device, used to build a `DaemonEvent::Connected`.
#[derive(Clone)]
struct ConnectedInfo {
    kind: String,
    serial: String,
    firmware: Option<String>,
}

/// Current daemon state, shared with the accept loop for client snapshots.
#[derive(Clone, Default)]
struct DaemonState {
    connected: Option<ConnectedInfo>,
    buttons: [bool; 3],
}

/// Runs the headless daemon: reads the Pedal, emulates key bindings via uinput,
/// and broadcasts state events to GUI clients over a Unix domain socket.
pub async fn run() -> Result<(), String> {
    let hidapi = elgato_streamdeck::new_hidapi().map_err(|e| e.to_string())?;
    let mut keyboard = match Keyboard::new() {
        Ok(k) => Some(k),
        Err(e) => {
            eprintln!("warning: keyboard emulation unavailable: {e}");
            None
        }
    };

    let (tx, _rx) = broadcast::channel::<DaemonEvent>(16);
    let state = Arc::new(Mutex::new(DaemonState::default()));

    // Remove any stale socket left by a previous run, then bind.
    let path = socket_path();
    let _ = std::fs::remove_file(&path);
    let listener = UnixListener::bind(&path).map_err(|e| e.to_string())?;
    eprintln!("daemon: listening on {}", path.display());
    tokio::spawn(accept_loop(listener, tx.clone(), state.clone()));

    let mut device: Option<AsyncStreamDeck> = None;

    loop {
        let current = device.take();
        match current {
            Some(d) => match d.read_input(30.0).await {
                Ok(StreamDeckInput::ButtonStateChange(buttons)) => {
                    let changes = {
                        let mut st = state.lock().unwrap();
                        let mut changes = Vec::new();
                        for index in 0..buttons.len().min(st.buttons.len()) {
                            let new = buttons[index];
                            let old = st.buttons[index];
                            if new != old {
                                st.buttons[index] = new;
                                changes.push((index as u8, new));
                            }
                        }
                        changes
                    };

                    for (pedal, pressed) in changes {
                        if pressed {
                            let _ = tx.send(DaemonEvent::ButtonDown { pedal });
                            emulate(&mut keyboard, pedal, true);
                        } else {
                            let _ = tx.send(DaemonEvent::ButtonUp { pedal });
                            emulate(&mut keyboard, pedal, false);
                        }
                    }

                    device = Some(d);
                }
                Ok(_) => {
                    device = Some(d);
                }
                Err(_) => {
                    eprintln!("daemon: device disconnected");
                    {
                        let mut st = state.lock().unwrap();
                        st.connected = None;
                        st.buttons = [false; 3];
                    }
                    let _ = tx.send(DaemonEvent::Disconnected);
                }
            },
            None => {
                if let Some(serial) = find_pedal_serial(&hidapi) {
                    match connect(&hidapi, &serial).await {
                        Ok((d, info)) => {
                            eprintln!("daemon: connected {} (serial {})", info.kind, info.serial);
                            {
                                let mut st = state.lock().unwrap();
                                st.connected = Some(info.clone());
                                st.buttons = [false; 3];
                            }
                            let _ = tx.send(DaemonEvent::Connected {
                                kind: info.kind,
                                serial: info.serial,
                                firmware: info.firmware,
                            });
                            device = Some(d);
                        }
                        Err(_) => {
                            // Keep polling; the device may not be ready yet.
                        }
                    }
                }

                tokio::time::sleep(Duration::from_millis(500)).await;
            }
        }
    }
}

/// Emulates a key press or release for the given pedal's binding.
fn emulate(keyboard: &mut Option<Keyboard>, pedal: u8, pressed: bool) {
    let Some(binding) = binding_for_pedal(pedal) else {
        return;
    };
    let Some(keys) = binding.to_key_codes() else {
        return;
    };
    let Some(kb) = keyboard.as_mut() else {
        return;
    };

    if pressed {
        let _ = kb.press(&keys);
    } else {
        let _ = kb.release(&keys);
    }
}

/// Returns the serial number of the first connected Stream Deck Pedal, if any.
fn find_pedal_serial(hidapi: &HidApi) -> Option<String> {
    elgato_streamdeck::list_devices(hidapi)
        .into_iter()
        .find(|(kind, _)| *kind == Kind::Pedal)
        .map(|(_, serial)| serial)
}

/// Connects to a Stream Deck Pedal by serial number.
async fn connect(
    hidapi: &HidApi,
    serial: &str,
) -> Result<(AsyncStreamDeck, ConnectedInfo), String> {
    let device =
        AsyncStreamDeck::connect(hidapi, Kind::Pedal, serial).map_err(|e| e.to_string())?;
    let firmware = device.firmware_version().await.ok();
    let actual_serial = device
        .serial_number()
        .await
        .unwrap_or_else(|_| serial.to_string());

    Ok((
        device,
        ConnectedInfo {
            kind: "Pedal".to_string(),
            serial: actual_serial,
            firmware,
        },
    ))
}

/// Accepts GUI client connections and forwards broadcast events to each one.
async fn accept_loop(
    listener: UnixListener,
    tx: broadcast::Sender<DaemonEvent>,
    state: Arc<Mutex<DaemonState>>,
) {
    loop {
        match listener.accept().await {
            Ok((stream, _addr)) => {
                let tx = tx.clone();
                let state = state.clone();
                tokio::spawn(async move {
                    if let Err(e) = forward_events(stream, tx, state).await {
                        eprintln!("daemon: client error: {e}");
                    }
                });
            }
            Err(e) => {
                eprintln!("daemon: accept error: {e}");
                tokio::time::sleep(Duration::from_millis(100)).await;
            }
        }
    }
}

/// Sends a state snapshot, then forwards live events to a single client until
/// it disconnects.
async fn forward_events(
    stream: UnixStream,
    tx: broadcast::Sender<DaemonEvent>,
    state: Arc<Mutex<DaemonState>>,
) -> Result<(), String> {
    let (mut reader, mut writer) = stream.into_split();

    // Subscribe before reading the snapshot so no event is missed in between.
    let mut rx = tx.subscribe();

    // Send a snapshot of the current state.
    let snapshot = state.lock().unwrap().clone();
    send_snapshot(&mut writer, &snapshot).await?;

    let mut buf = [0u8; 1024];
    loop {
        tokio::select! {
            read = reader.read(&mut buf) => {
                match read {
                    Ok(0) | Err(_) => break, // client disconnected
                    Ok(_) => {} // ignore any data the client sends
                }
            }
            event = rx.recv() => {
                match event {
                    Ok(event) => {
                        write_event(&mut writer, &event).await?;
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        }
    }

    Ok(())
}

/// Writes the current state as a sequence of events.
async fn send_snapshot(writer: &mut OwnedWriteHalf, state: &DaemonState) -> Result<(), String> {
    match &state.connected {
        Some(info) => {
            write_event(
                writer,
                &DaemonEvent::Connected {
                    kind: info.kind.clone(),
                    serial: info.serial.clone(),
                    firmware: info.firmware.clone(),
                },
            )
            .await?;
            for (pedal, pressed) in state.buttons.iter().enumerate() {
                if *pressed {
                    write_event(writer, &DaemonEvent::ButtonDown { pedal: pedal as u8 }).await?;
                }
            }
        }
        None => {
            write_event(writer, &DaemonEvent::Disconnected).await?;
        }
    }
    Ok(())
}

/// Serializes and writes a single event as a newline-delimited JSON line.
async fn write_event(writer: &mut OwnedWriteHalf, event: &DaemonEvent) -> Result<(), String> {
    let mut line = serde_json::to_string(event).map_err(|e| e.to_string())?;
    line.push('\n');
    writer
        .write_all(line.as_bytes())
        .await
        .map_err(|e| e.to_string())
}
