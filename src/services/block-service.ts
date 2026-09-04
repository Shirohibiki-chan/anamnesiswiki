// The sidebar's block list: where one comes from, and the pure edits made to
// it. Phase 18a. Lives here rather than in the panel because CLAUDE.md puts
// logic in services, and because the derivation below is the difference
// between an existing world's sidebars looking the way they always did and
// every page in it silently emptying on upgrade.
import {
  type Block,
  type BlockKind,
  type MeterEntry,
  type CustomPropertySpec,
  type Node,
  type Tab,
  BLOCK_ID_SEPARATOR,
  BLOCK_REF_TYPE,
  FOLDER_TEMPLATE_KEY,
  INFOBOX_TYPE,
} from "../constants/schema";
import { orderProperties, type RenderableProperty } from "./property-service";

// The templates that begin with a picture, decided 2026-08-21: the ones about
// a thing you can picture. `note` and `blank` start empty, and faction and
// event are deliberately out — a crest or a battle illustration reads as more
// optional than a character portrait, and a block nobody wanted is worse than
// one they add themselves.
export const TEMPLATES_STARTING_WITH_IMAGE = new Set(["character", "race", "creature", "location", "item"]);

export function newBlock(kind: BlockKind, extra: Partial<Block> = {}): Block {
  return { id: crypto.randomUUID(), kind, ...extra };
}

/**
 * The id a derived block carries.
 *
 * **Derived ids must be stable across calls, and a random one is not.** A page
 * that predates blocks is derived twice for every edit — once by the panel
 * that rendered the block, and once by the store re-deriving to apply the
 * change — and with `crypto.randomUUID()` those two lists agree about nothing.
 * The id the user clicked matches no block in the list being edited, so the
 * edit lands nowhere and the panel silently refuses to change. Measured
 * 2026-08-21, in a probe, after the unit tests passed.
 *
 * Ids only have to be unique within one node, so naming them after what they
 * point at is enough, and it makes derivation idempotent as a bonus.
 */
function derivedId(kind: BlockKind, key?: string): string {
  return key ? `derived-${kind}-${key}` : `derived-${kind}`;
}

/**
 * The default order a page's properties render in when nobody has arranged
 * them: fixed template fields, then refs, then the page's own custom ones.
 *
 * Refs sit apart from the other template fields on purpose — a Friends or
 * Participants list grows without limit, and interleaved by default it would
 * shove a Summary off the bottom of the panel. It is only ever the *input* to
 * an explicit order, never enforced after one exists, because interleaving
 * them is the entire point of dragging one.
 */
export function defaultPropertyOrder(schema: RenderableProperty[], custom: CustomPropertySpec[]): RenderableProperty[] {
  return [
    ...schema.filter((prop) => prop.type !== "refs"),
    ...schema.filter((prop) => prop.type === "refs"),
    ...custom,
  ];
}

/**
 * The block list for a page that has never had one — every page written
 * before Phase 18a.
 *
 * It reproduces the old fixed panel exactly rather than proposing a nicer
 * arrangement: picture at the top, the properties in the order that page
 * already resolved to, tags at the bottom. Two of those were unconditional in
 * the old panel and stay unconditional here, so a page with no picture still
 * gets its "Add an image" slot and a page with no tags still gets somewhere to
 * type one. Opening an old world must not look like anything happened to it.
 *
 * This is derivation on read, deliberately, not a migration pass over the
 * disk — the same precedent `customProperties` set. Nothing is written until
 * the user actually edits the panel, so opening a world does not rewrite it.
 */
export function deriveBlocks(node: Node, schema: RenderableProperty[]): Block[] {
  if (node.templateKey === FOLDER_TEMPLATE_KEY) return [];

  const ordered = orderProperties(defaultPropertyOrder(schema, node.customProperties ?? []), node.propertyOrder);
  return [
    { id: derivedId("image"), kind: "image" },
    ...ordered.map((prop): Block => ({ id: derivedId("property", prop.key), kind: "property", propertyKey: prop.key })),
    { id: derivedId("tags"), kind: "tags" },
  ];
}

