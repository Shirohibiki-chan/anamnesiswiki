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

- **Per-page custom properties** (requested during Phase 6 live-testing): beyond a template's fixed property list, the user wants to add one-off extra fields to a single page (Notion's "+ Add property" pattern) — not the same as making templates themselves user-editable (that's a separate, larger Phase 2+ idea per `CLAUDE.md`'s Templates section, and not what was asked for here). Needs its own design pass: what field types are allowed, where the data lives on `Node` (a second bag alongside `properties`, or a schema-less entry inside it), and how it interacts with Phase 7's per-template `PropertySpec` list. Deferred — not scoped into Phase 6.

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

## Phase 2 — App Shell ✅ Shipped 2026-07-30

Three-column layout (`src/components/shell/AppLayout.tsx`) with panel-toggle state for the right panel. Top bar (`src/components/shell/TopBar.tsx`) with breadcrumb display and the right-panel toggle button. Startup routing (`src/components/shell/StartupRouter.tsx`) that reads the last-opened project from a Tauri store and either loads it or renders the project picker.

`src/components/shell/ProjectPicker.tsx` — first-launch screen with recent-projects list, "Open folder" and "New project" buttons that use Tauri's native folder dialog. Creating a new project stubs out `project.json` and top-level folders (Canon, AUs, Characters, Locations, Factions, Worldbuilding — matching the user's actual LK structure as a starter, not required).

Save indicator (`src/components/shell/SaveIndicator.tsx`) — tiny "Saved" text that fades in after autosave commits, then fades. No spinners, no toasts.

**End state:** app opens to a project picker, user can create or open a project, the shell renders with an empty tree panel and empty page area. Data reads and writes through the Phase 1 layer.

**Shipped:** Resolved the fs-scope question flagged at the end of Phase 1 — the user chose unrestricted disk access (matching how VS Code/Obsidian/LegendKeeper behave once you point them at a folder), so `src-tauri/capabilities/default.json` now grants `fs:read-all` + `fs:write-all` with an unscoped `fs:scope` (`allow: ["**"]`) instead of the old `$DOCUMENT/Anamnesis/**` restriction. Added `dialog:default` (missing since Phase 0 despite the plugin being registered) and installed `@tauri-apps/plugin-store` for app-level settings that live outside any project folder. New `app-settings-service.ts` + `use-app-settings.ts` persist the last-opened project path and an 8-entry recent-projects list. `ProjectPicker.tsx` offers "Open folder" (any location, via the native dialog) and "New project" (name only, created under `~/Documents/Anamnesis/`); `project-store.ts` gained `createProjectAt()` to stub out the new project plus its six starter folders. `StartupRouter.tsx` auto-loads the last-opened project if it's still on disk, falling back to the picker otherwise. `project-store.ts` also gained a `lastSavedAt` timestamp, updated whenever any disk write resolves, which `SaveIndicator.tsx` reads to flash "Saved" — implemented as a `key`-remounted CSS animation rather than timer-driven state, since React's stricter lint rules in this project (`react-hooks/purity`, `react-hooks/set-state-in-effect`) don't allow deriving visibility from `Date.now()` during render or setting state synchronously inside an effect. `AppLayout.tsx` collapses the properties panel below 700px width and the tree below 640px (tuned down from an initial 900px breakpoint, which was hiding the panel unconditionally at the default 800×600 window size and made the manual toggle look broken during testing). Verified end-to-end via `pnpm tauri dev`: created a project through the picker with all six starter folders on disk, confirmed the panel toggle and recent-projects persistence, and confirmed opening a folder outside `~/Documents` works cleanly under the new fs scope. A "Switch project" icon button in the top bar (`project-store.ts`'s `closeProject()` + clearing the last-opened setting) rounds this out — added right after shipping once live testing made the gap obvious (closing the whole app was the only way back to the picker).

---

## Phase 3 — Tree ✅ Shipped 2026-07-30

