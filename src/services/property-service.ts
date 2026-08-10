// Pure property logic: the sidebar's ordering rules, and the project-wide
// index behind the All properties & tags view. Lives here rather than in the
// components because CLAUDE.md puts logic in services and because both halves
// are exactly the kind of thing that's worth a test — the ordering fallbacks
// are the difference between a page nobody has touched looking the way it
// always did and every sidebar silently rearranging itself on upgrade, and
// the rename planners below are the only code in this app that edits dozens of
// the user's pages from one click.
import { CHIP_PROPERTY_TYPES, type CustomPropertySpec, type Node, type PropertyOption } from "../constants/schema";

// The shape the sidebar renders from — a template's own fixed field and a
// per-page custom one flattened into one thing, since once they're ordered
// together nothing downstream cares which it started as.
export type RenderableProperty = {
  key: string;
  label: string;
  type: CustomPropertySpec["type"];
  placeholder?: string;
  options?: PropertyOption[];
};

/**
 * Applies a page's manual property order to the default one.
 *
 * Both halves of the fallback matter. No stored order at all means the page
 * has never been reordered, so it keeps whatever grouping the caller built —
 * fixed fields, then refs, then custom (see PropertiesPanel for why refs sit
 * apart). A stored order that doesn't mention every key — which is what a
 * page looks like the moment a property is added after a reorder — puts the
 * keys it knows about first, in its own order, and leaves the rest in default
 * order behind them, rather than dropping them off the panel entirely.
 */
export function orderProperties<T extends { key: string }>(specs: T[], order: string[] | undefined): T[] {
  if (!order || order.length === 0) return specs;

  const rank = new Map(order.map((key, index) => [key, index]));
  return specs
    .map((spec, index) => ({ spec, index, rank: rank.get(spec.key) ?? Infinity }))
    .sort((a, b) => (a.rank === b.rank ? a.index - b.index : a.rank - b.rank))
    .map((entry) => entry.spec);
}

// ---- The project-wide index (Phase 13, second pass) ----
//
// The problem this half solves only shows up once a project is big: you can
// see the properties and tags on *this* page and nowhere the set you've
// actually accumulated, so `pov` and `POV` coexist for months and the only way
// to find out is to trip over it. Everything below is grouped by the exact
// spelling and *sorted* case-insensitively rather than merged: two
// capitalisations sit next to each other and say so, but which of them the
// user meant is her call, not this file's.

/** The subset of a template's PropertySpec this file needs. */
type SchemaProperty = { key: string; label: string; type: CustomPropertySpec["type"] };

export type PropertyIndexEntry = {
  /** The exact spelling, as written. `POV` and `pov` are two entries. */
  label: string;
  /** Distinct value types seen under this name, first seen first. */
  types: CustomPropertySpec["type"][];
  /** Some page gets this from its template, so that copy can't be renamed. */
  fromTemplate: boolean;
  /** Some page defines this itself, so that copy can. */
  fromCustom: boolean;
  /** Pages that have the property at all — what rename and delete act on. */
  nodeIds: string[];
  /** How many of those have something actually written in it. */
  filledCount: number;
  /** Another entry differs from this one only by capitalisation. */
  hasCaseVariants: boolean;
};

export type TagIndexEntry = {
  label: string;
  nodeIds: string[];
  hasCaseVariants: boolean;
};

/**
 * Whether a property counts as filled in.
 *
 * Deliberately per-type-agnostic: this is asked of every value shape the app
 * can hold (see schema.ts's CustomPropertySpec), and a rule per type would be
 * a second place to update every time a type is added.
 */
function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return true;
}

/** Sorts by name ignoring case, then marks the entries that only differ by it. */
function finishIndex<T extends { label: string; hasCaseVariants: boolean }>(entries: T[]): T[] {
  const spellings = new Map<string, Set<string>>();
  for (const entry of entries) {
    const lowered = entry.label.toLowerCase();
    if (!spellings.has(lowered)) spellings.set(lowered, new Set());
    spellings.get(lowered)!.add(entry.label);
  }

  return entries
    .map((entry) => ({ ...entry, hasCaseVariants: (spellings.get(entry.label.toLowerCase())?.size ?? 0) > 1 }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }) || a.label.localeCompare(b.label));
}

/**
 * Every property name in the project, with the pages using each.
 *
 * The template schema arrives as a function rather than an import so this file
 * stays free of template-registry.ts — same layer, and the panel already gets
 * it this way (see hooks/use-templates.ts).
 */
