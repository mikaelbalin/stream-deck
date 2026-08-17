use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

/// A keyboard shortcut assigned to a pedal.
#[derive(Clone, Serialize, Deserialize)]
pub struct KeyBinding {
    pub ctrl: bool,
    pub shift: bool,
    pub alt: bool,
    pub meta: bool,
    /// DOM `KeyboardEvent.code` value, e.g. "KeyA", "F13", "MediaPlayPause".
    pub code: String,
}

/// Per-pedal bindings (index 0 = left, 1 = middle, 2 = right).
pub type KeyBindings = [Option<KeyBinding>; 3];

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("bindings.json"))
}

fn load_bindings(app: &AppHandle) -> Result<KeyBindings, String> {
    let path = config_path(app)?;
    if !path.exists() {
        return Ok([None, None, None]);
    }
    let data = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

fn save_bindings(app: &AppHandle, bindings: &KeyBindings) -> Result<(), String> {
    let path = config_path(app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let data = serde_json::to_string_pretty(bindings).map_err(|e| e.to_string())?;
    std::fs::write(&path, data).map_err(|e| e.to_string())
}

/// Returns the current per-pedal key bindings.
#[tauri::command]
pub fn get_bindings(app: AppHandle) -> Result<KeyBindings, String> {
    load_bindings(&app)
}

/// Sets (or clears, when `binding` is `None`) the key binding for a pedal.
#[tauri::command]
pub fn set_binding(app: AppHandle, pedal: u8, binding: Option<KeyBinding>) -> Result<(), String> {
    let mut bindings = load_bindings(&app)?;
    let index = pedal as usize;
    if index >= bindings.len() {
        return Err(format!("invalid pedal index: {pedal}"));
    }
    bindings[index] = binding;
    save_bindings(&app, &bindings)
}
