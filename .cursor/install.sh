#!/usr/bin/env bash
# Idempotent bootstrap for the Campaign Brain Co Pilot Cloud Agent environment.
# Runs after the repository is checked out. Safe to run repeatedly.
set -euo pipefail

cd "$(dirname "$0")/.."

# The Cargo dependency graph pulls crates that use edition 2024, which needs a
# recent Rust. The default base image ships Rust 1.83, which fails at manifest
# parse time ("feature 'edition2024' is required"), so pin the stable toolchain.
if command -v rustup >/dev/null 2>&1; then
	rustup default stable
	rustup update stable
fi

# Frontend dependencies. `npm ci` respects package-lock.json and also runs
# `svelte-kit sync` via the package.json `prepare` script.
npm ci

# Warm the Rust test build so the first `cargo test` is fast. The default
# `desktop-app` feature pulls in Tauri (GTK/WebKit), which is unavailable in a
# headless VM, so build the testable parser/db/models layers without it.
cargo build --manifest-path src-tauri/Cargo.toml --no-default-features --tests
