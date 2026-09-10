// A folder of markdown read back as a world (Phase 20) — the inverse of
// `markdown-vault.ts`.
//
// **Planned from a listing, not from a disk.** The caller hands over every
// file's path and the text of every note, and gets back the same `ImportPlan`
// the `.lk` importer produces: nodes, a preview, a tally of what changed, and
// the pictures to copy in. Reading the folder, unpacking a zip and writing
// the project are all somebody else's job, which is what keeps every rule
// below arguable in a test.
//
// **Obsidian's conventions, read back.** A note beside a folder of the same
// name is one page holding pages — `Kaine.md` next to `Kaine/` — and a folder
// with no such note is a folder page. `[[Name]]` resolves the way Obsidian
// resolves it: by note name first, by path when names collide. Front matter
// is the page's fields; `##` headings are its tabs *only when the front
// matter says so*, since a page whose writing opens with an `##` is otherwise
// indistinguishable from one with tabs.
import { createTab, FOLDER_TEMPLATE_KEY, PAGE_TEMPLATE_KEYS, type CustomPropertySpec, type Node, type Tab } from "../constants/schema";
import { assetRef } from "./asset-urls";
import type { ImportAsset, ImportPlan, ImportPreviewNode } from "./import-plan";
import {
  CALLOUT_RETYPED,
  EMBED_FLATTENED,
  LINK_UNRESOLVED,
  PICTURE_MISSING,
  bumpTally,
  parseBlocks,
  splitFrontMatter,
  splitWikilink,
  yamlStrings,
  type BlockSeed,
  type MarkdownParseContext,
  type ParseTally,
  type YamlValue,
} from "./markdown-parse";
import type { RenderableProperty } from "./property-service";
import { getDefaultTabs, getPropertySchema, getTemplate, type TemplateKey } from "./template-registry";

/** What one importer run is handed. Paths are vault-relative with `/`. */
export type MarkdownImportInput = {
  /** What to call the project — the folder's or the file's own name. */
  name: string;
  /** Every file in the source, notes and pictures alike. */
  files: string[];
  /** The text of every note, by path. */
  texts: Map<string, string>;
  /** The bytes of any file, by path — wrapped into the plan, never called here. */
  readBytes: (path: string) => Promise<Uint8Array>;
};

const NOTE_EXTENSIONS = new Set(["md", "markdown", "txt"]);
const PICTURE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"]);

/** Front matter keys that are the page's own fields rather than properties. */
const RESERVED_KEYS = new Set(["title", "aliases", "alias", "tags", "tag", "template", "hidden", "image", "banner", "tabs"]);

/** The heading the export puts over the page's own blocks. */
const DETAILS_HEADING = "Details";

const DETAILS_SEEN = "detailsSection";
const PROPERTY_VALUE_UNKNOWN = "propertyValueUnknown";

export function extensionOf(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  return dot === -1 ? "" : base.slice(dot + 1).toLowerCase();
}

/** Whether a path is a note this importer reads. */
export function isNotePath(path: string): boolean {
  return !isHiddenPath(path) && NOTE_EXTENSIONS.has(extensionOf(path));
}

/**
 * Obsidian's own folders and anything else that starts with a dot are the
 * program's, not the writer's: `.obsidian/` holds its settings and `.trash/`
 * what she deleted.
 */
function isHiddenPath(path: string): boolean {
  return path.split("/").some((segment) => segment.startsWith("."));
}

function dirOf(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash === -1 ? "" : path.slice(0, slash);
}

function baseOf(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot === -1 ? name : name.slice(0, dot);
}

function joinPath(dir: string, name: string): string {
  return dir ? `${dir}/${name}` : name;
}

/** `a/b/../c` as `a/c`, the way a markdown link relative to a note resolves. */
export function normalisePath(path: string): string {
  const out: string[] = [];
  for (const segment of path.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") out.pop();
    else out.push(segment);
  }
  return out.join("/");
}

function compareNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }) || (a < b ? -1 : a > b ? 1 : 0);
}