/**
 * The blocks to render for a node, whether it has authored a list or not.
 *
 * **Absent and empty are different and both are load-bearing.** A page from
 * before Phase 18a has no `blocks` field and gets the derived list above; a
 * page that has one — including an empty one — is showing exactly what it
 * says, because a blank new page's empty sidebar is a real answer and not a
 * missing value.
 */
export function blocksFor(node: Node, schema: RenderableProperty[]): Block[] {
  return node.blocks ? migrateBlocks(node.blocks) : deriveBlocks(node, schema);
}

/**
 * Brings a stored list up to date with block kinds that have since changed.
 *
 * Phase 18b replaced the `link` block with a `collection` whose source is
 * "manual" — the same feature holding a list rather than one page — so a page
 * carrying a link block from 18a is converted here rather than the app
 * supporting two ways to link forever. Phase 18c's meters went the same way a
 * day later: one reading on the block became a list of them, and a block from
 * before that is lifted into a list of one here.
 *
 * **Returns the array it was given when nothing needs changing**, which is not
 * a micro-optimisation: `blocksFor` runs on every render, and handing back a
 * fresh array each time would make every sidebar re-render on every keystroke
 * anywhere in the app, and would break identity checks callers rely on.
 */
/**
 * The ids of the blocks this page's writing has claimed (Phase 19.5).
 *
 * **This is the whole of "where does a block live".** Nothing records that a
 * block is in the page body; the document that holds a pointer to it is the
 * record, and everything else is read off that. So the sidebar is
 * `blocksFor(node)` minus this, and a block that appears in neither has been
 * deleted rather than moved.
 *
 * **Hidden tabs count.** Hiding a tab hides what is written in it, and a block
 * sitting in that writing is part of it — the alternative has hiding a tab
 * quietly push blocks back into the sidebar, which is a rearrangement nobody
 * asked for. Settled in `docs/plan.md` Phase 19.5.
 *
 * **It walks children as well as the top level**, because BlockNote nests: a
 * pointer inside a toggle heading or a list item is as real as one at the root,
 * and missing it would show the same block in two places at once.
 */
export function blockIdsInPage(tabs: Tab[]): Set<string> {
  const found = new Set<string>();

  function walk(documentBlocks: unknown): void {
    if (!Array.isArray(documentBlocks)) return;
    for (const entry of documentBlocks) {
      // Saved documents are `unknown[]` on purpose — they are BlockNote's shape,
      // not ours, and a file on disk can hold anything. Every step down is
      // checked rather than asserted.
      if (!entry || typeof entry !== "object") continue;
      const candidate = entry as { type?: unknown; props?: unknown; children?: unknown };
      for (const blockId of claimedBy(candidate)) found.add(blockId);
      walk(candidate.children);
    }
  }

  for (const tab of tabs) walk(tab.content);
  return found;
}

/**
 * The page blocks one entry in a document lays claim to.
 *
 * **Two kinds of claim, and both have to be read here or the sidebar draws a
 * block twice.** A `blockRef` names one block; an infobox names however many it
 * is holding. Anything else names none. Keeping the two in one function is what
 * stops a third kind being added later and only being taught to one of the two
 * places that need it — the sweep below reads the same answer.
 */
function claimedBy(entry: { type?: unknown; props?: unknown }): string[] {
  const props = entry.props;
  if (!props || typeof props !== "object") return [];

  if (entry.type === BLOCK_REF_TYPE) {
    const blockId = (props as { blockId?: unknown }).blockId;
    return typeof blockId === "string" && blockId ? [blockId] : [];
  }

  if (entry.type === INFOBOX_TYPE) return parseBlockIds((props as { blockIds?: unknown }).blockIds);

  return [];
}

/**
 * The ids an infobox is holding, read out of the flat string it stores them in.
 *
 * **The only place that knows how that string is put together**, along with
 * `serialiseBlockIds` below. BlockNote's prop schema takes strings, numbers and
 * booleans and not arrays, so the list has to be encoded — and an encoding that
 * more than one file knows is an encoding that will eventually be read one way
 * and written another.
 *
 * Anything unexpected reads as an empty list rather than throwing: this parses
 * a file on somebody's disk, and a corrupt prop should cost the blocks in one
 * infobox, not the page.
 */
export function parseBlockIds(value: unknown): string[] {
  if (typeof value !== "string" || !value) return [];
  return value.split(BLOCK_ID_SEPARATOR).filter(Boolean);
}

