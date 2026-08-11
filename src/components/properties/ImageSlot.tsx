// Drag-drop / click-to-browse image upload at the top of the properties
// panel. See docs/plan.md Phase 6. Native OS drag-drop is handled as plain
// HTML5 DnD here (tauri.conf.json sets dragDropEnabled: false precisely so
// the webview doesn't intercept it — the same setting the tree's own
// drag-reparenting relies on), so a dropped OS file arrives as a normal
// browser File with real bytes, no Tauri-specific drag API needed.
//
// Phase 16 gave the filled slot its own hover toolbar — change, reposition,
// describe, set as cover — so click-to-browse now belongs to the *empty* slot
// alone: with a reposition drag living on the picture, a stray click opening a
// file dialog would fight it.
import { useRef, useState, type PointerEvent } from "react";
import { Expand, Image as ImageIcon, Move, PanelTop, Type, Upload, X } from "lucide-react";
import { MAX_IMAGE_BYTES } from "../../constants/limits";
import { useDialogs } from "../../hooks/use-dialogs";
import { useOpenSingleImage } from "../../hooks/use-lightbox";
import { useNodeImage } from "../../hooks/use-node-image";
import { useProject } from "../../hooks/use-project";

type ImageSlotProps = {
  nodeId: string;
  image?: string;
  imageAlt?: string;
  imageFocusY?: number;
  hasBanner: boolean;
};

function extensionFor(file: File): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  if (match) return match[1].toLowerCase();
  return file.type.split("/")[1] ?? "png";
}

export function ImageSlot({ nodeId, image, imageAlt, imageFocusY, hasBanner }: ImageSlotProps) {
  const { setNodeImage, clearNodeImage, setImageAlt, setImageFocus, clearImageFocus, setBannerFromImage } = useProject();
  const { confirmDestructive } = useDialogs();
  const openImage = useOpenSingleImage();
  const { url: imageUrl, status: imageStatus } = useNodeImage(image);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [isDescribing, setIsDescribing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startY: number; startFocus: number } | null>(null);
  const cancelDescribe = useRef(false);

  const isCropped = imageFocusY !== undefined;

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
    const bytes = new Uint8Array(await file.arrayBuffer());
    await setNodeImage(nodeId, bytes, extensionFor(file));
  }

  // Entering reposition mode crops the slot even before the first drag, so
  // there's a frame to drag *within* — otherwise the handles move a picture
  // that isn't being clipped by anything and nothing appears to happen.
  function startRepositioning() {
    if (!isCropped) setImageFocus(nodeId, 50);
    setIsRepositioning(true);
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!isRepositioning) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startY: e.clientY, startFocus: imageFocusY ?? 50 };
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragState.current || !frameRef.current) return;
    const height = frameRef.current.offsetHeight || 1;
    const deltaPercent = ((e.clientY - dragState.current.startY) / height) * 100;
    setImageFocus(nodeId, dragState.current.startFocus + deltaPercent);
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  async function handleSetCover() {
    // Replacing a cover deletes the file behind the old one, so the one case
    // that can lose a picture asks first.
    if (hasBanner) {
      const confirmed = await confirmDestructive("Replace this page's cover image with the picture in the sidebar?");
      if (!confirmed) return;
    }
    await setBannerFromImage(nodeId);
  }

  const slotClasses = [
    "property-image-slot",
    imageUrl ? "property-image-slot-filled" : "",
    isDragOver ? "property-image-slot-drag-over" : "",
    imageUrl && isCropped ? "property-image-slot-cropped" : "",
    isRepositioning ? "property-image-slot-repositioning" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="property-field">
      <div className="ui-eyebrow property-field-label">Image</div>
      <div
        ref={frameRef}
        className={slotClasses}
        onClick={imageUrl ? undefined : () => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          void acceptFile(e.dataTransfer.files[0]);
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={imageAlt ?? ""}
              className="property-image-preview"
              style={isCropped ? { objectPosition: `center ${imageFocusY}%` } : undefined}
              draggable={false}
            />
            <button
              type="button"
              className="ui-icon-btn property-image-remove"
              aria-label="Remove image"
              title="Remove image"
              onClick={(e) => {
                e.stopPropagation();
                void clearNodeImage(nodeId);
              }}
            >
              <X size={12} />
            </button>
            {isRepositioning ? (
              <div className="property-image-reposition-bar">
                <span className="property-image-hint">Drag the picture to reposition it</span>
                <div className="property-image-reposition-actions">
                  <button
                    type="button"
                    className="property-image-reposition-btn"
                    onClick={() => {
                      clearImageFocus(nodeId);
                      setIsRepositioning(false);
                    }}
                  >
                    Show whole image
                  </button>
                  <button type="button" className="property-image-reposition-btn" onClick={() => setIsRepositioning(false)}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="property-image-tools">
                <button
                  type="button"
                  className="property-image-tool"
                  aria-label="Change image"
                  title="Change image"
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload size={13} />
                </button>
                {/* Phase 16's fifth slot button. A button rather than a click
                    on the picture itself, which is the one thing this slot
                    can't have: the reposition drag already starts there, and
                    a click that both begins a drag and opens a window is how
                    you get one by accident every time you try the other. */}
                <button
                  type="button"
                  className="property-image-tool"
                  aria-label="Open image full size"
                  title="Open image full size"
                  onClick={() => openImage(imageUrl, imageAlt ?? "")}
                >
                  <Expand size={13} />
                </button>
                <button
                  type="button"
                  className="property-image-tool"
                  aria-label="Reposition image"
                  title="Reposition image"
                  onClick={startRepositioning}
                >
                  <Move size={13} />
                </button>
                <button
                  type="button"
                  className={`property-image-tool${imageAlt ? " property-image-tool-set" : ""}`}
                  aria-label="Describe image"
                  title={imageAlt ? `Description: ${imageAlt}` : "Describe image (ALT text)"}
                  onClick={() => setIsDescribing((open) => !open)}
                >
                  <Type size={13} />
                </button>
                <button
                  type="button"
                  className="property-image-tool"
                  aria-label="Set as cover image"
                  title="Set as cover image"
                  onClick={() => void handleSetCover()}
                >
                  <PanelTop size={13} />
                </button>
              </div>
            )}
          </>
        ) : imageStatus === "loading" ? (
          <div className="property-image-empty" />
        ) : (
          <div className="property-image-empty">
            <ImageIcon size={22} />
            <span>{imageStatus === "error" ? "Image file missing" : "Drop image here"}</span>
          </div>
        )}
      </div>
      {isDescribing && imageUrl && (
        <input
          type="text"
          className="property-field-input property-image-alt"
          placeholder="Describe this image"
          defaultValue={imageAlt ?? ""}
          autoFocus
          onBlur={(e) => {
            // Escape sets this before unmounting the field, so the blur that
            // follows knows to throw the edit away rather than save it.
            if (!cancelDescribe.current) setImageAlt(nodeId, e.currentTarget.value);
            cancelDescribe.current = false;
            setIsDescribing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              cancelDescribe.current = true;
              e.currentTarget.blur();
            }
          }}
        />
      )}
      {error && <div className="property-image-error">{error}</div>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="property-image-input"
        onChange={(e) => {
          void acceptFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
