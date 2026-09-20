// A page's writing, opened to be read and not written in: the editor the
// page is written in, built the same way and told to take no typing. Phase
// 32, step 6 — a page opened on a board shows its writing through this.
//
// **The real editor, read-only, rather than a second renderer.** Everything
// the page holds — callouts, columns, meters in an infobox, mention chips,
// pictures out of the world's library — is drawn by a block the editor
// knows, and a second drawing of each would be a second copy of every one
// of those rules, wrong the next time a block changes. Built read-only, the
// editor draws the page exactly as its own tab does, and a mention in it
// still opens its page.
//
// Kept beside `use-editor.ts` rather than in it: that hook is the writing
// editor's whole wiring — menus, pastes, auto-linking — and none of it
// applies to a page that takes no typing.
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect, useRef } from "react";
import { resolveAssetUrl } from "../services/asset-urls";
import { editorSchema } from "../services/editor-blocks/editor-schema";
import { useProjectRootPath } from "./use-project";

/**
 * A read-only editor holding `content`, the writing of one of a page's tabs.
 *
 * **Follows the writing as it changes.** `initialContent` is read once, when
 * the editor is made; a page rewritten after that — restored to an earlier
 * version, or edited in its own tab and the board come back to — is put
 * into the editor whole, so what is read is what the page says now.
 */
export function usePageReader(content: unknown[]) {
  const rootPath = useProjectRootPath();
  const editor = useCreateBlockNote({
    schema: editorSchema,
    initialContent: content.length > 0 ? (content as never) : undefined,
    // A picture in the writing is a file in the world's library, named by
    // its path; this is what turns the name into something the window can
    // paint — the same call the writing editor makes.
    resolveFileUrl: (url: string) => resolveAssetUrl(rootPath, url),
  });

  const shownRef = useRef(content);
  useEffect(() => {
    if (shownRef.current === content) return;
    shownRef.current = content;
    // An editor is never empty: a page with nothing written shows one
    // blank line, as its own tab does.
    editor.replaceBlocks(editor.document, (content.length > 0 ? content : [{ type: "paragraph" }]) as never);
  }, [content, editor]);

  return editor;
}

// The slot the reader fills with the components that draw a page's own
// blocks — re-exported for the reason use-editor.ts re-exports it: this hook
// is the reader's one door into services/editor-blocks/.
export { BlockRefRenderContext } from "../services/editor-blocks/block-ref-context";
