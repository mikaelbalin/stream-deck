mod bindings;
mod config;
mod daemon;
mod ipc;
mod keyboard;
mod streamdeck;

use bindings::{get_bindings, set_binding};
use streamdeck::{get_device_info, spawn_daemon_client, AppState};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::new())
        .setup(|app| {
            spawn_daemon_client(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_device_info,
            get_bindings,
            set_binding
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Runs the headless daemon (used with the `--daemon` flag).
pub fn run_daemon() {
    let rt = tokio::runtime::Runtime::new().expect("failed to create tokio runtime");
    if let Err(e) = rt.block_on(daemon::run()) {
        eprintln!("daemon error: {e}");
        std::process::exit(1);
    }
}
