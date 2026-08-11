// Opens the selected picture full size, from the formatting toolbar. Phase 16.
//
// The lightbox's other way in is a double-click on the picture, which is the
// gesture but not a discoverable one — this is the part you can find by
// looking. It sits in the same strip as SaveImageButton and is built the same
// way, through BlockNote's components context so it inherits the toolbar's
// styling and tooltip rather than being a hand-made button among theirs.
//
// It works off the DOM rather than the block's `url` prop for the same reason
// services/page-images.ts does: the rendered element is where the resolved
// address and the file's original name both are. Selecting the picture is what
// puts the toolbar on screen, so the element being asked about is always the
// one showing.
import { Expand } from "lucide-react";
import { useBlockNoteEditor, useComponentsContext, useSelectedBlocks } from "@blocknote/react";
import { useOpenBlockImage } from "../../hooks/use-lightbox";

export function ExpandImageButton() {
  const Components = useComponentsContext();
  const editor = useBlockNoteEditor();
  const selectedBlocks = useSelectedBlocks(editor);
  const openBlockImage = useOpenBlockImage();

  if (!Components) return null;

  // Same guard as SaveImageButton: one block, and one with a picture on it.
  const block = selectedBlocks.length === 1 ? selectedBlocks[0] : undefined;
  const url = typeof block?.props?.url === "string" ? block.props.url : "";
  if (!url || !block) return null;

  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      label="Open full size"
      mainTooltip="Open full size (or double-click the picture)"
      icon={<Expand size={16} />}
      onClick={() => openBlockImage(editor.domElement, block.id)}
    />
  );
}
