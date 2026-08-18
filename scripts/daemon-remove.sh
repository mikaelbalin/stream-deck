#!/bin/sh
set -e

# Removes the Stream Deck Pedal daemon systemd user service.

systemctl --user disable --now stream-deck-pedal 2>/dev/null || true

UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
rm -f "$UNIT_DIR/stream-deck-pedal.service"

systemctl --user daemon-reload

echo "removed stream-deck-pedal.service"
