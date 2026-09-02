// The only import path components have into services/editor-blocks/. See
// CLAUDE.md's layer order — components never import services directly.
// page/Editor.tsx used to reach into six of those modules itself; everything
// that isn't a BlockNote React component now goes through here, leaving that
// component to do nothing but render.
import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { filterSuggestionItems } from "@blocknote/core";
import { getDefaultReactSlashMenuItems, useCreateBlockNote } from "@blocknote/react";
import type { DefaultReactSuggestionItem, FloatingUIOptions } from "@blocknote/react";
import { MAX_IMAGE_BYTES } from "../constants/limits";
import { isGlyph } from "../constants/glyphs";
import { ICON_INLINE_TYPE } from "../constants/schema";
import { extensionFor, resolveAssetUrl } from "../services/asset-urls";
import { withoutDanglingBlockRefs } from "../services/block-service";
import { BlockRefRenderContext } from "../services/editor-blocks/block-ref-context";
import { editorSchema } from "../services/editor-blocks/editor-schema";
import { getCalloutSlashMenuItems, withoutBuiltInQuote } from "../services/editor-blocks/callout-slash-menu";
import { IconPickContext } from "../services/editor-blocks/icon-pick-context";
import { getIconSlashMenuItems } from "../services/editor-blocks/icon-slash-menu";
import { getIconMenuItems } from "../services/editor-blocks/icon-menu-items";
import { ICON_MIN_QUERY, ICON_TRIGGER, iconMenuOpens, isIconPickerChord } from "../services/editor-blocks/icon-trigger";
import { handleImageKeys } from "../services/editor-blocks/image-keys";
import { getMentionMenuItems } from "../services/editor-blocks/mention-menu-items";
import { getNewPageSlashMenuItems } from "../services/editor-blocks/new-page-slash-menu";
import { getPageBlockSlashMenuItems } from "../services/editor-blocks/page-block-slash-menu";
import { slashOpensCommandMenu } from "../services/editor-blocks/slash-trigger";
import { handleSuggestionListKeys } from "../services/editor-blocks/suggestion-list-keys";
import { linkWikilink, resolveWikilinks, unknownWikilinkAt } from "../services/editor-blocks/wikilink";
import { useWikilinkBracketConfirm, WIKILINK_TRIGGER } from "../services/editor-blocks/wikilink-bracket-confirm";
import {
  UNCLOSED_WIKILINK,
  UNFINISHED_SLASH,
  useSuggestionResume,
} from "../services/editor-blocks/suggestion-resume";
import { useDialogs } from "./use-dialogs";
import { useProject } from "./use-project";

export { WIKILINK_TRIGGER, ICON_TRIGGER, ICON_MIN_QUERY };
// Re-exported rather than imported straight from the service, for the same
// reason everything else here is: this file is the only door components have
// into services/editor-blocks/. Editor.tsx fills the slot with the component
// that actually draws a block — see PageBlock.tsx.
export { BlockRefRenderContext };
// The other slot the component layer fills: the icon picker a callout and an
// inline icon open. Same door, same reason — see EditorIconPicker.tsx.
export { IconPickContext };

