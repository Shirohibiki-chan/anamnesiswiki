// The card a mention or wikilink shows on hover. Lives beside MentionChip for
// the same reason that does — see mention-inline-content.tsx for the
// custom-block-in-services/ layering note.
//
// Not TreePopover: that one closes on a click outside and swallows clicks
// inside it, which is right for a menu you opened and wrong for a card that
// appeared because the pointer went somewhere. This is `pointer-events: none`
// and closes when the pointer leaves the chip, so there is nothing to trap and
// no grace period to get right.
import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { getTemplateIcon } from "../../constants/icons";
import type { NodePreview } from "../preview-service";

const CARD_MARGIN = 6;
const VIEWPORT_MARGIN = 8;

type HoverPreviewCardProps = {
  anchorRect: DOMRect;
  preview: NodePreview;
};

export function HoverPreviewCard({ anchorRect, preview }: HoverPreviewCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const Icon = getTemplateIcon(preview.templateKey);

  // Rendered once invisibly to measure, then placed — the card's height
  // depends on how much of the page there was to show, so it isn't knowable
  // until it's in the DOM. Same two-pass shape as TreePopover.
  const [style, setStyle] = useState<CSSProperties>({
    position: "fixed",
    top: anchorRect.bottom + CARD_MARGIN,
    left: anchorRect.left,
    visibility: "hidden",
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    const left = Math.min(Math.max(anchorRect.left, VIEWPORT_MARGIN), window.innerWidth - rect.width - VIEWPORT_MARGIN);
    // Below the chip by preference, above it when there's no room — a card
    // that opened downward off the bottom of the window would be a preview you
    // have to scroll to read, which is worse than following the link.
    let top = anchorRect.bottom + CARD_MARGIN;
    if (top + rect.height > window.innerHeight - VIEWPORT_MARGIN) {
      top = anchorRect.top - rect.height - CARD_MARGIN;
    }
    top = Math.min(Math.max(top, VIEWPORT_MARGIN), window.innerHeight - rect.height - VIEWPORT_MARGIN);

    setStyle({ position: "fixed", top, left, visibility: "visible" });
  }, [anchorRect]);

  return createPortal(
    // `role="tooltip"` rather than a dialog: it's describing the link the
    // pointer is on, and there's nothing in it to reach.
    <div ref={ref} className="hover-preview" style={style} role="tooltip">
      <div className="hover-preview-head">
        {/* eslint-disable-next-line react-hooks/static-components -- getTemplateIcon returns a stable component reference for a given templateKey */}
        <Icon size={13} className="hover-preview-icon" />
        <span className="hover-preview-name">{preview.name}</span>
        <span className="hover-preview-template">{preview.templateLabel}</span>
      </div>

      {preview.tags.length > 0 && (
        <ul className="hover-preview-tags">
          {preview.tags.map((tag) => (
            <li key={tag}>#{tag}</li>
          ))}
        </ul>
      )}

      {preview.excerpt ? (
        <p className="hover-preview-excerpt">
          {preview.tabLabel && <span className="hover-preview-tab">{preview.tabLabel}</span>}
          {preview.excerpt}
        </p>
      ) : (
        // Said out loud rather than left blank. A card with nothing under the
        // name reads as one that failed to load what it was going to show.
        <p className="hover-preview-empty">Nothing written here yet.</p>
      )}
    </div>,
    document.body,
  );
}