export function indexProperties(
  nodes: Record<string, Node>,
  getSchema: (templateKey: string) => readonly SchemaProperty[],
): PropertyIndexEntry[] {
  const byLabel = new Map<string, PropertyIndexEntry>();

  for (const node of Object.values(nodes)) {
    // Per page first, so a page holding two properties with the same name
    // (which is only reachable as `pov` and `POV`, but is reachable) still
    // counts as one page rather than two.
    const here = new Map<
      string,
      { types: CustomPropertySpec["type"][]; fromTemplate: boolean; fromCustom: boolean; filled: boolean }
    >();

    const seen: { spec: SchemaProperty; fromTemplate: boolean }[] = [
      ...getSchema(node.templateKey).map((spec) => ({ spec, fromTemplate: true })),
      ...(node.customProperties ?? []).map((spec) => ({ spec: spec as SchemaProperty, fromTemplate: false })),
    ];

    for (const { spec, fromTemplate } of seen) {
      const entry = here.get(spec.label) ?? { types: [], fromTemplate: false, fromCustom: false, filled: false };
      if (!entry.types.includes(spec.type)) entry.types.push(spec.type);
      if (fromTemplate) entry.fromTemplate = true;
      else entry.fromCustom = true;
      if (hasValue(node.properties[spec.key])) entry.filled = true;
      here.set(spec.label, entry);
    }

    for (const [label, local] of here) {
      const entry = byLabel.get(label) ?? {
        label,
        types: [],
        fromTemplate: false,
        fromCustom: false,
        nodeIds: [],
        filledCount: 0,
        hasCaseVariants: false,
      };
      for (const type of local.types) if (!entry.types.includes(type)) entry.types.push(type);
      // Both flags can be true across the project — one template declares
      // "Status" and someone added their own "Status" to a page of another
      // kind. That's what makes a row only partly renameable, and the view
      // says so rather than pretending the button covers everything.
      if (local.fromTemplate) entry.fromTemplate = true;
      if (local.fromCustom) entry.fromCustom = true;
      entry.nodeIds.push(node.id);
      if (local.filled) entry.filledCount += 1;
      byLabel.set(label, entry);
    }
  }

  return finishIndex([...byLabel.values()]);
}

/** Every tag in the project, with the pages carrying each. */
export function indexTags(nodes: Record<string, Node>): TagIndexEntry[] {
  const byLabel = new Map<string, TagIndexEntry>();

  for (const node of Object.values(nodes)) {
    for (const tag of new Set(node.tags)) {
      const entry = byLabel.get(tag) ?? { label: tag, nodeIds: [], hasCaseVariants: false };
      entry.nodeIds.push(node.id);
      byLabel.set(tag, entry);
    }
  }

  return finishIndex([...byLabel.values()]);
}

// ---- Project-wide rename and delete ----
//
// These plan the change and hand back the patches; the store applies them and
// records one undo entry for the lot (see project-store.ts). Split that way so
// the view can say what's about to happen *before* it happens — renaming a tag
// on forty pages is the point of the feature, and it's also the scariest thing
// in this app, so it doesn't get to be a surprise.

export type NodePropertyPatch = {
  nodeId: string;
  patch: Partial<Pick<Node, "customProperties" | "properties" | "propertyOrder">>;
};

export type PropertyRenamePlan = {
  patches: NodePropertyPatch[];
  /** Pages this changes. */
  pages: number;
  /** Pages that already had one under the new name, where the two became one. */
  merged: number;
  /** Pages where both had something written, so both were kept. */
  kept: number;
  /**
   * Pages whose *template* already declares the new name. Nothing can be done
   * about those here — a template's labels aren't editable until Phase 17 — so
   * the page ends up showing two fields with that name and the view says so.
   * The likeliest typo of all is a misspelling of a template field's own name,
   * so this is not the rare case it looks like.
   */
  templateClash: number;
};

/**
 * Renames a custom property across the project — merging, where the new name
 * is one that already exists.
 *
 * Merging can't be a straight overwrite, because a property's value lives
 * under its `key` and two properties on one page have two keys. So the rule is
 * *nothing written gets thrown away*: where only one side has a value the
 * empty one goes, and where both do, both are kept under the new name and the
 * caller reports it. Two fields with the same name on one page is untidy; a
 * silently deleted paragraph of someone's writing is not recoverable by
 * looking at it.
 *
 * Template-declared properties are left alone — their labels live in
 * template-registry.ts, which isn't user-editable until Phase 17.
 */
