# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This is a personal local-first worldbuilding wiki app for the user, styled as an offline alternative to LegendKeeper. The user builds worlds (characters, locations, factions, species, etc.) via a tree of pages with template-driven structure. All content is stored as JSON files on disk in a folder the user controls.

**What this is:**
- Tauri v2 desktop app (React + TypeScript renderer, Rust shell)
- Local-first — the user's project folder is the source of truth, on their disk
- Single-user by default — no accounts, no cloud, no sign-in
- LegendKeeper-import compatible on Day 1 (the user has an existing 75-page world to migrate)
- Template-driven — new pages come pre-populated with structural prompts

**What this is NOT:**
- Not a browser app. It ships as a desktop app. There is no hosted version.
- Not a cloud service. There is no server, no backend database, no user auth.
- Not a LegendKeeper client. The app NEVER talks to LegendKeeper's servers or API. LK integration is import/export of `.lk` files the user manually provides.
- Not an AI writing tool. No LLM calls baked into the editor. The user writes; the app organizes.
- Not multi-user in Phase 1. Read-only publish for sharing comes in Phase 1.5.

## Policy Boundary

This project's design depends on a hard line:
- OK: Read/write JSON files inside the user's project folder via Tauri's fs plugin.
- OK: Import a `.lk` file the user drags in, export a `.lk` file the user asks for.
- OK (Phase 1.5): Generate a static HTML site to a user-chosen output folder for read-only sharing.
- NOT OK: Any network call to LegendKeeper's servers, ever. LK integration is file-based only.
- NOT OK: Any network call at all in Phase 1. No telemetry, no error reporting, no update checks, no font CDNs. Bundle everything.
- NOT OK: Any cloud sync, auth, or account layer in Phase 1. If a feature proposal requires "let's just add a Supabase call," the answer is no — Phase 2 is when we revisit that, and only if the shared-folder sync approach genuinely stops working for the user.
- NOT OK: Baking LLM/AI features into the editor. This is a writing tool for a human writer.

If a feature seems to require any of the above, push back and find a local-file alternative.

## Plan

See `docs/plan.md`. Work phases in order. Do not build ahead. The master spec is `docs/spec.md` — it's the reference for what any given phase item actually means; don't invent scope not in there.

## Tracking Docs

When shipping a change, update the tracking doc that owns the relevant item to reflect resolution. These updates are part of completing the change — show them in the plan before executing.

- `docs/plan.md` — mark completed phase items done. New in-scope work goes under the appropriate phase or a "Queued" section near the bottom.
- `docs/handoff.md` — mark resolved polish items as shipped (note the version or date). Add newly discovered issues to the appropriate section.
- `docs/lk-format.md` — when import/export changes, update the mapping notes. This doc is what future-us reads when LK ships a new schema version.
- `CHANGELOG.md` — required for all user-visible changes. Add a new dated section at the top with Additions / Fixes / Adjustments / Renames subheaders as appropriate. Plain-language, user-visible entries — not internal refactor notes.

## Commands

```bash
pnpm install         # install dependencies
pnpm dev             # Vite dev server, browser-only (for fast UI iteration without Rust rebuilds)
pnpm tauri dev       # full desktop app with hot reload
pnpm build           # Vite production build → dist/
pnpm tauri build     # full desktop installer → src-tauri/target/release/bundle/
pnpm lint            # ESLint
pnpm test            # Vitest unit tests (single run)
```

Tests are Vitest, colocated as `*.test.ts` next to what they cover. Services are the unit-tested layer — pure logic (path resolution, tree shape, LK conversion, autosave) is testable without a DOM, and that's where the bugs that cost real data have shown up. Components aren't tested; there's no jsdom/RTL setup and adding one isn't currently scoped.

## Architecture

Tauri v2 desktop app. React 19 + TypeScript + Vite in the renderer, Rust shell handling filesystem access via the `@tauri-apps/plugin-fs` plugin. **All app logic lives in the renderer.** Rust code is left as thin as Tauri ships it — no custom Rust commands unless there's a clear reason.

State management: **Zustand**. The store lives in `src/state/`. Hooks access it via `src/hooks/`; components never import the store directly.

Editor: **BlockNote** (`@blocknote/react`, `@blocknote/core`). Custom blocks for Info / Quote / Secret callouts live in `src/services/editor-blocks/`. Do not fork BlockNote — extend it via its documented extension API.

Tree: **react-arborist** for the left-panel tree. Drag/drop reparenting, filter, custom row rendering.

### Strict layer order — imports only flow downward:

```
constants → services → hooks → components
```

