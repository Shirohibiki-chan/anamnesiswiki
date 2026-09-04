# Shipped Phases

Historical record of what each completed phase actually delivered, moved out of
`docs/plan.md` on 2026-07-30 so the plan stays about what's *next*.

**Nothing reads this by default.** It's here so the detail isn't lost, not
because it needs consulting — for what the app does today, read the code; for
what changed and when in plain language, read `CHANGELOG.md`.

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

## Phase 7 — Templates ✅ Shipped 2026-07-30

`src/services/template-registry.ts` — the single source of truth for template definitions. All 8 templates (Folder, Character, Location, Faction, Item, Event, Species, Note) with tabs and property schemas, copy-pasted from the prototype at `docs/prototype/anamnesis.jsx` verbatim.

`NewPageModal.tsx` — grid of template icons. Creating a new page instantiates a node from the chosen template with its default tabs and property fields.

**Per-page tab management** (decided during Phase 4 live-testing): templates only supply a page's *starting* tabs — same as LegendKeeper, where tabs are freeform per page and not locked to a fixed set. Users need to add, rename, and delete tabs on their own pages beyond whatever the template started them with. `PageTabs.tsx` (built in Phase 4 with just the hide/show toggle) needs a "+" to add a tab, and rename/delete affordances on each tab, alongside the template registry work.

**Blank pages, template-optional** (requested during Phase 6 live-testing): forcing a template choice on every new page is too rigid. `NewPageModal.tsx` needs a "Blank" option alongside the 8 templates — a blank page starts with no tabs/properties (like Note, but with the door open to apply a template later) and the user can voluntarily apply a template to it afterward from the page itself. Needs a design decision when we get here: applying a template to a page that already has its own tabs/content should *add* that template's default tabs/properties alongside whatever's already there, not silently overwrite or delete existing user content.

**End state:** the "+" buttons and top-level Add throughout the app open the template picker. Every new page comes pre-populated with structural prompts, and the user can freely add, rename, or delete tabs on top of that starting point. The 8 templates fully match the prototype.

**Shipped:** `src/services/template-registry.ts` is now the single source of truth for all 8 templates plus a new 9th "Blank" entry — tabs, property schemas, and `canHaveChildren` all live there, folded in from the temporary `constants/templates.ts` (deleted) per that file's own header comment. Tab placeholder copy is transcribed verbatim from `docs/prototype/anamnesis.jsx`, translated from its HTML into BlockNote's block JSON via small local helpers (`p`/`h2`/`info`/`quote`/`secret`) rather than parsed at runtime. `project-store.ts`'s `addNode` now instantiates a template's real default tabs instead of Phase 4's placeholder single "Main" tab; a new `applyTemplate` action powers the blank-page flow below, merging in only the tabs a page doesn't already have (by id) so nothing already written gets clobbered.

**Blank pages, template-optional** shipped as designed — "Blank" is a real 9th entry in the same template-picker grid used everywhere a page gets created. A blank page's properties panel shows an "Apply a template" prompt instead of a fixed field list. Considered making "+" skip the picker entirely and default straight to blank (to save a click) per user request mid-testing, but the user chose to keep the picker as-is after weighing it — no change made there.

**Per-page tab management** shipped: `PageTabs.tsx` gained a "+" to add a tab, double-click-to-rename, and a confirmed delete, on top of whatever a template started a page with. Reordering went through two live-testing iterations — see below.

**Interpretive call, disclosed:** kept the existing tree "+"-button `TemplatePicker`/`TreePopover` as the "choose a template" UI rather than building a separate `NewPageModal.tsx` — it already delivers the "grid of template icons" this phase called for, so a second, functionally-identical component would've been pure duplication.

Rounds of live-testing fixes:
- Tab reordering's first pass used plain HTML5 drag-and-drop, the same approach that worked fine for Phase 6's image drop — but with the whole tab row covered by real `<button>`s (label/eye/delete), a mousedown almost always landed on one of those, and browsers don't reliably start a native drag gesture from a nested button even with a draggable ancestor. First fix added a dedicated grip handle; feedback was that dragging still felt "clunky" and imprecise with no live reorder preview. Replaced the whole mechanism with `@dnd-kit/core`/`@dnd-kit/sortable`/`@dnd-kit/utilities` (new dependencies), which animates the other tabs sliding out of the way as you drag. Follow-up feedback wanted to grab a tab from anywhere on it, not just the grip — dnd-kit's `PointerSensor` with a small activation-distance threshold made that safe (a plain click still reaches the label/eye/delete buttons underneath; only real pointer movement starts a drag), so the grip is now a visual affordance only, not the exclusive drag surface.
- A layout bug surfaced alongside that: tab labels had no `white-space: nowrap`, so a longer tab name could wrap onto two lines once the strip got crowded, visually breaking the eye icon's position. Fixed, and the tab strip now scrolls horizontally instead of squeezing tabs when there isn't room.
- Delete confirmations (deleting a node, deleting a tab) rendered as native OS dialog boxes via Tauri's `confirm()`, visually inconsistent with the app's dark theme. Replaced with an in-app themed modal (`src/state/dialog-store.ts` + `src/components/shell/ConfirmDialog.tsx`), keeping the same `confirmDestructive(message): Promise<boolean>` call shape so existing call sites didn't need to change. `dialog-service.ts` now only wraps the native folder-browse dialog, which should stay OS-native.

**Per-page custom properties**, previously logged as a deferred Queued Adjustment from Phase 6, got pulled into this phase at the user's request: a "+ Add property" control at the bottom of the sidebar (above Tags) lets a page get one-off extra fields beyond its template's fixed list — pick a type (Text, Long text, References, Date), give it a name, and it renders with a remove affordance (template-defined fields still aren't removable). Stored as a new `customProperties?: CustomPropertySpec[]` on `Node` — optional rather than defaulted to `[]`, since pages saved before this field existed won't have it on disk; every read site falls back to `[]` itself rather than relying on a load-time migration.

---

## Phase 8 — LK Import ✅ Shipped 2026-07-30

`src/services/lk-import.ts` — the only file that reads `.lk` files. Ungzip, parse JSON, walk the `resources` array, build an id-map from old LK ids to new node ids for mention rewriting.

ProseMirror block translation — pass-through for standard blocks (heading, paragraph, list, rule); mapping for LK panels → Info/Quote/Secret callouts; column collapse for layoutSection/layoutColumn; strip inline icons; rewrite mentions using the id-map.

Template inference from tab signatures (see `CLAUDE.md`). `ImportModal.tsx` with file picker, preview of the parsed tree with inferred template counts, list of content types that will lossy-convert, Cancel and Confirm.

Acceptance test: the user's actual `Valeraverse.lk` (75 resources) imports fully — every page, every tab, every ProseMirror block preserved.

**End state:** user can drag their `Valeraverse.lk` into the app and see the whole world land in a new project.

**Shipped:** `src/services/lk-import.ts` implements the full mapping documented in the new `docs/lk-format.md` — ungzip via the browser's native `DecompressionStream` (no extra dependency needed), full ProseMirror→BlockNote block translation (including LK's `expand` collapsible blocks mapping losslessly to BlockNote's own native `toggleListItem`, and LK's own `bodiedExtension: block-secret` mapping losslessly to our Secret callout), template inference exactly per `CLAUDE.md`'s signature table, and per-page property import (Summary/Friends/Homeland-type fields) on top of tabs. `ImportModal.tsx` (new `src/components/import/`) walks file-pick → preview (tree, template counts, plain-language lossy-conversion list) → destination folder → commit, reusing the tree's existing template icons. Entry point is an "Import from LegendKeeper" button on `ProjectPicker.tsx`, since import always creates a brand-new project. `project-store.ts` gained `importLkProject`, mirroring `createProjectAt` but taking a fully-built node graph. 32 new Vitest tests cover the converter's pure functions.

**Two decisions escalated to the user mid-build, both resolved before shipping:**
- Whether to import LK's per-resource sidebar properties (Summary, Friends, Homeland, etc.) at all, beyond tabs — spec's Phase 8 write-up only mentioned tabs. **User chose yes**, since skipping would silently drop real content (44 of 75 resources had these filled in).
- Whether to download page images/banners from LegendKeeper's own CDN during the one-time import action — a real exception to the app's normal zero-network-calls policy. **User chose yes.** Implemented via `@tauri-apps/plugin-http` (new Rust plugin + JS binding), scoped narrowly to `https://assets.legendkeeper.com/*` in `src-tauri/capabilities/default.json` — not a general network grant. This is the only network call the app makes, and only for this explicit, confirmed action.

**The LK project root** (the one no-parent resource in every LK export, holding LK's own auto-generated "Welcome to LegendKeeper" boilerplate) doesn't become a Node — its name becomes the project's own name, and its children become the top-level tree. Its own text, when the user had actually written something there (not just LK's boilerplate), is still preserved as a real "Home" page rather than thrown away — added after a live-testing round explicitly asked for it (see the Queued Adjustments entry above for the bigger "real project home feature" ask that came with it, deferred separately).

**A real, user-reported bug found and fixed same-session:** LK sidebar properties whose title matched a field the inferred template already has built in (e.g. Character's own "Friends") were importing as brand-new custom properties instead of filling the template's existing field — the properties panel showed the same field twice, once empty and once with the real value. Fixed by matching LK property titles against the template's own schema first; only genuinely new fields (Enemies, Languages, "Romantic Interests" — things no template has a slot for) become custom properties.

**Banners, added mid-phase after live-testing pushback:** the written spec's "preserve banner as page header image if present" was initially implemented by reusing the existing sidebar `image` slot, which the user firmly rejected — LK's banner and sidebar image are two different things and both needed to survive import. Added a real `Node.banner`/`bannerFocusY` pair (separate from `image`), a new `PageBanner.tsx` full-bleed cover-image component (upload, drag-to-reposition-vertically, remove) rendered above `PageTitle` outside the page's centered reading-width column — matching Notion/Obsidian's edge-to-edge banner treatment rather than LK's own boxed-to-the-text-column one, per explicit request — with a soft fade into the page background at the bottom.

**Reading-column width increased from 48rem to 60rem and properly centered** (it was never centered before, just left-aligned with a max-width — unnoticed until the user ran the app at true fullscreen for the first time). The sidebar portrait image's max-height also increased from 20rem to 28rem to better match LegendKeeper's own proportions.

---

## Phase 9 — LK Export ✅ Shipped 2026-07-31

`src/services/lk-export.ts` — the inverse of Phase 8, and the second of the only two files allowed to touch `.lk` format. Nodes back into LK's `resources` shape, BlockNote content back to ProseMirror JSON, gzip, save. A pure conversion plus one local file write: **no network access at all**, which is the whole reason images need the treatment described below.

**End state:** user can round-trip their world through LK format cleanly.

**Shipped:** `buildExportFile` builds the whole file in memory (returning the file, a page count, and a plain-language lossy list) and `packLkBytes` gzips it via the browser's native `CompressionStream` — mirroring Phase 8's `DecompressionStream`, still no extra dependency. `ExportModal.tsx` (new `src/components/export/`) shows what's about to leave, the lossy notes, and a save-location picker. Entry point is the tree's right-click menu on any node, plus the project header for the whole world — matching where LK puts it. `dialog-service.ts` gained a save-file dialog to sit alongside the existing open-file one. 41 new Vitest tests, bringing the suite to 162.

**Exporting a page always takes its whole subtree, and there are no options.** Confirmed against a live LK account 2026-07-31: LK's own `.lk` export offers nothing to configure — no subpage toggle, no image toggle. (Its *HTML* export has both, which is why that one is their default; it's the export meant to leave their ecosystem.) Matching that meant the modal had no settings to design, only a destination and an honest summary.

**One rule handles the whole tree shape:** a node's LK parent is its own parent when that parent is part of the export, and the root when it isn't. That single line is what lets a nested page export without dragging its ancestors along, *and* what files a whole world's top-level pages underneath the home page where LK keeps them. Both earlier attempts special-cased one of those and reintroduced the other's bug.

**The designated home page becomes LK's root resource.** LK's format requires exactly one parentless resource; rather than synthesising a wrapper above the tree, the real home page *is* it. A synthesised root, carrying the project's name, appears only when home isn't in the export.

**`pos` keys are emitted fixed-width.** Import compares them as plain strings, and variable-length keys don't sort under that — index 75 (`"00"`) lands before index 1 (`"1"`) because comparison runs character by character. LK's own keys *are* variable-length, which is fine to read; we only have to emit keys that sort, not keys shaped like theirs. Found by a test that generated 200 of them and checked the sort, not by inspection.

**Secret callouts export as LK's own Secret block, not as a panel.** Import folds LK's `bodiedExtension: block-secret` *and* `panel` warning/error into our single Secret callout, so the way back can't tell which one it started as. The Secret block is the semantic match; the panel types were the lossy side of that merge to begin with.

**Images: the one thing that genuinely can't travel, solved as far as it can be.** A `.lk` stores URLs pointing at LK's servers, never picture data, and there is nowhere to put a local file that LK could read. So import now records `Node.imageSource` / `bannerSource` — the address each picture was downloaded from — purely so export can hand it back. Anything that came from LK round-trips exactly; anything added inside Anamnesis is left out and counted in the export's lossy list rather than dropped silently. Projects imported before this existed have no sources and need one re-import to gain them.

**Verification.** Beyond the unit tests, the real 75-resource `Valeraverse.lk` was run import → export → gzip → import: 75 resources in, 75 nodes, 75 resources written, 75 nodes back, with identical tree shape, templates, tabs and tags. All 33 pictures and all 20 banners came through, every URL still pointing at `assets.legendkeeper.com`, banner focus positions preserved. The only lossy note raised was the expected one — 23 folders export as pages with an empty `Main` tab, since LK has no folder-only concept. That check lives outside the suite because it reads a file from outside the repo.

**What this does not prove, and the gap is real:** nothing has been imported into actual LegendKeeper from a file we wrote. The round trip runs through *our* importer, so it demonstrates the mapping is self-consistent, not that LK accepts it. Closing that needs an LK account and an import attempt. Recorded in `docs/handoff.md` §Known gaps.

**A wrong entry corrected while here.** The long-standing "15 broken cross-reference links" note — and the guess that they pointed at the LK project root — were both wrong. Checked directly against `Valeraverse.lk`: all 15 live in the root resource's own documents, are LK's stock welcome page linking to *their* demo world (Wiki City, Tab Tundra, Temple of Time…), and none of their targets exist in the export at all. Skipping that boilerplate on import removes them entirely, which is the right outcome rather than a loss — the root page held nothing else. The user's world contains **no** cross-references, so the mention paths in both directions are covered by synthetic tests only.

---

## Phase 10 — Polish + Distribution ✅ Shipped 2026-07-31

The phase that makes the app something other people can install, and something the user can fix without a terminal. Seven items, shipped across one day and moved here from `docs/plan.md` when the phase closed.

**Node duplication** — right-click → Duplicate, actually shipped back in Phase 3. Still single-selection only; the batch fix is folded into Phase 15, which reworks that menu anyway.

**The in-app update check**, pulled forward from this phase and shipped early. **v0.2.0 and v0.2.1 are published** — installer, signature and `latest.json` attached to the GitHub release, and the endpoint the app reads (`releases/latest/download/latest.json`) serves correctly. The reasoning that still governs it — why the signing key exists, why "install updates but skip the check" must never ship — is in `handoff.md` §Updates.

**Global search + Cmd+K.** `search-service.ts` searches names, tags and every tab's text; the palette jumps to the matching *tab*, not just the page. One deviation from the original sketch worth knowing: it is **not** a single Fuse index over content. Names and tags are fuzzy; prose is exact substring, because fuzzy matching across thousands of characters returns scattered letters from unrelated paragraphs and calls them hits. See `handoff.md` §Search.

**Keyboard shortcuts** — Cmd+K search, Cmd+N new page, Cmd+S manual save. Bindings in `constants/shortcuts.ts`, matching and rendering in `services/shortcut-service.ts`, one listener in `use-global-shortcuts.ts`. Cmd+N adds a *sibling* of the current selection; a row's own "+" already covers "child of this". **Unverified in the desktop build:** whether WebView2 lets the page keep Cmd+N — see `handoff.md` §Shortcuts, which also records the fix if it turns out it doesn't.

**Rebindable shortcuts**, asked for by the user as an accessibility feature rather than a power-user one — which is what decided the rules. Settings → Keyboard lists every action with a key recorder and a per-action reset. Overrides (only the changed ones) persist through `app-settings-service.ts`; `shortcut-store.ts` merges them over the defaults and everything reads from there. A binding needs a modifier **or** to be a bare F-key. **Adding a new shortcut is three lines** — `SHORTCUT_ACTIONS`, `SHORTCUT_LABELS`, `DEFAULT_BINDINGS` — plus a handler in `useGlobalShortcuts`; it appears in Settings on its own.

**Settings grouped into tabs** once there were two sections and more coming. Real ARIA tabs — roving tabindex, arrow keys, Home/End — rather than buttons that look like tabs, because the rebinding screen lives behind one of them and a mouse-only tab strip would put the accessibility screen behind a mouse.

**App-level undo/redo** over the sidebar operations: add, delete, rename, move, duplicate, colour, project home, multi-selections included. An entry is a pair of closures built where the operation happens, reversing itself through the ordinary store actions rather than through a second copy of the path-relocation logic — that logic is the part of this app that has already lost real pages, and a second implementation of it was not worth the symmetry. Deleting reads its pictures' bytes before removing them so undo restores the whole page. It shares Ctrl+Z with the editor by standing down whenever the caret is in text; §Undo in `handoff.md` has why that's safe and what would break it. **Not covered:** properties, tags, tab changes — carried to Phase 19.

**Automated releases, all four platforms.** Pushing a `v*` tag builds Windows, macOS (Intel and Apple Silicon) and Linux, signs them, writes `latest.json` across all four, and drafts the release for review. A version check runs first, so a tag disagreeing with the version files fails in seconds instead of after twenty minutes of compiling. `docs/releasing.md` is the procedure. The one manual step — the signing key into the repository's Actions secrets — was done by the user on 2026-07-31, which is what closed this phase.

**README install instructions** for the unsigned-app warning on each platform, written earlier in the phase and verified still accurate at close.

### What this phase did not prove

The undo work was built and unit-tested but **never exercised against a real project on disk**, because the browser preview has no Tauri filesystem and can't open one. The restore-after-delete path in particular writes files the app has only ever deleted before. Same limit that applies to most of this project's UI work; noted here rather than buried.

---

# Session Notes by Phase

What each phase actually involved, written at the time — including the bugs found
during live testing and how they were fixed. Moved here from `docs/handoff.md` on
2026-07-30, when that file was re-scoped to durable reasoning only.

The *reasoning* that still governs the code was lifted out of these notes and now
lives in `docs/handoff.md`. What's left here is the record.

## What Phase 0 Delivered

Empty scaffold with the right shape. Tauri v2 window that opens, folder structure per CLAUDE.md, deps installed, CSS token system in place, dark theme applied, self-hosted fonts loaded, ESLint config. No worldbuilding functionality yet.

Dev machine notes for next time: the local clone lives at `C:\Users\shiro\anamnesiswiki`. pnpm and the Rust toolchain (via `rustup`) are now installed on this machine — the "First-Time Setup Notes" section above about needing Rust is resolved. The `fs` and `dialog` Tauri plugins are installed and registered in `src-tauri/src/lib.rs`, but no capability permissions are granted yet — that's a Phase 1/2 decision once `filesystem-service.ts` and the project picker actually need specific folder/dialog access.

## What Phase 1 Delivered

The data layer: load a project folder into memory, dispatch changes, write back to disk, autosave on content edits.

- `src/constants/schema.ts` — `Node`, `Tab`, `Project` types and their factory functions. `BlockNoteDocument` is a placeholder (`unknown[]`) until Phase 5 wires in the real editor and can swap in BlockNote's actual `Block[]` type.
- `src/services/filesystem-service.ts` — the sole disk-toucher. `resolveNodePath` is a pure function that recomputes a node's on-disk location (ancestor folder directories, plus its own file or `_folder.json`) directly from the in-memory node graph every time, rather than storing a path. That means a rename or reparent is just "resolve the old path, resolve the new path, `fs.rename` if they differ" — no separate tracking of what a node used to be called on disk. Same-parent, same-name, same-type siblings get a deterministic ` (2)`, ` (3)`... suffix on the filename only (ties broken by creation time then id), and a folder/page sharing a name never collides since one's a directory and the other's a `.json` file. Covered by 7 Vitest unit tests in `filesystem-service.test.ts`.
- `src/services/autosave.ts` — per-key debounced (300ms) save scheduler. Structural changes (create/rename/move/delete) write immediately instead of debouncing; only in-place content edits (`updateNode`) go through the debounce.
- `src/state/project-store.ts` — Zustand store holding the in-memory node graph, wired to the two services above. Keeps `project.rootOrder` in sync when nodes are added, moved in/out of the root, or deleted. Deleting a folder also drops its in-memory descendants (the actual on-disk subtree is removed in one `fs.remove(..., {recursive: true})`).
- `src/hooks/use-project.ts` — the only import path components have into the store, per CLAUDE.md's layer rule.
- Tauri's fs capability (`src-tauri/capabilities/default.json`) was scoped to `$DOCUMENT/Anamnesis/**` at the time — **deliberately narrow for now**, with the broader scope needed for Phase 2's "Open any folder" picker flagged as a decision for later. Resolved in Phase 2 (see below).
- `App.tsx` was still a placeholder, wired to exercise the data layer: on launch it loaded (or created) a test project at `~/Documents/Anamnesis/TestWorld`, showed the node list, and had an "Add test page" button to prove writes persist across restarts. Replaced by the real project picker + shell in Phase 2.
- Added Vitest (`pnpm test`) since the path-resolution logic needed real verification before UI gets built on top of it, not just a manual look.

## What Phase 2 Delivered

The app shell: a project picker on launch, and a three-column frame once a project's loaded.

- **Resolved the fs-scope question from Phase 1.** Asked the user directly: sandbox to Documents, or let "Open folder" work anywhere? She picked anywhere, reasoning that a native folder dialog that lets you browse anywhere but then silently fails outside one directory is a worse experience than just trusting wherever you point it — same as VS Code, Obsidian, or LegendKeeper itself. `src-tauri/capabilities/default.json` now grants `fs:read-all` + `fs:write-all` with an unscoped `fs:scope` (`allow: ["**"]`). Also added `dialog:default`, which had been missing since Phase 0 despite the dialog plugin being registered — nothing had needed it until now.
- **`@tauri-apps/plugin-store`** installed for app-level settings that live outside any project folder (which project was open last, the recent-projects list) — this is the "Tauri store" `docs/plan.md` referred to. `src/services/app-settings-service.ts` + `src/hooks/use-app-settings.ts` wrap it.
- **`src/components/shell/ProjectPicker.tsx`** — recent projects (click to reopen), "Open folder" (native dialog, any location), "New project" (name only; created under `~/Documents/Anamnesis/` with six starter folders: Canon, AUs, Characters, Locations, Factions, Worldbuilding). `project-store.ts` gained `createProjectAt()` for the creation flow.
- **`src/components/shell/StartupRouter.tsx`** — checks the last-opened project on launch; loads it directly if it's still on disk, otherwise shows the picker.
- **`src/components/shell/AppLayout.tsx`** — three-column grid (tree / page / properties), right-panel toggle in `TopBar.tsx`. Panel collapses automatically below 700px width (tree below 640px) — this threshold was originally 900px, which sat *above* the app's default 800×600 window size and made the right panel look permanently stuck no matter what the toggle did. Caught during live testing and tuned down.
- **`src/components/shell/SaveIndicator.tsx`** — flashes "Saved" using a `key`-remounted CSS animation rather than a timer + state, because this project's ESLint config (`eslint-plugin-react-hooks` v7's stricter rule set) flags both calling `Date.now()` during render and calling `setState` synchronously inside an effect — the usual timer-based approach trips both.
- `project-store.ts` gained a `lastSavedAt` timestamp, touched by every action that writes to disk, which `SaveIndicator` reads.
- **"Switch project" button**, added right after the initial Phase 2 push once live testing surfaced the gap: closing the whole app was the only way back to the picker. `project-store.ts` gained `closeProject()` (resets in-memory state to nothing loaded), `use-app-settings.ts` gained `clearLastOpenedProject()`, and `TopBar.tsx` got a folder icon button next to the panel toggle that calls both. The recent-projects list is untouched by this, so the project you just left is still one click away from the picker.

## What Phase 3 Delivered

The tree: create, rename, drag-reparent, color, search.

