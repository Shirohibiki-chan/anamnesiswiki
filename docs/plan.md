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

1. **The "UI overhaul" is two jobs, not one.** The *look* (colour, type, spacing, icons, naming) is CSS tokens and is cheap — done early, everything built afterwards is born looking like Anamnesis. The *layout* (left rail, splittable columns, tabs) rewrites the app shell and touches components that don't exist yet — done early it gets done twice. Hence Phases 11–12 up front and Phase 21 near the end.

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
**Phase 19.5 is next**, and it is the next one in this file.

Two things Phase 12 left behind are in Queued Adjustments rather than here: the
About dialog and the app's default typefaces. Neither blocks anything.

---

## Phase 19.5 — Blocks in the Page

**Scoped 2026-08-21, from her screenshots of the reference, and not built with
the rest of Phase 18.** It is a feature rather than a fix and it wants its own
change; it is written down here rather than in Queued Adjustments because it
is not an adjustment to anything.

**A sidebar block can be dragged into the middle of the page**, where it keeps
working and gets more room — her screenshots show a gauge block in the page
body holding eleven dials in a wide grid, which the sidebar's two-across
layout could never show. **It is resizable there**, by dragging either side.

- **The block model already fits; the document model is the work.** A block is
  a record in an ordered list (`Block` in `constants/schema.ts`) and the panel
  is a renderer over it. Putting one in the page means BlockNote holding it,
  which is a custom block — `src/services/editor-blocks/` already has three
  (Info, Quote, Secret) and `CLAUDE.md` says to extend BlockNote through its
  documented API and never fork it.
- **Settled 2026-08-28: the pointer, and where a block is drawn is derived
  rather than stored.** `node.blocks` stays the one list of a page's blocks —
  every block is a record in it wherever it appears — and the document holds a
  custom BlockNote block carrying that block's id and nothing else of substance.
  **Which of the three homes a block is in is then read off the documents, not
  written down anywhere:** a block some tab's document points at is drawn there,
  and the sidebar shows what is left. This is the decision the phase said was
  expensive to change later, so the reasoning is below rather than in a commit.

  - **It is what makes all six directions moves.** Sidebar → page → infobox →
    sidebar changes which document holds a pointer and never touches the record,
    so nothing is converted, no field can be dropped on the way, and a block
    that goes somewhere and comes back is the same block rather than a copy of
    one. Under the copy model every one of those hops rewrites the block.
  - **The alternative worth naming and rejecting is a `home` field on the
    block.** It is easier to write, and it is a second answer to a question the
    documents already answer — two records that can disagree, with no way to
    tell which is right when they do. A block claiming to be in the page while
    no document points at it is a bug we would have to invent a repair for.
  - **Deleting the pointer is not deleting the block.** Taking the block out of
    the page in the editor drops the pointer, so the block reappears in the
    sidebar; deleting it for real is the block's own Remove, which takes the
    record out of `node.blocks`. **A pointer with no record behind it renders
    nothing and is swept on the next read** — the two halves are edited through
    different paths and cannot be made to commit together, so the dangling
    pointer has to be an ordinary state rather than an error.
  - **A hidden tab still claims its blocks**, and that is deliberate: hiding a
    tab hides what is written in it, and a block sitting in that writing is part
    of it. The alternative — the block popping back into the sidebar when the
    tab is hidden — makes hiding a tab quietly rearrange the sidebar.
  - **Two pointers at one block was the state to think about, and it is guarded
    as of 2026-09-04.** Left alone it is two live views of one record — type in
    one and the other changes — which is defensible and is not what a copy means
    anywhere else in the app. A repeated pointer now clones the record and aims
    itself at the copy, on the same pass that keeps a row of columns in shape.
    Detail is in `docs/shipped.md`.

    **The route that was expected to cause it does not, and that turned over a
    real gap.** Copying a block in the writing and pasting it does not produce a
    second pointer: the block does not survive the clipboard at all. BlockNote
    writes the clipboard as HTML and our custom blocks have no rule for reading
    themselves back, so a copied stat panel comes back as nothing and the block
    returns to the sidebar. **Nothing is lost** — the record is untouched, which
    is the model working — but a page copied wholesale into another page arrives
    without its panels, silently. Fixing it means rendering an id into the DOM
    for these blocks and giving each spec a `parse` rule; the guard above is
    what makes that safe to do, since a pointer that survives the clipboard is
    a duplicate the moment it lands.
  - **The cost is that the sidebar has to read the documents.** Working out what
    is left means walking every tab's document, children included, for pointers.
    It is derived per page and memoised there; nothing about it is per-keystroke.
