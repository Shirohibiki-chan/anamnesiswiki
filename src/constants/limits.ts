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
