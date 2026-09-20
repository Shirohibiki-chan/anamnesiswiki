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

/**
 * The longest side a picture from the Assets tab is put on a board at, in
 * the drawing's units. A picture smaller than this arrives at its own size;
 * a photograph straight off a camera is scaled to fit, since it would
 * otherwise cover the whole board — resizing is the whole control after
 * that. Phase 32, step 4.
 */
export const BOARD_PICTURE_MAX_SIDE = 480;

/** How many pages the link picker offers at once, the storyline picker's number. */
export const BOARD_PICKER_RESULTS = 8;

/**
 * The drag type a page row carries when it is dragged out of the tree, so a
 * board can tell a page from a picture (`ASSET_DRAG_TYPE`) or a file. The
 * data is a JSON list of page ids — one for a row, several for a dragged
 * multi-selection. Phase 32, step 1.
 */
export const PAGE_DRAG_TYPE = "application/x-anamnesis-pages";

/**
 * A page card's size when it is first put on a board, in the drawing's own
 * units: big enough to be the picture card, the presentation a page arrives
 * in on LK's boards too. Resizing it is what changes the presentation — see
 * `cardPresentation`.
 */
export const BOARD_CARD_WIDTH = 240;
export const BOARD_CARD_HEIGHT = 160;

/**
 * Where a card stops being a picture and becomes a row, and where a row
 * becomes an icon alone. Read off the card's box each time it is drawn,
 * never stored — so resizing is the whole control.
 */
export const BOARD_CARD_ICON_MAX_WIDTH = 110;
export const BOARD_CARD_ROW_MAX_HEIGHT = 110;

/** How far each card put on in a row is stepped from the last, so several picks do not stack exactly. */
export const BOARD_CARD_CASCADE = 24;

/**
 * The dotted background: how far apart the dots sit in the drawing's own
 * units, and the closest two may come on screen before the spacing doubles
 * — zoomed far out, dots a few pixels apart are a grey haze rather than a
 * grid, so every halving of the zoom past that point drops every other dot.
 */
export const BOARD_DOT_SPACING = 24;
export const BOARD_DOT_MIN_SCREEN_SPACING = 14;

/**
 * The library's own default canvas colour. A board whose file carries it is
 * read as having no colour set, so the dots show through — the colour was
 * the library's choice on the spike's boards, never hers.
 */
export const LIBRARY_DEFAULT_BACKGROUND = "#ffffff";
