// The hands half of clone-on-paste. `findRepeatedClaims` decides *which*
// pointer moves — those tests are in block-service.test.ts — and this checks
// that what comes back is turned into the right editor calls, including the
// case the loop exists for: two repeats inside one frame, where the second
// write has to be made from a list the first one already changed.
import { describe, expect, it } from "vitest";
import { applyPointerClones, type PointerEditor } from "./apply-pointer-clones";

type Update = { id: string; props: Record<string, unknown> };

/**
 * A document that answers `updateBlock` by editing itself, which is what makes
 * the re-read between passes mean anything — a fake that recorded calls without
 * applying them would pass whether or not the loop worked.
 */
function fakeEditor(document: Record<string, unknown>[]): PointerEditor & { updates: Update[] } {
  const updates: Update[] = [];
  return {
    document,
    updates,
    transact: (run) => run(),
    updateBlock(id, update) {
      updates.push({ id, props: update.props });
      const block = document.find((entry) => entry.id === id);
      if (block) block.props = { ...(block.props as object), ...update.props };
    },
  };
}

const ref = (id: string, blockId: string) => ({ id, type: "blockRef", props: { blockId } });
const frame = (id: string, ids: string[]) => ({ id, type: "infobox", props: { blockIds: ids.join(",") } });

describe("applyPointerClones", () => {
  it("leaves a document where every pointer is its own alone", () => {
    const editor = fakeEditor([ref("e1", "a"), ref("e2", "b")]);
    expect(applyPointerClones(editor, [], () => "copy")).toBe(false);
    expect(editor.updates).toEqual([]);
  });

  it("aims the second pointer at a copy of the block", () => {
    const editor = fakeEditor([ref("e1", "a"), ref("e2", "a")]);
    expect(applyPointerClones(editor, [], (blockId) => `${blockId}-copy`)).toBe(true);
    expect(editor.updates).toEqual([{ id: "e2", props: { blockId: "a-copy" } }]);
  });

  it("rewrites one entry of a frame's list and leaves the rest", () => {
    const editor = fakeEditor([ref("e1", "b"), frame("e2", ["a", "b", "c"])]);
    applyPointerClones(editor, [], (blockId) => `${blockId}-copy`);
    expect(editor.updates).toEqual([{ id: "e2", props: { blockIds: "a,b-copy,c" } }]);
  });

  // The reason it runs one at a time and re-reads: the second repeat has to be
  // written from the list the first pass produced, not the one it was planned
  // against.
  it("handles two repeats inside one frame", () => {
    const editor = fakeEditor([frame("e1", ["a", "a", "a"])]);
    let minted = 0;
    applyPointerClones(editor, [], () => `copy-${++minted}`);
    expect((editor.document[0] as { props: unknown }).props).toEqual({ blockIds: "a,copy-1,copy-2" });
  });

  it("counts what another tab claims, so a copy pasted into a second tab is a copy", () => {
    const editor = fakeEditor([ref("e1", "a")]);
    applyPointerClones(editor, ["a"], () => "a-copy");
    expect(editor.updates).toEqual([{ id: "e1", props: { blockId: "a-copy" } }]);
  });

  // Two views of one block is a poor state; a pointer at a block that does not
  // exist is a worse one, so a copy that cannot be made leaves things as they
  // are rather than aiming at nothing.
  it("leaves the pointer alone when the record cannot be copied", () => {
    const editor = fakeEditor([ref("e1", "a"), ref("e2", "a")]);
    expect(applyPointerClones(editor, [], () => undefined)).toBe(false);
    expect(editor.updates).toEqual([]);
  });
});
