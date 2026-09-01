# Components Reference

## Component Folders (`src/components/`)

| Folder | Purpose |
|--------|---------|
| `shell/` | App-level layout — the three-column shell, top bar, and the startup project picker screen |
| `tree/` | Left sidebar — project tree, search/filter, project header, color picker popover |
| `page/` | Center content area — page title, tab strip, breadcrumb bar, BlockNote editor wrapper, folder view |
| `properties/` | Right sidebar — image slot and template-driven property fields (text, tags, references, dates) |
| `modals/` | **Empty** — holds only a `.gitkeep`. Dialogs live beside the feature they belong to; see the Dialogs section below |

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
| Start from a template — the list of templates, the tree preview of the selected one, and the name box. Its own busy flag and error line, both inside the window | `src/components/start/TemplatePickerDialog.tsx`, `src/hooks/use-project-templates.ts` |
| The `.antpl` format itself: building one from a project, parsing one she was sent, and turning one into nodes. The shipped default template is a constant | `src/services/project-template.ts`, `src/constants/project-template.ts`, `src/constants/default-project-template.ts` |
| What the start screen can do that can fail: open a listed project, open a folder she picked (including looking one level in), create a new one, rename or duplicate one, export one as a template | `src/hooks/use-start-actions.ts` |
| Pages, for any long grid. Reads both list preferences — pages-or-scroll, and how many go on one — and puts her back at the top of the page when it turns | `src/hooks/use-paged-list.ts`, `src/services/pagination.ts` |
| The arrows and dots (or the counter) under a paged grid, shared by all three | `src/components/shell/PageNav.tsx` |
| Startup routing element that reads the last-opened project from Tauri store and either loads it directly or renders `StartScreen` if none exists | `src/components/shell/StartupRouter.tsx` |
| The settings panel — docked at the right edge of the window on every section, never centred; the frame, the vertical rail of sections, the search box, and the ranked result list. Why it is a dock rather than a dialog, and why nothing in it may be keyed off the open section, is in `docs/constants-and-theming.md`. The rail's contents come from `SETTINGS_TABS` in `src/constants/settings.ts`; adding a section is an entry there **and** one in this file's `PANELS` map, which a test checks are in step. | `src/components/shell/SettingsModal.tsx` |
| Settings search — the index of every setting, built from the same registries the panels render from. A result scrolls to and flashes the row tagged `data-setting="<entry id>"`. | `src/services/settings-search.ts`, `src/constants/settings.ts` |
| Settings → Theme — the theme list with live swatch dots, the New theme / import / folder buttons, and "Put everything back to default" | `src/components/shell/ThemeSettings.tsx` |
| Settings → Colours — the colour and gradient pickers. Writes a `.css` file; see `docs/constants-and-theming.md`. | `src/components/shell/ThemeEditor.tsx` |
| Making a theme — "Make a copy I can edit" with a name field, and the bare New theme button. Shared by the three panels that offer it. | `src/components/shell/CreateTheme.tsx` |
| Settings → Fonts and text — the every-theme switch, four typeface pickers with live specimens (writing into the theme file, or into the override), plus the Writing and Interface size sliders | `src/components/shell/FontSettings.tsx` |
| Settings → Snippets — the on/off list of snippet stylesheets and the snippets-folder button | `src/components/shell/SnippetSettings.tsx` |
| The two notices Settings shows about her own `.css` files — "we stripped some URLs" and "couldn't open that folder, here's the path" — shared by the Theme and Snippets panels | `src/components/shell/StylesheetNotices.tsx` |
| Settings → Writing — how the editor behaves as you write. One setting so far: whether the formatting bar appears on a selection or stays at the top of the page | `src/components/shell/WritingSettings.tsx` |
| Settings → Sidebar / Projects / Keyboard / Updates | `src/components/shell/SidebarSettings.tsx`, `ProjectsSettings.tsx`, `ShortcutSettings.tsx`, `UpdateCheck.tsx` |
| The release notes shown inside the Updates panel, rendered from the GitHub release body | `src/components/shell/ReleaseNotes.tsx` |
| Settings → Patch Notes — a strip of the last few versions over the notes for whichever is selected, read from the bundled `RELEASES.md` rather than fetched | `src/components/shell/PatchNotes.tsx` |

### Tree (`src/components/tree/`)

