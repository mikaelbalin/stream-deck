#!/bin/sh
set -e

# Installs the Stream Deck Pedal daemon as a systemd *user* service.

# Reuses the packaged unit file, substituting the local binary path. This is intended for development; the packaged app installs the unit as-is (pointing at /usr/bin/stream-deck).

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Prefer the release binary, fall back to debug.
BIN="$ROOT/src-tauri/target/release/stream-deck"
if [ ! -x "$BIN" ]; then
    BIN="$ROOT/src-tauri/target/debug/stream-deck"
fi

if [ ! -x "$BIN" ]; then
    echo "error: stream-deck binary not found. Build it first (pnpm tauri build)." >&2
    exit 1
fi

UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
mkdir -p "$UNIT_DIR"

# Reuse the packaged unit file, substituting the local binary path.
sed "s|/usr/bin/stream-deck|$BIN|" "$ROOT/scripts/stream-deck-pedal.service" \
    > "$UNIT_DIR/stream-deck-pedal.service"

systemctl --user daemon-reload
systemctl --user enable --now stream-deck-pedal

echo "installed and started stream-deck-pedal.service"
