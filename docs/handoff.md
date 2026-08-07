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

**Phases 0–10 are done. The app is shippable**, and Phase 1.5 (Publish) is what's
in front of it. `docs/plan.md` has phases 11–23; `docs/shipped.md` has what each
finished phase delivered.

The two most recent ones are the ones a new session is most likely to touch.
**Phase 9 — LK Export — shipped 2026-07-31**, so the format goes both ways; §LK
export has the constraints that govern it and §Known gaps has the one thing it
doesn't prove. **Phase 10 closed the same day** — search, keyboard shortcuts and
rebinding, sidebar undo/redo, and releases that build and sign themselves for
four platforms on a tag push. §Search, §Shortcuts, §Undo and §Updates below are
the parts of that still binding on the code.

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

- **Don't set `canHaveChildren: true` on `note`** (or any leaf template) to solve
  a nesting problem. Storage kind is derived from that flag, so flipping it moves
  every existing note from `Name.json` to `Name/_page.json` — a silent on-disk
  migration of the user's real data, with no migration step written.

- **Collision suffixes are recomputed, never stored**, so changing one sibling
  renumbers the others. `planRelocations` exists solely to keep disk in step with
  that; deleting it reintroduces two directories claiming the same node id.

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

- **A leaf template can never be a drop target.** It has no directory of its
  own, so a child filed under it is written into a marker-less directory and
  disappears from the tree on the next load. Enforced twice on purpose —
  `TreePanel`'s `disableDrop` and the store's `moveNodes` — because losing a
  subtree is too expensive to guard in one place. This is separate from
  `canHaveChildren` gating the "Add child" button, which never covered drag.

- **Collision comparison is case-folded.** Windows and macOS default to
  case-insensitive filesystems, so `Ruins` and `ruins` are one file to the OS. The
  displayed segment keeps the user's own capitalisation — only the test folds.

- **`MAX_PATH_CHARS` is 200, not Windows' 260.** A directory-storage node's own
  path is only a prefix; its `_page.json` and every child beneath it are longer.
  A node sitting exactly at the OS limit has nowhere to put its contents.

- **Over-long paths are refused, not truncated.** `docs/spec.md` offered
  truncation ("keep the full name in the JSON body"). Silently renaming the user's
  files to make them fit is worse than refusing and saying why.

- **Images are addressed by filename, never derived from the page's name** — an
  uploaded image outlives any rename or move of the page it belongs to.

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

- **The load walk knows `MOVE_TEMP_PREFIX`, and that isn't optional.** Anything
  still parked under a move's temp name is a real page whose relocation was
  interrupted. A parked *file* has no `.json` suffix, so the extension check
  skipped it outright — that is exactly how two pages disappeared on
  2026-07-31. `repairStrandedNodes` renames them back afterwards and the count
  surfaces through `recoveredCount` (see `RecoveryNotice.tsx`).

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

- **`--fs-content` has exactly one user**, `.editor-shell .bn-editor`. It's the
  "Writing" slider, and that slider means the text on a page — the moment a
  second element takes the token, the control stops being predictable and
  starts being "some things, sort of". Page titles, tab strips and callout
  labels are interface and belong on `--fs-scale`.

- **`applyTemplate` merges only the tabs a page doesn't already have, by id.** It
  must never overwrite existing content.

- **`Node.customProperties` is optional, not defaulted** — pages saved before the
  field existed don't have it on disk, so every read site falls back to `[]`
  itself rather than relying on a default.

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

- **There is one theme format, and it's a `.css` file in the themes folder.**
  Three things make themes now — the sandbox's export, the colour and gradient
  pickers in Settings, and a text editor — and none of them has a state of its
  own. The pickers serialize to a stylesheet on every change (`theme-editor.ts`)
  and parse one back when a theme is selected; the file is what's true and the
  controls are a view of it. **Don't give the editor its own JSON.** The moment
  it has one, a hand-written theme becomes something the app can only partly
  understand, and the round trip that lets her build in the sandbox and adjust
  in Settings stops working. `theme-editor.test.ts` guards both directions.

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
