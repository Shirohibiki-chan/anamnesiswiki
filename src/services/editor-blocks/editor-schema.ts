// Single BlockNote schema shared by every page's editor — default blocks +
// the three callouts + the mention inline content. See CLAUDE.md's Editor
// section and docs/constants-and-theming.md §Callout blocks.
import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from "@blocknote/core";
import { blockRefSpec } from "./block-ref";
import { codeBlockSpec } from "./code-block";
import { infoboxSpec } from "./infobox";
import { infoBlockSpec } from "./info-block";
import { quoteBlockSpec } from "./quote-block";
import { secretBlockSpec } from "./secret-block";
import { iconInlineContentSpec } from "./icon-inline-content";
import { mentionInlineContentSpec } from "./mention-inline-content";

export const editorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    // Replaces the default code block rather than adding a second one, so the
    // type name stays `codeBlock` and every block already saved in a page
    // keeps working — it gains highlighting and a language dropdown without
    // anything on disk changing.
    codeBlock: codeBlockSpec,
    calloutInfo: infoBlockSpec,
    calloutQuote: quoteBlockSpec,
    calloutSecret: secretBlockSpec,
    // One of the page's own blocks, drawn in the middle of the writing rather
    // than in the sidebar. Phase 19.5 — it holds an id, not a block.
    blockRef: blockRefSpec,
    // Several of them in a bordered frame, with its own Add Block. Phase 19.5 —
    // it holds a list of ids, not blocks.
    infobox: infoboxSpec,
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    mention: mentionInlineContentSpec,
    // A clickable icon in the middle of a sentence. Phase 19.5 — inline
    // content rather than a character, which is what lets it be asked again
    // after it has been placed.
    icon: iconInlineContentSpec,
  },
});
