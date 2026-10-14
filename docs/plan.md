# Anamnesis — Implementation Plan

---

## Project Overview

Anamnesis is a Tauri v2 desktop app for local-first worldbuilding. React 19 + TypeScript in the renderer, Rust shell handling filesystem access. Data lives as JSON files on disk in a folder the user picks. BlockNote provides the Notion-style block editor. LegendKeeper's `.lk` export format is supported as a first-class import/export path so the user can migrate their existing world.

Work phases top-down. Do not start a phase until the previous one is complete and usable. Each phase should end with the app in a coherent, working state — not mid-refactor. Phases are sized to be reviewable as user-facing changes.

**The numbers ascend as you read down, and that is a rule now.** It used to be the opposite — position was the running order and the number was only a name — which meant 29 sat above 19 sat above 28, and the file read as chaos to the person who works from it. Her call, 2026-08-28. Two things follow. **A phase pulled forward gets a fractional number** (19.5, the way 1.5 already worked) rather than keeping a number that would put it out of order. **A number is never reused**: two different phases were both called 28 for a week, which made every reference to "Phase 28" in the other docs ambiguous, so check `grep '^## Phase' docs/plan.md` before writing a new section.

Gaps in the sequence are phases that have shipped and moved to `docs/shipped.md` — 27 and 29 went first, and everything up to 32 has followed; nothing is lost. Phase 2 and Phase 21.5 sit at the bottom out of order on purpose: they are deferred rather than queued, and their headings say so.

**Automate the repetitive parts wherever there is a choice.** The user's standing direction, 2026-08-31, and the same thing said by the botmaker whose folder-preset request became the naming rule on templates (shipped 2026-09-21, `docs/shipped.md`): the reason to keep a world in a tool like this rather than in folders is not doing the same small job by hand for every character. Where a feature can either do a step for someone or ask them to repeat it, it does the step. **The rule that keeps that from becoming its own annoyance came with the same request** — automation is something offered and switched on, never something that happens to a page on its own, and anything a person typed themselves outranks it.

See `docs/spec.md` for the full spec, `CLAUDE.md` for architecture rules, and `docs/prototype/anamnesis.jsx` for a reference React prototype that demonstrates layout and tree behavior (its template content is filler — the real copy lives in `src/services/template-registry.ts`).

---

## Future Features

Parked in [ideas.md](ideas.md), so this file stays focused on active work.

---

## Queued Adjustments

- **Keep peeling logic out of `project-store.ts`, a slice at a time.** A
  read-through on 2026-08-28 found it at 3,226 lines and around 140 actions in
  one `create()` call — the largest file in the project and, at the time, the
  only large one with no unit tests of its own. The move/delete/duplicate slice
  came out that day into `node-edit-service.ts`; the rest has not.

  **The pattern is the one the store already uses in places** — an action that
  is a line or two calling a planner in a service, the way
  `renameTagEverywhere` calls `planTagRename`. The next slices worth taking, in
  rough order of what would hurt most if it broke: applying a template
  (`applyTemplate`, `applyCustomTemplate`) and the tab actions. The asset
  lifecycle (`setNodeImage`, `clearNodeImage`, the banner pair) was looked
  at on 2026-09-22 when its undo was fixed: its rules — which block draws
  the page's picture, where a block's picture lives — already sit in
  `block-service.ts`, and what is left in the store is the ordering of
  reads, writes and releases against the disk, which is the store's job.
  Nothing there to peel.

  **Not as its own phase.** Take a slice when a feature is already touching it,
  so the tests arrive with a reason to trust them. A rewrite of the whole file
  in one go trades a working 3,000-line file for an untested one.

- **Watch the update button on the release after v0.6.0.** One link in the
  chain has never run: an installed Electron build finding a newer one and
  installing it. Everything up to it is proven — the pipeline, the three
  installers, the feeds, and an install opening a real world — but this cannot
  be tested with one release in existence, only with two. If it is going to
  fail, it fails silently, by the button saying there is nothing new.
  `docs/releasing.md` has the shape of the feed and where to look.