- **Dragging a block wider shipped 2026-09-02.** Either edge of a block or an
  infobox in the page, snapping to halves, thirds and quarters and free between
  them; the width is on the block's own record, so it survives the trip to the
  sidebar and back and the sidebar ignores it. Detail is in `docs/shipped.md`;
  what binds the code is in `docs/handoff.md`. **The one thing to know before
  changing it:** a resize is a panel edit and comes back under the panel's undo
  rather than the editor's, which is the right side to have it on and does mean
  Ctrl+Z in the writing will not undo one.
- **Not to be confused with Phase 21's splittable columns.** That rearranges
  the app's panels; this puts one block inside the document. They meet only in
  that both make the middle of the window less fixed than it is today.

### The insert menu, checked item by item against what we have

**Added 2026-08-27 from the user's list of the reference's `/` commands.** It
belongs in this phase because it is the same question from the other end: this
phase asks how a block gets into the page, and the list below is *which* blocks
she expects to find there. Most of it already exists and needs routing, not
building — which is the argument for the pointer model above, not against it.

**Already in the slash menu, nothing to do.** BlockNote's own defaults cover
more of her list than it looks: all six headings, bullet / numbered / to-do
lists, table, divider, image, code block, page break, emoji, and — this is the
one that is easy to miss — **expand, which is BlockNote's toggle headings and
toggle list**. Our three callouts (Info, Quote, Secret) sit beside them, which
covers callout, quote and secret. Mention is there too, on `@` rather than `/`.
Before building any of these, check `use-editor.ts` — it hands the menu the
full default list minus the duplicate Quote, so the defaults are live.

**Exists as a sidebar block, and is exactly what this phase is for.** Text box,
properties, tags, alias, image, link block, and the three indexes — subpage
index, tag index, backlinks — are all built and all in the sidebar today. The
three indexes are one `collection` block with a switchable source
(`collection-sources.ts`), so they are three menu entries over one block, not
three blocks.

**Meters are the same shape of problem, one size up.** One `meter` block draws
eight ways (`MeterStyle`), so "all meters" is eight entries pointing at one
block with its style preset — worth doing that way rather than one entry called
Meter that lands on a bar and makes her go find the setting.

**Not built anywhere yet, and each one is its own small piece of work:**

- **Bulk auto-link, and the hints toggle.** The two she named first, and the
  only two on the list that are not blocks at all — they are commands that act
  on prose already typed. `link-index.ts` already knows every page's name and
  already distinguishes a prose mention from a property one, so the matching
  half is largely there; the risky half is that a bulk pass **rewrites the
  document**, which nothing else in the app does. It needs to be undoable in one
  step and it needs a preview of what it is about to link before it does it —
  a page where forty names silently turn blue is worse than no feature. The
  hints toggle is the cheap half and can ship first: a marker on text that
  *could* be linked, no rewrite involved.
- **Table of contents — shipped 2026-09-04, as Contents.** Derived from the
  headings already in the document, so it stores nothing and cannot go stale:
  the block is a marker and the list is read every time it draws. Detail is in
  `docs/shipped.md`. It is called Contents in the menu rather than Table of
  contents, which is a phrase from a printed book.
- **Layout / columns, and it is the one item here with a licence problem.**
  BlockNote ships this as `@blocknote/xl-multi-column`, an official package
  rather than a fork, so it satisfies `CLAUDE.md` on that count. But **core is
  MPL-2.0 and the `xl-` packages are `GPL-3.0 OR PROPRIETARY`** (checked against
  npm 2026-08-27), and Anamnesis is MIT. Taking the GPL branch means the whole
  app ships under GPL-3.0 — a licence change to the released app, which is the
  user's decision and nobody else's; the other branch is paid.

  **Columns shipped 2026-09-02**, written by hand as `pageColumns` /
  `pageColumn` — a row block whose children are lanes, whose children are
  ordinary blocks — with a draggable divider between lanes. Detail is in
  `docs/shipped.md`; what binds the code is in `docs/handoff.md`, and it is
  worth reading before touching them: BlockNote reserves the names `columnList`
  and `column`, and writing to the editor's own DOM freezes the app.

  **Both branches are refused, settled 2026-08-27, and this is not to be raised
  again.** She will not pay for a dependency and the app stays MIT — a licence
  fee, or relicensing the entire app, to obtain one editor block is out of all
  proportion to what is being bought. **So `@blocknote/xl-multi-column` is not
  to be installed**, and neither is anything else in BlockNote's `xl-` family,
  which is all on the same terms. Columns get **a custom block written against
  BlockNote's own block API** — the same route as the Info, Quote and Secret
  callouts in `src/services/editor-blocks/`. Real work, no licence attached, and
  it should be estimated as build time rather than reopened as a choice.

  **The naming is settled as of 2026-09-02**, since two of the three have now
  shipped: **Columns** is this — lanes of writing inside a page. **Width** is
  how much of the page one block takes. Phase 21's are **panes**, and nothing
  in the UI calls them columns.
