import { BlockNoteEditor } from "@blocknote/core";
import { EditorState, Selection, TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vitest";
import { settleGapCursor } from "./callout-caret";
import { editorSchema } from "./editor-schema";

/**
 * A gap cursor as ProseMirror's own reports itself — `toJSON().type` is what
 * the guard reads, so it need not be the real class, which BlockNote keeps
 * behind its own dependency and does not re-export.
 */
type ResolvedPos = Selection["$from"];

class GapAt extends Selection {
  constructor($pos: ResolvedPos) {
    super($pos, $pos);
  }
  map(doc: Parameters<Selection["map"]>[0], mapping: Parameters<Selection["map"]>[1]): Selection {
    return new GapAt(doc.resolve(mapping.map(this.$from.pos)));
  }
  eq(other: Selection): boolean {
    return other instanceof GapAt && other.$from.pos === this.$from.pos;
  }
  toJSON() {
    return { type: "gapcursor", pos: this.$from.pos };
  }
}

function stateWith(content: object[]) {
  const editor = BlockNoteEditor.create({ schema: editorSchema, initialContent: content as never });
  return editor.prosemirrorState;
}

const CALLOUT = { type: "calloutInfo", content: "What this page is for." };
const PARAGRAPH = { type: "paragraph", content: "Start writing." };

describe("a gap cursor beside a callout's words", () => {
  it("is moved forward into them when it sits before the callout", () => {
    const base = stateWith([CALLOUT, PARAGRAPH]);
    // doc(0) > blockGroup(1) > blockContainer(2) > calloutInfo: the gap is at 2.
    const state = EditorState.create({ doc: base.doc, plugins: base.plugins, selection: new GapAt(base.doc.resolve(2)) });
    const tr = settleGapCursor(state);
    expect(tr).not.toBeNull();
    const after = state.apply(tr!);
    expect(after.selection).toBeInstanceOf(TextSelection);
    expect(after.selection.$from.parent.type.name).toBe("calloutInfo");
    expect(after.selection.$from.parentOffset).toBe(0);
  });

  it("is moved back into them when it sits after the callout, before its children", () => {
    const base = stateWith([{ ...CALLOUT, children: [PARAGRAPH] }]);
    const container = base.doc.child(0).child(0);
    const afterContent = 2 + container.child(0).nodeSize;
    const state = EditorState.create({ doc: base.doc, plugins: base.plugins, selection: new GapAt(base.doc.resolve(afterContent)) });
    const after = state.apply(settleGapCursor(state)!);
    expect(after.selection.$from.parent.type.name).toBe("calloutInfo");
    expect(after.selection.$from.parentOffset).toBe(after.selection.$from.parent.content.size);
  });

  it("leaves a gap cursor between blocks alone", () => {
    const base = stateWith([CALLOUT, PARAGRAPH]);
    // Between the two block containers, inside the block group.
    const between = 1 + base.doc.child(0).child(0).nodeSize;
    expect(base.doc.resolve(between).parent.type.name).toBe("blockGroup");
    const state = EditorState.create({ doc: base.doc, plugins: base.plugins, selection: new GapAt(base.doc.resolve(between)) });
    expect(settleGapCursor(state)).toBeNull();
  });

  it("does nothing to an ordinary text selection", () => {
    const state = stateWith([CALLOUT]);
    expect(settleGapCursor(state)).toBeNull();
  });
});