/** The inverse of `parseBlockIds` — see there for why this is not inlined. */
export function serialiseBlockIds(ids: string[]): string {
  return ids.filter(Boolean).join(BLOCK_ID_SEPARATOR);
}

/**
 * The blocks the sidebar draws: the page's blocks, less the ones its writing
 * has taken (Phase 19.5).
 *
 * Separate from `blocksFor` rather than folded into it because the page body
 * needs the unfiltered list to find the block a pointer names — the two callers
 * want opposite halves of the same answer.
 */
export function sidebarBlocks(blocks: Block[], claimed: Set<string>): Block[] {
  if (claimed.size === 0) return blocks;
  return blocks.filter((block) => !claimed.has(block.id));
}

/**
 * The same document with pointers to blocks that no longer exist taken out
 * (Phase 19.5).
 *
 * **A dangling pointer is an ordinary state, not corruption.** The record and
 * the pointer are written through different paths — the panel saves
 * `node.blocks`, the editor saves the document — so they cannot be committed
 * together, and removing a block from its own menu leaves the document naming
 * something that has gone. It draws nothing, which is right; what is wrong is
 * leaving an invisible block in the writing for her to find with the backspace
 * key.
 *
 * **So it is swept on read rather than repaired on delete.** The editor is
 * built fresh for every page and every tab, which makes reading the one moment
 * that is guaranteed to happen and cheap to hook. Nothing is written here — the
 * cleaned document reaches disk the next time she types, through the same save
 * as any other edit.
 *
 * Returns the original array when there is nothing to sweep, so the ordinary
 * case allocates nothing.
 */
export function withoutDanglingBlockRefs(content: unknown[], existing: Set<string>): unknown[] {
  let changed = false;

  function danglingPointer(entry: unknown): boolean {
    if (!entry || typeof entry !== "object") return false;
    const candidate = entry as { type?: unknown; props?: unknown };
    if (candidate.type !== BLOCK_REF_TYPE) return false;
    const props = candidate.props;
    const blockId = props && typeof props === "object" ? (props as { blockId?: unknown }).blockId : undefined;
    return typeof blockId !== "string" || !existing.has(blockId);
  }

  /**
   * An infobox with a dead id in it, pruned rather than removed.
   *
   * **The frame is not the pointer, and this is the difference that matters.**
   * A lone `blockRef` *is* its block, so losing the block means losing the
   * block in the page. An infobox is a container she put there on purpose and
   * may still be holding four other blocks — deleting it because one of its
   * contents was removed would take the other four out of the page with it. An
   * empty infobox is a perfectly ordinary thing to leave behind: it carries its
   * own Add Block.
   */
  function pruned(entry: unknown): unknown {
    if (!entry || typeof entry !== "object") return entry;
    const candidate = entry as { type?: unknown; props?: unknown };
    if (candidate.type !== INFOBOX_TYPE) return entry;
    const props = candidate.props;
    if (!props || typeof props !== "object") return entry;

    const ids = parseBlockIds((props as { blockIds?: unknown }).blockIds);
    const alive = ids.filter((id) => existing.has(id));
    if (alive.length === ids.length) return entry;

    changed = true;
    return { ...candidate, props: { ...props, blockIds: serialiseBlockIds(alive) } };
  }

  function sweep(documentBlocks: unknown[]): unknown[] {
    const kept: unknown[] = [];
    for (const entry of documentBlocks) {
      if (danglingPointer(entry)) {
        changed = true;
        continue;
      }
      const candidate = pruned(entry) as { children?: unknown } | null;
      if (candidate && typeof candidate === "object" && Array.isArray(candidate.children)) {
        const children = sweep(candidate.children);
        kept.push(children === candidate.children ? candidate : { ...candidate, children });
        continue;
      }
      kept.push(candidate);
    }
    return changed ? kept : documentBlocks;
  }

  const swept = sweep(content);
  return changed ? swept : content;
}

