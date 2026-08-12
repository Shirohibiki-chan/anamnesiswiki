// Full-width cover image above the page title — LegendKeeper's "banner",
// a separate slot from the sidebar portrait (see properties/ImageSlot.tsx).
// Click to choose one when empty; once set, drag vertically on the image
// itself to reposition its vertical focus point (LK's own banners work the
// same way), or remove it via the hover-revealed × button.
import { useRef, type PointerEvent } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import type { Node } from "../../constants/schema";
import { useDialogs } from "../../hooks/use-dialogs";
import { useNodeImage } from "../../hooks/use-node-image";
import { useProject } from "../../hooks/use-project";

export function PageBanner({ node }: { node: Node }) {
  const { setNodeBannerFromLibrary, setBannerFocus, clearNodeBanner } = useProject();
  const { requestAssetPick } = useDialogs();
  const { url: bannerUrl, status: bannerStatus } = useNodeImage(node.banner);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startY: number; startFocus: number } | null>(null);

  // The library rather than a file dialog, with "add from computer" inside it.
  // The picker owns the size and format checks and shows its own message when
  // one fails, which is why this no longer carries an error of its own.
  async function pickBanner() {
    const picked = await requestAssetPick("Choose a cover for this page");
    if (picked) setNodeBannerFromLibrary(node.id, picked);
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startY: e.clientY, startFocus: node.bannerFocusY ?? 50 };
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragState.current || !containerRef.current) return;
    const height = containerRef.current.offsetHeight || 1;
    const deltaPercent = ((e.clientY - dragState.current.startY) / height) * 100;
    setBannerFocus(node.id, dragState.current.startFocus + deltaPercent);
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  // Hold the space while the bytes are being read, rather than flashing the
  // empty "Add banner" prompt on every page switch.
  if (bannerStatus === "loading") return <div className="page-banner page-banner-loading" />;

  if (!bannerUrl) {
    return (
      <div className="page-banner-empty">
        <button type="button" className="page-banner-add" onClick={() => void pickBanner()}>
          <ImageIcon size={13} /> {bannerStatus === "error" ? "Banner file missing — add another" : "Add banner"}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="page-banner"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <img
        src={bannerUrl}
        alt=""
        className="page-banner-image"
        style={{ objectPosition: `center ${node.bannerFocusY ?? 50}%` }}
        draggable={false}
      />
      <span className="page-banner-hint">Drag to reposition</span>
      <button
        type="button"
        className="ui-icon-btn ui-icon-btn-lg page-banner-remove"
        aria-label="Remove banner"
        onClick={(e) => {
          e.stopPropagation();
          void clearNodeBanner(node.id);
        }}
      >
        <X size={13} />
      </button>
    </div>
  );
}
