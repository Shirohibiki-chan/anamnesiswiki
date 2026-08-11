// Replaces BlockNote's Download button in the formatting toolbar for a picture
// in a page (Phase 16).
//
// Theirs is `resolveFileUrl(url).then(window.open)`. In a Tauri window that
// does nothing — new windows aren't opened — and even where it works, opening
// a `blob:` in a tab is not a download. A desktop app saves through the OS's
// save dialog, which is what `useSaveImageCopy` does.
//
// Rendered through BlockNote's own components context rather than as a plain
// `<button>`, so it inherits the toolbar's styling, tooltip and keyboard
// behaviour from `@blocknote/shadcn` instead of being the one control in that
// strip that looks hand-made.
import { Download } from "lucide-react";
import { useBlockNoteEditor, useComponentsContext, useSelectedBlocks } from "@blocknote/react";
import { isLocalImage, useSaveImageCopy } from "../../hooks/use-node-image";

export function SaveImageButton() {
  const Components = useComponentsContext();
  const editor = useBlockNoteEditor();
  const selectedBlocks = useSelectedBlocks(editor);
  const saveCopy = useSaveImageCopy();

  if (!Components) return null;

  // Exactly one block, and one that actually has a file on it. A multi-block
  // selection has no single picture to save, and an empty image block has
  // nothing behind it yet.
  const block = selectedBlocks.length === 1 ? selectedBlocks[0] : undefined;
  const url = typeof block?.props?.url === "string" ? block.props.url : "";
  if (!url) return null;

  const name = typeof block?.props?.name === "string" ? block.props.name : undefined;
  // An embedded picture can only be opened, not copied — there are no bytes on
  // this machine to copy. Saying so on the button is the difference between a
  // feature and a button that does something unexpected.
  const isLocal = isLocalImage(url);

  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      label={isLocal ? "Save a copy" : "Open in browser"}
      mainTooltip={isLocal ? "Save a copy" : "Open in browser — this picture lives on a website"}
      icon={<Download size={16} />}
      onClick={() => void saveCopy(url, name)}
    />
  );
}
