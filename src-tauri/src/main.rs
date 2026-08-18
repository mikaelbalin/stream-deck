// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Fix WebKitGTK rendering corruption (black/white stripes, pixel artifacts)
    // on Raspberry Pi OS and other systems with certain GPU drivers. The DMA-BUF
    // renderer is buggy there; disabling it falls back to a working renderer.
    // Must be set before any GTK/WebKitGTK code runs. Only set if not already
    // set, so it stays overridable for debugging.
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    let is_daemon = std::env::args().any(|arg| arg == "--daemon");
    if is_daemon {
        stream_deck_lib::run_daemon();
    } else {
        stream_deck_lib::run();
    }
}
