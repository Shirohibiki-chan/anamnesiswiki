# Anamnesis — Implementation Plan

---

## Project Overview

Anamnesis is a Tauri v2 desktop app for local-first worldbuilding. React 19 + TypeScript in the renderer, Rust shell handling filesystem access. Data lives as JSON files on disk in a folder the user picks. BlockNote provides the Notion-style block editor. LegendKeeper's `.lk` export format is supported as a first-class import/export path so the user can migrate their existing world.

Work phases top-down. Do not start a phase until the previous one is complete and usable. Each phase should end with the app in a coherent, working state — not mid-refactor. Phases are sized to be reviewable as user-facing changes.

**The numbers ascend as you read down, and that is a rule now.** It used to be the opposite — position was the running order and the number was only a name — which meant 29 sat above 19 sat above 28, and the file read as chaos to the person who works from it. Her call, 2026-08-28. Two things follow. **A phase pulled forward gets a fractional number** (19.5, the way 1.5 already worked) rather than keeping a number that would put it out of order. **A number is never reused**: two different phases were both called 28 for a week, which made every reference to "Phase 28" in the other docs ambiguous, so check `grep '^## Phase' docs/plan.md` before writing a new section.

Gaps in the sequence are phases that have shipped and moved to `docs/shipped.md` — 27 and 29 are gone from here for that reason, not lost. Phase 2 sits at the bottom out of order on purpose: it is deferred rather than queued, and its heading says so.

**Automate the repetitive parts wherever there is a choice.** The user's standing direction, 2026-08-31, and the same thing said by the botmaker whose folder-preset request sits at the top of Queued Adjustments: the reason to keep a world in a tool like this rather than in folders is not doing the same small job by hand for every character. Where a feature can either do a step for someone or ask them to repeat it, it does the step. **The rule that keeps that from becoming its own annoyance came with the same request** — automation is something offered and switched on, never something that happens to a page on its own, and anything a person typed themselves outranks it.

See `docs/spec.md` for the full spec, `CLAUDE.md` for architecture rules, and `docs/prototype/anamnesis.jsx` for a reference React prototype that demonstrates layout and tree behavior (its template content is filler — the real copy lives in `src/services/template-registry.ts`).

---

## Future Features

Parked in [ideas.md](ideas.md), so this file stays focused on active work.

---

## Queued Adjustments

- **A marker on text that could be linked, while she is writing.** The other
  half of `/link page names`, which shipped in Phase 19.5; this is the half that
  shows what *could* be linked without being asked. It wants a ProseMirror
  decoration, reached through BlockNote's own extension API the way
  `select-all.ts` reaches it — ordinary work, and it was wrongly written down as
  a blocked path until 2026-09-04.

  **It is a nicety rather than a gap**, which is why it is here rather than in a
  phase: the preview dialog already lists what could be linked, in the sentences
  it was found in, and closing it changes nothing. What is missing is seeing it
  while writing rather than when asking.

