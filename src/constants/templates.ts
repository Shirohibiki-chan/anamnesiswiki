// Minimal per-template metadata the tree needs before Phase 7 builds the real
// `template-registry.ts` (tabs, property schemas, placeholder copy). Phase 7
// should fold TEMPLATE_LABELS and canHaveChildren into that file rather than
// keeping this one around — it exists only so Phase 3 doesn't have to
// hardcode template names/nesting rules inline in components.
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
