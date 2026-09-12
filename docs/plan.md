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

- **A database block has the layouts but not the menus.** What Phase 23 left
  behind, and the only piece of it worth queuing. A page shown as a database
  gets six controls — layout, columns, filter, sort, group and scope; a Subpage
  index or Tag index block inside a page gets the layout switcher and editable
  cells, and the other four are page-only. **Nothing is missing from the engine:**
  `presentDatabase` already takes rows and a view and hands back everything
  filtered, sorted and grouped, and `block.view` is the same record the
  page-level one stores. What is missing is those menus being reachable from a
  block's own bar.

  **It was left for width, not for effort.** The controls were built as a bar
  above a full-page table, and a block in the narrow sidebar has nowhere to put
  six menus — List and Cards suit that column, and a table wants the page body.
  So the job is as much deciding what a block's bar shows at its width as it is
  wiring the menus up, which is why it did not ride along with the rest.

- **A number can only be filtered for an exact value.** `is` and `is-not` on a
  number property compare the text of it, so there is no "more than 40" — which
  is most of what a person wants a number filter for. The operator list in
  `schema.ts` is where it goes, and the comment there already explains why the
  operators are split by how many values a field holds, which is the rule a
  `greater than` has to fit into.

- **Typing on a new page should dismiss the template grid by itself.** Asked for
  2026-09-06. A page created blank shows the "what kind of page is this?" grid
  with a `Skip this — just start writing` link under it, and that link is
  currently the only way past it without choosing a template. LegendKeeper lets
  you click into the editor and start typing, and the offer gets out of the way
  on its own; she wants that. Deferred by her at the time it was raised, so it
  is here rather than in a phase.

  **The state it needs already exists, but the grid does not read it yet**, and
  that gap is most of the work. `hideTemplatePrompt` on the node is the "sent
  away for good" flag, and today only the sidebar's own prompt honours it
  (`BlockPanel.tsx`); the centre grid is shown purely on the page being `blank`
  with no tabs (`isUnanswered` in `PageView.tsx`). So the job is three things,
  none of them new state: make `isUnanswered` respect the flag, get the editor
  reachable underneath the grid, and have the first keystroke set it.

  **The one thing to be careful of** is that dismissing it must not become the
  only way out. `schema.ts`'s note on `hideTemplatePrompt` says why: before the
  flag existed, the prompt was the single route to giving an existing page a
  template, which is why Add Block carries one too. A page that dismisses itself
  the first time somebody leans on the keyboard still has to be able to get a
  template afterwards.

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

**Phase 30 is what comes next**, scoped 2026-09-10 and her pick from what was
left. After it, what remains is the deferred phases below (Cloud Sync and Split
Panes) and Queued Adjustments.

Two things Phase 12 left behind are in Queued Adjustments rather than here: the
About dialog and the app's default typefaces. Neither blocks anything.

---

## Phase 30 — Home Dashboards & Quick Capture

Scoped 2026-09-10 from two things she brought: a gallery of Obsidian home
dashboards, and a friend's own dashboard with a capture box on it that files
each thought where it belongs. The second is the part she reacted to first and
it leads the phase.

**What an Obsidian dashboard is made of, because it decides the shape of this.**
Each one in that gallery is two files: a CSS snippet that turns a note into a
grid of glass cards, and a note whose content comes from a plugin running
JavaScript — recent notes, notes with a tag, a clock, the weather, the capture
box. **The look is Phase 12's job and already works here**: themes and
snippets are `.css` files, live-reloaded, importable. **The content is where
this app answers differently, and the decision is that no page runs code.** A
shared file that runs a script is what makes those dashboards fragile and
occasionally unsafe, and it is the reason every gallery entry opens with a list
of plugins to install first. Here a dashboard is made of block kinds anyone can
add from the Add Block menu, so it works in every theme, needs nothing
installed, and can be handed to somebody as the page template Phase 28 already
exports. One snippet beside it is the whole bundle.

