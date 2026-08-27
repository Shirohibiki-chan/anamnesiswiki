# Anamnesis — Implementation Plan

---

## Project Overview

Anamnesis is a Tauri v2 desktop app for local-first worldbuilding. React 19 + TypeScript in the renderer, Rust shell handling filesystem access. Data lives as JSON files on disk in a folder the user picks. BlockNote provides the Notion-style block editor. LegendKeeper's `.lk` export format is supported as a first-class import/export path so the user can migrate their existing world.

Work phases top-down. Do not start a phase until the previous one is complete and usable. Each phase should end with the app in a coherent, working state — not mid-refactor. Phases are sized to be reviewable as user-facing changes.

**Position is the running order; the number is only a name.** A phase gets its number when it's written down, so a phase that gets pulled forward keeps its number and moves up the file — Phase 27 sat above Phase 18 for exactly that reason until it shipped. Read the order off the page, not off the digits, and when something moves, move the section rather than renumbering everything below it.

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

- **An Electron build and the released Tauri build are both 0.5.0.** v0.5.0 is
  published and is the Tauri app; the Electron work has been running under the
  same version the whole time, so the two are indistinguishable by filename, by
  the version the app reports, and by the settings they share. Found 2026-08-26
  while handing a Linux test build to somebody who already had 0.5.0 installed —
  the two AppImages differ by 60MB and by nothing a person can see.

  **Bump the version before Phase 29 ships anything.** `latest-linux.yml` in an
  Electron build already describes itself as 0.5.0, so publishing one puts a
  second, different 0.5.0 into the update feed of a release that exists.

  **A bug report now names the shell, which is not a fix.** `shellName()` went
  into the host contract on 2026-08-27 so a report says *Electron build* rather
  than only *0.5.0* — that makes an arriving report readable, and does nothing
  about two files on a disk, two entries in a settings store, or an update feed
  with two 0.5.0s in it.

- **The two panel width caps do not add up to a window.** `TREE_MAX_WIDTH` is
  520 and `PROPERTIES_MAX_WIDTH` is 560, which is 1080 — wider than the 900 the
  window itself will not go below. The comment above them in
  `constants/layout.ts` says the caps exist so that "two panels dragged wide on
  a small window" cannot leave the centre column with no room to render in, and
  at the minimum window size they do not achieve that: both dragged full leaves
  the centre column at nothing. Found 2026-08-26 while fixing the top bar, which
  is the first thing that breaks when it happens — the container query there
  buys the bar 95px, and 95px is no help against a column of zero.

  **Not fixed because the fix is a choice**: capping each panel as a share of
  the window changes what dragging does at every size, and clamping only at the
  bottom end makes a panel move on its own when the window shrinks. Either is
  reasonable and neither is invisible.

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

- **There is no error boundary anywhere in the app**, so anything that throws
  while rendering unmounts the whole tree and the window goes blank with no
  message. Confirmed by search 2026-08-21 — no `componentDidCatch`, no
  `getDerivedStateFromError`, nothing. This has always been true and has become
  more expensive since Phase 18a: a sidebar is now an arbitrary list of blocks,
  so one bad block on one page can take the entire app down rather than
  spoiling one field. **The fix is a boundary around the parts that can be
  re-entered** — the block panel and the page view — rather than one at the
  root, since a boundary at the root can only offer a reload, while one around
  the panel can say which block failed and leave the rest of the app usable.
  Phase 19 territory; it is the same argument as version history, which is that
  this app's failures should be survivable rather than merely rare.

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

  **Confirmed 2026-08-21, and the diagnosis above is right.** He ran it again
  and reported three things that settle it:

  - The bare AppImage dies with `Could not create default EGL display:
    EGL_BAD_PARAMETER. Aborting...` before a window ever appears.
  - `LD_PRELOAD=/lib64/libwayland-client.so.0 ./Anamnesis_0.3.0_amd64.AppImage`
    **runs**. Forcing the host's own copy of that one library is the whole fix,
    which pins the failure to the bundled `libwayland-client` and nothing else.
  - **The `.rpm` works** on the same machine. So this is our bundle, not his
    system, not his GPU, and not webkit.

  **He is the verification.** This repo still has no machine that reproduces it
  and CI runs the Ubuntu that produces the bad bundle, so the rule above stands
  — but the "ask him first" half is now done, and a fix can be built and handed
  to him to run.

  **The fix has a complication worth knowing before starting.** Removing the
  offending libraries has to happen *before* Tauri packages the AppImage, or
  the update signature no longer matches the file: `.sig` is generated over the
  bundled artifact, so unpacking, deleting and repacking afterwards produces an
  AppImage every existing install refuses to update to. Tauri's bundler exposes
  no hook between building the AppDir and sealing it, so the options are
  really:

  1. **Repack and re-sign in CI**, using `tauri signer sign` after the fact.
     Correct, and it puts a second signing step in the workflow.
  2. **Build the AppImage ourselves** rather than through `tauri-action`, with
     `linuxdeploy` and its excludelist. Most correct, most work.
  3. **Stop shipping an AppImage** and offer `.deb` and `.rpm`, which both
     work. Cheapest and least satisfying; it drops the one Linux artifact that
     runs anywhere.

  Whichever way, ship it to him as a draft-release artifact and let him run it
  before it is published.

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
**Phase 19 is next**, and it is the next one in this file.

