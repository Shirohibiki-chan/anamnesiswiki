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
  FOLDER_TEMPLATE_KEY,
} from "../constants/schema";
import { orderProperties, type RenderableProperty } from "./property-service";

// The templates that begin with a picture, decided 2026-08-21: the ones about
// a thing you can picture. `note` and `blank` start empty, and faction and
// event are deliberately out — a crest or a battle illustration reads as more
// optional than a character portrait, and a block nobody wanted is worse than
// one they add themselves.
export const TEMPLATES_STARTING_WITH_IMAGE = new Set(["character", "species", "location", "item"]);

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
export function duplicateBlock(blocks: Block[], blockId: string): Block[] {
  const index = blocks.findIndex((block) => block.id === blockId);
  if (index === -1) return blocks;
  const next = [...blocks];
  next.splice(index + 1, 0, { ...blocks[index], id: crypto.randomUUID() });
  return next;
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
