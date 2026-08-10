// Suggested property names per template, offered as one-click chips inside
// the "Add property" form (see PropertiesPanel). Phase 13.
//
// These are *suggestions*, never a schema. Picking one runs the same
// addCustomProperty the typed-in path runs, so nothing here changes what a
// template is, and a page that ignores all of them looks exactly as it does
// today. That's the whole reason this file is a separate list rather than more
// entries in template-registry.ts's `properties`: adding a field to a template
// would make it appear, empty, on every page already using that template.
//
// Mined selectively from World Anvil's Person template, which carries ~120
// typed fields — see docs/plan.md Future Features → World Anvil import. The
// selection is the point: WA's own reputation is for bloat, and a suggestion
// list nobody reads to the bottom of is the same failure in miniature. A dozen
// per template, chosen for what people actually fill in.
//
// Types are picked against how worldbuilders actually write, which is not
// always how a database would want it. Age is text, not number, for the same
// reason Event's "When" is text: "appears 20, actually 400" is a real answer
// and a number input can't hold it. Number is reserved for the fields that
// genuinely are counts (Population, Value). Where a suggestion names something
// that has its own page — Species, Birthplace, Affiliation — it's `refs`, so
// the suggestion quietly builds the link graph Phases 18 and 24 run on.
import type { CustomPropertySpec } from "./schema";

export type PropertySuggestion = {
  label: string;
  type: CustomPropertySpec["type"];
};

// Note and blank pages have no subject matter to predict, so they get the
// short generic set rather than a padded one.
const GENERIC: PropertySuggestion[] = [
  { label: "Status", type: "status" },
  { label: "Summary", type: "longtext" },
  { label: "Source", type: "text" },
  { label: "Related to", type: "refs" },
];

export const PROPERTY_SUGGESTIONS: Record<string, PropertySuggestion[]> = {
  character: [
    { label: "Age", type: "text" },
    { label: "Pronouns", type: "text" },
    { label: "Species", type: "refs" },
    { label: "Occupation", type: "text" },
    { label: "Height", type: "text" },
    { label: "Eyes", type: "text" },
    { label: "Hair", type: "text" },
    { label: "Birthplace", type: "refs" },
    { label: "Affiliation", type: "refs" },
    { label: "Status", type: "status" },
    { label: "Motivation", type: "longtext" },
    { label: "Quirks", type: "longtext" },
  ],
  location: [
    { label: "Type", type: "select" },
    { label: "Population", type: "number" },
    { label: "Government", type: "text" },
    { label: "Ruler", type: "refs" },
    { label: "Climate", type: "text" },
    { label: "Founded", type: "date" },
    { label: "Languages", type: "text" },
    { label: "Status", type: "status" },
    { label: "Notable for", type: "longtext" },
    { label: "Points of interest", type: "longtext" },
  ],
  faction: [
    { label: "Type", type: "select" },
    { label: "Founded", type: "date" },
    { label: "Headquarters", type: "refs" },
    { label: "Size", type: "text" },
    { label: "Allies", type: "refs" },
    { label: "Enemies", type: "refs" },
    { label: "Motto", type: "text" },
    { label: "Status", type: "status" },
    { label: "Goals", type: "longtext" },
    { label: "Structure", type: "longtext" },
  ],
  item: [
    { label: "Type", type: "select" },
    { label: "Rarity", type: "select" },
    { label: "Material", type: "text" },
    { label: "Value", type: "number" },
    { label: "Weight", type: "text" },
    { label: "Made by", type: "refs" },
    { label: "Origin", type: "text" },
    { label: "Status", type: "status" },
    { label: "Powers", type: "longtext" },
  ],
  event: [
    { label: "Type", type: "select" },
    { label: "Duration", type: "text" },
    { label: "Casualties", type: "text" },
    { label: "Preceded by", type: "refs" },
    { label: "Followed by", type: "refs" },
    { label: "Status", type: "status" },
    { label: "Cause", type: "longtext" },
    { label: "Outcome", type: "longtext" },
    { label: "Significance", type: "longtext" },
  ],
  species: [
    { label: "Lifespan", type: "text" },
    { label: "Average height", type: "text" },
    { label: "Diet", type: "text" },
    { label: "Intelligence", type: "text" },
    { label: "Population", type: "number" },
    { label: "Language", type: "text" },
    { label: "Status", type: "status" },
    { label: "Abilities", type: "longtext" },
    { label: "Distinguishing features", type: "longtext" },
  ],
  note: GENERIC,
  blank: GENERIC,
};

export function getPropertySuggestions(templateKey: string): PropertySuggestion[] {
  return PROPERTY_SUGGESTIONS[templateKey] ?? GENERIC;
}
