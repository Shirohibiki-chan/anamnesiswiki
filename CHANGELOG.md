# Changelog

## 2026-07-30

### Additions
- **Phase 1 — data layer:** the app can now load a project folder from disk, hold it in memory, and write changes back as real JSON files, matching the tree-mirroring layout described in `docs/spec.md`. Creating, renaming, moving, and deleting a page or folder all persist correctly, including same-name collisions (` (2)`, ` (3)`...) and nested folders. Content edits will autosave 300ms after you stop typing once the editor lands in Phase 5. No tree or page view yet — this phase is purely the plumbing underneath them. The placeholder screen now creates/loads a real test project so this can be verified end to end.

## 2026-07-29

### Additions
- **Docs organized under `docs/`:** build spec, plan, handoff, glossary, components reference, theming reference, and the reference prototype are all in place, cleaned up from the earlier scattered/duplicate drafts.
- **Phase 0 project scaffold:** Tauri v2 desktop app shell with React 19 + TypeScript. Dark theme CSS tokens and self-hosted fonts (Inter, Newsreader, Fraunces) wired in, folder skeleton built per `CLAUDE.md`'s layer order, ESLint configured. App opens to a placeholder screen — no worldbuilding features yet, that starts in Phase 1.
