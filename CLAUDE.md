# CLAUDE.md

Guidance for Claude Code working in this repo. **This file is loaded every session — keep it short.** Detail belongs in `docs/`, read on demand.

## Project Context

A personal local-first worldbuilding wiki for the user, styled as an offline alternative to LegendKeeper. She builds worlds — characters, locations, factions, species — as a tree of pages with template-driven structure, stored as JSON files in a folder she controls.

Tauri v2 desktop app: React 19 + TypeScript + Vite renderer, Rust shell left as thin as Tauri ships it. Local-first, single-user, offline. LegendKeeper-import compatible on day one — she has an existing 75-page world to migrate.

**What it is not:** not a browser app (no hosted version), not a cloud service, not a LegendKeeper client, not an AI writing tool, not multi-user in Phase 1. Read-only publish for sharing comes in Phase 1.5.

## Policy Boundary

Hard lines. If a feature seems to require crossing one, push back and find a local-file alternative.

- **No network calls at all in Phase 1.** No telemetry, error reporting, update checks, or font CDNs — bundle everything. One exception, already shipped: LK import fetches images from LK's CDN, on explicit user confirmation only.
- **Never contact LegendKeeper's servers.** LK integration is file-based only — import and export of `.lk` files the user provides.
- **No cloud sync, auth, or accounts in Phase 1.** Not "let's just add a Supabase call." Phase 2 revisits this, and only if shared-folder sync genuinely stops working for her.
- **No LLM/AI features in the editor.** This is a writing tool for a human writer.
- OK: read/write JSON inside the user's project folder via Tauri's fs plugin. OK in Phase 1.5: generate a static HTML site to a user-chosen output folder.

## Plan

See `docs/plan.md`. Work phases in order, don't build ahead. `docs/spec.md` is the master spec for what a phase item means — don't invent scope that isn't in it.

## Tracking Docs

Updating these is part of completing a change, not a follow-up. Show them in the plan before executing.

- **`CHANGELOG.md`** — required for all user-visible changes. New dated section at top (`## 2026-07-30`), with Additions / Fixes / Adjustments / Renames as needed. Plain-language and user-visible — not internal refactor notes. Never `[Unreleased]`.
- **`docs/plan.md`** — forward-looking only: remaining phases, Queued Adjustments, Known Bugs, Future Features. When a phase completes, its detail moves to `docs/shipped.md` rather than staying here.
- **`docs/handoff.md`** — current state. Mark resolved items shipped, add newly discovered ones. Internal/architectural detail that doesn't belong in the changelog goes here.
- **`docs/lk-format.md`** — update whenever import/export mapping changes. This is what future-us reads when LK ships a new schema version.

## Commands

```bash
pnpm install
pnpm dev             # Vite only, browser-only — fast UI iteration, no Rust rebuild
pnpm tauri dev       # full desktop app, hot reload
pnpm build           # Vite production build → dist/
pnpm tauri build     # installers → src-tauri/target/release/bundle/
pnpm lint            # ESLint
pnpm test            # Vitest, single run
```

Tests are Vitest, colocated as `*.test.ts`. Services are the unit-tested layer — pure logic (path resolution, tree shape, LK conversion, autosave) is testable without a DOM, and that's where the bugs that cost real data have shown up. Components aren't tested; there's no jsdom/RTL setup and adding one isn't scoped.

## Architecture

**All app logic lives in the renderer.** No custom Rust commands unless the fs plugin genuinely can't do the job.

State is **Zustand** in `src/state/`. Editor is **BlockNote** — custom Info/Quote/Secret callout blocks live in `src/services/editor-blocks/`; extend it via its documented API, never fork it. Tree is **react-arborist**.

### Strict layer order — imports only flow downward

```
constants → services → hooks → components
```

Hooks may import from `state/` and `services/`. Services are plain TS, no React imports. Components live at `src/components/[layer]/File.tsx`, two levels from `src/` — reach `src/state/` as `../../state/`, never `../../../`.

### Architecture Rules

1. **One file, one responsibility** — no mixed concerns.
2. **Components render only** — all logic lives in hooks or services.
3. **No component imports stores directly** — always go through a hook.
4. **No component imports services directly** — always go through a hook.
5. **`filesystem-service.ts` is the only file that touches disk** — no exceptions.
6. **`lk-import.ts` and `lk-export.ts` are the only files that touch `.lk` format** — no exceptions.
7. **`template-registry.ts` owns all template definitions** — no template metadata elsewhere.
8. **`autosave.ts` is a plain service, not a hook** — the debounce timer must survive React re-renders.
9. **Constants are never hardcoded in logic files** — always imported from `src/constants/`.
10. **Max folder depth: 3 levels** — `src/components/feature/` is the deepest allowed.
11. **No backend, no database, no authentication, no network calls** — see Policy Boundary.
12. **Template placeholder copy is not reworded without asking** — the LK-style prompts are a designed asset, deliberately shaped. Don't extract them into an editable content system either.

### Naming

| Convention | Applied to |
|------------|-----------|
| `PascalCase.tsx` | React components |
| `lowercase-hyphenated.ts` | Everything else — hooks, services, constants, state |
| `use-*.ts` | Custom hooks |

No `index.ts` barrel files. No files named `utils`, `misc`, `helpers`, or `common`.

### Data on disk

The user picks a project folder on first launch (default: `~/Documents/Anamnesis/`). (`docs/spec.md` §Data model says the same thing; both were corrected together on 2026-07-30.)

