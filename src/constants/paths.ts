// Default on-disk locations. See docs/constants-and-theming.md §Key Constants.
import { documentDir, join } from "@tauri-apps/api/path";

export const PROJECT_FILE = "project.json";
export const FOLDER_META_FILE = "_folder.json";
// Own-data marker for a nestable non-folder node (character/location/faction/
// species) — same idea as FOLDER_META_FILE, so a page that can hold children
// stores itself inside its own directory instead of a flat sibling file. That
// makes its directory's identity independent of its current name, so a
// rename can never orphan its children on the next project load.
export const PAGE_META_FILE = "_page.json";
export const ASSETS_DIR = "assets";

/**
 * The picture library's folders, kept inside `ASSETS_DIR` rather than at the
 * project root beside `.templates.json`.
 *
 * Two reasons, both about the load walk. A `.json` at the root is read as a
 * page unless it's named in `walkEntries`' skip list, and that list is one more
 * thing to get right in the one function that must never lose a file. Inside
 * `assets/` the question doesn't arise: the walk skips that directory whole.
 *
 * **A folder here is organisation, not location.** The pictures stay flat in
 * `assets/` and a reference stays `anamnesis-asset:<filename>`, so moving one
 * between folders touches nothing but this file. Real subdirectories would put
 * the folder name inside every reference to the picture, and moving it would
 * mean rewriting every page that shows it — where a half-finished rewrite is a
 * broken picture. The filename is the identity; this is a view over it.
 */
export const ASSET_FOLDERS_FILE = ".folders.json";

/**
 * How a picture inside a page's writing is written down (Phase 16). The
 * editor's image block stores a string in `props.url` and there is nowhere
 * else to put one, so what goes in there is `anamnesis-asset:<filename>` —
 * a file in `ASSETS_DIR`, resolved to something displayable at render time by
 * `services/asset-urls.ts`.
 *
 * A scheme rather than a bare filename because that field is *also* where a
 * real web address would sit, and the two have to be told apart with
 * certainty rather than by guessing at the shape of the string. Nothing in
 * this app writes a web address there — the upload panel is the only way in,
 * and BlockNote's own "embed from URL" tab is deliberately not rendered (see
 * `ImageFilePanel.tsx`) — but a `.lk` import, a paste, or a future format
 * could still produce one, and it must pass through untouched rather than
 * being looked for on disk.
 *
 * Changing this string strands every picture already written into a page.
 */
export const ASSET_REF_PREFIX = "anamnesis-asset:";

/**
 * The drag type a picture dragged out of the Assets tab carries.
 *
 * A custom MIME type rather than `text/plain`, and that's load-bearing: the
 * editor is a drop target for real files and for text, and both of those have
 * their own meaning there. Reading a filename out of `text/plain` would make
 * every dragged word of prose look like a picture, and putting one *in* would
 * have a drop anywhere else in the app paste a UUID. This type means exactly
 * one thing, and nothing but the Assets tab writes it.
 *
 * The payload is the bare filename in `ASSETS_DIR` — the same string a slot
 * stores — so the drop side wraps it in `ASSET_REF_PREFIX` itself.
 */
export const ASSET_DRAG_TYPE = "application/x-anamnesis-asset";

/**
 * What each picture is *called*, kept beside the pictures themselves.
 *
 * A picture's filename is a UUID and always has been: it's generated at upload
 * and every page that shows the picture holds that string, so the name on disk
 * is an identifier and can never safely become a label. Renaming the file would
 * mean rewriting every page pointing at it, and a rewrite that stops halfway is
 * a broken picture on a page nobody was looking at — the same argument that
 * made folders labels rather than locations. See ASSET_FOLDERS_FILE.
 *
 * So the name lives here, as `{ "<uuid>.png": "Valera's sword" }`. Losing this
 * file loses the names and nothing else: every picture, every folder and every
 * page still works, and the tiles fall back to unnamed.
 *
 * Dotted, so `listAssetImages` can skip it by name and it never turns up in the
 * grid as a picture that won't load.
 */
export const ASSET_NAMES_FILE = ".names.json";

/**
 * Where a picture came from, for the ones that came from somewhere.
 *
 * `{ "<uuid>.png": "https://assets.legendkeeper.com/<uuid>.png" }`. Only
 * pictures downloaded during a LegendKeeper import have an entry; one uploaded
 * from her own disk has no address in the world and never gets one.
 *
 * **This exists so a LK import can be exported back to LK.** A `.lk` file
 * cannot contain a picture — it contains the *address* of a picture on LK's own
 * servers — so a picture in a page's writing can only go home if we remember
 * the address it arrived from. Without this the round trip loses it, which is
 * the shape of loss the whole import/export pair is meant to avoid.
 *
 * Keyed by filename rather than stored on the block that shows the picture,
 * because the origin belongs to the *file*: the same picture used on four pages
 * came from one place, and BlockNote's image block has a fixed set of props
 * that an extra one couldn't survive a load through.
 *
 * A page's portrait and banner answer the same question with `imageSource` and
 * `bannerSource` on the node itself, which predate this and still work. Not
 * merged into here on purpose — two records of one fact is how they drift.
 *
 * Losing this file costs nothing that's on screen: every picture still shows,
 * and only a re-export back to LK is poorer for it.
 *
 * Dotted, so `listAssetImages` skips it the same way it skips the other two.
 */
