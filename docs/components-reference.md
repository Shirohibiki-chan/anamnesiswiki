# Components Reference

## Component Folders (`src/components/`)

| Folder | Purpose |
|--------|---------|
| `shell/` | App-level layout — the three-column shell, top bar, and the startup project picker screen |
| `tree/` | Left sidebar — project tree, search/filter, project header, color picker popover |
| `page/` | Center content area — page title, tab strip, breadcrumb bar, BlockNote editor wrapper, folder view |
| `properties/` | Right sidebar — image slot and template-driven property fields (text, tags, references, dates) |
| `modals/` | Full-screen overlay dialogs and the base modal wrapper they all use |

---

## Feature Map — What You See → Where It Lives

### Shell (`src/components/shell/`)

| What you see | File |
|---|---|
| The three-column app frame (left tree / center page / right properties), including panel show/hide state and responsive collapsing on narrow windows | `src/components/shell/AppLayout.tsx` |
| Top bar spanning the center panel — breadcrumb trail on the left, right-panel toggle on the right, tiny fade-in "Saved" indicator after autosave commits | `src/components/shell/TopBar.tsx` |
| The start screen — brand, the one centred "New project" button, the filter box, and the rail. Rendered before any project is open | `src/components/start/StartScreen.tsx` |
| Every project as covers or rows, a page at a time or in one scroll, with the view toggle and the page controls | `src/components/start/ProjectGrid.tsx`, `src/components/start/ProjectTile.tsx` |
| The start screen's right-hand rail — recently opened, the ways to start something, the cog | `src/components/start/StartRail.tsx` |
| What the start screen can do that can fail: open a listed project, open a folder she picked (including looking one level in), create a new one | `src/hooks/use-start-actions.ts` |
| Pages that fit the window, for any long grid. Reads the pages-or-scroll preference. `useMeasuredPagedList` is the variant for a grid whose tile size only the CSS knows — the two picture grids | `src/hooks/use-paged-list.ts`, `src/services/pagination.ts` |
| The arrows and dots (or the counter) under a paged grid, shared by all three | `src/components/shell/PageNav.tsx` |
| Startup routing element that reads the last-opened project from Tauri store and either loads it directly or renders `StartScreen` if none exists | `src/components/shell/StartupRouter.tsx` |
| The settings dialog — the frame, the vertical rail of sections, the search box, and the ranked result list. The rail's contents come from `SETTINGS_TABS` in `src/constants/settings.ts`; adding a section is an entry there **and** one in this file's `PANELS` map, which a test checks are in step. | `src/components/shell/SettingsModal.tsx` |
| Settings search — the index of every setting, built from the same registries the panels render from. A result scrolls to and flashes the row tagged `data-setting="<entry id>"`. | `src/services/settings-search.ts`, `src/constants/settings.ts` |
| Settings → Theme — the theme list with live swatch dots, the New theme / import / folder buttons, and "Put everything back to default" | `src/components/shell/ThemeSettings.tsx` |
| Settings → Colours — the colour and gradient pickers. Writes a `.css` file; see `docs/constants-and-theming.md`. | `src/components/shell/ThemeEditor.tsx` |
| Making a theme — "Make a copy I can edit" with a name field, and the bare New theme button. Shared by the three panels that offer it. | `src/components/shell/CreateTheme.tsx` |
| Settings → Fonts and text — the every-theme switch, four typeface pickers with live specimens (writing into the theme file, or into the override), plus the Writing and Interface size sliders | `src/components/shell/FontSettings.tsx` |
| Settings → Snippets — the on/off list of snippet stylesheets and the snippets-folder button | `src/components/shell/SnippetSettings.tsx` |
| The two notices Settings shows about her own `.css` files — "we stripped some URLs" and "couldn't open that folder, here's the path" — shared by the Theme and Snippets panels | `src/components/shell/StylesheetNotices.tsx` |
| Settings → Sidebar / Projects / Keyboard / Updates | `src/components/shell/SidebarSettings.tsx`, `ProjectsSettings.tsx`, `ShortcutSettings.tsx`, `UpdateCheck.tsx` |
| The release notes shown inside the Updates panel, rendered from the GitHub release body | `src/components/shell/ReleaseNotes.tsx` |
| Settings → Patch Notes — a strip of the last few versions over the notes for whichever is selected, read from the bundled `RELEASES.md` rather than fetched | `src/components/shell/PatchNotes.tsx` |

