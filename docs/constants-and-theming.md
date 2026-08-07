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

Anamnesis uses Tailwind v4's `@theme` block to define all semantic color tokens as CSS custom properties. **Those values are the dark theme and also the base every other theme overrides** — a theme only has to name what it changes, so a token nobody thought about still resolves to something sane.

Other themes are `[data-theme="<name>"]` blocks in `index.css`, written **unlayered**: Tailwind's `@theme` output lands in the `theme` cascade layer, and an unlayered rule beats a layered one regardless of specificity, so a theme block wins without `!important` or a doubled selector. `data-theme` is set on `<html>` by `theme-service.ts`.

Three themes ship — `dark` (which has no block of its own, per the above), `midnight` and `daylight`. Adding a fourth here is *not* the only way to get a theme: since Phase 12 a `.css` file in `<projectsDir>/themes/` is loaded at runtime and does the same job. See §Custom themes below.

Because `[data-theme="x"]` matches any element and not just `<html>`, putting the attribute on a swatch element makes that element resolve the theme's real tokens — which is how the Appearance picker previews built-in themes without duplicating a single colour value.

New UI **must** use semantic tokens (`--color-panel`, `--color-text-primary`, etc.), never raw palette hex values or one-off color literals. The palette values below are for node coloring (folder/page tinting) — treat them as data, not as the UI palette.

### Semantic color tokens

All values below are from the dark theme (the only shipped theme).

| Token | Hex (dark) | Use for |
|-------|-----------|---------|
| `--color-bg` | `#0f0f14` | Page background; the darkest surface |
| `--color-panel` | `#1a1a22` | Primary panel background (tree sidebar, properties sidebar, modal bodies) |
| `--color-panel-alt` | `#1f1f28` | Slightly elevated surface — top bar, search input backgrounds, tab strip base |
| `--color-panel-edge` | `#252530` | Highest-contrast surface — color-picker popover background, dropdown menus |
| `--color-border-strong` | `#383848` | The app's frame — column dividers, the top bar, modal and popover edges |
| `--color-border` | `#2a2a35` | Containers — cards, inputs, chips, notices. The default |
| `--color-border-subtle` | `#22222c` | Rules inside a container — tab-strip baselines, dividers |
| `--color-scrim` | `rgba(0,0,0,0.5)` | Behind every modal |
| `--color-text-primary` | `#e8e8ee` | Body text, headings, active labels |
| `--color-text-secondary` | `#9a9aaa` | Supporting text — descriptions, tab labels in inactive state |
| `--color-text-muted` | `#6a6a78` | Quiet labels — property field labels, breadcrumb separators |
| `--color-text-placeholder` | `#4a4a55` | Placeholder text in inputs, disabled states |
| `--color-accent` | `var(--color-accent-faint)` | **An alias, not a value of its own** (Phase 11.5 — it used to be a byte-identical copy). It exists because shadcn/ui's "accent" role has that name and Phase 5's menu kit expects it; the app's own code should say `--color-accent-faint`. Note the trap in the name: this is the 15% tint, *not* the bold hue. Use `--color-accent-light`/`--color-accent-dark` for focus rings, progress bars and primary buttons. |
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

### Gradients (Phase 12)

Twelve optional tokens — `--gradient-` plus `bg`, `topbar`, `sidebar`, `page`, `props`, `modal`, `accent`, `sel`, `tag`, `title`, `heading`, `callout`. Three rules govern them and all three are load-bearing:

1. **They are never declared, only read.** Every use site says `var(--gradient-x, none)` and nothing gives them a default. A declared-but-empty custom property resolves to *nothing*, so `background: , var(--color-panel)` is a syntax error that drops the surface's colour entirely — "off" has to mean absent. Don't add `--gradient-bg: none` to `:root`.
2. **They layer over a colour, not instead of one** — `background: var(--gradient-x, none), var(--color-y)`. A theme that sets only some of the twelve still has solid surfaces, and a gradient with transparency in it fades to the theme's own colour. `--gradient-callout` in particular sits over each callout's tint rather than replacing it; replacing it would flatten Info/Quote/Secret into one colour. `--gradient-page` is the exception with no colour under it, because the writing area has never had a background of its own and giving it one would hide `--gradient-bg`.
3. **The two text gradients need three properties each.** `--gradient-title` and `--gradient-heading` come with `-clip` and `-fill` companions, set together by `gradientVars()` in the sandbox and by any theme file. The image alone paints a coloured box; the clip alone makes the text invisible. The `-clip` fallback must be `border-box` and the `-fill` fallback `currentColor`, or every theme without a title gradient loses its title.

### Custom themes and snippets (Phase 12)

