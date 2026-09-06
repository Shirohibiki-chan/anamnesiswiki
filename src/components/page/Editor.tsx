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
  AddBlockButton,
  BlockColorsItem,
  DragHandleButton,
  RemoveBlockItem,
  FilePanelController,
  FormattingToolbar,
  FormattingToolbarController,
  SideMenu,
  SideMenuController,
  SuggestionMenuController,
  TableColumnHeaderItem,
  TableRowHeaderItem,
  getFormattingToolbarItems,
  useBlockNoteEditor,
  useEditorSelectionChange,
  type SideMenuProps,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { PageSlashMenu } from "./PageSlashMenu";
import "@blocknote/shadcn/style.css";
import { Fragment, isValidElement, useCallback, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { selectionHoldsNoText } from "../../services/column-service";
import { useAssetDropTarget, type InsertAt } from "../../hooks/use-asset-drop";
import {
  BlockAnchorContext,
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
import { BlockAnchorArrival, BlockAnchorMenuItem } from "./BlockAnchor";
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
/**
 * Whether what is selected right now has any writing in it.
 *
 * Wrapped in a `try` because a selection the editor cannot describe — mid-drag,
 * mid-teardown — is not a reason to take the bar away.
 */
function holdsNoText(editor: { getSelection: () => { blocks: { type: string }[] } | undefined; getTextCursorPosition: () => { block: { type: string } } }): boolean {
  try {
    return selectionHoldsNoText(editor.getSelection()?.blocks ?? [editor.getTextCursorPosition().block]);
  } catch {
    return false;
  }
}

/**
 * Which group of the formatting bar a button belongs to.
 *
 * **Matched on the item's key rather than its position, because the strip is not
 * a fixed list.** Each button hides itself when it does not apply, so a picture
 * and a paragraph produce different rows — anything counting positions is right
 * for one selection and wrong for the next. An unrecognised key falls in with
 * whatever came before it, which is the safe way for a library that may add
 * buttons: a new one joins a group rather than inventing a stray divider.
 */
function toolbarGroup(key: string): string {
  if (key === "blockTypeSelect") return "type";
  if (key.startsWith("textAlign")) return "align";
  if (key.endsWith("StyleButton")) return key === "colorStyleButton" ? "colour" : "marks";
  if (key.endsWith("BlockButton")) return "indent";
  if (key === "createLinkButton") return "link";
  return "file";
}

/**
 * The same items, wrapped one group to a box.
 *
 * **Boxes rather than separator elements between items, and the difference is
 * the whole reason this works.** A hidden button is still an entry in the array
 * — it renders `null` — so inserting a divider whenever the group changes draws
 * dividers around buttons that are not on screen. That shipped for about ten
 * minutes and looked exactly like it sounds: two rules stacked at the left of
 * the bar and one trailing off the right, because the block-type select and the
 * alignment buttons were absent for that selection.
 *
 * A wrapper cannot lie about it. A group whose buttons all rendered `null` is
 * an empty element, `:empty` takes it out of the layout, and the rule between
 * groups is a left border on any group with another *non-empty* one before it
 * — which is a question CSS can answer and a count cannot. See page.css.
 */
function groupToolbarItems(items: ReactNode[]): ReactNode[] {
  const groups: { name: string; items: ReactNode[] }[] = [];
  for (const item of items) {
    const key = isValidElement(item) && item.key !== null ? String(item.key).replace(/^\.\$/, "") : "";
    const name = toolbarGroup(key);
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push(item);
    else groups.push({ name, items: [item] });
  }
  return groups.map((group) => (
    <div key={group.name} className="editor-toolbar-group">
      {group.items}
    </div>
  ));
}

function PageFormattingToolbar() {
  const editor = useBlockNoteEditor();
  // **Seeded, not just watched.** The hook below only fires when the selection
  // *changes*, so a bar mounting while a row is already selected — which is
  // exactly the state she was sitting in — would stay empty until she clicked
  // somewhere else.
  const [nothingToSay, setNothingToSay] = useState(() => holdsNoText(editor));

  // **A bar with every button hidden is worse than no bar.** Each item in that
  // strip hides itself when it does not apply, so selecting a row of columns —
  // or any of our blocks that hold no writing of their own — left an empty
  // ten-pixel box with a border and a shadow sitting above the page. Reported
  // as "the text editor bar", and read out of her running app to be sure: zero
  // children, 10px tall, one node selected, that node the row.
  useEditorSelectionChange(() => setNothingToSay(holdsNoText(editor)), editor);

  // **It says so rather than going away.** The first cut returned nothing here,
  // which is wrong for the bar she actually uses: hers is set to stay at the
  // top of the page, so a bar that disappears whenever a row of columns is
  // selected is a bar that keeps leaving — worse than the empty strip it
  // replaced. It keeps its place and explains itself instead.
  if (nothingToSay) {
    return (
      <FormattingToolbar>
        <span className="formatting-bar-hint">Select some writing to format it</span>
      </FormattingToolbar>
    );
  }

  return (
    <FormattingToolbar>
      {groupToolbarItems(
        getFormattingToolbarItems().map((item) =>
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

/**
 * The controls beside a block on hover, and what its own menu holds.
 *
 * **The row itself is BlockNote's two, unchanged, and that is deliberate** —
 * the gutter is 54px and fits exactly two. See BlockAnchorMenuItem, which was
 * built as a third one first and had to move in here.
 *
 * **Passing children to the handle means listing the menu's own items**, since
 * BlockNote draws its defaults only when it is given none. The four below are
 * those defaults, in its order, with its words; anything it adds to that menu
 * in a future version will have to be added here too.
 *
 * **Module-level for the reason everything else here is** — this is handed to
 * `SideMenuController` as a component type, and a type that changes identity on
 * every keystroke has its subtree thrown away and rebuilt.
 */
function PageSideMenu(props: SideMenuProps) {
  return (
    <SideMenu {...props}>
      <AddBlockButton />
      <DragHandleButton {...props}>
        <BlockAnchorMenuItem />
        <RemoveBlockItem>Delete</RemoveBlockItem>
        <BlockColorsItem>Colors</BlockColorsItem>
        <TableRowHeaderItem>Header row</TableRowHeaderItem>
        <TableColumnHeaderItem>Header column</TableColumnHeaderItem>
      </DragHandleButton>
    </SideMenu>
  );
}

type EditorProps = {
  nodeId: string;
  /**
   * Which of the page's tabs this is showing.
   *
   * Only used to tell the page's *other* tabs apart from this one — a block
   * pointer that also appears in another tab is a duplicate, and the editor
   * holds one document. See `applyPointerClones`.
   */
  tabId: string;
  content: unknown[];
  onContentChange: (content: unknown[]) => void;
};

export function Editor({ nodeId, tabId, content, onContentChange }: EditorProps) {
  const {
    editor,
    onKeyDownCapture,
    onPasteCapture,
    revealBlockId,
    anchorArrived,
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
  } = useEditor(nodeId, tabId, content, onContentChange);
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
  // The block whose link was copied a moment ago, which is marked to say so —
  // see BlockAnchor.tsx. Held here rather than in the item, which is inside a
  // menu that shuts on the click.
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);
  const forgetCopied = useCallback(() => setCopiedBlockId(null), []);
  const anchorSlot = useMemo(() => ({ nodeId, onCopied: setCopiedBlockId }), [nodeId]);

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
    {/* What a block's "Copy link to this block" needs: the page it writes into
        the link, and somewhere to say the copy happened. */}
    <BlockAnchorContext.Provider value={anchorSlot}>
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
        // A block link off the clipboard becomes a chip rather than a line of
        // scheme text. On the way down, before BlockNote's own handling — see
        // use-editor.ts.
        onPasteCapture={onPasteCapture}
        // Off, so PageFormattingToolbar above is the one on screen.
        formattingToolbar={false}
        // Off for the same reason: PageFilePanel below adds the library tab.
        filePanel={false}
        // Off so PageSideMenu above is what draws that row — the same two
        // buttons, with "Copy link to this block" added to the handle's menu.
        sideMenu={false}
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
        <SideMenuController sideMenu={PageSideMenu} />
        {/* Marks the block a link has just been followed to. Null the rest of
            the time, which is all but a second or two of the app's life. */}
        <BlockAnchorArrival
          blockId={revealBlockId ?? copiedBlockId}
          // Only a link arriving moves the page. A copy marks the block she is
          // already looking at, and scrolling it to the middle of the window
          // under her pointer would read as the page jumping for no reason.
          scroll={revealBlockId !== null}
          onArrived={revealBlockId ? anchorArrived : forgetCopied}
        />
        {/* All three take the same floating options — see use-editor.ts. Without
            them a menu opened near the bottom of the window is positioned while
            it's still an empty loading strip and then grows off the screen. */}
        {/* `shouldOpen` is the editor's own hook for this, so a slash in the
            middle of a sentence stays a slash — see slash-trigger.ts. The `@`
            and `[[` menus below keep opening wherever they are typed: those
            characters mean nothing else in prose, and a `[[` mid-sentence is
            exactly how a link gets written. */}
        {/* Drawn by us rather than by BlockNote — its own menu left the
            previous query's group headings in the DOM, which is what a
            screenshot of `/colum` under four headings turned out to be. See
            PageSlashMenu.tsx. */}
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={getSlashMenuItems}
          shouldOpen={slashShouldOpen}
          floatingUIOptions={suggestionMenuFloating}
          suggestionMenuComponent={PageSlashMenu}
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
    </BlockAnchorContext.Provider>
    </IconPickContext.Provider>
    </BlockRefRenderContext.Provider>
  );
}