### 1. The Quick capture block — first

A block with a text box and a Capture button. Type a thought, capture it, and
it becomes a page under the right parent without leaving the page you were on.
The point is the trip it saves: today a stray idea about the magic system,
had mid-chapter, means opening the tree, making a page, naming it and finding
the way back.

- **Destinations are pages, because pages hold pages.** The block names one
  page — its own by default — and the destinations are that page's children.
  A `Quick capture` page with `Magic`, `Story` and `Characters` under it is the
  friend's folder tree, made of the thing this app already has, and a
  captured page can be dragged out of it into the world proper when it has
  grown up.
- **The picker is a box you type into, not a dropdown.** Her point, 2026-09-10:
  a dropdown works for five destinations and stops working for twenty. So it is
  the same control the reference pickers use — type, and the list narrows —
  defaulting to wherever the last capture went.
- **Code words are a shortcut into that picker, not a second system.** Text
  that starts with a destination's name and a dash (`magic - i love witches`)
  pre-selects that destination and drops the prefix from the title. A word that
  matches nothing changes nothing: the text is kept whole and the capture goes
  where the picker says. The friend's version files an unmatched word under
  *other* silently, and a typo vanishing into a bin is the failure this design
  avoids. After each capture the block says where it went, with a link.
- **The title is what was typed.** The first line becomes the page's name and
  the rest its body — not a timestamp with the words after it, which is what
  the friend's tree shows and what makes it unreadable. The time goes into a
  `Captured` property written in one fixed sortable form, so a database block
  underneath can show newest first or group by parent. That strip of category
  cards in her friend's screenshot is a Subpage index shown as cards, already
  built.
- **A captured page is a plain page and skips the template offer.** It was
  created to hold three lines, not to be a Character yet. It gets the
  automation rule from the top of this file for free: nothing runs on its own,
  and what she typed is what the page says.
- **The second door, built right after the first.** Once the block exists the
  same box should open from anywhere — a shortcut and a search-palette action
  — using the capture block on the home page as its rules. No home page block
  means the action says so and offers to make one. Separate step so the block
  ships and gets lived in before its rules are copied anywhere.

### 2. A style class per page — what turns a theme into a dashboard skin

The one gap between Phase 12 and the gallery. Obsidian's dashboards style only
the dashboard note because a note can carry a class name in its properties and
the snippet targets it. Here a snippet hits every page. So: a page setting —
one short name, kept in the page's own file, landed on the page view's root as
a data attribute. A snippet writes `[data-style="dashboard"] …` and nothing
else in the app changes shape. It sits on the page view's root rather than the
window's so the sidebar and the properties panel keep the theme; a skin
describes a page, not the app around it.

**Both halves are in, in this order — her call, 2026-09-11.** Per page first:
the gallery's model and enough for a home page. Then per template, so every
Character page can pick up a "character sheet" skin without being set one by
one. The attribute and the snippet are the same either way; only where the
name is set moves, and a page's own name wins over its template's, the way
anything a person set outranks what came with the template.

### 3. Two blocks a home page is missing

The gallery's tiles are mostly things this app already draws — Manual links
as the *jump anywhere* cards, a Subpage index or Tag index for lists, a
database for anything sorted. Two are missing and both are small:

- **Recently edited** — the pages touched last, newest first, a count she sets.
- **Pinned** — the shortcut rail's pins (Phase 19), as a block, so the home
  page and the rail agree without being kept in step by hand.

Clocks, weather and habit grids are the script half and stay out. **Layout
stays a column of sections**, which is what the gallery's dashboards are too —
sections stacked, cards inside each. Columns side by side would mean
BlockNote's multi-column package, which is one of the paid ones and off the
table; a snippet can grid the cards inside a section and that is as far as
this phase goes.

### 4. One dashboard, shipped as an example

