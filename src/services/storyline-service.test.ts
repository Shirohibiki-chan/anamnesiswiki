import { describe, expect, it } from "vitest";
import { createNode, createTab, type Node, type Storyline } from "../constants/schema";
import {
  addBand,
  addNote,
  addSceneNode,
  connect,
  createStoryline,
  disconnect,
  moveBand,
  moveNodes,
  moveNote,
  needsTidying,
  nextPlacement,
  noteSegments,
  pagesOnCanvas,
  readStoryline,
  removeBand,
  removeNode,
  removeNote,
  resizeBand,
  sceneCandidates,
  sceneCast,
  sceneRefusal,
  scenesOnBand,
  setBandLabel,
  setNoteText,
  storylineModel,
  tidyUp,
  wouldCycle,
} from "./storyline-service";

function page(name: string): Node {
  return createNode({ parentId: null, templateKey: "scene", name });
}

/** A canvas of `count` scenes in a row, with the pages they stand for. */
function canvasOf(count: number): { storyline: Storyline; nodes: Record<string, Node> } {
  const nodes: Record<string, Node> = {};
  let storyline = createStoryline();
  for (let index = 0; index < count; index += 1) {
    const made = page(`Scene ${index + 1}`);
    nodes[made.id] = made;
    storyline = addSceneNode(storyline, made.id, { x: index * 200, y: 0 });
  }
  return { storyline, nodes };
}

/** Joins the nth and mth scenes, failing the test if the canvas refused. */
function join(storyline: Storyline, from: number, to: number): Storyline {
  const result = connect(storyline, storyline.nodes[from].id, storyline.nodes[to].id);
  expect(result.refused).toBeNull();
  return result.storyline;
}

describe("addSceneNode", () => {
  it("puts the scene where it was dropped", () => {
    const made = page("Opening");
    const storyline = addSceneNode(createStoryline(), made.id, { x: 40.6, y: -12.2 });
    expect(storyline.nodes).toHaveLength(1);
    expect(storyline.nodes[0]).toMatchObject({ pageId: made.id, x: 41, y: -12 });
  });

  it("gives the canvas node an id of its own, so one page can appear twice", () => {
    const made = page("The duel");
    let storyline = addSceneNode(createStoryline(), made.id, { x: 0, y: 0 });
    storyline = addSceneNode(storyline, made.id, { x: 300, y: 0 });
    expect(storyline.nodes[0].id).not.toBe(storyline.nodes[1].id);
    expect(pagesOnCanvas(storyline).size).toBe(1);
  });
});

describe("nextPlacement", () => {
  it("starts at the origin on an empty canvas", () => {
    expect(nextPlacement(createStoryline())).toEqual({ x: 0, y: 0 });
  });

  it("goes to the right of everything, level with the top", () => {
    const { storyline } = canvasOf(3);
    const at = nextPlacement(storyline);
    expect(at.x).toBeGreaterThan(400);
    expect(at.y).toBe(0);
  });
});

describe("moveNodes", () => {
  it("moves only what was dragged", () => {
    const { storyline } = canvasOf(2);
    const moved = moveNodes(storyline, { [storyline.nodes[0].id]: { x: 10, y: 20 } });
    expect(moved.nodes[0]).toMatchObject({ x: 10, y: 20 });
    expect(moved.nodes[1]).toMatchObject({ x: 200, y: 0 });
  });

  it("gives back the same canvas when nothing moved, so nothing is written", () => {
    const { storyline } = canvasOf(2);
    expect(moveNodes(storyline, {})).toBe(storyline);
  });
});

