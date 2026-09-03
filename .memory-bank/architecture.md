# Architecture

## System shape

A single Tauri 2 desktop application. Two halves:

- **Frontend** — SvelteKit 5 (Svelte 5, but written in Svelte 4 syntax: `export let`,
  `on:click`, `<slot />`), TypeScript, prerendered to static files by `adapter-static` and
  served inside the Tauri webview. No server runtime; SSR is disabled globally.
- **Backend** — Rust library crate `campaign_brain_copilot_lib`, exposed to the frontend
  through Tauri `invoke` commands. Owns all filesystem and SQLite access.

Data flows one direction per interaction: the UI calls a command, the command returns a
complete `CampaignOverview` snapshot, and the Svelte store replaces its state wholesale.
There is no incremental patching of client state from the backend.

## Source code paths

```
src/                              SvelteKit frontend
  app.css / app.html / app.d.ts   Global styles and shell
  routes/
    +layout.svelte                Root layout; calls initializeCampaign() on mount
    +layout.ts                    `export const ssr = false` — SPA mode
    +page.svelte                  Welcome screen: open / create / example vault
    campaign/
      +layout.svelte              Campaign shell: header, nav, "open a vault" empty state
      +page.svelte                Dashboard: metric cards + approved-location jump list
      notes/+page.svelte          Imported notes viewer
      suggestions/+page.svelte    Approve/reject review queue
      location/[id]/+page.svelte  Location briefing, loaded on mount by slug id
  lib/
    types/campaign.ts             TS mirrors of the Rust serde models (camelCase)
    tauri/client.ts               invoke() wrapper + browser mock fallback
    stores/campaign.ts            Svelte stores and all state transitions
    demo/exampleCampaign.ts       Hard-coded demo data used outside the Tauri runtime
  components/
    Campaign/CampaignNav|MetricCard|NotesList
    Common/EmptyState|SourceReferenceList
    Suggestions/SuggestionQueue

src-tauri/                        Rust backend
  src/main.rs                     Thin binary entry, feature-gated
  src/lib.rs                      run(): Tauri builder + invoke_handler registration
  src/commands/mod.rs             The seven Tauri commands + load_campaign()
  src/parser/mod.rs               Markdown reading and regex extraction (+ unit tests)
  src/db/mod.rs                   SQLite schema, reads, writes
  src/models/mod.rs               Shared serde types, slugify(), summarize_locations()
  tauri.conf.json                 Window, bundle, dev server config
  capabilities/default.json       Tauri permission set (core:default only)

example-vault/session-1..3.md     Seeded demo campaign notes
```

## Key technical decisions

### 1. The `desktop-app` Cargo feature

`src-tauri/Cargo.toml` defines `default = ["desktop-app"]`, and `desktop-app` is what pulls in
the optional `tauri` dependency. `#[tauri::command]` is applied via
`#[cfg_attr(feature = "desktop-app", tauri::command)]`, and `build.rs` only runs
`tauri_build::build()` when `CARGO_FEATURE_DESKTOP_APP` is set.

This exists so the parser, db, and models layers can be compiled and tested on a headless
machine without GTK/WebKit system libraries. **Always use `--no-default-features` when running
`cargo test` in CI or a container.** With default features, the build fails on missing
`gdk-3.0` unless the full Linux desktop toolchain is installed.

### 2. `CampaignOverview` as the single response type

`open_campaign`, `create_campaign`, `open_example_campaign`, and `approve_suggestion` all
return a full `CampaignOverview` (campaign name, vault path, notes, pending suggestions,
approved facts, location summaries). The frontend never merges partial updates; it just
`campaign.set(...)`. Simple and always consistent, at the cost of re-reading and re-parsing
the whole vault on every approval.

### 3. Suggestions are derived, approvals are stored

Suggestions are never persisted. On every load, `load_campaign()` re-runs extraction and then
subtracts anything already approved, matching on `(kind, lowercased value)` — note this is a
*global* match, not per-line, so approving "Blackglass Wharf" from `session-1.md` also
suppresses the suggestion for it in `session-3.md`.

