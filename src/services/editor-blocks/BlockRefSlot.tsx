// Where a page block's renderer gets plugged in. Phase 19.5.
//
// The same render boundary MentionChip is: a React component living under
// services/ because BlockNote's render callback is itself one, which CLAUDE.md
// names as the exception rather than a hole in the layer order.
import { useContext } from "react";
import { BlockRefRenderContext } from "./block-ref-context";

export function BlockRefSlot({ blockId }: { blockId: string }) {
  const Render = useContext(BlockRefRenderContext);
  if (!Render || !blockId) return null;
  // **The rule is right in general and cannot see through a context.** The
  // value here is always a module-level component — `PageBlock`, provided by
  // Editor.tsx — and the invariant the rule protects is stated on both
  // `BlockRefRenderer` and `PageBlock`: a renderer built during a render would
  // be a new type every keystroke, and React would reset every field in the
  // block along with it.
  // eslint-disable-next-line react-hooks/static-components -- value is a module-level component; see above
  return <Render blockId={blockId} />;
}