describe("connect", () => {
  it("joins two scenes in narrative order", () => {
    const { storyline } = canvasOf(2);
    const joined = join(storyline, 0, 1);
    expect(joined.edges).toHaveLength(1);
    expect(joined.edges[0]).toMatchObject({ fromId: storyline.nodes[0].id, toId: storyline.nodes[1].id });
  });

  it("refuses to join a scene to itself", () => {
    const { storyline } = canvasOf(1);
    const result = connect(storyline, storyline.nodes[0].id, storyline.nodes[0].id);
    expect(result.refused).toBe("same-node");
    expect(result.storyline.edges).toHaveLength(0);
  });

  it("refuses a second line between the same pair, in either direction", () => {
    const { storyline } = canvasOf(2);
    const joined = join(storyline, 0, 1);
    expect(connect(joined, storyline.nodes[0].id, storyline.nodes[1].id).refused).toBe("already-joined");
    expect(connect(joined, storyline.nodes[1].id, storyline.nodes[0].id).refused).toBe("already-joined");
  });

  it("lets a scene have two parents, because threads rejoin", () => {
    const { storyline } = canvasOf(3);
    let joined = join(storyline, 0, 2);
    joined = join(joined, 1, 2);
    expect(joined.edges).toHaveLength(2);
  });

  it("lets a scene have two children, because threads fork", () => {
    const { storyline } = canvasOf(3);
    let joined = join(storyline, 0, 1);
    joined = join(joined, 0, 2);
    expect(joined.edges).toHaveLength(2);
  });

  it("refuses an edge that would close a loop further round the canvas", () => {
    const { storyline } = canvasOf(3);
    let joined = join(storyline, 0, 1);
    joined = join(joined, 1, 2);
    const result = connect(joined, storyline.nodes[2].id, storyline.nodes[0].id);
    expect(result.refused).toBe("would-loop");
    expect(result.storyline.edges).toHaveLength(2);
  });
});

describe("wouldCycle", () => {
  it("is false for two scenes with nothing between them", () => {
    const { storyline } = canvasOf(2);
    expect(wouldCycle(storyline, storyline.nodes[0].id, storyline.nodes[1].id)).toBe(false);
  });

  it("does not hang on a canvas that already holds a loop", () => {
    // Nothing in the app can make one, but a hand-edited file can, and the
    // walk has to stop either way.
    const { storyline } = canvasOf(2);
    const [first, second] = storyline.nodes;
    const looped: Storyline = {
      ...storyline,
      edges: [
        { id: "a", fromId: first.id, toId: second.id },
        { id: "b", fromId: second.id, toId: first.id },
      ],
    };
    expect(wouldCycle(looped, first.id, second.id)).toBe(true);
  });
});

describe("removeNode", () => {
  it("takes the scene and every line touching it, and leaves the rest", () => {
    const { storyline } = canvasOf(3);
    let joined = join(storyline, 0, 1);
    joined = join(joined, 1, 2);
    const without = removeNode(joined, storyline.nodes[1].id);
    expect(without.nodes).toHaveLength(2);
    expect(without.edges).toHaveLength(0);
  });
});

describe("disconnect", () => {
  it("removes one line and keeps both scenes", () => {
    const { storyline } = canvasOf(2);
    const joined = join(storyline, 0, 1);
    const cut = disconnect(joined, joined.edges[0].id);
    expect(cut.edges).toHaveLength(0);
    expect(cut.nodes).toHaveLength(2);
  });
});

describe("storylineModel", () => {
  it("dresses each scene in its page's name and icon", () => {
    const { storyline, nodes } = canvasOf(2);
    const model = storylineModel(storyline, nodes, "the-storyline");
    expect(model.scenes.map((scene) => scene.name)).toEqual(["Scene 1", "Scene 2"]);
    expect(model.scenes[0].templateKey).toBe("scene");
  });

  it("drops a scene whose page is gone, and every line to it", () => {
    const { storyline, nodes } = canvasOf(2);
    const joined = join(storyline, 0, 1);
    delete nodes[storyline.nodes[1].pageId];
    const model = storylineModel(joined, nodes, "the-storyline");
    expect(model.scenes).toHaveLength(1);
    expect(model.edges).toHaveLength(0);
    expect(model.orphans).toBe(1);
  });

  it("leaves the stored canvas alone, so undoing the delete puts it back", () => {
    const { storyline, nodes } = canvasOf(2);
    delete nodes[storyline.nodes[1].pageId];
    storylineModel(storyline, nodes, "the-storyline");
    expect(storyline.nodes).toHaveLength(2);
  });
});

