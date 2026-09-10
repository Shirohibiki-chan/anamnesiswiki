// The short tour, drawn over the app. Phase 26, step 2.
//
// **Four dimmed rectangles and a bordered box, not a hole in a sheet.** The
// reasoning is in `tour-service.ts`: this runs on WebKitGTK for at least one
// real person, and a tutorial that renders wrong is indistinguishable from an
// app that is broken. Nothing here uses a mask, a clip path or anchor
// positioning.
//
// Rendered into the body rather than into the layout, so no panel's overflow
// can clip it and no column's stacking context can put a sidebar in front of
// it.
import { createPortal } from "react-dom";
import { useTour } from "../../hooks/use-tour";
import { TOUR_CARD_WIDTH } from "../../constants/tour";

export function TourOverlay() {
  const { step, at, total, highlight, panels, card, measureCard, next, back, finish } = useTour();

  if (!step || !highlight) return null;

  const isLast = at + 1 >= total;

  return createPortal(
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* The dimming, in four pieces. Every piece of the overlay — these and the
          ring — leaves the tour when clicked, which is the same thing every
          other backdrop in the app does. The alternative was letting a click on
          the highlighted column fall through to the app underneath, so that a
          click an inch to the left dismissed the tour and a click on the thing
          it was pointing at operated it. One overlay, one behaviour. */}
      {panels.map((panel, index) => (
        <div
          key={index}
          className="tour-dim"
          style={{ left: panel.left, top: panel.top, width: panel.width, height: panel.height }}
          onClick={finish}
        />
      ))}

      <div
        className="tour-ring"
        style={{ left: highlight.left, top: highlight.top, width: highlight.width, height: highlight.height }}
        onClick={finish}
      />

      <div
        ref={measureCard}
        className="tour-card"
        style={{
          width: TOUR_CARD_WIDTH,
          // Hidden rather than absent until it has been measured: it has to be
          // in the document to have a height, and one frame in the corner of
          // the window on the way past is a flicker somebody sees.
          left: card?.left ?? 0,
          top: card?.top ?? 0,
          visibility: card ? "visible" : "hidden",
        }}
      >
        <p className="tour-count">
          {at + 1} of {total}
        </p>
        <h2 className="tour-title" id="tour-title">
          {step.title}
        </h2>
        <p className="tour-body">{step.body}</p>
        <div className="tour-actions">
          {/* Always there, on every step, and never only an X in a corner. The
              one thing somebody must be able to do with a tutorial they did not
              ask for is leave it. */}
          <button type="button" className="ui-btn tour-skip" onClick={finish}>
            {isLast ? "Close" : "Skip"}
          </button>
          <div className="tour-advance">
            {at > 0 && (
              <button type="button" className="ui-btn ui-btn-secondary" onClick={back}>
                Back
              </button>
            )}
            <button type="button" className="ui-btn ui-btn-primary" onClick={next} autoFocus>
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
