# Anamnesis — Implementation Plan

---

## Project Overview

Anamnesis is a Tauri v2 desktop app for local-first worldbuilding. React 19 + TypeScript in the renderer, Rust shell handling filesystem access. Data lives as JSON files on disk in a folder the user picks. BlockNote provides the Notion-style block editor. LegendKeeper's `.lk` export format is supported as a first-class import/export path so the user can migrate their existing world.

Work phases top-down. Do not start a phase until the previous one is complete and usable. Each phase should end with the app in a coherent, working state — not mid-refactor. Phases are sized to be reviewable as user-facing changes.

See `docs/spec.md` for the full spec, `CLAUDE.md` for architecture rules, and `docs/prototype/anamnesis.jsx` for a reference React prototype that demonstrates layout, template content, and tree behavior.

---

## Future Features

**Additional theme palettes**

Token-override variants on top of the shipped dark theme. All gated on a theme-switcher UI in Settings (not yet built) and on the `[data-theme]` CSS token architecture (see `docs/constants-and-theming.md`). Implementation per theme is a `[data-theme="<name>"]` block in `index.css` plus, for some themes, per-theme background treatments.

- **Light** — light-mode counterpart to dark. Needs its own callout color pass since the current tint values were tuned for dark backgrounds.
- **Parchment** — warm cream / ink aesthetic for the fantasy-tome vibe.
- **Foxian** — palette pulled from the user's Foxian worldbuilding (silvers, deep reds, cool blues).
- **Belobog** — palette pulled from the user's Belobog setting (industrial grays, warm firelight).
- **Deep Space** — near-black background with cool starfield accents.

---

**Interactive atlas / maps**

LK's atlas — nested image maps with clickable pins that link to wiki pages — is the single feature Anamnesis intentionally doesn't ship in Phase 1. It's the most complex piece of LK to build well and the piece the user has said they use less than the wiki. If demand shows up (either from the user or from anyone she shares the app with), revisit as its own multi-phase project. Leaflet with custom CRS is the likely implementation.

---

**Timeline visualization**

A view that lays out Event-template nodes on a chronological axis, with per-event pins that open the underlying page. Depends on Events having reliable date data (currently free-text). Consider a proper date schema alongside this — right now `when` is a free string like "Year 872, Third Age," which the timeline can't parse.

---

**Relationship graphs**

A view that renders the network of references between nodes (who is friends with whom, who leads what faction, what item belongs to whom) as a force-directed graph. D3-force is the likely library. Fun; not critical.

---

**Cloud sync (Phase 2)**

Supabase-backed sync for users who want multi-device access without shared-folder tools. Free tier is enough for two people; adds a real backend and auth. Deferred until the shared-folder approach (Dropbox / Syncthing) demonstrably stops meeting the user's needs. Do not scaffold in Phase 1.

---

**User-editable templates**

Currently templates live in code with the LK-style placeholder copy locked. A future Templates tab (visible in the top-left of the shell) will let users create their own templates and share them as JSON. Design work not started.

---

## Queued Adjustments

- **Duplicate doesn't work on a multi-selection.** The right-click menu hides it
  above one selected row rather than looping `duplicateNode`, which writes
  through `saveNodes` without a relocation pass — adding several nodes at once
  can shift colliding siblings' suffixes the same way deleting them does, and
  that path hasn't been worked through. Bulk delete, move, and colour are all
  supported. Fix by giving duplicate the same batch treatment as
  `deleteNodes`/`moveNodes` (see `docs/handoff.md` §Storage).

- **More right-click menu items.** The user has been through LK's own node context menu against a live (non-read-only) account and has further items she wants; "Set as project home" was the first, built 2026-07-31 because project home depended on it. The rest aren't listed yet — ask her before designing anything.

