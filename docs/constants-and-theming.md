# Constants & Theming Reference

## Key Constants (`src/constants/`)

One line per file. **Deliberately not an inventory of their contents** — the previous version of this section transcribed palette hexes, every `TEMPLATE_KEYS` entry and a list of `limits.ts` values, and all three drifted out of date while the rest of this document stayed current. What belongs here is what a file is *for* and any rule that spans more than one file; the values live in the file.

- **`callout-colors.ts`** — what a coloured callout means and the icon that says so. Colour and type are separate axes; only colour is here.
- **`code-languages.ts`** — the languages a code block offers, in dropdown order. A deliberate subset of the 48 `@blocknote/code-block` ships.
- **`collection-sources.ts`** — where a collection block gets its pages (Manual links, Subpage index, Tag index, Backlinks). In constants because the block's heading, the source picker and Add Block all name them and must not disagree.
- **`default-project-template.ts`** — the one project template that ships, so "Start from a template" works on a machine nobody has sent a file to.
- **`emoji.ts`** — the emoji half of the icon picker. Stored as the character itself, so it costs nothing in the bundle.
- **`font-library.ts`** — **generated; do not edit by hand.** Every family bundled in `src/fonts-library.css`. Regenerate with `node scripts/build-fonts.mjs`.
- **`glyphs.ts`** / **`glyph-catalogue.ts`** — the curated front of the icon picker, and every icon Lucide ships behind it.
- **`icons.ts`** — template key to lucide icon. **The only place lucide-react is imported for template icons** — components go through `getTemplateIcon()`.
- **`layout.ts`** — layout numbers more than one file has to agree on, such as the sidebar's per-level indent, which `react-arborist` also takes as a prop.
- **`limits.ts`** — hard numeric limits: image size, search result and snippet caps, per-name length, lightbox zoom range, breadcrumb depth. **Nesting depth is not among them and must not be added** — `CLAUDE.md` → Data on disk records that deep nesting is uncapped and must not be warned about, measured 2026-08-11. `LONG_PATH_ADVICE_CHARS` is the wording threshold for advice, not a cap.
- **`links.ts`** — the only web addresses the app knows. All of them are this repository and none is fetched; they are handed to the system browser. The updater's endpoint is not here — it lives in `src-tauri/tauri.conf.json`.
- **`meter-styles.ts`** — the shapes a meter block draws in, with the names and icons the UI uses.
- **`palette.ts`** — the node-colouring palette. Data, not UI tokens, and **must stay in sync with the `--color-palette-*` custom properties in `src/index.css`**. `getPaletteHex(key)` resolves one; the default entry has no hex and clears the colour.
- **`paths.ts`** — on-disk filenames (`project.json`, `_folder.json`, `_page.json`, the dot-files under `assets/`) plus `ASSET_REF_PREFIX`, the scheme a stored picture reference uses.
- **`project-template.ts`** — the `.antpl` file: a project's shape in one file somebody can send you. **Not the same thing as `TemplateLibrary` in `schema.ts`** — that is a page copied, this is a project's shape.
- **`property-suggestions.ts`** — suggested property names per template, offered as chips in the Add property form. Suggestions, never a schema.
- **`schema.ts`** — canonical `Node` / `Tab` / `Project` shapes, `TEMPLATE_KEYS`, and the `createNode` / `createTab` factories. `BlockNoteDocument` stays a loose `unknown[]` on purpose: constants may never import from `services/`. See `docs/spec.md` §Data model.
- **`settings.ts`** — the settings rail: which sections exist, in what order, and what each says about itself. Adding a section is an entry here *and* one in `SettingsModal.tsx`'s `PANELS` map, which a test checks are in step.
- **`shortcuts.ts`** — app-level keyboard shortcuts, plus `EDITOR_RESERVED_BINDINGS`, the combinations BlockNote already owns. Anything added here must stay clear of that list.
- **`theme-tokens.ts`** — what the theme editor is allowed to edit: twenty colours in five groups plus the gradient slots, deliberately a subset of the token system.
- **`themes.ts`** — the themes that ship and how one is resolved.

**Three entries were removed from this section on 2026-08-31 because the files do not exist and their contents are nowhere in the tree:** `format.ts` (`fmt`, `fmtFull`, `fmtDate`, `fmtRelative`, `slugify`), `keyboard.ts` (a `SHORTCUTS` map — `shortcuts.ts` is the real one and has a different shape), and `lk-schema.ts` (`LK_SUPPORTED_VERSION`, `LK_PANEL_TYPE_MAP`, `LK_TAB_SIGNATURES`). Filename sanitising is `sanitizeSegment` in `filesystem-service.ts`. Don't reinstate them from this document's history.
---

## CSS / Theming (`src/index.css`)

### Theme architecture

Anamnesis uses Tailwind v4's `@theme` block to define all semantic color tokens as CSS custom properties. **Those values are the dark theme and also the base every other theme overrides** — a theme only has to name what it changes, so a token nobody thought about still resolves to something sane.

Other themes are `[data-theme="<name>"]` blocks in `index.css`, written **unlayered**: Tailwind's `@theme` output lands in the `theme` cascade layer, and an unlayered rule beats a layered one regardless of specificity, so a theme block wins without `!important` or a doubled selector. `data-theme` is set on `<html>` by `theme-service.ts`.

