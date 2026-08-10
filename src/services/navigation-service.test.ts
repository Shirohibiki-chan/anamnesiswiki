import { describe, expect, it } from "vitest";
import {
  canGoBack,
  canGoForward,
  EMPTY_NAV_HISTORY,
  forgetNodes,
  locationAt,
  NAV_HISTORY_LIMIT,
  stepBack,
  stepForward,
  visit,
  type NavHistory,
} from "./navigation-service";

/** Builds a history sitting at the end of a walk, the usual starting state. */
function walk(...locations: (string | null)[]): NavHistory {
  return locations.reduce(visit, EMPTY_NAV_HISTORY);
}

describe("visit", () => {
  it("records the first location", () => {
    const history = visit(EMPTY_NAV_HISTORY, "a");
    expect(history).toEqual({ entries: ["a"], index: 0 });
    expect(locationAt(history)).toBe("a");
  });

  it("ignores arriving where you already are", () => {
    const history = walk("a", "b");
    expect(visit(history, "b")).toBe(history);
  });

  // The tree re-selects the current node whenever selectedId changes for any
  // reason, so this is the common case rather than an edge one.
  it("ignores a repeat even after going back", () => {
    const history = stepBack(walk("a", "b", "c"));
    expect(visit(history, "b")).toBe(history);
    expect(canGoForward(visit(history, "b"))).toBe(true);
  });

  it("treats returning to a place you left as a new visit", () => {
    expect(walk("a", "b", "a")).toEqual({ entries: ["a", "b", "a"], index: 2 });
  });

  it("throws the forward stack away when you go somewhere new after going back", () => {
    const history = visit(stepBack(walk("a", "b", "c")), "d");
    expect(history).toEqual({ entries: ["a", "b", "d"], index: 2 });
    expect(canGoForward(history)).toBe(false);
  });

  it("keeps null as a location of its own", () => {
    const history = walk("a", null);
    expect(locationAt(history)).toBeNull();
    expect(canGoBack(history)).toBe(true);
    expect(locationAt(stepBack(history))).toBe("a");
  });

  it("drops the oldest entries past the cap and stays pointed at the newest", () => {
    const many = Array.from({ length: NAV_HISTORY_LIMIT + 10 }, (_, i) => `n${i}`);
    const history = walk(...many);
    expect(history.entries).toHaveLength(NAV_HISTORY_LIMIT);
    expect(history.index).toBe(NAV_HISTORY_LIMIT - 1);
    expect(locationAt(history)).toBe(`n${many.length - 1}`);
    expect(history.entries[0]).toBe("n10");
  });
});

describe("stepBack / stepForward", () => {
  it("walks backwards and forwards over the same entries", () => {
    const history = walk("a", "b", "c");
    expect(locationAt(stepBack(history))).toBe("b");
    expect(locationAt(stepBack(stepBack(history)))).toBe("a");
    expect(locationAt(stepForward(stepBack(stepBack(history))))).toBe("b");
  });

  it("refuses to walk off either end", () => {
    const history = walk("a");
    expect(canGoBack(history)).toBe(false);
    expect(canGoForward(history)).toBe(false);
    expect(stepBack(history)).toBe(history);
    expect(stepForward(history)).toBe(history);
  });

  it("has nothing to do on an empty history", () => {
    expect(canGoBack(EMPTY_NAV_HISTORY)).toBe(false);
    expect(canGoForward(EMPTY_NAV_HISTORY)).toBe(false);
    expect(locationAt(EMPTY_NAV_HISTORY)).toBeNull();
  });
});

// The failure this guards against is Back landing on a page that isn't there
// anymore, which renders as an empty page view with no way to tell why.
describe("forgetNodes", () => {
  it("leaves a history alone when nothing was removed", () => {
    const history = walk("a", "b");
    expect(forgetNodes(history, new Set())).toBe(history);
    expect(forgetNodes(history, new Set(["z"]))).toEqual(history);
  });

  it("drops a deleted page and pulls the cursor back with it", () => {
    const history = forgetNodes(walk("a", "b", "c"), new Set(["c"]));
    expect(history).toEqual({ entries: ["a", "b"], index: 1 });
    expect(locationAt(history)).toBe("b");
  });

  it("drops a deleted page from the middle without moving where you are", () => {
    const history = forgetNodes(walk("a", "b", "c"), new Set(["b"]));
    expect(history).toEqual({ entries: ["a", "c"], index: 1 });
  });

  it("collapses the duplicate a removal leaves behind", () => {
    const history = forgetNodes(walk("a", "b", "a"), new Set(["b"]));
    expect(history).toEqual({ entries: ["a"], index: 0 });
    expect(canGoBack(history)).toBe(false);
  });

  it("takes a whole deleted subtree at once", () => {
    const history = forgetNodes(walk("a", "child", "grandchild", "b"), new Set(["a", "child", "grandchild"]));
    expect(history).toEqual({ entries: ["b"], index: 0 });
  });

  it("keeps the forward stack walkable when everything behind you is gone", () => {
    const history = forgetNodes(stepBack(walk("a", "b", "c")), new Set(["a", "b"]));
    expect(history).toEqual({ entries: ["c"], index: 0 });
  });

  it("empties out when every entry was deleted", () => {
    expect(forgetNodes(walk("a", "b"), new Set(["a", "b"]))).toEqual(EMPTY_NAV_HISTORY);
  });

  it("never drops null, which is not a node id", () => {
    const history = forgetNodes(walk("a", null, "b"), new Set(["a", "b"]));
    expect(history).toEqual({ entries: [null], index: 0 });
  });
});