`<projectsDir>/themes/*.css` and `<projectsDir>/snippets/*.css` — beside her projects rather than inside one, because a theme isn't part of a world. Both folders are created on scan.

- A theme file's `[data-theme="…"]` id is read out of the file (`readThemeId`) and put on the document, which is what makes a sandbox export work with no editing. A file with no such block falls back to a slug of its filename.
- Snippets are concatenated and injected *after* the theme, so a snippet adjusting a theme wins on ordering alone and needs no `!important`.
- **All of it goes through `sanitizeCustomCss` first.** CSS can make network requests and the app ships with `"csp": null`; anything that isn't a `data:` URI or an app-bundle path is stripped and reported to the user. This is a Policy Boundary rule, not a nicety — see `docs/handoff.md`.
- The 98 bundled families in `src/fonts-library.css` are what let a theme name a font and have it render. All OFL or Apache 2.0. Generated, along with `src/constants/font-library.ts` and the sandbox's copies, by `node scripts/build-fonts.mjs`.

### Scales (Phase 11.5)

Everything below lives in a **plain `:root` block** in `index.css`, deliberately *not* in `@theme`. `@theme` is Tailwind's utility-generation table: a `--text-sm` declared there redefines the `text-sm` utility, and `@blocknote/shadcn`'s menus are built entirely out of those utilities. The app writes no Tailwind classes of its own, so it gains nothing from that table and risks breaking the editor chrome. New non-colour tokens go in `:root`; colours stay in `@theme` for the shadcn bridge described above.

The one exception is `--radius-*`, which does use Tailwind's namespace — its three overlapping values are set to Tailwind's own defaults (`sm` 0.25rem, `md` 0.375rem, `lg` 0.5rem) so `rounded-*` inside BlockNote lands on the pixels it always did. **If you change one of those three, check the editor menus.**

**Type** — `--fs-*`. The four small sizes carry ~95 of the app's sized elements and were left alone; what collapsed was the tail (eleven sizes down to eight, six competing heading sizes down to three).

Every step is `calc(<base> * var(--fs-scale))`, and `--fs-scale` (default `1`) is what Settings → Appearance's text-size slider sets. The obvious alternative — a `font-size` on the root element — moves every `rem` in the app at once, so asking for bigger text would also inflate all eight spacing steps, both sidebars and the reading column. The values in the table are at scale 1.

| Token | Value | Use for |
|---|---|---|
| `--fs-2xs` | 0.6875rem / 11px | Property labels, eyebrow labels, meta text, paths |
| `--fs-xs` | 0.75rem / 12px | Dense UI, secondary labels, hints |
| `--fs-sm` | 0.8125rem / 13px | The default UI size |
| `--fs-md` | 0.875rem / 14px | Emphasis, inputs you type into |
| `--fs-lg` | 1rem / 16px | Section headings |
| `--fs-xl` | 1.125rem / 18px | Modal titles (import, export, Settings) |
| `--fs-2xl` | 1.75rem / 28px | Page and folder titles |
| `--fs-3xl` | 2rem / 32px | Start screen |

Nothing sits between 18px and 28px; the gap is intentional, not an omission.

**Line height** — `--lh-normal` (1.5) is set on `body`, so most elements need no declaration at all. `--lh-tight` (1.25) is for headings at `--fs-xl` and above. Before this the app had six ad-hoc line-heights and everything else inherited the browser's ~1.2, which is why dense screens read as cramped.

**Radius** — `--radius-sm` (4px, inputs and chips), `--radius-md` (6px, buttons and rows), `--radius-lg` (8px, panels and modals), `--radius-full` (pills). Circles stay `border-radius: 50%` — a different idea, not a scale member. Thirteen spellings across nine values before this.

**Space** — `--space-*`. Eight steps, matched to what the app already used rather than imposed: 6px and 8px alone carried 100 of the 245 padding/margin/gap declarations, so a 4px-only grid would have meant retyping the commonest gap for the grid's sake. The tail collapsed (10 → 12, 14 → 12 or 16, 20 → 24, odd one-offs to their nearest step).

| Token | Value | Use for |
|---|---|---|
| `--space-2xs` | 0.125rem / 2px | Hairline nudges, chip padding |
| `--space-xs` | 0.25rem / 4px | The tightest real gap |
| `--space-sm` | 0.375rem / 6px | Icon-to-label, dense rows |
| `--space-md` | 0.5rem / 8px | The default gap |
| `--space-lg` | 0.75rem / 12px | Inside a control, between fields |
| `--space-xl` | 1rem / 16px | Between groups |
| `--space-2xl` | 1.5rem / 24px | Panel and modal padding |
| `--space-3xl` | 2rem / 32px | Page margins |