- **Valeraverse needs re-importing once, and hasn't been.** Two import changes
  landed after her copy was brought in: the project home arriving as a real page,
  and each picture remembering the LK address it came from (without which export
  can't send pictures back). Both apply at import time only, so her existing
  project has neither. One re-import picks up both — worth doing in a single
  pass rather than twice.

---

## Known Bugs

*(Empty. Both entries here were fixed on 2026-07-30 — see `CHANGELOG.md`.)*

---

## Shipped

Phases 0–9 are complete. **`docs/shipped.md`** has what each one delivered;
`CHANGELOG.md` has the same story in plain language.

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

Project home — the last Queued Adjustment standing before Phase 9 — shipped
2026-07-31.

**Phase 9 left one thing open, and it can't be closed from here:** nothing has
been imported into real LegendKeeper from a file we wrote. The round trip is
verified through our own importer against the real 75-resource
`Valeraverse.lk`, which proves the mapping is self-consistent — not that LK
accepts it. That needs an LK account and an import attempt. See
`docs/handoff.md` §Known gaps.

---

## Phase 10 — Polish + Distribution

Installer builds for macOS (`.dmg`), Windows (`.msi`), Linux (`.deb` + `.AppImage`) via `pnpm tauri build`. README instructions for the unsigned-installer bypass on each platform.

**Partly done.** Most of this phase's items are already in:

- **Node duplication** — right-click → Duplicate, shipped in Phase 3. Still
  single-selection only; see Queued Adjustments.
- **The in-app update check**, pulled forward and shipped 2026-07-31.
  **v0.2.0 is published** — installer, signature, and `latest.json` are
  attached to the GitHub release, and the endpoint the app reads
  (`releases/latest/download/latest.json`) serves correctly.
- **Global search + Cmd+K**, shipped 2026-07-31. `search-service.ts` searches
  names, tags and every tab's text; the palette jumps to the matching *tab*,
  not just the page. One deviation from the sketch above worth knowing: it is
  **not** a single Fuse index over content. Names and tags are fuzzy; prose is
  exact substring, because fuzzy matching across thousands of characters
  returns scattered letters from unrelated paragraphs. See `docs/handoff.md`
  §Search.
- **Keyboard shortcuts**, shipped 2026-07-31. Cmd+K search, Cmd+N new page,
  Cmd+S manual save. Bindings live in `constants/shortcuts.ts`; matching and
  rendering in `services/shortcut-service.ts`; one listener in
  `use-global-shortcuts.ts`. Cmd+N adds a *sibling* of the current selection —
  a row's own "+" already covers "child of this". **Unverified in the desktop
  build:** whether WebView2 lets the page keep Cmd+N. See handoff §Shortcuts.
- **Rebindable shortcuts**, shipped 2026-07-31 — asked for by the user that day
  as an accessibility feature, not a power-user one, which is what decides the
  rules. Settings → Keyboard lists every action with a key recorder and a
  per-action reset. Overrides (only the changed ones) persist through
  `app-settings-service.ts`; `shortcut-store.ts` merges them over the defaults
  and everything reads from there. A binding needs a modifier **or** to be a
  bare F-key, and can't take a combination another action or the editor owns.
  **Adding a new shortcut is now three lines** — an entry in `SHORTCUT_ACTIONS`,
  one in `SHORTCUT_LABELS`, one in `DEFAULT_BINDINGS` — plus a handler in
  `useGlobalShortcuts`. It shows up in Settings on its own.

- **App-level undo/redo**, shipped 2026-07-31. Ctrl+Z / Ctrl+Y over the sidebar
  operations: add, delete, rename, move, duplicate, colour, project home,
  multi-selection included. An entry is a pair of closures built where the
  operation happens, reversing itself through the ordinary store actions rather
  than through a second copy of the path-relocation logic. Deleting captures
  its pictures' bytes first, so undo restores the whole page. Shares Ctrl+Z
  with the editor by standing down whenever the caret is in text — see handoff
  §Undo and §Shortcuts. **Not covered:** properties, tags, tab changes.

**Still to do:**

- **Automating releases and the other platforms.** See below.
- **Undo for the right-hand panel** — properties, tags and tab edits are the
  one part of the app a mistake can't be taken back in. The way in is a
  dedicated store action per operation, the way `setNodeColor` did it.

Cutting a release is currently manual: bump the version in `package.json`, `tauri.conf.json` and `Cargo.toml`, build with `TAURI_SIGNING_PRIVATE_KEY` set (or clients reject the update as unsigned), hand-write `latest.json` with the `.sig` contents inlined, then `gh release create`. **Still outstanding:** automating that as a workflow on tag push, and macOS/Linux bundles — `latest.json` currently declares `windows-x86_64` only, so a non-Windows build would find no platform entry. See `docs/handoff.md` → Updates.

**End state:** app is shippable. User can install it, other people can install it, everyone's data stays local.

---

## Phase 1.5 — Publish (After Phase 10)

`PublishModal.tsx` with checkbox tree of what to publish, "include hidden tabs?" toggle (default off), tag filter, output folder picker.

`src/services/publisher.ts` — static site generator. Renders each node as an HTML page, preserves tree navigation as a sidebar, respects hidden tabs and Secret blocks. Bundles a Fuse.js search index as JSON for client-side search on the published site. Same visual style as the app (dark theme, callouts, references as clickable links).

User then hosts the output folder anywhere free (Cloudflare Pages / Netlify / GitHub Pages). Re-publish overwrites.

**End state:** user can share Valeraverse with Nitwit read-only, and Orynthia with the world when it's ready, without any account or backend.

---

## Phase 2 — Cloud Sync (Deferred)

Only if the shared-folder sync approach demonstrably stops working. Options in preference order: Supabase (hosted Postgres + auth), Yjs + y-webrtc (P2P CRDT), self-hosted sync server.

Do not scaffold in earlier phases. The file-per-node data model already sets us up well for any of these.
