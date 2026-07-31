// Hard numeric limits. See docs/constants-and-theming.md §Key Constants.
export const RECENT_PROJECTS_COUNT = 8;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB — Phase 6's ImageSlot upload

// Windows' default MAX_PATH is 260 characters including the drive and the
// terminator, and it's the tightest limit of any platform we ship to. Checked
// with headroom rather than at the wire, because a directory-storage node's
// own path is only the prefix — its `_page.json`, and every child filed under
// it, are longer still. A page whose own path is already at 260 has nowhere
// left to put its contents.
export const MAX_PATH_CHARS = 200;
