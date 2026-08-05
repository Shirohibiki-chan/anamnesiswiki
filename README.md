# Anamnesis

A local-first worldbuilding wiki. Your world, as files on your own machine.

*Anamnesis* is the ancient Greek word for the act of recollection — pulling forth what already exists in your mind. That's the pitch: your world is already in your head; this app just gives it structure and a place to live.

## What it is

Anamnesis is a desktop app for building fictional worlds. Characters, locations, factions, species, events, timelines — whatever you dream up, organized as a tree of pages with template-driven structure and a Notion-style block editor. Your world lives on your machine as JSON files, in a folder you own. No cloud, no accounts, no sync fees, no vendor lock-in.

The working shape will be familiar if you've used a wiki-style worldbuilding tool before: a tree of pages, tabbed content per page (with a hidden-tab pattern for GM-only material), a block editor with @mentions and wikilinks, properties in a right sidebar, and template scaffolding for the entities you end up making over and over. It reads and writes LegendKeeper's export format, so an existing LK world comes across intact.

## Features

- **8 templates** with worldbuilding prompts built in: Folder, Character, Location, Faction, Item, Event, Species, Note
- **Tabbed pages** with per-tab visibility (hide backstory/history/lore tabs for GM-only material)
- **Notion-style block editor** with slash commands, drag-to-reorder blocks, and custom callout blocks (Info, Quote, Secret)
- **@mentions and `[[wikilinks]]`** for cross-page references — click to navigate
- **Search everything you've written** — page names, tags, and the text on every tab, from anywhere with Ctrl+K
- **Keyboard shortcuts you can change** — every one of them, from Settings, including a single-function-key option if two-key combinations are awkward for you
- **Undo for the sidebar** — deleting, moving, renaming, duplicating and recolouring pages all take Ctrl+Z
- **Color-code any folder or page** — colors cascade to descendants unless overridden
- **Template-driven properties** in the right sidebar — references to other pages, tags, images, dates
- **Import your existing LegendKeeper world** from a `.lk` export on Day 1
- **Export back to LK format** anytime, in case you ever want to go back
- **Read-only publish** to a static site of selected pages, for sharing worlds with co-writers or the public *(Phase 1.5)*
- **Offline** — nothing about you or your world ever leaves your machine. No telemetry, no analytics, no accounts, and nothing that phones home on a timer. The app makes exactly two network requests, both only when you press a button for them: fetching your pictures during a LegendKeeper import, and checking whether a newer version exists

## Install

Grab the installer for your platform from the [Releases page](../../releases).

**Heads up on "unsigned app" warnings:** Anamnesis isn't code-signed. Code-signing certificates cost real money per year and this is a hobbyist tool, so signing isn't in the budget. Your OS will warn you the first time you open the app. This is normal.

- **macOS:** right-click the app in Applications, choose Open, then click Open in the confirmation dialog. You only need to do this once.
- **Windows:** on the SmartScreen warning, click "More info," then "Run anyway."
- **Linux:** no warning — the `.deb` or `.AppImage` should just work.

**Updating.** Settings → Updates has a *Check for updates* button. Nothing happens on its own — no background checks, no nagging. If there's a newer version it tells you what changed and offers to install it, and it verifies the download was signed by this project before it does. Your project folders are never touched by an update.

## Import from LegendKeeper

Open Anamnesis, go to **File → Import from LegendKeeper**, and pick your `.lk` export. You'll see a preview of your world's structure with inferred templates per branch of the tree. Confirm, and it lands in a new project folder.

Most content transfers cleanly — pages, tabs, callouts, mentions, tags, folder colors (via LK's icon-color feature). A few LK block types don't have a native Anamnesis equivalent yet and will convert to plain text or get skipped:

- **Column layouts** (`layoutSection` / `layoutColumn`) collapse to sequential blocks
- **Inline icons** get stripped to text
- **Banners** may or may not carry over depending on the source URL

The importer flags all of these in the preview so you know what to touch up.

## Where your world lives

By default, projects go in `~/Documents/Anamnesis/YourProjectName/`. Each page is a JSON file named after itself, and folders on disk mirror folders in the app. Open the folder in Finder or Explorer and you can see your writing directly — no database, no encoding, no proprietary format. If Anamnesis ever breaks or you want to migrate somewhere else, your work is still there as legible plain text.

## Sharing your world

Two options:

**Read-only publishing.** *File → Publish* generates a static HTML site of whichever pages you pick, respecting hidden-tab settings so your GM-only content stays private. Host the output anywhere free — Cloudflare Pages, Netlify, GitHub Pages — and share the URL. Whoever you send it to sees a browseable, styled version of your world in any web browser, no account required on their end. *(This is Phase 1.5 — not in the initial release. Coming soon.)*

**Shared-folder editing.** Put your project folder in Dropbox, iCloud Drive, or Syncthing, and have your co-writer install Anamnesis and point it at the same synced folder. Both of you edit locally; the sync tool propagates changes. Works well for two or three people who aren't editing the same page at the same second.

## Development

Requires Node 20+ and Rust (for Tauri).

```bash
pnpm install
pnpm tauri dev       # dev mode with hot reload
pnpm tauri build     # build installers for your current platform
pnpm lint            # ESLint
pnpm test            # Vitest
```

Architecture, code style, and design rules are in `CLAUDE.md`. Full spec is in `docs/spec.md`. Releases are automated — pushing a `v*` tag builds, signs and drafts one for all four platforms; `docs/releasing.md` is the procedure.

## Not affiliated with LegendKeeper

Anamnesis is an independent project with no connection to LegendKeeper or its developer, Algorific. Anamnesis reads and writes LK's export format so people can move their own work in and out — there's no shared code, no partnership, no endorsement. LegendKeeper is a hosted, collaborative, actively developed product and a different thing to this one; if that's what you're after, [go and look at it](https://legendkeeper.com). It's maintained by a small team who deserve your money if you can spare it.

## Support

None promised. Anamnesis is a personal tool that got shared. Feel free to file issues if you hit bugs, but please don't expect fast responses. PRs are welcome if you know what you're doing and want to help; open an issue first to discuss anything nontrivial.

## License

MIT. See [LICENSE](LICENSE) for the full text. Use it, fork it, ship your own version, whatever — just don't blame me if it breaks.
