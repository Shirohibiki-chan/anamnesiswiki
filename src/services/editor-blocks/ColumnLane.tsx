// A row of columns and one lane of it, as they are drawn. Phase 19.5.
//
// Split out of `columns.tsx` because that file's exports are block specs rather
// than components — the same reason `BlockRefSlot` is its own file. What a
// column *is* is in `columns.tsx`; this is what one looks like.
//
// **Nothing here writes to the editor's DOM, and that rule was learned the hard
// way.** The element that is actually a lane is `.bn-block-outer`, which
// BlockNote renders — so the first version set its `flex-grow` in a layout
// effect. ProseMirror watches its own DOM for changes it did not make: the
// write made it re-read the document, which re-rendered the node view, which
// wrote again. The editor locked up on the first insert with no error thrown,
// and the guard against writing the same value twice did not help, because the
// element itself was rebuilt each time round.
//
// **So the widths are applied as a stylesheet instead.** The row renders a
// handful of `nth-child` rules into `document.head`, keyed by its own block id.
// The editor's DOM is never touched, the rules die with the component, and a
// lane is sized by the same cascade that sizes everything else.
import { useRef } from "react";
import { createPortal } from "react-dom";
import { useBlockNoteEditor } from "@blocknote/react";
import { COLUMN_TYPE } from "../../constants/schema";
import { COLUMN_WIDTH_MIN, parseColumnWidths, serialiseColumnWidths, snapBlockWidth } from "../block-service";

/**
 * What this file needs to know about a block it looks up, and no more.
 *
 * **A cast rather than the real schema type, on purpose.** The typed editor
 * comes from `editor-schema.ts`, which imports the specs that import this file
 * — asking for it here would be a cycle. `useBlockNoteEditor()` with no
 * arguments is typed as the *default* schema, which has never heard of a
 * column, so the lookups below read through this shape instead.
 */
type RowBlock = { id: string; props: { widths: string }; children: { id: string; type: string }[] };

/**
 * The row: nothing to see, and every lane's share of it.
 *
 * The element itself is empty on purpose — everything visible is in the lanes,
 * which BlockNote renders in the block group beside this. It still has to draw
 * something, because a block with no content element is a block ProseMirror
 * cannot place a selection near.
 */
export function ColumnRow({ blockId, widths }: { blockId: string; widths: string }) {
  const editor = useBlockNoteEditor();
  const row = editor.getBlock(blockId) as unknown as RowBlock | undefined;
  const lanes = row?.children.filter((child) => child.type === COLUMN_TYPE).length ?? 0;

  // A row that has never been dragged writes no rules at all: the stylesheet
  // in page.css already shares the space evenly, and rules restating that would
  // be rules to keep in step with it.
  const shares = widths ? parseColumnWidths(widths, lanes) : [];
  const css = shares
    .map((share, at) => `[data-id="${blockId}"] > .bn-block-group > .bn-block-outer:nth-child(${at + 1})`
      + `{flex-grow:${Math.round(share)}}`)
    .join("\n");

  return (
    <div className="page-columns" contentEditable={false}>
      {css !== "" && createPortal(<style>{css}</style>, document.head)}
    </div>
  );
}

/**
 * One lane. Draws the divider on its leading edge and nothing else.
 *
 * The lane's own box is `.bn-block-outer` and the writing in it is the block
 * group beside this element — both BlockNote's. All this contributes is
 * something to grab.
 */
export function ColumnLane({ blockId }: { blockId: string }) {
  const editor = useBlockNoteEditor();
  const parent = editor.getParentBlock(blockId) as unknown as RowBlock | undefined;
  const at = parent?.children.findIndex((child) => child.id === blockId) ?? -1;
  const lanes = parent?.children.filter((child) => child.type === COLUMN_TYPE).length ?? 0;

  // **The divider hangs off a lane's own right edge, not in the gap beside the
  // next one**, and that is not a style preference. BlockNote puts a block's
  // drag handle in the space to its left: measured in the running app, a lane
  // starting at x=620 had its handle covering 604–644, which is exactly where a
  // divider centred in a 24px gap sits. Pointer-down went to the handle every
  // time and the drag never started. On its own lane's edge it clashes with
  // nothing, and it matches the width handles a block already has.
  //
  // The last lane draws none: the row's outer edge is the page's, and how wide
  // the row itself is is a question for the page rather than for a lane.
  return (
    <div className="page-column" contentEditable={false}>
      {parent && at >= 0 && at < lanes - 1 && <ColumnDivider rowId={parent.id} at={at} />}
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
  const dragging = useRef(false);

  /** Every lane's share as it stands, whether or not any of it is stored. */
  function shares(): number[] {
    const row = editor.getBlock(rowId) as unknown as RowBlock | undefined;
    const lanes = row?.children.filter((child) => child.type === COLUMN_TYPE).length ?? 0;
    return parseColumnWidths(row?.props.widths ?? "", lanes);
  }

  function setShares(next: number[]) {
    (editor.updateBlock as (id: string, update: { props: { widths: string } }) => void)(rowId, {
      props: { widths: serialiseColumnWidths(next) },
    });
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

    const current = shares();
    const pairShare = current[at] + current[at + 1];
    const wanted = ((event.clientX - left) / (right - left)) * pairShare;
    const before = Math.min(pairShare - COLUMN_WIDTH_MIN, snapBlockWidth(wanted, COLUMN_WIDTH_MIN));
    const next = [...current];
    next[at] = before;
    next[at + 1] = pairShare - before;
    setShares(next);
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
    const current = shares();
    const pairShare = current[at] + current[at + 1];
    const before = Math.min(pairShare - COLUMN_WIDTH_MIN, Math.max(COLUMN_WIDTH_MIN, current[at] + step));
    const next = [...current];
    next[at] = before;
    next[at + 1] = pairShare - before;
    setShares(next);
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
