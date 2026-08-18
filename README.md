# Stream Deck Pedal

Tauri 2 + React 19 + TypeScript application that adds support for the
**Elgato Stream Deck Pedal** on Linux.

The Stream Deck Pedal is a three-pedal foot controller exposed as a HID device. This app connects to it, shows its connection state and pedal
presses, and lets you map each pedal to a keyboard shortcut that is emulated
system-wide.

## Supported platforms

- **Linux only.** Tested targets:
  - **Bazzite** (Fedora Atomic, KDE/Wayland)
  - **Raspberry Pi OS** (Debian)

Windows and macOS are intentionally out of scope.

## How it works

- The device is discovered and read through the
  [`elgato-streamdeck`](https://crates.io/crates/elgato-streamdeck) and
  [`hidapi`](https://crates.io/crates/hidapi) crates.
- Keyboard shortcuts are emulated at the kernel level via
  [`evdev`](https://crates.io/crates/evdev)'s `uinput` support, which works
  identically on X11 and Wayland.

## Prerequisites

- Rust toolchain (stable)
- Node.js + pnpm
- On Debian-based systems (Raspberry Pi OS), the `hidapi` crate may need
  `libudev-dev` at link time:
  ```sh
  sudo apt install libudev-dev
  ```

## Development

```sh
pnpm install
pnpm tauri dev
```

## udev rules (`scripts/`)

The app talks to two kernel devices that are not world-writable by default on
most distributions:

1. The Stream Deck Pedal **HID** device (`/dev/hidraw*`).
2. **`/dev/uinput`**, used to create a virtual keyboard for shortcut emulation.

The `scripts/` directory contains udev rules and helper scripts to grant the
logged-in user access to both, without requiring root at runtime.

### Files

| File                        | Purpose                                                             |
| --------------------------- | ------------------------------------------------------------------- |
| `40-streamdeck-pedal.rules` | Grants access to the Pedal HID device (VID `0x0fd9`, PID `0x0086`). |
| `40-uinput.rules`           | Grants access to `/dev/uinput` (world-writable).                    |
| `uinput.conf`               | Loads the `uinput` kernel module at boot (`/etc/modules-load.d/`).  |
| `udev-install.sh`           | Installs the rules and module config, then reloads udev.            |
| `udev-remove.sh`            | Removes the rules and module config, then reloads udev.             |

The Pedal rule uses the `uaccess` tag, which grants access to the user on the
active seat via `systemd-logind` — no manual group membership is required.

The `uinput` rule instead makes `/dev/uinput` world-writable (`0666`), because
`uaccess` does not apply to it (it is a misc device, not a seat device). This
avoids requiring the user to be in the `input` group and is acceptable on a
single-user device.

The `uinput` kernel module must also be loaded, otherwise `/dev/uinput` is only
a static node with default `0600 root:root` permissions and the udev rule has
no device to apply to. `uinput.conf` loads the module at boot.

### When are the rules needed?

| Distribution    | HID device        | `/dev/uinput`              | Rules needed?  |
| --------------- | ----------------- | -------------------------- | -------------- |
| Bazzite         | already `0666`    | usually already accessible | Usually **no** |
| Raspberry Pi OS | `0600` by default | `0600` by default          | **Yes**        |

On Bazzite the device nodes are already accessible (gaming-distro policy), so
the rules are typically unnecessary. On Raspberry Pi OS they are required.

### Installing

If the scripts are not executable (e.g. right after cloning), make them
executable first:

```sh
chmod +x scripts/udev-install.sh scripts/udev-remove.sh
```

Then install the rules and module config:

```sh
sudo ./scripts/udev-install.sh
```

The script installs the udev rules, installs `uinput.conf` into
`/etc/modules-load.d/`, and loads the `uinput` module immediately.

### Removing

```sh
sudo ./scripts/udev-remove.sh
```

### Verifying access

After installing the rules (and re-plugging the device), check the device nodes:

```sh
# Stream Deck Pedal HID device
ls -l /dev/hidraw*

# Virtual keyboard device
ls -l /dev/uinput
```

The Pedal should appear as a `hidraw` node accessible to your user (via the
`uaccess` ACL), and `/dev/uinput` should be world-writable (`0666`).

## Building

```sh
pnpm tauri build
```

This produces installable packages in `src-tauri/target/release/bundle/`:

- `stream-deck_0.1.0_amd64.deb` (x86_64) / `stream-deck_0.1.0_arm64.deb` (arm64)
- `stream-deck-0.1.0-1.x86_64.rpm` (x86_64)

Packages are built for the architecture of the machine running the build. To
produce an `arm64` package for Raspberry Pi OS, build on the Pi itself.

## Installing the built packages

The packages embed the udev rules and install/remove them automatically via
`postinstall.sh` / `postremove.sh`, so no manual udev setup is required.

### Bazzite (Fedora Atomic / ostree)

Bazzite is an immutable system, so a local RPM is installed with `rpm-ostree`
(layering) rather than `dnf`. A reboot is required after install or removal.

Install:

```sh
rpm-ostree install ./stream-deck-0.1.0-1.x86_64.rpm
systemctl reboot
```

Remove:

```sh
rpm-ostree uninstall stream-deck
systemctl reboot
```

Check the layered package:

```sh
rpm-ostree status
```

### Raspberry Pi OS (Debian)

Install (apt resolves dependencies automatically):

```sh
sudo apt install ./stream-deck_0.1.0_arm64.deb
```

or via `dpkg`:

```sh
sudo dpkg -i ./stream-deck_0.1.0_arm64.deb
```

Remove:

```sh
sudo apt remove stream-deck
```

or:

```sh
sudo dpkg -r stream-deck
```

### udev rules in packages

On install, `40-streamdeck-pedal.rules` and `40-uinput.rules` are placed in
`/etc/udev/rules.d/`, and `uinput.conf` in `/etc/modules-load.d/`. Then
`postinstall.sh` reloads udev, loads the `uinput` module, and triggers udev.
On removal, the package manager deletes these files and `postremove.sh` reloads
udev. No manual cleanup is needed.
