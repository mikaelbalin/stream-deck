# Tauri development container
# Base: Ubuntu 24.04 (LTS) — matches Tauri's Debian/Ubuntu prerequisites.
FROM ubuntu:24.04

# Avoid interactive prompts during package installation.
ENV DEBIAN_FRONTEND=noninteractive

# Tauri Linux system dependencies (Debian/Ubuntu) plus base tooling.
# See: https://v2.tauri.app/start/prerequisites/
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    wget \
    file \
    git \
    ca-certificates \
    pkg-config \
    apt-utils \
    libwebkit2gtk-4.1-dev \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    fish \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Install Rust via rustup (non-interactive, minimal profile, stable toolchain).
# See: https://rust-lang.org/learn/get-started/
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
    | sh -s -- -y --default-toolchain stable --profile minimal

# Install the latest Node.js LTS via NodeSource.
# See: https://nodejs.org/en/download
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm (latest) globally via npm.
# See: https://pnpm.io/installation
RUN npm install -g pnpm

# Create a non-root user (devcontainer convention).
# ubuntu:24.04 ships a `ubuntu` user with UID/GID 1000, so remove any
# conflicting user/group first to avoid "UID/GID already exists" errors.
ARG USERNAME=dev
ARG USER_UID=1000
ARG USER_GID=1000
RUN if getent passwd $USER_UID > /dev/null; then \
        userdel "$(getent passwd $USER_UID | cut -d: -f1)"; \
    fi \
    && if getent group $USER_GID > /dev/null; then \
        groupdel "$(getent group $USER_GID | cut -d: -f1)"; \
    fi \
    && groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && echo "$USERNAME ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Rust/rustup were installed as root; hand the toolchain dirs to the dev user
# so cargo can write its registry cache (otherwise `cargo` fails with EACCES).
RUN chown -R $USERNAME:$USERNAME /usr/local/cargo /usr/local/rustup

# Make fish the default shell for both the dev user and root.
RUN usermod -s /usr/bin/fish $USERNAME \
    && usermod -s /usr/bin/fish root
ENV SHELL=/usr/bin/fish

USER $USERNAME
WORKDIR /workspace
