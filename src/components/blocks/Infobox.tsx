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
import { useState, type MouseEvent } from "react";
import type { Block, BlockKind } from "../../constants/schema";
import { MoreHorizontal, Plus } from "lucide-react";
import { useBlockNoteEditor } from "@blocknote/react";
import { getPaletteHex } from "../../constants/palette";
import { INFOBOX_TYPE } from "../../constants/schema";
import { BLOCK_WIDTH_FULL, BLOCK_WIDTH_HALF, serialiseBlockIds, storedBlockWidth } from "../../services/block-service";
import { useBlocks } from "../../hooks/use-blocks";
import { useColorPreview } from "../../hooks/use-color-preview";
import { useProject } from "../../hooks/use-project";
import { TreePopover } from "../tree/TreePopover";
import { AddBlockMenu } from "./AddBlockMenu";
import { BlockList } from "./BlockList";
import { BlockWidthHandles } from "./BlockWidthHandle";
import { InfoboxMenu } from "./InfoboxMenu";
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
  color,
  autoWidth,
  centred,
  wrap,
}: {
  editorBlockId: string;
  blockIds: string[];
  width: number;
  color: string;
  autoWidth: boolean;
  centred: boolean;
  wrap: string;
}) {
  const { project, nodes, addBlock, duplicateBlocks } = useProject();
  const editor = useBlockNoteEditor();
  const node = project?.selectedId ? nodes[project.selectedId] : undefined;
  const { blocks, properties, unshown } = useBlocks(node);
  const [addRect, setAddRect] = useState<DOMRect | null>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  // The colour being tried in the system picker, which only this frame reads.
  // Same arrangement a block's own colour has — see BlockShell.
  const previewHex = useColorPreview(editorBlockId);
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
    // **A drag leaves auto-adapt**, which is the whole of how the either/or is
    // escaped: pulling an edge is saying how wide it should be, and a frame
    // that sprang back to its contents afterwards would read as a broken
    // handle. See the note on the prop schema in editor-blocks/infobox.tsx.
    editor.updateBlock(editorBlockId, { props: { width: storedBlockWidth(next) ?? 0, autoWidth: false } });
  }

  /** One of the frame's own settings, written back to its block. */
  function setLook(props: { color?: string; autoWidth?: boolean; centred?: boolean; width?: number; wrap?: string }) {
    editor.updateBlock(editorBlockId, { props });
  }

  /**
   * Which side the writing goes round, or neither.
   *
   * **A frame the width of the column cannot be wrapped around**, so choosing a
   * side gives it half the column to sit in — the alternative is a menu item
   * that appears to do nothing. A frame already narrower than the column, by a
   * drag or by auto-adapt, keeps the width it has.
   */
  function setWrap(side: string) {
    const narrow = autoWidth || (width > 0 && width < BLOCK_WIDTH_FULL);
    setLook({
      wrap: side,
      // Centred and wrapped are two answers to one question. See the prop
      // schema in editor-blocks/infobox.tsx.
      ...(side ? { centred: false } : {}),
      ...(side && !narrow ? { width: BLOCK_WIDTH_HALF } : {}),
    });
  }

  // **The copy holds copies**, because an infobox holds pointers and one block
  // in two frames is the thing this phase rules out everywhere else. The
  // records are duplicated first — that is a panel edit, under the panel's undo
  // — and the frame that points at them is inserted after; the two halves are
  // written through different paths and cannot be committed together, which is
  // the same split every other edit to an infobox has.
  function duplicate() {
    const idMap = duplicateBlocks(node!.id, blockIds);
    const copied = blockIds.map((id) => idMap.get(id)).filter((id) => id !== undefined);
    editor.insertBlocks(
      // `as never` for the reason ColumnLane's insert has one: this hook hands
      // back the editor under BlockNote's default schema, which does not know
      // our blocks exist. The alternative is threading the app's schema type
      // into every file that touches the editor.
      [
        {
          type: INFOBOX_TYPE,
          props: { blockIds: serialiseBlockIds(copied), width, color, autoWidth, centred },
        } as never,
      ],
      editorBlockId,
      "after",
    );
    setMenuRect(null);
  }

  function openMenuAt(event: MouseEvent<HTMLDivElement>) {
    // A block inside the frame answers for its own right-click; this is for the
    // frame itself — its padding, its empty state, the strip its Add Block sits
    // on. Same division the sidebar makes between a block and the panel's space.
    const target = event.target as HTMLElement | null;
    if (target?.closest(".block-shell, input, textarea, [contenteditable='true']")) return;
    event.preventDefault();
    event.stopPropagation();
    setMenuRect(new DOMRect(event.clientX, event.clientY, 0, 0));
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
  const hex = previewHex ?? getPaletteHex(color);
  // **A drag beats auto-adapt while the pointer is down**, so the edge follows
  // the pointer rather than the frame sitting still until it is let go — the
  // write that turns auto off does not land until then.
  const fitsContents = autoWidth && dragWidth === null;

  // **Wrapping is drawn on the frame and floated on the block around it**, which
  // is a rule this file cannot carry out on its own: the element the writing
  // flows around has to be the one BlockNote gave the block, and that belongs
  // to ProseMirror. The class goes here and `blocks.css` reaches out to that
  // element with `:has()`. See docs/handoff.md.
  const wrapped = wrap === "left" || wrap === "right";
  const classes = [
    "infobox",
    hex ? "infobox-colored" : "",
    fitsContents ? "infobox-auto" : "",
    centred && !wrapped ? "infobox-centred" : "",
    wrapped ? `infobox-wrap-${wrap}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      style={{
        // **Container units while it is wrapped, per cent otherwise.** A
        // wrapped frame is inside a floated box that is only as wide as the
        // frame, so a percentage here would be a percentage of itself —
        // measured at 74px where 254 was asked for. `cqw` is a percentage of
        // the writing column, which is what the number has always meant; see
        // the container declared on the editor in blocks.css.
        ...(fitsContents || drawnWidth === BLOCK_WIDTH_FULL
          ? {}
          : { width: wrapped ? `${drawnWidth}cqw` : `${drawnWidth}%` }),
        ...(hex ? { ["--infobox-accent" as string]: hex } : {}),
      }}
      onContextMenu={openMenuAt}
    >

      <BlockWidthHandles
        width={drawnWidth}
        label="This infobox"
        // **A wrapped frame is measured against the column, not against what
        // holds it.** Floating it puts it in a box that is its own width, so the
        // ordinary "how wide is my parent" reading would make every pixel of
        // the drag worth four.
        measureAgainst={wrapped ? "column" : "parent"}
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
          {/* It says what to put in it rather than only naming itself. An
              empty frame that introduces itself tells you nothing you cannot
              see; the useful sentence is what it is for. */}
          A frame for the things worth seeing at a glance — a picture, some
          stats, a few of the page's fields.
        </p>
      )}

      {/* **The frame's two controls sit together, at the bottom.** The obvious
          place for the menu is the top right corner, and that is exactly where
          the first block inside draws its own `⋯` — two menus a few pixels
          apart, one of them answering for the wrong thing. Down here they are
          unambiguously the frame's, beside the other button that already is.

          Faint until the pointer is over the frame, the same manner as a
          callout's colour dot: a page being read is a page of writing, not a
          page of buttons. */}
      <div className="infobox-footer">
        <button
          type="button"
          className="block-add-trigger infobox-add"
          onClick={(e) => setAddRect(e.currentTarget.getBoundingClientRect())}
        >
          <Plus size={12} /> Add Block
        </button>
        <button
          type="button"
          className="infobox-menu-trigger"
          aria-label="Infobox options"
          title="Infobox options"
          onClick={(e) => setMenuRect(e.currentTarget.getBoundingClientRect())}
        >
          <MoreHorizontal size={13} />
        </button>
      </div>

      {menuRect && (
        <TreePopover anchorRect={menuRect} onClose={() => setMenuRect(null)}>
          <InfoboxMenu
            editorBlockId={editorBlockId}
            color={color}
            autoWidth={autoWidth}
            centred={centred && !wrapped}
            wrap={wrap}
            isFullWidth={width === 0 || width >= BLOCK_WIDTH_FULL}
            // Picking a colour leaves the menu open — see BlockMenu, where the
            // same decision is written down.
            onColor={(next) => setLook({ color: next ?? "" })}
            onAutoWidth={(auto) => {
              setLook({ autoWidth: auto });
              setMenuRect(null);
            }}
            onFullWidth={() => {
              // Nothing to wrap around any more, so the sides come off with it.
              setLook({ width: 0, autoWidth: false, wrap: "" });
              setMenuRect(null);
            }}
            onCentred={(next) => {
              setLook({ centred: next, wrap: "" });
              setMenuRect(null);
            }}
            onWrap={(side) => {
              setWrap(side);
              setMenuRect(null);
            }}
            onDuplicate={duplicate}
            onRemove={() => {
              // The blocks are untouched: removing the frame drops the pointers
              // and the records go back to being shown in the sidebar.
              editor.removeBlocks([editorBlockId]);
              setMenuRect(null);
            }}
          />
        </TreePopover>
      )}

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
