# Tasks

Repeatable workflows for this repository. Add an entry here whenever a task is likely to be
performed again in the same shape. Keep entries concrete: exact files, exact steps.

---

## Add a new Tauri command

**Last performed:** not yet recorded (pattern derived from the seven existing commands)

**Files to modify:**
- `src-tauri/src/commands/mod.rs` — write the function
- `src-tauri/src/lib.rs` — register it in `invoke_handler![...]` (list is alphabetical)
- `src-tauri/src/models/mod.rs` — add any new payload/response struct
- `src/lib/types/campaign.ts` — mirror the new types in TypeScript
- `src/lib/tauri/client.ts` — add the wrapper plus its non-Tauri mock branch
- `src/lib/stores/campaign.ts` — add the action that components will call
- `src/lib/demo/exampleCampaign.ts` — extend demo data if the mock needs it

**Steps:**
1. Define the response struct in `models/mod.rs` with
   `#[derive(Debug, Clone, Serialize, Deserialize)]` and `#[serde(rename_all = "camelCase")]`.
2. Write the command in `commands/mod.rs`, annotated
   `#[cfg_attr(feature = "desktop-app", tauri::command)]`, returning `Result<T, String>`.
   Format errors as full user-facing sentences that include the offending path — the UI shows
   the string verbatim.
3. Register the command in `lib.rs`, keeping the handler list alphabetized.
4. Mirror the types in `src/lib/types/campaign.ts` using camelCase field names.
5. Add the client wrapper in `client.ts`, guarded by `isTauriRuntime()`, with a mock branch
   that returns cloned demo data so browser-only development still works.
6. Expose an action from `stores/campaign.ts`. Components must not call the client directly.
7. Verify: `npm run check` and
   `cargo test --manifest-path src-tauri/Cargo.toml --no-default-features`.

**Gotchas:**
- Argument names cross the boundary in camelCase: the Rust parameter `vault_path` is passed as
  `{ vaultPath }` from TypeScript.
- If the command mutates campaign state, return a full `CampaignOverview` (call
  `load_campaign`) rather than a partial result — the store replaces state wholesale.
- Commands that touch the database must call `db::initialize(&vault)` first; there is no
  shared connection.

---

## Add or change an extraction rule

**Last performed:** not yet recorded

**Files to modify:**
- `src-tauri/src/parser/mod.rs` — the regex and the per-line matching order
- `src-tauri/src/parser/mod.rs` `#[cfg(test)] mod tests` — assertions for the new behavior
- `src-tauri/src/models/mod.rs` — only if adding a new `SuggestionKind`
- `src-tauri/src/db/mod.rs` — `format_kind` / `parse_kind`, only if adding a kind
- `src/lib/types/campaign.ts` — the `SuggestionKind` union, only if adding a kind
- `example-vault/*.md` — add a note line that exercises the rule

**Steps:**
1. Add or edit the `Regex::new(...)` call at the top of `extract_suggestions`, propagating
   compile errors with a `format!("Unable to compile ... matcher: {error}")` message.
2. Place the match logic in the per-line block. Order matters: locations run first and record
   into `line_locations`, which NPC matching then uses to avoid double-reporting.
3. Route every hit through `push_suggestion` so dedup keys stay consistent.
4. Add a case to `extracts_npcs_locations_and_plot_points_with_sources`, or write a new test.
5. Run `cargo test --manifest-path src-tauri/Cargo.toml --no-default-features`.

**Gotchas:**
- Empty lines and lines starting with `#` are skipped before any matching happens.
- Adding a `SuggestionKind` requires touching the Rust enum, both db mapping functions, and
  the TypeScript union — `parse_kind` silently falls back to `Npc` for unknown strings, so a
  missed mapping shows up as wrong data rather than an error.
- Approved-fact filtering in `load_campaign` matches on `(kind, lowercased value)` globally,
  so changing how a value is formatted will resurrect previously approved suggestions.

---

## Add a new campaign screen

**Last performed:** not yet recorded

**Files to modify:**
- `src/routes/campaign/<name>/+page.svelte` — the route
- `src/components/Campaign/CampaignNav.svelte` — add to the `links` array if top-level
- `src/components/...` — any new presentational component

**Steps:**
1. Create the route under `src/routes/campaign/` so it inherits the campaign layout guard,
   which already handles the "no vault open" case.
2. Read state with `$campaign` / `$visibleSuggestions` from `$lib/stores/campaign`; wrap the
   body in `{#if $campaign}`.
3. Use `EmptyState` for the no-data case and `SourceReferenceList` anywhere a fact is shown —
   every displayed fact should carry its source.
4. Set a page title with `<svelte:head><title>… | Campaign Brain Co Pilot</title></svelte:head>`.
5. Add the nav link if the screen is top-level.
6. Run `npm run check`, then `npm run dev` and click through in a browser — the mock client
   serves demo data with no Rust build needed.

**Gotchas:**
- Styles are per-component `<style>` blocks; there is no design-token file. Copy the panel
  recipe from an existing page: `background: rgba(15, 23, 42, 0.72)`,
  `border: 1px solid rgba(148, 163, 184, 0.18)`, `border-radius: 1rem`.
- Components use Svelte 4 syntax (`export let`, `on:click`, `<slot />`) even though Svelte 5 is
  installed. Match the existing style rather than introducing runes piecemeal.
- Data loading on a dynamic route happens in `onMount`, not in a `+page.ts` load function — see
  `campaign/location/[id]/+page.svelte`.
