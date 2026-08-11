# Why The Code Is Like This

Constraints and decisions that still govern the code. Every entry here is
something that would be re-broken by someone who didn't know it — a workaround
that looks removable, a trade-off that looks like an oversight, a choice made
for a reason the code can't state on its own.

**Inclusion test:** *if someone were about to change this, would reading this
stop them making a mistake?* If yes, it belongs here. If it's a record of what
was done and how long it took, it belongs in `docs/shipped.md`, which nothing
reads by default.

Kept short on purpose — this file is read most sessions.

---

## Where We Are

**Phases 0–13 are done. The app is shippable**, and **Phase 14 (Everyday
Navigation) is next.** `docs/plan.md` has phases 14–26 plus the unscheduled
Phase 1.5 (Publish); `docs/shipped.md` has what each finished phase delivered.

The most recent ones are the ones a new session is most likely to touch.
**Phase 12 — Themes & Appearance — closed 2026-08-09**: user-writable `.css`
themes, seven built-ins, in-app colour and gradient pickers, snippets, text
scaling, and search in Settings. **Phase 13 — Property Types — closed
2026-08-10**: number/select/multi-select/status, per-page reordering, and the
project-wide All properties & tags view. The parts of both still binding on the
code are in §Product decisions below — the CSS-vetting rule, the contrast floor,
and everything under properties and chip options.

Further back but still load-bearing: **Phase 9 — LK Export — shipped
2026-07-31**, so the format goes both ways; §LK export has the constraints that
govern it and §Known gaps has the one thing it doesn't prove. **Phase 10 closed
the same day** — search, keyboard shortcuts and rebinding, sidebar undo/redo,
and releases that build and sign themselves for four platforms on a tag push.
§Search, §Shortcuts, §Undo and §Updates below are the parts of that still
binding on the code.

A structural code review, a disk-I/O pass, and a documentation accuracy pass all
ran on 2026-07-30. What they changed is in `CHANGELOG.md`; what they *concluded*
is below.

---

## Storage

- **A directory's ownership must never come from its current name.** Folders and
  nestable pages carry a `_folder.json` / `_page.json` marker; that marker is what
  identifies the owner. Matching by filename instead — which is how Phase 1 did
  it — silently orphans every child the moment the node is renamed or a sibling's
  collision suffix shifts. This has already been shipped broken once.

- **Don't set `alwaysDirectory: true` on `note`** (or any other flat template) to
  solve a nesting problem — nesting doesn't need it, and hasn't since 2026-08-10.
  The flag means "a directory even when empty", so flipping it moves every
  existing note from `Name.json` to `Name/_page.json` — a silent on-disk
  migration of the user's real data, with no migration step written. It was
  called `canHaveChildren` until the same date.

- **A template change can move a page's file, so it goes through
  `relocateNode`, never a plain save.** The template carries `alwaysDirectory`,
  so giving a page one can flip it between `Name.json` and `Name/_page.json`
  while its name and parent stay exactly as they were. `updateNode` would write
  at the newly-resolved path and leave the old file behind — one node, two files,
  and the next load reads both. Only the relocation planner sees the shape
  change. This stopped being an edge case when pages started being created blank
  and given a template afterwards: it is now the ordinary path for every new
  page, not a rare conversion.

- **Collision suffixes are recomputed, never stored**, so changing one sibling
  renumbers the others. `planRelocations` exists solely to keep disk in step with
  that; deleting it reintroduces two directories claiming the same node id.

- **Adding a node runs the relocation planner too, not just a write.** This is
  the least obvious consequence of storage shape depending on having children:
  a page gaining its *first* child stops being `Name.json` and becomes
  `Name/_page.json`, and creating that child is by far the commonest way it
  happens. `fsService.addNodes` is the add counterpart to `deleteNodes` and
  every add path goes through it — create, duplicate, and undoing a delete.
  Relocations run **before** the new files are written, since those are resolved
  against the finished layout.

  Skipping it doesn't fail loudly. The child lands in `Name/` correctly (`mkdir`
  is recursive) while the parent's file stays flat beside it: one node claiming
  two places, every later path resolution computing a directory form that was
  never created, `os error 2` on the next rename, and on the next load a
  marker-less `Name/` whose contents `walkEntries` hoists up a level. Shipped
  exactly this way on 2026-08-10 and hit within the day.

  **`saveNodes` is not the same thing** and is only for writing into a graph
  that already accounts for the nodes — an import building a world from nothing.

- **Deleting or moving several nodes is one call, never a loop over the
  single-node one.** This follows directly from the line above: every delete and
  every move ends by renumbering colliding siblings across the *whole* graph, so
  a second single-node call resolves its target against a layout the first call
  has already rearranged — it removes the wrong file, or renames a path that
  isn't there. `deleteNodes`/`moveNodes` resolve every path against one
  pre-change index and relocate once at the end. The store mirrors the same
  split, and its `deleteNode`/`moveNode` are now thin wrappers. Multi-select in
  the tree is what made this reachable; the batch tests in
  `filesystem-service.test.ts` are the guard.

- **Only the *roots* of a removal go to disk.** A selection can hold both a
  folder and something inside it, and a directory-storage node takes its whole
  subtree with it — passing the child as well tries to remove a path its parent
  already took. The store filters to nodes whose parent isn't also being
  removed.

- **A relocation that fails puts back everything it had staged.** Several nodes
  swapping paths are renamed to temp names first so none lands on another's; if
  any rename then fails — and on Windows they do, transiently, when a sync
  client has a directory open — the staged ones are returned to their original
  paths before the error propagates. Items that already reached their
  destination are deliberately left there: each is at a real path, and undoing
  them risks a third state. The invariant is *"no file is left under a temp
  name"*, not "all or nothing".

- **Any page can hold pages, and storage shape follows whether it actually
  does.** Changed 2026-08-10. A leaf-template page is a flat `Name.json` while
  it's empty and becomes `Name/_page.json` the moment something is parented to
  it — `usesDirectoryStorage` decides from the live graph, which is why
  `PathIndex` carries `parentIds` and why that argument is required rather than
  optional. A call site that omitted it would resolve a converted page back to
  its flat path and write over open ground.

  **`alwaysDirectory` on a template is not permission to have children** — it
  means "a directory even when empty", true for folder/character/location/
  faction/species so their shape doesn't churn. It was called `canHaveChildren`
  before this change. **Nothing in an existing project moves**, because every
  template that was a directory still is.

  Two things this replaced, both of which existed only because a leaf couldn't
  nest: `TreePanel`'s `disableDrop` plus the `moveNodes` backstop (a drop onto
  a leaf used to lose the whole subtree on the next load), and the LK
  importer's "nestability net", which forced such a page to `folder` and
  **dropped its own text** to keep the sub-pages.

  The conversion is planned by `planRelocations`, which compares storage shape
  as well as name and parent — a note gaining its first child changes neither
  of those, so without that test the move plans nothing. Converting back leaves
  an empty directory, removed best-effort and **never recursively**: a
  directory with anything still in it must refuse to go.

- **Collision comparison is case-folded.** Windows and macOS default to
  case-insensitive filesystems, so `Ruins` and `ruins` are one file to the OS. The
  displayed segment keeps the user's own capitalisation — only the test folds.

