// Layout numbers that more than one file has to agree on.

// How far one level of nesting shifts a sidebar row, in pixels. react-arborist
// takes this as a prop and defaults to 24; `TreeItem` positions its indent
// guide lines from the same number, so the two have to read it from one place
// or the lines drift away from the rows they belong to.
//
// 18 rather than the library's 24: at eight or nine levels deep the difference
// is most of a folder name. The guide lines are what make the tighter spacing
// still readable — don't lower this further without them.
export const TREE_INDENT = 18;

/**
 * How wide the two side panels can be dragged, in pixels, and where they start.
 *
 * The defaults are the widths both panels were fixed at before Phase 14 made
 * them draggable, so nobody's window changes shape on upgrade.
 *
 * The minimums are the point below which the panel stops being able to do its
 * job rather than an arbitrary floor: the tree at 180 still shows a name at
 * four levels of indent, and the properties panel at 220 still fits a label and
 * a value on one line. **Don't lower either to "0 to hide it"** — hiding is a
 * different action with a different control, and a panel dragged to nothing is
 * a panel the user can't find the edge of to drag back.
 *
 * The maximums exist because `.app-layout-center` is the `1fr` between them:
 * without a cap, two panels dragged wide on a small window leave the page they
 * describe with no room to render in.
 */
export const TREE_MIN_WIDTH = 180;
export const TREE_MAX_WIDTH = 520;
export const TREE_DEFAULT_WIDTH = 260;

export const PROPERTIES_MIN_WIDTH = 220;
export const PROPERTIES_MAX_WIDTH = 560;
export const PROPERTIES_DEFAULT_WIDTH = 300;

/**
 * How wide a page's text column actually is, in pixels — `--reading-width`
 * (60rem) less both `--page-gutter`s (2.5rem each). The CSS is the real one;
 * this is the same number where TypeScript has to know it, so change both.
 *
 * Only the LK importer reads it, and only to turn a percentage into pixels: LK
 * stores a picture's size as a share of its own text column, our image block
 * stores pixels, and there is no other way across. It's an approximation by
 * construction — LK's column is not this one — but it keeps a thumbnail a
 * thumbnail, which is the part a reader would notice going wrong.
 */
export const READING_COLUMN_WIDTH = 880;

/**
 * A project cover on the start screen, in pixels, and the gap between two of
 * them — the same numbers `start.css` lays the grid out with.
 *
 * TypeScript has to know them because the page size adapts to the window: how
 * many covers fit is arithmetic on these, and the alternative is measuring a
 * tile that only exists once the page it belongs to has been decided. The CSS
 * is the real one; change both together.
 *
 * `MIN_WIDTH` because the grid stretches its columns to fill the row — a tile
 * is never narrower than this, and usually a little wider.
 */
/**
 * The gap between two pictures in a grid of them, in pixels — `--space-md`,
 * which is what both picture grids (the Assets tab and the picker) set their
 * `gap` to.
 *
 * The page size needs it and CSS custom properties are not readable as numbers
 * from TypeScript. Everything else about those tiles is measured off a real one
 * at runtime rather than written down here — see `useMeasuredPagedList` for
 * why a picture tile can't honestly be a constant.
 */
export const PICTURE_GRID_GAP = 8;

/**
 * How many pages can be shown as dots before the row becomes a counter.
 *
 * A dot is 26px of hit target, so eight of them is 208px — wider than the
 * sidebar column the Assets tab lives in, and a row that wraps to two lines
 * under a grid reads as part of the grid. Past this the nav says "4 / 30"
 * instead, which is also the more useful sentence once there are thirty pages:
 * nobody counts dots that far.
 */
export const MAX_PAGE_DOTS = 8;

/**
 * The pinned row at the top of the start screen: how wide a card wants to be,
 * the gap between two of them (`--space-lg`), and the fewest that fit across.
 *
 * A pinned card is a *share* of the row rather than a fixed size, so unlike
 * every other grid here the column count is the input to the width rather than
 * the answer to it — but it can't be a constant either. Four across is right at
 * about 1280 and wrong at both ends: fullscreen on a 2560 monitor stretches
 * four cards into 565-wide letterboxed bands, and the narrowest window the app
 * allows squeezes them to 150 wide against a fixed height, taller than they are
 * wide. Neither is a shape anybody chose. So the count is picked to land the
 * cards near this width and the row shares out the remainder.
 *
 * 245 because that is what a card measures at four across on a 1280 window —
 * the size the row was drawn at, now kept at every other window size instead of
 * only that one. Two is the floor: two cards beside each other still read as a
 * row, one doesn't.
 *
 * The gap is `--space-lg`, and `start.css` is the real one — change both.
 */
export const PIN_TARGET_WIDTH = 245;
export const PIN_GAP = 12;
export const PIN_MIN_ACROSS = 2;

/**
 * What the row pages by before it has been measured — the count that is right
 * at the default window size, so the ordinary case doesn't reshape itself after
 * the first frame.
 */
export const PINS_PER_PAGE = 4;

/**
 * How narrow a row in the list view is allowed to get before the list stops
 * making another column of them.
 *
 * The list used to be one row across the whole window, which is only readable
 * at about the width the app opens at: fullscreen on a 2560 monitor left 2060
 * pixels of nothing between a project's name and the date beside it, because
 * the two are pinned to opposite ends of whatever they are given. Columns are
 * the answer rather than a cap on the width, since a capped list on a wide
 * monitor is the same empty screen with a tidier edge on it.
 *
 * 440 because the path sits *under* the name rather than beside it, so the top
 * line of a row is only a name and a date and doesn't need much width to keep
 * the two of them near each other. That is the whole reason the two-line row
 * is worth the extra height: a wide single-line row puts the gap straight back.
 */
export const PROJECT_ROW_MIN_WIDTH = 440;

export const PROJECT_TILE_MIN_WIDTH = 190;

/**
 * Both heights carry a line for the project's location, which is why they are
 * not the rounder numbers they used to be: a cover was 118 and a row 48 when
 * the caption was a name and a date.
 */
export const PROJECT_TILE_HEIGHT = 132;
export const PROJECT_ROW_HEIGHT = 56;
export const PROJECT_TILE_GAP = 10;

/**
 * How wide the start screen's rail can be dragged, and where it starts.
 *
 * The same mechanism as the two side panels above, for the same reason: the
 * rail is a column of text beside a grid of pictures, and how much of the
 * window each of those deserves is a reading preference rather than a fact —
 * the same argument that made the tree draggable in Phase 14.
 *
 * 232 is the width it shipped at, so nobody's start screen changes shape on
 * upgrade. The minimum is where a recent project's line stops working: the
 * chip and its gap take 28px, and below about 200 a name in the display face
 * ellipsises before it has said which project it is. The maximum is set by the
 * column it takes from rather than by the rail itself — the app's minimum
 * window is 900 wide, and 400 here still leaves the pinned row the two cards
 * across that `PIN_MIN_ACROSS` calls the floor.
 */
export const RAIL_MIN_WIDTH = 200;
export const RAIL_MAX_WIDTH = 400;
export const RAIL_DEFAULT_WIDTH = 232;
