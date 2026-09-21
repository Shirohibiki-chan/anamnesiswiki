import { describe, expect, it } from "vitest";
import { BOARD_EXPORT_CARD_FILL, BOARD_NOTE_FILLS, BOARD_NOTE_LINK, BOARD_PAGE_LINK_PREFIX, BOARD_VIDEO_LINK } from "../constants/board";
import { createBoard } from "./board-service";
import { boardHasDrawing, boardPictureDataUrl, boardPictureFileName, exportSkeletonFor, exportableElements } from "./board-export";

const box = (id: string, type: string, extra: Record<string, unknown> = {}) => ({ id, type, x: 10, y: 20, width: 200, height: 100, angle: 0.5, opacity: 100, ...extra });

describe("exportSkeletonFor", () => {
  const pageName = (id: string) => (id === "p1" ? "Longford" : null);

  it("swaps a page card for a filled box labelled with the page's name, in its place and turned its way", () => {
    const skeleton = exportSkeletonFor(box("c", "embeddable", { link: `${BOARD_PAGE_LINK_PREFIX}p1` }), pageName);
    expect(skeleton).toMatchObject({ type: "rectangle", id: "c", x: 10, y: 20, width: 200, height: 100, angle: 0.5, backgroundColor: BOARD_EXPORT_CARD_FILL });
    expect(skeleton?.label).toMatchObject({ text: "Longford", textAlign: "center", verticalAlign: "middle" });
    expect(exportSkeletonFor(box("c", "embeddable", { link: `${BOARD_PAGE_LINK_PREFIX}gone` }), pageName)?.label.text).toBe("A page that is gone");
  });

  it("swaps a note for a box in its colour with its words at the top, a video and a bookmark for labelled boxes", () => {
    const note = exportSkeletonFor(box("n", "embeddable", { link: BOARD_NOTE_LINK, customData: { note: { colour: "teal", lines: [[{ text: "Buy " }, { text: "milk", bold: true }], [{ text: "today" }]] } } }), pageName);
    expect(note).toMatchObject({ backgroundColor: BOARD_NOTE_FILLS.teal, strokeColor: "transparent", roundness: null });
    expect(note?.label).toMatchObject({ text: "Buy milk\ntoday", textAlign: "left", verticalAlign: "top" });
    expect(exportSkeletonFor(box("v", "embeddable", { link: BOARD_VIDEO_LINK, customData: { video: { file: "clip.mp4" } } }), pageName)?.label.text).toBe("Video — clip.mp4");
    const bookmark = exportSkeletonFor(box("b", "embeddable", { link: "https://example.com/x", customData: { bookmark: { url: "https://example.com/x", title: "Example", site: "example.com" } } }), pageName);
    expect(bookmark?.label.text).toBe("Example\nexample.com");
  });

  it("leaves the library's own shapes alone", () => {
    expect(exportSkeletonFor(box("r", "rectangle"), pageName)).toBeNull();
    expect(exportSkeletonFor(box("t", "text", { text: "hi" }), pageName)).toBeNull();
  });
});

describe("exportableElements", () => {
  it("keeps the order, hands embeds to the converter, and drops what is deleted", () => {
    const elements = [box("r", "rectangle"), box("c", "embeddable", { link: `${BOARD_PAGE_LINK_PREFIX}p1` }), box("gone", "ellipse", { isDeleted: true }), box("t", "text", { text: "top" })];
    const out = exportableElements(elements, () => "Page", (skeleton) => [{ ...box(skeleton.id, "rectangle"), converted: true }, box(`${skeleton.id}-text`, "text")]);
    expect(out.map((element) => element.id)).toEqual(["r", "c", "c-text", "t"]);
    expect((out[1] as { converted?: boolean }).converted).toBe(true);
  });
});

describe("the picture's home", () => {
  it("is named by the page's id, and travels as a data address in one file", () => {
    expect(boardPictureFileName("abc")).toBe("board-abc.png");
    expect(boardPictureDataUrl(new Uint8Array([1, 2, 3]))).toBe("data:image/png;base64,AQID");
  });

  it("knows an empty board from a drawn one", () => {
    expect(boardHasDrawing(createBoard())).toBe(false);
    expect(boardHasDrawing({ ...createBoard(), elements: [box("gone", "rectangle", { isDeleted: true })] })).toBe(false);
    expect(boardHasDrawing({ ...createBoard(), elements: [box("r", "rectangle")] })).toBe(true);
    expect(boardHasDrawing(undefined)).toBe(false);
  });
});