describe("readStoryline", () => {
  it("reads a canvas written by the app", () => {
    const { storyline } = canvasOf(2);
    const joined = join(storyline, 0, 1);
    expect(readStoryline(JSON.parse(JSON.stringify(joined)))).toEqual(joined);
  });

  it("gives an empty canvas for anything that is not one", () => {
    expect(readStoryline(null)).toEqual(createStoryline());
    expect(readStoryline("nonsense")).toEqual(createStoryline());
    expect(readStoryline({})).toEqual(createStoryline());
  });

  it("skips entries missing what a scene needs rather than dropping the file", () => {
    const read = readStoryline({
      nodes: [{ id: "a", pageId: "p1", x: 5, y: 6 }, { id: "b" }, null, { pageId: "p2" }],
      edges: [{ id: "e", fromId: "a", toId: "b" }, { id: "f" }],
    });
    expect(read.nodes).toHaveLength(1);
    expect(read.edges).toHaveLength(1);
  });

  it("defaults a missing or broken position to the origin rather than to NaN", () => {
    const read = readStoryline({ nodes: [{ id: "a", pageId: "p", x: "12" }] });
    expect(read.nodes[0]).toMatchObject({ x: 0, y: 0 });
  });
});

describe("notes", () => {
  it("drops a note where it was put, and keeps the scenes alone", () => {
    const { storyline } = canvasOf(2);
    const withNote = addNote(storyline, { x: 10, y: 20 }, "continued elsewhere");
    expect(withNote.notes).toHaveLength(1);
    expect(withNote.notes[0]).toMatchObject({ x: 10, y: 20, text: "continued elsewhere" });
    expect(withNote.nodes).toBe(storyline.nodes);
  });

  it("is never counted among the scenes", () => {
    const { storyline, nodes } = canvasOf(2);
    const withNote = addNote(storyline, { x: 0, y: 0 }, "an aside");
    expect(storylineModel(withNote, nodes, "the-storyline").scenes).toHaveLength(2);
  });

  it("has no lines, so removing a scene cannot touch it", () => {
    const { storyline } = canvasOf(2);
    const withNote = addNote(storyline, { x: 0, y: 0 }, "an aside");
    const after = removeNode(withNote, storyline.nodes[0].id);
    expect(after.notes).toHaveLength(1);
  });

  it("moves and is rewritten in place", () => {
    let withNote = addNote(createStoryline(), { x: 0, y: 0 }, "first");
    const noteId = withNote.notes[0].id;
    withNote = moveNote(withNote, noteId, { x: 44.6, y: -3 });
    withNote = setNoteText(withNote, noteId, "second");
    expect(withNote.notes[0]).toMatchObject({ x: 45, y: -3, text: "second" });
  });

  it("goes away on its own without taking anything with it", () => {
    const { storyline } = canvasOf(1);
    const withNote = addNote(storyline, { x: 0, y: 0 }, "an aside");
    const after = removeNote(withNote, withNote.notes[0].id);
    expect(after.notes).toHaveLength(0);
    expect(after.nodes).toHaveLength(1);
  });
});