/** Every page or folder the vault holds, before any of it is converted. */
type Entry = {
  id: string;
  /** The note's path, or null for a folder with no note of its own. */
  notePath: string | null;
  /** The folder holding this entry's children, or null when it has none. */
  folder: string | null;
  dir: string;
  base: string;
  parent: Entry | null;
  children: Entry[];
};

/**
 * The tree of the vault: which paths are pages, which folders belong to
 * which page, and what sits under what.
 *
 * A folder only counts when a note lives somewhere under it. A folder of
 * pictures is not a page, and neither is `attachments/`.
 */
function buildTree(files: string[]): { roots: Entry[]; byPath: Map<string, Entry>; notes: Entry[] } {
  const notePaths = files.filter(isNotePath);
  // Every folder with a note somewhere beneath it.
  const folders = new Set<string>();
  for (const path of notePaths) {
    let dir = dirOf(path);
    while (dir) {
      folders.add(dir);
      dir = dirOf(dir);
    }
  }

  const byPath = new Map<string, Entry>();
  const notes: Entry[] = [];

  // Notes first, so a folder can find the note it belongs to.
  const noteByFolder = new Map<string, Entry>();
  for (const path of notePaths) {
    const entry: Entry = { id: crypto.randomUUID(), notePath: path, folder: null, dir: dirOf(path), base: baseOf(path), parent: null, children: [] };
    byPath.set(path, entry);
    notes.push(entry);
    const twin = joinPath(entry.dir, entry.base);
    // `Kaine.md` claims `Kaine/`. Two notes can only claim the same folder
    // when they differ by extension, and the first one listed wins.
    if (folders.has(twin) && !noteByFolder.has(twin)) {
      noteByFolder.set(twin, entry);
      entry.folder = twin;
    }
  }

  for (const folder of [...folders].sort((a, b) => a.split("/").length - b.split("/").length)) {
    if (noteByFolder.has(folder)) {
      byPath.set(folder, noteByFolder.get(folder)!);
      continue;
    }
    const entry: Entry = { id: crypto.randomUUID(), notePath: null, folder, dir: dirOf(folder), base: baseOf(folder), parent: null, children: [] };
    byPath.set(folder, entry);
  }

  // Parents, then an order among siblings: folders and notes together, by
  // name, the way a file manager shows the vault.
  const roots: Entry[] = [];
  const seen = new Set<Entry>();
  for (const entry of byPath.values()) {
    if (seen.has(entry)) continue;
    seen.add(entry);
    const parent = entry.dir ? byPath.get(entry.dir) ?? null : null;
    entry.parent = parent;
    if (parent) parent.children.push(entry);
    else roots.push(entry);
  }
  const sort = (list: Entry[]) => list.sort((a, b) => compareNames(a.base, b.base));
  sort(roots);
  for (const entry of seen) sort(entry.children);

  return { roots, byPath, notes };
}

/**
 * What a `[[link]]` reaches.
 *
 * Obsidian's order: an exact path (with or without `.md`), then a note whose
 * name is the target, then a note whose title or alias is — and when several
 * notes share a name, the first by path, which is also Obsidian's tie-break
 * for a link that was not written with a path.
 */
function makeResolver(notes: Entry[], names: Map<Entry, { title: string; aliases: string[] }>): (target: string) => Entry | null {
  const byPath = new Map<string, Entry>();
  const byBase = new Map<string, Entry[]>();
  const byName = new Map<string, Entry[]>();
  const add = (map: Map<string, Entry[]>, key: string, entry: Entry) => {
    const lower = key.toLowerCase();
    map.set(lower, [...(map.get(lower) ?? []), entry]);
  };
  for (const entry of notes) {
    const stem = joinPath(entry.dir, entry.base).toLowerCase();
    byPath.set(stem, entry);
    byPath.set(entry.notePath!.toLowerCase(), entry);
    add(byBase, entry.base, entry);
    const named = names.get(entry);
    if (named) {
      add(byName, named.title, entry);
      for (const alias of named.aliases) add(byName, alias, entry);
    }
  }

  return (target) => {
    const cleaned = normalisePath(target.trim().replace(/\\/g, "/"));
    if (!cleaned) return null;
    const lower = cleaned.toLowerCase();
    const direct = byPath.get(lower);
    if (direct) return direct;
    // `Folder/Note` written as a partial path.
    if (lower.includes("/")) {
      const tail = `/${lower}`;
      const partial = notes.find((entry) => joinPath(entry.dir, entry.base).toLowerCase().endsWith(tail));
      if (partial) return partial;
    }
    const base = byBase.get(baseOf(lower));
    if (base?.length) return base[0];
    const named = byName.get(lower);
    return named?.[0] ?? null;
  };
}

