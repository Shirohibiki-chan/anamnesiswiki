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
| 30 | Home Dashboards & Quick Capture | 2026-09-13 |

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

**Phase 31 (Embedded players) is what comes next**, scoped 2026-09-13 the
same day Phase 30 closed: YouTube, YouTube Music, Spotify and SoundCloud on a
page and in the sidebar. It reverses a line this file held for two months —
see the section for why, and for the condition it came with. After it, what
remains is the deferred phases below (Cloud Sync and Split Panes) and Queued
Adjustments.

Two things Phase 12 left behind are in Queued Adjustments rather than here: the
About dialog and the app's default typefaces. Neither blocks anything.

---

---

## Phase 31 — Embedded Players

Scoped 2026-09-13. Her call, and a reversal: "no YouTube, Spotify or map
embeds" has stood since Phase 18's scope (2026-07-31), recorded in
`docs/handoff.md` § Meters and in `docs/shipped.md` under Phase 18 as hers and
aesthetic — the concern was never the network, which is ordinary now, but
that a video dropped into a page looks like a video dropped into a page. She
lifted it 2026-09-13 with the condition still attached: **YouTube, YouTube
Music, Spotify and SoundCloud, and they have to look like they belong.** That
condition is the phase. The list is closed; a fifth service is a conversation
first, not a line added to a table.

**What "belongs" means, decided up front so it is not decided per block.**
Each of the four services publishes an official embed — the player YouTube,
Spotify and SoundCloud hand out on their own Share buttons — and a raw one is
what looks wrong: a black rectangle with somebody else's chrome on it,
sitting at whatever size the site chose, in a page that is otherwise all
tokens and frames. So:

- **The player sits inside the same frame every other block gets** — the
  `block-frame` border, radius and panel colour — so it takes the theme the
  page has, and a snippet that restyles blocks restyles it too. Rounded
  corners are clipped on the player itself, not drawn around it.
- **YouTube is a still until it is played.** The block draws the video's own
  thumbnail at 16:9 with the title over it and a play mark, and only when
  that is clicked does the real player load into the frame. Three reasons: a
  page with five videos on it does not start five players when it opens;
  nothing from YouTube loads into her page until she asks for it, which is
  the first of the two promises kept without a rule; and the player's own bar
  of buttons is not on the page until something is playing. The player is
  the `youtube-nocookie` one. A playlist link plays as a playlist.
- **YouTube Music is YouTube wearing a different coat.** It has no embed of
  its own, but a `music.youtube.com` link shares its id with the same
  recording on `youtube.com`, so it plays through the same player. The card
  says YouTube Music and its link goes back to YouTube Music, because that
  is what she pasted.
- **Spotify's own embed is already a card** — album art, and a background
  colour taken from it — so it is shown as-is inside the frame, compact for a
  track and tall for an album, playlist, artist or episode, with the dark or
  light variant matched to the theme.
- **SoundCloud's player takes a colour, and gets the accent**, so its
  progress bar and buttons are the page's colour rather than orange. The
  artwork variant for a track, the list variant for a playlist.
- **Every block has a caption line under it, the way a picture does**, and
  resizes the way a picture does — drag the edge, aspect kept. A video is
  full-width by default; a track is not, because a bar the width of the page
  looks like a page-wide bar.
- **A block draws whole with the internet off.** Title, author and thumbnail
  are fetched once, when the link is pasted, through the service's oEmbed
  endpoint — the public "describe this link" call each of the four offers —
  and stored on the block. So offline the card is still the card: frame,
  service mark, title, author, thumbnail, and a *needs the internet to play*
  line where the player would be. Not a grey hole, and not a broken-image
  glyph. If the fetch fails at paste time the block keeps the link and says
  what it is by its address, and tries the fetch again next time it is drawn
  online.

### 1. The body block, with every way in

A `mediaEmbed` block in the page editor, ours in the way `pageColumns` and
the callouts are ours, holding the pasted link, the service and kind it
resolved to, the fetched title/author/thumbnail, a caption and a width.
Nothing else: the block is a link with a memory, and the player is drawn
from it each time.

