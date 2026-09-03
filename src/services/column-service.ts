// What keeps a row of columns honest. Phase 19.5.
//
// **A row is a container with no way to say what it may contain.** BlockNote
// blocks can hold any block as a child, and a row draws every child of its own
// as a lane — so a paragraph that ends up in a row *becomes a column*. That is
// not a hypothetical: pressing Enter in the wrong place and dragging a block
// around both did it, and a page came back with five lanes, two of them one
// character wide. Reported 2026-09-02 with a screenshot.
//
// **So the shape is repaired rather than prevented.** After every change the
// document is read, anything that is not a lane is moved out of the row, and a
// row that no longer holds two lanes is unwrapped with its writing kept. Doing
// it here — plain functions over the document, no editor — is what makes it
// testable without launching the app.
//
// The widths live here too, and they are **keyed by lane id rather than by
// position**. Positional widths were the second half of that screenshot: the
// rules said "first lane 67%, second 33%", so the moment a stray child changed
// what "first" and "second" meant, the shares landed on the wrong lanes.

/** As much of a BlockNote block as any of this needs to know. */
export type DocumentBlock = {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  children?: DocumentBlock[];
};

/** The row block, and one lane inside it. Kept as strings — see schema.ts. */
export const COLUMN_ROW_TYPE = "pageColumns";
export const COLUMN_LANE_TYPE = "pageColumn";

/** The fewest lanes a row is: one lane is not columns, it is a page. */
export const MIN_LANES = 2;

const PAIR_SEPARATOR = ",";
const KEY_SEPARATOR = "=";

/**
 * A row's stored widths, as a share per lane id.
 *
 * Unreadable entries are dropped rather than guessed at: a share is only ever
 * used when *every* lane has one (see `laneShares`), so a half-read list is the
 * same as no list.
 */
export function parseLaneWidths(value: string | undefined): Map<string, number> {
  const widths = new Map<string, number>();
  for (const pair of (value ?? "").split(PAIR_SEPARATOR)) {
    const [id, share] = pair.split(KEY_SEPARATOR);
    const width = Number(share);
    if (id && Number.isFinite(width) && width > 0) widths.set(id, width);
  }
  return widths;
}

export function serialiseLaneWidths(widths: Map<string, number>): string {
  return [...widths]
    .map(([id, width]) => `${id}${KEY_SEPARATOR}${Math.round(width)}`)
    .join(PAIR_SEPARATOR);
}

/**
 * What each lane's share should be, in order — or `null` for "share evenly".
 *
 * **Every lane or none.** A row where three lanes have stored shares and a
 * fourth does not cannot be drawn honestly: whatever the fourth is given is a
 * number nobody chose, and mixing a stored 67 with a default of 1 is how a lane
 * ends up a single character wide. A lane added or removed therefore resets the
 * row to even, which is visible, undoable, and never wrong by accident.
 */
export function laneShares(laneIds: string[], stored: string | undefined): number[] | null {
  const widths = parseLaneWidths(stored);
  if (widths.size !== laneIds.length) return null;
  if (!laneIds.every((id) => widths.has(id))) return null;
  return laneIds.map((id) => widths.get(id) as number);
}

/** What a row's widths become when two neighbours are dragged apart. */
export function widthsAfterDrag(laneIds: string[], shares: number[]): string {
  return serialiseLaneWidths(new Map(laneIds.map((id, at) => [id, shares[at]])));
}

/**
 * One thing wrong with the document's shape, and what to do about it.
 *
 * `eject` moves a block that is not a lane out of the row it is sitting in;
 * `unwrap` takes a row that no longer holds enough lanes apart, keeping
 * everything written inside it.
 */
export type ColumnRepair =
  | { kind: "eject"; rowId: string; blockId: string; block: DocumentBlock }
  | { kind: "unwrap"; rowId: string; blocks: DocumentBlock[] };

/**
 * Everything wrong with the rows in a document, outermost first.
 *
 * **One repair per row**, because applying one changes the positions the next
 * would have used — the caller applies what it gets and reads the document
 * again, which settles in a pass or two and cannot loop: every repair removes a
 * child from a row or removes the row.
 */
export function planColumnRepairs(document: DocumentBlock[]): ColumnRepair[] {
  const repairs: ColumnRepair[] = [];

  const walk = (blocks: DocumentBlock[]) => {
    for (const block of blocks) {
      if (block.type === COLUMN_ROW_TYPE) {
        const repair = repairFor(block);
        if (repair) repairs.push(repair);
        // A row that is about to be taken apart is not also searched: its lanes
        // are going to be moved wholesale, and a repair aimed at one of them
        // would name a block that no longer exists where it said it did.
        if (!repair) walk(block.children ?? []);
        continue;
      }
      walk(block.children ?? []);
    }
  };

  walk(document);
  return repairs;
}

function repairFor(row: DocumentBlock): ColumnRepair | null {
  const children = row.children ?? [];
  const stray = children.find((child) => child.type !== COLUMN_LANE_TYPE);
  if (stray) return { kind: "eject", rowId: row.id, blockId: stray.id, block: stray };

  if (children.length >= MIN_LANES) return null;
  // Fewer than two lanes left. Everything written in what remains comes out
  // into the page, in the order it was in, and the row goes.
  return { kind: "unwrap", rowId: row.id, blocks: children.flatMap((lane) => lane.children ?? []) };
}

/**
 * Which lane a removed lane's writing should join.
 *
 * The one to its left, because that is where the eye goes and because the
 * writing keeps its place in the row. The first lane hands its writing to the
 * lane on its right instead — anywhere else would move it past writing it used
 * to come before.
 */
export function laneToKeepWriting(laneIds: string[], removing: string): string | null {
  const at = laneIds.indexOf(removing);
  if (at === -1 || laneIds.length < 2) return null;
  return at === 0 ? laneIds[1] : laneIds[at - 1];
}

/**
 * Block types that hold no writing of their own.
 *
 * All four are ours, and all four are containers or pointers: what is written
 * "in" them lives somewhere else — in `node.blocks`, or in the lanes' children.
 */
export const BLOCKS_WITHOUT_TEXT = new Set([COLUMN_ROW_TYPE, COLUMN_LANE_TYPE, "blockRef", "infobox"]);

/**
 * Whether a selection is on something with no writing in it — in which case
 * the formatting bar has nothing to offer and should not be drawn.
 *
 * **This is a bug she found rather than a tidy-up.** Every item in that bar
 * hides itself when it does not apply, so selecting a row of columns left the
 * bar on screen as an empty ten-pixel strip with a border and a shadow, which
 * reads as something half-loaded. Read live from her running app: zero
 * children, 10px tall, one node selected, and that node the row.
 */
export function selectionHoldsNoText(blocks: { type: string }[]): boolean {
  return blocks.length > 0 && blocks.every((block) => BLOCKS_WITHOUT_TEXT.has(block.type));
}
