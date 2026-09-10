// A world planned out as a folder of markdown (Phase 28).
//
// **Planned, not written.** Nothing here touches the disk: it decides which
// file every page becomes, what each `[[link]]` has to say to reach it, and
// which pictures have to be copied in — and hands that back as a plan. The
// writing is the caller's, which keeps every rule below arguable in a test
// rather than only in a real export. Rule 4 in `CLAUDE.md` says the same thing
// from the other side.
//
// **Obsidian's conventions, because a vault is a folder of markdown and there
// is no export on that side to match.** A page that holds pages becomes a file
// beside a folder of the same name — `Kaine.md` next to `Kaine/` — which is
// how Obsidian itself represents a note with notes under it. That is also the
// reason it round-trips without a lookup table, and it does not borrow a
// folder-shaped object: a page that holds pages is still one page here.
import { UNIVERSE_TEMPLATE_KEY, type Block, type Node } from "../constants/schema";
import { assetFileName } from "./asset-urls";
import { createLossyTally, lossyCount, plural, walkPages, type LossyTally, type WalkedPage } from "./export-walk";
import { sanitizeSegment } from "./filesystem-service";
import { BLOCK_DROPPED, BLOCK_FLATTENED, pageToMarkdown, type MarkdownPageContext } from "./markdown-page";

/** Where the copied pictures go, at the root of the vault. */
export const VAULT_ASSETS_DIR = "assets";

export type VaultFile = {
  /** Vault-relative, always with `/` separators — the writer joins for the OS. */
  path: string;
  text: string;
};

export type VaultAsset = {
  /** The filename inside the project's own `assets/`. */
  fileName: string;
  /** Vault-relative destination. */
  path: string;
};

export type VaultPlan = {
  files: VaultFile[];
  /** Every folder the writer has to make, parents before children. */
  folders: string[];
  assets: VaultAsset[];
  pageCount: number;
  /** Plain-language notes about anything that changed on the way out. */
  notes: string[];
};

/**
 * A page's place in the vault.
 *
 * `folder` is where its children go and is set for every page that has any —
 * so `Kaine.md` and `Kaine/` are one entry, not two competing ones.
 */
type Placed = {
  page: WalkedPage;
  /** The note's basename, sanitised and made unique among its siblings. */
  base: string;
  /** Vault-relative folder holding the note. "" at the top. */
  dir: string;
  /** Vault-relative folder for this page's children, or null when it has none. */
  folder: string | null;
};

/**
 * A universe is the vault's top level and gets a folder with no note of its
 * own.
 *
 * It has no tabs and no properties — it is a container for one version of the
 * world, chosen from a switcher rather than read as a page — so a note for it
 * would be a file holding nothing but its own name. The folder is the whole of
 * what it means here.
 */
function isFolderOnly(node: Node): boolean {
  return node.templateKey === UNIVERSE_TEMPLATE_KEY;
}

/**
 * Makes a name unique within one folder.
 *
 * ` (2)`, ` (3)` — the same suffix the app already appends when two siblings
 * collide on disk, so a vault of a world that has such a pair looks like the
 * project folder does rather than inventing a second convention.
 */
function uniqueIn(taken: Set<string>, base: string): string {
  if (!taken.has(base.toLowerCase())) {
    taken.add(base.toLowerCase());
    return base;
  }
  for (let n = 2; ; n += 1) {
    const candidate = `${base} (${n})`;
    if (!taken.has(candidate.toLowerCase())) {
      taken.add(candidate.toLowerCase());
      return candidate;
    }
  }
}

/**
 * Every page's file and folder, resolved together.
 *
 * Done in one pass over the walk because a child's folder is its parent's
 * name, and the parent's name is only final once collisions among *its*
 * siblings are settled — so the two cannot be worked out separately.
 */
function place(walked: WalkedPage[]): Map<string, Placed> {
  const placed = new Map<string, Placed>();
  // Per containing folder. A note and a folder of the same name are the
  // intended shape rather than a collision, so one set per folder covers both.
  const takenIn = new Map<string, Set<string>>();
  const hasChildren = new Set(walked.map((page) => page.parent?.id).filter((id): id is string => Boolean(id)));

  for (const page of walked) {
    const parent = page.parent ? placed.get(page.parent.id) : undefined;
    const dir = parent?.folder ?? "";
    const taken = takenIn.get(dir) ?? new Set<string>();
    takenIn.set(dir, taken);

    // A name that sanitises away entirely still needs a file. Falling back to
    // the template rather than to "Untitled" keeps a folder of them readable.
    const base = uniqueIn(taken, sanitizeSegment(page.node.name) || page.node.templateKey || "Page");
    const folder = hasChildren.has(page.node.id) ? joinVault(dir, base) : null;
    placed.set(page.node.id, { page, base, dir, folder });
  }

  return placed;
}

function joinVault(dir: string, name: string): string {
  return dir ? `${dir}/${name}` : name;
}

/**
 * What each page's `[[link]]` has to say.
 *
 * **A bare name wherever one is unambiguous.** Obsidian resolves a wikilink
 * against note basenames first, so `[[Kaine]]` is both what she would write by
 * hand and what survives the vault being reorganised afterwards. Only when two
 * notes share a basename does this fall back to the full path, which is
 * Obsidian's own tie-breaker — and it falls back for *both* of them, since a
 * link that resolves to whichever one Obsidian happened to index first is
 * worse than a long link.
 */
