# Handoff: Pre-Development → Phase 0

## Where We Are

**Phase 2 shipped 2026-07-30.** The app now opens to a real project picker (recent projects, open any folder, or create a new one) and, once a project's loaded, a three-column shell (tree / page / properties) with a working right-panel toggle and a fading "Saved" indicator. The last-opened project reloads automatically on relaunch. Tauri's fs scope is now unrestricted (the user chose "anywhere on disk" over sandboxing to `~/Documents`) so opening a project from any location actually works. No tree contents, no page view, no editor yet — that's Phases 3-5.

This doc is now the running log of what's shipped and what's next — same shape as the CharSnap-tracker handoff.

## Repo Snapshot

Anticipated layout after Phase 0 lands:

- `src/` — React + TypeScript app (constants → services → state → hooks → components)
- `src-tauri/` — Tauri Rust shell (kept as thin as Tauri ships it)
- `docs/` — spec, plan, glossary, data model, LK format notes, references, this handoff
- `docs/prototype/anamnesis.jsx` — the reference React prototype (frozen; not part of the build)
- `CLAUDE.md` — architecture rules and policy boundary at repo root
- `CHANGELOG.md` — bootstrapped in Phase 0
- `README.md`, `LICENSE` — at repo root

## Reference Material Available

Everything Claude Code needs to start Phase 0 is already written:

- `CLAUDE.md` — architecture rules, layer order, naming conventions, policy boundary, don't-do list
- `docs/spec.md` — the full build spec; every phase item traces back here
- `docs/plan.md` — phased roadmap; work top-down, do not build ahead
- `docs/components-reference.md` — target component layout, one row per component with responsibility notes
- `docs/constants-and-theming.md` — CSS token system, palette, callout tokens, typography, folder-vs-page color rules
- `docs/glossary.md` — domain terms (node, tab, template, cascade, callout, secret, LK, etc.)
- `docs/prototype/anamnesis.jsx` — working React prototype demonstrating layout, template content, tree behavior, tab visibility, cascade colors, properties panel. **The canonical placeholder copy for all 8 templates lives here.**
- `README.md` — user-facing project intro; useful for setting the app's tone

Docs not yet written but referenced in the plan:

- `docs/data-model.md` — schemas for Node / Tab / Project on disk. Will be created in Phase 1.
- `docs/lk-format.md` — full LK `.lk` field mapping and ProseMirror block translation table. Will be created in Phase 8. The CLAUDE.md §LegendKeeper Import/Export section has the working notes; expand into a proper doc when the importer is being built.

## First-Time Setup Notes

Things worth knowing before Phase 0 starts:

- **Tauri v2 requires Rust.** If not already installed, follow the Tauri prereq guide (`rustup`, platform-specific build tools). The user won't need Rust on their end (only for building), but the dev machine needs it.
- **Package manager is pnpm, not npm.** All commands use `pnpm`.
- **Node 20+.** Older Node versions will fail the Tauri v2 install.
- **The file-per-node data layout on disk is critical to get right early.** Reparents and renames map to `fs.rename` calls. Phase 1 should nail this behavior before any UI is built on top; retrofitting it later is painful.
- **Windows path length matters.** Deep tree nesting + long node names can hit the ~260-char limit. Handle at the filesystem layer with a warning or truncation strategy.
- **Template placeholder copy is a designed asset.** The LK-style prompts in the prototype are the copy to ship — do not paraphrase, do not "improve," do not extract into a separate content system that makes them editable. They live in code as string literals in `template-registry.ts`.
- **BlockNote is the editor.** Do not fork it. Do not roll a custom ProseMirror setup. Extend via BlockNote's documented block-spec and extension APIs.
- **The `.lk` format is gzipped JSON with ProseMirror content.** This is good news — it maps cleanly to BlockNote. Bad surprises are limited to LK-specific block types (columns, inline icons) that need explicit translation.

## Recent Design Decisions

Decisions the user made during planning that affect scope:

