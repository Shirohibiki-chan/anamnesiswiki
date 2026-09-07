// One value, drawn. Shared by every layout that shows a value without
// offering to change it. Phase 23, step 4.
//
// Its own file because four layouts draw values and only one of them can be
// typed into — without this, three of them would each have grown their own
// slightly different idea of what an empty cell and a coloured chip look like.
import { getPaletteHex } from "../../constants/palette";
import type { Node } from "../../constants/schema";
import type { DatabaseCell } from "../../hooks/use-database";
import { useNodeImage } from "../../hooks/use-node-image";

export function DatabaseValue({ value }: { value: DatabaseCell }) {
  if (value.kind === "empty") return null;
  if (value.kind === "text") return <span className="database-cell-text">{value.text}</span>;

  return (
    <span className="database-chips">
      {value.chips.map((chip) => (
        <DatabaseChip key={chip.id} label={chip.label} color={chip.color} />
      ))}
    </span>
  );
}

export function DatabaseChip({ label, color }: { label: string; color?: string }) {
  // A tint behind ordinary text, never coloured text — the palette is pastels
  // picked against dark themes and would fail the contrast floor the moment
  // anyone switched to Daylight. Same trick as SelectProperty.
  const hex = getPaletteHex(color);
  return (
    <span className="database-chip" style={hex ? { backgroundColor: `${hex}26` } : undefined}>
      {label}
    </span>
  );
}

/**
 * A page's own portrait on a card.
 *
 * **Through `useNodeImage`, not `assetRef`.** A ref is what goes *into* saved
 * writing; turning one into something an `<img>` can load means reading the
 * file, which is asynchronous. The first draft used the ref directly and every
 * card drew a broken-image icon.
 *
 * Nothing is drawn while it loads or if it fails. A card with no picture is an
 * ordinary card; a grey rectangle repeated forty times is worse than the space
 * it would fill.
 */
export function DatabasePicture({ row }: { row: Node }) {
  const { url } = useNodeImage(row.image);
  if (!url) return null;

  return (
    <img
      className="database-card-picture"
      src={url}
      alt={row.imageAlt ?? ""}
      style={row.imageFocusY !== undefined ? { objectPosition: `50% ${row.imageFocusY}%` } : undefined}
    />
  );
}