Two things Phase 12 left behind are in Queued Adjustments rather than here: the
About dialog and the app's default typefaces. Neither blocks anything.

---

## Phase 29 — The Shell

**Scoped 2026-08-25. Replace Tauri with Electron.** The app keeps its own
Chromium instead of borrowing whatever browser engine the operating system
happens to have.

### Why, in the order the reasons actually matter

- **Linux is a real platform for this app, and it has the worst engine.** Her
  partner runs it on two Fedora machines — one current, one old — having moved
  off Obsidian because she suggested this instead. **She intends to move to
  Linux herself.** So Linux is not a build target nobody runs; it is where this
  app is heading.
- **Tauri borrows the OS webview**, which means Chromium on Windows, WebKit on
  macOS and WebKitGTK on Linux. Three engines, one of which lags badly and none
  of which she can update on a user's behalf.
- **This is already biting, today.** The spectrum meter's wrapping word fields
  need CSS `field-sizing`, which WebKitGTK only shipped in 2.52 (March 2026).
  On the older Fedora box those fields draw one line and clip the rest — worse
  than the truncation they replaced, and invisible from Windows. A fallback
  ships separately and immediately; it is a patch over the real problem.
- **Phase 19 is the reason to do this now rather than later.** Snapshots and
  file recovery are the most filesystem-heavy work left in this document, and
  the filesystem layer is exactly what a shell swap rewrites. Building 19 on
  Tauri and then moving it is doing it twice.
- **The switch does not get cheaper by waiting, and barely gets dearer.**
  Measured 2026-08-25: 235 source files, ~41,600 lines, of which **ten files
  touch Tauri at all**, across about seventeen call sites, plus 22 lines of
  hand-written Rust. Feature work lands in the other 225 files. What grows the
  coupled surface is new *kinds* of OS access — which is precisely what Phase 19
  would add.

### What is accepted, deliberately

- **More memory, and a bigger installer** — roughly 8 MB → ~150 MB, and a
  heavier process tree. **Her answer, 2026-08-25: anyone who wants a light
  version can use the eventual browser edition.** That is the trade being made
  on purpose, and it raises the browser edition from "someday" to "the other
  half of this decision" (`docs/ideas.md` → Browser version).
- **One manual reinstall each.** A Tauri installation cannot auto-update into an
  Electron one — different updater, different signing. Both existing users
  install once by hand; updates resume normally after that.
- **Losing Tauri's capability scoping.** It enforced the network policy that was
  retired the same day, so there is nothing left for it to enforce.

### What is explicitly not in scope

**The data format does not change.** Same JSON, same folder-per-node layout,
same `assets/`. A world written by the Tauri build opens in the Electron build
untouched — if that ever looks like it needs to bend, stop and raise it.
No feature work rides along. No visual changes.

### Where it has got to

