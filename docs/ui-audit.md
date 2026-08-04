# UI Audit

A catalogue of what's actually wrong with how the app looks, written 2026-07-31
so Phases 11–12 have a list to burn down instead of a feeling to chase.

**How to use this:** Part 1 is bugs — things that are wrong by any standard, no
taste required. Part 2 is why the app reads as cheap even where nothing is
broken; it's the part that has to be fixed *before* themes, because a theme
swaps colours and none of these are colour problems. Part 3 goes surface by
surface. Cross off as they land; this file is disposable once Phase 12 ships.

Every count below was measured against the stylesheets, not estimated.

---

## Part 1 — Defects

Things that are simply wrong. No design direction needed to fix any of them.
**All thirteen are now crossed off.**

1. **~~Scrollbars on the tab strips.~~** *(fixed 2026-07-31)* Setting
   `overflow-x` to anything but `visible` makes `overflow-y` compute to `auto`
   too, so both tab strips were vertical scroll containers — and the active
   tab's underline hung 1px past the bottom, which is enough to earn a
   full-height scrollbar down a 31px bar. Hit the page tabs and Settings.

2. **~~The import progress bar was almost invisible.~~** *(fixed 2026-07-31)*
   Filled with `--color-accent`, which is the 15%-opacity hover tint, not the
   teal. Against its own track that came out about one shade off the
   background. The update-download bar next to it uses `--color-accent-dark`
   and looks right — the two bars in the app disagreed.

3. **~~Recent projects couldn't be told apart.~~** *(fixed 2026-07-31)* Three
   entries all named "Valeraverse", distinguished only by a 60-character
   absolute path set in 11px with `word-break: break-all`, wrapping mid-word
   across three lines. Now shows the containing folder on one line.