Seven themes ship, in the order the picker lists them: `midnight` (the default — hers, and the only one that also sets fonts), `dark` (which has no block of its own, per the above), `ember`, `grove`, `nightbloom`, `abyssal` and `daylight`. Adding an eighth here is *not* the only way to get a theme: since Phase 12 a `.css` file in `<projectsDir>/themes/` is loaded at runtime and does the same job. See §Custom themes below.

Two rules for anything added to that list:

- **A new theme has to be a different room, not a different shade.** The six darks are navy, near-black, warm brown, green, plum and a lit ocean blue precisely so the picker is worth reading; a seventh grey would be a row that costs attention and returns nothing. `abyssal` passes on luminance as much as hue — `#00253d` is nearly three times the luminance of Midnight's `#0d1221`, so it reads as a lit room rather than a dark one.
- **Re-tune the callouts, don't inherit them.** The base Info/Quote/Secret tints were chosen against `#0f0f14`. On a warm brown or a green background the same translucent blue reads as a bruise, and the three stop being distinguishable from each other — which is the only colour-coding callouts have. Watch the accent too: `nightbloom` moves Secret from violet to indigo because its accent is already orchid, and `abyssal` moves *Info* to mint because its accent has taken the blue end. **The callout that has to be told apart from the accent is the one that moves — never the accent.** This is now checked rather than remembered — `palette-import.test.ts` holds every shipped theme to the edges being three distinct hues at ≥3 against the panel and the words at ≥10. Midnight, the default, silently failed it for months by not restating this group at all, and it's the third token group that theme was caught inheriting.

Because `[data-theme="x"]` matches any element and not just `<html>`, putting the attribute on a swatch element makes that element resolve the theme's real tokens — which is how the Appearance picker previews built-in themes without duplicating a single colour value.

New UI **must** use semantic tokens (`--color-panel`, `--color-text-primary`, etc.), never raw palette hex values or one-off color literals. The palette values below are for node coloring (folder/page tinting) — treat them as data, not as the UI palette.

### Semantic color tokens

All values below are from the `dark` theme, which is the one whose values *are*
the base tokens — the other six ship as `[data-theme]` blocks over the top (see
`BUILT_IN_THEMES`). So this table is the defaults, not the only answer.

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
| `--color-scrim-soft` | `rgba(12,12,16,0.55)` | Resting wash under a control that sits on a user's image — the banner hint and its remove ×, the portrait's remove × |
| `--color-scrim-solid` | `rgba(12,12,16,0.72)` | The same three on hover |
| `--color-on-scrim` | `#f2f2f5` | Icon/text on either scrim. **Not `--color-text-primary`** — see below |
| `--color-hover` | *film* | Hover on anything, on any surface — tree rows, icon buttons, nav items, menu rows. Translucent, so it composites over what it lands on. **See below** |
| `--color-hover-strong` | *film* | Emphasis, **not** "on a raised surface" — stacked on an already-hovered row, or marking the keyboard selection |
| `--color-accent-hover` | *film* | Hover on something already accented — secondary buttons, the selected nav row |
| `--color-text-primary` | `#e8e8ee` | Body text, headings, active labels |
| `--color-text-secondary` | `#bcbcc7` | Supporting text — descriptions, tab labels in inactive state. **Has a contrast floor — see below** |
| `--color-text-muted` | `#a9a9b3` | Quiet labels — property field labels, breadcrumb separators. **Has a contrast floor — see below** |
| `--color-text-placeholder` | `#8c8c94` | Placeholder text in inputs, disabled states. **Has a contrast floor — see below** |
| `--color-accent` | `var(--color-accent-faint)` | **An alias, not a value of its own** (Phase 11.5 — it used to be a byte-identical copy). It exists because shadcn/ui's "accent" role has that name and Phase 5's menu kit expects it; the app's own code should say `--color-accent-faint`. Note the trap in the name: this is the 15% tint, *not* the bold hue. Use `--color-accent-light`/`--color-accent-dark` for focus rings, progress bars and primary buttons. |
| `--color-accent-light` | `#5eead4` | Accent text on dark surfaces — active tab labels, selected tree row text, save indicator |
| `--color-accent-dark` | `#0d9488` | Hover states that need to go darker than base accent; every stop of the primary button's gradient is mixed from it |
| `--color-on-accent` | `#ffffff` | Text sitting **on** a filled button — primary and danger. Not offered by the theme editor's pickers; a theme can set it by hand |
| `--color-accent-faint` | `rgba(20,184,166,0.15)` | Tinted backgrounds for selected tree rows, active tabs |
| `--color-accent-faint-border` | `rgba(20,184,166,0.30)` | Border on accent-faint backgrounds |
| `--color-callout-info` | `#60a5fa` | Info callout left border and label text |
| `--color-callout-info-bg` | `rgba(59,130,246,0.12)` | Info callout background tint |
| `--color-callout-info-text` | `#dbeafe` | Info callout body text |
| `--color-callout-quote` | `#a1a1aa` | Quote callout left border |
| `--color-callout-quote-bg` | `rgba(161,161,170,0.14)` | Quote callout background tint — its own edge, like the other two, at a step more alpha because a neutral has no hue helping it off the panel |
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

#### The four backgrounds, and matching them

`--color-bg`, `--color-panel`, `--color-panel-alt` and `--color-panel-edge` are
four independent colours, and between them they are the entire background of the
app. That independence is deliberate — the built-in themes hand-tune the
relationship — but it made a light theme tedious to build and easy to get
half-done: change only `--color-panel` and you get a pale dialog full of dark
boxes, which reads as the picker being broken.

