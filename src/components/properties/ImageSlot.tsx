// Drag-drop / click-to-browse image upload at the top of the properties
// panel. See docs/plan.md Phase 6. Native OS drag-drop is handled as plain
// HTML5 DnD here (tauri.conf.json sets dragDropEnabled: false precisely so
// the webview doesn't intercept it — the same setting the tree's own
// drag-reparenting relies on), so a dropped OS file arrives as a normal
// browser File with real bytes, no Tauri-specific drag API needed.
import { useRef, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { MAX_IMAGE_BYTES } from "../../constants/limits";
import { useNodeImage } from "../../hooks/use-node-image";
import { useProject } from "../../hooks/use-project";

type ImageSlotProps = {
  nodeId: string;
  image?: string;
};

function extensionFor(file: File): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(file.name);
  if (match) return match[1].toLowerCase();
  return file.type.split("/")[1] ?? "png";
}

export function ImageSlot({ nodeId, image }: ImageSlotProps) {
  const { setNodeImage, clearNodeImage } = useProject();
  const { url: imageUrl, status: imageStatus } = useNodeImage(image);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    await setNodeImage(nodeId, data, extensionFor(file));
  }

  return (
    <div className="property-field">
      <div className="property-field-label">Image</div>
      <div
        className={`property-image-slot${imageUrl ? " property-image-slot-filled" : ""}${isDragOver ? " property-image-slot-drag-over" : ""}`}
        onClick={() => inputRef.current?.click()}
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
            <img src={imageUrl} alt="" className="property-image-preview" />
            <button
              type="button"
              className="property-image-remove"
              aria-label="Remove image"
              onClick={(e) => {
                e.stopPropagation();
                void clearNodeImage(nodeId);
              }}
            >
              <X size={12} />
            </button>
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
