# AGENTS.md — Campaign Brain Co Pilot

## STOP: read the Memory Bank first

**Before doing anything else in this repository — before answering, planning, searching, or
editing — read every file in `.memory-bank/`.** This is mandatory and applies to every task,
including ones that look trivial.

```
.memory-bank/brief.md          Scope and requirements. Developer-owned. Source of truth.
.memory-bank/product.md        Why the project exists and how it should behave.
.memory-bank/context.md        Current focus, recent changes, next steps.
.memory-bank/architecture.md   System design, code paths, critical implementation paths.
.memory-bank/tech.md           Stack, setup, constraints, verified commands.
.memory-bank/tasks.md          Repeatable task workflows. Optional; may be empty.
```

Read them in that order. `brief.md` first, `tasks.md` last.

## Declare your status

Begin your first response of every task with one of:

- `[Memory Bank: Active]` — you read all the files above.
- `[Memory Bank: Missing]` — `.memory-bank/` is absent or empty. Warn the user that you are
  working without project context and suggest running `initialize memory bank`.

After the marker, state in one or two sentences what you understand the project to be and what
the current task is, so the user can catch a misalignment before you start work. For example:

> `[Memory Bank: Active]` Campaign Brain Co Pilot is a Tauri desktop app that extracts
> reviewable NPC, location, and plot-point suggestions from a DM's markdown notes. You're
> asking me to persist suggestion rejections, which `context.md` lists as the top next step.

## Why this exists

An agent's memory resets completely between sessions. The Memory Bank is the only link to
previous work — the accumulated understanding of this codebase that would otherwise be
rediscovered, imperfectly, every single time. Skipping it means repeating solved problems,
contradicting decisions already made, and missing constraints that are not visible in the code.

## Working rules

- **`brief.md` is developer-owned.** Never edit it. If it is wrong or incomplete, say so and
  propose specific wording; let the developer make the change.
- **If memory bank files contradict each other,** `brief.md` wins. Point out the discrepancy.
- **Update `context.md` when you finish a task.** Keep it short and factual — current focus,
  what changed, what's next. No speculation.
- **If a task matches an entry in `tasks.md`,** say so and follow the documented workflow so no
  step is missed.
- **If the task was repetitive and will recur,** offer: "Would you like me to add this task to
  the memory bank for future reference?"
- **If you make significant changes,** offer: "Would you like me to update the memory bank to
  reflect these changes?" Do not offer this for trivial edits.

## Triggers

| Phrase | What to do |
|---|---|
| `initialize memory bank` | Exhaustively analyze the project — all source, config, build setup, structure, docs, dependencies, tests — then write `product.md`, `context.md`, `architecture.md`, `tech.md`. Scaffold `brief.md` only if it does not exist. Finish by summarizing what you understood and asking the developer to verify it. Be thorough; this determines the quality of every future session. |
| `update memory bank` | Review **every** memory bank file, even ones that need no change. Re-review the project's current state. Focus on `context.md`. If given a source (e.g. "using information from @Makefile"), weight it heavily. |
| `add task` / `store this as a task` | Append an entry to `.memory-bank/tasks.md`: name, description, files to modify, step-by-step workflow, gotchas, and any context discovered during execution that was not already written down. |

## Context window management

If the session runs long and context fills up: suggest updating the memory bank to preserve
state, recommend starting a fresh conversation, and note that the new session will reload the
memory bank automatically.

## Verifying changes to this repository

```bash
npm run check                                                              # svelte-check
npm run build                                                              # static build
cargo test --manifest-path src-tauri/Cargo.toml --no-default-features      # Rust tests
```

`--no-default-features` is required in headless environments: the default `desktop-app` feature
pulls in Tauri, which needs GTK/WebKit system libraries. See `.memory-bank/tech.md` for the
full toolchain requirements, including the minimum Rust version.
