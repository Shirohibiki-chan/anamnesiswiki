// The infobox: a bordered frame in the page holding several of the page's own
// blocks. Phase 19.5. See docs/plan.md.
//
// **It groups blocks; it does not own them.** Every block inside is the same
// record in `node.blocks` that a sidebar block is, and it can be taken out into
// the page body on its own — which is why this stores a list of ids and not the
// blocks themselves. The correction that made this the shape it is came from
// the user on 2026-08-27: a first draft had the infobox swallowing the whole
// phase, and it does not; a block standing alone in the page has to work
// anyway.
//
// **The list is a joined string because BlockNote props are flat** — strings,
// numbers and booleans, not arrays. `parseBlockIds` in block-service.ts is the
// only thing that knows how it is put together.
import { createReactBlockSpec } from "@blocknote/react";
import { INFOBOX_TYPE } from "../../constants/schema";
import { parseBlockIds } from "../block-service";
import { InfoboxSlot } from "./BlockRefSlot";

export const infoboxConfig = {
  type: INFOBOX_TYPE,
  propSchema: { blockIds: { default: "" } },
  content: "none",
} as const;

export const infoboxSpec = createReactBlockSpec(infoboxConfig, {
  // `contentEditable={false}` for the same reason the lone block has it: there
  // is no text of ours in here, and without it ProseMirror puts the caret
  // somewhere it cannot draw and the next keystroke goes to the document
  // instead of the field it looks like it is in.
  render: ({ block }) => (
    <div className="page-infobox" contentEditable={false}>
      <InfoboxSlot editorBlockId={block.id} blockIds={parseBlockIds(block.props.blockIds)} />
    </div>
  ),
})();