describe("noteSegments", () => {
  const valera = page("Valera Jiang");
  const nodes: Record<string, Node> = { [valera.id]: valera };

  it("leaves plain text alone", () => {
    expect(noteSegments("just a thought", nodes)).toEqual([{ kind: "text", text: "just a thought" }]);
  });

  it("turns a name it knows into a link", () => {
    const segments = noteSegments("continued in [[Valera Jiang]]", nodes);
    expect(segments).toEqual([
      { kind: "text", text: "continued in " },
      { kind: "link", text: "Valera Jiang", nodeId: valera.id },
    ]);
  });

  it("matches a name whatever its case, and trims it", () => {
    expect(noteSegments("[[  valera jiang  ]]", nodes)[0]).toMatchObject({ kind: "link", nodeId: valera.id });
  });

  it("resolves an alias, because an alias is a name everywhere else", () => {
    const val = page("Sable Reyes");
    val.aliases = ["Sable"];
    const segments = noteSegments("[[Sable]] leaves", { [val.id]: val });
    expect(segments[0]).toMatchObject({ kind: "link", nodeId: val.id });
  });

  it("marks a name nothing answers to rather than drawing it as prose", () => {
    const segments = noteSegments("see [[Nobody At All]]", nodes);
    expect(segments[1]).toEqual({ kind: "unresolved", text: "Nobody At All" });
  });

  it("refuses to guess when two pages answer to one name", () => {
    const a = page("Sable");
    const b = page("Sable");
    const segments = noteSegments("[[Sable]]", { [a.id]: a, [b.id]: b });
    expect(segments[0].kind).toBe("unresolved");
  });

  it("reads several links in one note, with the words between them", () => {
    const other = page("Greyharbour");
    const segments = noteSegments("[[Valera Jiang]] goes to [[Greyharbour]] after", {
      ...nodes,
      [other.id]: other,
    });
    expect(segments.map((segment) => segment.kind)).toEqual(["link", "text", "link", "text"]);
  });

  it("does not let one unclosed bracket swallow the rest of the note", () => {
    const segments = noteSegments("[[Valera Jiang\nand then some more", nodes);
    expect(segments).toEqual([{ kind: "text", text: "[[Valera Jiang\nand then some more" }]);
  });
});

describe("bands", () => {
  it("is dropped as a rectangle with a label", () => {
    const banded = addBand(createStoryline(), { x: -20, y: -40 }, "Act 2");
    expect(banded.bands).toHaveLength(1);
    expect(banded.bands[0]).toMatchObject({ x: -20, y: -40, label: "Act 2" });
    expect(banded.bands[0].width).toBeGreaterThan(0);
  });

  it("says which scenes are standing on it, by their centres", () => {
    const { storyline } = canvasOf(3); // at x = 0, 200, 400, all y = 0
    const banded = addBand(storyline, { x: -50, y: -50 });
    const band = { ...banded.bands[0], width: 300, height: 100 };
    // Covers x = -50..250, so the first two and not the third.
    expect(scenesOnBand(banded.nodes, band)).toEqual([storyline.nodes[0].id, storyline.nodes[1].id]);
  });

  it("carries the scenes standing on it when it moves", () => {
    const { storyline } = canvasOf(3);
    let banded = addBand(storyline, { x: -50, y: -50 });
    const band = { ...banded.bands[0], width: 300, height: 100 };
    banded = { ...banded, bands: [band] };
    const carried = scenesOnBand(banded.nodes, band);

    const moved = moveBand(banded, band.id, { x: band.x + 100, y: band.y + 60 }, carried);
    expect(moved.bands[0]).toMatchObject({ x: 50, y: 10 });
    expect(moved.nodes[0]).toMatchObject({ x: 100, y: 60 });
    expect(moved.nodes[1]).toMatchObject({ x: 300, y: 60 });
    // The one that was not on it does not move.
    expect(moved.nodes[2]).toMatchObject({ x: 400, y: 0 });
  });

  it("keeps a label and refuses to be stored inside out", () => {
    let banded = addBand(createStoryline(), { x: 0, y: 0 });
    const bandId = banded.bands[0].id;
    banded = setBandLabel(banded, bandId, "Act 3");
    banded = resizeBand(banded, bandId, { width: -400, height: 10 });
    expect(banded.bands[0].label).toBe("Act 3");
    expect(banded.bands[0].width).toBeGreaterThan(0);
    expect(banded.bands[0].height).toBeGreaterThan(0);
  });

  it("takes nothing with it when it goes", () => {
    const { storyline } = canvasOf(2);
    const banded = addBand(storyline, { x: -500, y: -500 });
    const after = removeBand(banded, banded.bands[0].id);
    expect(after.bands).toHaveLength(0);
    expect(after.nodes).toHaveLength(2);
  });
});

