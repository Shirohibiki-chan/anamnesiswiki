// Making a pasted block a block of its own, in the editor. Phase 19.5.
//
// **The thinking is in `block-service.ts`; this is only the hands.** That file
// reads a document and says which pointers claim a block another pointer
// already has — see `findRepeatedClaims` — and this turns each of those into a
// clone and an aim somewhere new. Same split, and for the same reason, as
// `apply-column-repairs.ts` beside it: the rules stay testable without the app.
//
// **Why it exists at all.** A block in the writing is a pointer to a record in
// `node.blocks`, and copying that block copies the pointer. Two pointers at one
// record is two live views of the same thing — type in one and the other
// changes — which is defensible and is not what a paste means anywhere else in
// this app. So the record is cloned and the newer pointer aimed at the clone.
import { findRepeatedClaims, serialiseBlockIds } from "../block-service";

/**
 * The few editor methods a clone needs.
 *
 * Written out rather than imported, for the reason `RepairableEditor` gives:
 * the typed editor comes from `editor-schema.ts`, which imports the specs,
 * which import the components that call this — asking for the real type here
 * would be a cycle.
 */
export type PointerEditor = {
  document: unknown[];
  transact: <T>(run: () => T) => T;
  updateBlock: (id: string, update: { props: Record<string, unknown> }) => unknown;
};

/** How many passes before giving up, so a clone that does not settle cannot spin. */
const MAX_PASSES = 12;

/**
 * Aims every repeated pointer at a copy of what it was pointing at, and says
 * whether anything changed.
 *
 * `cloneBlock` makes the copy and hands back its id — the record lives in
 * `node.blocks`, which the editor knows nothing about. Returning nothing means
 * the copy could not be made, and the pointer is left alone: two views of one
 * block is a poor state, and a pointer at a block that does not exist is a
 * worse one.
 *
 * **One at a time, re-reading the document between passes**, exactly as the
 * column repairs do. Two repeats inside one infobox both rewrite that frame's
 * list, and the second would be written from a list that no longer exists.
 */
export function applyPointerClones(
  editor: PointerEditor,
  claimedElsewhere: Iterable<string>,
  cloneBlock: (blockId: string) => string | undefined,
): boolean {
  let cloned = false;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const repeats = findRepeatedClaims(editor.document, claimedElsewhere);
    if (repeats.length === 0) return cloned;

    const repeat = repeats[0];
    const copy = cloneBlock(repeat.blockId);
    if (!copy) return cloned;

    editor.transact(() => {
      if (repeat.index < 0) {
        editor.updateBlock(repeat.editorBlockId, { props: { blockId: copy } });
        return;
      }
      const ids = [...repeat.ids];
      ids[repeat.index] = copy;
      editor.updateBlock(repeat.editorBlockId, { props: { blockIds: serialiseBlockIds(ids) } });
    });
    cloned = true;
  }

  return cloned;
}
