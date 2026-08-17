use evdev::uinput::VirtualDevice;
use evdev::{AttributeSet, EventType, InputEvent, KeyCode};

/// A virtual keyboard backed by the Linux uinput subsystem.
///
/// Works on both X11 and Wayland because events are injected at the kernel
/// level. Requires write access to `/dev/uinput`.
pub struct Keyboard {
    device: VirtualDevice,
}

impl Keyboard {
    /// Creates a virtual keyboard device with all supported keys.
    pub fn new() -> Result<Self, String> {
        let keys = supported_keys();
        let device = VirtualDevice::builder()
            .map_err(|e| e.to_string())?
            .name("stream-deck-pedal")
            .with_keys(&keys)
            .map_err(|e| e.to_string())?
            .build()
            .map_err(|e| e.to_string())?;
        Ok(Self { device })
    }

    /// Presses the given keys (without releasing them).
    pub fn press(&mut self, keys: &[KeyCode]) -> Result<(), String> {
        let events: Vec<InputEvent> = keys
            .iter()
            .map(|k| InputEvent::new(EventType::KEY.0, k.0, 1))
            .collect();
        self.device.emit(&events).map_err(|e| e.to_string())
    }

    /// Releases the given keys.
    pub fn release(&mut self, keys: &[KeyCode]) -> Result<(), String> {
        let events: Vec<InputEvent> = keys
            .iter()
            .map(|k| InputEvent::new(EventType::KEY.0, k.0, 0))
            .collect();
        self.device.emit(&events).map_err(|e| e.to_string())
    }
}

/// The set of key codes this virtual keyboard can emit.
fn supported_keys() -> AttributeSet<KeyCode> {
    [
        // Modifiers
        KeyCode::KEY_LEFTCTRL,
        KeyCode::KEY_RIGHTCTRL,
        KeyCode::KEY_LEFTSHIFT,
        KeyCode::KEY_RIGHTSHIFT,
        KeyCode::KEY_LEFTALT,
        KeyCode::KEY_RIGHTALT,
        KeyCode::KEY_LEFTMETA,
        KeyCode::KEY_RIGHTMETA,
        // Letters
        KeyCode::KEY_A,
        KeyCode::KEY_B,
        KeyCode::KEY_C,
        KeyCode::KEY_D,
        KeyCode::KEY_E,
        KeyCode::KEY_F,
        KeyCode::KEY_G,
        KeyCode::KEY_H,
        KeyCode::KEY_I,
        KeyCode::KEY_J,
        KeyCode::KEY_K,
        KeyCode::KEY_L,
        KeyCode::KEY_M,
        KeyCode::KEY_N,
        KeyCode::KEY_O,
        KeyCode::KEY_P,
        KeyCode::KEY_Q,
        KeyCode::KEY_R,
        KeyCode::KEY_S,
        KeyCode::KEY_T,
        KeyCode::KEY_U,
        KeyCode::KEY_V,
        KeyCode::KEY_W,
        KeyCode::KEY_X,
        KeyCode::KEY_Y,
        KeyCode::KEY_Z,
        // Numbers
        KeyCode::KEY_0,
        KeyCode::KEY_1,
        KeyCode::KEY_2,
        KeyCode::KEY_3,
        KeyCode::KEY_4,
        KeyCode::KEY_5,
        KeyCode::KEY_6,
        KeyCode::KEY_7,
        KeyCode::KEY_8,
        KeyCode::KEY_9,
        // Function keys
        KeyCode::KEY_F1,
        KeyCode::KEY_F2,
        KeyCode::KEY_F3,
        KeyCode::KEY_F4,
        KeyCode::KEY_F5,
        KeyCode::KEY_F6,
        KeyCode::KEY_F7,
        KeyCode::KEY_F8,
        KeyCode::KEY_F9,
        KeyCode::KEY_F10,
        KeyCode::KEY_F11,
        KeyCode::KEY_F12,
        KeyCode::KEY_F13,
        KeyCode::KEY_F14,
        KeyCode::KEY_F15,
        KeyCode::KEY_F16,
        KeyCode::KEY_F17,
        KeyCode::KEY_F18,
        KeyCode::KEY_F19,
        KeyCode::KEY_F20,
        KeyCode::KEY_F21,
        KeyCode::KEY_F22,
        KeyCode::KEY_F23,
        KeyCode::KEY_F24,
        // Navigation / editing
        KeyCode::KEY_UP,
        KeyCode::KEY_DOWN,
        KeyCode::KEY_LEFT,
        KeyCode::KEY_RIGHT,
        KeyCode::KEY_HOME,
        KeyCode::KEY_END,
        KeyCode::KEY_PAGEUP,
        KeyCode::KEY_PAGEDOWN,
        KeyCode::KEY_INSERT,
        KeyCode::KEY_DELETE,
        KeyCode::KEY_BACKSPACE,
        KeyCode::KEY_TAB,
        KeyCode::KEY_ENTER,
        KeyCode::KEY_ESC,
        KeyCode::KEY_SPACE,
        // Media
        KeyCode::KEY_PLAYPAUSE,
        KeyCode::KEY_NEXTSONG,
        KeyCode::KEY_PREVIOUSSONG,
        KeyCode::KEY_STOPCD,
        KeyCode::KEY_VOLUMEUP,
        KeyCode::KEY_VOLUMEDOWN,
        KeyCode::KEY_MUTE,
        // Punctuation
        KeyCode::KEY_MINUS,
        KeyCode::KEY_EQUAL,
        KeyCode::KEY_LEFTBRACE,
        KeyCode::KEY_RIGHTBRACE,
        KeyCode::KEY_SEMICOLON,
        KeyCode::KEY_APOSTROPHE,
        KeyCode::KEY_GRAVE,
        KeyCode::KEY_BACKSLASH,
        KeyCode::KEY_COMMA,
        KeyCode::KEY_DOT,
        KeyCode::KEY_SLASH,
    ]
    .into_iter()
    .collect()
}

/// Emits a harmless key press/release to verify uinput access works.
#[tauri::command]
pub fn test_keyboard() -> Result<(), String> {
    let mut keyboard = Keyboard::new()?;
    keyboard.press(&[KeyCode::KEY_F13])?;
    keyboard.release(&[KeyCode::KEY_F13])?;
    Ok(())
}
