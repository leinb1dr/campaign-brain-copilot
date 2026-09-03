# Context

**Updated:** 2026-09-03

## Current work focus

Memory bank initialization. No feature work is in progress.

## Recent changes

- Created `.memory-bank/` with `brief.md`, `product.md`, `context.md`, `architecture.md`,
  `tech.md`, and `tasks.md`.
- Added `AGENTS.md` at the repo root and `.cursor/rules/memory-bank.mdc` so agents are required
  to read the memory bank before every task.
- No application code was modified.

## Repository state

The application is feature-complete against its original bootstrap scope. All five screens
work: welcome, dashboard, imported notes, suggestions review, and location briefing. Git
history is short — an initial commit, a bootstrap commit, and the merge of PR #1.

Verified locally on 2026-09-03: `npm run check` clean, `npm run build` succeeds,
`cargo test --no-default-features` passes 2 tests.

## Next steps

Nothing is committed to. The clearest candidates, in rough order of value:

1. **Persist rejections.** Rejected suggestions currently live only in a Svelte store and
   reappear after restart. Needs a `rejected_facts` table and filtering in `load_campaign`.
2. **De-overfit the NPC extractor.** `parser::should_skip_npc` hard-codes example-vault
   location names as a stop list; it will not generalize to a real campaign.
3. **Fix `open_example_campaign` for packaged builds.** It resolves a compile-time
   `CARGO_MANIFEST_DIR` path instead of using Tauri's resource resolver.
4. **Add a native folder picker.** Requires `tauri-plugin-dialog` plus a capability entry;
   today the user types a path.
5. **Fix the `cargo test` command in `README.md`** — it contains an absolute CI runner path.

## Open questions for the developer

- Is `brief.md` an accurate statement of scope? It was inferred from the code, not dictated.
- Is regex-only extraction a permanent constraint, or is a local model acceptable later?
