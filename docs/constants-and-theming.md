# Constants & Theming Reference

## Key Constants (`src/constants/`)

- **`palette.ts`** — `COLOR_PALETTE` array (10 preset colors used for node coloring: teal `#5eead4`, sky `#7dd3fc`, purple `#c4b5fd`, rose `#fda4af`, amber `#fcd34d`, sage `#86efac`, orange `#fdba74`, indigo `#a5b4fc`, red `#fca5a5`, gray `#a1a1aa`) plus a `default` entry with no hex (clears the color). `getPaletteHex(key)` resolves a palette key to its hex; returns null for default. Must stay in sync with `--color-palette-*` tokens in `index.css`.

- **`icons.ts`** — `TEMPLATE_ICONS` map from template key to lucide-react icon component (`folder → FolderIcon`, `character → User`, `location → MapPin`, `faction → Users`, `item → Package`, `event → Calendar`, `species → Sparkles`, `note → FileText`). Import via `getTemplateIcon(templateKey)` — do not import lucide directly in components.

- **`format.ts`** — five formatting utilities used across the app:
  - `fmt(n)` — abbreviates to K / M / B (used in the properties panel for reference counts)
  - `fmtFull(n)` — comma-separated full number
  - `fmtDate(iso)` — short locale date (e.g., `"May 16, 2026"`)
  - `fmtRelative(iso)` — human-relative (e.g., `"3d ago"`, `"just now"`)
  - `slugify(name)` — sanitizes a node name into a safe filename (strips path separators, quotes, trims to 100 chars); used by `filesystem-service.ts` when writing node files

- **`limits.ts`** — hard numeric constants:
  - `AUTOSAVE_DEBOUNCE_MS = 300` — how long after a change before writing to disk
  - `MAX_FILENAME_CHARS = 100` — truncate longer names when generating filenames
  - `MAX_TREE_DEPTH = 12` — soft cap; warn the user when nesting approaches this (Windows path length concern)
  - `MAX_TAG_LENGTH = 40` — cap for a single tag string
  - `RECENT_PROJECTS_COUNT = 8` — how many recent projects to show in the picker

- **`keyboard.ts`** — `SHORTCUTS` map from action name to keyboard shortcut string (`newPage: 'Mod+N'`, `search: 'Mod+K'`, `save: 'Mod+S'` — save is a no-op since autosave handles it, but the shortcut fires the save-indicator so the user gets feedback, `nextTab: 'Mod+Alt+ArrowRight'`, `prevTab: 'Mod+Alt+ArrowLeft'`). `Mod` resolves to Cmd on macOS and Ctrl elsewhere.

- **`paths.ts`** — default file locations:
  - `DEFAULT_PROJECTS_DIR` — resolves to `~/Documents/Anamnesis/` via Tauri path API
  - `PROJECT_FILE = 'project.json'` — filename for project metadata
  - `FOLDER_META_FILE = '_folder.json'` — filename for folder metadata (underscore prefix keeps it sorted first)
  - `ASSETS_DIR = 'assets'` — subfolder inside a project for uploaded images

- **`schema.ts`** — `createNode(templateKey, overrides)` and `createTab(overrides)` factory functions that stamp out default-shaped objects; `TEMPLATE_KEYS` array (`['folder', 'character', 'location', 'faction', 'item', 'event', 'species', 'note']`) — canonical order used in the New Page modal. Node fields: `id` (uuid), `parentId`, `templateKey`, `name`, `tabs`, `properties`, `tags`, `color`, `createdAt`, `updatedAt`. Tab fields: `id`, `label`, `hidden`, `content` (BlockNote JSON document).

- **`lk-schema.ts`** — LegendKeeper format constants for import/export:
  - `LK_SUPPORTED_VERSION = 1` — bail with a warning on other versions
  - `LK_PANEL_TYPE_MAP` — mapping from LK panel types to our callout types (`info → info`, `note → quote`, `success → info`, `warning → secret`, `error → secret`)
  - `LK_TAB_SIGNATURES` — mapping from tab-name arrays to inferred template keys (see CLAUDE.md §LegendKeeper Import/Export)

---

## CSS / Theming (`src/index.css`)

### Theme architecture

Anamnesis uses Tailwind v4's `@theme` block to define all semantic color tokens as CSS custom properties. There is currently one shipped theme (dark) — its token values live directly inside `@theme`. Additional themes (Light, Parchment, Foxian, Belobog, Deep Space) are planned as `[data-theme="<name>"]` selector blocks that override the same token names. No theme-switcher UI exists yet.