- **Paste a link on an empty line and it becomes the block.** The four
  services' links in every form they hand out — `youtu.be`, `watch?v=`,
  `shorts/`, `playlist?list=`, `music.youtube.com`, `open.spotify.com`
  (track, album, playlist, artist, episode, show), `soundcloud.com` tracks
  and sets. Undo gives the link back as text. A link pasted into the middle
  of a sentence stays a link, because the sentence is what she was writing.
- **`/YouTube`, `/Spotify`, `/SoundCloud` and `/Embed` in the slash menu**
  each put down an empty block with a box for the link, for the case where
  the link is not on the clipboard yet.
- **The block's own menu**: open on the service's site, copy the link, retry
  the fetch, remove. Alignment is not offered; a player is full-width or
  centred and the width handle covers both.
- **The picture panel's Embed tab is untouched.** It is for pictures by URL
  (`CLAUDE.md`, decided 2026-08-11) and stays that.

### 2. The sidebar block — a character's theme

A `media` block kind in `node.blocks`, alongside `image`, holding the same
fields, drawn by the same renderer at sidebar width. This is the half that
turns the feature from "videos in a page" into worldbuilding: a character's
theme song in the infobox, a location's ambience beside its description, a
faction's anthem. The precedent is the picture — a BlockNote image in the
body and an `image` kind in the sidebar, two records because they sit in two
places — and the block gets everything a sidebar block already has: title,
colour, drag between sidebar and body and infobox, a place in a template,
export with the page.

- **At sidebar width the YouTube still is the whole block**, playing in
  place when clicked; Spotify at its compact height; SoundCloud in its
  smallest form. Nothing in the sidebar auto-plays or auto-loads, same as
  the body.
- **The Add Block menu offers it as *Music or video*** with the link box
  right there, and the block's menu is the body block's.

### 3. Import, export, and the record

- **`.lk` import turns LegendKeeper's YouTube and Spotify blocks into real
  embeds** instead of the plain link and the lossy note it makes of them now
  (`lk-import.ts`, the `extension` case), and its `SPOTIFY_SINGLE` property
  into a sidebar media block. Her 75-page world is the reason this phase has
  a step 3 at all.
- **Publish and HTML export carry the player** — the site is online by
  definition, and the still-until-played rule holds there too. Markdown
  export writes the link on its own line, with the caption after it, which is
  the form the importer turns back into a block.
- **The docs stop saying no.** `handoff.md` § Meters and the Phase 18 note in
  `shipped.md` get the reversal with the date and the condition;
  `CLAUDE.md` gets one line that the four services are the list.

### Order

1 → 2 → 3, each its own PR. The look is settled in step 1 and copied, not
re-decided, in step 2; step 3 is small once the two blocks exist and is the
step that touches her own world.

---

## Phase 32 — Boards, Full Pass

Scoped 2026-09-17, from LegendKeeper's own board tutorial ("Board Bastion",
nine panels). The ask: our boards have everything on it. The spike (shipped
2026-09-13, `docs/shipped.md` § Board spike) put Excalidraw in a page; this
phase is what sits between that and parity, audited panel by panel against
the library at 0.18.1 rather than from memory.

**Most of the tutorial is already there, because the library is.** Zoom on
Ctrl+wheel and pan on the wheel; the right-click menu with copy, paste,
select all, lock and unlock, unlock all, group, bring forward and back;
locking with Ctrl+Shift+L; every style on LK's panel — colours, fill
pattern, stroke width and style, font size S to XL — and several LK does
not offer; freehand, arrows, lines, shapes, text; pictures by drop, paste or
the tool, with cropping (double-click a picture; LK holds Ctrl while
resizing, the library has its own gesture, and either is fine); frames on F
with a label; grouping on Ctrl+G; save as PNG or SVG. A sticky note is a
filled rectangle with words in it, which is what LK's is too. Nothing here
is built; it is all checked as present and not switched off.

**What is not there, in the order it would matter to her:**

1. ~~**Page cards.**~~ Shipped 2026-09-18 — `docs/shipped.md` § Phase 32,
   step 1. A page put on the board, from the picker or dragged out of the
   tree, is a live card in one of three presentations by its size, and a
   second click on it opens the page.
2. ~~**A card is a button.**~~ Shipped 2026-09-19 — `docs/shipped.md` §
   Phase 32, step 2. A locked card, or any locked shape with a link, opens
   on one click anywhere on it, with the pointer cursor saying so first.