- **A page's sub-pages arrive under the names the template gave them, with
  nothing tying them to the page they landed in.** Asked for 2026-08-31 by a
  botmaker in her Discord, who had the same thing built as an Obsidian plugin
  the night before and sent it over — 300 lines of plain JavaScript, read here
  the same day. Every character folder there holds the same three subfolders,
  and creating one names each after the folder holding it: `Damien` giving
  `Damien_Pics`, `Damien_Sheets`, `Damien_Overrides`.

  **Take its rules, not its shape, because it is built around a limitation we
  don't have.** Her point, and it is the load-bearing one — the difference is
  a decision she made against Obsidian rather than a thing that happened to
  turn out this way (`CLAUDE.md` → Data on disk). Obsidian keeps
  folders and notes as different kinds of thing, and a note cannot hold notes —
  so a plugin that wants a repeatable structure has nowhere to put it except a
  new object of its own, a "folder preset" living in plugin settings with a
  list of folder names in it. Here every page holds pages, and one that gains a
  child becomes a directory on disk that moment (`usesDirectoryStorage`). A
  folder with three subfolders *is* a page with three child pages. Building a
  second, parallel kind of preset for it would import the limitation along with
  the feature.

  **So this belongs to templates, and most of it is already there.** A template
  saved off a page keeps the pages saved inside it and `applyCustomTemplate`
  pours them in, which is the structure half done. The children want nothing
  heavy — a child made from the blank template is already the cheap object —
  so there is no new kind of thing to design here, only a naming rule to add to
  one that exists.

  **The naming rule is worth copying exactly.** There is no `{parent}` token to
  write: you type `Pics`, and prefixing is simply what the preset does, with a
  separator (`_` by default, editable, allowed to be empty) between the halves.
  That is better than a token, which has to be typed correctly on every child
  when the thing every child wants is identical.

  **The rule is set on the preset as a whole rather than per child — her
  call 2026-08-31.** One prefix switch and one separator box, covering every
  child in it, the way the plugin does it. A template wanting some children
  prefixed and others not is two templates, which is cheaper to explain than a
  checkbox on every row.

  **What the prefix buys here is narrower than it looks, and worth knowing
  before pricing it.** Links won't break either way — a mention stores
  `nodeId`, not a name — and same-named siblings already get a `(2)` on the
  filename with the page's own name untouched. What a dozen pages called `Pics`
  actually ruins is every list that shows pages *by name*: the `@` menu, the
  wikilink picker, Ctrl-K. That is the case for the feature, and it is a real
  one.

  **Ask for the name first.** The plugin's modal takes the folder name, then
  where it goes, then the preset, then makes everything — so nothing is ever
  named after an unnamed parent. Ours is the other way round: a page made from
  a template is added blank, filled, and named last, which is exactly why the
  children would land under an Untitled parent. Reversing that for this route
  is the change.

  **Renaming a page renames its preset-named children with it. Her call
  2026-08-31**, over the plugin's own behaviour — it bakes the name in at
  creation and never revisits it, so a renamed folder there keeps subfolders
  naming the old one, which goes wrong the first time a typo is fixed. **She
  asked whether a setting for "ask me each time" belongs beside it, and it
  does not.** A preference for a rare event is one nobody finds, and a prompt
  in the middle of a rename slows the common case down to serve the rare one.
  Undo is the answer that already exists: Phase 19 covers the panel and a
  page's tabs, and `history-service`'s `collapseSince` is what makes a rename
  plus its cascade one press rather than several. Wrong cascade, one undo, no
  setting.

  **The simpler argument is hers, and it is the one to keep: a name is
  editable text.** If the cascade renames a child she wanted left alone, she
  types it back — no undo, nothing to find in Settings. A wrong cascade
  costs a typo's worth of work to fix, and that is exactly what makes it safe
  to do by default rather than something to ask permission for.

  **Applying to a page that already exists is the second route and the one that
  reaches her world.** Right-clicking offers it, using the page's current name
  as the prefix; Valeraverse is already full of characters, so a route that
  only fires on new pages would reach almost none of them. A child of that name
  already there is skipped and the rest are still made, with a count afterwards
  — which is what makes running it twice safe.

  **Nothing happens on its own.** The other person in that conversation names
  their subfolders differently every time and would undo anything automatic. A
  preset is chosen at the moment of creating, and a page made the ordinary way
  is untouched: no toggle to find, no rule running in the background.

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

- **The shortcut sheet shows keys and nothing else.** Noticed 2026-08-28 when
  the user asked whether we had the reference's Shortcuts window and sent a
  screenshot of it. We have a sheet — `ShortcutSheet.tsx`, on `?` — and in one
  way it is better than theirs: every shortcut here is rebindable, so it reads
  the same store the key listener does and shows *her* keys rather than a fixed
  list nobody can trust. What theirs has and ours does not is two tabs' worth of
  the rest: a **Slash Commands** list, and the **markdown shortcuts** (`**bold**`,
  `# heading`, `* item`, `[] item`) which are real behaviour in our editor and
  written down nowhere.

  **The slash list should be generated, not typed out.** `getSlashMenuItems` in
  `use-editor.ts` already assembles the whole menu with titles and subtexts; a
  hand-written second copy would be wrong within a month, and it is the same
  mistake the rebindable-keys design was built to avoid. The markdown list is the
  opposite case — those are BlockNote's input rules, not ours, so that half is a
  written list and should say where it came from.

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

