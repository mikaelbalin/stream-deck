use std::path::PathBuf;

use serde::Serialize;

/// Events pushed from the daemon to connected GUI clients.
///
/// Serialized as newline-delimited JSON over a Unix domain socket.
#[derive(Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum DaemonEvent {
    Connected {
        kind: String,
        serial: String,
        firmware: Option<String>,
    },
    Disconnected,
    ButtonDown {
        pedal: u8,
    },
    ButtonUp {
        pedal: u8,
    },
}

/// Returns the path to the daemon's Unix domain socket.
///
/// Uses `$XDG_RUNTIME_DIR` (the standard per-user runtime directory, present on
/// systemd-based systems) and falls back to `/tmp`.
pub fn socket_path() -> PathBuf {
    std::env::var_os("XDG_RUNTIME_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join("stream-deck-pedal.sock")
}