**Settings → Colours → Backgrounds → "Match the others to Panels"** fills the
other three in from the panel (`matchedBackgrounds` in
`services/theme-editor.ts`). It is a plain edit, not a binding: it writes
ordinary values that are then hers to change, and nothing keeps following. That
was chosen over making them derive permanently, because deriving would mean
copying a built-in no longer reproduced its hand-tuned surfaces.

The offsets are read off the shipped themes rather than picked by taste, and the
light and dark cases genuinely differ rather than mirroring:

| | dark panel | light panel |
|---|---|---|
| `--color-bg` | below the panel | just below the panel |
| `--color-panel-alt` | above | lowest of the four |
| `--color-panel-edge` | highest | hard against the panel, so popovers still read white |

Steps are taken in Oklab so a saturated panel keeps its hue — a navy lightened
in sRGB walks toward grey, which is how a "matching" set ends up looking like
three different themes. `separated()` guarantees no generated surface comes back
equal to the panel: near white a step clamps, and near black a step smaller than
one 8-bit code point rounds away. Both would recreate the `daylight`
`--color-panel-edge` collision described below.

#### Hover is a film, not a colour

**Never write a surface token into a `:hover` block.** That was how every hover
in the app worked until 2026-08-08 — tree rows took `--color-panel-edge`, icon
buttons took `--color-panel-alt`, accented things took `--color-accent-faint` —
and it fails the moment a theme sets the borrowed token equal to the surface it
sits on. `daylight` does exactly that (`--color-panel` and `--color-panel-edge`
are both `#ffffff`), so hovering a page in the sidebar painted white on white
and did nothing at all. Measured: a colour distance of **0**.

The hover tokens are `color-mix(in oklab, …)` built on `--color-hover-pole`,
which is white when `--color-panel` is dark and black when it's light —
`oklch(from var(--color-panel) sign(0.62 - l) 0 0)`. Three consequences worth
understanding before changing them:

- **They pick their own direction**, from the panel's own lightness. That's why
  a theme never has to declare hover, including one hand-written in Notepad, and
  why `filter: brightness()` was the wrong tool — it only lifts, and quietly
  vanished on `daylight`.
- **They derive only from what they're derived from.** The first version mixed
  the panel toward `--color-text-primary`, reasoning that text is the far end of
  a theme's contrast. That holds for a *finished* theme and not for one being
  edited: a pale pink panel on a theme with pale cyan text moved hover by a
  measured **6**, i.e. invisibly. Pulling the direction out of the panel alone
  removed the dependency; the same theme now moves 43. **Don't reintroduce a
  second token into these mixes.**
- **They can't drift.** Retune a theme's backgrounds and hover moves with them.
  This is why the three editable ones are in `AUTO_TOKENS`
  (`constants/theme-tokens.ts`) and are skipped by `seedFromDocument`: copying a
  theme writes out every colour it resolves to, and doing that to hover would
  pin it to the panel colour at the moment of the copy.
- **They are translucent, and that's what makes them work on more than one
  surface.** The first version mixed the *panel* toward the pole and painted the
  result as an opaque background — correct on a panel and wrong everywhere else,
  because hover lands on four surfaces: a tree row on `--color-panel`, a
  settings row on `--color-panel-alt`, a menu row on `--color-panel-edge`. How
  wrong depended on how far apart those happened to be, so it looked fine until
  a theme put them close. "Match the others to Panels" does exactly that, and on
  a yellow theme it dropped a settings row's hover to a measured **19**. The
  shipped themes were quietly affected too: hover on `--color-panel-edge`
  measured 11–16 on `dark`, `ember`, `grove` and `nightbloom`. The pole at 10%
  opacity composites over whatever it's laid on, so the step is the same size by
  construction. Now **67–97** across every shipped theme and surface.

`sign()` returns 0 when the panel's lightness is exactly 0.62, which makes the
pole `oklch(0 0 0)` — black. That's deliberate: the one input that could have
produced "no change at all" produces an ordinary darkening instead. A mid-grey
panel is still the weakest case, now 40 rather than 17.

`--color-hover-strong` **is not "hover, on a raised surface"** — it used to be,
and that meaning died with the opaque version, which needed a bigger step on a
popover only to make up for being computed from the panel. A film has no deficit
to make up. It now means *emphasis*: something stacked on an already-hovered row
(`.tree-row-add`), or a row marking the current selection
(`.search-palette-result-active`). Everything else that used it — context menu
rows, reference candidates, the tab close button — takes plain `--color-hover`,
which lands at 79–87 on `--color-panel-edge` where the old strong managed 60–78.
If you reach for `-strong` because the surface underneath is raised, that's the
mistake this paragraph exists to stop.

Because they're films, a hover token can be applied two ways: as a `background`
on something transparent at rest, or as `box-shadow: inset 0 0 0 999px` on
something already filled — a gradient button, a user-tinted tree row — where
replacing the background would throw away what's underneath. Same token; pick by
whether the element has a fill worth keeping. (This is what `--color-hover-wash`
used to be. It was this idea already, kept separate for those three cases; once
hover generally became a film, two tokens held the same value for the same
reason and it folded into `--color-hover`.)

`draft.resolved` is a snapshot, so the store re-reads the auto tokens off the
document after any colour changes (`withAutoTokens` in `state/theme-store.ts`).
Without that the Hover swatches keep showing the hover of the *previous* panel
colour — the app was right and the pickers were stale.