export function planPropertyRename(
  nodes: Record<string, Node>,
  label: string,
  newLabel: string,
  getSchema: (templateKey: string) => readonly SchemaProperty[] = () => [],
): PropertyRenamePlan {
  const patches: NodePropertyPatch[] = [];
  let merged = 0;
  let kept = 0;
  let templateClash = 0;

  for (const node of Object.values(nodes)) {
    const custom = node.customProperties ?? [];
    if (!custom.some((spec) => spec.label === label)) continue;
    if (label !== newLabel && getSchema(node.templateKey).some((spec) => spec.label === newLabel)) templateClash += 1;

    const target = label === newLabel ? undefined : custom.find((spec) => spec.label === newLabel);
    const dropped = new Set<string>();
    let mergedHere = false;
    let keptHere = false;

    const renamed = custom.map((spec) => {
      if (spec.label !== label) return spec;
      if (!target) return { ...spec, label: newLabel };

      if (!hasValue(node.properties[spec.key])) {
        // This one is empty, so folding it into the existing field costs
        // nothing — the definition goes and the existing value stands.
        dropped.add(spec.key);
        mergedHere = true;
        return spec;
      }
      if (!hasValue(node.properties[target.key])) {
        dropped.add(target.key);
        mergedHere = true;
        return { ...spec, label: newLabel };
      }
      keptHere = true;
      return { ...spec, label: newLabel };
    });

    const patch: NodePropertyPatch["patch"] = { customProperties: renamed.filter((spec) => !dropped.has(spec.key)) };
    if (dropped.size > 0) {
      const properties = { ...node.properties };
      for (const key of dropped) delete properties[key];
      patch.properties = properties;
      // A key that no longer exists must not sit in the manual order
      // influencing where its neighbours land — same rule as removeCustomProperty.
      if (node.propertyOrder) patch.propertyOrder = node.propertyOrder.filter((key) => !dropped.has(key));
    }

    patches.push({ nodeId: node.id, patch });
    if (mergedHere) merged += 1;
    if (keptHere) kept += 1;
  }

  return { patches, pages: patches.length, merged, kept, templateClash };
}

export type PropertyDeletePlan = {
  patches: NodePropertyPatch[];
  pages: number;
  /** Of those, how many have something written in — the number worth naming. */
  filled: number;
};

/** Removes a custom property, and its values, from every page that has it. */
export function planPropertyDelete(nodes: Record<string, Node>, label: string): PropertyDeletePlan {
  const patches: NodePropertyPatch[] = [];
  let filled = 0;

  for (const node of Object.values(nodes)) {
    const custom = node.customProperties ?? [];
    const doomed = custom.filter((spec) => spec.label === label);
    if (doomed.length === 0) continue;

    const keys = new Set(doomed.map((spec) => spec.key));
    const properties = { ...node.properties };
    let filledHere = false;
    for (const key of keys) {
      if (hasValue(properties[key])) filledHere = true;
      delete properties[key];
    }

    patches.push({
      nodeId: node.id,
      patch: {
        customProperties: custom.filter((spec) => !keys.has(spec.key)),
        properties,
        ...(node.propertyOrder ? { propertyOrder: node.propertyOrder.filter((key) => !keys.has(key)) } : {}),
      },
    });
    if (filledHere) filled += 1;
  }

  return { patches, pages: patches.length, filled };
}

export type TagPatch = { nodeId: string; tags: string[] };

export type TagRenamePlan = {
  patches: TagPatch[];
  pages: number;
  /** Pages that already carried the new name, where the two became one tag. */
  merged: number;
};

/**
 * Renames a tag across the project. Unlike a property this merge is free — a
 * page's tags are a set, so landing on a name it already has just means one
 * tag instead of two, with nothing to lose either way.
 */
export function planTagRename(nodes: Record<string, Node>, tag: string, newTag: string): TagRenamePlan {
  const patches: TagPatch[] = [];
  let merged = 0;

  for (const node of Object.values(nodes)) {
    if (!node.tags.includes(tag)) continue;
    if (node.tags.includes(newTag) && tag !== newTag) merged += 1;

    const tags: string[] = [];
    for (const existing of node.tags) {
      const next = existing === tag ? newTag : existing;
      if (!tags.includes(next)) tags.push(next);
    }
    patches.push({ nodeId: node.id, tags });
  }

  return { patches, pages: patches.length, merged };
}

