# Context

**Updated:** 2026-09-04

## Current work focus

Create-vault flow: in-app folder picker plus remembered existing vaults.

## Recent changes

- Replaced the welcome-screen typed path field with an in-app folder picker
  (`FolderPicker.svelte`). Create vault can make a folder and select it; browse
  picks an existing notes folder.
- Added Tauri commands `list_directory` and `create_directory` (no
  `tauri-plugin-dialog`; native create-folder is macOS-only). Browser/dev uses
  `src/lib/demo/mockFileSystem.ts`.
- Created vaults are stored in `localStorage` (`campaign-brain-known-vaults`) and
  listed under **Existing vaults**. Campaign header has **Change vault**.
- Tests: Rust list/create/reopen, Vitest picker + known-vaults store, Playwright
  create-then-open.
- Folder picker follows directory symlinks and can jump to an absolute path (other
  Windows drives, UNC shares). Up from a Windows drive root lists `::roots`.

## Repository state

Verification that passed on 2026-09-04 after the folder-picker work:

- `npm run check` — 0 errors, 0 warnings
- `npm run test:unit` — 20 passed
- `npm run test:e2e` — 4 passed (Playwright Chromium)
- `npm run build` — succeeds
- `cargo test --no-default-features` — 9 passed, 1 ignored

## Next steps

Nothing is committed to. Remaining candidates:

1. **Persist rejections.** Rejected suggestions currently live only in a Svelte store and
   reappear after restart. Needs a `rejected_facts` table and filtering in `load_campaign`.
2. **De-overfit the NPC extractor.** `parser::should_skip_npc` hard-codes example-vault
   location names as a stop list; it will not generalize to a real campaign.
3. **Fix `open_example_campaign` for packaged builds.** It now uses Tauri's resource resolver
   in `desktop-app` builds, but that path is still untested in CI.
4. **Fix the `cargo test` command in `README.md`** — it contains an absolute CI runner path.

## Open questions for the developer

- Is `brief.md` an accurate statement of scope? It was inferred from the code, not dictated.
- Is regex-only extraction a permanent constraint, or is a local model acceptable later?
- Prefer this in-app picker, or still add `tauri-plugin-dialog` as a native alternative?