function linkTargets(placed: Map<string, Placed>): Map<string, string> {
  const byBase = new Map<string, string[]>();
  for (const [id, entry] of placed) {
    if (isFolderOnly(entry.page.node)) continue;
    const key = entry.base.toLowerCase();
    byBase.set(key, [...(byBase.get(key) ?? []), id]);
  }

  const targets = new Map<string, string>();
  for (const [id, entry] of placed) {
    if (isFolderOnly(entry.page.node)) continue;
    const shared = (byBase.get(entry.base.toLowerCase()) ?? []).length > 1;
    targets.set(id, shared ? joinVault(entry.dir, entry.base) : entry.base);
  }
  return targets;
}

/**
 * A path from one note's folder back to somewhere else in the vault.
 *
 * Relative rather than vault-absolute on purpose: Obsidian can be set to
 * either, other markdown readers only understand relative, and a picture that
 * shows in one program and not the other is the sort of thing that reads as
 * the export being broken.
 */
export function relativePath(fromDir: string, target: string): string {
  const from = fromDir ? fromDir.split("/") : [];
  const to = target.split("/");
  let shared = 0;
  while (shared < from.length && shared < to.length - 1 && from[shared] === to[shared]) shared += 1;
  const up = Array(from.length - shared).fill("..");
  return [...up, ...to.slice(shared)].join("/");
}

/**
 * Turns whatever an image block stored into the picture's filename in the
 * project's `assets/`, or null when it is not one of ours.
 *
 * A web address stays a web address — she embedded it deliberately, it is
 * hers (decided 2026-08-11), and copying somebody else's URL into a folder is
 * not something an export should do on her behalf.
 */
function assetOf(url: unknown): string | null {
  if (typeof url !== "string" || !url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return null;
  return assetFileName(url) ?? (url.includes("/") || url.includes("\\") ? null : url);
}

function describe(tally: LossyTally, assets: number): string[] {
  const notes: string[] = [];

  const flattened = lossyCount(tally, BLOCK_FLATTENED);
  if (flattened) {
    notes.push(
      `${plural(flattened, "block")} came out as plain writing — a meter is a line of text, an index or a database is a list of links, and side-by-side columns run one after the other. The writing is all there; those blocks are no longer live.`,
    );
  }

  const dropped = lossyCount(tally, BLOCK_DROPPED);
  if (dropped) {
    notes.push(`${plural(dropped, "thing")} had nothing to write down and was left out — a contents list Obsidian builds for itself, and icons that are drawings rather than characters.`);
  }

  if (assets) notes.push(`${plural(assets, "picture")} will be copied into the vault's ${VAULT_ASSETS_DIR} folder, with every reference pointed at the copy.`);

  return notes;
}

/**
 * The whole vault, worked out in memory.
 *
 * `rowsFor` resolves a collection block's pages and is passed in rather than
 * computed here, because the link index it needs takes the project's
 * storylines too and this file has no business knowing that.
 */
export function planMarkdownVault(input: {
  nodes: Node[];
  rootIds: string[];
  orderedIdsFor: (parentId: string | null) => string[];
  rowsFor: (node: Node, block: Block) => Node[];
}): VaultPlan {
  const walked = walkPages({ nodes: input.nodes, rootIds: input.rootIds, orderedIdsFor: input.orderedIdsFor });
  const placed = place(walked);
  const targets = linkTargets(placed);
  const tally = createLossyTally();

  // Insertion-ordered so two exports of an untouched world list them the same
  // way, which is what makes the plan comparable between runs.
  const assets = new Map<string, string>();

  const files: VaultFile[] = [];
  const folders: string[] = [];

  for (const entry of placed.values()) {
    if (entry.folder) folders.push(entry.folder);
    if (isFolderOnly(entry.page.node)) continue;

    const ctx: MarkdownPageContext = {
      linkFor: (nodeId, label) => {
        const target = targets.get(nodeId);
        if (!target) return null;
        // The label is dropped when it is the target already, so the common
        // case stays the short form somebody would have typed by hand.
        return !label || label === target ? `[[${target}]]` : `[[${target}|${label}]]`;
      },
      pictureAt: (url) => {
        if (typeof url === "string" && (/^https?:\/\//i.test(url) || url.startsWith("data:"))) return url;
        const fileName = assetOf(url);
        if (!fileName) return null;
        const vaultPath = `${VAULT_ASSETS_DIR}/${fileName}`;
        assets.set(fileName, vaultPath);
        return relativePath(entry.dir, vaultPath);
      },
      rowsFor: input.rowsFor,
      tally,
    };

    files.push({ path: `${joinVault(entry.dir, entry.base)}.md`, text: pageToMarkdown(entry.page.node, ctx) });
  }

  return {
    files,
    // Parents before children, so a writer can make them in order without
    // relying on a recursive mkdir it might not have.
    folders: [...new Set(folders)].sort((a, b) => a.split("/").length - b.split("/").length || (a < b ? -1 : 1)),
    assets: [...assets].map(([fileName, path]) => ({ fileName, path })),
    pageCount: files.length,
    notes: describe(tally, assets.size),
  };
}
