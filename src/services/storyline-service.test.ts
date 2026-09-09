import { describe, expect, it } from "vitest";
import { createNode, type Node, type Storyline } from "../constants/schema";
import {
  addSceneNode,
  connect,
  createStoryline,
  disconnect,
  moveNodes,
  nextPlacement,
  pagesOnCanvas,
  readStoryline,
  removeNode,
  storylineModel,
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
      version: 1,
      nodes: storyline.nodes,
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
    const model = storylineModel(storyline, nodes);
    expect(model.scenes.map((scene) => scene.name)).toEqual(["Scene 1", "Scene 2"]);
    expect(model.scenes[0].templateKey).toBe("scene");
  });

  it("drops a scene whose page is gone, and every line to it", () => {
    const { storyline, nodes } = canvasOf(2);
    const joined = join(storyline, 0, 1);
    delete nodes[storyline.nodes[1].pageId];
    const model = storylineModel(joined, nodes);
    expect(model.scenes).toHaveLength(1);
    expect(model.edges).toHaveLength(0);
    expect(model.orphans).toBe(1);
  });

  it("leaves the stored canvas alone, so undoing the delete puts it back", () => {
    const { storyline, nodes } = canvasOf(2);
    delete nodes[storyline.nodes[1].pageId];
    storylineModel(storyline, nodes);
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
