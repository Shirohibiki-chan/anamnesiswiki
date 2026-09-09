// The storyline canvas's numbers (Phase 25). See docs/constants-and-theming.md.
//
// Deliberately not shared with `constants/graph.ts`, which they resemble. The
// two canvases answer different questions — a graph is explored and a storyline
// is composed — and one set of numbers serving both would mean every tuning of
// one silently retuning the other. What *is* shared with Phase 24 is the
// surface itself: pan, zoom, and lines drawn in SVG under nodes drawn in HTML.

/** A scene node's drawn size, in canvas units. The stylesheet matches these. */
export const STORYLINE_NODE_WIDTH = 168;
export const STORYLINE_NODE_HEIGHT = 64;

/**
 * How far to the right of everything else a scene added from the button lands.
 *
 * Wider than a node so two in a row are visibly separate rather than touching,
 * and not so wide that adding five in a row walks off the edge of the window.
 */
export const STORYLINE_NEW_NODE_GAP = 240;

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