### Tree (`src/components/tree/`)

| What you see | File |
|---|---|
| Left sidebar container — top tab strip (Project / Templates / Assets), search bar, and the tree itself. Only the Project tab has behavior in Phase 1. | `src/components/tree/TreeSidebar.tsx` |
| The project name row at the top of the tree with a home icon and "+" button for adding a top-level page | `src/components/tree/ProjectHeader.tsx` |
| Search / filter input at the top of the tree. Passes through to `createSearchMatcher` in `tree-service.ts`, which owns the `Fuse.js` index per scope. | `src/components/tree/TreeSearch.tsx` |
| The "what am I searching" menu and the chip that shows a narrowed scope — shared by the tree filter and the Ctrl-K palette, which pass their own scope lists in. Typing a leading `#` sets tag scope and deletes itself from the field. | `src/components/search/SearchScopeMenu.tsx` |
| The shortcut rail under the tree search — pinned pages as icon tiles, set from the right-click menu. Absent entirely when nothing is pinned. Middle-click a tile to unpin. | `src/components/tree/BookmarksRail.tsx` |
| The path bar above a focused tree — project name → … → the node whose inside is showing. Only rendered while focused; its absence is what says you're seeing the whole project. | `src/components/tree/TreePathBar.tsx` |
| The scrollable tree body — renders root nodes and delegates recursion to `TreeItem`; owns drag/drop reparenting via react-arborist | `src/components/tree/TreePanel.tsx` |
| One tree row — icon (colored per effective color, cascading from parent unless overridden), name (renamable inline; double-click opens the row instead of renaming unless Settings → Sidebar says otherwise), and three hover buttons: color dot, "..." for the context menu, "+" for a page inside. The menu is also on right-click. Hidden pages, and pages inside one, render dimmed and italic. | `src/components/tree/TreeItem.tsx` |
| Color palette popover shown when a color dot is clicked — 10-12 preset swatches plus a "clear/default" X button; shows "Inheriting from parent" hint when the current node has no own color but an ancestor does | `src/components/tree/ColorPicker.tsx` |
| Right-click context menu on tree rows — New page inside / Rename / Duplicate / Set color / Show in the file manager / Delete, keyboard-accessible | `src/components/tree/ContextMenu.tsx` |

### Page (`src/components/page/`)

| What you see | File |
|---|---|
| Center content wrapper — routes between `FolderView` and the tabbed page view based on the selected node's template. Also owns the scroll container. | `src/components/page/PageView.tsx` |
| Large page title row — template icon (colored per effective color), click-to-rename inline editor, breadcrumb-style parent path above | `src/components/page/PageTitle.tsx` |
| Tab strip beneath the title — one button per tab, active-tab underline in accent color, click-the-eye toggle to hide/show a tab. Hidden tabs render dimmer and italic. | `src/components/page/PageTabs.tsx` |
| BlockNote editor wrapper for the active tab's content — configures BlockNote with the custom Info / Quote / Secret blocks, mention extension, and wikilink parsing; debounces content changes to the autosave service | `src/components/page/Editor.tsx` |
| The chip a mention or wikilink renders as, and the card it shows on hover after 350ms. Both link kinds are this one component — wikilinks resolve into mentions. | `src/services/editor-blocks/MentionChip.tsx`, `HoverPreviewCard.tsx` |
| Empty-content view shown for folder nodes — folder name, color-tint background, and a "Folders hold other pages" hint with a button that makes a page inside this folder | `src/components/page/FolderView.tsx` |
| What a brand-new page shows before it's anything in particular — the grid of template choices, and a "skip this" that leaves the page blank with somewhere to write. Replaces the popover that used to ask before the page existed. | `src/components/page/NewPageLanding.tsx` |
| Placeholder rendered when no node is selected (rare — usually the app auto-selects a page on load) | `src/components/page/EmptyPageView.tsx` |

