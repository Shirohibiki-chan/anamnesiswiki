// Canonical Node / Tab / Project shapes. See docs/spec.md §Data model.
// BlockNoteDocument is a placeholder until Phase 5 wires up the real BlockNote
// editor and this can become BlockNote's actual Block[] type.
export type BlockNoteDocument = unknown[];

export const FOLDER_TEMPLATE_KEY = "folder";

// Canonical order used in the New Page picker. See docs/constants-and-theming.md.
export const TEMPLATE_KEYS = [
  "folder",
  "character",
  "location",
  "faction",
  "item",
  "event",
  "species",
  "note",
] as const;

export type Tab = {
  id: string;
  label: string;
  hidden: boolean;
  content: BlockNoteDocument;
};

export type Node = {
  id: string;
  parentId: string | null;
  templateKey: string;
  name: string;
  tabs: Tab[];
  properties: Record<string, unknown>;
  tags: string[];
  color?: string;
  createdAt: number;
  updatedAt: number;
};

export type Project = {
  version: 1;
  name: string;
  rootOrder: string[];
  expandedIds: string[];
  selectedId: string | null;
  createdAt: number;
};

export function createTab(input: { id: string; label: string; hidden?: boolean; content?: BlockNoteDocument }): Tab {
  return {
    id: input.id,
    label: input.label,
    hidden: input.hidden ?? false,
    content: input.content ?? [],
  };
}

export function createNode(input: {
  parentId: string | null;
  templateKey: string;
  name: string;
  tabs?: Tab[];
  properties?: Record<string, unknown>;
  tags?: string[];
  color?: string;
}): Node {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    parentId: input.parentId,
    templateKey: input.templateKey,
    name: input.name,
    tabs: input.tabs ?? [],
    properties: input.properties ?? {},
    tags: input.tags ?? [],
    color: input.color,
    createdAt: now,
    updatedAt: now,
  };
}

export function createProject(input: { name: string; rootOrder?: string[]; expandedIds?: string[] }): Project {
  return {
    version: 1,
    name: input.name,
    rootOrder: input.rootOrder ?? [],
    expandedIds: input.expandedIds ?? [],
    selectedId: null,
    createdAt: Date.now(),
  };
}
