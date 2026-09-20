import { describe, expect, it } from "vitest";
import { BOARD_NOTE_LINK, BOARD_PAGE_LINK_PREFIX, BOARD_VIDEO_LINK } from "../constants/board";
import { boardLayers, hiddenFields, layerKindName, layerOffScreen, layerUnit, movedLayer, shownFields } from "./board-layers";

type El = Record<string, unknown> & { id: string };

const box = (id: string, type: string, extra: Record<string, unknown> = {}): El => ({ id, type, x: 0, y: 0, width: 100, height: 50, opacity: 100, locked: false, isDeleted: false, ...extra });

describe("boardLayers", () => {
  it("lists the board top to bottom, each named by its kind or its words", () => {
    const elements = [
      box("r", "rectangle"),
      box("t", "text", { text: "Hello there\nsecond line" }),
      box("f", "freedraw"),
      box("h", "freedraw", { customData: { highlight: true } }),
      box("i", "image"),
      box("e", "ellipse"),
    ];
    expect(boardLayers(elements).map((layer) => [layer.id, layer.kind, layer.name])).toEqual([
      ["e", "ellipse", "Ellipse"],
      ["i", "picture", "Picture"],
      ["h", "highlight", "Highlight"],
      ["f", "drawing", "Drawing"],
      ["t", "text", "Hello there"],
      ["r", "rectangle", "Rectangle"],
    ]);
  });

  it("names the app's embeds, and leaves a page card's name to the page", () => {
    const elements = [
      box("p", "embeddable", { link: `${BOARD_PAGE_LINK_PREFIX}page-1` }),
      box("n", "embeddable", { link: BOARD_NOTE_LINK, customData: { note: { colour: "yellow", lines: [[{ text: "Buy " }, { text: "milk", bold: true }], [{ text: "later" }]] } } }),
      box("v", "embeddable", { link: BOARD_VIDEO_LINK, customData: { video: { file: "clip.mp4" } } }),
      box("b", "embeddable", { link: "https://example.com/x", customData: { bookmark: { url: "https://example.com/x", title: "Example" } } }),
      box("m", "embeddable", { link: BOARD_NOTE_LINK, customData: { note: { colour: "pink", lines: [] } } }),
    ];
    expect(boardLayers(elements).map((layer) => [layer.kind, layer.name, layer.pageId])).toEqual([
      ["note", "Note", null],
      ["bookmark", "Example", null],
      ["video", "clip.mp4", null],
      ["note", "Buy milk", null],
      ["page", "", "page-1"],
    ]);
  });

  it("folds bound words into their shape's row, and leaves out what is deleted", () => {
    const elements = [
      box("r", "rectangle", { boundElements: [{ id: "w", type: "text" }] }),
      box("w", "text", { text: "Label", containerId: "r" }),
      box("gone", "ellipse", { isDeleted: true }),
      box("orphan", "text", { text: "Loose", containerId: "gone" }),
    ];
    expect(boardLayers(elements).map((layer) => [layer.id, layer.name])).toEqual([
      ["orphan", "Loose"],
      ["r", "Label"],
    ]);
  });

  it("lists a frame's shapes under the frame's row, marked with the frame, and marks locked and hidden", () => {
    const elements = [
      box("below", "rectangle"),
      box("frame", "frame", { name: "Scene 1" }),
      box("a", "ellipse", { frameId: "frame", locked: true }),
      box("b", "diamond", { frameId: "frame", opacity: 0, locked: true, customData: { hidden: { opacity: 100, locked: false } } }),
      box("above", "text", { text: "Top" }),
    ];
    expect(boardLayers(elements).map((layer) => [layer.id, layer.name, layer.frameId, layer.locked, layer.hidden])).toEqual([
      ["above", "Top", null, false, false],
      ["frame", "Scene 1", null, false, false],
      ["b", "Diamond", "frame", true, true],
      ["a", "Ellipse", "frame", true, false],
      ["below", "Rectangle", null, false, false],
    ]);
    expect(layerKindName("frame")).toBe("Frame");
  });
});

