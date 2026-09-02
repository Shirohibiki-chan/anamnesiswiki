// One of the page's own blocks, drawn in the middle of the writing. Phase 19.5.
// See docs/plan.md.
//
// **It draws through BlockList, which is the whole point of splitting that out
// of BlockPanel.** A block in the page is the same block as one in the sidebar
// — same record, same menu, same editing — so a kind added later appears here
// without being ported. Anything this file drew itself would be a second
// renderer to keep in step with the first.
//
// **A one-block list, and the list operations are deliberately nothing.**
// Reordering and moving up or down are questions about a list of siblings, and
// a block standing on its own in the page has none: where it sits is where it
// sits in the document, which BlockNote's own drag handle already moves. Wiring
// them to the sidebar's ordering would move the block somewhere invisible.
import { useProject } from "../../hooks/use-project";
import { useBlocks } from "../../hooks/use-blocks";
import { BLOCK_WIDTH_FULL, storedBlockWidth } from "../../services/block-service";
import { BlockList } from "./BlockList";
import { BlockWidthHandles } from "./BlockWidthHandle";
import "./blocks.css";

/**
 * Draws the block `blockId` names, on the page the editor is showing.
 *
 * **This is the one block component allowed to ask which page is open, and the
 * exception is the reason it can exist at all.** `BlockList` may not — see
 * docs/handoff.md — because it draws lists that are only part of a page's
 * blocks and has to be told which node they belong to. Something has to answer
 * that question for a block sitting inside the editor, and the editor is only
 * ever showing the selected page.
 *
 * **A pointer with nothing behind it draws nothing, and that is an ordinary
 * state rather than an error.** The record and the pointer are saved through
 * different paths — the panel writes `node.blocks`, the editor writes the
 * document — so the two cannot be committed together, and any moment between
 * them has one without the other. Removing the block from its own menu is the
 * ordinary way to arrive here, and the empty pointer is swept on the next read.
 *
 * **Module-level, and it has to stay that way.** It is handed to the editor
 * through a context and rendered as a component type; one built inside another
 * component would be a new type on every keystroke, and React throws away a
 * subtree whose type changed — the same bug the formatting toolbar had.
 */
export function PageBlock({ blockId }: { blockId: string }) {
  const { project, nodes, setBlockWidth } = useProject();
  const node = project?.selectedId ? nodes[project.selectedId] : undefined;
  const { blocks, properties } = useBlocks(node);

  const block = blocks.find((candidate) => candidate.id === blockId);
  if (!node || !block) return null;

  // **The frame is what gets the width, not the row it sits in.** The row is
  // the whole writing column — it has to be, or there would be nothing for a
  // percentage to be a percentage *of*, and nothing for the handles to be
  // dragged across. See blocks.css.
  const width = block.width ?? BLOCK_WIDTH_FULL;

  return (
    <div className="block-frame" style={width === BLOCK_WIDTH_FULL ? undefined : { width: `${width}%` }}>
      <BlockList
        node={node}
        blocks={[block]}
        properties={properties}
        onReorder={() => {}}
        onMove={() => {}}
      />
      {/* Written straight to the record on every move, which is what redraws
          the block under the pointer. The store merges the run into one undo
          entry — see setBlockWidth. */}
      <BlockWidthHandles
        width={width}
        label={block.title || "This block"}
        onResize={(next) => setBlockWidth(node.id, block.id, storedBlockWidth(next))}
        onReset={() => setBlockWidth(node.id, block.id, undefined)}
      />
    </div>
  );
}
