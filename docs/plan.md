# Anamnesis — Implementation Plan

---

## Project Overview

Anamnesis is a Tauri v2 desktop app for local-first worldbuilding. React 19 + TypeScript in the renderer, Rust shell handling filesystem access. Data lives as JSON files on disk in a folder the user picks. BlockNote provides the Notion-style block editor. LegendKeeper's `.lk` export format is supported as a first-class import/export path so the user can migrate their existing world.

Work phases top-down. Do not start a phase until the previous one is complete and usable. Each phase should end with the app in a coherent, working state — not mid-refactor. Phases are sized to be reviewable as user-facing changes.

See `docs/spec.md` for the full spec, `CLAUDE.md` for architecture rules, and `docs/prototype/anamnesis.jsx` for a reference React prototype that demonstrates layout and tree behavior (its template content is filler — the real copy lives in `src/services/template-registry.ts`).

---

## Future Features

**Interactive atlas / maps**

LK's atlas — nested image maps with clickable pins that link to wiki pages — is the single feature Anamnesis intentionally doesn't ship in Phase 1. It's the most complex piece of LK to build well and the piece the user has said they use less than the wiki. If demand shows up (either from the user or from anyone she shares the app with), revisit as its own multi-phase project. Leaflet with custom CRS is the likely implementation.

---

**Timeline visualization (calendar-based)**

A view that lays out Event-template nodes on a chronological axis, with per-event pins that open the underlying page. **Superseded 2026-08-08, not cut.** The user's answer to "what happened when" is now **Phase 25 — Storylines**, which orders events by what leads to what instead of by date. That's a deliberate choice rather than a workaround: she doesn't think in calendar years, and a date field she can't fill is the thing that stops the writing.

The original blocker still stands if a calendar view is ever wanted anyway: Events have no reliable date data. `when` is a free string like "Year 872, Third Age," which nothing can sort, and a real date schema — one that copes with invented calendars — is the design work, not the chart. Storylines are the cheaper answer precisely because they need no such schema. Revisit only if she starts asking for years.

---

**Canvas / board / whiteboard**

Freeform spatial planning surface — LK ships one as "Board." Kept on the list at the user's request 2026-07-31. Nothing else in the plan depends on it, so it can wait indefinitely without blocking anything.

**The "largest single build in this document" estimate is withdrawn 2026-08-10.** It assumed writing a drawing surface from scratch. **Excalidraw** is the answer instead: MIT-licensed, embeds as a React component, works entirely offline, and stores a scene as plain JSON — which is the same promise the rest of the app makes about her files. Obsidian's Excalidraw plugin is the same move. That turns this from the biggest build here into an integration, and the remaining work is where a board *lives* in the tree and how a board links to pages, not the canvas itself. Still unscheduled; it's now cheap enough to schedule whenever she wants it rather than something to be talked out of.

**It is not a prerequisite for Phase 25 — Storylines**, and the two must not be collapsed into one job. They share pan, zoom and drag-a-thing-somewhere, which is the smaller part of either. A storyline's nodes are *pages* and its edges *mean* something ("this leads to that"), so it needs a graph that knows what it's holding; a board deliberately holds anything and knows nothing about it. Building storylines out of a drawing tool would give up the part that makes it useful.

---

**World Anvil import**

Investigated 2026-07-31 against a real export (`World-Orynthia_ Fragments of Fable-2026-07-31.zip`) and **dropped for now** by the user. Recording the findings so the next look doesn't start cold:

- The export is a zip of one JSON file per entity, keyed by `entityClass` / `templateType` (`Person`, `Article`, `Category`, plus Timeline, Map, Manuscript, VariableCollection). Tree structure comes from categories, which nest via their own `parent`, plus `articleParent` for sub-articles. Template inference is easy — `person` → Character, and the rest line up similarly.
- **Content is BBCode** — `[p]`, `[h3|uuid]`, `[hr]`, `[articletoc]`. This is the expensive part. It shares nothing with the LK importer, which speaks ProseMirror; it's a second parser from scratch.
- **The export is not clean UTF-8.** Real observed damage in the sample: "they're" arrives as `they<?>re`. An importer that doesn't repair this mangles every apostrophe in the world.
- Portraits and covers are URLs on WA's servers, not files in the zip — same fetch-on-import shape the LK importer already uses.
- Manuscripts, maps, timelines and `{{user}}` variables have no home here and would need flagging as skipped in the preview.

