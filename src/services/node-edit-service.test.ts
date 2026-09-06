// The three operations that can lose her writing, tested at last.
//
// These lived inside Zustand actions that also wrote files, so the only thing
// that could check them was the app suite — which takes a minute and a half and
// can only see what the screen shows. Every case here is one that has either
// bitten before or would be silent if it broke: an order left mentioning a page
// that is gone, a home button aimed at nothing, a copy wearing the original's
// picture file.
import { describe, expect, it } from "vitest";
import {
  descendantIds,
  duplicateScope,
  orderedSiblingIds,
  planDelete,
  planDuplicate,
  planMove,
  type ClonedAssetNames,
} from "./node-edit-service";
import type { Node, Project } from "../constants/schema";

const NOW = 1_700_000_000_000;

function node(id: string, parentId: string | null, extra: Partial<Node> = {}): Node {
  return {
    id,
    parentId,
    name: id,
    templateKey: "note",
    tabs: [],
    blocks: [],
    properties: {},
    tags: [],
    createdAt: 1,
    updatedAt: 1,
    ...extra,
  } as Node;
}

/**
 * A small world:
 *
 *   canon/            aus/
 *     alice             demonic/
 *       sword
 *     bob
 */
function world() {
  const nodes: Record<string, Node> = {
    canon: node("canon", null),
    aus: node("aus", null),
    alice: node("alice", "canon"),
    bob: node("bob", "canon"),
    sword: node("sword", "alice"),
    demonic: node("demonic", "aus"),
  };
  const project: Project = {
    version: 1,
    name: "Test",
    rootOrder: ["canon", "aus"],
    childOrder: { canon: ["alice", "bob"], aus: ["demonic"] },
    expandedIds: [],
    selectedId: null,
    createdAt: 1,
  };
  return { nodes, project };
}

describe("descendantIds", () => {
  it("walks the whole subtree, not just the children", () => {
    const { nodes } = world();
    expect(descendantIds("canon", nodes).sort()).toEqual(["alice", "bob", "sword"]);
  });

  it("is empty for a leaf", () => {
    const { nodes } = world();
    expect(descendantIds("sword", nodes)).toEqual([]);
  });
});

describe("orderedSiblingIds", () => {
  it("uses the stored order where there is one", () => {
    const { nodes, project } = world();
    expect(orderedSiblingIds(nodes, project, "canon")).toEqual(["alice", "bob"]);
  });

  it("falls back to creation order for a folder nobody has reordered", () => {
    const { nodes, project } = world();
    const nextNodes = { ...nodes, later: node("later", "aus", { createdAt: 5 }) };
    const nextProject = { ...project, childOrder: {} };
    expect(orderedSiblingIds(nextNodes, nextProject, "aus")).toEqual(["demonic", "later"]);
  });
});