export const ASSET_SOURCES_FILE = ".sources.json";

/**
 * Pictures taken out of the library that are still on a page.
 *
 * **The library is a view of the folder, not the folder itself**, and that
 * distinction is the whole reason this file exists. Removing a picture from
 * the library is a change to the library: the pages showing it carry on
 * showing it, exactly as they would in LegendKeeper, where deleting a library
 * entry deletes a row nothing was reading through.
 *
 * So a removed picture takes one of two paths. If nothing is using it, the file
 * itself goes and there's nothing to remember. If something *is* using it, the
 * file has to stay — a page needs those bytes — and its name is written here so
 * the grid stops showing it. Only the second case ever appears in this file,
 * which is why it's usually absent.
 *
 * A name here whose file is gone is dropped on the next sweep, the same as the
 * names and the sources: once the last page stops using the picture,
 * `releaseAsset` deletes the file and this entry has nothing left to hide.
 *
 * Losing this file un-hides a few pictures in the Assets tab and costs nothing
 * else — every page still shows what it showed.
 *
 * Dotted, so `listAssetImages` skips it alongside the other three.
 */
export const ASSET_REMOVED_FILE = ".removed.json";

/**
 * The world's own templates — "Convert to template" writes here. One file
 * holding a forest of pages, rather than a directory of them like the tree
 * itself: templates are scaffolding rather than writing, there are a dozen at
 * most, and a directory would have to be reserved at the project root, where
 * `Templates/` is a folder name someone might genuinely want.
 *
 * Per world, not per app (her decision, 2026-08-11): a template is made of the
 * tabs and properties a particular world needs, and carrying Valeraverse's into
 * an unrelated project would be clutter rather than a head start.
 *
 * The leading dot is doing real work. The load walk skips this name, and any
 * name the walk skips is a name a page can be lost behind — a page called
 * "Templates" resolves to `Templates.json`, which is the same file as
 * `templates.json` on Windows and macOS both. Nobody titles a page
 * ".templates". `buildPathIndex` reserves it as well, so even that page gets a
 * " (2)" instead of a collision.
 */
export const TEMPLATES_FILE = ".templates.json";

// Phase 12. Both sit *beside* the projects, in the projects folder rather than
// inside any one of them — a theme isn't part of a world, and having to
// re-make it for every project would be the wrong shape. They're also
// deliberately somewhere she can find: the alternative was the app's own data
// directory, which on Windows is a path nobody types by accident.
//
// Loose `.css` files rather than a registry, so making a theme is "save this
// file here" and deleting one is "delete the file". Nothing has to stay in
// step with anything.
export const THEMES_DIR = "themes";
export const SNIPPETS_DIR = "snippets";

// Where the app parks a copy of a stylesheet before it edits one. A subfolder
// of whichever folder the file lives in, because `readCssDir` only lists files
// directly inside a folder — so a backup can never come back as a theme.
export const BACKUPS_DIR = "backups";

// Prefix for the temporary name a node is parked under mid-move. Several
// nodes swapping paths have to be staged out of the way first, or one lands on
// another's name (see filesystem-service's applyRelocations).
//
// The load walk knows this prefix too, and that is not optional: if a move is
// interrupted, whatever is still parked under one of these names is a real
// page, and the loader has to recognise it as one rather than treat it as
// junk. Changing this string without changing both sides makes any
// interrupted move look like data loss.
/**
 * The file that says a project is open in a running copy of the app, written
 * into the project's own folder.
 *
 * In the project rather than in app settings, which is the opposite of where
 * pins and groups live and for the opposite reason: this is a fact about the
 * folder, and the whole point is that a *second* copy of the app — with its own
 * settings store in memory — can see it. A dot name so it sorts out of the way
 * in her file manager, and skipped by the load walk like the app's other files.
 */
export const OPEN_MARKER_FILE = ".anamnesis-open.json";

export const MOVE_TEMP_PREFIX = ".anamnesis-move-";

// Directory used to find out whether this machine will accept a path past the
// old 260-character MAX_PATH — see filesystem-service's `supportsLongPaths`.
// Made and removed within one call, so it should never be seen.
//
// Unlike the prefix above, the load walk needs no knowledge of this one: what
// it holds is a `.tmp` file, and the walk only reads `.json`. A leftover from
// an app that was killed mid-probe is inert, not a page waiting to be found.
export const PROBE_TEMP_PREFIX = ".anamnesis-probe-";

export async function getDefaultProjectsDir(): Promise<string> {
  return join(await documentDir(), "Anamnesis");
}
