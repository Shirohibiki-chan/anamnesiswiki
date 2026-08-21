// The only import path components have into services/editor-blocks/. See
// CLAUDE.md's layer order — components never import services directly.
// page/Editor.tsx used to reach into six of those modules itself; everything
// that isn't a BlockNote React component now goes through here, leaving that
// component to do nothing but render.
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { filterSuggestionItems } from "@blocknote/core";
import { getDefaultReactSlashMenuItems, useCreateBlockNote } from "@blocknote/react";
import type { DefaultReactSuggestionItem, FloatingUIOptions } from "@blocknote/react";
import { MAX_IMAGE_BYTES } from "../constants/limits";
import { extensionFor, resolveAssetUrl } from "../services/asset-urls";
import { editorSchema } from "../services/editor-blocks/editor-schema";
import { getCalloutSlashMenuItems, withoutBuiltInQuote } from "../services/editor-blocks/callout-slash-menu";
import { handleImageKeys } from "../services/editor-blocks/image-keys";
import { getMentionMenuItems } from "../services/editor-blocks/mention-menu-items";
import { handleSuggestionListKeys } from "../services/editor-blocks/suggestion-list-keys";
import { resolveWikilinks } from "../services/editor-blocks/wikilink";
import { useWikilinkBracketConfirm, WIKILINK_TRIGGER } from "../services/editor-blocks/wikilink-bracket-confirm";
import { useWikilinkResume } from "../services/editor-blocks/wikilink-resume";
import { useProject } from "./use-project";

export { WIKILINK_TRIGGER };

export function useEditor(nodeId: string, content: unknown[], onContentChange: (content: unknown[]) => void) {
  // The full-store subscription is deliberate here: the mention menu and
  // wikilink resolution both need to see every node in the project, and this
  // component is already re-rendering as the user types regardless.
  const { nodes, rootPath, uploadAsset } = useProject();

  const editor = useCreateBlockNote({
    schema: editorSchema,
    initialContent: content.length > 0 ? (content as never) : undefined,
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

  const confirmWikilinkBracket = useWikilinkBracketConfirm(editor, nodes, nodeId);
  useWikilinkResume(editor);

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
    confirmWikilinkBracket(event);
  }

  function handleChange() {
    resolveWikilinks(editor, nodes);
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
      [...withoutBuiltInQuote(getDefaultReactSlashMenuItems(editor)), ...getCalloutSlashMenuItems(editor)],
      query,
    );
  }

  async function getMentionItems(query: string): Promise<DefaultReactSuggestionItem[]> {
    return filterSuggestionItems(getMentionMenuItems(editor, nodes, nodeId), query);
  }

  return { editor, onKeyDownCapture, handleChange, focusEnd, getSlashMenuItems, getMentionItems, suggestionMenuFloating };
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
