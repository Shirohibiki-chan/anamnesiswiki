// The capture box, opened from anywhere. Phase 30, step 1 — the second door.
//
// **It is the same block, not a copy of it.** The dialog finds the world's
// capture block — the home page's, else the first one anywhere — and draws it
// with `CaptureBlock`, so the destinations, the remembered last one and the
// code words are exactly what the box on the page would do. Two boxes with
// two sets of rules is how "it worked on the page but not from the shortcut"
// happens; here there is one box drawn in two places.
//
// **A world with no box is told so and offered one**, rather than shown an
// empty dialog. The offer adds the block to the home page, which is where the
// plan puts it; a world with no home page either is told what to do next.
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useCaptureSource } from "../../hooks/use-capture";
import { useProject, useProjectHomeId } from "../../hooks/use-project";
import { useShortcutLabel } from "../../hooks/use-shortcuts";
import { CaptureBlock } from "../blocks/CaptureBlock";
import "./quick-capture.css";

export function QuickCaptureDialog({ onClose }: { onClose: () => void }) {
  const source = useCaptureSource();
  const homeId = useProjectHomeId();
  const { nodes, selectNode, addBlock } = useProject();
  const keys = useShortcutLabel("quickCapture");

  // Escape closes it. The destination popover inside the block stops the key
  // before it gets here (see TreePopover), so Escape there closes the popover
  // and Escape again closes the dialog — one layer per press.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const home = homeId ? nodes[homeId] : undefined;

  return createPortal(
    <div className="ui-backdrop ui-backdrop-top" onMouseDown={onClose}>
      <div
        className="ui-modal ui-modal-md quick-capture-dialog"
        role="dialog"
        aria-label="Quick capture"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="quick-capture-dialog-head">
          <h2 className="quick-capture-dialog-title">Quick Capture</h2>
          {source && (
            <span className="quick-capture-dialog-from">
              {source.isHome ? "The box on your home page" : `The box on ${source.node.name || "Untitled"}`}
            </span>
          )}
          <kbd className="quick-capture-dialog-keys">{keys}</kbd>
        </div>

        {source ? (
          <CaptureBlock
            block={source.block}
            node={source.node}
            nodes={nodes}
            autoFocus
            onOpen={(id) => {
              selectNode(id);
              onClose();
            }}
          />
        ) : home ? (
          <div className="quick-capture-dialog-empty">
            <p>Your home page has no capture box yet. This opens whichever one is there.</p>
            <button
              type="button"
              className="ui-btn ui-btn-primary"
              onClick={() => addBlock(home.id, "capture")}
            >
              Add one to {home.name || "the home page"}
            </button>
          </div>
        ) : (
          <div className="quick-capture-dialog-empty">
            <p>
              There is no capture box in this world yet. Add <em>Quick capture</em> from any page's Add Block, or set a
              home page from a page's right-click menu and add one there — this opens the home page's box first.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
