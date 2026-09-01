# CLAUDE.md

Guidance for Claude Code working in this repo. **This file is loaded every session — keep it short.** Detail belongs in `docs/`, read on demand.

## Project Context

A personal local-first worldbuilding wiki for the user, styled as an offline alternative to LegendKeeper. She builds worlds — characters, locations, factions, species — as a tree of pages with template-driven structure, stored as JSON files in a folder she controls.

Electron desktop app as of v0.6.0 (Phase 29): React 19 + TypeScript + Vite renderer, with the shell in `electron/`. Tauri built every release up to v0.5.0 and `src-tauri/` is still present — the icons and the version files are read from it — but nothing ships from it. Local-first, single-user, offline. LegendKeeper-import compatible on day one — she has an existing 75-page world to migrate.

**What it is not:** not a cloud service, not a LegendKeeper client, not an AI writing tool, not multi-user yet. A browser edition is wanted and unscheduled, not ruled out. Read-only publish for sharing comes in Phase 1.5.

## Two Promises

**Retired 2026-08-25: the Policy Boundary section that used to sit here.** It was
seven hard lines requiring a decision before any network call, and *Claude wrote
it*, not her — at project setup, and then enforced it against her for a month
while she pushed back on it repeatedly. It cost her a browser edition, sync, and
an argument every time a feature touched the network. Do not reinstate it, do
not re-derive it from these two promises, and do not ask permission to make a
network call. Network access is ordinary now; build the feature.

What survives, because it is worth building well rather than because it is a rule:

- **Nothing about her or her worlds is sent anywhere she didn't ask for.** No
  telemetry, no analytics, no error reporting, no crash uploads. This one is
  free — it costs nothing to not phone home — and it is the promise that makes
  the app hers. A feature that *she* asks for and that sends her data somewhere
  is fine; the line is unrequested collection, not network access.
- **The app keeps working with no internet.** Bundle fonts and assets; nothing
  the app needs to start, open a world, or save may sit behind a remote fetch. A
  network failure may disable a feature and say so; it may never break the app.
  This is a quality bar, not a restriction — it doesn't stop anything being
  built, it just says how.

Notes that outlived the section they were in:

- **A picture embedded by URL in a page is hers, decided 2026-08-11**, after the
  local-upload alternative was built and shipped without it. Don't remove it
  again, and don't gate it behind a warning she has to dismiss.
- **LK integration is file-based** — import and export of `.lk` files she
  provides. That's what exists and what the format docs describe, not a
  prohibition on anything.
- **No LLM/AI features in the editor.** Unrelated to the network policy and
  still standing: this is a writing tool for a human writer.

## Plan

See `docs/plan.md`. Work phases in order, don't build ahead. `docs/spec.md` is the master spec for what a phase item means — don't invent scope that isn't in it.

## Tracking Docs

Updating these is part of completing a change, not a follow-up. Show them in the plan before executing.

- **`CHANGELOG.md`** — **required for every change to the app.** The test is *did the code change*, not *is this visible* and not *has it been released* — the changelog is the running record of what changed, and releases are what announce. An internal refactor gets an entry saying so in plain language ("Internal tidy-up, nothing visible in the app: …"); the archive is full of them. **The one exception is a docs-only or planning-only change**, where nothing in the app moved — say that outright in the commit rather than omitting the entry silently. New dated section at top (`## 2026-07-30`), with Additions / Fixes / Adjustments / Changes / Renames as needed. Plain-language throughout, written for her rather than for the diff. Never `[Unreleased]`. Capped at 20 dated sections (`##` headers, not calendar days — one day can hold several). **Adding a new section is also the moment to check the count:** if the file now has more than 20, move the oldest section (bottom of this file) to the top of `docs/changelog-archive.md` in the same change, don't leave it for later. Both files stay newest-first. **Fix the moved section's relative links as you move it** — an entry written at the repo root links `docs/releasing.md` and `RELEASES.md`, which both break one directory down; they become `releasing.md` and `../RELEASES.md`. Seven had been broken this way before 2026-08-31.
- **`docs/plan.md`** — forward-looking only: remaining phases, Queued Adjustments, Known Bugs. Unscheduled ideas live in `docs/ideas.md`. When a phase completes, its detail moves to `docs/shipped.md` rather than staying here.
- **`docs/handoff.md`** — durable reasoning only: constraints and decisions that
  still govern the code. **Test before adding: *would reading this stop someone
  about to change this code from making a mistake?*** If yes, here. If it's a
  record of what was done, how it was verified, or how fast it got — that's
  `docs/shipped.md`. This file is read most sessions; keep it short enough that it
  stays worth reading.
