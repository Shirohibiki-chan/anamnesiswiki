// The only import path components have into style-class.ts. Phase 30, step 2.
import { useMemo } from "react";
import type { Node } from "../constants/schema";
import { effectiveStyleClass, styleClassesInUse } from "../services/style-class";
import { useProjectStore } from "../state/project-store";

/**
 * The `data-style` value this page's root should carry — its own name, else
 * its template's, else undefined so the attribute is left off entirely.
 *
 * Narrow on purpose: the page view re-renders on every keystroke already, and
 * this only has to change when the page's own name or the library does.
 */
export function useEffectiveStyleClass(node: Node | undefined): string | undefined {
  const library = useProjectStore((state) => state.templates);
  return useMemo(() => (node ? effectiveStyleClass(node, library) : undefined), [node, library]);
}

/** Every style name in the world, for the picker to offer. */
export function useStyleClassesInUse(): string[] {
  const nodes = useProjectStore((state) => state.nodes);
  const library = useProjectStore((state) => state.templates);
  return useMemo(() => styleClassesInUse(nodes, library), [nodes, library]);
}
