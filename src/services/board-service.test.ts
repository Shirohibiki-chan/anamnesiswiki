// Board spike, 2026-09-13. The service is thin on purpose — see the file —
// so these are about the two things it does decide: what a damaged file
// reads as, and what a save leaves out.
import { describe, expect, it } from "vitest";
import { boardFingerprint, boardFromScene, createBoard, readBoard } from "./board-service";

describe("readBoard", () => {
  it("reads a damaged or foreign file as an empty board rather than failing", () => {
    expect(readBoard(null)).toEqual(createBoard());
    expect(readBoard("not json we wrote")).toEqual(createBoard());
    expect(readBoard({ elements: "nope", appState: 3, files: [] })).toEqual({
      version: 1,
      elements: [],
      appState: {},
      files: {},
    });
  });

  it("keeps what the library wrote without reading inside it", () => {
    const element = { id: "a", type: "rectangle", version: 4, anything: { nested: true } };
    const board = readBoard({ elements: [element], appState: { viewBackgroundColor: "#111" }, files: { f: { x: 1 } } });
    expect(board.elements).toEqual([element]);
    expect(board.appState).toEqual({ viewBackgroundColor: "#111" });
    expect(board.files).toEqual({ f: { x: 1 } });
  });
});

describe("boardFromScene", () => {
  const kept = { id: "a", type: "image", version: 2, isDeleted: false, fileId: "pic" };
  const gone = { id: "b", type: "rectangle", version: 9, isDeleted: true };
  const files = { pic: { id: "pic" }, orphan: { id: "orphan" } };

  it("drops deleted elements and the pictures nothing points at any more", () => {
    const board = boardFromScene([kept, gone], {}, files);
    expect(board.elements).toEqual([kept]);
    expect(Object.keys(board.files)).toEqual(["pic"]);
  });

  it("keeps only the view state worth reopening to", () => {
    const board = boardFromScene([], { viewBackgroundColor: "#fff", selectedElementIds: { a: true }, zoom: { value: 2 } }, {});
    expect(board.appState).toEqual({ viewBackgroundColor: "#fff", zoom: { value: 2 } });
  });
});

describe("boardFingerprint", () => {
  it("changes when an element is edited or deleted, and not when the selection moves", () => {
    const a = { id: "a", version: 1, isDeleted: false };
    const before = boardFingerprint([a], { selectedElementIds: { a: true } });
    expect(boardFingerprint([a], { selectedElementIds: {} })).toBe(before);
    expect(boardFingerprint([{ ...a, version: 2 }], {})).not.toBe(before);
    expect(boardFingerprint([{ ...a, isDeleted: true }], {})).not.toBe(before);
  });
});