export function useEditor(nodeId: string, content: unknown[], onContentChange: (content: unknown[]) => void) {
  // The full-store subscription is deliberate here: the mention menu and
  // wikilink resolution both need to see every node in the project, and this
  // component is already re-rendering as the user types regardless.
  const { nodes, rootPath, uploadAsset, addBlock } = useProject();
  const { requestNewPageLink } = useDialogs();
  /**
   * Where the icon picker is open, or null.
   *
   * **A rectangle rather than a boolean**, because the popover is anchored to
   * the caret and the caret has moved on by the time anything renders.
   */
  const [iconTrigger, setIconTrigger] = useState<DOMRect | null>(null);

  /**
   * The saved document with pointers to deleted blocks taken out (Phase 19.5).
   *
   * **Read once, at the only moment that is guaranteed to happen.** The editor
   * is built fresh for every page and every tab, so this runs exactly when a
   * document is opened and never while she types. Nothing is written here; the
   * swept version reaches disk on her next keystroke like any other edit.
   *
   * **Skipped outright on a page from before Phase 18a**, which has no block
   * list at all. `blocksFor` would derive one with fresh ids, and sweeping
   * against ids invented a moment ago would delete every pointer in the
   * document. Such a page cannot have one — the feature did not exist — so the
   * safe answer and the correct one are the same.
   */
  const openedContent = nodes[nodeId]?.blocks
    ? withoutDanglingBlockRefs(content, new Set(nodes[nodeId].blocks.map((block) => block.id)))
    : content;

  const editor = useCreateBlockNote({
    schema: editorSchema,
    initialContent: openedContent.length > 0 ? (openedContent as never) : undefined,
    // Phase 16. These two are what make a picture inside a page possible at
    // all: BlockNote's image block holds a single string, so `uploadFile`
    // decides what gets written there and `resolveFileUrl` turns it back into
    // something the webview can paint.
    //
    // Providing `uploadFile` is also what makes BlockNote render the Upload
    // tab beside its embed-from-URL one — its default panel builds the tab
    // list as `uploadFile === undefined ? [] : [upload]` plus embed, which is
    // why that block used to offer a URL box and nothing else.
    //
    // These are read once, when the editor is created. That's fine for
    // `rootPath` — the editor is remounted per page, and a project change
    // remounts the whole app shell — but it does mean neither can be swapped
    // for a stale-capture-sensitive value later.
    //
    // The limits live here rather than in a panel because a picture arrives
    // three ways — picked, dragged onto the page, pasted — and BlockNote
    // routes all three through this one function. A check in the panel would
    // have covered the least common of the three. Throwing is the documented
    // way to refuse: BlockNote catches it and shows its own upload-failed text
    // in the panel.
    uploadFile: async (file: File) => {
      if (!file.type.startsWith("image/")) throw new Error("That's not an image file.");
      if (file.size > MAX_IMAGE_BYTES) throw new Error("That image is too large (10MB max).");
      const bytes = new Uint8Array(await file.arrayBuffer());
      return uploadAsset(bytes, extensionFor(file));
    },
    resolveFileUrl: (url: string) => resolveAssetUrl(rootPath, url),
  });

  /**
   * Names she has already been asked about and said no to.
   *
   * **Without it the offer below is a loop.** Declining leaves the `[[Name]]`
   * exactly where it was — which is the point, it is her text — and the very
   * next keystroke would find it again and ask again. A name goes in here the
   * moment it is asked about rather than when it is declined, so a dialog that
   * is already open cannot be opened a second time behind itself.
   *
   * A ref rather than state: nothing on screen depends on it, and re-rendering
   * the editor mid-keystroke to record a question is a cost for nothing.
   */
  const asked = useRef(new Set<string>());

  /**
   * Makes a page and drops a link to it where the cursor is (Phase 19.5).
   *
   * `name` is what to put in the box before she sees it — empty from the `/`
   * menu, and the name she already typed when a `[[Name]]` found nothing.
   */
  async function insertNewPageLink(name: string) {
    const link = await requestNewPageLink({ name, parentId: nodeId });
    // **Focus comes back either way, and the cancel is the case that needs
    // saying.** The dialog is a portal and it takes the keyboard; closing it
    // without putting the caret back leaves her mid-sentence with nowhere for
    // the next letter to go, and nothing on screen explaining why typing has
    // stopped working.
    editor.focus();
    if (!link) return;
    editor.insertInlineContent([
      {
        type: "mention",
        // `label` is the name as it stands now, which is what a chip falls back
        // to if the page is ever deleted; `text` is only written when she asked
        // for different wording, because an always-written one would stop every
        // chip in the world following renames. See mention-inline-content.
        props: { nodeId: link.nodeId, label: link.name, text: link.linkText },
      },
      " ",
    ]);
  }

  /**
   * Offers to make the page when she writes `[[Something]]` and nothing in
   * the project answers to it.
   *
   * **Nothing is taken out of the document to ask.** The brackets stay put
   * while the dialog is open and are swapped for a chip only if a page actually
   * gets made, so backing out costs her nothing and leaves her mid-sentence
   * where she was. An earlier cut wiped the text first and put it back on
   * cancel, which is the same thing with a way to go wrong.
   */
  async function offerMissingPage() {
    const name = unknownWikilinkAt(editor, nodes);
    if (!name || asked.current.has(name.toLowerCase())) return;
    asked.current.add(name.toLowerCase());

    const link = await requestNewPageLink({ name, parentId: nodeId });
    editor.focus();
    if (!link) return;
    // Written here rather than left to `resolveWikilinks` on the next
    // keystroke: that one names the chip after the page, and the whole point of
    // the link-text box is that she can call it something else.
    asked.current.delete(name.toLowerCase());
    linkWikilink(editor, name, link.nodeId, link.name, link.linkText || undefined);
  }

  const confirmWikilinkBracket = useWikilinkBracketConfirm(editor, nodes, nodeId);
  // Both menus reopen when the cursor lands back in a trigger that was started
  // and left. The `/` half was reported from use: clicking onto a row with a
  // slash at the front did nothing, and the only way on was to delete it and
  // type it again.
  useSuggestionResume(editor, WIKILINK_TRIGGER, UNCLOSED_WIKILINK);
  useSuggestionResume(editor, "/", UNFINISHED_SLASH);

  // One capture handler for the editor, because a React element takes one
  // `onKeyDownCapture`. Suggestion-list movement goes first and reports
  // whether it claimed the key: it only ever does while a menu is open, and a
  // key it claimed is one the bracket confirm shouldn't also see.
  //
  // The picture keys go second for the same reason: `-` and `0` are ordinary
  // characters in a suggestion query, and a menu being open means she's typing
  // rather than acting on a selected picture. They only fire when ProseMirror
  // reports a picture as *the* selection, which typing can't produce.
  function onKeyDownCapture(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (handleSuggestionListKeys(event)) return;
    if (handleImageKeys(editor, event)) return;
    // **Ctrl and the same key opens the picker instead of the menu.** Two
    // controls on one key, which is the arrangement she settled on: the bare
    // colon is the type-ahead for when you know the name, and this is the
    // catalogue for when you do not. Prevented, so the colon it is typed with
    // never reaches the writing *or* the picker's search box — the box has to
    // start empty or the first thing she types is filtering against
    // punctuation.
    if (isIconPickerChord(event)) {
      event.preventDefault();
      event.stopPropagation();
      openIconPicker();
      return;
    }
    confirmWikilinkBracket(event);
  }

  /**
   * Opens the picker where the caret is.
   *
   * **Read off the DOM selection rather than the document**, because this runs
   * on the keystroke: the caret's rectangle is what the popover anchors to, and
   * the selection is the one thing that has it at this moment.
   */
  function openIconPicker() {
    const selection = globalThis.getSelection();
    if (!selection?.isCollapsed || !selection.anchorNode || selection.rangeCount === 0) return;
    const node = selection.anchorNode;
    const caret = selection.getRangeAt(0).getBoundingClientRect();
    // **A collapsed range in an empty block measures as nothing**, which is
    // most of the time somebody wants this: a fresh line, or the start of one.
    // Measured 2026-09-01 — an earlier cut treated a zero-height rectangle as
    // "no position" and quietly declined to open, so the picker worked
    // everywhere except the most ordinary place to type.
    const line =
      node.nodeType === globalThis.Node.TEXT_NODE ? node.parentElement : (node as globalThis.Element);
    const rect = caret.height > 0 ? caret : (line?.getBoundingClientRect() ?? caret);
    if (rect.height === 0 && rect.top === 0) return;
    setIconTrigger(rect);
  }

  function closeIconTrigger() {
    setIconTrigger(null);
    // The picker is a portal and it took the keyboard; handing focus back is
    // what stops her being left mid-sentence with nowhere for the next letter
    // to go. Same reasoning as the New page dialog above.
    editor.focus();
  }

  /** Puts the icon she chose in the picker where the caret was. */
  function insertIconAtTrigger(icon: string | undefined) {
    setIconTrigger(null);
    editor.focus();
    if (!icon) return;
    // **A glyph becomes an object and an emoji stays a character**, the same
    // split the `:` menu makes: an emoji is a letter that copies and exports as
    // itself, and a glyph has no character to be, so it has to carry its name.
    if (isGlyph(icon)) {
      editor.insertInlineContent([{ type: ICON_INLINE_TYPE, props: { icon } }, " "]);
      return;
    }
    editor.insertInlineContent([icon, " "]);
  }

  function handleChange() {
    resolveWikilinks(editor, nodes);
    void offerMissingPage();
    onContentChange(editor.document as unknown[]);
  }

  // Placing the cursor at the end of the document, for a click that lands on
  // the padding below the last line rather than on anything BlockNote drew.
  function focusEnd() {
    const lastBlock = editor.document[editor.document.length - 1];
    if (lastBlock) editor.setTextCursorPosition(lastBlock.id, "end");
    editor.focus();
  }

  async function getSlashMenuItems(query: string): Promise<DefaultReactSuggestionItem[]> {
    return filterSuggestionItems(
      [
        ...withoutBuiltInQuote(getDefaultReactSlashMenuItems(editor)),
        ...getCalloutSlashMenuItems(editor),
        ...getNewPageSlashMenuItems(() => void insertNewPageLink("")),
        ...getIconSlashMenuItems(editor),
        // The sidebar's blocks, offered in the page. `addBlock` makes the
        // record and hands back its id; the menu item points the document at
        // it. See page-block-slash-menu.tsx.
        ...getPageBlockSlashMenuItems(editor, (kind, extra) => addBlock(nodeId, kind, extra)),
      ],
      query,
    );
  }

  // Already filtered by the glyph and emoji searches, which match on keywords
  // the item titles do not carry — running these through `filterSuggestionItems`
  // would throw that away. See icon-menu-items.tsx.
  async function getIconItems(query: string): Promise<DefaultReactSuggestionItem[]> {
    return getIconMenuItems(editor, query);
  }

  async function getMentionItems(query: string): Promise<DefaultReactSuggestionItem[]> {
    return filterSuggestionItems(getMentionMenuItems(editor, nodes, nodeId), query);
  }

  return {
    editor,
    onKeyDownCapture,
    handleChange,
    focusEnd,
    getSlashMenuItems,
    getIconItems,
    getMentionItems,
    // Passed through rather than imported by the component, keeping this file
    // the only way into services/editor-blocks/ — see the header above.
    slashShouldOpen: slashOpensCommandMenu,
    iconShouldOpen: iconMenuOpens,
    iconTrigger,
    closeIconTrigger,
    insertIconAtTrigger,
    suggestionMenuFloating,
  };
}

