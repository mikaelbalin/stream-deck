#!/bin/sh
set -e

# Reload udev rules so the newly installed rules take effect immediately.
udevadm control --reload-rules || true

# Load the uinput module so /dev/uinput is created and the udev rule applies.
modprobe uinput || true

udevadm trigger || true

exit 0
