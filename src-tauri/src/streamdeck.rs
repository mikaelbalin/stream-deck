use std::sync::Mutex;
use std::time::Duration;

use elgato_streamdeck::info::Kind;
use elgato_streamdeck::{AsyncStreamDeck, StreamDeckInput};
use hidapi::HidApi;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::bindings::binding_for_pedal;
use crate::keyboard::Keyboard;

/// Information about a connected Stream Deck device.
#[derive(Clone, Serialize)]
pub struct DeviceInfo {
    pub kind: String,
    pub serial: String,
    pub firmware: Option<String>,
}

/// Shared application state.
pub struct AppState {
    hidapi: Mutex<HidApi>,
    device: Mutex<Option<AsyncStreamDeck>>,
    keyboard: Mutex<Option<Keyboard>>,
}

impl AppState {
    pub fn new() -> Result<Self, String> {
        let hidapi = elgato_streamdeck::new_hidapi().map_err(|e| e.to_string())?;
        let keyboard = match Keyboard::new() {
            Ok(k) => Some(k),
            Err(e) => {
                eprintln!("warning: keyboard emulation unavailable: {e}");
                None
            }
        };
        Ok(Self {
            hidapi: Mutex::new(hidapi),
            device: Mutex::new(None),
            keyboard: Mutex::new(keyboard),
        })
    }
}

/// Returns the serial number of the first connected Stream Deck Pedal, if any.
fn find_pedal_serial(app: &AppHandle) -> Option<String> {
    let state = app.state::<AppState>();
    let hidapi = state.hidapi.lock().ok()?;
    elgato_streamdeck::list_devices(&hidapi)
        .into_iter()
        .find(|(kind, _)| *kind == Kind::Pedal)
        .map(|(_, serial)| serial)
}

/// Connects to a Stream Deck Pedal by serial number.
async fn connect_internal(app: &AppHandle, serial: &str) -> Result<DeviceInfo, String> {
    let device = {
        let state = app.state::<AppState>();
        let hidapi = state.hidapi.lock().map_err(|e| e.to_string())?;
        AsyncStreamDeck::connect(&hidapi, Kind::Pedal, serial).map_err(|e| e.to_string())?
    };

    let firmware = device.firmware_version().await.ok();
    let actual_serial = device
        .serial_number()
        .await
        .unwrap_or_else(|_| serial.to_string());

    *app.state::<AppState>()
        .device
        .lock()
        .map_err(|e| e.to_string())? = Some(device);

    Ok(DeviceInfo {
        kind: "Pedal".to_string(),
        serial: actual_serial,
        firmware,
    })
}

/// Returns info about the currently connected device, if any.
#[tauri::command]
pub async fn get_device_info(state: State<'_, AppState>) -> Result<Option<DeviceInfo>, String> {
    let device = state.device.lock().map_err(|e| e.to_string())?.clone();
    match device {
        Some(d) => Ok(Some(DeviceInfo {
            kind: "Pedal".to_string(),
            serial: d.serial_number().await.unwrap_or_default(),
            firmware: d.firmware_version().await.ok(),
        })),
        None => Ok(None),
    }
}

/// Emulates a key press or release for the given pedal's binding.
fn emulate_key(app: &AppHandle, pedal: u8, pressed: bool) {
    let Some(binding) = binding_for_pedal(pedal) else {
        return;
    };
    let Some(keys) = binding.to_key_codes() else {
        return;
    };

    let state = app.state::<AppState>();
    let mut keyboard = match state.keyboard.lock() {
        Ok(k) => k,
        Err(_) => return,
    };
    let Some(keyboard) = keyboard.as_mut() else {
        return;
    };

    if pressed {
        let _ = keyboard.press(&keys);
    } else {
        let _ = keyboard.release(&keys);
    }
}

/// Spawns a background task that monitors for the device and reads button events.
///
/// When no device is connected it polls for a Pedal and auto-connects on
/// appearance. When connected it reads button state changes and emits them to
/// the frontend. A read error is treated as a physical disconnect.
pub fn spawn_monitor(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut prev_buttons: Vec<bool> = vec![false, false, false];

        loop {
            let device = app.state::<AppState>().device.lock().unwrap().clone();

            match device {
                Some(device) => match device.read_input(30.0).await {
                    Ok(StreamDeckInput::ButtonStateChange(buttons)) => {
                        // The device may have been logically disconnected while we
                        // were blocked in read_input, so only emit if still connected.
                        let still_connected =
                            app.state::<AppState>().device.lock().unwrap().is_some();

                        if still_connected {
                            for (index, (new, old)) in
                                buttons.iter().zip(prev_buttons.iter()).enumerate()
                            {
                                if new != old {
                                    if *new {
                                        let _ = app.emit("pedal-button-down", index as u8);
                                        emulate_key(&app, index as u8, true);
                                    } else {
                                        let _ = app.emit("pedal-button-up", index as u8);
                                        emulate_key(&app, index as u8, false);
                                    }
                                }
                            }
                            prev_buttons = buttons;
                        } else {
                            prev_buttons = vec![false, false, false];
                        }
                    }
                    Ok(_) => {}
                    Err(_) => {
                        *app.state::<AppState>().device.lock().unwrap() = None;
                        prev_buttons = vec![false, false, false];
                        let _ = app.emit("pedal-disconnected", ());
                    }
                },
                None => {
                    prev_buttons = vec![false, false, false];

                    // Auto-connect when a Pedal is physically present.
                    if let Some(serial) = find_pedal_serial(&app) {
                        match connect_internal(&app, &serial).await {
                            Ok(info) => {
                                let _ = app.emit("pedal-connected", info);
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
    });
}
