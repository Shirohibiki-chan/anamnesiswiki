// Single BlockNote schema shared by every page's editor — default blocks +
// the three callouts + the mention inline content. See CLAUDE.md's Editor
// section and docs/constants-and-theming.md §Callout blocks.
import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from "@blocknote/core";
import { codeBlockSpec } from "./code-block";
import { infoBlockSpec } from "./info-block";
import { quoteBlockSpec } from "./quote-block";
import { secretBlockSpec } from "./secret-block";
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
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    mention: mentionInlineContentSpec,
  },
});
