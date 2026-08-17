#!/usr/bin/env bash
set -euo pipefail

DEST="/etc/udev/rules.d/40-streamdeck-pedal.rules"

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root (use sudo)." >&2
  exit 1
fi

rm -f "$DEST"
udevadm control --reload-rules

echo "Removed $DEST and reloaded udev rules."
