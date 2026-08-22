// Every icon Lucide ships, by name. Phase 18c.
//
// **The curated list in `glyphs.ts` is the front of the picker; this is the
// back of it.** Her comparison against the reference was that our selection
// was tiny next to theirs, and it was — a few hundred, chosen by me. Lucide
// ships around fifteen hundred and they are already in the bundle's
// dependency, so the only real question was whether to make them reachable.
//
// **Cost, stated plainly:** `import *` defeats tree-shaking for this package,
// so every icon lands in the bundle whether or not a page uses it. That is
// ~1MB of JavaScript read off her own disk at launch, which is the trade for
// a picker that can actually find things. If launch ever feels slow, this file
// is the first place to look — the fix would be loading it on demand when the
// picker opens rather than trimming the list again.
import * as lucide from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** PascalCase to the kebab name Lucide documents and we store. */
function kebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

/**
 * Every icon, once.
 *
 * Lucide exports each one under three names — `Heart`, `HeartIcon` and
 * `LucideHeart` — so the aliases are dropped rather than filling the grid with
 * the same picture three times. `Icon` and `createLucideIcon` are the
 * package's own machinery and are not icons.
 */
export const ALL_GLYPHS: { name: string; icon: LucideIcon }[] = Object.entries(
  lucide as unknown as Record<string, unknown>,
)
  .filter(([name, value]) => {
    if (!/^[A-Z]/.test(name)) return false;
    if (name === "Icon" || name.startsWith("Lucide") || name.endsWith("Icon")) return false;
    // An icon is a forwardRef object, not a plain function or a data map.
    return typeof value === "object" && value !== null && "$$typeof" in (value as object);
  })
  .map(([name, value]) => ({ name: kebab(name), icon: value as LucideIcon }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const ALL_GLYPHS_BY_NAME = new Map(ALL_GLYPHS.map((glyph) => [glyph.name, glyph.icon]));