describe("tidyUp", () => {
  /** Puts every scene on top of every other, which is the mess it has to fix. */
  function stacked(count: number): { storyline: Storyline; nodes: Record<string, Node> } {
    const built = canvasOf(count);
    return {
      ...built,
      storyline: { ...built.storyline, nodes: built.storyline.nodes.map((node) => ({ ...node, x: 0, y: 0 })) },
    };
  }

  it("puts a straight run in a row, left to right", () => {
    const { storyline } = stacked(3);
    let joined = join(storyline, 0, 1);
    joined = join(joined, 1, 2);
    const tidy = tidyUp(joined);
    expect(tidy.nodes[0].x).toBeLessThan(tidy.nodes[1].x);
    expect(tidy.nodes[1].x).toBeLessThan(tidy.nodes[2].x);
  });

  it("puts a fork's two threads in one column, either side of the line", () => {
    const { storyline } = stacked(3);
    let joined = join(storyline, 0, 1);
    joined = join(joined, 0, 2);
    const tidy = tidyUp(joined);
    expect(tidy.nodes[1].x).toBe(tidy.nodes[2].x);
    expect(tidy.nodes[1].y).not.toBe(tidy.nodes[2].y);
    // Centred, so the pair straddles the row rather than hanging below it.
    expect(tidy.nodes[1].y + tidy.nodes[2].y).toBe(0);
  });

  it("places a scene after the longest way round to it, never the shortest", () => {
    // 0 -> 1 -> 2 -> 3, and 0 -> 3 as well. The direct edge must not pull the
    // last scene back to column one, which would draw three edges backwards.
    const { storyline } = stacked(4);
    let joined = join(storyline, 0, 1);
    joined = join(joined, 1, 2);
    joined = join(joined, 2, 3);
    joined = join(joined, 0, 3);
    const tidy = tidyUp(joined);
    expect(tidy.nodes[3].x).toBeGreaterThan(tidy.nodes[2].x);
  });

  it("leaves a scene with no lines at the start rather than dropping it", () => {
    const { storyline } = stacked(3);
    const joined = join(storyline, 0, 1);
    const tidy = tidyUp(joined);
    expect(tidy.nodes).toHaveLength(3);
    expect(tidy.nodes[2].x).toBe(tidy.nodes[0].x);
  });

  it("leaves notes and bands exactly where they were", () => {
    const { storyline } = stacked(2);
    let joined = join(storyline, 0, 1);
    joined = addNote(joined, { x: 700, y: 700 }, "an aside");
    joined = addBand(joined, { x: -300, y: -300 }, "Act 1");
    const tidy = tidyUp(joined);
    expect(tidy.notes).toEqual(joined.notes);
    expect(tidy.bands).toEqual(joined.bands);
  });

  it("changes nothing the second time, so the button can go quiet", () => {
    const { storyline } = stacked(4);
    let joined = join(storyline, 0, 1);
    joined = join(joined, 1, 2);
    joined = join(joined, 1, 3);
    const once = tidyUp(joined);
    expect(needsTidying(joined)).toBe(true);
    expect(tidyUp(once).nodes).toEqual(once.nodes);
    expect(needsTidying(once)).toBe(false);
  });

  it("does not spin on a canvas that was hand-edited into a loop", () => {
    const { storyline } = stacked(2);
    const [first, second] = storyline.nodes;
    const looped: Storyline = {
      ...storyline,
      edges: [
        { id: "a", fromId: first.id, toId: second.id },
        { id: "b", fromId: second.id, toId: first.id },
      ],
    };
    expect(tidyUp(looped).nodes).toHaveLength(2);
  });

  it("has nothing to do on an empty canvas", () => {
    expect(needsTidying(createStoryline())).toBe(false);
    expect(tidyUp(createStoryline()).nodes).toEqual([]);
  });
});

