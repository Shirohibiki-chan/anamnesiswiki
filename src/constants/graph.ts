// Numbers the relationship graph is laid out with. Phase 24, step 1.
//
// Here rather than in graph-layout.ts because of CLAUDE.md rule 8, and because
// these are the knobs anyone tuning how the picture *feels* will reach for —
// keeping them in one short file means that tuning never has to be done inside
// a force simulation.

/**
 * How far apart two rings of the layout start out, before the simulation runs.
 *
 * A seed rather than a result: the settled distance is whatever the forces
 * below agree on. What this buys is that the first frame already looks like
 * rings, so a graph that settles quickly never appears to explode outward.
 */
export const GRAPH_RING_RADIUS = 220;

/** The drawn radius of a node's disc, and what the layout keeps clear of it. */
export const GRAPH_NODE_RADIUS = 22;

/**
 * How much room a node claims from its neighbours.
 *
 * Bigger than the disc on purpose — a node carries its name underneath it, and
 * two discs that merely fail to overlap still stack their labels on top of one
 * another.
 */
export const GRAPH_COLLIDE_RADIUS = 78;

/** Resting length of a line between two connected pages. */
export const GRAPH_LINK_DISTANCE = 150;

/** How hard nodes push each other apart. Negative is repulsion, as d3 has it. */
export const GRAPH_CHARGE = -520;

/**
 * How many steps of the simulation are run before anything is drawn.
 *
 * **The whole simulation runs at once and then stops**, rather than animating
 * to rest over a few seconds. Two reasons, and the second is the one that
 * decided it: a layout with no running timer cannot be caught half-settled, so
 * "the same project looks the same every time you open it" holds without
 * qualification; and an idle animation loop is a core spinning on the user's
 * machine for a picture that has stopped moving. 300 is d3's own default
 * count for reaching its default alpha floor.
 */
export const GRAPH_TICKS = 300;

/** Padding kept between the outermost node and the edge of the view. */
export const GRAPH_FIT_PADDING = 80;

/** How far in and out the view can be zoomed. */
/**
 * How far the automatic fit is allowed to magnify a small graph.
 *
 * Above 1 on purpose, and found by looking: capped at 1, a page with eight
 * neighbours sat in the middle of a 1440px window using about a third of it,
 * which reads as a picture that failed to load rather than as a small graph.
 * Still bounded, because three pages blown up to fill a monitor is the other
 * failure.
 */
export const GRAPH_MAX_FIT_ZOOM = 1.6;

export const GRAPH_MIN_ZOOM = 0.2;
export const GRAPH_MAX_ZOOM = 2.5;

/**
 * How far a pointer travels before a press on a node counts as a drag.
 *
 * A node is both a thing you move and a thing you click, so one of the two has
 * to yield. A few pixels of slack means a deliberate click still opens the
 * preview even when the hand is not perfectly still.
 */
export const GRAPH_DRAG_THRESHOLD = 4;

/** How fast the wheel zooms. Small: a notch should nudge, not jump. */
export const GRAPH_ZOOM_SENSITIVITY = 0.0016;

/**
 * How many connections out the graph reaches by default.
 *
 * One, which is the page and the pages touching it. Two hops on a world of any
 * size pulls in most of it, which is the hairball the plan is written against.
 * The control that changes this is step 2 — see `docs/plan.md` Phase 24.
 */
export const GRAPH_DEFAULT_DEPTH = 1;

/**
 * How far out the graph can be asked to reach, in connections.
 *
 * Three is the ceiling rather than an arbitrary stop: on a world of any size a
 * fourth hop is most of the world, which is the whole-project view rather than
 * one page's relationships. The default stays 1 — see GRAPH_DEFAULT_DEPTH, and
 * the plan's note that two hops rendered at once is the hairball this is
 * written against.
 */
export const GRAPH_DEPTHS = [1, 2, 3] as const;

export type GraphDepth = (typeof GRAPH_DEPTHS)[number];

/**
 * Reaching past counting hops altogether — every page in the universe at once.
 *
 * **The global graph is this value, not a separate feature.** Both graphs were
 * scoped as one component fed a different set of pages, and the reach control
 * is where "which set" was already being asked; a fourth step on it is the
 * whole of the difference. The rail's button is a second door to the same
 * place rather than a second implementation of it — her call 2026-09-08.
 */
export const GRAPH_REACH_EVERYTHING = "everything";

export const GRAPH_REACHES = [1, 2, 3, GRAPH_REACH_EVERYTHING] as const;

export type GraphReach = (typeof GRAPH_REACHES)[number];

/**
 * Below this zoom, a node's name is not drawn.
 *
 * A whole world does not fit on a screen at a size names can be read at, and
 * the honest options are illegible text or none. None wins: at this scale the
 * shape is the thing being read — the clusters, what is joined to what — and
 * three hundred labels at six pixels are visual noise standing where that shape
 * should be.
 *
 * **No exception for the node being pointed at or selected**, which there was
 * until it was looked at running. A name is clamped to two lines at its own
 * size, so at a fifth of that it draws as a few stripes of grey in the middle
 * of the picture — unreadable, and reading as a rendering fault rather than as
 * a word. Nothing is lost by dropping it: the card beside the graph names what
 * is selected in full, and hovering still raises the node's own tooltip.
 */
export const GRAPH_NAME_ZOOM = 0.5;

/**
 * The prefix for a whole-universe graph's stored arrangement.
 *
 * `Project.graphPins` is keyed by the page a graph is centred on, and this
 * graph is centred on nothing. A universe id under a prefix keeps the two kinds
 * of key from ever colliding — page ids are UUIDs, so nothing containing a
 * colon can be one — and gives each universe its own arrangement, which is what
 * anyone who arranges one would expect of the next.
 */
export const GRAPH_WORLD_PIN_PREFIX = "universe:";
