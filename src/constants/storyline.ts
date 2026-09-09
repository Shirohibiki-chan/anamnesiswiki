// The storyline canvas's numbers (Phase 25). See docs/constants-and-theming.md.
//
// Deliberately not shared with `constants/graph.ts`, which they resemble. The
// two canvases answer different questions — a graph is explored and a storyline
// is composed — and one set of numbers serving both would mean every tuning of
// one silently retuning the other. What *is* shared with Phase 24 is the
// surface itself: pan, zoom, and lines drawn in SVG under nodes drawn in HTML.

/** A scene node's drawn size, in canvas units. The stylesheet matches these. */
export const STORYLINE_NODE_WIDTH = 168;
/**
 * Taller since step 3, to make room for the row of who is in the scene.
 *
 * **The row is drawn whether or not anybody is in it**, so this is one number
 * rather than two: a card that grew the first time a name was written into its
 * page would move every other card on the canvas, which is the failure
 * `docs/handoff.md` records as reading like the app shifting underneath.
 */
export const STORYLINE_NODE_HEIGHT = 84;

/**
 * How many of a scene's cast fit on the card before the rest become "+3".
 *
 * Four small icons is what 168 units of card has room for beside the name.
 * The full list is in the selection strip, where there is room for names.
 */
export const STORYLINE_CAST_SHOWN = 4;

/**
 * How far to the right of everything else a scene added from the button lands.
 *
 * Wider than a node so two in a row are visibly separate rather than touching,
 * and not so wide that adding five in a row walks off the edge of the window.
 */
export const STORYLINE_NEW_NODE_GAP = 240;

/**
 * A note's width when it is dropped, in canvas units.
 *
 * A note is text, so it grows downward as it is written and is never given a
 * height — the card is as tall as the sentence in it. The width is authored
 * because a wrap point is a design decision about a canvas, not something a
 * measurement can answer.
 */
export const STORYLINE_NOTE_WIDTH = 220;

/**
 * How far each new band is stepped along from the last, so a second one is not
 * exactly on top of the first.
 *
 * Small, because a band is a big empty outline and two of them offset a little
 * are still both readable.
 */
export const STORYLINE_ANNOTATION_CASCADE = 28;

/**
 * How far *down* each new note goes from the one before it.
 *
 * **A column, not a diagonal.** Notes were cascaded by 28px in both directions
 * first, which for a card that is three lines tall means the second note covers
 * the first — including its links, which then cannot be clicked at all. Found
 * 2026-09-09 by an app-suite scenario that could not reach a link it could see.
 * Taller than a typical note, so a run of them reads as a list.
 */
export const STORYLINE_NOTE_ROW = 110;

/**
 * How many pages the "put an existing page on it" picker offers at once.
 *
 * Eight, matching the reference property's picker — enough that the page you
 * meant is nearly always in the list, few enough that the list never becomes
 * something to scroll instead of something to read.
 */
export const STORYLINE_PICKER_RESULTS = 8;

/** How far clear of the scenes a new note or band is placed. */
export const STORYLINE_ANNOTATION_GAP = 56;

/** A band's size when it is dropped, before she pulls it over the scenes. */
export const STORYLINE_NEW_BAND_WIDTH = 620;
export const STORYLINE_NEW_BAND_HEIGHT = 320;

/**
 * The smallest a band can be dragged to.
 *
 * Not zero, and not a refusal either: a band pulled past its own corner would
 * be stored inside out, and `scenesOnBand` would then answer "nothing is on it"
 * for a band drawn around six scenes.
 */
export const STORYLINE_MIN_BAND_SIZE = 80;

/** How far apart *Tidy up* puts the columns and the rows. */
export const STORYLINE_TIDY_COLUMN_GAP = 260;
export const STORYLINE_TIDY_ROW_GAP = 120;

/**
 * Empty margin left around the scenes when the canvas is fitted to the window.
 *
 * Small, because the canvas sits in the page column rather than filling a
 * monitor: 120 units of margin on each side of a stage 600 wide is a fifth of
 * the picture given to nothing, and it is paid for by zooming everything else
 * down until the names stop being readable.
 */
export const STORYLINE_FIT_PADDING = 48;

/** Where a line stops short of the card it points at, so the arrowhead shows. */
export const STORYLINE_EDGE_GAP = 7;

export const STORYLINE_MIN_ZOOM = 0.2;
export const STORYLINE_MAX_ZOOM = 2.5;

/**
 * The furthest *out* the canvas will fit itself, however long the storyline.
 *
 * **A canvas that always fits is a canvas that becomes unreadable.** Five
 * scenes in the page column already fitted to 47%, where a scene's name is a
 * row of six-pixel marks — measured 2026-09-09. Past this point the picture
 * stops shrinking and she pans instead, which is the trade every map makes:
 * seeing all of it and being able to read it are different requests, and
 * shrinking answers the wrong one silently.
 *
 * `STORYLINE_MIN_ZOOM` is still lower, deliberately — the wheel goes further
 * out than the fit does, because zooming out to see the shape is something she
 * asked for and the fit is something that happened to her.
 */
export const STORYLINE_MIN_FIT_ZOOM = 0.7;

/**
 * The most the canvas zooms *in* when fitting a small storyline to the window.
 *
 * Without a ceiling, a storyline of two scenes is blown up until each one fills
 * a third of the monitor — which reads as broken rather than as close.
 */
export const STORYLINE_MAX_FIT_ZOOM = 1;

/** Wheel-notch to zoom conversion. Matches the graph's feel on purpose. */
export const STORYLINE_ZOOM_SENSITIVITY = 0.0015;

/**
 * How far a press has to travel before it is a drag rather than a click.
 *
 * The same threshold the graph uses, and it exists for the same reason: a hand
 * that moves two pixels while clicking must not leave a scene one pixel from
 * where it was and mark the canvas as changed.
 */
export const STORYLINE_DRAG_THRESHOLD = 4;

/**
 * Where a scene dropped onto the canvas by the "Add a scene" button goes when
 * the canvas has never been panned — the middle of the view, in canvas units.
 */
export const STORYLINE_ORIGIN = { x: 0, y: 0 };
