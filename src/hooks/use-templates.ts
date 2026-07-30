// The only import path components have into template-registry.ts. See
// CLAUDE.md's layer order — components never import services directly.
import {
  canHaveChildren,
  getPropertySchema,
  getTemplate,
  TEMPLATE_REGISTRY,
  type TemplateDefinition,
} from "../services/template-registry";

export function useTemplates() {
  function getLabel(key: string): string {
    return getTemplate(key)?.label ?? key;
  }

  return { templates: TEMPLATE_REGISTRY as Record<string, TemplateDefinition>, getTemplate, getLabel, canHaveChildren, getPropertySchema };
}