describe("planMove", () => {
  it("reparents, and puts the page where the drop asked for", () => {
    const { nodes, project } = world();
    const plan = planMove(nodes, project, ["bob"], "aus", 0, NOW)!;
    expect(plan.nodes.bob.parentId).toBe("aus");
    expect(plan.project.childOrder!.aus).toEqual(["bob", "demonic"]);
  });

  it("takes the page out of the list it used to be in", () => {
    const { nodes, project } = world();
    const plan = planMove(nodes, project, ["bob"], "aus", 0, NOW)!;
    // The bug this guards: a stale entry left in the old parent pulls the page
    // back to its old position the next time it is moved home.
    expect(plan.project.childOrder!.canon).toEqual(["alice"]);
  });

  it("appends when it is not told an index", () => {
    const { nodes, project } = world();
    const plan = planMove(nodes, project, ["bob"], "aus", undefined, NOW)!;
    expect(plan.project.childOrder!.aus).toEqual(["demonic", "bob"]);
  });

  it("clamps an index past the end rather than leaving a hole", () => {
    const { nodes, project } = world();
    const plan = planMove(nodes, project, ["bob"], "aus", 99, NOW)!;
    expect(plan.project.childOrder!.aus).toEqual(["demonic", "bob"]);
  });

  it("keeps a multi-selection in its own relative order", () => {
    const { nodes, project } = world();
    const plan = planMove(nodes, project, ["alice", "bob"], "aus", 0, NOW)!;
    expect(plan.project.childOrder!.aus).toEqual(["alice", "bob", "demonic"]);
  });

  it("prunes every old parent when a selection spans several", () => {
    const { nodes, project } = world();
    const plan = planMove(nodes, project, ["bob", "demonic"], null, 0, NOW)!;
    expect(plan.project.childOrder!.canon).toEqual(["alice"]);
    expect(plan.project.childOrder!.aus).toEqual([]);
    expect(plan.project.rootOrder).toEqual(["bob", "demonic", "canon", "aus"]);
  });

  it("seeds a complete list for a folder that has never been reordered", () => {
    const { nodes } = world();
    const project: Project = { ...world().project, childOrder: {} };
    const plan = planMove(nodes, project, ["bob"], "aus", 0, NOW)!;
    // Not just ["bob"] — the sibling already there has to survive the drop.
    expect(plan.project.childOrder!.aus).toEqual(["bob", "demonic"]);
  });

  it("moves to the root", () => {
    const { nodes, project } = world();
    const plan = planMove(nodes, project, ["sword"], null, 1, NOW)!;
    expect(plan.nodes.sword.parentId).toBeNull();
    expect(plan.project.rootOrder).toEqual(["canon", "sword", "aus"]);
  });

  // Phase 22. A universe is a top-level container for one version of the
  // world, and a universe filed inside a folder is just a folder — which is
  // the shape it exists to replace.
  it("refuses to file a universe inside anything", () => {
    const { nodes, project } = world();
    const withUniverse = { ...nodes, canon: { ...nodes.canon, templateKey: "universe" } };
    expect(planMove(withUniverse, project, ["canon"], "aus", 0, NOW)).toBeNull();
  });

  it("still lets a universe be reordered at the root", () => {
    const { nodes, project } = world();
    const withUniverse = { ...nodes, canon: { ...nodes.canon, templateKey: "universe" } };
    const plan = planMove(withUniverse, project, ["canon"], null, 1, NOW)!;
    expect(plan.project.rootOrder).toEqual(["aus", "canon"]);
  });

  it("refuses the whole drop rather than splitting a selection a universe is in", () => {
    const { nodes, project } = world();
    const withUniverse = { ...nodes, canon: { ...nodes.canon, templateKey: "universe" } };
    // The alternative — move `bob`, leave `canon` — takes a selection the
    // person dragging it believes is one thing and quietly halves it.
    expect(planMove(withUniverse, project, ["canon", "bob"], "aus", 0, NOW)).toBeNull();
  });

  it("lets an ordinary page be dropped into a universe", () => {
    const { nodes, project } = world();
    const withUniverse = { ...nodes, canon: { ...nodes.canon, templateKey: "universe" } };
    // The rule is about where a universe *goes*, not about what it holds —
    // holding pages is the entire point of one.
    const plan = planMove(withUniverse, project, ["demonic"], "canon", 0, NOW)!;
    expect(plan.nodes.demonic.parentId).toBe("canon");
  });

  it("stamps updatedAt on what moved, and leaves everything else alone", () => {
    const { nodes, project } = world();
    const plan = planMove(nodes, project, ["bob"], "aus", 0, NOW)!;
    expect(plan.nodes.bob.updatedAt).toBe(NOW);
    expect(plan.nodes.alice.updatedAt).toBe(1);
  });

  it("reports where each one came from", () => {
    const { nodes, project } = world();
    const plan = planMove(nodes, project, ["bob", "demonic"], null, 0, NOW)!;
    expect(plan.previousParents.get("bob")).toBe("canon");
    expect(plan.previousParents.get("demonic")).toBe("aus");
  });

  it("refuses a destination that is not in the graph", () => {
    const { nodes, project } = world();
    // Filing a subtree under an id that has gone would lose it entirely.
    expect(planMove(nodes, project, ["bob"], "vanished", 0, NOW)).toBeNull();
  });

  it("does nothing when none of the ids exist", () => {
    const { nodes, project } = world();
    expect(planMove(nodes, project, ["ghost"], "aus", 0, NOW)).toBeNull();
  });

  it("ignores ids that have gone and moves the rest", () => {
    const { nodes, project } = world();
    const plan = planMove(nodes, project, ["bob", "ghost"], "aus", 0, NOW)!;
    expect(plan.moved).toEqual(["bob"]);
  });
});

