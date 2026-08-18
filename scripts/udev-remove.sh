#!/usr/bin/env bash
set -euo pipefail

DEST_DIR="/etc/udev/rules.d"

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root (use sudo)." >&2
  exit 1
fi

rm -f "$DEST_DIR/40-streamdeck-pedal.rules" "$DEST_DIR/40-uinput.rules"
rm -f /etc/modules-load.d/uinput.conf
udevadm control --reload-rules

echo "Removed udev rules and reloaded."
