use std::sync::Mutex;
use std::time::Duration;

use elgato_streamdeck::info::Kind;
use elgato_streamdeck::{AsyncStreamDeck, StreamDeckInput};
use hidapi::HidApi;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};

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
}

impl AppState {
    pub fn new() -> Result<Self, String> {
        let hidapi = elgato_streamdeck::new_hidapi().map_err(|e| e.to_string())?;
        Ok(Self {
            hidapi: Mutex::new(hidapi),
            device: Mutex::new(None),
        })
    }
}

/// Lists connected Stream Deck Pedal devices.
#[tauri::command]
pub fn list_devices(state: State<AppState>) -> Result<Vec<DeviceInfo>, String> {
    let hidapi = state.hidapi.lock().map_err(|e| e.to_string())?;
    let devices = elgato_streamdeck::list_devices(&hidapi)
        .into_iter()
        .filter(|(kind, _)| *kind == Kind::Pedal)
        .map(|(kind, serial)| DeviceInfo {
            kind: format!("{:?}", kind),
            serial,
            firmware: None,
        })
        .collect();
    Ok(devices)
}

/// Connects to a Stream Deck Pedal by serial number.
#[tauri::command]
pub async fn connect(state: State<'_, AppState>, serial: String) -> Result<DeviceInfo, String> {
    let device = {
        let hidapi = state.hidapi.lock().map_err(|e| e.to_string())?;
        AsyncStreamDeck::connect(&hidapi, Kind::Pedal, &serial).map_err(|e| e.to_string())?
    };

    let firmware = device.firmware_version().await.ok();
    let actual_serial = device.serial_number().await.unwrap_or(serial);

    *state.device.lock().map_err(|e| e.to_string())? = Some(device);

    Ok(DeviceInfo {
        kind: "Pedal".to_string(),
        serial: actual_serial,
        firmware,
    })
}

/// Disconnects the currently connected device.
#[tauri::command]
pub fn disconnect(state: State<AppState>) -> Result<(), String> {
    *state.device.lock().map_err(|e| e.to_string())? = None;
    Ok(())
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

/// Spawns a background task that reads button events and emits them to the frontend.
pub fn spawn_reader(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut prev_buttons: Vec<bool> = vec![false, false, false];

        loop {
            let device = app.state::<AppState>().device.lock().unwrap().clone();

            match device {
                Some(device) => match device.read_input(30.0).await {
                    Ok(StreamDeckInput::ButtonStateChange(buttons)) => {
                        for (index, (new, old)) in
                            buttons.iter().zip(prev_buttons.iter()).enumerate()
                        {
                            if new != old {
                                if *new {
                                    let _ = app.emit("pedal-button-down", index as u8);
                                } else {
                                    let _ = app.emit("pedal-button-up", index as u8);
                                }
                            }
                        }
                        prev_buttons = buttons;
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
                    tokio::time::sleep(Duration::from_millis(500)).await;
                }
            }
        }
    });
}