Rejection is **not** persisted at all. It lives in the `dismissedSuggestions` writable store
and is cleared by `resetReviewState()` whenever a vault is opened. Rejected suggestions
reappear on restart. This is a known gap, not an intentional design.

### 4. Database lives inside the vault

`.campaign-brain.sqlite3` is written to the vault directory itself (`db::DATABASE_NAME`), so
the vault folder is self-contained and portable. Every db function opens a fresh
`Connection`; there is no pool or shared handle in Tauri state.

Schema (created idempotently by `db::initialize`, which is called on essentially every command):

- `campaigns(id, name, vault_path UNIQUE, created_at)` — registered but currently unused for
  reads. The campaign name shown in the UI comes from the vault directory name, not this table.
- `approved_facts(id, kind, value, note_path, line_number, snippet, created_at)` with
  `UNIQUE(kind, value, note_path, line_number)`; writes use `INSERT OR IGNORE`, so approving
  twice is a no-op.

`SuggestionKind` is stored as the strings `npc` / `location` / `plot_point` via
`db::format_kind`; `db::parse_kind` maps anything unrecognized back to `Npc`.

### 5. Browser mock fallback

`src/lib/tauri/client.ts` checks `'__TAURI_INTERNALS__' in window`. Outside the Tauri runtime
(i.e. plain `npm run dev` in a browser) every call is served from `demoCampaign` in
`src/lib/demo/exampleCampaign.ts`, held in a module-level `mockCampaign` variable and
deep-cloned via `JSON.parse(JSON.stringify(...))` on each read.

This means **the whole UI is developable and reviewable in a normal browser** without building
the Rust side. It also means the demo data is a second, hand-maintained copy of the shape the
Rust layer returns — if you change the models, update both.

### 6. Location identity is a slug

`models::slugify` lowercases, replaces every run of non-alphanumerics with a single `-`, and
trims dashes. It is the only link between a location name and its briefing URL
(`/campaign/location/[id]`). The frontend mock reimplements the same slug rule inline in
`client.ts`; keep the two in sync.

## Design patterns in use

- **Store-as-controller.** `src/lib/stores/campaign.ts` is the only place that calls the Tauri
  client. Components import actions (`approveCampaignSuggestion`, `openCampaignVault`, …) and
  read derived stores. No component invokes a command directly.
- **Derived filtering.** `visibleSuggestions` is a `derived` store combining backend
  suggestions with the local rejection list.
- **Presentational components.** Everything in `src/components/` takes props and callbacks
  (`onApprove`, `onReject`) and holds no store subscriptions.
- **Result-typed commands.** Every Rust command returns `Result<T, String>`, with errors
  formatted as human-readable sentences including the offending path. The UI surfaces the
  message directly, so error strings are user-facing copy.
- **serde renaming.** Rust structs use `#[serde(rename_all = "camelCase")]`; the enum uses
  `snake_case`. `src/lib/types/campaign.ts` mirrors this exactly by hand.

## Component relationships

```
+layout.svelte ──(onMount)──► initializeCampaign()
                                   │ reads localStorage 'campaign-brain-last-vault'
                                   ▼
                            campaign store  ◄──── openCampaignVault / createCampaignVault
                                   │                openExampleVault / approveCampaignSuggestion
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
 campaign/+layout          campaign/+page             campaign/suggestions
 (nav + guard)             (MetricCard,               (SuggestionQueue →
                            location list)             SourceReferenceList)
                                   │
                                   ▼
                        campaign/location/[id]
                        (fetchLocationBriefing → get_location_briefing)
```

`campaign/+layout.svelte` acts as the route guard: if the `campaign` store is null it renders
an empty state and a link home instead of the child route.

## Critical implementation paths

### Opening a vault