export function planTagDelete(nodes: Record<string, Node>, tag: string): { patches: TagPatch[]; pages: number } {
  const patches: TagPatch[] = [];

  for (const node of Object.values(nodes)) {
    if (!node.tags.includes(tag)) continue;
    patches.push({ nodeId: node.id, tags: node.tags.filter((existing) => existing !== tag) });
  }

  return { patches, pages: patches.length };
}

// ---- Chip options across the project ----
//
// The same problem as the two above, one level down. A select/status option
// list lives on the node (see schema.ts), so a Status used on thirty pages is
// thirty separate lists and renaming "Draft" is thirty edits.
//
// The fix is *not* to move option lists off the node into project.json.
// Keeping them next to the values they explain is what makes a page's JSON
// file readable on its own, which is the whole argument for file-per-node in
// CLAUDE.md. So options stay where they are, and instead: they're seeded from
// what's already in use when a property is added (`knownOptionsFor`), reuse
// each other's ids and colours rather than minting new ones, and can be
// renamed, recoloured and deleted across the project from one place.
//
// **Grouped by property label *and* template.** Not by label alone: "Type" is
// a suggested property on locations, factions, items and events, and a
// location's City/Village/Ruin has no business appearing on a sword.

const CHIP_TYPES = new Set(CHIP_PROPERTY_TYPES);

export function isChipType(type: CustomPropertySpec["type"]): boolean {
  return CHIP_TYPES.has(type);
}

/** A chip property's value, as a list, whatever shape it's stored in. */
function selectedIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string");
  return typeof value === "string" && value ? [value] : [];
}

/** Back to the shape the type stores — an array for multi, one id or nothing otherwise. */
function valueFromIds(type: CustomPropertySpec["type"], ids: string[]): unknown {
  return type === "multiselect" ? ids : ids[0];
}

/** Every chip spec on a node carrying a given property name. */
function chipSpecs(node: Node, propertyLabel: string): CustomPropertySpec[] {
  return (node.customProperties ?? []).filter((spec) => spec.label === propertyLabel && isChipType(spec.type));
}

export type OptionIndexEntry = {
  /** The exact spelling. As everywhere else, capitalisations stay separate. */
  label: string;
  /** The colour the most pages give it — what reusing it should adopt. */
  color: string;
  /** Pages whose copy of the property offers this option. */
  offeredCount: number;
  /** Of those, how many actually have it picked. */
  usedCount: number;
  hasCaseVariants: boolean;
};

/**
 * Every option in use under one property name, across the project.
 *
 * Grouped by the option's *label*, because ids aren't shared between pages
 * that invented the same option separately — which is exactly the mess this
 * is here to show and then let the user clean up.
 */
export function indexPropertyOptions(nodes: Record<string, Node>, propertyLabel: string): OptionIndexEntry[] {
  const byLabel = new Map<string, { colors: Map<string, number>; offered: number; used: number }>();

  for (const node of Object.values(nodes)) {
    for (const spec of chipSpecs(node, propertyLabel)) {
      const picked = new Set(selectedIds(node.properties[spec.key]));
      for (const option of spec.options ?? []) {
        const entry = byLabel.get(option.label) ?? { colors: new Map(), offered: 0, used: 0 };
        entry.colors.set(option.color, (entry.colors.get(option.color) ?? 0) + 1);
        entry.offered += 1;
        if (picked.has(option.id)) entry.used += 1;
        byLabel.set(option.label, entry);
      }
    }
  }

  const entries: OptionIndexEntry[] = [...byLabel].map(([label, entry]) => ({
    label,
    color: [...entry.colors].sort((a, b) => b[1] - a[1])[0][0],
    offeredCount: entry.offered,
    usedCount: entry.used,
    hasCaseVariants: false,
  }));

  return finishIndex(entries);
}

/**
 * The option list a new copy of this property should start with.
 *
 * Takes the longest list already in use as the base rather than merging
 * everything into popularity order, because the *order* of a status carries
 * meaning — Draft, In progress, Needs revision, Done is a sequence, and
 * rebuilding it by how often each is used would shuffle it. Anything the base
 * doesn't already have is appended.
 *
 * Ids are copied, not regenerated. Two pages genuinely sharing an option id is
 * harmless (ids only have to be unique within one spec) and it's what makes
 * "the same option" mean something across pages.
 */
