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

- The app is split into two processes:
  - A **daemon** (`stream-deck --daemon`) that reads the Pedal, emulates key
    bindings, and runs as a systemd user service.
  - A **GUI** (Tauri) that shows connection state and edits bindings, talking
    to the daemon over a Unix domain socket.
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

## Daemon (systemd user service)

The Pedal is read by a headless daemon (`stream-deck --daemon`) that runs
independently of the GUI, so key bindings keep working when the GUI is closed.
The daemon is managed as a systemd **user** service.

### Files

| File                        | Purpose                                                                    |
| --------------------------- | -------------------------------------------------------------------------- |
| `stream-deck-pedal.service` | systemd user unit (used by the package; points at `/usr/bin/stream-deck`). |
| `daemon-install.sh`         | Generates a unit with the local dev binary path, installs and enables it.  |
| `daemon-remove.sh`          | Disables and removes the user service.                                     |

### Development

Make the scripts executable, then install the service:

```sh
chmod +x scripts/daemon-install.sh scripts/daemon-remove.sh
./scripts/daemon-install.sh
```

This generates a unit pointing at the locally built binary, installs it into
`~/.config/systemd/user/`, and runs `systemctl --user enable --now`.

Check status:

```sh
systemctl --user status stream-deck-pedal
```

Remove:

```sh
./scripts/daemon-remove.sh
```

### In packages

The package installs `stream-deck-pedal.service` into `/usr/lib/systemd/user/`.
On first launch, the GUI runs `systemctl --user enable --now stream-deck-pedal`
to enable and start the daemon. After that the daemon auto-starts on login and
auto-restarts on failure.

On removal, the package deletes the unit file, but the user-level enable
(symlink in `~/.config/systemd/user/`) and a running daemon are not cleaned up
automatically (the package scripts run as root). To fully remove, run:

```sh
systemctl --user disable --now stream-deck-pedal
```

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

The packages embed the udev rules and the systemd user unit. The udev rules are
installed/removed automatically via `postinstall.sh` / `postremove.sh`; the
daemon is enabled on first GUI launch (see "Daemon" above).

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
