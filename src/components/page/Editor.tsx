// Real BlockNote editor wired to a tab's content. See docs/plan.md Phase 5.
// Rendered with `key={activeTab.id}` by PageView, so switching tabs remounts
// this component fresh (and re-reads `content` into initialContent) rather
// than needing an effect to reset the editor's state — same pattern as
// PageView's own remount-on-node-switch from Phase 4.
import { filterSuggestionItems } from "@blocknote/core";
import { getDefaultReactSlashMenuItems, SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { useProject } from "../../hooks/use-project";
import { editorSchema } from "../../services/editor-blocks/editor-schema";
import { getCalloutSlashMenuItems } from "../../services/editor-blocks/callout-slash-menu";
import { getMentionMenuItems } from "../../services/editor-blocks/mention-menu-items";
import { resolveWikilinks } from "../../services/editor-blocks/wikilink";
import { useWikilinkBracketConfirm, WIKILINK_TRIGGER } from "../../services/editor-blocks/wikilink-bracket-confirm";
import { useWikilinkResume } from "../../services/editor-blocks/wikilink-resume";

type EditorProps = {
  nodeId: string;
  content: unknown[];
  onContentChange: (content: unknown[]) => void;
};

export function Editor({ nodeId, content, onContentChange }: EditorProps) {
  const { nodes } = useProject();

  const editor = useCreateBlockNote({
    schema: editorSchema,
    initialContent: content.length > 0 ? (content as never) : undefined,
  });

  const onWikilinkKeyDownCapture = useWikilinkBracketConfirm(editor, nodes, nodeId);
  useWikilinkResume(editor);

  return (
    <div
      className="editor-shell-wrapper"
      onClick={(e) => {
        // BlockNote's own editable area shrink-wraps to its content, so a
        // click below the last line lands on this wrapper's own background
        // instead of anything BlockNote rendered — place the cursor at the
        // end of the document so it behaves like a normal text area.
        if (e.target !== e.currentTarget) return;
        const blocks = editor.document;
        const lastBlock = blocks[blocks.length - 1];
        if (lastBlock) editor.setTextCursorPosition(lastBlock.id, "end");
        editor.focus();
      }}
    >
      <BlockNoteView
        editor={editor}
        theme="dark"
        slashMenu={false}
        className="wiki-body editor-shell"
        onKeyDownCapture={onWikilinkKeyDownCapture}
        onChange={() => {
          resolveWikilinks(editor, nodes);
          onContentChange(editor.document as unknown[]);
        }}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems([...getDefaultReactSlashMenuItems(editor), ...getCalloutSlashMenuItems(editor)], query)
          }
        />
        <SuggestionMenuController
          triggerCharacter="@"
          getItems={async (query) => filterSuggestionItems(getMentionMenuItems(editor, nodes, nodeId), query)}
        />
        <SuggestionMenuController
          triggerCharacter={WIKILINK_TRIGGER}
          getItems={async (query) => filterSuggestionItems(getMentionMenuItems(editor, nodes, nodeId), query)}
        />
      </BlockNoteView>
    </div>
  );
}
