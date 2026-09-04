# Context

**Updated:** 2026-09-04

## Current work focus

Layered automated tests for the existing campaign flow (Rust library, Vitest, Playwright).
No product-feature work is in progress.

## Recent changes

- Added command-level `cargo test --no-default-features` coverage against a temp copy of
  `example-vault`: SQLite round-trip, approved-fact dedupe, location briefing assembly.
- `open_example_campaign` is still untested: without `desktop-app` it would write SQLite into
  the checked-in vault; with `desktop-app` it needs a Tauri `AppHandle`.
- Added Vitest (`jsdom`) for `visibleSuggestions`, localStorage vault persistence, and
  `SuggestionQueue`.
- Added Playwright Chromium tests that stub `window.__TAURI_INTERNALS__.invoke` so the
  production `invokeCommand` path runs instead of the browser demo fallback. Campaign JSON is
  generated from `open_campaign(example-vault)` and kept honest by a Rust fixture assertion.
- Split `.github/workflows/ci.yml` into `rust` and `frontend` jobs. Release still depends on
  both. No WebdriverIO / native-binary smoke suite.

## Repository state

The application is still feature-complete against its original bootstrap scope. Verification
that passed on 2026-09-04:

- `npm run check` — 0 errors, 0 warnings
- `npm run test:unit` — 11 passed
- `npm run test:e2e` — 3 passed (Playwright Chromium; no visual browser-tool review)
- `npm run build` — succeeds
- `cargo test --no-default-features` — 6 passed, 1 ignored (fixture dump helper)

## Next steps

Nothing is committed to. The clearest candidates, in rough order of value:

1. **Persist rejections.** Rejected suggestions currently live only in a Svelte store and
   reappear after restart. Needs a `rejected_facts` table and filtering in `load_campaign`.
2. **De-overfit the NPC extractor.** `parser::should_skip_npc` hard-codes example-vault
   location names as a stop list; it will not generalize to a real campaign.
3. **Fix `open_example_campaign` for packaged builds.** It now uses Tauri's resource resolver
   in `desktop-app` builds, but that path is still untested in CI.
4. **Add a native folder picker.** Requires `tauri-plugin-dialog` plus a capability entry;
   today the user types a path.
5. **Fix the `cargo test` command in `README.md`** — it contains an absolute CI runner path.

## Open questions for the developer

- Is `brief.md` an accurate statement of scope? It was inferred from the code, not dictated.
- Is regex-only extraction a permanent constraint, or is a local model acceptable later?