- Components may only import from `hooks/` (never stores or services directly).
- Hooks may import from `state/` and `services/`.
- Services are plain TS — no React imports.
- `filesystem-service.ts` is the *only* file that reads or writes project files on disk — no exceptions.
- `lk-import.ts` and `lk-export.ts` are the *only* files that touch the LegendKeeper `.lk` format.
- `template-registry.ts` is the *only* source of template definitions. Do not scatter template metadata across components.
- `autosave.ts` is a plain service, not a hook — the debounce timer must survive React re-renders.

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
12. **Template placeholder copy is not to be reworded without asking** — the LK-style prompts are deliberately shaped. See `docs/spec.md` §Templates.

### Naming Conventions

| Convention | Applied to |
|------------|-----------|
| `PascalCase.tsx` | All React component files |
| `lowercase-hyphenated.ts` | All non-component files (hooks, services, constants, state) |
| `use-*.ts` | Custom React hooks |
| No `index.ts` barrel files | Imports always reference the file directly |
| No `utils`, `misc`, `helpers`, `common` | Files are named after what they actually do |

### Import path depth

Components live at `src/components/[layer]/File.tsx` — two levels deep from `src/`. To reach `src/state/` or `src/services/` use `../../state/` and `../../services/`, not `../../../`.

### Data on disk

The user picks a project folder on first launch (default: `~/Documents/Anamnesis/`). Inside:

```
Valeraverse/
├── project.json                 # tree order, expanded state, selection, project name
├── Canon/
│   ├── _folder.json             # folder's own metadata (color, tags, notes)
│   ├── Main Story.json          # a leaf page node (item/event/note — never has children)
│   └── ...
├── AUs/
│   ├── _folder.json
│   ├── Demonic AU/
│   │   ├── _folder.json
│   │   ├── Characters/
│   │   │   ├── _folder.json
│   │   │   ├── Valera Jiang/
│   │   │   │   ├── _page.json   # the character's own data
│   │   │   │   └── Her Sword.json  # a page nested under the character
│   │   │   └── ...
│   │   └── ...
│   └── ...
└── assets/
    └── {assetId}.{ext}          # user-uploaded images
```

**Why file-per-node with tree-mirroring layout:** the user's writing is legible outside the app. Sync tools (Dropbox, Syncthing) only touch changed files. Git diffs are clean. If the app ever breaks, the user still owns their work as plain JSON.

**Folders and nestable non-folder templates (character/location/faction/species) both store themselves inside their own directory** — `_folder.json` for a folder, `_page.json` for a nestable page — rather than as a flat sibling file. This is deliberate, not incidental: a directory's ownership must never be derived from its *current* name (a rename or a sibling's suffix shifting would silently orphan its children on the next load — this happened once, see `docs/handoff.md`'s Phase 4 notes). Leaf templates (item/event/note) can never have children, so they stay a flat `Name.json` — no wrapping directory.

**Renames and reparents:** `fs.rename` on the file (leaf templates) or the whole directory (folders and nestable pages — children move for free). Watch Windows path-length limits (~260 chars); warn or truncate for deep nesting.

**Naming collisions between siblings:** append ` (2)`, ` (3)` to the filename (leaf templates) or the directory name (folders and nestable pages) only. Node IDs stay unique inside the JSON. A folder and a nestable page sharing a name *do* collide (both are directories); a folder or nestable page and a same-named leaf page never do (one's a directory, the other's a plain file).

## Reference Docs (read only when relevant)

- `docs/spec.md` — the master build spec. Everything derives from here.
- `docs/plan.md` — phased build roadmap; work top-down, don't build ahead
- `docs/data-model.md` — Node / Tab / Template / Project schemas, on-disk shape
- `docs/lk-format.md` — LegendKeeper `.lk` import/export mapping, ProseMirror block translation table
- `docs/glossary.md` — domain terms (node, tab, template, cascade color, secret block)
- `docs/handoff.md` — outstanding polish items, known quirks, deferred work

## Templates

Templates live in `src/services/template-registry.ts` as a plain data object. Each template defines its default tabs (with placeholder content) and its sidebar property schema. On creating a new page from a template, the tabs and properties are populated with the template's defaults; the user then edits from there.

**Template placeholder copy is a designed asset** — the LK-style walking-you-through-it prompts are deliberately shaped. Do not reword them without asking the user. The reference prototype at `docs/prototype/anamnesis.jsx` has the canonical copy for all 8 templates (Folder, Character, Location, Faction, Item, Event, Species, Note).

Templates are not user-editable in Phase 1 — they live in code. User-editable templates are a Phase 2+ consideration and not currently scoped.

## LegendKeeper Import/Export

The user has an existing 75-page `Valeraverse.lk` export that must import cleanly. `.lk` files are **gzipped JSON** with content stored as ProseMirror JSON — BlockNote-compatible with light adaptation. See `docs/lk-format.md` for the full field mapping.