export function migrateBlocks(blocks: Block[]): Block[] {
  const stale = (block: Block) =>
    block.kind === "link" || (block.kind === "meter" && !block.meters);
  if (!blocks.some(stale)) return blocks;

  return blocks.map((block) => {
    if (block.kind === "link") {
      return {
        ...block,
        kind: "collection" as const,
        source: "manual" as const,
        targetIds: block.targetId ? [block.targetId] : [],
        targetId: undefined,
      };
    }

    // A meter block used to hold one reading directly. It becomes a list of
    // one, keeping whatever was set — a meter she had already filled in must
    // not come back empty because the block learned to hold four.
    if (block.kind === "meter" && !block.meters) {
      const first: MeterEntry = { id: `${block.id}-1` };
      if (block.value !== undefined) first.value = block.value;
      if (block.max !== undefined) first.max = block.max;
      return { ...block, meters: [first], value: undefined, max: undefined };
    }

    return block;
  });
}

/**
 * The blocks a page made from a template starts with.
 *
 * The template's own property list is the seed — it already decided what a
 * page of this kind is asked for, and Phase 18a reinterprets that array as an
 * ordered block list rather than inventing a second one to keep in step with
 * it. A picture goes on top for the templates that want one, and tags close
 * every template that has any fields at all.
 */
export function seedBlocks(templateKey: string, schema: RenderableProperty[], custom: CustomPropertySpec[] = []): Block[] {
  if (templateKey === FOLDER_TEMPLATE_KEY) return [];

  const ordered = defaultPropertyOrder(schema, custom);
  if (ordered.length === 0) return TEMPLATES_STARTING_WITH_IMAGE.has(templateKey) ? [newBlock("image")] : [];

  return [
    ...(TEMPLATES_STARTING_WITH_IMAGE.has(templateKey) ? [newBlock("image")] : []),
    ...ordered.map((prop) => newBlock("property", { propertyKey: prop.key })),
    newBlock("tags"),
  ];
}

/** Moves the block at `fromIndex` to `toIndex`, leaving the rest in order. */
/**
 * What a page keeps when its template is swapped underneath it.
 *
 * **A template change must not take a page's writing with it, and it used to.**
 * Applying one of the project's own templates replaces the page's whole
 * property set with the template's — so a field the incoming template has no
 * equivalent of lost its value, and the block that showed it was left pointing
 * at a key nothing could resolve. The panel drew that as *Missing property*,
 * which was the only visible sign, and the text was still in the file with no
 * way back to it. Reported from use 2026-08-27.
 *
 * So anything the page had, that the incoming set has no home for, **becomes a
 * custom property of that page**: the value survives, it is visible, it is
 * editable, and the block that was already showing it keeps working. A field
 * from a template and a field somebody typed in are the same thing once they
 * are on a page — which is what makes converting one to the other honest
 * rather than a trick.
 *
 * **Only fields with something in them are carried.** An empty field the new
 * template does not have is not a loss, and carrying it would leave every page
 * accumulating the blank fields of every template it has ever been. Blocks
 * pointing at those are dropped, since after this there is nothing left for
 * them to point at.
 *
 * Order is deliberate: the incoming template's own fields first, then what was
 * rescued, so a page swapped to a template reads as that template with the
 * leftovers after it rather than the other way round.
 */