- **LK import/export is Phase 1 must-have, not deferred.** The user has 75 pages in `Valeraverse.lk` that need to migrate on Day 1.
- **Folder colors use full-row tinting; page colors are icon-only.** Folders are categorical anchors and read as visual containers; pages are their contents and shouldn't compete with their folder's identity.
- **Colors cascade to descendants** unless overridden. The node that broke the cascade (the "owner") gets a solid left-border stripe in the tree to make ownership visible.
- **Empty folders stay folders.** An empty container isn't visually demoted — the user may be preparing it for future content.
- **The Species template was added** after finding a Species-shaped page in the user's LK export (Foxians, with Overview / Biology / Lifestyle / Beliefs / Relations tabs).
- **File-per-node on disk with tree-mirroring layout** — not a flat directory of hash-named JSON files. The user should be able to browse the project folder in Finder/Explorer and understand what's there.
- **No cloud, no auth, no network calls in Phase 1.** Full offline. No telemetry, no update pings, no font CDNs. Bundle everything.
- **Not a LegendKeeper client.** The app never talks to LK's servers. LK integration is file-based only.
- **Read-only publish (Phase 1.5) uses the same feature for co-writer sharing and eventual public release.** Same static-site generator, different filter settings.

## Known Design Gaps

Deferred to later phases; explicitly out of scope now:

- Theme switcher UI and the 5 additional themes (Light / Parchment / Foxian / Belobog / Deep Space) — hinted at in `constants-and-theming.md`, not built.
- Cloud sync architecture — a Phase 2 conversation, not a Phase 1 decision. Do not scaffold.
- Mobile version — not planned.
- LLM/AI features in the editor — explicitly excluded per CLAUDE.md.
- User-editable templates — templates live in code in Phase 1.
- Interactive atlas / nested maps — LK's atlas feature is not being cloned in Phase 1.
- Timeline / relationship graph views — future features, not scoped.

## What Phase 0 Delivered

Empty scaffold with the right shape. Tauri v2 window that opens, folder structure per CLAUDE.md, deps installed, CSS token system in place, dark theme applied, self-hosted fonts loaded, ESLint config. No worldbuilding functionality yet.

Dev machine notes for next time: the local clone lives at `C:\Users\shiro\anamnesiswiki`. pnpm and the Rust toolchain (via `rustup`) are now installed on this machine — the "First-Time Setup Notes" section above about needing Rust is resolved. The `fs` and `dialog` Tauri plugins are installed and registered in `src-tauri/src/lib.rs`, but no capability permissions are granted yet — that's a Phase 1/2 decision once `filesystem-service.ts` and the project picker actually need specific folder/dialog access.

## What Phase 1 Delivered

The data layer: load a project folder into memory, dispatch changes, write back to disk, autosave on content edits.

- `src/constants/schema.ts` — `Node`, `Tab`, `Project` types and their factory functions. `BlockNoteDocument` is a placeholder (`unknown[]`) until Phase 5 wires in the real editor and can swap in BlockNote's actual `Block[]` type.
- `src/services/filesystem-service.ts` — the sole disk-toucher. `resolveNodePath` is a pure function that recomputes a node's on-disk location (ancestor folder directories, plus its own file or `_folder.json`) directly from the in-memory node graph every time, rather than storing a path. That means a rename or reparent is just "resolve the old path, resolve the new path, `fs.rename` if they differ" — no separate tracking of what a node used to be called on disk. Same-parent, same-name, same-type siblings get a deterministic ` (2)`, ` (3)`... suffix on the filename only (ties broken by creation time then id), and a folder/page sharing a name never collides since one's a directory and the other's a `.json` file. Covered by 7 Vitest unit tests in `filesystem-service.test.ts`.
- `src/services/autosave.ts` — per-key debounced (300ms) save scheduler. Structural changes (create/rename/move/delete) write immediately instead of debouncing; only in-place content edits (`updateNode`) go through the debounce.
- `src/state/project-store.ts` — Zustand store holding the in-memory node graph, wired to the two services above. Keeps `project.rootOrder` in sync when nodes are added, moved in/out of the root, or deleted. Deleting a folder also drops its in-memory descendants (the actual on-disk subtree is removed in one `fs.remove(..., {recursive: true})`).
- `src/hooks/use-project.ts` — the only import path components have into the store, per CLAUDE.md's layer rule.
- Tauri's fs capability (`src-tauri/capabilities/default.json`) was scoped to `$DOCUMENT/Anamnesis/**` at the time — **deliberately narrow for now**, with the broader scope needed for Phase 2's "Open any folder" picker flagged as a decision for later. Resolved in Phase 2 (see below).
- `App.tsx` was still a placeholder, wired to exercise the data layer: on launch it loaded (or created) a test project at `~/Documents/Anamnesis/TestWorld`, showed the node list, and had an "Add test page" button to prove writes persist across restarts. Replaced by the real project picker + shell in Phase 2.
- Added Vitest (`pnpm test`) since the path-resolution logic needed real verification before UI gets built on top of it, not just a manual look.