- **Callout colours shipped 2026-08-28.** Any callout takes a colour from
  `COLOR_PALETTE`; the four conventional hues carry an icon; type still decides
  behaviour, so a red Secret is still a Secret. It also fixed a `.lk` import bug
  it happened to expose — LK's warning and error panels used to arrive as
  Secrets, which meant every imported warning was silently marked as something
  a publish must strip. Detail is in `docs/shipped.md`, and what binds the code
  is in `docs/handoff.md` and `docs/constants-and-theming.md`.
- **Block anchors — the `#` that appears on hover and links to that block.**
  Asked for 2026-08-27 off the same screenshots. Not on the original command
  list because it is not something you insert; it is a handle on a block that is
  already there. Worth knowing it is two features wearing one control: a
  *stable id per block* to point at, and *a link that scrolls to it*. The second
  is easy and the first is the one to think about — an id derived from the
  heading text moves when the text is edited, and any link she pasted elsewhere
  dies quietly. Prefer an id that is stored, not derived.
- **Linked events.** Phase 25's territory — there are no events to link until
  storylines exist. Listed here so it is not mistaken for a gap in this phase.

**Infobox is a container, and the word means two different things.** Settled
2026-08-27, and worth stating plainly because the confusion cost a round trip:
**the thing she has been calling an infobox is a callout** — a coloured box with
an icon and text, which the app has had since Phase 1 and which only wants the
colours above. **The thing the reference calls an infobox is a block panel
sitting in the page body**: a bordered frame with its own Add Block button,
offering the same blocks the sidebar offers — Text Box, Properties, Image.

**An infobox is a third place a block can live, not a replacement for the second
one.** A first draft of this entry claimed it collapsed the phase into a single
feature; the user corrected that the same day, and the correction is the
important part: **blocks can be dragged out of an infobox into the page body and
back in**, so a block standing on its own in the document has to work anyway.
The infobox groups blocks; it does not host them exclusively. Everything the
phase above says about a lone block in the page still stands.

What it does change is the count of *editor* blocks. There are **two** to build,
not ten and not one: one that is a single block, and one that is a container of
them. Both draw through the same renderer, so a block kind added later appears in
all three places without being ported to any of them. It also very likely
explains the eleven-dial screenshot that started this phase — that was probably a
meter block inside an infobox rather than a gauge block sitting in the page.

- **Three homes and dragging between all of them is the real shape of this
  phase**, and it is more work than either half suggested on its own: sidebar,
  page body, and infobox, with a block movable between any two. **This is what
  settles the pointer-versus-copy question above, and settles it toward the
  pointer** — under the copy model, every one of those six directions is a
  conversion that can lose fields, and a block dragged sidebar → infobox → page
  is a block rewritten twice. Under the pointer model each is a move.
- **The pointer-versus-copy question above survives unchanged** and is still the
  expensive decision: whether an infobox's blocks live in `node.blocks` with the
  document holding a reference, or in the document outright. Prefer the pointer,
  for the reasons already given.
- **Their Media section — YouTube, Spotify, SoundCloud, Map — is out of scope**
  until asked for. It was never on her list; it is listed here only so that
  seeing it in a screenshot later does not read as something we missed.
- **Not open any more: the reference wraps text around it.** Corrected
  2026-08-29 by a screenshot of its own menu, which carries a Layout submenu
  offering **Full width, Align center, Wrap left, Wrap right**. What this entry
  said before — that her screenshots showed it full-width, so wrapping was an
  open question — was reasoning from the pictures we happened to have. The
  decision it reached still stands and for the same reason: **build the
  full-width version first**, because BlockNote does not float blocks and
  wrapping is a much larger job. It is now a known gap rather than an unknown.

### An image block holds its own picture — shipped 2026-09-03

**Found by her the moment blocks reached the page body.** An image block was a
window onto `node.image`, the page's one picture — so a picture dropped into a
block in the writing became the page's portrait, and a second image block showed
the same picture rather than a new one. That was defensible while an image block
only ever appeared in the sidebar; it stopped being so the day one could stand
in the writing.

**Her call, given the options: each image block holds its own picture, and one
of them is marked as the page's.** The page picture is the one the tree row, the
hover preview and the LK export use, so it could not simply be dropped — the
alternative offered (no page picture at all) was refused for that reason.

A picture lives in exactly one place: on the node when the block is the page's,
on the block otherwise, with the mark stored only once she moves it. Detail is
in `docs/shipped.md`; what binds the code is in `docs/handoff.md`.