/** The picture a note's `![](…)` names, as a vault path, or null. */
function makePictureFinder(files: string[]): (fromDir: string, target: string) => string | null {
  const exact = new Map(files.map((path) => [path.toLowerCase(), path]));
  const byName = new Map<string, string[]>();
  for (const path of files) {
    const name = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
    byName.set(name, [...(byName.get(name) ?? []), path]);
  }

  return (fromDir, target) => {
    const cleaned = target.trim().replace(/\\/g, "/");
    const relative = exact.get(normalisePath(joinPath(fromDir, cleaned)).toLowerCase());
    if (relative) return relative;
    const absolute = exact.get(normalisePath(cleaned).toLowerCase());
    if (absolute) return absolute;
    // Obsidian's shortest-path form: the bare filename, found anywhere.
    const named = byName.get(cleaned.slice(cleaned.lastIndexOf("/") + 1).toLowerCase());
    return named?.[0] ?? null;
  };
}

function isWebAddress(target: string): boolean {
  return /^https?:\/\//i.test(target) || target.startsWith("data:");
}

// ---- Front matter into a page ----

type ReadNote = {
  frontMatter: Record<string, YamlValue>;
  body: string;
  title: string;
  aliases: string[];
};

function readNote(text: string, base: string): ReadNote {
  const { frontMatter, body } = splitFrontMatter(text);
  const title = yamlStrings(frontMatter.title)[0] ?? base;
  const aliases = [...yamlStrings(frontMatter.aliases), ...yamlStrings(frontMatter.alias)];
  return { frontMatter, body, title, aliases };
}

/** The template a note asks for, by the label the export wrote. */
function templateFor(frontMatter: Record<string, YamlValue>): TemplateKey {
  const label = yamlStrings(frontMatter.template)[0]?.toLowerCase();
  if (!label) return "note";
  const match = PAGE_TEMPLATE_KEYS.find((key) => key === label || getTemplate(key)?.label.toLowerCase() === label);
  return (match as TemplateKey | undefined) ?? "note";
}

/**
 * Obsidian writes tags in front matter with or without a `#`, as a list or
 * as one comma-separated line; all of those are the same tags.
 */
function tagsOf(frontMatter: Record<string, YamlValue>): string[] {
  const raw = [...yamlStrings(frontMatter.tags), ...yamlStrings(frontMatter.tag)];
  const tags = raw.flatMap((value) => value.split(",")).map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean);
  return [...new Set(tags)];
}

type PropertyCtx = {
  resolveLink: (target: string) => string | null;
  tally: ParseTally;
};

/** Every wikilink in a list of values, as page ids — or null if any is not one. */
function allLinks(values: string[], resolve: (target: string) => string | null): string[] | null {
  if (values.length === 0) return null;
  const ids: string[] = [];
  for (const value of values) {
    const match = /^\[\[([^\]]+)\]\]$/.exec(value.trim());
    if (!match) return null;
    const id = resolve(splitWikilink(match[1]).target);
    if (id) ids.push(id);
  }
  return ids;
}

