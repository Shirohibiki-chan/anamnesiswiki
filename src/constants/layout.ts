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
export const PROJECT_TILE_MIN_WIDTH = 190;
export const PROJECT_TILE_HEIGHT = 118;
export const PROJECT_ROW_HEIGHT = 48;
export const PROJECT_TILE_GAP = 10;