**Still open, and deliberately not built with it:** the same question for a
*cover*. `node.banner` is one per page the way `node.image` used to be, and
"Set as cover" on a block in the writing now sets the page's one cover from
whatever that block is showing. Nobody has asked for more than one cover, and
there is nowhere on a page a second one would go.

### The infobox's own menu — shipped 2026-09-04

**Written down 2026-08-29 off her screenshots, built 2026-09-04.** The frame has
its own `⋯` now, beside its Add Block: a colour row, the width pair, Align
centre, Duplicate and Remove infobox. Detail is in `docs/shipped.md`; what binds
the code is in `docs/handoff.md`.

**One of the reference's items is still missing and one is dropped**, listed
here rather than in the shipped log because the first is work rather than an
omission:

- **Wrap left and Wrap right**, which is the same wall the phase already named:
  BlockNote does not float a block, so text flowing around an infobox is a much
  larger job than the rest of that submenu was. Full width and Align centre —
  the two that do not need floating — are built.
- **Pin to top — dropped 2026-09-04, and not to be revived without a use for
  it.** Asked what she expected it to do, she did not know either: it was on the
  list because it was on the reference's menu in a screenshot, not because
  anything wanted it. That is the whole reason it was ever written down, and it
  is not a reason to build it. If it comes back it will come back as a thing
  somebody is trying to do — a frame that stays put while a long page scrolls,
  most likely — and it can be designed then.

**One decision worth not re-litigating: dragging an edge leaves auto-adapt.**
The reference springs the frame back to its contents, so an auto-adapt box
cannot be dragged at all. Ours turns auto off and keeps the width, because a
handle that visibly does nothing is worse than an either/or you can leave by
using it. Told from use, if she wants the reference's behaviour instead, it is
one line.

**Element shipped 2026-08-28, as New page.** The `/` menu makes a page and
links to it without leaving the sentence, and a `[[Name]]` nothing answers to
offers the same dialog with the name already in it. Detail is in
`docs/shipped.md`; what still binds the code is in `docs/handoff.md`. **It is
called New page rather than Element** — this app's word for a page is "page",
and the reference's word was only ever how the item got written down here.

**Icon and the callout's own icon shipped 2026-09-01.** A `:` mid-sentence
offers glyphs and emoji together and inserts what she picks; `/icon` is the
second way in, since a slash only means a command at the start of an empty
line, which is where an icon is least useful. Clicking an icon opens the picker; a callout's icon is a
button that opens the same one, still derived from its colour until she picks
something, with **No icon** and **The usual icon** as two separate ways out.
Detail is in `docs/shipped.md`; what binds the code is in `docs/handoff.md`.

**What that entry used to say about Glyphs was wrong, and the correction is
worth keeping.** It said a searchable icon set was "the half we do not have" and
that `constants/icons.ts` was the whole of what existed. It was not: Phase 18c
shipped `glyph-catalogue.ts`, which is every Lucide icon by name, behind
`IconPicker.tsx` with a search box, an emoji tab and a curated set in front of
the catalogue — built for a meter's readings and deliberately built to know
nothing about meters. Five things were already opening it before this phase
touched it, a page's own icon among them. **The lesson is the general one:** the
plan was written against `icons.ts` because that is the file the phase before
had been reading, and a "we do not have X" written in a plan doc does not
re-check itself. Read for the thing, not for the file you remember.

- **The Recent row shipped 2026-09-04.** The last eight icons picked, across
  the top of the picker while browsing and out of the way while searching. They
  live in preferences beside the saved colours, for the same reason those do: a
  page's icon, a callout's and a meter's all open the one picker, so what she
  used last is hers rather than any one world's.

**Why it is worth doing:** the sidebar is a column, and a panel of stats is a
grid. Everything Phase 18c built is squeezed by that column — four gauges go
two-across and a fifth pushes the page's fields off the bottom. This is the
part of the reference she compared ours to and found ours wanting, and it is
the one part of that comparison the sidebar itself cannot answer.

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
- **A title bar that looks like the app**, filed here by the user 2026-08-21 rather than queued separately. The bar across the top of the window is the stock Windows one and the only part of Anamnesis that ignores the theme; on a dark theme the app reads as sitting inside somebody else's chrome. Nobody chose it — `decorations` is absent from `src-tauri/tauri.conf.json`, so it is the default.

  **It belongs to this phase because this phase is already replacing what sits under it.** The top bar goes away here, so a custom title bar built earlier is built against a frame that is about to be deleted, and built twice.

  **The switch is one line and the consequences are not.** Turning decorations off hands us minimise, maximise and close, a drag region, double-click-to-maximise, the resize edges, and — the one that gets missed — Windows 11's snap layouts, which appear on hover over the *native* maximise button and are how a lot of people arrange windows. A custom bar that skips them takes a working feature off her machine to gain a colour. Design that part; the buttons are the easy half.

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
