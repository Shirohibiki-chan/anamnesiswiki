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
// terminator, and it's the tightest limit of any platform we ship to. Checked
// with headroom rather than at the wire, because a directory-storage node's
// own path is only the prefix — its `_page.json`, and every child filed under
// it, are longer still. A page whose own path is already at 260 has nowhere
// left to put its contents.
export const MAX_PATH_CHARS = 200;

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