- **There is no total path-length limit, and don't reintroduce one.** There was
  one until 2026-08-11: `MAX_PATH_CHARS = 200`, refusing the write outright, on
  Windows' old MAX_PATH of 260 with 60 held back in case a node's children ran
  longer. Wrong twice over — the check already ran on the node's *own full file
  path*, and a child too long to write fails its own check when it's written —
  and it cost real pages. Five levels of ordinary page names under
  `OneDrive\Documents\Anamnesis` is 203 characters, which the user hit on a
  project nothing else objected to.

  **Measured before removing it**, on Windows 11 with `LongPathsEnabled` (on by
  default there): Rust's `std::fs`, which is what Tauri's fs plugin calls,
  wrote, read and listed a 1021-character path without complaint, and so did
  PowerShell and .NET. Rust prefixes `\\?\` itself for long absolute paths, so
  this doesn't depend on the app manifest. A number picked in advance can only
  be wrong in one of two directions, and it was wrong in the direction that
  loses work.

  The OS is the authority now. `saveNode` attempts the write and reports what
  comes back through the ordinary save-error channel; `LONG_PATH_ADVICE_CHARS`
  (260) only decides whether a *failure* gets the "this path is very long"
  explanation attached, because at that size the path is unreadable and a raw
  `os error 3` says nothing actionable. Below it the original error passes
  through untouched. If this ever needs revisiting, the argument to beat is
  measurement, not MAX_PATH.

- **`supportsLongPaths` asks the disk, and only ever to choose the wording.**
  It writes a deliberately over-long path into the project folder and sees what
  happens, because the answer depends on the Windows build, a machine-wide
  policy flag *and* the filesystem the project sits on — no one of those can
  be read and trusted for the other two. Lazy and memoised per root: it runs
  only after a write has already failed on a long path, so nothing runs at
  launch and the ordinary case never pays for it.

  It deliberately does **not** gate anything. Refusing a save early on a
  machine that stops at 260 loses the same page as letting the OS refuse it,
  only sooner and with a rule the app invented — which is what the old limit
  did. What detection genuinely buys is that "this computer is set to stop at
  260" can be said to the user who needs to hear it and withheld from the one
  who doesn't. Don't wire it to a constraint.

- **`MAX_SEGMENT_CHARS` (96) *is* enforced, on one name rather than the whole
  path.** NTFS's 255-per-name limit hasn't moved and long-path support doesn't
  lift it, so one absurd name — a pasted paragraph as a page title — is
  shortened on disk instead of failing. The page keeps its real name: that
  lives in its JSON and the tree reads it from there, so nothing the user sees
  changes.

  This is the narrow part of a 2026-07-30 decision recorded in `docs/spec.md`
  that over-long paths would be refused and never truncated, on the grounds
  that silently renaming the user's files is worse than saying why. That still
  holds generally, and 96 respects it — more than double the longest name in
  any of the user's worlds, so it only fires on input no one would call a
  title. Don't lower it: doing so would change where existing pages resolve to
  and strand their old files.

- **Images are addressed by filename, never derived from the page's name** — an
  uploaded image outlives any rename or move of the page it belongs to.

- **Two slots never share one asset filename, even when they hold the same
  picture.** `setBannerFromImage` ("Set cover") copies the portrait's file
  rather than pointing the banner at it, because every slot's setter deletes
  the file the slot was holding: share the name and replacing the portrait
  deletes the cover's bytes out from under it, leaving a page whose banner is
  a filename with nothing behind it. Same reasoning `duplicateNodes` and
  `saveAsTemplate` already carry — anything new that puts an existing picture
  in a second place copies the file. Cheap in practice: these are the user's
  own portraits, not a library.

- **`joinPath` is plain string concatenation**, which is only safe because every
  segment reaching it is a constant from `constants/paths.ts` or has been through
  `sanitizeSegment` (which strips separators along with the other illegal
  characters). Feeding it anything unsanitised opens a path-escape.

- **`buildPathIndex`'s group key is `JSON.stringify`, not a joined string** — no
  separator character can then appear inside a page name and merge two groups. A
  NUL delimiter was tried and is worse: it makes the source file read as binary to
  `grep`.

## Saving

- **`autosave.ts` is a plain service and must stay one** — its debounce timers
  have to survive React re-renders. It reports failures through a registered
  handler (`setSaveErrorHandler`) rather than touching UI itself.

- **A failed save must stay visible.** Debounced writes run with no caller left on
  the stack, so a rejection used to vanish as an unhandled promise rejection while
  the app went on showing "Saved" from the last write that worked. That's worse
  than a crash: the user has active evidence their work is safe.

- **Every disk write in `project-store` goes through `track()`.** The rule above
  was only ever enforced for autosave's debounced writes; adding, moving,
  renaming and deleting all used a bare `void fsService.…().then(markSaved)`,
  which leaves a rejection nowhere to go. So when a move failed on 2026-07-31
  the app said nothing and carried on as though it had worked. Don't reintroduce
  a bare `void fsService.…` — the whole point is that there's one place to look.

- **Every disk write is also *ordered*, through `write-queue.ts`.** `track()`
  takes a function rather than a promise for exactly this reason — a promise
  handed in has already started. Node paths are recomputed from the in-memory
  graph on every write, so an operation's plan describes the disk as it will be
  once everything issued before it has landed; two overlapping operations break
  that, and the second one renames from a path the first hasn't written yet.
  Tauri's fs calls are IPC round-trips, so "make a page, then rename it" is
  genuinely two writes in flight. On 2026-08-11 that left three pages with no
  file of their own and one folder that could never save again. Not awaiting is
  still right — the UI must not block on a disk — but not-awaited must not mean
  unordered. Nothing inside a queued task may call `flushSave`.

- **A rename whose source isn't on disk is not a failure.** `applyRelocations`
  attempts the rename, and only if it fails *and* `exists` confirms the source
  is gone does it skip: the node is in memory and every caller re-saves it at
  its new path straight after, so skipping repairs the gap. Throwing instead
  aborts the write that would have fixed things, and because paths are
  recomputed every time, the next operation plans the same impossible rename —
  permanently. The order matters: letting `exists` decide up front would let one
  wrong answer skip a move whose file really is there, leaving two copies of one
  node id on disk.

- **`updateNode` snapshots the graph when the debounce *fires*, not when it's
  scheduled.** A 300ms-old snapshot can resolve against a world that no longer
  exists — a sibling renamed inside the window shifts collision suffixes and the
  write lands at a stale filename.

- **Flush pending saves before a relocate; cancel them before a delete.**
  Otherwise a debounced content-write races the rename (landing at the old path)
  or resurrects a file that was just removed.

- **A rename must re-save the node's contents, not just move the file.** `rename`
  only relocates; the file's own `name` field would still say the old name.

## Loading

- **One damaged file must never cost the user the rest of the project.**
  Unreadable nodes are skipped and reported via `skippedFiles`; a folder whose own
  marker is corrupt still gets walked, its children reparented one level up.

- **A directory with *no* marker is walked too, not skipped.** It contributes no
  node of its own, and everything inside it reparents to the level above. This
  used to return early, and that cost the user a page: dropping a page onto a
  leaf-template page writes the child into a plain `Name/` directory with no
  marker in it, and the whole subtree then vanished from the tree while sitting
  intact on disk. `assets/` is skipped by name instead, which is also one fewer
  directory listing per load.

- **A marker-less `Name/` with a flat `Name.json` beside it is one node in two
  pieces, and the load puts it back together** (`reuniteOwnerFile`). That is the
  exact wreckage a page gaining its first child left behind before the write
  path was fixed — the child written into the new directory, the parent's own
  file never moved in after it. Hoisting the children out loses nothing, but it
  shows the user a tree they didn't build, and it happens again on every load.
  Three things make this safe to do automatically, and removing any one of them
  makes it unsafe:
  - **Only when the directory is marker-less.** A directory *with* a marker next
    to a same-named file is two unrelated nodes, which is legal — a
    directory-storage node and a leaf page never collide, so neither gets a
    numbered suffix.
  - **Only when the directory actually holds nodes.** An empty `Name/` proves
    nothing, and someone can make one by hand in Explorer; swallowing their page
    into it would be the app inventing structure.
  - **Only if the rename succeeds.** The in-memory adoption is conditional on the
    file having actually moved. Adopting the children while the flat file stayed
    put would have the next save write a second copy of the node inside the
    directory, and the load after that would find the same id twice. Failing
    means the tree loads in the old hoisted shape and the next load tries again.

- **The flat file is read by the directory branch, not the file branch**, and
  the file branch stands back for exactly the names in `ownerFileNames`. This is
  why every subdirectory at a level is listed before any file at that level is
  read: whether a flat `Name.json` belongs to this level or inside `Name/` is a
  question only `Name/`'s own listing answers. Reading it in both branches puts
  the same id in the graph twice.

- **The load walk knows `MOVE_TEMP_PREFIX`, and that isn't optional.** Anything
  still parked under a move's temp name is a real page whose relocation was
  interrupted. A parked *file* has no `.json` suffix, so the extension check
  skipped it outright — that is exactly how two pages disappeared on
  2026-07-31. `repairStrandedNodes` renames them back afterwards and the count
  surfaces through `recoveredCount` (see `RecoveryNotice.tsx`).

- **Every repair the load makes is reported.** Both `recoveredCount` and
  `reunited` reach the user through `RecoveryNotice`. Silent recovery is how the
  first of these stayed invisible long enough to become lost pages: the app
  quietly patched the same damage on every load and never said the damage was
  there. A repair the user isn't told about is a bug they can't report.

- **Repair is a rename, never a save-then-delete.** A stranded *directory* has
  its children inside it; writing the node's own marker at the new path and
  removing the old directory would take them with it.

- **The read limiter holds its permit around a single read, never across the
  recursion into a subdirectory.** Wrapping the recursive call instead deadlocks
  on any tree deeper than the limit — parents wait on children that can't get a
  permit.

- **`skipped` is sorted before returning** — parallel reads make completion order
  nondeterministic, and the list the user sees shouldn't reshuffle between loads.

## Tauri / platform

- **`dragDropEnabled: false`** in `tauri.conf.json`. Tauri's native OS drag-drop
  swallows drag events in WebView2 before the in-page HTML5 backend sees them,
  which broke the tree's drag-to-reparent entirely. Turning it off costs nothing
  in practice: plain HTML5 DnD then works normally, so `ImageSlot`'s file drop
  receives a real `File` with usable bytes, and `.lk` import uses a native file
  picker anyway.

- **`window.confirm()` silently no-ops in Tauri's webview** — it doesn't block, so
  Delete once deleted with no prompt at all. Use `confirmDestructive()`.

- **The HTTP plugin is scoped to `https://assets.legendkeeper.com/*` only.** This
  is the single authorised network call in the whole app (LK import images, on
  explicit user confirmation). Widening that scope crosses the policy boundary in
  `CLAUDE.md`.

- **The opener plugin's `open_path` needs a *scope*, not just the permission.**
  `opener:allow-open-path` on its own enables the command and nothing else: the
  Rust side then checks `is_path_allowed()`, which ANDs the call against an
  allow-list that a bare permission string leaves empty, so every path is
  refused. Both "Open … folder" buttons in Settings did nothing at
  all until `capabilities/default.json` carried
  `{ "identifier": "opener:allow-open-path", "allow": [{ "path": "**" }] }`.
  The same shape applies to any other scoped plugin permission — **a permission
  that appears granted and still fails is the scope, every time.**
  `opener:allow-reveal-item-in-dir` is the second instance and was scoped the
  same way when "Show in File Explorer" landed. Note that none of this shows up
  in `pnpm dev`: capabilities are enforced by the Rust side, so a missing scope
  is invisible in the browser and only appears in `pnpm tauri dev` or a build.

- **An AppImage must not bundle graphics or display libraries.**
  `libwayland-client`, `libEGL`, `libGL`, `libgbm`, `libdrm` and driver shims
  are bound to the *host's* kernel and GPU stack; a copy built on
  `ubuntu-22.04` is newer than what an older distro carries and the two don't
  talk. AppImage publishes an excludelist saying so and `linuxdeploy` honours
  it — Tauri's bundler walks webkit2gtk's dependency tree without consulting
  it. This is not theoretical: it's why the app wouldn't start on a Fedora
  laptop in the first outside install, 2026-08-09, and the workaround needed
  knowledge no ordinary installer has. **If the AppImage is ever changed, the
  test is a machine that reproduces the failure — CI runs the same Ubuntu that
  produces the bad bundle, so a green build proves nothing here.** Detail and
  the reported symptom are in `docs/plan.md` §Known Bugs.

- **`sep()` is synchronous; `join()` is an IPC round trip into Rust per call.**
  That difference is why path building is done locally. Neither exists under
  `pnpm dev` or Vitest, which is why the separator is resolved lazily.

## Updates

- **The updater's signing key is free and local, and is not code signing.**
  `pnpm tauri signer generate` made a minisign keypair; the public half is in
  `tauri.conf.json`, the private half lives at
  `C:\Users\shiro\.tauri\anamnesis-updater.key` and must never enter the repo —
  it's public. This is what proves an update came from us. The separate ~$200/yr
  Authenticode certificate buys exactly one thing, the removal of the SmartScreen
  warning, and the user has declined it permanently. Don't conflate the two, and
  don't claim updates require the paid one.

