// Putting a row of columns back into shape, in the editor. Phase 19.5.
//
// **The thinking is in `column-service.ts`; this is only the hands.** That file
// reads a document and says what is wrong with it — a block in a row that is
// not a lane, a row that no longer holds two lanes — and this turns each of
// those into editor calls. Keeping them apart is what lets the rules be tested
// without launching the app, which matters here more than usual: every one of
// these cases arrived as a bug report with a screenshot.
import { planColumnRepairs, type DocumentBlock } from "../column-service";

/**
 * The few editor methods a repair needs.
 *
 * Written out rather than imported: the typed editor comes from
 * `editor-schema.ts`, which imports the block specs, which import the component
 * that calls this — asking for the real type here would be a cycle. See the
 * same note in `ColumnLane.tsx`.
 */
export type RepairableEditor = {
  document: DocumentBlock[];
  transact: <T>(run: () => T) => T;
  insertBlocks: (blocks: unknown[], reference: string, placement: "before" | "after") => unknown;
  removeBlocks: (blocks: string[]) => unknown;
  replaceBlocks: (remove: string[], insert: unknown[]) => unknown;
};

/** How many passes before giving up, so a repair that does not settle cannot spin. */
const MAX_PASSES = 8;

/**
 * Repairs every row in the document, and says whether anything changed.
 *
 * **It loops, and the cap is the safety rail rather than the plan.** One repair
 * changes what the next would have to say, so the document is re-read after
 * each pass; every repair either takes a child out of a row or removes a row,
 * so the passes run out on their own. The cap is there in case a future repair
 * is not so well behaved — spinning forever inside a change handler is exactly
 * how this feature froze the app once already.
 */
export function applyColumnRepairs(editor: RepairableEditor): boolean {
  let repaired = false;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const repairs = planColumnRepairs(editor.document);
    if (repairs.length === 0) return repaired;

    const repair = repairs[0];
    editor.transact(() => {
      if (repair.kind === "eject") {
        // Out of the row and onto the page, immediately after it — where a
        // paragraph typed at the end of a row was trying to go anyway.
        editor.insertBlocks([repair.block], repair.rowId, "after");
        editor.removeBlocks([repair.blockId]);
        return;
      }
      // A row with fewer than two lanes is not columns any more. Everything
      // written in what is left takes its place, in order; a row with nothing
      // in it simply goes.
      if (repair.blocks.length > 0) editor.replaceBlocks([repair.rowId], repair.blocks);
      else editor.removeBlocks([repair.rowId]);
    });
    repaired = true;
  }

  return repaired;
}
