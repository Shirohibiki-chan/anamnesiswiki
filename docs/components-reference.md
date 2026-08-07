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
| First-launch project picker — grid of recent projects + "Open folder" and "New project" buttons; opens a native folder picker via Tauri dialog | `src/components/shell/ProjectPicker.tsx` |
| Startup routing element that reads the last-opened project from Tauri store and either loads it directly or renders `ProjectPicker` if none exists | `src/components/shell/StartupRouter.tsx` |
| The settings dialog — the frame, the vertical rail of sections, and the one table (`SETTINGS_TABS`) that decides what's in it. Adding a section is one entry there. | `src/components/shell/SettingsModal.tsx` |
| Settings → Theme — the theme list with live swatch dots, the themes-folder buttons, and "Put everything back to default" | `src/components/shell/ThemeSettings.tsx` |
| Settings → Colours — the colour and gradient pickers, and "Make a copy I can edit" for built-in themes. Writes a `.css` file; see `docs/constants-and-theming.md`. | `src/components/shell/ThemeEditor.tsx` |
| Settings → Fonts and text — four typeface pickers with live specimens, plus the Writing and Interface size sliders | `src/components/shell/FontSettings.tsx` |
| Settings → Snippets — the on/off list of snippet stylesheets and the snippets-folder button | `src/components/shell/SnippetSettings.tsx` |
| The two notices Settings shows about her own `.css` files — "we stripped some URLs" and "couldn't open that folder, here's the path" — shared by the Theme and Snippets panels | `src/components/shell/StylesheetNotices.tsx` |
| Settings → Projects / Keyboard / Updates | `src/components/shell/ProjectsSettings.tsx`, `ShortcutSettings.tsx`, `UpdateCheck.tsx` |

### Tree (`src/components/tree/`)

| What you see | File |
|---|---|
| Left sidebar container — top tab strip (Project / Templates / Assets), search bar, and the tree itself. Only the Project tab has behavior in Phase 1. | `src/components/tree/TreeSidebar.tsx` |
| The project name row at the top of the tree with a home icon and "+" button for adding a top-level page | `src/components/tree/ProjectHeader.tsx` |
| Search / filter input at the top of the tree — matches by name and by `#tag` prefix; passes through to `Fuse.js` | `src/components/tree/TreeSearch.tsx` |
| The scrollable tree body — renders root nodes and delegates recursion to `TreeItem`; owns drag/drop reparenting via react-arborist | `src/components/tree/TreePanel.tsx` |
| One tree row — icon (colored per effective color, cascading from parent unless overridden), name (renamable inline), color-dot button on hover, "+" button on hover for nodes that can have children, right-click context menu | `src/components/tree/TreeItem.tsx` |
| Color palette popover shown when a color dot is clicked — 10-12 preset swatches plus a "clear/default" X button; shows "Inheriting from parent" hint when the current node has no own color but an ancestor does | `src/components/tree/ColorPicker.tsx` |
| Right-click context menu on tree rows — Rename / Duplicate / Set color / Delete / Add child, keyboard-accessible | `src/components/tree/ContextMenu.tsx` |

### Page (`src/components/page/`)

| What you see | File |
|---|---|
| Center content wrapper — routes between `FolderView` and the tabbed page view based on the selected node's template. Also owns the scroll container. | `src/components/page/PageView.tsx` |
| Large page title row — template icon (colored per effective color), click-to-rename inline editor, breadcrumb-style parent path above | `src/components/page/PageTitle.tsx` |
| Tab strip beneath the title — one button per tab, active-tab underline in accent color, click-the-eye toggle to hide/show a tab. Hidden tabs render dimmer and italic. | `src/components/page/PageTabs.tsx` |
| BlockNote editor wrapper for the active tab's content — configures BlockNote with the custom Info / Quote / Secret blocks, mention extension, and wikilink parsing; debounces content changes to the autosave service | `src/components/page/Editor.tsx` |
| Empty-content view shown for folder nodes — folder name, color-tint background, and a "Folders hold other pages" hint with a call-to-action button that opens `NewPageModal` targeted at this folder | `src/components/page/FolderView.tsx` |
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

### Modals (`src/components/modals/`)

| What you see | File |
|---|---|
| Base modal wrapper used by every dialog below — renders a blurred backdrop, handles Escape-to-close, and shows a "Discard changes?" confirm dialog when `isDirty` is true | `src/components/modals/Modal.tsx` |
| Template picker for creating a new page — grid of the 8 template types with icons and names; clicking creates a fresh page of that type under the target parent | `src/components/modals/NewPageModal.tsx` |
| LegendKeeper import wizard — file picker for `.lk` files, preview of the parsed tree with inferred template counts per branch, warnings for content types that will lossy-convert (columns, inline icons), Confirm button that commits the import | `src/components/modals/ImportModal.tsx` |
| LegendKeeper export dialog — checkbox tree of what to export (all / folders / specific pages), Cancel and Export buttons; produces a `.lk` file the user saves anywhere | `src/components/modals/ExportModal.tsx` |
| Publish dialog (Phase 1.5) — checkbox tree of what to publish, "include hidden tabs?" toggle (default off), tag filter, output folder picker; on Publish, generates a static site to the chosen folder | `src/components/modals/PublishModal.tsx` |
| Two-step confirm dialog used for destructive actions (delete node with children, reset project, replace-on-import) — requires the user to type the item name or click a second confirm button | `src/components/modals/ConfirmDialog.tsx` |
| "About" / help dialog — shows app version, links to `docs/glossary.md` rendered in-app, credits, license | `src/components/modals/AboutModal.tsx` |
| "What's new" modal — renders `CHANGELOG.md` via Vite raw import as a styled list of dated entries | `src/components/modals/ChangelogModal.tsx` |
