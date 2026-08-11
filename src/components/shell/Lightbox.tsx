// A picture blown up to fill the window. See docs/plan.md Phase 16 and
// hooks/use-lightbox.ts, which holds all of the behaviour — this renders.
//
// Mounted at the app root next to ConfirmDialog and NoticeDialog, for the same
// reason those are: it portals to document.body regardless, and it's opened
// from two unrelated places (a picture in the editor, the portrait button in
// the properties panel) with no props path between them.
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { useLightbox } from "../../hooks/use-lightbox";

export function Lightbox() {
  const lightbox = useLightbox();
  const { current, index, count, view, isZoomed, stageRef, imageRef, close, step, resetView } = lightbox;
  const { zoomIn, zoomOut, handleWheel, startPan, movePan, endPan } = lightbox;

  if (!current) return null;

  const hasArrows = count > 1;

  return createPortal(
    // Clicking anywhere that isn't the picture shuts it — the backdrop, the
    // empty space beside a portrait-shaped image, the bar's own background.
    // The controls and the picture stop the click themselves.
    <div
      className="lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={current.name || "Image"}
      onClick={close}
    >
      <div className="lightbox-bar">
        {/* Empty for a picture with no name of its own — see
            services/page-images.ts. The element stays so the controls opposite
            it don't shift when arrowing between named and unnamed pictures. */}
        <span className="lightbox-name" title={current.name}>
          {current.name}
        </span>
        <div className="lightbox-actions" onClick={(e) => e.stopPropagation()}>
          {hasArrows && (
            <span className="lightbox-count">
              {index + 1} / {count}
            </span>
          )}
          <button type="button" className="lightbox-btn" aria-label="Zoom out" title="Zoom out (−)" onClick={zoomOut}>
            <Minus size={16} />
          </button>
          <button
            type="button"
            className="lightbox-btn lightbox-zoom-level"
            aria-label="Reset zoom"
            title="Reset zoom (0)"
            onClick={resetView}
          >
            {Math.round(view.scale * 100)}%
          </button>
          <button type="button" className="lightbox-btn" aria-label="Zoom in" title="Zoom in (+)" onClick={zoomIn}>
            <Plus size={16} />
          </button>
          <button type="button" className="lightbox-btn" aria-label="Close" title="Close (Esc)" onClick={close} autoFocus>
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="lightbox-stage" ref={stageRef} onWheel={handleWheel}>
        <img
          ref={imageRef}
          className={`lightbox-image${isZoomed ? " lightbox-image-zoomed" : ""}`}
          src={current.src}
          alt={current.name}
          draggable={false}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={startPan}
          onPointerMove={movePan}
          onPointerUp={endPan}
          onPointerCancel={endPan}
        />
      </div>

      {hasArrows && (
        <>
          <button
            type="button"
            className="lightbox-arrow lightbox-arrow-prev"
            aria-label="Previous image"
            title="Previous image (←)"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
          >
            <ChevronLeft size={26} />
          </button>
          <button
            type="button"
            className="lightbox-arrow lightbox-arrow-next"
            aria-label="Next image"
            title="Next image (→)"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
          >
            <ChevronRight size={26} />
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