/**
 * Re-positions a suggestion menu once its items have arrived.
 *
 * `getItems` is a promise — BlockNote's own signature — so the menu is drawn as
 * a one-line loading strip first, and floating-ui measures *that*. It picks the
 * right side and anchors the top correctly for a 30px box, then the items land
 * and the box grows downward from an anchor chosen for something eight times
 * shorter. Near the bottom of the window the result is a menu hanging most of
 * the way off the screen with a sliver showing.
 *
 * Measured in the running editor before the fix, with the cursor 85px from the
 * bottom: the menu was placed at y=601 and grew to 617px tall, so 498px of it
 * was below the window. Nothing re-ran the calculation — one forced reposition
 * moved it to y=10, entirely on screen. The placement maths was never wrong;
 * it just ran once, too early.
 *
 * `autoUpdate` (which BlockNote already merges in) watches for scrolling,
 * window resizes and the elements themselves being resized, and none of those
 * fire for this. Watching the menu's own children does, so this adds that and
 * nothing else.
 *
 * Deliberately `childList`/`subtree` only, never `attributes`: floating-ui's
 * `size` middleware writes `max-height` onto this same element every time it
 * runs, so observing attributes would have each update trigger the next one.
 */
const suggestionMenuFloating: FloatingUIOptions = {
  useFloatingOptions: {
    whileElementsMounted: (_reference, floating, update) => {
      const observer = new MutationObserver(() => update());
      observer.observe(floating, { childList: true, subtree: true });
      return () => observer.disconnect();
    },
  },
};