They're still offered as pickers under Settings → Colours → Hover, and a value
chosen there is written and kept. Automatic until asked; hers after.

The mixes resolve to `oklab(…)` rather than a hex, which is why `toHex` in
`services/theme-editor.ts` reads that notation — without it every hover swatch
in Settings came up black. It reads `oklch()` too, so a hand-written theme using
modern CSS colours now shows its real colours in the pickers instead of black
squares.

Once they became films they resolve to `oklab(… / 0.1)`, and `toHex` drops the
alpha — so a swatch would show the *pole*: pure black on every light theme,
pure white on every dark one. `withAutoTokens` runs them through `flatten`
(`services/theme-editor.ts`) over the current panel first, so the picker shows
what hovering a row on a panel actually looks like. `flatten` composites in
plain sRGB rather than oklab because that's where the browser composites — a
10% black film over `#ffe047` paints `#e5c93f`, which is `255 × 0.9` per channel
and nothing cleverer. It's a preview of a real pixel, so agreeing with the
compositor beats being more principled than it. **Display only** — flattened
values live in `draft.resolved`, which `serializeTheme` never writes.

#### Text on a scrim is not theme text

`--color-on-scrim` is fixed light in every theme on purpose. The three controls
that sit on a user's own image used `--color-text-primary`, which is near-white
on the dark themes and `#1c1c1f` on `daylight` — a black × on a dark wash.
Measured on `daylight`: 4.39:1 over a bright photo, but **1.11:1 over a dark one
and 1.74:1 over a mid-tone**. A photo isn't a surface and doesn't follow the
theme, so neither should what's drawn on top of it.

#### The contrast floor on the three quiet steps

**`--color-text-secondary` must clear 8:1, `--color-text-muted` 6.5:1 and
`--color-text-placeholder` 4.5:1 — against all four surfaces (`--color-bg`,
`--color-panel`, `--color-panel-alt`, `--color-panel-edge`), in every theme.**

None of it is decoration. The quiet steps write the theme notes in the picker,
the hint under every field, dates, counts, and the tree's own metadata — real
information at 11–13px. `--color-text-placeholder` sits below the other two on
purpose: it labels a field you are about to type over, so it has to be legible
and then get out of the way. Legible, not equal.

The floors were raised on 2026-08-30, and the reason is worth keeping because it
is the second time the same mistake has been made in the same place.

- **The old numbers were pass marks, not targets.** `muted` was held at 4.5,
  which is WCAG AA's *minimum* for small text, and this app spends it on its
  smallest type. Every theme sat within a few hundredths of the line, and quiet
  text was reported as hard to read across all seven by someone who does not
  otherwise use accessibility settings.
- **Three of the four steps were crowded into the dim end.** Primary measured
  ~14 and the other three between 6.9 and 3.1, so the ramp did most of its work
  in one jump and then split hairs. It now reads roughly 14 / 9.2 / 7.5 / 5.2 on
  the panel.
- **Two of the four surfaces were never measured.** Menus, dropdowns, popovers
  and chips are all `--color-panel-edge`, the lightest surface in any theme.
  Every theme cleared the old floor on the window and the panel; *no* theme
  cleared it on `--color-panel-edge`, where `muted` came to 3.45–4.10.

Two things moved that are not text, for the same reason:

- **Abyssal's `--color-panel-edge`** was 1.34x its panel's luminance where the
  other darks sit at 1.14–1.24, which left `--color-text-primary` itself at
  9.1:1 on it — less headroom than any other theme's *secondary* step, and no
  room underneath for four distinct steps. It is a shade deeper now. The
  importer has the same clamp (`roomFor` in `palette-import.ts`), since that
  edge came out of an imported palette in the first place.
- **Daylight's accent pair** dropped a step, teal-600/700 to teal-700/800.
  `--color-accent-light` draws every link and the selected page *as text*, and
  teal-600 on white is 3.74:1 — under AA. Links now measure 4.97–5.47, and the
  primary button's white label sits on a fill giving it 7.58.

Current worst-case figures, against whichever of the four backdrops is hardest
for that theme:

| Theme | primary | secondary | muted | placeholder |
|---|---|---|---|---|
| Midnight | 11.49 | 8.01 | 6.53 | 4.52 |
| Anamnesis Dark | 12.42 | 8.05 | 6.50 | 4.54 |
| Ember | 12.62 | 8.00 | 6.53 | 4.50 |
| Grove | 12.39 | 8.02 | 6.53 | 4.51 |
| Nightbloom | 12.95 | 8.00 | 6.51 | 4.51 |
| Abyssal | 10.54 | 8.01 | 6.54 | 4.50 |
| Daylight | 15.44 | 8.11 | 6.51 | 4.53 |

**If you retune a theme's text or surfaces, re-measure all four.** A new theme
is not finished until its quiet steps clear the floor on the lightest surface it
has, which is nearly always `--color-panel-edge` and is nearly never the one you
were looking at.

**This is a test, not just a rule.** `services/palette-import.test.ts` parses
every `[data-theme]` block out of `index.css`, merges it over the `@theme` base,
and asserts the three floors against all four surfaces — plus that the four
steps stay *apart* (raising the bottom of a ramp is how you flatten one), that a
link clears 4.5, and that each theme's three border weights stay in order. It
lives in that file rather than beside the constants because `contrast` is a
service and constants may not import one. The one recorded exception is `dark`'s
`--color-border-subtle` at 1.097:1 against its panel, the faintest in the app;
it's held as a ratchet that may not get fainter rather than quietly retuned,
since changing the original palette is a decision.