describe("layerUnit", () => {
  it("is the shape and its bound words, or a frame and everything in it", () => {
    const elements = [
      box("frame", "frame"),
      box("r", "rectangle", { frameId: "frame" }),
      box("w", "text", { containerId: "r", frameId: "frame" }),
      box("other", "ellipse"),
    ];
    expect([...layerUnit(elements, "r")].sort()).toEqual(["r", "w"]);
    expect([...layerUnit(elements, "frame")].sort()).toEqual(["frame", "r", "w"]);
    expect([...layerUnit(elements, "other")]).toEqual(["other"]);
  });
});

describe("movedLayer", () => {
  const ids = (elements: readonly El[] | null) => elements?.map((element) => element.id) ?? null;

  it("puts the moved shape just above or below the target, in the drawing's order", () => {
    const elements = [box("a", "rectangle"), box("b", "ellipse"), box("c", "diamond")];
    // "Above" in the panel is later in the list.
    expect(ids(movedLayer(elements, "a", "c", "above"))).toEqual(["b", "c", "a"]);
    expect(ids(movedLayer(elements, "c", "a", "below"))).toEqual(["c", "a", "b"]);
    expect(ids(movedLayer(elements, "a", "b", "below"))).toEqual(["a", "b", "c"]);
  });

  it("moves a shape with its bound words, and a frame with everything in it", () => {
    const elements = [
      box("r", "rectangle"),
      box("w", "text", { containerId: "r" }),
      box("frame", "frame"),
      box("in", "ellipse", { frameId: "frame" }),
      box("top", "diamond"),
    ];
    expect(ids(movedLayer(elements, "r", "top", "above"))).toEqual(["frame", "in", "top", "r", "w"]);
    expect(ids(movedLayer(elements, "top", "frame", "below"))).toEqual(["r", "w", "top", "frame", "in"]);
    // Above a frame's row is above everything in the frame.
    expect(ids(movedLayer(elements, "r", "frame", "above"))).toEqual(["frame", "in", "r", "w", "top"]);
  });

  it("refuses a move onto itself, into its own unit, or across a frame's edge", () => {
    const elements = [box("frame", "frame"), box("in", "ellipse", { frameId: "frame" }), box("out", "rectangle")];
    expect(movedLayer(elements, "out", "out", "above")).toBeNull();
    expect(movedLayer(elements, "frame", "in", "above")).toBeNull();
    expect(movedLayer(elements, "out", "in", "above")).toBeNull();
    expect(movedLayer(elements, "in", "out", "below")).toBeNull();
    expect(movedLayer(elements, "out", "missing", "below")).toBeNull();
  });

  it("leaves deleted elements where they were", () => {
    const elements = [box("a", "rectangle"), box("gone", "ellipse", { isDeleted: true }), box("b", "diamond")];
    expect(ids(movedLayer(elements, "b", "a", "below"))).toEqual(["b", "a", "gone"]);
  });
});

describe("hiddenFields and shownFields", () => {
  it("hides a shape see-through and locked, and shows it as it was", () => {
    const shape = box("s", "rectangle", { opacity: 70, locked: false, customData: { note: 1 } });
    const hidden = hiddenFields(shape);
    expect(hidden).toEqual({ opacity: 0, locked: true, customData: { note: 1, hidden: { opacity: 70, locked: false } } });
    expect(shownFields({ ...shape, ...hidden })).toEqual({ opacity: 70, locked: false, customData: { note: 1 } });
    expect(shownFields(box("bare", "rectangle"))).toEqual({ opacity: 100, locked: false, customData: {} });
  });
});

describe("layerOffScreen", () => {
  it("tells a shape wholly off the screen from one partly on it", () => {
    const view = { scrollX: 0, scrollY: 0, zoom: 1, width: 800, height: 600 };
    expect(layerOffScreen(box("on", "rectangle", { x: 100, y: 100 }), view)).toBe(false);
    expect(layerOffScreen(box("edge", "rectangle", { x: 750, y: 580 }), view)).toBe(false);
    expect(layerOffScreen(box("off", "rectangle", { x: 900, y: 100 }), view)).toBe(true);
    expect(layerOffScreen(box("scrolled", "rectangle", { x: -300, y: 100 }), { ...view, scrollX: 250 })).toBe(false);
    expect(layerOffScreen(box("zoomed", "rectangle", { x: 500, y: 100 }), { ...view, zoom: 2 })).toBe(true);
  });
});
