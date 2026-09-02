// A row of columns and one lane of it, as they are drawn. Phase 19.5.
//
// Split out of `columns.tsx` because that file's exports are block specs rather
// than components — the same reason `BlockRefSlot` is its own file. What a
// column *is* is in `columns.tsx`; how a row keeps its shape is in
// `column-service.ts`; this is what one looks like.
//
// **Nothing here writes to the editor's DOM, and that rule was learned the hard
// way.** The element that is actually a lane is `.bn-block-outer`, which
// BlockNote renders — so the first version set its `flex-grow` in a layout
// effect. ProseMirror watches its own DOM for changes it did not make: the
// write made it re-read the document, which re-rendered the node view, which
// wrote again. The editor locked up on the first insert with no error thrown.
//
// **So the widths are applied as a stylesheet, keyed by lane id.** The row
// renders one rule per lane into `document.head`. Keying them by *position* was
// half of a bug reported on 2026-09-02: rules saying "first lane 67%" landed on
// whatever happened to be first once a stray block got into the row, and lanes
// came out a single character wide.
import { useRef } from "react";
import { createPortal } from "react-dom";
import { useBlockNoteEditor } from "@blocknote/react";
import { Columns2, Plus, X } from "lucide-react";
import { COLUMN_TYPE } from "../../constants/schema";
import { COLUMN_WIDTH_MIN, snapBlockWidth } from "../block-service";
import { laneShares, laneToKeepWriting, widthsAfterDrag, type DocumentBlock } from "../column-service";

/**
 * What this file needs of a block it looks up, and no more.
 *
 * **A cast rather than the real schema type, on purpose.** The typed editor
 * comes from `editor-schema.ts`, which imports the specs that import this file
 * — asking for it here would be a cycle. `useBlockNoteEditor()` with no
 * arguments is typed as the *default* schema, which has never heard of a
 * column, so the lookups below read through this shape instead.
 */
type RowBlock = DocumentBlock & { props: { widths: string }; children: DocumentBlock[] };

function rowBlock(block: unknown): RowBlock | undefined {
  return block as RowBlock | undefined;
}

/** The lanes of a row, in order. Anything else in there is not a lane. */
function lanesOf(row: RowBlock | undefined): DocumentBlock[] {
  return (row?.children ?? []).filter((child) => child.type === COLUMN_TYPE);
}

/** Writing a prop on a block the default schema does not know about. */
function setProps(editor: unknown, id: string, props: Record<string, unknown>) {
  (editor as { updateBlock: (id: string, update: { props: Record<string, unknown> }) => void }).updateBlock(id, {
    props,
  });
}

/**
 * The row: its lanes' shares, and the controls for the row as a whole.
 *
 * The element itself is nearly empty on purpose — everything visible is in the
 * lanes, which BlockNote renders in the block group beside this. It still has
 * to draw something, because a block with no content element is a block
 * ProseMirror cannot place a selection near.
 */
export function ColumnRow({ blockId, widths }: { blockId: string; widths: string }) {
  const editor = useBlockNoteEditor();
  const row = rowBlock(editor.getBlock(blockId));
  const lanes = lanesOf(row);
  const laneIds = lanes.map((lane) => lane.id);

  // **Every lane or none.** A row where only some lanes have a stored share
  // cannot be drawn honestly, so `laneShares` says so and the even split in
  // page.css stands. See column-service.ts.
  const shares = laneShares(laneIds, widths);
  // **The selector matches the base rule's shape on purpose.** page.css sizes
  // every lane with `.node-pageColumns + .bn-block-group > .bn-block-outer` —
  // three classes — and a rule of two loses to it however specific an id looks.
  // The first version of this wrote perfectly good widths that never applied,
  // and a drag appeared to do nothing at all.
  const css = (shares ?? [])
    .map(
      (share, at) =>
        `.node-pageColumns + .bn-block-group > .bn-block-outer[data-id="${laneIds[at]}"]` +
        `{flex-grow:${Math.round(share)}}`,
    )
    .join("\n");

  /** The row as it is *now*, not as it was when this was last drawn. */
  function lanesNow(): DocumentBlock[] {
    return lanesOf(rowBlock(editor.getBlock(blockId)));
  }

  /** Adds a lane at the end, and puts the row back to an even split. */
  function addLane() {
    const now = lanesNow();
    const last = now[now.length - 1]?.id;
    if (!last) return;
    editor.transact(() => {
      editor.insertBlocks([{ type: COLUMN_TYPE, children: [{ type: "paragraph" }] } as never], last, "after");
      // The shares no longer cover every lane, so they would be ignored anyway.
      // Clearing them says so rather than leaving behind a list that means
      // nothing.
      setProps(editor, blockId, { widths: "" });
    });
  }

  /**
   * Takes the row apart and keeps everything in it.
   *
   * **The escape hatch, and her report is why it exists**: with only BlockNote's
   * own Delete on offer, the way out of a row was one that took the writing
   * with it. This is the way out that does not.
   */
  function ungroup() {
    // **Read at the moment it is pressed.** Typing inside a lane does not
    // necessarily re-render the row that holds it, so the copy captured at
    // render time can be a lane or two out of date — the first version of this
    // dropped everything written since the row last drew itself.
    const writing = lanesNow().flatMap((lane) => lane.children ?? []);
    editor.replaceBlocks([blockId], (writing.length > 0 ? writing : [{ type: "paragraph" }]) as never);
  }

  return (
    <div className="page-columns" contentEditable={false}>
      {css !== "" && createPortal(<style>{css}</style>, document.head)}
      <div className="page-columns-tools">
        <button type="button" onClick={addLane} title="Add a column">
          <Plus size={13} /> Column
        </button>
        <button type="button" onClick={ungroup} title="Put this back to ordinary paragraphs">
          <Columns2 size={13} /> Ungroup
        </button>
      </div>
    </div>
  );
}

