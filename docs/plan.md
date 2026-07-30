# Anamnesis — Implementation Plan

---

## Project Overview

Anamnesis is a Tauri v2 desktop app for local-first worldbuilding. React 19 + TypeScript in the renderer, Rust shell handling filesystem access. Data lives as JSON files on disk in a folder the user picks. BlockNote provides the Notion-style block editor. LegendKeeper's `.lk` export format is supported as a first-class import/export path so the user can migrate their existing world.

Work phases top-down. Do not start a phase until the previous one is complete and usable. Each phase should end with the app in a coherent, working state — not mid-refactor. Phases are sized to be reviewable as user-facing changes.

See `docs/spec.md` for the full spec, `CLAUDE.md` for architecture rules, and `docs/prototype/anamnesis.jsx` for a reference React prototype that demonstrates layout, template content, and tree behavior.

---

## Future Features

**Additional theme palettes**

Token-override variants on top of the shipped dark theme. All gated on a theme-switcher UI in Settings (not yet built) and on the `[data-theme]` CSS token architecture (see `docs/constants-and-theming.md`). Implementation per theme is a `[data-theme="<name>"]` block in `index.css` plus, for some themes, per-theme background treatments.

- **Light** — light-mode counterpart to dark. Needs its own callout color pass since the current tint values were tuned for dark backgrounds.
- **Parchment** — warm cream / ink aesthetic for the fantasy-tome vibe.
- **Foxian** — palette pulled from the user's Foxian worldbuilding (silvers, deep reds, cool blues).
- **Belobog** — palette pulled from the user's Belobog setting (industrial grays, warm firelight).
- **Deep Space** — near-black background with cool starfield accents.

---

**Interactive atlas / maps**

LK's atlas — nested image maps with clickable pins that link to wiki pages — is the single feature Anamnesis intentionally doesn't ship in Phase 1. It's the most complex piece of LK to build well and the piece the user has said they use less than the wiki. If demand shows up (either from the user or from anyone she shares the app with), revisit as its own multi-phase project. Leaflet with custom CRS is the likely implementation.

---

**Timeline visualization**

A view that lays out Event-template nodes on a chronological axis, with per-event pins that open the underlying page. Depends on Events having reliable date data (currently free-text). Consider a proper date schema alongside this — right now `when` is a free string like "Year 872, Third Age," which the timeline can't parse.

---

**Relationship graphs**

A view that renders the network of references between nodes (who is friends with whom, who leads what faction, what item belongs to whom) as a force-directed graph. D3-force is the likely library. Fun; not critical.

---

**Cloud sync (Phase 2)**

Supabase-backed sync for users who want multi-device access without shared-folder tools. Free tier is enough for two people; adds a real backend and auth. Deferred until the shared-folder approach (Dropbox / Syncthing) demonstrably stops meeting the user's needs. Do not scaffold in Phase 1.

---

**User-editable templates**

Currently templates live in code with the LK-style placeholder copy locked. A future Templates tab (visible in the top-left of the shell) will let users create their own templates and share them as JSON. Design work not started.

---

## Queued Adjustments

*(Empty. This section fills in as work ships.)*

---

## Known Bugs

*(Empty. This section fills in as bugs surface.)*

---

## Phase 0 — Project Scaffold ✅ Shipped 2026-07-29

