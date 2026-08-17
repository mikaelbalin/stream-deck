mod streamdeck;

use streamdeck::{connect, disconnect, get_device_info, list_devices, spawn_reader, AppState};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::new().expect("failed to initialize hidapi"))
        .setup(|app| {
            spawn_reader(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            list_devices,
            connect,
            disconnect,
            get_device_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
