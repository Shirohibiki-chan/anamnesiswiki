# Anamnesis — Implementation Plan

---

## Project Overview

Anamnesis is a Tauri v2 desktop app for local-first worldbuilding. React 19 + TypeScript in the renderer, Rust shell handling filesystem access. Data lives as JSON files on disk in a folder the user picks. BlockNote provides the Notion-style block editor. LegendKeeper's `.lk` export format is supported as a first-class import/export path so the user can migrate their existing world.

Work phases top-down. Do not start a phase until the previous one is complete and usable. Each phase should end with the app in a coherent, working state — not mid-refactor. Phases are sized to be reviewable as user-facing changes.

**Position is the running order; the number is only a name.** A phase gets its number when it's written down, so a phase that gets pulled forward keeps its number and moves up the file — Phase 27 sits above Phase 18 for exactly that reason. Read the order off the page, not off the digits, and when something moves, move the section rather than renumbering everything below it.

See `docs/spec.md` for the full spec, `CLAUDE.md` for architecture rules, and `docs/prototype/anamnesis.jsx` for a reference React prototype that demonstrates layout and tree behavior (its template content is filler — the real copy lives in `src/services/template-registry.ts`).

---

## Future Features

Parked in [ideas.md](ideas.md), so this file stays focused on active work.

---

## Queued Adjustments

- **The colour dot on every tree row is in the wrong place, and the folder
  colour feature wants an overhaul.** Both flagged by the user 2026-08-18, with
  a screenshot; she said plainly she'd deal with the overhaul later, so this is
  a marker, not a brief. What's known: the circle sitting between a row's name
  and its ⋯ menu (`tree-row-color-dot`, `TreeItem.tsx`) is unwanted *there* —
  that's placement, not the ability to colour a page. **The overhaul itself is
  undesigned and must be asked about rather than guessed at**, the same rule the
  search scope controls carry below. Don't quietly move the dot into the ⋯ menu
  as a fix; that's a design decision wearing a tidy-up's clothes, and it's hers.
  Related: icons you choose yourself, in `docs/ideas.md`.

- **Find out what our own copy and paste actually does, before building any
  importer on top of it.** Raised 2026-08-12 by what botmakers said about the
  tool they're leaving (see `docs/ideas.md` → Import and paste fidelity): the
  formatting complaints were as much about pasting in and out as about file
  import, and paste is a code path nothing here has ever looked at. BlockNote
  handles the clipboard itself.

  This is a measurement, not a build, and it's cheap: paste a spaced document
  in from Google Docs, from Word, and from a plain text editor, and check
  whether blank lines survive and whether any heading or bold appears that
  wasn't there. Then copy a page *out* into a plain textarea and see what comes
  with it. **Write the answer down either way** — if it's already right, that's
  a baseline the importer must not regress; if it's wrong, it's a bug we ship
  today and don't know about, and it makes the whole import feature moot until
  fixed.

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

- **The About dialog never got built.** The other half of a Phase 12 bullet
  whose first half shipped as Settings → Patch Notes on 2026-08-08. Small and
  self-contained — version, licence, the fonts' licences, a link to the repo.
  Left here rather than folded into a phase because it belongs to none of them.

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

