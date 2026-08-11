# Anamnesis — Build Spec

A local-first worldbuilding wiki app, LegendKeeper-shaped, for personal use. Notion-style block editor + tree navigation + template-driven pages + tabbed content per page + right-sidebar properties. Runs as a desktop app so data lives on disk as JSON files (which makes shared-folder sync with a co-writer trivial).

> **Status: this is the original build spec, written before any code existed.** Phases 0–8 have since shipped. The *intent* sections below (Phase 1.5, Phase 2, UI/UX notes, non-goals) still stand as written. The *factual* sections — data model, schemas, LK mapping — were corrected against the shipped code on 2026-07-30, and anywhere the built thing differs from the original plan is now called out inline rather than quietly left wrong.
>
> For what's actually true right now, in order of reliability: the code itself, then `docs/lk-format.md` for import/export, then `CLAUDE.md` for architecture rules, then this file. `docs/shipped.md` records what each completed phase delivered.

## Reference material

A working React prototype exists at `anamnesis.jsx` (companion file). It demonstrates the target layout, template content, tab-with-visibility pattern, tree behavior, and properties sidebar. **The prototype uses a plain contentEditable for the body — the real build must replace this with BlockNote for a proper Notion-style block editor.** Everything else in the prototype (tree structure, template schema, tab system, properties, storage flow) is broadly the right shape.

Screenshots of LegendKeeper (the app being cloned) show the target aesthetic: dark charcoal background, teal accents for active/selected states, purple for the "secret" callout, blue for the info callout, muted neutrals for the tree and sidebars.

## Tech stack

- **Tauri v2** — desktop app shell, filesystem access, small bundle
- **Vite + React + TypeScript** — app framework
- **BlockNote** (`@blocknote/react`, `@blocknote/core`) — Notion-style block editor with slash commands, drag-to-reorder, WYSIWYG. Extend with:
  - Custom blocks for the three callouts (Info, Quote, Secret)
  - Mention extension for `@page` cross-references
  - Optional `[[wikilink]]` parsing for people who prefer that syntax
- **react-arborist** — tree in the left sidebar, with drag/drop, custom row rendering, filter
- **Zustand** — app state (nodes, tree expansion, selection, active tab)
- **Tailwind CSS** — styling
- **Fuse.js** — fuzzy search for the tag/name filter
- **date-fns** — light date formatting for the Event template

