# Project Brief — Campaign Brain Co Pilot

> **Owner: the developer.** This file is the source of truth for project scope. Agents must
> not rewrite it; they may only suggest improvements. It was scaffolded from the existing
> code and README during memory bank initialization, so please review and correct it.

## What this is

A local-first desktop application for tabletop RPG Dungeon Masters. It reads a "campaign
vault" of plain markdown session notes, extracts candidate NPCs, locations, and plot points
from them, and lets the DM approve or reject each candidate before it becomes campaign canon.

## Core requirements

1. **Markdown is the source of truth.** The app reads `.md` files from a folder the user
   chooses. It never rewrites, reformats, or takes ownership of those files.
2. **Nothing becomes canon without human approval.** Extraction produces *suggestions*. Only
   an explicit approval promotes a suggestion into stored, structured campaign state.
3. **Every stored fact is traceable.** An approved fact always carries the file and line
   number it came from, plus the raw snippet, so the DM can verify it against the note.
4. **Local-first and offline.** All state lives on the user's machine. The structured
   database lives inside the vault folder itself, so the vault is fully portable.
5. **Fast at the table.** The DM should be able to pull up a location briefing mid-session
   without hunting through notes.

## Non-goals

- No cloud sync, accounts, or multiplayer.
- No LLM/AI inference. Extraction is deterministic and regex-based by design.
- Not a note editor. Authoring happens in whatever markdown tool the DM already uses.

## Definition of done for a feature

- Behaves correctly against the bundled `example-vault` demo campaign.
- Keeps source references intact end to end (Rust extraction → SQLite → UI).
- `npm run check` is clean and `cargo test` passes.
