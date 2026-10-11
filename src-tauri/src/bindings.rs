use evdev::KeyCode;
use serde::{Deserialize, Serialize};

use crate::config::bindings_path;

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

impl KeyBinding {
    /// Converts this binding to a list of key codes (modifiers first, then the main key).
    pub fn to_key_codes(&self) -> Option<Vec<KeyCode>> {
        let mut keys = Vec::new();
        if self.ctrl {
            keys.push(KeyCode::KEY_LEFTCTRL);
        }
        if self.shift {
            keys.push(KeyCode::KEY_LEFTSHIFT);
        }
        if self.alt {
            keys.push(KeyCode::KEY_LEFTALT);
        }
        if self.meta {
            keys.push(KeyCode::KEY_LEFTMETA);
        }
        keys.push(code_to_key_code(&self.code)?);
        Some(keys)
    }
}

/// Maps a DOM `KeyboardEvent.code` value to an evdev key code.
fn code_to_key_code(code: &str) -> Option<KeyCode> {
    Some(match code {
        // Letters
        "KeyA" => KeyCode::KEY_A,
        "KeyB" => KeyCode::KEY_B,
        "KeyC" => KeyCode::KEY_C,
        "KeyD" => KeyCode::KEY_D,
        "KeyE" => KeyCode::KEY_E,
        "KeyF" => KeyCode::KEY_F,
        "KeyG" => KeyCode::KEY_G,
        "KeyH" => KeyCode::KEY_H,
        "KeyI" => KeyCode::KEY_I,
        "KeyJ" => KeyCode::KEY_J,
        "KeyK" => KeyCode::KEY_K,
        "KeyL" => KeyCode::KEY_L,
        "KeyM" => KeyCode::KEY_M,
        "KeyN" => KeyCode::KEY_N,
        "KeyO" => KeyCode::KEY_O,
        "KeyP" => KeyCode::KEY_P,
        "KeyQ" => KeyCode::KEY_Q,
        "KeyR" => KeyCode::KEY_R,
        "KeyS" => KeyCode::KEY_S,
        "KeyT" => KeyCode::KEY_T,
        "KeyU" => KeyCode::KEY_U,
        "KeyV" => KeyCode::KEY_V,
        "KeyW" => KeyCode::KEY_W,
        "KeyX" => KeyCode::KEY_X,
        "KeyY" => KeyCode::KEY_Y,
        "KeyZ" => KeyCode::KEY_Z,
        // Numbers
        "Digit0" => KeyCode::KEY_0,
        "Digit1" => KeyCode::KEY_1,
        "Digit2" => KeyCode::KEY_2,
        "Digit3" => KeyCode::KEY_3,
        "Digit4" => KeyCode::KEY_4,
        "Digit5" => KeyCode::KEY_5,
        "Digit6" => KeyCode::KEY_6,
        "Digit7" => KeyCode::KEY_7,
        "Digit8" => KeyCode::KEY_8,
        "Digit9" => KeyCode::KEY_9,
        // Function keys
        "F1" => KeyCode::KEY_F1,
        "F2" => KeyCode::KEY_F2,
        "F3" => KeyCode::KEY_F3,
        "F4" => KeyCode::KEY_F4,
        "F5" => KeyCode::KEY_F5,
        "F6" => KeyCode::KEY_F6,
        "F7" => KeyCode::KEY_F7,
        "F8" => KeyCode::KEY_F8,
        "F9" => KeyCode::KEY_F9,
        "F10" => KeyCode::KEY_F10,
        "F11" => KeyCode::KEY_F11,
        "F12" => KeyCode::KEY_F12,
        "F13" => KeyCode::KEY_F13,
        "F14" => KeyCode::KEY_F14,
        "F15" => KeyCode::KEY_F15,
        "F16" => KeyCode::KEY_F16,
        "F17" => KeyCode::KEY_F17,
        "F18" => KeyCode::KEY_F18,
        "F19" => KeyCode::KEY_F19,
        "F20" => KeyCode::KEY_F20,
        "F21" => KeyCode::KEY_F21,
        "F22" => KeyCode::KEY_F22,
        "F23" => KeyCode::KEY_F23,
        "F24" => KeyCode::KEY_F24,
        // Navigation / editing
        "Space" => KeyCode::KEY_SPACE,
        "Enter" => KeyCode::KEY_ENTER,
        "Tab" => KeyCode::KEY_TAB,
        "Escape" => KeyCode::KEY_ESC,
        "Backspace" => KeyCode::KEY_BACKSPACE,
        "Delete" => KeyCode::KEY_DELETE,
        "Insert" => KeyCode::KEY_INSERT,
        "Home" => KeyCode::KEY_HOME,
        "End" => KeyCode::KEY_END,
        "PageUp" => KeyCode::KEY_PAGEUP,
        "PageDown" => KeyCode::KEY_PAGEDOWN,
        "ArrowUp" => KeyCode::KEY_UP,
        "ArrowDown" => KeyCode::KEY_DOWN,
        "ArrowLeft" => KeyCode::KEY_LEFT,
        "ArrowRight" => KeyCode::KEY_RIGHT,
        // Media
        "MediaPlayPause" => KeyCode::KEY_PLAYPAUSE,
        "MediaTrackNext" => KeyCode::KEY_NEXTSONG,
        "MediaTrackPrevious" => KeyCode::KEY_PREVIOUSSONG,
        "MediaStop" => KeyCode::KEY_STOPCD,
        "AudioVolumeUp" => KeyCode::KEY_VOLUMEUP,
        "AudioVolumeDown" => KeyCode::KEY_VOLUMEDOWN,
        "AudioVolumeMute" => KeyCode::KEY_MUTE,
        // Punctuation
        "Minus" => KeyCode::KEY_MINUS,
        "Equal" => KeyCode::KEY_EQUAL,
        "BracketLeft" => KeyCode::KEY_LEFTBRACE,
        "BracketRight" => KeyCode::KEY_RIGHTBRACE,
        "Semicolon" => KeyCode::KEY_SEMICOLON,
        "Quote" => KeyCode::KEY_APOSTROPHE,
        "Backquote" => KeyCode::KEY_GRAVE,
        "Backslash" => KeyCode::KEY_BACKSLASH,
        "Comma" => KeyCode::KEY_COMMA,
        "Period" => KeyCode::KEY_DOT,
        "Slash" => KeyCode::KEY_SLASH,
        _ => return None,
    })
}