describe("readStoryline, with annotations", () => {
  it("reads a canvas written before notes and bands existed", () => {
    const read = readStoryline({ version: 1, nodes: [{ id: "a", pageId: "p", x: 1, y: 2 }], edges: [] });
    expect(read.notes).toEqual([]);
    expect(read.bands).toEqual([]);
  });

  it("round-trips notes and bands through a file", () => {
    let storyline = addNote(createStoryline(), { x: 5, y: 6 }, "see [[Somewhere]]");
    storyline = addBand(storyline, { x: 0, y: 0 }, "Act 1");
    expect(readStoryline(JSON.parse(JSON.stringify(storyline)))).toEqual(storyline);
  });

  it("gives a note with no width a real one rather than a collapsed card", () => {
    const read = readStoryline({ notes: [{ id: "n", x: 0, y: 0, text: "hi" }] });
    expect(read.notes[0].width).toBeGreaterThan(0);
  });

  it("skips an entry with no id rather than dropping the whole file", () => {
    const read = readStoryline({
      notes: [{ id: "n", x: 0, y: 0, text: "kept" }, { x: 1, y: 1 }],
      bands: [{ label: "no id" }, { id: "b", x: 0, y: 0, width: 10, height: 10, label: "kept" }],
    });
    expect(read.notes).toHaveLength(1);
    expect(read.bands).toHaveLength(1);
  });
});