react-arborist wired to the project store. `TreeSidebar.tsx` container with the top tab strip (Project / Templates / Assets — only Project functional). `ProjectHeader.tsx` with home icon, project name, and "+" button to add a top-level page.

`TreeSearch.tsx` with the name-and-tag filter (Fuse.js). `TreePanel.tsx` renders the actual tree. `TreeItem.tsx` per node — icons per template type (from the ICON_MAP constant), colored per effective color, "+" button on hover for adding children, color-dot button on hover.

`ColorPicker.tsx` popover — the 10-color palette from `src/constants/palette.ts` plus a clear/default X. Cascade computation (walking the parent chain for effective color) and the folder-full-tint / page-icon-only rendering rule. `ContextMenu.tsx` for right-click: Rename / Duplicate / Set color / Delete / Add child.

Drag-drop reparenting via react-arborist (files move on disk when tree structure changes).

**End state:** user can build a tree — create folders, add pages under them, rename inline, drag to reparent, color-code, search. Pages don't render yet (center panel still empty).

**Shipped:** `src/services/tree-service.ts` holds the pure logic — `buildTreeData` converts the flat node graph into react-arborist's nested shape (root order from `project.rootOrder`, everything else by creation time), `getEffectiveColor` walks the parent chain for the cascade, `createSearchMatcher` wraps Fuse.js for the name/`#tag` filter. All three covered by Vitest tests, same as Phase 1's `resolveNodePath`. `project-store.ts` gained `duplicateNode` (clones a node and its whole subtree with fresh ids — disk-collision suffixing already handles the shared name), `selectNode`/`setExpanded` (persist `project.selectedId`/`expandedIds`, debounced), and `moveNode` learned an optional root-reorder index. Template metadata that Phase 7's real `template-registry.ts` will eventually own lives temporarily in `src/constants/templates.ts` (display labels, which types can hold children) so the tree didn't have to wait on that phase.

Two real bugs surfaced during live testing and got fixed same-session:
- The right-click menu visually glitched depending on mouse position — every react-arborist row is its own `position: absolute` stacking context (for virtualization), so a popover nested inside one row can never paint above a neighboring row via z-index alone. Fixed by portaling all three popovers (`ColorPicker`/`TemplatePicker`/`ContextMenu`, via a shared `TreePopover.tsx`) straight to `document.body` with a fixed position computed from the trigger's `getBoundingClientRect()`.
- Dragging a row did nothing at all. Cause: Tauri enables its own native OS drag-and-drop handling by default, which intercepts drag events in WebView2 before react-dnd's in-page HTML5 backend ever sees them — a known Tauri/WebView2 conflict. Fixed with `"dragDropEnabled": false` on the window in `tauri.conf.json`. **Trade-off to remember:** this also disables dragging files from the OS into the app, which Phase 6 (image upload) and Phase 8 (`.lk` drag-in) were expecting to use — those will need a different approach (Tauri's `onDragDropEvent` API, or a file-picker button instead of drop) since re-enabling `dragDropEnabled` would break the tree again.

Also found: `window.confirm()` doesn't work inside Tauri's webview (it no-ops rather than blocking), so the Delete context-menu action silently deleted with no prompt. Replaced with Tauri's real dialog plugin — `dialog-service.ts` gained `confirmDestructive()`, and the `use-folder-dialog.ts` hook was folded into a broader `use-dialogs.ts` since it now covers more than folder-picking.

