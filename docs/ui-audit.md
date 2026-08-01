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

4. **The sidebar tab strip and the top bar are different heights.** `.top-bar`
   is a hard `height: 48px`. `.tree-sidebar-tabs` has no height at all — it
   comes out ~41px from its padding. So the two bottom borders meet at the
   sidebar's right edge 7px apart. This is the thing that reads as "the layout
   is crazy" in the screenshot: a horizontal rule that steps down as it crosses
   the window.

5. **The active sidebar tab is 2px taller than its neighbours.**
   `.tree-sidebar-tab-active` adds `border-bottom: 2px` to a row that's
   `align-items: center`, so activating a tab nudges its own label up a pixel.
   Project/Templates/Assets jitter as you switch. The other two tab strips in
   the app do the same underline with an `::after` and don't have this problem
   — three tab strips, two different mechanisms.

6. **The project name is on screen twice**, ~50px apart: once in the top bar
   (`.top-bar-project-name`) and once in the sidebar header
   (`.tree-project-header-name`).

7. **Keyboard focus is invisible almost everywhere.** Exactly two elements in
   the app define a `:focus-visible` style: the Settings tabs and the new-page
   template grid. Every button on the start page, every modal action, every
   Settings control either shows Chromium's default ring or nothing at all.

8. **Nothing animates.** Five `transition` declarations in the entire codebase,
   and four of them are progress bars and the sidebar collapse. Every hover
   state in the app — every button, every tree row, every tab — snaps. This is
   a large part of why it feels like a form and not an app.

9. **`--color-accent` and `--color-accent-faint` are byte-identical**
   (`rgba(20, 184, 166, 0.15)` both). Two names, one value, and one of them is
   really a shadcn compatibility alias that only BlockNote's menus should
   touch. That ambiguity is what caused defect 2.