**Worth salvaging even though the importer is dropped:** WA's Person template carries ~120 typed fields (age, pronouns, eyes, hair, height, species, family, relations, motivation, vices, quirks…). That list was the source for Phase 13's default property suggestions, mined *selectively* — WA's own reputation for bloat is the cautionary tale, so `constants/property-suggestions.ts` carries about a dozen per template rather than everything imaginable. The same rule applies if the list is mined again for anything else.

---

**Browser version**

The user raised this 2026-07-31 — not for herself, but so people who won't install an unknown `.exe` can still look at a world. **Phase 1.5 (Publish) already covers that need** and needs no re-architecture; check whether it's satisfied before considering anything further.

A genuinely editable browser build is a different animal: `filesystem-service.ts` talking to the user's disk through Tauri *is* the storage layer, and a browser can't do that. It would mean either a real backend or a much more limited "your world lives in this browser" mode. Not a build flag. Deferred, and related to Phase 2 below.

---

**Cloud sync (Phase 2)**

Supabase-backed sync for users who want multi-device access without shared-folder tools. Free tier is enough for two people; adds a real backend and auth. Deferred until the shared-folder approach (Dropbox / Syncthing) demonstrably stops meeting the user's needs. Do not scaffold in Phase 1.

---

## Queued Adjustments

- **Duplicate doesn't work on a multi-selection.** The right-click menu hides it
  above one selected row rather than looping `duplicateNode`, which writes
  through `saveNodes` without a relocation pass — adding several nodes at once
  can shift colliding siblings' suffixes the same way deleting them does, and
  that path hasn't been worked through. Bulk delete, move, and colour are all
  supported. Fix by giving duplicate the same batch treatment as
  `deleteNodes`/`moveNodes` (see `docs/handoff.md` §Storage). **Scheduled into
  Phase 15**, which reworks that menu anyway — no reason to open it twice.

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

Phases 0–13 are complete. **`docs/shipped.md`** has what each one delivered;
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

**Not scheduled against Phases 11+ below.** It can land whenever the user wants it; nothing after it depends on it. Its one live argument for going sooner is that it's the existing answer to "people won't install an unknown `.exe`" — see Future Features → Browser version.

---

# Phases 11+ — planned 2026-07-31

Everything below comes out of one planning session: the user brought a list of roughly thirty wants plus screenshots of LegendKeeper's current UI, and the answers to nine scoping questions are baked into the phases rather than left as open questions. Where a phase records a decision, the decision is hers and doesn't need re-litigating.

**Two framing decisions that shape the ordering:**

1. **The "UI overhaul" is two jobs, not one.** The *look* (colour, type, spacing, icons, naming) is CSS tokens and is cheap — done early, everything built afterwards is born looking like Anamnesis. The *layout* (left rail, splittable columns, tabs) rewrites the app shell and touches components that don't exist yet — done early it gets done twice. Hence Phases 11–12 up front and Phase 21 near the end.

2. **The identity pass is deliberately made reversible before it's attempted.** The user's stated blocker was being "extremely picky" with no fixed idea yet. The answer is to ship the theme switcher *first*, so a visual direction becomes a file that can be tried and deleted rather than a one-shot commitment, and then to present complete running directions to react to instead of asking for a design from a blank page. If a future session finds itself asking her to describe what she wants in the abstract, it has taken a wrong turn.

---

**Phases 11, 11.5, 12 and 13 are done** — the identity pass, the design system
beneath it, themes, and property types. Their detail is in `docs/shipped.md`;
what still binds the code is in `docs/handoff.md`. **Phase 14 is next.**