/** A front matter value in the shape one of the template's own fields stores. */
function fieldValue(spec: RenderableProperty, value: YamlValue, ctx: PropertyCtx): unknown {
  const strings = yamlStrings(value);

  if (spec.type === "number") {
    const number = typeof value === "number" ? value : Number(strings[0]);
    return Number.isFinite(number) ? number : undefined;
  }

  if (spec.type === "refs") {
    return allLinks(strings, ctx.resolveLink) ?? undefined;
  }

  if (spec.type === "select" || spec.type === "status" || spec.type === "multiselect") {
    const labels = spec.type === "multiselect" ? strings : strings.join(", ").split(",").map((label) => label.trim());
    const ids = labels
      .filter(Boolean)
      .map((label) => {
        const option = (spec.options ?? []).find((candidate) => candidate.label.toLowerCase() === label.toLowerCase());
        if (!option) bumpTally(ctx.tally, PROPERTY_VALUE_UNKNOWN);
        return option?.id;
      })
      .filter((id): id is string => Boolean(id));
    if (ids.length === 0) return undefined;
    return spec.type === "multiselect" ? ids : ids[0];
  }

  // A link in a text field keeps its words rather than its brackets.
  const text = strings.map((item) => item.replace(/\[\[([^\]]+)\]\]/g, (_match, inner: string) => splitWikilink(inner).label ?? splitWikilink(inner).target)).join(", ");
  return text || undefined;
}

/**
 * The page's properties, from whatever front matter is left after the
 * page's own fields are taken out.
 *
 * A key matching one of the template's fields fills that field, by label,
 * exactly as the `.lk` importer does — otherwise the panel shows the same
 * field twice. Anything else becomes a custom property: links stay links,
 * a number stays a number, and everything else is text.
 */
function propertiesOf(
  frontMatter: Record<string, YamlValue>,
  templateKey: TemplateKey,
  ctx: PropertyCtx,
): { properties: Record<string, unknown>; customProperties: CustomPropertySpec[] } {
  const properties: Record<string, unknown> = {};
  const customProperties: CustomPropertySpec[] = [];
  const fixedByLabel = new Map(getPropertySchema(templateKey).map((field) => [field.label.trim().toLowerCase(), field]));

  for (const [key, value] of Object.entries(frontMatter)) {
    if (RESERVED_KEYS.has(key.toLowerCase())) continue;
    const fixed = fixedByLabel.get(key.trim().toLowerCase());
    if (fixed) {
      const converted = fieldValue(fixed, value, ctx);
      if (converted !== undefined) properties[fixed.key] = converted;
      continue;
    }

    const strings = yamlStrings(value);
    const links = allLinks(strings, ctx.resolveLink);
    const id = crypto.randomUUID();
    if (links) {
      if (links.length === 0) continue;
      customProperties.push({ key: id, label: key, type: "refs" });
      properties[id] = links;
    } else if (typeof value === "number") {
      customProperties.push({ key: id, label: key, type: "number" });
      properties[id] = value;
    } else {
      const text = strings.join(", ");
      if (!text) continue;
      customProperties.push({ key: id, label: key, type: "longtext" });
      properties[id] = text;
    }
  }

  return { properties, customProperties };
}

// ---- The body into tabs ----

/**
 * The body's top-level `##` sections, when the front matter names the tabs.
 *
 * Fenced code is skipped over, so a `## ` inside a code sample is not a tab.
 * A `## Details` at the end is the page's own blocks written flat, and it is
 * folded into the last tab under its heading rather than becoming a tab.
 */