- **Loose ends from 2026-08-27, written down because they were only ever in
  pull request descriptions.** A merged PR's body is not a tracking document —
  nobody reads it again. None of these is urgent and none needs a decision
  except where it says so.

  - **Nothing points at the bug report path except Settings → Report a bug.**
    Somebody who has just watched the app do something wrong is not in
    Settings, and the crash panel's own button only exists for the crashes that
    take the window down. A way in from where a person actually is when
    something goes wrong is the missing half.
  - **The bug report form has never been submitted.** The link is built, the
    YAML parses, and GitHub's rendering of it is unproven until one real report
    goes through. The `build` box prefills by matching a field id; if that ever
    silently stops working, the only sign is reports arriving with an empty
    box.
  - **The `?` sheet lists nothing the editor owns.** Ctrl+B, the heading keys,
    the callout keys are BlockNote's and would have to be typed out by hand —
    which is the drift the sheet exists to avoid. Worth deciding rather than
    leaving: a cheat sheet that omits the keys used while writing is half a
    cheat sheet.
  - **Named checkpoints, with pinning, were on her list and are not built.**
    Phase 19 shipped the automatic kind: copies taken on a timer, listed by
    when. "Mark this state, name it, come back to it" is a different feature
    and is nowhere in this document. It is the last unbuilt item from the six
    raised on 2026-08-27.
  - **The stylesheet notice cannot be acknowledged.** Item 5 shipped for the
    load warning only; the "this `.css` asked to load something from the
    internet" line in Settings is the other repeating one. Same idea, different
    plumbing, and the less annoying of the two since it only appears when that
    panel is open.
  - **The acknowledgement record is never pruned, and a moved world asks
    again.** Entries are keyed by absolute path and nothing removes one whose
    file is gone. A few dozen bytes each and nothing reads a stale one, but it
    only grows — and renaming or moving a world means its acknowledged files
    speak up once more.
  - **Two layout rules exist as one-off measurements rather than checks.** That
    a text field never clips its own text, and that the centre column never
    goes below `CENTER_MIN_WIDTH`, were both verified by hand at the time and
    nothing stops either regressing. Both belong with the counts in
    `layout-rules.e2e.ts`.
  - **Settings has still never been swept by the layout checks**, and it is the
    densest screen in the app. Everything else is swept at 1280 and 900.
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
**Phase 22 is next**, and it is the next one in this file.

Two things Phase 12 left behind are in Queued Adjustments rather than here: the
About dialog and the app's default typefaces. Neither blocks anything.

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

**Sequenced before the three big views** so Database, Graphs and Storylines are born universe-aware instead of retrofitted — a storyline in particular belongs to exactly one universe. Staying at 22 rather than moving earlier, per the user leaving the call here 2026-08-08: the selector wants somewhere to live, and Phase 21 is what builds the left rail it belongs in. Putting it before that means placing it twice.

---

## Phase 23 — Database

A filtered table or card view over pages, by template or tag. Cheapest of the "big views" and the most useful day to day, which is why it leads them.

**Named Database as of 2026-08-31; it was Collections until then.** The rename came out of naming the image gallery (`docs/ideas.md`): a gallery holds pictures, a database holds pages laid out as cards, and no name is shared — one word stretched over both is exactly Notion's failure. *Collection* was the other candidate and she held it back on purpose, not for a use she has in mind but because it is a valuable word and a feature name spends it everywhere at once. **Nothing user-facing said "collection", so there was nothing to migrate** — a block's heading is its source's name (Manual links, Subpage index, Tag index, Backlinks). The code still says `collection`; that is internal and can follow whenever this phase is built. **One cost, accepted knowingly:** in Notion the word carries typed columns, sorts, formulas and relations, so the name runs slightly ahead of what this phase builds.

---

## Phase 24 — Graphs

Both, per the user's decision 2026-07-31, and in this order:

1. **Relationship graph, scoped to one page** — who she knows, who she serves, what she owns. This is the one that earns its keep.
2. **Global graph** — a view of the whole project at once. Still second, because the relationship graph is smaller and lands sooner, but **it is meant to be a tool, not a poster.** An earlier draft of this entry wrote it off as the thing people screenshot and never use; the user corrected that 2026-08-08 — she wants somewhere to see the whole project, and she specifically doesn't like how Obsidian's is set up.

Obsidian's graph is the thing to beat, so what's wrong with it is the spec. Five commitments, none of them "make it prettier":

- **Nodes have to look like her tree, not like dots.** Obsidian draws every note as the same grey circle, which throws away the one thing this app knows and Obsidian doesn't: templates. Characters, locations, factions and species carry their sidebar icon and her chosen node colour into the graph. This is the single biggest legibility win available and it's nearly free — `constants/icons.ts` and the colour cascade already exist.
- **The same project has to look the same every time you open it.** Force-directed layouts settle differently on every run, so there's no building a memory of where anything is. Seed the simulation deterministically and remember pinned positions.
- **Scoped by default, not everything at once.** One universe (Phase 22), widened on request. Five AUs rendered together is precisely the hairball that makes people close the tab.
- **Filters are visible controls, not a query syntax.** Filter by template and by tag using Phase 23's Database filter model rather than inventing a second language for the same job.
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