### Callout blocks

The three custom BlockNote block types (Info, Quote, Secret) each use a 3-token group (`-bg`, `-border`/main hue, `-text`) applied through the block's rendered wrapper. This mirrors the CharSnap metric-tinting pattern — adding a new callout type means adding both a BlockNote block definition and a matching `--color-callout-*` group in `index.css`.

The Secret block additionally renders a label chip (`🔒 SECRET`) using `--color-callout-secret` as the label text on a slightly darker background. Hidden-tab visibility and secret-block visibility are separate concerns — a tab can be hidden while containing no secret blocks, and secret blocks can appear inside visible tabs.

**A callout can also carry a colour of its own (Phase 19.5), and it works differently from the three token groups above.** The colour is a palette key stored as a prop on the block; the wrapper resolves it to a hex and puts it on the element as `--callout-accent`, and one rule — `.editor-callout.editor-callout-colored` — draws the border from it and mixes the fill out of it with `color-mix`. So the stylesheet never learns which colours exist: the palette is data, in `src/constants/palette.ts`, and adding a colour there adds it here for free.

Three things about that are deliberate:

- **The tint is mixed, not stored.** Every callout token comes in threes (line, fill, text), and picking three colours to colour one box is not a feature. `color-mix(in srgb, var(--callout-accent) 12%, transparent)` also lands correctly on a light theme and a dark one from one value.
- **`color-mix` is the newest thing in the stylesheet** (Safari 16.2 / Chrome 111 / Firefox 113), and the Linux build's WebKitGTK is the engine to watch — one too old to know it drops the whole declaration. The rule sets a flat `--color-panel-alt` background first for exactly that reason; it is a fallback, not decoration.
- **Colour and type are different axes.** Colouring a callout never changes what it *is* — `calloutSecret` is still the block a publish must strip whatever colour it wears, which is why it keeps its lock chip and never takes the colour-derived icon. The four conventional hues (green/amber/red/blue) get an icon from `src/constants/callout-colors.ts`; every other colour just recolours the box, and a hex she mixed herself never gets one because there is no name to read a meaning off.

### BlockNote editor theming (Phase 5)

The editor draws itself through two *separate* custom-property namespaces, both bridged onto the app's own semantic tokens rather than left at their library defaults:

- **`--bn-*`** — BlockNote core's own theme variables (`--bn-colors-editor-background`, `--bn-colors-hovered-background`, `--bn-font-family`, etc.). Overridden in `src/components/page/page.css` on `.editor-shell.bn-root`, all with `!important` — BlockNote's own built-in dark theme sets these same variables at `.bn-root[data-color-scheme=dark]`, which has equal-or-higher CSS specificity than a plain class, so a non-`!important` override would silently lose depending on stylesheet order.
- **shadcn/ui's token set** (`--accent`, `--popover`, `--muted-foreground`, etc.) — `@blocknote/shadcn` (the menu/toolbar "flavor" package BlockNote needs to render its UI at all) is a Tailwind-utility-class component library built against shadcn/ui's standard token names, a completely different naming convention from the app's own tokens. `src/index.css`'s `@theme` block re-declares each one the package actually uses (`--color-background`, `--color-accent-foreground`, and so on — Tailwind v4 auto-generates a utility class from any `--color-*` name) pointed at the equivalent existing app token. `--color-accent` itself is the one token shared between both worlds — see the table above.
- **`.editor-shell .bn-editor` in `page.css` sets `font-family` and `font-size` directly**, and has to. BlockNote's `.bn-default-styles` puts a literal Inter stack and a literal `16px` on the contenteditable element itself, and an own declaration beats an inherited one — so `--bn-font-family`, `.wiki-body`'s `--font-prose` and every `--fs-*` step were all being discarded for the page body while working everywhere else in the app. It takes `--fs-content` (`0.9375rem` at scale 1 — 15px, down from 16 on 2026-08-30); the headings inside are sized in `em` and follow, which is why one pixel off the body buys as much room as it does. That rule is the **only** place `--fs-content` may be used — see §Scales.
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
**`--gradient-accent` is the one slot with a real default underneath it.** The primary button builds its own gradient from `--color-accent-dark` (see Controls above), so this token is an override rather than the only thing standing between that button and a flat colour. Five of the six bundled themes stopped setting it — theirs were a two-stop `100deg` version of the old button, saying the theme's own accent twice. **Abyssal still sets one**, kept at the user's request: its gradient was violet-to-cyan, nothing like the deep blue the rest of that theme is built from, and it was the only one whose removal was visible. Its stops were deepened rather than copied back — the label is white now, and white on the original `#6ddcff` measures 1.6:1. The white pane of light is layered *above* the slot on purpose, so a theme supplying its own colours still gets the gloss instead of losing it. A theme that sets a pale gradient here will need to set `--color-on-accent` too.

3. **The two text gradients need three properties each.** `--gradient-title` and `--gradient-heading` come with `-clip` and `-fill` companions, set together by `gradientVars()` in the sandbox and by any theme file. The image alone paints a coloured box; the clip alone makes the text invisible. The `-clip` fallback must be `border-box` and the `-fill` fallback `currentColor`, or every theme without a title gradient loses its title.

### Custom themes and snippets (Phase 12)

