# Domain Glossary

Terms specific to this project. Read this before naming variables, designing UI labels, or making assumptions about how the data behaves.

## Project

The top-level container. A single "world" — Valeraverse, Orynthia, whatever. On disk, a project is a folder under `~/Documents/Anamnesis/` (or wherever the user set as their projects directory). Inside the folder: a `project.json` with metadata, a `nodes/` structure mirroring the tree, and an `assets/` subfolder for uploaded images.

A user can have any number of projects. The app opens one at a time; switching happens via the project picker in the top-left of the shell.

## Node

Any item in the tree. Folders and pages are both nodes — the distinction is a `templateKey` field. A node with `templateKey: 'folder'` is a folder; anything else is a page.

Nodes are identified internally by a generated `id` (uuid), not by name or filename. Names can change and collide; the id is stable.

## Page

A non-folder node — anything with content. Character, Location, Faction, Item, Event, Species, Note. Every page has a list of **tabs** and a set of **properties** determined by its template.

## Folder

A node whose only job is to hold other nodes. Folders don't have tabs or properties (other than color and tags). An empty folder is still a real folder — it isn't visually demoted or auto-removed — because a user may be preparing a container for future content (e.g. the "Meta" folder in the user's Valeraverse export sits empty pending future documentation).

## Tree

The hierarchy of nodes visible in the left sidebar. The tree structure is mirrored on disk — every folder in the tree is a real folder in the project directory, every page is a JSON file inside its parent folder. Reparenting a node in the tree = moving the file on disk.

## Template

The "shape" of a page. A template defines two things: (1) the set of tabs a page of that type gets by default, with placeholder content, and (2) the set of properties shown in the right sidebar.

Templates in Phase 1: Folder, Character, Location, Faction, Item, Event, Species, Note. Templates are defined in code (`src/services/template-registry.ts`) and are not user-editable in Phase 1.

The **placeholder content** on each tab of each template is deliberately shaped LK-style prompting language ("What is their personality type? Are they funny?…"). Do not reword without asking the user.

**"Template" on its own always means this one — a page template.** Two other things share the word and each has its own entry below: a *user* template (a page of hers, saved to be copied) and a *project* template (a whole project's folder shape, in a file).

## User Template

A page she saved to reuse — Convert to template on any page, optionally with everything nested under it. Unlike the eight above, a user template *is* a page, copied: her writing, her filled-in property values and her pictures all come with it, and inserting one is a copy back out. They live in `templates.json` in the project (`TemplateLibrary` in `src/constants/schema.ts`) and are offered on the new-page screen alongside the built-in eight. One may also stand in for a built-in — "this project's Character" — which is an *override* rather than an extra.

## Project Template

A whole project's *shape*, in one file she can send to somebody: the folders, what nests in what, and a blank starter page of each kind where it belongs. Extension `.antpl`, plain JSON, format in `src/constants/project-template.ts`.

**The one to keep straight against a user template**, because they are close in name and opposite in contents: a user template is a page *copied*, writing and all; a project template is a shape *described*, with none of anybody's writing in it at all — the format has nowhere to put any. Reached from Start from a template on the start screen; made from a project's `⋯` menu.

## Tab

A section within a page. Every page has one or more tabs — Character has Overview + Backstory, Location has Overview + Map + History, Species has Overview + Biology + Lifestyle + Beliefs + Relations + History, etc.

Tabs are rendered as a strip below the page title. Each tab has its own BlockNote document.

## Hidden Tab

A tab marked with the `hidden` flag, indicated by an eye-off icon in the tab strip and dimmer rendering. In Phase 1, hidden just means visually flagged — nothing enforces access control since there's only one user. In Phase 1.5 (Publish), hidden tabs are excluded from published output by default.

## Callout

A custom BlockNote block type with distinctive styling. Three callouts exist: **Info** (blue-tinted, for definitions and intros), **Quote** (grey-tinted, italic, for quotations), and **Secret** (purple-tinted with lock icon, for admin-only content).

Callouts are inserted via BlockNote's slash menu. They appear in every template's placeholder content.

## Secret

Content intended to be hidden from published output. Two forms: a **hidden tab** (whole-tab hiding), or a **Secret callout block** (block-level hiding within a visible tab). Both are honored by the Publish feature (Phase 1.5).

Hidden tabs and Secret blocks are separate concerns — a tab can be hidden while containing no Secret blocks, and Secret blocks can appear inside visible tabs.

## Property

A structured field in the right sidebar, defined by the current page's template. Property types: `text` (single-line string), `longtext` (multi-line), `tags` (chip list), `refs` (list of node references), `date` (date or free-text date), `image` (uploaded asset).

Example: the Character template has properties `summary` (text), `friends` (refs), `tags` (tags). The Location template has `summary`, `parent_location` (refs), `tags`. Every non-folder template has `tags`.

## Reference

A link from one node to another. Two ways references are created:

1. **Via a property** — e.g. adding "Sampo Koski" as a Friend of Valera Jiang. Stored as the target node's id in the property value.
2. **Via a mention or wikilink** — inline in a tab's content.

References are bidirectional in effect (both nodes "know" about each other) but stored one-sided; the system computes back-references at render time.

## Mention

An `@` link to another node inserted inline in the editor. Typing `@` opens a picker with a searchable list of all nodes in the project; picking one inserts a clickable link.

## Wikilink

A `[[Name]]` inline link — same effect as a mention, different syntax. Parsed automatically as the user types.

## Tag

A user-defined string attached to a node, added via the Tags property in the sidebar. Tags are freeform (no hierarchy, no fixed vocabulary) and used for filtering the tree (search `#tagname`) and for filtering what to include in a Publish.

## Node Color

A palette color explicitly assigned to a node via the color picker in the tree. Stored as the color's palette key (e.g. `'purple'`), not the raw hex, so the color can be re-tuned across themes without needing to update every node.

## Color Cascade

Colors propagate from a node to all its descendants unless a descendant sets its own color. The tree computes an **effective color** per node by walking up the parent chain until it finds one with an own color, or reaches the root uncolored.

- **Effective color** — the color that actually renders on a node's row.
- **Own color** — a color the node explicitly set. Owns break the cascade.
- **Owner** — a node with an own color. Owners get a solid left-border stripe in the tree row so the user can see where a cascade originates.

## LK / LegendKeeper

The commercial worldbuilding app this project is shaped after. Anamnesis is not affiliated with LegendKeeper — the only connection is that Anamnesis reads and writes LK's `.lk` export format for user convenience.

The user has an existing 75-page `Valeraverse.lk` export that is the acceptance test for the importer.

## `.lk` File

LegendKeeper's export format. **Gzipped JSON.** Ungzip to get a JSON document with a `resources` array (each item = one node/page), containing `documents` (= our tabs) with `content` (= ProseMirror JSON block trees). Details in `docs/lk-format.md`.

Content is BlockNote-compatible because BlockNote is built on TipTap which is built on ProseMirror. Some LK-specific block types (columns, inline icons) need translation on import.

## Publish (Phase 1.5)

The read-only static-site generator. Not part of Phase 1. When shipped, it will let a user pick a subset of their project, generate a browsable HTML site of those pages (respecting hidden tabs and Secret blocks), and deploy it to Cloudflare Pages / Netlify / GitHub Pages.

The same feature serves two use cases: sharing a world with a co-writer for read-only viewing, and public release (e.g. Orynthia going public eventually).

## Asset

An uploaded image file, stored in the project's `assets/` subfolder. Asset ids are the filename minus the extension. Every image drop or upload creates a new asset; deleting a node doesn't currently delete its referenced assets (garbage collection is a future consideration).

## Autosave

The debounced save-to-disk mechanism. Any change to a node — content edit, rename, property update, color change, tab hide/show — triggers a save after ~300ms of inactivity on that node. Autosave is a plain service (`src/services/autosave.ts`), not a hook, because the debounce timer must survive React re-renders.

The user should see a brief "Saved" indicator in the top bar after a save commits, then it fades. No spinners, no confirmation dialogs.
