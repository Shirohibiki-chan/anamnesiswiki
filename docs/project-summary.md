# Anamnesis — Project Summary

> This file is for pasting into a regular Claude chat to provide project context when planning features. Last updated: 2026-07-30 (Phases 0–8 shipped).

---

## What It Is

Anamnesis is a local-first worldbuilding wiki app, shaped after LegendKeeper but running as a Tauri v2 desktop app with all data stored as JSON files on disk in a folder the user controls. No cloud, no accounts, no sync fees.

The user builds fictional worlds — characters, locations, factions, species, events — as a tree of pages with template-driven structure. Every page has one or more tabs (Overview, Backstory, Biology, etc.) each holding a Notion-style block editor, plus a right sidebar of template-defined properties (references to other pages, tags, images, dates).

Import/export of LegendKeeper's `.lk` format is a Phase 1 must-have because the user has an existing 75-page world to migrate.

**Phases 0 through 10 are built and working**: the data layer, app shell, tree,
page view, BlockNote editor with custom callouts and `@`/`[[ ]]` cross-references,
properties panel, all templates, LegendKeeper import *and* export, project-wide
search, rebindable keyboard shortcuts, sidebar undo/redo, and automated signed
releases for four platforms. **The app is shippable.** Phase 1.5 (read-only
publish) is next up; phases 11–23 are planned in `docs/plan.md`.

> **If you are a Claude reading this to plan or write code:** this summary
> describes the shape of the project, not its current source. Code has been
> written, reviewed and revised since — so anything you write from this document
> alone will not apply cleanly to the repo. Ask for the actual files you need to
> touch, or for a fresh `git log`, before producing a patch.

---

## What The User Will See

**Startup** — first-launch project picker: a recent-projects list plus "Open folder" and "New project" buttons that open a native folder dialog. On subsequent launches, the app opens directly to the last-used project.

**Main layout** — three columns: left tree, center page view, right properties panel. The right panel can be toggled off; the left is always visible.

**Left panel — tree** — top strip has three tabs (Project / Templates / Assets; only Project functional in Phase 1). Below that, a search input filters by name or `#tag` prefix. Below that, the project tree. Icons per node type, colors per node color (folders get full-row tint, pages get icon-only tint), "+" buttons on hover to make a page inside, color-dot buttons on hover to open a palette popover. Drag-drop to reparent. Right-click for context menu.

**Center panel — page view** — folder nodes show a "Folders hold other pages" placeholder with a call to add a child. Non-folder pages show: a large title with the template's icon and click-to-rename, a breadcrumb strip above, a tab strip with each tab's hide/show eye toggle, and a BlockNote editor for the active tab's content. Custom callout blocks (Info / Quote / Secret) plus `@mention` and `[[wikilink]]` for cross-page linking.

**Right panel — properties** — image slot at top (drag-drop or click-to-browse to attach). Below that, template-defined fields: a Summary text field, a Friends / Members / Owner references list depending on the template, always Tags at the bottom. References are searchable chips that link to other pages.

**Top bar** — breadcrumbs on the left, right-panel toggle on the right. Autosave commits show a brief "Saved" indicator that fades.

**LegendKeeper import** — a menu item opens a file picker; picking a `.lk` file shows an import wizard with a preview of the parsed tree, inferred template counts per branch, and warnings for content that will lossy-convert. Confirm imports the whole world into a new project.

**LegendKeeper export** — the inverse, reached by right-clicking a page (or the project name, for the whole world). No checkbox tree and no options: a page always exports with everything under it, because LK's own `.lk` export works that way. A summary screen names anything that won't survive — chiefly pictures added inside Anamnesis, which have no LK address to point at — then a file-save dialog, and a `.lk` file drops out.

**Publish (Phase 1.5, later)** — a modal to pick which pages to include, whether to include hidden tabs (default off), a tag filter, and an output folder. Generates a static HTML site the user hosts anywhere free.

---

## Tech Stack