| What you see | File |
|---|---|
| Left sidebar container — top tab strip (Project / Templates / Assets), search bar, and the tree itself. All three tabs are live — Templates and Assets shipped in Phase 17. | `src/components/tree/TreeSidebar.tsx` |
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
| The three callouts and the colour dot in the corner of one — the palette, the icon the four conventional hues carry, and *The usual colour* to put it back | `src/services/editor-blocks/callout-wrapper.tsx`, `callout-color-button.tsx`, `src/constants/callout-colors.ts` |
| An icon in the middle of a sentence, inserted by `/icon` and clickable afterwards — inline content holding one prop, not a pasted character | `src/services/editor-blocks/icon-inline-content.tsx`, `IconChip.tsx`, `icon-slash-menu.tsx` |
| The  menu — glyphs from the catalogue, emoji from BlockNote's own list, and the rule that keeps  from opening it | ,  |
| A `:` mid-sentence opening the icon picker at the caret, and the rule that keeps `Note:` from opening it | `src/hooks/use-editor.ts`, `src/services/editor-blocks/icon-trigger.ts`, `src/components/blocks/EditorIconPicker.tsx` |
| The icon picker as the editor's blocks see it — the Phase 18c picker in a popover, reached through a context because services may not import a component | `src/components/blocks/EditorIconPicker.tsx`, `src/services/editor-blocks/icon-pick-context.ts` |
| Make a page and link to it without leaving the sentence — name, link text, where it goes, hidden. Opened from the `/` menu's *New page* and from a `[[Name]]` nothing answers to, which arrives pre-filled | `src/components/shell/NewPageLinkDialog.tsx`, `src/services/editor-blocks/new-page-slash-menu.tsx` |
| Content-less view shown for folder nodes — folder name, color-tint background, and a button that makes a page inside this folder. The "Folders hold other pages" hint below the name appears only while the folder is empty. | `src/components/page/FolderView.tsx` |
| What a brand-new page shows before it's anything in particular — the grid of template choices, and a "skip this" that leaves the page blank with somewhere to write. Replaces the popover that used to ask before the page existed. | `src/components/page/NewPageLanding.tsx` |
| Placeholder rendered when no node is selected (rare — usually the app auto-selects a page on load) | `src/components/page/EmptyPageView.tsx` |

### Properties (`src/components/properties/`)

| What you see | File |
|---|---|
| Right sidebar container — finds the selected page, and owns everything that is *the sidebar*: the empty states, the template prompt, Add Block, the new-property form, and the timestamps at the bottom | `src/components/blocks/BlockPanel.tsx` |
| The block list itself — an ordered run of blocks drawn wherever it is asked to be. Knows nothing about the sidebar, so Phase 19.5's page-body block and infobox draw through the same file. Takes the node and the blocks; reports ordering as ids, since a list on screen may be only part of `node.blocks` | `src/components/blocks/BlockList.tsx` |
| Image drop zone at the top of the properties panel — accepts drag/drop, click-to-browse; uploads copy the file into the project's `assets/` folder and store the asset id on the node | `src/components/properties/ImageSlot.tsx` |
| Single-line text field for properties like Summary or When — autosaves on blur; grows to multi-line for longer content | `src/components/properties/TextProperty.tsx` |
| Tag chip editor — comma-or-enter to add, X on hover to remove, autocompletes against all tags already used in the project | `src/components/properties/TagsProperty.tsx` |
| Reference selector for properties like Friends / Leader / Participants — searchable dropdown of all non-folder nodes in the project, added items render as clickable chips that navigate to the referenced node | `src/components/properties/RefsProperty.tsx` |
| Date picker for the Event template's When property — accepts free-text ("Year 872, Third Age") or a real date | `src/components/properties/DateProperty.tsx` |
| Number field — stores a real number rather than a numeric string, and keeps what you're typing intact while you type it | `src/components/properties/NumberProperty.tsx` |
| Select / multi-select / status field — one component for all three; options are created by typing, render as coloured chips, and can be renamed, recoloured or deleted from the dropdown. A "Used elsewhere" group offers the values this property has on other pages of the same kind | `src/components/properties/SelectProperty.tsx` |
| Created / Updated dates at the foot of the panel, exact time on hover | `src/components/properties/PropertyTimestamps.tsx` |
| The All properties & tags view — every property name and tag in the project with use counts, project-wide rename (merging when the new name exists) and delete, and click-through to the pages using one. A chip property also lists its values, each renameable, recolourable and deletable across the project. Opens from the search palette's footer or Ctrl+Shift+K | `src/components/properties/AllPropertiesModal.tsx` |

### Dialogs

**There is no shared modal component and `src/components/modals/` is empty** — it holds a `.gitkeep` and nothing else. Each dialog lives with the feature it belongs to. This section listed a `modals/Modal.tsx` base wrapper and six dialogs inside that folder until 2026-08-31; none of it was true, and two of the files named had never been built at all.

| What you see | File |
|---|---|
| LegendKeeper import — file picker, preview of the parsed tree, warnings for what will convert lossily | `src/components/import/ImportModal.tsx` |
| LegendKeeper export — what to export, and the `.lk` file it writes | `src/components/export/ExportModal.tsx` |
| Two-step confirm for destructive actions | `src/components/shell/ConfirmDialog.tsx` |
| A message with nothing to decide — the one-way notices | `src/components/shell/NoticeDialog.tsx` |
| Settings, and its rail of sections | `src/components/shell/SettingsModal.tsx` |
| Picking a picture from the library | `src/components/shell/AssetPickerDialog.tsx` |
| Saving a page as a template | `src/components/shell/SaveAsTemplateDialog.tsx` |
| Making a page and linking to it without leaving the sentence | `src/components/shell/NewPageLinkDialog.tsx` |
| The full-size picture viewer | `src/components/shell/Lightbox.tsx` |
| Start from a template, and managing pinned projects | `src/components/start/TemplatePickerDialog.tsx`, `src/components/start/ManagePinsDialog.tsx` |
| All properties & tags | `src/components/properties/AllPropertiesModal.tsx` |

**Not built:** a Publish dialog (Phase 1.5) and an About dialog (`plan.md` → Queued Adjustments). Both were listed here as though they existed.
