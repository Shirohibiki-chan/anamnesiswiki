// The board's own numbers and names (Board spike, 2026-09-13).

/**
 * The prefix a shape's link carries when it points at a page in the world.
 *
 * The drawing library stores one string per shape and calls it a URL, so a
 * page reference has to look like one. A scheme of the app's own is what
 * keeps a page link from ever being mistaken for a web address: a link that
 * starts with this is a page id, a link with any other scheme is somewhere
 * outside the app, and a link with no scheme at all is a page *name* somebody
 * typed by hand — see `boardLinkTarget`.
 */
export const BOARD_PAGE_LINK_PREFIX = "anamnesis://page/";

/** How many pages the link picker offers at once, the storyline picker's number. */
export const BOARD_PICKER_RESULTS = 8;
