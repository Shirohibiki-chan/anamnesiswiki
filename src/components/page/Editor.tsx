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
  FilePanelController,
  FormattingToolbar,
  FormattingToolbarController,
  SuggestionMenuController,
  getFormattingToolbarItems,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { Fragment, useCallback } from "react";
import { useAssetDropTarget, type InsertAt } from "../../hooks/use-asset-drop";
import { useEditor, WIKILINK_TRIGGER } from "../../hooks/use-editor";
import { useEditorImageLightbox } from "../../hooks/use-lightbox";
import { ExpandImageButton } from "./ExpandImageButton";
import { PageFilePanel } from "./PageFilePanel";
import { SaveImageButton } from "./SaveImageButton";

/**
 * The default toolbar minus its Download button, which calls `window.open` and
 * so does nothing in a Tauri window. Swapped by key rather than by listing every
 * other item out, so anything BlockNote adds to that strip in a future version
 * arrives on its own.
 *
 * **Declared here, at the module level, and that placement is the fix for a
 * bug rather than tidiness.** `FormattingToolbarController` renders whatever it
 * is given as a *component type*, so a function defined inside `Editor` is a
 * different type on every render — and React throws away a subtree whose type
 * changed and builds a new one. Every keystroke re-renders Editor (the page's
 * content goes to the store and comes back), so the whole toolbar was being
 * rebuilt from scratch as she typed.
 *
 * Nothing showed, because the toolbar looks the same rebuilt. What didn't
 * survive was any state inside it: the caption box is a popover held open by a
 * `useState` in BlockNote's own button, so it closed on the first character and
 * dropped focus back to the page. Same for the rename box beside it.
 */
function PageFormattingToolbar() {
  return (
    <FormattingToolbar>
      {getFormattingToolbarItems().map((item) =>
        item.key === "fileDownloadButton" ? (
          // Both of ours land where the Download button was, so they sit with
          // the rest of the picture controls rather than at the end of the
          // strip past the text ones.
          <Fragment key="fileDownloadButton">
            <ExpandImageButton />
            <SaveImageButton />
          </Fragment>
        ) : (
          item
        ),
      )}
    </FormattingToolbar>
  );
}

type EditorProps = {
  nodeId: string;
  content: unknown[];
  onContentChange: (content: unknown[]) => void;
};

export function Editor({ nodeId, content, onContentChange }: EditorProps) {
  const { editor, onKeyDownCapture, handleChange, focusEnd, getSlashMenuItems, getMentionItems, suggestionMenuFloating } =
    useEditor(nodeId, content, onContentChange);
  // Double-clicking a picture opens it full size; a single click still selects
  // it, which is what raises the toolbar. The listener lives on this wrapper
  // rather than on anything BlockNote renders, so it covers every picture in
  // the tab without a custom image block — see hooks/use-lightbox.ts.
  const imageLightboxRef = useEditorImageLightbox();

  // Dragged out of the sidebar's Assets tab. The picture is already in the
  // project, so this points at the file rather than uploading a second copy of
  // it — see hooks/use-asset-drop.ts. The same wrapper carries both listeners,
  // which is why the hook takes the lightbox's ref instead of making its own.
  const insertImage = useCallback(
    (url: string, at: InsertAt) => {
      const blocks = [{ type: "image" as const, props: { url } }];
      // Both of these read a block out of the document rather than being handed
      // an id, because a page with nothing in it has neither. It always has at
      // least one empty paragraph in practice, but "always in practice" is how
      // a drop onto a brand new page throws.
      if (at === "end") {
        const last = editor.document[editor.document.length - 1];
        if (last) editor.insertBlocks(blocks, last, "after");
        return;
      }
      // Dropped above the writing — on the title or the tab strip. The top of
      // the page is where that was aimed, not the bottom of it.
      if (at === "start") {
        const first = editor.document[0];
        if (first) editor.insertBlocks(blocks, first, "before");
        return;
      }
      editor.insertBlocks(blocks, at.blockId, "after");
    },
    [editor],
  );
  useAssetDropTarget(imageLightboxRef, insertImage);

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
        // Off, so PageFormattingToolbar above is the one on screen.
        formattingToolbar={false}
        // Off for the same reason: PageFilePanel below adds the library tab.
        filePanel={false}
        onChange={handleChange}
      >
        <FormattingToolbarController formattingToolbar={PageFormattingToolbar} />
        <FilePanelController filePanel={PageFilePanel} />
        {/* All three take the same floating options — see use-editor.ts. Without
            them a menu opened near the bottom of the window is positioned while
            it's still an empty loading strip and then grows off the screen. */}
        <SuggestionMenuController triggerCharacter="/" getItems={getSlashMenuItems} floatingUIOptions={suggestionMenuFloating} />
        <SuggestionMenuController triggerCharacter="@" getItems={getMentionItems} floatingUIOptions={suggestionMenuFloating} />
        <SuggestionMenuController
          triggerCharacter={WIKILINK_TRIGGER}
          getItems={getMentionItems}
          floatingUIOptions={suggestionMenuFloating}
        />
      </BlockNoteView>
    </div>
  );
}
