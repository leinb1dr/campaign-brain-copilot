# Tech

## Technologies

### Frontend
| Thing | Version | Notes |
|---|---|---|
| SvelteKit | ^2.63.0 | SPA mode, `ssr = false` |
| Svelte | ^5.56.1 | Svelte 5 installed, but code uses Svelte 4 syntax throughout |
| `@sveltejs/adapter-static` | ^3.0.10 | `fallback: 'index.html'`, output to `build/` |
| `@sveltejs/vite-plugin-svelte` | ^7.1.2 | SvelteKit config is passed inline here |
| Vite | ^8.0.16 | |
| TypeScript | ^6.0.3 | `strict: true`, `checkJs: true` |
| `svelte-check` | ^4.6.0 | The only frontend lint/typecheck gate |
| `@tauri-apps/api` | ^2.11.1 | The one runtime dependency |
| `@tauri-apps/cli` | ^2.11.4 | |

There is no ESLint, no Prettier config, and no frontend test runner. Formatting convention in
existing files is **tabs** for indentation in `.svelte`/`.ts`, single quotes, semicolons.
`campaign/+layout.svelte` and `+layout.svelte` use double quotes — the codebase is not
perfectly consistent; match the file you are editing.

### Backend
| Crate | Version | Purpose |
|---|---|---|
| `tauri` | 2.8.5 | Optional, behind the `desktop-app` feature |
| `tauri-build` | 2.4.1 | Build dependency, also feature-gated |
| `rusqlite` | 0.37.0 | `bundled` feature — SQLite is compiled in, no system libsqlite needed |
| `regex` | 1.12.2 | All extraction |
| `serde` / `serde_json` | 1.0.228 / 1.0.145 | Command payload serialization |

Edition 2021. Crate name `campaign-brain-copilot`, lib name `campaign_brain_copilot_lib`,
crate types `staticlib`, `cdylib`, `rlib`.

## Development setup

```bash
npm install                # also runs `svelte-kit sync` via the prepare script
npm run dev                # Vite dev server; UI runs against the browser mock data
npm run tauri dev          # full desktop app (needs the Linux desktop toolchain)
npm run check              # svelte-kit sync && svelte-check
npm run build              # static build into ./build
cargo test --manifest-path src-tauri/Cargo.toml --no-default-features
```

### Toolchain requirements — read this before running cargo

- **Rust must be recent.** The dependency graph pulls crates using edition 2024. Rust 1.83
  fails at manifest-parse time with `feature 'edition2024' is required`. Verified working on
  stable 1.98.0. If cargo errors that way, run `rustup update stable && rustup default stable`.
- **`--no-default-features` for headless work.** The default `desktop-app` feature pulls in
  Tauri, whose build requires GTK/WebKit (`gdk-3.0`, `webkit2gtk`) via pkg-config. On a bare
  container `cargo check` with default features fails with
  `The system library 'gdk-3.0' required by crate 'gdk-sys' was not found`. The parser, db, and
  models code — which is everything with tests — compiles fine without default features.
- **`engine-strict=true`** is set in `.npmrc`, though `package.json` declares no `engines`
  field, so it currently has no effect. Node 22 works.

### Verified baseline (2026-09-03)

- `npm run check` — 0 errors, 0 warnings
- `npm run build` — succeeds, adapter-static writes `build/`
- `cargo test --no-default-features` — 2 passed (both in `parser::tests`)

## Technical constraints

- **No network access at runtime.** The app is local-first by design; do not introduce HTTP
  clients, telemetry, or remote model calls.
- **Do not write to the user's markdown.** The only file the app creates inside a vault is
  `.campaign-brain.sqlite3` (plus `session-0.md` when *creating* a brand-new vault).
- **Tauri permissions are minimal.** `src-tauri/capabilities/default.json` grants only
  `core:default`. Folder picking is done with custom `list_directory` / `create_directory`
  commands (plain `std::fs`), not `tauri-plugin-dialog` or `tauri-plugin-fs`. The welcome
  screen uses an in-app picker so creating a folder works on every platform and in the
  browser mock.
- **SSR is off and must stay off.** Code freely touches `window` and `localStorage`; the
  `browser` guard in the store is the only concession.
- **Rust ↔ TS types are hand-mirrored.** No codegen. Changing a struct in
  `src-tauri/src/models/mod.rs` requires the matching edit in `src/lib/types/campaign.ts`, and
  usually in `src/lib/demo/exampleCampaign.ts` too.

## Testing

- **Rust:** `#[cfg(test)]` in `src-tauri/src/parser/mod.rs` (extraction) and
  `src-tauri/src/commands/mod.rs` (open/approve/briefing against a temp copy of
  `example-vault`). Always `cargo test --manifest-path src-tauri/Cargo.toml --no-default-features`.
  An ignored test `dump_example_campaign_fixture` regenerates `e2e/fixtures/example-campaign.json`.
  `open_example_campaign` is skipped: the no-Tauri path mutates the checked-in vault, and the
  desktop path needs `AppHandle`.
- **Vitest:** `npm run test:unit` — jsdom + `@testing-library/svelte`. Pins
  `visibleSuggestions`, localStorage persistence, and `SuggestionQueue`. IPC is mocked at
  `$lib/tauri/client`; `mockIPC` from `@tauri-apps/api/mocks` is unused because stores do not
  call `invoke` directly.
- **Playwright:** `npm run test:e2e` — Chromium only, Vite on port 1420. Tests stub
  `window.__TAURI_INTERNALS__.invoke` via `page.addInitScript` so `isTauriRuntime()` is true
  and the production `invokeCommand` path runs. Do **not** use `mockIPC` here (it patches the
  Node realm, not the page). Fixture data is `e2e/fixtures/example-campaign.json`, asserted
  equal to a fresh `open_campaign` of `example-vault`.
- **CI:** `.github/workflows/ci.yml` — `rust` job (`dtolnay/rust-toolchain@stable`,
  `Swatinem/rust-cache@v2` with `workspaces: src-tauri -> target`, cargo test no-default-features)
  and `frontend` job (npm ci, check, vitest, build, Playwright Chromium + report artifact).
  `release` needs both. No GTK/WebKit packages on the rust-lib job.

## Tool usage patterns

- `npm run dev` is the fast loop for UI work — the mock client in `src/lib/tauri/client.ts`
  makes every screen reachable in a plain browser with no Rust build.
- `npm run tauri dev` runs `npm run dev -- --host 0.0.0.0 --port 1420` first and points the
  webview at `http://localhost:1420` (see `tauri.conf.json` → `build.beforeDevCommand`).
- The "Open example campaign" button on the welcome screen is the quickest way to get real
  data in front of you when running the full desktop app in dev.

## Known documentation discrepancy

`README.md` lists the test command with a hard-coded absolute path from a GitHub Actions
runner (`cargo test --manifest-path /home/runner/work/...`). It should be a repo-relative path
with `--no-default-features`. Worth fixing next time README is touched.