/**
 * One lane: its own remove, and the divider on its trailing edge.
 *
 * The lane's box is `.bn-block-outer` and the writing in it is the block group
 * beside this element — both BlockNote's. All this contributes is something to
 * grab and something to press.
 */
export function ColumnLane({ blockId }: { blockId: string }) {
  const editor = useBlockNoteEditor();
  const parent = rowBlock(editor.getParentBlock(blockId));
  const laneIds = lanesOf(parent).map((lane) => lane.id);
  const at = laneIds.indexOf(blockId);

  /**
   * Removes this lane and gives its writing to a neighbour.
   *
   * **Not a delete**, which is the whole point: writing disappearing when a
   * column is removed is what this is here to stop. The writing moves one lane
   * over, and if that leaves a single lane the repair pass unwraps the row and
   * puts everything back on the page. See column-service.ts.
   */
  function remove() {
    const keeper = laneToKeepWriting(laneIds, blockId);
    const mine = (editor.getBlock(blockId) as DocumentBlock | undefined)?.children ?? [];
    editor.transact(() => {
      if (keeper) {
        const kept = (editor.getBlock(keeper) as DocumentBlock | undefined)?.children ?? [];
        (editor.updateBlock as (id: string, update: { children: unknown[] }) => void)(keeper, {
          children: [...kept, ...mine],
        });
      }
      editor.removeBlocks([blockId]);
    });
  }

  // **The divider hangs off a lane's own trailing edge, not in the gap beside
  // the next one**, and that is not a style preference. BlockNote puts a
  // block's drag handle in the space to its left: measured in the running app,
  // a lane starting at x=620 had `.bn-side-menu` covering 604–644, exactly
  // where a divider centred in a 24px gap sits. Pointer-down went to the handle
  // every time and the drag never started.
  const hasDivider = at >= 0 && at < laneIds.length - 1;

  return (
    <div className="page-column" contentEditable={false}>
      {laneIds.length > 1 && (
        <button
          type="button"
          className="page-column-remove"
          onClick={remove}
          title="Remove this column, keep the writing"
          aria-label="Remove this column"
        >
          <X size={12} />
        </button>
      )}
      {parent && hasDivider && <ColumnDivider rowId={parent.id} at={at} />}
    </div>
  );
}

/**
 * The line between two lanes, dragged to give one of them more room.
 *
 * **It moves that pair and nothing else.** The two lanes either side split the
 * space they already had between them, so every other lane in the row stays
 * exactly where it was — which is what makes a row of three adjustable at all.
 */
function ColumnDivider({ rowId, at }: { rowId: string; at: number }) {
  const editor = useBlockNoteEditor();
  const handle = useRef<HTMLDivElement>(null);
  // **A ref rather than state, and that is not a micro-optimisation.** Setting
  // state here re-renders the node view, BlockNote rebuilds the element the
  // pointer was captured on, and every move after the first goes somewhere
  // else — the drag silently did nothing.
  const dragging = useRef(false);

  /** Every lane's share as it stands, stored or evenly split. */
  function current(): { laneIds: string[]; shares: number[] } {
    const row = rowBlock(editor.getBlock(rowId));
    const laneIds = lanesOf(row).map((lane) => lane.id);
    const stored = laneShares(laneIds, row?.props.widths);
    return { laneIds, shares: stored ?? laneIds.map(() => 100 / Math.max(1, laneIds.length)) };
  }

  /** Moves the pair either side of this divider, leaving every other lane. */
  function split(before: number) {
    const { laneIds, shares } = current();
    if (shares.length < at + 2) return;
    const pairShare = shares[at] + shares[at + 1];
    const kept = Math.min(pairShare - COLUMN_WIDTH_MIN, Math.max(COLUMN_WIDTH_MIN, before));
    const next = [...shares];
    next[at] = kept;
    next[at + 1] = pairShare - kept;
    setProps(editor, rowId, { widths: widthsAfterDrag(laneIds, next) });
  }

  /** The pair this divider sits between, as boxes on screen. */
  function pair() {
    const mine = handle.current?.closest<HTMLElement>(".bn-block-outer");
    const theirs = mine?.nextElementSibling as HTMLElement | null;
    return mine && theirs ? { mine, theirs } : null;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    // Without this the drag selects the writing it crosses, and the gesture
    // ends with a selection spanning two lanes.
    event.preventDefault();
    dragging.current = true;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const boxes = pair();
    if (!boxes) return;
    const left = boxes.mine.getBoundingClientRect().left;
    const right = boxes.theirs.getBoundingClientRect().right;
    if (right <= left) return;
    const { shares } = current();
    const pairShare = shares[at] + shares[at + 1];
    split(snapBlockWidth(((event.clientX - left) / (right - left)) * pairShare, COLUMN_WIDTH_MIN));
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragging.current = false;
  }

  // Dragging must not be the only way to move a divider, for the reason the
  // shell's panel handles carry the same keys: a two-hand precision drag is
  // exactly what is hard for the people that decision was made for.
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = event.key === "ArrowLeft" ? -5 : event.key === "ArrowRight" ? 5 : 0;
    if (step === 0) return;
    event.preventDefault();
    split(current().shares[at] + step);
  }

  return (
    <div
      ref={handle}
      className="column-divider"
      role="separator"
      aria-orientation="vertical"
      aria-label="Column width"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
    />
  );
}