**Steps 1 and 2 have shipped.** Every Tauri call is behind
`services/host-service.ts` (PR #272), and `host-service.electron.ts` plus
`electron/` implement the same contract over Electron and Node — verified
running: the real window opens, reads her projects off disk, round-trips text
and binary files, watches a directory, and closes through the save-on-exit
handshake.

**Most of step 3 has shipped too**, later the same day and after this section
was last written: `electron-builder.yml`, `release-electron.yml`, the updater
on `electron-updater`, and `docs/releasing.md` rewritten around all of it.

What is genuinely left is the part that can only be settled by running it:

- **No Electron release has actually shipped.** The pipeline can be exercised
  without spending a version number — Actions → Release (Electron) → Run
  workflow attaches installers to the run instead of publishing — and that has
  not been done.
- **The Linux AppImage is unproven on the machine that had the problem.**
  Tauri's bundler sealing the host's graphics libraries into the AppImage was
  the original crash; electron-builder builds its own, so the cause should be
  gone. Nobody has run one on the older Fedora box to find out.
- **`release.yml` and `appimage-test.yml` are still there**, kept as a way back.
  They go once an Electron release has shipped and settled.
- **Usage reporting: built 2026-08-26, removed 2026-08-27.** Kept here as a
  settled decision rather than deleted, so it does not get proposed a third
  time.

  It worked, and it was honest — a closed list of eight event names that could
  not carry her writing, a one-time notice with two real buttons, a visible
  switch. It went anyway, and the reasons are the part worth keeping:

  - **The numbers would not have said much.** A handful of users, one of whom
    she talks to daily. Asking them answers more, and sooner, than a dashboard
    of counts drawn from a sample that size.
  - **"It sends nothing" is worth more than the counts were.** People arrive at
    this app from Notion and from Obsidian, and the second one wins them partly
    by collecting nothing at all. A data modal on first launch is a strange
    thing to hand somebody in the middle of that trade.
  - **Checking the neighbours cut the other way from how it looked.** Notion
    and LegendKeeper collect plenty and have no switch, because they are
    websites and there is nothing to opt out of short of leaving. Obsidian has
    no switch because it collects nothing. Nowhere in that does a desktop tool
    come out ahead by having a toggle.

  The Aptabase account goes with it. `.env` was committed, so the key is in the
  history — it is a write-only ingest key rather than a secret, but the app it
  points at should be deleted rather than left listening.

- **Settings → Report a bug (the Privacy tab, renamed 2026-08-27) says nothing
  about collection or the network, and that is deliberate.** Same day, hours after the page was written.

  It briefly held two more sections: one declaring that the app collects
  nothing, one listing the two times it reaches the network. Both were
  accurate. Both were also promises, and neither subject is settled — usage
  reporting is a thing she may want again if the app finds an audience worth
  measuring, and what it fetches will grow as features land. A page that has to
  be walked back later costs more than a page that never made the claim, so the
  claims came out rather than being hedged.

  **Do not re-add them as a selling point.** Collecting nothing is a good
  property and a bad advertisement: the moment it is written on a screen it
  becomes a thing to retract. The constraint itself is unchanged and lives in
  `CLAUDE.md` → Two Promises, where it governs what gets built rather than what
  gets said.

  What stays is the crash log section, because it describes rather than
  promises: where the file is and what goes in it, which is what somebody needs
  in order to find it and pass it on.

- **Crash reporting, and it never leaves the machine.** Her call 2026-08-27,
  the one piece of the above she did want, and now built.

  **Nothing caught a crash before this.** No error boundary, no
  `window.onerror`, no handler for a rejected promise anywhere in `src/` or
  `electron/` — a crash in the tree was a white window and no explanation. That
  was the real gap, and closing it was worth doing whether or not anything is
  ever sent anywhere.

  - `components/shell/ErrorBoundary.tsx` wraps `<App />` from `main.tsx` rather
    than sitting inside App, because a boundary cannot catch a throw from the
    component it is written in.
  - `components/shell/CrashScreen.tsx` is what the white window became: what
    happened, that the files on disk were not touched, a restart, and a button
    that copies the details. The trace is shown rather than hidden, because
    nothing is being sent and there is nothing to be coy about.
  - `services/crash-log-service.ts` keeps the last five in `crash-log.json`
    beside the settings, through the same `openKeyValueStore` door the settings
    use — no new shell capability, so it works the same under both shells.
  - **The two global handlers record and do nothing else.** A rejected promise
    usually leaves the app perfectly usable, and blanking the window over one
    would be a worse bug than the one being reported. Settings → Report a bug
    is where those become findable, and it can copy the last one.

  **Why not the automatic kind.** A stack trace carries error messages, and
  this app's error messages carry file paths — which carry world names and page
  titles. The usage events could be *proven* content-free by reading a list of
  eight strings; a crash report can only be scrubbed and hoped over. Showing
  somebody the text and letting them press the button is the version with no
  hoping in it — and it is why the record can afford to be complete.

  **Still open**: nothing renders the panel on purpose yet, so the only proof
  it works is a test and a hand-thrown error. A scenario in `pnpm test:app`
  that throws inside the tree and asserts the panel is the obvious next step.

### The work, in three steps

1. **One door.** Pull those seventeen call sites behind a single module, so that
   nothing outside it knows which shell is underneath. This is architecture rule
   5 (`filesystem-service.ts` is the only file that touches disk) finally
   enforced — nine other files quietly break it today: `constants/paths.ts`,
   `hooks/use-save-on-exit.ts`, `hooks/use-updates.ts`, `main.tsx`,
   `services/app-settings-service.ts`, `services/dialog-service.ts`,
   `services/lk-import.ts`, `services/update-service.ts`, `state/project-store.ts`.
   **Worth doing on its own merits even if the rest is never built**, and it is
   day one of the swap either way. Ships as its own PR, no behaviour change.
2. **The Electron side of the door.** A main process implementing the same
   contract over Node: file reads and writes, the native dialogs, settings, the
   window. Node's `fs` is richer than the plugin, so this is mostly narrowing,
   not inventing.
3. **The pipeline, which is the real work.** `electron-builder` for Windows,
   macOS and Linux; the updater and its feed; rebuilding `.github/workflows`
   and `docs/releasing.md`. This is the part that took the longest last time
   (see the AppImage saga) and it should be estimated as the bulk of the phase,
   not the tail of it.

   **Nothing is code signed, and that is a decision rather than a gap** — see
   `docs/releasing.md` § *Nothing is code signed, on purpose*. The Tauri builds
   were never signed either, so this is the same position written down, not a
   change. Don't re-add signing to this list.

### Unknowns, all since settled

Kept because the answers are the useful part:

- **The updater moved to `electron-updater`'s own feed.** It verifies the
  SHA-512 published in the release feed, fetched from GitHub over HTTPS, rather
  than a key she holds. Tauri's minisign key is unused; the secret is harmless
  where it is until `release.yml` goes.
- **macOS notarisation does not apply**, because nothing is signed. The cost is
  that a Mac will not open the app from a double-click and its updates have to
  be installed by hand — both written up in `docs/releasing.md`, and both
  things to say in the release notes when there is a Mac build.
- **`pnpm tauri:inspect` did not disappear; it grew a twin.**
  `pnpm electron:inspect` opens the same kind of debug port on the Electron
  window (PR #277), which is what made the tree-scroll bug measurable rather
  than a matter of opinion.

---

## Phase 19 — Safety Net

**Runs after Phase 29** — see that phase for why: this is the most
filesystem-heavy work left, and the shell swap rewrites the filesystem layer.

Unglamorous and probably the highest-value work in this document. This app has already lost user data once (`docs/handoff.md` §Storage).

- **Version history / snapshots / file recovery.** Local, on disk, in keeping with everything else. **Obsidian's "File Recovery" is the shape to copy**, rather than designing one: automatic periodic snapshots kept on disk, a per-file list of past versions you can browse and restore, and arrow-key navigation through that list (the keyboard part is new in 1.13). Copying a known-good model matters more here than anywhere else in this document, because this is the feature that exists to catch the failure that already happened once (`docs/handoff.md` §Storage) and a half-designed version of it is worse than none — it would be trusted.
- **Undo for the right-hand panel** — carried over from Phase 10, still the one part of the app a mistake can't be taken back in. A dedicated store action per operation, the way `setNodeColor` did it.

---

## Phase 28 — Blocks in the Page

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
- **Decide where such a block's data lives before writing any of it.** A block
  in the page could keep its record in `node.blocks` and let the document hold
  a pointer, or move into the document outright. The pointer version keeps one
  answer to "what blocks does this page have" and makes dragging between the
  two places a move rather than a conversion; the document version is simpler
  to write and forks the model. **Prefer the pointer**, and be sure before
  committing — this is the decision that is expensive to change later.
- **Width is per-block and belongs on the block**, not on the page. It is the
  one piece of presentation the sidebar has no use for, so it needs a sensible
  reading when the same block is shown in a 340px panel: ignore it there.
- **Not to be confused with Phase 21's splittable columns.** That rearranges
  the app's panels; this puts one block inside the document. They meet only in
  that both make the middle of the window less fixed than it is today.

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