New UI **must** use semantic tokens (`--color-panel`, `--color-text-primary`, etc.), never raw palette hex values or one-off color literals. The palette values below are for node coloring (folder/page tinting) — treat them as data, not as the UI palette.

### Semantic color tokens

All values below are from the dark theme (the only shipped theme).

| Token | Hex (dark) | Use for |
|-------|-----------|---------|
| `--color-bg` | `#0f0f14` | Page background; the darkest surface |
| `--color-panel` | `#1a1a22` | Primary panel background (tree sidebar, properties sidebar, modal bodies) |
| `--color-panel-alt` | `#1f1f28` | Slightly elevated surface — top bar, search input backgrounds, tab strip base |
| `--color-panel-edge` | `#252530` | Highest-contrast surface — color-picker popover background, dropdown menus |
| `--color-border` | `#2a2a35` | Standard borders (panels, inputs, tab underlines, modal edges) |
| `--color-border-subtle` | `#22222c` | Low-contrast dividers where a full border would be too heavy |
| `--color-text-primary` | `#e8e8ee` | Body text, headings, active labels |
| `--color-text-secondary` | `#9a9aaa` | Supporting text — descriptions, tab labels in inactive state |
| `--color-text-muted` | `#6a6a78` | Quiet labels — property field labels, breadcrumb separators |
| `--color-text-placeholder` | `#4a4a55` | Placeholder text in inputs, disabled states |
| `--color-accent` | `rgba(20,184,166,0.15)` | Subtle selection/hover tint — same value as `--color-accent-faint`. Also doubles as shadcn/ui's "accent" role (Phase 5's menu-kit component library uses this exact name for hover/selected menu rows), so it's kept as the translucent tint rather than the bold hue. Use `--color-accent-light`/`--color-accent-dark` for anything that needs the full-saturation teal (focus rings, primary buttons). |
| `--color-accent-light` | `#5eead4` | Accent text on dark surfaces — active tab labels, selected tree row text, save indicator |
| `--color-accent-dark` | `#0d9488` | Hover states that need to go darker than base accent |
| `--color-accent-faint` | `rgba(20,184,166,0.15)` | Tinted backgrounds for selected tree rows, active tabs |
| `--color-accent-faint-border` | `rgba(20,184,166,0.30)` | Border on accent-faint backgrounds |
| `--color-callout-info` | `#60a5fa` | Info callout left border and label text |
| `--color-callout-info-bg` | `rgba(59,130,246,0.12)` | Info callout background tint |
| `--color-callout-info-text` | `#dbeafe` | Info callout body text |
| `--color-callout-quote` | `#a1a1aa` | Quote callout left border |
| `--color-callout-quote-bg` | `rgba(255,255,255,0.03)` | Quote callout background tint |
| `--color-callout-quote-text` | `#d4d4d8` | Quote callout body text (rendered italic) |
| `--color-callout-secret` | `#c4b5fd` | Secret callout border and label text |
| `--color-callout-secret-bg` | `rgba(167,139,250,0.12)` | Secret callout background tint |
| `--color-callout-secret-text` | `#ede9fe` | Secret callout body text |
| `--color-palette-teal` | `#5eead4` | Node-coloring palette — teal |
| `--color-palette-sky` | `#7dd3fc` | Node-coloring palette — sky |
| `--color-palette-purple` | `#c4b5fd` | Node-coloring palette — purple |
| `--color-palette-rose` | `#fda4af` | Node-coloring palette — rose |
| `--color-palette-amber` | `#fcd34d` | Node-coloring palette — amber |
| `--color-palette-sage` | `#86efac` | Node-coloring palette — sage |
| `--color-palette-orange` | `#fdba74` | Node-coloring palette — orange |
| `--color-palette-indigo` | `#a5b4fc` | Node-coloring palette — indigo |
| `--color-palette-red` | `#fca5a5` | Node-coloring palette — red |
| `--color-palette-gray` | `#a1a1aa` | Node-coloring palette — gray |

> New UI must use semantic tokens, not raw palette vars or hex literals. Palette tokens are for node/folder color assignment only.

### Callout blocks

The three custom BlockNote block types (Info, Quote, Secret) each use a 3-token group (`-bg`, `-border`/main hue, `-text`) applied through the block's rendered wrapper. This mirrors the CharSnap metric-tinting pattern — adding a new callout type means adding both a BlockNote block definition and a matching `--color-callout-*` group in `index.css`.