- **`docs/shipped.md`** — the log: what each phase and engineering pass did,
  measurements, verification. **Nothing reads this by default**, so write freely —
  but lift anything that still binds up into `handoff.md`, or it's lost.
- **`docs/lk-format.md`** — update whenever import/export mapping changes. This is what future-us reads when LK ships a new schema version.

## Commands

```bash
pnpm install
pnpm dev             # Vite only, browser-only — fast UI iteration, no Rust rebuild
pnpm tauri dev       # full desktop app, hot reload
pnpm tauri:inspect   # same, plus a local port to read the running window from — dev only
pnpm electron:dev    # the Electron shell (Phase 29), on port 1430 so it runs beside the Tauri one
pnpm electron:inspect # same, plus a port to read the running window from — dev only
pnpm build           # Vite production build → dist/
pnpm tauri build     # installers → src-tauri/target/release/bundle/
pnpm lint            # ESLint
pnpm test            # Vitest, single run
pnpm test:app        # the scenarios in e2e/ — builds the page, then drives the real app
```

**These are commands for *me*, not for her — `pnpm` cannot run in her PowerShell** and never could, because it is a script file and the default execution policy refuses script files. Anything you hand her runs through `node` (`node scripts/app-tests.mjs`) or through a `.bat` in `scripts/`. Don't paste a `pnpm` line into a reply to her, and don't tell her to change the execution policy to fix it — that's hers to decide, and nothing here needs it. See `docs/testing.md` § Running it without pnpm.

**Two suites — `docs/testing.md` is the detail.** `pnpm test` is Vitest, colocated as `*.test.ts`, and services are the unit-tested layer: pure logic (path resolution, tree shape, LK conversion, autosave) is testable without a DOM, and that's where the bugs that cost real data have shown up. Components have no jsdom/RTL setup and aren't unit tested. `pnpm test:app` is the other half — Playwright starting the built Electron app against a generated world in a temp folder, which is the only thing that can check what the app *shows* against what it stored. Add a scenario there in the vocabulary of `e2e/harness/screen.ts`, never with CSS classes of its own.

## Architecture

**All app logic lives in the renderer.** No custom Rust commands unless the fs plugin genuinely can't do the job. **Nothing outside the door knows what the shell is** — see rule 4. Anything that can only be answered by the thing hosting the page belongs behind it; anything that is a decision does not.

**There are two shells** (Phase 29). `services/host-contract.ts` is the vocabulary, `host-service.ts` speaks Tauri, `host-service.electron.ts` speaks Electron, and both end with a `satisfies HostContract` block so neither can quietly lose a capability. `ANAMNESIS_SHELL=electron` picks the second one, in `vite.config.ts`; unset means Tauri, which still runs locally but has shipped nothing since v0.5.0. `electron/main.js` and `electron/preload.cjs` are the other side of the Electron door — the preload is the security boundary and exposes a fixed list of functions, so adding a capability means adding it in both files on purpose.

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
4. **`host-service.ts` is the only file that imports `@tauri-apps/*`, and `filesystem-service.ts` is the only file that decides what to do with the disk** — no exceptions to either. The first is the shell boundary (Phase 29 step 1): paths, files, dialogs, the window, the updater, the settings store and the host's fetch all go through that one door, so swapping the shell touches one file. The second is the older rule and still the important one: the tree walking, the name collisions and the relocation planning are where the bugs that cost real data live.
5. **`lk-import.ts` and `lk-export.ts` are the only files that touch `.lk` format** — no exceptions.
6. **`template-registry.ts` owns all template definitions** — no template metadata elsewhere.
7. **`autosave.ts` is a plain service, not a hook** — the debounce timer must survive React re-renders.
8. **Constants are never hardcoded in logic files** — always imported from `src/constants/`.
9. **Max folder depth: 3 levels** — `src/components/feature/` is the deepest allowed.
10. **No backend and no database** — the JSON files on her disk are the store. Network calls are ordinary; see Two Promises.
11. **Template placeholder copy is not reworded without asking** — the prompts are a designed asset, deliberately shaped, and written for this project in Phase 11. Don't extract them into an editable content system either.
12. **No `index.ts` barrel files, and no files named `utils`, `misc`, `helpers`, or `common`** — naming otherwise follows what's already on disk.