export function knownOptionsFor(
  nodes: Record<string, Node>,
  templateKey: string,
  propertyLabel: string,
): PropertyOption[] {
  let base: PropertyOption[] = [];
  const extra: PropertyOption[] = [];

  for (const node of Object.values(nodes)) {
    if (node.templateKey !== templateKey) continue;
    for (const spec of chipSpecs(node, propertyLabel)) {
      const options = spec.options ?? [];
      if (options.length > base.length) {
        extra.push(...base);
        base = options.map((option) => ({ ...option }));
      } else {
        extra.push(...options);
      }
    }
  }

  const seen = new Set(base.map((option) => option.label.toLowerCase()));
  for (const option of extra) {
    if (seen.has(option.label.toLowerCase())) continue;
    seen.add(option.label.toLowerCase());
    base.push({ ...option });
  }
  return base;
}

export type OptionPlan = {
  patches: NodePropertyPatch[];
  /** Pages whose copy of the property changed. */
  pages: number;
  /** Pages where the option was actually picked, not just offered. */
  used: number;
};

/** Applies a change to every copy of one option, page by page. */
function planOptionChange(
  nodes: Record<string, Node>,
  propertyLabel: string,
  optionLabel: string,
  edit: (
    spec: CustomPropertySpec,
    matched: PropertyOption[],
  ) => { options: PropertyOption[]; remap?: Map<string, string | null> },
): OptionPlan {
  const patches: NodePropertyPatch[] = [];
  let used = 0;

  for (const node of Object.values(nodes)) {
    const custom = node.customProperties ?? [];
    let touched = false;
    let usedHere = false;
    const properties = { ...node.properties };

    const customProperties = custom.map((spec) => {
      if (spec.label !== propertyLabel || !isChipType(spec.type)) return spec;
      const matched = (spec.options ?? []).filter((option) => option.label === optionLabel);
      if (matched.length === 0) return spec;

      touched = true;
      const picked = selectedIds(properties[spec.key]);
      if (matched.some((option) => picked.includes(option.id))) usedHere = true;

      const { options, remap } = edit(spec, matched);
      if (remap) {
        // Rewritten rather than filtered, because a rename that merges has to
        // move the value onto the surviving option — a value left pointing at
        // an id that's gone renders as nothing, which reads as the chip having
        // been eaten.
        const next: string[] = [];
        for (const id of picked) {
          const to = remap.has(id) ? remap.get(id) : id;
          if (to && !next.includes(to)) next.push(to);
        }
        const value = valueFromIds(spec.type, next);
        if (value === undefined) delete properties[spec.key];
        else properties[spec.key] = value;
      }
      return { ...spec, options };
    });

    if (!touched) continue;
    patches.push({ nodeId: node.id, patch: { customProperties, properties } });
    if (usedHere) used += 1;
  }

  return { patches, pages: patches.length, used };
}

/** Renames an option everywhere, merging where the new name already exists on a page. */
export function planOptionRename(
  nodes: Record<string, Node>,
  propertyLabel: string,
  optionLabel: string,
  newLabel: string,
): OptionPlan {
  return planOptionChange(nodes, propertyLabel, optionLabel, (spec, matched) => {
    const matchedIds = new Set(matched.map((option) => option.id));
    const target =
      optionLabel === newLabel
        ? undefined
        : (spec.options ?? []).find((option) => option.label === newLabel && !matchedIds.has(option.id));

    if (!target) {
      return {
        options: (spec.options ?? []).map((option) =>
          matchedIds.has(option.id) ? { ...option, label: newLabel } : option,
        ),
      };
    }

    return {
      options: (spec.options ?? []).filter((option) => !matchedIds.has(option.id)),
      remap: new Map([...matchedIds].map((id) => [id, target.id])),
    };
  });
}

export function planOptionRecolour(
  nodes: Record<string, Node>,
  propertyLabel: string,
  optionLabel: string,
  color: string,
): OptionPlan {
  return planOptionChange(nodes, propertyLabel, optionLabel, (spec, matched) => {
    const matchedIds = new Set(matched.map((option) => option.id));
    return {
      options: (spec.options ?? []).map((option) => (matchedIds.has(option.id) ? { ...option, color } : option)),
    };
  });
}

export function planOptionDelete(nodes: Record<string, Node>, propertyLabel: string, optionLabel: string): OptionPlan {
  return planOptionChange(nodes, propertyLabel, optionLabel, (spec, matched) => {
    const matchedIds = new Set(matched.map((option) => option.id));
    return {
      options: (spec.options ?? []).filter((option) => !matchedIds.has(option.id)),
      remap: new Map([...matchedIds].map((id) => [id, null])),
    };
  });
}
