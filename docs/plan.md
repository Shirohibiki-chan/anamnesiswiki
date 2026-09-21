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
  (`applyTemplate`, `applyCustomTemplate`), the asset lifecycle
  (`setNodeImage`, `clearNodeImage`, the banner pair), and the tab actions.

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

- **Paste was measured on 2026-09-21 and is wrong today; the fix is not yet
  built.** The findings are in `docs/ideas.md` → Import and paste fidelity.
  The short version: plain text is read as Markdown on the way in, so
  `*asterisks*` become italics, `<angle brackets>` vanish and `# ` becomes a
  heading; one Markdown-looking word in a Google Docs paste throws the
  document's real formatting away; and the plain-text copy *out* is Markdown
  with backslashes before line breaks. Google Docs and Word HTML themselves
  come through well. **Pasting in as text is a build with no decision in it**
  — the anti-goals in `ideas.md` already say so — and it is a paste handler
  passed to BlockNote with `plainTextAsMarkdown` and
  `prioritizeMarkdownOverHTML` off. **What the plain-text copy should be is
  her call**: text (right for a lorebook field, loses the bold) or Markdown
  (right for Discord, litter in a text box).

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

- **Enter at the end of a fresh Note page's last line does nothing.** Found
  2026-09-21 while driving the app for Phase 31. A new Note page's writing
  ends with an Info callout and then the "Start writing." paragraph; with
  the caret at the end of that paragraph, Enter throws "Cannot join
  blockGroup onto blockContainer" inside the editor and no new line
  appears. Typing something first and *then* pressing Enter works, as does
  Enter anywhere else that was tried, so it seems to be that one paragraph
  straight after a callout in a document written by the template. Not
  chased; the scenario worked around it by clearing the page first
  (`e2e/plays-music-in-the-page.e2e.ts`). Worth checking whether the other
  templates' last lines do the same.

- **A note or a labelled stretch put outside the scenes is on the canvas and off
  the screen.** Found 2026-09-09 while placing the example world's canvas. The
  view fits itself to the *scenes* — `sceneBounds` in `use-storyline-view.ts`
  takes the scene positions and nothing else — so a note dropped to the right of
  the last scene, or a band drawn round empty space, is outside the fitted box
  when the page opens and stays invisible until somebody drags the view. Adding
  one by hand is fine, because the canvas is where she put it and she is looking
  at it; the case that bites is a canvas *opened* later, and the example world's
  note had to be moved inside the scenes to look right. The fix is to fit to the
  notes and bands as well — the reason it does not already is that the fit is
  also the thing a drag re-centres against, and widening it means a band being
  resized would move the picture underneath the hand doing it.

- **A project that refuses to open can say nothing at all.** Reported from use
  2026-08-21: clicking Valeraverse on the start screen did nothing visible, and
  the world stayed shut. The likely trigger was a stale open-claim — a
  `pnpm tauri dev` build had been restarted under her while its marker was
  still live, and the world opened normally once the marker aged past
  `PROJECT_CLAIM_STALE_MS` — so the *refusal* was correct. **What is wrong is
  that she saw no reason for it.** `openListed` and `openFound` both set an
  error for every failure path, and `refuseIfHeldElsewhere` sets a specific one
  naming the other window, so either that message is not rendering where she
  was looking or the click never reached the handler. Find out which before
  changing any of the copy.

  **Two things make this worse than a missing message.** `loadProject` catches
  everything and returns `null`, so a genuine exception and a missing folder
  are indistinguishable by the time the UI sees them — there is nothing in the
  app that can say *why*. And `openListed` calls `forgetProject` on failure, so
  one silent failure also drops the world from the recent list, and every click
  after that is against an entry that is already gone. Whatever the root cause
  turns out to be, that pairing turns a transient refusal into something that
  looks permanent.

- **The error boundary at the root exists; the ones that would save the session
  do not.** `ErrorBoundary.tsx` went in 2026-08-27 and turned a blank window
  into a screen that says what happened — but it wraps the whole app, so all it
  can offer is a restart. **What is still missing is a boundary around the parts
  that can be re-entered**, the block panel and the page view: one bad block on
  one page still takes the whole app down with it, where a boundary there could
  name the block that failed and leave the rest of the app usable. More
  expensive since Phase 18a, because a sidebar is now an arbitrary list of
  blocks rather than a fixed set of fields.

- **Clearing or replacing a page's picture cannot be undone.** Everything else
  the right-hand panel does became undoable with Phase 19; this one did not,
  because clearing a picture deletes the file from `assets/` once nothing else
  points at it, so undo would have to put the bytes back rather than a field.
  `deleteNodes` already does exactly that with `captureAssets` — the way in is
  to do the same here, not to invent a second mechanism.

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

**No scoped phase is left.** What remains is the deferred phases below
(Cloud Sync and Split Panes), Queued Adjustments, and whatever she scopes
next.

Two things Phase 12 left behind are in Queued Adjustments rather than here: the
About dialog and the app's default typefaces. Neither blocks anything.

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
