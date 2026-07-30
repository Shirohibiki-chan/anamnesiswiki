// Minimal per-template metadata the tree and properties panel need before
// Phase 7 builds the real `template-registry.ts` (tabs, property schemas,
// placeholder copy). Phase 7 should fold TEMPLATE_LABELS, canHaveChildren,
// and PROPERTY_SCHEMAS into that file rather than keeping this one around —
// it exists only so earlier phases don't have to hardcode template
// metadata inline in components.
import { TEMPLATE_KEYS } from "./schema";

export const TEMPLATE_LABELS: Record<(typeof TEMPLATE_KEYS)[number], string> = {
  folder: "Folder",
  character: "Character",
  location: "Location",
  faction: "Faction",
  item: "Item",
  event: "Event",
  species: "Species",
  note: "Note",
};

// Matches docs/prototype/anamnesis.jsx's canHaveChildren rule: folders and a
// few node types that can hold sub-pages (a character's items, a location's
// sub-locations, etc). Items, events, and notes are always leaves.
const NESTABLE_TEMPLATE_KEYS = new Set(["folder", "character", "location", "faction", "species"]);

export function canHaveChildren(templateKey: string): boolean {
  return NESTABLE_TEMPLATE_KEYS.has(templateKey);
}

// Sidebar property fields per template, copied from docs/prototype/anamnesis.jsx's
// TEMPLATES object (properties arrays only — tabs and placeholder body copy
// are Phase 7's job). The prototype's trailing `{ key: 'tags', type: 'tags' }`
// entry on each template is deliberately dropped here: our real Node schema
// (see schema.ts) already carries tags as its own top-level field rather than
// folding it into the properties bag, and PropertiesPanel renders a single
// fixed Tags section at the bottom of every non-folder node for that reason.
export type PropertySpec = {
  key: string;
  label: string;
  type: "text" | "longtext" | "refs" | "date";
  placeholder?: string;
};

export const PROPERTY_SCHEMAS: Record<(typeof TEMPLATE_KEYS)[number], PropertySpec[]> = {
  folder: [],
  character: [
    { key: "summary", label: "Summary", type: "text", placeholder: "A one-line summary." },
    { key: "friends", label: "Friends", type: "refs" },
  ],
  location: [
    { key: "summary", label: "Summary", type: "text", placeholder: "A one-line summary." },
    { key: "parent_location", label: "Part of", type: "refs" },
  ],
  faction: [
    { key: "summary", label: "Summary", type: "text", placeholder: "A one-line summary." },
    { key: "leader", label: "Leader", type: "refs" },
    { key: "members", label: "Members", type: "refs" },
  ],
  item: [
    { key: "summary", label: "Summary", type: "text", placeholder: "A one-line summary." },
    { key: "owner", label: "Current Owner", type: "refs" },
  ],
  event: [
    { key: "summary", label: "Summary", type: "text", placeholder: "A one-line summary." },
    { key: "when", label: "When", type: "text", placeholder: "e.g. Year 872, Third Age" },
    { key: "where", label: "Where", type: "refs" },
    { key: "participants", label: "Participants", type: "refs" },
  ],
  species: [
    { key: "summary", label: "Summary", type: "text", placeholder: "A one-line summary." },
    { key: "homeland", label: "Homeland", type: "refs" },
  ],
  note: [],
};
