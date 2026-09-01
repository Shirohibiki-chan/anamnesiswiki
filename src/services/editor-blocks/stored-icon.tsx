// Draws an icon that was stored by name, inside the editor. Phase 19.5.
//
// **The same job as `MeterIcon` in components/blocks/IconPicker.tsx, on the
// other side of a boundary that exists on purpose.** Everything under
// `services/` may not import a component, so the editor's own blocks cannot
// use that one; this is the second copy, and it is six lines rather than a
// reason to move the picker. `CalloutColorButton` and `ColorSwatches` are the
// existing precedent for the same split.
//
// **The text fallback is the point.** An emoji is stored as its own character
// and is not in the glyph registry, so "not a glyph" has to mean "draw it as
// text" rather than "draw nothing" — and a Lucide name that leaves the
// catalogue in some future version lands here too, showing itself instead of
// vanishing out of the middle of a sentence.
import { getGlyph } from "../../constants/glyphs";

export function StoredIcon({ icon, size = 15 }: { icon: string; size?: number }) {
  const Glyph = getGlyph(icon);
  // eslint-disable-next-line react-hooks/static-components -- getGlyph reads a fixed lookup table, so a given name returns the same stable component reference every render
  if (Glyph) return <Glyph size={size} />;
  return (
    <span className="icon-as-text" style={{ fontSize: size }}>
      {icon}
    </span>
  );
}
