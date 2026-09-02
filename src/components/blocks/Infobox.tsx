// The infobox: a bordered frame in the page holding several of the page's own
// blocks, with its own Add Block. Phase 19.5. See docs/plan.md.
//
// **It groups blocks; it does not own them.** Everything inside is the same
// record in `node.blocks` that a sidebar block is — the frame stores a list of
// ids and nothing else. So the same block kind draws in three places through
// one renderer, and a kind added later appears in all three without being
// ported to any of them.
//
// **The order shown here is the frame's own, not the page's.** The sidebar
// draws `node.blocks` in storage order; this draws the ids it was given, in the
// order it was given them. That is why reordering writes to the prop on this
// block in the document rather than to `node.blocks` — see docs/handoff.md on
// position on screen not being position in storage.
import { useState } from "react";
import type { Block, BlockKind } from "../../constants/schema";
import { Plus } from "lucide-react";
import { useBlockNoteEditor } from "@blocknote/react";
import { BLOCK_WIDTH_FULL, serialiseBlockIds, storedBlockWidth } from "../../services/block-service";
import { useBlocks } from "../../hooks/use-blocks";
import { useProject } from "../../hooks/use-project";
import { TreePopover } from "../tree/TreePopover";
import { AddBlockMenu } from "./AddBlockMenu";
import { BlockList } from "./BlockList";
import { BlockWidthHandles } from "./BlockWidthHandle";
import "./blocks.css";

/**
 * Draws one infobox and everything in it.
 *
 * `editorBlockId` names the BlockNote block this frame *is*, which is what lets
 * it write its own list back; `blockIds` is that list as it stands.
 *
 * **Module-level, like `PageBlock`, and for the same reason** — it is handed to
 * the editor through a context and rendered as a component type, and React
 * discards a subtree whose type changed.
 */
export function Infobox({
  editorBlockId,
  blockIds,
  width,
}: {
  editorBlockId: string;
  blockIds: string[];
  width: number;
}) {
  const { project, nodes, addBlock } = useProject();
  const editor = useBlockNoteEditor();
  const node = project?.selectedId ? nodes[project.selectedId] : undefined;
  const { blocks, properties, unshown } = useBlocks(node);
  const [addRect, setAddRect] = useState<DOMRect | null>(null);
  // **The width is held here while it is being dragged and written once when
  // it is let go**, which is where this parts company with a block's own width.
  // A block writes to its record on every move and the store merges the run;
  // this writes to the document, and a hundred `updateBlock` calls would be a
  // hundred steps in the editor's own undo — Ctrl+Z pressed once afterwards
  // would move the edge a pixel.
  const [dragWidth, setDragWidth] = useState<number | null>(null);

  // **Ids that name nothing are skipped rather than drawn as gaps.** A block
  // removed from its own menu leaves its id here until the page is next opened
  // and the sweep prunes it — see block-service.ts. Until then this simply has
  // one fewer thing in it, which is what she asked for anyway.
  const held = blockIds.map((id) => blocks.find((block) => block.id === id)).filter((block) => block !== undefined);

  if (!node) return null;

  /** Writes a new list back onto this frame. */
  function setHeld(ids: string[]) {
    editor.updateBlock(editorBlockId, { props: { blockIds: serialiseBlockIds(ids) } });
  }

  /** Stores the frame's width. 0 is the whole column, and is what Home gives. */
  function setWidth(next: number) {
    editor.updateBlock(editorBlockId, { props: { width: storedBlockWidth(next) ?? 0 } });
  }

  function handleReorder(activeId: string, overId: string) {
    const from = blockIds.indexOf(activeId);
    const to = blockIds.indexOf(overId);
    if (from === -1 || to === -1) return;
    const next = [...blockIds];
    next.splice(to, 0, ...next.splice(from, 1));
    setHeld(next);
  }

  function handleMove(blockId: string, direction: -1 | 1) {
    const at = blockIds.indexOf(blockId);
    const neighbour = blockIds[at + direction];
    if (at === -1 || !neighbour) return;
    handleReorder(blockId, neighbour);
  }

  /** Makes the record, then adds it to this frame — in that order, so the id exists. */
  function add(kind: BlockKind, extra?: Partial<Block>) {
    const id = addBlock(node!.id, kind, extra);
    setHeld([...blockIds, id]);
    setAddRect(null);
  }

  // Zero is stored for "the whole column" so an infobox made before this
  // existed opens at the width it always had, rather than at BlockNote's
  // numeric default of nothing.
  const drawnWidth = dragWidth ?? (width > 0 ? width : BLOCK_WIDTH_FULL);

  return (
    <div
      className="infobox"
      style={drawnWidth === BLOCK_WIDTH_FULL ? undefined : { width: `${drawnWidth}%` }}
    >
      <BlockWidthHandles
        width={drawnWidth}
        label="This infobox"
        onResize={setDragWidth}
        onCommit={(next) => {
          setWidth(next);
          setDragWidth(null);
        }}
        onReset={() => {
          setDragWidth(null);
          setWidth(BLOCK_WIDTH_FULL);
        }}
      />
      {held.length > 0 && (
        <BlockList
          node={node}
          blocks={held}
          properties={properties}
          onReorder={handleReorder}
          onMove={handleMove}
        />
      )}

      {held.length === 0 && (
        <p className="infobox-empty">
          {/* An empty frame with no explanation reads as something that failed
              to load. It says what it is and what to do with it, once. */}
          An infobox. Add the blocks you want grouped here.
        </p>
      )}

      <button
        type="button"
        className="block-add-trigger infobox-add"
        onClick={(e) => setAddRect(e.currentTarget.getBoundingClientRect())}
      >
        <Plus size={12} /> Add Block
      </button>

      {addRect && (
        <TreePopover anchorRect={addRect} onClose={() => setAddRect(null)}>
          {/* The same menu the sidebar's Add Block opens, less two things.
              Applying a template is a decision about the whole page and does
              not belong behind a frame in the middle of one. And **New
              property is left out rather than stubbed**: it opens a form with a
              name box and a type picker that belongs to the panel, and a menu
              item that closes the menu and does nothing is worse than one that
              is not there. Fields the page already has are still offered. */}
          <AddBlockMenu
            unshown={unshown}
            onAdd={(kind) => add(kind)}
            onAddCollection={(source) => add("collection", { source })}
            onAddMeter={(meter) => add("meter", { meter })}
            onAddProperty={(propertyKey) => add("property", { propertyKey })}

          />
        </TreePopover>
      )}
    </div>
  );
}
