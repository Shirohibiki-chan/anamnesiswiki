// The walk every export format shares (Phase 28).
//
// `lk-export.ts`, the Markdown vault, the one-big-file and Phase 1.5's HTML
// publisher are all the same job — walk the pages, emit another format — and
// four of them repeat the same four things above the writing: collect the
// subtree, resolve sibling order into a stable sequence, decide what each
// picture's address is, and carry a tally of what could not be represented so
// the modal can say so. That is what lives here.
//
// **What is shared is the walk, not the writing.** Nothing in this file knows
// what a `.lk` node or a markdown heading looks like, and it must stay that
// way — the moment a format's vocabulary appears here, the next format has to
// work around it. Each format keeps its own converters and its own wording for
// the tally; see `docs/plan.md` § Phase 28.
//
// **Templates cannot reach this walk, and that is structural rather than a
// filter here.** The world's templates live in their own `TemplateLibrary`
// record and are never in `project-store`'s `nodes`, precisely so no walker
// has to remember to exclude them — see `docs/handoff.md`. Don't add a filter
// for them; if one ever looks necessary, something upstream has merged the two
// records and that is the bug.
//
// **Not the same `collectSubtree` as `template-library.ts`'s.** That one walks
// the template library's own nodes from a single root and hands back records;
// this one walks the project's pages from several roots and hands back ids.
// Same name, different data — they were never one function and merging them
// would force a shape on both.
import type { Node } from "../constants/schema";
import { sourceUrlFor, type AssetSources } from "./asset-sources";
import { assetFileName } from "./asset-urls";

/**
 * Collects the ids to export: every node given, plus everything beneath them.
 *
 * Every format carries whole subtrees. A `.lk` export does because
 * LegendKeeper's own offers no choice about it (confirmed against a live
 * account); a Markdown vault does because a folder with its contents missing
 * is not a vault. So this takes no "include descendants" flag — if a format
 * ever wants one, it wants a different function.
 */
export function collectSubtree(rootIds: string[], nodes: Node[]): Set<string> {
  const childrenByParent = new Map<string, Node[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node);
    childrenByParent.set(node.parentId, list);
  }

  const included = new Set<string>();
  const queue = [...rootIds];
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (included.has(id)) continue;
    included.add(id);
    for (const child of childrenByParent.get(id) ?? []) queue.push(child.id);
  }
  return included;
}

/** One page in the walk, with the three things every format asks about it. */
export type WalkedPage = {
  node: Node;
  /**
   * The nearest ancestor that is *also* in this walk, or null.
   *
   * Not `node.parentId`. One rule covers every shape an export can take: a
   * page hangs off its own parent when that parent came along too, and off the
   * top when it didn't. That is what lets a single nested page be exported
   * without dragging its ancestors with it, and what puts a whole world's
   * top-level pages under one root. Every format needs the same answer, and
   * getting it wrong is how a subtree export grows a hole in the middle.
   */
  parent: Node | null;
  /**
   * Position among the siblings that are also in this walk — not among the
   * page's siblings in the tree. Contiguous from 0, so it can be turned into
   * an ordering key without gaps.
   */
  index: number;
  /** 0 for a page with no included ancestor, 1 for its children, and so on. */
  depth: number;
};

/**
 * The pages to export, depth-first, in the order the tree actually shows.
 *
 * `orderedIdsFor` supplies each parent's sibling order, because the tree's own
 * ordering lives in the project rather than on the nodes. Depth-first in
 * display order is what makes an export reproducible: run it twice on an
 * untouched world and the files, the ordering keys and the headings all come
 * out identical.
 *
 * A node the walk includes but that `orderedIdsFor` never mentions is dropped,
 * which is deliberate — the tree is the authority on what exists, and a page
 * missing from it is a page the user cannot see.
 */
