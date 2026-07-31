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

- **A proper "project home" feature.** Phase 8's import brings the LK project root's own text in as a real "Home" page (see Phase 8 below), but the user also wants an actual project-home concept in the app itself — a dedicated landing view (not just an importable page) reachable independent of any single node, likely tied to `ProjectHeader.tsx`'s existing home icon. Needs its own design pass (how it's stored, whether it's a special reserved Node excluded from the normal tree, how it interacts with `rootOrder`) rather than being bolted onto Phase 8. Not started.

---

## Known Bugs

*(Empty. Both entries here were fixed on 2026-07-30 — see `CHANGELOG.md`.)*

---

## Shipped

Phases 0–8 are complete. **`docs/shipped.md`** has what each one delivered;
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

---

## Phase 9 — LK Export

`src/services/lk-export.ts` — the inverse of Phase 8. Serialize nodes back into the LK `resources` shape, translate BlockNote content back to ProseMirror JSON (including callout → panel), gzip, save.

`ExportModal.tsx` — checkbox tree of what to export, output file location picker.

Round-trip test: import `Valeraverse.lk`, export it back, diff the two — content should be identical up to id renaming and the small handful of unsupported block types (columns) that Phase 8 flagged.

**End state:** user can round-trip their world through LK format cleanly.

---

## Phase 10 — Polish + Distribution

Global search across all nodes' content (Fuse.js index rebuilt on load, updated on change). Keyboard shortcuts (Cmd+K search, Cmd+N new page, Cmd+S manual save indicator). Node duplication (right-click → Duplicate). App-level undo/redo.

Installer builds for macOS (`.dmg`), Windows (`.msi`), Linux (`.deb` + `.AppImage`) via `pnpm tauri build`. GitHub Releases workflow to publish installers on tag push. README instructions for the unsigned-installer bypass on each platform.

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
