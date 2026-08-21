// The `.antpl` file: a project's shape, in one file somebody can send you.
//
// **This is not the same thing as `TemplateLibrary` in schema.ts**, and the
// difference is the whole design. A *page* template is a page, copied — it
// carries her writing, her filled-in properties, her pictures, because that is
// what "turn this page into a template" means. A *project* template is a
// description of a structure: the folders, what nests in what, and what kind
// of page belongs where. Nothing anybody wrote travels in one.
//
// That is why the nodes here are their own small shape rather than `Node`
// reused wholesale. Three things fall out of it and all three are the point:
//
//  - **The file is legible.** Open it in Notepad and you can read the folder
//    tree. Same promise the project folder itself makes — her writing stays
//    readable outside the app — applied to the thing she hands to someone else.
//  - **Nobody's writing can leak into one by accident.** A field that isn't in
//    this type cannot be exported, so "does this carry my draft" has a
//    structural answer rather than a careful one.
//  - **Starter pages arrive current.** A page's tabs and placeholder prompts
//    are not stored here at all — they're built from `template-registry.ts`
//    when the template is used. A template written a year ago makes pages with
//    today's prompts in them, instead of freezing whatever the exporter had.
//
// Plain JSON, not gzipped like `.lk`. A `.lk` is gzipped because LegendKeeper
// made it so; this is ours, it is kilobytes, and legibility is worth more than
// the bytes.
export const PROJECT_TEMPLATE_FORMAT = "anamnesis-project-template";

export const PROJECT_TEMPLATE_VERSION = 1;

/** Without the dot, the way `dialog-service`'s filters want it. */
export const PROJECT_TEMPLATE_EXTENSION = "antpl";

/**
 * One folder or one starter page.
 *
 * `id` is only meaningful inside the file — it wires `parentId` up and nothing
 * else. Fresh ids are minted when the template is used, so two projects made
 * from the same template share no identity, the same rule a duplicated project
 * follows.
 *
 * `color` and `tags` come along because they are part of a setup somebody
 * worked out: a red Antagonists folder is a decision, not decoration. Notes,
 * tabs, properties, pictures and banners deliberately do not — that is the
 * writing.
 */
export type ProjectTemplateNode = {
  id: string;
  parentId: string | null;
  /** A key from `TEMPLATE_KEYS`. Unknown keys fall back to blank when used. */
  templateKey: string;
  name: string;
  color?: string;
  tags?: string[];
};

/**
 * The file itself.
 *
 * `nodes` is flat and **parents come before their children** — that ordering
 * is the file's only record of sibling order, which is why there is no
 * `rootOrder` or `childOrder` in here. Building the nodes in array order
 * reproduces both for free, since an unlisted sibling falls back to creation
 * order anyway (see `tree-service`'s `orderSiblings`).
 */
export type ProjectTemplateFile = {
  format: typeof PROJECT_TEMPLATE_FORMAT;
  version: typeof PROJECT_TEMPLATE_VERSION;
  name: string;
  /** One line about what the shape is for. Empty when whoever exported it said nothing. */
  description: string;
  createdAt: number;
  /** Which build wrote it. Never read to decide anything — it is there for the day a file turns out to be strange. */
  appVersion?: string;
  nodes: ProjectTemplateNode[];
};
