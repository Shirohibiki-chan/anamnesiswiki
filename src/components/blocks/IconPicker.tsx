// Pick an icon: a searchable grid of glyphs, and a tab of emoji. Phase 18c.
//
// Built for a meter's readings, and deliberately not built into one — a page's
// own icon is the same control (`docs/ideas.md` §Icons you choose yourself),
// so this takes a value and a callback and knows nothing about meters.
//
// **A glyph is stored by name and an emoji as the character itself.** That is
// what lets the emoji half exist at all under this app's Policy Boundary:
// nothing is fetched, nothing is bundled, and the system font draws it. It
// also means an unknown stored value degrades to text rather than to a crash.
import { useState } from "react";
import { X } from "lucide-react";
import { searchEmoji } from "../../constants/emoji";
import { getGlyph, searchGlyphs } from "../../constants/glyphs";

type IconPickerProps = {
  /** The icon currently chosen, so it can be shown as picked and cleared. */
  value: string | undefined;
  onPick: (icon: string | undefined) => void;
};

export function IconPicker({ value, onPick }: IconPickerProps) {
  const [tab, setTab] = useState<"glyphs" | "emoji">("glyphs");
  const [query, setQuery] = useState("");

  const glyphGroups = searchGlyphs(query);
  const emojiGroups = searchEmoji(query);
  const groups = tab === "glyphs" ? glyphGroups : emojiGroups;

  return (
    <div className="icon-picker">
      <div className="icon-picker-tabs">
        <button
          type="button"
          className={`icon-picker-tab${tab === "glyphs" ? " icon-picker-tab-active" : ""}`}
          onClick={() => setTab("glyphs")}
        >
          Glyphs
        </button>
        <button
          type="button"
          className={`icon-picker-tab${tab === "emoji" ? " icon-picker-tab-active" : ""}`}
          onClick={() => setTab("emoji")}
        >
          Emoji
        </button>
      </div>

      <input
        className="property-field-input"
        autoFocus
        placeholder="Search icons"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* Clearing is here rather than in the menu that opened this, because
          "no icon" is one of the answers to "which icon", and going back out
          to find it somewhere else is the same errand done twice. */}
      {value && (
        <button type="button" className="icon-picker-clear" onClick={() => onPick(undefined)}>
          <X size={12} /> No icon
        </button>
      )}

      <div className="icon-picker-scroll">
        {groups.length === 0 && <p className="icon-picker-empty">Nothing matches.</p>}

        {tab === "glyphs"
          ? glyphGroups.map((group) => (
              <div key={group.name}>
                <div className="ui-eyebrow icon-picker-heading">{group.name}</div>
                <div className="icon-picker-grid">
                  {group.glyphs.map((glyph) => {
                    const Glyph = glyph.icon;
                    return (
                      <button
                        key={glyph.name}
                        type="button"
                        className={`icon-picker-option${value === glyph.name ? " icon-picker-option-active" : ""}`}
                        title={glyph.name}
                        aria-label={glyph.name}
                        aria-pressed={value === glyph.name}
                        onClick={() => onPick(glyph.name)}
                      >
                        <Glyph size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          : emojiGroups.map((group) => (
              <div key={group.name}>
                <div className="ui-eyebrow icon-picker-heading">{group.name}</div>
                <div className="icon-picker-grid">
                  {group.emoji.map((entry) => (
                    <button
                      key={entry.char}
                      type="button"
                      className={`icon-picker-option icon-picker-emoji${
                        value === entry.char ? " icon-picker-option-active" : ""
                      }`}
                      title={entry.keywords.split(" ")[0]}
                      aria-label={entry.keywords.split(" ")[0]}
                      aria-pressed={value === entry.char}
                      onClick={() => onPick(entry.char)}
                    >
                      {entry.char}
                    </button>
                  ))}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

/**
 * Draws a stored icon, whatever kind it turned out to be.
 *
 * The fallback is the point: an emoji isn't in the glyph registry and never
 * will be, so "not a glyph" means "draw it as text" rather than "draw
 * nothing". A glyph name that later leaves the catalogue lands here too, and
 * shows its own name instead of vanishing.
 */
export function MeterIcon({ icon, size = 15 }: { icon: string | undefined; size?: number }) {
  if (!icon) return null;
  const Glyph = getGlyph(icon);
  // eslint-disable-next-line react-hooks/static-components -- getGlyph reads a fixed lookup table, so a given name returns the same stable component reference every render
  if (Glyph) return <Glyph size={size} />;
  return (
    <span className="icon-as-text" style={{ fontSize: size }}>
      {icon}
    </span>
  );
}
