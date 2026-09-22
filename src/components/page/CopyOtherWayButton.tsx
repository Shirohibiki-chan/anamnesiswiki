// The button that copies a selection the way Ctrl+C is not set to (2026-09-22).
//
// Copying out of a page has two right answers and no way to guess which:
// Discord and a bot card want Markdown, a lorebook field and a plain text box
// want the words. The setting in Settings → Writing decides which one the
// keystroke does, and this is the other one, offered where the choice is
// actually made — over the selection, at the moment of copying, with the
// place it is going to in front of her.
//
// **Text only, on purpose.** Ctrl+C carries the formatting as well, so a rich
// target takes that and never sees the plain text at all. Asking for Markdown
// and then pasting into Word would silently give formatted text instead, so
// this puts one thing on the clipboard: what the button says.
import { useState } from "react";
import { Copy } from "lucide-react";
import { useBlockNoteEditor, useComponentsContext } from "@blocknote/react";
import { copyText } from "../../services/clipboard-service";
import { copiedText } from "../../services/editor-blocks/copy-clipboard";
import { usePlainCopy } from "../../hooks/use-preferences";

/** How long the button says it worked before going back to its name. See the code block's Copy. */
const SAID_FOR_MS = 1600;

export function CopyOtherWayButton() {
  const Components = useComponentsContext();
  const editor = useBlockNoteEditor();
  const plainCopy = usePlainCopy();
  const [said, setSaid] = useState<"copied" | "failed" | null>(null);

  if (!Components) return null;

  const view = editor.prosemirrorView;
  if (!view || view.state.selection.empty) return null;

  const other = plainCopy === "markdown" ? "text" : "markdown";
  const label = other === "markdown" ? "Copy as Markdown" : "Copy as Plain Text";
  const tooltip =
    other === "markdown"
      ? "Copy with Markdown marks — ** around bold, # before a heading. For Discord, or anywhere that reads Markdown."
      : "Copy the words with nothing added around them. For a lorebook field, a character card, or any plain box.";

  const say = (ok: boolean) => {
    setSaid(ok ? "copied" : "failed");
    setTimeout(() => setSaid(null), SAID_FOR_MS);
  };

  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      label={said === "copied" ? "Copied" : said === "failed" ? "Couldn't Copy" : label}
      mainTooltip={said ? "" : tooltip}
      icon={<Copy size={16} />}
      onClick={() => void copyText(copiedText(editor, editor.prosemirrorView, other)).then(say)}
    />
  );
}
