#!/bin/sh
set -e

# Installs the Stream Deck Pedal daemon as a systemd *user* service.
#
# The unit file is generated with the absolute path to the locally built
# binary, so this is intended for development. The packaged app installs a
# unit pointing at /usr/bin/stream-deck instead.

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

cat > "$UNIT_DIR/stream-deck-pedal.service" <<EOF
[Unit]
Description=Stream Deck Pedal daemon
After=graphical-session.target

[Service]
Type=simple
ExecStart=$BIN --daemon
Restart=on-failure
RestartSec=2

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now stream-deck-pedal

echo "installed and started stream-deck-pedal.service"