3. **Frames that nest and turn.** LK's frames panel: a frame inside a frame,
   and a frame at an angle — the tutorial's own example is a diamond-shaped
   frame with a straight frame inside it. Neither is in the library: it
   refuses a frame as a child of a frame (`addElementsToFrame` skips
   frame-like elements; upstream issue #8359, open), and it refuses to
   rotate one (`angle` is locked on frames and the resize handles hide
   the rotation grip). First written up here 2026-09-17 as not worth a
   fork; she overruled that the same day, and rightly — a frame is how a
   board gets its Canva-like layouts, and a frame that has to be straight
   and cannot hold another is a frame with the useful half missing. So
   this is the one step that patches the library rather than building
   beside it: `pnpm patch` on the package, kept small and named, with a
   scenario that fails the day an upgrade drops it. What the patch has to
   deliver: a frame dragged into a frame becomes its child; the parent
   moves, duplicates and deletes it with everything in it; the child is
   clipped by the parent as any other child is; a frame rotates with its
   label and clips its contents to the turned box. Third rather than last
   because the same patching path is what step 9 needs, and it should be
   proven on the step that matters more.
4. **Pictures through the world's library.** A picture dropped on a board
   is held inside `_board.json` as a data URL — three photos make a
   three-megabyte file, and Assets cannot see them. The ideas list has had
   this since the spike; it is step 4 because page cards and bookmark cards
   both draw pictures and should land on the right mechanism, not the
   temporary one. The Assets panel already drags a picture into a page;
   the board takes the same drag.
5. **Bookmark cards.** Paste a web address and get a card with the page's
   title, description and picture; click it and the address opens in the
   browser. Today a pasted address is a line of text with a link on it.
6. **A page opened on the board.** LK's "nested article": stretch a page
   card past a threshold and it stops being a card and shows the page's
   writing, editable, in the board. The biggest step and the one with the
   open question — see below.
7. **Boards in the exports.** A board is not in the Markdown, website or LK
   export. The Markdown and site exports carry a picture of it (the library
   draws PNG and SVG); the LK export names it in its lossy list, since LK's
   file has no shape for a drawing.
8. **Theme follows while open.** A board reads light or dark once, when it
   is opened; a theme switched with a board open is caught on the next
   visit. Small, and nobody has noticed.
9. **A moving GIF moves.** The library draws pictures to a canvas, so an
   animated one shows its first frame; LK's tutorial has one playing. The
   same kind of change as step 3 — the library's drawing, not the app —
   decoding the frames (Electron's engine has `ImageDecoder`) and
   redrawing while one is on screen. Rides on step 3's patching path;
   nothing rides on it.

**Five more, added 2026-09-17 after the second look.** LK's boards turned
out to be built on tldraw rather than Excalidraw (the twelve-colour grid,
S/M/L/XL, `/` for cursor chat, F for frames, Ctrl to crop — all tldraw's
stock UI), and tldraw is out for Anamnesis on licence alone: v1 is MIT but
dead since 2023, v2 is non-commercial and share-alike, v3 onward needs a
licence key with a watermark or a fee. So the question became what tldraw
gives LK that our library does not, and her answer was all of it, minus
other people's cursors. In the order they would matter:

10. **Sticky notes are a real thing.** Today a sticky is a filled box with
    words in it, which draws right and feels wrong: no colour swatch made
    for it, no growing as you type, no rich text. A *Note* tool in the
    board's top-right slot puts down a note in one of the twelve colours;
    it grows with its words; its words take bold, italic and links, a page
    link among them. Built as an embed drawn by the app (§ How page cards
    and bookmark cards are built), which is what makes rich text possible
    without touching the library's own text drawing.
11. **A highlighter.** A pen that is wide, see-through and drawn under the
    ink, for marking a region rather than writing in it. The library's pen
    with a preset — wide, half-opacity, multiply blend — offered as its
    own tool with its own shortcut (H), so it is a tool she picks and not
    three settings she remembers.
12. **Video on the board.** A video file dropped on the board — through the
    world's library, step 4's mechanism — plays where it lands, in a
    player drawn by the app inside an embed; a YouTube address pasted on
    the board already plays through the library's own embed. Phase 31's
    look applies: a still with a play mark until played, the page's frame
    around it.
13. **Several pages in one board.** tldraw's boards have tabs along the
    bottom, sheets in a workbook. Here a board is already a page that
    holds pages (`CLAUDE.md`'s standing rule — a board's sub-boards are
    in the tree like anything else), so the tabs are drawn
    from that rather than invented: a strip along the bottom of a board
    listing the boards directly inside it, with a + that makes one, and
    clicking a tab opens that board in place. No second notion of "page",
    nothing new on disk, and the tree stays the truth.
14. **Bold, italic and links in ordinary text.** The one on this list that
    is the library's own text drawing and so a patch, like step 3: the
    library lays text out on a canvas from one style per box. Notes (step
    10) carry rich text from the start, which covers the sticky-note case
    and most of what she would reach for; this step is the plain text box
    catching up, and comes last because it is the heaviest patch of the
    phase for the smallest visible change.

**Not in this phase, and why, so it is not re-asked:**

- **A map on a board.** LK nests its interactive maps with clickable pins.
  Anamnesis has no maps at all — not the template, not the pins — and a
  map is its own phase before it can be anything's card. Left out rather
  than deferred: nothing here is shaped for it.
- **Cursor chat, other people's cursors, and permissions.** All about
  several people on one board. This is one person's world on one disk;
  her call 2026-09-17 to leave these out when everything else went in.
- **Nesting a board in a board.** LK's tutorial says theirs cannot either.

### How page cards and bookmark cards are built

Decided up front so steps 1, 5 and 6 are one mechanism, not three. The
library has an *embed* element — a rectangle that holds a web page, drawn
by a host-supplied component when the host says the address is one it
knows how to draw (`renderEmbeddable`, `validateEmbeddable`). A page card
is an embed whose address is `anamnesis://page/<id>`, the link form the
spike already writes, drawn by a small React card that reads the page live
from the store; a bookmark is an embed holding the web address, drawn from
the title, description and picture fetched once and kept on the element
(`customData`), so it draws whole with the internet off — Phase 31's rule
for players, applied here. The library owns the element's box, moving,
resizing, locking, grouping, undo and the file on disk; the app owns only
what is drawn inside it. That keeps `docs/handoff.md` § Boards' first rule
— the app never reads inside an element — with one named exception: an
embed's address and its `customData`, which are the app's own.

**Putting a page on a board, two ways.** *Put a page on it* in the board's
top-right slot, the storyline's search box exactly, staying open for
several picks. And dragging a row out of the tree onto the board — the
tree's rows already drag for reordering, so the drop side is what is new.
The search box is the sure path and ships first; the drag is the one LK
leads with and follows in the same step.

**The card's three sizes are read off its box**, never stored: below one
width it is the icon, below another it is icon and name, above that it is
the picture with the name over it, in the style of the tree's own rows and
the page's banner. So resizing changes the presentation with nothing to
set, which is what LK's "resize the card" arrow means.

**The open question — step 6.** A page shown editable inside a board is a
second editor open on a second page while the board's page is also open,
which is the situation Phase 21.5 (Split Panes) was deferred over. Two
answers on the table: show the page read-only in the card with an *Edit*
that opens it properly (cheap, and honest), or mount the real editor in
the card (what LK does, and what the panel promises). Step 6 starts with
the read-only card and the question is put to her *with the card running*,
which is how design questions get answered here.

**What is verified before step 1 is called done, because the library's
embed has habits of its own:** an embed takes a first click to select and
a second to wake; a page card has to open on the second click and a locked
one on the first, or the "button" panel is not delivered. The library's
own link popup still shows the raw `anamnesis://page/…` string on a linked
shape (known since the spike); page cards make that popup a corner case
rather than the way in, which is the fix available without forking.

### Order

1 → 2 → 3 → 4 → 5 → 10 → 6 → 11 → 12 → 13 → 7 → 8 → 9 → 14, each its own
PR. Steps 1 and 2 are the tutorial's two big panels and ship first; step 3
is the first patch on the library and proves that path before anything
else leans on it; step 4 before step 5 so bookmark pictures never touch
the data-URL path; step 10 right after 5 because notes are the third
thing drawn by the app inside an embed and should be built while that
mechanism is fresh; step 6 after the question above is answered on a
running card. Steps 11 to 13 are independent of each other and of the
patches. Steps 7 and 8 are small and can go in either order. Steps 9 and
14 are the two remaining patches on the library and go last.

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