Two things Phase 12 left behind are in Queued Adjustments rather than here: the
About dialog and the app's default typefaces. Neither blocks anything.

---

## Phase 14 — Everyday Navigation

Small things, felt daily. Independent of each other; safe to ship piecemeal —
and being shipped that way, one PR per bullet.

- ~~**Back / forward / home buttons**~~ — 2026-08-10. `navigation-service.ts`
  holds the stack, the store records a visit inside `selectNode`, and the three
  buttons sit at the left end of the top bar, which had been held empty for
  them since Phase 11.5. **The decision that binds: `selectNode` is the single
  choke point.** Back and forward move the cursor over the stack without
  recording, everything else records by using the action it already uses — so a
  navigation added in a year gets its history entry for free rather than by
  remembering a second call. Session-only, and pruned when a page is deleted;
  the reasoning for both is in the service's own header. It also relaxed the
  shortcut rules by one notch: Alt with a *named* key skips the Ctrl/Cmd
  requirement, since it can't produce a character. **Known cost, written down
  rather than solved:** Alt+←/→ are move-by-word inside a text field on macOS,
  so a Mac user has to rebind. Per-platform defaults are the fix if that ever
  matters.

- **Focus a folder as the top of the tree**, with a path bar above it to climb back out. Right-click → *Focus here*, and that folder's contents sit at the root; the path bar is the way back. This is the answer to nesting that has gone too deep to read — the user hit it at nine levels, where the names are gone entirely and only indent is left. It's the same move the universe selector makes (Phase 22), one level down, and the two compose: focus inside whichever universe you're in.

  **Three cheaper things already take the pressure off**, which is why this is one Phase 14 line and not its own phase. Indent guides and an 18px indent shipped 2026-08-08 and buy back most of a name at eight levels. The universe selector removes two levels from the AU tree on its own. Focus is for what's left.

  **Obsidian's Breadcrumbs plugin is not this.** Raised by the user 2026-08-08 and checked: it never touches the file explorer. It builds note-to-note hierarchies out of frontmatter and gives trail, matrix, prev/next and diagram views over them. Most of what it does is already in this plan under other names — the trail is the clickable breadcrumb already sitting above every page title (`page/PageTitle.tsx`), its tree and matrix views are Phase 18's Subpage Index and Backlinks blocks, prev/next chains are Phase 25's storylines, and its diagrams are Phase 24's graphs. Nothing left to lift from it.