- **Tauri v2** — desktop app shell (macOS / Windows / Linux); filesystem access via `@tauri-apps/plugin-fs`; native dialogs via `@tauri-apps/plugin-dialog`
- **Vite 8** — build tool and dev server
- **React 19** — UI framework
- **TypeScript** — everywhere in the renderer
- **BlockNote** (`@blocknote/react`, `@blocknote/core`) — Notion-style block editor, built on TipTap/ProseMirror
- **react-arborist** — tree component with drag/drop, custom row rendering, filtering
- **Zustand** — client-side state management
- **Tailwind CSS v4** — utility styling; CSS token architecture with `[data-theme]` selector for future theme variants
- **Fuse.js** — fuzzy search
- **date-fns** — light date formatting
- **lucide-react** — icon set
- **Local JSON files** — sole persistence; every node is a JSON file on disk, folder-per-folder mirroring the tree

No backend, no database, no auth, no telemetry, no network calls in Phase 1.

---

## Project Structure (Target)

```
src/
  constants/          — palette, icons, format utilities, keyboard shortcuts,
                        paths, limits, schemas
  services/           — plain TS modules; zero React imports allowed
    filesystem-service.ts — sole file that reads/writes project files
    lk-import.ts          — sole file that parses .lk format
    lk-export.ts          — sole file that writes .lk format
    template-registry.ts  — sole source of template definitions
    autosave.ts           — debounced save-to-disk service (plain, not a hook)
    editor-blocks/        — BlockNote custom block definitions
    publisher.ts          — Phase 1.5 static-site generator
  hooks/              — React hooks; the only layer components import
  state/              — Zustand store
  components/
    shell/            — AppLayout, TopBar, ProjectPicker, StartupRouter
    tree/             — TreeSidebar, TreePanel, TreeItem, TreeSearch,
                        ColorPicker, ProjectHeader, ContextMenu
    page/             — PageView, PageTitle, PageTabs, Editor, FolderView
    properties/       — PropertiesPanel, ImageSlot, TextProperty,
                        TagsProperty, RefsProperty, DateProperty
    modals/           — Modal (base), NewPageModal, ImportModal,
                        ExportModal, PublishModal, ConfirmDialog,
                        AboutModal, ChangelogModal
  index.css           — Tailwind base + CSS token definitions;
                        [data-theme="..."] overrides go here
  App.tsx             — root component
  main.tsx            — entry point
src-tauri/            — Tauri Rust shell (kept thin)
docs/                 — spec, plan, handoff, glossary, references, prototype
```

Max folder depth is 3: `src/components/tree/TreeItem.tsx` is the deepest allowed. See `CLAUDE.md` for the full architecture ruleset.

---

## Target Features (Phase 1)

**Project management**
- Pick a project folder on first launch (default `~/Documents/Anamnesis/`)
- Create new project (initializes with `project.json` + a starter folder scaffold)
- Recent projects list, quick switch

**Tree navigation**
- Recursive tree with drag/drop reparenting
- Icons per template type
- Color per node with cascade to descendants (folders full-row tint, pages icon-only)
- Search by name or `#tag`
- Right-click context menu: New page inside / Rename / Duplicate / Set color / Show in the file manager / Delete

**Page editing**
- Tabbed pages with hide/show visibility toggle
- Notion-style block editor via BlockNote
- Custom callouts: Info (blue), Quote (grey italic), Secret (purple lock)
- `@mentions` and `[[wikilinks]]` for cross-page references
- Autosave to disk (debounced ~300ms), invisible "Saved" indicator

**Templates** (8 in Phase 1)
- Folder, Character, Location, Faction, Item, Event, Species, Note
- LK-style walk-you-through-it placeholder copy on every tab
- Template-defined tabs and property schema

**Properties panel**
- Image slot with drag-drop upload
- Template-defined fields: Text / Tags / References / Date
- References are searchable chips linked to other pages

