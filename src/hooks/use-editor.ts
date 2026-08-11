// The only import path components have into services/editor-blocks/. See
// CLAUDE.md's layer order — components never import services directly.
// page/Editor.tsx used to reach into six of those modules itself; everything
// that isn't a BlockNote React component now goes through here, leaving that
// component to do nothing but render.
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { filterSuggestionItems } from "@blocknote/core";
import { getDefaultReactSlashMenuItems, useCreateBlockNote } from "@blocknote/react";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { extensionFor, resolveAssetUrl } from "../services/asset-urls";
import { editorSchema } from "../services/editor-blocks/editor-schema";
import { getCalloutSlashMenuItems } from "../services/editor-blocks/callout-slash-menu";
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
    // something the webview can paint. Without the pair, the only way into
    // that block is its embed-from-URL tab — a picture the app would have to
    // fetch off the internet to show, which crosses CLAUDE.md's policy
    // boundary and is useless in a world you're writing offline.
    //
    // These are read once, when the editor is created. That's fine for
    // `rootPath` — the editor is remounted per page, and a project change
    // remounts the whole app shell — but it does mean neither can be swapped
    // for a stale-capture-sensitive value later.
    uploadFile: async (file: File) => {
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
  function onKeyDownCapture(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (handleSuggestionListKeys(event)) return;
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
    return filterSuggestionItems([...getDefaultReactSlashMenuItems(editor), ...getCalloutSlashMenuItems(editor)], query);
  }

  async function getMentionItems(query: string): Promise<DefaultReactSuggestionItem[]> {
    return filterSuggestionItems(getMentionMenuItems(editor, nodes, nodeId), query);
  }

  return { editor, onKeyDownCapture, handleChange, focusEnd, getSlashMenuItems, getMentionItems };
}