- **He may still be on the Tauri 0.5.0 build.** The reinstall v0.6.0 needs is
  one each, by hand, and hers is done. Until his is, his copy is the old shell
  and reports the old version, which is worth remembering before reading a bug
  report from that machine.

- **The folder colour feature wants an overhaul.** Flagged by the user
  2026-08-18, with a screenshot; she said plainly she'd deal with it later, so
  this is a marker, not a brief. **The colour dot that sat between a row's name
  and its ⋯ menu is gone (2026-10-03, at her request)** — the row's ⋯ menu and
  right-click menu already carried *Set Color*, so nothing was lost and the
  ability to colour a page is unchanged. **The overhaul itself is undesigned and
  must be asked about rather than guessed at**, the same rule the search scope
  controls carry below. Related: icons you choose yourself, and links wearing
  the colour of the page they point at, both in `docs/ideas.md`.

- **LegendKeeper's controls for a picture in a page, which the user pointed at
  2026-08-11 as the shape to match.** Two parts, neither built here yet:
  - **Buttons that appear over the picture on hover** — change image, reposition,
    expand — in the top corner, the same idea as the sidebar slot's own hover
    toolbar.
  - **A right-click / dots menu on the block**, holding: Title / No Title, a
    colour row, Change image, Fit to image, Link to page (with a page search),
    Layout, Duplicate, Delete, Insert row below.

  What exists instead today is BlockNote's formatting toolbar (which now carries
  Open full size and Save a copy) plus double-click to open. **The hover buttons
  mean rendering into BlockNote's own block DOM**, which is the part to think
  about before starting rather than the buttons themselves. Several of the menu
  entries — Link to page, Layout, Insert row below — are really Phase 18 sidebar
  blocks wearing a different hat, so check that phase before treating this as one
  job.

- **The app's *default* fonts are still Inter / Fraunces / Newsreader.** The
  98-family library ships, so nothing is blocked on bundling — but
  `--font-ui` / `--font-display` / `--font-prose`'s defaults in `index.css` are
  what someone sees before they touch anything, and moving those is **her
  decision, not a build.** Ask; don't pick for her. Phase 12 closed without it
  because it was never a task.

- **The search scope controls are not the design that was wanted.** Shipped
  2026-08-09 and judged *"serviceable for now"* the same day — kept, not
  accepted. The user chose to move on rather than redesign it then, so **the
  specifics are not recorded and must be asked for, not guessed.** What is
  known:
  - *Sidebar:* a menu that opens on clicking into an empty field is not the
    interaction she pictured. The first attempt was three always-visible
    pills, rejected 2026-08-08 as *"unprofessional and lame"*; the menu was
    the answer to that and is closer, not right.
  - *Ctrl-K:* she described wanting *"filtering stuff and tabs"* (2026-08-08).
    What shipped puts all four scopes behind a Tab press, which is a smaller
    idea than the one she described and reads as nothing being there. Her own
    words on the goal: *"i'd prefer a more robust UI."*
  - Both are two attempts in without landing, which is the signal to design
    it with her before building a third.

- **Loose ends from 2026-08-27, written down because they were only ever in
  pull request descriptions.** A merged PR's body is not a tracking document —
  nobody reads it again. None of these is urgent and none needs a decision
  except where it says so.

  - **The bug report form has never been submitted.** Two more ways in since
    2026-09-21 — the save warning and the `?` sheet — but still no real
    report through it. The link is built, the
    YAML parses, and GitHub's rendering of it is unproven until one real report
    goes through. The `build` box prefills by matching a field id; if that ever
    silently stops working, the only sign is reports arriving with an empty
    box.
  - **A property value orphaned before the template fix is still invisible.**
    New ones cannot happen, but a page that already went through a template
    swap may have a value in its file with nothing able to draw it. She judged
    the leftover *blocks* a non-issue (two users, both known); the values are
    the part worth a second look if it ever turns out to matter.