- **`src/services/tree-service.ts`** — the pure logic layer, Vitest-covered like Phase 1's `resolveNodePath`. `buildTreeData` turns the flat `Record<string, Node>` graph into react-arborist's nested shape; `getEffectiveColor` walks the parent chain for the color cascade; `createSearchMatcher` wraps Fuse.js for the name/`#tag` filter.
- **`project-store.ts`** gained `duplicateNode` (deep-clones a node's whole subtree with fresh ids and a "(Copy)" suffix on the top-level clone's name — the on-disk naming collision is already handled for free by the existing collision-suffixing logic), `selectNode`/`setExpanded` (persist `project.selectedId`/`expandedIds`, debounced so clicking around the tree doesn't hammer disk), and `moveNode` learned an optional root-level reorder index.
- **`src/constants/templates.ts`** — a deliberately temporary stand-in for Phase 7's real `template-registry.ts`. Just enough (display labels, which template types can hold children) for the tree to function without pulling Phase 7's tabs/property-schema work forward. **Phase 7 should fold this into `template-registry.ts` rather than keep it as a separate file.**
- **The tree components**, all in `src/components/tree/`: `TreeSidebar` (tab strip + header + search + panel), `ProjectHeader` (home icon, name, root-level add), `TreeSearch` (Fuse-backed filter input), `TreePanel` (wraps react-arborist's `<Tree>`, owns its own pixel sizing since react-arborist doesn't auto-size — see `use-element-size.ts`), `TreeItem` (the actual row: icon, cascade color, inline rename, hover buttons, drag handle), `ColorPicker`/`TemplatePicker`/`ContextMenu` (popover content), and `TreePopover` (shared portal wrapper — see below).
- **Two real bugs, both fixed same-session via live testing:**
  - *Context menu visually glitched depending on mouse position.* Every react-arborist row is its own `position: absolute` stacking context for virtualization, so a popover nested inside one row's DOM subtree can never paint above a neighboring row via z-index alone — z-index only resolves within a shared stacking context. Fixed by having all three popovers render through `TreePopover.tsx`, which portals to `document.body` with a fixed position computed from the trigger's `getBoundingClientRect()` instead of being CSS-anchored inside the row.
  - *Dragging did nothing.* Tauri enables its own native OS drag-and-drop handling by default, which swallows drag events in WebView2 before react-dnd's in-page HTML5 backend sees them. Fixed with `"dragDropEnabled": false` on the window in `tauri.conf.json` — see the Known Design Gaps entry above for the Phase 6/8 trade-off this creates.
- **`window.confirm()` doesn't work in Tauri's webview** — it no-ops instead of blocking, so Delete was silently deleting with no prompt at all. `dialog-service.ts` gained `confirmDestructive()` using Tauri's actual dialog plugin; the old `use-folder-dialog.ts` hook was folded into a broader `use-dialogs.ts` since dialogs now cover more than folder-picking.
- A drop-target highlight (accent outline + tint on the folder a drag is currently hovering over, via react-arborist's `node.willReceiveDrop`) was added as a quick polish pass once dragging actually worked.

## What Phase 4 Delivered

The page view: a real center panel instead of a placeholder.

- **`src/components/page/`** — `PageView.tsx` (routes between `FolderView`, the tabbed page view, and `EmptyPageView` based on the selected node), `PageTitle.tsx` (breadcrumb trail via the tree's ancestor chain, tinted template icon, click-to-rename), `PageTabs.tsx` (active-tab underline, hover-revealed eye toggle for hide/show, dim/italic styling on hidden tabs), `FolderView.tsx` (full color tint like the tree, "Add a page" reusing the tree's own template picker popover), `EmptyPageView.tsx`, and `PlaceholderEditor.tsx` (a plain textarea standing in for Phase 5's real BlockNote editor).
- **`tree-service.ts`** gained `getAncestorChain` (root-to-parent, Vitest-covered) for the breadcrumb.
- **`project-store.ts`** gained `updateTabContent`/`toggleTabHidden`, both routed through the existing debounced `updateNode` so tab edits autosave the same way node edits already did. Every new non-folder page now starts with one default "Main" tab — a stopgap until Phase 7's template registry supplies real per-template tab sets.
- **Bugs fixed during live testing:**
  - The left sidebar's scrollbar flashed in and out while resizing the window — a leftover `overflow-y: auto` on `.app-layout-tree` from Phase 2 racing against react-arborist's own `ResizeObserver`-driven internal scrolling. Removed, since the tree already manages its own scroll region.
  - Scrollbars rendered as the browser's plain default instead of matching the dark theme. Fixed with one global themed-scrollbar rule in `index.css` covering every scrollable area app-wide.
  - Adding a Note specifically appeared to do nothing. `TreePopover.tsx` positioned itself from the trigger's bounding rect with no viewport clamping, so opening the template picker from low in a tall tree could push its last grid row (Species/Note) below the visible window. Fixed by measuring the popover after mount and clamping/flipping it to stay on-screen.
  - **A serious pre-existing bug in `filesystem-service.ts`, dating back to Phase 1 and only now surfaced:** pages nested under a Character/Location/Faction/Species (any nestable non-folder node) silently disappeared from the app on every reload, even though their files were untouched on disk. `walkDirectory` only recognized a subdirectory as node-owned if it contained `_folder.json`; a nestable page's own children-directory never has one, so it was treated the same as an unrelated directory like `assets/` and skipped. Fixed by giving nestable non-folder templates the same treatment folders already get — they now store themselves inside their own directory too, in a `_page.json` marker file, so a directory's ownership is never derived from its current name (which a rename could silently invalidate). This was a real design decision (every character/location/faction/species is now a small directory on disk, not a single file) and was confirmed with the user before implementing. See `CLAUDE.md`'s "Data on disk" section for the updated layout.
- **Scope decision from live testing:** users need to add/rename/delete tabs on a page beyond whatever the template started it with (LegendKeeper itself works this way — tabs are freeform per page). Tracked as part of Phase 7 rather than added now, since it depends on the template registry existing.

## What Phase 5 Delivered

The real writing surface: a live BlockNote editor instead of Phase 4's placeholder textarea.

- **`src/components/page/Editor.tsx`** — `useCreateBlockNote` + `BlockNoteView`, remounted per tab switch via `key={activeTab.id}` (same pattern as Phase 4's `PageView` remount-per-node).
- **`src/services/editor-blocks/`** — the custom schema pieces: `CalloutWrapper.tsx` shared by the three thin callout block specs (`info-block.tsx`/`quote-block.tsx`/`secret-block.tsx`); `mention-inline-content.tsx` + `MentionChip.tsx` (the `@`-inserted chip, which looks up its target live by id so a rename never leaves a stale label, and shows as a greyed-out broken chip if the target was deleted); `mention-menu-items.tsx` (the shared suggestion-item list behind both `@` and `[[`); `wikilink.ts` (auto-converts a completed `[[Name]]` only when the name is unique — see the Known Design Gaps entry above); `wikilink-bracket-confirm.ts` and `wikilink-resume.ts` (the `[[` menu's closing-`]]`-confirms-top-match shortcut, and reopening the menu when clicking back into an abandoned unfinished `[[query`); `editor-schema.ts` (combines it all into one `BlockNoteSchema`).
- **A real Phase 0 dependency gap, only surfacing now:** BlockNote's menus/toolbars need a separate UI-kit "flavor" package to render at all — never installed. Added `@blocknote/shadcn` (fits the app's existing Tailwind styling better than `@blocknote/mantine`, which would've brought in a second competing CSS framework). This in turn needed two follow-up fixes: Tailwind wasn't scanning `node_modules` for the new package's utility classes (`@source` directive added to `index.css`), and shadcn's components expect their own standard token names (`--accent`, `--popover`, etc.) that the app never defined — added a mapping layer in `index.css`'s `@theme` block onto the app's existing tokens, and repointed `--color-accent` itself from the bold solid teal to the same translucent tint as `--color-accent-faint` (shadcn uses "accent" for menu-row hover/selection, not focus rings — bold solid read as illegibly bright there). See `docs/constants-and-theming.md`.
- **Two bugs surfaced during live testing that predate Phase 5** (real content-editing was just the first thing to make the timing possible):
  - Renaming/moving a node right after typing in it could leave a stale duplicate directory behind, or leave the renamed file's own content one save behind. Root causes: a pending debounced content-save could race an immediate rename/move (fixed by flushing pending saves before relocating, and cancelling them before deleting, using `autosave.ts`'s previously-unused `flushSave`/`cancelSave`); and `relocateNode` only ever moved the file to its new path without ever rewriting its contents, so a renamed file's own `name` field could still say the old name (fixed by always re-saving the node at its new location right after the move).
  - The tree's selection highlight didn't follow a mention/wikilink-driven navigation (only ever synced from the tree's own clicks). `TreePanel.tsx` now syncs the tree's selection/focus (and expands whatever ancestors it needs to) whenever `project.selectedId` changes, regardless of cause.
- Also fixed: clicking the visually-empty space below a short page's content did nothing, since BlockNote's editable area shrink-wraps to its own text and won't stretch via CSS. Worked around in JS — a click landing on the wrapper's own background (not any rendered content) places the cursor at the document's end.

## What Phase 6 Delivered

The right sidebar: image upload, per-template fields, and tags for every non-folder page.

- **`src/components/properties/`** — `PropertiesPanel.tsx` (reads `templates.ts`'s new `PROPERTY_SCHEMAS` for the selected node's template and renders `ImageSlot` + fixed text/date fields + refs fields + `TagsProperty`, in that order), `ImageSlot.tsx`, `TextProperty.tsx`, `DateProperty.tsx`, `TagsProperty.tsx`, `RefsProperty.tsx`, `properties.css`. Wired into `AppLayout.tsx` in place of the Phase 2 placeholder.
- **`templates.ts` gained `PROPERTY_SCHEMAS`** — the per-template property lists copied from the prototype (minus tabs/placeholder copy, which stay Phase 7's job), same "fold into `template-registry.ts` later" pattern already used for `TEMPLATE_LABELS`/`canHaveChildren`.
- **`schema.ts`'s `Node` gained `image?: string`** (an asset filename inside `assets/`, not a path). **`filesystem-service.ts`** gained `saveAssetImage`/`readAssetImage`/`deleteAssetImage` (binary read/write, addressed by filename since an image outlives any single rename/move of its page). **`project-store.ts`** gained `updateNodeProperty`, `updateNodeTags`, `setNodeImage`, `clearNodeImage`. A new **`use-node-image.ts`** hook resolves an image filename to a Blob object URL for display.
- **A drag-drop assumption from Phase 3 turned out fine** — see the Known Design Gaps entry above; `ImageSlot`'s drop zone is plain HTML5 DnD and works because `dragDropEnabled: false` already stops Tauri's webview from intercepting it.
- **Two interpretive calls**, surfaced to the user rather than assumed silently: reference fields (Leader, Owner, etc.) stay multi-select like Friends rather than special-casing singular-sounding ones; the `date` property type renders as free text rather than a native date picker, since fictional calendars ("Year 872, Third Age") don't fit a real calendar widget. No template currently uses `date` — Event's "When" is `text` — but the component exists for whenever one does.
- **Five rounds of live-testing polish**, all from screenshots since the issues were hard to describe in words alone:
  - Image preview was forced into a square crop; now only the empty "drop image here" state stays square, a set image shows at its own aspect ratio, and the placeholder border/background frame disappears once an image is set (matches LegendKeeper's borderless look).
  - Text-type fields (Summary, When) now read as plain content, invisible-bordered until hover/focus, via a `.property-value-input`/`.property-value-textarea` style used only for those — the Friends-search and Add-tag inputs kept their normal visible bordered look since those are action affordances.
  - Field order took two passes: fixed text/date fields always render first (so a growing refs list can't push them down), refs fields come next, Tags stays last.
  - The search/add input in both `RefsProperty` and `TagsProperty` now renders above its own chip list, not below — otherwise the input's position kept drifting down as chips accumulated.
  - `PageTitle.tsx`'s breadcrumb trail is now clickable (project name + every ancestor), same click-to-navigate as a mention/wikilink.
- **Two asset-lifecycle bugs caught in a final self-review**, not user-reported: deleting a node never cleaned up its image file in `assets/` (fixed in `deleteNode`), and duplicating a node with an image cloned the filename verbatim, so original and copy shared one file on disk — replacing/removing the image on either would've deleted it out from under the other (fixed by making `duplicateNode` async and copying the image bytes to a fresh filename per clone).

## What Phase 7 Delivered

Real templates: all 8 templates plus a new "Blank" option, per-page tab management, per-page custom properties, and three polish fixes that came out of live testing.

- **`src/services/template-registry.ts`** is now the single source of truth for template definitions (tabs, property schemas, `canHaveChildren`), folding in `constants/templates.ts` (deleted) per that file's own header comment. All 8 templates' tab content is transcribed verbatim from `docs/prototype/anamnesis.jsx`, translated from HTML into BlockNote block JSON via small local helpers rather than parsed at runtime. A new **`src/hooks/use-templates.ts`** hook is the only path components have into it, matching the layer rule that components never import services directly.
- **`project-store.ts`** gained `applyTemplate` (sets a node's template and merges in only the tabs it doesn't already have, by id — never overwrites existing content), `addTab`/`renameTab`/`deleteTab`/`reorderTabs`, and `addCustomProperty`/`removeCustomProperty`. `addNode` now instantiates a template's real default tabs instead of Phase 4's placeholder single "Main" tab.
- **Blank pages**: "Blank" is a 9th entry in the same template-picker grid used everywhere a page gets created, starting with no tabs/properties. Its properties panel shows an "Apply a template" prompt instead of a fixed field list. The user considered having "+" skip the picker and default straight to blank to save a click, but chose to keep the existing picker flow as-is after weighing it.
- **`src/components/page/PageTabs.tsx`** gained a "+" to add a tab, double-click-to-rename, a confirmed delete, and drag-to-reorder via `@dnd-kit/core`/`sortable`/`utilities` (new dependencies) — see the fixes below for why dnd-kit replaced an initial plain-HTML5-DnD attempt.
- **Per-page custom properties**: a "+ Add property" control at the bottom of the sidebar (above Tags) lets a page get one-off extra fields beyond its template's fixed list — pick a type (Text, Long text, References, Date), name it, and it renders with a remove affordance. Stored as `Node.customProperties?: CustomPropertySpec[]` — optional rather than defaulted, since pages saved before this field existed won't have it on disk; every read site falls back to `[]` itself. This was originally logged as a Phase 6 Queued Adjustment; the user asked to pull it into Phase 7 instead of waiting.
- **Three fixes from live testing:**
  - Tab reordering's first pass used plain HTML5 drag-and-drop. With the whole tab row covered by real `<button>`s (label/eye/delete), a mousedown almost always landed on one of those, and browsers don't reliably start a native drag gesture from a nested button even with a draggable ancestor — worked around with a dedicated grip handle, but the user found the result "clunky," with no live reorder preview. Replaced with dnd-kit's sortable preset, which animates other tabs sliding out of the way as you drag. A follow-up ask wanted to grab a tab from anywhere on it, not just the grip — dnd-kit's `PointerSensor` activation-distance threshold makes that safe (a plain click still reaches the buttons underneath; only real pointer movement starts a drag), so the grip is now a visual cue only, not the exclusive drag surface.
  - Tab labels had no `white-space: nowrap`, so a longer name could wrap onto two lines once the strip got crowded, visually breaking the eye icon's position. Fixed; the strip now scrolls horizontally instead of squeezing tabs when it runs out of room.
  - Delete confirmations rendered as native OS dialog boxes via Tauri's `confirm()` — visually inconsistent with the app's own dark theme. Replaced with an in-app themed modal (`src/state/dialog-store.ts` + `src/components/shell/ConfirmDialog.tsx`), keeping the same `confirmDestructive(message): Promise<boolean>` shape so existing call sites needed no changes. `dialog-service.ts` now only wraps the native folder-browse dialog (which should stay OS-native).

## What Phase 8 Delivered

LK import: the user's real `Valeraverse.lk` lands as a brand-new project.

- **`src/services/lk-import.ts`** — ungzip via the browser's native `DecompressionStream` (no new dependency), full ProseMirror→BlockNote block translation, template inference, id-map-based mention/reference resolution, per-page property import, and lossy-conversion tracking surfaced in the import preview. Full field mapping now lives in the new **`docs/lk-format.md`**.
- **`src/components/import/ImportModal.tsx`** — file pick → preview (tree, template counts, plain-language lossy list) → destination folder → commit. Entry point is an "Import from LegendKeeper" button on `ProjectPicker.tsx`. `project-store.ts` gained `importLkProject`.
- **Two decisions escalated mid-build, both approved:** importing LK's per-page sidebar properties (Summary/Friends/etc., not just tabs — spec's Phase 8 write-up only mentioned tabs), and downloading page images from LegendKeeper's own CDN during the one-time import action — the one exception to the app's zero-network-calls policy, via a new `@tauri-apps/plugin-http` Rust plugin scoped narrowly to `https://assets.legendkeeper.com/*`.
- **A real bug found and fixed same-session:** LK properties matching a template's own built-in field (e.g. Character's "Friends") were importing as duplicate custom properties instead of filling the existing field, so the panel showed the same field twice. Fixed by routing property titles against the inferred template's schema first.
- **Banners**, added after the user firmly rejected an initial version that reused the sidebar `image` slot for LK's banner too — LK's banner and sidebar image are different things. Added a real `Node.banner`/`bannerFocusY` pair and a new `PageBanner.tsx`, full-bleed above the page title (Notion/Obsidian-style, not boxed to the text column like LK's own), with upload/drag-to-reposition/remove.
- **Page reading-column width increased (48rem→60rem) and centered** (it was never actually centered before — unnoticed until the user ran the app at true fullscreen), and the sidebar portrait image's max-height increased (20rem→28rem) to better match LegendKeeper's own proportions.
- Also: LK's `expand` (collapsible section) blocks now map losslessly to BlockNote's own native `toggleListItem`, replacing an earlier flatten-to-heading approach — noticed and fixed while explaining the tradeoff to the user, since BlockNote already ships the block type needed.

See `docs/plan.md` for the full phase list.

---

# Engineering Passes

Reviews and refactors that weren't phases. Same rule: the durable constraints
these produced live in `docs/handoff.md`; the measurements and verification are
here.

## Code Review 2026-07-30

Read of every file in `src/`, plus `tsc`, ESLint, and the Vitest suite (all clean at the time of review). Architecture rules from `CLAUDE.md` were being followed — sole disk-toucher intact, no barrel files, no stray template metadata. Findings below, each fixed in its own PR.

### Fixed: LK import silently orphaned sub-pages

`inferTemplateKey` in `lk-import.ts` matched a page's tab list **exactly** against the known signatures, so any page carrying an extra user-added tab fell through to `note`. `note` is a leaf template (`canHaveChildren: false`), which meant:

- `buildTreeData` renders `children: null` for it, so its sub-pages never appear in the tree at all; and
- `resolveNodePath` stores it as a flat `Name.json` with no directory of its own, so its children were written into a `Name/` directory with no `_folder.json`/`_page.json` marker — which `walkDirectory` skips on load. Permanent loss on the next project load, with the import preview still reporting them as imported.

Two changes: signatures are now **subset** matches (ordered most-specific-first, so species beats character on a page that has both signatures' tabs), and a nestability net promotes any resource with children to `folder` if the inferred template can't hold them. The net drops that page's own text, so it's reported as a distinct lossy note rather than folded into the existing "organizing page" wording.

Measured against the real `Valeraverse.lk`: 1 page affected before the fix ("Valera Jiang", tabs `[Overview|Gallery|Backstory]`, 1 child at risk). After: she classifies as `character`, all 75 nodes are reachable in the tree, 0 orphans, and the nestability net never fires — so no text is dropped.

### Fixed: same-name siblings drifted out of sync with disk

`ownSegment` ranks colliding same-name, same-storage-kind siblings by creation order to assign the ` (2)`/` (3)` suffix. That rank is recomputed from the current graph on every resolve, so acting on one member of a collision group **renumbers the others** — but `relocateNode` only ever moved the one node the user acted on. The untouched sibling's computed path then pointed somewhere its real directory wasn't, and its next write created a second directory holding the same node id. `walkDirectory` loads both, so the page appears twice after a reload with edits split across the copies.

`planRelocations(before, after)` now diffs the whole graph instead. A node is scheduled for its own `fs.rename` only when its **own segment or own parent** changed — a path that shifted purely because an ancestor directory moved rides along with that directory and must not be moved twice (this was a real bug in the first cut of the fix, caught by the descendant test). `deleteNode` takes the after-graph for the same reason.

Multi-move plans stage through temp names before landing on their targets: renaming "Ruins" away is exactly what frees the name "Ruins (2)" is moving into, so a naive ordering hits an occupied target. Temp directories keep their `_page.json`, so a crash mid-shuffle leaves the node loadable under an odd directory name that the next save corrects, rather than lost.

10 new tests in `filesystem-service.test.ts` covering rename, delete, chained renumbering, collision-creating renames, cross-storage-kind non-collisions, leaf siblings, ride-along descendants, and moves out of a folder.

### Fixed: a single damaged file took down the whole project

Nothing in the load path had a `try`/`catch`. `JSON.parse` on a corrupt node file threw, the rejection propagated out of `StartupRouter`'s `bootstrap()`, `setIsChecking(false)` never ran, and the app sat on "Loading..." with no error and no way forward. `ProjectPicker` had the same shape (`isBusy` stuck true), as did `ImportModal.handleConfirm` (stuck on "Importing your world"). For a local-first app whose files the user syncs and can hand-edit, this is a when-not-if failure.

`loadProject` now returns `{ project, nodes, skipped }`. Individual node files that fail to parse — or that parse into something without a string `id`/`name` — are collected in `skipped` rather than thrown; `project.json` itself is still fatal, since without it there's no project. A directory whose marker file is unreadable is still walked into, with its children reparented one level up, so one bad `_folder.json` costs one node instead of the whole branch.

Skipping silently would be worse than the crash it replaces (pages would just quietly stop existing), so `LoadWarning.tsx` reports the skipped paths under the top bar until dismissed.

**Verified in the browser**, which is a real instance of this bug: under `pnpm dev` there's no Tauri runtime, so `getLastOpenedProject()` rejects with "Cannot read properties of undefined (reading 'invoke')". On `main` the app renders "Loading..." forever; with the fix it falls through to the project picker as intended. Confirmed both ways by reverting just `StartupRouter.tsx` and reloading.

### Fixed: debounced edits lost on exit

`autosave.ts` held writes for 300ms and nothing flushed them on shutdown. Added `flushAllSaves()`/`hasPendingSaves()` plus `hooks/use-save-on-exit.ts`, mounted by `AppLayout`. Two nets, since neither covers everything: `blur`/`visibilitychange` (alt-tab, sleep, most deliberate closes — plain web APIs, works under `pnpm dev` too), and Tauri's `onCloseRequested` (the actual window close, which tears down the webview without a reliable DOM unload event). The close path preventDefaults, races the flush against a 2s timeout, then calls `destroy()` — losing the tail of one edit is bad, an app that can't be quit is worse. Needs `core:window:allow-destroy`, added to `capabilities/default.json`.

**Not yet exercised against a real window close** — the Tauri window lifecycle can't be driven from the review environment. Worth a quick `pnpm tauri dev` sanity check (type something, close immediately, reopen) next time the desktop app is running.

### Fixed: no manual ordering inside folders

`Project` only ever persisted `rootOrder`, and `TreePanel`'s `onMove` threw away react-arborist's drop index for anything below the root (`parentId === null ? index : undefined`). Everything but the top level was pinned to `sortByCreation`, so an in-folder drag rendered back in creation order the moment the store updated.

`Project.childOrder?: Record<parentId, string[]>` now does for each folder what `rootOrder` does for the top level. It's optional and sparse on purpose — a project saved before this existed has no entry, and a folder nobody has reordered never gains one — so `orderSiblings` treats a missing or partial list as "these first, everything else by creation time". Additive, no migration.

`orderSiblings` is the generalization of the old root-only sort and is now shared by `buildTreeData` and the store's `orderedSiblingIds`. A drop rebuilds the destination list from the order actually on screen rather than from whatever partial list is stored, so a never-reordered folder gets a complete, correct list on its first drop.

`deleteNode` prunes `childOrder` (both entries *for* deleted parents and mentions *of* deleted nodes), and `duplicateNode` now places the copy directly after its original inside a folder, not just at the root.

5 new tests in `tree-service.test.ts`. Note this supersedes half of the `duplicateNode` ordering note below: clone *placement* is now explicit, though clones still share a `createdAt`, so ordering *within* a duplicated subtree is still arbitrary.

### Fixed: whole-app re-render on every keystroke

`use-project.ts` was a single `useProject()` returning `useProjectStore()` — an unselected, whole-store subscription. Every `updateNode` replaces the `nodes` map, so one character typed re-rendered every consumer: all ~30 virtualized `TreeItem` rows, every `MentionChip` in the open document, `PropertiesPanel` and its fields, `PageBanner`, `PageTitle`, `SaveIndicator`.

Added narrow hooks alongside the existing one — `useNode(id)`, `useProjectActions()`, `useProjectName()`, `useProjectRootPath()`, `useLastSavedAt()`, plus `useEffectiveColor(id)` / `useAncestorChain(id)` in `use-tree-data.ts` (both `useShallow`-compared, since they derive from the whole map by walking the parent chain). Converted the per-row and per-mention consumers: `TreeItem`, `MentionChip`, `SaveIndicator`, `useNodeImage`, `PageTitle`, `FolderView`. `TreePanel`, `PropertiesPanel`, `PageView` and `Editor` keep the full subscription — they genuinely track broad state.

Store actions are created once and never replaced, so `useProjectActions()` is a permanently stable reference: a component that only dispatches never re-renders from a store update at all.

**Verified against the real store in the browser.** Seeded two sibling nodes, edited one, and checked selector output identity — which is exactly what decides whether React bails out of a re-render:

| | result |
|---|---|
| `nodes` map identity changed (full subscribers re-render) | yes |
| `useNode("b")` reference stable | yes |
| `useLastSavedAt()` / `useProjectRootPath()` stable | yes |
| `useEffectiveColor("b")` shallow-stable when a sibling is edited | yes |
| `useEffectiveColor("b")` updates when its parent folder is recoloured | yes |

The last row matters most — the narrowing must not break the colour cascade, and it doesn't.

**Not measured:** actual frame timings or render counts under load. The mechanism is verified; the felt improvement on a 75-page project is worth a look next time the desktop app is running.

### Fixed: assorted review cleanups

- **Two layer-rule violations.** `page/Editor.tsx` imported six modules straight out of `services/editor-blocks/`, and `tree/TreePanel.tsx` imported `createSearchMatcher` from `tree-service`. New `hooks/use-editor.ts` owns the editor's construction, wikilink wiring, change handling and both suggestion-item getters, leaving `Editor.tsx` rendering only; `useSearchMatcher` moved into `use-tree-data.ts`. `grep` for `components/**` importing `../../services/` or `../../state/` is now empty.
- **Stale comments.** `ContextMenu.tsx` still claimed Delete used a native `window.confirm()` (replaced by `ConfirmDialog.tsx`); `TopBar.tsx` still described its breadcrumb as a Phase 3/4 placeholder, when the real trail deliberately lives on `PageTitle.tsx`.
- **`CLAUDE.md` said "No tests configured"** — there were 96. Corrected, `pnpm test` added to the Commands list, and a line on what the testing convention actually is (services are the unit-tested layer; no jsdom/RTL setup, components untested).
- **Banner flicker.** `useNodeImage` returned `null` both while loading and when there was nothing to load, so `PageBanner` flashed its empty prompt on every page switch. It now returns `{ url, status }` with an explicit `loading`/`error` state; the banner holds its space while reading, and a missing asset file says so in both `PageBanner` and `ImageSlot` instead of failing silently.
- **Window size.** 800×600 → 1280×800 with a 900×600 minimum; the three-column layout never really fit the old default.

**Noted, not fixed:** `duplicateNode` stamps every clone in a subtree with the same `createdAt`, so cloned siblings fall back to the `id.localeCompare` tie-break — meaning a duplicated folder's children come out in an arbitrary order rather than matching the original. Ordering only, no data loss.

**Noted, not fixed:** the real export also reports 15 broken cross-reference links on import. Those are mentions pointing at the LK project root, which becomes the Project itself rather than a Node (see the Phase 8 notes below). Worth revisiting alongside the queued "proper project home" feature, since that's the thing they'd naturally point at.

## Disk I/O Pass 2026-07-30

Follow-up to the code review above, prompted by a patch the user brought in that
was written against the pre-review tree and so couldn't be applied — the ideas in
it were sound, the base wasn't. Rebuilt on current `main` instead. Scope was
deliberately limited to the load/save path and two hot in-memory loops; no
behaviour changes, and every existing test kept passing untouched.

### `join()` was the dominant cost, and it wasn't obvious

`@tauri-apps/api/path`'s `join` is `invoke('plugin:path|join')` — a full async IPC
round trip into Rust *per call*. `filesystem-service.ts` called it 3–4 times per
node on both the load and the save path. `sep()` is not IPC: it reads a value the
runtime hands the webview at startup, synchronously. So `separator()` caches it
lazily (lazily because the global doesn't exist under `pnpm dev` or Vitest) and
`joinPath` does the string work locally.

This is only safe because every segment reaching `joinPath` is either a constant
from `constants/paths.ts` or has been through `sanitizeSegment`, which strips
both separators along with the other illegal characters — nothing can carry a
`..` or a `/` through it. Worth preserving if `joinPath` ever grows a caller.

### Path resolution was quadratic

`ownSegment` scanned every node in the project to rank same-name siblings, and
`resolveNodePath` called it once per ancestor plus once for the node itself. Fine
for one node; quadratic for a whole-project write. `buildPathIndex` does the
grouping once and `resolveNodePath` now takes either a raw array (unchanged for
single-node callers) or a prebuilt index.

The collision rule is unchanged, just relocated: the group key is
`JSON.stringify([parentId, usesDirectoryStorage, sanitizedName])` — JSON rather
than a joined string so no separator character inside a page name can make two
groups collide. (A NUL delimiter was tried first and is a bad idea: it makes the
source file read as binary to `grep` and survives round trips badly.)

### The load walk

`walkDirectory` listed a directory, then asked `exists` twice more per
subdirectory to find its marker file. `walkEntries` takes the entries it was
already given, so the listing that identifies a directory as node-owned is the
same listing used to recurse into it. Siblings are read in parallel.

The resilience added in the review above is preserved exactly — `readNodeFile`
validation, the `skipped` list, and recursing into a folder whose own marker is
corrupt so its children survive reparented one level up. `skipped` is now sorted
before returning, because parallel reads make completion order nondeterministic
and the user-facing list shouldn't reshuffle between loads.

**Concurrency needs care here.** The limiter holds its permit around a single
read only, never across the recursion into a subdirectory. A limiter that wraps
the recursive call instead deadlocks on any tree deeper than its own limit —
parents wait on children that can't get a permit. The patch this work came from
had exactly that shape.

### Measured

Measured against `main`'s implementation running side by side over the same
in-memory disk (scaffold deleted after; reproduce by copying `main`'s
`filesystem-service.ts` in as a second module and counting mock calls).

| | before | after |
|---|---|---|
| Load, 78-node world — total fs round trips | 309 | 112 |
| ...of which `join` | 142 | 0 |
| ...of which `exists` | 57 | 1 |
| ...of which `readDir` | 31 | 32 |
| Resolve 100 nodes | 1.4ms | 0.2ms |
| Resolve 310 nodes | 9.2ms | 0.4ms |
| Resolve 1000 nodes | 62.3ms | 1.3ms |

`readDir` goes *up* by one: non-node directories like `assets/` now get listed to
discover they have no marker, where before two `exists` probes answered that. One
extra listing per non-node directory, against two saved probes per node directory.

Path outputs were asserted identical to `main`'s for every node in a fixture that
includes same-name directory-storage siblings and a same-name leaf, which is the
case the suffixing exists for.

### Also in this pass

- **Fuse index cached** in a `WeakMap` keyed on the node record's identity. The
  index was rebuilt from every name and tag on each keystroke. Weak so a closed
  project's index isn't retained; keyed on identity so the store's next immutable
  update evicts it. Name and tag queries hold separate indexes — they search
  different fields.
- **`descendantIds`** grouped children by parent in one pass instead of
  re-filtering the whole record per level.
- **`updateNode` snapshots at fire time, not schedule time.** It ran
  `Object.values(nextNodes)` per keystroke (an n-element array per character),
  and worse, a 300ms-old snapshot can resolve against a graph that no longer
  exists — a sibling renamed inside the debounce window shifts collision
  suffixes and the write lands at a stale filename. Now reads `get()` when the
  debounce fires.

### Not verified here

The load and save paths need the Tauri runtime; under `pnpm dev` there's no
`invoke`. Verified by test (109 passing, including four asserting exact fs
round-trip counts) and by confirming the app still boots clean with no console
errors. The end-to-end "open Valeraverse and time it" check needs `pnpm tauri dev`.

## CLAUDE.md Slimmed 2026-07-30

244 lines to 174 (17.3KB to 11.9KB). **Nothing was removed** — every rule, every
policy line, every token warning survives; the reduction is entirely duplication.
All twelve architecture rules are intact, including #1 and #2, which the external
patch that prompted this had dropped.

Where the duplication was:

- **Strict layer order vs Architecture Rules** restated each other almost
  point-for-point (rules 3-8 were the layer-order bullets again). Merged into the
  numbered list; the layer-order section keeps only the diagram and the
  import-depth note.
- **Don't Do This** was a third copy of the same rules. Now only the three items
  that appear nowhere else.
- **The LK Import/Export section** duplicated `docs/lk-format.md`, and its
  tab-signature table had gone *stale* — it still described the exact-match rule
  replaced by subset matching in the review pass. Replaced with a pointer, which
  removes the chance of working from the wrong rule from memory.
- **Project Context's "what this is"** overlapped Policy Boundary; compressed.

### Two doc problems found while doing it

**`docs/spec.md` §Data model is stale.** It shows characters as flat
`Valera Jiang.json` files — it predates the directory-storage decision, so it
describes a layout the app does not use and has no `_page.json` at all.
`CLAUDE.md`'s Data on disk section is the only accurate written record, so it was
kept in full and marked authoritative rather than compressed into a pointer.
Fixing `spec.md` was explicitly out of scope for this pass; it remains a real
trap for anyone reading it as the master spec.

**`CLAUDE.md`'s reference list was wrong in both directions.** It pointed at
`docs/data-model.md`, which does not exist, and omitted `components-reference.md`,
`constants-and-theming.md`, and `project-summary.md`, which do. Corrected.

### Deliberately not done

`docs/handoff.md` (53KB) and `docs/plan.md` (45KB) are the two largest docs and
the obvious next target, but they are read on demand rather than every session,
so shrinking them saves nothing recurring and costs project history. The external
patch collapsed nine "What Phase N Delivered" sections and all of Phases 0-8 into
single headings; that was rejected. If they do get split later, the move is
archiving completed-phase detail to a file nothing reads by default, not deleting
it.

## Save Failures Made Visible 2026-07-30

Two bugs logged during the doc accuracy pass, both fixed. The second turned out
to be a symptom of something larger.

### Case-insensitive sibling collisions

`buildPathIndex`'s grouping key now folds case. `sanitizeSegment` output still
carries the user's own capitalisation into the segment — only the collision test
ignores it, so `Ruins` keeps its capital and `ruins` becomes `ruins (2)`.

Worth knowing this is a *latent* fix: a project that already contains such a pair
has one of them missing from disk, and this doesn't recover it. It prevents the
next occurrence.

### The real find: every failed save was silent

`scheduleSave` ran its callback as `void save()`. A debounced write fires long
after the action that caused it, with no caller left on the stack — so any
rejection became an unhandled promise rejection and vanished. Path length was
only one way to trigger it; a full disk, a permissions change, or a sync client
holding a file open all failed exactly as quietly.

What makes this worse than a crash: the user has active evidence their work is
safe. The text is still on screen, and `SaveIndicator` flashed "Saved" the last
time a write succeeded. Nothing ever contradicts it.

`autosave.ts` now routes failures through a registered handler
(`setSaveErrorHandler`) rather than owning any UI itself — it's a plain service
and has to stay one. The store registers the handler and collects messages into
`saveErrors`; `SaveWarning.tsx` renders them in red, above the page, distinct
from `LoadWarning`'s amber. Messages are deduped and capped at 10, because a
debounced save retries on every keystroke and a page that can't be written fails
identically each time.

`flushAllSaves` still doesn't stop on a failure — one unwritable node shouldn't
cost the others their flush — but it now reports each one. On the window-closing
flush there is no UI left to render into, which is exactly why the handler
records into the store rather than drawing anything itself.

### Path length

`MAX_PATH_CHARS = 200`, not 260. A directory-storage node's own path is only a
prefix — its `_page.json` and every child filed beneath it are longer still, so a
node sitting exactly at the OS limit has nowhere to put its contents. Checked
before `mkdir`, so a path that's going to be refused doesn't leave an empty
directory tree behind.

`docs/spec.md` offered truncation as the alternative ("truncate long names for
the file path while keeping the full name in the JSON body"). Not taken:
silently renaming the user's files to make them fit is worse than refusing and
saying why.

### Not verified here

The banner needs a loaded project and a real write failure, so it needs
`pnpm tauri dev`. Verified by test (122 passing, 8 new covering the reporting
channel and the length guard) and by confirming the app boots clean.

## Project Home 2026-07-31

The last Queued Adjustment standing between Phase 8 and Phase 9. Designed
against a live LegendKeeper account (the user made a fresh one specifically to
see the editable, non-read-only UI), which changed the design substantially:
LK's project home is not a reserved view but an ordinary page with a
"Set as project home" item in its right-click menu. Anamnesis now does the same.

### What shipped

`Project.homeNodeId` — optional and nullable, so existing projects need no
migration and a world needn't have a home at all. `setProjectHome` toggles it
and writes `project.json` immediately rather than through the debounced
metadata path. `deleteNode` clears it when the designated page is removed,
including when home sat inside a deleted subtree rather than at its root.

UI: a "Set as project home" / "Remove as project home" item in the tree's
right-click menu, a house badge on the designated row (always visible, unlike
the hover-revealed colour dot and add button beside it), the tree header's
previously-decorative house icon turned into a jump-to-home button, and a
"Home" chip beside the page title — LK's own arrangement in each case.

### The import half

Bigger than the UI. The LK project root now becomes a real Node instead of
being dissolved into the project's name plus an occasional "Home" page:

- It keeps the root's name, which is also the project name.
- It's created unconditionally, since the designation is the point.
- It's in `idMap`, which is what makes mentions pointing at the project root
  resolve — the 15 broken cross-references in the user's real export.
- Parent-grouping moved to a separate `importedIds` set, because with the root
  in `idMap` the old check filed the root's children *under* the root and left
  the top-level walk empty.
- LK's stock "Welcome to LegendKeeper" tutorial is detected and left out; the
  home page is created empty and the preview's lossy list says why.
- `importLkProject` takes the plan object rather than four positional pieces of
  it, which is what a fifth would have made unreadable.

### Verification

134 tests passing (was 132). Four import tests changed behaviour and were
rewritten rather than patched; two new ones cover the boilerplate skip and the
root-mention resolution. Lint and `tsc --noEmit` clean.

**Not verified in the app.** Opening a project needs Tauri's file access, so
the browser preview reaches the start-up screen and no further — it confirmed
the app renders clean with no console errors and nothing more. The tree row
badge, the menu item, and the house button need `pnpm tauri dev` or the
"Anamnesis (latest code)" desktop shortcut.

## Tree Multi-Select 2026-07-31

Shift-click and ctrl-click in the sidebar. react-arborist supports both natively
and the tree had `disableMultiSelection` set, so turning it on was one prop —
everything below is what had to be true before that prop was safe to remove.

### The disk half

Multi-drag and multi-delete both became reachable for the first time, and both
would have looped the single-node store actions, each of which fires an
un-awaited whole-graph relocation. Two of those interleaving rename paths the
other has already moved. So:

- `filesystem-service` gained `deleteNodes` and `moveNodes`, each resolving
  every path against one pre-change index and applying relocations once at the
  end. `deleteNode`/`moveNode`/`renameNode` now delegate to them.
- `project-store` gained the matching `deleteNodes`/`moveNodes`; the singular
  actions are wrappers. The delete path filters to *removal roots* — a
  selection holding both a folder and its child would otherwise ask to remove a
  path the parent already took.
- `deleteNodes` also clears `selectedId` when the selected page is among the
  deleted, which the old single-node path never did (it left the page view
  rendering nothing).

Three tests cover it, all asserting on which paths get touched rather than on
return values: pre-delete path resolution for colliding siblings, the surviving
sibling's renumber, and a two-node move rewriting both files at their new homes.

### The UI half

`selectedId` now follows the *focused* row rather than `selected[0]`, since
`onSelect` hands its nodes over in tree order and shift-selecting upwards would
otherwise jump the page view somewhere the user didn't click. The
selection-sync effect grew an `isSelected` guard — `treeApi.select()` replaces
the whole selection, so without it every ctrl-click collapsed what it had just
made.

Right-clicking inside a multi-selection keeps it; right-clicking outside
replaces it, as every file manager does. The menu shows a "N pages selected"
heading and drops the items that only mean something for one page — rename,
duplicate, add child, set as project home. Colour and delete apply to all of
them; delete asks once, naming the count.

Duplicate is deliberately single-only rather than looped — see the Queued
Adjustment in `docs/plan.md` for why.

### Verification

137 tests passing (was 134), lint and `tsc --noEmit` clean. **Not verified in
the app**: the tree needs a loaded project, which needs Tauri's file access, so
the browser preview confirms only that the app still boots clean. Shift-click,
ctrl-click, multi-drag, and bulk delete all need `pnpm tauri dev` or the
"Anamnesis (latest code)" shortcut.

## Silent Data Loss 2026-07-31

The user reported blank pages vanishing after a refresh — "Two Survived". They
had not been deleted. Diagnosis and recovery came before any code change.

### What was actually on disk

Her projects live in `OneDrive\Documents\Anamnesis`. In `test3434`, four items
sat under `.anamnesis-move-<uuid>` staging names: two `New Blank` pages, the
`AUs` folder, and a stale duplicate of `Characters`. `applyRelocations` stages
every path through a temp name before moving it to its destination; phase one
had completed, phase two had not, and the error went nowhere. The two pages
that survived were exactly the two that weren't in that plan.

A second, unrelated loss turned up in the **real** Valeraverse during the same
sweep: `Xuěhuā`, a character, had been dropped onto `Valera Jiang`, a *note*.
Leaf templates have no directory of their own, so she'd been written into a
plain `Valera Jiang/` directory with no marker file — and the load walk
returned early on marker-less directories without walking them, so the subtree
was invisible while sitting intact on disk.

All five were restored by hand, both projects snapshotted first, and a sweep
confirmed no marker-less directories and no staging leftovers remain in either.

### Fixes

- **`track()` in `project-store`.** Thirteen writes used a bare
  `void fsService.…().then(markSaved)`, so every rejection was an unhandled
  promise nobody saw. `setSaveErrorHandler` existed for exactly this and was
  wired only to autosave. This is the fix that matters most: the app knew.
- **`applyRelocations` rolls back.** Anything still staged returns to its
  original path before the error propagates. Items already delivered stay put —
  the invariant is "no file left under a temp name", not "all or nothing".
- **The loader recovers stranded nodes.** `MOVE_TEMP_PREFIX` is now known to
  the load walk, a parked file is read like any other node file, and
  `repairStrandedNodes` renames it back afterwards — a rename, never a
  save-then-delete, because a parked directory has its children inside it.
  Reported via `recoveredCount` and `RecoveryNotice.tsx`.
- **Marker-less directories are walked**, contents reparented up a level, which
  is what `handoff.md` had claimed all along. `assets/` is skipped by name
  instead — one fewer directory listing per load.
- **Leaf templates refuse drops**, in `TreePanel`'s `disableDrop` and again in
  the store's `moveNodes`.

### Verification

141 tests (was 137). Four new ones cover the recovery paths, each written
against a way pages were actually lost. The load-test mock was also corrected:
it had been deciding "is this a directory?" by whether the name ended in
`.json`, which is precisely wrong for a temp file and had it disagreeing with
the disk about the exact entries this bug involves.

**Not verified in the app.** Same limit as everything else this session — the
browser preview can't open a project.

---

## Phase 11 — Make It Ours ✅ Shipped 2026-08-05

Identity, the writing half. Also closes the only genuine legal exposure in the repo.

- ~~**Rewrite all 8 templates' placeholder copy in the user's own voice.**~~ Done 2026-08-04. Every tab of all seven templates that carry content, plus the Secret block's text, which had been promising "information that only admins can see" — untrue here and untrue of the feature. `docs/prototype/anamnesis.jsx` was gutted to filler in the same pass so the LK wording doesn't survive in the repo as a second copy.
- ~~**Soften the README's LK comparisons.**~~ Done 2026-08-04. The tagline and the "if you know LK, you know Anamnesis" line are gone; the "not affiliated" notice stays, and the format-compatibility claim stays because it's the useful, factual half.
- ~~**Sweep for LK-derived assets** — icons, CSS, strings.~~ Done 2026-08-04, and it came back clean apart from the template copy above. Icons are lucide-react, fonts are Fraunces/Inter/Newsreader (all OFL), and nothing in `src/**/*.css` is LK-derived — the remaining LegendKeeper mentions in the source are either feature labels the import/export flow needs ("Import from LegendKeeper") or comments recording why a layout choice was made. Layouts stay, per the phase's own rule.
- ~~**Naming pass** over feature nouns.~~ Done 2026-08-05. She chose "project" everywhere over "world" — her reason: "i can see world getting confusing", i.e. the fiction and the container shouldn't share a word. Six user-facing strings said world (the tree's export menu item, two import progress messages, the import parsing note, two lines in Settings → Projects, the update screen's reassurance) against eighty-nine saying project; they all say project now, and the LK import's no-root fallback name went with them. Nothing else needed changing — page, folder, tab and properties are plain descriptive English, and the sweep for another product's nouns (board, atlas, codex, campaign, workspace) came back empty.

**End state:** nothing in the repo is anyone else's writing. **Reached 2026-08-05.** Phase complete.

---

## Phase 11.5 — The Design System ✅ Shipped 2026-08-04

The unglamorous half of the overhaul, and a hard prerequisite for Phase 12. **`docs/ui-audit.md` is the list**; this phase is that document's Part 1 and Part 2, and the file is disposable once they're crossed off.

Why it goes *before* the themes rather than with them: a theme swaps token *values*, and none of what's wrong is a value. The app has a colour system and no other scale — eleven font sizes, nine radii in thirteen spellings, six `line-height` declarations in the entire codebase, five copy-pasted modal backdrops, nine hand-rolled variants of the same button. Ship themes onto that and every theme inherits it, they all look equally unfinished, and choosing between them becomes impossible because the thing that's actually wrong is identical in all of them.

**Complete 2026-08-04.** Parts 1 and 2 of `docs/ui-audit.md` are fully crossed off; that file is now only Part 3, which is composition and taste rather than consolidation and doesn't block Phase 12.

- ~~**Focus and motion.**~~ Shipped 2026-07-31. `:focus`/`:focus-visible` set once app-wide in `@layer base`, plus a base transition on form controls.
- ~~**Type scale.**~~ Eight `--fs-*` tokens; the six competing heading sizes are three.
- ~~**Put the display font to work.**~~ Fraunces on all six title surfaces; mono is a system stack, not a bundled face (reasoning in `docs/constants-and-theming.md`).
- ~~**Radius scale**~~ and ~~**a global `line-height`**~~. Four `--radius-*` tokens, zero numeric literals left; `--lh-normal` on `body`.
- ~~**Spacing scale.**~~ Eight `--space-*` steps; 245 declarations across 19 values are now zero literals.
- ~~**Shared control styles.**~~ `src/controls.css` in its own cascade layer: one backdrop where there were five, three modal widths where there were six, one button set where there were nine, three icon-button sizes where there were seven, one text link, one eyebrow label, one inline remove.
- ~~**Border hierarchy.**~~ Three roles — `strong` for the app's frame, the base for containers, `subtle` for rules inside a container. Values are provisional; Phase 12 tunes them per theme.
- ~~**All thirteen Part 1 defects.**~~ The last three were the doubled project name (6, dropped from the top bar), the single border colour (10), and the panels that vanished on a narrow window (13 — media queries that `minWidth: 900` made unreachable anyway).

**End state reached:** the app is consistent and boring, which is the state a visual direction can actually be judged from.

---

## Phase 12 — Themes & Appearance ✅ Shipped 2026-08-05 → 2026-08-09

Identity, the visual half — and the reversibility machinery that had to exist
before it. The longest phase in the project by calendar days and by number of
things reported from use rather than found by reading, which is the phase's own
lesson: **a look is judged by living in it.** Almost every bullet below after
the third one exists because she opened the app and something was wrong.

The rules that still bind the code are in `docs/handoff.md` and
`docs/constants-and-theming.md` — the CSS-vetting rule, the contrast floor, and
the theme-file format. What follows is the record.

**A sandbox to try directions in** — 2026-08-05, ahead of the phase proper,
because she asked for somewhere to change fonts and colours that couldn't break
the real app. `sandbox/theme-sandbox.html`, a single double-clickable file: a
mock of the app driven by the real token names, six palettes as starting points,
font/size/spacing/gradient controls, a free-text CSS box, and an export that
emits a `[data-theme]` block. It was never the theme switcher — it's what made
"2–3 candidate directions" cheap to produce. `sandbox/README.md` covers keeping
it in step with `src/index.css`.

**Widen the sandbox** — 2026-08-06, on her first reaction to it: *"i'm going to
need WAY more fonts than what's here"* and *"I want to be able to make gradients
for various things."* 98 open-licence families inlined (up from 3 bundled plus
Windows faces), and 12 gradient slots with radial/linear, three stops and
per-stop transparency (up from 3 fixed linear ones). **Both asks are one
signal — she wants range before she wants a decision.** Don't narrow her options
to a shortlist before she's played with them.

**Custom themes, the Obsidian way** — 2026-08-06, and the bullet that reshaped
the rest of the phase. She asked for it directly: *"i'd like to build the
ability to create custom themes into the app, similar to how obsidian does it.
I know notion and LK don't let you do fancy stuff, but I think that's lame tbh?
Like, why NOT let people do what they want?"* Settings → Appearance, `.css`
files in `<projectsDir>/themes/` and `/snippets/`, all 98 library families
bundled so a theme can name any of them, twelve gradient tokens wired to real
components, and text scaling.

**Colour and gradient pickers in the app** — 2026-08-07. The bullet above
originally argued there should be *no* colour picker in Settings — the sandbox
is where a theme gets made, the app is where it gets used. She asked the obvious
question and it didn't survive: *"i know we have css override but shouldn't we
enable people to change colors in-app too, or is that too complicated? ... Idk i
get that CSS is more robust but why not both."* There was no answer. So
`ThemeEditor.tsx` ships: twenty colours, all twelve gradients, and a "make a
copy I can edit" that seeds from whatever theme is on. **What replaced the old
rule is a better one — there is one theme format.** The pickers write a `.css`
file and read one back; nothing in the app knows which of the three places a
theme was made in.

**Text scaling** — 2026-08-06, split in two on 2026-08-07. `--fs-scale`
multiplies the eight `--fs-*` steps; deliberately not a root `font-size`, which
would drag the whole layout with it. `--fs-scale-content` is the second slider,
on the page body alone — *"the contents are generally too large but getting it
to a more normal size makes the ui a bit small."*

**2–3 complete candidate directions** — done twice over. Three shipped
2026-08-06 (`dark`, `midnight`, `daylight`), and on seeing them she picked one
and asked for more: *"the midnight theme is BiS as far as what you did add, so
make that default"* and *"maybe come up with some other dark themes that look
different but aren't.... ugly?"* So `midnight` became `DEFAULT_THEME_ID` and
three more darks shipped: `ember`, `grove`, `nightbloom`.

**The four queued palettes were superseded, not built.** Parchment / Foxian /
Belobog / Deep Space were four descriptions written before she'd seen anything;
the second ask replaced them with a brief in her own words, and the answer was
three themes chosen to be four *different rooms* rather than four shades of one.
**The rule that survives: don't build a palette from a description she hasn't
reacted to.** If she names one of the four, build that one.

**Rebuild the settings screen** — 2026-08-07, immediately after the bullet above
and caused by it: every feature this phase added went into one tab of a 28rem
dialog until *"the entire settings menu is fucking insane now. Why is it one
tiny ass column? it goes on and on and on... it's set up so poorly."* Both
halves of that are one fault — **a narrow dialog can only stack, and a stack
that long stops being a screen and becomes a scroll.** So the dialog is
`ui-modal-xl` (60rem) with a vertical rail, and Appearance's five sections
became four peer panels (Theme / Colours / Fonts and text / Snippets) beside
Projects, Keyboard and Updates. **A settings section that doesn't fit on screen
is a section that wants splitting, not a longer panel.** Adding one is still a
single entry in `SETTINGS_TABS` — keep it that way.

**Delete a theme from the app, and a contrast pass over all six** — 2026-08-07.
Two reports from use, one screen apart. The themes list had no way to remove
anything from it, which reads as a bug in a list of files she owns; there's now
a confirmed delete per custom row, and the failure path says so rather than
doing nothing. The second was that the quiet grey text is hard to read and not
accessible — true, and true of **every theme**: `--color-text-muted` measured
between 3.14 and 3.94 against its own panel where AA small text wants 4.5, with
the default the worst of the six. All twelve values re-measured and lifted, and
the floor written into `docs/handoff.md`. **A palette isn't finished until it's
measured — by eye is how all six failed the same check together.**

**Stop the pickers from destroying hand-written theme files** — 2026-08-07,
reported from use and the worst bug this phase produced. Changing one colour
called `serializeTheme`, which builds a file out of the twenty-odd tokens the
app knows about — so a theme somebody had written by hand was replaced wholesale
by the app's rendering of it, with no warning and no undo. **The rule: an edit
changes the values it was asked to change and nothing else.** `patchTheme`
locates the declaration and rewrites the value in place; `serializeTheme` is now
only for a file that doesn't exist yet. Two things fell out: the write has to go
to the *unvetted* copy of the file, or the loader's own URL stripping gets baked
into her stylesheet permanently, and a copy now goes into `themes/backups`
before the session's first change.

**Live reload on the themes and snippets folders** — 2026-08-08, reported from
use: editing a theme's `.css` by hand changed nothing until you found the rescan
button. That button was always a stopgap — **a format whose selling point is
"it's a file you can open in Notepad" has to behave like one.** `watchCssDirs`
puts a non-recursive watch on both folders and rescans on any `.css` event;
`tauri-plugin-fs`'s `watch` feature is enabled for it. Two constraints came out
of building it, both in `docs/handoff.md`: the watch can't be recursive, because
`themes/backups` is inside the folder it watches, and the store has to ignore
its own writes, because a rescan flushes the pending one and a dragged colour
picker would otherwise defeat its own debounce.

**A copy of Midnight came out in Midnight's fonts** — 2026-08-08, reported from
use. `createTheme` seeded from `COLOR_TOKENS` only, and Midnight is the one
built-in that sets `--font-*`, so its copy fell back to the base tokens' faces
and visibly wasn't the theme it copied. **The rule generalises past fonts: the
copy is a new `[data-theme]` id, so the original is not in the cascade behind
it — anything a copy doesn't declare falls to the base tokens.**

**The colour pickers were laggy** — 2026-08-08, the last of four things that
came out of living in the Colours panel. Every `input` event ran the entire
commit: patch the file text, vet it, replace the `<style>` contents, clear and
re-read the fonts, read the background back, and `JSON.stringify` the lot into
`localStorage`. Two stylesheet reparses and two forced style recalculations per
frame of a drag. **The rule: the thing that shows a change and the thing that
records it are different jobs, and only one of them belongs in the event
handler.** The preview is one inline custom property on the root element; the
commit rides the debounce that was already there for the disk write.

**Import a theme, or a palette from another app** — 2026-08-08, from two asks in
one breath: a button so a theme file doesn't have to be dragged into a folder by
hand, and some way to bring her other project's palette across without picking
through it. Both are the same button. A `.css` is copied into the themes folder
as-is; a `.json` goes through `palette-import.ts`, which works the roles out and
writes what it guessed into the file's header. **Built on the contrast rule
above, applied to input nobody vetted: every text and border step is *solved*
for a ratio against both surfaces rather than picked**, so a file from outside
can't land below the floor the built-ins are held to. The second rule — names
are a hint, not an instruction — is in `docs/handoff.md` with the case that
forced it.

**Abyssal, a seventh built-in** — 2026-08-08, the other half of that ask: her
CharSnap palette, run through the importer and then hand-tuned where the numbers
said to. It clears the "different room, not a different shade" bar on luminance
as much as hue — `#00253d` is a lit ocean, not another dark. **The rule the
tuning pass produced: the importer solves for a *floor*, and a built-in is held
to the *band* the other six sit in** — four values moved for that reason and
each is justified in the comment above its block in `index.css`. It also turned
up a real defect in the importer, now fixed: callout text was mixed toward the
body text, so all three callouts converged on one hue. The contrast rule is now
**enforced by a test** (`palette-import.test.ts` parses `index.css`) rather than
only written down, which is what should have happened when all six themes failed
it at once.

**The Quote callout wasn't a box, and Midnight's callouts were never its own** —
2026-08-08, reported from use: *"the default theme's quote box isn't even a box
and it looks terrible."* Two faults under one complaint. Quote's tint was flat
white at 0.035 against Info and Secret's 0.12 of their own hue — and hardcoded
that way in `deriveTokens`, so no theme could have fixed it from the picker
either. Separately, Midnight is the one dark that never re-tuned its callouts
despite the note above its block saying every dark does. **The rule this theme
produced three times — borders, text ramp, callouts: a token group Midnight
doesn't restate is a token group tuned for a different theme**, and each was
found by using the app rather than by looking. So the third one is a test:
`palette-import.test.ts` holds every shipped theme's callouts to the floor the
importer solves for, which caught Daylight's Quote edge at 2.56 in the same
pass.

**Patch Notes in Settings** — 2026-08-08. The plan called this a changelog
viewer reading `CHANGELOG.md` through a Vite raw import; what shipped reads
`RELEASES.md` instead, which is the better source — the release notes are the
plain-language version written for her, and the changelog is the fuller record.
Three versions, each on its own tab with its date, plus a **Read this on GitHub**
link for going further back.

**Search in Settings** — 2026-08-09, built when she said to: *"we're already in
phase12, we're almost done it, so yeah we can do search in settings."* Taken
from Obsidian 1.13, which added one because their settings panel got too big to
scan; ours had gone the same way for the same reason. Arrow keys, Enter and
`Ctrl/Cmd-F` came with it, and a result flashes the individual row rather than
only opening its section.

**Most of the index builds itself** — colour rows from `COLOR_GROUPS`, typefaces
from `FONT_SLOTS`, shortcuts from `SHORTCUT_LABELS` — so a derived entry can't
describe a control that isn't there. `DECLARED_SETTINGS` is only the controls
with no data behind them. **The rule: index from what the panel renders from,
not from a list of what it renders.** Two things were found by running it rather
than reading it, both in `docs/handoff.md`: Fuse matches a query as one string,
so *"where are my files saved"* — the query the box exists for — returned
nothing at all until each word was scored separately and rows ranked on **how
much of the question they account for**; and grouping results by section, which
seemed obviously right, sorts by section, which put the correct answer
nineteenth and made Enter open a different row than the highlighted one. **The
rank is the feature; the section rides on the row.**

**The search scopes were invisible, then they were ugly** — 2026-08-09, two
rounds in one conversation. `#tag` filtering had shipped, the placeholder
mentioned it, and she'd never found it: *"i didnt realize i had to actually type
the hashtag. I thought some UI selection would show up or something."* **The
rule from round one: a capability reachable only by typing a character is one
most people don't have.** `#` now sets the scope and deletes itself from the
field, so using the shortcut once shows you the control it stands for.

Round two was the control itself. Three pills under the field — *"i kind of hate
the buttons. they feel unprofessional and lame? No idk i just thought they'd be
inside a menu."* She was right and the reason generalises: **permanent furniture
for a control nobody touches is a cost paid every time you look at the screen,
to expose a choice made once a month.** It's a menu now, in
`SearchScopeMenu.tsx`, shared by the tree and the palette. Nothing shows when
it's closed except a chip when the scope isn't the default — *"Absolutley do not
make them always visible."* Searching names *only* came with it, since the
collision cuts every way, and the palette got page-text-only at the same time.
Where the menu opens from differs by surface deliberately: the tree's field is
clicked into, so focusing an empty one opens it; the palette opens already
focused and empty, so a menu on mount would sit over the results before there
were any — `Tab` opens it there instead. **Kept as serviceable, not accepted** —
see Queued Adjustments in `docs/plan.md`.

**The default was hers to decide and she decided** (2026-08-06) — `midnight`
leads the list, `dark` is the alternate. Her earlier worry (*"im afraid of
making the default insane because i dont want ppl to be turned off by it"*)
resolved by seeing it running rather than by discussing it, which is the
pattern: build it switchable, let her look at it.

**End state reached:** the app looks like hers, and looking different tomorrow
costs nothing. **Two bullets did not ship** and are carried in `docs/plan.md`
Queued Adjustments rather than lost — bundling the app's *default* fonts, which
is a decision rather than a build, and the About dialog.

---

## Phase 13 — Property Types ✅ Shipped 2026-08-09 / 2026-08-10

Two passes, split at the user's request so she could use the new types before the view that indexes them was built.

**Pass 1 (2026-08-09) — the types themselves.** Number, select, multi-select and status; per-page reordering; ~a dozen suggested property names per template; Created/Updated surfaced. Plain-language write-up in `CHANGELOG.md`. Cheaper than it looked, because `customProperties` and the "+ Add a property" flow already shipped in Phase 7 — this widened the type list, it didn't build the system.

Four decisions from that pass, all still the reference for anything touching properties:

- **Options are created by typing, not declared up front.** The alternative wants a list of values defined before you can record one, which is a form to fill in before you're allowed to write. **Status is a select that arrives pre-seeded and renders with a dot** — same machinery, different starting point (her call: *"A i guess?"*), which is why there's one `SelectProperty.tsx` and not three.
- **Suggestions are not schema, and that distinction is `constants/property-suggestions.ts`'s reason to exist.** Adding a field to `template-registry.ts` would make it appear, empty, on every page already using that template. Picking a suggestion runs the same `addCustomProperty` the typed path runs. Types are picked against how she writes rather than how a database would want it — Age is text, for the same reason Event's "When" is; `number` is reserved for genuine counts. Where a suggestion names something with its own page (Species, Birthplace, Affiliation) it's `refs`, so the list quietly builds the index Phases 18 and 24 run on.
- **Reordering is per page, not per template** (her call). Templates aren't user-editable until Phase 17, and making one page's order bind every page of that template quietly makes them so. `orderProperties` in `property-service.ts` is the tested part — the default grouping (fixed, then refs, then custom) is only ever its *input*, never enforced after, because interleaving is the whole point of dragging one.
- **The chip palette tints a background and never colours text** — the contrast rule in `docs/handoff.md`, which the chips are the pattern for.

The non-obvious cost was `lk-export`, whose property loop guarded with `if (typeof value !== "string") continue` — correct only while every value the app could hold *was* a string. The moment one could be a number or an array of option ids, that line silently dropped it from the `.lk`. Flattening rules are now a table in `docs/lk-format.md`.

**Not in scope, and unchanged:** property types on tags (a tag is a bare string and should stay one), and tag hierarchies (`#char/valera`).

**Pass 2 (2026-08-10) — All properties & tags.**

Files: `AllPropertiesModal.tsx` + `all-properties.css` (new), `use-property-index.ts` (new), the index and four `plan*` functions in `property-service.ts`, `applyBulk` plus four actions in `project-store.ts`, an `allProperties` shortcut, a footer row on the search palette, `PROPERTY_TYPE_LABELS` lifted from `PropertiesPanel.tsx` into `constants/schema.ts` now that two views name the types.

- **Shape:** two tabs (Properties / Tags) over one row renderer, a filter box, rows that expand to their pages. Rename is inline in the row; delete goes through the app's existing `confirmDestructive`. Everything is one undo entry.
- **Counts:** pages that *have* the property, plus how many have something written in. Both are shown because they answer different questions — the first is what rename and delete act on, and matching the destructive action's count matters more than a single tidy number; the second is what tells you a field is dead weight.
- **Template properties are listed and locked.** Not in the plan's bullets; added because the counts answer "which template fields is anyone actually filling in?", which should feed Phase 17.
- **Second `.ui-modal-xl`,** whose comment said nothing else should reach for it. Amended rather than ignored — the bar it cleared is Settings' bar, a thing you browse rather than a question you answer.
- **It re-plans at the click, not from the preview's patches.** The sentence shown before you press and the change made when you do are two runs of the same pure function against whatever the graph is at that moment — so a preview that went stale can't apply a patch built against a project that has since changed.
- **Where it lives** is the search palette's footer plus **Ctrl+Shift+K**, her call (*"a full-size modal off the command palette"*, 2026-08-09). Capitalisations are listed apart but sorted together, so *pov* and *POV* land next to each other and each says the other exists — they're her words, so nothing merges them behind her back.

**Chip options, same day.** Asked for immediately after the above — *"we might as well deal w the chip option now"*. The sequencing note in the phase predicted it: a values list is the second thing anyone wants to rename in bulk.

The design decision was where option lists live. Moving them off the node into `project.json` is the obvious fix and would have broken the readability of a page's own JSON, which is what file-per-node is for. They stayed put, and three things make them act shared: `knownOptionsFor` seeds a new copy of a chip property from what's already in use on pages of the same **template** (not the same name — "Type" spans four templates), ids and colours are copied rather than regenerated, and `planOptionRename` / `planOptionRecolour` / `planOptionDelete` reach every copy. The dropdown gained a "Used elsewhere" group so a value invented late is adopted rather than duplicated.

The subtle one is `planOptionRename`'s merge: renaming onto a name a page already has means the losing option's *id* disappears, so the page's value has to be moved onto the survivor in the same write. A value left pointing at a deleted option renders as nothing, which reads as the chip having been eaten — the same trap `removePropertyOption` was written to avoid in pass 1.

**Verification.** `pnpm lint`, `tsc --noEmit`, `pnpm build` and `pnpm test` clean — 587 tests, 25 of them new over `indexProperties`, `indexTags`, `indexPropertyOptions`, `knownOptionsFor` and the seven planners. The planner tests are the ones that matter: they're the only check that a project-wide rename can't eat someone's writing.

One existing test needed changing: `settings-search.test.ts` asserted exactly 5 shortcut entries. Its own comment said "if a registry grows, this grows with it", so it now counts off `SHORTCUT_ACTIONS.length` — a hardcoded number there fails the day a shortcut is added without anything being wrong.

**Not run in the desktop app.** `pnpm dev` is browser-only and can't open a project, so this is compiled-and-tested rather than eyeballed.

---

# Phase 14 — Everyday Navigation — 2026-08-11

Eleven small things, felt daily, shipped one PR per bullet over 2026-08-10
and 2026-08-11. The detail that still governs the code moved to
`docs/handoff.md`; what follows is the record.

## What was in it

Small things, felt daily. Independent of each other; safe to ship piecemeal —
and being shipped that way, one PR per bullet.

- ~~**Back / forward / home buttons**~~ — 2026-08-10. `navigation-service.ts`
  holds the stack, the store records a visit inside `selectNode`, and the three
  buttons sit at the left end of the top bar, which had been held empty for
  them since Phase 11.5. **The decision that binds: `selectNode` is the single
  choke point.** Back and forward move the cursor over the stack without
  recording, everything else records by using the action it already uses — so a
  navigation added in a year gets its history entry for free rather than by
  remembering a second call. Session-only, and pruned when a page is deleted;
  the reasoning for both is in the service's own header. It also relaxed the
  shortcut rules by one notch: Alt with a *named* key skips the Ctrl/Cmd
  requirement, since it can't produce a character. **Known cost, written down
  rather than solved:** Alt+←/→ are move-by-word inside a text field on macOS,
  so a Mac user has to rebind. Per-platform defaults are the fix if that ever
  matters.

- ~~**Focus a folder as the top of the tree**~~ — 2026-08-11. Right-click →
  *Focus here*; that node's **children** become the tree's roots, and the node
  itself is named in the path bar above, which is the way back out. The answer
  to nesting gone too deep to read — the user hit it at nine levels, where the
  names are gone and only indent is left.

  **Four decisions bind, and each rules out a way of being wrong:**
  - **Session-only, never written to disk.** Reopening a project into a tree
    showing a fraction of itself, with no memory of having asked for that,
    reads as pages having gone missing. Same reasoning as `navHistory`.
  - **The path bar is not optional.** A sidebar quietly showing part of the
    project with nothing saying so *is* the failure mode; the bar is what makes
    it read as a view rather than a loss.
  - **Selecting a page outside the focus drops the focus** (`applySelection`).
    The tree physically can't show it, so the alternative is the sidebar
    silently not following a search result or a wikilink.
  - **A drop at the tree's root means "into the focused node"**, not into the
    project (`parentId ?? focusedId` in TreePanel). Without that, dragging a
    page to the top of a focused tree flings it to the one place the person
    doing it can't currently see.

  *Focus here* is hidden on a page with nothing inside it: an empty tree under
  a path bar looks exactly like the project having disappeared.

  **Obsidian's Breadcrumbs plugin is not this.** Raised by the user 2026-08-08 and checked: it never touches the file explorer. It builds note-to-note hierarchies out of frontmatter and gives trail, matrix, prev/next and diagram views over them. Most of what it does is already in this plan under other names — the trail is the clickable breadcrumb already sitting above every page title (`page/PageTitle.tsx`), its tree and matrix views are Phase 18's Subpage Index and Backlinks blocks, prev/next chains are Phase 25's storylines, and its diagrams are Phase 24's graphs. Nothing left to lift from it.
- ~~**Double-click expands a folder**~~ — 2026-08-10. The swap it was always
  going to be: renaming was react-arborist's default rather than a decision,
  and it's the destructive one of the two to trigger by accident on the gesture
  people use to look inside things. Rename was already on the right-click menu,
  so nothing had to move there. **Settings gained a Sidebar section** for the
  switch that puts it back, and a `preferences` store beside the panel widths —
  app-level, not per-project, since a habit about double-clicking doesn't change
  with the world you have open. The default is deliberately the new behaviour
  rather than the old one: "nothing recorded" has to mean the swap, or it never
  reaches anyone who had the app before it.
- ~~**Resizable sidebars**~~ — 2026-08-10. Both edges drag, with arrow keys and
  a double-click reset as the alternatives; widths persist in `app-settings`,
  app-level rather than per-project like everything else about how it looks.
  **The two decisions that bind are in `docs/handoff.md` §Layout**: the handles
  are positioned against the grid rather than inside the panels, because the
  properties panel is a scroll container and a handle inside it scrolls away
  from its own edge; and the column transition has to be switched off mid-drag,
  which is measured rather than assumed. The minimums are "the panel can still
  do its job" — **dragging is not a way to hide a panel**, and shouldn't become
  one.
- ~~**Show in system explorer**~~ — 2026-08-10.
- ~~**Hover previews** on wikilinks and mentions~~ — 2026-08-11. Wikilinks
  resolve *into* mentions (see `wikilink.ts`), so both are one chip and one
  implementation. **The 350ms delay is the feature, not a detail:** with no
  delay a card fires on every link the pointer crosses on its way somewhere
  else, and a preview you learn to steer around is worse than none.
  `pointer-events: none` on the card is load-bearing too — it opens directly
  below the chip, so a card that could take the pointer would swallow the
  chip's own mouseleave and stay up until you moved somewhere else entirely.
  **Excerpt rules, in `preview-service.ts`:** the first *non-empty* tab rather
  than the first tab (templates seed several and only some get filled), never
  a hidden tab (a tab held back from readers must not leak through a preview
  of the page it's on), and the cut lands on a word boundary.
- ~~**"Create new" landing page**~~ — 2026-08-10. Every route to a new page —
  the tree's "+", the right-click item, the folder view's button, the keyboard
  shortcut — now makes an untitled blank page and opens it, with the template
  grid on the page itself and the title already in edit mode. The popover that
  used to ask first is gone from all four, and `NewPageDialog.tsx` with it; the
  properties panel keeps its own copy for a blank page deciding late what it is.
  **The decision that binds is in `docs/handoff.md` §Storage**: a template
  carries whether a page stores itself as a file or a directory, so applying one
  moves the page on disk and has to go through the relocation planner rather
  than a plain save.
- ~~**Bookmarks rail**~~ — 2026-08-11, taken last with its own pin built
  alongside it, which was the choice this bullet said to make. "Set as
  shortcut" is lifted out of Phase 15 and onto the right-click menu; that
  menu's remaining items are untouched and Phase 15 still owns them.
  **The decisions that bind:** pins are per-project (`Project.pinnedIds`,
  optional so no project needs migrating), because which pages you reach for
  constantly is a fact about a world rather than a habit that follows you
  between them — unlike the sidebar widths and the double-click preference,
  which are app-level. A new pin goes on the *end* of the rail: its order is
  the only thing making any one tile findable without reading, and prepending
  would shuffle every tile along to gain a position for one page. Deleting a
  pinned page unpins it, the same pruning `homeNodeId` and `selectedId`
  already get. The rail draws nothing at all when empty rather than showing a
  prompt — somewhere to put shortcuts is worth nothing to someone who hasn't
  made one, and a strip of instructions above the tree would be paid for daily
  by everyone who has.
- ~~**The small-friction batch**~~ — 2026-08-10, lifted from Obsidian 1.13's own
  list. Three of the six needed building; the other three were checked and
  already true, which is the point of having written them down. **Don't
  re-add the ones marked below as already-satisfied without first checking they
  still are** — two of them hold because of something elsewhere, not because
  anything guards them.
  - ~~`Escape` cancels a rename and **leaves the tree focused**~~ — built.
    Decided in a capture handler on the tree panel, because whether a row is
    being renamed stops being true the moment the key is handled anywhere else,
    and the focus is taken back on the next frame rather than immediately: the
    field is still mounted and still focused when the key arrives.
  - ~~`Escape` clears the current selection~~ — built, **deliberately narrower
    than the line said.** In this app the tree's selection *is* which page is
    open, so clearing it outright would close the page as a side effect of
    getting out of a multi-select. Escape drops back to the row you're on
    instead, and does nothing at all when there's no multi-selection to undo.
  - ~~`Ctrl-N`/`Ctrl-P` move through suggestion lists~~ — built, in all three:
    the quick switcher, the settings search, and the editor's slash/@/wikilink
    menus. `services/list-keys.ts` is the one definition. The editor's menu is
    the odd one out — BlockNote owns that highlight, so the keypress is
    *translated* into the arrow key BlockNote is already listening for rather
    than reimplemented against its internals.
  - **Already true: auto-reveal doesn't fire while renaming.** Not because
    anything guards it — because a rename ends on blur, and every path that can
    change the selection takes focus first. A guard was written and deleted; it
    could never have fired. If a path ever arrives that moves the selection
    without taking focus, this becomes real again.
  - **Already true: `Shift`-arrow extends a multi-selection.** react-arborist's
    own container does it, and nothing here passes `disableMultiSelection`.
  - **Already true: closing the quick switcher with `Escape` keeps the
    selection.** It only ever calls `selectNode` when you pick something, so
    arrowing through results doesn't move the selection there is to restore.
    Worth keeping that way: previewing on arrow would make this real work.

---

# Phase 15 — Right-Click Menu, Full Pass — 2026-08-11

From the user's screenshot of LK's node menu, minus what doesn't apply to a
single-user app: Convert to template · Export (per node) · Move ▸ · Sort
sub-pages ▸ · ~~Set as shortcut~~ · Hide · Collapse all · Expand all. Shipped
one PR per item over 2026-08-11. What still governs the code is in
`docs/handoff.md`; this is the record.

**Three of the eight were already done before the phase opened.** "Set as
shortcut" and Hide shipped in Phase 14, the first because the bookmarks rail
there had nothing to render without it. Per-node Export had been on the menu
since Phase 9 as "Export to LegendKeeper". Checking rather than assuming saved
building all three twice.

**Skipped: "Edit permissions"** — multi-user, not us.

## What was in it

- ~~**Sort sub-pages ▸**~~ — #120. Four orders (A to Z, Z to A, newest, oldest)
  applied to the pages directly inside the clicked row, not everything below
  it. **A one-shot rewrite of the manual order, not a mode the tree stays in:**
  the tree is drag-reorderable, and a sort that persisted would either undo the
  next drag or quietly stop applying. Undo puts the old order back.
  `localeCompare`'s numeric option, so "Chapter 2" sorts before "Chapter 10" —
  worldbuilding pages are numbered constantly.

  Offered above *two* children rather than one: a group of one is already in
  every order at once, and an item that visibly does nothing is worse than one
  that isn't there. `sortChildren` returns early when the order already matches,
  because an undo entry that reverses nothing reads as undo being broken.

- ~~**Expand all inside / Collapse all inside**~~ — #120. Walks
  react-arborist's own nodes rather than the store, since open/closed is its
  state; it calls back into `setExpanded` per row, which is what persists.
  **Only rows that actually hold something are touched** — every node carries a
  `children` array whether or not it has any, so opening the empty ones would
  write a line into `expandedIds` for every leaf page in the subtree to no
  visible effect. Collapse leaves the clicked row itself open: the menu says
  *inside*, and folding it would take the result off screen along with the
  thing that produced it.

- ~~**Duplicate on a multi-selection**~~ — #121, the queued adjustment folded
  in. It used to drop out of the menu above one row, which read as copying a
  group being impossible rather than as not yet built. `duplicateNode` became
  `duplicateNodes(ids)` — one undo entry for one gesture, and the ordering pass
  needs the whole batch to place each copy directly below its original.
  `selectionRoots` was extracted from `deleteNodes` for it: selecting a folder
  *and* a page inside it copies the folder once, since a copy carries its
  subtree and doing the inner page as well leaves a spare inside the new folder.

- ~~**Convert to template**~~ — #122, **shipped as "Save as template"**:
  "convert" reads as one-way, and the page is copied rather than changed.

  **What the user's own test of LK's version settled** (2026-08-11) — answers,
  not guesses: it copies *everything* (writing, properties with their filled-in
  values, tags, colour, pictures), it asks about sub-pages as one question with
  two answers, and templates are **per world**. All three were built to match.

  Storage and the reasoning for it are in `docs/handoff.md` §Templates: a
  separate `.templates.json`, kept out of the project's `nodes`, because search,
  the property index, LK export and the Phase 1.5 publisher all walk every page
  and one missed filter puts scaffolding into a published world.

  The scope dialog gets its own dialog-store entry rather than a mode on
  `pendingConfirm`, because a yes/no can't offer two yeses. It's skipped
  entirely for a page with no children.

  **A live bug fell out of the design work:** a top-level page named "assets"
  was written to `assets/` and then skipped by the load walk — intact on disk,
  absent from the tree. Same for "project". `RESERVED_ROOT_KEYS` now reserves
  position 0 for those names so a colliding page is numbered like any other
  clash. The per-directory markers (`_folder.json` / `_page.json`) remain
  uncovered; `docs/handoff.md` records that gap.

- ~~**Move ▸**~~ — #124, **shipped as "Move to"**, with a **search box** for the
  destination (her choice, 2026-08-11) rather than a submenu mirroring the
  tree: a menu of everywhere doesn't survive a world of any size, and walking
  one to reach a folder is the same work as finding it in the sidebar and
  dragging. Typing the name is the thing dragging can't do.

  **Matching is a plain substring, not the fuzzy index the tree filter uses.**
  The tree filter *shows* pages and a stray near-match costs a glance; picking
  the wrong row here files the work somewhere she didn't choose.

  `moveDestinations` leaves out the pages being moved and everything beneath
  them. **This is the first route to Move that has to say that out loud** —
  `moveNodes` never needed the check because react-arborist won't draw a drop
  into a node's own subtree. A page filed inside itself is a cycle: the tree
  walk never terminates, and on disk it's a directory moved into its own
  subtree, which is how a subtree gets lost rather than relocated. The shared
  parent is excluded too, but only when they *all* share it — a selection spread
  across three folders can genuinely be gathered into any one of them.

  The destination and its ancestors are opened *before* the move, so the page is
  visible where it lands rather than disappearing into a collapsed folder in a
  corner of the tree.

## Verification

Lint, build and the full suite green on each PR; 731 tests at the phase's start,
**771 at its end** — 13 new for `moveDestinations`, 20 for the template library,
7 for the reserved root names.

CSS measured against the live stylesheet with DOM replicas rather than
eyeballed, since `pnpm dev` can't open a project. That caught three things
that would otherwise have shipped: the template dialog's three buttons need
343px and `ui-modal-sm` gives ~304px, so it takes the standard width; the move
submenu had to be capped (439×198 against the context menu's 528×198) because
`TreePopover` measures once at mount and a content swap doesn't re-measure; and
the move list's names weren't truncating at all — a 310px name laid out in a
176px row, running out past the popover's edge.

**Not run in the desktop app.** Compiled, tested and measured rather than
eyeballed, as with Phase 14.

## Left to Phase 17 deliberately

Templates surface only in the new-page screen, with a hover × to delete one.
That's enough to make them usable and to undo a mistake; browsing, renaming and
reorganising them is the Templates tab's job.

---

# Phase 16 — Images & Tags — 2026-08-11

Pictures inside a page, the four buttons the sidebar portrait was missing, a
lightbox, keyboard control of a selected picture, and a picker over the
project's tags. Shipped as a run of PRs across 2026-08-11 (#126–#140). What
still governs the code is in `docs/handoff.md`; this is the record.

## What was in it

- ~~**Pictures in a page at all**~~ — #126. BlockNote's image block holds one
  string, so `uploadFile` decides what's written there and `resolveFileUrl`
  turns it back into something the webview can paint. Providing `uploadFile` is
  also what makes BlockNote render its Upload tab: its panel builds the tab list
  as `uploadFile === undefined ? [] : [upload]` plus embed, which is why that
  block used to offer a web address and nothing else.

  **Embedding by URL stayed**, after being removed and put back the same day.
  It crosses the "button-pressed, named host" rule on both counts and it is
  hers — recorded as the one standing exception in `CLAUDE.md`.

- ~~**The sidebar portrait's buttons**~~ — #127, #135. Change · reposition ·
  open full size · describe · set as cover, with the remove × on hover. Click-
  to-browse moved to the *empty* slot alone: with a reposition drag living on
  the picture, a stray click opening a file dialog would fight it.

- ~~**Save a copy, and quieter captions**~~ — #130. BlockNote's Download button
  is `resolveFileUrl(url).then(window.open)`, which does nothing in a Tauri
  window — replaced with the OS save dialog. On an embedded picture the same
  button says **Open in browser** instead, because there are no bytes here to
  copy. Captions went centred and muted, per her GitBook screenshot.

- ~~**The lightbox**~~ — #135. Filename, arrows across every picture on the
  page, scroll-to-zoom toward the pointer, drag to pan, Esc/←/→/+/−/0. Taken
  from Obsidian 1.13/1.14 rather than designed from nothing.

- ~~**Two fixes on the shipped lightbox**~~ — #136. Opening moved from click to
  double-click, because a single click is what raises the formatting toolbar
  and a window over it made the toolbar unreachable; a discoverable **Open full
  size** button went into that toolbar. The `/` menu's positioning bug was
  root-caused and fixed in the same PR (see `handoff.md`).

- ~~**Keyboard control of a selected picture**~~ — #139. `+`/`-` resize by a
  tenth, `0` restores its own size, Enter opens the Upload/Embed panel.
  **Backspace and Ctrl/Cmd-C/X were already ProseMirror's** — measured before
  building, not assumed. The auto-expand-on-cursor-near that Obsidian removed
  was deliberately never built.

- ~~**Tag picker**~~ — #140. A search box over every tag in the project, off a
  **+** at the end of the chips, with the number of pages carrying each. It's a
  spelling feature before it's a convenience: typing every tag by hand is how
  one page ends up "seafaring", another "Seafaring" and a third "sea-faring",
  after which no filter finds all three. Typing a tag that exists under a
  different capitalisation adopts that spelling rather than minting a second.

## Also fixed in the phase, from her testing

Tree names getting the full sidebar width back (#128); the breadcrumb trail
staying on one line, folding its middle away past four steps, and sitting under
the banner at the right distance and brightness (#137, #138). The stale
260-character path warning in `CLAUDE.md` was corrected against the measurement
in `constants/limits.ts`.

## Verification

Lint, build and the full suite green on each PR; 771 tests at the phase's
start, **806 at its end**.

CSS and DOM behaviour measured rather than eyeballed, since `pnpm dev` can't
open a project. Two things needed the *real* editor mounted in a browser to
find at all: the `/` menu was placed while it was still a one-line loading
strip and never re-measured (498px of it off screen, y=601 → y=10 after one
forced reposition), and the keyboard work was driven against a real image block
to confirm what BlockNote already did before adding anything.

**Not run in the desktop app**, as with Phases 14 and 15.

## Left queued deliberately

LK-style hover buttons over a picture in a page, and its block dots menu — both
in Queued Adjustments. The hover buttons mean rendering into BlockNote's own
block markup, and half that menu (Layout, Link to page, Insert row below) is
really Phase 18 sidebar-block work.

---

# Code blocks — 2026-08-12

Asked for as "somewhere to put prompts and bot guts with the markdown showing".
The first useful finding was that **the block already existed** — BlockNote
ships one in `defaultBlockSpecs`, which `editor-schema.ts` has always spread
whole, and it's a default slash-menu item. `/code` inserted one in every build
this app has ever had. Nobody knew, because nothing pointed at it and it looked
like it had fallen in from another program.

## What was wrong with it

Four things, measured before anything was written:

1. **Never styled.** BlockNote's own stylesheet paints it `#161616` with white
   text, an 8px radius, no border, and a language picker at `opacity: 0` in the
   top-*left* corner. All literals inside its CSS, so no theme could reach them.
2. **No highlighting at all.** The highlighter lives in a separate package that
   wasn't installed. Without it there is no language dropdown either — the
   picker only renders when `supportedLanguages` is set, so the block had no
   visible controls whatsoever.
3. **LK import lost the code.** Not mangled — *lost*. With no `codeBlock` case
   it fell to `default`, which recurses into a node's children; a code block's
   children are bare `text` nodes, which the block-level switch drops as inline
   content in a block position. Import counted an unknown block and produced
   nothing. `lk-export.ts` had no case either.
4. **Unfindable.** Left open; see `docs/plan.md`.

## The bundle, which drove the design

Taking `@blocknote/code-block`'s highlighter whole cost **+4.6 MB** (dist 7.4 MB
→ 12 MB). Its bundle names all 48 of its languages as `import()` calls, and a
bundler emits a chunk for each one whether or not anything asks for it — a
1.0 MB C++ grammar for a worldbuilding wiki, among others.

Rewriting the bundle by hand with only the fifteen languages the dropdown
offers, and dropping the package entirely, brought that to **+1.0 MB** (dist
8.4 MB). Two separate savings inside that:

- **The grammars we don't offer**, ~2.8 MB. The fifteen we do offer measure
  ~0.8 MB together, half of which is JavaScript and TypeScript.
- **The regex compiler**, 424 KB. `@shikijs/langs-precompiled` grammars have
  already had their Oniguruma regexes converted, so `createJavaScriptRawEngine`
  replaces the default engine's compiler with nothing. The two halves must move
  together — raw engine plus non-precompiled grammars fails at runtime.

Cost of doing it this way: four `@shikijs/*` packages are direct dependencies
now, pinned to the major BlockNote asks for. Recorded in `handoff.md`.

## The look

Language list cut from 48 to 15, ordered by what this app's writing actually
holds — plain text first and default, then JSON/JSONC/YAML (the reason
highlighting was worth adding: lorebook entries and character cards travel as
JSON), regular expressions (lorebook triggers), Markdown/XML/HTML (prompt
formats), CSS (this app's own themes are hand-written CSS), then the
general-purpose ones.

Colours stay dark on every Anamnesis theme. That's not laziness: BlockNote hands
the highlighter to `prosemirror-highlight` without naming a theme, so
`github-dark` paints every block regardless, and a light box would put mid-blues
and reds on near-white.

**The border draws the box, not the fill**, and that was the measurement that
changed the design. Against Midnight's `#0f0f14` page:

| | contrast vs page |
|---|---|
| `#08080d`, the fill shipped | 1.05 |
| pure black | 1.10 |
| BlockNote's `#161616` | 1.06 |
| `#3d3d4f`, the border shipped | 1.80 |
| `--color-border-strong`, the app's loudest border elsewhere | 1.66 |

There is no "darker" left on a near-black page — the fill's only job is to not
be lighter. The border went a shade past `--color-border-strong` because this is
the one block meant to interrupt the writing, and no further because it still
has to belong to the same set of surfaces. Syntax colour does the rest, landing
between 10 and 13 against the fill.

Also changed from BlockNote's defaults: the language picker moved to the top
right at a resting `opacity: 0.65` instead of top-left and invisible
(**superseded the same day — see below**); `<pre>` switched from
`white-space: pre` to `pre-wrap`, so a prompt pasted as one long line wraps
instead of running off the right edge with the rest unreachable.

## The header bar — same day, from her testing

The picker-in-the-corner version lasted one screenshot. Two things were wrong
with it and both were mine rather than BlockNote's:

- **It reacted to the block's hover, not its own.** Moving the mouse anywhere
  over the code lit the `<select>` up as a filled grey rectangle sitting over
  the writing. Her words were that it shouldn't "randomly highlight if you're
  just hovering over the box in general", which is exactly right — hover
  belongs on the control.
- **There was nowhere to put anything else.** She asked for a Copy button in the
  top right, and an absolutely-positioned `<select>` floating over line one has
  no room for a neighbour.

So the block's `render` is now wrapped: `code-block.ts` calls upstream's,
lifts the `<pre>` and the `<select>` out of the fragment it returns, and
reassembles them as a header strip plus the code. **Only `render` is replaced.**
`extensions` and the rest of `implementation` pass through untouched, which is
what keeps the syntax-highlighting plugin, the Tab-indents-inside-the-block
shortcuts, the parse rules and `toExternalHTML`. Rebuilding this as a custom
block would have meant owning all of it — and the highlight plugin is keyed on
the node type name `codeBlock`, so a block named anything else silently stops
being highlighted.

Side effect worth knowing: both elements are now a level deeper than BlockNote's
own selectors (`>div>select`, `>pre`) can reach, so none of its code-block CSS
applies any more and `page.css` styles from scratch rather than overriding.

The Copy button reads the text out of the `<pre>` at click time rather than
closing over the block `render` was handed, which is a snapshot from when the
block first appeared. `navigator.clipboard` with an `execCommand` fallback,
because the Tauri webview's origin isn't `https:` and the modern API wants a
secure context — it works today, and this degrades rather than going silent if a
webview update changes that.

### Three bugs on the way, and what they cost

The first version of this went out on a replica measurement and **blanked the
whole app** the moment she opened a page with a code block on it. Worth writing
down in full, because all three are traps for any future wrapper of any block.

1. **`render` reads `this`.** BlockNote calls it as
   `render.call({ blockContentDOMAttributes, renderType, props, propSchema }, block, editor)`.
   Calling it plainly threw on the first property read. The code comment
   claiming it didn't touch `this` was written from reading the *inner* render
   in the minified bundle and missing the wrapper around it — the wrong half of
   two functions with the same name.
2. **`rendered.dom` is `.bn-block-content`, not the code.**
   `wrapInBlockStructure` runs before we see it. Returning a wrapper of our own
   in its place discarded the class, the `data-content-type`, and everything
   BlockNote's selectors and parse rules hang off. Fixed by inserting the header
   *into* what came back.
3. **BlockNote's CSS still outranked ours.** With the header now a `div` that is
   a direct child of `.bn-block-content`, its
   `.bn-block-content[data-content-type=codeBlock]>div>select` matches again —
   and at two class-level parts plus two elements it beats
   `.editor-code-header > select`. The picker stayed absolutely positioned at
   `opacity: 0` over the first line while every rule we'd written looked
   correct.

**The replica is what let all three through.** It was hand-assembled from the
rules that looked relevant, so it didn't contain the one that was winning, and
it ran no JavaScript at all — a measurement of a drawing of the thing.

### Verified against the real editor instead

A throwaway `probe.html` plus a `src/probe.tsx` mounting `BlockNoteView` with
the real `editorSchema`, served by the dev server that was already running. No
project on disk needed, so it sidesteps the reason `pnpm dev` normally can't
show the editor at all. Both files deleted afterwards.

What it confirmed, with the real block mounted:

- `.bn-block-content` intact, children `[header, pre]`, `<code>` still carrying
  `bn-inline-content`; 15 languages in the picker, `json` selected.
- The picker computes to `position: static`, `opacity: 1`, our grey — i.e. our
  rules now win. Header 26px, no overlap with the code, language name and Copy
  label both 8px in from their own edge.
- **Typing into the block** leaves the header, the picker and the button in
  place and the structure unchanged.
- **Switching a block from Plain text to Markdown** produced highlight spans
  where there had been none, left the text identical, and left the header
  intact through the re-render. The zero-spans-on-plain-text half is the one
  that matters: it's the direct evidence that `{{char}}` and `**asterisks**` are
  untouched.
- The Copy button's three states switch on one attribute as designed. **The copy
  itself could not be proven here** — `navigator.clipboard.writeText` rejects
  with `NotAllowedError: Document is not focused` when the pane isn't displayed,
  and `execCommand` fails for the same reason. Secure context is `true` and the
  API is present, so the path is sound; it wants one real click to confirm.

## Verification

Lint, typecheck and the full suite green — 914 tests before, **925 after**.
Eleven new: the LK round trip both ways (including that a code block's newlines
survive as newlines rather than being split into `hardBreak` nodes, which is the
opposite of what every other block in that file needs), language normalisation
and its aliases, and a pair that fail the build if the dropdown and the shipped
grammars ever disagree.

CSS measured in a DOM replica carrying BlockNote's real rules alongside ours, to
confirm each override actually wins and to get the contrast numbers above.
Screenshots still don't composite in this environment, so nothing here was
eyeballed. **Not run in the desktop app.**

## The language menu — 2026-08-14, from her testing

She opened the picker and got a **white list on a black page**, with the
language names in a muted grey that was hard to read at 11px.

Both from the same root: **the app has never set `color-scheme` anywhere.** Its
initial value is `normal`, which for a native control means the light palette,
so every popup this app has ever opened would have drawn light — nothing had
opened one before. `<select>`'s list is painted by the engine outside the
document, so none of the ~15 rules `page.css` already had for that control could
reach it. Two things can: `color-scheme`, and `color`/`background-color` set on
the `<option>`s.

Both were needed. `color-scheme: dark` alone still left grey text, because the
previous rule was `option { color: inherit }` — written on the theory that
inheriting hands the decision back to the platform. It doesn't; it hands the
list whatever the *closed* control is wearing, and the closed control is
deliberately quiet at `--color-code-label`. That's the grey she saw. What it was
protecting against was real, though: BlockNote sets `color: #000` on the picker,
which inherits into the list and is unreadable on any dark background. Stating
both colours outright is the only thing that answers both.

`color-scheme` is declared on the picker rather than on `:root`. Hoisting it
would be right for the six dark themes and wrong for Daylight, and getting it
right globally means auditing every native control the app has — a separate
piece of work. The code block is the one region that is dark on every theme, so
the narrow declaration is true without qualification.

Added `--color-code-menu-bg: #16161f`. A flat literal and not
`--color-code-bg` plus a translucent lift, because the popup floats outside the
page and has nothing behind it to lift off. A few steps above the block so the
list reads as sitting over the code rather than as a hole in it.
`option:checked` also takes the accent, since the platform's highlight follows
the pointer and the row you're actually on otherwise has no marker in a list of
fifteen.

### Verification

Real editor again, `probe.html` + `src/probe.tsx` on the running dev server.
Confirmed applied: `color-scheme: dark` on the picker, `rgb(22, 22, 31)` and
`rgb(223, 223, 232)` on the options, the accent on the checked one, `:root`
still `normal` so nothing outside the block moved. The header, the Copy button
and the structure all re-checked in the same pass, and the plain-text block
still renders **zero** highlight spans against JSON's 14.

**The menu itself was not looked at, and can't be.** A native popup isn't in the
DOM and doesn't composite into a screenshot. What's verified is that the only
two properties capable of reaching it hold the right values.

Lint, typecheck and 925 tests green. No test covers this — it's CSS.

## Unknown code-block languages, and two questions closed — 2026-08-13

Found by reading her actual running app for the first time (`pnpm tauri:inspect`,
added the same day), then by grepping her project folders on disk.

### The import bug never cost her anything

`Valeraverse.lk` contains **zero** code blocks. Until 2026-08-12 importing one
dropped its text entirely, so the open question was whether pages in her world
were sitting there missing content. They aren't, there's nothing to re-import,
and the plan line is gone. The only code blocks anywhere in her projects are two
she made while testing the feature on 2026-08-12.

### ``` already worked, and the plan said otherwise

The plan recorded that `/code` was the only way to reach a code block. That was
wrong: BlockNote ships a ``` input rule, it has always been active here, and it
is precisely the door she named when she asked for the feature. She used it on
day one without being told. The discoverability item survives in a much smaller
form — whether someone who doesn't already know markdown would find either door
— which is a question about every block, not this one.

### An unknown language showed nothing at all

One of her two test blocks is saved with a language of `` gdfgfd``` ``. The
picker rendered it with `selectedIndex === -1`: the corner of the block simply
empty, no name, no fallback.

It's reachable by typing rather than only by a bad file. Upstream's rule is
`find: /^```(.*?)\s$/` with `props: { language: Mn(e, n) ?? n }` — the lookup
against `supportedLanguages` falls back to **the raw typed string** when it
misses, so ```` ```wjatever ```` stores `wjatever`. She'd typed the closing
fence too, which is why hers carries the backticks.

Fixed by showing plain text when the picker has no entry for the stored value.
That's honest rather than cosmetic: an unknown language gets no highlighting, so
the block already *is* plain text on screen and the label now agrees. It
deliberately does **not** rewrite the stored language — editing the document
from inside a render pass would mark the page dirty and queue a save for a page
she only opened to read. LK export already normalises the same value on its way
out, so nothing downstream sees the stray word either.

Upstream's typing shortcut is untouched. Replacing an input rule is the category
of change that produced three bugs in one PR on 2026-08-13, and the payoff here
didn't justify it.

### Verification

Real editor, five blocks: the stray language, a real one, a bare fence, plain
text, and JSON.

| stored language | picker shows | highlight spans |
| --- | --- | --- |
| `` gdfgfd``` `` | Plain text | 0 |
| `lua` | Lua | 4 |
| `` (empty) `` | Plain text | 0 |
| `text` (with `{{char}}` and `**asterisks**`) | Plain text | 0 |
| `json` | JSON | 6 |

The empty case needed no code — BlockNote resolves it to the default before the
wrapper sees it, which is what makes a bare ``` behave correctly.

Then the case that would actually bite: switching the stray-language block to
JSON through the picker. It took the change, re-rendered as JSON, and kept both
the header and the Copy button — so setting `.value` from the render pass
doesn't break the listener upstream attached to that element.

Lint, typecheck and 925 tests green. No test covers this; it's a DOM state the
suite has no jsdom to reach.

---

## Pictures in the writing survive an LK import — 2026-08-14

Queued after measuring both of her exports on 2026-08-13; she picked it as the
next build over the library work because this one loses data and the other only
annoys her.

### What was wrong

LK writes a picture placed in a page's text as `mediaSingle` wrapping `media`.
`convertBlock` had a case for neither, so it fell to `default` — which recurses
into children the block-level switch then discards. The picture didn't arrive
damaged; it didn't arrive, and nothing in the import preview mentioned it. A
silent drop is the worst shape an import bug can take, because the only way to
find it is to already know what the page used to look like.

Portraits and banners were never affected: those come through
`properties[].data.url` and `banner.url`, a different path entirely.

### What it took

`ImportPendingImage` grew a third slot. A portrait and a banner are fields on
the Node, so naming the node says where the filename goes; a body picture is a
block inside a tab and there can be many per page, so it carries the id of its
block and `applyBodyImage` reunites them after the download.

`ConvertCtx` gained `bodyImages`, a per-page outbox. `convertBlock` runs several
frames below `walk` and can't see which page it's converting, so it drops what
it finds there and `walk` empties the list against the node it just built. **It
has to be emptied every page** — a leak would give page two page one's pictures,
which is why there's a test for exactly that.

Two attrs that had never been read now are. `attrs.width` is a percentage of
LK's text column and becomes `previewWidth` in pixels of ours, against the new
`READING_COLUMN_WIDTH` — an approximation by construction, since LK's column
isn't this one, but it keeps a thumbnail a thumbnail. Left unset when LK
recorded none, because `previewWidth`'s own default means "the size the file
is". `attrs.layout` becomes `textAlignment`; `wrap-left`/`wrap-right` lose their
text wrap and `wide`/`full-width` stay inside the column, because our image
block always sits on its own line.

A `media` node with no `url` is counted and reported rather than dropped. One
exists in her second export — LK had lost track of it itself.

### A second silent drop, found by a test written for the first

`convertListItem` filtered an item's remaining children to paragraphs and nested
lists. Anything else inside a list item — a picture, a code block, a callout —
was thrown away without a word. The nested-picture test failed and that's why.
The rest now goes through `convertBlocks` like every other container, which also
fixes the ordering: the old two-pass version put every paragraph ahead of every
sub-list regardless of how they were written.

### Verification

Both real exports run through `buildImportPlan` in a throwaway test, deleted
after.

| export | image blocks produced | queued for download | portraits | banners |
| --- | --- | --- | --- | --- |
| `Valeraverse.lk` | 0 | 0 | 33 | 20 |
| `test.lk` | 27 | 27 | 7 | 3 |

27 rather than 28 is the addressless one, which now appears in the preview's
lossy notes as a picture that couldn't be brought across. Every block id unique,
every queued URL an `https://` one, and every image block in a tab matched by
exactly one pending download. Valeraverse's three numbers are identical to the
2026-08-13 measurement, so nothing on the working paths moved.

935 tests pass, 10 of them new.

---

## A picture in the writing can go back to LegendKeeper — 2026-08-14

Asked for the same day, straight after the import fix landed: if pictures now
come *in*, can they go back *out*?

### The split that made it answerable

Two cases, and only one of them is a wall.

A picture uploaded from her own disk genuinely cannot go into a `.lk` — the
format stores addresses of things on LK's servers, never bytes. Putting one
there means uploading to LK, which means her account, her password and her files
leaving the machine. Closed by the Policy Boundary, and it stays closed.

A picture that *came* from LK is a different question entirely, because the
address it came from still exists — we just weren't writing it down. Portraits
and banners already did exactly this, via `Node.imageSource` and `bannerSource`,
and had since Phase 8. The body case simply had no equivalent.

### Why a third record rather than reusing the first two

`assets/.sources.json`, keyed by filename, beside `.names.json` and
`.folders.json`.

Keyed by *file* because that's what the fact is about: the same picture used on
four pages came from one place, and the exporter holding an image block only
knows the filename. Not stored on the block, because BlockNote's image block has
a fixed prop set — an extra prop wouldn't survive a document load — and putting
it there would mean replacing their image block wholesale, which is forking a
component the project has a rule against forking.

Not merged with `imageSource`/`bannerSource` either, and that's the choice most
worth defending: those work, they predate this, and two records of one fact is
how they drift. Unifying all three is a real option one day. Doing it halfway is
strictly worse than three honest records.

Values are re-validated as `http(s)` on read. The file sits in her project
folder, is hand-editable, and its contents are written straight into an export
as addresses — a `file:` or `javascript:` value carried through would be put
somewhere something could follow it.

### The export side

`ALIGNMENT_TO_MEDIA_LAYOUT` runs the import mapping backwards, and is
deliberately not a perfect inverse: LK's `wrap-left`/`wrap-right` and
`wide`/`full-width` have no equivalent here, so a wrapped picture comes in
left-aligned and goes home left-aligned. **That is the only loss left in the
picture round trip.** Width goes back as a percentage of `READING_COLUMN_WIDTH`,
omitted when the picture was never resized.

An image block pointing at a plain web address needs no lookup — it already is
one, and LK can fetch it from wherever we do.

`sources` is threaded through the converters alongside `idMap` and `lossy`, and
`buildExportFile` takes it as optional: every test and every never-imported
project has none, and absent means "every picture here is local", which is what
the code did before this existed.

### Verification

Her second account's real export, imported and exported and imported again:

| | first import | written on export | second import |
| --- | --- | --- | --- |
| pictures in page bodies | 27 | 27 | 27 |
| portraits | 7 | 7 | 7 |
| banners | 3 | 3 | 3 |

Same addresses throughout, and the export's "picture can't go" note is gone
entirely — it had been the only one. 952 tests pass, 17 new.

### The one question left open, and it isn't ours to answer

Whether LK's own importer accepts a `data:` URI — the whole picture written into
the address field, nothing uploaded anywhere. If it does, local pictures
round-trip too. Answering it needs a real import into a real LK account, which
this app never contacts, so it needed her.

A probe file was built and handed over: three pictures on one page, a real LK
address as the control and two `data:` URI squares, one as `type: "external"`
and one as `type: "file"`, since both types appear in her real exports. Verified
to parse through our own importer first, so a failure in LK means something
about LK rather than something about the file. Generator lives in the session
scratchpad, not the repo — it answers one question once.

---

## Pictures from her own disk can go to LegendKeeper — 2026-08-14

The last piece of the picture round trip, and the one that needed an experiment
rather than a decision.

### The question, and getting it wrong the first time

A `.lk` holds addresses of pictures on LK's servers, never bytes. Uploading to
LK would need her account and her password and would send her files off the
machine — ruled out, and it stays ruled out. The one remaining possibility was a
`data:` URI: the whole picture written into the address field, nothing uploaded,
the file handed over by hand as always. Whether LK's importer accepts that could
only be answered by a real import into a real LK account, which this app never
contacts. So it needed her.

**The first probe was hand-built and it taught us nothing.** LK hung on it and
reported "? pages". But the file was missing a dozen fields LK writes —
`schemaVersion`, `createdBy`, `iconGlyph`, `iconShape`, `showPropertyBar`, and
per document `createdAt`, `updatedAt`, `locatorId`, `type`, `isFirst`,
`transforms`, `sources` — plus a top-level `hash` whose derivation couldn't be
reproduced from either of her exports. **A malformed file and a rejected picture
look identical from outside.**

**The second probe started from her own real export and changed four values:**
two media URLs swapped for `data:` URIs, and the two page names holding them, so
she could find them. Diffed leaf by leaf to confirm nothing else moved. The other
25 pictures were the control, inside the same file.

It imported, and both squares rendered. Two facts for the price of one: LK
accepts `data:` URIs for **both** media types it writes — the loose
`type: "external"` and the strict `type: "file"` — and LK does not verify that
hash, since it was left untouched over changed content.

**The lesson is in `handoff.md`: probe a format by mutating a real export, never
by constructing one.**

### What got built

`dataUriFor` in `asset-sources.ts`, chunked at 32k because spreading a
multi-megabyte array into `String.fromCharCode` overflows the stack. An unknown
extension gets `application/octet-stream`, which no browser will draw — the right
outcome, since a picture mislabelled as another format is a broken image
somewhere else later with nothing pointing back.

The three drop sites in `lk-export.ts` — body block, portrait, banner — now go
through one `PictureLookup` resolver instead of each deciding for itself. Three
possible answers, one of them a lookup: the address it was imported from, the
bytes as a `data:` URI, or nothing. Counting the nothings is the resolver's job,
so no caller can forget. **An imported address always wins over the bytes** —
a fraction of the size, same picture.

`buildExportFile` reports `localAssetFiles` so the caller can size exactly the
files that need carrying, then build the plan a second time with `assetData`.
Two passes rather than one, because the first pass is what discovers the list.

`localPictureNote` was pulled out of `lossyNotes` into its own field. It's the
only note the user can act on — ticking the box makes it untrue — so it can't
sit in a list the dialog renders unconditionally.

### Verification

The dialog was mounted for real against her running dev server (a throwaway
`probe.html` + `src/probe.tsx` with a seeded store, deleted after), rather than
reasoned about:

| checked | result |
| --- | --- |
| picture count | 3 — two in a tab, one portrait |
| block geometry | 462×108 inside a 512 modal, no horizontal overflow |
| checkbox alignment | sits on the first line of a three-line label, not above it |
| ticking the box | the picture note disappears, the folder note stays |

**One real bug caught by looking.** The checkbox was styled `accent-color:
var(--color-accent)` — which is 15% opaque, the token for washes *behind*
things, giving a barely visible tick. Every other checkbox in the app uses
`--color-accent-light`. Confirmed `rgb(94, 234, 212)` after the fix.

960 tests pass, 8 new.

---

## The bin goes on every picture — 2026-08-14

Her call, and it closes a complaint she'd raised twice.

### What was wrong with the old rule

The bin appeared only on a picture nothing pointed at. That was a real safety
rule with a real reason, and it read as a broken button: she reported the
trashcan as broken on 2026-08-12 and again on 2026-08-13, both times because it
was on one tile and not the others. **A rule nobody can see is not a rule, it's
a bug report waiting to happen.**

### The LegendKeeper comparison, and why it didn't transfer

She checked LK: deleting a picture from its library leaves every page that shows
it rendering perfectly. That looks like LK doing the dangerous thing safely, and
it isn't. **LK's pages hold a web address; its library is a separate list that
happens to mention the same address.** Deleting the entry deletes a row nothing
was reading through, so no page notices. Their delete is safe because it barely
deletes.

We have no such indirection — a page names a file in `assets/`. Copying LK's
behaviour literally, deleting the file and leaving pages alone, produces broken
boxes on pages, which is the one outcome LK never produces. So "LK does X" was
the wrong argument here in both directions, and the question had to be answered
on its own terms.

### Why "remove from every page" was dropped rather than built

It was the queued answer to "how do you delete a picture that's in use": clear
every slot and block holding it, across the project, in one undoable step.

Her objection killed it in one line — **who has a picture on thirty pages that
they need to remove?** The feature existed to make a rare dead end escapable,
at the cost of the riskiest change in the queue: `applyBulk`'s reverse patch
understands four fields and removing a picture patches three others, so undo
would have silently restored nothing until that was extended. Large, risky, and
in service of a case nobody has.

Deleting the file and telling her what it cost gets the same place for a
fraction of the work, and the undo for it already existed.

### What changed

One gate removed in `AssetsPanel.tsx`, plus a confirm that names the pages when
the picture is in use and truncates the list at three. `deleteAsset` in the
store needed nothing — it already read the bytes before deleting so undo could
put them back, and already worked on any file.

A page whose picture is gone shows a broken picture rather than failing to
render, which `resolveAssetUrl` has always done deliberately; that behaviour
stops being an edge case and becomes a normal one, and it was already right.

**Two stale justifications were rewritten rather than left to rot.** The CSS
comment argued the always-on button wasn't noisy because it only appeared on a
small minority of tiles — no longer true, and the actual reason (hover-reveal
misses the reflow after a delete) is stronger anyway. And `handoff.md`'s
usage-index bullet said a miss there would arm a delete button on something in
use; now a miss makes the *confirm* lie instead, which is a smaller failure but
still one worth naming.

`releaseAsset` is untouched and must stay untouched: its job is to *not* delete
a file something is using, which is the opposite of what this button is for.

960 tests pass. No new ones — the change is a removed condition in a component,
and components aren't the tested layer here.

### Not verified by eye

The grid was not looked at with bins on every tile. The button is the same
element in the same absolute position it already occupied on unused tiles, so
there's no new layout, but whether a 20px button on every thumbnail reads as
busy is a judgement only she can make from the running app.

---

## Removing a picture removes it from the library — 2026-08-14

Third attempt at one button, and the two wrong ones are the useful part of this
entry.

### What she asked for, and what I built instead

**Attempt one** hid the bin on any picture in use, on the reasoning that
deleting one would leave pages with an empty box. She reported the trashcan as
broken twice — a rule nobody can see isn't a rule.

**Attempt two** put the bin on everything and made it delete the file, with a
confirm naming the pages that would lose their picture. She rejected the premise
outright: *deleting it should ONLY REMOVE IT FROM THE LIBRARY.*

**The mistake in both was one word.** I read "library" as `assets/` — the folder
on disk. She meant the list of pictures she is looking at. Those are different
things, and everything else followed from getting them confused: if the library
is the folder, removal must delete a file and therefore must reckon with pages;
if the library is a view, removal changes the view and pages never enter into
it.

She had also handed me the answer a day earlier, by checking LegendKeeper:
deleting from its library leaves every page rendering. I had used that to argue
*against* this, on the grounds that LK only gets away with it because its pages
hold a CDN address. That was the right observation and the wrong conclusion —
the outcome is reproducible here, it just needs the file kept rather than the
address.

### What got built

`removeAssetFromLibrary` takes one of two paths and she sees no difference:

| picture | file on disk | listed in `.removed.json` | in the grid | pages |
| --- | --- | --- | --- | --- |
| nothing uses it | deleted | no | gone | unaffected |
| a page uses it | kept | yes | gone | unaffected |

The second path is why `.removed.json` exists — the fourth of the library's side
files, and the only one that's usually absent. An entry lives there exactly as
long as some page needs the bytes: when the last page lets go, `releaseAsset`
deletes the file and the next sweep prunes the name.

The confirm lost everything it used to say. No page names, no counting, no
warning about empty spaces — there is nothing to warn about. It reads: *Take
this picture out of the library? Any page already using it keeps it. You can
undo this.*

`isUsageIncomplete` stops guarding anything destructive as a result, and is back
to what it always described: the tile says "not sure yet" rather than "not used
anywhere".

### The trap, caught before it shipped

`useAssets` prunes the names, sources and removals against the directory
listing, then hides removed pictures from `entries`. **Doing those in the other
order silently breaks the feature**: a picture filtered out early looks like one
that has left `assets/`, so its own removal entry gets pruned and it reappears
in the grid on the next read. Written into `handoff.md`, because it isn't
visible from either piece of code on its own.

### Verification

The two paths were run for real against the dev server rather than reasoned
about — a throwaway probe wiring the actual `isAssetInUse`, `removeAsset`,
`pruneRemovedAssets` and `buildAssetEntries`, deleted after.

Removing a picture a page uses: file still on disk, name in the removed list,
gone from the grid, page still pointing at it. Removing one nothing uses: file
gone, grid empty, **no leftover entry** — the prune cleared it because the file
was no longer there. That last one is the trap above, confirmed working in the
right order.

968 tests pass, 8 new on the service.

### Not verified by eye

The grid was not looked at after a removal. The change to it is a filter over a
list that already rendered, so nothing new draws.

---

# Phase 17 — Templates & Assets Tabs — 2026-08-12 to 2026-08-18

**Kept whole from `docs/plan.md` rather than summarised.** Twenty-one PRs over
seven days, and most of what the section holds is *why* — three shapes of folder
control that were built and replaced, two wrong answers to "remove this
picture", a grid that shipped as a list and was rejected on sight. Boiling that
down to what shipped would throw away the part that stops it being rebuilt the
same way. What follows is the phase as it was planned and amended, with the
decisions the amendments came from.

Anything in here that still *governs* the code — the four places a picture can
be in use, why a library folder is a label and not a place, why templates stay
out of `nodes` — is in `docs/handoff.md` too. This is the record; that is the
warning.

The two greyed-out tabs in `TreeSidebar.tsx`. Both are views over things the
project already has and can't currently see: the templates saved by "Convert to
template", and the picture files in `assets/`.

**Scoped 2026-08-12.** Three questions were put to the user and her answers are
baked in below rather than left open.

## The tab strip becomes real

`TreeSidebar.tsx` has carried three buttons with two of them `disabled` since
Phase 3. The strip starts switching what the sidebar shows: Project (the tree as
it is now), Templates, Assets. The tree's own header and search belong to the
Project view and don't follow the user into the other two.

## Templates tab

The world's own templates — `.templates.json`, kept in the store's `templates`
record, never in `nodes`. Rendered as a list in `rootOrder`, each with its kind's
icon; a template saved with its sub-pages shows them nested underneath.

**Two sections: the built-in templates first, then hers** — her instruction,
2026-08-12, and the same order the new-page screen already uses.

**The built-in templates are editable too**, decided by the user on 2026-08-12
on the same LK-parity reasoning that settled her own. A built-in is seed data in
`template-registry.ts` and identical in every world, so an edit is a per-project
*override*: `TemplateLibrary.overrides` maps a template key to the id of a node
in the same file, made from the registry's seed the first time she opens one.
`applyTemplate` prefers it, and removing it is what "put it back to the
original" means — the registry is never written to.

**What an override does not carry is the property schema.** Editing a template
means its title and its tabs, for a built-in exactly as for one of hers, because
that's all `TemplateView` edits. Overriding `getPropertySchema` would be a
different feature with a different shape: it's read by `lk-export`, `lk-import`
and the property index, none of which can see the store, and — unlike tabs —
changing it would alter what pages *already made* display, since the panel
derives its fields from the key rather than from a copy on the node. Not scoped;
ask before starting it.

- **Open one and edit it.** Clicking a template opens it in the main area as a
  page — its title, tabs, properties and pictures — and edits save back to the
  library.
- **Reorder and delete.** Delete already exists (`deleteTemplate`, with undo);
  reordering writes `rootOrder`, which is already the field deciding the offer
  order on the new-page screen. Only her own reorder — the built-in list is the
  app's, identical in every world, and a per-world order for it would be a
  setting for something that isn't per-world.
- **Start a new page from one**, without going through the new-page screen.
  **At the top level**, and the sidebar returns to the Project tab so the page
  is visible where it landed: this is the one route to a new page with nothing
  on screen that means "here", since the tree isn't drawn while the Templates
  tab is. Blank first and then the template applied, exactly as the new-page
  screen does it — applying is where a built-in's per-world override is
  preferred, where a template's pictures get their own copies and where its
  saved sub-pages arrive, and a second path to that is the one that drifts.

**Templates are editable because LegendKeeper's are, and its absence would read
as a missing feature — the user, 2026-08-12, and that settles it.** Don't
re-open it.

This supersedes the "no second editing surface to build or maintain" half of the
2026-07-31 decision. That phrase meant a bespoke template-editing *screen* — a
settings form with its own fields, standing alongside the page editor and
needing maintenance beside it. **That's still not what gets built**, and the
rest of that decision is untouched: templates are still *designed* by building a
real page and saving it, which is why there's no "new template" button anywhere.
What arrives is the page editor pointed at a different record, which is why this
costs a fraction of what the original phrasing was guarding against.

**Renaming a template needs no affordance of its own** — it's the page title,
edited the way every other page title is. The earlier draft of this entry listed
rename as separate work; opening a template as a page is what makes it free, and
a second rename control in the sidebar would be a second way to do one thing.

**The one thing not to do here is put templates into `nodes` to make that
easier.** Their separation is the whole safety argument for the feature —
search, the property index, LK export and the Phase 1.5 publisher all walk every
page they can see, and any one that forgot to filter would put scaffolding into
her published world (`docs/handoff.md` §Editor & templates). The editor has to
take its node from either record instead. `project.selectedId` is a project node
id and must stay one, so which template is open is its own piece of state.

**Editing a template must not touch pages already made from it.** Applying a
template deep-copies (`applyCustomTemplate`), so this is already true of the
data; it needs saying in the UI, because "template" reads like a live link and
it isn't one.

## Assets tab

The image organiser over `assets/`. Nothing in the app can currently *list* that
directory — `filesystem-service.ts` saves, reads and deletes one file at a time —
so this starts with a listing and an honest answer to "is this picture in use".

**A picture can be in use in four places, and a usage index that misses one is
worse than none**, because the whole tab is built on trusting it:

1. `Node.image` — the sidebar portrait.
2. `Node.banner` — the cover.
3. `anamnesis-asset:<filename>` inside any block of any tab of any page, hidden
   tabs included.
4. All three of the above again, in the template library.

That fourth one is not optional. `saveAsTemplate` copies a page's `image` and
`banner` files but not the pictures sitting *inside* its tabs, so a template and
the page it came from can share an in-page picture file. Harmless until now —
nothing has ever deleted one — and this phase is what makes it reachable.

- **Every file in `assets/`** with a thumbnail, its name, its size, and where
  it's used: the pages that carry it, or "not used anywhere".
- **Take a picture out of the library — settled 2026-08-14, after two wrong
  builds.** The bin used to hide on anything in use, which read as a broken
  button and was reported as broken twice. The second attempt deleted the file
  and warned that pages would be left with an empty space. Both missed what she
  meant: **the library is the list of pictures she's looking at, and removing
  one from it must not touch a page.** The file is deleted only when nothing
  needs it; otherwise the bytes stay and the name goes into `.removed.json`.
  LegendKeeper behaves the same way, which is why its pages never break either.

- **Put a picture into the open page** by clicking it, or dragging it onto the
  page. It reuses the file that's already there rather than writing a second
  copy of the same bytes — which is the point, for one map that belongs on six
  pages.

**Deleting a file is undoable, and the machinery for it exists.** `CapturedAsset`
already holds the bytes of a deleted page's pictures so undo can put them back;
an asset deleted from this tab is the same problem and takes the same answer. A
delete that can only be apologised for is not one to ship next to a grid of
thumbnails where the wrong one is a mis-click away.

## Two things to know before starting

- **Every write still goes through `track()` and the write queue.** Deleting a
  file and saving the pages that referenced it are two disk operations that must
  land in that order.

## Sequencing

Roughly one PR each. **Shipped 2026-08-12:** the tab strip and the Templates
list (#143), template editing with rename (#144), the built-in templates listed
(#146) and made editable per world (#147), the Assets listing with its usage
index and delete-with-undo (#148), that listing rebuilt as a grid (#149), the
picture library (#150), and the library reaching pictures inside a page plus
clickable thumbnails (#151).

**Also shipped 2026-08-12:** the duplicate-node-file repair that was making
portraits and covers look unused (#152), the Assets tab's own upload button and
drag-onto-a-page (#153), and folders in the picture library (#154).

**Also shipped 2026-08-14:** pictures in a page's writing surviving an LK
import (#174), the same pictures going back out again (#175), carrying local
pictures inside an export (#176), and the delete gate removed from the Assets
grid (#177).

**Also shipped 2026-08-18:** removing a picture from the library without
touching a page (#179), the folder chips rebuilt as squat tiles (#180), those
tiles folded down to one line (#181), that line turned into a dropdown that
holds fifty folders as easily as four (#182), with a filter box in it (#183),
drag-to-reorder on her own templates (#184), and starting a new page from a
template (#185).

**Phase 17 is complete.**
Remove-from-every-page was **dropped** 2026-08-14 — see the Assets tab section
above.

**Dragging a tile onto a page is the second route in, and it carries its own
MIME type (#153).** `ASSET_DRAG_TYPE`, not `text/plain`: the editor is already a
drop target for text and for real files, and both mean something there. A
filename read out of `text/plain` would make every dragged word of prose look
like a picture, and one written *into* it would have a drop anywhere else in the
app paste a UUID. The drop listener is native and on the capture phase for the
same reason the lightbox's double-click is — ProseMirror has real drop behaviour
and would otherwise take the event first.

**Putting a picture into a page by *clicking* is the image block's own Library
tab (#151), not a click in the Assets tab.** The plan originally said clicking a thumbnail
would insert it into the open page. That was reconsidered when the tiles
actually got behaviour: they're 77px squares packed six to a screen, and the
gesture you make to see what one *is* should not be the one that edits your
writing. Clicking a tile opens it full size instead. The block's panel is where
"put a picture here" is already unambiguous, because you've said where. Dragging
a tile onto a page is still open, and is the shape worth building if a
second route is ever wanted.

**The library is why the Assets tab is worth having, and the user is the one
who said so** (2026-08-12, with a screenshot of LK's asset picker). The tab as
first built could only ever *report*: uploads all happened at the spot a
picture was wanted, so nothing arrived unused and a picture wanted twice was
uploaded twice. #150 makes the library the thing you choose from — portrait and
cover so far — with "add from computer" inside it, so uploading is one of the
ways of answering rather than a separate path.

**A library folder is a label on a file, never a place it lives (#154), and
that is not a shortcut.** The pictures stay flat in `assets/` and a reference
stays `anamnesis-asset:<filename>`, so filing one touches only
`assets/.folders.json`. Real subdirectories would put the folder name inside
every reference to the picture, and moving it between folders would mean
rewriting every page that shows it — where a rewrite that stops halfway is a
broken picture, across pages she wasn't even looking at. The filename is the
identity; a folder is a view over it. Two consequences worth keeping: deleting a
folder can never delete a picture (they return to Unsorted), and a label
pointing at a folder that's gone reads as unsorted rather than as an error.

The folder file lives *inside* `assets/` rather than at the project root beside
`.templates.json`, because a `.json` at the root is read as a page unless
`walkEntries` is told otherwise — and that skip list is one more thing to get
right in the one function that must never lose a file. The walk skips `assets/`
whole, so the question doesn't arise.

**Chips that wrap, not a folder column.** LK puts folders down the side of a
window many times wider than this sidebar, which goes to 180px; a column there
would leave the pictures one per row, which is the mistake #149 already
corrected once.

**Unsplash and Pinterest, which LK's picker offers beside My Files, are out —
her call, same day.** They'd each be a live connection to someone else's
server, which CLAUDE.md's Policy Boundary makes a decision to raise rather than
a judgement call; it was raised and declined. Don't reopen it by treating a
search box as a small feature.

**What #150 changed underneath:** an asset file no longer has one owner. See
`docs/handoff.md` — every delete asks `isAssetInUse` first, and the copies that
existed only to work around single-ownership (`setBannerFromImage`) are gone.

**The Assets listing is a grid of thumbnails, with a counted number of columns
rather than `auto-fill`.** It shipped as a list of rows in #148 and the user
rejected that on sight; #149 is the grid the plan asked for in the first place.
The measurement that had argued for rows was real but the conclusion drawn from
it was wrong: `auto-fill` was the fault, not the grid. It pins tiles to their
minimum and spends every extra pixel on more columns, so the panel's 180px floor
gave one tile per row and 420px gave five clipped ones. Counting columns — two,
three past 302px of panel — lets the tile grow with the panel instead: 77px,
117px, 129px at the three widths in `constants/layout.ts`. Re-measured
2026-08-12. Don't reach for `auto-fill` here again.

**The usage index is only as complete as the load, and #152 is what made that
concrete.** Two files on disk claimed the same page id, the graph is keyed by
id, so one of them was dropped on load — and its portrait and cover fell out of
the count, putting a delete button on two pictures a live page was displaying.
The storage side is fixed at both ends (see `docs/handoff.md` §Storage), but the
standing rule from it is in the tab: **the delete buttons switch off entirely
when the load couldn't read every page.** "Nothing is using this" is a claim
about all of them, and any future way of losing one must not surface as a
delete. Don't make that conditional on the user having dismissed the warning —
`loadWasIncomplete` exists separately from `skippedFiles` for exactly that
reason.

**The tab's delete button is always visible on an unused picture, not revealed
on hover.** Deleting one reflows the grid under a stationary cursor and the
browser doesn't re-run `:hover` until the pointer moves, so the control
disappeared from tiles it was still over. Reported 2026-08-12.

---

## Phase 27 — The World Library ✅ Shipped 2026-08-18 → 2026-08-20

Raised 2026-08-14, from her opening the app and finding the start screen
remembers eight worlds and offers Explorer for the ninth. Everything here is
one screen and the identity that screen needs to work.

**This is the next thing built** — she wants the start screen done promptly
(her call, 2026-08-14), so it sits here, directly after the phase in flight,
rather than at the bottom where it was written. It keeps the number 27 because
the number is a name, not a position; see the note in Project Overview.

### Worlds get an id

`project.json` has `version`, `name`, `rootOrder`, `homeNodeId` — no id. A
world's only identity is its folder path, so everything that refers to one
breaks when it moves or is renamed. That is already biting: the recent list is
a list of paths, and the folder reorganisation below moves every world.

A random id in `project.json`, generated on create and backfilled the first
time an existing world is opened. Pins, groups, archive state and the recent
list all key on it. **In the project file rather than app settings** (her call,
2026-08-14) so it travels with the world — which is what leaves the door open
for links that reach across worlds later. Pages already have ids; this supplies
the missing half of the address.

**Copies get a fresh id, never a derived one.** A duplicated world (she keeps
`Valeraverse` and `Valeraverse3`) would otherwise claim to be the world it was
copied from. Appending a suffix was considered and rejected: the filename
collision suffixes already in `filesystem-service.ts` are recomputed from
creation order on every resolve, so siblings renumber each other — harmless for
a filename, fatal for an id, because a renumber breaks every reference. The
lineage her question was actually after lives in its own field: the copy
records which world it came from, so identity stays meaningless and "this is a
fork of that" stays real data.

**The duplicate-id rule doubles as the fork detector.** Two worlds wearing the
same id is not an error, it is evidence one was copied from the other:
most-recently-modified keeps the id, the other is re-idded *and records the
first as its parent*. This matters because her forking is done in File
Explorer, not in the app — shown 2026-08-14 — so lineage recorded only on an
in-app duplicate would miss the way she actually works. A world copied in
Explorer gets correct lineage the next time the folder is scanned, with no
change to her habit.

**Forking a whole world is a workflow, not an edge case.** Demonstrated
2026-08-14 with her CharSnap bot documents: duplicate the whole thing, work in
the copy, keep the previous one in case the changes turn out wrong. The naming
in that document is what a lineage field exists to replace — `Copy of Copy of
Copy of Template`, `Copy of Val v5` ordered above `Val v6`, the actual
descent recorded nowhere but her memory.

Worth adding alongside: a **duplicate-world action** on this screen, so the
fork can happen in the app rather than in Explorer, and worlds can show what
they were forked from.

**Newest at the top, and no tidying required** (her call, 2026-08-14). Her
document tabs run oldest-first and she has never reorganised them because
reorganising is work — which is the whole lesson. Any ordering that depends on
upkeep will be wrong within a month. The default sort puts the newest first
and a fresh fork lands above what it was forked from; manual arrangement, if it
ever exists, is an option on top of a default that is already correct, never
the thing holding it together.

**Not the same thing as Phase 19.** Safety Net is per-file snapshots — restore
a page to how it was an hour ago, automatic, invisible until needed. Forking is
deliberate, whole-world, and both sides stay open and readable indefinitely.
Neither substitutes for the other; don't let them merge into one item.

### The projects folder gets read

Nothing has ever looked inside it. `getProjectsDir` is used to decide where new
worlds are *put*, to site `themes/` and `snippets/`, and as an import
destination — never to find a world. Combined with `RECENT_PROJECTS_COUNT = 8`,
a ninth world is unreachable except through the folder picker.

Scan it. A world is any directory containing `project.json` — the same check
`loadProject` already makes. Recent stops being a whitelist and becomes a sort
order; the cap disappears rather than being raised. **Two levels deep**, so a
world nested one further down still appears (hers currently sit at mixed
depths, e.g. `TEStval/Valeraverse`).

Worlds opened from outside the projects folder are remembered as now and shown
**in the same list, marked** rather than in a section of their own (Q11,
delegated to me 2026-08-14). A separate section makes the split the screen's
main organising idea, when the split is a fact about where a folder happens to
sit and nothing she thinks about. One list keeps the default sort meaningful
and keeps groups as the thing that organises; the marker is there for the
moment it matters, which is when a world has gone missing and the answer is
that its drive isn't plugged in.

### Opening a folder gets forgiving

Her call, 2026-08-14. Unzipping commonly produces `Valeraverse/Valeraverse/`,
and "Open folder" currently reports no project in the outer one, which is
correct and useless. When the chosen folder has no `project.json`, look one
level in: exactly one world below it opens directly, several says so and lets
her pick. This matters more as worlds and templates get handed to other people.

### Organising, without touching the disk

All of it, per her 2026-08-14 call: filter, pin, archive, groups.

**Groups are in the app, not folders on disk.** Real folders were considered
and rejected by her, correctly: worlds already sit at mixed depths, group
directories would add another level for the scan to disambiguate, and
organising would mean leaving for File Explorer. Group membership is app state
keyed on the world id, so it survives a world being moved or renamed.

Pin floats a world up; archive folds one away without deleting it. Neither is a
location, so both compose with groups rather than competing.

**Nothing truncates.** A "4 more…" link is the same failure as the eight-world
cap in better clothes. The list shows everything and the page scrolls; the
filter box is the answer at scale, not a fold.

**Pages or one long scroll is hers to choose, and pagination is the default**
— her call, 2026-08-18, in the strongest terms she has used about an
interaction so far. This does not contradict the paragraph above: a fold hides
projects behind a "4 more…" link and a page does not. Everything is still
reachable either way; the question is only whether the grid ends at a page
boundary or keeps going.

**It shipped in Settings → Lists rather than in appearance** (2026-08-18). The
reasoning for having a switch at all is the muted-covers reasoning — taste gets
a setting, not a compromise everybody lives with — but this one is about how a
list behaves rather than how it looks, and it governs the pictures as well as
this screen (her call: they are the grids she is in far more often). A
behaviour setting filed under appearance is a setting nobody finds twice.
Default is pages. Both picture grids — the sidebar's Assets tab and the
picker — read it as of 2026-08-18.

**How big a page is became a second setting on 2026-08-20, and the first
answer was wrong.** A page shipped as "however many fit the window", measured,
on the reasoning that a page which scrolls is back to the thing pages exist to
avoid. Her window fitted eight projects, and she named the mistake exactly:
*no infinite scroll* and *no scrolling at all* are two extremely different
things, and only the first was ever the ask. A page is now a count — 20 by
default, with 40, 60 and 100 offered, in Settings → Lists beside the switch —
and a page taller than the window scrolls, which is fine.

The options only go up from 20 on purpose: the failure being fixed is a page
that was too small, and offering to make it smaller again would be shipping the
bug back as a choice. One number for all three grids, the same argument the
switch above it already won.

**And the scrolling itself was wrong, reported the same day.** The wheel only
worked with the pointer over the covers: `.start-area` was the scroll box, and
the heading, the New Project row and the pinned cards all sit outside it. So
the scroller moved up to `.start-main` — the whole column — and `.start-area`
stopped being one. That is also why the page-turn reset has to walk up to find
whatever scrolls it (`scrollingBoxOf`): the two picture grids scroll
themselves, and the projects grid is scrolled by an ancestor owned by a
different component. The trade is that the page arrows now sit at the end of
the list rather than pinned to the window's bottom edge, which is what every
scrolling paginated page does.

Two things fell out of it. The three scroll containers each had a rule clipping
them while paged, which had to go — a page has to be allowed to be taller than
its box. And turning the page had to start resetting the scroll to the top,
which was never possible to get wrong before: at the bottom of page one, "next
page" left the scroll where it was and opened page two halfway down. Measured
doing exactly that before it was fixed.

It also deleted more than it added. `fitPerPage`, `useMeasuredPagedList` and
its tile-measuring `ResizeObserver`, and the five `PROJECT_TILE_*` /
`PICTURE_GRID_GAP` constants all existed so the page arithmetic and the
stylesheet could agree about pixels. A count needs none of it, and the grids'
own numbers went back to being the stylesheet's alone.

**The pinned row keeps its own pagination regardless.** That one is not a
preference: a scrolling row cannot land on a page boundary, so its last page
repeats cards and its dots lie about where you are. The switch governs the
all-projects grid below it.

**Groups can land after the first cut** (her call, 2026-08-14: not as important,
unless it's cheap). It is cheap, but only in the right order — group membership
is app state keyed on the world id, so the ids and the folder scan have to exist
first, and once they do the whole feature is a row of chips above the grid that
filters it plus a group field in the manage window. Ship the screen without
groups if that's what gets it out sooner; don't design the grid in a way that
can't grow a chip row.

**Groups and the archive landed 2026-08-20, as one chip row and one menu.** The
chip row is what was written above; the "group field in the manage window" is
not, because there is no window to put it in — pinning has one and filing does
not, and building a second window for the sake of a sentence would have made
the cheap half of this expensive. Filing happens on the project instead, in the
`⋯` menu that already existed on a row, which is now on covers too — the menu
holds the things that belong to the project rather than to its picture, and
that is exactly what groups and archiving are. Making a group is in the same
menu, taking the project it was opened on as its first member: naming a group
there means "file this one under that", and handing back an empty group for her
to then fill would be two steps for one intention.

**Archive and groups compose by the fold winning.** An archived project is out
of All, out of the pinned row, and out of the groups it is still filed under —
but nothing is unfiled, so bringing it back needs no repair, and its pin is
still where she put it. The alternative, leaving archived projects visible
inside their groups, makes "archived" mean nothing anywhere except one chip.

**The chip row shows only what exists**: All, one chip per group, and Archived
only while something is in it. A rank of empty categories explaining a feature
she has not used is the same furniture the empty-state rules elsewhere on this
screen refuse.

**One identity rule under all three.** Pins answered "is this stored thing the
same project as that listed one" first, and groups and the archive ask exactly
the same question — so it moved into `project-refs.ts` and pins was rebuilt on
it rather than copied. Three answers to one question is a project that silently
loses its group after a rename.

### The screen itself

`docs/ui-audit.md` Part 3 has carried "the start screen's unaligned box stack
and missing primary action" since Parts 1 and 2 were finished, and
`shell.css` admits in a comment that its three actions are identical with no
primary among them. This is that item, finally scheduled.

**Settled 2026-08-14** (Q8 closed) after five rounds of mockups on the app's own
palette and fonts. Three exploratory directions were rejected outright; what
follows is what she picked, and the reasons are recorded because most of them
are rules, not preferences.

**Layout.** A main column with a rail down the right-hand side, flush to the
edge with its own panel background and dividing line.

- **Pinned worlds across the top**, as tall cover cards. These are the one
  uncontained thing on the screen: no box, the picture dissolving upward into
  the background, its border running up the sides and fading with it, and a
  single rule under the name in the world's own colours. Everything else on the
  screen sits in a box, and this deliberately doesn't.
- **Real pagination, four to a page** — not a scroller. A scrolling row cannot
  land on a page boundary, so its last page repeats cards you have already seen
  and its dots lie about where you are. Her words for the app that does this to
  her: she keeps exactly four favourites *because* of it. Pages hold whole
  cards, the last page is short rather than overlapping, and it crossfades.
  Chevrons sit on a soft radial glow, never a rectangular scrim — a rectangle
  over artwork shows its own top and bottom edges and you end up looking at the
  box. Page dots are ~26×20 hit targets, not 5px specks.
- **All worlds below** as a bordered cover grid, newest first, with a **grid /
  list toggle** beside the sort control (her call, 2026-08-14, after LegendKeeper's
  — which offers the same pair). List view is one row per world: thumbnail,
  name, when it was last edited. It is the view that scales — thirty worlds as
  covers is a wall, thirty as rows is a list you can read — and it's also the
  honest view for anyone who never sets a cover. Remember the choice; it's a
  preference about how she reads, like the panel widths.
- **The rail carries the lists**: recently opened (three), then the ways in
  (template / folder on disk / import), then New Releases. A list of text
  floating between two grids of pictures looked out of place and was moved here;
  lists belong in the rail. **The ways in outrank release notes** (her call):
  patch notes are not as important as the ways into the app.

  That section was called **Start Something** and is now **Add a Project** (her,
  2026-08-18: it named a mood rather than an errand). The rename is not just
  wording — it also describes what is under it, which today is two entries and
  not three: the template entry has never been built.
- **New world is centred on its own line**, brand left, filter right. It is the
  only bright control on the screen, which answers Q9 without needing a rule.
- **Release notes are three entries, each named by its version**, newest marked.
  One unnamed "what's new" link reads as a single page; three unlabelled
  features read as three pages that don't exist.

**Cover images are load-bearing, not decoration.** This is the one thing the
direction costs: worlds need somewhere to store a cover and a way to set one.
The picture library from 0.3.0 does most of the work already.

**Worlds without a cover get a generated one**, keyed off the id so it is the
same every time. It must be a *real* gradient — at least two distinct hues,
travelling diagonally. One hue with a lighter version of itself over it was
tried and rejected in the strongest available terms. These are deliberately
vibrant; that is the point and it is not up for softening.

**"Muted covers" belongs in appearance settings.** Raised by her as a joke and
kept because it is correct: bright colour is a taste question, and the answer to
a taste question is a setting, not a compromise everybody lives with. One switch
desaturating every cover, off by default, and on automatically for anyone whose
system asks for higher contrast. The accessibility issue is text legibility on
covers, which the scrim under every name already handles — not saturation.

**Shipped 2026-08-19, in Settings → Theme rather than Settings → Lists.** The
distinction the pagination switch drew ("that one is about how a list behaves
rather than how it looks") cuts the other way here — this is entirely about
how covers look, so it sits with Theme/Colours/Fonts/Snippets, not with the
Lists panel that governs pagination and view mode. One boolean, `mutedCovers`,
alongside `theme-store.ts`'s other appearance state, and applied the same way
`applyThemeId`/`applyTextScale` are: a plain setter in `theme-service.ts`
(`applyMutedCovers`) that toggles `[data-muted-covers]` on the document, with
one CSS rule in `start.css` reading it against every place a cover renders —
the grid, the pinned row, the rail's Recently Opened chip, and both spots
inside Manage pins. `grayscale()` alone flattened every cover to the same
lightness; `grayscale(70%) saturate(60%)` keeps enough of the original apart
that two covers still read as two colours, just quiet ones.

**"On automatically for anyone whose system asks for higher contrast" is a
real default to recompute, not a fixed `false`.** `defaultMutedCovers()`
reads `prefers-contrast: more` and is called three places that all mean "the
value nobody has chosen yet": the store's initial state (synchronously — no
settings file has to be read to answer a media query, unlike every other
appearance field), `loadAppearance` when nothing was saved, and "Put
everything back to default", which now resets this alongside theme/fonts/
size/snippets rather than leaving it out of its own reset.

**Section headings are headings.** Badges were tried and are too small to do a
heading's job. Title Case, the display face, ~20px; controls beside them
(Manage pins, Newest first) are pills so they read as pressable.

**Rearranging pins happens in a window, not by dragging the row.** A 150px card
that can scroll out from under the cursor is the worst possible drag target. The
manage window is full-width rows with a grip and a position, and every unpinned
world underneath as covers, so pinning and reordering are one trip. The row
itself carries a permanent dashed "Pin a world" tile — the section stays visible
when nothing is pinned, because a feature that only appears once you know about
it is invisible.

**Borders over artwork are light at low opacity, never flat grey.** Grey next to
a saturated cover goes muddy.

Two things the mocks added that are missing today: the screen names the page you
were last on, not just the world — the app already stores enough to say it — and
it surfaces what changed in the release, which currently ships inside the app
but has to be gone looking for.

The mock lives at `docs/mockups/start-screen.html` for reference while this is
built. Read its labels as saying "project" — it was drawn before the naming
pass and still says "world" on the buttons.

**Built so far (2026-08-18):** the two-column shell, brand and version, the one
centred New Project button, the filter box, the all-projects cover grid with
generated covers and the grid/list toggle, the pages/scroll switch, and the
rail carrying Recently Opened, Add a Project and the cog. Section headings are
Title Case in the display face at 20px, which is a new step in the type scale
rather than the nearest existing one — see `--fs-2xl` in `index.css`.

**The sort control landed 2026-08-19**, as a pill beside the view toggle
holding four orders: newest first, oldest first, and the name both ways. The
mock draws one pill reading "Newest first" and does not say what is inside it;
four is what the data can honestly support — `activeAt` and the name are the
only two things every project has, and each reads in both directions. A
separate "recently opened" was considered and left out because the rail already
carries that list, and an order that duplicates a list three feet away is a
second answer to a question already answered.

**The pinned row and its manage window landed 2026-08-19.** Pins are app
settings rather than project files — which projects sit at the top of *this*
screen is a fact about how she works here, not about the project, and one
handed to someone else has no business arriving pre-pinned.

**A pin is a record, not a bare id, and that is a deliberate softening of "pins
key on the id".** Ids are minted when a project is *opened*, so a project the
scan found and she has never opened has none — and those are exactly the
projects the library was built to surface. A pin therefore stores the id, the
path and the name: the id decides when both sides have one, the path answers
when they do not, and the pin picks up the id the first time the project is
opened. The same fallback `coverFor` already makes, for the same reason.

**The row's column count is measured, and it took shipping the constant to see
why.** A pinned card is a fraction of the row rather than a size of its own, so
the column count is the input to the width rather than the answer to it — which
read like there was nothing to measure, and four across was written down. Four
is only right at about 1280: fullscreen on a 2560 monitor made 565-wide bands
against a card drawn at 245, and the app's minimum window made 150-wide cards
against a fixed 208 height, taller than they are wide. The count is now chosen
to land the card near 245 and the row shares out the remainder, and the card
carries a ratio rather than a height so `cover` always crops a picture the same
way instead of taking the sides off it on one window and the top off it on
another. Two across is the floor. The dashed tile still takes one slot on
whichever page it lands on.

**A row is two lines, and that is what lets the list have columns.** It shipped
as one row across the full width with the name at one end and the date at the
other — readable at about the window the app opens at and nothing else, since
full screen on a 2560 monitor put roughly 2000 pixels between the two. Putting
the location *under* the name (her call, 2026-08-19) is what fixes it rather
than decorating it: the top line is then only a name and a date, so a row can be
narrow, so the list can lay out two, three or four columns of rows instead of
stretching one. A wide single-line row would put the gap straight back however
the middle were filled.

**The date is a fixed track, not `auto`.** An `auto` column is as wide as its
own row's text, so "just now" and "22 hours ago" hand their rows different
column widths and the name beside them starts in a different place on every line
— measured at 355, 361 and 370 for three rows in one column before it was
fixed.

**The Elsewhere flag rides on the location line rather than in a corner.** It
briefly had a column held open for it whether or not it was used — the same
alignment argument as the date — and that column was what kept the date from
reaching the right-hand edge, which is what she saw. Putting it at the front of
the path is the version with no reserved width, and it is also where it belongs:
the flag and the path are the same fact about the same project, and on a cover
it no longer sits over the artwork.

**The rail drags, on the shell's own handle rather than a second mechanism**
(her call, 2026-08-19). It was written as a fixed 232 on the reasoning that its
contents are fixed — a project name and a timestamp — which was right about the
contents and wrong about who decides: a long name ellipsises at 232 whatever the
monitor, and how much of a wide window the pictures deserve against the text is
a reading preference like the panel widths, not a fact. `ResizeHandle` already
does the whole gesture — pointer capture, arrow keys, double-click to reset —
and it took a table of three edges rather than a hard-coded pair to take a
third, so nothing was written twice.

The width is stored beside the shell's two in `panelWidths`, and **the reset
split in two doing it**: a double-click resets what the person can see, and the
two screens never share a window, so one reset reaching across and undoing a
width on the other screen was a bug waiting rather than a feature. 200 to 400,
because the floor is where a recent project's line stops working and the ceiling
is set by what it takes from — the app's minimum window is 900 wide, and 400
still leaves the pinned row the two cards across that is its own floor.

**A project's location is split rather than ellipsised.** The last folder is
kept whole and the middle of the path gives way, because an ellipsis eats the
end — and the end is the only part that tells two projects in different folders
apart. The separator sits on the front of the kept half so a clipped path still
reads as a path.

**New Releases landed in the rail, 2026-08-19 — reusing Settings → Patch
Notes's own data rather than a second parser.** The item as written said "baked
in from the changelog at build time", but that's what `RELEASES.md` already is:
a hand-written, per-version, build-bundled file, parsed by
`release-history.ts`'s `recentReleases`, which Patch Notes already calls
through `useReleaseHistory`. `CHANGELOG.md` is dated, not versioned, and often
holds several days of work still short of a tag — it's the wrong shape for
"three entries by version" regardless of where the plan text pointed. Both
surfaces now read `PATCH_NOTES_VERSION_COUNT` (3) off the same list, so raising
the count moves both together instead of drifting apart.

Clicking a row opens Settings straight to Patch Notes, on the version that was
clicked — not just to the panel, to that tab within it (fixed the same day,
after shipping "always the newest tab" first and hearing that clicking an
older version still landed on the newest). `SettingsModal` took an `initialTab`
prop, and `PatchNotes` its own `initialVersion` — special-cased at the one call
site in `SettingsModal` that renders it, rather than widening `PANELS` to a
props-carrying type for the nine panels that have no "initial" anything to
take. Both default to the first tab / newest version, so the cog and the
top-bar button are untouched. The rail's own `openReleaseVersion` state (a
version or null, not a separate boolean plus a version — no way for the two to
disagree about whether the panel is open) renders its own `SettingsModal`
instance directly rather than routing through `SettingsButton`, which only ever
opens to Theme. Two independent instances rather than one shared one — the same
pattern the cog already uses in two other places.

**The projects-folder line landed in the rail's foot, 2026-08-19 — reusing the
themes/snippets "open in file manager" pattern rather than inventing one.**
`showFolder` (`dialog-service.ts`) already existed for exactly this — Settings
→ Appearance points it at `themesDir`/`snippetsDir` and reports a refusal by
naming the folder. `use-start-actions.ts`'s new `openProjectsFolder` follows
the same shape: `prepareProjectsDir()` first (a fresh install's default folder
is a path nothing has created yet, and handing that straight to the file
manager opens a level up with nothing there to explain why — the same reason
`createProject` calls it), then `showFolder`, with a failure landing in the
screen's one shared error line rather than a new surface.

The row shows the folder itself, not paired with a name the way a project's
own location line is — `describeProjectLocation` drops the last segment
because the line above it already names the project; here there's nothing
above it, so `describeFolderLocation` (`app-settings-service.ts`, sharing the
same "keep the last two segments, ellipsis the rest" core) keeps it. The full
path is the title.

**Covers you set yourself shipped 2026-08-19, as a hover button on the grid
tile (her call, asked directly rather than guessed — a right-click menu and
"only from inside the project" were the other two options on the table).**
That's a real interaction decision `ProjectTile.tsx`'s markup didn't have room
for: the whole tile was one `<button>`, and a button can't nest inside a
button. It's now a `<div>` frame holding two sibling buttons —
`.project-tile-open`, carrying every pixel `.project-tile` itself used to, and
a small corner button for the cover — rather than the frame growing any
visible chrome of its own. Grid view only: a list row's thumbnail is a 44px
chip, too small for a hit target of its own, and list is already the
established view for someone who never sets a cover in the first place (see
"honest view" above).

**One button, two meanings, mirroring `PageBanner`'s existing "add or remove,
never a separate change" shape rather than inventing a third state.** No
cover: the button opens a native file picker and sets one. Cover set: the
same button removes it, back to the generated colour — picking a *different*
picture means removing first. `PageBanner`'s own picker is the in-app
picture library, which only exists for the open project's own assets; nothing
here is open, so this reaches straight for the OS's own dialog instead
(`pickImageFile`, `dialog-service.ts`).

**The cover lives in the world's own `assets/`, addressed by `project.json`'s
new optional `coverImage` field** — same folder page pictures already use,
same UUID-filename convention `setNodeImage` mints for those. Setting one on
a project that almost certainly isn't open can't go through
`loadProject`/`saveProject`'s typed round trip, so `setProjectCoverImage`
(`filesystem-service.ts`) reads `project.json` as a plain object, sets or
deletes just that one key, and writes it back untyped — a field this build's
`Project` type doesn't recognise survives untouched, where the typed round
trip would have silently dropped it on the way back out.

**Reading it back for display gets its own cache, `project-cover-images.ts`,
deliberately not reusing `asset-urls.ts`'s.** That one is cleared by
`releaseAssetUrls()` on every project open/close, which is right for a page's
pictures and wrong here: a cover thumbnail is shown *because* nothing is
open, and clearing it every time she opens any project would mean re-reading
and re-blobbing every other project's cover the next time she's back at the
start screen. `useProjectCoverUrl` wraps it for display; four call sites read
from it — the grid, the pinned row, the rail's Recently Opened chip, and
both spots inside Manage pins — three of which had to grow their own small
subcomponent first, because the hook can't run inside the `.map()` that used
to render them inline.

**The rail now names the page she was last on, landed 2026-08-19.** `selectedId`
was already saved in `project.json` on every selection; naming *what it points
at* from the start screen is the part that didn't exist. Resolving a name from
an id needs the node it belongs to, and node files are found by walking the
tree — the cost `readWorldSummary`'s own doc comment rules out for every world
the folder scan touches. So the name is denormalised: `selectedName` sits next
to `selectedId` in `project.json`, written by the same `applySelection` that
already writes the id, from the node already in memory — no new read, on a
world that's already open, at the moment its selection changes. Two more spots
keep it from going stale mid-session: renaming the page she's currently on
updates the copy in place, and deleting it clears the copy the same way
`selectedId` itself already gets cleared. Read back through
`readWorldSummary`/`WorldFile` alongside `coverImage`, the same shape that
field already uses. Shows in the rail's Recently Opened row only — the grid and
pinned row cover every world in the library, not a short recent list, and nightly
`readWorldSummary` reasoning about that broader read doesn't change just
because one more field got cheap to carry.

### Start from a template

The third entry under Add a Project, and the last thing in the phase. It had
been held back for a design pass rather than for build work: it turned into
*export and import a project template* (her, 2026-08-19), which left open what a
template file holds and what it is. **All three settled 2026-08-20, by her, from
options put to her directly**: folders plus starter pages, one sendable file,
and the start screen only.

**A project template describes a shape; it is not a project copied.** That is
the decision everything else falls out of, and it is what makes this a different
format from the page templates in the Templates tab (which *are* pages, copied,
prose and all — see `TemplateLibrary` in `constants/schema.ts`, and Phase 28's
"Templates as files" for that one's own file format). A `.antpl` holds an id,
a parent, a template key, a name, and — on folders only — a colour and tags.
There is nowhere in the format to put anybody's writing, which is the version of
"nothing of hers travels" that is structural rather than careful.

Three things follow, and all three are the point:

- **The file is legible.** Plain JSON, pretty-printed, not gzipped the way a
  `.lk` is. A `.lk` is gzipped because LegendKeeper made it so; this is ours, it
  is kilobytes, and being openable in Notepad is worth more than the bytes —
  the same promise the project folder itself makes, applied to the thing she
  hands to somebody else.
- **Starter pages arrive current.** Tabs and placeholder prompts are not in the
  file at all; `materializeProjectTemplate` builds them from
  `template-registry.ts` at the moment the template is used. A template written
  a year ago makes pages with today's prompts in them.
- **Nothing can leak in by accident.** A field the type doesn't have cannot be
  exported.

**Export keeps every folder and collapses pages to one blank starter per kind
per parent.** A Characters folder holding forty characters exports as a
Characters folder holding one blank Character; Heroes and Villains each keep
their own, because two folders holding the same kind of page is itself part of
the shape. The kept starter *is* walked into, so nesting habits travel — an
Item parented to a Character is a real part of how somebody works — but forty
characters' worth of them is a copy of the project. Hidden pages and everything
under them stay behind, since `hidden` means held back from anyone the project
is shown to and a template file is the most thoroughly shown-to-someone-else
thing there is. Folder colours and tags travel; a *page's* do not — a red
Antagonists folder is a decision about the structure, a red character is a
decision about that character.

**One template ships, not a menu.** `DEFAULT_PROJECT_TEMPLATE` — Canon with
Characters / Locations / Factions / Species / Events under it, each holding one
blank page of its kind, plus an empty AUs and a Worldbuilding note. It is
deliberately not what New Project makes: those six flat folders are a floor, and
if the two were identical the rail entry would be a second button for the one
beside it. A rank of authored templates would make the shape the app's opinion
rather than hers, and it is also the thing that grows into a gallery, which the
Policy Boundary rules out — **nothing is ever fetched; the exchange is a file
she is handed, the same rule `.lk` import already follows.**

**The window shows the tree it would build, and that is the feature.** A list
of names with a file size beside them makes her create a project to find out
what is in it and then delete it. Templates on the left, what the selected one
builds on the right, side by side rather than stacked because they are a
question and its answer.

**Opened files are listed for the session and not remembered.** A template is a
file on her disk; a remembered list is a second place that fact lives, one that
goes stale the moment the file moves and then has to explain itself.

**Export is on the project's own `⋯` menu, and the save dialog is the naming
step.** No second form asking what to call the template — the file she names is
the name, read back off the path. It sits with the cover, the file manager and
Duplicate rather than among the groups, because those four are things done *to*
a project and everything below the Groups label is filing.

**Reading a project she has never opened mints it an id and writes that back.**
`loadProject`'s doing rather than this action's, and the same write duplicating
already accepts: one field, once per project, and exactly what opening it would
have done. The alternative is a second way to read a project off disk.

**The picker window carries its own busy flag and its own error line**, unlike
everything else on this screen, which shares `use-start-actions`'s. A template
file that won't parse is a thing to say inside the window she is standing in,
not on a line behind it that she has to close the window to read. The parse
failures name what is wrong rather than saying "invalid template" — the likely
causes are all mundane (wrong file, bad download, a newer build's file), and
naming the problem lets her go and ask whoever sent it.

**A hostile or hand-edited file is refused at 500 nodes.** Not a limit on her
projects — the collapse means a 75-page world exports to a couple of dozen
entries — but on what a file she was handed can ask the app to build. A cycle in
the parent wiring produces roots rather than hanging, because parents are only
ever linked to entries already seen.

**Lineage is shown as of 2026-08-20**, on the location line rather than a line
of its own: it is a fact about this project as a folder, the same kind the
Elsewhere flag already reports there, and its own line would cost every project
on the screen height for something most of them have nothing to say about. The
name gives way before the last folder of the path does — that folder is what
tells two same-named projects apart, and two same-named projects is exactly
what a fork produces.

**The fork detector landed 2026-08-20, and one of its rules changed under
measurement.** "Most-recently-modified keeps the id" is wrong: copying a folder
in Windows Explorer preserves the modified time, so at the moment the fork is
made — the moment this has to be right — the two are identical on it. The one
the app has *opened* keeps the id instead. That signal survives a copy, and it
also picks the safer loser: pins, groups and the archive key on the id, so
re-minting the project the app has records for would silently detach all three,
where a copy it has never opened has nothing to lose. Modified time and then
the path settle it after that, and the path tie-break is load-bearing — without
a total order the same pair could resolve one way on one scan and the other way
on the next, re-minting each other forever.

**Duplicating landed 2026-08-20, in the project's own `⋯` menu.** The copy goes
beside the original, because that is where a copy made in a file manager would
land and so where she will look for it. A name that is already taken is refused
rather than suffixed: a fork is named for what it is *for* ("Val v6"), and a
`(2)` chosen by the app is a name she then has to go and fix. The source is
minted an id first if it hasn't got one — a write to a project she didn't ask
to change, and the same write opening it would make, without which a fork of a
never-opened project records no parent, and those are exactly the projects the
library exists to surface. A copy that fails partway is left on disk and named
in the error rather than cleaned up: a folder with some of her project in it is
worth more than a tidy failure.

### Second instance

Verified 2026-08-14: two copies of the app run side by side, each with a real
window; nothing blocks it. The trap is that both auto-open the last-opened
world, so the default path puts two autosaving copies on the same files.

`StartupRouter.tsx` already falls through to the picker whenever the last world
can't be opened. Extend that: a world already open elsewhere isn't auto-opened,
and the picker shows it as open rather than letting it be chosen. A marker file
in the world's folder naming the holding process, treated as stale when that
process is gone, so a crash doesn't lock her out of her own world. Check it on
every open, not only at startup, or the picker is still a way in.

**Landed 2026-08-20, with the marker naming a *session* rather than a process.**
"Treated as stale when that process is gone" needs to ask the OS whether a pid
is alive, which needs a Rust command — and CLAUDE.md says not to add one for a
job the fs plugin can do. So the marker says it is alive instead of being asked:
it carries the time it was last written, the holder rewrites it every 30
seconds while the project is open, and anything that stops running stops
rewriting. Past two minutes it belongs to nobody. The refresh interval is set
against her projects living in OneDrive — one ~100 byte file, one project at a
time — and the stale window against what a crash costs, which is a wait rather
than a file to delete by hand.

The marker is `.anamnesis-open.json` in the project root, skipped by the load
walk beside `project.json` and the two node markers, and skipped again when a
project is duplicated: a copy is not open, and carrying a live claim into it
would make the app refuse to open the thing she just made.

This is the cheap 80% of Phase 21's "open in new window" and does not replace
it. Worlds genuinely side by side in one window — tabs across worlds, dragging
a page from one to another — remains Phase 21's job and is a rewrite of a
2,300-line store built around there being exactly one world. Both reference
apps she pointed at (LegendKeeper, Obsidian) do the window version, not the tab
version; LegendKeeper gets it free from being a website.

### Folder layout

`themes/` and `snippets/` sit beside the worlds in the projects folder, which
is deliberate — a theme belongs to no single world — but leaves worlds and app
data indistinguishable, and nothing stops a world being named `themes` and
quietly collecting stylesheets.

`Projects/` underneath the projects folder; `themes/` and `snippets/` stay
where they are. **No migrator** (her call, 2026-08-14): worlds open by absolute
path, so moving them by hand costs nothing but re-opening each once, and she
has two real worlds and one other user. Once ids and the scan exist, a moved
world is re-found rather than lost from the recent list. Reserve `themes` and
`snippets` as world names regardless of layout.

**Landed 2026-08-20, and it changes where the *next* world goes rather than
where any world lives.** Creating and importing both write into `Projects/`;
the scan already reached two levels, so a world at the old level is still
found, still opens and still keeps its place in the recent list, with nothing
to migrate. Two folders are now different questions with different callers:
`prepareProjectsDir` is the one she picked, which holds `themes/`, `snippets/`
and this, and is what Settings → Projects points at; `prepareNewProjectsDir` is
the container, and is what creating, importing and the rail's folder button
mean.

**`Projects` is reserved as a world name but is *not* skipped by the scan** —
skipping it would hide every world inside it, which is the failure this folder
exists to prevent, inverted. The reservation is enforced where a world is made
rather than only described: a world by that name where the container sits would
be found by the scan and never walked into.

---

## Phase 18a — The Block Canvas ✅ Shipped 2026-08-21

The right-hand panel stopped being a fixed picture slot, then properties, then
tags, and became an ordered list of blocks with nothing outside it. Scoped in
PRs #237 and #238 the same day; her calls throughout, taken from the reference
screenshot of a creature template she supplied.

### What shipped

- **`Block` on `Node`**, an ordered list. Five kinds in 18a: `image`, `tags`,
  `property`, `text`, `link`. Each record holds presentation — `title`,
  `showTitle`, `color` — plus a pointer where it points.
- **`block-service.ts`**, the pure half: derivation for pages that predate the
  field, template seeds, move, duplicate, the unshown-property list, and
  `withField`. 24 tests.
- **Nine store actions**, one per operation rather than a single "write the
  array" setter, so Phase 19's panel undo has something to name.
- **`src/components/blocks/`** — `BlockPanel` replacing `PropertiesPanel`, plus
  `BlockShell`, `BlockMenu`, `AddBlockMenu`, `TextBlock`, `LinkBlock`.
- **Every property field's label row became conditional**, because the shell
  draws the heading now and two of them is one too many.

### Rebuilt the same day, against the reference

The first cut shipped one reading per block, a draggable dot on the fill, a
2px colour rule down the block's edge, and two number boxes standing under
every meter. She sent five screenshots of the reference and none of those
four survived.

- **A block holds a list of readings.** The reference puts four dials under
  one GAUGE heading, each with an icon, a name and its own numbers — which is
  what a character's stats are. `Block.meters` is that list; `migrateBlocks`
  lifts a block written before it into a list of one.
- **Add meter / Show text / Show max live in the block's own `⋯` menu**, and
  a reading is removed by the × in its caption. `BlockMenu` grows an optional
  `meter` group the same way it already grows `onDeleteProperty` — one menu
  per block, not a second menu inside the first.
- **The handle is gone; hovering previews instead.** Her words for the dot
  were that it reads as furniture, and that the semicircle's slid off the end
  of the arc — both true. The reference shows the value you would get under
  the cursor, dimmed and pulsing, and commits on click. That is now what every
  shape does, dragging included, with the pulse dropped under
  `prefers-reduced-motion`.
- **A coloured block is coloured.** The wash covers the whole shell and the
  heading takes the hue, which is what "block colour" meant to her. The
  heading's colour is written inline by `BlockShell` rather than from a
  stylesheet — see the note in handoff.
- **The two standing number boxes are gone.** They were `NumberProperty`,
  whose input carries a negative margin so its text lines up in a column, and
  in a tight row that margin hung the focus box out over the meter above it —
  which is the misalignment she photographed. The readout is the control now:
  it shows what the reference shows and opens into a value/maximum pair when
  clicked.
- **The pip cap went from 20 to 200.** Twenty was a guess about what stays
  countable; her reference draws seventy-six tokens in a wrapped grid and
  reads fine. The cap now exists only to stop a typed 5000.

### A fourth pass — the same bug in the blocks 18c hadn't touched

- **Three blocks had two names.** 18c fixed the meter and left the collection
  block drawing a source pill and the image block drawing an "Image" label,
  both directly under a heading that already said it. The source moved into
  the block menu with a tick on the current one; the image label is gone.
- **"Tagged" wasn't a name anything else used.** The source labels now come
  from `constants/collection-sources.ts`, which is also what Add Block reads,
  so a block added as a Tag index calls itself a Tag index.
- **Pages inside a collection were drawn in `--color-accent`** — the 15% tint,
  the same trap as the import progress bar — which is why they were, in her
  words, impossible to see.
- **All three dial faces looked identical on a meter with no icon**, because
  asking for the icon fell back to the number. It draws an empty slot instead,
  and that slot is the button that picks an icon — which also answers "the
  icon inside the dial should be clickable".
- **A long name stretched its dial's column** and pushed the layout off
  centre. `field-sizing: content` was doing that; the name is capped and
  ellipsised now.
- **A page's icon is clickable in the header.** The tree's menu still does a
  whole selection at once, which is what it is for.

### And a third pass, from ten more screenshots

- **Half the taps on a token pool did nothing** — the pips container holds
  pointer capture so a drag can cross them, and capture retargets the click
  that follows to the container, so a per-pip `onClick` only fired when press
  and release agreed. Pips commit on `pointerdown` now, like every other shape.
- **The preview was painted over the fill** when lowering, in the track's
  colour, which left a ragged second edge on an arc. The fill stops at
  whichever is lower and the difference is one pulsing band.
- **A lone dial sat against the left edge**, because the arcs laid out in a
  two-column grid. Flex-wrap with `justify-content: center` puts one in the
  middle and keeps two side by side.
- **The icon picker was a few hundred icons and the reference has thousands.**
  `glyph-catalogue.ts` now takes all of Lucide — 1,864 after dropping the
  `LucideX`/`XIcon` aliases — with the curated groups still first and the rest
  revealed a screenful at a time. Costs ~550KB in the main chunk (1.89MB →
  2.44MB, measured).
- **A page's icon only reached its tree row.** `NodeIcon` resolves it for the
  tree, the page title and a folder's empty state alike.
- **Eleven pastels, no custom colour.** Twenty-four in three weights, plus an
  `<input type="color">` styled as one more swatch, in a grid shared by the
  block menu and the tree's picker — which had been two different controls
  disagreeing about how many colours exist. `getPaletteHex` reads a raw hex.
- **Three faces and segments**, both from her screenshots: a dial shows its
  number, its icon or both, and can be drawn as segments rather than a sweep.
- **A dial with its icon inside was repeating it beside the name**, and the
  block menu was long enough to need scrolling. Both trimmed.

### And rebuilt again, from five more screenshots

The same day, after the pass above. Her comparison was that ours was
embarrassing next to the reference's, and the specifics were all fair.

- **Two names for one section.** The block drew its own heading and then
  repeated the shape underneath it. The heading is the shape now, in the top
  left where the reference puts it, and the shape moved into the block's menu
  as a grid of six pictures — which is how you pick between things that differ
  by how they look.
- **The colour stopped at an invisible edge.** `.properties-panel` had the
  padding, so a coloured block was a box floating in a gutter. The padding
  moved onto the blocks; the panel has none. The drag grip moved into that
  gutter at the same time, since in the flow it pushed every heading ~18px
  right of the content under it.
- **The preview only worked upwards.** Aiming below a meter's value previewed
  nothing, because the real fill covers the promise — so lowering was a blind
  click. There is now a second preview drawn *over* the fill for the part that
  would be removed, in all three shapes.
- **Right-click did nothing on a block**, so the webview answered instead.
  `BlockShell` opens the same menu at the pointer now, and reads
  `data-meter-id` off the target so right-clicking one reading can offer to
  duplicate or delete that one.
- **The icon picker existed for meters and not for pages**, which was half of
  what `docs/ideas.md` wanted it for. `Node.icon`, `setNodeIcon` (list-taking,
  like `setNodeColor`) and Set icon in the tree's menu close that half. A
  page's own icon replaces its template's; absent keeps the template's, which
  is what every page had before.
- **Right-clicking a page dragged you onto it** — `openMenu` called
  `node.select()`, and selecting is navigating. Removed; nothing needed it.

**Not built, and scoped instead:** blocks that can be dragged into the middle
of the page and resized there, which is `docs/plan.md` Phase 19.5. It is a
feature with a data-model decision in it rather than a fix, and folding it into
this change would have made an already large one unreviewable.

### Dragging, added the same day

The first cut set a meter by typing into a box, with the shapes display-only.
Her reaction on seeing it was immediate and correct — being stuck typing
numbers into a widget whose whole point is that you can see it is tedious — so
dragging went in before the PR was merged rather than being queued.

- **Every shape is a slider.** A bar drags along its track, the three dials
  drag round their sweep, and stars and tokens set the level the pointer
  sweeps across. `arcFractionAt` is the inverse of the geometry that draws
  them, so the drawing and the dragging cannot disagree.
- **A point in a dial's gap snaps to the nearer end.** A gauge has 90 degrees
  of nothing at the bottom; reading a drag that overshoots the full end as
  "none of it" empties the meter at the exact moment you fill it.
- **Dragging rounds to whole units, and the boxes stay** for the numbers a drag
  can't land on. The gesture is coarse by design; the precise path is right
  underneath it.
- **`role="slider"` and the arrow keys**, since it is one now — Page Up/Down
  for ten, Home and End for the ends. A hundred presses to cross a bar is not
  a keyboard path.
- **Whether a drag is running is a ref, not `hasPointerCapture`.** Written the
  tidy way first, and in the probe the bar took the initial press and then
  ignored every move — capture can be refused or lost without the gesture
  ending, and the failure mode is a meter that simply doesn't drag. The ref is
  closed out by `event.buttons` instead.
- **A pip drag consumes its trailing click.** Otherwise a drag that ends where
  it started fires the toggle and clears a rating that was only being adjusted.

### Decisions worth the record

- **Everything is a block, including the picture and the properties**, and a
  page with no template starts with an empty panel. Hers, 2026-08-21. The
  version with the fewest rules in it.
- **Templates seed their own blocks** rather than everything starting empty —
  also hers, from the reference screenshot, where a creature template arrives
  carrying an image, a link, two text fields and tags. `template-registry`'s
  existing `properties` array became that seed rather than a second list to
  keep in step with it.
- **Token Pool survived being questioned as a D&D artefact** and is scheduled
  for 18c, because Rating is the same widget underneath and counted-in-units is
  ordinary worldbuilding.

### How the migration was made safe

Derivation on read, not a pass over the disk — `customProperties`' precedent.
A node with no `blocks` field renders a list rebuilt from what it already had,
in the order `orderProperties` already resolved to, so an existing world looks
untouched and stays untouched on disk until something is actually edited. The
first edit through any block action materialises the list and applies the
change on top of it; that ordering lives in one place (`editBlocks`) precisely
so no action can get it wrong.

The distinction that makes it work is that **absent and empty mean different
things** — absent is "never had blocks", empty is "deliberately nothing", which
is what a blank new page now is. `createNode` therefore always writes the
field.

### Verification

`pnpm lint` clean, `pnpm build` clean, `pnpm test` 1231 passing with 26 new
ones covering derivation, the absent/empty distinction, the template seeds and
every pure edit.

**The unit suite was green and the feature was still broken twice.** Both were
found by mounting the real panel in a throwaway probe (`probe.html` plus
`src/probe.tsx`, deleted afterwards) with three seeded pages — one pre-18a page
with no `blocks` field, one from a template, one blank.

1. **Pages from `project-template.ts` arrived with empty sidebars.** It builds
   nodes through `createNode`, which defaults `blocks` to `[]` — an authored
   empty list, which is the *blank page* answer, not the template one. Every
   page in a project started from a template would have had a blank panel. It
   seeds properly now.
2. **Every edit to a pre-18a page silently did nothing.** Derived blocks were
   minted with `crypto.randomUUID()`, so the list the panel rendered and the
   list `editBlocks` re-derived shared no ids at all. Derived ids are now named
   after what they point at; see handoff's `derivedId` note, and the two
   regression tests.

Verified afterwards in the probe: the derived panel matches the old one field
for field, a template page seeds, a blank page is empty, No title hides a
heading without touching its field, Remove takes a property off the panel and
Add Block offers it straight back, and Move up reorders a derived list.

---

## Phase 18b — The Index ✅ Shipped 2026-08-21

Backlinks, tag index, subpage index and manual links, as **one collection block
with a switchable source** — plus aliases, which are an edge into the same
index. Scoped in PR #246 the same day, from two screenshots she sent while
trying to work out why the reference's Backlinks block was empty.

### What shipped

- **`link-index.ts`**, the whole of it: outgoing edges per page, the project
  index (mentions, children, tags), and `pagesWithAnyTag`. 16 tests.
- **`collection` block** with four sources, `alias` block, `Node.aliases`, four
  store actions, `use-link-index`.
- **The 18a `link` block migrated** to `collection` + `source: "manual"` on
  read, so the one page in her world carrying one kept working.
- **Aliases wired through** `wikilink.ts` and `search-service`, with the search
  row naming the alias that matched.

### Decisions worth the record

- **One block, four sources, four menu names.** Her screenshots showed the
  reference offers Backlinks / Tag Index / Subpages / Manual Links as separate
  menu entries that all open the same *Collection source* picker. That is
  strictly better than our planned three block types plus a link block, and it
  is what the plan had already worked out underneath.
- **A mention counts from prose, from a reference property, and from a manual
  list** — mine, flagged as mine. A page listing this one under Friends is
  pointing at it as hard as a sentence would. Each row says which kind it was,
  because a list that cannot explain itself is the exact failure that started
  the phase.
- Her calls: direct children only, tags chosen on the block, search names the
  matching alias.

### The failure this phase came out of

She typed `[[ragatha]]` on the *gangle* page in the reference. It created a
**second page called ragatha as a child of gangle** and linked to that, leaving
her existing ragatha untouched — so its Backlinks block was correct and
useless. Ours cannot do that: `resolveWikilinks` never creates anything, and
only resolves an unambiguous name. What it *did* do was fail silently on an
ambiguous one, which is the same class of problem; that is written up in the
plan as work this phase did not close.

### Verification

`pnpm lint`, `pnpm build` and `pnpm test` (1247, 16 new) all clean.

Then driven in a throwaway probe reproducing her exact case — two `@ragatha`
mentions on one page, a Friends property pointing at the same page from
another, a child page, a shared tag, and an 18a link block:

- Backlinks showed **gangle once**, not twice, and **jax labelled "Friends"**.
- Subpages showed only the direct child; the tag collection showed the other
  tagged page and excluded the page it was on.
- Switching a collection from Subpages to Backlinks re-resolved it and its
  heading followed.
- The 18a link block arrived as a Manual links collection.
- Adding an alias worked, and the existing one rendered.

---

## Phase 18c — Meters ✅ Shipped 2026-08-21

Six meters — Progress bar, Circle, Semi-circle, Gauge, Rating, Token pool — as
**one `meter` block with a switchable shape**, closing Phase 18. The plan's own
framing turned out to be the design: two value models, and the six shapes are
presentation over them.

### What shipped

- **`meter-service.ts`** — the defaulting, the clamping, the pip-click rules,
  the SVG arc geometry and its inverse (a pointer position back to a value),
  pure and unit-tested. 39 tests.
- **`meter` block kind** with `meter` / `value` / `max` on `Block`, and three
  store actions (`setBlockMeter`, `setBlockValue`, `setBlockMax`).
- **`MeterBlock.tsx`** — the six renderings, the shape picker, the list of
  readings, pointing and dragging on every shape, and the click-to-edit
  numbers.
- **`constants/glyphs.ts`, `constants/emoji.ts` and `IconPicker.tsx`** — the
  icon picker `docs/ideas.md` has wanted since 2026-08-18, built here because a
  meter needs an icon and written to know nothing about meters.
- **Six entries in Add Block** under a Meters heading, all creating the same
  block with a different shape.

### Decisions worth the record

- **Six menu entries, one block kind.** The same shape the collection block
  settled on in 18b: nobody adding a rating wants to add a progress bar and
  then hunt for the setting, but a bar that should have been a gauge should
  not have to be deleted and rebuilt either.
- **The number survives every shape change; the maximum does not survive a
  change of *model*.** Redrawing a bar as a gauge is the same fact drawn
  differently, so everything stays. Turning a bar that reads against 200 into
  a rating would otherwise hand her twenty stars to click, so the maximum is
  dropped and the value kept.
- **Clamping happens on read, never on write.** A rating dropped from ten pips
  to three still stores the 8 it had, and shows 3; putting the ten back brings
  the 8 back. Storing the clamped number instead would destroy it silently.
- **Nothing default is written.** A meter with a value and no maximum is three
  keys of JSON — `withField` drops anything undefined, the way 18a set up.
- **Meters take the block colour rather than owning one.** The `⋯` menu's
  palette was already there from 18a, so a purple influence bar needed no new
  UI at all. The one trap was which token to fall back to: `--color-accent` is
  a 15% tint, and a meter drawn in it is invisible — see `--color-accent-light`
  in the CSS.
- **Token Pool stayed in**, questioned the same day as a D&D artefact. Once
  Rating exists the two are one widget differing by a single click rule, and
  counting whole units is ordinary worldbuilding: spell charges, rations,
  favours owed, ammunition.
- **No YouTube, Spotify or map embeds**, carried from the Phase 18 scope and
  still standing. Her reason on 2026-07-31 was aesthetic rather than the
  offline policy, which she has never personally agreed with — so if embeds
  come back it is a conversation to have with her, not a line to quietly cross.

### Verification

`pnpm lint`, `pnpm test` (1311, 52 new), `tsc --noEmit` and `pnpm build` all clean.

Then driven in a throwaway probe mounting the real `BlockPanel`, because a unit
suite cannot see a sidebar:

- All six added from the menu and rendered — bar, three arcs with their own
  viewBoxes, and two rows of five pips.
- Typing 75 into a bar filled it to 75% and read "75%"; a circle at 40 drew a
  single arc and a full ring drew as two.
- Rating: clicking the third star set 3, clicking it again cleared to 0,
  clicking the fourth set 4. Token pool: filling to 5 then clicking the third
  token spent down to 2.
- Raising a rating to 10 drew ten pips; switching that block to a bar kept the
  value, dropped the maximum back to 100, and redrew as 4%.
- Colouring the block purple turned the fill `#c4b5fd`; an uncoloured arc drew
  in the bold teal, not the invisible tint.
- The stored blocks came out as `{ kind, meter, value }` with no defaults, and
  the console stayed clean throughout.

Then again for dragging, driving real pointer sequences at the real panel:

- A bar took a press at a quarter, followed a drag to 80%, clamped an
  overshoot to 100%, and ignored a pointer moving over it after release.
- A gauge pressed at half read 50%, dragged to three-quarters read 75%, and a
  drag past the full end into the gap read 100% rather than 0.
- A circle dragged from a quarter to 60% and stayed a single arc.
- Stars: dragging across to the fifth set five and the click that ended the
  drag was swallowed; clicking a star straight afterwards still toggled
  normally; dragging back down lowered it.
- Keyboard on a focused bar: arrow 1, Page Up 10, End full, Home empty, with
  `role="slider"` and the aria values present.

And a third time after the rebuild:

- Four gauges added from the block menu laid out two across and stored as a
  clean four-entry list.
- The icon picker: 145 glyphs in seven groups, "health" narrowing to the
  heart, an emoji found by keyword and stored as the character itself, drawn
  back as text, and cleared through No icon.
- Hovering an arc drew a pending path and left the stored value untouched;
  clicking committed it; a real mouse-out cleared the preview.
- Show text removed the four name boxes and stored `showText: false`; Show max
  turned `60%` into `60`; turning either back on removed the field again.
- Readings removed one at a time down to the last, which keeps no × and leaves
  the block empty rather than refilling itself.
- A token pool set to 45 of 76 through the click-to-edit numbers drew 76 pips
  with 45 filled.
- Colouring a block purple washed the shell and put `#c4b5fd` on the heading.

**Computed styles could not be trusted in this probe** — the browser pane was
hidden, so the page stopped compositing and even an inline `!important` colour
failed to show up in `getComputedStyle`. Structure, stored state and event
behaviour were all still readable and are what the checks above rest on. It is
also why the heading's colour is set inline rather than left to a cascade that
could not be measured.

---

## Pie charts, and segments per meter ✅ Shipped 2026-08-21

Two follow-ons to 18c, asked for together the day after it shipped and built
as one change because she did not want to come back to meters a third time.

**The pie chart could not have slices.** 18c drew every reading as its own
shape, which is right for the five shapes that measure one number against its
own maximum and wrong for the one shape whose entire meaning is how several
numbers divide a whole — a Pie chart block with four readings drew four
separate pies. Her words were that having slices is the whole point of a pie
chart, and she was right; what shipped was a circle wearing a chart's name.

### What shipped

- **A pie block holding two or more readings composes them into one circle.**
  `pieSlices` in `meter-service.ts` turns the readings into wedges, each sized
  by its share of their total, laid out clockwise from twelve o'clock.
- **Dragging the edge between two slices.** `boundaryIndexAt` finds the edge
  being aimed at, `dragSliceBoundary` works out what the pair either side
  becomes. Pure and tested; the component only converts pointer pixels into
  the 100-wide box the chart is drawn in, the same way the arcs already did.
- **A legend**, one row per slice — swatch, icon, name, number, share, remove.
  A pie cannot carry a caption inside itself the way a dial can.
- **`MeterEntry.segmented`**, and `meterSegmented` to resolve it against the
  block's. The menu row writes to the reading when it was opened on one and to
  the block when it came from the `⋯` button, which is exactly how the colour
  above it already worked.
- **`editMeters`** in the store, and `withMeters` beside `withMeter` — one
  write for the two readings a boundary drag changes.
- **`SLICE_COLORS` and `sliceColorAt`** in `constants/palette.ts`.
- **`MeterIconButton` and `MeterNumberField`** pulled out of the caption, so
  the legend, the caption and the inside of a dial share one implementation of
  the icon popover and one of click-the-number-to-type-it. Three copies of that
  draft-state dance was the alternative.

### Decisions worth the record

- **A pie with one reading still reads against its maximum.** One number can
  only be a share of itself, so composing it would draw a full circle and say
  less than the wedge it replaced — and it would silently change every pie
  already on disk. Two readings is where composition starts, which is also the
  first moment it can mean anything.
- **A slice does not read through `meterValue`.** That clamps against the
  maximum, which defaults to 100, so a pie of populations — 5000 against 3000 —
  would have come back as two equal halves both flattened to the default. Only
  a slice's size relative to the others matters, so `sliceValue` reads raw.
- **Nothing was migrated and nothing is lost.** `max` stays on disk untouched
  while a pie ignores it, so switching a composed pie to a Circle brings every
  reading's maximum back with it.
- **A boundary drag preserves the pair's total.** Growing one slice takes from
  the slice after it and from nowhere else. Rescaling everything to keep the
  circle full was the alternative and it rewrites numbers nobody pointed at.
- **Twelve o'clock is not draggable.** With `n` slices there are `n - 1` edges.
  A chart whose origin can be moved is one where touching a single slice
  appears to move all of them.
- **An untyped pie draws equal slices, and the first press writes them down.**
  Three empty readings are three thirds waiting to be dragged; three
  zero-width slices are a blank circle and a bug report. Nothing is stored
  until she actually moves an edge, so a pie she only looked at stays empty.
- **A slice takes the next colour along a list rather than the block's.** This
  is the one meter that does not fall back to the block colour: eight wedges
  in one accent is a solid disc. Picking a colour on the reading still wins.
- **Show max becomes Show share on a pie.** A pie has no maximum to show, and
  the toggle is doing the same job either way — whether the number gets its
  context printed beside it. A renamed row beats a dead one and a new field.
- **The gap of a segmented pie comes out of what is drawn, never out of the
  angles.** `PieSlice` carries both, so a segmented pie answers clicks over its
  gaps instead of having thin dead stripes in it.

### Verification

`pnpm lint`, `pnpm test` (1361, 31 new), `tsc --noEmit` all clean.

Then driven in a throwaway probe mounting the real `MeterBlock`, since none of
this is visible to a unit suite:

- Three readings at 30/10/60 drew **one** SVG with three wedges, shares
  30/10/60, three different default colours, each slice starting exactly where
  the last ended, and the 60% one carrying the large-arc flag.
- Hovering an edge set the aiming class and drew the handle. Pressing and
  dragging the first edge from 30% to 35% gave 35 and 5 — pair total kept at
  40, the third reading untouched at 60. Overshooting it round the circle gave
  40 and nothing, still leaving the third alone.
- Blanking all three drew three equal slices with **nothing stored**, and the
  legend hid the percentages rather than printing a share of nothing. The first
  press seeded 33/33/33; dragging then gave 41/25/33, pair preserved again.
- Removing readings down to one fell back to the old single wedge —
  `block-meter-pie-fill` over `block-meter-pie-track`, one `block-meter-reading`
  — proving no pie already made changes.
- Regression on the refactor: switching to Gauge drew three arcs with their
  readouts; clicking one opened the input and typing `44/88` set value and
  maximum on that reading alone. The icon button in a legend row opened the
  picker, portalled to `document.body` as `tree-popover`.

Colours and boxes were not measured — the pane was hidden, which makes
`getComputedStyle` stale. Everything above is structure, geometry read off the
path data, and stored state, all of which stay trustworthy there.

---

## Pie labels, and four things in the way ✅ Shipped 2026-08-22

All four reported from use within an hour of the pie landing, plus one more
that arrived mid-build.

### What shipped

- **Slice labels and a hover readout.** `MIN_LABEL_SHARE` (7%) decides which
  slices can hold their own percentage; `sliceLabelPoint` puts it two thirds of
  the way out along the wedge's middle line. Everything thinner is answered by
  a fixed-height line above the chart naming whatever is under the pointer —
  her own suggestion, and the right one, because a 2% sliver cannot hold text
  at any size. `readableTextOn` in `palette.ts` picks black or white per slice
  by WCAG relative luminance, since the palette runs from `#fcd34d` to `#3730a3`.
- **A `+` in the panel.** `+ Add slice` under the pie's legend and `+ Add meter`
  under every other reading list. Add meter existed only in the block's `⋯`
  menu, and nothing pointed at it.
- **The number field hugs its number.** It filled its `foreignObject`, which is
  64 of the 100 units a dial is drawn in, so clicking to type opened a box
  nearly as wide as the chart. Now `3ch + 14px` at minimum, growing with what
  is typed, centred by a new `block-meter-arc-slot`.
- **The template prompt got its gap back and an ×.** Phase 18a moved the
  panel's padding onto its blocks, which left the prompt flush under the title
  bar. `hideTemplatePrompt` on `Node` remembers the dismissal per page.
- **Add Block carries Apply a template** on a blank page — built first, because
  that prompt was the only route to applying a template to an existing page and
  dismissing it would otherwise have stranded the page.
- **`updateNode` grew `{ touch: false }`**, so dismissing the prompt does not
  print a new "Updated" date on a page nobody edited.

### Verification

`pnpm lint`, `pnpm test` (1366, 5 new), `tsc --noEmit` and `pnpm build` clean.

Driven in the probe again, on 30 / 3 / 67 so one slice is deliberately too thin
to label:

- The 30% and 67% slices carried their percentages in `#11111a`; the 3% one
  carried none, which is the threshold doing its job.
- Idle, the line above the chart read "100 in total". Pointing at the sliver
  read "Demonic AU 3 3%" — the case the whole feature exists for.
- The `+` read "Add slice" under the pie and "Add meter" under a gauge.
- The number field: the dial is 88px, the field 36px for "30%" (was a fixed
  ~56px, 64% of the dial), growing to 56px while typing "30/1000".

**The template prompt was not driven in the app.** Mounting `BlockPanel` needs a
loaded project, which the probe route cannot give it, and her window was mid-use
so the CDP bridge was not worth a relaunch. The cause was read directly out of
the CSS — `.block-panel { padding: 0 }` against a prompt with only left and
right margins — and the fix is a margin plus an absolutely positioned button.
The dismissal's persistence is covered by types and by `updateNode` writing the
whole node, but was not watched happening.

### Then two more, from the next screenshots

- **Enter did nothing in a meter's name field.** Worth recording that there was
  no data bug here at all: the name is written on every keystroke and always
  was, so what she was reading as "it didn't save" was the complete absence of
  feedback — the field kept focus and nothing on screen moved. `leaveOnEnter`
  blurs on Enter and on Escape, which is what the number beside it already did.
  Escape does not restore the old name, for the same reason the number does
  not: the edit has already landed, and undo is what takes one back.
- **The `+` was rendering on a line above its label.** `.block-inline-link` set
  no `display`, so the button was block-level and its icon and words were two
  runs of inline content that wrapped the moment anything narrowed it. Now an
  `inline-flex` row with `gap`, `white-space: nowrap` and `flex: none`, which
  also fixes the two collection buttons that share the class.

Measured in the probe across pie, gauge, bar and rating: the button went from
29px tall (two lines) to 17px with the icon on the same line, left of the text
and centred in its list. Enter and Escape both leave the name field on the
legend row and on a bar's caption, with the typed name still stored.

---

## Spectrum meters ✅ Shipped 2026-08-25

The last thing left in Queued Adjustments from the 18c run, asked for
2026-08-22 by one of her co-writers: `nonchalant ——x———— emotional`, a meter
where the only thing that matters is where the marker sits between two named
ends. A character-sheet idea rather than a statistic one.

Her two calls before building, given as a numbered pair:

1. **A shape of its own, not a setting on the bar.** The same answer 18c gave
   for the six that shipped — one menu entry per shape, because nobody adding a
   rating wants to add a bar and then hunt for the setting.
2. **The reading's name above, the two words under the ends they belong to.**

### What shipped

- **`"spectrum"` in `MeterStyle`**, and a row in `METER_STYLES` directly after
  Progress bar. That constant is read by three places — the block heading, the
  shape grid in the block's menu, and Add Block's Meters group — so registering
  it there is the whole of putting it in the UI. The icon is lucide's
  `GitCommitHorizontal`, which is literally a dot on a line.
- **`MeterEntry.startLabel` and `.endLabel`.** On the reading, not the block:
  one block holds several of these and each is its own axis, so calm/furious
  and shy/bold under one heading is the ordinary case. Inert but preserved on
  every other shape.
- **A render branch in `MeterReading`**, above the bar's. It reuses the bar
  wholesale — `track` ref, `barValueAt`, `capture`/`aim`/`commit`, `handleKey`
  — and changes only what is drawn: a rail with a line in it, a marker, the two
  end fields, and no number.
- **`isSpectrum`, `spectrumReadout`, `newMeterFor`** in `meter-service`, with
  tests. `spectrumReadout` is `aria-valuetext`: the percentage alone is the one
  thing the shape does not mean, so the words carry it.
- **`newMeterFor(style)` replaces `newMeterEntry()` at both creation sites** in
  the store (`addBlock`'s seed and `addMeter`), which is what puts a new
  spectrum at its midpoint and leaves every other shape starting empty.
- **Show max is not offered on a spectrum** in `BlockMenu`; Show text stays,
  because it hides the reading's *name* and the two end words are not that.

### Decisions worth the record

- **The marker travels the line minus its own width.** `markerAt` writes a
  `calc()` against `--spectrum-marker`, so the dot at either extreme sits
  inside the end of the line rather than hanging half of itself off it. It
  costs up to half a marker of accuracy against the pointer at the very ends,
  which is what every slider ever built does, and it is what stops the dot
  colliding with the edge of the panel. The pale preview marker is positioned
  on the same 13px so the two stay concentric.
- **Segmented reuses the bar's mask** rather than inventing notch geometry, so
  a spectrum ticked into steps reads as the same setting doing the same thing.
- **Each spectrum sits on its own card**, which the first cut did not do and
  which she rejected on sight: three of them stacked is three rows of *words*
  each, and the ends of one read as belonging to the name below it. Two lighter
  treatments were drawn beside it — a divider line between readings, and
  putting the track itself on a pill — and neither groups the words the way a
  card does. The line inside a card is `--color-border`, since the card wears
  the colour the line used to.
- **The midpoint is a stored 50.** See `handoff.md` — the inferred version
  breaks on the first drag to the left end.
- **Not widened into custom labels for the other shapes**, which the plan
  explicitly warned against. `startLabel`/`endLabel` are read by the spectrum
  branch and nowhere else.

### Verification

`tsc --noEmit`, `pnpm lint`, `pnpm build` and `pnpm test` (1375 tests, 56
files) all clean, with 9 new tests covering `isSpectrum`, `spectrumReadout`
in its four states, and `newMeterFor` for both the seeded and unseeded shapes.

The layout was checked in a headless Chromium against the real `blocks.css`,
since components have no test setup and `pnpm dev` cannot open a project in a
browser — the fs plugin is not there. A static page carrying the exact markup
of the branch was served from `public/` and screenshotted at 2x: caption above,
rail, ends row at the extremes, the segmented variant, and the preview marker
beside the real one. The first pass is what caught the marker hanging off the
end at 0% and 100%, which is why `markerAt` exists.

---

## A harness that drives the app ✅ Shipped 2026-08-26

**The largest gap on the list that came out of reviewing MKP-Lorebook-Builder.**
The test world (PR #279) was built as groundwork for this and then nothing used
it: the app could be driven — `pnpm electron:inspect` opens a debug port, which
is how the tree-scroll bug was diagnosed — but none of it was written down,
reusable or repeatable, and none of it ran anywhere but by hand.

### What it is

`pnpm test:app` builds the page for Electron and runs the scenarios in `e2e/`
against the real app. Playwright's `_electron` starts it, a generated world in
the temp folder is what it opens, and `e2e/harness/screen.ts` is the vocabulary
scenarios are written in. `docs/testing.md` is the how-to; `handoff.md` has the
two constraints that must not be lost.

Sixteen scenarios in three files: opening a world, finding and navigating a
large one, and the names a filesystem cannot store as typed.

### Choices worth knowing

- **playwright-core, not `@playwright/test`.** The driving is Playwright's; the
  runner stays Vitest, which the repo already has. `playwright-core` downloads
  no browsers — Electron is the browser — so this cost one dev dependency and
  nothing at install time.
- **A separate config and a separate command.** `pnpm test` is 1405 tests in
  seconds with no window; folding these in would make the quick check slow and
  the slow check the only one anyone runs. `*.e2e.ts` rather than `*.test.ts` so
  neither suite can pick up the other whatever a config later says.
- **`fileParallelism: false`.** Each file starts a real app; several competing
  for one window manager is how a suite comes to fail differently every run.
- **No test hooks were added to the app.** Not one line of `src/` changed. The
  same principle the test world was built on — the app opens a directory, so a
  test world is a directory — extends to the settings: point `--user-data-dir`
  somewhere temporary and the app reads a file the harness wrote.

### What it caught while being written

Two mismatches between what was assumed and what the app does, both found by the
first scenario failing rather than by reading code:

- A world is named by its `project.json`, not by its folder. A generated world's
  two names differ, so an assertion against the folder name would have passed
  for the wrong reason on a real world.
- Folders render `FolderView`, which draws its own heading and has no
  breadcrumb — `.page-title-name` does not exist for them. The harness covers
  both so scenarios do not have to know which they clicked.

### Verification

`pnpm lint` clean. `pnpm test` unchanged at 1405 tests across 59 files — the new
files are outside its include. `pnpm test:app` is 16 passing across 3 files in
about 7 seconds on Windows, plus a ~20 second build.

Checked that the assertions can fail rather than passing vacuously: the
duplicate-sibling count was flipped from 3 to 4 and the suite reported it, and
the two mismatches above were real failures before they were fixed.

**The CI job has never run.** It is written against `ubuntu-22.04` under
`xvfb-run`, with `--no-sandbox` added on Linux under CI, and the first push is
what tests it.

### What this replaces

The workaround at the bottom of the spectrum-meter entry above — serving a
static page carrying a component's exact markup out of `public/` and
screenshotting it. That existed because components had no test setup and
`pnpm dev` cannot open a project in a browser. A replica of the markup can
always be wrong in the way the real thing is broken; this opens the real app.

---

## Phase 19 — Safety Net (version history) ✅ Shipped 2026-08-27

The half of Phase 19 that is version history. Obsidian's File Recovery is the
model `docs/plan.md` says to copy rather than redesign, and this copies it:
periodic copies kept on disk, a per-page list of them, arrow keys through that
list, and a restore.

**Built ahead of the rest of Phase 29 deliberately.** The ordering note on the
phase — "runs after Phase 29, because a shell swap rewrites the filesystem
layer" — was written when the swap had not happened. Steps 1–3 have shipped;
what is left of 29 is a release, a Fedora tester and deleting two workflows,
none of which touches `filesystem-service.ts`. The reason for the ordering is
spent, so the work is not being done twice.

### What it is

- **`services/snapshot-service.ts`** — pure rules: naming, parsing, when a copy
  is due, what to prune, the patch a restore applies, and the README text. 21
  unit tests.
- **`filesystem-service.ts`** — `snapshotBeforeWrite` at the top of `saveNode`
  and forced from `deleteNodes`, plus `listSnapshots`, `readSnapshot`,
  `snapshotNode` and the pruning. `.history/` skipped in `walkEntries` and
  reserved in `RESERVED_ROOT_KEYS`. Six new tests against the fake disk.
- **`components/shell/PageHistory.tsx`** — the panel, opened from a tree row's
  right-click menu. Versions down the left, what that version *said* on the
  right, arrow keys through the list, one Restore.
- **`contentRevisions` in the project store**, in the editor's key.

### Verification

`pnpm lint` clean, `pnpm test` 1427 across 60 files, `pnpm test:app` 31 across
7 files including the new `e2e/keeps-earlier-versions.e2e.ts`, which types into
a page in the packaged app, checks the copy holds what was there *before* the
typing, restores it, and checks the typed sentence became a version of its own.

### What the scenario caught, and unit tests could not

**Restoring a page while looking at it did nothing visible, and would have been
silently reverted.** BlockNote is created with `initialContent` and keyed by
tab, so the editor kept showing the pre-restore words — and the next keystroke
would have saved those back over the restored version. Found by the scenario on
its first run; fixed with `contentRevisions`. This is the failure mode the
phase's own note in `plan.md` warns about: a half-built safety net is worse
than none, because it gets trusted.

**Two copies stamped in the same millisecond were one copy.** A save followed
immediately by a delete overwrote the save's copy; caught by the full unit run
after passing in isolation, fixed with `nextSnapshotAt`.

### Not done at the time

All three were closed later the same day — see the section below.

- **Undo for the right-hand panel**, the phase's other bullet, carried over from
  Phase 10. Untouched here.
- **Nothing snapshots `project.json`** — the tree's own order and the project's
  settings have no history. Page contents were the loss that happened.
- **Retention is not configurable.** Obsidian's is. The numbers are in
  `constants/limits.ts` and nothing reads them from settings.

---

## Phase 19 — Safety Net (the rest of it) ✅ Shipped 2026-08-28

The three things the section above left, plus the count on a row's menu.

### Undo, in the panel down the right of a page — and in a page's tabs

Carried since Phase 10, and the last part of the app where a mistake could not
be taken back. About thirty actions became undoable, through two funnels rather
than thirty pairs of closures:

- **`patchNode`** in `project-store.ts` — the single-page twin of `applyBulk`.
  It reads the fields a patch is about to overwrite and records that as the
  reversal, so every property, tag, alias, custom field and picture crop is one
  routing change rather than a hand-written undo.
- **`editBlocks`** grew a label and passes through `patchNode`, which covered
  all twenty-three block and meter actions at once. That funnel already existed
  — Phase 18a built it so the migration would live in one place — and this is
  the second thing it paid for.

**The design problem was typing, not routing.** A property field writes on every
keystroke, so a sentence typed into Age was thirty entries and undo became a key
you hold down. `mergeRepeat` folds consecutive entries carrying the same
`mergeKey` inside two seconds, keeping the *older* undo and the *newer* redo, so
a run reverses to where the run started. The key names one field on one page,
never a kind of edit. Anything continuous carries one — text fields, a dragged
meter, a picture's crop; anything that fires once per click deliberately does
not.

**A page's tabs came with it**, which Phase 10 had also carried here: adding,
renaming, hiding, reordering and deleting one all record now, through the same
funnel. `updateTabContent` deliberately does not — what is *inside* a tab is
writing, and writing has BlockNote's undo on Ctrl+Z. What a tab *is* is
structure, and deleting one took its contents with it with no way back.

**One panel action is still not undoable, on purpose:** clearing or replacing a
page's picture deletes the file from `assets/` once nothing points at it, so
undo would have to restore bytes rather than a field. Recorded in `plan.md`
rather than left implicit.

### The tree's own history

`project.json` — the order, the home page, the pins, the expanded folders — now
gets the same treatment, in `.history/project/`. A word rather than a node id,
which is safe because every other folder in there is a UUID.

The copy is taken inside `saveProject`, the one door every write to that file
goes through, so the dozen actions that reorder a tree needed no changes at all.
`ProjectHistory.tsx` is `PageHistory.tsx`'s sibling and shares its stylesheet;
it hangs off the project header's own right-click menu, which is where a page's
version list already lives on a page's row.

**What a restore may bring back is the part with the thinking in it.**
`restoreProjectPatch` filters every id against the pages that exist *now* — a
copy from last week mentions pages since deleted, and putting its lists back
verbatim leaves a home button pointing at nothing. It keeps the world's `id`,
`forkedFromId`, `name`, `createdAt` and cover from the current project: the id
is what in-world references are written against, and the name is a folder on
disk. The dialog says how many of the pages a copy mentions have since gone
before anything is pressed.

### Retention, as a setting

Settings → History: how often a copy is kept (1–30 minutes), how far back they
go (a week to a year), how many any one page keeps (10–100). Defaults are
*derived* from `constants/limits.ts` rather than written a second time, and a
test asserts each default is one of the offered values.

**Pushed rather than read.** Pruning runs on a disk write, not a render, so
`filesystem-service` cannot read a store; `preferences-store` calls
`setSnapshotRetention` on load and on change, and the module starts at the
shipped defaults so a copy taken before settings load is kept under the same
rules it always was.

**Nothing offered turns it off.** No "never", no zero. This app has lost pages
once, and a switch marked *keep my work safe* is a switch somebody turns off on
a tidying-up day and regrets six weeks later.

### The count on the menu

A page's right-click menu now says how many earlier versions it has, or "none
yet". Read on demand while that one menu is open — `useSnapshotCount` is passed
`null` from every other row, because a version that counted for its own row on
mount would be one directory listing per visible page on every scroll.

### Verification

`pnpm test` 1503 unit tests. `pnpm test:app`: two new scenarios and one grown
one, all against the real Electron app — a run of typing in a panel field
reversing as **one** press and the message naming the field ("Undid changing
Summary"), redo putting it back, the tree's dialog listing a copy after the home
page is changed, and the three retention controls in Settings.

### The marker on a tree row, decided against

The phase's last bullet asked for something on the row itself showing a page has
history. Put to her rather than guessed at, because it would land in the same
strip as the colour dot she has already said is in the wrong place — and **her
answer, 2026-08-28, was no**: a dot on every page she has ever touched is a
notification badge on the whole tree, which is a thing to be got away from
rather than a thing to add.

**So the count in the row's ⋯ menu is the whole of it, and this is settled.**
Do not propose a row marker again. The question it answers — is there anything
to go back to — is asked at the moment somebody opens that menu, and answering
it before they ask costs the tree its quiet.

## Every shortcut on one screen ✅ Shipped 2026-08-27

Nothing in the app could show somebody their own keys. Every shortcut is
rebindable — the accessibility feature it was built as — and the cost is that
no fixed list exists to memorise: Settings → Keyboard changes them one at a
time, which is a screen for editing rather than for looking one up mid-sentence.

### What it is

- **`?` opens the list, `?` closes it, Escape closes it**, and `F1` does the
  same while the caret is in text, where a question mark has to stay a question
  mark. Neither key is rebindable; both are now named in Settings → Keyboard's
  note about fixed keys, which had three on it and has four.
- **`ShortcutSheet.tsx`** renders two groups: the nine rebindable actions with
  their *current* bindings, read from the shortcut store, and `FIXED_KEYS` —
  reload, fullscreen, devtools and `?` — under a heading that says they can't
  be changed, so a row with no button on it doesn't read as broken.
- **`use-shortcut-sheet.ts`** is a window-level listener beside `useShellKeys`,
  so the sheet works on the start screen too. It stands down while Settings is
  recording a key, and refuses to stack itself on top of an open dialog.
- **`opensShortcutSheet` in `shortcut-service.ts`** is the pure part: five unit
  tests covering the in-text rule and the modifier near-misses.

### Verification

`pnpm lint` clean, `pnpm test` 1406 across 60 files, `pnpm test:app` with a new
`e2e/shows-its-shortcuts.e2e.ts` — five scenarios in the packaged app, one of
which rebinds Save to Ctrl+F2 through the settings screen and then asserts the
sheet shows Ctrl+F2. That is the test that would fail on a hardcoded list, which
is the mistake this feature exists to make impossible.

Screenshotted at 1280 and 900, then again at 2.5× zoom to settle whether the
arrow keys were rendering: `Alt+←` and `Alt+→` are correct, and only looked
wrong at 1×.
## A way to report a bug ✅ Shipped 2026-08-27

The app had nowhere to send a fault. The crash panel that shipped hours earlier
could copy its details, the repository had no issue templates at all, and a
tester on Fedora who found something had one route: tell her, so she could tell
me. Everything else on the polish list gets cheaper once there is somewhere to
write things down that is not a phone call, which is why this went first.

### What it is

- **`services/bug-report-service.ts`** — pure text work plus one call out:
  `describeSystem` off the user agent, `describeBuild`, `reportDetails`,
  `trimForUrl`, `reportUrl`, and `openBugReport`, which hands the system
  browser a prefilled `issues/new` link. 14 unit tests.
- **Settings → Report a bug**, which is the old Privacy tab renamed and given
  the section it was missing. The crash log stays underneath it. Two buttons,
  because the browser route needs a GitHub account and the person most likely
  to be holding a broken build has never had a reason to make one — *Copy the
  details* is that path, not a fallback.
- **`Report this` on the crash screen**, which copies and then opens, in that
  order.
- **`.github/ISSUE_TEMPLATE/bug_report.yml`** — an issue form written for
  somebody who is not a programmer: what happened (required), what you were
  doing, does it happen every time, and a build box the app fills in. Blank
  issues stay enabled for everything that is not a bug.
- **`shellName()` added to the host contract**, both shells, both `satisfies`
  blocks. The two builds have shipped under one version number, so a report
  quoting only the version named neither.

### Verification

`pnpm lint` clean, `pnpm test` 1415 across 60 files, `pnpm test:app` 32 across
7 files. Two of those are new: `e2e/reports-a-bug.e2e.ts` opens the panel in the
packaged Electron app and reads the details block, which is the only thing that
can prove the shell resolution produced the right `host-service` — a unit test
mocks exactly the part in question.

Screenshotted both surfaces rather than reasoning about them. The settings panel
at 1280 and at 900. The crash screen by temporarily throwing from `App()`,
building, shooting, and reverting — which caught two things reading could not:
a section heading identical to the panel heading directly above it, and a JSX
newline that ate the space before an `<em>`, rendering `carries.Copy`.

### The keyword that cost a search

`bug-report`'s hint read *"…the version and system filled in"*, and "filled"
lands two edits from "files", which put the row into the results for *"where are
my files saved"* and failed `settings-search.test.ts`. The same trap the
crash-log row above it documents in a comment. Reworded to "already on it".

---

## The AppImage starts on the machine it used to crash on ✅ Confirmed 2026-08-27

Not a change — a result, and the one this repo could not produce for itself.

**The bug, since 2026-08-09.** The first install by somebody who is not the user
died on his Fedora laptop with `EGL_BAD_PARAMETER` before a window appeared.
Tauri's bundler copies webkit2gtk's dependency tree into the AppImage without
consulting AppImage's own excludelist, so the host's graphics libraries were
sealed inside it — built on `ubuntu-22.04`, newer than what that machine
carries, and the two could not talk. He got it running by forcing the system's
own `libwayland-client` with `LD_PRELOAD`; an ordinary installer could not have.

**Why it stayed open for eighteen days.** No machine here reproduces it, and CI
runs the same Ubuntu that produces the bad bundle — so a green build proved
nothing, and `docs/handoff.md` said in as many words not to fix it blind. The
three options on the table were repack-and-re-sign in CI, building the AppImage
with `linuxdeploy` by hand, or dropping the AppImage target.

**None of them were needed.** electron-builder assembles its own AppImage, which
was the theory; a dry run of `Release (Electron)` produced one, and it started
on that same Fedora machine with no workaround. Phase 29 bought the fix as a
side effect of the shell swap.

### What this closes

- The Known Bug in `docs/plan.md`, removed rather than reworded.
- Phase 29's "the Linux AppImage is unproven on the machine that had the
  problem", which was one of the three things left in that phase.
- The argument for dropping the AppImage and shipping only `.deb` and `.rpm`.

**The constraint in `docs/handoff.md` stays.** It is a rule about what an
AppImage may contain, not about which bundler was getting it wrong.

### Still unverified on Linux

The single-instance behaviour from #290 — launching the app twice and having the
second launch find the window that already has the world open. It was reported
from that machine and has never been confirmed there.

---

## Phase 29 — The Shell ✅ Shipped 2026-08-28

**Scoped 2026-08-25. Replace Tauri with Electron.** The app keeps its own
Chromium instead of borrowing whatever browser engine the operating system
happens to have.

### Why, in the order the reasons actually matter

- **Linux is a real platform for this app, and it has the worst engine.** Her
  partner runs it on two Fedora machines — one current, one old — having moved
  off Obsidian because she suggested this instead. **She intends to move to
  Linux herself.** So Linux is not a build target nobody runs; it is where this
  app is heading.
- **Tauri borrows the OS webview**, which means Chromium on Windows, WebKit on
  macOS and WebKitGTK on Linux. Three engines, one of which lags badly and none
  of which she can update on a user's behalf.
- **This is already biting, today.** The spectrum meter's wrapping word fields
  need CSS `field-sizing`, which WebKitGTK only shipped in 2.52 (March 2026).
  On the older Fedora box those fields draw one line and clip the rest — worse
  than the truncation they replaced, and invisible from Windows. A fallback
  ships separately and immediately; it is a patch over the real problem.
- **Phase 19 is the reason to do this now rather than later.** Snapshots and
  file recovery are the most filesystem-heavy work left in this document, and
  the filesystem layer is exactly what a shell swap rewrites. Building 19 on
  Tauri and then moving it is doing it twice.
- **The switch does not get cheaper by waiting, and barely gets dearer.**
  Measured 2026-08-25: 235 source files, ~41,600 lines, of which **ten files
  touch Tauri at all**, across about seventeen call sites, plus 22 lines of
  hand-written Rust. Feature work lands in the other 225 files. What grows the
  coupled surface is new *kinds* of OS access — which is precisely what Phase 19
  would add.

### What is accepted, deliberately

- **More memory, and a bigger installer** — roughly 8 MB → ~150 MB, and a
  heavier process tree. **Her answer, 2026-08-25: anyone who wants a light
  version can use the eventual browser edition.** That is the trade being made
  on purpose, and it raises the browser edition from "someday" to "the other
  half of this decision" (`docs/ideas.md` → Browser version).
- **One manual reinstall each.** A Tauri installation cannot auto-update into an
  Electron one — different updater, different signing. Both existing users
  install once by hand; updates resume normally after that.
- **Losing Tauri's capability scoping.** It enforced the network policy that was
  retired the same day, so there is nothing left for it to enforce.

### What is explicitly not in scope

**The data format does not change.** Same JSON, same folder-per-node layout,
same `assets/`. A world written by the Tauri build opens in the Electron build
untouched — if that ever looks like it needs to bend, stop and raise it.
No feature work rides along. No visual changes.

### Where it has got to

**Steps 1 and 2 have shipped.** Every Tauri call is behind
`services/host-service.ts` (PR #272), and `host-service.electron.ts` plus
`electron/` implement the same contract over Electron and Node — verified
running: the real window opens, reads her projects off disk, round-trips text
and binary files, watches a directory, and closes through the save-on-exit
handshake.

**Most of step 3 has shipped too**, later the same day and after this section
was last written: `electron-builder.yml`, `release-electron.yml`, the updater
on `electron-updater`, and `docs/releasing.md` rewritten around all of it.

What is genuinely left is the part that can only be settled by running it:

- **v0.6.0 is the first Electron release.** The version was bumped and its
  `RELEASES.md` section written on 2026-08-27, which is what closed the known
  bug about two different builds both calling themselves 0.5.0.
- **Every existing installation reinstalls by hand once.** A Tauri build reads
  `latest.json` and this pipeline publishes electron-updater's feed instead, so
  every 0.5.0 out there reports no update available. This was always the accepted
  cost of the swap; what is new is that it had to be said out loud, and the
  v0.6.0 notes lead with it rather than leaving it to be discovered.
- **The last unproven link is an Electron build updating itself.** The pipeline
  is dry run — all three platforms built without spending a version number, and
  the AppImage the Fedora machine ran came out of it — and the tagged path is
  proven the moment v0.6.0 goes out. What nothing can test until there are two
  published Electron releases is one of them finding and installing the next.
- **The Linux AppImage works on the machine that had the problem — confirmed
  2026-08-27.** Tauri's bundler sealing the host's graphics libraries into the
  AppImage was the original crash; electron-builder builds its own, and the
  first Electron AppImage handed to him started on the same Fedora machine that
  used to die with `EGL_BAD_PARAMETER` before a window appeared. No
  `LD_PRELOAD`, no workaround. That closes the Known Bug this phase inherited,
  and it removes the argument for dropping the AppImage target.
- **Usage reporting: built 2026-08-26, removed 2026-08-27.** Kept here as a
  settled decision rather than deleted, so it does not get proposed a third
  time.

  It worked, and it was honest — a closed list of eight event names that could
  not carry her writing, a one-time notice with two real buttons, a visible
  switch. It went anyway, and the reasons are the part worth keeping:

  - **The numbers would not have said much.** A handful of users, one of whom
    she talks to daily. Asking them answers more, and sooner, than a dashboard
    of counts drawn from a sample that size.
  - **"It sends nothing" is worth more than the counts were.** People arrive at
    this app from Notion and from Obsidian, and the second one wins them partly
    by collecting nothing at all. A data modal on first launch is a strange
    thing to hand somebody in the middle of that trade.
  - **Checking the neighbours cut the other way from how it looked.** Notion
    and LegendKeeper collect plenty and have no switch, because they are
    websites and there is nothing to opt out of short of leaving. Obsidian has
    no switch because it collects nothing. Nowhere in that does a desktop tool
    come out ahead by having a toggle.

  The Aptabase account goes with it. `.env` was committed, so the key is in the
  history — it is a write-only ingest key rather than a secret, but the app it
  points at should be deleted rather than left listening.

- **Settings → Report a bug (the Privacy tab, renamed 2026-08-27) says nothing
  about collection or the network, and that is deliberate.** Same day, hours after the page was written.

  It briefly held two more sections: one declaring that the app collects
  nothing, one listing the two times it reaches the network. Both were
  accurate. Both were also promises, and neither subject is settled — usage
  reporting is a thing she may want again if the app finds an audience worth
  measuring, and what it fetches will grow as features land. A page that has to
  be walked back later costs more than a page that never made the claim, so the
  claims came out rather than being hedged.

  **Do not re-add them as a selling point.** Collecting nothing is a good
  property and a bad advertisement: the moment it is written on a screen it
  becomes a thing to retract. The constraint itself is unchanged and lives in
  `CLAUDE.md` → Two Promises, where it governs what gets built rather than what
  gets said.

  What stays is the crash log section, because it describes rather than
  promises: where the file is and what goes in it, which is what somebody needs
  in order to find it and pass it on.

- **Crash reporting, and it never leaves the machine.** Her call 2026-08-27,
  the one piece of the above she did want, and now built.

  **Nothing caught a crash before this.** No error boundary, no
  `window.onerror`, no handler for a rejected promise anywhere in `src/` or
  `electron/` — a crash in the tree was a white window and no explanation. That
  was the real gap, and closing it was worth doing whether or not anything is
  ever sent anywhere.

  - `components/shell/ErrorBoundary.tsx` wraps `<App />` from `main.tsx` rather
    than sitting inside App, because a boundary cannot catch a throw from the
    component it is written in.
  - `components/shell/CrashScreen.tsx` is what the white window became: what
    happened, that the files on disk were not touched, a restart, and a button
    that copies the details. The trace is shown rather than hidden, because
    nothing is being sent and there is nothing to be coy about.
  - `services/crash-log-service.ts` keeps the last five in `crash-log.json`
    beside the settings, through the same `openKeyValueStore` door the settings
    use — no new shell capability, so it works the same under both shells.
  - **The two global handlers record and do nothing else.** A rejected promise
    usually leaves the app perfectly usable, and blanking the window over one
    would be a worse bug than the one being reported. Settings → Report a bug
    is where those become findable, and it can copy the last one.

  **Why not the automatic kind.** A stack trace carries error messages, and
  this app's error messages carry file paths — which carry world names and page
  titles. The usage events could be *proven* content-free by reading a list of
  eight strings; a crash report can only be scrubbed and hoped over. Showing
  somebody the text and letting them press the button is the version with no
  hoping in it — and it is why the record can afford to be complete.

  **Still open**: nothing renders the panel on purpose yet, so the only proof
  it works is a test and a hand-thrown error. A scenario in `pnpm test:app`
  that throws inside the tree and asserts the panel is the obvious next step.

### The work, in three steps

1. **One door.** Pull those seventeen call sites behind a single module, so that
   nothing outside it knows which shell is underneath. This is architecture rule
   5 (`filesystem-service.ts` is the only file that touches disk) finally
   enforced — nine other files quietly break it today: `constants/paths.ts`,
   `hooks/use-save-on-exit.ts`, `hooks/use-updates.ts`, `main.tsx`,
   `services/app-settings-service.ts`, `services/dialog-service.ts`,
   `services/lk-import.ts`, `services/update-service.ts`, `state/project-store.ts`.
   **Worth doing on its own merits even if the rest is never built**, and it is
   day one of the swap either way. Ships as its own PR, no behaviour change.
2. **The Electron side of the door.** A main process implementing the same
   contract over Node: file reads and writes, the native dialogs, settings, the
   window. Node's `fs` is richer than the plugin, so this is mostly narrowing,
   not inventing.
3. **The pipeline, which is the real work.** `electron-builder` for Windows,
   macOS and Linux; the updater and its feed; rebuilding `.github/workflows`
   and `docs/releasing.md`. This is the part that took the longest last time
   (see the AppImage saga) and it should be estimated as the bulk of the phase,
   not the tail of it.

   **Nothing is code signed, and that is a decision rather than a gap** — see
   `docs/releasing.md` § *Nothing is code signed, on purpose*. The Tauri builds
   were never signed either, so this is the same position written down, not a
   change. Don't re-add signing to this list.

### Unknowns, all since settled

Kept because the answers are the useful part:

- **The updater moved to `electron-updater`'s own feed.** It verifies the
  SHA-512 published in the release feed, fetched from GitHub over HTTPS, rather
  than a key she holds. Tauri's minisign key is unused and nothing reads the
  secret any more; it can be deleted from the repository's settings.
- **macOS notarisation does not apply**, because nothing is signed. The cost is
  that a Mac will not open the app from a double-click and its updates have to
  be installed by hand — both written up in `docs/releasing.md`, and both
  things to say in the release notes when there is a Mac build.
- **`pnpm tauri:inspect` did not disappear; it grew a twin.**
  `pnpm electron:inspect` opens the same kind of debug port on the Electron
  window (PR #277), which is what made the tree-scroll bug measurable rather
  than a matter of opinion.

### How the release itself went

**Three tags for one version**, none of them published, all on 2026-08-27–28.
The app was never the problem; the pipeline was, in two ways that only a real
tag could show.

- **"The command line is too long."** The notes were handed to electron-builder
  as an argument. Windows caps a command line at 8,191 characters and v0.6.0's
  section is 9,914 — v0.5.0's was 5,478, which is why it had never happened.
  macOS and Linux published normally, so the first draft held two thirds of a
  release. Fixed in PR #308 by putting the notes in a file, which has no ceiling
  rather than a larger one.
- **Two drafts, four green jobs.** Each build job looked for a release for the
  tag and created one when it found none; two of them found none in the same
  second. The eleven files came out split across two drafts, each missing a
  platform, with nothing red anywhere. Fixed in PR #309 by opening the draft in
  the version-check job, which already runs first and alone —
  `getOrCreateRelease` reuses an existing draft the moment it sees one.

**The check that means anything is the releases page, not the run:** one draft,
eleven files — 3 Windows, 5 macOS, 3 Linux. Both failures looked fine from the
Actions tab.

**Published, installed from its own `.exe`, and opened a real world** on
2026-08-28. The way back — `release.yml` and `appimage-test.yml` — was deleted
the same evening, along with the Tauri launcher, which had the plainer name of
the two and so was the one a shortcut would land on.

---

## Phase 19.5 — New page, from inside the editor ✅ Shipped 2026-08-28

The first *feature* of Phase 19.5, and the cheapest one on its list — everything
it needed existed except the asking. Scoped in `docs/plan.md` on 2026-08-27 as
"Element", which is what the reference calls it.

**Called New page, not Element.** The app's word for a page is "page" — the
tree, the templates and her own vocabulary all say so — and a menu entry that
introduces a second word for a thing already named is one she has to translate.
"element" is in the slash item's aliases so somebody typing the other app's word
still finds it.

**What it does.** `/` → New page opens a dialog with four fields: the name, the
link text if the link should read differently, where the page goes (defaulting
to the page being written on, clearable to the top level), and Hidden. It makes
the page, leaves a mention chip where the cursor was, and does *not* open the
new page — the whole point is not leaving the sentence.

**The `[[Name]]` route is the one that matters**, and it took two attempts.

The first cut hung it off `wikilink-bracket-confirm.ts`, which already watches
for the closing `]]` — its `"none"` branch was exactly "nothing answers to this
name". Measured in the built app: **that branch only ever fires for a
single-word name.** BlockNote's suggestion menu closes on a space, so `[[Two
Words]]` never reaches the handler at all, and page names are mostly two words.
It also had to wipe the typed text to make room for a chip, and put it back by
hand on cancel.

So it moved to the change scan instead. `wikilink.ts` was already looking at
every completed `[[Name]]` on every edit and *skipping* the ones it could not
resolve; it now reports the first such name **in the block the cursor is in**,
and `use-editor` offers to make it. Nothing is taken out of the document to ask,
so cancelling costs nothing and there is no restore path to get wrong. It works
for any name, spaces included.

**Two things that are load-bearing rather than incidental** (both in
`handoff.md`): the offer is scoped to the cursor's block, or a page with literal
`[[brackets]]` typed in it would raise a dialog about last week's text the moment
anything else on the page was edited; and a name is remembered the moment it is
*asked* about rather than when it is declined, because the text stays in the
document and the next keystroke would otherwise find it again — a page she
cannot type on.

**Focus comes back either way.** The dialog is a portal and it takes the
keyboard; the first version left the caret nowhere on cancel, which reads as
typing having stopped working. Caught by the scenario, not by reading.

### Verification

`makes-a-page-from-the-editor.e2e.ts` — three scenarios in the built app: the
slash route makes a page that is really in the tree and leaves a chip; a
`[[Name]]` nothing answers to opens the same dialog pre-filled and swaps the
brackets for the chip; and backing out leaves the typed text alone, puts the
caret back, and does not ask a second time.

The harness gained `typeInEditor`, `editorText` and `editorMentions`, and
`typeInEditor` **never clicks the middle of the editor** — Playwright's default
is the element's centre, the centre of a page is prose, and prose contains link
chips, which navigate when clicked. That cost an hour: a scenario wrote a link,
clicked to type again, landed on the chip, and spent the rest of the test typing
into a different page's empty landing screen.

---

## Phase 19.5 — Callout colours ✅ Shipped 2026-08-28

Asked for 2026-08-27 with examples she had already written elsewhere: amber and
red warnings, a green confirmation, a neutral note. Scoped in `docs/plan.md` as
"the smallest useful thing on this page", which it was — right up until it
turned over a real import bug.

**A colour, not a type per colour.** The three callout types carry behaviour —
Secret is what a publish has to strip, Quote is what a `.lk` blockquote imports
as — so colour is a fourth thing about a block rather than three more blocks.
`propSchema: { color: { default: "" } }` on all three specs; the default is what
keeps every callout written before this looking exactly as it did, since
BlockNote fills a missing prop in with it on read.

**One CSS rule for every colour.** The wrapper resolves the palette key to a hex
and puts it on the element as `--callout-accent`;
`.editor-callout.editor-callout-colored` draws the border from it and mixes the
fill out of it with `color-mix`. The stylesheet never learns which colours
exist, so adding one to `COLOR_PALETTE` adds it here for free. A flat
`--color-panel-alt` background is declared first as a real fallback — `color-mix`
is the newest thing in the stylesheet and WebKitGTK on Linux is the engine to
watch.

**Four colours get an icon and the rest do not.** Green is a confirmation, amber
a caution, red a warning, blue a note — conventions read without being learned.
Anything else is a colour she liked, and an arbitrary mark on it would be a
small puzzle on every page. A hex she mixed herself never gets one either: there
is no name to read a meaning off. The mapping is grouped by hue, so all four
greens say the same thing and she picks the one she likes the look of.

**The picker is a dot in the corner of the block**, hidden until the pointer is
over the callout — every other colour in the app is picked from a dot you can
see, and a callout was the one coloured thing with none. Its swatches are its
own rather than `ColorSwatches`: that component reads preferences and the
preview store through hooks, and `services/editor-blocks/` may not import
upward. What it needed was the palette, and the palette is a constant.

### The import bug it exposed

`PANEL_TYPE_TO_CALLOUT` mapped LK's `warning` and `error` panels to
`calloutSecret`, because there were three callouts, none of them a warning, and
Secret was the nearest *look*. But Secret is not a look — it is the block a
publish is required to strip. **Every warning and every error in an imported
world was silently marked do-not-show-anyone**, with nothing on screen saying
so. Colours are what let severity be said without saying the wrong thing:
warning → Info in amber, error → Info in red, success → Info in emerald.

The export side was changed to match, or the fix would have broken the
round-trip promise in `CLAUDE.md`: a coloured Info goes back out as the panel
severity it came in as. Colours LK has no panel for export as a plain info
panel and are counted lossy rather than pretended away; a colour on a Quote
never survives, since LK's `note` panel carries no severity. `docs/lk-format.md`
has both tables.

### Verification

Unit: `callout-colors.test.ts` on the icon mapping (including that it never
reads a meaning off a hex), and the two `.lk` suites updated — the import test
had encoded the old warning→Secret behaviour, which is exactly the shape of test
that keeps a bug alive.

App: `colours-a-callout.e2e.ts` colours a real callout in the built app, checks
the icon that goes with the colour appears, reloads the window and checks it
came back — a colour that shows on screen and is gone after a reload is the
failure worth catching, since the value travels through the document, the
autosave, the file and the schema default on the way back in. Then puts it back
to the type's own colour.

Photographed: the swatch popover, an Info in emerald with its tick, and a Quote
in wine keeping its italics.

---

## The move/delete/duplicate slice comes out of the store ✅ Shipped 2026-08-28

An engineering pass, not a phase. Came out of a read-through of the whole
codebase asking whether it wanted refactoring; the honest answer was mostly no —
49 of 56 services had their own tests, the layering held, and there were almost
no type escapes — but `project-store.ts` was 3,226 lines and roughly 140 actions
in a single `create()` call, and it was the only large file in the project with
no unit tests of its own.

Rather than split the file for its own sake, one slice moved: the three
operations that can destroy her writing rather than merely add to it.
`node-edit-service.ts` now holds `planMove`, `planDelete`, `planDuplicate`,
`duplicateScope`, and the two helpers the store used to keep privately
(`orderedSiblingIds`, `descendantIds`). Each takes a graph and gives one back,
with no React, no store and no disk in it. The store kept the writes, the undo
entries and the picture files.

`planDuplicate` takes the copied asset filenames as an argument rather than
minting them, which is the seam that made the whole thing testable: copying a
file is I/O, deciding which clone wears it is not.

**One behaviour changed, deliberately.** `moveNodes` guarded against a
destination that isn't in the graph, but did so *before* awaiting the pending
saves — so a parent deleted during that window was never re-checked. The guard
now runs inside `planMove`, on the state read after the await, which closes the
hole rather than widening it: the drop is refused instead of filing a subtree
under an id that has gone.

Store: 3,226 → 3,103 lines.

### Verification

Unit: 43 new tests in `node-edit-service.test.ts`, covering the cases that would
be silent if they broke — an order left mentioning a page that is gone, a home
button or a shortcut aimed at nothing, a copy landing one place too far along
when several are made at once, and a clone wearing the original's picture file.

App: moving and deleting a page had *no* scenario at all — `deletes-a-project`
deletes a whole project, not a page, and nothing dragged a row. Duplicating was
already covered by `undo-keys`. `moves-and-deletes-a-page.e2e.ts` fills the gap:
it files a page into a folder, deletes one, and pins one and deletes it, each
assertion re-checked after a window reload, because a move or delete that only
happened in memory looks exactly like one that worked until the app is opened
again.

Suites after: 1,574 unit tests (from 1,531), 81 app scenarios (from 77).

## Phase 19.5 — Columns ✅ Shipped 2026-09-02

Side-by-side lanes of writing in a page, and the next piece after a block's own
width — the space beside a narrowed block now has something to put in it.

**Two blocks, built on BlockNote's own nesting.** `pageColumns` is the row and
`pageColumn` is a lane; a lane holds ordinary blocks as children, so a paragraph
in a column is a paragraph. The layout is CSS on the block group BlockNote
already renders for a block's children, which is why the slash menu, drag
handles, selection and undo all keep working inside a lane without being
reimplemented.

**Written by hand because the ready-made one is out of reach**
(`@blocknote/xl-multi-column` is GPL-or-paid against an MIT app, settled
2026-08-27). About 200 lines plus stylesheet.

**What was built:**

- `columns.tsx` (the two specs), `ColumnLane.tsx` (the row, a lane, the divider)
  and `column-slash-menu.tsx` (Two columns / Three columns), plus the layout in
  `page.css`.
- Widths as one prop on the row — `parseColumnWidths` / `serialiseColumnWidths`
  in `block-service.ts`, with a floor of 15% per lane and the same snap points a
  block's width uses.
- A divider on each lane's right edge: pointer capture, snapping, arrow keys.

**Three things went wrong, all of them worth the time they cost:**

1. **The editor froze on the first insert, with no error.** Sizing the lane
   meant writing `flex-grow` onto an element ProseMirror owns, and ProseMirror
   re-reads its document when its DOM changes underneath it — write, re-render,
   write. Five test runs each left a renderer spinning a core, which is what she
   noticed before I did. The widths are a stylesheet now.
2. **`columnList` and `column` are reserved by BlockNote core** even though the
   blocks are not — core ships plugins keyed on those names. Renamed.
3. **The divider never received a pointer-down**, because a lane's drag handle
   occupies the gap to its left. Measured, then moved onto the lane's own edge,
   which also matches the width handles.

**Verified against the real app** (`pnpm test:app`): two lanes side by side and
sharing evenly; text typed into each staying in its own lane; the divider drag
splitting 50/50 into 67/33; both text and widths surviving a reload; the arrow
keys moving a divider; and three lanes from the other menu entry.

**Then she used it, and it fell apart** — reported the same day with a
screenshot: pressing Enter made new columns until there were five, removing one
took its writing with it, and resizing left lanes a single character wide. All
three were the same root cause: **a row accepts any block as a child and draws
every child as a lane.** A stray paragraph *was* a column, and positional width
rules then landed on the wrong things.

**The second pass, the same day:**

- `column-service.ts` — pure rules over the document: what is wrong with a row's
  shape, and what each lane's share should be. Thirteen unit tests, no app
  needed, which is the point: every one of these cases arrived as a bug.
- `apply-column-repairs.ts` and a change handler in `use-editor.ts` — strays are
  moved out onto the page, and a row left with one lane is unwrapped with its
  writing kept. Capped passes and a re-entry guard, because a repair is itself a
  change.
- Widths **keyed by lane id**, and only used when every lane has one, so adding
  or removing a lane resets to even rather than leaving a sliver.
- A row's own controls — **Add column** and **Ungroup** (back to ordinary
  paragraphs, everything kept) — and a **remove** on each lane that hands its
  writing to the lane beside it. The escape hatch her report was really about.

**Three more things measured rather than guessed**, all in `docs/handoff.md`: a
generated rule loses to the stylesheet unless it matches its specificity (every
width was correct and none applied); a lane's remove button on the trailing edge
swallows the resize drag, and in the top corner sits on the writing; and a row's
toolbar above the row is clipped off the page, because a row is usually the
first block on it.

**Not built:** a row's own menu, moving a lane left or right, and anything about
how a row behaves nested inside another one.


## Phase 19.5 — The infobox's own menu ✅ Shipped 2026-09-04

Scoped off her screenshots on 2026-08-29, when the frame had Add Block and
nothing else — everything you could do to an infobox was done to the blocks
inside it, and the frame itself answered to BlockNote's generic Delete.

**Where the `⋯` went is the one layout decision worth keeping.** The obvious
place is the frame's top right corner, which is exactly where the first block
inside draws its own `⋯` — built there first, and the two landed within a few
pixels of each other, so the wrong menu opened depending on which pixel the
pointer was over. Both of the frame's controls sit on the strip at the bottom
instead, where nothing else claims them. Right-clicking the frame's own chrome
opens the same menu; right-clicking a block inside still opens the block's.

**What was built:**

- Three props on the infobox block: `color`, `autoWidth`, `centred`. Booleans
  rather than one word with three states, because "how wide" and "where it sits"
  are two questions, and both default to what an infobox already did.
- `InfoboxMenu.tsx` — the colour row (the same `ColorSwatches` a block's menu
  uses, live preview included), the width either/or, Full width, Align centre,
  Duplicate and Remove infobox.
- `.infobox-auto`: `width: max-content` between a 25% floor and the column. The
  floor is the same one a block cannot be dragged past, and it is what stops
  "as wide as what it holds" meaning "as wide as the word *wip*".
- `duplicateBlocks` in `block-service.ts` and its store action, which copy a run
  of blocks in one edit and hand back old id → new id.

**Duplicate is the item that had a decision in it, and the answer is copies.**
An infobox holds pointers, so a copied frame pointing at the same records would
put one block in two places — the thing the phase rules out everywhere else. The
records are duplicated as a panel edit and the new frame is inserted after,
which are two different undo stacks; that split is not new, it is how every edit
to an infobox already works.

**Verified:** `e2e/the-infobox-has-a-menu.e2e.ts` drives the real app — the
frame shrinking to its contents and going back, an even gap either side when
centred and none when not, and the copy proved separate by writing in one frame
and reading the other. Plus four unit tests over `duplicateBlocks`. Looked at
it, on a throwaway deleted afterwards: the menu, a teal frame, an auto-adapted
one, a centred one, and both frames surviving a reload with their colour, width
and alignment.

**Two of the reference's items are still not built** — Wrap left/right, which
needs floating BlockNote does not do, and Pin to top, which has never been
scoped past its name. Both are in `docs/plan.md` with what they would need.


## Phase 19.5 — A picture block holds its own picture ✅ Shipped 2026-09-03

Found by her the moment blocks reached the page body: an image block was a
window onto `node.image` and nothing else, so a picture dropped into one in the
middle of the writing became the page's portrait, and a second image block drew
the same photograph rather than a new one.

**The model, which is the whole of the change.** A picture lives in exactly one
place. The block marked as the page's writes to the node — `image`, `imageAlt`,
`imageFocusY`, where the tree row, the hover preview and the LK export have
always read it — and every other image block writes to its own record. There is
no mirroring and no second copy to keep in step, which is what the `home`-field
argument in `docs/plan.md` warned against for block *placement* and applies here
for the same reason.

**The mark is stored only once she moves it.** `node.pageImageBlockId` absent
means "the first image block there is", which is exactly what every page written
before this looked like — one image block, showing the portrait — so no page in
her world was rewritten to make this work. That is the migration, and it is the
same derivation-on-read trick Phase 18a used for the block list itself.

**What was built:**

- `Block.image` / `imageAlt` / `imageFocusY`, and `Node.pageImageBlockId`.
- `blockImage`, `pageImageBlockId`, `planPageImageBlock` and `planBlockRemoval`
  in `block-service.ts` — the second and third return a whole node patch rather
  than applying anything, so the block list and the picture that moved with it
  land in one edit and come back together on undo.
- `usePageImage`, the components' only door to that rule, resolving against the
  page's whole block list rather than the slice being drawn — a one-block slice
  would make every lone image block the page's.
- `ImageSlot` takes a `blockId` and every write names it; the store's
  `patchBlockImage` decides where it lands. `setBannerFromImage` follows the
  block's own picture too, so "Set as cover" in the writing means that photo.
- `setPageImageBlock`, and the block menu's *Use as the page's picture* — the
  block that already has it says so, checked and inert, rather than showing an
  entry that does nothing.
- The four copy paths taught about the new pictures: the Assets tab's usage
  index (a photo held only by a block in the writing is *in use*, so it is never
  offered for deletion), duplicating a page, saving one as a template, pouring a
  template into a page, and the capture that lets a deleted page's pictures come
  back.

**Two behaviours worth knowing.** Duplicating a picture block hands the copy the
same photograph rather than an empty frame — one file, two references, which is
what the picture library is for. And removing the block holding the page's
picture does not delete the picture: the next image block takes the mark, and if
*it* is holding a photo of its own then that becomes the page's, which is the
only answer that never leaves a block drawing something it does not own.

**Verified:** 13 unit tests over the swap, the promotion and the migration; an
asset-usage test for the route that could otherwise offer a live photograph for
deletion; and `e2e/picks-the-pages-picture.e2e.ts` driving the real app — two
picture blocks on one page, the mark moving from the sidebar's to the one in the
writing, and surviving a reload. `openBlockMenu` in the e2e harness had to be
rooted at the panel while doing it: a block in the writing draws the same shell
with the same label, so the unrooted lookup had started taking whichever the DOM
held first.

**Not done, and not asked for:** a cover per block. `node.banner` is still one
per page, and there is nowhere on a page a second one would go.


## Phase 19.5 — Dragging a block wider ✅ Shipped 2026-09-02

The page is wider than the sidebar, and this is where she says how much of that
width a block should take. Either edge of a block or an infobox in the page is a
grab handle; the box follows the pointer, snapping to halves, thirds and
quarters as it passes them and running free between.

**Both behaviours came from her, in one sentence** — the reference lets a box
snap to the column *or* drag normally, so this does both rather than choosing:
`snapBlockWidth` pulls a drag onto 25/33/50/67/75/100 within three points and
leaves it alone anywhere else. It is one function with four unit tests, and it
is what makes two blocks meant to match actually match.

**What was built:**

- `width` on `Block` — a percentage, 25 to 100, absent meaning the whole column
  — plus `setBlockWidth` in the store, which carries a merge key so a drag of
  forty writes is one undo entry.
- `width` as a prop on the infobox block, since a frame has no record to put it
  on. Stored as `0` for full width, because a BlockNote prop cannot be absent.
- `BlockWidthHandle.tsx`: two handles, pointer capture, the mirrored left edge,
  arrow keys at 5% a press, Home and double-click back to full width, and a
  percentage readout that appears only while dragging.
- A DOM split in the page block and the infobox: the row stays the full column,
  a new `.block-frame` inside it is what resizes. The selection ring moved onto
  the frame with it, and BlockNote's own ring had to be cancelled on the row.

**Verified against the real app** (`pnpm test:app`, throwaway scenario, deleted
after): the right edge dragged to 67% and stayed there; the left edge dragged
mirrored and narrowed the block; the readout stayed inside the frame — it was
clipped in half by the frame's `overflow: hidden` the first time, which is what
the screenshot was for; the ring drew on the frame and not the row; Home
restored full width and ArrowLeft stepped it down; an infobox dragged to half
width came back at half width after a reload.

**Two things this deliberately did not do.** The space beside a narrow block
stays empty — filling it is columns, which is the next piece and is a custom
block because `@blocknote/xl-multi-column` is licensed out of reach. And the
infobox's Auto-adapt / Fixed width menu items are still not built; they were
waiting on this and are buildable now.


## Phase 19.5 — An icon in the writing, and the callout's own ✅ Shipped 2026-09-01

Asked for 2026-08-28 off her screenshots of the reference, in two halves that
share one control: an `/icon` command that puts a clickable icon in a sentence,
and a callout whose icon she picks rather than inherits.

**Most of it already existed, and finding that out was the first real work.**
The plan said Glyphs was "the half we do not have" and that `constants/icons.ts`
— a dozen template icons — was the whole of what the app had. That was written
against the wrong file. Phase 18c had already shipped `glyph-catalogue.ts`
(every Lucide icon by name, ~1500), `glyphs.ts` (a curated set in front of it),
`emoji.ts`, and `IconPicker.tsx` with the tabs and the search box over all of
them — built for a meter's readings and deliberately built knowing nothing about
meters, which is exactly why it took this without changes. Five call sites were
already using it, a page's own icon among them. So the estimate the plan carried
— a search index, a browsable grid of 1500, "do not answer this by shipping the
emoji tab alone" — was work already done nine days earlier.

**What was actually built:**

- `icon` inline content (`icon-inline-content.tsx`, `IconChip.tsx`), holding one
  prop: a Lucide name or an emoji character, the same storage shape every other
  icon in the app uses. `/icon` inserts a heart and a trailing space and does
  not open the picker — the sentence carries on and the icon is changed after.
- An `icon` prop on all three callouts, with `resolveCalloutIcon` deciding
  between derived, chosen and removed. Default `""`, so every callout ever
  written comes back exactly as it was.
- `IconPickContext` — the second slot the component layer fills in the editor,
  after `BlockRefRenderContext`. `EditorIconPicker` is what fills it: the
  existing picker inside `TreePopover`, which portals to the body, so the
  picker's search box is never inside ProseMirror's contenteditable.
- One additive prop on `IconPicker`: `defaultAction`, which is what puts **The
  usual icon** beside **No icon** for a control whose blank state means
  something. The other five call sites pass nothing and are unchanged.

**Measurements.** The bundle grew 2.8 KB (2,638,793 → 2,641,570 bytes), because
the fifteen hundred icons were already in it — `glyph-catalogue.ts` does
`import *` and Phase 18c had already paid for that. 1636 unit tests pass, plus
five new ones over `resolveCalloutIcon`; four new scenarios in
`puts-an-icon-in-the-writing.e2e.ts` drive the real Electron app, including two
full reloads, because everything interesting here is a round trip through the
autosave and the schema's defaults. Screenshotted in the running app before
calling it done: the picker over a page, an amber callout with its derived
caution, and the dashed empty slot a cleared callout leaves behind.

**The one thing deliberately left:** the reference's picker keeps a Recent row
across the top and ours does not. It needs somewhere to live that outlasts the
popover, which is a small piece of app state rather than anything about icons —
it is in `docs/plan.md` under the phase.

**Follow-up the same day: the `:` trigger.** The entry above shipped with
`/icon` as the only way in, and that was close to useless — a slash only means
a command at the start of an empty line (her rule, 2026-08-28), which is
exactly where an icon is least wanted. She called it immediately. The fix is a
trigger of its own, ungated the way `@` and `[[` are, with one rule on it:
`iconMenuOpens` requires the character before the colon to be nothing or
whitespace, so `Note:`, `Chapter 4:` and `10:` stay shut and ` :swo` opens.
Seven unit tests over that pair of cases.

**It cost a conflict nobody had noticed.** `BlockNoteView` mounts BlockNote's
own emoji picker on `:` by default, so for a while two menus were live on one
key — ours drew on screen and theirs answered the Enter, inserting a bare emoji
where a glyph had been chosen. Nothing threw; the only symptom was a scenario
failing on a count several lines later, which took three runs and a DOM dump to
pin down. `emojiPicker={false}` settles it, and the emoji half of our menu is
now BlockNote's own list through `getDefaultEmojiPickerItems` — the full
emoji-mart set rather than `constants/emoji.ts`'s curated few hundred, so
nothing was lost by turning theirs off.

**And a trap in the app test suite, now written down.**
`.bn-suggestion-menu-item` is on the option's row *and* on its icon, title and
subtext, so one option is four matches — clicking the wrong one closes the menu
and inserts nothing, silently. `pickSuggestion` in `e2e/harness/screen.ts` is
the helper that gets it right, and says why.

**And it took three cuts to get the shape right, which is the part worth
keeping.** The first was BlockNote's default suggestion menu: one icon per row
with its name beside it, scrolled vertically. The second drew the same items in
the picker's grid. Both were rejected on sight, and the second rejection is the
one that named the real problem — *a menu can only be searched by typing, so
there is no way to reach an icon whose name you do not know*, which is most of
fifteen hundred of them. Her words for it were that nobody would use a menu
they cannot scroll.

**So the third cut opens the picker itself.** `IconPicker` had both halves
since Phase 18c — a search box over everything and a browsable grid under it —
and building a lookalike beside it was the mistake, twice. `use-editor` owns
the trigger now: the `:` keystroke is read off the DOM selection (which is the
only thing carrying both the text before the caret and the caret's rectangle at
that moment), the colon is left in the writing until an icon replaces it, and
`insertIconAtTrigger` swaps the one for the other. `IconMenu.tsx` and
`icon-menu-items.tsx` were deleted rather than kept around.

**And the emoji half was fixed the same day rather than left as a cost.**
Taking `:` from BlockNote meant losing the complete emoji-mart set it carried,
against `constants/emoji.ts`'s 129 curated ones. She approved the dependency,
so `@emoji-mart/data` (MIT, the same file BlockNote itself depends on) is now
ours directly and `emoji.ts` reshapes it into what the picker draws: 1870
emoji in the eight groups an emoji keyboard uses, searched by name, keyword and
shortcode. It reaches every picker in the app, not just the editor's — a page's
icon and a meter's readings gained the full set too.

**Measurements.** ~475KB of JSON in the bundle, the same trade
`glyph-catalogue.ts` records for the icons. The Emoji tab draws all 1870 in
about 760ms on first open, which is the cost of not paging it; paging is what
the glyph tab does and it is the thing she rejected, so the whole list stays.

**One bug found in the same pass, and it was the worst kind.** A caret in an
empty block has no rectangle — `getBoundingClientRect()` returns all zeros —
and the trigger read that as having nowhere to anchor and declined to open. So
the picker worked everywhere except the most ordinary place to type, a fresh
line, and it was reported from use rather than caught here. The fallback is the
line element's own box, and there is a scenario on it now.

**Three more found by using it, all in one gesture.** She typed `:joy:` and
nothing happened, which turned out to be three separate faults stacked:
`TreePopover` focused the first tab button rather than the search box (its
measuring frame makes `autoFocus` a no-op, which its own comments already knew
about focusing and nobody had connected to `autoFocus`); the closing colon of
`:joy:` matched nothing, since the box is reached *by* a colon and the habit is
to type the other one; and searching only looked inside the selected tab, so an
emoji's name typed on the Glyphs tab returned "Nothing matches" with the answer
one click away. Stripping colons also fixed an open-cost regression nobody had
reported yet — a box holding just `:` counted as a search, and a search draws
all 1870 emoji, so every open of the picker anywhere in the app had picked up
about three quarters of a second.

**It ended as two controls on one key, and the route there is the record worth
keeping.** Four cuts: a suggestion menu listing matches (rejected — a single
column of pictures with no way to scroll the rest); the same items drawn in the
picker's grid (rejected — still only reachable by typing a name you might not
know); the picker itself on a bare `:` (rejected — no fast path for when you
*do* know the name, and it fired on punctuation); and finally both, split by
key. `:` plus two characters is the type-ahead, single column, emoji written as
`:joy:`, Enter or Tab to take one. `Ctrl+:` opens the picker. Her call, and the
lesson is that "surely it can be both" was the right question all along — the
three failures were each an attempt to make one control cover two jobs.

**What the split cost in code is small**, which is the tell that it was the
right shape: `minQueryLength` on BlockNote's own controller does the "type
something first" half, `shouldOpen` keeps the `Note:` rule on top of it, and
the chord is `preventDefault`ed so its colon reaches neither the writing nor
the picker's focused search box. Arrow keys, Tab and Enter came free —
`handleSuggestionListKeys` has translated those for every suggestion menu in
the app since Phase 14.