function splitTabs(body: string, tabNames: string[]): { label: string; hidden: boolean; lines: string[] }[] {
  const lines = body.split("\n");
  const sections: { label: string; hidden: boolean; lines: string[] }[] = [];
  const lead: string[] = [];
  let current: { label: string; hidden: boolean; lines: string[] } | null = null;
  let fence: string | null = null;
  const wanted = new Map(tabNames.map((name) => [name.toLowerCase(), name]));

  for (const line of lines) {
    const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1];
      else if (fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
    }

    const heading = !fence ? /^## (.+?)\s*$/.exec(line) : null;
    if (heading) {
      const hidden = / \*\(hidden\)\*$/.test(heading[1]);
      const text = heading[1].replace(/ \*\(hidden\)\*$/, "").replace(/\\([!-/:-@[-`{-~])/g, "$1");
      const label = wanted.get(text.toLowerCase());
      if (label) {
        current = { label, hidden, lines: [] };
        sections.push(current);
        continue;
      }
      if (text === DETAILS_HEADING && current) {
        // Kept as a heading over its lines, inside the tab it follows.
        current.lines.push(line);
        continue;
      }
    }

    (current?.lines ?? lead).push(line);
  }

  // Every named tab, in the order the front matter gave, whether or not the
  // body had a heading for it; writing above the first heading goes first.
  const out = tabNames.map((name) => sections.find((section) => section.label === name) ?? { label: name, hidden: false, lines: [] });
  if (lead.some((line) => line.trim()) && out.length > 0) out[0].lines.unshift(...lead);
  return out;
}

/**
 * Moves every heading up one level, undoing the shift the export made to
 * seat the writing under its tab heading. Only for a page whose tabs were
 * split from `##` headings — a vault written by hand had no such shift.
 */
function liftHeadings(blocks: BlockSeed[]): void {
  for (const block of blocks) {
    if (block.type === "heading") {
      const props = (block.props ?? {}) as Record<string, unknown>;
      const level = typeof props.level === "number" ? props.level : 1;
      block.props = { ...props, level: Math.max(1, level - 1) };
    }
    if (Array.isArray(block.children)) liftHeadings(block.children as BlockSeed[]);
  }
}

function describe(tally: ParseTally): string[] {
  const notes: string[] = [];
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const links = tally.get(LINK_UNRESOLVED);
  if (links) notes.push(`${plural(links, "link")} pointed at a page that isn't in this folder, and became plain text.`);
  const pictures = tally.get(PICTURE_MISSING);
  if (pictures) notes.push(`${plural(pictures, "picture")} couldn't be found in the folder and was left out.`);
  const embeds = tally.get(EMBED_FLATTENED);
  if (embeds) notes.push(`${plural(embeds, "picture or embed")} sat in the middle of a sentence, where a page can't hold one — its words were kept.`);
  const callouts = tally.get(CALLOUT_RETYPED);
  if (callouts) notes.push(`${plural(callouts, "callout")} was a kind that doesn't exist here and came in as an Info.`);
  const details = tally.get(DETAILS_SEEN);
  if (details) notes.push(`${plural(details, "page")} had a Details section — meters and lists that were exported as plain writing come back as plain writing, not as live blocks.`);
  const values = tally.get(PROPERTY_VALUE_UNKNOWN);
  if (values) notes.push(`${plural(values, "property value")} wasn't one of the choices that field offers, and was left blank.`);

  return notes;
}

// ---- The whole import ----

export function planMarkdownImport(input: MarkdownImportInput): ImportPlan {
  const { roots, notes } = buildTree(input.files);
  const tally: ParseTally = new Map();

  // Every note's front matter first, because a link on page one may point at
  // a title or an alias declared on page fifty.
  const read = new Map<Entry, ReadNote>();
  for (const entry of notes) read.set(entry, readNote(input.texts.get(entry.notePath!) ?? "", entry.base));
  const names = new Map([...read].map(([entry, note]) => [entry, { title: note.title, aliases: note.aliases }]));
  const resolveEntry = makeResolver(notes, names);
  const findPicture = makePictureFinder(input.files);

  // One asset per source file however many pages use it; insertion-ordered so
  // two imports of the same folder name their copies in the same order.
  const assetNames = new Map<string, string>();
  const assetFor = (source: string): string => {
    let fileName = assetNames.get(source);
    if (!fileName) {
      fileName = `${crypto.randomUUID()}.${extensionOf(source) || "bin"}`;
      assetNames.set(source, fileName);
    }
    return assetRef(fileName);
  };

  const nodes: Node[] = [];
  const templateCounts: Partial<Record<TemplateKey, number>> = {};
  let createdCounter = Date.now();

  function pictureFor(fromDir: string, target: string): string | null {
    if (isWebAddress(target)) return target;
    const found = findPicture(fromDir, target);
    if (!found || !PICTURE_EXTENSIONS.has(extensionOf(found))) return null;
    return assetFor(found);
  }

  function convert(entry: Entry, parentId: string | null): ImportPreviewNode {
    const createdAt = createdCounter++;
    const note = read.get(entry);

    if (!note) {
      // A folder with no note of its own.
      templateCounts[FOLDER_TEMPLATE_KEY] = (templateCounts[FOLDER_TEMPLATE_KEY] ?? 0) + 1;
      nodes.push({
        id: entry.id,
        parentId,
        templateKey: FOLDER_TEMPLATE_KEY,
        name: entry.base,
        tabs: [],
        properties: {},
        customProperties: [],
        tags: [],
        createdAt,
        updatedAt: createdAt,
      });
      return { id: entry.id, name: entry.base, templateKey: FOLDER_TEMPLATE_KEY, children: entry.children.map((child) => convert(child, entry.id)) };
    }

    const templateKey = templateFor(note.frontMatter);
    templateCounts[templateKey] = (templateCounts[templateKey] ?? 0) + 1;

    const resolveLink = (target: string) => resolveEntry(target)?.id ?? null;
    const ctx: MarkdownParseContext = {
      linkFor: (target, label) => {
        const found = resolveEntry(target);
        if (!found) return null;
        const name = read.get(found)?.title ?? found.base;
        // Her wording only when it is not the page's own name — a chip that
        // carried the name as chosen text would stop following renames.
        return { nodeId: found.id, label: name, ...(label && label !== name ? { text: label } : {}) };
      },
      pictureFor: (target) => pictureFor(entry.dir, target),
      tally,
    };

    const tabNames = yamlStrings(note.frontMatter.tabs);
    let tabs: Tab[];
    if (tabNames.length > 1) {
      if (/^## Details\s*$/m.test(note.body)) bumpTally(tally, DETAILS_SEEN);
      tabs = splitTabs(note.body, tabNames).map((section) => {
        const content = parseBlocks(section.lines, ctx);
        liftHeadings(content);
        return createTab({ id: crypto.randomUUID(), label: section.label, hidden: section.hidden, content: content as Tab["content"] });
      });
    } else {
      // One tab, named the way a fresh page of this template names its
      // first, so an imported note looks like one made here.
      const label = tabNames[0] ?? getDefaultTabs(templateKey)[0]?.label ?? "Main";
      tabs = [createTab({ id: crypto.randomUUID(), label, content: parseBlocks(note.body.split("\n"), ctx) as Tab["content"] })];
    }

    const { properties, customProperties } = propertiesOf(note.frontMatter, templateKey, { resolveLink, tally });
    const image = yamlStrings(note.frontMatter.image)[0];
    const banner = yamlStrings(note.frontMatter.banner)[0];
    const portrait = image ? pictureFor(entry.dir, image) : null;
    const cover = banner ? pictureFor(entry.dir, banner) : null;
    if (image && !portrait) bumpTally(tally, PICTURE_MISSING);
    if (banner && !cover) bumpTally(tally, PICTURE_MISSING);

    const node: Node = {
      id: entry.id,
      parentId,
      templateKey,
      name: note.title.trim() || entry.base,
      tabs,
      properties,
      customProperties,
      tags: tagsOf(note.frontMatter),
      ...(note.aliases.length > 0 ? { aliases: note.aliases } : {}),
      ...(note.frontMatter.hidden === true ? { hidden: true } : {}),
      // A portrait is a file in `assets/`, named without the prefix a block
      // carries; a web address stays as it is.
      ...(portrait ? { image: stripRef(portrait) } : {}),
      ...(cover ? { banner: stripRef(cover) } : {}),
      createdAt,
      updatedAt: createdAt,
    };
    nodes.push(node);

    return { id: entry.id, name: node.name, templateKey, children: entry.children.map((child) => convert(child, entry.id)) };
  }

  const preview = roots.map((entry) => convert(entry, null));

  const assets: ImportAsset[] = [...assetNames].map(([source, fileName]) => ({ fileName, read: () => input.readBytes(source) }));

  return {
    projectName: input.name.trim() || "Imported Project",
    nodes,
    rootOrder: roots.map((entry) => entry.id),
    homeNodeId: null,
    templateCounts,
    totalResources: nodes.length,
    lossyNotes: describe(tally),
    pendingImages: [],
    assets,
    preview,
  };
}

/**
 * A node's `image` and `banner` fields hold the bare filename where a block's
 * `url` holds the prefixed reference — see `asset-urls.ts`. A web address is
 * stored as itself in both.
 */
function stripRef(url: string): string {
  const prefix = assetRef("");
  return url.startsWith(prefix) ? url.slice(prefix.length) : url;
}