10. **`--color-border-subtle` is used once** in the whole app (the search
    palette's input underline). Effectively the app has exactly one border
    colour at exactly one weight doing structural, decorative and input duty
    — panel edges, card outlines, text-field outlines and dividers are all the
    same 1px of `#2a2a35`. That's the "borders are ugly" complaint: they aren't
    ugly individually, there's just no hierarchy among them.

11. **The properties panel is styled by two separate rule blocks**
    (`.app-layout-properties` is declared twice in shell.css, split by an
    unrelated selector). Harmless today, a merge hazard later.

12. **The reading column width is hardcoded in two places** — `.page-view` and
    `.page-banner-empty` both say `max-width: 60rem`. They will drift.

13. **The window silently drops panels when narrowed.** Media queries hide the
    properties panel below 700px and the tree below 640px, with no indication
    and no way to get them back short of resizing. That's web thinking in a
    desktop window.

---

## Part 2 — Why it looks cheap

The app has a colour token system and nothing else. Every other axis of a
design system is missing, so each screen was styled by hand and they all landed
slightly differently.

### There is no type scale

Eleven distinct font sizes. Two of them do almost all the work (13px and 12px,
36 uses each), and then every heading in the app is a one-off:

| Size | Where | Uses |
|---|---|---|
| 2rem / 32px | start page `<h1>` | 1 |
| 1.75rem / 28px | page title | 2 |
| 1.5rem / 24px | folder view name | 1 |
| 1.125rem / 18px | import and export titles | 2 |
| 1rem / 16px | Settings title | 1 |
| 0.9375rem / 15px | search input | 1 |

Six sizes for "this is the title of the thing you're looking at", no two
surfaces agreeing. The Settings modal's title is 16px; the import modal's is
18px; the confirm dialog has no title at all.

### There is no display font, despite bundling one

**Fraunces ships in the app and is used in exactly one place** — the word
"Anamnesis" on the start page. Newsreader is used for editor body text.
Everything else — every page title, every modal heading, every folder name,
the entirety of Settings — is Inter at one of five sizes. That's the "fonts are
lame" complaint, and it's literally true: the app is a wall of one sans-serif.

There's also no monospace font bundled at all, so keyboard shortcuts, file
paths and `<code>` elements render in Inter with only a size change.

### There is no spacing or radius scale

Thirteen different `border-radius` spellings across nine actual values. Four of
the common ones are each written two different ways:

| Value | Spellings | Total uses |
|---|---|---|
| 4px | `4px` (13) + `0.25rem` (12) | 25 |
| 8px | `8px` (16) + `0.5rem` (6) | 22 |
| 6px | `6px` (15) + `0.375rem` (3) | 18 |
| pill | `999px` (3) + `9999px` (1) | 4 |

Plus `3px` and `5px` one-offs that nobody meant. The result is that a card, a
button and an input sitting next to each other are often 8px, 6px and 4px
respectively, and the difference reads as sloppiness rather than hierarchy.

### There is no line-height

Six `line-height` declarations in the whole app, applied ad-hoc (1.4, 1.4, 1.5,
1.5, 1.5, 1.5). Everything else inherits the browser default of roughly 1.2,
which is why dense areas — Settings, the properties panel, the import preview —
feel cramped.

### There are no shared components, so everything is duplicated

- **5 identical modal backdrops.** `position: fixed; inset: 0; background:
  rgba(0,0,0,0.5); display: flex; z-index: 1000`, copy-pasted five times.
- **6 modal shells** at 6 different widths (20 / 22 / 28 / 32 / 32 / 36rem)
  with two different paddings (1.25rem and 1.5rem).
- **9 near-identical secondary buttons**, across three radii and three
  background colours, with no shared class between them.
- **7 close/dismiss "X" buttons** at seven different sizes (18px, 20px, 22px,
  26px, 1.5rem, 1.75rem, and one with no size at all).
- **3 underlined text-link buttons**, defined separately — and the Settings →
  Projects panel borrows the *Updates* panel's class, which a comment in the
  stylesheet actually admits to.

### Hover means five different things

Depending on which screen you're on, hovering a control does one of:
`border-color: accent-faint-border` + `background: accent-faint` · `background:
panel-edge` · `background: panel-alt` · `border-color: text-muted` · `filter:
brightness(1.1)`. There's no rule about which, and no transition on any of them.

---

## Part 3 — Surface by surface

### Start page

The screen a new user meets first, and the least designed in the app.

- Title is the only Fraunces in the product, floating above a stack of
  unrelated boxes with no shared alignment.
- Three actions — Open folder, Import from LegendKeeper, New project — styled
  identically, though for someone opening the app for the first time only one
  of them is the likely next step. No primary action.
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
- Four font sizes in one modal (16 / 13 / 12 / 11px).
- Fixed 28rem width regardless of panel, so the Keyboard grid is cramped and
  the Updates panel is 90% empty.
- The Projects panel's two actions are underlined text, not buttons — they read
  as links in a desktop dialog.

### Top bar and sidebar

- The 7px height mismatch and the duplicated project name (defects 4 and 6).
- The three-column grid is fixed at `260px 1fr 300px` and can't be resized,
  which is already queued as Phase 14/21 work.
- The top bar holds a project name and four controls in 48px and otherwise sits
  empty — no breadcrumb, no back/forward, nothing that earns the space. Moving
  it is already on the plan.

### Page view

- Page title is 28px Inter 600 — the same weight and family as body UI text, so
  the most important text on screen has almost no presence.
- Folder view names the same thing at 24px, for no reason.
- Tab strip has no hover state on inactive tabs beyond a colour change.

### Right sidebar (properties)

- Field labels are 11px uppercase; the import modal's section labels are 12px
  uppercase; the start page's are 13px uppercase. Three treatments of the same
  idea.
- Being rebuilt in Phase 18 anyway, so it's low-value to polish now beyond
  what's already been fixed.

### Modals

- Import and export are a deliberately matched pair and are the most coherent
  screens in the app. They're the closest thing to a reference for what the
  rest should look like.
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
