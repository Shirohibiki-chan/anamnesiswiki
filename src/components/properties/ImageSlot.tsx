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
import { useUploadPicture } from "../../hooks/use-assets";
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

export function ImageSlot({ nodeId, image, imageAlt, imageFocusY, hasBanner }: ImageSlotProps) {
  const { setNodeImageFromLibrary, clearNodeImage, setImageAlt, setImageFocus, clearImageFocus, setBannerFromImage } =
    useProject();
  const { confirmDestructive, requestAssetPick } = useDialogs();
  const uploadPicture = useUploadPicture();
  const openImage = useOpenSingleImage();
  const { url: imageUrl, status: imageStatus } = useNodeImage(image);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [isDescribing, setIsDescribing] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startY: number; startFocus: number } | null>(null);
  const cancelDescribe = useRef(false);

  const isCropped = imageFocusY !== undefined;

  // A file dragged from the desktop onto the slot. It joins the library and is
  // then pointed at, which is the same two steps the picker takes — dropping a
  // picture here and choosing the same picture there must not produce two
  // different things on disk.
  async function acceptFile(file: File | undefined) {
    if (!file) return;
    try {
      const fileName = await uploadPicture(file);
      setError(null);
      setNodeImageFromLibrary(nodeId, fileName);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "That picture couldn't be added.");
    }
  }

  // The other way in, and now the one the buttons use: the library, with "add
  // from computer" inside it.
  async function pickImage() {
    const picked = await requestAssetPick("Choose a picture for this page");
    if (picked) setNodeImageFromLibrary(nodeId, picked);
  }

  // Entering reposition mode crops the slot even before the first drag, so
  // there's a frame to drag *within* — otherwise the handles move a picture
  // that isn't being clipped by anything and nothing appears to happen.
  function startRepositioning() {
    if (!isCropped) setImageFocus(nodeId, 50);
    setIsRepositioning(true);
  }

  // On the picture rather than on the frame around it, and that's the whole
  // fix for a bug worth not reintroducing: capturing the pointer on the frame
  // captured it for presses on the buttons *inside* the frame too, and a
  // captured pointer redirects the click that follows to the capturing element.
  // So "Show whole image" and "Done" were unreachable the entire time
  // repositioning was on — the only time they're shown.
  function handlePointerDown(e: PointerEvent<HTMLImageElement>) {
    if (!isRepositioning) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startY: e.clientY, startFocus: imageFocusY ?? 50 };
  }

  function handlePointerMove(e: PointerEvent<HTMLImageElement>) {
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
        onClick={imageUrl ? undefined : () => void pickImage()}
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
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={imageAlt ?? ""}
              className="property-image-preview"
              style={isCropped ? { objectPosition: `center ${imageFocusY}%` } : undefined}
              draggable={false}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
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
                  onClick={() => void pickImage()}
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
            <span>{imageStatus === "error" ? "Image file missing" : "Choose or drop a picture"}</span>
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
    </div>
  );
}