describe("putting an existing page on a canvas", () => {
  /** A world with two universes and a shared one, which is what the rule is about. */
  function world() {
    const canon = { ...createNode({ parentId: null, templateKey: "universe", name: "Canon" }) };
    const demonic = { ...createNode({ parentId: null, templateKey: "universe", name: "Demonic AU" }) };
    const shared = { ...createNode({ parentId: null, templateKey: "universe", name: "Shared" }) };
    const storyline = { ...createNode({ parentId: canon.id, templateKey: "storyline", name: "The Fall" }) };
    const inCanon = { ...createNode({ parentId: canon.id, templateKey: "scene", name: "The Duel" }) };
    const inDemonic = { ...createNode({ parentId: demonic.id, templateKey: "scene", name: "The Other Duel" }) };
    const inShared = { ...createNode({ parentId: shared.id, templateKey: "race", name: "Merfolk" }) };
    const rootless = { ...createNode({ parentId: null, templateKey: "note", name: "Loose Page" }) };
    const nodes = Object.fromEntries(
      [canon, demonic, shared, storyline, inCanon, inDemonic, inShared, rootless].map((n) => [n.id, n]),
    );
    return { nodes, canon, demonic, shared, storyline, inCanon, inDemonic, inShared, rootless };
  }

  it("takes a page from the storyline's own universe", () => {
    const w = world();
    expect(sceneRefusal(w.inCanon.id, w.storyline.id, createStoryline(), w.nodes, w.shared.id)).toBeNull();
  });

  it("refuses a page from a different universe, because a storyline is one version of events", () => {
    const w = world();
    expect(sceneRefusal(w.inDemonic.id, w.storyline.id, createStoryline(), w.nodes, w.shared.id)).toBe(
      "another-universe",
    );
  });

  it("takes a page from the shared universe, which is true in every version", () => {
    const w = world();
    expect(sceneRefusal(w.inShared.id, w.storyline.id, createStoryline(), w.nodes, w.shared.id)).toBeNull();
  });

  it("takes a page that is in no universe at all", () => {
    const w = world();
    expect(sceneRefusal(w.rootless.id, w.storyline.id, createStoryline(), w.nodes, w.shared.id)).toBeNull();
  });

  it("refuses the storyline itself", () => {
    const w = world();
    expect(sceneRefusal(w.storyline.id, w.storyline.id, createStoryline(), w.nodes, null)).toBe("itself");
  });

  it("refuses a page already on the canvas", () => {
    const w = world();
    const storyline = addSceneNode(createStoryline(), w.inCanon.id, { x: 0, y: 0 });
    expect(sceneRefusal(w.inCanon.id, w.storyline.id, storyline, w.nodes, null)).toBe("already-here");
  });

  it("offers nothing until something is typed", () => {
    const w = world();
    expect(sceneCandidates("", w.storyline.id, createStoryline(), w.nodes, w.shared.id, 8)).toEqual([]);
    expect(sceneCandidates("   ", w.storyline.id, createStoryline(), w.nodes, w.shared.id, 8)).toEqual([]);
  });

  it("leaves out what it would refuse rather than offering it and declining", () => {
    const w = world();
    const names = sceneCandidates("duel", w.storyline.id, createStoryline(), w.nodes, w.shared.id, 8).map(
      (node) => node.name,
    );
    expect(names).toEqual(["The Duel"]);
  });

  it("never offers a universe", () => {
    const w = world();
    const names = sceneCandidates("a", w.storyline.id, createStoryline(), w.nodes, w.shared.id, 8).map(
      (node) => node.name,
    );
    expect(names).not.toContain("Canon");
    expect(names).not.toContain("Shared");
  });

  it("finds a page by an alias, the way the rest of the app does", () => {
    const w = world();
    w.nodes[w.inCanon.id] = { ...w.inCanon, aliases: ["Swordfight"] };
    const names = sceneCandidates("swordf", w.storyline.id, createStoryline(), w.nodes, w.shared.id, 8).map(
      (node) => node.name,
    );
    expect(names).toEqual(["The Duel"]);
  });

  it("caps how many it offers", () => {
    const w = world();
    for (let index = 0; index < 20; index += 1) {
      const extra = createNode({ parentId: w.canon.id, templateKey: "scene", name: `Scene ${index}` });
      w.nodes[extra.id] = extra;
    }
    expect(sceneCandidates("scene", w.storyline.id, createStoryline(), w.nodes, w.shared.id, 8)).toHaveLength(8);
  });
});

describe("sceneCast", () => {
  it("lists whatever the scene's page points at", () => {
    const valera = createNode({ parentId: null, templateKey: "character", name: "Valera" });
    const scene = createNode({
      parentId: null,
      templateKey: "scene",
      name: "The Duel",
      tabs: [
        createTab({
          id: "t",
          label: "Scene",
          content: [{ type: "paragraph", content: [{ type: "mention", props: { nodeId: valera.id } }] }],
        }),
      ],
    });
    const nodes = { [valera.id]: valera, [scene.id]: scene };
    expect(sceneCast(scene.id, nodes, "storyline-id").map((n) => n.name)).toEqual(["Valera"]);
  });

  it("leaves out the storyline the scene is on", () => {
    const storyline = createNode({ parentId: null, templateKey: "storyline", name: "The Fall" });
    const scene = createNode({
      parentId: storyline.id,
      templateKey: "scene",
      name: "The Duel",
      tabs: [
        createTab({
          id: "t",
          label: "Scene",
          content: [{ type: "paragraph", content: [{ type: "mention", props: { nodeId: storyline.id } }] }],
        }),
      ],
    });
    const nodes = { [storyline.id]: storyline, [scene.id]: scene };
    expect(sceneCast(scene.id, nodes, storyline.id)).toEqual([]);
  });

  it("is empty for a scene that names nobody, and for a page that is gone", () => {
    const scene = createNode({ parentId: null, templateKey: "scene", name: "Quiet" });
    expect(sceneCast(scene.id, { [scene.id]: scene }, "s")).toEqual([]);
    expect(sceneCast("missing", {}, "s")).toEqual([]);
  });
});
