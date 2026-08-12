// Which pictures in `assets/` are actually being used, and by what.
//
// The Assets tab is built on trusting this, so it is written to be exhaustive
// rather than convenient: a picture reported as unused gets a delete button,
// and a miss here means a page quietly losing its picture. See docs/plan.md
// Phase 17, which lists the four places a picture can be in use — this file is
// all four.
//
// Pure, and deliberately takes both records as arguments rather than reaching
// for the store: the template library is the one everything else forgets, and
// making it a parameter means a caller cannot leave it out by accident.
import { ASSET_REF_PREFIX } from "../constants/paths";
import type { Node, TemplateLibrary } from "../constants/schema";

/** Where one use of a picture is. */
export type AssetUse = {
  /**
   * `portrait` and `banner` are slots on a page; `page` is an image block
   * written into one of its tabs. Kept apart because removing them is
   * different work — a slot is cleared, a block is taken out.
   */
  where: "portrait" | "banner" | "page";
  /** The node holding it, in whichever record `source` names. */
  nodeId: string;
  nodeName: string;
  /**
   * Which record the node is in. A picture used only by a template is *in
   * use* — deleting it would empty the template — but it isn't on any page, and
   * the tab has to be able to say so.
   */
  source: "project" | "template";
};

export type AssetUsageIndex = Map<string, AssetUse[]>;

/**
 * A BlockNote block, as far as this file needs to care: something that may
 * carry a `url` prop and may hold more blocks.
 *
 * Typed loosely on purpose. The stored document is whatever BlockNote wrote,
 * the schema has custom blocks in it, and a stricter type here would be a
 * second definition of the editor's shape that could drift from the real one.
 */
type BlockLike = { props?: { url?: unknown }; children?: unknown };

/**
 * Every asset filename referenced by an image block inside `content`,
 * including blocks nested inside other blocks.
 *
 * **Nested children are walked rather than assumed away**: BlockNote nests a
 * block under another whenever one is indented beneath it, and a picture
 * indented under a list item is as much in use as one at the top level. A flat
 * scan would report it unused and offer to delete it.
 */
export function assetRefsInContent(content: unknown): string[] {
  const found: string[] = [];

  const walk = (blocks: unknown): void => {
    if (!Array.isArray(blocks)) return;
    for (const block of blocks as BlockLike[]) {
      if (!block || typeof block !== "object") continue;
      const url = block.props?.url;
      if (typeof url === "string" && url.startsWith(ASSET_REF_PREFIX)) {
        found.push(url.slice(ASSET_REF_PREFIX.length));
      }
      walk(block.children);
    }
  };

  walk(content);
  return found;
}

/** Every asset filename this one node points at, by any of the three routes. */
function usesIn(node: Node): { fileName: string; where: AssetUse["where"] }[] {
  const uses: { fileName: string; where: AssetUse["where"] }[] = [];
  if (node.image) uses.push({ fileName: node.image, where: "portrait" });
  if (node.banner) uses.push({ fileName: node.banner, where: "banner" });
  // Hidden tabs included. A hidden tab is one she isn't looking at, not one
  // that stopped holding what's written in it.
  for (const tab of node.tabs) {
    for (const fileName of assetRefsInContent(tab.content)) uses.push({ fileName, where: "page" });
  }
  return uses;
}

/**
 * Filename → everywhere it's used, across the project *and* the template
 * library.
 *
 * The template half is the one that's easy to leave out and expensive to get
 * wrong: `saveAsTemplate` copies a page's portrait and banner files but not the
 * pictures written inside its tabs, so a template and the page it came from can
 * legitimately share one file. Nothing has ever deleted an asset before, so
 * that has been harmless — this is what makes it reachable.
 */
export function indexAssetUsage(nodes: Record<string, Node>, templates: TemplateLibrary): AssetUsageIndex {
  const index: AssetUsageIndex = new Map();

  const add = (fileName: string, use: AssetUse) => {
    const existing = index.get(fileName);
    if (existing) existing.push(use);
    else index.set(fileName, [use]);
  };

  for (const node of Object.values(nodes)) {
    for (const { fileName, where } of usesIn(node)) {
      add(fileName, { where, nodeId: node.id, nodeName: node.name, source: "project" });
    }
  }

  for (const node of Object.values(templates.nodes)) {
    for (const { fileName, where } of usesIn(node)) {
      add(fileName, { where, nodeId: node.id, nodeName: node.name, source: "template" });
    }
  }

  return index;
}

/**
 * Is anything still pointing at this file?
 *
 * **This is what makes a shared picture safe, and it has to be asked *after*
 * the change that might have orphaned the file, not before.** Until the
 * library shipped, every asset file had exactly one owner: `setNodeImage`
 * replaced a portrait and deleted the old file outright, because nothing else
 * could possibly have been holding it. Picking a picture that's already in the
 * project breaks that assumption on purpose — one file, any number of
 * references — so an unconditional delete became a way to empty someone else's
 * page. Every delete of an asset file now goes through this first.
 *
 * Early-exits rather than building the whole index: the callers are asking
 * about one file at a time, on a path that's about to touch the disk anyway.
 */
export function isAssetInUse(nodes: Record<string, Node>, templates: TemplateLibrary, fileName: string): boolean {
  for (const node of Object.values(nodes)) {
    if (usesIn(node).some((use) => use.fileName === fileName)) return true;
  }
  for (const node of Object.values(templates.nodes)) {
    if (usesIn(node).some((use) => use.fileName === fileName)) return true;
  }
  return false;
}

/** One file in `assets/`, as the tab lists it. */
export type AssetFile = {
  fileName: string;
  /** Bytes on disk. */
  size: number;
};

export type AssetEntry = AssetFile & {
  uses: AssetUse[];
  /** Nothing points at this file — the only state in which it can be deleted. */
  isUnused: boolean;
};

/**
 * The listing the tab draws: every file on disk, with what uses it.
 *
 * Driven by the *directory*, not by the index — a reference to a file that
 * isn't there is a broken picture, not an entry in a list of pictures you have.
 * (The page showing it renders an empty box; see asset-urls.)
 *
 * Unused first, then by name. Unused is the half she can act on, and burying it
 * under forty pictures that are fine would make the tab a scrolling exercise.
 */
export function buildAssetEntries(files: AssetFile[], usage: AssetUsageIndex): AssetEntry[] {
  return files
    .map((file) => {
      const uses = usage.get(file.fileName) ?? [];
      return { ...file, uses, isUnused: uses.length === 0 };
    })
    .sort((a, b) => {
      if (a.isUnused !== b.isUnused) return a.isUnused ? -1 : 1;
      return a.fileName.localeCompare(b.fileName);
    });
}

/**
 * "3 pages", "1 template", "Not used anywhere" — the line under a thumbnail.
 *
 * Counted in *nodes* rather than uses: one page carrying a picture as both its
 * portrait and its banner is one page you'd have to go and look at, and "2
 * pages" pointing at the same page reads as a bug.
 */
export function describeUses(uses: AssetUse[]): string {
  if (uses.length === 0) return "Not used anywhere";

  const pages = new Set<string>();
  const templates = new Set<string>();
  for (const use of uses) (use.source === "project" ? pages : templates).add(use.nodeId);

  const parts: string[] = [];
  if (pages.size > 0) parts.push(`${pages.size} ${pages.size === 1 ? "page" : "pages"}`);
  if (templates.size > 0) parts.push(`${templates.size} ${templates.size === 1 ? "template" : "templates"}`);
  return parts.join(" · ");
}

/** "12 KB", "1.4 MB" — a file size someone can read at a glance. */
export function describeSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
