#!/bin/sh
set -e

# Reload udev rules after the rules files have been removed.
udevadm control --reload-rules || true

exit 0
