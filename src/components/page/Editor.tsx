// Real BlockNote editor wired to a tab's content. See docs/plan.md Phase 5.
// Rendered with `key={activeTab.id}` by PageView, so switching tabs remounts
// this component fresh (and re-reads `content` into initialContent) rather
// than needing an effect to reset the editor's state — same pattern as
// PageView's own remount-on-node-switch from Phase 4.
//
// Everything that isn't a BlockNote React component lives in
// hooks/use-editor.ts, per CLAUDE.md's rule that components never import
// services directly.
import {
  FormattingToolbar,
  FormattingToolbarController,
  SuggestionMenuController,
  getFormattingToolbarItems,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { useEditor, WIKILINK_TRIGGER } from "../../hooks/use-editor";
import { useEditorImageLightbox } from "../../hooks/use-lightbox";
import { SaveImageButton } from "./SaveImageButton";

type EditorProps = {
  nodeId: string;
  content: unknown[];
  onContentChange: (content: unknown[]) => void;
};

export function Editor({ nodeId, content, onContentChange }: EditorProps) {
  const { editor, onKeyDownCapture, handleChange, focusEnd, getSlashMenuItems, getMentionItems } = useEditor(
    nodeId,
    content,
    onContentChange,
  );
  // Clicking a picture opens it full size. The listener lives on this wrapper
  // rather than on anything BlockNote renders, so it covers every picture in
  // the tab without a custom image block — see hooks/use-lightbox.ts.
  const imageLightboxRef = useEditorImageLightbox();

  return (
    <div
      ref={imageLightboxRef}
      className="editor-shell-wrapper"
      onClick={(e) => {
        // BlockNote's own editable area shrink-wraps to its content, so a
        // click below the last line lands on this wrapper's own background
        // instead of anything BlockNote rendered — place the cursor at the
        // end of the document so it behaves like a normal text area.
        if (e.target !== e.currentTarget) return;
        focusEnd();
      }}
    >
      <BlockNoteView
        editor={editor}
        theme="dark"
        slashMenu={false}
        className="wiki-body editor-shell"
        onKeyDownCapture={onKeyDownCapture}
        // The default toolbar minus its Download button, which calls
        // `window.open` and so does nothing in a Tauri window. Swapped by key
        // rather than by listing every other item out, so anything BlockNote
        // adds to that strip in a future version arrives on its own.
        formattingToolbar={false}
        onChange={handleChange}
      >
        <FormattingToolbarController
          formattingToolbar={() => (
            <FormattingToolbar>
              {getFormattingToolbarItems().map((item) =>
                item.key === "fileDownloadButton" ? <SaveImageButton key="fileDownloadButton" /> : item,
              )}
            </FormattingToolbar>
          )}
        />
        <SuggestionMenuController triggerCharacter="/" getItems={getSlashMenuItems} />
        <SuggestionMenuController triggerCharacter="@" getItems={getMentionItems} />
        <SuggestionMenuController triggerCharacter={WIKILINK_TRIGGER} getItems={getMentionItems} />
      </BlockNoteView>
    </div>
  );
}
