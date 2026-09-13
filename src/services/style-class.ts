// A page's style name: what it is normalised to, which one wins, and which
// are already in use. Phase 30, step 2. See docs/plan.md.
//
// **The attribute is the whole feature.** Everything here exists so that one
// `data-style` value lands on the page view's root and a snippet in
// `<projectsDir>/snippets/` can target it. Nothing in the app reads the name
// back for any other purpose, and nothing should: the moment the app styles a
// page by its own class names, the name stops being hers.
import type { Node, TemplateLibrary } from "../constants/schema";
import { overrideFor } from "./template-library";

/** The most a name may run to. Longer than any sensible class; short enough to fit a menu row. */
export const STYLE_CLASS_MAX_CHARS = 40;

/**
 * What a typed name becomes: lowercase, spaces and underscores to hyphens,
 * anything that is not a letter, digit or hyphen dropped, runs of hyphens
 * collapsed, ends trimmed. `Character Sheet` → `character-sheet`. Empty after
 * all that means no name at all.
 *
 * Strict on purpose. A name is going into a CSS attribute selector, and a
 * character that needs escaping there (`.`, `:`, a space) is a name whose
 * snippet silently matches nothing — the failure that reads as "styles don't
 * work" rather than "your name has a colon in it".
 */
export function normaliseStyleClass(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const name = raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, STYLE_CLASS_MAX_CHARS);
  return name === "" ? undefined : name;
}

/**
 * The name this page's root carries: its own if it set one, else the one
 * this world's copy of its template carries, else nothing.
 *
 * **Only an override in the library can speak for a template.** The built-in
 * registry carries no style names and never will — a name is hers, set in her
 * world's copy, the way every edit to a built-in template is.
 */
export function effectiveStyleClass(node: Node, library: TemplateLibrary): string | undefined {
  if (node.styleClass) return node.styleClass;
  return overrideFor(library, node.templateKey)?.styleClass;
}

/**
 * Every style name set anywhere in the world — on pages and on templates —
 * each once, alphabetically. What the picker offers, so a name is typed once
 * and chosen afterwards rather than retyped and misspelt.
 */
export function styleClassesInUse(nodes: Record<string, Node>, library: TemplateLibrary): string[] {
  const seen = new Set<string>();
  for (const node of Object.values(nodes)) if (node.styleClass) seen.add(node.styleClass);
  for (const node of Object.values(library.nodes)) if (node.styleClass) seen.add(node.styleClass);
  return [...seen].sort((a, b) => a.localeCompare(b));
}
