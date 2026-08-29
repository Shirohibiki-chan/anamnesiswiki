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
 * How many extra tree rows react-arborist renders beyond the visible strip.
 *
 * **This is what stops the tree flashing while you scroll.** The library
 * defaults to 1, which is a single 24px row of buffer, and it renders in
 * response to the scroll event — one frame behind the scroll itself. A wheel
 * gesture moves the list a few hundred pixels in that frame, so the strip
 * being revealed has nothing drawn in it yet and shows through as blank until
 * React catches up on the next frame. On a small tree the gap is off-screen
 * and nobody sees it; measured on a 480-row tree it was up to a full viewport
 * of empty, on every frame of the scroll.
 *
 * 24 rows is roughly one viewport at the current row height — enough that a
 * fast scroll still lands on rows that are already drawn. The cost is about
 * fifty more rows rendered, which for a row this simple does not register.
 *
 * Raise it if the flash ever comes back at a larger window size; don't lower
 * it to save renders without scrolling a big tree first.
 */
export const TREE_OVERSCAN_ROWS = 24;

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
 * **The two panels share one maximum**, and that is deliberate: dragged all the
 * way out they should come to rest at the same width, not at 520 and 560 by an
 * accident of which number was written down first. Asked for 2026-08-27, in
 * those words. Below it, the widths are whatever anyone drags them to — this
 * is about where they *stop*, not about keeping them in step.
 *
 * The cap used to be the only thing stopping the page being squeezed to
 * nothing, and it was not up to it: 520 and 560 add up to 1080, and the window
 * does not go below 900. See CENTER_MIN_WIDTH, which holds that line now, and
 * `maxPanelWidth`, which is this number and the window's own arithmetic
 * together.
 */
export const TREE_MIN_WIDTH = 180;
export const TREE_DEFAULT_WIDTH = 260;

export const PROPERTIES_MIN_WIDTH = 220;
export const PROPERTIES_DEFAULT_WIDTH = 300;

/**
 * How wide either panel may be dragged, before the window has its say.
 *
 * 560, the wider of the two numbers this replaced — where there is room to
 * give, give it. On a window with less than `2 × 560 + CENTER_MIN_WIDTH` the
 * real limit is half the room the panels have between them, which is what
 * keeps "both dragged out" symmetrical at every size. See `maxPanelWidth`.
 */
export const PANEL_MAX_WIDTH = 560;

/**
 * The narrowest the page in the middle is allowed to get, whatever the panels
 * either side of it have been dragged to.
 *
 * **The panels give way, and their stored widths do not change.** Both are
 * declared as `minmax(0, <width>)` in the grid, so when the window cannot
 * afford all three the browser shrinks the panels rather than the page — and
 * the moment the window is wide enough again, they are back at exactly the
 * width they were dragged to. A version of this that clamped the *stored*
 * widths would move somebody's panel on its own and never put it back, which
 * is a worse trade than a panel that is temporarily narrower than it says.
 *
 * 420 because the top bar needs 391 to lay out (see the container query in
 * `shell.css`, which is what buys it the last 95 of those) and the rest is the
 * page's own gutters. At the 900px minimum window this leaves 480 for the two
 * panels together, which is both of them at about their own minimums — the
 * point at which the window is simply too small for three columns, and the
 * properties panel's own hide button is the answer rather than a smaller page.
 */
export const CENTER_MIN_WIDTH = 420;

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
 * **230, lowered from 245 on 2026-08-28, because 245 was measured against a
 * row that no longer exists.** It came from what a card measured at four across
 * on a 1280 window — but that was before the rail beside it and the column's
 * own scrollbar gutter took their share, and the carousel at 1280 is 992px
 * today, not the ~1000 that number assumed. So the fourth card fell off again,
 * reported the same way it was the first time.
 *
 * **The point of the new number is headroom, not accuracy.** Measured in the
 * built app: the carousel is 981px wide on a 1269 window and 992px on a 1280
 * one. At 245 the fourth card needed 996px, which is *above* both — the row was
 * three across on the window sizes it was designed for. At 230 it needs 938px,
 * so four survives down to about a 1226 window. A card lands at 236px there,
 * which is within a few pixels of what 245 was ever actually delivering.
 *
 * **Do not tune this to just clear the current window again.** That is what
 * produced two rounds of this bug: a threshold sitting a handful of pixels
 * under the size it has to work at is one padding change away from failing, and
 * it fails silently, by drawing a row that simply has fewer things in it.
 *
 * Two is the floor: two cards beside each other still read as a row, one
 * doesn't.
 *
 * The gap is `--space-lg`, and `start.css` is the real one — change both.
 */
export const PIN_TARGET_WIDTH = 230;
export const PIN_GAP = 12;
export const PIN_MIN_ACROSS = 2;

/**
 * What the row pages by before it has been measured — the count that is right
 * at the default window size, so the ordinary case doesn't reshape itself after
 * the first frame.
 */
export const PINS_PER_PAGE = 4;

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