## What Phase 2 Delivered

The app shell: a project picker on launch, and a three-column frame once a project's loaded.

- **Resolved the fs-scope question from Phase 1.** Asked the user directly: sandbox to Documents, or let "Open folder" work anywhere? She picked anywhere, reasoning that a native folder dialog that lets you browse anywhere but then silently fails outside one directory is a worse experience than just trusting wherever you point it — same as VS Code, Obsidian, or LegendKeeper itself. `src-tauri/capabilities/default.json` now grants `fs:read-all` + `fs:write-all` with an unscoped `fs:scope` (`allow: ["**"]`). Also added `dialog:default`, which had been missing since Phase 0 despite the dialog plugin being registered — nothing had needed it until now.
- **`@tauri-apps/plugin-store`** installed for app-level settings that live outside any project folder (which project was open last, the recent-projects list) — this is the "Tauri store" `docs/plan.md` referred to. `src/services/app-settings-service.ts` + `src/hooks/use-app-settings.ts` wrap it.
- **`src/components/shell/ProjectPicker.tsx`** — recent projects (click to reopen), "Open folder" (native dialog, any location), "New project" (name only; created under `~/Documents/Anamnesis/` with six starter folders: Canon, AUs, Characters, Locations, Factions, Worldbuilding). `project-store.ts` gained `createProjectAt()` for the creation flow.
- **`src/components/shell/StartupRouter.tsx`** — checks the last-opened project on launch; loads it directly if it's still on disk, otherwise shows the picker.
- **`src/components/shell/AppLayout.tsx`** — three-column grid (tree / page / properties), right-panel toggle in `TopBar.tsx`. Panel collapses automatically below 700px width (tree below 640px) — this threshold was originally 900px, which sat *above* the app's default 800×600 window size and made the right panel look permanently stuck no matter what the toggle did. Caught during live testing and tuned down.
- **`src/components/shell/SaveIndicator.tsx`** — flashes "Saved" using a `key`-remounted CSS animation rather than a timer + state, because this project's ESLint config (`eslint-plugin-react-hooks` v7's stricter rule set) flags both calling `Date.now()` during render and calling `setState` synchronously inside an effect — the usual timer-based approach trips both.
- `project-store.ts` gained a `lastSavedAt` timestamp, touched by every action that writes to disk, which `SaveIndicator` reads.
- **"Switch project" button**, added right after the initial Phase 2 push once live testing surfaced the gap: closing the whole app was the only way back to the picker. `project-store.ts` gained `closeProject()` (resets in-memory state to nothing loaded), `use-app-settings.ts` gained `clearLastOpenedProject()`, and `TopBar.tsx` got a folder icon button next to the panel toggle that calls both. The recent-projects list is untouched by this, so the project you just left is still one click away from the picker.

See `docs/plan.md` for the full phase list.

## Process Notes

- Read `CLAUDE.md` first — architecture rules, layer order, naming conventions, don't-do's, policy boundary.
- Read `docs/spec.md` and `docs/plan.md` before starting any phase.
- Show plan before executing — user approves before code lands. User is non-technical; explain choices in plain language.
- Commit meaningful chunks, not every keystroke.
- Update `docs/plan.md`, `docs/handoff.md`, and `CHANGELOG.md` when shipping changes (see CLAUDE.md §Tracking Docs).
- The user's tone is casual and contractions-heavy. Match it in explanations; be direct in code.

## Not In Scope (Policy Boundary)

Repeated from CLAUDE.md for emphasis:

- Any network calls in Phase 1 — no telemetry, no update checks, no font CDNs, no LK server contact.
- Cloud sync / auth / multi-user features — Phase 2 if ever.
- LLM/AI features baked into the editor.
- Forks of BlockNote or custom ProseMirror setups.
- Custom Rust commands unless the Tauri fs plugin genuinely can't do the job.
- Rewording template placeholder copy without user approval.
