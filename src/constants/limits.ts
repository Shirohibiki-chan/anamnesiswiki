// Hard numeric limits. See docs/constants-and-theming.md §Key Constants.
export const RECENT_PROJECTS_COUNT = 8;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB — Phase 6's ImageSlot upload

// Caps for the Cmd+K search palette. The result cap keeps a one-letter query
// from rendering a row per page in a 75-page world.
export const MAX_SEARCH_RESULTS = 40;

// How much prose a result row shows around the match. A row fits roughly 88
// characters, less whatever the tab label in front of it takes — measured at
// ~77 for a short label and ~64 for a long one like "Relationships (hidden)".
// The window is centred on the match, so half of it is leading context, and
// the match stays on screen as long as that half clears the narrower figure.
// 100 leaves real headroom there; the trailing few characters may be clipped
// by the row's own ellipsis, which costs nothing but context already past the
// thing she was looking for.
export const SEARCH_SNIPPET_CHARS = 100;

// Windows' default MAX_PATH is 260 characters including the drive and the
// terminator, and it's the tightest limit of any platform we ship to.
//
// This used to be 200, holding back 60 characters on the grounds that a
// directory-storage node's own path is only the prefix — its `_page.json` and
// its children are longer still. That reasoning was wrong: the check runs on
// the node's *own full file path*, and a child too long to write fails its own
// check when it's written. All the headroom bought was refusing to save pages
// that Windows would have taken quite happily — five levels of ordinary page
// names under `OneDrive\Documents\Anamnesis` lands around 203, and the user
// hit exactly that on 2026-08-11 with a project no other app complained about.
//
// 255 leaves the terminator and a little slack. Deliberately not higher even
// though `\\?\` paths would go further: the whole point of file-per-page is
// that her writing stays legible outside the app, and a path Explorer or a
// sync client won't open isn't legible.
export const MAX_PATH_CHARS = 255;

// The longest a single file or folder name may be on disk. Nothing to do with
// the total above — it's a guard against one absurd name (a pasted paragraph
// as a page title) eating the whole budget or tripping NTFS's own 255-per-name
// limit. The page keeps its full name: that lives in the JSON, and the tree
// reads names from there, never from the filename.
//
// 96 is well clear of anything real — the longest name in the user's worlds is
// 44 characters — which matters, because lowering this later would change
// where existing pages resolve to and leave their old files behind.
export const MAX_SEGMENT_CHARS = 96;

// How many versions Settings → Patch Notes offers. Three is enough to cover
// "what changed recently" without the panel becoming an archive — the whole
// history is on the releases page, one link away from every tab.
export const PATCH_NOTES_VERSION_COUNT = 3;

// How many LK pictures an import downloads at once. Strictly one at a time
// made a 53-picture world take about a minute with the window looking frozen;
// a small pool cuts that without leaning on someone else's server.
export const IMPORT_IMAGE_CONCURRENCY = 6;

// How much of a page a hover preview shows. Bigger than a search snippet
// because it answers a different question: a snippet proves a match, and a
// preview is meant to save you the trip. Four or five lines at the card's
// width — enough to recognise which Valera this is, short enough that reading
// it is faster than following the link.
export const PREVIEW_EXCERPT_CHARS = 280;

// How long the pointer has to stay on a link before its preview appears. This
// number is the difference between a convenience and something you learn to
// steer around: with no delay, a card fires on every link the pointer crosses
// on its way somewhere else. Matches what Obsidian settled on.
export const HOVER_PREVIEW_DELAY_MS = 350;
