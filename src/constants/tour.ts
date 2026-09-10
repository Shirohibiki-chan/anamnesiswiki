// The short tour: four highlights over the real app, for somebody who has just
// opened a world for the first time. Phase 26, step 2.
//
// **This is the half that explains where things are.** The example world
// explains what a world is made of and is forbidden from naming a single part
// of the interface (`example-world.ts`); this file is the other side of that
// line and does nothing else. Keeping them apart is what makes the fragile half
// small — when a later phase moves a panel, this file and its anchors are the
// whole of what has to be re-checked.
//
// **Anchored by `data-tour` attributes rather than by class names.** A class is
// a styling decision somebody is entitled to rename; the attribute is a
// statement that the tour points here, greppable from the element itself. A
// step whose anchor is missing is dropped rather than drawn against nothing —
// see `tour-service.ts` — so a panel somebody has closed costs a step, never a
// highlight floating in the corner.

/** Where the card sits against the thing it is pointing at. */
export type TourSide = "right" | "left" | "inside";

export type TourStep = {
  id: string;
  /** The `data-tour` value of the element this step points at. */
  anchor: string;
  title: string;
  body: string;
  side: TourSide;
};

/** How far the card sits from the highlight, and the highlight from its element. */
export const TOUR_CARD_GAP = 16;
export const TOUR_HIGHLIGHT_PAD = 4;

/** Never nearer the window's edge than this. */
export const TOUR_VIEWPORT_MARGIN = 12;

export const TOUR_CARD_WIDTH = 320;

/**
 * Four steps, and deliberately not more.
 *
 * The tour is for the first two minutes, not for teaching the app — anything
 * that needs a fifth step needs a page in the example world instead. Each one
 * names a column of the window, in the order somebody reads them.
 */
export const TOUR_STEPS: TourStep[] = [
  {
    id: "rail",
    anchor: "rail",
    title: "The rail",
    body: "Everything that belongs to the app rather than to any one page: what the panel beside it is showing, search, your whole world drawn as a graph, the way to another world, and settings.",
    side: "right",
  },
  {
    id: "tree",
    anchor: "tree",
    title: "Your world",
    body: "Every page you have. Any page can hold other pages, so rows open into more rows — there is no separate kind of thing you have to file writing inside. The + makes a new page wherever you are.",
    side: "right",
  },
  {
    id: "page",
    anchor: "page",
    title: "The page",
    body: "Where the writing goes. The tabs along the top are parts of the same page rather than separate ones, and typing / offers everything you can put in a page — pictures, callouts, columns, links to other pages.",
    side: "inside",
  },
  {
    id: "properties",
    anchor: "properties",
    title: "What the page knows",
    body: "The fields and blocks belonging to whatever is open — a summary, who it is tied to, its picture, its tags. Add to it from the top, and close the whole panel when you would rather have the room.",
    side: "left",
  },
];