### Data on disk

The user picks a project folder on first launch (default: `~/Documents/Anamnesis/`, changeable in Settings → Projects — read it via `getProjectsDir`, never `getDefaultProjectsDir`, which is only the fallback). (`docs/spec.md` §Data model says the same thing; both were corrected together on 2026-07-30.)

```
Valeraverse/
├── project.json                 # tree order, expanded state, selection, project name, home page
├── Canon/
│   ├── _folder.json             # folder's own metadata (color, tags, notes)
│   ├── Main Story.json          # a page with nothing inside it yet
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

**Folders and nestable non-folder templates (character/location/faction/species) both store themselves inside their own directory** — `_folder.json` or `_page.json` — rather than as a flat sibling file. Deliberate, not incidental: a directory's ownership must never be derived from its *current* name, or a rename (or a sibling's suffix shifting) silently orphans its children on the next load. That happened once; see `docs/handoff.md` §Storage. **Any page can hold pages, and that is a rejection of the folders-versus-notes split rather than a convenience.** Her call, restated 2026-08-31: Obsidian keeps the two as different kinds of thing so a note can never hold notes, she dislikes how that works, and this app was built the other way on purpose. What follows is a rule about borrowed features, not a piece of trivia — a design that answers "where does this structure live" by adding a second, folder-shaped kind of object is reproducing the thing she rejected. Anything that wants a container here wants a page. The other templates (item/event/note/blank) stay a flat `Name.json` while they're empty and convert to their own directory the moment something is parented to them — `alwaysDirectory` in the registry means "a directory even when empty", not permission to nest.

**Renames and reparents** are `fs.rename` on the file, or on the whole directory so children move for free. **Deep nesting is not capped and must not be warned about** — the old ~260-character Windows ceiling doesn't apply (measured 2026-08-11: Rust's `std::fs`, which the fs plugin calls, handled a 1021-character path). `constants/limits.ts` has the measurement and what the number left there is actually for. Per-name length is the limit that's still real, at 255.

**Sibling name collisions** append ` (2)`, ` (3)` to the filename or directory name only — never to the node's `name` in the JSON, and node IDs stay unique regardless. Two directory-storage nodes with the same name *do* collide; a directory-storage node and a same-named leaf page never do, since one's a directory and the other's a plain file. Suffixes are recomputed from creation order on every resolve, so changing one sibling renumbers the others — see `planRelocations` in `filesystem-service.ts`.

## Templates

Templates live in `src/services/template-registry.ts` as a plain data object — default tabs (with placeholder content) plus the sidebar property schema. Not user-editable in Phase 1; that's a Phase 2+ consideration and not scoped. **That file is the only source of template placeholder copy.** `docs/prototype/anamnesis.jsx` demonstrates tree behaviour, but its tab content is generic filler on purpose — Phase 11 removed the LK-transcribed prose it used to hold. Don't restore prompts from it, and don't treat its tab structure as the spec either.

**The layouts are ours as of 2026-08-28, not just the words.** Phase 11 rewrote the copy but left LK's structure in place — the same tab signatures, the same section headings, and one identical block scaffold on every tab. The registry now varies tab sets, section counts and callout placement per template, and no tab is called "Overview". Two rules there are load-bearing and both are tested: **a section heading is a short label, never a sentence or a question**, and **every heading is followed by a paragraph saying what goes under it**. Breaking either produces a page of giant headings over empty space that reads as half-written. `template-registry.test.ts` guards the shape as well as the wording; the comment above `TEMPLATE_REGISTRY` explains each rule. The LK tab signatures still matched on import live in `lk-import.ts` and are deliberately a separate list — reading their shape and writing ours are different jobs.

**Thirteen templates as of 2026-08-28** (2026-08-28 added Country, Creature, Technology, Scene and Quest, and renamed Species to Race). The rename is the one with a tail: pages written before it still say `species` on disk, and `readNodeFile` translates via `LEGACY_TEMPLATE_KEYS` on the way in rather than rewriting anyone's files. Nothing else in the app should know that word. **Race and Creature are a deliberate pair** — a Creature template for animals is what let Race stop meaning biology, which is why "Species" read as the animal one.

## LegendKeeper Import/Export

`.lk` files are gzipped JSON with content as ProseMirror JSON. **`docs/lk-format.md` has the full field mapping, the block translation table, and the current template-inference rules** — read it before touching import/export rather than working from memory.

Import shows a preview (tree + inferred template counts + a plain-language list of anything lossy) and requires confirmation before committing. **Round-trip target:** anything that started in LK re-exports losslessly. Anamnesis-only templates export as freeform documents with matching tab structures.

## Reference Docs (read only when relevant)

- `docs/spec.md` — original build spec, corrected against shipped code 2026-07-30; still the place for design intent, but the code wins on facts
- `docs/plan.md` — remaining phases, queued work, known bugs
- `docs/shipped.md` — the historical log; don't read by default
- `docs/handoff.md` — why the code is like this: live constraints, decisions, known gaps
- `docs/lk-format.md` — `.lk` mapping, ProseMirror → BlockNote translation
- `docs/glossary.md` — domain terms
- `docs/constants-and-theming.md` — CSS token system, palette, callout tokens
- `docs/components-reference.md` — feature → component file map
- `docs/project-summary.md` — plain-language overview for planning
- `docs/testing.md` — the two test suites, and how to add a scenario that drives the real app

## Deployment

Pushing a `v*` tag builds and drafts a release for all four platforms — nothing is code signed, on purpose, and `docs/releasing.md` says what that costs a user; `.github/workflows/ci.yml` runs lint, tests and the frontend build on every push. **`docs/releasing.md` is the procedure** — read it before changing anything about versioning. Version numbers live in four files and are set with `node scripts/set-version.mjs <version>`, never by hand.

## File Editing

When an Edit fails on unicode (em-dashes, curly quotes in placeholder copy), use targeted `sed` — don't load and rewrite the whole file through Python, which dumps its full contents into context. The template registry is large by design; edit it with targeted Edit calls, never a full rewrite.

## Communication

The user (shiro) is non-technical. Explain choices in plain language, not just code. She knows her use case — LK workflow, worldbuilding habits, how she and her co-writers actually work — better than the codebase implies. When she pushes back with non-technical reasoning, that's information about the product, not a preference to override.

When a discussion has multiple open decisions, end with a numbered list — one decision per item, options as `(a)/(b)/(c)` — self-contained enough that she can reply `1. a, 2. b, 3. yes`. Reasoning and tradeoffs go in prose above it.

**Answering three of those four questions is not approval for the fourth.** A skipped item is still open — build nothing that assumes an answer to it, and ask again rather than picking the obvious one. Silence on a question is the least reliable signal there is: it as often means *she hasn't decided* as *she doesn't mind*.

Match her tone: casual, contractions. Don't manage her — no unsolicited advice about scope, pace, or self-care.

## Token Cost

Warn before, and offer the cheaper alternative:

- **`/compact`** — cost scales with session length; 20–30% of the usage budget in one shot on a long session. Alternative: start a new session earlier.
- **Reading `template-registry.ts` or `docs/prototype/anamnesis.jsx` whole** (~10k tokens each) — use `offset`/`limit` or `Grep` for the relevant section.
- **Parsing the real `Valeraverse.lk`** — ~220KB decompressed, 75 resources. Load a few resources at a time unless the full structure is genuinely needed.
- **Full-file `Write` where a targeted `Edit` would do.**
- **Open-ended subagent tasks** — give a narrow question, or use `Grep`/`Glob` directly.
