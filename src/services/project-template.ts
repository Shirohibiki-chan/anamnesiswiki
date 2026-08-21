// Turning a project into a `.antpl` file, and a `.antpl` file back into a
// project's worth of nodes. Pure — no disk, no React. The hook owns reading and
// writing the file; the store owns creating the project the nodes go into.
//
// See `constants/project-template.ts` for what the file is and why it is a
// description of a shape rather than pages copied. Two rules follow from that
// and both live here:
//
//  - **Export keeps folders and collapses pages.** Every folder travels,
//    because folders *are* the setup. Pages collapse to one blank starter per
//    kind per parent — a Characters folder holding forty characters exports as
//    a Characters folder holding one blank Character. That's the difference
//    between handing someone your shape and handing them your world.
//  - **Nothing anybody wrote travels.** No tabs, no properties, no pictures, no
//    page tags, no folder notes. A folder keeps its colour and its tags because
//    a red Antagonists folder is a decision about the structure; a red
//    *character* is a decision about that character, and stays behind.
import {
  BLANK_TEMPLATE_KEY,
  FOLDER_TEMPLATE_KEY,
  UNTITLED_PAGE_NAME,
  createNode,
  type Node,
} from "../constants/schema";
import {
  PROJECT_TEMPLATE_FORMAT,
  PROJECT_TEMPLATE_VERSION,
  type ProjectTemplateFile,
  type ProjectTemplateNode,
} from "../constants/project-template";
import { seedBlocks } from "./block-service";
import { getDefaultTabs, getPropertySchema, getTemplate } from "./template-registry";
import { orderSiblings } from "./tree-service";

/**
 * The ceiling on how many folders and pages one template file may describe.
 *
 * Not a limit on her projects — the collapse above means a 75-page world
 * exports to a couple of dozen nodes. It is a limit on what a *file* can ask
 * the app to build, because a `.antpl` is something she is handed by another
 * person, and a hand-edited or simply broken one asking for a hundred thousand
 * pages should be refused with a sentence rather than write for ten minutes.
 */
export const MAX_TEMPLATE_NODES = 500;

/** What a template file describes, for the picker to say out loud. */
export type TemplateSummary = { folders: number; pages: number };

export function summarizeTemplate(file: ProjectTemplateFile): TemplateSummary {
  let folders = 0;
  let pages = 0;
  for (const node of file.nodes) {
    if (node.templateKey === FOLDER_TEMPLATE_KEY) folders += 1;
    else pages += 1;
  }
  return { folders, pages };
}

// ---- Export ----

export type BuildTemplateInput = {
  name: string;
  description: string;
  nodes: Node[];
  rootOrder: string[];
  childOrder?: Record<string, string[]>;
  appVersion?: string;
};

/**
 * A project's shape, as a file.
 *
 * Walks depth-first from the roots so parents land in the array before their
 * children — the file's ordering contract, and the only place sibling order is
 * recorded. Order within a level comes from `orderSiblings`, the same function
 * the tree itself draws with, so the template comes out in the order she sees
 * rather than in whatever order the nodes happen to be stored.
 *
 * **Hidden pages don't travel, and neither does anything under one.** `hidden`
 * means held back from anyone the project is shown to (see `Node.hidden`), and
 * a template file is the most thoroughly shown-to-someone-else thing there is.
 */
export function buildProjectTemplate(input: BuildTemplateInput): ProjectTemplateFile {
  const childrenByParent = new Map<string | null, Node[]>();
  for (const node of input.nodes) {
    const siblings = childrenByParent.get(node.parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parentId, siblings);
  }

  const out: ProjectTemplateNode[] = [];

  function walk(parentId: string | null, outParentId: string | null): void {
    const order = parentId === null ? input.rootOrder : input.childOrder?.[parentId];
    const siblings = orderSiblings(childrenByParent.get(parentId) ?? [], order);

    // Which page kinds this parent has already contributed a starter for. The
    // collapse is per parent rather than per project, so Characters and
    // Villains each keep a blank Character — two folders that hold the same
    // kind of page is itself part of the shape.
    const starterMade = new Set<string>();

    for (const node of siblings) {
      if (node.hidden) continue;

      if (node.templateKey === FOLDER_TEMPLATE_KEY) {
        const id = `n${out.length}`;
        out.push({
          id,
          parentId: outParentId,
          templateKey: FOLDER_TEMPLATE_KEY,
          name: node.name,
          ...(node.color ? { color: node.color } : {}),
          ...(node.tags.length > 0 ? { tags: [...node.tags] } : {}),
        });
        walk(node.id, id);
        continue;
      }

      // One starter per kind. The first in her own order wins, which is
      // arbitrary but stable — exporting the same project twice must give the
      // same file, or a template is something that changes under her.
      if (starterMade.has(node.templateKey)) continue;
      starterMade.add(node.templateKey);

      const id = `n${out.length}`;
      out.push({
        id,
        parentId: outParentId,
        templateKey: node.templateKey,
        // Named for its kind, not for her page: "Character", never "Valera
        // Jiang". The name is the one field on a page that is unambiguously
        // her writing.
        name: getTemplate(node.templateKey)?.label ?? UNTITLED_PAGE_NAME,
      });
      // Only the kept one is walked into. Nesting habits are worth carrying —
      // items parented to a character is a real part of how somebody works —
      // but forty characters' worth of them is a copy of the project.
      walk(node.id, id);
    }
  }

  walk(null, null);

  return {
    format: PROJECT_TEMPLATE_FORMAT,
    version: PROJECT_TEMPLATE_VERSION,
    name: input.name.trim() || UNTITLED_PAGE_NAME,
    description: input.description.trim(),
    createdAt: Date.now(),
    ...(input.appVersion ? { appVersion: input.appVersion } : {}),
    nodes: out,
  };
}