`<projectsDir>/themes/*.css` and `<projectsDir>/snippets/*.css` — beside her projects rather than inside one, because a theme isn't part of a world. Both folders are created on scan.

- A theme file's `[data-theme="…"]` id is read out of the file (`readThemeId`) and put on the document, which is what makes a sandbox export work with no editing. A file with no such block falls back to a slug of its filename.
- Snippets are concatenated and injected *after* the theme, so a snippet adjusting a theme wins on ordering alone and needs no `!important`.
- **All of it goes through `sanitizeCustomCss` first.** CSS can make network requests and the app ships with `"csp": null`; anything that isn't a `data:` URI or an app-bundle path is stripped and reported to the user. This is a Policy Boundary rule, not a nicety — see `docs/handoff.md`.
- The 98 bundled families in `src/fonts-library.css` are what let a theme name a font and have it render. All OFL or Apache 2.0. Generated, along with `src/constants/font-library.ts` and the sandbox's copies, by `node scripts/build-fonts.mjs`.

### Editing a theme in the app (Phase 12)

Four things make themes — the sandbox's export, the pickers in Settings → Colours (`components/shell/ThemeEditor.tsx`), the import button in Settings → Theme, and any text editor — and **all four produce the same `.css` file**. There is no second format. `services/theme-editor.ts` is the whole conversion: `readThemeDraft` parses a stylesheet into picker values, `serializeTheme` writes them back, and `theme-editor.test.ts` guards the round trip in both directions.

- **The controls are a view of the file, not a state beside it.** A change shows immediately as an inline custom property on the root element and is written to the file on a 400ms debounce (`previewDraft` / `flushThemeEdit` in `state/theme-store.ts`); the commit `patchTheme`s the existing text rather than regenerating it. The file is authoritative; a rescan reads it back.
- **`constants/theme-tokens.ts` decides what's editable** — twenty colours in five groups, plus the twelve gradient slots. It's deliberately a subset of the token system: a theme file can set anything, but a panel offering all forty would be unnavigable.
- **Five tokens are derived, not offered.** The two accent tints and the three callout washes are alpha versions of colours already in the picker (`deriveTokens`). They're still written into the file, so it stays a plain stylesheet — but keeping them in step by hand is how you get a theme whose selected tree row is a different hue from its buttons. **All three callout washes now come from their own edge**; Quote used to be special-cased to a flat white film at 0.035, which meant no theme could give its Quote a visible box, however it set the edge.
- **A gradient the controls can't express is kept verbatim.** `parseGradient` matches only the two shapes `gradientCss` writes; anything richer (three stops, a conic, named colours) comes back as `raw`, is shown as read-only, and is re-emitted byte for byte. The alternative — flattening someone's hand-tuned gradient into two stops on the next keystroke — is data loss.
- **A gradient that's off is omitted entirely**, never written empty. See `docs/handoff.md` for why that distinction matters.

### Importing a theme or a palette (Phase 12)

`importTheme` in `state/theme-store.ts`, via `pickThemeFile` (native picker, `.css` and `.json` in one filter). Both kinds end as a file in the themes folder, which is then scanned and selected like any other.

- A `.css` is **copied verbatim**. Re-serializing it would reflow a hand-written file and drop everything the pickers don't model.
- A `.json` goes through `services/palette-import.ts`, the only file that knows about foreign palette formats. It reads `name: "#hex"` pairs (nested up to four levels), scores each colour for a role, and writes the result out with `serializeTheme`'s `origin` parameter — which replaces the "Made in Settings → Colours" header line and lists the guesses as comments above the block.
- **Roles are decided by measurement, with names only scoring.** Chroma and luminance pick the accent; the callout edges are aimed at fixed hues (violet first, then blue) and kept ≥25° apart; every text and border step binary-searches to a contrast target against both the window and the panel. The contrast floors are the same ones in the section above — see `docs/handoff.md`.
- A `fooStart`/`fooEnd` pair in the palette becomes the accent and title gradients.
- Three failure states, told apart in `importError` and worded in `StylesheetNotices.tsx`: unreadable, no colours found, couldn't save.

### Scales (Phase 11.5)

Everything below lives in a **plain `:root` block** in `index.css`, deliberately *not* in `@theme`. `@theme` is Tailwind's utility-generation table: a `--text-sm` declared there redefines the `text-sm` utility, and `@blocknote/shadcn`'s menus are built entirely out of those utilities. The app writes no Tailwind classes of its own, so it gains nothing from that table and risks breaking the editor chrome. New non-colour tokens go in `:root`; colours stay in `@theme` for the shadcn bridge described above.

The one exception is `--radius-*`, which does use Tailwind's namespace — its three overlapping values are set to Tailwind's own defaults (`sm` 0.25rem, `md` 0.375rem, `lg` 0.5rem) so `rounded-*` inside BlockNote lands on the pixels it always did. **If you change one of those three, check the editor menus.**

**Type** — `--fs-*`. The four small sizes carry ~95 of the app's sized elements and were left alone; what collapsed was the tail (eleven sizes down to eight, six competing heading sizes down to three).

Every step is `calc(<base> * var(--fs-scale))`, and `--fs-scale` (default `1`) is what Settings → **Fonts and text**'s **Interface** slider sets. The obvious alternative — a `font-size` on the root element — moves every `rem` in the app at once, so asking for bigger text would also inflate all eight spacing steps, both sidebars and the reading column. The values in the table are at scale 1.