The Secret block additionally renders a label chip (`🔒 SECRET`) using `--color-callout-secret` as the label text on a slightly darker background. Hidden-tab visibility and secret-block visibility are separate concerns — a tab can be hidden while containing no secret blocks, and secret blocks can appear inside visible tabs.

### BlockNote editor theming (Phase 5)

The editor draws itself through two *separate* custom-property namespaces, both bridged onto the app's own semantic tokens rather than left at their library defaults:

- **`--bn-*`** — BlockNote core's own theme variables (`--bn-colors-editor-background`, `--bn-colors-hovered-background`, `--bn-font-family`, etc.). Overridden in `src/components/page/page.css` on `.editor-shell.bn-root`, all with `!important` — BlockNote's own built-in dark theme sets these same variables at `.bn-root[data-color-scheme=dark]`, which has equal-or-higher CSS specificity than a plain class, so a non-`!important` override would silently lose depending on stylesheet order.
- **shadcn/ui's token set** (`--accent`, `--popover`, `--muted-foreground`, etc.) — `@blocknote/shadcn` (the menu/toolbar "flavor" package BlockNote needs to render its UI at all) is a Tailwind-utility-class component library built against shadcn/ui's standard token names, a completely different naming convention from the app's own tokens. `src/index.css`'s `@theme` block re-declares each one the package actually uses (`--color-background`, `--color-accent-foreground`, and so on — Tailwind v4 auto-generates a utility class from any `--color-*` name) pointed at the equivalent existing app token. `--color-accent` itself is the one token shared between both worlds — see the table above.
- **`@source "../node_modules/@blocknote/shadcn";`** at the top of `index.css` is required for any of this to matter — Tailwind only generates CSS for a utility class it can see referenced in a scanned file, and this package lives in `node_modules`, outside Tailwind v4's default scan path. Adding a shadcn-flavor package without this directive silently ships components with most of their classes missing (no error, just unstyled — no hover states, wrong cursor, etc.).

### Node coloring and cascade

The 10 palette tokens (`--color-palette-*`) are assigned to nodes explicitly by the user via the `ColorPicker` popover. Colors cascade to descendants unless overridden — the tree computes an "effective color" per row by walking up the parent chain until it hits a node with an own color, or reaches the root uncolored.

**Rendering treatment differs by node type:**

- **Folders with an effective color** render with full-row tinting: background at ~12% opacity of the color, text and icon in the palette color. When selected, the background jumps to ~40% opacity of the same color (instead of using the standard teal selection background). This makes folders read as visually strong categorical containers.
- **Pages with an effective color** render with icon-only tinting: just the icon carries the color, letting the page read as a leaf inside its colored folder without competing with the folder's identity.
- **The owning node** (the one that explicitly set the color, as opposed to inheriting) additionally gets a solid left-border stripe in that color, so the user can see where the cascade originates in the tree.
- **Uncolored nodes** in the tree render icons in `--color-text-secondary` (unselected) or `--color-accent-light` (selected), with the standard teal selection background when active.

The palette-hex values in `src/constants/palette.ts` must stay in sync with these CSS tokens.

### Accent-faint chip / tab pattern

Active tabs, selected tree rows, and the top-bar Project button use a consistent three-token tint: `--color-accent-faint` background + `--color-accent-faint-border` border + `--color-accent-light` label. Inactive state is transparent background with `--color-text-secondary` label. This pattern is intentionally reused so navigation state reads the same everywhere.

### Typography

Three font families, all self-hosted (bundled in `public/fonts/`) to keep the app fully offline:

- **UI text** — Inter — buttons, tree rows, sidebar labels, modal chrome. Set on `body` in `@layer base`.
- **Wiki body prose** — Newsreader — the actual writing surface inside BlockNote. A serif tuned for long-form reading; applied via the `.wiki-body` class that wraps every editor instance.
- **Display / page titles** — Fraunces (optical-size aware serif) — used for page titles, section headings inside wiki content (`h1`, `h2`, `h3`), and modal titles. Applied via the `.font-display` utility class.

Numbers in the properties panel and small data displays use Inter with `font-feature-settings: 'tnum'` (tabular numerals), applied via the `.num` utility class.

The three-face setup is deliberate: UI reads clean and neutral, writing reads like writing (not like settings), and titles carry the app's personality. If a fourth face is proposed, push back — three is the ceiling.
