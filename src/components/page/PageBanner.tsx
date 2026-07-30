// Full-width cover image above the page title — LegendKeeper's "banner",
// a separate slot from the sidebar portrait (see properties/ImageSlot.tsx).
// Click to upload when empty; once set, drag vertically on the image itself
// to reposition its vertical focus point (LK's own banners work the same
// way), or remove it via the hover-revealed × button.
import { useRef, useState, type PointerEvent } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { MAX_IMAGE_BYTES } from "../../constants/limits";
import type { Node } from "../../constants/schema";
import { useNodeImage } from "../../hooks/use-node-image";
import { useProject } from "../../hooks/use-project";

function extensionFor(file: File): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  if (match) return match[1].toLowerCase();
  return file.type.split("/")[1] ?? "png";
}

export function PageBanner({ node }: { node: Node }) {
  const { setNodeBanner, setBannerFocus, clearNodeBanner } = useProject();
  const bannerUrl = useNodeImage(node.banner);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startY: number; startFocus: number } | null>(null);

  async function acceptFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That's not an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("That image is too large (10MB max).");
      return;
    }
    setError(null);
    const data = new Uint8Array(await file.arrayBuffer());
    await setNodeBanner(node.id, data, extensionFor(file));
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

  if (!bannerUrl) {
    return (
      <div className="page-banner-empty">
        <button type="button" className="page-banner-add" onClick={() => inputRef.current?.click()}>
          <ImageIcon size={13} /> Add banner
        </button>
        {error && <span className="page-banner-error">{error}</span>}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="page-banner-input"
          onChange={(e) => {
            void acceptFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
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
        className="page-banner-remove"
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