**Import risk areas** (handle explicitly, don't silently drop):

- `panel` blocks with `panelType` — map to Info / Quote / Secret custom blocks
- `layoutSection` / `layoutColumn` — collapse to sequential blocks (BlockNote has no columns)
- `inlineExtension` (embedded icons) — strip or convert to text
- `mention` blocks — resolve `id` to our new node id via an id-map built during import
- `banner` per resource — preserve as page header image if present
- `iconColor` — map to our color feature (nearest preset, or store raw hex)

**On import, infer template from tab signature:**

- `[Overview, Backstory]` → character
- `[Overview, Map, History]` → location
- `[Overview, Biology, Lifestyle, Beliefs, Relations]` → species
- `[Main]` only → folder if it has children, else note
- Anything else → note, preserving the tabs as-is

Show a preview of the import (tree + inferred template counts) and require user confirmation before committing.

**Round-trip target:** anything that started in LK should re-export losslessly. New Anamnesis-only templates (Faction, Item, Event, Species) export as freeform documents with matching tab structures.

## Deployment

Desktop-first. Signed installers for macOS (`.dmg`), Windows (`.msi`), Linux (`.deb` and `.AppImage`). Tauri handles the bundling via `pnpm tauri build`.

No auto-update in Phase 1. The user manually downloads a new version from wherever we're hosting the installer.

No CI/CD for now. Manual builds until we hit a release rhythm.

## Don't Do This

- Don't hardcode strings, numbers, or colors in logic files — always import from `src/constants/`
- Don't import stores or services directly in components — always go through a hook
- Don't reach past `filesystem-service.ts` to touch disk from anywhere else
- Don't scatter template metadata across components — it lives in `template-registry.ts`
- Don't create `index.ts` barrel files
- Don't name files `utils`, `misc`, `helpers`, or `common`
- Don't nest folders deeper than `src/components/feature/`
- Don't reword template placeholder copy without asking — see Templates section
- Don't add cloud sync, auth, telemetry, or update checks in Phase 1
- Don't add anything that reaches LegendKeeper's servers — see Policy Boundary
- Don't bake LLM/AI features into the editor
- Don't fork BlockNote — extend it via its documented extension API
- Don't add custom Rust commands unless there's a real reason the fs plugin can't handle it

## File Editing

- When the Edit tool fails due to unicode characters (em-dashes, non-breaking spaces, template placeholder text with curly quotes, etc.), use targeted `sed` commands for surgical replacements — do **not** load and rewrite the entire file via Python or similar; that dumps the full file contents into context unnecessarily.
- The template registry file is large by design (8 templates × multiple tabs × placeholder content). Edit it with targeted Edit calls, not full rewrites.

## Communication

The user (shiro) is non-technical. Explain choices in plain language, not just code. When an exploratory or design discussion includes multiple decisions to make, finish the message with a numbered list of the specific clarifications you need from the user — one decision per item, with the options enumerated `(a)/(b)/(c)`. Lay out reasoning and tradeoffs in prose above the list as usual, but the trailing list should be self-contained enough that the user can reply with `1. a, 2. b, 3. yes` and unambiguously approve the path forward.

If the user pushes back on a technical choice with non-technical reasoning, take it seriously — she knows her use case (LK workflow, worldbuilding habits, how she and her co-writers actually work) better than the codebase implies. When she says "that would drive me bonkers," that's information about the product, not a preference to override.

Do not manage her — no unsolicited advice about scope, pace, or self-care. Match her tone; she uses casual voice and contractions, so do the same in explanations.

## Token Cost Warnings

Some actions consume a disproportionate number of tokens. Warn the user **before** performing any of the following:

- **`/compact`** — Summarizes the entire conversation history. Cost scales with session length. On a long session with many file reads and code generations, this can consume 20–30% of your usage budget in one shot. **Alternative:** Start a new session earlier (before context gets large), or accept the larger per-message cost of a long session instead of compacting.

- **Reading very large files** — Reading a file with thousands of lines dumps it all into context. The template registry and any large imported LK JSON are the most likely offenders here. **Alternative:** Use `offset` + `limit` parameters to read only the relevant section, or use `Grep` to find specific lines first.

- **Full file rewrites via `Write`** — Rewriting an existing file sends the entire contents through the model. **Alternative:** Use `Edit` for targeted changes whenever possible.

- **Long Agent/subagent tasks** — Spawning an agent on a vague or open-ended task can burn many tokens exploring dead ends. **Alternative:** Give the agent a specific, narrow question; or use `Grep`/`Glob` directly for simple searches.

- **Parsing the user's actual `Valeraverse.lk` for testing** — the file is ~220KB decompressed with 75 resources and ProseMirror content. Load selectively (a few resources at a time) unless you specifically need the full structure.

When any of these is about to happen on a large or expensive operation, say so and ask for confirmation or suggest the cheaper alternative.