export function walkPages(input: {
  nodes: Node[];
  rootIds: string[];
  orderedIdsFor: (parentId: string | null) => string[];
}): WalkedPage[] {
  const { nodes, rootIds, orderedIdsFor } = input;
  const included = collectSubtree(rootIds, nodes);
  const byId = new Map(nodes.map((node) => [node.id, node]));

  const walked: WalkedPage[] = [];
  // Per included-parent, so `index` counts the siblings that travel rather
  // than the siblings that exist. A page whose two older sisters were left
  // behind is the first child of what it lands under, not the third.
  const nextIndex = new Map<string | null, number>();

  function visit(parentId: string | null, parent: Node | null, depth: number): void {
    for (const id of orderedIdsFor(parentId)) {
      const node = byId.get(id);
      if (!node) continue;

      if (included.has(id)) {
        const key = parent?.id ?? null;
        const index = nextIndex.get(key) ?? 0;
        nextIndex.set(key, index + 1);
        walked.push({ node, parent, index, depth });
        visit(id, node, depth + 1);
      } else {
        // Not included, but its descendants might be — an export of one deep
        // page reaches it through ancestors that are staying behind, and those
        // ancestors must not become a level of depth in the output.
        visit(id, parent, depth);
      }
    }
  }

  visit(null, null, 0);
  return walked;
}

// ---- The tally ----

/**
 * What an export could not represent, counted by kind.
 *
 * A tally rather than a list of messages, because the wording is the format's
 * own — "no folder-only concept" means nothing to a markdown vault — and
 * because the count is what makes the note worth reading. Counting is the
 * resolver's job in the picture case below, so no caller can forget to.
 */
export type LossyTally = Map<string, number>;

export function createLossyTally(): LossyTally {
  return new Map();
}

export function bumpLossy(tally: LossyTally, key: string, by = 1): void {
  tally.set(key, (tally.get(key) ?? 0) + by);
}

export function lossyCount(tally: LossyTally, key: string): number {
  return tally.get(key) ?? 0;
}

/** `1 picture` / `2 pictures`, for the plain-language notes each format writes. */
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// ---- Pictures ----

/**
 * The tally key the picture resolver counts under.
 *
 * Named rather than a bare string because two files read it — the resolver
 * writes it and each format's note reads it — and a typo in either would
 * silently report nothing wrong with an export that lost pictures.
 */
export const PICTURE_MISS = "pictureMiss";

/**
 * How the converters ask "what address can this picture be reached at?" — the
 * one question the whole picture-export problem reduces to.
 *
 * A resolver rather than the raw sources map, because there are three possible
 * answers and only one of them is a lookup: the address it was imported from,
 * the picture's own bytes written into a `data:` URI when that was asked for,
 * or nothing.
 */
export type PictureResolver = {
  /** For a picture in the writing, whose stored value is whatever the block held. */
  addressFor: (url: unknown) => string | undefined;
  /** The same question for a portrait or a banner, which hold a bare filename. */
  addressForFile: (fileName: string, knownSource: string | undefined) => string | undefined;
  /** Filenames in `assets/` that had no address, deduplicated, in first-seen order. */
  missingFiles: () => string[];
};

/**
 * Builds the resolver, and wires its misses into the tally under
 * `PICTURE_MISS`.
 *
 * `embedded` maps a filename in `assets/` to the picture's own bytes as a
 * `data:` URI, and is only ever populated when the user asked for that,
 * because it makes a file enormous. The usual shape is two passes: build once
 * without it to learn which files are needed (`missingFiles`), size those, then
 * build again with them.
 */
export function createPictureResolver(input: { sources?: AssetSources; embedded?: Record<string, string>; tally: LossyTally }): PictureResolver {
  const sources = input.sources ?? {};
  const embedded = input.embedded ?? {};
  // A Set because one picture can be on six pages and the caller is going to
  // size these; insertion-ordered so two runs list them the same way.
  const missing = new Set<string>();

  /**
   * Order matters. An address a picture was imported from is preferred over
   * the picture's own bytes even when both are available: it is a fraction of
   * the size, and it is the same file.
   */
  function addressForFile(fileName: string, knownSource: string | undefined): string | undefined {
    if (knownSource) return knownSource;
    if (embedded[fileName]) return embedded[fileName];
    missing.add(fileName);
    bumpLossy(input.tally, PICTURE_MISS);
    return undefined;
  }

  return {
    addressFor(url) {
      const known = sourceUrlFor(sources, url);
      if (known) return known;

      const fileName = typeof url === "string" ? assetFileName(url) : null;
      if (fileName && embedded[fileName]) return embedded[fileName];

      // A picture with no filename we recognise is still a miss worth
      // counting, but there is no file to offer to carry — so the tally moves
      // and the list does not.
      if (fileName) missing.add(fileName);
      bumpLossy(input.tally, PICTURE_MISS);
      return undefined;
    },
    addressForFile,
    missingFiles: () => [...missing],
  };
}