export function planTemplateSwap(
  node: Node,
  previousSchema: RenderableProperty[],
  nextSchema: RenderableProperty[],
  incoming: { properties?: Record<string, unknown>; customProperties?: CustomPropertySpec[] } = {},
): {
  properties: Record<string, unknown>;
  customProperties: CustomPropertySpec[] | undefined;
  blocks: Block[];
  /** The fields that were rescued, for whatever wants to say so. */
  carried: CustomPropertySpec[];
} {
  const incomingValues = incoming.properties ?? node.properties;
  const incomingCustom = incoming.customProperties ?? node.customProperties ?? [];

  const nextKeys = new Set([...nextSchema.map((prop) => prop.key), ...incomingCustom.map((spec) => spec.key)]);
  const previousCustom = node.customProperties ?? [];
  const previousByKey = new Map<string, CustomPropertySpec>([
    ...previousSchema.map((prop): [string, CustomPropertySpec] => [
      prop.key,
      { key: prop.key, label: prop.label, type: prop.type, ...(prop.options ? { options: prop.options } : {}) },
    ]),
    ...previousCustom.map((spec): [string, CustomPropertySpec] => [spec.key, spec]),
  ]);

  const carried: CustomPropertySpec[] = [];
  const properties: Record<string, unknown> = { ...incomingValues };
  for (const [key, spec] of previousByKey) {
    if (nextKeys.has(key)) continue;
    if (!isFilledIn(node.properties[key])) continue;
    carried.push(spec);
    properties[key] = node.properties[key];
  }

  const resolvable = new Set([...nextKeys, ...carried.map((spec) => spec.key)]);
  const blocks = blocksFor(node, previousSchema).filter(
    (block) => block.kind !== "property" || (block.propertyKey !== undefined && resolvable.has(block.propertyKey)),
  );

  // Everything left over is a key nothing can resolve *and* nothing was in —
  // anything with something in it was carried above, which is what makes
  // dropping these safe rather than the bug this function exists to fix. It
  // stops a page collecting the empty fields of every template it has been.
  for (const key of Object.keys(properties)) {
    if (!resolvable.has(key)) delete properties[key];
  }

  const customProperties = [...incomingCustom, ...carried];
  return {
    properties,
    // Absent rather than empty, matching what a page that never had one looks
    // like — see `customProperties` in schema.ts.
    customProperties: customProperties.length > 0 ? customProperties : undefined,
    blocks,
    carried,
  };
}

