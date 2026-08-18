use std::path::PathBuf;

/// Application identifier, used to derive the per-user config directory.
///
/// Must match the `identifier` field in `tauri.conf.json` so that the GUI and
/// the daemon resolve the same config path.
pub const APP_ID: &str = "com.dev.stream-deck";

/// Returns the per-user config directory for this app.
///
/// On Linux this is `$XDG_CONFIG_HOME/com.dev.stream-deck`, falling back to
/// `~/.config/com.dev.stream-deck` when `XDG_CONFIG_HOME` is unset. This
/// matches Tauri's `app_config_dir()` for the same identifier.
pub fn config_dir() -> PathBuf {
    let base = std::env::var_os("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".config")))
        .unwrap_or_else(|| PathBuf::from("."));
    base.join(APP_ID)
}

/// Returns the path to the per-pedal key bindings file.
pub fn bindings_path() -> PathBuf {
    config_dir().join("bindings.json")
}