describe("planDelete", () => {
  it("takes the whole subtree, not just the page asked for", () => {
    const { nodes, project } = world();
    const plan = planDelete(nodes, project, ["canon"])!;
    expect(plan.nodes.alice).toBeUndefined();
    expect(plan.nodes.sword).toBeUndefined();
    expect(plan.nodes.aus).toBeDefined();
  });

  it("asks the disk only for the roots of the removal", () => {
    const { nodes, project } = world();
    // Selecting a folder and something inside it: removing the child's path
    // separately would try to remove a path its parent already took.
    const plan = planDelete(nodes, project, ["canon", "sword"])!;
    expect(plan.removalRoots).toEqual(["canon"]);
  });

  it("keeps both roots when the selection spans unrelated branches", () => {
    const { nodes, project } = world();
    const plan = planDelete(nodes, project, ["alice", "demonic"])!;
    expect(plan.removalRoots).toEqual(["alice", "demonic"]);
  });

  it("drops deleted pages out of the orders that mention them", () => {
    const { nodes, project } = world();
    const plan = planDelete(nodes, project, ["bob"])!;
    expect(plan.project.childOrder!.canon).toEqual(["alice"]);
  });

  it("drops the order entry belonging to a deleted parent", () => {
    const { nodes, project } = world();
    const plan = planDelete(nodes, project, ["canon"])!;
    expect(plan.project.childOrder!.canon).toBeUndefined();
    expect(plan.project.rootOrder).toEqual(["aus"]);
  });

  it("clears home when the home page is deleted", () => {
    const { nodes, project } = world();
    const plan = planDelete(nodes, { ...project, homeNodeId: "bob" }, ["bob"])!;
    expect(plan.project.homeNodeId).toBeNull();
  });

  it("clears home when the home page was merely inside what was deleted", () => {
    const { nodes, project } = world();
    // The case that is easy to miss: home is a grandchild of the folder that
    // went, so it is never one of the ids passed in.
    const plan = planDelete(nodes, { ...project, homeNodeId: "sword" }, ["canon"])!;
    expect(plan.project.homeNodeId).toBeNull();
  });

  it("leaves home alone when it survives", () => {
    const { nodes, project } = world();
    const plan = planDelete(nodes, { ...project, homeNodeId: "demonic" }, ["canon"])!;
    expect(plan.project.homeNodeId).toBe("demonic");
  });

  it("unpins a deleted page, and keeps the rest of the rail in order", () => {
    const { nodes, project } = world();
    const plan = planDelete(nodes, { ...project, pinnedIds: ["demonic", "sword", "bob"] }, ["canon"])!;
    expect(plan.project.pinnedIds).toEqual(["demonic"]);
  });

  it("clears the selection, and its cached name, when the selected page goes", () => {
    const { nodes, project } = world();
    const plan = planDelete(nodes, { ...project, selectedId: "sword", selectedName: "sword" }, ["canon"])!;
    expect(plan.project.selectedId).toBeNull();
    expect(plan.project.selectedName).toBeNull();
  });

  it("leaves the selection alone when it survives", () => {
    const { nodes, project } = world();
    const plan = planDelete(nodes, { ...project, selectedId: "demonic", selectedName: "demonic" }, ["bob"])!;
    expect(plan.project.selectedId).toBe("demonic");
    expect(plan.project.selectedName).toBe("demonic");
  });

  it("does nothing when none of the ids exist", () => {
    const { nodes, project } = world();
    expect(planDelete(nodes, project, ["ghost"])).toBeNull();
  });

  it("counts what was asked for, not the subtree, for the undo label", () => {
    const { nodes, project } = world();
    const plan = planDelete(nodes, project, ["canon"])!;
    expect(plan.deleted).toEqual(["canon"]);
    expect(plan.removedIds.size).toBe(4);
  });
});

describe("duplicateScope", () => {
  it("covers the selection and everything under it", () => {
    const { nodes } = world();
    const scope = duplicateScope(nodes, ["alice"])!;
    expect(scope.roots).toEqual(["alice"]);
    expect(scope.subtreeIds).toEqual(["alice", "sword"]);
  });

  it("drops a selected child of a selected folder", () => {
    const { nodes } = world();
    const scope = duplicateScope(nodes, ["canon", "alice"])!;
    expect(scope.roots).toEqual(["canon"]);
    expect(scope.subtreeIds).not.toContain("alice_copy");
    expect(scope.subtreeIds.filter((id) => id === "alice")).toHaveLength(1);
  });

  it("is nothing when none of the ids exist", () => {
    const { nodes } = world();
    expect(duplicateScope(nodes, ["ghost"])).toBeNull();
  });
});

