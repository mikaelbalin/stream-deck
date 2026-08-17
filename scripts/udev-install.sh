#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RULE_FILE="$SCRIPT_DIR/40-streamdeck-pedal.rules"
DEST="/etc/udev/rules.d/40-streamdeck-pedal.rules"

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root (use sudo)." >&2
  exit 1
fi

install -m 0644 "$RULE_FILE" "$DEST"
udevadm control --reload-rules
udevadm trigger

echo "Installed $DEST and reloaded udev rules."