Circles, 1px borders and optical nudges (`50%`, `translateY(-50%)`) are not scale members and stay literal. Negative margins are `calc(var(--space-md) * -1)`, not `-var(...)`, which is not valid CSS.

**Elevation** — `--elev-modal` is the app's only shadow, on modals and popovers. Named `--elev-*` and not `--shadow-*` for the same reason the type scale is `--fs-*`: Tailwind owns that namespace.

**Layout** — `--h-bar` (48px) is shared by the top bar and the tree sidebar's tab strip so their bottom borders form one unbroken rule; `--reading-width` (60rem) and `--page-gutter` (2.5rem) are the writing column's cap and side margin, shared by `.page-view` and `.page-banner-empty` — they have to move together or the banner row stops lining up with the text under it.

### Borders

Three roles, one width. Before this the app had one colour doing all three jobs and `--color-border-subtle` was used in exactly one place.

| Token | Value | Use for |
|---|---|---|
| `--color-border-strong` | `#383848` | The frame: the two column dividers, the top bar and sidebar tab strip, modal and popover edges |
| `--color-border` | `#2a2a35` | Containers: cards, inputs, chips, notices. The default |
| `--color-border-subtle` | `#22222c` | Rules *inside* a container: tab-strip baselines, the menu heading, the search palette's input |

The values are provisional and Phase 12 re-tunes them per theme. **The roles and which elements hold which are the part meant to last** — a theme that flattens them back to one colour has undone the fix, not restyled it.

### Shared controls

`src/controls.css`, imported by `index.css` as `layer(controls)`. Backdrop, modal shell, buttons, icon buttons, text link, eyebrow label, inline remove. `ui-` prefixed so it's obvious in the JSX which classes are shared.

**The layer is the whole mechanism.** Every component stylesheet in the app is unlayered, and unlayered rules beat any layer regardless of specificity — so a surface that genuinely needs something different (the banner's remove button needs a scrim, the import modal manages its own inner scrolling) just says so in its own stylesheet and wins. Same arrangement the focus rules in `@layer base` rely on. **Don't move controls.css out of its layer**, and don't add `!important` to it; if a component is fighting it, the component is supposed to win.

| Class | Variants |
|---|---|
| `.ui-backdrop` | `.ui-backdrop-top` (the search palette, anchored high) |
| `.ui-modal` | `.ui-modal-sm` 22rem · `.ui-modal-md` 28rem · `.ui-modal-lg` 32rem |
| `.ui-surface` | the raised-panel look without a dialog's geometry |
| `.ui-btn` | `.ui-btn-primary` · `.ui-btn-secondary` · `.ui-btn-danger`, plus `.ui-btn-lg` for empty-state actions |
| `.ui-icon-btn` | `.ui-icon-btn-sm` 20px · (base) 24px · `.ui-icon-btn-lg` 28px; picks up `aria-pressed` on its own |
| `.ui-link` · `.ui-eyebrow` · `.ui-inline-remove` | — |

At most one `.ui-btn-primary` per screen. Secondary hover always means the accent tint — that's the single hover language for anything that's a button. Menu rows, tree rows and the recent-projects tiles keep their own, correctly: they aren't buttons.

Deliberately a stylesheet and not a component library. These are *looks*, not behaviour; a `<Button>` wrapper would add props to maintain and buy nothing the class doesn't.

### Typography

Four faces. Three are self-hosted (bundled in `public/fonts/`) to keep the app fully offline; the fourth is a system stack:

- **UI text** — Inter — `var(--font-ui)`. Buttons, tree rows, sidebar labels, modal chrome. Set on `body` in `@layer base`, so most things inherit it.
- **Wiki body prose** — Newsreader — `var(--font-prose)`. The writing surface inside BlockNote; a serif tuned for long-form reading, applied via the `.wiki-body` class that wraps every editor instance.
- **Display** — Fraunces — `var(--font-display)`. Page titles, folder titles, modal titles, the start screen. Weight 500 with `--lh-tight`; Fraunces carries far more presence than Inter at the same numbers, so 600 here reads as shouting. **Set it in the component's own rule** — the old `.font-display` utility class is gone, because having two mechanisms for "this is a heading" is how the app ended up with six heading sizes.
- **Mono** — a system stack (`ui-monospace`, Cascadia, SF Mono, Consolas…) — `var(--font-mono)`. Keyboard shortcuts, file paths, `<code>`. Not bundled: it appears in maybe five places, every desktop this ships to has a good one, and a woff2 would cost bytes and an offline-asset to maintain for no visible gain. Bundling a specific mono later is a taste call, not a fix.

The split is deliberate: UI reads clean and neutral, writing reads like writing (not like settings), titles carry the app's personality, and literal strings look literal. If a *fifth* face is proposed, push back.
