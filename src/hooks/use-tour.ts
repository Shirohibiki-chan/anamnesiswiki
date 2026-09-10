// The short tour, measured against the real window. Phase 26, step 2.
//
// The hook owns the measuring, because that is the part that has to touch the
// DOM; `tour-service.ts` owns where things go, because that is the part worth
// testing without one.
import { useCallback, useEffect, useRef, useState } from "react";
import { TOUR_START_DELAY_MS, TOUR_STEPS, type TourStep } from "../constants/tour";
import { getTourSeen } from "../services/app-settings-service";
import { availableSteps, dimPanels, highlightRect, placeCard, type Rect, type Size } from "../services/tour-service";
import { useTourStore } from "../state/tour-store";

/** The element a step points at, or null when nothing on screen claims it. */
function anchorElement(anchor: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
}

function rectOf(element: HTMLElement): Rect {
  const box = element.getBoundingClientRect();
  return { left: box.left, top: box.top, width: box.width, height: box.height };
}

function viewportSize(): Size {
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * Which steps have something to point at right now.
 *
 * Asked at the moment the tour starts rather than held anywhere: a panel that
 * is closed has no anchor, and "how many steps is this tour" is a question
 * about the window as it currently stands.
 */
function stepsOnScreen(): number {
  const present = new Set(TOUR_STEPS.filter((step) => anchorElement(step.anchor)).map((step) => step.anchor));
  return availableSteps(TOUR_STEPS, present).length;
}

/**
 * Starting the tour on purpose — the door back to it (Phase 26, step 3).
 *
 * Delayed by a beat because every caller so far is a button inside something
 * that is closing: the tour measures the window, and a settings dialog still
 * on screen is a window with a dialog over the thing being pointed at.
 */
export function useStartTour(): () => void {
  const start = useTourStore((state) => state.start);
  return useCallback(() => {
    window.setTimeout(() => start(stepsOnScreen()), TOUR_START_DELAY_MS);
  }, [start]);
}

/**
 * Starts the tour the first time somebody has a world open, and never again.
 *
 * **Once a project is open, not on the start screen** — every step points at a
 * column that does not exist until then. Mounted by `AppLayout`, which is the
 * component that only exists while a project is open, so "a world is open" is
 * not a condition this has to ask about.
 *
 * The one frame of delay is not cosmetic: the panels are measured by the tour,
 * and the layout settles its fitted widths after its first paint. Starting in
 * the same tick highlights the rectangle a panel had before it was sized.
 */
export function useTourOnFirstRun(): void {
  const start = useTourStore((state) => state.start);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let cancelled = false;
    let timer: number | undefined;
    void getTourSeen().then((seen) => {
      if (cancelled || seen) return;
      timer = window.setTimeout(() => start(stepsOnScreen()), TOUR_START_DELAY_MS);
    });

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [start]);
}

export type TourView = {
  step: TourStep | null;
  at: number;
  total: number;
  highlight: Rect | null;
  panels: Rect[];
  card: { left: number; top: number } | null;
  /** Callback ref for the card, so its real height decides where it sits. */
  measureCard: (element: HTMLElement | null) => void;
  next: () => void;
  back: () => void;
  finish: () => void;
};

export function useTour(): TourView {
  const { isRunning, at, next, back, finish } = useTourStore();
  const [cardSize, setCardSize] = useState<Size>({ width: 0, height: 0 });
  // Only ever bumped, never read: a window resize has to redraw the highlight,
  // and the geometry below is worked out while rendering rather than kept in
  // state, so all a resize needs to do is cause a render.
  const [, bumpForResize] = useState(0);

  // Worked out fresh on every render rather than held from when the tour
  // started: a panel closed mid-tour changes which steps exist, and a list
  // captured at the start would keep pointing at the one that left.
  const steps = isRunning
    ? availableSteps(TOUR_STEPS, new Set(TOUR_STEPS.filter((step) => anchorElement(step.anchor)).map((s) => s.anchor)))
    : [];
  const step = steps[at] ?? null;

  // **Measured during the render that draws it, not in an effect afterwards.**
  // The elements being measured are the app's own columns, which are already
  // laid out and painted before the tour ever starts — so this is a read of a
  // settled layout rather than a read of something this component renders.
  // Measuring in an effect would mean storing the result in state and drawing
  // one frame in the wrong place on the way from each step to the next.
  const viewport = viewportSize();
  const element = step ? anchorElement(step.anchor) : null;
  const anchor = element ? rectOf(element) : null;
  const highlight = anchor ? highlightRect(anchor, viewport) : null;
  const panels = highlight ? dimPanels(highlight, viewport) : [];
  const card = anchor && step && cardSize.height > 0 ? placeCard(anchor, cardSize, step.side, viewport) : null;

  useEffect(() => {
    if (!isRunning) return;
    const onResize = () => bumpForResize((count) => count + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isRunning]);

  // A step whose element has gone — a panel closed while the tour is on it —
  // leaves nothing to point at. Running past the end of the list ends the tour
  // rather than leaving it on, invisible, with nothing to draw and no way out
  // but the keyboard.
  useEffect(() => {
    if (isRunning && at >= steps.length) finish();
  }, [isRunning, steps.length, at, finish]);

  useEffect(() => {
    if (!isRunning) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish();
      } else if (event.key === "ArrowRight" || event.key === "Enter") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isRunning, next, back, finish]);

  const measureCard = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    const box = element.getBoundingClientRect();
    setCardSize((current) =>
      current.width === box.width && current.height === box.height ? current : { width: box.width, height: box.height },
    );
  }, []);

  return {
    step: isRunning ? step : null,
    at,
    total: steps.length,
    highlight,
    panels,
    card,
    measureCard,
    next,
    back,
    finish,
  };
}