/** Is there anything in this value worth keeping? */
function isFilledIn(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function moveBlock(blocks: Block[], fromIndex: number, toIndex: number): Block[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return blocks;
  if (fromIndex >= blocks.length || toIndex >= blocks.length) return blocks;
  const next = [...blocks];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/**
 * A copy of one block, inserted directly under the original.
 *
 * The copy gets a fresh id and keeps everything else, including a `text`
 * block's writing — duplicating a block whose point is its content and
 * getting an empty one back would be useless. A `property` block is the one
 * case that copies a pointer rather than a value, which means two blocks
 * showing the same field; that is allowed, and editing either edits the one
 * property, because the value was never in the block.
 */
export function duplicateBlock(blocks: Block[], blockId: string, picture?: BlockPicture): Block[] {
  const index = blocks.findIndex((block) => block.id === blockId);
  if (index === -1) return blocks;
  const copy: Block = { ...blocks[index], id: crypto.randomUUID() };
  const next = [...blocks];
  // **A copy of the page's picture keeps the picture, and stops being the
  // page's.** Only one block can be that, so the copy holds the same photo on
  // its own record — the same file, which is what the picture library is for.
  // Without this, duplicating the one block whose content is a photograph
  // would hand back an empty frame.
  next.splice(index + 1, 0, copy.kind === "image" && picture ? withBlockImage(copy, picture) : copy);
  return next;
}

/**
 * ---- Image blocks and the page's own picture (Phase 19.5) ----
 *
 * **Every image block holds its own picture, and one of them is the page's.**
 * The page's picture is `node.image` — what the tree row, the hover preview and
 * the LK export show — so that one cannot simply become a field on a block;
 * what it becomes instead is a block that *reads the node*. Every other image
 * block reads its own record. One picture, one place, and no two fields that
 * can disagree about the same photograph.
 *
 * Before this, an image block was a window onto `node.image` and nothing else,
 * so a picture dropped into one in the middle of the writing became the page's
 * portrait and a second image block showed the same photo. Her call, 2026-09-02:
 * see `docs/plan.md` Phase 19.5.
 */

/** The image blocks in a list, in the order they are drawn. */
export function imageBlocks(blocks: Block[]): Block[] {
  return blocks.filter((block) => block.kind === "image");
}

/**
 * Which block draws the page's own picture, or undefined if none does.
 *
 * **Absent `pageImageBlockId` means the first image block**, which is what
 * makes an existing page open unchanged — it has exactly one image block and it
 * has always shown the portrait. A stored id that names no block left on the
 * page means no block draws it: the portrait is still the page's and still
 * shows in the tree, it simply has no window on this page any more.
 */
export function pageImageBlockId(node: Node, blocks: Block[]): string | undefined {
  const images = imageBlocks(blocks);
  if (node.pageImageBlockId === undefined) return images[0]?.id;
  return images.find((block) => block.id === node.pageImageBlockId)?.id;
}

/** A picture, wherever it is kept: the three fields that describe one. */
export type BlockPicture = { image?: string; imageAlt?: string; imageFocusY?: number };

/**
 * The picture one image block draws — off the node when it is the page's,
 * off the block otherwise.
 *
 * The one place that decides. Everything that shows, replaces or clears an
 * image block's picture asks here first, so there is never a second answer to
 * "where does this photo live".
 */
export function blockImage(node: Node, blocks: Block[], block: Block): BlockPicture {
  if (block.id === pageImageBlockId(node, blocks)) {
    return { image: node.image, imageAlt: node.imageAlt, imageFocusY: node.imageFocusY };
  }
  return { image: block.image, imageAlt: block.imageAlt, imageFocusY: block.imageFocusY };
}

/** The three picture fields written onto a block, absent ones removed. */
export function withBlockImage(block: Block, picture: BlockPicture): Block {
  let next = block;
  for (const field of ["image", "imageAlt", "imageFocusY"] as const) {
    if (field in picture) next = withField(next, field, picture[field]);
  }
  return next;
}

/**
 * Every picture a node's image blocks hold on their own records.
 *
 * **`node.image` is deliberately not among them** — it is the page's own
 * portrait and every caller here already counts it separately. What this adds
 * is the pictures that used to be impossible: the ones in the writing.
 *
 * Takes the stored list rather than a derived one, because a derived block has
 * never been edited and so has no picture of its own by definition.
 */
export function blockImageFiles(blocks: Block[] | undefined): string[] {
  const found: string[] = [];
  for (const block of blocks ?? []) {
    if (block.kind === "image" && block.image) found.push(block.image);
  }
  return found;
}

/**
 * Every image block's picture rewritten through `replace` — how a page's
 * blocks come along when its pictures are copied.
 *
 * Duplicating a page, saving one as a template and pouring a template into one
 * all give the arriving page private copies of its pictures, so that replacing
 * one later cannot delete another page's. That has always covered `image` and
 * `banner`; the pictures inside the writing are the third set, and one missed
 * here is a file two pages share without knowing it.
 *
 * Returns the list it was given when there is nothing to rewrite.
 */
export function withCopiedBlockImages(
  blocks: Block[] | undefined,
  replace: (fileName: string) => string | undefined,
): Block[] | undefined {
  if (!blocks?.some((block) => block.kind === "image" && block.image)) return blocks;
  return blocks.map((block) =>
    block.kind === "image" && block.image ? withField(block, "image", replace(block.image)) : block,
  );
}

/**
 * Copies of several blocks at once, each landing after the last of them, and
 * which new block stands for which old one.
 *
 * **This is what duplicating an infobox needs, and it is why the frame cannot
 * simply be copied.** An infobox holds *pointers* — the blocks are records in
 * `node.blocks` — so a copied frame pointing at the same ids would put one
 * block in two places, which is the one thing this phase rules out everywhere
 * else. The copy gets copies, and the map is how the new frame learns which
 * ids to hold.
 *
 * **They land together after the last one rather than each after its own
 * original**, so a frame's blocks stay a run in storage instead of being
 * interleaved with the blocks they were copied from.
 *
 * `mintId` is an argument so a test can predict what comes out, the same way
 * `planDuplicate` takes one.
 */
export function duplicateBlocks(
  blocks: Block[],
  blockIds: string[],
  mintId: () => string,
  pictureOf: (block: Block) => BlockPicture = () => ({}),
): { blocks: Block[]; idMap: Map<string, string> } {
  const copying = blockIds
    .map((id) => blocks.find((block) => block.id === id))
    .filter((block) => block !== undefined);
  if (copying.length === 0) return { blocks, idMap: new Map() };

  const idMap = new Map(copying.map((block) => [block.id, mintId()]));
  const copies = copying.map((block) => {
    const copy: Block = { ...block, id: idMap.get(block.id)! };
    return copy.kind === "image" ? withBlockImage(copy, pictureOf(block)) : copy;
  });

  const last = Math.max(...copying.map((block) => blocks.findIndex((candidate) => candidate.id === block.id)));
  const next = [...blocks];
  next.splice(last + 1, 0, ...copies);
  return { blocks: next, idMap };
}

/** The fields one edit writes to a page. Blocks, and a picture that moved. */
export type ImageBlockPatch = Partial<Pick<Node, "blocks" | "image" | "imageAlt" | "imageFocusY" | "pageImageBlockId">>;

/**
 * Taking a block off the page: the block list, plus whatever that does to the
 * page's own picture.
 *
 * **Removing the block that draws the page's picture does not delete the
 * picture** — removing a block has never deleted what was in it, and a portrait
 * is on the tree row and in the export as well. What it does is move the mark:
 * the next image block becomes the page's, and if that one is holding a picture
 * of its own then *that* is the page's picture from now on. A block with no
 * picture of its own inherits the portrait instead of blanking it, which is
 * what an image block has always done.
 *
 * Returns the whole patch rather than applying it, so the block list and the
 * picture land in one edit and come back together on undo.
 */
export function planBlockRemoval(node: Node, blocks: Block[], blockId: string): ImageBlockPatch {
  const next = blocks.filter((block) => block.id !== blockId);
  if (next.length === blocks.length) return {};
  if (pageImageBlockId(node, blocks) !== blockId) return { blocks: next };

  // The pointer is dropped rather than re-aimed: absent already means "the
  // first image block there is", which is the block being promoted here.
  const patch: ImageBlockPatch = { blocks: next, pageImageBlockId: undefined };
  const promoted = imageBlocks(next)[0];
  if (!promoted?.image) return patch;

  patch.blocks = next.map((block) =>
    block.id === promoted.id ? withBlockImage(block, { image: undefined, imageAlt: undefined, imageFocusY: undefined }) : block,
  );
  patch.image = promoted.image;
  patch.imageAlt = promoted.imageAlt;
  patch.imageFocusY = promoted.imageFocusY;
  return patch;
}

/**
 * Making one image block the page's picture: the two pictures swap places.
 *
 * The chosen block's picture moves onto the node, where the tree row and the
 * export read it, and the picture that was the page's moves onto the block that
 * used to hold the mark. Nothing is copied and nothing is dropped — the two
 * blocks trade what they are showing, which is what "use this one instead"
 * means when both frames are on screen.
 */
export function planPageImageBlock(node: Node, blocks: Block[], blockId: string): ImageBlockPatch {
  const chosen = imageBlocks(blocks).find((block) => block.id === blockId);
  const currentId = pageImageBlockId(node, blocks);
  if (!chosen || currentId === blockId) return {};

  const moving: BlockPicture = { image: chosen.image, imageAlt: chosen.imageAlt, imageFocusY: chosen.imageFocusY };
  const displaced: BlockPicture = { image: node.image, imageAlt: node.imageAlt, imageFocusY: node.imageFocusY };

  return {
    blocks: blocks.map((block) => {
      if (block.id === blockId) return withBlockImage(block, { image: undefined, imageAlt: undefined, imageFocusY: undefined });
      if (block.id === currentId) return withBlockImage(block, displaced);
      return block;
    }),
    image: moving.image,
    imageAlt: moving.imageAlt,
    imageFocusY: moving.imageFocusY,
    pageImageBlockId: blockId,
  };
}

/**
 * The property keys a page has that no block is currently showing.
 *
 * This is what "Add block → a property you already have" offers. It exists
 * because removing a property block deliberately keeps the value: hiding a
 * field is not deleting it, so there has to be a way back to one that was
 * hidden, or the data is stranded where only the file on disk shows it.
 */
export function unshownPropertyKeys(blocks: Block[], available: RenderableProperty[]): RenderableProperty[] {
  const shown = new Set(blocks.filter((block) => block.kind === "property").map((block) => block.propertyKey));
  return available.filter((prop) => !shown.has(prop.key));
}

/**
 * A copy of `block` with one optional field set, or removed entirely when the
 * value is `undefined`.
 *
 * Removing rather than storing `undefined` matters because these end up in
 * JSON on disk: a block that has had its colour cleared should read as a block
 * with no colour, not as one carrying `"color": null`, and every default
 * written out explicitly turns a three-line block into a paragraph.
 */
export function withField<K extends keyof Block>(block: Block, field: K, value: Block[K]): Block {
  const next = { ...block };
  if (value === undefined) delete next[field];
  else next[field] = value;
  return next;
}

/**
 * What one kind of block is called in an undo entry — "Undid adding a meter".
 *
 * Deliberately the words the panel's own Add menu uses rather than the stored
 * kind: `alias` and `collection` are names for the code, and an undo message
 * is the one place the user reads back what they just did.
 */
export function blockKindLabel(kind: BlockKind): string {
  switch (kind) {
    case "property":
      return "a field";
    case "image":
      return "a picture";
    case "tags":
      return "the tags";
    case "text":
      return "a note";
    case "link":
      return "a link";
    case "collection":
      return "a collection";
    case "alias":
      return "the other names";
    case "meter":
      return "a meter";
  }
}

/**
 * The narrowest a block may be dragged, as a percentage of the writing column.
 *
 * A quarter of a 728px page is 182px, which is about as narrow as a block with
 * a title, a menu and a grip can be drawn before the controls are wider than
 * the content. Anything narrower is not a width she chose; it is a block she
 * can no longer use, and there is no handle left to drag it back out with.
 */
export const BLOCK_WIDTH_MIN = 25;

/** The whole writing column, which is what a block with no stored width gets. */
export const BLOCK_WIDTH_FULL = 100;

/**
 * The widths a drag sticks to: halves, thirds and quarters of the column.
 *
 * **Both behaviours in one, which is what the reference does** — near one of
 * these the drag snaps to it, anywhere else it is free. So a block can be
 * eyeballed to any width, and a block meant to be exactly half the page does
 * not have to be nudged into place a pixel at a time. The tolerance is small
 * enough that the free drag never feels caught.
 */
export const BLOCK_WIDTH_SNAPS = [25, 33, 50, 67, 75, 100];

/**
 * A row of columns' widths, read back as one share per lane.
 *
 * **Stored on the row rather than on each lane, and joined into a string**, for
 * the reason an infobox's list of ids is: BlockNote props are flat. Keeping
 * them together also means a drag writes one prop rather than two, so half a
 * resize can never be undone on its own.
 *
 * Anything missing, short, or not a number comes back as an even split — a row
 * whose widths have never been touched stores nothing at all.
 */
export function parseColumnWidths(value: string, count: number): number[] {
  const even = Array.from({ length: count }, () => 100 / count);
  if (!value) return even;
  const parsed = value.split(BLOCK_ID_SEPARATOR).map((part) => Number(part));
  if (parsed.length !== count || parsed.some((width) => !Number.isFinite(width) || width <= 0)) return even;
  return parsed;
}

/** The other direction. Whole numbers, so a row reads as percentages. */
export function serialiseColumnWidths(widths: number[]): string {
  return widths.map((width) => String(Math.round(width))).join(BLOCK_ID_SEPARATOR);
}

/**
 * The narrowest a *column* may be dragged, which is not the same number.
 *
 * A column holds ordinary writing rather than a block with its own controls,
 * and a row of three starts at a third each — a floor of 25 would leave almost
 * nothing to drag. This is about where a line of text stops being readable.
 */
export const COLUMN_WIDTH_MIN = 15;

const SNAP_TOLERANCE = 3;

/**
 * A dragged width, clamped to what is allowed and pulled onto a snap point if
 * it is close to one. Whole numbers, because a stored 49.7% is a width nobody
 * asked for and it prints badly in the handle's readout.
 */
export function snapBlockWidth(width: number, min: number = BLOCK_WIDTH_MIN): number {
  const clamped = Math.min(BLOCK_WIDTH_FULL, Math.max(min, Math.round(width)));
  const snap = BLOCK_WIDTH_SNAPS.find((point) => Math.abs(point - clamped) <= SNAP_TOLERANCE);
  return snap ?? clamped;
}

/**
 * What to store for a width, which is `undefined` at full width.
 *
 * Full width is the default and every block had it before this existed, so a
 * block that looks ordinary carries no field saying so — the same rule
 * `showTitle` and `showMax` follow.
 */
export function storedBlockWidth(width: number): number | undefined {
  // Snapped first, so a drag that ends a hair short of the edge stores nothing
  // rather than a 100 that means the same thing and reads as a set width.
  const snapped = snapBlockWidth(width);
  return snapped >= BLOCK_WIDTH_FULL ? undefined : snapped;
}
