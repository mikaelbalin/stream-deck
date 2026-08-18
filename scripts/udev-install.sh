#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_DIR="/etc/udev/rules.d"

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root (use sudo)." >&2
  exit 1
fi

install -m 0644 "$SCRIPT_DIR/40-streamdeck-pedal.rules" "$DEST_DIR/40-streamdeck-pedal.rules"
install -m 0644 "$SCRIPT_DIR/40-uinput.rules" "$DEST_DIR/40-uinput.rules"
install -m 0644 "$SCRIPT_DIR/uinput.conf" /etc/modules-load.d/uinput.conf

udevadm control --reload-rules
modprobe uinput || true
udevadm trigger

echo "Installed udev rules, loaded the uinput module, and reloaded."
