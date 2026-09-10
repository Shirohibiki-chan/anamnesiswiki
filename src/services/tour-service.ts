// Where the tour's highlight and its card go. Pure — no DOM, no React: it takes
// rectangles that were measured elsewhere and returns rectangles to draw.
//
// **Plain arithmetic on measured rectangles, deliberately.** CSS anchor
// positioning would do the placement and `clip-path` would do the cutout in
// about ten lines between them, and neither is safe here: Linux gets WebKitGTK,
// the oldest of the engines this app runs on, and there is a real person on it.
// A tutorial is the worst thing in the app to render wrong, because somebody
// seeing it break has no way to tell a broken tutorial from a broken app. Four
// dimmed rectangles around a hole is a technique that works everywhere.
import {
  TOUR_CARD_GAP,
  TOUR_HIGHLIGHT_PAD,
  TOUR_VIEWPORT_MARGIN,
  type TourSide,
  type TourStep,
} from "../constants/tour";

export type Rect = { left: number; top: number; width: number; height: number };
export type Size = { width: number; height: number };

function clamp(value: number, low: number, high: number): number {
  // Low wins when the two cross, which happens when the thing being placed is
  // bigger than the space — a card taller than a short window is pinned to the
  // top rather than pushed off it.
  return Math.max(low, Math.min(high, value));
}

/** The element's rectangle, grown by the highlight's padding and kept on screen. */
export function highlightRect(anchor: Rect, viewport: Size): Rect {
  const left = Math.max(0, anchor.left - TOUR_HIGHLIGHT_PAD);
  const top = Math.max(0, anchor.top - TOUR_HIGHLIGHT_PAD);
  return {
    left,
    top,
    width: Math.min(viewport.width - left, anchor.width + TOUR_HIGHLIGHT_PAD * 2),
    height: Math.min(viewport.height - top, anchor.height + TOUR_HIGHLIGHT_PAD * 2),
  };
}

/**
 * The four dimmed panels that leave the highlight showing through.
 *
 * A ring rather than one overlay with a hole in it: the hole would need
 * `clip-path` or a `mask`, and this needs neither. The four are laid out so
 * they never overlap — top and bottom run the full width, the sides fill only
 * the band between them — because two translucent panels stacked are visibly
 * darker than one and the seam shows.
 */
export function dimPanels(hole: Rect, viewport: Size): Rect[] {
  const bottomStart = hole.top + hole.height;
  const rightStart = hole.left + hole.width;
  return [
    { left: 0, top: 0, width: viewport.width, height: hole.top },
    { left: 0, top: bottomStart, width: viewport.width, height: Math.max(0, viewport.height - bottomStart) },
    { left: 0, top: hole.top, width: hole.left, height: hole.height },
    { left: rightStart, top: hole.top, width: Math.max(0, viewport.width - rightStart), height: hole.height },
  ].filter((panel) => panel.width > 0 && panel.height > 0);
}

/**
 * Where the card goes for one step.
 *
 * `inside` is for an element that fills its column — the page does, so there is
 * no beside to put anything: the card sits in the lower middle of the element
 * itself, which is the one place it can go without covering the top of the
 * writing the step is talking about.
 *
 * Everything is clamped into the window at the end rather than each branch
 * worrying about it, so a card that would hang off a narrow window slides back
 * on instead of being placed somewhere else entirely — a card that jumps to the
 * other side of its highlight reads as pointing at something else.
 */
export function placeCard(anchor: Rect, card: Size, side: TourSide, viewport: Size): { left: number; top: number } {
  const beside = { left: 0, top: anchor.top };
  if (side === "right") {
    beside.left = anchor.left + anchor.width + TOUR_CARD_GAP;
  } else if (side === "left") {
    beside.left = anchor.left - TOUR_CARD_GAP - card.width;
  } else {
    beside.left = anchor.left + anchor.width / 2 - card.width / 2;
    beside.top = anchor.top + anchor.height - card.height - TOUR_CARD_GAP * 2;
  }

  return {
    left: clamp(beside.left, TOUR_VIEWPORT_MARGIN, viewport.width - card.width - TOUR_VIEWPORT_MARGIN),
    top: clamp(beside.top, TOUR_VIEWPORT_MARGIN, viewport.height - card.height - TOUR_VIEWPORT_MARGIN),
  };
}

/**
 * The steps whose elements are actually on screen.
 *
 * **A step with nothing to point at is dropped, never drawn.** The right-hand
 * panel can be closed, and a later phase can move or rename a column; either
 * way the tour must not put a highlight round the corner of the window and a
 * card beside it. Somebody following that concludes the app is broken rather
 * than the instructions, which is the failure this phase was held back for.
 */
export function availableSteps(steps: TourStep[], present: ReadonlySet<string>): TourStep[] {
  return steps.filter((step) => present.has(step.anchor));
}