There is a second multiplier, `--fs-scale-content`, behind the **Writing** slider, and one token that uses it: `--fs-content` (`0.9375rem` at scale 1 — 15px). The two exist separately because they answer different questions — the app's labels want to be as small as you can still read them, the text you write in wants to be comfortable, and those don't land on the same number. **`--fs-content` may only ever be used by `.editor-shell .bn-editor`.** "Writing" means the text on a page; a second element taking that token turns the slider into "some things, sort of". Its floor is lower than the UI's (0.75 vs 0.85) because the page body is bigger than the app's 11px labels and has further to come down before it stops being readable.

The body was 16px until 2026-08-30, when it was reported as too big at 100% — a small window could barely hold a paragraph. **When the base moves, move `CONTENT_SCALE_MIN` and `CONTENT_SCALE_MAX` with it.** They went 0.7/1.4 to 0.75/1.5 in the same change, so the smallest and largest the writing can actually be stayed at 11.25px and 22.5px. Changing what 100% means is a decision about the default; shortening the slider at both ends as a side effect is not.

| Token | Value | Use for |
|---|---|---|
| `--fs-2xs` | 0.6875rem / 11px | Property labels, eyebrow labels, meta text, paths |
| `--fs-xs` | 0.75rem / 12px | Dense UI, secondary labels, hints |
| `--fs-sm` | 0.8125rem / 13px | The default UI size |
| `--fs-md` | 0.875rem / 14px | Emphasis, inputs you type into |
| `--fs-lg` | 1rem / 16px | Panel headings (a Settings screen's own title) |
| `--fs-xl` | 1.125rem / 18px | Modal titles (import, export, Settings) |
| `--fs-2xl` | 1.25rem / 20px | Section headings (All Projects, Add a Project) |
| `--fs-3xl` | 1.75rem / 28px | Page and folder titles |

The 20px step was added 2026-08-18 for Phase 27's section headings, which needed
to be bigger than body text without borrowing the size that means "modal title".
The 32px step it displaced is gone rather than renamed: the start screen's big
`<h1>` went with Phase 27's rebuild and nothing used it afterwards. **A step
nothing uses is a step someone will misuse**, which is the same rule in both
directions — don't add one speculatively either.

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
| `.ui-backdrop` | `.ui-backdrop-top` (the search palette, anchored high) · `.ui-backdrop-see-through` (transparent and click-through — see below) |
| `.ui-modal` | `.ui-modal-sm` 22rem · `.ui-modal-md` 28rem · `.ui-modal-lg` 32rem |
| `.ui-surface` | the raised-panel look without a dialog's geometry |
| `.ui-btn` | `.ui-btn-primary` · `.ui-btn-secondary` · `.ui-btn-danger`, plus `.ui-btn-lg` for empty-state actions |
| `.ui-icon-btn` | `.ui-icon-btn-sm` 20px · (base) 24px · `.ui-icon-btn-lg` 28px; picks up `aria-pressed` on its own |
| `.ui-link` · `.ui-eyebrow` · `.ui-inline-remove` | — |

#### Settings stops dimming the app on the appearance sections

On the four `look` tabs — Theme, Colours, Fonts and text, Snippets — the Settings backdrop goes fully transparent *and* `pointer-events: none`. The app behind stays visible in its true colours and stays clickable, so a theme can be judged on more than one page while the picker is open. Escape and the × close it; the backdrop no longer can, because it isn't there to click.

Reported from use on 2026-08-30: choosing colours meant looking at the app under `--color-scrim`, a flat 50% black. The strip of app that *was* visible showed the colour at half brightness, so the panel could not be used for the one thing it exists for.

Two things about it are deliberate:

- **It keys off `group === "look"`, not a list of tab ids.** A fifth appearance section gets this for free, which is the only way it stays true.
- **`aria-modal` follows the same condition** in the component — claiming a modal while the rest of the window is reachable by mouse is a lie to a screen reader.

**The dialog itself does not move, and rebuilding that is not a small improvement.** The 2026-08-30 pass also narrowed Settings to 44rem and docked it full-height against the right edge on these four sections, sliding it back to centred for the rest, all inside `@media (min-width: 72rem)`. Removed 2026-09-01 on report, and the objection was not to the geometry: a dialog that sits in a different place depending on which section of it you are on is a surprise every single time it happens, and no amount of easing makes a window that moves under you feel intentional. The dim was the half of that change doing the real work, and it stayed. If the centred dialog is later found to cover too much, narrow it or move it in **both** modes so it is always in the same place — do not make its position a function of the section.

Guarded by `e2e/settings-gets-out-of-the-way.e2e.ts`, which measures the computed backdrop colour, a real click landing on a tree row, and that the dialog's box is identical either side of the crossing. None of that is decidable from the source, and a test asserting the class name would pass with the rule deleted.

#### `.settings-panel` keeps a 4px gutter for the focus ring

`overflow-y: auto` makes an element a scroll container on **both** axes, so `.settings-panel` clips horizontally as well — and every full-width control in Settings starts exactly on its left edge. `:focus-visible` draws a 2px outline at 2px offset, so tabbing to a font picker gave it a ring with its whole left side sliced off: square against the panel edge, rounded on the other three. The right-hand side never showed it, because `padding-right` was already there to keep the scrollbar off the controls.

The fix is `padding-left: var(--space-xs)` with an equal negative `margin-left`, so the ring gets somewhere to be drawn and nothing moves. **4px is the ring's own reach — offset plus width. If either changes in `index.css`, this changes with it.** It is not a Settings-specific bug; any `overflow: auto` container whose children run edge to edge has it.

#### The typeface menu is a component, not a `<select>`

`FontPicker` in `components/shell/`. It was a native `<select>` with `<optgroup>`s until 2026-08-30, and the categories inside it were reported as impossible to tell apart while scrolling 119 families. Nothing in CSS could have fixed that: **a native popup is drawn outside the document**, so it takes no styling and cannot even be screenshotted to check. Owning the menu is what makes the headings ours.

Three things came with it rather than after it:

- **A search box.** A native select has type-ahead built in, so replacing one without a way to jump to a name would have removed a capability in exchange for looks. At 119 families that is the difference between a picker and a scroll.
- **Sticky headings.** `position: sticky` on `.font-picker-group-label`, opaque in `--color-panel-edge` so rows don't slide visibly through the words. A heading that scrolls away answers "what categories exist"; the question being asked was "what am I looking at now".
- **`z-index: 1001`, unlike every other popover in the app.** `.tree-popover` sits at 30, which is plenty in the tree and the properties panel because nothing is over those. This one opens from inside Settings, and `.ui-backdrop` is 1000 — both portal to `<body>`, so they share a stacking context and the dialog painted straight over the menu. It rendered `visibility: visible`, correctly sized, correctly positioned, and invisible. **Measurements said it was fine; the screenshot is what caught it.**

Everything else — keyboard walking, focus return, click-outside, Escape, flipping above the trigger when there is no room below — comes from `TreePopover`, the same machinery the tree and the properties panel use. The one thing this file adds is `scrollIntoView` on option focus, because TreePopover focuses with `preventScroll`: right for a menu of eight, wrong for one of 119.

`.font-picker-list` keeps its max-height at `min(50vh, 24rem)` rather than something taller. At 30rem the menu always cleared the top of the window, got clamped to the viewport margin, and covered the dialog header and the trigger that opened it.

**Every slot offers every family** (`fontChoicesFor` in `hooks/use-theme.ts`). `FontSlot.cats` is ordering only — Interface opens on Sans-serif, Code on Monospace — and is no longer a filter. It was one, so Monospace was reachable from Code and nowhere else; that is the app deciding what the user is allowed to want, on the one screen that exists for them to decide what they want. Guarded by `src/hooks/use-theme.test.ts` and `e2e/picks-a-typeface.e2e.ts`.

At most one `.ui-btn-primary` per screen. Secondary hover always means the accent tint — that's the single hover language for anything that's a button. Menu rows, tree rows and the recent-projects tiles keep their own, correctly: they aren't buttons.

**The primary button is a deep fill lit from the top, with white text** (`--color-on-accent`), rebuilt 2026-08-18. Before that it was `--gradient-accent` over `--color-accent-light` with `--color-bg` as the text, and both halves were rejected. The reasoning is worth keeping because it constrains anyone changing it: **white on `--color-accent-light` measures about 1.5:1**, so a bright fill can only take dark text. Wanting white text means wanting a deep fill, and the brightness then has to move into the highlight — which is what gloss is. The gradient has four stops, and the 30% and 70% ones are the band the label sits on; only that band has to clear 4.5:1, which is what leaves the top edge free to be bright enough to see. Hold the *whole* fill dark enough for white text and you get a rectangle with no gradient in it. Every stop is mixed from `--color-accent-dark`, so it follows the theme.

**`.ui-btn-danger` is the same button in red**, added a few hours later on the same day. It differs in one way that matters if you touch it: its stops are `oklch(from var(--color-destructive) L c h)` rather than `color-mix` toward black, because there is only one destructive token and its lightness is not comparable across themes — `#f87171` on the dark ones, `#dc2626` on Daylight. Mixing both by the same percentage gives Daylight a near-black button; pinning the lightness and keeping each theme's own chroma and hue lands them within a tenth of each other.

Deliberately a stylesheet and not a component library. These are *looks*, not behaviour; a `<Button>` wrapper would add props to maintain and buy nothing the class doesn't.

### Typography

Four faces. Three are self-hosted (bundled in `public/fonts/`) to keep the app fully offline; the fourth is a system stack:

- **UI text** — Inter — `var(--font-ui)`. Buttons, tree rows, sidebar labels, modal chrome. Set on `body` in `@layer base`, so most things inherit it.
- **Wiki body prose** — Newsreader — `var(--font-prose)`. The writing surface inside BlockNote; a serif tuned for long-form reading, applied via the `.wiki-body` class that wraps every editor instance.
- **Display** — Fraunces — `var(--font-display)`. Page titles, folder titles, modal titles, the start screen. Weight 500 with `--lh-tight`; Fraunces carries far more presence than Inter at the same numbers, so 600 here reads as shouting. **Set it in the component's own rule** — the old `.font-display` utility class is gone, because having two mechanisms for "this is a heading" is how the app ended up with six heading sizes.
- **Mono** — a system stack (`ui-monospace`, Cascadia, SF Mono, Consolas…) — `var(--font-mono)`. Keyboard shortcuts, file paths, `<code>`. Not bundled: it appears in maybe five places, every desktop this ships to has a good one, and a woff2 would cost bytes and an offline-asset to maintain for no visible gain. Bundling a specific mono later is a taste call, not a fix.

The split is deliberate: UI reads clean and neutral, writing reads like writing (not like settings), titles carry the app's personality, and literal strings look literal. If a *fifth* face is proposed, push back.