### Properties (`src/components/properties/`)

| What you see | File |
|---|---|
| Right sidebar container — reads the current node's template, renders the image slot at top followed by one field per template property | `src/components/properties/PropertiesPanel.tsx` |
| Image drop zone at the top of the properties panel — accepts drag/drop, click-to-browse; uploads copy the file into the project's `assets/` folder and store the asset id on the node | `src/components/properties/ImageSlot.tsx` |
| Single-line text field for properties like Summary or When — autosaves on blur; grows to multi-line for longer content | `src/components/properties/TextProperty.tsx` |
| Tag chip editor — comma-or-enter to add, X on hover to remove, autocompletes against all tags already used in the project | `src/components/properties/TagsProperty.tsx` |
| Reference selector for properties like Friends / Leader / Participants — searchable dropdown of all non-folder nodes in the project, added items render as clickable chips that navigate to the referenced node | `src/components/properties/RefsProperty.tsx` |
| Date picker for the Event template's When property — accepts free-text ("Year 872, Third Age") or a real date | `src/components/properties/DateProperty.tsx` |
| Number field — stores a real number rather than a numeric string, and keeps what you're typing intact while you type it | `src/components/properties/NumberProperty.tsx` |
| Select / multi-select / status field — one component for all three; options are created by typing, render as coloured chips, and can be renamed, recoloured or deleted from the dropdown. A "Used elsewhere" group offers the values this property has on other pages of the same kind | `src/components/properties/SelectProperty.tsx` |
| Created / Updated dates at the foot of the panel, exact time on hover | `src/components/properties/PropertyTimestamps.tsx` |
| The All properties & tags view — every property name and tag in the project with use counts, project-wide rename (merging when the new name exists) and delete, and click-through to the pages using one. A chip property also lists its values, each renameable, recolourable and deletable across the project. Opens from the search palette's footer or Ctrl+Shift+K | `src/components/properties/AllPropertiesModal.tsx` |

### Modals (`src/components/modals/`)

| What you see | File |
|---|---|
| Base modal wrapper used by every dialog below — renders a blurred backdrop, handles Escape-to-close, and shows a "Discard changes?" confirm dialog when `isDirty` is true | `src/components/modals/Modal.tsx` |
| LegendKeeper import wizard — file picker for `.lk` files, preview of the parsed tree with inferred template counts per branch, warnings for content types that will lossy-convert (columns, inline icons), Confirm button that commits the import | `src/components/modals/ImportModal.tsx` |
| LegendKeeper export dialog — checkbox tree of what to export (all / folders / specific pages), Cancel and Export buttons; produces a `.lk` file the user saves anywhere | `src/components/modals/ExportModal.tsx` |
| Publish dialog (Phase 1.5) — checkbox tree of what to publish, "include hidden tabs?" toggle (default off), tag filter, output folder picker; on Publish, generates a static site to the chosen folder | `src/components/modals/PublishModal.tsx` |
| Two-step confirm dialog used for destructive actions (delete node with children, reset project, replace-on-import) — requires the user to type the item name or click a second confirm button | `src/components/modals/ConfirmDialog.tsx` |
| "About" / help dialog — shows app version, links to `docs/glossary.md` rendered in-app, credits, license | `src/components/modals/AboutModal.tsx` |
| "What's new" modal — renders `CHANGELOG.md` via Vite raw import as a styled list of dated entries | `src/components/modals/ChangelogModal.tsx` |
