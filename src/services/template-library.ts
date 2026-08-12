// The world's own templates: turning a page into one, and turning one back
// into a page. Pure — no disk, no React. The store owns the two things this
// deliberately doesn't: copying image files (async I/O) and undo.
//
// A template is a copied page, not a description of one. See
// constants/schema.ts's TemplateLibrary for why it reuses `Node` wholesale, and
// why templates live in their own record rather than among the project's pages.
import { createTemplateLibrary, type Node, type TemplateLibrary } from "../constants/schema";

/**
 * `rootId` and everything beneath it, breadth-first, with the root first.
 *
 * `includeDescendants` is the "all sub-pages / just this page" answer from the
 * conversion dialog. False keeps the page's own tabs, properties and pictures
 * and drops what's parented to it — which is the common case, since most pages
 * worth templating are a shape rather than a shape plus a particular set of
 * children.
 */
export function collectSubtree(rootId: string, nodes: Record<string, Node>, includeDescendants: boolean): Node[] {
  const root = nodes[rootId];
  if (!root) return [];
  if (!includeDescendants) return [root];

  const childrenByParent = new Map<string | null, Node[]>();
  for (const node of Object.values(nodes)) {
    const siblings = childrenByParent.get(node.parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parentId, siblings);
  }

  const collected: Node[] = [root];
  for (let index = 0; index < collected.length; index += 1) {
    collected.push(...(childrenByParent.get(collected[index].id) ?? []));
  }
  return collected;
}

export type ClonedSubtree = {
  clones: Node[];
  /** Old id → new id, for every node cloned. The caller needs it to find the
   *  new roots, and to rewrite anything that pointed at an old id. */
  idMap: Map<string, string>;
};

/**
 * Copies `sources` under fresh ids, re-parenting as it goes.
 *
 * A node whose parent isn't in `sources` becomes a root of the copy — that's
 * how one page lifted out of the middle of a world becomes a template with no
 * parent, and how a template dropped back into the tree gets its new home.
 * `newParentId` is what those roots get.
 *
 * Asset filenames are carried over untouched. Copying the *files* is the
 * store's job (it needs disk), and it rewrites these afterwards — a template
 * sharing an image file with the page it came from would lose its picture the
 * moment that page's image was replaced.
 */
export function cloneSubtree(sources: Node[], newParentId: string | null, newId: () => string): ClonedSubtree {
  const idMap = new Map(sources.map((node) => [node.id, newId()]));
  const now = Date.now();

  const clones = sources.map((source) => ({
    ...source,
    id: idMap.get(source.id)!,
    parentId: source.parentId && idMap.has(source.parentId) ? idMap.get(source.parentId)! : newParentId,
    createdAt: now,
    updatedAt: now,
  }));

  return { clones, idMap };
}

/** The template roots, in the order the library says to offer them. */
export function listTemplates(library: TemplateLibrary): Node[] {
  const byId = library.nodes;
  const roots = Object.values(byId).filter((node) => node.parentId === null);
  const position = new Map(library.rootOrder.map((id, index) => [id, index]));
  // Anything the order doesn't mention sorts to the end by creation time, the
  // same fallback orderSiblings uses for pages — a template added by hand to
  // the file, or one saved while an older order list was in memory, shows up
  // last rather than not at all.
  return roots.sort((a, b) => {
    const posA = position.get(a.id);
    const posB = position.get(b.id);
    if (posA !== undefined && posB !== undefined) return posA - posB;
    if (posA !== undefined) return -1;
    if (posB !== undefined) return 1;
    return a.createdAt - b.createdAt || a.id.localeCompare(b.id);
  });
}

export type TemplateTreeItem = {
  node: Node;
  children: TemplateTreeItem[];
};

/**
 * The library as a nested tree, for the Templates tab to draw.
 *
 * Roots come from `listTemplates`, so the tab and the new-page screen offer
 * them in the same order. Children fall back to creation order — a template's
 * sub-pages have no stored order of their own, since `rootOrder` covers only
 * the roots and nothing has ever needed to reorder inside one.
 *
 * **Cycles are guarded against rather than assumed away.** This file sits in
 * the user's project folder where she can open it, `parseTemplateLibrary` is
 * deliberately forgiving about what it finds there, and it repairs a parent
 * that's *missing* but can't see one that points back down at its own
 * descendant. A hand-edit making two pages each other's parent would hang the
 * app on render, which is a worse answer than drawing one of them once.
 */
export function buildTemplateTree(library: TemplateLibrary): TemplateTreeItem[] {
  const childrenByParent = new Map<string, Node[]>();
  for (const node of Object.values(library.nodes)) {
    if (!node.parentId) continue;
    const siblings = childrenByParent.get(node.parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parentId, siblings);
  }
  for (const siblings of childrenByParent.values()) {
    siblings.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  }

  const seen = new Set<string>();
  const build = (node: Node): TemplateTreeItem => {
    seen.add(node.id);
    const children = (childrenByParent.get(node.id) ?? []).filter((child) => !seen.has(child.id));
    return { node, children: children.map(build) };
  };

  return listTemplates(library).map(build);
}

/**
 * A template plus everything under it, removed from the library.
 *
 * Returns a new library rather than mutating, matching how the store treats
 * `project` and `nodes` — and so undo can put the old one back by holding onto
 * the value it replaced.
 */
export function removeTemplate(library: TemplateLibrary, rootId: string): TemplateLibrary {
  const doomed = new Set(collectSubtree(rootId, library.nodes, true).map((node) => node.id));
  if (doomed.size === 0) return library;
  return {
    ...library,
    nodes: Object.fromEntries(Object.entries(library.nodes).filter(([id]) => !doomed.has(id))),
    rootOrder: library.rootOrder.filter((id) => id !== rootId),
  };
}

/** A library with `clones` added as a new template, its root placed last. */
export function addTemplate(library: TemplateLibrary, clones: Node[], rootId: string): TemplateLibrary {
  const nodes = { ...library.nodes };
  for (const clone of clones) nodes[clone.id] = clone;
  return { ...library, nodes, rootOrder: [...library.rootOrder, rootId] };
}

/**
 * Reads whatever was on disk into a library, dropping anything malformed.
 *
 * Forgiving on purpose: this file sits in her project folder where she can open
 * it, and a hand-edit that breaks one template shouldn't cost the rest or stop
 * the project loading. A file that isn't a library at all reads as an empty one.
 */
export function parseTemplateLibrary(raw: unknown): TemplateLibrary {
  const library = createTemplateLibrary();
  if (!raw || typeof raw !== "object") return library;
  const candidate = raw as Partial<TemplateLibrary>;
  if (!candidate.nodes || typeof candidate.nodes !== "object") return library;

  const nodes: Record<string, Node> = {};
  for (const [id, node] of Object.entries(candidate.nodes)) {
    if (!node || typeof node !== "object") continue;
    const shaped = node as Partial<Node>;
    if (typeof shaped.id !== "string" || typeof shaped.name !== "string") continue;
    if (typeof shaped.templateKey !== "string" || !Array.isArray(shaped.tabs)) continue;
    nodes[id] = node as Node;
  }

  // A parent that didn't survive the checks above would leave its children
  // pointing at nothing, which reads as a page that exists but can't be
  // reached. They become roots instead, so nothing is silently lost.
  for (const node of Object.values(nodes)) {
    if (node.parentId && !nodes[node.parentId]) node.parentId = null;
  }

  const rootOrder = Array.isArray(candidate.rootOrder)
    ? candidate.rootOrder.filter((id): id is string => typeof id === "string" && !!nodes[id])
    : [];

  return { version: 1, nodes, rootOrder };
}
