# Handoff: Pre-Development → Phase 0

## Where We Are

**Phase 8 shipped 2026-07-30.** LK import: the user's real `Valeraverse.lk` (75 resources) imports as a brand-new project — tabs, formatting, cross-references, properties, images, and banners all included. Next up is Phase 9 (LK Export), though a "proper project home" feature is queued ahead of it (see Queued Adjustments in `docs/plan.md`).

A full structural code review ran 2026-07-30 before starting Phase 9 — findings and their fixes are logged under "Code Review 2026-07-30" below.

This doc is now the running log of what's shipped and what's next — same shape as the CharSnap-tracker handoff.

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

**Noted, not fixed:** `duplicateNode` stamps every clone in a subtree with the same `createdAt`, so cloned siblings fall back to the `id.localeCompare` tie-break — meaning a duplicated folder's children come out in an arbitrary order rather than matching the original. Ordering only, no data loss.

**Noted, not fixed:** the real export also reports 15 broken cross-reference links on import. Those are mentions pointing at the LK project root, which becomes the Project itself rather than a Node (see the Phase 8 notes below). Worth revisiting alongside the queued "proper project home" feature, since that's the thing they'd naturally point at.

## Repo Snapshot

Anticipated layout after Phase 0 lands:

- `src/` — React + TypeScript app (constants → services → state → hooks → components)
- `src-tauri/` — Tauri Rust shell (kept as thin as Tauri ships it)
- `docs/` — spec, plan, glossary, data model, LK format notes, references, this handoff
- `docs/prototype/anamnesis.jsx` — the reference React prototype (frozen; not part of the build)
- `CLAUDE.md` — architecture rules and policy boundary at repo root
- `CHANGELOG.md` — bootstrapped in Phase 0
- `README.md`, `LICENSE` — at repo root

## Reference Material Available

Everything Claude Code needs to start Phase 0 is already written:

- `CLAUDE.md` — architecture rules, layer order, naming conventions, policy boundary, don't-do list
- `docs/spec.md` — the full build spec; every phase item traces back here
- `docs/plan.md` — phased roadmap; work top-down, do not build ahead
- `docs/components-reference.md` — target component layout, one row per component with responsibility notes
- `docs/constants-and-theming.md` — CSS token system, palette, callout tokens, typography, folder-vs-page color rules
- `docs/glossary.md` — domain terms (node, tab, template, cascade, callout, secret, LK, etc.)
- `docs/prototype/anamnesis.jsx` — working React prototype demonstrating layout, template content, tree behavior, tab visibility, cascade colors, properties panel. **The canonical placeholder copy for all 8 templates lives here.**
- `README.md` — user-facing project intro; useful for setting the app's tone

Docs not yet written but referenced in the plan:

- `docs/data-model.md` — schemas for Node / Tab / Project on disk. Will be created in Phase 1.

## First-Time Setup Notes

Things worth knowing before Phase 0 starts:

- **Tauri v2 requires Rust.** If not already installed, follow the Tauri prereq guide (`rustup`, platform-specific build tools). The user won't need Rust on their end (only for building), but the dev machine needs it.
- **Package manager is pnpm, not npm.** All commands use `pnpm`.
- **Node 20+.** Older Node versions will fail the Tauri v2 install.
- **The file-per-node data layout on disk is critical to get right early.** Reparents and renames map to `fs.rename` calls. Phase 1 should nail this behavior before any UI is built on top; retrofitting it later is painful.
- **Windows path length matters.** Deep tree nesting + long node names can hit the ~260-char limit. Handle at the filesystem layer with a warning or truncation strategy.
- **Template placeholder copy is a designed asset.** The LK-style prompts in the prototype are the copy to ship — do not paraphrase, do not "improve," do not extract into a separate content system that makes them editable. They live in code as string literals in `template-registry.ts`.
- **BlockNote is the editor.** Do not fork it. Do not roll a custom ProseMirror setup. Extend via BlockNote's documented block-spec and extension APIs.
- **The `.lk` format is gzipped JSON with ProseMirror content.** This is good news — it maps cleanly to BlockNote. Bad surprises are limited to LK-specific block types (columns, inline icons) that need explicit translation.

## Recent Design Decisions

Decisions the user made during planning that affect scope:

- **LK import/export is Phase 1 must-have, not deferred.** The user has 75 pages in `Valeraverse.lk` that need to migrate on Day 1.
- **Folder colors use full-row tinting; page colors are icon-only.** Folders are categorical anchors and read as visual containers; pages are their contents and shouldn't compete with their folder's identity.
- **Colors cascade to descendants** unless overridden. The node that broke the cascade (the "owner") gets a solid left-border stripe in the tree to make ownership visible.
- **Empty folders stay folders.** An empty container isn't visually demoted — the user may be preparing it for future content.
- **The Species template was added** after finding a Species-shaped page in the user's LK export (Foxians, with Overview / Biology / Lifestyle / Beliefs / Relations tabs).
- **File-per-node on disk with tree-mirroring layout** — not a flat directory of hash-named JSON files. The user should be able to browse the project folder in Finder/Explorer and understand what's there.
- **No cloud, no auth, no network calls in Phase 1.** Full offline. No telemetry, no update pings, no font CDNs. Bundle everything.
- **Not a LegendKeeper client.** The app never talks to LK's servers. LK integration is file-based only.
- **Read-only publish (Phase 1.5) uses the same feature for co-writer sharing and eventual public release.** Same static-site generator, different filter settings.

## Known Design Gaps

Deferred to later phases; explicitly out of scope now:

- Theme switcher UI and the 5 additional themes (Light / Parchment / Foxian / Belobog / Deep Space) — hinted at in `constants-and-theming.md`, not built.
- Cloud sync architecture — a Phase 2 conversation, not a Phase 1 decision. Do not scaffold.
- Mobile version — not planned.
- LLM/AI features in the editor — explicitly excluded per CLAUDE.md.
- User-editable templates — templates live in code in Phase 1.
- Interactive atlas / nested maps — LK's atlas feature is not being cloned in Phase 1.
- Timeline / relationship graph views — future features, not scoped.
- **OS-level file drag-and-drop is off** (`dragDropEnabled: false` in `tauri.conf.json`), traded off in Phase 3 to make the tree's own drag-to-reparent work — Tauri's native drag-drop handling was intercepting react-dnd's in-page drag events before they ever reached the page (a known Tauri/WebView2 conflict). **Turned out to be a non-issue for Phase 6's image upload** — with Tauri's own interception off, plain HTML5 DnD works normally in the webview, so a dropped OS file arrives as a real browser `File` with usable bytes; no Tauri-specific drag API needed. **Phase 8's `.lk` import sidesteps the question entirely** — it uses a native file-picker button (`pickLkFile` via the dialog plugin) rather than drag-in, so this constraint never came up there.
- **Pages can't have tabs added, renamed, or deleted yet** — only the template's starting tabs exist (currently just the one "Main" stopgap tab, since templates themselves don't exist until Phase 7). Flagged during Phase 4 live-testing: LegendKeeper itself treats tabs as freeform per page, not locked to a template, so this is real functionality to add, not a nice-to-have. Deliberately deferred to Phase 7 rather than bolted onto Phase 4, since it depends on the template registry existing first. See `docs/plan.md` Phase 7.
- **Wikilinks never guess between two pages sharing the same name** — `[[Name]]` only auto-converts when the name is unique across the project; otherwise it's left as plain text (same principle as Obsidian: ambiguity should never resolve silently). There's no picker specifically for "which one did you mean" beyond that — use `@` instead, which always lists every match. Flagged during Phase 5 live-testing as a real, if minor, gap; not fixed since the user was fine leaving it as-is for now.
- **No proper "project home" feature yet.** Phase 8's LK import brings the project root's own text in as a real "Home" page, but there's no dedicated project-home *view* in the app itself (independent of any one page, reachable via `ProjectHeader.tsx`'s home icon). Requested during Phase 8 live-testing; logged in `docs/plan.md`'s Queued Adjustments rather than bolted on, since it needs its own design pass.
- **LK export (Phase 9) isn't built** — Phase 8 only covers import. Round-tripping `Valeraverse.lk` back out isn't possible yet.

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

## Process Notes

- Read `CLAUDE.md` first — architecture rules, layer order, naming conventions, don't-do's, policy boundary.
- Read `docs/spec.md` and `docs/plan.md` before starting any phase.
- Show plan before executing — user approves before code lands. User is non-technical; explain choices in plain language.
- Commit meaningful chunks, not every keystroke.
- Update `docs/plan.md`, `docs/handoff.md`, and `CHANGELOG.md` when shipping changes (see CLAUDE.md §Tracking Docs).
- The user's tone is casual and contractions-heavy. Match it in explanations; be direct in code.

## Not In Scope (Policy Boundary)

Repeated from CLAUDE.md for emphasis:

- Any network calls in Phase 1 — no telemetry, no update checks, no font CDNs, no LK server contact.
- Cloud sync / auth / multi-user features — Phase 2 if ever.
- LLM/AI features baked into the editor.
- Forks of BlockNote or custom ProseMirror setups.
- Custom Rust commands unless the Tauri fs plugin genuinely can't do the job.
- Rewording template placeholder copy without user approval.
