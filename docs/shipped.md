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
right at a resting `opacity: 0.65` instead of top-left and invisible; `<pre>`
switched from `white-space: pre` to `pre-wrap`, so a prompt pasted as one long
line wraps instead of running off the right edge with the rest unreachable.

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