- **Losing the private key breaks the update button, and nothing else.** A new
  keypair means a new `pubkey`, and shipped builds only trust the one they were
  compiled with — so existing installs would reject every future update. They keep
  running, and no project data is involved at any point; the updater cannot reach
  it. Recovery is a build carrying the new `pubkey` that people install by hand
  once, after which updates resume. Back it up (it's one line of text), but don't
  describe this as catastrophic — it isn't, and saying so once already alarmed the
  user for no reason.

- **Keeping the key is a decision the user made with the trade-off in front of
  her (2026-07-31), not an accident.** She raised the key as unwelcome and was
  offered the alternative: drop download-and-install, have the button only check
  and then open the releases page in a browser. That removes the key entirely,
  because an app that downloads and runs nothing has nothing to verify. She chose
  to keep auto-install. Don't re-propose removing the key as though it were an
  oversight, and don't ship auto-install without signature verification as a
  compromise between the two — that combination is the actual security hole the
  key exists to close.

- **A release build must have `TAURI_SIGNING_PRIVATE_KEY` set**, or the bundle
  ships without `.sig` files and every client rejects the update as unsigned.
  `createUpdaterArtifacts: true` in `tauri.conf.json` is what produces them.

- **The updater does not go through the `http:` capability**, which is why that
  scope is still narrowed to LK's CDN alone. Widening `http:` to reach GitHub
  would be a real policy change for no gain.

- **The check runs only from the button.** Nothing is scheduled, and nothing
  runs at launch. It lives in the settings panel, reachable from the cog on both
  the start-up screen and the in-project top bar — so an install can be started
  with a world open. **`useUpdates` flushing pending saves before installing is
  what makes that safe**; the installer replaces the running executable and
  relaunches, and anything still inside the 300ms debounce would be gone.
  Removing that flush turns a mid-session update into silent data loss.

- **The version lives in four files and they must agree**: `package.json`,
  `tauri.conf.json`, `Cargo.toml`, `Cargo.lock`. `tauri.conf.json` is the one
  that bites — the updater compares the *running app's* version against
  `latest.json`, so a stale one there means every install's update button goes
  quiet and nobody finds out for a release or two. `scripts/set-version.mjs`
  sets all four; `scripts/check-version.mjs` fails CI and the release build if
  they drift. Don't edit them by hand.

- **Releases are a pushed tag, and the release is a draft on purpose.**
  `latest.json` is assembled across four matrix jobs that finish at different
  times, so publishing before they're all done would offer an update whose
  installer for that platform doesn't exist yet. See `docs/releasing.md`.

- **A failed check must read as a non-event.** The app is offline-first; not
  reaching GitHub costs the user nothing, and the message says so rather than
  presenting as an error.

- **The release body is the only text in the app that didn't come off the
  user's disk, and it is never rendered as HTML.** `services/release-notes.ts`
  parses it into plain data — `ReleaseNoteBlock[]`, spans of text/strong/em/code
  — and `components/shell/ReleaseNotes.tsx` maps those to React elements. No
  HTML string exists at any point and nothing reaches
  `dangerouslySetInnerHTML`. **Swapping the hand-written parser for a markdown
  library is the change to be careful about**: most of them emit HTML strings,
  and that would put remote-sourced markup on a screen reachable from the cog.
  If one goes in, it has to emit elements. Links are deliberately rendered as
  their words with the address dropped, so a release body can't send anyone
  anywhere; the only outbound link on that panel is `RELEASES_PAGE_URL`, which
  the app already knows.

- **The grammar is only what `RELEASES.md` actually uses, and underscores are
  excluded on purpose.** `###` headings, `-`/`1.` bullets, `**bold**`,
  `*emphasis*`, `` `code` ``. `_emphasis_` is *not* supported, because these
  notes are full of `_folder.json`, `snake_case` and `project_home` — treating
  underscores as markers would mangle those constantly, and nobody writing
  these uses them for italics. Don't "complete" the markdown support without
  that trade in front of you. Bullets wrap across five or six lines in
  `RELEASES.md`, so continuation lines fold into the item above; that's what
  the line-by-line loop is for, and a block-splitting rewrite will break it.

- **The whole body is shown, not a summary.** `RELEASES.md` is already the
  curated read — ~1,500 words for v0.3.0, cut down from ~280 changelog lines —
  and cutting it again in the panel throws away the work that document exists
  to do. This was tried the other way first and was wrong. The notes scroll
  inside a `max-height` instead, so a long release can't push *Download and
  install* off the screen.

- **`RELEASES_PAGE_URL` points at `/releases/latest`, not a tag built from the
  version string.** The updater only ever reads `releases/latest/download/
  latest.json`, so the update on offer *is* the latest release, and a guessed
  `v{version}` tag would 404 if tag naming ever shifted. Opening it is
  `openUrl` — the OS launches a browser, the app makes no request — and
  `opener:default` already scopes `https://*`, so no capability change was
  needed for it.

- **Settings → Patch Notes reads a bundled `RELEASES.md`, and must not be
  "fixed" by fetching it.** `services/release-history.ts` imports the file with
  Vite's `?raw`, so the panel has its content at build time: it opens instantly,
  works offline, and adds no third network call to an app that deliberately has
  only two. The cost is that it can only show versions up to the installed one.
  **That's correct, not a limitation to route around** — it's the "what's in the
  copy you're running" screen, and the Updates panel already covers the other
  direction by fetching the notes for a version you don't have. Making this one
  fetch the releases API would need the `http:` capability widened to GitHub,
  which the bullet above exists to avoid, and would trade an instant panel for
  a spinner and an offline failure state.

- **A built `v{version}` tag URL is safe here in a way it isn't for the
  updater.** `releaseTagUrl` in `constants/links.ts` is fed versions parsed out
  of `RELEASES.md` headings — the same numbers the tags are cut from, and every
  one of them is published by the time a build carrying it exists. The
  `/releases/latest` reasoning above applies to the *update on offer*, which is
  a different question.

- **The renderer's `max-height` is overridden inside Patch Notes.**
  `.release-notes` caps itself at `20rem` and scrolls, which is right in the
  update panel — the notes sit directly above *Download and install* there. In
  the settings panel there's nothing underneath and the panel already scrolls,
  so the cap is lifted rather than nesting one scrollbar inside another. If the
  cap ever moves, check both places.

## React patterns

- **Remount-by-`key` instead of resetting state in an effect.** `PageView` keys on
  the selected node id, `Editor` on the active tab id, `SaveIndicator` on its
  timestamp. This project's ESLint config (`eslint-plugin-react-hooks` v7) flags
  both `setState` inside an effect and `Date.now()` during render, so the usual
  approaches don't lint. This is deliberate, not incidental.

- **The tree's selection-sync effect must not fire for an already-selected
  node.** `treeApi.select()` replaces the whole selection with one node, and
  that effect runs whenever `project.selectedId` changes — including when it
  changed *because* the user ctrl-clicked a second row. Without the
  `isSelected` guard, every multi-selection collapses the instant it's made.
  (The effect itself exists because the editor's mentions call `selectNode`
  directly, which react-arborist can't see.)

- **`project.selectedId` is the page on screen, not the selection.** The tree
  can have many rows selected; `selectedId` follows the *focused* one — the row
  last touched — because `onSelect` receives its nodes in tree order, so
  shift-selecting upwards would otherwise throw the user onto a page they
  didn't click.

- **A submenu swapped into `TreePopover` must be no bigger than the menu it
  replaces.** The popover measures itself once, at mount, and flips and clamps
  against the viewport from there; swapping its contents doesn't re-measure.
  SortMenu and MoveMenu both live inside this — MoveMenu's list is capped at
  22rem for it (439px against the full context menu's 528px), and its width at
  11rem (194px against 198px), because the popover is right-aligned to the
  trigger and the trigger is in the sidebar, the narrow side of the window.
  Anything taller or wider opens off an edge with no clamp left to catch it.

- **A hover-revealed control in a tree row is `display: none`, never
  `opacity: 0`.** An invisible element still takes its width: the row's colour
  dot, "..." and + held ~60px of every row permanently, so every page name in
  the sidebar was truncated to reserve space for buttons that weren't on
  screen. It was reported as a design failure, and it was one — the panel is
  the app's main navigation and it was throwing away a quarter of its width for
  nothing. Anything added to that row has to follow the same rule or it takes
  the width straight back.

- **The keyboard half of that hangs off `[role="treeitem"]:focus-within`, and
  nothing of ours can replace it.** `display: none` drops the buttons out of
  the tab order, so without a focus rule they're mouse-only. The attribute is
  on react-arborist's own row wrapper — the element it calls `.focus()` on —
  and that wrapper is an *ancestor* of our `.tree-node`. `:focus-within`
  matches the focused element or one containing it, never a descendant of it,
  so `.tree-node:focus-within` is dead CSS however right it reads. Measured
  both ways in the browser before shipping. No `rowClassName` is configured on
  the tree, so the role is the only handle.

- **Popovers portal to `document.body` via `TreePopover`.** Every react-arborist
  row is its own `position: absolute` stacking context for virtualisation, so a
  popover nested inside a row can never paint above a neighbouring row via
  z-index — z-index only resolves within a shared stacking context.

- **Popovers measure after mount, then clamp to the viewport.** Positioning purely
  from the trigger's rect pushed the last row of the template picker off-screen
  when opened from low in a tall tree — present but unreachable, and it read as
  "adding a Note does nothing."

- **Components never import stores or services** (CLAUDE.md layer rule). Narrow
  hooks exist so a component subscribes only to what it shows — `useNode` over the
  whole node record, `useProjectActions` over the whole store. Widening a
  subscription re-renders the entire window on every keystroke.

- **BlockNote's editable area shrink-wraps to its own text** and won't stretch via
  CSS, so clicking the empty space below a short page is handled in JS.

- **Truncating text inside a flex column needs three things, not one.**
  `.tree-move-option` wanted `text-overflow: ellipsis`, and got nothing until it
  also had `min-width: 0` at every level of the chain (a flex item's default
  `min-width: auto` floors it at its own min-content width) *and*
  `align-items: stretch` to beat `.tree-context-menu button`'s `center`, which
  is (0,1,1) and outranked the new class. Measured symptom: a 310px name laid
  out inside a 176px row, running out past the popover's edge rather than
  clipping. Worth recognising — it looks like the ellipsis rule "not working".

- **"Just created" is a one-shot request, not a property of the page.**
  `PageTitle` opens into its rename input when `pendingRenameId` names the page,
  and the store clears that on any navigation except the one that opens the page
  it names. The obvious-looking alternative — deriving it from the page's state,
  as `startEditing={isUnanswered}` used to — is wrong: blank-with-no-tabs is a
  state a page *stays* in until it's answered, so every visit back to an
  unfinished page reopened the rename input and took the cursor. Anything that
  should happen once, on creation, needs a one-shot; the page itself can't tell
  you how long it's been there.

- **Request the rename before selecting the new page, not after.** `PageTitle`
  reads `startEditing` once at mount, so asking afterwards only works while
  React batches the two store writes into one render. Asking first is correct
  under either, and the render in between is harmless — the request names a page
  that isn't on screen yet.

## LK import

- **The LK project root is now a real Node** — the imported project's home page
  — where Phase 8 turned it into the project's *name* plus, sometimes, a page
  called "Home". It keeps the root's own name, which is also the project name,
  the same way LK shows it in both places.

- **The root is in `idMap` but not in `importedIds`, and the two are not
  interchangeable.** `idMap` is what resolves mentions, so the root belongs in
  it — that's what fixed the 15 cross-references pointing at the project root.
  The parent-grouping pass must use `importedIds` instead: group by `idMap` and
  the root's children key themselves under the root, leaving the top-level walk
  empty and the whole tree unbuilt.

- **The home page is appended to `nodes` and promoted in `rootOrder`,** not
  unshifted into both. `nodes` is an unordered bag — the store keys it by id on
  arrival — and putting home at the front of it only moved every array index in
  the tests by one for no gain.

- **LK's stock "Welcome to LegendKeeper" page is not imported.** Every fresh LK
  project ships the identical tutorial there, and importing it verbatim drops
  LK's onboarding copy (with links to their demo world) into the middle of the
  user's own. The home page is still created, just empty, and the preview says
  why. Matched on the heading text, which is the part that survives their
  releases.

## LK export

- **`pos` keys are fixed-width, always two characters.** Import compares them
  as plain strings, and variable-length keys don't sort under that: index 75
  ("00") lands before index 1 ("1"), because comparison is character by
  character and `'0' < '1'`. LK's own keys *are* variable-length, which is fine
  to read — we only have to emit keys that sort, not keys shaped like theirs.

- **A node hangs off its own parent when that parent is in the export, and off
  the root when it isn't.** That single rule is what lets a nested page be
  exported without dragging its ancestors along, *and* what puts a whole
  world's top-level pages underneath the home page, which is where LK keeps
  them. Special-casing either produced the other one's bug.

- **The designated home page becomes LK's root resource** rather than getting
  one synthesised above it — LK's format requires exactly one parentless
  resource, and ours is a real page. A synthesised root, named for the project,
  appears only when home isn't part of the export.

- **Our Secret callout exports as LK's `bodiedExtension` Secret block, not as a
  `panel`.** Import folds both LK's Secret block *and* `panel` warning/error
  into that one callout, so the return trip can't tell them apart; the Secret
  block is the semantic match, and the panel types were the lossy side of that
  merge to begin with.

- **A picture only exports if it came from LK.** `.lk` stores URLs on LK's
  servers, never image data, so a file added in Anamnesis has nothing that can
  go in one — hence `imageSource`/`bannerSource` on Node, recorded at import.
  Absent means "can't export", which the export preview reports with a count.
  Never used to fetch anything outside an explicit import.

## Editor & templates

- **The world's own templates are never in `project-store`'s `nodes`.** They
  live in their own `templates: TemplateLibrary` record (`services/template-
  library.ts`), and that separation is the whole safety argument for the
  feature: search, the property index, LK export and the Phase 1.5 publisher
  all walk every page they can see, and any one of them that forgot to filter
  templates out would put scaffolding into her exported or published world.
  Keeping them out of `nodes` makes that leak impossible rather than a thing
  each new walker has to remember. **If templates ever need to appear in the
  tree, filter at the render site — don't merge the records.**

- **They're one file, `.templates.json`, not a directory of pages.** A
  `Templates/` directory would have to be reserved at the project root, and
  that's a folder name someone genuinely wants. The leading dot is load-bearing
  for the same reason: any name the load walk skips is a name a page can be
  lost behind, and nobody titles a page ".templates".

- **`buildPathIndex` reserves the app's own root names** (`assets`,
  `project.json`, `.templates.json`) by treating each as an invisible occupant
  of its collision group, so a page wanting one gets " (2)". Before that, a
  root page called "assets" was written to `assets/` and then skipped by the
  load walk — on disk, gone from the tree. **Reserved at the root only:**
  `_folder.json`/`_page.json` are reserved in *every* directory and are not
  covered, so a page named "_folder" is still a live collision.

- **A template carries its own copies of its picture files.** Sharing the
  original page's filename means replacing that page's image later deletes the
  template's out from under it — the same reasoning `duplicateNodes` documents.
  A copy that won't read yields `undefined` rather than throwing: the template
  arrives without a picture that was already missing.

- **A picture inside a page is stored as `anamnesis-asset:<filename>`, and the
  scheme is the point.** BlockNote's image block holds one string in
  `props.url`, and that field is also where a real web address would sit, so
  the two have to be told apart with certainty rather than by guessing at the
  shape of a string. `services/asset-urls.ts` resolves ours off disk and passes
  everything else through **untouched** — never fetched, never rewritten.
  Changing `ASSET_REF_PREFIX` strands every picture already written into a
  page.

- **`resolveFileUrl` must cache, and that isn't an optimisation.** BlockNote
  calls it on every render of a file block, and an object URL lives until it's
  revoked — so a read per call mints a fresh blob per picture per keystroke,
  none of which anything ever reclaims. The cache is keyed by project root as
  well as filename (two worlds can hold the same filename) and is dropped on
  project open and close, which is the only moment the blobs stop being
  displayable.

- **Removing an image block does not delete its file, on purpose.** The
  reference lives in the page's text, where it can be cut, undone, re-pasted
  and duplicated, so no single edit can answer "is this file still wanted" —
  and a delete that guesses wrong takes the picture out of the page it's still
  in. Unused files accumulate in `assets/` instead, which is what Phase 17's
  Assets tab exists to make visible. **If a sweep is ever written, it has to
  read every tab of every page plus the template library, not the open page.**

- **BlockNote's own file panel is the one that renders, both tabs, and that is
  a decision rather than a default.** Upload and embed-from-URL. The panel was
  briefly replaced with an upload-only one, on the grounds that a URL embed
  puts a remote fetch on the render path of a page; **the user overruled that
  the same day and wants both** — see `CLAUDE.md`'s Policy Boundary, where the
  exception is written down with what still holds. Don't remove the URL tab
  again.

  The mechanism is worth knowing, because it looks like a bug from either
  side: the default panel builds its tab list as
  `uploadFile === undefined ? [] : [upload]` **plus** embed. So a missing
  `uploadFile` doesn't disable uploading, it silently removes the tab, and the
  block presents as a URL box with no other option. That's exactly how it
  shipped before Phase 16.

- **The image size and type limits live in `uploadFile`, not in any panel.** A
  picture arrives three ways — picked, dragged onto the page, pasted — and
  BlockNote funnels all three through that one function. A check in the panel
  covers the least common of the three. Throwing is how it refuses; BlockNote
  catches it and shows its own upload-failed text.

- **Don't fork BlockNote.** Extend via its documented block-spec API.

- **`@blocknote/shadcn` is required for menus to render at all**, and it needs two
  supports that are easy to mistake for cruft: an `@source` directive so Tailwind
  scans `node_modules` for its classes, and a mapping in `index.css`'s `@theme`
  block onto shadcn's expected token names. `--color-accent` is deliberately the
  translucent tint, not the bold teal — shadcn uses "accent" for menu-row hover,
  where solid teal is illegibly bright.

- **BlockNote sets `font-family` and `font-size` on the contenteditable element
  itself**, in `.bn-editor.bn-default-styles` — a hardcoded Inter stack and a
  hardcoded `16px`. A declaration *on* an element beats an inherited one however
  specific the ancestor rule is, so `--bn-font-family` (which BlockNote applies
  at `.bn-root`), `.wiki-body`'s `--font-prose`, and every `--fs-*` step all lost
  to it silently: the editor body ignored the text-size slider and the Writing
  font picker completely, while every other label in the app obeyed both.
  `page.css`'s `.editor-shell .bn-editor` rule is what fixes it. **If theming the
  editor ever stops working, check whether the token is being set on an ancestor
  and overridden on the element.**

- **`patchTheme` decides "the app wrote this" by re-deriving from the file's own
  colours** — which silently stops working the day a `deriveTokens` formula
  changes, because every theme saved under the old formula then reads as
  hand-chosen and never gets the fix. **Changing a derived formula means adding
  the value it used to write to `RETIRED_DERIVED`**, or the change reaches the
  built-ins in `index.css` and nothing else. Keep that list to values the app
  demonstrably wrote; it's the one thing that overrules "leave it alone", and a
  value a person might plausibly have picked doesn't belong in it.

- **`@blocknote/shadcn`'s stylesheet gives every icon inside the editor back its
  intrinsic size**, via `svg:not([class*=size-]) { width: revert; height: revert }`
  — so a lucide icon in any BlockNote UI renders at 24px no matter what the
  component asked for. That's how the block ＋ and drag handle ended up as the
  two largest things on a line of 16px prose. **Size these by CSS in `page.css`,
  not by an icon prop** — the prop is what `revert` is throwing away. The rule
  there also has to bring `.bn-side-menu .bn-button`'s fixed 24px height down
  with it, or a smaller icon just gets centred in the same gap.

- **`--fs-content` has exactly one user**, `.editor-shell .bn-editor`. It's the
  "Writing" slider, and that slider means the text on a page — the moment a
  second element takes the token, the control stops being predictable and
  starts being "some things, sort of". Page titles, tab strips and callout
  labels are interface and belong on `--fs-scale`.

- **`applyTemplate` merges only the tabs a page doesn't already have, by id.** It
  must never overwrite existing content.

- **`Node.customProperties` is optional, not defaulted** — pages saved before the
  field existed don't have it on disk, so every read site falls back to `[]`
  itself rather than relying on a default. `Node.propertyOrder` (Phase 13) is
  the same deal, and is additionally allowed to be *partial*: a key it doesn't
  mention sorts after every key it does, which is what a page looks like the
  instant a property is added after a reorder. Both fallbacks are tested in
  `property-service.test.ts` — get one wrong and every sidebar in the project
  quietly rearranges itself on upgrade.

- **Select/status values are option *ids*, and the option list lives on the
  page.** So anything that removes an option has to remove the pages' use of it
  in the same write — that's `removePropertyOption`, not `updateCustomProperty`
  with a shorter list. A value left pointing at a deleted option renders as
  nothing at all, which reads as the chip having been eaten. Two consequences
  worth knowing before touching this: an id is generated once and never reused,
  so renaming an option leaves every page already using it correct; and
  **anything exporting a value has to resolve the label through the spec** —
  `lk-export` writing the raw value would put a UUID in the user's LegendKeeper
  page.

- **A property's identity across pages is its *label*, not its key.** Custom
  property keys are per-page UUIDs, so "the Pronouns property" is only a thing
  because two pages spell the label the same way. That's what `indexProperties`
  groups on and what the project-wide rename and delete act on. It also means
  the same label can arrive from two sources at once — a template declares it
  on one kind of page and someone added their own on another — which is why the
  index carries `fromTemplate` and `fromCustom` separately rather than one enum.

- **Project-wide rename never throws away writing.** Renaming a property onto a
  name that already exists is the merge, and merging two properties isn't
  merging two tags: a tag is a set, but a property's value lives under its key
  and two properties on one page have two keys. So `planPropertyRename` drops
  the empty side where only one has a value, and where **both** have values it
  keeps both under the new name and reports it, leaving the user with two
  fields to sort out. That's deliberate and it should stay that way — untidy is
  recoverable by looking at it, a silently deleted paragraph isn't. The same
  applies where the target name is one the page's *template* declares: nothing
  can merge into a template field until Phase 17 makes templates editable, so
  the plan counts those pages (`templateClash`) and the view names them rather
  than the rename quietly producing a duplicate nobody was warned about.

- **Chip option lists stay on the node. Don't move them to `project.json`.**
  It looks like the obvious fix for "a status on thirty pages is thirty option
  lists", and it breaks the thing file-per-node exists for: an option list
  sitting next to the values it explains is what lets a page's JSON be read on
  its own. Move it and `Valera Jiang/_page.json` says `"status": "o-3f2a"` with
  nothing on the page to say what that means. What makes them behave as though
  they were shared instead: `knownOptionsFor` seeds a new copy from what's
  already in use, ids and colours are **copied rather than regenerated** (two
  pages sharing an option id is fine — ids only need to be unique within one
  spec), and the project-wide edits in `planOption*` reach every copy. Anything
  that adds a fourth chip type or another way of creating one has to go through
  the same seeding, or option lists start drifting again.

- **Options are shared by property name *and template*, never by name alone.**
  "Type" is a suggested property on locations, factions, items and events; a
  location's City/Village/Ruin has no business appearing on a sword. The
  project-wide *rename* in the All properties & tags view is by name only —
  that's fine, since it only touches pages that actually carry the option — but
  anything that *offers* options to a page must filter by template.

- **Anything that changes many pages from one click records one undo entry.**
  `applyBulk` in `project-store.ts` is the primitive; the four project-wide
  property/tag actions are its only callers so far. It builds the reverse by
  reading just the fields the patch is about to overwrite, not by snapshotting
  nodes — these run over the whole project and a page's tabs are the largest
  thing on it. A new bulk action should use it rather than looping `updateNode`,
  or the user presses undo forty times to reverse one click.

- **Wikilinks never guess between two same-named pages.** `[[Name]]` converts only
  when the name is unique; otherwise it stays plain text. Ambiguity should never
  resolve silently (same principle as Obsidian). Use `@`, which lists every match.

- **Template placeholder copy is a designed asset** — don't reword it, and don't
  extract it into an editable content system. It is also, since Phase 11, *ours*:
  the original prompts were transcribed word-for-word from LegendKeeper's
  templates, and that was the one real legal exposure in the repo. The copy in
  `template-registry.ts` is now the only copy that exists —
  `docs/prototype/anamnesis.jsx` was gutted to generic filler in the same pass,
  so restoring a prompt "from the prototype" reintroduces LK's writing. There is
  no second source to sync with, and adding one is how they drift.

- **The Secret callout is a marker, not a mechanism.** It renders purple with a
  lock chip and does nothing else — no gating, no exclusion from export. Hidden
  tabs are the actual way material is held back. The template copy now says so
  in as many words, because the old LK-transcribed text promised "information
  that only admins can see", which was never true here and never could be in a
  single-user app. If Publish (Phase 1.5) ever does filter Secret blocks, that
  copy can change; until then don't write UI text that implies it hides
  anything.

- **`date` properties render as free text, not a date picker** — fictional
  calendars ("Year 872, Third Age") don't fit a real calendar widget. Reference
  fields stay multi-select even when the label sounds singular (Leader, Owner).

- **Tab drag uses dnd-kit's `PointerSensor` activation distance**, which is what
  lets a tab be grabbed anywhere on it while plain clicks still reach the buttons
  underneath. Plain HTML5 DnD can't do this — browsers won't reliably start a drag
  from a nested `<button>`.

## Search

- **A search feature reachable only by typing a character is a feature nobody
  has.** Tag-only filtering in the tree shipped as a leading `#`, with the
  placeholder saying so, and went unfound for months — *"i didnt realize i had
  to actually type the hashtag. I thought some UI selection would show up."*
  The syntax now **sets a visible control and deletes itself from the field**,
  which is the shape to copy: the shortcut still works, there's one place
  saying what you're searching rather than a character in the field and a
  control disagreeing with it, and using the shortcut once shows you the menu.

- **The scope control is a menu, not buttons, and that was a correction.** It
  was three pills under the tree's field first — *"i kind of hate the buttons.
  they feel unprofessional and lame."* **Permanent furniture for a control
  nobody touches is a cost paid every time you look at the screen, to expose a
  choice made once a month.** `SearchScopeMenu.tsx` is shared by the tree and
  the palette on purpose: two designs for "what am I searching" is how you get
  two answers to it. Nothing renders when it's closed except the chip, and the
  chip only when the scope isn't the default — asked for explicitly, so don't
  quietly make it always-on.

- **Where the scope menu opens from differs by surface, deliberately.** The
  tree's field is something you click into, so focusing an empty one opens the
  menu — that's the moment discovery has to happen. The palette opens already
  focused and empty, so the same rule would put a menu over the results before
  there were any; `Tab` opens it there instead, which is otherwise a dead key
  in a dialog with one field.

- **Settings search is scored on how much of the query a row accounts for, not
  on how well it matched.** Fuse matches a query as one string, which answers
  "projects folder" and returns *nothing at all* for "where are my files
  saved" — the query the box exists for, since anyone who knew the setting's
  name wouldn't be searching. Each word is scored separately and coverage
  ranks above strength. **The pruning is load-bearing, not tidying:** rows
  below the best coverage minus one are dropped, because every extra word in a
  long query is another chance for an unrelated row to catch one of them, and
  without it that query returned the right answer plus eighteen colour
  swatches.

- **The settings results are one ranked list on purpose.** Grouping them by
  section was built and reverted within the hour: grouping sorts by section, so
  the best answer lands wherever its panel sits in the rail (*Projects folder*
  came nineteenth), and it split the rendered order from the ranked order, so
  Enter opened a different row than the highlighted one. `groupByTab` still
  exists and is still tested — anything using it must index into *its* shape,
  never into the flat results.

- **A settings section is declared in two files that can't import each other**
  — the data in `constants/settings.ts`, the panel component in
  `SettingsModal.tsx`'s `PANELS`. Nothing in the type system connects them, so
  `settings-search.test.ts` reads the modal's source and fails if they drift.
  Add a section to one and not the other and you get a rail entry opening a
  blank pane.

- **Prose is matched by exact substring, not fuzzily, and that's the design —
  not an unfinished bit.** Names and tags go through Fuse because they're short
  and a half-remembered spelling should still find them. Page text doesn't:
  fuzzy matching across thousands of characters finds a scattering of the
  query's letters in unrelated paragraphs and ranks it as a hit, so a search
  for anything returns most of the project. Folding content into the Fuse index
  "for consistency" makes the feature worse, not more consistent.

- **`pendingFocus` is transient and must be checked against the node it names.**
  It's how a search result opens a page *on a particular tab*, and it isn't
  cleared after use — PageView compares `pendingFocus.nodeId` to the node it's
  rendering. Dropping that comparison means a leftover from one jump opens the
  wrong tab on the next page visited. It's deliberately not part of `Project`:
  a single navigation isn't state worth writing to disk.

## Shortcuts

- **What BlockNote actually owns is `EDITOR_RESERVED_BINDINGS`** in
  `constants/shortcuts.ts` — verified by grepping the installed dist, not
  assumed. It is narrower than the old note here claimed: of the Mod-Shift
  space only 6/7/8/9 are taken, so the rest is available. Mod-Alt is blanket
  reserved because headings register as `` `Mod-Alt-${level}` `` from a
  configurable list, so there's no fixed set to enumerate.

- **Undo and redo share Ctrl+Z/Ctrl+Y with the editor on purpose.** They are
  listed in `EDITOR_SCOPED_ACTIONS`, which buys them two things: the settings
  screen lets them sit on combinations the editor owns, and the global listener
  `continue`s past them whenever `isTextEntryTarget(event.target)` — inside the
  editor, an input, or anything contenteditable — so the key goes on to the
  editor untouched. The exemption works *only* because the two mean the same
  thing. An action that meant something different couldn't share a key without
  the user having to know which half of the window had focus, so don't add one
  to that set to dodge a collision.

- **The "modifier or F-key" rule is an accessibility decision, not a
  formality.** A bare letter can't be a binding — this app is mostly a text
  editor and it would fire while typing. But requiring a two-key chord is
  exactly the barrier the rebinding screen exists to remove, so a single
  function key is legal. Tightening this to "a modifier always" takes the
  escape hatch away; if it has to change, replace it with another one first.
  `checkBindingShape` in `shortcut-service.ts` is where it lives.

- **Stored overrides are checked for shape but never for collisions.** Both
  halves matter. Shape, because `app-settings.json` outlives any version of the
  app and a binding that was legal when written may since have been claimed —
  those are dropped, falling back to the default rather than leaving a shortcut
  that can't fire. Not collisions, because swapping two actions' keys is a
  legitimate thing to find in the file, and checking each override against the
  defaults would throw the swap away as a clash with the key it was swapped out
  of. If two really do collide, the action order in `SHORTCUT_ACTIONS` settles
  it — that's what the first-match-wins listener is for.

- **Only changed shortcuts are persisted, never the whole set.** A default that
  moves in a later version has to reach everyone who never touched that one.

- **Matching is exact, not a subset.** A binding without Shift does not fire on
  a Shift-bearing press, and one without Alt does not fire when Alt is held.
  Loosening that so `Ctrl+K` also answers `Ctrl+Shift+K` swallows keypresses on
  their way to whatever they were actually aimed at — including BlockNote's own
  Mod-Alt formatting commands. `shortcut-service.test.ts` pins both directions.

- **Bindings are stored as fields, never as a display string.** `Binding` is
  `{ key, mod?, shift?, alt? }` where `key` is `event.key`; "Ctrl+K" is
  something `formatBinding` produces for the screen and nothing ever parses
  back. Storing the string would mean re-parsing it on every keystroke and
  inventing a grammar for the settings file to disagree with later.

- **`useShortcutLabel` is the only way a shortcut gets written on screen.**
  Hardcoding "Ctrl+K" into a button is how a rebound key ends up advertised
  wrong, which is worse than not advertising it at all. Now that shortcuts are
  user-changeable this isn't a style preference.

- **The global listener reads bindings at the keypress, not from a closure**,
  and sits out entirely while `isRecording` is set. Closing over the bindings
  would mean rebuilding the listener on every change; ignoring `isRecording`
  would mean the key being recorded also fires whatever it's currently bound
  to, on its way to being reassigned.

- **The recorder's capture-phase listener is what keeps Settings navigable.**
  It claims the keypress before anything else in the app sees it, which is how
  Escape cancels recording instead of closing the modal *and* how an arrow key
  pressed while recording gets offered as a binding instead of sliding the
  user onto the next settings tab. Moving that listener to the bubble phase
  breaks both at once, and the second one silently.

- **Whether the desktop build actually lets the page keep `Cmd+N` is
  unverified.** `preventDefault()` claims it from the page, and in a plain
  browser (`pnpm dev`) Ctrl+N is a browser-level accelerator that can't be
  taken back at all. Under WebView2 the answer depends on browser accelerator
  keys, which Tauri leaves enabled and doesn't expose in `tauri.conf.json`. If
  it turns out to be stolen, the fix is a different default binding, not a
  fight with the webview. `Cmd+S` is the ordinary case and behaves.

## Layout

- **The side panels' widths are custom properties on `.app-layout`, and the
  resize handles are positioned against the grid rather than inside the
  panels.** `--tree-w` / `--props-w` feed both `grid-template-columns` and the
  handles' `left`/`right`, which is what keeps a handle on the edge it belongs
  to. **A handle inside `.app-layout-properties` scrolls away with the
  content** — that panel is a scroll container, and this was the reason for the
  arrangement, not a preference.

- **`.app-layout-resizing` switching the column transition off mid-drag is
  load-bearing, not polish.** `.app-layout` transitions
  `grid-template-columns` over 150ms for the properties panel opening and
  closing. The handles have no transition, so during a drag the handle moves
  instantly and the column eases after it. Measured in a DOM replica of the
  shell: dragging the tree edge to 400px with the class on puts the panel edge
  at 400 and the handle at 398–403; with the class off the edge is at 400 and
  the handle is still at 258–263. **A 140px gap between the line you're
  dragging and the line that moves.** Anything that adds a third caller of
  these custom properties has to hold the same flag.

- **Widths are clamped everywhere they enter, not only where they're set.**
  `parsePanelWidths` gives stored settings the same treatment `parseOverrides`
  gives stored shortcuts, because `app-settings.json` outlives any version of
  the app and the limits in `constants/layout.ts` are free to move. The
  minimums are "the panel can still do its job", not an arbitrary floor —
  **don't lower either to 0 to make dragging a way to hide a panel.** A panel
  dragged to nothing leaves no edge to drag back.

---

## Navigation

- **Tree focus is session-only and lives in `focusedId` on the project store.**
  Never written to `project.json`, for the same reason `navHistory` isn't:
  reopening a project into a sidebar showing a fraction of itself, with no
  memory of having asked for that, is indistinguishable from pages having gone
  missing.

- **Selecting a page outside the focus clears the focus**, in `applySelection`
  — the one place every selection goes through. The tree cannot render a row
  for a page that isn't under the focused node, so the alternative is the
  sidebar silently failing to follow a search result or a wikilink. Selecting
  the focused node *itself* counts as leaving: it isn't inside its own subtree.

- **While focused, a drop at the tree's root means "into the focused node".**
  react-arborist reports `parentId: null` for a root drop and has no idea the
  tree starts partway down; `parentId ?? focusedId` in TreePanel is what stops
  a drag to the top of a focused tree throwing the page out to the project
  root — the one place the person doing it can't see.

- **`selectNode` is the only thing that records a visit, and that is the whole
  design.** Phase 14's back/forward stack lives in `navigation-service.ts` as
  pure functions over `{ entries, index }`; the store appends to it inside
  `selectNode` and nowhere else. Nine call sites navigate today — the tree, the
  breadcrumb, mentions and wikilinks, search results, the All properties view,
  the sidebar's home button, a newly created page — and none of them knows the
  history exists. **Don't add a second path that sets `selectedId` directly.**
  `goBack`/`goForward` are the deliberate exception and go through
  `applySelection`, which is `selectNode` minus the recording; anything else
  that skips the recording is a page you can't get back from.

- **This is not the undo history and must never share a key or a button with
  it.** `history-service.ts` reverses *edits*; this reverses *location*.
  Pressing Back after a rename goes to the previous page with the rename
  intact, and that distinction is the feature — see the top of
  `navigation-service.ts`.

- **A deleted page has to leave the stack in the same write that deletes it.**
  `deleteNodes` calls `forgetNodes` with the whole removed subtree, for exactly
  the reason it already clears `selectedId` and `homeNodeId`: Back landing on a
  page that no longer exists renders an empty page view with nothing to explain
  it. Removal can leave the same location either side of the gap, so duplicates
  collapse — two identical entries in a row make Back look broken.

- **Nothing here is written to disk, and that's a decision.** Reopening a
  project starts the stack from the page you left, with nothing behind it. A
  persisted trail would offer Back to a page from nine days ago and would hold
  ids for pages that may not exist anymore.

- **Alt with a *named* key is a legal binding; Alt with a letter is not.** The
  shortcut rule was "Ctrl/Cmd or a function key", which would have refused
  Alt+←. `isAltNamedKey` in `shortcut-service.ts` is the third case, and the
  test behind it is *can this keypress produce a character* — `event.key`
  longer than one character means no. Alt+letter types å on a Mac and opens
  menus on Windows, so it stays refused. **Known and unfixed:** Alt+←/→ are
  move-by-word in a text field on macOS, so these defaults take a keypress the
  OS wants there. The fix, if it ever matters, is per-platform defaults —
  nothing else in `constants/shortcuts.ts` has them, which is why it wasn't
  done for one action.

---

## Undo

- **An entry is two closures, not a diff.** `state/history-store.ts` holds a
  stack of `{ label, undo, redo }` and knows nothing about pages. The store
  action performing an operation builds both halves at the point it happens,
  where the old values are already in hand, and reverses itself by calling the
  ordinary store actions — `renameNode` back to the old name, `moveNodes` back
  to the old parent, `deleteNodes` on something that was just added. The
  alternative, diffing state and reconciling disk, means a second
  implementation of the path-relocation logic in `filesystem-service.ts`. That
  is the one part of this app that has already lost the user's pages, and it
  does not need a rival.

- **Only `restoreNodes` in `project-store.ts` writes disk before memory.**
  Everywhere else in that store is optimistic on purpose — the UI updates and
  the write catches up. Undo can't be: an optimistic restore whose write then
  fails leaves the tree showing pages that aren't on disk, which is the exact
  shape of the 2026-07-31 data loss. It writes first and throws on failure, and
  `history-store` keeps the entry so the next press is a retry rather than a
  silent skip past it.

- **Deleting captures the pictures before it deletes them.** Images and banners
  live in the flat `assets/` dir and are removed with the page, so undo has
  nothing to read afterwards — `captureAssets` reads the bytes first and the
  entry holds them. This is why `deleteNodes` is async. It's also the only
  reason the stack has a size limit worth having (`HISTORY_LIMIT`): entries can
  hold whole deleted subtrees, image bytes included.

- **Snapshots restore ordering only, never selection or expanded folders.**
  `OrderingSnapshot` is `rootOrder`/`childOrder`/`homeNodeId` and deliberately
  stops there. Undoing a delete from ten minutes ago shouldn't also collapse
  every folder opened since, or move the user off the page they're reading.

- **The stack is cleared on every project boundary** — open, close, create,
  import. An entry closes over the project it was recorded in; running one
  afterwards would write pages from the old world into the new one.

- **Colour has its own store action** rather than the tree looping `updateNode`.
  A loop is one undo entry per selected page for something the user did once.
  Anything else that becomes undoable across a multi-selection needs the same
  treatment.

- **Text you type is not on this stack and shouldn't be.** BlockNote has its
  own history for that, and the two are kept apart by the editor scoping above.
  Property edits, tags and tab changes aren't recorded either — that's a real
  gap rather than a decision, and the way in is a dedicated action per
  operation, the way `setNodeColor` did it.

## Project home

- **Home is an ordinary page that's been *designated*, not a reserved node.**
  `Project.homeNodeId` points at it and that's the whole mechanism — no special
  file, no exclusion from the tree, no branch in the loader or the path
  resolver. This is LK's own model (right-click any page → "Set as project
  home"), confirmed against a live LK account. The reserved-node design was
  considered first and is worse: it needs its own storage path, its own load
  step, and a rule for what happens when the user wants a *different* page to
  be home.

- **A designated page stays exactly where it lives in the tree.** It isn't
  hoisted to the root or hidden from its parent — home can be nested three
  folders deep and still be home. The house badge on its row is the only thing
  marking it, which is why that badge doesn't hide on hover the way the row's
  colour dot and add button do.

- **Deleting the home page is allowed and clears the designation** — including
  when home was merely *inside* a deleted subtree rather than its root. A
  dangling `homeNodeId` would leave the tree's house button pointing at
  nothing.

- **`setProjectHome` writes `project.json` immediately**, not through the
  debounced `PROJECT_META_SAVE_KEY` path that selection and expanded-state use.
  Those are incidental UI state; this is a deliberate act the user just
  performed.

## Product decisions

- **Hidden means "not shown to other people", never "out of the way".** A hidden
  page stays in the tree, in search, in the same place, fully editable — it goes
  dim and italic and nothing else. LK's wording is what she's matching ("only
  admins can see hidden pages"), and it's the same idea `Tab.hidden` already
  carried one level down. **Don't repurpose it as an archive or a declutter
  toggle**, and don't add "collapse hidden pages out of the tree" to it: that's a
  different feature that happens to share a word, and hanging it on this flag
  means one switch doing two jobs she'd want set differently.

- **The hidden cascade is derived, never stored.** A hidden page hides everything
  under it, and only the page's own flag is written (`tree-service.ts`'s
  `isHiddenByAncestor` walks up for the rest). Stamping descendants would strand
  them hidden the moment one is dragged out, with nothing on screen saying why,
  and un-hiding the parent would stop un-hiding anything. Going back to visible
  deletes the field rather than writing `false`, so a page that was never hidden
  and one that was un-hidden are the same file.

- **Nothing consumes `Node.hidden` yet.** It ships ahead of the thing it's for:
  Phase 1.5's publisher is what has to read it, and a publisher that doesn't
  puts the pages she marked private on a website. Noted in `docs/plan.md` under
  Phase 1.5 as well, because that's where someone will be looking.

- **Folders get full-row colour tinting; pages get icon-only.** Folders are
  categorical anchors and should read as containers; pages are their contents and
  shouldn't compete. Colour cascades to descendants, and the node that *set* the
  colour gets a left-border stripe so ownership is visible.

- **Empty folders stay folders** — an empty container isn't visually demoted; the
  user may be preparing it.

- **File-per-node mirroring the tree**, not a flat directory of hash-named files.
  The user must be able to open the project folder in Explorer and understand it.

- **"Open folder" works anywhere on disk**, not sandboxed to Documents. The user
  chose this: a native dialog that browses anywhere but then silently fails
  outside one directory is worse than trusting where you're pointed — same as
  VS Code, Obsidian, or LegendKeeper.

- **LK banners and sidebar images are different things** and must stay separate
  fields. Reusing one for the other was proposed and firmly rejected.

- **The Species template exists** because the user's real LK export has a
  Species-shaped page (Foxians: Overview / Biology / Lifestyle / Beliefs /
  Relations).

- **A project is called a "project" in UI copy, never a "world".** Her decision,
  Phase 11: the fiction and the container shouldn't share a word, or "export your
  world" stops being clear about what it exports. The word *world* is fine in
  comments and docs where it means the fiction — it's user-facing strings that are
  fixed. The two disagreed for months, so don't reintroduce it.

- **`sandbox/theme-sandbox.html` duplicates the app's CSS and nothing enforces
  that the copy stays true.** It's a hand-written mock built against the real
  token names, which is what makes it useful and also what makes it rot: rename a
  token, change a font stack, restructure a component, and the sandbox keeps
  showing the old app without erroring. If you touch `src/index.css` tokens or
  `controls.css`, look at the sandbox in the same pass. Its `fonts.css`,
  `fonts-library.css` and `fonts-library.js` are all generated by
  `scripts/build-fonts.mjs` — the woff2 files are inlined as data URIs because
  a `file://` page can't load fonts any other way, and being double-clickable
  is the whole point of it.

- **`scripts/build-fonts.mjs` feeds the app and the sandbox from one list, and
  that is the point of it being one script.** It writes the sandbox's inlined
  copies *and* `public/fonts/library/`, `src/fonts-library.css` and
  `src/constants/font-library.ts`. The app gets plain files rather than the
  sandbox's data URIs deliberately: 6MB of base64 parsed at every launch to
  decode three faces is a real cost, and separate files mean the browser reads
  only what a theme actually names. Two lists would let the sandbox offer a
  font the app doesn't have, which is precisely the bug the generated manifest
  exists to prevent — never hand-write either output.

- **The font library is fetched from Google Fonts at *build* time, by a
  developer running `node scripts/build-fonts.mjs`.** Not by the sandbox, not
  by the app, not at runtime, and not on her machine — everything ships as
  bytes already in the repo. That's what keeps a hundred fonts on the right
  side of the Policy Boundary. If you ever find yourself adding a `<link>` to
  `fonts.googleapis.com` anywhere, that's the line, and the answer is to run
  the build script instead. Downloads cache in `scripts/.font-cache/`
  (gitignored), so reruns are offline.

- **Every family in that library is OFL or Apache 2.0 — deliberately, and now
  load-bearing rather than aspirational, since Phase 12 ships all 98 inside the
  app.** The sandbox also offers Windows system faces, and those are marked
  separately because Microsoft's licence doesn't let us redistribute them:
  picking one means the theme falls back to something else everywhere,
  including on her own machine, since the app doesn't carry them. The
  distinction is surfaced in the sandbox UI and in the exported CSS's comments,
  and it needs to stay surfaced. Adding a family to `LIBRARY` that isn't openly
  licensed puts unlicensed fonts in the installer.

- **A theme file is user-supplied CSS, and CSS can make network requests.**
  `@import url(https://…)`, `background: url(https://…)` and a remote
  `@font-face src` are all fetches the moment the rule matches, the app ships
  with `"csp": null`, and a theme someone downloads would then report every
  launch to a stranger's server. `sanitizeCustomCss` in `theme-service.ts`
  strips everything that isn't a `data:` URI or an app-bundle path (`/…`)
  before the CSS is ever injected, and tells the user what it removed. **Do not
  route theme or snippet CSS into the document by any path that skips it**, and
  don't "fix" a theme whose background image went missing by relaxing it — that
  missing image is the rule working. It's a scanner, not a CSS parser, and
  errs towards blocking on purpose.

- **A settings section that doesn't fit on screen wants splitting, not a longer
  panel.** Everything Phase 12 added went into the Appearance tab until it was
  five stacked sections in a 28rem dialog and she called it what it was: *"why
  is it one tiny ass column? it goes on and on and on."* Those are one fault —
  a narrow dialog can only stack, and past a screen or two a stack stops being
  something you read and becomes something you scroll past. The dialog is now
  `ui-modal-xl` with a vertical rail, and Appearance is four peer panels rather
  than one tab holding five `<section>`s. **Adding a settings area is one entry
  in `SETTINGS_TABS`** — a new `<section>` appended to an existing panel is how
  this happened the first time.

- **Only `.settings-panel` scrolls, and the dialog is a fixed height.** Every
  wrapper above the panel is a flex or grid box with an explicit `min-height:
  0`; drop one and the whole dialog scrolls as one, taking the title, the rail
  and the section heading with it — a settings screen you scroll with no way to
  see which section you're in. The fixed height is separate and also load-
  bearing: the modal is centred, so an auto-height dialog moves the rail by half
  the height difference on every panel swap, and the entry you just clicked
  jumps out from under the pointer. A `min-height` floor used to paper over
  that; a real height removes it. Both relax deliberately under the media query
  for short or narrow windows.

- **`--color-text-muted` has a contrast floor of 4.5:1 against both
  `--color-panel` and `--color-bg`, in every theme.** It carries real
  information at 11–13px — theme notes, field hints, dates, counts, tree
  metadata — so it is AA small-text, not decoration. All six themes were under
  it (3.14 to 3.94) until they were measured on 2026-08-07, the default worst of
  all; nothing had ever been checked, which is how a whole palette fails one
  test together. `--color-text-placeholder` sits at 3:1 on purpose — it labels a
  field you're about to type over. **A new or retuned theme isn't finished until
  both are measured against both backdrops.** Figures per theme are in
  `docs/constants-and-theming.md`.

- **A palette colour tints a background; it never colours text.** `COLOR_PALETTE`
  is ten pastels (`#5eead4`, `#fcd34d`, …) chosen to read against dark themes, so
  any of them used as a text colour fails the floor above the moment someone
  opens Daylight — and unlike a theme token, nothing re-tunes per theme, because
  these are *data*, not tokens. Phase 13's select/status chips are the pattern to
  copy: `${hex}26` background, `${hex}59` border, text left on
  `--color-text-primary`. `FolderView`'s `${effectiveHex}14` is the same move.
  The colour is decorative and the theme's own token carries the legibility.

- **A `:hover` block names a hover token, never a surface token.** Hover had no
  token of its own until 2026-08-08 and borrowed whatever surface looked close —
  `--color-panel-edge` for tree rows, `--color-panel-alt` for icon buttons and
  menu rows, `--color-accent-faint` for accented ones. A borrowed surface is one
  a theme is allowed to set equal to the thing it sits on, and `daylight` does:
  its `--color-panel` and `--color-panel-edge` are both `#ffffff`, so hovering a
  page in the sidebar was **white on white, a measured distance of 0**. Use
  `--color-hover`, `--color-hover-strong` or `--color-accent-hover`. They're
  `color-mix(in oklab, …)` over `--color-hover-pole`, which is white or black
  depending on the panel's own lightness, so they pick their own direction and
  follow along when backgrounds are retuned. **Don't "simplify" them into fixed
  values** — fixed is what broke, and `filter: brightness()` is the same mistake
  in another spelling, since it only lifts. Reasoning in
  `docs/constants-and-theming.md` §Hover is a film.

- **A hover token is translucent, and must stay that way.** Hover is painted on
  four different surfaces — `--color-panel` for a tree row, `--color-panel-alt`
  for a settings row, `--color-panel-edge` for a menu row. Any *opaque* value
  computed from one of them is wrong on the other three by however far apart
  they happen to be, which is a bug that hides until a theme puts them close.
  "Match the others to Panels" does precisely that: on a yellow theme it left a
  settings row's hover at a measured **19**, and the shipped `dark`, `ember`,
  `grove` and `nightbloom` were already at 11–16 on `--color-panel-edge` without
  anyone noticing. A film composites over whatever it lands on, so the step is
  the same size by construction: **67–97 across every shipped theme and
  surface.** If you find yourself making a hover token opaque so a swatch reads
  nicely, fix the swatch — `flatten` exists for that — not the token.

- **`--color-hover-strong` means emphasis, not "on a raised surface".** That was
  its old meaning and it only made sense while hover was opaque and computed
  from the panel, so a popover needed a bigger step to make up the deficit. A
  film has no deficit: plain `--color-hover` lands at 79–87 on
  `--color-panel-edge`, where the old strong managed 60–78. `-strong` is now for
  something stacked on an already-hovered row, or marking the keyboard
  selection. Repointing every old site at 20% would have doubled the weight of
  every context menu in every dark theme — a redesign smuggled inside a bug fix,
  which is the actual thing to avoid here.

- **A hover mix takes the panel and nothing else.** The first version of the
  above mixed the panel toward `--color-text-primary`, on the reasoning that
  text is the far end of a theme's contrast. That's a property of a *finished*
  theme, and a theme halfway through being edited doesn't have it: a pale pink
  panel on a theme whose text was pale cyan moved hover by a measured **6** —
  invisible, and reported as such within an hour of shipping. The general rule
  it broke is worth more than the fix: **a derivation must not depend on a token
  it isn't derived from**, because the user can move that token independently
  and will. The pole reads the panel's own lightness, so there's nothing else to
  drag it off course.

- **The three editable hover tokens are in `AUTO_TOKENS` and must stay out of
  `seedFromDocument`, and must be refreshed by `withAutoTokens` on every edit.**
  Copying a theme deliberately writes out every colour it
  resolves to, so the copy is complete and independent of its source. Applied to
  hover that's backwards: it pins hover to whatever the panel colour was at the
  moment of the copy, and the next change to the backgrounds leaves it stranded
  — the exact drift the mixes exist to prevent. They're still offered as pickers,
  so a value she actually chooses is written and kept. The refresh is the other
  half: `draft.resolved` is a snapshot taken when the theme was opened, so
  without re-reading them after a colour change the three Hover swatches keep
  showing the hover of the panel colour from *before* the edit. The app is right
  either way — the mixes recompute in CSS — so this is a bug you can only see in
  the pickers, which is where it was found.

- **`resolveTokenColor` returns `""` for a token that doesn't resolve, and the
  sentinel is what makes that true.** An unresolvable `var()` makes `color`
  invalid at computed-value time, and an invalid `color` *inherits* — so the
  obvious implementation hands back whatever text colour the document happened
  to be using, and its callers write what they're given into her theme file. A
  plausible wrong answer is worse here than no answer, since the callers already
  know how to skip an empty one. Don't remove the sentinel to "simplify" it.

- **`--color-on-scrim` is fixed light in every theme, and that's not an
  oversight.** The three controls sitting on a user's image — the banner hint,
  the banner's remove ×, the portrait's remove × — drew themselves in
  `--color-text-primary`, which is `#1c1c1f` on `daylight`: a black icon on a
  dark wash. Measured there at **1.11:1 over a dark photo and 1.74:1 over a
  mid-tone**, against 4.39:1 over a bright one. A photo doesn't follow the theme,
  so what's drawn on it can't either.

- **A theme is a file she owns, so the app must be able to delete one.** The
  folder was always hers to manage from Explorer, and that was quietly the whole
  answer for a while — but a list of themes with no way to remove one from
  inside the list reads as a bug, and is. `deleteTheme` flushes the pending
  debounced write *first* (a queued write landing after the delete recreates the
  file), removes it, then re-scans — the re-scan already knows how to fall back
  to the default when the selected theme's file has gone, because Explorer
  deletes had to work anyway. Don't add a second fallback path beside it.

- **Anything destructive must report a failure it couldn't perform.** The two
  "Open folder" buttons swallowed their rejection and did nothing, twice, with
  no way to tell that from a slow file manager; the theme delete would have been
  the same failure with a file's worth of stakes. `deleteError` names the file
  and the path, so the folder she owns is still reachable by hand.

- **`ConfirmDialog` is mounted at the app root, not in `AppLayout`.** It lived
  in `AppLayout` for a long time, which only renders once a project is open —
  so `confirmDestructive` called from the start screen set a pending confirm
  nothing was rendering and awaited a promise nothing would resolve. Settings is
  reachable from that screen and now has a delete button in it. It portals to
  `document.body` regardless of where it sits, so root costs nothing. Don't move
  it back down.

- **There is one theme format, and it's a `.css` file in the themes folder.**
  Three things make themes now — the sandbox's export, the colour and gradient
  pickers in Settings, and a text editor — and none of them has a state of its
  own. The pickers serialize to a stylesheet on every change (`theme-editor.ts`)
  and parse one back when a theme is selected; the file is what's true and the
  controls are a view of it. **Don't give the editor its own JSON.** The moment
  it has one, a hand-written theme becomes something the app can only partly
  understand, and the round trip that lets her build in the sandbox and adjust
  in Settings stops working. `theme-editor.test.ts` guards both directions.

- **A face belongs to the theme, and there is one deliberate exception.**
  `--font-*` is written into the theme's own file by the same `patchTheme` path
  the colours use, so switching theme switches the fonts. The exception is
  `fontsEveryTheme` in `theme-store.ts`: with it on, `state.fonts` is applied
  as an inline override that outranks every theme, which is what fonts used to
  do unconditionally. **Both halves are load-bearing — don't delete one to
  simplify the panel.** They exist because a title face is part of a theme's
  look while a reading face is a readability preference, and shipping only the
  second put two identically-shaped panels next to each other teaching opposite
  rules, with nothing on screen distinguishing them. The bug that surfaced it
  looked like a theme copy inheriting a later font change; it was the override
  sitting on top of a copy that was fine.

- **An absent `--font-*` in `draft.fonts` is a statement, not a gap.** It means
  the theme asks for no face there and the base tokens decide, so `patchTheme`
  *removes* the declaration — the same shape as a gradient being switched off,
  and the only way "back to the app's own" can be written down. Two consequences
  to keep: `readThemeDraft` must not resolve fonts against the document the way
  it resolves colours (every theme would look like it had chosen a face it never
  names), and any code building a `ThemeDraft` by hand has to carry the fonts it
  read or it will silently strip them on the next write.

- **Two things about `fontsEveryTheme` will look wrong and aren't.** Settings
  written before it existed have no flag, so it's inferred as *on* when any font
  is saved — anyone who had picked a face had picked exactly what it now
  describes, and defaulting them to off would take a font off their screen on
  upgrade to make a point. And `cacheAppearance` stores the *effective* set, not
  `state.fonts`: the paint cache reproduces the first frame, so caching
  overrides that aren't in force would flash them over a theme not using them.
  That's also why the cache can't record the flag and doesn't need to.

- **Import is a fourth maker of themes and it obeys the same rule: it produces a
  file in the folder and then gets out of the way.** A `.css` is *copied*, byte
  for byte — running somebody's hand-written theme back through `serializeTheme`
  would reflow their file on the way in and lose everything the pickers don't
  model, which is the same bug `patchTheme` exists to prevent. A `.json` palette
  is mapped by `palette-import.ts` and written out once; after that it is an
  ordinary theme file with no memory of having been imported. The id comes from
  the *scan after the write*, not from the filename — an imported `.css` may
  declare its own `[data-theme]`, and selecting a guessed id leaves the document
  wearing a name none of the file's rules match.

- **A palette carries colours but no roles, and its names are a hint rather than
  an instruction.** The case that settled it is in the test fixture: her
  CharSnap export calls a near-white `primary`, which is body text, while the
  colour that behaves like an accent is called `secondary`. So in
  `palette-import.ts` a matching name only *scores*, and what a colour measures
  — chroma, luminance, contrast against the window — decides the role. Don't
  turn the hint lists into a lookup table; the next palette names things
  differently again.

- **Everything derived in the importer is solved for a ratio, never chosen.**
  The four text steps and the three border weights binary-search to a target
  contrast against *both* the window and the panel — see the contrast floor rule
  above, which this is the same rule applied to input nobody vetted. A theme
  arriving from outside cannot land below the floor the built-ins are held to,
  whatever the file said. If a new token needs deriving, derive it the same way.
  **Derive toward the theme's light (or dark) end, not toward its body text** —
  mixing callout text toward `textPrimary` pulled all three callouts onto one
  hue, so a violet Secret came out with pale cyan words on a cyan-texted theme.

- **The contrast floor is a test now, not just a rule.** `palette-import.test.ts`
  parses every `[data-theme]` block out of `index.css`, merges it over the
  `@theme` base, and checks both quiet greys against both surfaces plus the
  three border weights' ordering. It lives in that file because `contrast` is a
  service and `constants/` may not import one. `dark`'s `--color-border-subtle`
  is a *recorded* exception at 1.097:1 — held as a ratchet that may not get
  fainter rather than silently retuned, because changing the original palette is
  a decision and not a tidy-up. Add a theme, and this catches you.

- **The importer solves for a floor; a built-in is held to the band.** Abyssal
  is the first theme that came out of `palette-import.ts` rather than the
  sandbox, and four of its values are hand-tuned away from what the importer
  produced — a Secret stripe at 3.35:1 clears the importer's ≥3 and is still
  invisible next to the other darks' 6.1–9.6. **A generated theme is a starting
  point for a built-in, not the built-in.** Every deviation is justified in the
  comment above its block; keep it that way, or the next person "fixes" them
  back to what the tool said.

- **An edit changes the values it was asked to and nothing else. Never
  regenerate a theme file.** The pickers originally called `serializeTheme` on
  every change, which builds a file out of the twenty-odd tokens this app knows
  about — so one click on a swatch replaced a hand-written theme with the app's
  rendering of it. Rules, comments, selectors, custom properties: gone, with no
  warning and no undo, on a file the user had written by hand. `patchTheme`
  replaced it: locate the declaration, change the value, put the file back.
  `serializeTheme` is now only for a file that doesn't exist yet.
  - **Patch `raw`, not `css`.** `CustomStylesheet` carries both because
    `sanitizeCustomCss` runs on load — writing the vetted copy back would bake
    the vetting into her file, turning a `url(…)` the app declined to fetch
    into a permanent `none` in her own stylesheet. What the app refuses to
    *load* and what it may *change* are different questions.
  - **The derived tints follow the same rule**: rewritten only when the file's
    current value is still the one `deriveTokens` would have produced for the
    colour that was there before. Anything else is a value somebody chose.
  - `backupCssFile` keeps one copy per file per session under
    `themes/backups`, taken inside `flushThemeEdit` *before* the write —
    that's the last moment the on-disk file is still hers. Nothing about a
    failed backup may block an edit she asked for; it sets `backupFailed` and
    the panel stops promising a copy.

- **A theme file owns its own id, so every path that loads one has to re-read
  it.** `[data-theme="…"]` is parsed out of the file (`toStylesheet`), but the
  id also lives on the document, and for a while only `selectTheme` set it. A
  rescan therefore left the app wearing the previous id while the file's rules
  were written against a new one — unscoped declarations applied, scoped ones
  didn't, and it presented as a reload that only half worked. `scanFolders` now
  reconciles `themeId` against the selected file and persists the correction,
  because the settings file stores the id too.

- **A picker being dragged shows its change with an inline custom property, and
  writes nothing until the hand stops.** `previewDraft` sets the changed token
  on the root element and moves the draft; `flushThemeEdit` — on the same 400ms
  debounce that always guarded the disk write — does the file text, the vetting,
  `apply()` and the save. The split exists because the old path ran *all* of
  that per `input` event: two stylesheet reparses, two forced style recalcs
  (`readThemeFonts` and `applyBootBackground` both read the document back), and
  a synchronous `localStorage` write, at drag frequency. **`apply()` must call
  `clearPreviewedTokens()` first** — an inline property outranks every
  stylesheet, so anything measuring the document while previews are up measures
  the preview. Two things deliberately aren't previewed: `deriveTokens`' tints,
  because guessing whether one is app-written or hand-tuned would make it snap
  back on release, and a gradient being switched on or off, because that adds or
  removes declarations rather than changing a value — those commit immediately.

- **"Make a copy I can edit" has to write out everything the theme was using,
  not just the colours.** The theme being copied is not in the cascade behind
  the copy — the copy is a new `[data-theme]` id, so anything it doesn't declare
  falls to the *base* tokens in `index.css`, not to the original. That's how a
  copy of Midnight came out in Inter/Fraunces/Newsreader: it's the only built-in
  that sets `--font-*`, and `seedFromDocument` only walks `COLOR_TOKENS`. Fonts
  come from the store's `themeFonts` rather than from `getComputedStyle`
  alongside the colours, because a font she chose in Settings is an inline
  property on the same element and reading the document would bake her override
  into the copy as if the theme had asked for it. **Adding a new per-theme token
  family means adding it here too**, or copies quietly lose it.

- **The themes and snippets folders are watched, and the watch has two rules
  that aren't optional.** `watchCssDirs` is non-recursive, because `backups`
  lives *inside* the themes folder and the app writes to it — a recursive watch
  reloads off the back of its own safety copy. And the store ignores events
  inside `SELF_WRITE_QUIET_MS` of its own write (`lastSelfWrite`), because the
  watcher can't tell her save from ours: without it, every debounced write from
  a dragged colour picker fires a rescan, and `scanFolders` starts by flushing
  the pending write, so the debounce stops debouncing. The `watch` feature on
  `tauri-plugin-fs` is off by default — it's enabled in `src-tauri/Cargo.toml`,
  with `fs:allow-watch`/`fs:allow-unwatch` in the capability. A watch that can't
  be started is caught and dropped silently on purpose; "Check for new ones"
  is the fallback, so the failure costs a step rather than the feature.

- **A gradient that's off must not be written at all.** `--gradient-x: ;` is not
  the same as absent: every surface reads it as `var(--gradient-x, none)`, and a
  declared-but-empty custom property resolves to *nothing*, which turns
  `background: , var(--color-panel)` into a syntax error and drops the surface's
  colour entirely. `serializeTheme` omits the declaration; keep it that way.

- **Seed a gradient from the document, not from the theme file.** A theme only
  has to name what it changes, so a file that sets four tokens still renders a
  complete-looking app off the base values. Seeding a new gradient from the
  file's own colours gave `#000000` for anything it hadn't declared — a black
  wash over a surface that was plainly some other colour on screen.
  `toggleGradient` in the store resolves through `getComputedStyle` first.

- **Gradient tokens are undefined by default, not empty.** All twelve are read
  as `var(--gradient-x, none)` at their use sites and declared nowhere. A
  declared-but-empty custom property resolves to nothing, which turns
  `background: , var(--color-panel)` into a syntax error and drops the
  surface's colour entirely — so "off" has to mean *absent*. Don't add
  `--gradient-bg: none;` to `:root` to make the set look complete.

- **Themes and snippets live beside her projects, not inside one and not in the
  app's data folder.** `<projectsDir>/themes/*.css` and `…/snippets/*.css` — a
  theme isn't part of a world, and she has to be able to find the folder to put
  a file in it. Both are created on scan so the "Open folder" buttons always
  land somewhere. A theme file's `[data-theme="…"]` id is read out of the file
  and put on the document, which is what makes a sandbox export work unedited;
  don't switch to deriving the id from the filename.

## Known gaps

Deferred on purpose, not forgotten:

- **Nothing has been imported into real LegendKeeper from an export we wrote.**
  The round trip is verified through our own importer, against the real
  75-resource `Valeraverse.lk`, which proves the mapping is self-consistent —
  not that LK accepts the file. That needs an actual LK account and an import
  attempt.
- **`duplicateNode` stamps every clone in a subtree with the same `createdAt`**,
  so a duplicated folder's children come out in arbitrary order. Cosmetic.
- **The "15 broken cross-reference links" were never the user's links** — that
  entry, and the guess that they pointed at the LK project root, were both
  wrong. Checked directly against `Valeraverse.lk` on 2026-07-31: all 15 live in
  the root resource's own documents, are LK's stock welcome page linking to
  *their* demo world (Wiki City, Tab Tundra, Temple of Time…), and none of their
  targets exist in the export. Skipping that boilerplate on import removes them
  entirely, which is the right outcome rather than a loss — the root page held
  nothing else. Her world contains **no** cross-references at all, so the
  mention paths in both directions are covered only by synthetic tests.
- **The Windows path-length refusal has never fired against a real project.**
  Verified by test only.
- **The updater's download-and-install path has never run against a real
  release.** v0.2.0 is published and the check path is verified end to end, but
  nothing has yet *found* a newer version, because v0.2.0 is the newest. The
  first real exercise of download → signature check → install happens on the
  next release; watch it rather than assuming it works.
- Not built and not scoped: theme switcher and the five extra palettes, cloud
  sync, mobile, user-editable templates, interactive atlas, timeline views, and
  any LLM feature in the editor.
