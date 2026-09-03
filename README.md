# Campaign Brain Co Pilot

A local-first desktop app for Dungeon Masters built with Tauri 2, SvelteKit + TypeScript, Rust, and SQLite.

## What it does

- Opens or creates a campaign vault made of raw markdown files
- Treats markdown notes as the source of truth
- Extracts regex-based NPC, location, and plot-point suggestions with file + line references
- Lets the DM approve or reject suggestions before they become canon
- Stores approved facts in a local SQLite database inside the vault
- Provides dashboard, note review, suggestion review, and location briefing screens

## Project layout

- `/src` - SvelteKit frontend routes, stores, and components
- `/src-tauri` - Rust backend commands, parser, and SQLite layer
- `/example-vault` - Seed markdown notes for the bundled demo campaign

## Commands

```bash
npm install
npm run check
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri dev
```

`npm run tauri dev` starts Vite on the fixed port `1420` that `src-tauri/tauri.conf.json`
points at, so run it instead of starting Vite yourself. Building the desktop app needs
Rust 1.88 or newer plus the [Tauri system prerequisites](https://v2.tauri.app/start/prerequisites/).

## Frontend/backend wiring

- SvelteKit runs as a prerendered SPA (`@sveltejs/adapter-static`, `ssr = false`) because
  Tauri loads the frontend from disk rather than from a Node server.
- `frontendDist` points at `/build`, the adapter's output directory.
- `src/lib/tauri/client.ts` detects whether it is running inside the webview and falls back
  to demo data when the app is opened in a plain browser.

## Example campaign vault

Use the "Open example campaign" action on the welcome screen to load the seeded notes under `/example-vault`.
