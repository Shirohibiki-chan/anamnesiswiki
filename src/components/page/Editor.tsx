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
import { Fragment, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useAssetDropTarget, type InsertAt } from "../../hooks/use-asset-drop";
import {
  BlockRefRenderContext,
  ICON_MIN_QUERY,
  ICON_TRIGGER,
  IconPickContext,
  useEditor,
  WIKILINK_TRIGGER,
} from "../../hooks/use-editor";
import { useEditorImageLightbox } from "../../hooks/use-lightbox";
import { useFormattingBar } from "../../hooks/use-preferences";
import { EditorIconPicker } from "../blocks/EditorIconPicker";
import { Infobox } from "../blocks/Infobox";
import { PageBlock } from "../blocks/PageBlock";
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

/**
 * The two components that draw the page's own blocks inside the editor.
 *
 * **A module constant, and every part of that matters.** Both are rendered as
 * component *types* and React discards a subtree whose type changed, so a
 * component built during a render would reset every field in every block on
 * each keystroke — the bug the formatting toolbar had, one level down. The
 * object holding them has to be a constant for the same reason a rung up: one
 * built in `Editor` would be a new context value every keystroke, and every
 * block on the page would re-render for it.
 */
const PAGE_BLOCK_RENDERERS = { Block: PageBlock, Infobox };

type EditorProps = {
  nodeId: string;
  content: unknown[];
  onContentChange: (content: unknown[]) => void;
};

export function Editor({ nodeId, content, onContentChange }: EditorProps) {
  const {
    editor,
    onKeyDownCapture,
    handleChange,
    focusEnd,
    getSlashMenuItems,
    getIconItems,
    getMentionItems,
    slashShouldOpen,
    iconShouldOpen,
    iconTrigger,
    closeIconTrigger,
    insertIconAtTrigger,
    suggestionMenuFloating,
  } = useEditor(nodeId, content, onContentChange);
  // Double-clicking a picture opens it full size; a single click still selects
  // it, which is what raises the toolbar. The listener lives on this wrapper
  // rather than on anything BlockNote renders, so it covers every picture in
  // the tab without a custom image block — see hooks/use-lightbox.ts.
  const imageLightboxRef = useEditorImageLightbox();
  const formattingBar = useFormattingBar();
  // **Where the fixed bar's DOM goes, kept as state rather than a ref** so the
  // portal below re-renders once the node exists — a ref alone is null on the
  // first pass and nothing would ever mount into it.
  const [fixedBarSlot, setFixedBarSlot] = useState<HTMLDivElement | null>(null);

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
    // **What draws the blocks sitting in the writing, handed down rather than
    // imported by the blocks themselves.** The BlockNote specs live in
    // services/editor-blocks/ and CLAUDE.md's imports only flow downward, so
    // they cannot reach a component — the component layer fills the slot
    // instead. See PAGE_BLOCK_RENDERERS below for why that value is a module
    // constant.
    <BlockRefRenderContext.Provider value={PAGE_BLOCK_RENDERERS}>
    <IconPickContext.Provider value={EditorIconPicker}>
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
      {/* The slot the fixed bar portals into, above the writing rather than
          after it. Rendered only in that mode so the floating one is not
          sitting on an empty strip of page. */}
      {formattingBar === "fixed" && <div ref={setFixedBarSlot} className="editor-toolbar-fixed" />}
      <BlockNoteView
        editor={editor}
        theme="dark"
        slashMenu={false}
        // Off because our `:` menu replaces it and two menus cannot share one
        // trigger — ours drew while theirs answered the Enter. See
        // icon-menu-items.tsx, which offers BlockNote's own emoji list so
        // nothing is lost by turning this off.
        emojiPicker={false}
        className="wiki-body editor-shell"
        onKeyDownCapture={onKeyDownCapture}
        // Off, so PageFormattingToolbar above is the one on screen.
        formattingToolbar={false}
        // Off for the same reason: PageFilePanel below adds the library tab.
        filePanel={false}
        onChange={handleChange}
      >
        {/* **Kept on screen, or brought up by a selection — her call, 2026-08-28.**
            The floating one is the default and the right answer while writing
            prose; a bar that is always there is the right answer while
            *formatting*, because one that appears and disappears cannot be
            looked at to find out what a button does, and it moves under the
            pointer as you reach for it.

            **Portalled, and it has to be.** Anything rendered as a child of
            `BlockNoteView` lands *after* the editor element in the DOM — the
            first cut put the bar below a page's worth of writing, off the
            bottom of the window, where it was present and correct and invisible.
            A portal moves the DOM up above the editor while leaving the
            component inside BlockNote's React tree, which is where it has to
            stay: every button in it reads the editor out of context. */}
        {formattingBar === "fixed"
          ? fixedBarSlot && createPortal(<PageFormattingToolbar />, fixedBarSlot)
          : <FormattingToolbarController formattingToolbar={PageFormattingToolbar} />}
        <FilePanelController filePanel={PageFilePanel} />
        {/* All three take the same floating options — see use-editor.ts. Without
            them a menu opened near the bottom of the window is positioned while
            it's still an empty loading strip and then grows off the screen. */}
        {/* `shouldOpen` is the editor's own hook for this, so a slash in the
            middle of a sentence stays a slash — see slash-trigger.ts. The `@`
            and `[[` menus below keep opening wherever they are typed: those
            characters mean nothing else in prose, and a `[[` mid-sentence is
            exactly how a link gets written. */}
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={getSlashMenuItems}
          shouldOpen={slashShouldOpen}
          floatingUIOptions={suggestionMenuFloating}
        />
        {/* The type-ahead half of the icon work: `:sm` and take it with Enter
            or Tab, the way every chat app does it. `minQueryLength` is what
            keeps a bare colon from opening anything — punctuation far more
            often than a request — and `shouldOpen` keeps `Note:` and `10:30`
            shut on top of that. The picker is the other half, on Ctrl+`:`. */}
        <SuggestionMenuController
          triggerCharacter={ICON_TRIGGER}
          getItems={getIconItems}
          shouldOpen={iconShouldOpen}
          minQueryLength={ICON_MIN_QUERY}
          floatingUIOptions={suggestionMenuFloating}
        />
        <SuggestionMenuController triggerCharacter="@" getItems={getMentionItems} floatingUIOptions={suggestionMenuFloating} />
        <SuggestionMenuController
          triggerCharacter={WIKILINK_TRIGGER}
          getItems={getMentionItems}
          floatingUIOptions={suggestionMenuFloating}
        />
      </BlockNoteView>
      {/* **Ctrl+`:` opens the picker, and it is the browsing half of a pair.**
          A type-ahead can only be searched by typing, so there is no way to
          reach an icon whose name you do not know — which is most of fifteen
          hundred of them. This is the same control the page title and a meter
          open: a search box over the whole catalogue, both tabs, and a grid to
          scroll. See hooks/use-editor.ts for the key. */}
      {iconTrigger && (
        <EditorIconPicker
          anchorRect={iconTrigger}
          value={undefined}
          onPick={insertIconAtTrigger}
          onClose={closeIconTrigger}
        />
      )}
    </div>
    </IconPickContext.Provider>
    </BlockRefRenderContext.Provider>
  );
}