/** Pretty-printed on purpose — the file being readable is half the format. */
export function serializeProjectTemplate(file: ProjectTemplateFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

// ---- Import ----

export type ParsedTemplate = { ok: true; file: ProjectTemplateFile } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A file she was handed, checked before anything is built from it.
 *
 * Every failure says what is wrong in a sentence she can act on, because the
 * likely causes are all mundane — the wrong file picked, a download that
 * finished badly, a newer app's file on an older build. "Invalid template" is
 * a message that ends the conversation; naming the problem lets her go and ask
 * whoever sent it.
 */
export function parseProjectTemplate(text: string): ParsedTemplate {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't a project template — it couldn't be read as one at all." };
  }

  if (!isRecord(raw) || raw.format !== PROJECT_TEMPLATE_FORMAT) {
    return { ok: false, error: "That file isn't an Anamnesis project template." };
  }
  // Greater-than rather than not-equal: a file from an older format would be
  // worth reading if one ever exists, and there is exactly one version today,
  // so the only case this can hit is a file from a newer build.
  if (typeof raw.version !== "number" || raw.version > PROJECT_TEMPLATE_VERSION) {
    return { ok: false, error: "That template was made by a newer version of Anamnesis. Update, then try again." };
  }
  if (!Array.isArray(raw.nodes)) {
    return { ok: false, error: "That template file is damaged — the part describing its folders is missing." };
  }
  if (raw.nodes.length > MAX_TEMPLATE_NODES) {
    return {
      ok: false,
      error: `That template describes ${raw.nodes.length} folders and pages, which is more than Anamnesis will build from one file (${MAX_TEMPLATE_NODES}).`,
    };
  }

  const nodes: ProjectTemplateNode[] = [];
  for (const candidate of raw.nodes) {
    if (!isRecord(candidate)) continue;
    const { id, parentId, templateKey, name, color, tags } = candidate;
    if (typeof id !== "string" || typeof templateKey !== "string" || typeof name !== "string") continue;
    nodes.push({
      id,
      parentId: typeof parentId === "string" ? parentId : null,
      templateKey,
      name,
      ...(typeof color === "string" ? { color } : {}),
      ...(Array.isArray(tags) ? { tags: tags.filter((tag): tag is string => typeof tag === "string") } : {}),
    });
  }

  if (nodes.length === 0) {
    return { ok: false, error: "That template is empty — there are no folders or pages in it to make." };
  }

  return {
    ok: true,
    file: {
      format: PROJECT_TEMPLATE_FORMAT,
      version: PROJECT_TEMPLATE_VERSION,
      name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Template",
      description: typeof raw.description === "string" ? raw.description.trim() : "",
      createdAt: typeof raw.createdAt === "number" ? raw.createdAt : 0,
      ...(typeof raw.appVersion === "string" ? { appVersion: raw.appVersion } : {}),
      nodes,
    },
  };
}

// ---- Using one ----

/**
 * A template's worth of real nodes, ready to be written as a new project.
 *
 * **Fresh ids for everything**, never the file's own: two projects made from
 * one template share no identity, the same rule a duplicated project follows
 * and for the same reason — an id that arrives from outside is an id two
 * things can end up wearing.
 *
 * **Tabs come from the registry here, not from the file.** That is what keeps a
 * template made a year ago from seeding pages with a year-old set of prompts,
 * and it is why the file has no page content in it to go stale in the first
 * place.
 *
 * A parent id that hasn't been seen yet resolves to `null` rather than being
 * chased — which, because the file's contract is parents-before-children, also
 * means a file with a cycle in it produces roots instead of hanging.
 */
export function materializeProjectTemplate(file: ProjectTemplateFile): { nodes: Node[]; rootOrder: string[] } {
  const newIdByOldId = new Map<string, string>();
  const nodes: Node[] = [];
  const rootOrder: string[] = [];

  for (const entry of file.nodes) {
    const parentId = entry.parentId === null ? null : (newIdByOldId.get(entry.parentId) ?? null);
    // An unknown key would otherwise make a page with no tabs and no property
    // schema — a blank page is what that already means, and it has a name.
    const templateKey = getTemplate(entry.templateKey) ? entry.templateKey : BLANK_TEMPLATE_KEY;

    const node = createNode({
      parentId,
      templateKey,
      // Trimmed, not truncated: a node's name lives in its JSON and the tree
      // reads it from there, so length is `sanitizeSegment`'s problem on the
      // way to disk and not something to quietly shorten here.
      name: entry.name.trim() || UNTITLED_PAGE_NAME,
      tabs: getDefaultTabs(templateKey),
      // The same sidebar a page of this kind made in the app would get. Left
      // to `createNode`'s default it would be an authored *empty* list, and a
      // project built from a template would arrive with every panel blank —
      // which reads as the templates having lost their fields. See
      // block-service's seedBlocks.
      blocks: seedBlocks(templateKey, getPropertySchema(templateKey)),
      tags: entry.tags ?? [],
      ...(entry.color ? { color: entry.color } : {}),
    });

    newIdByOldId.set(entry.id, node.id);
    nodes.push(node);
    if (parentId === null) rootOrder.push(node.id);
  }

  return { nodes, rootOrder };
}