Added during the build, not in the original list: `@blocknote/shadcn` (the editor's shipped theming layer), `@dnd-kit/*` (tab reordering — react-arborist only covers the tree), `lucide-react` (icons), Vitest (unit tests for the service layer), and the Tauri plugins for dialog, fs, http and store.

Do not use Electron. Do not add a backend in phase 1. Do not add authentication in phase 1.

## Data model

Each project is a folder on disk. The user picks the folder location on first launch (default: `~/Documents/Anamnesis/`).

**The tree structure in the app is mirrored on disk.** Every node is a JSON file named after itself, and every folder in the app is a real folder on disk. Opening the project folder outside the app should look intelligible, not like a database dump.

```
~/Documents/Anamnesis/Valeraverse/
├── project.json                         # tree order, expanded state, selection
├── Canon/
│   ├── _folder.json                     # folder's own metadata (color, tags)
│   ├── Main Story.json                  # a page with nothing inside it yet
│   └── Side Stories.json
├── AUs/
│   ├── _folder.json
│   ├── Demonic AU/
│   │   ├── _folder.json
│   │   ├── Characters/
│   │   │   ├── _folder.json
│   │   │   ├── Valera Jiang/            # a character gets its own directory
│   │   │   │   ├── _page.json           # the character's own data
│   │   │   │   └── Her Sword.json       # a page nested under the character
│   │   │   └── Sampo Koski/
│   │   │       └── _page.json
│   │   └── Locations/
│   │       └── ...
│   └── ...
└── assets/
    └── {assetId}.{ext}                  # uploaded images
```

**Corrected 2026-07-30.** This diagram originally showed characters as flat `Valera Jiang.json` files. That was the pre-build plan; it isn't what got built, and the difference matters.

**Two storage kinds.** Folders *and* any always-directory template (character, location, faction, species) store themselves inside their own directory — `_folder.json` or `_page.json` respectively — alongside their children, whether or not they currently have any. The rest (item, event, note, blank) stay a flat `Name.json` with no wrapping directory *until something is put inside them*, at which point they convert. **Every page can hold pages** — corrected 2026-08-10, when the restriction was lifted; see `docs/handoff.md` §Storage.

**Why a page gets its own directory at all**: a directory's ownership must never be derived from its *current* name. The original flat scheme matched children to parents by filename, which meant renaming a page — or a sibling's collision suffix shifting — silently orphaned everything under it on the next load. That happened in Phase 4. The marker file is now what identifies ownership, and it survives any rename.

**Why this layout**: the folder is human-browsable outside the app. If the app ever breaks, the user's writing is still there as legible JSON files they can open in any text editor. Shared-folder sync (Dropbox / Syncthing / iCloud) still works fine — each save touches one file. Git diffs are clean and human-readable.

**Handling reparents and renames**: `fs.rename` on the file (leaf templates) or on the whole directory (folders and nestable pages — children move for free). On Windows, watch out for path length limits (~260 chars by default) — either warn the user when deep nesting approaches the limit, or truncate long names for the file path while keeping the full name in the JSON body. *(Implemented 2026-07-30 as a hard refusal rather than a warning: a save whose resolved path would exceed the limit throws `PathTooLongError` before writing, and the shell reports it. Revised 2026-08-11 to do both, for different causes: one over-long name is truncated on disk with the full name kept in the JSON, as this spec offered, and over-long total depth is still refused. The limit itself moved from 200 to 255 — see `docs/handoff.md` §Storage.)*

**Naming conflicts**: if two siblings would share a filename, append ` (2)`, ` (3)` etc. to the filename or directory name only. Node IDs stay unique inside the JSON regardless. Two directory-storage nodes with the same name do collide; a directory-storage node and a same-named leaf page never do, since one is a directory and the other a plain file.

Suffixes are recomputed from creation order on every resolve rather than stored, so changing one sibling renumbers the others — `planRelocations` in `filesystem-service.ts` exists to keep disk in step with that.

> **Fixed 2026-07-30.** The shipped comparison was case-*sensitive*, so `Ruins` and `ruins` as siblings each kept the bare name and, on a case-insensitive filesystem, resolved to the same file. Collision grouping now folds case; the segment itself keeps whatever capitalisation the user typed.

**Why `_folder.json` for folder metadata**: so the folder can carry its own properties (color, tags, notes) alongside its children. The underscore prefix keeps it at the top when sorted alphabetically.

### Node schema

```ts
type Node = {
  id: string;                    // uuid
  parentId: string | null;       // null = root
  templateKey: string;           // 'character' | 'location' | etc
  name: string;
  tabs: Tab[];                   // per-page tabbed content, see below
  properties: Record<string, unknown>;   // per-template sidebar values
  customProperties?: CustomPropertySpec[];  // Phase 7 — user-added one-off fields
  tags: string[];
  color?: string;                // hex code, for folders and optionally other nodes
  image?: string;                // Phase 6 — filename in assets/
  banner?: string;               // Phase 8 — filename in assets/, full-width header
  bannerFocusY?: number;         // vertical framing for the banner, 0–100
  createdAt: number;
  updatedAt: number;
};

type Tab = {
  id: string;                    // 'overview' | 'backstory' | etc
  label: string;
  hidden: boolean;               // eye-off icon toggle
  content: BlockNoteDocument;    // BlockNote's JSON block structure
};
```

### Project schema

```ts
type Project = {
  version: 1;
  name: string;
  rootOrder: string[];           // node ids in top-level display order
  childOrder?: Record<string, string[]>;  // per-parent manual order; sparse and
                                          // optional, so a project saved before
                                          // it existed still loads unchanged
  expandedIds: string[];         // which folders are expanded
  selectedId: string | null;
  createdAt: number;
};
```

### Template schema (in-code, not on disk)

```ts
type Template = {
  key: string;
  name: string;
  icon: string;                  // lucide icon name
  canHaveChildren: boolean;      // whether pages can be nested under it — this
                                 // also decides its on-disk storage kind above
  tabs: TabSpec[];               // default tabs new pages get
  properties: PropertySpec[];    // sidebar fields
};

type PropertySpec = {
  key: string;
  label: string;
  type: 'text' | 'longtext' | 'refs' | 'date';
  placeholder?: string;
};
```

Templates are defined in code (not user-editable in phase 1). `src/services/template-registry.ts` is the source of truth, including for the placeholder copy — Phase 11 rewrote that copy in the user's own voice and stripped the LK-transcribed original out of `docs/prototype/anamnesis.jsx`, which is now a layout reference with filler content.

**Nine template keys ship**, not the seven this document says elsewhere: `folder`, `character`, `location`, `faction`, `item`, `event`, `species`, `note`, plus `blank` — added in Phase 7 for starting a page with nothing on it and applying a template later. `isFolder` was replaced by `canHaveChildren`, which is the property the storage layout actually keys off.

## Phase 1 — Local editing app

Everything a single user needs to build worlds. No sharing, no sync, no accounts.

### Must-have features

1. **Project management**
   - Open existing project (folder picker)
   - Create new project (folder picker + name)
   - Recent projects list in a startup screen
   - Switcher in the top-left corner for multi-project users

2. **Tree navigation** (left sidebar)
   - Recursive tree matching the prototype's behavior
   - Icons per node type (from Lucide)
   - Drag-and-drop to reparent nodes (react-arborist handles this)
   - Right-click context menu: new page inside, rename, duplicate, **set color**, **hide from readers**, set as project home, show in the file manager, export, delete
   - On hover: "+" to add a page inside, "..." for the same context menu
   - Search/filter input at the top (name + `#tag` prefix filters by tag)
   - ~~"Project / Templates / Assets" tab strip at the very top~~ — **never built.** Only the Project view was ever going to be functional in Phase 1, so a three-tab strip with two dead tabs was dropped rather than shipped as decoration. Reconsider if Templates or Assets ever get real views.

3. **Node colors**
   - **Any node** (folder or page) can have a color assigned to it
   - **Folders render with full-row tinting** — colored background (subtle, ~12% opacity of the color), colored text, colored icon. Folders are the categorical anchors of the tree and should read as visually strong containers.
   - **Pages render with icon-only tinting** — just the icon carries the color, so pages read as "living inside" their folder without competing with the folder's identity.
   - Colors **cascade to descendants** by default — if `Canon` is sky blue, everything inside it inherits sky as its effective color unless a child sets its own. A page inside a sky-blue Canon folder shows a sky-blue icon; a child folder inside Canon that hasn't set its own color shows a sky-blue tinted row.
   - A child setting its own color overrides for that node and its descendants (like CSS inheritance)
   - Visual distinction between "I own this color" vs "I inherited it": the owner gets a solid left-border stripe in that color; inheritors get the tint/icon only. This way the user can see which node in the chain set the color.
   - Selected state: colored folders keep their color at higher opacity (~40%) when selected instead of the standard teal selection background; uncolored rows use the teal selection background as normal.
   - Color picker uses a curated palette of 10-12 preset colors (teal, purple, rose, amber, sage, sky, indigo, orange, red, gray) plus a "clear" option. Not a full hex picker.
   - Empty folders still show as colored folders — a folder with no children isn't visually demoted, since the user may be preparing an empty container for future content.
   - **This maps to LK's `iconColor` per resource** so colors round-trip cleanly through LK import/export.

4. **New page modal**
   - Grid of the templates with icons
   - Clicking creates a new node of that type as a child of the target parent

5. **Page view** (center)
   - Breadcrumb bar at top: `ProjectName / ... / PageName`
   - Large title with the template's icon; click title to rename
   - Tab strip below the title showing all the page's tabs
   - Each tab has a hide/show toggle (eye icon) — hidden tabs render slightly dimmer
   - BlockNote editor for the active tab's content
   - Auto-save on change (debounced ~300ms)

6. **BlockNote editor**
   - All standard blocks (paragraph, headings h1-h3, bullet list, numbered list, quote, code block, divider, image)
   - **Custom Info block** — blue-tinted, left border accent, holds intro/description text
   - **Custom Quote block** — grey-tinted, italic, for character quotes
   - **Custom Secret block** — purple-tinted with lock icon, admin-only content
   - **Mention extension** — `@` opens a dropdown of all nodes in the project, insertion creates a clickable link
   - **Wikilinks** — `[[Node Name]]` auto-resolves to the same clickable link
   - Clicking a mention/link navigates to that node

7. **Properties panel** (right sidebar)
   - Image slot at top (drag-drop to upload, stored in `assets/`)
   - Template-defined properties rendered as appropriate inputs
   - Reference-type properties show a searchable dropdown of nodes
   - Tags always at the bottom, chip-style with add-on-enter

8. **Templates** — implement all 8 templates as defined in the prototype file, with the LK-style placeholder copy intact. When a page is created from a template, its tabs and properties are populated with the template's defaults; the user then edits from there.

   The 8 templates are: **Folder, Character, Location, Faction, Item, Event, Species, Note**.

   The **Species** template was added based on the user's actual LK export, where the Foxians page has custom tabs (Overview / Biology / Lifestyle / Beliefs / Relations). Species template spec:
   - Tabs: Overview, Biology (hidden by default), Lifestyle, Beliefs, Relations, History (hidden by default)
   - Placeholder content should prompt about: appearance and physical traits, lifespan and reproduction, culture and daily life, religious/philosophical beliefs, relations to other species, historical context
   - Sidebar properties: summary, homeworld/native location (ref), tags

9. **Persistence**
   - All changes write to the project folder on disk
   - Debounce writes to avoid thrashing
   - Load project on app start; save on every meaningful change

10. **LegendKeeper import/export** (critical — user has an existing 75-page LK world to migrate)

    LK's `.lk` export is a **gzip-compressed JSON file**. Ungzip and parse. Structure:

    ```
    {
      version: 1,
      exportId, exportedAt, resourceCount, hash,
      resources: [
        {
          id, parentId (null for root), name, pos,   // pos is fractional-index string
          iconColor, iconGlyph, iconShape,           // icon customization — iconColor maps to our color feature
          isHidden, isLocked,
          documents: [                                // these are our "tabs"
            {
              id, name, pos, isHidden, isFirst,
              content: { type: "doc", content: [...] }   // ProseMirror JSON
            }
          ],
          properties: [], tags: [], aliases: [],
          banner: { enabled, url, yPosition }
        }
      ],
      calendars: []
    }
    ```

    **Import mapping:**
    - Each LK `resource` → one Node in our model
    - `parentId` → `parentId` directly (LK uses the same tree structure)
    - `pos` → tree order (LK uses fractional indexing; sort resources by pos string ascending within each parent)
    - `documents[]` → `tabs[]` (each LK document is one tab)
    - `document.content` → tab's BlockNote content. **ProseMirror JSON is BlockNote-compatible with light adaptation** — BlockNote is built on TipTap which is built on ProseMirror. Custom LK block types need mapping:
      - LK `panel` (with `panelType: info|note|success|warning|error`) → our Info/Quote/Secret custom blocks (map `info` → info, `note` → quote, `warning`/`error` → secret, others fall through to info)
      - LK `layoutSection` / `layoutColumn` → collapse to sequential blocks (BlockNote doesn't do columns natively)
      - LK `inlineExtension` (icons etc.) → strip or convert to text
      - LK `mention` (with `id` and `text`) → our mention block (resolve the id to our new node id via an id-map built during import)
      - `heading`, `paragraph`, `bulletList`, `orderedList`, `rule`, `text` with marks → pass through directly
    - `iconColor` → node's `color` (map hex → nearest preset color, or store the raw hex)
    - `name` → node's `name`
    - Templates: LK doesn't have a template concept — it's freeform documents. On import, we **infer** the template from the tab signature. **`docs/lk-format.md` holds the current rules; don't work from the list that used to be here.** The original spec called for *exact* signature matching, which shipped in Phase 8 and turned out to lose data: a character page with one extra tab of the user's own failed to match, fell back to Note, and Notes can't hold children — so its sub-pages vanished. Matching is now by subset, with a backstop that anything with children always gets a template that can hold them.
    - Show a preview of the import (tree + inferred template counts + a plain-language list of anything lossy) and let the user confirm before committing.

    **Export mapping** is the inverse — serialize our nodes as LK resources with their documents and ProseMirror content, gzip the result, save as `.lk`. Round-trip should be lossless for anything that started in LK; new content types (Species, Item, Faction, Event templates) export as freeform documents with matching tab structures.

    **Testing target**: the user's actual `Valeraverse.lk` export (75 resources, mixture of tab signatures) is the acceptance test for import. It should come in fully intact — every page, every tab, every ProseMirror block preserved.

### Nice-to-have (still phase 1 if time allows)

- Node duplication (right-click → duplicate creates a full copy with fresh id, renamed "{original} (Copy)")
- Undo/redo at the app level (BlockNote handles per-editor undo natively)
- Global search across all nodes' content (Fuse.js)
- Keyboard shortcuts: Cmd/Ctrl+K for search, Cmd/Ctrl+N for new page
- Dark theme is the default and only theme in phase 1

### Explicit non-goals for phase 1

- No cloud sync
- No authentication
- No permissions system beyond per-tab hidden flag
- No real-time collaborative editing
- No public sharing
- No interactive map/atlas system (this is phase 3 if ever)
- No timeline visualization (phase 3 if ever)
- No user-editable templates (they live in code)
- No mobile version

## Phase 1.5 — Publish for read-only sharing

Once phase 1 is stable, add a publish feature. Same feature serves two use cases: sharing selected content with a co-writer, and eventually making a world publicly browsable.

### Features

- **Publish button** in the project menu
- Opens a config dialog:
  - Which folders/pages to include (checkbox tree)
  - Include hidden tabs? (default no — matches the "SECRET" semantics)
  - Include which tags? (optional filter — e.g. only publish pages tagged `public`)
- Generates a static site to a chosen output folder:
  - HTML pages for each included node, connected via the same links/mentions
  - Preserved tree navigation in a sidebar
  - Same visual style as the app
  - No editing UI, no properties panel editability — read-only browsing only
  - Includes a search index (Fuse.js) as JSON for client-side search
- User then hosts the output folder anywhere: Cloudflare Pages, Netlify, GitHub Pages, their own server. All free. A one-time setup per deployment.
- Re-publishing overwrites; the user runs it whenever they want the shared version to reflect their working version.

### Why this design

- Separates "my working space" from "what someone else sees" — user can have half-written pages and rough notes without worrying about who's reading them
- No accounts to manage
- No live data leaks — only what the user actively publishes gets published
- Works for one reader (co-writer) or many (public Orynthia) with no code difference

## Phase 2 (deferred) — Cloud sync

Only if the shared-folder approach genuinely stops working. Options in rough order of preference:

- **Supabase**: free hosted Postgres + auth. Add a sync layer that pushes/pulls JSON on save. Optional realtime subscriptions for live updates.
- **Yjs + y-webrtc**: CRDT-based P2P sync when both clients are online, no backend needed. Elegant but adds architectural complexity.
- **Self-hosted sync server**: only if user explicitly wants full control. Not recommended.

Do not scaffold any of this in phase 1. It's mentioned only so the phase 1 data model doesn't paint us into a corner. The JSON-per-node file layout already sets us up well: any of these can be added as a sync layer on top without restructuring data.

## UI/UX notes

- **Aesthetic**: dark, LK-descended, but with a slightly cooler / more sci-fantasy tint than LK's warmer charcoal. Suggested palette:
  - Background: `#0f0f14`
  - Panel: `#1a1a22`
  - Border: `#2a2a35`
  - Text primary: `#e8e8ee`
  - Text muted: `#9a9aaa`
  - Accent teal: `#5eead4` (active/selected states, save indicators)
  - Info blue: `#60a5fa`
  - Secret purple: `#a78bfa`
- **Typography**: Inter for UI, a slightly more characterful serif or humanist sans for the wiki body text so pages don't feel like a settings screen. Something like Fraunces or Sohne — pick one, use it consistently.
- **The tab-with-hidden-eye pattern is the signature interaction**. Make it feel good — the eye icon should be discoverable but not shouty, the click should feel decisive, hidden tabs should visibly render differently in the tab strip (dimmer, italicized, or with a small lock hint).
- **Auto-save should be invisible** — no spinner, no toast. A tiny "Saved" hint in the corner that fades in for a beat after a save is fine. No modal dialogs. No confirmation before navigating away.
- **Callouts inside BlockNote** should render identically in edit mode and in the published output. The user should never be surprised by how a page looks when shared.

## Getting started

1. `pnpm create tauri-app@latest anamnesis` — React + TypeScript template
2. Install: `@blocknote/react @blocknote/core react-arborist zustand tailwindcss fuse.js lucide-react date-fns`
3. Set up Tauri filesystem plugin for reading/writing project folder
4. Build the empty shell: three-column layout, dark theme, project picker on startup
5. Implement the data model + storage layer (read/write JSON files)
6. Wire up the tree, then the tabs, then BlockNote, then the properties panel
7. Then the templates
8. Then polish

Approximate order of operations chosen so each layer can be tested against the last — get storage right before you build UI on top of it, get the tree right before you wire content into it.

## Notes for the person building this

- The developer is comfortable in React (has previously built a React + IndexedDB dashboard app) but is not a full-time engineer. Prefer readable code over clever code. Comment anywhere the intent isn't obvious.
- Include a `README.md` with dev setup, build commands, and a short explanation of how the data model maps to files on disk. The developer should be able to hand-edit a node JSON file to fix data if something breaks.
- Ship with the templates and their exact placeholder copy from the prototype — this content is deliberately shaped and shouldn't be reworded.
- Do not add features not in this spec without asking. Especially: no login walls, no telemetry, no cloud service dependencies, no AI features baked in.