- **Valeraverse needs re-importing once, and hasn't been.** Two import changes
  landed after her copy was brought in: the project home arriving as a real page,
  and each picture remembering the LK address it came from (without which export
  can't send pictures back). Both apply at import time only, so her existing
  project has neither. One re-import picks up both — worth doing in a single
  pass rather than twice.

---

## Known Bugs

- **The AppImage won't start on some older Linux systems.** Reported 2026-08-09
  from the first install by someone who isn't the user: it ran on his new
  laptop and failed on an older Fedora one. His diagnosis, verbatim — *"the GTK
  libraries the ones bundled in the appimage were failing to talk to EGL and I
  had to use the system's own libwayland-client myself."* He got it running; a
  person installing the app could not have.

  **This is the standard AppImage bundling mistake and it has a known shape.**
  Graphics and display libraries — `libwayland-client`, `libEGL`, `libGL`,
  `libgbm`, `libdrm`, driver shims — are bound to the host's kernel and GPU
  stack and must come *from the host*, never from the bundle. AppImage's own
  project publishes an excludelist saying exactly this, and `linuxdeploy`
  honours it; Tauri's bundler copies webkit2gtk's dependency tree without
  consulting it, which is how the wrong `libwayland-client` ends up inside.
  The build is on `ubuntu-22.04` (`.github/workflows/release.yml`), so the
  bundled copies are Ubuntu 22.04's — newer than what an older Fedora carries,
  which is why the new laptop was fine and the old one wasn't.

  **Don't fix this blind.** The fix is to stop bundling those libraries, and
  the way to know it worked is a machine that reproduces the failure — this
  repo has none, and CI runs the same Ubuntu that produces the bad bundle. Ask
  him to confirm the exact library and error before changing the workflow;
  guessing produces an AppImage that's differently broken on a machine nobody
  here can boot. The `.deb` is unaffected, since it resolves against the
  system's own packages, and is the better thing to point Fedora/RPM users at
  in the meantime (or `.rpm`, which `targets: "all"` already builds).

---

## Shipped

Phases 0–15 are complete. **`docs/shipped.md`** has what each one delivered;
`CHANGELOG.md` has the same story in plain language. **Phase 1.5 (Publish) is
the only unstarted phase behind us** — it's unblocked and unscheduled, below.

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

Project home — the last Queued Adjustment standing before Phase 9 — shipped
2026-07-31.

**Phase 10 closed 2026-07-31** when the signing key went into the repository's
Actions secrets, which was the one step nothing in the repo was allowed to do.
Search, keyboard shortcuts, rebinding, tabbed Settings, sidebar undo/redo and
automated four-platform releases all landed that day. Two things it deliberately
left behind: undo for the right-hand panel, now **Phase 19**, and the
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

## Phase 1.5 — Publish

**Unblocked as of 2026-07-31** — Phase 10 was the thing in front of it.

`PublishModal.tsx` with checkbox tree of what to publish, "include hidden tabs?" toggle (default off), tag filter, output folder picker. Hidden pages are excluded outright rather than offered as a toggle — see below.

`src/services/publisher.ts` — static site generator. Renders each node as an HTML page, preserves tree navigation as a sidebar, respects hidden tabs and Secret blocks. **Hidden *pages* are the other half of that and are not optional**: `Node.hidden` shipped 2026-08-10 with nothing yet consuming it, and a publisher that ignores it puts the pages she marked private on a website. It cascades — a hidden page takes everything under it (see `tree-service.ts`'s `isHiddenByAncestor`), so filtering the roots is enough and walking each descendant is not. Bundles a Fuse.js search index as JSON for client-side search on the published site. Same visual style as the app (dark theme, callouts, references as clickable links).

User then hosts the output folder anywhere free (Cloudflare Pages / Netlify / GitHub Pages). Re-publish overwrites.

**End state:** user can share Valeraverse with Nitwit read-only, and Orynthia with the world when it's ready, without any account or backend.

**Not scheduled against Phases 11+ below.** It can land whenever the user wants it; nothing after it depends on it. Its one live argument for going sooner is that it's the existing answer to "people won't install an unknown `.exe`" — see `docs/ideas.md` → Browser version.

---

# Phases 11+ — planned 2026-07-31

Everything below comes out of one planning session: the user brought a list of roughly thirty wants plus screenshots of LegendKeeper's current UI, and the answers to nine scoping questions are baked into the phases rather than left as open questions. Where a phase records a decision, the decision is hers and doesn't need re-litigating.

**Two framing decisions that shape the ordering:**

1. **The "UI overhaul" is two jobs, not one.** The *look* (colour, type, spacing, icons, naming) is CSS tokens and is cheap — done early, everything built afterwards is born looking like Anamnesis. The *layout* (left rail, splittable columns, tabs) rewrites the app shell and touches components that don't exist yet — done early it gets done twice. Hence Phases 11–12 up front and Phase 21 near the end.

2. **The identity pass is deliberately made reversible before it's attempted.** The user's stated blocker was being "extremely picky" with no fixed idea yet. The answer is to ship the theme switcher *first*, so a visual direction becomes a file that can be tried and deleted rather than a one-shot commitment, and then to present complete running directions to react to instead of asking for a design from a blank page. If a future session finds itself asking her to describe what she wants in the abstract, it has taken a wrong turn.

---

**Phases 11, 11.5, 12, 13, 14, 15, 16 and 17 are done** — the identity pass,
the design system beneath it, themes, property types, everyday navigation, the
right-click menu's full pass, pictures and tags, and the Templates and Assets
tabs. Their detail is in `docs/shipped.md`; what still binds the code is in
`docs/handoff.md`. **Phase 27 is next**, by her call — see below.

Two things Phase 12 left behind are in Queued Adjustments rather than here: the
About dialog and the app's default typefaces. Neither blocks anything.

---

## Phase 27 — The World Library

Raised 2026-08-14, from her opening the app and finding the start screen
remembers eight worlds and offers Explorer for the ninth. Everything here is
one screen and the identity that screen needs to work.

**This is the next thing built** — she wants the start screen done promptly
(her call, 2026-08-14), so it sits here, directly after the phase in flight,
rather than at the bottom where it was written. It keeps the number 27 because
the number is a name, not a position; see the note in Project Overview.

### Worlds get an id

`project.json` has `version`, `name`, `rootOrder`, `homeNodeId` — no id. A
world's only identity is its folder path, so everything that refers to one
breaks when it moves or is renamed. That is already biting: the recent list is
a list of paths, and the folder reorganisation below moves every world.

A random id in `project.json`, generated on create and backfilled the first
time an existing world is opened. Pins, groups, archive state and the recent
list all key on it. **In the project file rather than app settings** (her call,
2026-08-14) so it travels with the world — which is what leaves the door open
for links that reach across worlds later. Pages already have ids; this supplies
the missing half of the address.

**Copies get a fresh id, never a derived one.** A duplicated world (she keeps
`Valeraverse` and `Valeraverse3`) would otherwise claim to be the world it was
copied from. Appending a suffix was considered and rejected: the filename
collision suffixes already in `filesystem-service.ts` are recomputed from
creation order on every resolve, so siblings renumber each other — harmless for
a filename, fatal for an id, because a renumber breaks every reference. The
lineage her question was actually after lives in its own field: the copy
records which world it came from, so identity stays meaningless and "this is a
fork of that" stays real data.

**The duplicate-id rule doubles as the fork detector.** Two worlds wearing the
same id is not an error, it is evidence one was copied from the other:
most-recently-modified keeps the id, the other is re-idded *and records the
first as its parent*. This matters because her forking is done in File
Explorer, not in the app — shown 2026-08-14 — so lineage recorded only on an
in-app duplicate would miss the way she actually works. A world copied in
Explorer gets correct lineage the next time the folder is scanned, with no
change to her habit.

**Forking a whole world is a workflow, not an edge case.** Demonstrated
2026-08-14 with her CharSnap bot documents: duplicate the whole thing, work in
the copy, keep the previous one in case the changes turn out wrong. The naming
in that document is what a lineage field exists to replace — `Copy of Copy of
Copy of Template`, `Copy of Val v5` ordered above `Val v6`, the actual
descent recorded nowhere but her memory.

Worth adding alongside: a **duplicate-world action** on this screen, so the
fork can happen in the app rather than in Explorer, and worlds can show what
they were forked from.

**Newest at the top, and no tidying required** (her call, 2026-08-14). Her
document tabs run oldest-first and she has never reorganised them because
reorganising is work — which is the whole lesson. Any ordering that depends on
upkeep will be wrong within a month. The default sort puts the newest first
and a fresh fork lands above what it was forked from; manual arrangement, if it
ever exists, is an option on top of a default that is already correct, never
the thing holding it together.

**Not the same thing as Phase 19.** Safety Net is per-file snapshots — restore
a page to how it was an hour ago, automatic, invisible until needed. Forking is
deliberate, whole-world, and both sides stay open and readable indefinitely.
Neither substitutes for the other; don't let them merge into one item.

### The projects folder gets read

Nothing has ever looked inside it. `getProjectsDir` is used to decide where new
worlds are *put*, to site `themes/` and `snippets/`, and as an import
destination — never to find a world. Combined with `RECENT_PROJECTS_COUNT = 8`,
a ninth world is unreachable except through the folder picker.

Scan it. A world is any directory containing `project.json` — the same check
`loadProject` already makes. Recent stops being a whitelist and becomes a sort
order; the cap disappears rather than being raised. **Two levels deep**, so a
world nested one further down still appears (hers currently sit at mixed
depths, e.g. `TEStval/Valeraverse`).

Worlds opened from outside the projects folder are remembered as now and shown
**in the same list, marked** rather than in a section of their own (Q11,
delegated to me 2026-08-14). A separate section makes the split the screen's
main organising idea, when the split is a fact about where a folder happens to
sit and nothing she thinks about. One list keeps the default sort meaningful
and keeps groups as the thing that organises; the marker is there for the
moment it matters, which is when a world has gone missing and the answer is
that its drive isn't plugged in.

### Opening a folder gets forgiving

Her call, 2026-08-14. Unzipping commonly produces `Valeraverse/Valeraverse/`,
and "Open folder" currently reports no project in the outer one, which is
correct and useless. When the chosen folder has no `project.json`, look one
level in: exactly one world below it opens directly, several says so and lets
her pick. This matters more as worlds and templates get handed to other people.

### Organising, without touching the disk

All of it, per her 2026-08-14 call: filter, pin, archive, groups.

**Groups are in the app, not folders on disk.** Real folders were considered
and rejected by her, correctly: worlds already sit at mixed depths, group
directories would add another level for the scan to disambiguate, and
organising would mean leaving for File Explorer. Group membership is app state
keyed on the world id, so it survives a world being moved or renamed.

Pin floats a world up; archive folds one away without deleting it. Neither is a
location, so both compose with groups rather than competing.

**Nothing truncates.** A "4 more…" link is the same failure as the eight-world
cap in better clothes. The list shows everything and the page scrolls; the
filter box is the answer at scale, not a fold.

**Pages or one long scroll is hers to choose, and pagination is the default**
— her call, 2026-08-18, in the strongest terms she has used about an
interaction so far. This does not contradict the paragraph above: a fold hides
projects behind a "4 more…" link and a page does not. Everything is still
reachable either way; the question is only whether the grid ends at a page
boundary or keeps going.

**It shipped in Settings → Lists rather than in appearance** (2026-08-18). The
reasoning for having a switch at all is the muted-covers reasoning — taste gets
a setting, not a compromise everybody lives with — but this one is about how a
list behaves rather than how it looks, and it governs the pictures as well as
this screen (her call: they are the grids she is in far more often). A
behaviour setting filed under appearance is a setting nobody finds twice.
Default is pages. Both picture grids — the sidebar's Assets tab and the
picker — read it as of 2026-08-18.

**The pinned row keeps its own pagination regardless.** That one is not a
preference: a scrolling row cannot land on a page boundary, so its last page
repeats cards and its dots lie about where you are. The switch governs the
all-projects grid below it.

**Groups can land after the first cut** (her call, 2026-08-14: not as important,
unless it's cheap). It is cheap, but only in the right order — group membership
is app state keyed on the world id, so the ids and the folder scan have to exist
first, and once they do the whole feature is a row of chips above the grid that
filters it plus a group field in the manage window. Ship the screen without
groups if that's what gets it out sooner; don't design the grid in a way that
can't grow a chip row.

### The screen itself

`docs/ui-audit.md` Part 3 has carried "the start screen's unaligned box stack
and missing primary action" since Parts 1 and 2 were finished, and
`shell.css` admits in a comment that its three actions are identical with no
primary among them. This is that item, finally scheduled.

**Settled 2026-08-14** (Q8 closed) after five rounds of mockups on the app's own
palette and fonts. Three exploratory directions were rejected outright; what
follows is what she picked, and the reasons are recorded because most of them
are rules, not preferences.

**Layout.** A main column with a rail down the right-hand side, flush to the
edge with its own panel background and dividing line.

- **Pinned worlds across the top**, as tall cover cards. These are the one
  uncontained thing on the screen: no box, the picture dissolving upward into
  the background, its border running up the sides and fading with it, and a
  single rule under the name in the world's own colours. Everything else on the
  screen sits in a box, and this deliberately doesn't.
- **Real pagination, four to a page** — not a scroller. A scrolling row cannot
  land on a page boundary, so its last page repeats cards you have already seen
  and its dots lie about where you are. Her words for the app that does this to
  her: she keeps exactly four favourites *because* of it. Pages hold whole
  cards, the last page is short rather than overlapping, and it crossfades.
  Chevrons sit on a soft radial glow, never a rectangular scrim — a rectangle
  over artwork shows its own top and bottom edges and you end up looking at the
  box. Page dots are ~26×20 hit targets, not 5px specks.
- **All worlds below** as a bordered cover grid, newest first, with a **grid /
  list toggle** beside the sort control (her call, 2026-08-14, after LegendKeeper's
  — which offers the same pair). List view is one row per world: thumbnail,
  name, when it was last edited. It is the view that scales — thirty worlds as
  covers is a wall, thirty as rows is a list you can read — and it's also the
  honest view for anyone who never sets a cover. Remember the choice; it's a
  preference about how she reads, like the panel widths.
- **The rail carries the lists**: recently opened (three), then the ways in
  (template / folder on disk / import), then New Releases. A list of text
  floating between two grids of pictures looked out of place and was moved here;
  lists belong in the rail. **The ways in outrank release notes** (her call):
  patch notes are not as important as the ways into the app.

  That section was called **Start Something** and is now **Add a Project** (her,
  2026-08-18: it named a mood rather than an errand). The rename is not just
  wording — it also describes what is under it, which today is two entries and
  not three: the template entry has never been built.
- **New world is centred on its own line**, brand left, filter right. It is the
  only bright control on the screen, which answers Q9 without needing a rule.
- **Release notes are three entries, each named by its version**, newest marked.
  One unnamed "what's new" link reads as a single page; three unlabelled
  features read as three pages that don't exist.

**Cover images are load-bearing, not decoration.** This is the one thing the
direction costs: worlds need somewhere to store a cover and a way to set one.
The picture library from 0.3.0 does most of the work already.

**Worlds without a cover get a generated one**, keyed off the id so it is the
same every time. It must be a *real* gradient — at least two distinct hues,
travelling diagonally. One hue with a lighter version of itself over it was
tried and rejected in the strongest available terms. These are deliberately
vibrant; that is the point and it is not up for softening.

**"Muted covers" belongs in appearance settings.** Raised by her as a joke and
kept because it is correct: bright colour is a taste question, and the answer to
a taste question is a setting, not a compromise everybody lives with. One switch
desaturating every cover, off by default, and on automatically for anyone whose
system asks for higher contrast. The accessibility issue is text legibility on
covers, which the scrim under every name already handles — not saturation.

**Shipped 2026-08-19, in Settings → Theme rather than Settings → Lists.** The
distinction the pagination switch drew ("that one is about how a list behaves
rather than how it looks") cuts the other way here — this is entirely about
how covers look, so it sits with Theme/Colours/Fonts/Snippets, not with the
Lists panel that governs pagination and view mode. One boolean, `mutedCovers`,
alongside `theme-store.ts`'s other appearance state, and applied the same way
`applyThemeId`/`applyTextScale` are: a plain setter in `theme-service.ts`
(`applyMutedCovers`) that toggles `[data-muted-covers]` on the document, with
one CSS rule in `start.css` reading it against every place a cover renders —
the grid, the pinned row, the rail's Recently Opened chip, and both spots
inside Manage pins. `grayscale()` alone flattened every cover to the same
lightness; `grayscale(70%) saturate(60%)` keeps enough of the original apart
that two covers still read as two colours, just quiet ones.

**"On automatically for anyone whose system asks for higher contrast" is a
real default to recompute, not a fixed `false`.** `defaultMutedCovers()`
reads `prefers-contrast: more` and is called three places that all mean "the
value nobody has chosen yet": the store's initial state (synchronously — no
settings file has to be read to answer a media query, unlike every other
appearance field), `loadAppearance` when nothing was saved, and "Put
everything back to default", which now resets this alongside theme/fonts/
size/snippets rather than leaving it out of its own reset.

**Section headings are headings.** Badges were tried and are too small to do a
heading's job. Title Case, the display face, ~20px; controls beside them
(Manage pins, Newest first) are pills so they read as pressable.

**Rearranging pins happens in a window, not by dragging the row.** A 150px card
that can scroll out from under the cursor is the worst possible drag target. The
manage window is full-width rows with a grip and a position, and every unpinned
world underneath as covers, so pinning and reordering are one trip. The row
itself carries a permanent dashed "Pin a world" tile — the section stays visible
when nothing is pinned, because a feature that only appears once you know about
it is invisible.

**Borders over artwork are light at low opacity, never flat grey.** Grey next to
a saturated cover goes muddy.

Two things the mocks added that are missing today: the screen names the page you
were last on, not just the world — the app already stores enough to say it — and
it surfaces what changed in the release, which currently ships inside the app
but has to be gone looking for.

The mock lives at `docs/mockups/start-screen.html` for reference while this is
built. Read its labels as saying "project" — it was drawn before the naming
pass and still says "world" on the buttons.

**Built so far (2026-08-18):** the two-column shell, brand and version, the one
centred New Project button, the filter box, the all-projects cover grid with
generated covers and the grid/list toggle, the pages/scroll switch, and the
rail carrying Recently Opened, Add a Project and the cog. Section headings are
Title Case in the display face at 20px, which is a new step in the type scale
rather than the nearest existing one — see `--fs-2xl` in `index.css`.

**The sort control landed 2026-08-19**, as a pill beside the view toggle
holding four orders: newest first, oldest first, and the name both ways. The
mock draws one pill reading "Newest first" and does not say what is inside it;
four is what the data can honestly support — `activeAt` and the name are the
only two things every project has, and each reads in both directions. A
separate "recently opened" was considered and left out because the rail already
carries that list, and an order that duplicates a list three feet away is a
second answer to a question already answered.

**The pinned row and its manage window landed 2026-08-19.** Pins are app
settings rather than project files — which projects sit at the top of *this*
screen is a fact about how she works here, not about the project, and one
handed to someone else has no business arriving pre-pinned.

**A pin is a record, not a bare id, and that is a deliberate softening of "pins
key on the id".** Ids are minted when a project is *opened*, so a project the
scan found and she has never opened has none — and those are exactly the
projects the library was built to surface. A pin therefore stores the id, the
path and the name: the id decides when both sides have one, the path answers
when they do not, and the pin picks up the id the first time the project is
opened. The same fallback `coverFor` already makes, for the same reason.

**The row's column count is measured, and it took shipping the constant to see
why.** A pinned card is a fraction of the row rather than a size of its own, so
the column count is the input to the width rather than the answer to it — which
read like there was nothing to measure, and four across was written down. Four
is only right at about 1280: fullscreen on a 2560 monitor made 565-wide bands
against a card drawn at 245, and the app's minimum window made 150-wide cards
against a fixed 208 height, taller than they are wide. The count is now chosen
to land the card near 245 and the row shares out the remainder, and the card
carries a ratio rather than a height so `cover` always crops a picture the same
way instead of taking the sides off it on one window and the top off it on
another. Two across is the floor. The dashed tile still takes one slot on
whichever page it lands on.

**A row is two lines, and that is what lets the list have columns.** It shipped
as one row across the full width with the name at one end and the date at the
other — readable at about the window the app opens at and nothing else, since
full screen on a 2560 monitor put roughly 2000 pixels between the two. Putting
the location *under* the name (her call, 2026-08-19) is what fixes it rather
than decorating it: the top line is then only a name and a date, so a row can be
narrow, so the list can lay out two, three or four columns of rows instead of
stretching one. A wide single-line row would put the gap straight back however
the middle were filled.

**The date is a fixed track, not `auto`.** An `auto` column is as wide as its
own row's text, so "just now" and "22 hours ago" hand their rows different
column widths and the name beside them starts in a different place on every line
— measured at 355, 361 and 370 for three rows in one column before it was
fixed.

**The Elsewhere flag rides on the location line rather than in a corner.** It
briefly had a column held open for it whether or not it was used — the same
alignment argument as the date — and that column was what kept the date from
reaching the right-hand edge, which is what she saw. Putting it at the front of
the path is the version with no reserved width, and it is also where it belongs:
the flag and the path are the same fact about the same project, and on a cover
it no longer sits over the artwork.

**The rail drags, on the shell's own handle rather than a second mechanism**
(her call, 2026-08-19). It was written as a fixed 232 on the reasoning that its
contents are fixed — a project name and a timestamp — which was right about the
contents and wrong about who decides: a long name ellipsises at 232 whatever the
monitor, and how much of a wide window the pictures deserve against the text is
a reading preference like the panel widths, not a fact. `ResizeHandle` already
does the whole gesture — pointer capture, arrow keys, double-click to reset —
and it took a table of three edges rather than a hard-coded pair to take a
third, so nothing was written twice.

The width is stored beside the shell's two in `panelWidths`, and **the reset
split in two doing it**: a double-click resets what the person can see, and the
two screens never share a window, so one reset reaching across and undoing a
width on the other screen was a bug waiting rather than a feature. 200 to 400,
because the floor is where a recent project's line stops working and the ceiling
is set by what it takes from — the app's minimum window is 900 wide, and 400
still leaves the pinned row the two cards across that is its own floor.

**A project's location is split rather than ellipsised.** The last folder is
kept whole and the middle of the path gives way, because an ellipsis eats the
end — and the end is the only part that tells two projects in different folders
apart. The separator sits on the front of the kept half so a clipped path still
reads as a path.

**New Releases landed in the rail, 2026-08-19 — reusing Settings → Patch
Notes's own data rather than a second parser.** The item as written said "baked
in from the changelog at build time", but that's what `RELEASES.md` already is:
a hand-written, per-version, build-bundled file, parsed by
`release-history.ts`'s `recentReleases`, which Patch Notes already calls
through `useReleaseHistory`. `CHANGELOG.md` is dated, not versioned, and often
holds several days of work still short of a tag — it's the wrong shape for
"three entries by version" regardless of where the plan text pointed. Both
surfaces now read `PATCH_NOTES_VERSION_COUNT` (3) off the same list, so raising
the count moves both together instead of drifting apart.

Clicking a row opens Settings straight to Patch Notes, on the version that was
clicked — not just to the panel, to that tab within it (fixed the same day,
after shipping "always the newest tab" first and hearing that clicking an
older version still landed on the newest). `SettingsModal` took an `initialTab`
prop, and `PatchNotes` its own `initialVersion` — special-cased at the one call
site in `SettingsModal` that renders it, rather than widening `PANELS` to a
props-carrying type for the nine panels that have no "initial" anything to
take. Both default to the first tab / newest version, so the cog and the
top-bar button are untouched. The rail's own `openReleaseVersion` state (a
version or null, not a separate boolean plus a version — no way for the two to
disagree about whether the panel is open) renders its own `SettingsModal`
instance directly rather than routing through `SettingsButton`, which only ever
opens to Theme. Two independent instances rather than one shared one — the same
pattern the cog already uses in two other places.

**The projects-folder line landed in the rail's foot, 2026-08-19 — reusing the
themes/snippets "open in file manager" pattern rather than inventing one.**
`showFolder` (`dialog-service.ts`) already existed for exactly this — Settings
→ Appearance points it at `themesDir`/`snippetsDir` and reports a refusal by
naming the folder. `use-start-actions.ts`'s new `openProjectsFolder` follows
the same shape: `prepareProjectsDir()` first (a fresh install's default folder
is a path nothing has created yet, and handing that straight to the file
manager opens a level up with nothing there to explain why — the same reason
`createProject` calls it), then `showFolder`, with a failure landing in the
screen's one shared error line rather than a new surface.

The row shows the folder itself, not paired with a name the way a project's
own location line is — `describeProjectLocation` drops the last segment
because the line above it already names the project; here there's nothing
above it, so `describeFolderLocation` (`app-settings-service.ts`, sharing the
same "keep the last two segments, ellipsis the rest" core) keeps it. The full
path is the title.

**Still to build:** the third entry under Add a Project — start from a
template — which the direction above lists and the rail has never had, and which
needs its own design pass first: it turned into export and import a project
template (her, 2026-08-19), so what a template file holds and what format it is
are open questions rather than build work. Then: covers you set yourself (the
muted-covers switch above already shipped, ahead of it — it doesn't need one
to exist first); the page you were last on; groups and archive; the
duplicate-project action.

### Second instance

Verified 2026-08-14: two copies of the app run side by side, each with a real
window; nothing blocks it. The trap is that both auto-open the last-opened
world, so the default path puts two autosaving copies on the same files.

`StartupRouter.tsx` already falls through to the picker whenever the last world
can't be opened. Extend that: a world already open elsewhere isn't auto-opened,
and the picker shows it as open rather than letting it be chosen. A marker file
in the world's folder naming the holding process, treated as stale when that
process is gone, so a crash doesn't lock her out of her own world. Check it on
every open, not only at startup, or the picker is still a way in.

This is the cheap 80% of Phase 21's "open in new window" and does not replace
it. Worlds genuinely side by side in one window — tabs across worlds, dragging
a page from one to another — remains Phase 21's job and is a rewrite of a
2,300-line store built around there being exactly one world. Both reference
apps she pointed at (LegendKeeper, Obsidian) do the window version, not the tab
version; LegendKeeper gets it free from being a website.

### Folder layout

`themes/` and `snippets/` sit beside the worlds in the projects folder, which
is deliberate — a theme belongs to no single world — but leaves worlds and app
data indistinguishable, and nothing stops a world being named `themes` and
quietly collecting stylesheets.

`Projects/` underneath the projects folder; `themes/` and `snippets/` stay
where they are. **No migrator** (her call, 2026-08-14): worlds open by absolute
path, so moving them by hand costs nothing but re-opening each once, and she
has two real worlds and one other user. Once ids and the scan exist, a moved
world is re-found rather than lost from the recent list. Reserve `themes` and
`snippets` as world names regardless of layout.

---

## Phase 18 — Sidebar Blocks

The big one, and a genuinely new concept: the right panel becomes a second block canvas rather than a fixed list of fields.

Keep the distinction sharp — **properties** are labelled facts (`Age: 26`); **blocks** are arranged widgets (a 75% purple bar called "Hollow Emperor's Influence"). They share a column and nothing else.

- Node gains an ordered block list. **Add, remove and reorder are requirements from the start**, not follow-ups — build the panel as an ordered collection or this gets rewritten.
- Per-block context menu: title / no-title, colour, duplicate, move, remove.
- **Blocks:** Text Box · Tags · Alias · Link Block · Tag Index · Subpage Index · Backlinks · Image.
- **Meters:** Progress Bar · Circle · Semi-circle · Gauge · Token Pool · Rating.
- **Backlinks, Tag Index and Subpage Index are one job underneath** — an index of what points at what. Build that service once; it serves all three blocks and is the same data Phase 24's graphs need.
- **Alias** punches above its weight — alternate names that feed search and `[[wikilinks]]`, so "Val" finds Valera Jiang.
- **No YouTube or Spotify embeds.** The user's reason, 2026-07-31, was aesthetic — LK's are ugly — not the offline policy, which she has never personally agreed with. If embeds come back, that's a policy conversation to have with her, and she'll likely wave it through; ask anyway, because the boundary is still written strict in `CLAUDE.md` at her request.

---

## Phase 19 — Safety Net

Unglamorous and probably the highest-value work in this document. This app has already lost user data once (`docs/handoff.md` §Storage).

- **Version history / snapshots / file recovery.** Local, on disk, in keeping with everything else. **Obsidian's "File Recovery" is the shape to copy**, rather than designing one: automatic periodic snapshots kept on disk, a per-file list of past versions you can browse and restore, and arrow-key navigation through that list (the keyboard part is new in 1.13). Copying a known-good model matters more here than anywhere else in this document, because this is the feature that exists to catch the failure that already happened once (`docs/handoff.md` §Storage) and a half-designed version of it is worse than none — it would be trusted.
- **Undo for the right-hand panel** — carried over from Phase 10, still the one part of the app a mistake can't be taken back in. A dedicated store action per operation, the way `setNodeColor` did it.

---

## Phase 20 — Markdown & Folder Import

**Text & Markdown, Obsidian.md, Folder and Zip are one importer wearing four hats** — read a tree of markdown files, map directories to the tree. Build it once.

**Dragging a folder onto the window is the entry point**, and imports the whole thing with its directory structure preserved. Obsidian added exactly this in 1.13 and it's the right front door for an importer that's already directory-shaped: it skips the file-picker step for the case that matters most, and it's the same code path underneath.

JSON and HTML are separate and lower priority. World Anvil is dropped (see `docs/ideas.md`).

**One Import button, more entries behind it — not a button per format.** Settled 2026-08-18: the errand is "bring my world in", and which program it came out of is a detail of the file, not a decision she should have to make before the picker opens. `pickImportFile` in `dialog-service.ts` already has the shape — a filter list plus an All files fallback — so each new importer adds a filter entry and a branch on what the file turns out to be, the way theme import already works out `.css` from `.json` after the fact. The folder-drag entry point above is the exception and stays separate, because a folder isn't something a file picker returns.

---

## Phase 21 — Shell Rework

The layout half of the overhaul. Late on purpose: it rewrites `AppLayout.tsx` and it should only happen once, after the features it has to arrange actually exist.

- Left rail replacing the top bar, with Project / Templates / Assets moved into it.
- Splittable columns — open to the right, open in new tab, open in new window, split right, split down.

---

## Phase 22 — Universes

Decided 2026-08-08. A universe is a top-level container for one version of the world — Canon, Demonic AU, Merfolk AU, Pokemon AU, Timeswap AU — plus a switcher that says which one you're working in.

**A universe is not a row in the tree.** Confirmed by the user 2026-08-08 and it's the load-bearing decision: you change universe from a *selector*, a separate piece of UI, the way Obsidian's vault switcher sits at the bottom of its sidebar rather than as a folder inside it. Obsidian is the reference she pointed at; match that shape.

The tree then shows one universe at a time, at the root. Today an AU character is `AUs / Demonic AU / Characters / Valera Jiang` — four levels of indent before a name, and the `AUs` folder at the top exists only to hold the other folders. In Demonic AU it becomes `Characters / Valera Jiang`. Two levels gone, nothing deleted, and the `AUs` wrapper stops existing.

**Why not just a folder:** a folder can sit anywhere, nest into anything, and means nothing in particular — which is how it got four deep in the first place. Universes can't nest inside each other, can't be dragged into anything, and never appear as a row you can navigate into by accident. Search, collections, graphs and storylines all scope to whatever the selector says, with an "all universes" setting for when she wants the whole project at once.

**Pages true everywhere live in a Shared universe** — a species, a map, a magic system, a language. Decided 2026-08-08 over the alternative of loose pages at the project root. It's always visible alongside whichever universe is selected, so shared lore is never something you have to go and switch to. Keep it visually distinct in the tree; the one thing that must never be ambiguous is which universe the page you're typing into belongs to.

**Following a link out of the current universe switches to it** rather than refusing to open the page. Blocking would be worse than moving, and silently showing a page from a universe you aren't in is how you edit the wrong Valera.

**Cheap on disk, which is the point.** Each universe stays a directory of its own; the container's JSON just gets a template key marking it a universe. `template-registry.ts` already carries `canHaveChildren` per template, so this is a ninth template plus a root-only rule in the reparent guard (`project-store.ts`) and the drop-target check (`TreePanel.tsx`). Nothing about how a page is read or written changes. Existing projects need a one-time migration that lifts each AU out of the `AUs/` folder and marks it — fold it into the Valeraverse re-import already queued above rather than shipping a separate one-off.

**"Universe" is the word**, chosen 2026-08-08 over "AU": Canon isn't an alternate anything, and one word has to cover both.

**Explicitly not building: base profiles with per-AU overrides.** Proposed and rejected by the user the same day, and worth not re-opening. Overrides only pay off when the variants are mostly identical, and hers diverge on species, appearance, history, relationships and most of the prose — the base profile would be pure indirection. It would also put "am I editing canon or this AU?" in front of every keystroke, and turn a character on disk into a base plus a stack of patches, which cuts against the plain-JSON promise. If cross-universe navigation is ever wanted, the cheap version is a plain "variant of" link between pages, no inheritance.

**Sequenced before the three big views** so Collections, Graphs and Storylines are born universe-aware instead of retrofitted — a storyline in particular belongs to exactly one universe. Staying at 22 rather than moving earlier, per the user leaving the call here 2026-08-08: the selector wants somewhere to live, and Phase 21 is what builds the left rail it belongs in. Putting it before that means placing it twice.

---

## Phase 23 — Collections

A filtered table or gallery view over pages, by template or tag. Cheapest of the "big views" and the most useful day to day, which is why it leads them.

---

## Phase 24 — Graphs

Both, per the user's decision 2026-07-31, and in this order:

1. **Relationship graph, scoped to one page** — who she knows, who she serves, what she owns. This is the one that earns its keep.
2. **Global graph** — a view of the whole project at once. Still second, because the relationship graph is smaller and lands sooner, but **it is meant to be a tool, not a poster.** An earlier draft of this entry wrote it off as the thing people screenshot and never use; the user corrected that 2026-08-08 — she wants somewhere to see the whole project, and she specifically doesn't like how Obsidian's is set up.

Obsidian's graph is the thing to beat, so what's wrong with it is the spec. Five commitments, none of them "make it prettier":

- **Nodes have to look like her tree, not like dots.** Obsidian draws every note as the same grey circle, which throws away the one thing this app knows and Obsidian doesn't: templates. Characters, locations, factions and species carry their sidebar icon and her chosen node colour into the graph. This is the single biggest legibility win available and it's nearly free — `constants/icons.ts` and the colour cascade already exist.
- **The same project has to look the same every time you open it.** Force-directed layouts settle differently on every run, so there's no building a memory of where anything is. Seed the simulation deterministically and remember pinned positions.
- **Scoped by default, not everything at once.** One universe (Phase 22), widened on request. Five AUs rendered together is precisely the hairball that makes people close the tab.
- **Filters are visible controls, not a query syntax.** Filter by template and by tag using Phase 23's Collections filter model rather than inventing a second language for the same job.
- **Clicking a node must not throw the graph away.** It opens a preview beside the graph; going to the page is a deliberate second action.

Both run on the reference index built in Phase 18, so neither starts from nothing. D3-force is the likely library.

**Don't ask her to describe what it should look like** — she's said she's picky and has no visual direction in the abstract. Build it against the five points above and let her react to something running.

---

## Phase 25 — Storylines

Sequence-based narrative trees, asked for 2026-08-08. **This is the app's answer to "what happened next," and it replaces the calendar timeline** rather than sitting beside it — see `docs/ideas.md` → Timeline visualization.

**The distinction that drives the design:** a timeline is date-locked and linear; a storyline is sequence-driven and date-optional. Nodes connect by what leads to what, not by year. Dates are the reason the timeline never got built — a blank the user can't fill and won't guess at stops the writing. Storylines have no such field. Where a date happens to be known it's just another property on the page.

**The view** is a zoomable, pannable, drag-and-drop graph. Each node is a scene or an event; edges run in narrative order. The tree branches for parallel plot threads or alternate viewpoints and reconverges at shared events — so it's a DAG, not a strict tree, and a node can have two parents. Nothing else in the app has that shape; the sidebar tree's model does not fit it.

**Where a node sits is her decision, and the app never overrules it.** Added
2026-08-10. Positions are authored and saved (see Storage below) — a scene goes
where she puts it and stays there. **This rules out inheriting Phase 24's
force-directed layout**, whatever else is shared with it: a force simulation
exists precisely to choose positions for you, and it would spend the session
undoing her arrangement. Phase 24 is right to use one — a relationship graph is
explored, not composed — and that's the difference. What Storylines can take
from Phase 24 is the pan/zoom surface and the edge drawing, not the layout.
Offer a tidy-up as a button she presses, never as behaviour that just happens.

**Loose notes can be dropped anywhere on the canvas.** Asked for 2026-08-10, and
it's the one place a storyline borrows from a whiteboard. Her case is a branch
that stops: a thread ends and the story continues somewhere else, and without
somewhere to say so the reader just finds a dead end. **A note holds links, not
only text** — `continued in [[Demonic AU — Valera's Fall]]` is the whole point,
and it costs nearly nothing because wikilinks already exist and Phase 22 already
decided that following one into another universe switches to it. That turns a
dangling branch into an exit rather than a note-to-self. Notes are annotations,
not nodes: no edges, no page behind them, never counted as part of the sequence.
**Her framing was other people reading it**, which is also the argument for
labelling clusters ("Act 2") — for someone who didn't write the thing, an
unlabelled fork and a fork that stops look identical.

**Every node is also a page.** Opening a node opens a full editor where the whole scene gets written — a storyline is somewhere she writes, not just a map of writing kept elsewhere. Creating a node makes a lightweight page for it by default; pointing a node at an existing page is the other option, and both are first-class, because half the nodes in a real storyline are events that already have pages.

**Storage.** Node pages follow the existing file-per-node model and stay legible on disk. The graph itself — edges, positions, branch structure, and the loose notes — is the new part and wants its own file next to them. Don't scatter edges across the individual pages: a reparent then rewrites two page files, and a failure halfway leaves the graph half-connected.

**Sequenced here because** it wants the reference index from Phase 18 (a scene node should be able to show who's in it), the reworked shell from Phase 21 to host a full-screen canvas, and the pan/zoom and edge rendering from Phase 24 — its *layout*, per the note above, is the one thing not to inherit. It doesn't otherwise depend on Collections or Graphs, so it can be pulled ahead of both if it's what she wants sooner. **A storyline belongs to exactly one universe** (Phase 22) — a fork in reality has its own sequence of events by definition.

---

## Phase 26 — Teach It To Someone Else

Asked for 2026-08-10 and deliberately placed last: a first-run tutorial for
people who open this app without having watched it get built.

**Not for the user.** She knows it. This is for the people she shares a world
with and for anyone who installs a release — the audience Phase 1.5 (Publish)
serves read-only, and the one person outside this project who has already
installed a build and had to debug it himself.

**Last is the right place, not a parking space.** Phase 21 rewrites the app
shell and Phase 22 changes what sits at the root of the tree, so a tutorial
written before either describes an app that no longer exists. A tutorial that
points at the wrong thing is worse than none — someone following it concludes
the app is broken, not the instructions. Wait for the surfaces to stop moving.

**Nothing is designed here yet, on purpose.** Whether it's an interactive
overlay, a sample project that opens on first launch, or a page inside the app
is a decision for whoever picks this up, with her. The one constraint that's
already fixed: whether someone has seen it is a local setting like every other
(`app-settings-service.ts`) — there is no "did they finish onboarding" to
report anywhere, per the policy boundary in `CLAUDE.md`.

---

## Phase 28 — Getting It Back Out

Raised 2026-08-14 against LegendKeeper's export menu, which offers five formats
beside its own: HTML, print, Markdown (file or vault), one big text file, and
JSON. Ours offers `.lk` and nothing else.

**Build the shared walker first.** `lk-export.ts`, Phase 1.5's HTML publish and
the queued AO3 export are already the same job — walk the pages, emit another
format — and this adds three more. The note elsewhere in this plan about
extracting the shared piece by the third one is now overdue at six.

- **HTML** — already Phase 1.5 (Publish). Unchanged by this; noted so the two
  don't get built twice. LK's version carries timelines and map pins, which we
  don't have.
- **Markdown** — a vault of `.md` files mirroring the page tree. **Build it
  with Phase 20's importer, not separately.** Same map read in both directions,
  and it supplies the round-trip test that phase wants: export a world,
  re-import it, compare. Obsidian has no export because a vault *is* a folder
  of markdown, so this is also the Obsidian route in both directions. Our
  `[[wikilinks]]` are already Obsidian's syntax, which is the part that would
  otherwise be painful.
- **One big file** — the same walker, one file instead of many. Small addition
  to the above, not its own item.
- **Print** — the only one that isn't "walk and write". **Verified working
  2026-08-14** (Q3 closed): Ctrl+P in the desktop window opens the system print
  dialog and offers Microsoft Print to PDF. What it prints is the problem — the
  whole interface goes onto the page, tree and side panels included. So this
  isn't a capability question any more, it's a stylesheet: a print stylesheet
  that drops every panel and prints the page body, with the title and nothing
  else as furniture. Cheap, and the closest thing to a PDF export we get free.
- **JSON** — **settled 2026-08-14** (Q2 closed): a zip of the world's folder,
  since the data is already JSON files on disk and re-zipping is honest about
  that. **Label it as JSON in the menu** (her call) — people coming from other
  tools are looking for the word, and "Zip" alone doesn't tell them what's
  inside. Something like "JSON (.zip)" with a line saying it's the world's own
  files.

### Templates as files

Templates already copy a page *and everything nested under it*
(`collectSubtree` in `template-library.ts`), so a template that is a whole
folder skeleton is already the shape Phase 17 built. What's missing is
writing one to a file and reading one back — for handing skeletons to people
who are struggling to set their own up. Themes already work this way, so
there's a pattern to copy.

**Templates carry their pictures** (her call, 2026-08-14, Q4 closed) — in case
people want to share skeletons with images in them. So a template file is a
bundle, not a single JSON document: the subtree plus whichever assets its pages
reference, with the references rewritten to point inside the bundle.

**With a switch to leave them out** (her call, same day), so a skeleton can stay
a small file when the pictures aren't the point. That makes both versions the
same format — a bundle whose asset list may be empty — rather than two file
types, so importing doesn't have to care which one it was handed. Show the
resulting size next to the switch; that's the whole reason it exists.

Nothing here touches the network — a template is a file she hands over however
she already hands over files.

---

## Open Questions — Phases 27 & 28

**All closed 2026-08-14.** Kept as a record of what was decided and where the
answer now lives, because several of these are rules rather than one-off calls.

- **Q2** — JSON export → a zip of the world's folder, labelled as JSON. Phase 28.
- **Q3** — printing → works; needs a print stylesheet, not a decision. Phase 28.
- **Q4** — shared templates → carry their pictures. Phase 28.
- **Q5 / sequencing** → Phase 27 runs next and promptly; the rest sits where it
  makes sense, which is 28 after 20 so Markdown export and the Markdown importer
  are built as one round trip.
- **Q8** — start screen direction → settled; see "The screen itself" above.
- **Q9** — the loud button → New world, centred and alone. Settled by the layout
  rather than argued.
- **Q11** — outside worlds → one list, marked. See "The projects folder gets
  read" above.

---

## Phase 2 — Cloud Sync (Deferred)

Only if the shared-folder sync approach demonstrably stops working. Options in preference order: Supabase (hosted Postgres + auth), Yjs + y-webrtc (P2P CRDT), self-hosted sync server.

Do not scaffold in earlier phases. The file-per-node data model already sets us up well for any of these.
