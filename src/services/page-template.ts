// Turning a page template into a `.anpage` bundle, and a bundle back into
// templates. Pure — no disk, no React. The hook owns reading and writing the
// file; the store owns putting the nodes into the library.
//
// See `constants/page-template.ts` for what the file is and why it is a zip
// rather than one JSON document. Two rules follow from it and both live here:
//
//  - **The pages travel whole.** Prose, properties, blocks, tags, colours —
//    everything. That is the difference between this and a `.antpl`, which
//    describes a shape and carries nobody's writing. "Turn this page into a
//    template" means the page, so handing that template to somebody means the
//    page.
//  - **The picture references are not rewritten, and do not need to be.** An
//    asset filename is `{uuid}.{ext}`, so a reference reading
//    `anamnesis-asset:6f3e….png` already names the file the bundle carries at
//    `assets/6f3e….png`. Two projects cannot collide on one of those, which is
//    also why importing can keep the names rather than mint new ones.
import { unzipSync, zip } from "fflate";
import {
  MAX_PAGE_TEMPLATE_NODES,
  PAGE_TEMPLATE_ASSETS_DIR,
  PAGE_TEMPLATE_FORMAT,
  PAGE_TEMPLATE_MANIFEST,
  PAGE_TEMPLATE_VERSION,
} from "../constants/page-template";
import type { Node } from "../constants/schema";
import { assetUsesIn } from "./asset-usage";

/** What the manifest inside the bundle says. */
export type PageTemplateFile = {
  format: typeof PAGE_TEMPLATE_FORMAT;
  version: number;
  /** Which of `nodes` is the template itself; the rest are inside it. */
  rootId: string;
  nodes: Node[];
  /** Filenames present under `assets/`. Empty when pictures were left out. */
  assets: string[];
};

/** What a bundle holds, for a picker or a modal to say out loud. */
export type PageTemplateSummary = { name: string; pages: number; pictures: number };

export function summarizePageTemplate(file: PageTemplateFile): PageTemplateSummary {
  const root = file.nodes.find((node) => node.id === file.rootId);
  return { name: root?.name ?? "Template", pages: file.nodes.length, pictures: file.assets.length };
}

/**
 * Every picture the subtree points at, deduplicated, in a stable order.
 *
 * **Stable so two exports of an untouched template are the same bundle.** A
 * zip whose entries shuffle between runs cannot be compared with the last one,
 * and this is a file people will send each other more than once.
 */
export function picturesIn(nodes: Node[]): string[] {
  const seen = new Set<string>();
  for (const node of nodes) {
    for (const use of assetUsesIn(node)) seen.add(use.fileName);
  }
  return [...seen].sort();
}

// ---- Export ----

/**
 * Builds the bundle.
 *
 * `pictures` is what the caller managed to read — a file that would not read
 * is simply absent from it, and the manifest then lists only what is really
 * inside. Recording a picture the bundle does not carry would produce a file
 * that fails on import for a reason nobody could see.
 */
export function packPageTemplate(input: { rootId: string; nodes: Node[]; pictures: { fileName: string; bytes: Uint8Array }[] }): Promise<Uint8Array> {
  const manifest: PageTemplateFile = {
    format: PAGE_TEMPLATE_FORMAT,
    version: PAGE_TEMPLATE_VERSION,
    rootId: input.rootId,
    nodes: input.nodes,
    assets: input.pictures.map((picture) => picture.fileName).sort(),
  };

  const tree: Record<string, Uint8Array> = {
    // Indented, because the promise the project folder makes about her writing
    // staying readable outside the app is worth extending to the thing she
    // hands to somebody else. It costs bytes a zip gets straight back.
    [PAGE_TEMPLATE_MANIFEST]: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
  };
  for (const picture of input.pictures) tree[`${PAGE_TEMPLATE_ASSETS_DIR}/${picture.fileName}`] = picture.bytes;

  return new Promise((resolve, reject) => {
    zip(tree, { level: 6 }, (error, data) => (error ? reject(error) : resolve(data)));
  });
}

// ---- Import ----

export type ParsedPageTemplate = {
  file: PageTemplateFile;
  /** The bytes of each picture the bundle actually carries, by filename. */
  pictures: Map<string, Uint8Array>;
};

/**
 * Reads a bundle, or throws with a sentence somebody can act on.
 *
 * **Every failure says what is wrong rather than what threw**, because this is
 * a file that arrived through a chat window and the likely faults are mundane:
 * the wrong file picked, a truncated download, a `.zip` somebody renamed.
 */
export function parsePageTemplate(bytes: Uint8Array): ParsedPageTemplate {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    throw new Error("That file isn't a template — it couldn't be opened at all. If it arrived through a chat window it may have been cut short.");
  }

  const manifestBytes = entries[PAGE_TEMPLATE_MANIFEST];
  if (!manifestBytes) throw new Error("That file is a zip, but not a template — there's no template.json inside it.");

  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(manifestBytes));
  } catch {
    throw new Error("The template inside that file is damaged and couldn't be read.");
  }

  const file = raw as Partial<PageTemplateFile>;
  if (file.format !== PAGE_TEMPLATE_FORMAT) {
    throw new Error("That's an Anamnesis file, but not a page template. A project template is a .antpl and opens from the start screen.");
  }
  if (typeof file.version !== "number" || file.version > PAGE_TEMPLATE_VERSION) {
    throw new Error("That template was made by a newer version of Anamnesis than this one, so it can't be read.");
  }
  if (!Array.isArray(file.nodes) || file.nodes.length === 0) throw new Error("That template is empty — there are no pages in it.");
  if (file.nodes.length > MAX_PAGE_TEMPLATE_NODES) {
    throw new Error(`That template describes ${file.nodes.length} pages, which is more than a template should hold. It's probably damaged.`);
  }

  const nodes = file.nodes.filter((node): node is Node => Boolean(node) && typeof node === "object" && typeof (node as Node).id === "string");
  if (nodes.length !== file.nodes.length) throw new Error("Some of the pages in that template are damaged and couldn't be read.");
  if (!nodes.some((node) => node.id === file.rootId)) throw new Error("That template doesn't say which page is the template itself.");

  // Only the pictures that are really in the bundle. A manifest listing one
  // that is not there is a bundle somebody edited or a download that stopped
  // early, and the import should carry what exists rather than fail on the
  // difference.
  const pictures = new Map<string, Uint8Array>();
  const prefix = `${PAGE_TEMPLATE_ASSETS_DIR}/`;
  for (const [path, data] of Object.entries(entries)) {
    if (!path.startsWith(prefix) || path === prefix) continue;
    // Flat by design: a nested path in an archive is how a zip escapes the
    // folder it is unpacked into, and an asset filename never has one.
    const name = path.slice(prefix.length);
    if (name.includes("/") || name.includes("\\") || name.startsWith(".")) continue;
    pictures.set(name, data);
  }

  return { file: { ...(file as PageTemplateFile), nodes }, pictures };
}
