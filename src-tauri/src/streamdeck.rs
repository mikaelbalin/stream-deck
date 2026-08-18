use std::sync::Mutex;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::net::UnixStream;

use crate::ipc::{socket_path, DaemonEvent};

/// Information about a connected Stream Deck device.
#[derive(Clone, Serialize)]
pub struct DeviceInfo {
    pub kind: String,
    pub serial: String,
    pub firmware: Option<String>,
}

/// Shared application state.
pub struct AppState {
    device_info: Mutex<Option<DeviceInfo>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            device_info: Mutex::new(None),
        }
    }
}

/// Returns info about the currently connected device, if any.
#[tauri::command]
pub fn get_device_info(state: State<'_, AppState>) -> Result<Option<DeviceInfo>, String> {
    let info = state.device_info.lock().map_err(|e| e.to_string())?.clone();
    Ok(info)
}

/// Error returned by the daemon client.
enum ClientError {
    /// The daemon socket is not reachable (daemon not running yet).
    Refused,
    /// Any other error (read failure, malformed event, etc.).
    Other(String),
}

/// Spawns a background task that connects to the daemon and re-emits its
/// events as Tauri events for the frontend.
pub fn spawn_daemon_client(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            match connect_and_forward(&app).await {
                Ok(()) => {}
                // The daemon isn't running yet — retry silently.
                Err(ClientError::Refused) => {}
                Err(ClientError::Other(e)) => eprintln!("daemon client: {e}"),
            }
            // Reconnect after a short delay (the daemon may not be running yet).
            tokio::time::sleep(Duration::from_millis(1000)).await;
        }
    });
}

/// Connects to the daemon socket and forwards events until the connection drops.
async fn connect_and_forward(app: &AppHandle) -> Result<(), ClientError> {
    let path = socket_path();
    let stream = UnixStream::connect(&path).await.map_err(|e| {
        if e.kind() == std::io::ErrorKind::ConnectionRefused {
            ClientError::Refused
        } else {
            ClientError::Other(e.to_string())
        }
    })?;
    let reader = BufReader::new(stream);
    let mut lines = reader.lines();

    while let Some(line) = lines
        .next_line()
        .await
        .map_err(|e| ClientError::Other(e.to_string()))?
    {
        let event: DaemonEvent =
            serde_json::from_str(&line).map_err(|e| ClientError::Other(e.to_string()))?;
        handle_event(app, event);
    }

    Ok(())
}

/// Maps a daemon event to the corresponding Tauri event.
fn handle_event(app: &AppHandle, event: DaemonEvent) {
    match event {
        DaemonEvent::Connected {
            kind,
            serial,
            firmware,
        } => {
            let info = DeviceInfo {
                kind,
                serial,
                firmware,
            };
            let state = app.state::<AppState>();
            if let Ok(mut d) = state.device_info.lock() {
                *d = Some(info.clone());
            }
            let _ = app.emit("pedal-connected", info);
        }
        DaemonEvent::Disconnected => {
            let state = app.state::<AppState>();
            if let Ok(mut d) = state.device_info.lock() {
                *d = None;
            }
            let _ = app.emit("pedal-disconnected", ());
        }
        DaemonEvent::ButtonDown { pedal } => {
            let _ = app.emit("pedal-button-down", pedal);
        }
        DaemonEvent::ButtonUp { pedal } => {
            let _ = app.emit("pedal-button-up", pedal);
        }
    }
}
