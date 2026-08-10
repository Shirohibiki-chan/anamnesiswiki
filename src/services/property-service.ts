// Pure property logic — ordering today, the project-wide property index next.
// Lives here rather than in the panel because CLAUDE.md puts logic in
// services and because this is exactly the kind of thing that's worth a test:
// the fallback rules below are the difference between a page nobody has
// touched looking the way it always did and every sidebar silently
// rearranging itself on upgrade.
import type { CustomPropertySpec, PropertyOption } from "../constants/schema";

// The shape the sidebar renders from — a template's own fixed field and a
// per-page custom one flattened into one thing, since once they're ordered
// together nothing downstream cares which it started as.
export type RenderableProperty = {
  key: string;
  label: string;
  type: CustomPropertySpec["type"];
  placeholder?: string;
  options?: PropertyOption[];
};

/**
 * Applies a page's manual property order to the default one.
 *
 * Both halves of the fallback matter. No stored order at all means the page
 * has never been reordered, so it keeps whatever grouping the caller built —
 * fixed fields, then refs, then custom (see PropertiesPanel for why refs sit
 * apart). A stored order that doesn't mention every key — which is what a
 * page looks like the moment a property is added after a reorder — puts the
 * keys it knows about first, in its own order, and leaves the rest in default
 * order behind them, rather than dropping them off the panel entirely.
 */
export function orderProperties<T extends { key: string }>(specs: T[], order: string[] | undefined): T[] {
  if (!order || order.length === 0) return specs;

  const rank = new Map(order.map((key, index) => [key, index]));
  return specs
    .map((spec, index) => ({ spec, index, rank: rank.get(spec.key) ?? Infinity }))
    .sort((a, b) => (a.rank === b.rank ? a.index - b.index : a.rank - b.rank))
    .map((entry) => entry.spec);
}
