// A page's writing, drawn to be read: the page's own editor with the typing
// turned off. Phase 32, step 6. See hooks/use-page-reader.ts for why it is
// the real editor and not a second renderer.
//
// What the writing editor puts up around the words — the slash and mention
// menus, the formatting bar, the side handles, the file panel — is off,
// because none of it means anything where nothing is typed. The blocks that
// draw the page's own panel blocks are handed down as Editor.tsx hands them,
// so an infobox in the writing is an infobox here too.
import { BlockNoteView } from "@blocknote/shadcn";
import { BlockRefRenderContext, usePageReader } from "../../hooks/use-page-reader";
import { Infobox } from "../blocks/Infobox";
import { PageBlock } from "../blocks/PageBlock";
import { MediaEmbedBlock } from "../blocks/MediaEmbedBlock";

// Module-level for the reason Editor.tsx gives for its own copy: the context
// hands these down as component types, and a value built during render would
// be a new type every render, resetting every field in every block.
const PAGE_BLOCK_RENDERERS = { Block: PageBlock, Infobox, Media: MediaEmbedBlock };

type Props = {
  /** The writing of one of the page's tabs, as it is stored. */
  content: unknown[];
};

export function PageReader({ content }: Props) {
  const editor = usePageReader(content);
  return (
    <BlockRefRenderContext.Provider value={PAGE_BLOCK_RENDERERS}>
      <BlockNoteView
        editor={editor}
        editable={false}
        theme="dark"
        className="wiki-body editor-shell page-reader"
        slashMenu={false}
        emojiPicker={false}
        formattingToolbar={false}
        filePanel={false}
        sideMenu={false}
        linkToolbar={false}
        tableHandles={false}
      />
    </BlockRefRenderContext.Provider>
  );
}
