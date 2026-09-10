// The whole world as one markdown file (Phase 28).
//
// **The same walker and the same converter as the vault, arranged
// differently.** Where `markdown-vault.ts` gives every page a file and links
// them with `[[wikilinks]]`, this gives every page a heading and links them
// with anchors into the one document. Both read the tree through
// `walkPages`, so a page that comes out third in one comes out third in the
// other.
//
// **It is the format for handing somebody the world to read in one scroll**,
// and two rules follow from that rather than from markdown:
//
//   - **A page sits as deep in the headings as it sits in the tree.** That is
//     what makes the file navigable at all — an outline pane in any editor
//     then shows the tree she arranged.
//   - **Pictures are not copied out beside it**, because a single file with a
//     folder of images next to it is not one file. A picture with a web
//     address stays a web address and still shows; one from her own disk has
//     nowhere to point, so it goes and is counted. That is the inverse of the
//     vault's rule and the reason the two are separate exports.
import type { Block, Node } from "../constants/schema";
import { bumpLossy, createLossyTally, lossyCount, plural, walkPages, type LossyTally } from "./export-walk";
import { BLOCK_DROPPED, BLOCK_FLATTENED, pageBody, printedProperties, type MarkdownPageContext } from "./markdown-page";

/** Counted separately from a flattened block: this is writing that is gone. */
export const PICTURE_LEFT_BEHIND = "pictureLeftBehind";

export type SingleFilePlan = {
  text: string;
  pageCount: number;
  notes: string[];
};

/**
 * A heading's anchor, the way GitHub makes one.
 *
 * Widely enough implemented — GitHub, Obsidian, VS Code, pandoc — that a link
 * built this way jumps to the right place in every reader anybody is likely to
 * open the file in. There is no standard for this, so matching the most common
 * implementation is the whole of the reasoning.
 */
export function anchorSlug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/ +/g, "-");
}

/**
 * Unique anchors for every page, in the order they appear.
 *
 * Two pages called Sable produce the same slug, and a reader clicking the
 * second would land on the first. GitHub's own answer is a counter suffix, so
 * that is what this does — and it has to be assigned in document order,
 * because that is the order the reader's own renderer will assign them in.
 */
function anchors(names: { id: string; name: string }[]): Map<string, string> {
  const used = new Map<string, number>();
  const out = new Map<string, string>();
  for (const { id, name } of names) {
    const base = anchorSlug(name) || "page";
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    out.set(id, seen === 0 ? base : `${base}-${seen}`);
  }
  return out;
}

function describe(tally: LossyTally): string[] {
  const notes: string[] = [];

  const flattened = lossyCount(tally, BLOCK_FLATTENED);
  if (flattened) {
    notes.push(
      `${plural(flattened, "block")} came out as plain writing — a meter is a line of text, an index or a database is a list of links, and side-by-side columns run one after the other.`,
    );
  }

  const pictures = lossyCount(tally, PICTURE_LEFT_BEHIND);
  if (pictures) {
    notes.push(
      `${plural(pictures, "picture")} from your own computer won't be in it — one file means one file, so there's no folder beside it to put them in. Their captions stay. Pictures you added by web address still show. The Markdown folder export takes them all.`,
    );
  }

  const dropped = lossyCount(tally, BLOCK_DROPPED);
  if (dropped) notes.push(`${plural(dropped, "thing")} had nothing to write down and was left out — a contents list, and icons that are drawings rather than characters.`);

  return notes;
}

export function planSingleMarkdown(input: {
  projectName: string;
  nodes: Node[];
  rootIds: string[];
  orderedIdsFor: (parentId: string | null) => string[];
  rowsFor: (node: Node, block: Block) => Node[];
}): SingleFilePlan {
  const walked = walkPages({ nodes: input.nodes, rootIds: input.rootIds, orderedIdsFor: input.orderedIdsFor });
  const slugs = anchors(walked.map((page) => ({ id: page.node.id, name: page.node.name })));
  const tally = createLossyTally();

  // By id, because `linkFor` runs once per link in the world and a scan of
  // every node each time is the difference between instant and noticeable.
  const byId = new Map(input.nodes.map((node) => [node.id, node]));

  const ctx: MarkdownPageContext = {
    linkFor: (nodeId, label) => {
      const slug = slugs.get(nodeId);
      if (!slug) return null;
      return `[${label || byId.get(nodeId)?.name || slug}](#${slug})`;
    },
    pictureAt: (url) => {
      // A web address still resolves for whoever opens the file, so it stays.
      if (typeof url === "string" && (/^https?:\/\//i.test(url) || url.startsWith("data:"))) return url;
      if (url) bumpLossy(tally, PICTURE_LEFT_BEHIND);
      return null;
    },
    rowsFor: input.rowsFor,
    tally,
  };

  // One front matter block at the very top, naming the whole document. Per
  // page there is nowhere to put one, which is why properties become a list
  // under each heading instead.
  const parts: string[] = [`---\ntitle: "${input.projectName.replace(/"/g, '\\"')}"\n---`];

  for (const page of walked) {
    const level = Math.min(6, page.depth + 1);
    parts.push(`${"#".repeat(level)} ${page.node.name}`);

    const meta = metaLines(page.node, ctx);
    if (meta) parts.push(meta);

    parts.push(...pageBody(page.node, ctx, level));
  }

  return { text: `${parts.join("\n\n")}\n`, pageCount: walked.length, notes: describe(tally) };
}

/**
 * The page's tags and properties, as a short list under its heading.
 *
 * **Not front matter, because a file can only have one block of it and it has
 * to be at the top.** So the same facts the vault puts in a note's properties
 * are written as ordinary lines here — which is also what somebody reading in
 * one scroll would rather see than a fenced block of YAML every few pages.
 */
function metaLines(node: Node, ctx: MarkdownPageContext): string | null {
  const parts: string[] = [];
  if (node.tags.length > 0) parts.push(`*${node.tags.map((tag) => `#${tag}`).join(" ")}*`);

  // **A list, not a run of lines.** A single newline between two lines is a
  // *soft* break in markdown, so `**Summary** — …` written straight under the
  // tags renders as one long run-on paragraph rather than as separate facts.
  // Bullets are the portable way to say "these are separate": the alternative
  // hard break is two trailing spaces, which editors strip on save.
  const properties = printedProperties(node, ctx).map(
    ({ label, printed }) => `- **${label}** — ${Array.isArray(printed) ? printed.join(", ") : printed}`,
  );
  if (properties.length > 0) parts.push(properties.join("\n"));

  return parts.length > 0 ? parts.join("\n\n") : null;
}
