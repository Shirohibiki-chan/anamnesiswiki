// Board spike, 2026-09-13. The service is thin on purpose — see the file —
// so these are about the two things it does decide: what a damaged file
// reads as, and what a save leaves out.
import { describe, expect, it } from "vitest";
import type { Node } from "../constants/schema";
import { BOARD_CARD_CASCADE, BOARD_CARD_HEIGHT, BOARD_CARD_WIDTH } from "../constants/board";
import {
  boardFingerprint,
  boardFromScene,
  boardLinkTarget,
  boardPageLinks,
  cardPageId,
  cardPlacement,
  cardPresentation,
  createBoard,
  draggedPageIds,
  isPageCard,
  linkCandidates,
  pageLinkFor,
  readBoard,
} from "./board-service";
import { linkTargets } from "./storyline-service";

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

describe("links", () => {
  const page = (id: string, name: string, extra: Partial<Node> = {}): Node =>
    ({ id, name, templateKey: "note", parentId: null, tabs: [], tags: [], properties: {}, ...extra }) as unknown as Node;
  const nodes: Record<string, Node> = {
    board: page("board", "Where the rivers go", { templateKey: "board" }),
    grey: page("grey", "Greyharbour", { aliases: ["the harbour"] }),
    sable1: page("sable1", "Sable"),
    sable2: page("sable2", "Sable"),
    verse: page("verse", "Canon", { templateKey: "universe" }),
  };

  it("follows a picker-written link by id, whatever the page is now called", () => {
    expect(boardLinkTarget(pageLinkFor("grey"), nodes)).toEqual({ kind: "page", pageId: "grey" });
    expect(boardLinkTarget(pageLinkFor("gone"), nodes)).toEqual({ kind: "missing", text: pageLinkFor("gone") });
  });

  it("resolves a hand-typed name or alias, and refuses a name two pages answer to", () => {
    expect(boardLinkTarget("  greyharbour ", nodes)).toEqual({ kind: "page", pageId: "grey" });
    expect(boardLinkTarget("The Harbour", nodes)).toEqual({ kind: "page", pageId: "grey" });
    expect(boardLinkTarget("Sable", nodes)).toEqual({ kind: "missing", text: "Sable" });
  });

  it("leaves a web address to the browser", () => {
    expect(boardLinkTarget("https://example.org/x", nodes)).toEqual({ kind: "external", url: "https://example.org/x" });
    expect(boardLinkTarget("mailto:someone@example.org", nodes).kind).toBe("external");
  });

  it("lists every page a board's shapes point at, once each", () => {
    const board = {
      ...createBoard(),
      elements: [
        { id: "a", link: pageLinkFor("grey") },
        { id: "b", link: "the harbour" },
        { id: "c", link: "https://example.org" },
        { id: "d", link: "Sable" },
        { id: "e" },
      ],
    };
    expect(boardPageLinks(board, nodes, linkTargets(nodes))).toEqual(["grey"]);
  });

  it("offers pages by name or alias, never the board itself or a universe", () => {
    expect(linkCandidates("harbour", "board", nodes, 8).map((node) => node.id)).toEqual(["grey"]);
    expect(linkCandidates("rivers", "board", nodes, 8)).toEqual([]);
    expect(linkCandidates("canon", "board", nodes, 8)).toEqual([]);
    expect(linkCandidates("sable", "board", nodes, 1)).toHaveLength(1);
  });
});

// ---- Page cards (Phase 32, step 1) ----

describe("isPageCard / cardPageId", () => {
  it("is an embed carrying a page link, and nothing else", () => {
    expect(isPageCard({ type: "embeddable", link: pageLinkFor("p1") })).toBe(true);
    expect(cardPageId({ type: "embeddable", link: pageLinkFor("p1") })).toBe("p1");
    // A shape with a page link is a linked shape, not a card.
    expect(isPageCard({ type: "rectangle", link: pageLinkFor("p1") })).toBe(false);
    // An embed of a website is the library's own kind of embed.
    expect(isPageCard({ type: "embeddable", link: "https://youtube.com/watch?v=x" })).toBe(false);
    expect(cardPageId({ type: "embeddable", link: null })).toBeNull();
    expect(cardPageId({})).toBeNull();
  });
});

describe("cardPresentation", () => {
  it("is the icon when narrow, a row when short, and the picture otherwise", () => {
    expect(cardPresentation(BOARD_CARD_WIDTH, BOARD_CARD_HEIGHT)).toBe("picture");
    expect(cardPresentation(400, 300)).toBe("picture");
    expect(cardPresentation(240, 60)).toBe("row");
    expect(cardPresentation(80, 80)).toBe("icon");
    // Narrow wins over short: a tiny square is the icon, not a squashed row.
    expect(cardPresentation(60, 40)).toBe("icon");
  });
});

describe("cardPlacement", () => {
  it("centres the first card and steps the rest down and to the right", () => {
    const centre = { x: 500, y: 300 };
    expect(cardPlacement(centre, 0)).toEqual({ x: 500 - BOARD_CARD_WIDTH / 2, y: 300 - BOARD_CARD_HEIGHT / 2 });
    const third = cardPlacement(centre, 2);
    expect(third.x - cardPlacement(centre, 0).x).toBe(2 * BOARD_CARD_CASCADE);
    expect(third.y - cardPlacement(centre, 0).y).toBe(2 * BOARD_CARD_CASCADE);
  });
});

describe("draggedPageIds", () => {
  it("reads the ids a tree drag wrote, and nothing it did not", () => {
    expect(draggedPageIds(JSON.stringify(["a", "b"]))).toEqual(["a", "b"]);
    expect(draggedPageIds(JSON.stringify(["a", 3, "", null]))).toEqual(["a"]);
    expect(draggedPageIds("not json")).toEqual([]);
    expect(draggedPageIds(JSON.stringify({ id: "a" }))).toEqual([]);
    expect(draggedPageIds("")).toEqual([]);
  });
});
