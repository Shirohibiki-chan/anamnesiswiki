import { describe, expect, it } from "vitest";
import {
  COLUMN_LANE_TYPE,
  COLUMN_ROW_TYPE,
  laneShares,
  laneToKeepWriting,
  parseLaneWidths,
  planColumnRepairs,
  serialiseLaneWidths,
  widthsAfterDrag,
  type DocumentBlock,
} from "./column-service";

const lane = (id: string, ...children: DocumentBlock[]): DocumentBlock => ({
  id,
  type: COLUMN_LANE_TYPE,
  children,
});
const row = (id: string, props: Record<string, unknown>, ...children: DocumentBlock[]): DocumentBlock => ({
  id,
  type: COLUMN_ROW_TYPE,
  props,
  children,
});
const text = (id: string): DocumentBlock => ({ id, type: "paragraph" });

describe("lane widths", () => {
  it("reads and writes a share per lane", () => {
    const widths = parseLaneWidths("a=67,b=33");
    expect([...widths]).toEqual([
      ["a", 67],
      ["b", 33],
    ]);
    expect(serialiseLaneWidths(widths)).toBe("a=67,b=33");
  });

  it("ignores an entry it cannot read rather than guessing", () => {
    expect([...parseLaneWidths("a=67,rubbish,b=,=33")]).toEqual([["a", 67]]);
    expect([...parseLaneWidths(undefined)]).toEqual([]);
  });

  it("shares evenly unless every lane has a width", () => {
    // The bug this exists to stop: a stored share landing on a lane that was
    // not there when it was stored. Two lanes' worth of widths on a row of
    // three left one lane a single character wide.
    expect(laneShares(["a", "b"], "a=67,b=33")).toEqual([67, 33]);
    expect(laneShares(["a", "b", "c"], "a=67,b=33")).toBeNull();
    expect(laneShares(["a", "b"], "a=67,c=33")).toBeNull();
    expect(laneShares(["a", "b"], "")).toBeNull();
  });

  it("writes every lane's share when one pair is dragged", () => {
    expect(widthsAfterDrag(["a", "b", "c"], [50, 25, 25])).toBe("a=50,b=25,c=25");
  });
});

describe("keeping a row's shape", () => {
  it("finds nothing wrong with an ordinary row", () => {
    const document = [row("r", { widths: "" }, lane("l1", text("p1")), lane("l2", text("p2")))];
    expect(planColumnRepairs(document)).toEqual([]);
  });

  it("ejects a block that is not a lane", () => {
    // How five columns happened: anything that ends up in a row is drawn as a
    // lane, so a stray paragraph *is* a column until it is moved out.
    const stray = text("stray");
    const document = [row("r", {}, lane("l1"), stray, lane("l2"))];
    expect(planColumnRepairs(document)).toEqual([
      { kind: "eject", rowId: "r", blockId: "stray", block: stray },
    ]);
  });

  it("unwraps a row left with one lane, keeping what was written in it", () => {
    const document = [row("r", {}, lane("l1", text("kept"), text("also kept")))];
    expect(planColumnRepairs(document)).toEqual([
      { kind: "unwrap", rowId: "r", blocks: [text("kept"), text("also kept")] },
    ]);
  });

  it("unwraps an empty row too, and asks for nothing to be kept", () => {
    expect(planColumnRepairs([row("r", {})])).toEqual([{ kind: "unwrap", rowId: "r", blocks: [] }]);
  });

  it("looks inside ordinary blocks, so a row nested in a list is still checked", () => {
    const document: DocumentBlock[] = [
      { id: "list", type: "bulletListItem", children: [row("r", {}, lane("l1"))] },
    ];
    expect(planColumnRepairs(document)).toEqual([{ kind: "unwrap", rowId: "r", blocks: [] }]);
  });

  it("does not also report the lanes of a row it is taking apart", () => {
    // Applying the unwrap moves those lanes wholesale; a second repair naming
    // one of them would name a block that has moved.
    const document = [row("r", {}, lane("l1", text("p")))];
    expect(planColumnRepairs(document)).toHaveLength(1);
  });
});

describe("removing a lane", () => {
  it("gives its writing to the lane on its left", () => {
    expect(laneToKeepWriting(["a", "b", "c"], "b")).toBe("a");
  });

  it("gives the first lane's writing to the one on its right", () => {
    expect(laneToKeepWriting(["a", "b"], "a")).toBe("b");
  });

  it("has nowhere to put it when there is only one lane", () => {
    expect(laneToKeepWriting(["a"], "a")).toBeNull();
  });
});