Tauri v2 init with Vite + React 19 + TypeScript. pnpm as the package manager. Install deps: `@blocknote/react`, `@blocknote/core`, `react-arborist`, `zustand`, `tailwindcss` (v4), `fuse.js`, `date-fns`, `lucide-react`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-dialog`.

Repo structure per `CLAUDE.md`: `src/constants/`, `src/services/`, `src/state/`, `src/hooks/`, `src/components/[folder]/`. Max folder depth 3.

Empty Tauri window that opens to a placeholder. CSS token architecture in `src/index.css` with the dark theme's values defined inside `@theme`. Fonts self-hosted in `public/fonts/` (Inter, Newsreader, Fraunces). Tailwind base + component classes wired up. ESLint config. `README.md`, `LICENSE`, `CLAUDE.md` at the repo root.

**End state:** app compiles, opens as a native window on macOS/Windows/Linux, shows a placeholder screen. No worldbuilding functionality yet.

**Shipped:** Repo cloned/organized locally, docs cleaned up and completed (added `components-reference.md`, `constants-and-theming.md`, `docs/prototype/anamnesis.jsx` which hadn't been uploaded yet). Rust toolchain + pnpm installed on the dev machine. Tauri scaffold created (React 19 + TS), all Phase 0 deps installed, folder skeleton built, fs/dialog plugins wired in on the Rust side (not yet used — that's Phase 1), dark theme CSS tokens + self-hosted fonts wired into `src/index.css`, ESLint configured. `pnpm tauri dev` confirmed working — window opens showing the placeholder screen.

---

## Phase 1 — Data Layer ✅ Shipped 2026-07-30

`src/constants/schema.ts` with `createNode`, `createTab`, `createProject` factory functions and canonical field shapes. `src/services/filesystem-service.ts` as the sole disk-toucher: load-project, save-node, save-project, delete-node, rename-node (which is really a file rename), move-node (a file move across directories). Naming conflict handling — appending ` (2)`, ` (3)` on collision.

`src/services/autosave.ts` as a plain service (not a hook — the debounce timer must survive React re-renders). Debounces per-node saves to ~300ms.

`src/state/project-store.ts` — Zustand store holding the in-memory node graph. Never imported directly by components; hooks under `src/hooks/` are the only access path.

**End state:** the data layer can load a project folder, hold it in memory, dispatch changes, and write back to disk with autosave. No UI beyond a placeholder that reads a hardcoded project path for testing.

**Shipped:** `schema.ts` with the `Node`/`Tab`/`Project` types and factories. `filesystem-service.ts` with a pure `resolveNodePath` function that deterministically computes each node's on-disk location (ancestor folder directories + its own file or `_folder.json`) straight from the in-memory graph, so renames/reparents are just "resolve before, resolve after, `fs.rename` if they differ" — no separate on-disk-name tracking needed. Covered by 7 Vitest unit tests (nesting, same-name-sibling collisions, folder-vs-page non-collision, illegal-character sanitization for Windows). `autosave.ts` debounces per-node writes at 300ms; structural changes (add/rename/move/delete) save immediately instead of debouncing. `project-store.ts` wires it all together and keeps `project.rootOrder` in sync on root-level add/move/delete. Tauri's fs capability is scoped to `$DOCUMENT/Anamnesis/**` for now — broader/arbitrary-folder scope is a Phase 2 decision once the real "Open any folder" project picker exists. Verified end-to-end via `pnpm tauri dev`: the placeholder screen creates a test project under `~/Documents/Anamnesis/TestWorld`, writes real JSON files, and reloads them back on restart.

---

## Phase 2 — App Shell

Three-column layout (`src/components/shell/AppLayout.tsx`) with panel-toggle state for the right panel. Top bar (`src/components/shell/TopBar.tsx`) with breadcrumb display and the right-panel toggle button. Startup routing (`src/components/shell/StartupRouter.tsx`) that reads the last-opened project from a Tauri store and either loads it or renders the project picker.

`src/components/shell/ProjectPicker.tsx` — first-launch screen with recent-projects list, "Open folder" and "New project" buttons that use Tauri's native folder dialog. Creating a new project stubs out `project.json` and top-level folders (Canon, AUs, Characters, Locations, Factions, Worldbuilding — matching the user's actual LK structure as a starter, not required).

Save indicator (`src/components/shell/SaveIndicator.tsx`) — tiny "Saved" text that fades in after autosave commits, then fades. No spinners, no toasts.

**End state:** app opens to a project picker, user can create or open a project, the shell renders with an empty tree panel and empty page area. Data reads and writes through the Phase 1 layer.

---

## Phase 3 — Tree

react-arborist wired to the project store. `TreeSidebar.tsx` container with the top tab strip (Project / Templates / Assets — only Project functional). `ProjectHeader.tsx` with home icon, project name, and "+" button to add a top-level page.

`TreeSearch.tsx` with the name-and-tag filter (Fuse.js). `TreePanel.tsx` renders the actual tree. `TreeItem.tsx` per node — icons per template type (from the ICON_MAP constant), colored per effective color, "+" button on hover for adding children, color-dot button on hover.

`ColorPicker.tsx` popover — the 10-color palette from `src/constants/palette.ts` plus a clear/default X. Cascade computation (walking the parent chain for effective color) and the folder-full-tint / page-icon-only rendering rule. `ContextMenu.tsx` for right-click: Rename / Duplicate / Set color / Delete / Add child.

Drag-drop reparenting via react-arborist (files move on disk when tree structure changes).

**End state:** user can build a tree — create folders, add pages under them, rename inline, drag to reparent, color-code, search. Pages don't render yet (center panel still empty).

---

## Phase 4 — Page View Skeleton

`PageView.tsx` router that shows either `FolderView.tsx` or the tabbed page view based on the selected node's template. `PageTitle.tsx` with template icon and click-to-rename inline editor. `PageTabs.tsx` tab strip with the eye-toggle hidden flag per tab. `FolderView.tsx` for folder nodes with a "Folders hold other pages" message and a call-to-action to add a child.

Editor is a placeholder for now (plain contentEditable div or a `<textarea>`) — real BlockNote comes in Phase 5.

**End state:** clicking a page in the tree shows a title, tabs, and a placeholder body area. Renaming updates the tree. Tab visibility toggles.

---

## Phase 5 — BlockNote Editor

`src/components/page/Editor.tsx` — BlockNote React component wired to the selected tab's content. Autosave triggered on content change (debounced through the service from Phase 1).

Custom callout blocks in `src/services/editor-blocks/` — Info, Quote, Secret — each defined via BlockNote's block spec API with the tokens from `docs/constants-and-theming.md`. Slash menu entries for each.

Mention extension — typing `@` opens a picker of all nodes in the project. Wikilink extension — `[[Name]]` parses and links to a matching node.

**End state:** user can write in real Notion-style blocks, insert callouts, and cross-reference other nodes via mention or wikilink. Content persists via autosave.

---

## Phase 6 — Properties Panel

`PropertiesPanel.tsx` reads the current node's template's property schema and renders one field per property. `ImageSlot.tsx` at the top with drag-drop and click-to-browse upload (files copy into `assets/`).

Per-type property components: `TextProperty.tsx`, `TagsProperty.tsx` (chip editor), `RefsProperty.tsx` (searchable node dropdown), `DateProperty.tsx` (free-text or date picker).

**End state:** the right sidebar renders the template's properties. User can attach an image, add tags, cross-reference other nodes as friends / leaders / participants / etc.

---

## Phase 7 — Templates

`src/services/template-registry.ts` — the single source of truth for template definitions. All 8 templates (Folder, Character, Location, Faction, Item, Event, Species, Note) with tabs and property schemas, copy-pasted from the prototype at `docs/prototype/anamnesis.jsx` verbatim.

`NewPageModal.tsx` — grid of template icons. Creating a new page instantiates a node from the chosen template with its default tabs and property fields.

**End state:** the "+" buttons and top-level Add throughout the app open the template picker. Every new page comes pre-populated with structural prompts. The 8 templates fully match the prototype.

---

## Phase 8 — LK Import

`src/services/lk-import.ts` — the only file that reads `.lk` files. Ungzip, parse JSON, walk the `resources` array, build an id-map from old LK ids to new node ids for mention rewriting.

ProseMirror block translation — pass-through for standard blocks (heading, paragraph, list, rule); mapping for LK panels → Info/Quote/Secret callouts; column collapse for layoutSection/layoutColumn; strip inline icons; rewrite mentions using the id-map.

Template inference from tab signatures (see `CLAUDE.md`). `ImportModal.tsx` with file picker, preview of the parsed tree with inferred template counts, list of content types that will lossy-convert, Cancel and Confirm.

Acceptance test: the user's actual `Valeraverse.lk` (75 resources) imports fully — every page, every tab, every ProseMirror block preserved.

**End state:** user can drag their `Valeraverse.lk` into the app and see the whole world land in a new project.

---

## Phase 9 — LK Export

`src/services/lk-export.ts` — the inverse of Phase 8. Serialize nodes back into the LK `resources` shape, translate BlockNote content back to ProseMirror JSON (including callout → panel), gzip, save.

`ExportModal.tsx` — checkbox tree of what to export, output file location picker.

Round-trip test: import `Valeraverse.lk`, export it back, diff the two — content should be identical up to id renaming and the small handful of unsupported block types (columns) that Phase 8 flagged.

**End state:** user can round-trip their world through LK format cleanly.

---

## Phase 10 — Polish + Distribution

Global search across all nodes' content (Fuse.js index rebuilt on load, updated on change). Keyboard shortcuts (Cmd+K search, Cmd+N new page, Cmd+S manual save indicator). Node duplication (right-click → Duplicate). App-level undo/redo.

Installer builds for macOS (`.dmg`), Windows (`.msi`), Linux (`.deb` + `.AppImage`) via `pnpm tauri build`. GitHub Releases workflow to publish installers on tag push. README instructions for the unsigned-installer bypass on each platform.

**End state:** app is shippable. User can install it, other people can install it, everyone's data stays local.

---

## Phase 1.5 — Publish (After Phase 10)

`PublishModal.tsx` with checkbox tree of what to publish, "include hidden tabs?" toggle (default off), tag filter, output folder picker.

`src/services/publisher.ts` — static site generator. Renders each node as an HTML page, preserves tree navigation as a sidebar, respects hidden tabs and Secret blocks. Bundles a Fuse.js search index as JSON for client-side search on the published site. Same visual style as the app (dark theme, callouts, references as clickable links).

User then hosts the output folder anywhere free (Cloudflare Pages / Netlify / GitHub Pages). Re-publish overwrites.

**End state:** user can share Valeraverse with Nitwit read-only, and Orynthia with the world when it's ready, without any account or backend.

---

## Phase 2 — Cloud Sync (Deferred)

Only if the shared-folder sync approach demonstrably stops working. Options in preference order: Supabase (hosted Postgres + auth), Yjs + y-webrtc (P2P CRDT), self-hosted sync server.

Do not scaffold in earlier phases. The file-per-node data model already sets us up well for any of these.
