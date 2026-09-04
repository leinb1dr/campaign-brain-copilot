# Product

## Why this project exists

Dungeon Masters accumulate session notes faster than they can organize them. The notes are
usually messy, written in a hurry mid-session, and scattered across markdown files. The
information a DM needs at the table — who is this NPC, what happened at this location, what
did the party promise whom — is buried in prose that nobody has time to index.

Existing tools solve this by asking the DM to adopt a structured wiki or database up front.
That fails in practice: structure is work, and work during a session does not happen.

Campaign Brain Co Pilot inverts this. The DM keeps writing messy markdown. The app does the
indexing afterward, and asks for confirmation rather than assuming.

## Problems it solves

- **Notes are unsearchable in practice.** Grep finds strings, not entities. The app builds a
  list of NPCs, locations, and plot points across all sessions.
- **Structured tools demand structure too early.** Here, structure is derived after the fact.
- **Automated extraction is not trustworthy.** Regex extraction over prose produces noise, so
  the product treats every extraction as a proposal requiring human sign-off.
- **Derived data loses its provenance.** Every fact points back to a file, a line number, and
  the exact snippet it came from.

## How it should work

1. **Open a vault.** The welcome screen opens a folder picker (create a folder and select
   it, or browse to an existing notes folder) and lists previously opened vaults. The DM can
   also load the bundled example campaign. Known vaults and the last opened path are
   remembered in `localStorage`. A new vault is seeded with a `session-0.md` prompt sheet.
2. **Notes are read, never written.** Top-level `.md` files in the vault are loaded verbatim.
3. **Suggestions are extracted.** Regex matchers scan each non-empty, non-heading line for
   NPC names, location phrases, and plot-point verbs. Each match becomes a suggestion tagged
   with its file, line number, and full line snippet.
4. **The DM reviews the queue.** Each suggestion can be approved or rejected. Approving writes
   an `approved_facts` row into the vault's SQLite database and removes the suggestion from
   future extraction runs. Rejecting hides it for the current session only.
5. **Canon accumulates into briefings.** Approved locations appear on the dashboard and each
   one gets a briefing page listing its source snippets and the approved plot points that came
   from the same notes.

## User experience goals

- **Nothing is a surprise.** The DM should never find a fact in the app they did not approve.
- **Everything is verifiable in one glance.** Source references are shown inline with the
  suggestion, not hidden behind a click.
- **The vault stays portable.** Deleting the app leaves the markdown untouched; copying the
  vault folder carries the canon database with it.
- **Empty states teach.** Every screen with no data explains what action produces data
  (see `EmptyState.svelte` usage across all routes).
- **Dark, low-glare, table-friendly.** The UI is a dark slate/blue palette suited to playing
  in a dim room.

## Current product state

All five screens exist and work end to end: welcome, dashboard, imported notes, suggestions
review, and location briefing. The extraction quality is deliberately crude — see the known
weaknesses in `architecture.md` — and is the most likely area for product iteration.