describe("planDuplicate", () => {
  function mint() {
    let n = 0;
    return () => `copy${++n}`;
  }

  const noAssets = new Map<string, ClonedAssetNames>();

  it("names the copy, and only the copy", () => {
    const { nodes, project } = world();
    const scope = duplicateScope(nodes, ["alice"])!;
    const plan = planDuplicate(nodes, project, scope, { mintId: mint(), now: NOW, assets: noAssets });
    const byName = plan.clones.map((c) => c.name);
    // The root of the copy is marked; a page carried along inside it is not.
    expect(byName).toEqual(["alice (Copy)", "sword"]);
  });

  it("rewires a copied subtree to point at itself", () => {
    const { nodes, project } = world();
    const scope = duplicateScope(nodes, ["alice"])!;
    const plan = planDuplicate(nodes, project, scope, { mintId: mint(), now: NOW, assets: noAssets });
    const [copiedAlice, copiedSword] = plan.clones;
    expect(copiedAlice.parentId).toBe("canon");
    expect(copiedSword.parentId).toBe(copiedAlice.id);
  });

  it("lands the copy directly after its original", () => {
    const { nodes, project } = world();
    const scope = duplicateScope(nodes, ["alice"])!;
    const plan = planDuplicate(nodes, project, scope, { mintId: mint(), now: NOW, assets: noAssets });
    expect(plan.project.childOrder!.canon).toEqual(["alice", "copy1", "bob"]);
  });

  it("keeps several copies from one folder in step", () => {
    const { nodes, project } = world();
    const scope = duplicateScope(nodes, ["alice", "bob"])!;
    const plan = planDuplicate(nodes, project, scope, { mintId: mint(), now: NOW, assets: noAssets });
    // The bug this guards: splicing one at a time shifts every position after
    // the first insertion, so the second copy lands one place too far along.
    const order = plan.project.childOrder!.canon;
    expect(order.indexOf("alice") + 1).toBe(order.indexOf(plan.idMap.get("alice")!));
    expect(order.indexOf("bob") + 1).toBe(order.indexOf(plan.idMap.get("bob")!));
  });

  it("gives a copy its own picture files, never the original's", () => {
    const { nodes, project } = world();
    const withPicture = { ...nodes, alice: node("alice", "canon", { image: "a.png", banner: "b.png" }) };
    const scope = duplicateScope(withPicture, ["alice"])!;
    const assets = new Map<string, ClonedAssetNames>([["alice", { image: "copy-a.png", banner: "copy-b.png" }]]);
    const plan = planDuplicate(withPicture, project, scope, { mintId: mint(), now: NOW, assets });
    expect(plan.clones[0].image).toBe("copy-a.png");
    expect(plan.clones[0].banner).toBe("copy-b.png");
  });

  it("gives a copy no picture rather than the original's when none was copied", () => {
    const { nodes, project } = world();
    const withPicture = { ...nodes, alice: node("alice", "canon", { image: "a.png" }) };
    const scope = duplicateScope(withPicture, ["alice"])!;
    // A picture that could not be read leaves the copy without one. Pointing
    // at the original's file would mean replacing it on either side takes it
    // out from under the other.
    const plan = planDuplicate(withPicture, project, scope, { mintId: mint(), now: NOW, assets: noAssets });
    expect(plan.clones[0].image).toBeUndefined();
  });

  it("stamps both timestamps on every copy", () => {
    const { nodes, project } = world();
    const scope = duplicateScope(nodes, ["alice"])!;
    const plan = planDuplicate(nodes, project, scope, { mintId: mint(), now: NOW, assets: noAssets });
    for (const clone of plan.clones) {
      expect(clone.createdAt).toBe(NOW);
      expect(clone.updatedAt).toBe(NOW);
    }
  });

  it("reports just the copies of what was selected, for the undo to remove", () => {
    const { nodes, project } = world();
    const scope = duplicateScope(nodes, ["alice"])!;
    const plan = planDuplicate(nodes, project, scope, { mintId: mint(), now: NOW, assets: noAssets });
    // Not the copied grandchild — deleting the copied root takes that with it.
    expect([...plan.cloneRootIds]).toEqual([plan.idMap.get("alice")]);
  });

  it("duplicates at the root", () => {
    const { nodes, project } = world();
    const scope = duplicateScope(nodes, ["aus"])!;
    const plan = planDuplicate(nodes, project, scope, { mintId: mint(), now: NOW, assets: noAssets });
    expect(plan.project.rootOrder).toEqual(["canon", "aus", plan.idMap.get("aus")]);
  });

  it("leaves the originals untouched", () => {
    const { nodes, project } = world();
    const scope = duplicateScope(nodes, ["alice"])!;
    const plan = planDuplicate(nodes, project, scope, { mintId: mint(), now: NOW, assets: noAssets });
    expect(plan.nodes.alice).toEqual(nodes.alice);
    expect(plan.nodes.sword).toEqual(nodes.sword);
  });
});
