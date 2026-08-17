#!/bin/sh
set -e

# Reload udev rules so the newly installed rules take effect immediately.
udevadm control --reload-rules || true
udevadm trigger || true

exit 0
