use std::sync::{Arc, Mutex};
use std::time::Duration;

use elgato_streamdeck::info::Kind;
use elgato_streamdeck::{AsyncStreamDeck, StreamDeckInput};
use evdev::KeyCode;
use hidapi::HidApi;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::unix::OwnedWriteHalf;
use tokio::net::{UnixListener, UnixStream};
use tokio::sync::broadcast;
use tokio::task::JoinHandle;

use crate::bindings::{binding_for_pedal, threshold_ms};
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

/// Tracks an in-progress pedal press for tap/hold detection.
struct PressState {
    /// Whether the hold action has already fired for this press.
    hold_fired: bool,
    /// Handle to the hold timer, aborted when the pedal is released early.
    timer: JoinHandle<()>,
}

/// Runs the headless daemon: reads the Pedal, emulates key bindings via uinput,
/// and broadcasts state events to GUI clients over a Unix domain socket.
pub async fn run() -> Result<(), String> {
    let mut hidapi = elgato_streamdeck::new_hidapi().map_err(|e| e.to_string())?;
    let keyboard = Arc::new(Mutex::new(match Keyboard::new() {
        Ok(k) => Some(k),
        Err(e) => {
            eprintln!("warning: keyboard emulation unavailable: {e}");
            None
        }
    }));

    let (tx, _rx) = broadcast::channel::<DaemonEvent>(16);
    let state = Arc::new(Mutex::new(DaemonState::default()));
    let press: Arc<Mutex<[Option<PressState>; 3]>> = Arc::new(Mutex::new([None, None, None]));

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
                            on_press(&keyboard, &press, &tx, pedal);
                        } else {
                            let _ = tx.send(DaemonEvent::ButtonUp { pedal });
                            on_release(&keyboard, &press, pedal);
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
                    {
                        let mut press = press.lock().unwrap();
                        *press = [None, None, None];
                    }
                    let _ = tx.send(DaemonEvent::Disconnected);
                }
            },
            None => {
                if let Some(serial) = find_pedal_serial(&mut hidapi) {
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

/// Handles a pedal press: records the press and schedules the hold timer.
///
/// No keys are pressed here — the tap/hold decision is deferred until either
/// the pedal is released (tap) or the threshold elapses (hold). This avoids
/// emitting a tap key-down that a target app would treat as an immediate tap.
fn on_press(
    keyboard: &Arc<Mutex<Option<Keyboard>>>,
    press: &Arc<Mutex<[Option<PressState>; 3]>>,
    tx: &broadcast::Sender<DaemonEvent>,
    pedal: u8,
) {
    let threshold = Duration::from_millis(threshold_ms());
    let keyboard = keyboard.clone();
    let press_for_timer = press.clone();
    let tx = tx.clone();
    let timer = tokio::spawn(async move {
        tokio::time::sleep(threshold).await;

        {
            let mut press = press_for_timer.lock().unwrap();
            let Some(state) = press[pedal as usize].as_mut() else {
                return; // released before the threshold
            };
            if state.hold_fired {
                return;
            }
            state.hold_fired = true;
        }

        // Fire the hold action once.
        if let Some(binding) = binding_for_pedal(pedal, "hold") {
            if let Some(keys) = binding.to_key_codes() {
                tap_keys(&keyboard, &keys);
            }
        }

        let _ = tx.send(DaemonEvent::ButtonHold { pedal });
    });

    {
        let mut press = press.lock().unwrap();
        press[pedal as usize] = Some(PressState {
            hold_fired: false,
            timer,
        });
    }
}

/// Handles a pedal release: fires the tap action if the hold hasn't fired yet.
fn on_release(
    keyboard: &Arc<Mutex<Option<Keyboard>>>,
    press: &Arc<Mutex<[Option<PressState>; 3]>>,
    pedal: u8,
) {
    let state = {
        let mut press = press.lock().unwrap();
        press[pedal as usize].take()
    };

    let Some(state) = state else {
        return;
    };

    // Cancel the hold timer — the pedal was released before the threshold.
    state.timer.abort();

    // Released before the threshold — this was a tap.
    if !state.hold_fired {
        if let Some(binding) = binding_for_pedal(pedal, "tap") {
            if let Some(keys) = binding.to_key_codes() {
                tap_keys(keyboard, &keys);
            }
        }
    }
}

/// Presses and releases the given keys (a single keypress).
fn tap_keys(keyboard: &Arc<Mutex<Option<Keyboard>>>, keys: &[KeyCode]) {
    let mut kb = keyboard.lock().unwrap();
    if let Some(kb) = kb.as_mut() {
        let _ = kb.press(keys);
        let _ = kb.release(keys);
    }
}

/// Returns the serial number of the first connected Stream Deck Pedal, if any.
///
/// Refreshes the HID device list first: `hidapi` caches the enumeration from
/// `HidApi::new()`, so without this a device plugged in after startup would
/// never be seen.
fn find_pedal_serial(hidapi: &mut HidApi) -> Option<String> {
    let _ = elgato_streamdeck::refresh_device_list(hidapi);
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