`+page.svelte` → `openCampaignVault(path)` → `client.openCampaign` → `invoke('open_campaign')`
→ `commands::open_campaign` → `load_campaign`:
existence check → `db::initialize` → `parser::read_markdown_notes` →
`db::list_approved_facts` → `parser::extract_suggestions` → filter out approved pairs →
`summarize_locations`. The store then persists `loaded.vaultPath` to `localStorage` and the
route navigates to `/campaign`.

### Extraction (`parser::extract_suggestions`)

Iterates notes, then lines. Skips empty lines and lines starting with `#`. Per line, in order:

1. **Locations** — matches a preposition (`at|in|near|beneath|under|inside|outside|from|to`),
   an optional `the`, then 1–3 capitalized words. Capture group 1 is the location value.
   Matched values are collected into `line_locations` for the current line.
2. **Plot points** — if the line contains any of `found|discovered|learned|promised|stole|
   killed|rescued|hid|hiding|admitted|decided|revealed|met` (case-insensitive), the **entire
   line** becomes the suggestion value.
3. **NPCs** — matches either an honorific (`Captain|Lady|Lord|Brother|Sister|Mayor|Master|
   Doctor|Professor`) plus a capitalized word, or a bare capitalized word of 4+ letters
   optionally followed by another. Skipped if the value is in the `should_skip_npc` list or if
   it was already matched as a location **on the same line**.

Dedup key is `"{kind:?}:{file_path}:{line}:{lowercased value}"`, held in a `HashSet` for the
whole run.

**Known weaknesses of this design** (the most likely thing you will be asked to improve):

- `should_skip_npc` is a hard-coded stop list that includes literal demo-vault location names
  (`"Old Lantern Square"`, `"Blackglass Wharf"`, `"Saint Branna Abbey"`, `"Frostward Hollow"`).
  It is overfitted to the example campaign and will not generalize.
- The location-vs-NPC exclusion only applies within a single line.
- Plot-point values are whole raw lines, so they are long and often duplicate the snippet.
- `note.file_path` is set to the **file name only**, not a path relative to the vault, so
  notes in subdirectories would collide — though extraction is non-recursive anyway
  (`read_markdown_notes` reads only top-level `.md` files).

### Approving a suggestion

`SuggestionQueue` → `approveCampaignSuggestion` → `invoke('approve_suggestion', {vaultPath,
suggestion})` — the whole `Suggestion` object is serialized back to Rust — →
`db::save_approved_fact` (`INSERT OR IGNORE`) → `load_campaign` returns a fresh overview with
that suggestion now filtered out.

### Location briefing

`get_location_briefing(vault_path, location_id)` loads all approved facts, finds the location
fact whose `slugify(value)` equals `location_id` (404-equivalent error if none), collects every
matching fact's source, then gathers approved **plot points whose `note_path` is one of the
files the location was mentioned in**. Relatedness is by shared source file, not by semantics.

## Registered but unused commands

`read_campaign_notes` and `generate_suggestions` are wired into `invoke_handler` but nothing in
the frontend calls them — the dashboard gets notes and suggestions from `CampaignOverview`
instead. They are usable entry points if you need note or suggestion data without the full
overview.

## Known gotchas

- **`open_example_campaign` uses a compile-time path.** It resolves
  `env!("CARGO_MANIFEST_DIR")/../example-vault`, which is correct in `tauri dev` but points at
  the build machine's filesystem in a packaged app. `tauri.conf.json` bundles `../example-vault`
  as a resource, but the command does not use the resource resolver, so the "Open example
  campaign" button is expected to fail in a real installed build.
- **There is no `svelte.config.js`.** SvelteKit config (including `adapter-static` with
  `fallback: 'index.html'`) is passed inline to the `sveltekit()` plugin in `vite.config.ts`.
  Adding a `svelte.config.js` later would need reconciling with that.
- **Dashboard "Approved facts" counts rows, not distinct facts.** The same NPC approved from
  three different lines counts three times.