**LegendKeeper compatibility**
- Import `.lk` file with preview + template inference from tab signatures
- Export `.lk` file lossless for anything that started in LK
- Round-trip tested against the user's actual `Valeraverse.lk` (75 resources)

**Distribution**
- Native installers for macOS (`.dmg`), Windows (`.msi`), Linux (`.deb` + `.AppImage`)
- Unsigned installers (with README instructions for the OS-warning bypass)
- GitHub Releases as the distribution channel

---

## What's Next

**Phase 1 is done.** Phase 10 closed 2026-07-31, and with it everything Phase 1 needed to be a real, installable, updatable app. `docs/plan.md` has what's left and the queued work; `docs/shipped.md` records what each phase delivered.

The next unlock is Phase 1.5 — read-only static-site publishing. Same feature serves two use cases: sharing a world with a co-writer for read-only viewing, and eventual public release of a world (e.g. Orynthia going public). Not blocked on anything.

Phases 11–23 were planned out on 2026-07-31 from the user's own list of wants: her own writing in the templates, a theme switcher and the queued palettes, richer property types, everyday navigation, the full right-click menu, sidebar blocks and meters, version history, markdown import, the shell rework, collections and graphs. Two things carried over from Phase 10 deliberately — undo for the right-hand panel (Phase 19) and duplicate-on-multi-selection (Phase 15).

Cloud sync (Phase 2) is deferred indefinitely. The Phase 1 data model — file-per-node on disk — already supports shared-folder sync via Dropbox / Syncthing / iCloud without any code, so a real cloud backend is only needed if that approach demonstrably stops working.

---

## Known Limitations

- **No cloud sync in Phase 1.** Multi-device users rely on a shared folder tool (Dropbox, Syncthing, iCloud Drive) pointed at their project folder.
- **No real-time collaborative editing.** If two people edit the same file at the same second through a shared folder, the last save wins. Fine for two co-writers working on different pages; not fine for simultaneous editing of the same page.
- **No mobile version.** Desktop only.
- **No user-editable templates.** Templates live in code with locked placeholder copy in Phase 1.
- **No interactive atlas / nested maps.** LK's atlas feature is intentionally not cloned; deferred as a future feature.
- **Unsigned installers.** Code-signing certs cost real money per year and this is a hobbyist tool. Users get an OS warning on first install and need to bypass it manually.
- **LK column layouts and inline icons lossy-convert on import.** Standard blocks (headings, paragraphs, lists, callouts, mentions, tags) come through cleanly; LK-specific decorative blocks either flatten or get stripped.
- **Not affiliated with LegendKeeper.** Anamnesis reads and writes LK's export format for user convenience only — no partnership, no shared code, no endorsement.

---

## For Planning Conversations

Reference docs in the repo:

- `docs/spec.md` — the full build spec (source of truth for what "shipped" means)
- `docs/plan.md` — phased build roadmap with Queued Adjustments; unscheduled ideas in `docs/ideas.md`
- `docs/handoff.md` — current state of the project, running log of what's shipped
- `docs/glossary.md` — domain terms (node, tab, template, cascade, etc.)
- `docs/components-reference.md` — target component layout
- `docs/constants-and-theming.md` — CSS token system, palette, callout tokens
- `CLAUDE.md` — architecture rules, naming conventions, policy boundary
- `README.md` — user-facing project intro
- `docs/prototype/anamnesis.jsx` — the reference React prototype demonstrating layout, template structure, cascade colors, tab visibility (tab content is filler; real copy is in `src/services/template-registry.ts`)

When bringing a plan into a Claude Code session, include:

1. A plain-language description of the feature — what the user clicks, what they see, what changes
2. Which part of the UI it affects (which panel, which modal, which component area)
3. Any behavior decisions made during planning (edge cases, scope choices, constraints agreed on)
4. Which phase this belongs to per `docs/plan.md`, and confirmation that earlier phases are complete enough to build on

If a proposed feature seems to require cloud sync, network calls, LK server access, or LLM/AI integration — that's a policy boundary trip. Push back and find a local-file alternative.