3b. **~~Nothing in the app was a scroll container.~~** *(fixed 2026-07-31,
   regression from the scrollbar work)* The three-column grid's single row was
   content-sized and `.app-layout-center` was a flex column without
   `min-height: 0`, so a long page made the centre column taller than the
   window rather than making the page area scroll. Measured: a 2000px page
   produced a 2056px column inside a 300px window, with `.app-layout-page`
   reporting `scrollHeight === clientHeight` — it had never been a scroll
   container. The overflow escaped to the document, and the *document's*
   scrollbar was doing all the scrolling in the app. Pinning the document
   (defect 1's fix) removed the only thing that scrolled, and the scroll wheel
   stopped working entirely. The row is now capped with `minmax(0, 1fr)` and
   the centre column can shrink. Worth remembering as the shape of the
   mistake: the ugly scrollbar was not decoration, it was load-bearing.

4. **~~The sidebar tab strip and the top bar are different heights.~~**
   *(fixed 2026-08-04)* `.top-bar` was a hard `height: 48px`; `.tree-sidebar-tabs`
   had no height at all and came out ~41px from its padding, so the two bottom
   borders met at the sidebar's right edge 7px apart — a horizontal rule that
   stepped down as it crossed the window, which is the thing that reads as "the
   layout is crazy" in the screenshot. Both now take `--h-bar`. Measured after:
   `topBarH 48, sidebarStripH 48, step 0`.

5. **~~The active sidebar tab is 2px taller than its neighbours.~~**
   *(fixed 2026-08-04)* `.tree-sidebar-tab-active` added a real `border-bottom:
   2px` to a row that's `align-items: center`, so activating a tab nudged its
   own label up a pixel and Project/Templates/Assets jittered as you switched.
   Now an `::after`, which is what the page tabs and Settings tabs already used
   — three tab strips, one mechanism. Measured after: active and inactive tabs
   both 47px, label top delta 0.

6. **~~The project name is on screen twice~~** *(fixed 2026-08-04)* It sat in
   the top bar and again in the sidebar header, about 50px apart. The sidebar
   keeps it: that copy has the home button and the add-page button attached and
   heads the tree it names, while the top bar's was a label with nothing to do.
   The top bar's left side is now deliberately empty rather than filled with
   something invented — back/forward and a breadcrumb are Phase 14, and that's
   where they go.

7. **~~Keyboard focus is invisible almost everywhere.~~** *(fixed 2026-07-31)*
   Two elements in the app defined a `:focus-visible` style — the Settings tabs
   and the new-page template grid. Everything else showed Chromium's default
   ring, which is white, or nothing at all. That white ring is the "white box"
   bug that kept resurfacing in different places: the sidebar rows, then the
   sidebar list, then the import dialog's name field. Same defect each time,
   fixed one instance at a time. Now handled as a class in `index.css`:
   `:focus` clears the ring app-wide and `:focus-visible` gives back a themed
   one. The five fields that had no focus style at all — import project name,
   start-screen project name, sidebar find, tree rename, property type — were
   the visible symptom.

8. **~~Nothing animates.~~** *(fixed 2026-07-31)* Five `transition`
   declarations in the entire codebase, four of them progress bars and the
   sidebar collapse. Every hover state — every button, every tree row, every
   tab — snapped. A base transition now covers form controls and `[role=
   button]`, with the tree row named separately since it's a div and gets a
   deliberately shorter list (it's virtualized and recycled constantly).

9. **~~`--color-accent` and `--color-accent-faint` are byte-identical~~**
   *(fixed 2026-08-04)* Two names, one value, and one of them was really a
   shadcn compatibility alias that only BlockNote's menus should touch — the
   ambiguity is what caused defect 2. `--color-accent` is now written as
   `var(--color-accent-faint)`, so it reads as the alias it is.

10. **~~One border colour doing three jobs~~** *(fixed 2026-08-04)*
    `--color-border-subtle` was used exactly once in the whole app (the search
    palette's input underline), so panel edges, card outlines, text-field
    outlines and dividers were all the same 1px of `#2a2a35`. That's the
    "borders are ugly" complaint: none of them is ugly on its own, there was
    just no hierarchy. Three roles now — `strong` for the frame (the two column
    dividers, the top bar and sidebar strip, modal and popover edges), the base
    for containers, `subtle` for rules *inside* a container (the two tab
    strips, the menu heading, the search input). Measured after: frame lines
    `rgb(56,56,72)`, in-content rules `rgb(34,34,44)`, inputs `rgb(42,42,53)`.
    The values are provisional and Phase 12 re-tunes them per theme; the roles
    are the part meant to last.

11. **~~The properties panel is styled by two separate rule blocks~~**
    *(fixed 2026-08-04)* `.app-layout-properties` was declared twice in
    shell.css, split by an unrelated selector. Merged into one.

12. **~~The reading column width is hardcoded in two places~~** *(fixed
    2026-08-04)* `.page-view` and `.page-banner-empty` both said `max-width:
    60rem`; both now say `var(--reading-width)`.

13. **~~The window silently drops panels when narrowed.~~** *(fixed
    2026-08-04)* Media queries hid the properties panel below 700px and the
    tree below 640px, with no indication and no way back short of resizing —
    web thinking in a desktop window. They were also unreachable:
    `tauri.conf.json` sets `minWidth: 900`, so neither breakpoint could ever
    fire outside a browser tab. Both deleted. The properties panel has a real
    toggle in the top bar; the tree's is Phase 14's resizable-sidebar work.

---

## Part 2 — Why it looks cheap

The app has a colour token system and nothing else. Every other axis of a
design system is missing, so each screen was styled by hand and they all landed
slightly differently.

### ~~There is no type scale~~ *(fixed 2026-08-04)*

Eleven distinct font sizes. Two of them did almost all the work (13px and 12px,
36 uses each), and then every heading in the app was a one-off:

| Size | Where | Uses | Now |
|---|---|---|---|
| 2rem / 32px | start page `<h1>` | 1 | `--fs-3xl` |
| 1.75rem / 28px | page title | 2 | `--fs-2xl` |
| 1.5rem / 24px | folder view name | 1 | `--fs-2xl` |
| 1.125rem / 18px | import and export titles | 2 | `--fs-xl` |
| 1rem / 16px | Settings title | 1 | `--fs-xl` |
| 0.9375rem / 15px | search input | 1 | `--fs-md` |

Six sizes for "this is the title of the thing you're looking at", no two
surfaces agreeing — the Settings modal's title was 16px and the import modal's
18px. Now eight tokens, three of them headings, and the three modal titles are
one size. The confirm dialog still has no title at all; that's a content
problem, not a scale problem, and it's still open under Modals below.

### ~~There is no display font, despite bundling one~~ *(fixed 2026-08-04)*

**Fraunces shipped in the app and was used in exactly one place** — the word
"Anamnesis" on the start page. Everything else — every page title, every modal
heading, every folder name, the entirety of Settings — was Inter at one of five
sizes. That's the "fonts are lame" complaint, and it was literally true: a wall
of one sans-serif. Fraunces now carries all six title surfaces at weight 500.

Monospace is now a system stack (`--font-mono`) on keyboard shortcuts, file
paths and `<code>`, which previously rendered in Inter with only a size change.
Not bundled — see the reasoning in `docs/constants-and-theming.md`.

### ~~There is no radius scale~~ *(fixed 2026-08-04)*

Thirteen different `border-radius` spellings across nine actual values. Four of
the common ones were each written two different ways:

| Value | Spellings | Total uses | Now |
|---|---|---|---|
| 4px | `4px` (13) + `0.25rem` (12) | 25 | `--radius-sm` |
| 8px | `8px` (16) + `0.5rem` (6) | 22 | `--radius-lg` |
| 6px | `6px` (15) + `0.375rem` (3) | 18 | `--radius-md` |
| pill | `999px` (3) + `9999px` (1) | 4 | `--radius-full` |

Plus `2px`, `3px` and `5px` one-offs that nobody meant, now folded into the
nearest step. Four tokens, zero literals — verified: no numeric `border-radius`
remains in any stylesheet except the two deliberate `50%` circles.

### ~~There is no spacing scale~~ *(fixed 2026-08-04)*

245 padding/margin/gap declarations across 19 distinct values. Eight steps now
(2/4/6/8/12/16/24/32px), chosen to match what the app already leaned on rather
than imposed from outside — 6px and 8px alone carried 100 of the 245, so a
"clean" 4px-only grid would have meant retyping the app's commonest gap for the
grid's sake. The tail collapsed: 10px → 12, 14px → 12 or 16, 20px → 24, and the
3px/5px/7px one-offs to their nearest step. Verified: zero numeric `rem` values
remain in any padding, margin or gap declaration in any stylesheet.

The visible effect is that the dense screens — Settings, the properties panel,
the modals — have more air than they did. Modal padding in particular is one
value where it was two.

### ~~There is no line-height~~ *(fixed 2026-08-04)*

Six `line-height` declarations in the whole app, applied ad-hoc (1.4, 1.4, 1.5,
1.5, 1.5, 1.5). Everything else inherited the browser default of roughly 1.2,
which is why dense areas — Settings, the properties panel, the import preview —
felt cramped. `--lh-normal` (1.5) now sits on `body`, `--lh-tight` (1.25) on
headings, and four of the six ad-hoc declarations were deleted as redundant.

### ~~There are no shared components, so everything is duplicated~~ *(fixed 2026-08-04)*

`src/controls.css`, imported into `index.css` as `layer(controls)` so every
(unlayered) component stylesheet can still override it without a fight.

| Was | Now |
|---|---|
| 5 identical modal backdrops, copy-pasted | `.ui-backdrop` (+ `.ui-backdrop-top` for the search palette) |
| 6 modal shells at 6 widths (20/22/28/32/32/36rem), 2 paddings | `.ui-modal` at 3 widths, one padding; `.ui-surface` for the palette |
| 9 near-identical secondary buttons, 3 radii, 3 backgrounds | `.ui-btn` × 3 roles + one size step |
| 7 dismiss buttons at 7 sizes (18/20/22/24/26/28/32px) | `.ui-icon-btn` at 3 sizes (20/24/28) |
| 3 text links, one borrowed across panels | `.ui-link` |
| 4 copies of the eyebrow label | `.ui-eyebrow` |
| 3 identical inline remove-X rules | `.ui-inline-remove` |

Measured after, on a page rendering all of them at once: 9 buttons → 4 distinct
computed looks, 9 icon buttons → 3 sizes, links → 1, eyebrows → 1, backdrops →
1 (the palette differing only in `align-items`, by design).

Deliberately a stylesheet and not a component library: every one of these is a
*look*, not behaviour, so a `<Button>` wrapper would add props to maintain and
buy nothing the class doesn't. What stayed hand-rolled stayed on purpose — the
recent-projects tile, the shortcut-recording field and the top bar's search
button are controls of their own shape, not members of a set.

The five hover languages the audit found are down to one for anything that's a
button: secondary always means the accent tint. Menu rows and tree rows keep
their own, which is correct — they're not buttons.

### ~~Hover means five different things~~ *(partly addressed 2026-07-31)*

The five languages below are still five languages — that's the consolidation
work. But they all ease now instead of snapping, which was the larger part of
why they read as unfinished.


Depending on which screen you're on, hovering a control does one of:
`border-color: accent-faint-border` + `background: accent-faint` · `background:
panel-edge` · `background: panel-alt` · `border-color: text-muted` · `filter:
brightness(1.1)`. There's no rule about which, and no transition on any of them.

---

## Part 3 — Surface by surface

### Start page

The screen a new user meets first, and the least designed in the app.

- ~~Title is the only Fraunces in the product~~ *(fixed — it now shares a face
  with every other title in the app)*, but it still floats above a stack of
  unrelated boxes with no shared alignment.
- Three actions — Open folder, Import from LegendKeeper, New project — still
  styled identically (all `.ui-btn .ui-btn-lg .ui-btn-secondary`), though for
  someone opening the app for the first time only one of them is the likely
  next step. No primary action. Which one gets promoted is a content decision,
  not a token one, so the shared button set didn't settle it.
- "New project" expands into an inline form *inside the button row*, which
  changes the row's height and reflows the whole centred column underneath it.
- Recent projects is a bare list with no dates, no template counts, no icons —
  nothing but a name and a path, though `lastOpenedAt` is already stored and
  could be shown.
- No window chrome of its own, so it reads as a webpage in a frame.

### Settings

- Three panels that look like three unrelated screens: Projects is a label plus
  a path box plus two underlined text links; Keyboard is a dense grid; Updates
  is a single muted sentence. No section headings, no dividers, no shared
  layout.
- ~~Four font sizes in one modal (16 / 13 / 12 / 11px).~~ *(partly fixed
  2026-08-04 — the title is now 18px Fraunces, matching import and export, and
  the shortcut keys are mono so the key column lines up. The panels themselves
  are still three unrelated screens, above.)*
- Fixed 28rem width regardless of panel, so the Keyboard grid is cramped and
  the Updates panel is 90% empty.
- The Projects panel's two actions are underlined text, not buttons — they read
  as links in a desktop dialog. (They're `.ui-link` now rather than borrowing
  the Updates panel's class, but whether they should be buttons at all is still
  open.)

### Top bar and sidebar

- ~~The 7px height mismatch~~ and ~~the duplicated project name~~ *(both fixed)*.
  The left half of the bar is now empty, which is honest rather than good — it's
  reserved for Phase 14's back/forward and breadcrumb.
- The three-column grid is fixed at `260px 1fr 300px` and can't be resized,
  which is already queued as Phase 14/21 work.
- The top bar holds a project name and four controls in 48px and otherwise sits
  empty — no breadcrumb, no back/forward, nothing that earns the space. Moving
  it is already on the plan.

### Page view

- ~~Page title is 28px Inter 600 — the same weight and family as body UI text,
  so the most important text on screen has almost no presence.~~ *(fixed
  2026-08-04 — 28px Fraunces 500. The rename input matches it, so the title no
  longer changes face when you click into it.)*
- ~~Folder view names the same thing at 24px, for no reason.~~ *(fixed — same
  rule as a page title, because it is one.)*
- Tab strip has no hover state on inactive tabs beyond a colour change. (The
  eye/delete/add buttons *in* the strip are `.ui-icon-btn` now; the tab labels
  themselves aren't buttons in the control-set sense.)

### Right sidebar (properties)

- ~~Field labels are 11px uppercase; the import modal's section labels are 12px
  uppercase; the start page's are 13px uppercase.~~ *(fixed 2026-08-04 — one
  treatment, 11px/600/0.05em.)*
- Being rebuilt in Phase 18 anyway, so it's low-value to polish now beyond
  what's already been fixed.

### Modals

- Import and export are a deliberately matched pair and were the most coherent
  screens in the app, which is why the shared control set was modelled on them
  — their padding, their button shapes and their title treatment are what the
  other four dialogs now inherit.
- The confirm dialog has no title, so a destructive confirmation is a sentence
  and two buttons with no heading telling you what's about to happen.

---

## What this means for phase order

Part 2 has to be fixed before the theme switcher, and it isn't a preference
call. A theme swaps token *values*; none of the problems above are values. If
themes go first, every theme inherits eleven font sizes, nine radii and no
line-height, and they will all look equally unfinished — which would make
choosing between them impossible, since the thing that's wrong would be
identical in all of them.

The order that works is: consolidate to scales (mechanical, no taste required,
mostly find-and-replace), *then* build the switcher, *then* build directions on
top of it. That way a visual direction is a small file that can be tried and
deleted, which is the whole point of scheduling the switcher early.

**Parts 1 and 2 are now complete**, which is what Phase 12 was waiting on. What
remains is Part 3 — surface-level composition, and taste rather than
consolidation: the start screen's unaligned box stack and missing primary
action, Settings' three unrelated panels at one fixed width, the confirm dialog
having no title. None of it blocks the theme switcher, and some of it is better
decided *with* a theme on screen than before one.
