// Where the page-block renderers get plugged in. Phase 19.5.
//
// The same render boundary MentionChip is: React components living under
// services/ because BlockNote's render callback is itself one, which CLAUDE.md
// names as the exception rather than a hole in the layer order.
//
// **The renderers come from a context and are rendered as component types**, so
// whatever is provided must be declared at module level — a component built
// during a render is a new type every keystroke and React would throw away the
// subtree, resetting every field in the block. That invariant is stated on
// `BlockRefRenderer`, on `InfoboxRenderer` and on the components themselves;
// nothing here can enforce it.
import { useContext } from "react";
import { BlockRefRenderContext } from "./block-ref-context";

export function BlockRefSlot({ blockId }: { blockId: string }) {
  const renderers = useContext(BlockRefRenderContext);
  if (!renderers || !blockId) return null;
  const { Block } = renderers;
  return <Block blockId={blockId} />;
}

export function InfoboxSlot({ editorBlockId, blockIds }: { editorBlockId: string; blockIds: string[] }) {
  const renderers = useContext(BlockRefRenderContext);
  if (!renderers) return null;
  const { Infobox } = renderers;
  // An infobox with nothing in it still draws: the frame carries its own Add
  // Block, and an empty one is how every infobox starts.
  return <Infobox editorBlockId={editorBlockId} blockIds={blockIds} />;
}
