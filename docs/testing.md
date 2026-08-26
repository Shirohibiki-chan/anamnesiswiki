# Testing

Two suites, deliberately separate.

| | `pnpm test` | `pnpm test:app` |
|---|---|---|
| What it runs | `src/**/*.test.ts` — pure logic | `e2e/**/*.e2e.ts` — the real app |
| How | Vitest, no DOM, no window | Vitest + Playwright driving Electron |
| Takes | seconds | tens of seconds, plus a build |
| Needs | nothing | a screen (or `xvfb-run`) |

The first is the one to run constantly. The second answers questions the first
structurally cannot: whether what the app *shows* matches what it stored.

---

## The unit suite

Colocated `*.test.ts` beside what they test. Services are the tested layer —
path resolution, tree shape, LK conversion, autosave — because that is where the
bugs that cost real data have shown up. Components have no jsdom or RTL setup
and are not unit tested; they are covered, where they are covered at all, by the
suite below.

## The app suite

```bash
pnpm test:app
```

Builds the page for Electron, then runs every scenario in `e2e/` against it. Add
`--no-build` to reuse what is already in `dist/`, which is what you want on the
second and subsequent runs while writing a scenario. Name a file to run one:

```bash
pnpm test:app --no-build e2e/awkward-names.e2e.ts
```

### What it actually does

Each scenario file starts its own copy of the app and throws it away afterwards.
`launchApp()` in `e2e/harness/launch-app.ts`:

1. Checks `dist/` holds a page built for **Electron**, not Tauri. That mistake
   produces a window that cannot read a single file, and it is silent.
2. Generates a world into the system temp folder, via
   `scripts/make-test-world.mjs` — the same generator that writes the
   `Test World (generated)` folder you can open by hand.
3. Makes a scratch settings folder, writes the world into it as the last-opened
   project, and marks the one-time analytics notice as already seen so it is not
   sitting over the window.
4. Launches Electron with `--user-data-dir` pointed at that scratch folder.
5. Collects everything the page logs as an error, for the scenario to assert on.

**Two things keep a run away from her real data**, and both must stay true: the
world is generated in temp, and `--user-data-dir` moves the settings file. The
second matters more than it looks — without it the app would read the real
settings store and open whatever world she had open last.

### Writing a scenario

Scenarios are written in the vocabulary of `e2e/harness/screen.ts` and should
not reach past it into CSS classes of their own. The app has almost no test
hooks in its markup, so driving it means class names; kept in one file they
break loudly in one place when the app is refactored, rather than quietly
everywhere.

```ts
const app = await launchApp({ pages: 300 });
await waitForWorld(app.window);
await openPage(app.window, "Deep Nesting Test");
expect(await pageTitle(app.window)).toBe("Deep Nesting Test");
```

Points worth knowing before writing one:

- **The tree is virtualised.** A row four hundred pages down does not exist in
  the page at all. `openPage` goes through the tree's search box for exactly
  this reason, which is also how a person would find it.
- **A folder is not a page.** Folders render `FolderView` with its own heading;
  everything else renders `PageTitle`. `pageTitle()` covers both so a scenario
  does not have to care.
- **A world's name comes from its `project.json`**, not from its folder. They
  differ for a generated world, on purpose.
- **Assert on the error log.** `expect(app.errors).toEqual([])` at the end of a
  describe block is close to free and catches everything the visible assertions
  walked past.

### In CI

`.github/workflows/ci.yml` runs this as its own `app` job on Linux under
`xvfb-run`, which gives Electron a virtual screen. Under CI on Linux the harness
also passes `--no-sandbox`, because Chromium's setuid helper is not configured in
a runner; a run on somebody's own Linux desktop keeps the sandbox.

## Layout rules

`e2e/layout-rules.e2e.ts` opens five screens and measures what is drawn on each.
Four questions, all of them from this app's own bug history rather than from a
generic checklist:

| Rule | What it looks for |
|---|---|
| `dead-end-truncation` | text cut off with no tooltip and no other way to read the rest |
| `off-the-edge` | something sticking past the window with nothing clipping it |
| `covered-control` | a control whose middle belongs to some other element |
| `tiny-target` | an icon-only control smaller than 24×24 |

**Every rule starts as a count, not a failure.** `ALLOWED` in that file records
what each screen has *today*; a change that adds to a number fails, and a change
that removes from one is expected to lower the number in the same commit. A
check that goes red the day it is written teaches everyone to ignore it, and a
suite people ignore is worse than none.

**The numbers only ever go down.** Raising one to make a build pass converts a
bug report into permission, and it is the one edit to that file that needs a
reason written next to it. `off-the-edge` and `covered-control` are already at
zero everywhere and must stay there.

Findings print on every run, pass or fail, because a count says a screen is
wrong and only the list says where.

### Adding a rule

Rules live in `e2e/harness/layout.ts` and run as one pass inside the page —
asking Playwright about elements one at a time takes minutes for a few thousand
nodes, which is slow enough that nobody would sweep more than one screen.

**A rule earns its place by catching something real, and its first job is to be
quiet about everything else.** The `tiny-target` rule's first draft reported
twenty findings a screen, nineteen of them breadcrumb links and block titles
that are the width of their own words and perfectly easy to press. It only
became useful once it was narrowed to controls carrying no words at all. Budget
for that pass; a noisy rule is worse than a missing one.

## What this suite does not do yet

- **One window size.** Everything is measured at the default 1280×800. Narrow
  windows are where truncation bites hardest and nothing checks them.
- **No screenshot on failure.** A CI failure gives you the assertion, the error
  log and the counts, not a picture.
- **Settings is unswept.** It is the densest screen in the app and the layout
  rules never open it.
- **Linux only in CI.** It runs on Windows and macOS locally, but nothing checks
  those automatically.
