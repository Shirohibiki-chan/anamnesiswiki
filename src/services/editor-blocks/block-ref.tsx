// The page-body block: a BlockNote block that stands for one of the page's own
// blocks. Phase 19.5. See docs/plan.md.
//
// **It stores an id and nothing else, and that is the phase's central
// decision.** A block drawn here keeps its record in `node.blocks` exactly as a
// sidebar one does, so moving it between the sidebar, the page and an infobox
// is a pointer moving rather than the block being rewritten — no field can be
// lost on the way and a block that comes back is the same block.
//
// **Nothing in this file knows how to draw a block, on purpose.** The renderer
// lives in `components/blocks/PageBlock.tsx`, because drawing one needs the
// whole panel — the property fields, the meters, the collection sources — and
// CLAUDE.md's layer order runs `services → hooks → components`. Importing that
// component here would be the one direction imports may not flow. So this file
// leaves a slot and the component layer fills it in: `Editor.tsx` provides the
// renderer, by way of `use-editor.ts`, which is the only door components have
// into this folder.
import { createReactBlockSpec } from "@blocknote/react";
import { BLOCK_REF_TYPE } from "../../constants/schema";
import { BlockRefSlot } from "./BlockRefSlot";

export const blockRefConfig = {
  type: BLOCK_REF_TYPE,
  propSchema: { blockId: { default: "" } },
  content: "none",
} as const;

export const blockRefSpec = createReactBlockSpec(blockRefConfig, {
  // `contentEditable={false}` is what stops the caret being placed inside a
  // block that has no text of its own: without it, clicking a property field
  // puts ProseMirror's selection somewhere it cannot draw, and the next
  // keystroke goes to the document instead of the field it looks like it is in.
  render: ({ block }) => (
    <div className="page-block" contentEditable={false}>
      <BlockRefSlot blockId={block.props.blockId} />
    </div>
  ),
})();