/// The two actions (tap and hold) assigned to a single pedal.
#[derive(Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PedalBinding {
    #[serde(default)]
    pub tap: Option<KeyBinding>,
    #[serde(default)]
    pub hold: Option<KeyBinding>,
    /// When true, the `hold` action behaves as "press and hold": the bound keys
    /// are pressed when the pedal is held past the threshold and released when
    /// the pedal is released. When false (default), holding past the threshold
    /// fires the hold action once as a tap.
    #[serde(default, alias = "hold_press")]
    pub hold_press: bool,
}

/// Per-pedal bindings (index 0 = left, 1 = middle, 2 = right).
pub type KeyBindings = [PedalBinding; 3];

/// The full application configuration persisted to disk.
#[derive(Clone, Serialize, Deserialize)]
pub struct Config {
    #[serde(default = "default_threshold_ms")]
    pub threshold_ms: u64,
    #[serde(default)]
    pub bindings: KeyBindings,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            threshold_ms: default_threshold_ms(),
            bindings: Default::default(),
        }
    }
}

fn default_threshold_ms() -> u64 {
    500
}

fn load_config() -> Result<Config, String> {
    let path = bindings_path();
    if !path.exists() {
        return Ok(Config::default());
    }
    let data = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    // Treat an unreadable or legacy config as empty so the app can start fresh.
    Ok(serde_json::from_str(&data).unwrap_or_default())
}

fn save_config(config: &Config) -> Result<(), String> {
    let path = bindings_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let data = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    std::fs::write(&path, data).map_err(|e| e.to_string())
}

/// Returns the binding for a specific pedal and action kind (`"tap"` or `"hold"`), if any.
pub fn binding_for_pedal(pedal: u8, kind: &str) -> Option<KeyBinding> {
    let config = load_config().ok()?;
    let pedal_binding = config.bindings.get(pedal as usize)?;
    match kind {
        "tap" => pedal_binding.tap.clone(),
        "hold" => pedal_binding.hold.clone(),
        _ => None,
    }
}

/// Returns whether the given pedal's `hold` action is in "press and hold" mode.
pub fn hold_press_for_pedal(pedal: u8) -> bool {
    load_config()
        .ok()
        .and_then(|c| c.bindings.get(pedal as usize).cloned())
        .map(|b| b.hold_press)
        .unwrap_or(false)
}

/// Returns the current hold threshold in milliseconds.
pub fn threshold_ms() -> u64 {
    load_config()
        .map(|c| c.threshold_ms)
        .unwrap_or_else(|_| default_threshold_ms())
}

/// Returns the current per-pedal key bindings.
#[tauri::command]
pub fn get_bindings() -> Result<KeyBindings, String> {
    Ok(load_config()?.bindings)
}

/// Returns the current hold threshold in milliseconds.
#[tauri::command]
pub fn get_threshold() -> Result<u64, String> {
    Ok(load_config()?.threshold_ms)
}

/// Sets (or clears, when `binding` is `None`) the tap or hold binding for a pedal.
#[tauri::command]
pub fn set_binding(pedal: u8, kind: String, binding: Option<KeyBinding>) -> Result<(), String> {
    let mut config = load_config()?;
    let index = pedal as usize;
    if index >= config.bindings.len() {
        return Err(format!("invalid pedal index: {pedal}"));
    }
    let pedal_binding = &mut config.bindings[index];
    match kind.as_str() {
        "tap" => pedal_binding.tap = binding,
        "hold" => pedal_binding.hold = binding,
        _ => return Err(format!("invalid binding kind: {kind}")),
    }
    save_config(&config)
}

/// Sets the global hold threshold in milliseconds.
#[tauri::command]
pub fn set_threshold(ms: u64) -> Result<(), String> {
    let mut config = load_config()?;
    config.threshold_ms = ms;
    save_config(&config)
}

/// Toggles the "press and hold" behavior of a pedal's `hold` action.
#[tauri::command]
pub fn set_hold_press(pedal: u8, press: bool) -> Result<(), String> {
    let mut config = load_config()?;
    let index = pedal as usize;
    if index >= config.bindings.len() {
        return Err(format!("invalid pedal index: {pedal}"));
    }
    config.bindings[index].hold_press = press;
    save_config(&config)
}