```
Valeraverse/
├── project.json                 # tree order, expanded state, selection, project name
├── Canon/
│   ├── _folder.json             # folder's own metadata (color, tags, notes)
│   ├── Main Story.json          # a leaf page (item/event/note — never has children)
│   └── ...
├── AUs/
│   ├── _folder.json
│   └── Demonic AU/
│       ├── _folder.json
│       └── Characters/
│           ├── _folder.json
│           └── Valera Jiang/
│               ├── _page.json      # the character's own data
│               └── Her Sword.json  # a page nested under the character
└── assets/
    └── {assetId}.{ext}          # user-uploaded images
```

**Why file-per-node mirroring the tree:** the user's writing stays legible outside the app. Sync tools (Dropbox, Syncthing) only touch changed files. Git diffs are clean. If the app ever breaks, she still owns her work as plain JSON.

**Folders and nestable non-folder templates (character/location/faction/species) both store themselves inside their own directory** — `_folder.json` or `_page.json` — rather than as a flat sibling file. Deliberate, not incidental: a directory's ownership must never be derived from its *current* name, or a rename (or a sibling's suffix shifting) silently orphans its children on the next load. That happened once; see `docs/handoff.md` Phase 4 notes. Leaf templates (item/event/note) can never have children, so they stay a flat `Name.json`.

**Renames and reparents** are `fs.rename` on the file, or on the whole directory so children move for free. Watch Windows path length (~260 chars) on deep nesting.

**Sibling name collisions** append ` (2)`, ` (3)` to the filename or directory name only — never to the node's `name` in the JSON, and node IDs stay unique regardless. Two directory-storage nodes with the same name *do* collide; a directory-storage node and a same-named leaf page never do, since one's a directory and the other's a plain file. Suffixes are recomputed from creation order on every resolve, so changing one sibling renumbers the others — see `planRelocations` in `filesystem-service.ts`.

## Templates

Templates live in `src/services/template-registry.ts` as a plain data object — default tabs (with placeholder content) plus the sidebar property schema. Not user-editable in Phase 1; that's a Phase 2+ consideration and not scoped. `docs/prototype/anamnesis.jsx` holds the canonical copy for all 8 templates (Folder, Character, Location, Faction, Item, Event, Species, Note), but see the token warning below before opening it.

## LegendKeeper Import/Export

`.lk` files are gzipped JSON with content as ProseMirror JSON. **`docs/lk-format.md` has the full field mapping, the block translation table, and the current template-inference rules** — read it before touching import/export rather than working from memory.

Import shows a preview (tree + inferred template counts + a plain-language list of anything lossy) and requires confirmation before committing. **Round-trip target:** anything that started in LK re-exports losslessly. Anamnesis-only templates export as freeform documents with matching tab structures.

## Reference Docs (read only when relevant)

- `docs/spec.md` — original build spec, corrected against shipped code 2026-07-30; still the place for design intent, but the code wins on facts
- `docs/plan.md` — remaining phases, queued work, known bugs
- `docs/shipped.md` — what each completed phase delivered; historical, don't read by default
- `docs/handoff.md` — current state, design decisions, known gaps
- `docs/lk-format.md` — `.lk` mapping, ProseMirror → BlockNote translation
- `docs/glossary.md` — domain terms
- `docs/constants-and-theming.md` — CSS token system, palette, callout tokens
- `docs/components-reference.md` — feature → component file map
- `docs/project-summary.md` — plain-language overview for planning

## Deployment

Desktop-first, via `pnpm tauri build`: `.dmg`, `.msi`, `.deb`, `.AppImage`. No auto-update and no CI/CD in Phase 1 — manual builds until there's a release rhythm.

## Don't Do This

Everything in Architecture Rules and Policy Boundary above, plus:

- Don't fork BlockNote — extend it via its documented API.
- Don't add custom Rust commands unless the fs plugin genuinely can't do the job.
- Don't scatter template metadata across components.

## File Editing

When an Edit fails on unicode (em-dashes, curly quotes in placeholder copy), use targeted `sed` — don't load and rewrite the whole file through Python, which dumps its full contents into context. The template registry is large by design; edit it with targeted Edit calls, never a full rewrite.

## Communication

The user (shiro) is non-technical. Explain choices in plain language, not just code. She knows her use case — LK workflow, worldbuilding habits, how she and her co-writers actually work — better than the codebase implies. When she pushes back with non-technical reasoning, that's information about the product, not a preference to override.

When a discussion has multiple open decisions, end with a numbered list — one decision per item, options as `(a)/(b)/(c)` — self-contained enough that she can reply `1. a, 2. b, 3. yes`. Reasoning and tradeoffs go in prose above it.

Match her tone: casual, contractions. Don't manage her — no unsolicited advice about scope, pace, or self-care.

## Token Cost

Warn before, and offer the cheaper alternative:

- **`/compact`** — cost scales with session length; 20–30% of the usage budget in one shot on a long session. Alternative: start a new session earlier.
- **Reading `template-registry.ts` or `docs/prototype/anamnesis.jsx` whole** (~10k tokens each) — use `offset`/`limit` or `Grep` for the relevant section.
- **Parsing the real `Valeraverse.lk`** — ~220KB decompressed, 75 resources. Load a few resources at a time unless the full structure is genuinely needed.
- **Full-file `Write` where a targeted `Edit` would do.**
- **Open-ended subagent tasks** — give a narrow question, or use `Grep`/`Glob` directly.