**Sequenced here because** it wants the reference index from Phase 18 (a scene node should be able to show who's in it), the reworked shell from Phase 21 to host a full-screen canvas, and the pan/zoom and edge rendering from Phase 24 — its *layout*, per the note above, is the one thing not to inherit. It doesn't otherwise depend on Database or Graphs, so it can be pulled ahead of both if it's what she wants sooner. **A storyline belongs to exactly one universe** (Phase 22) — a fork in reality has its own sequence of events by definition.

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
report anywhere — nobody wants onboarding analytics, which is the one promise
that outlived the retired policy section (`CLAUDE.md` → Two Promises).

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

**Not the same thing as the project templates Phase 27 shipped, and the names
are close enough to be worth saying so.** A `.antpl` is a *project's* shape —
folders, and a blank starter page of each kind, described rather than copied,
with none of anybody's writing in it (`constants/project-template.ts`). This is
a *page* template — one page and its subtree, copied whole, prose and pictures
and all, out of the Templates tab. Different unit, different contents,
different file. Whether the two formats should ever converge is a question for
whoever builds this; the answer is probably not, because "carry their pictures"
below is exactly what a project template deliberately refuses to do.

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
- **Q8** — start screen direction → settled; see "The screen itself" in
  `docs/shipped.md` § Phase 27.
- **Q9** — the loud button → New world, centred and alone. Settled by the layout
  rather than argued.
- **Q11** — outside worlds → one list, marked. Shipped; see "The projects folder gets
  read" above.

---

## Phase 2 — Cloud Sync (Deferred)

Only if the shared-folder sync approach demonstrably stops working. Options in preference order: Supabase (hosted Postgres + auth), Yjs + y-webrtc (P2P CRDT), self-hosted sync server.

Do not scaffold in earlier phases. The file-per-node data model already sets us up well for any of these.

---

## Phase 20 — Markdown & Folder Import (Deferred)

**Deferred 2026-09-04 by the user, in favour of Phase 21.** Not dropped and not disliked — mistimed. Her world is already in Anamnesis, so an importer serves people arriving from somewhere else: her boyfriend, who was talked out of starting in Obsidian, and the botmaker in her Discord who uses it. That is a real audience and a later one. Phase 21 is the shell she looks at every day, and it won on that.

**What it was, kept whole so none of it has to be worked out twice:**

**Text & Markdown, Obsidian.md, Folder and Zip are one importer wearing four hats** — read a tree of markdown files, map directories to the tree. Build it once.

**Dragging a folder onto the window is the entry point**, and imports the whole thing with its directory structure preserved. Obsidian added exactly this in 1.13 and it's the right front door for an importer that's already directory-shaped: it skips the file-picker step for the case that matters most, and it's the same code path underneath.

JSON and HTML are separate and lower priority. World Anvil is dropped (see `docs/ideas.md`).

**One Import button, more entries behind it — not a button per format.** Settled 2026-08-18: the errand is "bring my world in", and which program it came out of is a detail of the file, not a decision she should have to make before the picker opens. `pickImportFile` in `dialog-service.ts` already has the shape — a filter list plus an All files fallback — so each new importer adds a filter entry and a branch on what the file turns out to be, the way theme import already works out `.css` from `.json` after the fact. The folder-drag entry point above is the exception and stays separate, because a folder isn't something a file picker returns.

**What made it long, which is the part to weigh when it comes back.** Reading a folder of plain `.md` files is the small half: `readDir` is already in the host contract and works on both shells, and since any page here can hold pages, a directory maps to a page with children without inventing anything. Our `[[wikilinks]]` are Obsidian's syntax already, so that part is resolution rather than translation. The length is in the rest of the tail — Obsidian's embeds and tags; a front-matter parser the repo does not have; copying pictures in and repointing every reference; zip, which nothing in the app has ever opened, `.lk` being plain JSON; and the folder-drag entry point, which needs checking before it is scoped, because what a dropped folder hands the page is not obviously the path `readDir` wants.

**Phase 28 expects this phase to exist.** Its markdown export is written down as something to build *with* this importer rather than separately — one map read in both directions, and the round-trip test that comes free with it. Whichever of the two is built first therefore carries the shared map, and the other should be re-read before it starts.

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