- **Valeraverse needs re-importing once, and hasn't been.** Two import changes
  landed after her copy was brought in: the project home arriving as a real page,
  and each picture remembering the LK address it came from (without which export
  can't send pictures back). Both apply at import time only, so her existing
  project has neither. One re-import picks up both — worth doing in a single
  pass rather than twice.

---

## Known Bugs

None open as of 2026-09-22. The five that were here on 2026-09-21 were fixed
that day and the next; each is in `CHANGELOG.md` and, where a rule came out
of it, in `docs/handoff.md`.

---

## Shipped

Phases 0–15 are complete. **`docs/shipped.md`** has what each one delivered;
`CHANGELOG.md` has the same story in plain language. **Phase 1.5 (Publish)
shipped 2026-09-10**, the last unstarted phase behind us; its detail and the
scoping it was built with are in `docs/shipped.md`.

| Phase | | Shipped |
|---|---|---|
| 0 | Project Scaffold | 2026-07-29 |
| 1 | Data Layer | 2026-07-30 |
| 2 | App Shell | 2026-07-30 |
| 3 | Tree | 2026-07-30 |
| 4 | Page View Skeleton | 2026-07-30 |
| 5 | BlockNote Editor | 2026-07-30 |
| 6 | Properties Panel | 2026-07-30 |
| 7 | Templates | 2026-07-30 |
| 8 | LK Import | 2026-07-30 |
| 9 | LK Export | 2026-07-31 |
| 10 | Polish + Distribution | 2026-07-31 |
| 11.5 | The Design System | 2026-08-04 |
| 11 | Make It Ours | 2026-08-05 |
| 12 | Themes & Appearance | 2026-08-09 |
| 13 | Property Types | 2026-08-10 |
| 14 | Everyday Navigation | 2026-08-11 |
| 15 | Right-Click Menu, Full Pass | 2026-08-11 |
| 16 | Images & Tags | 2026-08-11 |
| 17 | Templates & Assets Tabs | 2026-08-18 |
| 1.5 | Publish | 2026-09-10 |
| 30 | Home Dashboards & Quick Capture | 2026-09-13 |
| 31 | Embedded Players | 2026-09-21 |
| 32 | Boards, Full Pass | 2026-09-21 |

Project home — the last Queued Adjustment standing before Phase 9 — shipped
2026-07-31.

**Phase 10 closed 2026-07-31** when the signing key went into the repository's
Actions secrets, which was the one step nothing in the repo was allowed to do.
Search, keyboard shortcuts, rebinding, tabbed Settings, sidebar undo/redo and
automated four-platform releases all landed that day. Two things it deliberately
left behind: undo for the right-hand panel, which shipped with **Phase 19** on
2026-08-28, and the
duplicate-on-multi-selection fix, folded into **Phase 15** where that menu gets
reworked anyway. Neither blocks anything.

**The app is shippable.** Anyone can install it, updates reach them, and
nothing about anyone's world leaves their machine.

**Phase 9 left one thing open, and it can't be closed from here:** nothing has
been imported into real LegendKeeper from a file we wrote. The round trip is
verified through our own importer against the real 75-resource
`Valeraverse.lk`, which proves the mapping is self-consistent — not that LK
accepts it. That needs an LK account and an import attempt. See
`docs/handoff.md` §Known gaps.

---

# Phases 11+ — planned 2026-07-31

Everything below comes out of one planning session: the user brought a list of roughly thirty wants plus screenshots of LegendKeeper's current UI, and the answers to nine scoping questions are baked into the phases rather than left as open questions. Where a phase records a decision, the decision is hers and doesn't need re-litigating.

**Two framing decisions that shape the ordering:**

1. **The "UI overhaul" is two jobs, not one.** The *look* (colour, type, spacing, icons, naming) is CSS tokens and is cheap — done early, everything built afterwards is born looking like Anamnesis. The *layout* (left rail, splittable columns, tabs) rewrites the app shell and touches components that don't exist yet — done early it gets done twice. Hence Phases 11–12 up front and Phase 21 near the end. (The layout half moved again on 2026-09-04: the splits are Phase 21.5, deferred, and Phase 21 kept the rail and the title bar.)

2. **The identity pass is deliberately made reversible before it's attempted.** The user's stated blocker was being "extremely picky" with no fixed idea yet. The answer is to ship the theme switcher *first*, so a visual direction becomes a file that can be tried and deleted rather than a one-shot commitment, and then to present complete running directions to react to instead of asking for a design from a blank page. If a future session finds itself asking her to describe what she wants in the abstract, it has taken a wrong turn.

---

**Phases 11, 11.5, 12, 13, 14, 15, 16, 17 and 27 are done** — the identity
pass, the design system beneath it, themes, property types, everyday
navigation, the right-click menu's full pass, pictures and tags, the Templates
and Assets tabs, and the project library the start screen became. Their detail
is in `docs/shipped.md`; what still binds the code is in `docs/handoff.md`.
**Phase 18 shipped whole on 2026-08-21** — the panel is a block canvas,
everything in it is a block, pages written before it derive their layout on
read, one collection block answers what-points-at-what four ways, and a meter
block draws one number six ways. Detail is in `docs/shipped.md`; what still
binds the code is in `docs/handoff.md`.
**Phase 19 (Safety Net) shipped 2026-08-28** — version history for pages, undo
across the whole right-hand panel and a page's tabs, the tree's own history, and
retention she can set. Detail is in `docs/shipped.md`.
**Phase 19.5 (Blocks in the Page) shipped 2026-09-04** — a block can sit in the
writing, on its own or inside an infobox, and be dragged between there and the
sidebar; the frame has its own menu, colour, width and layout, and the writing
wraps around it; the insert menu offers what she listed; a page's headings make
a contents list; and a block hands out a link to itself. Detail is in
`docs/shipped.md`; what still binds the code is in `docs/handoff.md`.
**Phase 21 (Shell Rework) shipped 2026-09-05** — a rail down the left holding
Project, Templates and Assets plus search, the project switcher and settings;
and a title bar that takes the theme's colours and draws its own minimise,
maximise and close. The splits it
was scoped with are Phase 21.5, deferred. Detail is in `docs/shipped.md`; what
still binds the code is in `docs/handoff.md`.
**Phase 22 (Universes) shipped 2026-09-06** — a universe is a top-level
container for one version of the world, chosen from a switcher under the world's
name rather than opened as a row in the tree; the tree shows one at a time, so a
character four levels down under `AUs / Demonic AU / Characters` is two; a
top-level page can be turned into one and back out again; one universe can be
marked the shared one, and its pages ride along in their own section under
whichever universe is selected; and following a link out of the universe you are
in switches to it rather than refusing. Detail is in `docs/shipped.md`; what
still binds the code is in `docs/handoff.md`.
**Phase 23 (Database) shipped 2026-09-07** — a page, or a block inside one,
shown as a table, cards, a board or a list of pages that already exist.
**Phase 24 (Graphs) shipped 2026-09-08** — a page's relationships drawn over
the page, and the whole universe drawn from the rail.
**Phase 25 (Storylines) shipped 2026-09-09** — a Storyline page whose body is a
canvas of scenes joined in narrative order, with loose notes, labelled
stretches, a tidy-up she presses, and scenes that can point at pages she already
has. Detail for all three is in `docs/shipped.md`; what still binds the code is
in `docs/handoff.md`.
**Phase 26 (Teach It To Someone Else) shipped 2026-09-09** — an example world
somebody can open and read, a short tour of the app's own columns the first time
a world is open, and a way back to either of them from Settings. Detail is in
`docs/shipped.md`; what still binds the code is in `docs/handoff.md`, and the
standing rule about keeping both in step with the app is in `CLAUDE.md`.
**Phase 28 (Getting It Back Out) shipped 2026-09-10** — a world leaves as a
LegendKeeper file, a folder of Markdown, one big Markdown file or a JSON
zip; a page prints as a page rather than as the whole window; and one
template at a time can be handed to somebody as a file. Detail is in
`docs/shipped.md`; what still binds the code is in `docs/handoff.md`.
**Phase 20 (Markdown & Folder Import) shipped 2026-09-10**, the same day and
un-deferred by her that morning — a folder of Markdown, a zip of one or a
single note comes in as a world, from the picker or dropped on the window, and
the Phase 28 export round-trips through it. Detail and the reasoning it was
deferred with are in `docs/shipped.md`; what still binds the code is in
`docs/handoff.md` § Markdown import.

**Phase 1.5 (Publish) shipped 2026-09-10** — a world, or one page and
everything under it, as a folder of web pages in the app's own look, with
hidden pages, hidden tabs and Secret callouts kept off it. Detail in
`docs/shipped.md`; what binds the code is in `docs/handoff.md` § Publishing.

**Phase 30 (Home Dashboards & Quick Capture) shipped 2026-09-13**, across
five PRs in three days: the capture block and its second door, the style name
per page and per template, Recently edited and Shortcuts, and a Dashboard
template with a snippet beside it. Detail in `docs/shipped.md`; what binds the
code is in `docs/handoff.md` § Quick capture, § Style names and § Collection
sources.

**Phase 32 (Boards, Full Pass) shipped 2026-09-21**, fifteen steps in fifteen
PRs over four days, on top of the board spike of 2026-09-13: page cards that
are buttons, a page read, written and viewed from inside its card, bookmark
cards, sticky notes, a highlighter, video and moving GIFs, frames that nest
and turn, bold, italic and links in ordinary text, a Layers panel, a strip
of sheets along the bottom, pictures through the world's library, the theme
followed while open, and boards in every export. Detail and the scoping it
was built with are in `docs/shipped.md`; what binds the code is in
`docs/handoff.md` § Boards.

**Phase 31 (Embedded Players) shipped 2026-09-21**, three steps in three
PRs: a YouTube, YouTube Music, Spotify or SoundCloud link plays in the page
and in the sidebar, each looking like it belongs; a player draws whole with
the internet off; and players come in from LegendKeeper's file and go out
with every export. It reversed a line this file held for two months, on the
condition she set when she lifted it. Detail and the scoping it was built
with are in `docs/shipped.md`; what binds the code is in `docs/handoff.md`
§ Players.

**Phases 33–46 are scoped, below** (2026-10-13), turned out of `docs/ideas.md`
when the plan had run dry. After them come the deferred phases (Cloud Sync and
Split Panes) and Queued Adjustments.

Two things Phase 12 left behind are in Queued Adjustments rather than here: the
About dialog and the app's default typefaces. Neither blocks anything.

---

## Phases 33–46 — scoped from `docs/ideas.md`, 2026-10-13

Added together on 2026-10-13, when the plan had run out of scoped phases: she asked for the parked ideas to become phases. **The order is hers**: page panels first, then the three map phases, then the rest. Each section below is a first scoping and says where its detail lives. **As with 15, 16 and 17, each one gets a scoping pass in a docs PR before it is built**, and anything marked open is asked rather than guessed.

**Two automation items here are settings, off until she switches them on** — *Create & Link* and *unlinked mentions* (Phases 37 and 38). Her answer on 2026-10-13, and the same rule as auto-link marking: they sit close to the app having opinions about her prose, which she refused in August (`ideas.md` → *Relationships that write their own other half*, the last paragraph), so they are offered and never on by default.

---

## Phase 33 — Page Panels

**Source:** `ideas.md` → *Interactive atlas / maps*, the *Page panels* and *Two ways to peek* paragraphs. First because boards get it straight away and maps need it.

- A page panel can be **docked** (the board View panel as it is today) **or floating** — a window dragged by its header and resized from its edges, several open at once, with a pin that keeps one open (clicking into its writing pins it) and the scroll position it was left at.
- The panel's header carries **Float**, **Dock**, **Open** (go to the page) and a close. LK's pop-out only navigates, which is the half she found inconvenient.
- **The first panel opens docked; after that, a new panel opens the way the last one was left.**
- Wherever a page panel opens — boards now, maps in Phase 34.
- **Right-click a mention to peek** at its page in a panel, and **a hover preview inside a hover preview** (`ideas.md` → *What LegendKeeper has that we don't*).

**Settled:** all of the above (2026-10-03). **Open:** none yet.

---

## Phase 34 — Maps: The Map Itself

**Source:** `ideas.md` → *Interactive atlas / maps*. Build our own, Anamnesis stays MIT; Atlas VTT is a reference, not code to copy.

- **A map page**: a picture as its body, panned and zoomed, with reset view, centre map and fullscreen. Large pictures served as tiles — LK takes 14,000 px and 100 MB; one GPU texture tops out near 8,192 px.
- **Pins**: Large, Small, Icon and Image kinds; colour row plus a custom colour; eight shapes; an icon; Display (always / on hover / never); a link that is optional. Standalone pins that can sync their name, icon and style from the page they link to; a page's own default pin look.
- **Nested maps**: a pin linked to a map page. In the panel it shows the map small with **Go to Map**; holding Shift shows only pins that lead to other maps. **The board View panel's refusal to show a canvas has to go for maps** (`BoardViewPanel.tsx`) — LK does show a map inside a panel over a map.
- **Peek**: click a pin for the full panel (Phase 33), hold Ctrl and hover for a quick card.
- **The pin list** down the side, with fly-to and a filter by name and tag; drag a page from the sidebar onto the map to pin it; double-click a pin to open its page; a selected pin is the only one that drags.
- **Her LK maps**, if her `.lk` export carries any — checked first, and the importer reads `iconShape` / `iconColor` as the page's default pin look.

**Open:** the engine (Leaflet with a custom CRS, or PixiJS as Atlas uses), decided in this phase's scoping, not before.

---

## Phase 35 — Maps: Drawing the World

**Source:** `ideas.md` → *Interactive atlas / maps*, *What a map holds* and the map-changelog list.

- **Paths** (width, curviness, solid / dashed / dotted, opacity, labels that follow the path and appear by zoom), **regions** (fill, stroke, label) and **labels** (size, face, outline, text and stroke colour), each with a link, Display and zoom visibility.
- The right-click radial menu (Pin / Path / Region / Label) and the bottom toolbar with its ⋮ switches.
- **Zoom visibility** on every object; **groups** that nest and can be hidden or soloed; pin **clustering** that follows the groups; auto-nest pins in regions.
- Ctrl snapping to paths and regions, and **border-borrowing** so two regions share an edge exactly.
- Box-select to restyle many at once, tool lock, Ctrl+D, undo and redo; style a tool before dropping anything.
- **Hidden** fades an object for the editor; if a player screen ever exists, it means absent for players (`ideas.md` → *Battle maps*).

---

## Phase 36 — Maps: Distances & Journeys

**Source:** `ideas.md` → *Interactive atlas / maps*, *Measuring, calibration and navigation*.

- **Calibrate** by drawing a line and typing its real distance; then the ruler, a scale bar, a region's area and perimeter, and a path's length.
- **Navigation mode**: a route along named paths between pins, listed turn by turn in a side panel with S and E markers, and a travel speed that turns distance into time. Measuring and navigation keep working on a read-only map.
- **A map block** for the writing and the sidebar that centres on the host page's pin.
- **Maps leave with the world**: the Markdown and site exports carry a picture of a map, the site a working one if it can, and the LK export says what it can't take.

---

## Phase 37 — Writing Toolkit

**Source:** `ideas.md` → *What LegendKeeper has that we don't*, *Writing*.

- **Tables**: header rows and columns, cell colours, merged cells (BlockNote appears to have switches for these — confirm first), banded and transparent styles, and a **Random** button that highlights a row.
- Line-start shortcuts: `!!` callout, `>>` toggle, `??` secret.
- **Create & Link** and **Cut** from a selection — **a setting, off by default**.
- Drag a page from the sidebar into the writing to drop a mention.
- Change a link's text after it exists, and `@Castle(spooky castle)`; *the @The Castle* folds to *the Castle*.
- **Focus mode** (both side panels away) and a key that toggles both sidebars.
- Lock a page; new sub-pages take their parent's icon; clear a page's content.
- **Version history that shows what changed**, and an **automatic contents rail** on long pages.

---

## Phase 38 — Finding & Linking

**Source:** `ideas.md` → *What LegendKeeper has that we don't*, and *How bot creators actually organise*.

- **Accent-insensitive search and matching** — *Espana* finds *España*.
- Tell auto-link to ignore a page.
- **Unlinked mentions** in Backlinks — **a setting, off by default**.
- **Telling same-named pages apart** in the `@` menu, the wikilink picker and Ctrl-K: her world already has many Sampos and many Valeras.

**Open:** what tells two Sampos apart in a list — the path, the template, the portrait, a colour — is the design work, asked before building.

---

## Phase 39 — Link Colours & LK Icons

**Source:** `ideas.md` → *Links wearing the colour of the page they point at* and *Icons you choose yourself — the LK import half*. What was left of an "Icons & Colours" phase once the sidebar's colour shipped (Settings → Sidebar, 2026-10-13) and per-page icons turned out to exist already.

- **A link takes its target's effective colour** — its own or the nearest coloured page or folder above it — and keeps today's look when there is none. **Any one link can be recoloured by hand** from its right-click menu, with a *Follow Page* entry that puts it back on the cascade. Settled 2026-10-13.
- **LK icons on import**: a Font Awesome to Lucide name map for `iconGlyph`, partial by nature — a glyph that doesn't map keeps the template's icon. Worth doing before Valeraverse is re-imported.

---

## Phase 40 — Sidebar Groups

**Source:** `ideas.md` → *Collapsible group headers in the sidebar (GitBook-style)*. The shape was settled 2026-08-11 and waited for universes, which shipped in Phase 22: a group is a top-level label with pages under it, collapsing as a unit, made by hand, never inside another group, and a flag on a node rather than a new storage shape.

---

## Phase 41 — Picture Library

**Source:** `ideas.md` → *The picture library — what LK has that we don't*, *What LegendKeeper has that we don't* → *Pictures*, and `plan.md` → Queued Adjustments → LK's picture controls.

- **Nested folders** with a breadcrumb, and a **full-window library** opened from the Assets tab (her call, 2026-08-18) that holds fifty folders comfortably.
- LK's controls on a picture in a page — the hover buttons and the block menu — moved here from Queued Adjustments when this phase is scoped.
- **Background removal**, offline, and **text wrapping round a cut-out picture's outline**.
- **Unsplash and Pinterest** in the library — open again since the network rule was retired.

---

## Phase 42 — Image Gallery

**Source:** `ideas.md` → *Image gallery — a page of pictures that can be taken back out*. Mostly settled with her on 2026-08-31: a page type whose tiles are pictures, uniform and never cropped, taken back out at original quality. Its two open questions are in that entry.

---

## Phase 43 — Two-Way Relationships

**Source:** `ideas.md` → *Relationships that write their own other half*. Put Damien in Valera's Friends and the app offers to put Valera in Damien's. The design work is the pairing table (symmetric and directed pairs, and fields that pair with nothing); offered and switched on, never silent.

---

## Phase 44 — Word & Google Docs Import

**Source:** `ideas.md` → *Import Word and Google Docs, formatting intact*, and the four anti-goals in *Import and paste fidelity*. `.docx` through `mammoth` into the HTML importer, `.odt` as the fallback; nothing invented, empty paragraphs kept, characters untouched, and the round trip as the test.

---

## Phase 45 — Export to AO3

**Source:** `ideas.md` → *Export to AO3*. AO3's tag whitelist as the target, everything that doesn't fit listed before the export runs, pictures named as the thing that can't come.

**Open:** what a work is — one page, or a storyline as chapters — settled before building.

---

## Phase 46 — Small Comforts

**Source:** `ideas.md` → *What LegendKeeper has that we don't*, *Everything else*, and *Code blocks — the half that's left*.

- **Name generators** — taverns, gods, ships, spells and the rest.
- **Emoji that look the same on every system.**
- **Turn off features you don't use.**
- **Drag tags into the order you want.**
- **Making blocks discoverable** to someone who doesn't know the shortcuts — one answer for all of them, not a button bolted onto one.

---

## Phase 2 — Cloud Sync (Deferred)

Only if the shared-folder sync approach demonstrably stops working. Options in preference order: Supabase (hosted Postgres + auth), Yjs + y-webrtc (P2P CRDT), self-hosted sync server.

Do not scaffold in earlier phases. The file-per-node data model already sets us up well for any of these.

---

## Phase 21.5 — Split Panes (Deferred)

**Deferred 2026-09-04 by the user, the same day it was designed.** Pulled out of Phase 21 rather than dropped — it was the piece that made that phase a rewrite, and without it the rail and the title bar are two small visible things she can have soon. The fractional number says where it came from and where it returns to.

**It is hers, and the record used to suggest otherwise.** It went into the plan on 2026-07-31, scoped from LK screenshots and carrying no attribution, while the title bar filed beside it names her outright — which made this read as a parity item nobody asked for. It is not. She placed it as Obsidian's and confirmed it there with Obsidian's own split command before any of this was written down. LK has no splits at all, so the parity reading was wrong twice over.

**What it is** — open to the right, open in new tab, open in new window, split right, split down.

**A pane here is a whole page, and that is the difference from Obsidian.** Settled with the user 2026-09-04. Obsidian can let its right sidebar follow whichever pane has focus because what sits in it — backlinks, an outline — costs nothing to lose. Ours is the page itself: the portrait, the properties, the meters. Her point, and it is the one that decides the design — borrowing Obsidian's answer only works while the thing being swapped is disposable, and here it is not.

**The right bar follows the focused pane even so, and that is her call rather than a concession.** Two panes cannot each carry one: `TREE_MIN_WIDTH` 180, plus twice `CENTER_MIN_WIDTH` 420, plus twice `PROPERTIES_MIN_WIDTH` 220, is about 1460px against a window that opens at 1280 and may be dragged down to 900. One right bar pointing at one pane is the only arrangement that survives a small window, and it leaves the three-column layout alone — the panel does not move, it changes what it is describing.

**Two rules keep that from reading as broken, and both are load-bearing.** **Focus has to be sticky rather than literal**: editing a meter or a property puts real keyboard focus *into the right bar*, and a panel that swapped on that would change under her hand mid-click. It means the last pane whose page she was in, and it holds there while she works the panel. **And the active pane has to be visibly marked** — a right bar showing a stat block with no way to tell which of two characters it belongs to is worse than an empty one, because it is confidently wrong.

**Splitting puts the cursor in the new pane**, so the right bar points at what was just opened. Obsidian's behaviour, checked by the user 2026-09-04.

**What it costs, which is why it is parked rather than queued.** `AppLayout.tsx` is a fixed three-column grid: tree, one page, properties. This turns the middle into a tree of panes, each with its own tabs and its own history, and that is the rewrite Phase 21 was scheduled late in order to wait for. **Open in new window is a separate problem again** — `project-claim.ts` deliberately refuses to open one project in two windows, which is what stops two copies fighting over the same files, so that item means nothing until the claim is reworked to allow it on purpose.
