// The only import path components have into template-registry.ts. See
// CLAUDE.md's layer order — components never import services directly.
import {
  getPropertySchema,
  getTemplate,
  TEMPLATE_REGISTRY,
  type TemplateDefinition,
} from "../services/template-registry";

/**
 * Defined once, outside the hook, and that is a correctness matter.
 *
 * It used to be remade on every call, and anything that listed it as a memo
 * dependency re-ran on every render of its component. The graph's model did —
 * so on a world of 831 pages the whole force simulation ran again on every
 * pointer move, at about 770ms a move (measured 2026-09-13). The registry is
 * static, so there is nothing for this to close over; the same function every
 * time is the only right answer.
 */
function getLabel(key: string): string {
  return getTemplate(key)?.label ?? key;
}

export function useTemplates() {
  return { templates: TEMPLATE_REGISTRY as Record<string, TemplateDefinition>, getTemplate, getLabel, getPropertySchema };
}