A drop-target highlight (accent outline + tint on whichever folder a drag is currently hovering over, via react-arborist's `node.willReceiveDrop`) was added as a small polish request once dragging worked.

---

## Phase 4 — Page View Skeleton ✅ Shipped 2026-07-30

`PageView.tsx` router that shows either `FolderView.tsx` or the tabbed page view based on the selected node's template. `PageTitle.tsx` with template icon and click-to-rename inline editor. `PageTabs.tsx` tab strip with the eye-toggle hidden flag per tab. `FolderView.tsx` for folder nodes with a "Folders hold other pages" message and a call-to-action to add a child.

Editor is a placeholder for now (plain contentEditable div or a `<textarea>`) — real BlockNote comes in Phase 5.

**End state:** clicking a page in the tree shows a title, tabs, and a placeholder body area. Renaming updates the tree. Tab visibility toggles.

**Shipped:** `src/services/tree-service.ts` gained `getAncestorChain` (root-to-parent, Vitest-covered) for `PageTitle.tsx`'s breadcrumb. `project-store.ts` gained `updateTabContent`/`toggleTabHidden` (both route through the existing debounced `updateNode`, so tab edits autosave the same way node edits already did) and every newly-created non-folder page now gets one default "Main" tab — a stopgap so the page view has something to show before Phase 7's template registry supplies real per-template tab sets.

`src/components/page/` gained `PageView.tsx` (router — folder vs. tabbed page vs. nothing-selected), `PageTitle.tsx` (breadcrumb + tinted template icon + click-to-rename, using the same effective-color cascade as the tree), `PageTabs.tsx` (active-tab underline, hover-revealed eye toggle, dim/italic styling for hidden tabs), `FolderView.tsx` (full-tint per the folder's effective color, "Add a page" button reusing the tree's `TemplatePicker`/`TreePopover`), `EmptyPageView.tsx`, and `PlaceholderEditor.tsx` (a plain textarea using the `.wiki-body` font token already reserved for editor content — real BlockNote replaces it in Phase 5). `PageView` is rendered with `key={project?.selectedId}` from `AppLayout.tsx` so switching pages resets the active-tab state by remounting rather than needing an effect (this project's stricter lint rules disallow `setState` inside effects — same pattern already used for `SaveIndicator` and `TreePanel`'s initial-open state).

Several real bugs surfaced across two rounds of live testing and got fixed same-session:
- Resizing the window made the left sidebar's scrollbar flash in and out. `.app-layout-tree` had a leftover `overflow-y: auto` from Phase 2 (back when the sidebar was still an empty placeholder) sitting on top of react-arborist's own internal scrolling, which is precisely sized via `ResizeObserver` (see `use-element-size.ts`). The two raced by a frame during a live resize. Fixed by removing the outer `overflow-y: auto` — the tree already manages its own scroll region.
- Scrollbars app-wide rendered as the browser's plain default instead of matching the dark theme. Fixed with one global themed-scrollbar rule (`scrollbar-color` plus `::-webkit-scrollbar`) in `index.css`, covering every scrollable area rather than just the tree.
- Adding a Note specifically seemed to silently do nothing. Root cause: `TreePopover.tsx` positioned itself purely from the trigger's bounding rect with no viewport clamping, so opening the template picker from a row low in a tall tree could push its last grid row (Species/Note) below the visible window — present, but unreachable. Fixed by measuring the popover after mount (`useLayoutEffect`) and flipping/clamping it to stay on-screen, the standard "measure then position" pattern for this exact class of problem.
- **Serious pre-existing bug in `filesystem-service.ts` (dating to Phase 1), only now surfaced:** any page nested under a nestable non-folder node (a Character/Location/Faction/Species with its own sub-pages) would silently vanish from the app on the next reload, even though its files were still safely on disk. `walkDirectory` only recursed into a subdirectory if it contained `_folder.json`; a nestable page's children-directory never has one (its own data lives in a sibling flat file), so it was treated the same as an unrelated directory like `assets/` and skipped. An initial fix tried matching a children-directory to its owner by current filename, but that's fragile — renaming the owning page (or a sibling's suffix shifting after a deletion) permanently orphans it. The durable fix: nestable non-folder templates now store themselves the same way folders already do — inside their own directory, in a `_page.json` marker file (`src/constants/paths.ts`'s new `PAGE_META_FILE`) — so a directory's ownership is never derived from its current name. Confirmed by the user with a real repro (Character → child page → reload) after the fix landed. Tradeoff, discussed and approved before implementing: every character/location/faction/species page is now a small directory on disk instead of a single file, even with zero children, matching how folders already behave.

**Scope note:** live-testing also surfaced that pages can't have tabs added/renamed/deleted beyond the template's starting set. That's real (LegendKeeper allows freeform tabs per page), but it depends on Phase 7's template registry existing first — tracked there rather than bolted on early.

---

## Phase 5 — BlockNote Editor ✅ Shipped 2026-07-30

`src/components/page/Editor.tsx` — BlockNote React component wired to the selected tab's content. Autosave triggered on content change (debounced through the service from Phase 1).

Custom callout blocks in `src/services/editor-blocks/` — Info, Quote, Secret — each defined via BlockNote's block spec API with the tokens from `docs/constants-and-theming.md`. Slash menu entries for each.

Mention extension — typing `@` opens a picker of all nodes in the project. Wikilink extension — `[[Name]]` parses and links to a matching node.

**End state:** user can write in real Notion-style blocks, insert callouts, and cross-reference other nodes via mention or wikilink. Content persists via autosave.

**Shipped:** `Editor.tsx` wraps `useCreateBlockNote` + `BlockNoteView`, wired with `key={activeTab.id}` (remounts fresh per tab switch, same remount-instead-of-effect pattern as Phase 4). `src/services/editor-blocks/` gained the shared `CalloutWrapper.tsx` plus `info-block.tsx`/`quote-block.tsx`/`secret-block.tsx` (three thin `createReactBlockSpec` definitions using it), `mention-inline-content.tsx` + `MentionChip.tsx` (the `@`-inserted chip — looks up the target node live by id so a rename never leaves a stale label, and renders as a greyed-out broken chip if the target was deleted), `mention-menu-items.tsx` (shared suggestion-item list reused by both the `@` and `[[` menus), `wikilink.ts` (converts a completed `[[Name]]` into the same mention chip, but **only when exactly one node has that name** — same principle as Obsidian: never silently guess between same-named pages, leave the text alone if ambiguous rather than link to an arbitrary one), `wikilink-bracket-confirm.ts` (typing the closing `]]` confirms the top match, as an alternative to Enter/click), `wikilink-resume.ts` (clicking back into an abandoned, never-finished `[[query` reopens the menu with that query restored — BlockNote only reacts to freshly-typed trigger characters, not clicks into old text, so this needed its own selection-change watcher), and `editor-schema.ts` (the single `BlockNoteSchema.create` combining defaults + the three callouts + mention).

**A real dependency gap from Phase 0, only surfacing now:** `@blocknote/react`'s menus/toolbars need a separate "flavor" package to actually render at all (BlockNote ships its UI headless past a certain version) — Phase 0's dependency list never included one. Went with `@blocknote/shadcn` (Tailwind-based, matching the app's existing styling approach) over `@blocknote/mantine` (would've pulled in a second, competing CSS framework to override). This uncovered two more gaps that needed fixing together: Tailwind wasn't scanning `node_modules` for the new package's utility classes at all (fixed with a `@source` directive in `index.css`), and the shadcn component library expects its own standard token names (`--accent`, `--popover`, etc.) which the app never defined — added a compatibility layer in `index.css`'s `@theme` block mapping those onto the app's existing semantic tokens. Also had to swap `--color-accent`'s own value from the bold solid teal to the same subtle translucent tint as `--color-accent-faint`, since shadcn's menus use "accent" for hover/selected row highlighting (a different job than our focus-ring/selection-base use) — bold solid was illegibly bright for that purpose. See `docs/constants-and-theming.md`.

Two real bugs surfaced during live testing that predate Phase 5 but only became visible once real content-editing made the timing possible:
- **Renaming/moving a node right after typing in it could orphan a stale duplicate directory, or leave the rename's file content one step behind.** Two related causes: (1) a pending debounced content-save and an immediate rename/move could race, each computing the node's disk path from a different snapshot — fixed by flushing any pending save for a node before relocating it (`autosave.ts`'s `flushSave`, previously unused dead code from Phase 1), and by cancelling (not flushing) pending saves before a delete, so a stale write can't resurrect a just-deleted file. (2) `relocateNode` only ever moved the file/directory to its new path — it never rewrote the file's own contents, so a renamed file kept whatever `name` field was last saved into it *before* the rename, which could be stale by one save. Fixed by always re-saving the node's current data at its new location right after the physical move.
- **The tree's selection highlight didn't follow navigation that didn't originate from a tree click** (a mention/wikilink jump changes the page but react-arborist has no way to know that on its own). Fixed in `TreePanel.tsx` — a selection-driven effect now syncs the tree's own selected/focused state (and expands whatever ancestor folders it needs to) whenever `project.selectedId` changes, regardless of what caused it.

Also fixed: the editor's clickable area only covered its actual text content, not the visually-empty space below it in a short page (BlockNote's editable region shrink-wraps to content and won't stretch via CSS) — worked around in JS by placing the cursor at the document's end when a click lands on the wrapper's own background rather than any rendered content.

---

## Phase 6 — Properties Panel ✅ Shipped 2026-07-30

`PropertiesPanel.tsx` reads the current node's template's property schema and renders one field per property. `ImageSlot.tsx` at the top with drag-drop and click-to-browse upload (files copy into `assets/`).

Per-type property components: `TextProperty.tsx`, `TagsProperty.tsx` (chip editor), `RefsProperty.tsx` (searchable node dropdown), `DateProperty.tsx` (free-text or date picker).

**End state:** the right sidebar renders the template's properties. User can attach an image, add tags, cross-reference other nodes as friends / leaders / participants / etc.

**Shipped:** Since Phase 7 hasn't built the real `template-registry.ts` yet, the per-template property lists (which fields each of the 8 templates gets, minus tabs/placeholder copy) were added to `templates.ts` as `PROPERTY_SCHEMAS`, copied from the prototype's `TEMPLATES` object — same "fold into Phase 7 later" pattern `templates.ts` already used for `TEMPLATE_LABELS`/`canHaveChildren`. `schema.ts`'s `Node` gained an `image?: string` field (an asset filename, not a path). `filesystem-service.ts` gained `saveAssetImage`/`readAssetImage`/`deleteAssetImage` (binary read/write against the flat `assets/` dir, addressed by filename rather than tree-mirrored — an uploaded image outlives any single rename/move of its page). `project-store.ts` gained `updateNodeProperty`, `updateNodeTags`, `setNodeImage`, `clearNodeImage`. A new `use-node-image.ts` hook resolves an image filename to a Blob object URL for display (revoked on cleanup).

`src/components/properties/` gained `PropertiesPanel.tsx`, `ImageSlot.tsx`, `TextProperty.tsx`, `DateProperty.tsx`, `TagsProperty.tsx`, `RefsProperty.tsx`, and `properties.css`, wired into `AppLayout.tsx` in place of the Phase 2 placeholder. `ImageSlot`'s drag-drop is plain HTML5 DnD, not a Tauri-specific drag API — `tauri.conf.json`'s `dragDropEnabled: false` (already set for the tree's own drag-reparenting) means the webview doesn't intercept OS file drops, so a dropped file arrives as a normal browser `File` with real bytes. Two interpretive calls, called out to the user and left as-is: reference fields (Leader, Owner, etc.) stay multi-select same as Friends rather than special-casing singular-sounding ones, and the `date` property type renders as free text rather than a native date picker (fictional calendars like "Year 872, Third Age" don't fit a real calendar widget) — no template currently uses `date` (Event's "When" is `text`), but the component exists per the spec'd type union for whenever one does.

Five rounds of live-testing polish:
- The image preview was forced into a square crop (`aspect-ratio: 1` + `object-fit: cover`); now the box only stays square for the empty "drop image here" state, and a set image shows at its own aspect ratio with no forced crop. The dashed border/background frame around a set image was also dropped entirely to match LegendKeeper's own borderless look — the frame only makes sense as an empty-state affordance.
- Text-type fields (Summary, When) read as plain written content until hovered/focused rather than a permanently visible bordered textbox — a new `.property-value-input`/`.property-value-textarea` style (border present but transparent at rest, so nothing shifts size on interaction) used only for these, while the Friends-search and Add-tag inputs keep their normal visible bordered look since those are action affordances, not content.
- Field order needed two passes to get right: fixed text/date fields always render before refs lists (so a growing Friends/Participants list can't push Summary/When down), and Tags stays last regardless — refs fields sit between the fixed fields and Tags.
- Within both `RefsProperty` and `TagsProperty`, the search/add input now renders above the already-added chip list rather than below it, so the input's own position stays stable no matter how many chips accumulate below it.
- `PageTitle.tsx`'s breadcrumb trail (project name + ancestor chain) is now clickable — jumps to that node, mirroring how a mention/wikilink click already navigates. Only the current page's own name stays plain.

Two asset-lifecycle bugs caught during a final self-review pass (not user-reported): deleting a node never cleaned up its uploaded image file in `assets/`, since `fsService.deleteNode` only ever touched the node's own tree-mirrored file/directory, not the flat asset dir — fixed by deleting the image (and every descendant's image) alongside the node in `deleteNode`. Duplicating a node with an image cloned the `image` field verbatim, meaning the original and the copy pointed at the *same* file on disk — replacing or removing the image on either one later would silently delete it out from under the other. Fixed by making `duplicateNode` async and physically copying each image's bytes to a fresh filename per clone.

Two feature requests came up during live-testing and were logged rather than built now (per "don't build ahead of what's spec'd"): per-page custom properties beyond a template's fixed list (Notion's "+ Add property" pattern — see Queued Adjustments), and letting new pages start blank with a template applied later instead of forcing a template choice upfront (see Phase 7's notes).

---

## Phase 7 — Templates

`src/services/template-registry.ts` — the single source of truth for template definitions. All 8 templates (Folder, Character, Location, Faction, Item, Event, Species, Note) with tabs and property schemas, copy-pasted from the prototype at `docs/prototype/anamnesis.jsx` verbatim.

`NewPageModal.tsx` — grid of template icons. Creating a new page instantiates a node from the chosen template with its default tabs and property fields.

**Per-page tab management** (decided during Phase 4 live-testing): templates only supply a page's *starting* tabs — same as LegendKeeper, where tabs are freeform per page and not locked to a fixed set. Users need to add, rename, and delete tabs on their own pages beyond whatever the template started them with. `PageTabs.tsx` (built in Phase 4 with just the hide/show toggle) needs a "+" to add a tab, and rename/delete affordances on each tab, alongside the template registry work.

**Blank pages, template-optional** (requested during Phase 6 live-testing): forcing a template choice on every new page is too rigid. `NewPageModal.tsx` needs a "Blank" option alongside the 8 templates — a blank page starts with no tabs/properties (like Note, but with the door open to apply a template later) and the user can voluntarily apply a template to it afterward from the page itself. Needs a design decision when we get here: applying a template to a page that already has its own tabs/content should *add* that template's default tabs/properties alongside whatever's already there, not silently overwrite or delete existing user content.

**End state:** the "+" buttons and top-level Add throughout the app open the template picker. Every new page comes pre-populated with structural prompts, and the user can freely add, rename, or delete tabs on top of that starting point. The 8 templates fully match the prototype.

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