The rule from Phase 12 applies unchanged: don't ask her to describe a home
page, build a complete one and let her react. One page template plus one
snippet, bundled the way the built-in themes are, with the capture block, the
two new blocks and a row of link cards on it. It is the thing that proves the
four parts above add up, and the thing somebody copies to make their own.

### Order

Capture block → its shortcut and palette action → style class → the two
blocks → the example. The capture block first because it is useful on its own
and is what she asked for; the example last because it needs everything else.

---

## Open Questions — Phases 27 & 28

**All closed 2026-08-14.** Kept as a record of what was decided and where the
answer now lives, because several of these are rules rather than one-off calls.

- **Q2** — JSON export → a zip of the world's folder, labelled as JSON. Phase 28.
- **Q3** — printing → works; needs a print stylesheet, not a decision. Phase 28.
- **Q4** — shared templates → carry their pictures. Phase 28.
- **Q5 / sequencing** → Phase 27 runs next and promptly; the rest sits where it
  makes sense, which is 28 after 20 so Markdown export and the Markdown importer
  are built as one round trip. **Superseded on that last point 2026-09-10**:
  Phase 20 was deferred on 2026-09-04, so 28 ran first and its Markdown export
  carried the shared map alone — and 20 followed the same day, reading that map
  back. See `docs/shipped.md` § Phase 28 and § Phase 20.
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

## Phase 21.5 — Split Panes (Deferred)

**Deferred 2026-09-04 by the user, the same day it was designed.** Pulled out of Phase 21 rather than dropped — it was the piece that made that phase a rewrite, and without it the rail and the title bar are two small visible things she can have soon. The fractional number says where it came from and where it returns to.

**It is hers, and the record used to suggest otherwise.** It went into the plan on 2026-07-31, scoped from LK screenshots and carrying no attribution, while the title bar filed beside it names her outright — which made this read as a parity item nobody asked for. It is not. She placed it as Obsidian's and confirmed it there with Obsidian's own split command before any of this was written down. LK has no splits at all, so the parity reading was wrong twice over.

**What it is** — open to the right, open in new tab, open in new window, split right, split down.

**A pane here is a whole page, and that is the difference from Obsidian.** Settled with the user 2026-09-04. Obsidian can let its right sidebar follow whichever pane has focus because what sits in it — backlinks, an outline — costs nothing to lose. Ours is the page itself: the portrait, the properties, the meters. Her point, and it is the one that decides the design — borrowing Obsidian's answer only works while the thing being swapped is disposable, and here it is not.

**The right bar follows the focused pane even so, and that is her call rather than a concession.** Two panes cannot each carry one: `TREE_MIN_WIDTH` 180, plus twice `CENTER_MIN_WIDTH` 420, plus twice `PROPERTIES_MIN_WIDTH` 220, is about 1460px against a window that opens at 1280 and may be dragged down to 900. One right bar pointing at one pane is the only arrangement that survives a small window, and it leaves the three-column layout alone — the panel does not move, it changes what it is describing.

**Two rules keep that from reading as broken, and both are load-bearing.** **Focus has to be sticky rather than literal**: editing a meter or a property puts real keyboard focus *into the right bar*, and a panel that swapped on that would change under her hand mid-click. It means the last pane whose page she was in, and it holds there while she works the panel. **And the active pane has to be visibly marked** — a right bar showing a stat block with no way to tell which of two characters it belongs to is worse than an empty one, because it is confidently wrong.

**Splitting puts the cursor in the new pane**, so the right bar points at what was just opened. Obsidian's behaviour, checked by the user 2026-09-04.

**What it costs, which is why it is parked rather than queued.** `AppLayout.tsx` is a fixed three-column grid: tree, one page, properties. This turns the middle into a tree of panes, each with its own tabs and its own history, and that is the rewrite Phase 21 was scheduled late in order to wait for. **Open in new window is a separate problem again** — `project-claim.ts` deliberately refuses to open one project in two windows, which is what stops two copies fighting over the same files, so that item means nothing until the claim is reworked to allow it on purpose.