- **Double-click expands a folder**, and rename moves to the right-click menu. Note this is a *swap*: `TreeItem.tsx` already renames on double-click (react-arborist's default). Ships with a setting to put it back.
- ~~**Resizable sidebars**~~ — 2026-08-10. Both edges drag, with arrow keys and
  a double-click reset as the alternatives; widths persist in `app-settings`,
  app-level rather than per-project like everything else about how it looks.
  **The two decisions that bind are in `docs/handoff.md` §Layout**: the handles
  are positioned against the grid rather than inside the panels, because the
  properties panel is a scroll container and a handle inside it scrolls away
  from its own edge; and the column transition has to be switched off mid-drag,
  which is measured rather than assumed. The minimums are "the panel can still
  do its job" — **dragging is not a way to hide a panel**, and shouldn't become
  one.
- ~~**Show in system explorer**~~ — 2026-08-10.
- **Hover previews** on wikilinks and mentions. The README already claims these exist; they don't.
- ~~**"Create new" landing page**~~ — 2026-08-10. Every route to a new page —
  the tree's "+", the right-click item, the folder view's button, the keyboard
  shortcut — now makes an untitled blank page and opens it, with the template
  grid on the page itself and the title already in edit mode. The popover that
  used to ask first is gone from all four, and `NewPageDialog.tsx` with it; the
  properties panel keeps its own copy for a blank page deciding late what it is.
  **The decision that binds is in `docs/handoff.md` §Storage**: a template
  carries whether a page stores itself as a file or a directory, so applying one
  moves the page on disk and has to go through the relocation planner rather
  than a plain save.
- **Bookmarks rail** — pinned pages as icon tiles under the tree search, fed by
  "Set as shortcut" from Phase 15. **This is the one bullet here that isn't
  independent:** it has nothing to render until the thing that pins a page
  exists. Either take it last, after Phase 15, or build the pin with it — don't
  start it expecting the rest of the phase's freedom.
- **The small-friction batch**, lifted from Obsidian 1.13's own list. Each is a line or two, none depends on the others, and they're the kind of thing that's only ever felt as vague clumsiness rather than reported as a bug — which is why they're written down rather than left to be noticed:
  - `Escape` cancels a rename and **leaves the tree focused** (today focus escapes with it);
  - `Escape` clears the current selection;
  - auto-reveal doesn't fire while a file or folder is being renamed;
  - `Shift`-arrow extends a multi-selection from the keyboard;
  - `Ctrl-N`/`Ctrl-P` move through suggestion lists — the wikilink autocomplete, the quick switcher — on every platform, not just macOS;
  - closing the quick switcher or command palette with `Escape` restores the selection that was there before it opened.

---

## Phase 15 — Right-Click Menu, Full Pass

From the user's screenshot of LK's node menu, minus what doesn't apply to a single-user app.

Convert to template · Export (per node) · Move ▸ · Sort sub-pages ▸ · Set as shortcut · Hide · Collapse all · Expand all.

**Skipped:** "Edit permissions" — multi-user, not us.

Fold in the queued **duplicate-on-multi-selection** fix while in here; it's the same menu and the same batch-relocation problem `deleteNodes`/`moveNodes` already solved.

---

## Phase 16 — Images & Tags

- **Image slot buttons**, per the user's screenshot: change image, reposition, expand to lightbox, ALT text, Set cover. The remove **×** becomes hover-only. Note the *banner* already has upload, drag-to-reposition and hover-× (`PageBanner.tsx`) — this phase is about the sidebar portrait, which doesn't.
- **What the lightbox actually does**, taken from Obsidian 1.13/1.14 rather than designed from nothing — the bullet above said "expand to lightbox" and stopped there. Three details, and they're what separates a big picture from something usable on a character page with six portraits on it:
  - **the file name of the current image is shown**;
  - **arrow between every image embedded in the current page**, not just the one clicked;
  - **click and drag to pan** within a zoomed image.
- **Keyboard control of images in the editor**, same source. Select an image with the keyboard; `+`/`-` resize it, `0` resets, backspace deletes it, `Enter` edits, `Ctrl/Cmd-C`/`X` copy or cut. Paired with a change worth copying for its own sake: Obsidian *stopped* auto-expanding an image to reveal its filename when the cursor moves near it. That flicker is cheaper never to build than to remove later, so **don't build the auto-expand**.
- **Tag picker** — a search box over a checkbox list of every tag in the project, reached from a **+** next to the existing chips.

---

## Phase 17 — Templates & Assets Tabs

The two greyed-out tabs in `TreeSidebar.tsx`.

- **Templates tab, powered by "Convert to template"** (Phase 15). The user chose this over a dedicated template editor 2026-07-31, and it's the better trade: templates get designed in a real page rather than in a settings form, and there's no second editing surface to build or maintain. This supersedes the old "user-editable templates" Future Feature.
- **Assets tab** — the image organiser over the project's `assets/` directory.

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

JSON and HTML are separate and lower priority. World Anvil is dropped (see Future Features).

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

Sequence-based narrative trees, asked for 2026-08-08. **This is the app's answer to "what happened next," and it replaces the calendar timeline** rather than sitting beside it — see Future Features → Timeline visualization.

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

## Phase 2 — Cloud Sync (Deferred)

Only if the shared-folder sync approach demonstrably stops working. Options in preference order: Supabase (hosted Postgres + auth), Yjs + y-webrtc (P2P CRDT), self-hosted sync server.

Do not scaffold in earlier phases. The file-per-node data model already sets us up well for any of these.
