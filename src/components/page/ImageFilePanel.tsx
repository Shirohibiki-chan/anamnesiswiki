// What opens when you click "Add image" on an empty image block (Phase 16).
//
// BlockNote's own panel is two tabs, Upload and Embed, and Embed is a box you
// paste a web address into — a picture the app would have to fetch off the
// internet every time it drew the page. That crosses the policy boundary in
// CLAUDE.md, and it's the wrong answer for someone writing a world offline
// besides, so the panel is replaced rather than configured: BlockNoteView gets
// `filePanel={false}` and this is rendered in its place.
//
// With Embed gone there's exactly one thing left to do here, so this isn't a
// tab strip at all — it's the button that does it. Dragging a file onto the
// block and pasting one both go through BlockNote's own handling and never
// reach this panel.
import { useRef, useState } from "react";
import { ImageUp } from "lucide-react";
import { useBlockNoteEditor, type FilePanelProps } from "@blocknote/react";
import { MAX_IMAGE_BYTES } from "../../constants/limits";

export function ImageFilePanel({ blockId }: FilePanelProps) {
  const editor = useBlockNoteEditor();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
    setIsUploading(true);
    try {
      // Mirrors what BlockNote's own upload tab does with the result — a
      // string is the file's reference and becomes the block's `url`, and the
      // file's name rides along so the block has something to call it.
      const uploaded = await editor.uploadFile?.(file, blockId);
      if (typeof uploaded === "string") {
        editor.updateBlock(blockId, { props: { name: file.name, url: uploaded } });
      } else if (uploaded) {
        editor.updateBlock(blockId, uploaded);
      }
    } catch {
      setError("That image couldn't be saved into your project.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="editor-file-panel">
      <button
        type="button"
        className="ui-btn ui-btn-secondary editor-file-panel-btn"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        <ImageUp size={14} />
        {isUploading ? "Adding…" : "Choose a picture"}
      </button>
      <p className="editor-file-panel-hint">or drag one straight onto the page</p>
      {error && <p className="editor-file-panel-error">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="editor-file-panel-input"
        onChange={(e) => {
          void acceptFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
