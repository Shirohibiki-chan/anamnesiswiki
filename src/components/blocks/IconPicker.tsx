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
import { RotateCcw, X } from "lucide-react";
import { searchEmoji } from "../../constants/emoji";
import { getGlyph, restOfCatalogue, searchCatalogue, searchGlyphs } from "../../constants/glyphs";
import { getTemplateIcon } from "../../constants/icons";
import { useIconActions, useRecentIcons } from "../../hooks/use-preferences";

/**
 * How much of the fifteen-hundred-icon catalogue is drawn at once.
 *
 * All of it is reachable — searching covers every name — but a grid holding
 * every icon is several thousand SVGs in one popover, which is slow to open
 * and slow to scroll. So the rest arrives a screenful at a time.
 */
const CATALOGUE_PAGE = 240;

type IconPickerProps = {
  /** The icon currently chosen, so it can be shown as picked and cleared. */
  value: string | undefined;
  onPick: (icon: string | undefined) => void;
  /**
   * A second answer beside "No icon", for a control whose blank state means
   * something rather than nothing.
   *
   * **A callout is the case this exists for** (Phase 19.5): its blank state is
   * the icon its colour implies, so "no icon" and "back to the usual one" are
   * two different answers and one clear button can only give one of them.
   * Everywhere else starts from nothing and leaves this out.
   */
  defaultAction?: { label: string; onPick: () => void };
};

export function IconPicker({ value, onPick, defaultAction }: IconPickerProps) {
  const recent = useRecentIcons();
  const { rememberIcon } = useIconActions();
  const [tab, setTab] = useState<"glyphs" | "emoji">("glyphs");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(CATALOGUE_PAGE);

  /**
   * **Searching crosses the tabs; browsing does not.**
   *
   * The tabs are how you *browse* two different kinds of thing, and they were
   * how you searched them too — which meant typing `joy` on the Glyphs tab
   * said "Nothing matches" while the emoji sat one click away, unmentioned.
   * With the picker now opening on a typed `:`, that is the first thing
   * anybody does: the colon is the key every chat app uses to reach an emoji,
   * so arriving on the Glyphs tab and typing an emoji's name is the normal
   * case rather than a mistake.
   *
   * So a query shows everything that matches it, glyphs first and emoji under
   * them, whichever tab is selected. Clear the box and you are back to
   * browsing the tab you are on.
   */
  /**
   * The query with its colons taken out, which is the one both searches see.
   *
   * **A colon is punctuation from the trigger, not something being searched
   * for.** The picker opens on a typed `:` and that character lands in this
   * box, so a box holding `:` is an empty search and has to behave like one —
   * otherwise every open counts as a search, and a search draws all 1870
   * emoji whether or not anyone asked for them. Measured 2026-09-01: that put
   * three quarters of a second on opening the picker anywhere in the app.
   */
  const trimmed = query.split(":").join("").trim();
  const searching = trimmed.length > 0;
  const glyphGroups = searchGlyphs(trimmed);
  const emojiGroups = searchEmoji(trimmed);
  const showGlyphs = searching || tab === "glyphs";
  const showEmoji = searching || tab === "emoji";
  // Searching looks through everything Lucide ships; browsing shows the
  // curated groups first and then the rest of the catalogue underneath.
  const rest = searching ? searchCatalogue(trimmed) : restOfCatalogue();
  const restShown = rest.slice(0, shown);

  /**
   * Every pick goes through here, which is what keeps the Recent row honest.
   *
   * **Remembered wherever it was picked from** — the row itself included, so
   * choosing the same icon twice keeps it at the front rather than letting it
   * drift down the row. Clearing is not a pick and is not remembered: "no
   * icon" is not an icon to offer again.
   */
  function pick(icon: string | undefined) {
    if (icon) rememberIcon(icon);
    onPick(icon);
  }

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
        onChange={(e) => {
          setQuery(e.target.value);
          setShown(CATALOGUE_PAGE);
        }}
      />

      {/* Clearing is here rather than in the menu that opened this, because
          "no icon" is one of the answers to "which icon", and going back out
          to find it somewhere else is the same errand done twice. */}
      {(value || defaultAction) && (
        <div className="icon-picker-clears">
          <button type="button" className="icon-picker-clear" onClick={() => onPick(undefined)}>
            <X size={12} /> No icon
          </button>
          {defaultAction && (
            <button type="button" className="icon-picker-clear" onClick={defaultAction.onPick}>
              <RotateCcw size={12} /> {defaultAction.label}
            </button>
          )}
        </div>
      )}

      {/* **Across the top, and only while browsing.** The reference keeps the
          last few you chose there, and the reason it earns the room is that a
          world uses the same dozen icons over and over — a second sword is two
          clicks rather than a search. It goes away while searching, where the
          question is what matches rather than what you used last. */}
      {!searching && recent.length > 0 && (
        <div className="icon-picker-recent">
          <div className="ui-eyebrow icon-picker-heading">Recent</div>
          <div className="icon-picker-grid">
            {recent.map((icon) => (
              <button
                key={icon}
                type="button"
                className={`icon-picker-option${icon === value ? " icon-picker-option-active" : ""}`}
                title={icon}
                aria-label={icon}
                aria-pressed={icon === value}
                onClick={() => pick(icon)}
              >
                <MeterIcon icon={icon} size={16} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="icon-picker-scroll">
        {glyphGroups.length === 0 && emojiGroups.length === 0 && rest.length === 0 && (
          <p className="icon-picker-empty">Nothing matches.</p>
        )}

        {showGlyphs &&
          glyphGroups.map((group) => (
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
                        onClick={() => pick(glyph.name)}
                      >
                        <Glyph size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

        {showEmoji &&
          emojiGroups.map((group) => (
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
                      onClick={() => pick(entry.char)}
                    >
                      {entry.char}
                    </button>
                  ))}
                </div>
              </div>
            ))}

        {/* Everything else Lucide ships. Held below the suggestions so the
            useful ones are still the first thing in the box, and revealed a
            screenful at a time so opening the picker stays instant. */}
        {showGlyphs && rest.length > 0 && (
          <div>
            <div className="ui-eyebrow icon-picker-heading">
              {searching ? "Everything else" : "All icons"}
            </div>
            <div className="icon-picker-grid">
              {restShown.map((glyph) => {
                const Glyph = glyph.icon;
                return (
                  <button
                    key={glyph.name}
                    type="button"
                    className={`icon-picker-option${value === glyph.name ? " icon-picker-option-active" : ""}`}
                    title={glyph.name}
                    aria-label={glyph.name}
                    aria-pressed={value === glyph.name}
                    onClick={() => pick(glyph.name)}
                  >
                    <Glyph size={16} />
                  </button>
                );
              })}
            </div>
            {rest.length > restShown.length && (
              <button
                type="button"
                className="icon-picker-more"
                onClick={() => setShown((count) => count + CATALOGUE_PAGE)}
              >
                Show more — {restShown.length} of {rest.length}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A page's icon: the one it was given, or its template's.
 *
 * Every place that draws a node — the tree, the page title, a folder's empty
 * state, a reference chip — goes through here, so "this page has its own
 * icon" is one rule rather than one per component.
 */
export function NodeIcon({
  icon,
  templateKey,
  size = 14,
  className,
  style,
}: {
  icon: string | undefined;
  templateKey: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (icon) {
    return (
      <span
        className={className}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, fontSize: size - 1, lineHeight: 1, ...style }}
      >
        <MeterIcon icon={icon} size={size} />
      </span>
    );
  }
  const Template = getTemplateIcon(templateKey);
  // eslint-disable-next-line react-hooks/static-components -- getTemplateIcon reads a fixed lookup table, so a given templateKey returns the same stable component reference every render
  return <Template size={size} className={className} style={style} />;
}

/**
 * Draws a stored icon, whatever kind it turned out to be.
 *
 * Named for the meter it was written for and used well beyond one now — a
 * page's icon resolves through here too.
 *
 * The fallback is the point: an emoji isn't in the glyph registry and never
 * will be, so "not a glyph" means "draw it as text" rather than "draw
 * nothing". A glyph name that later leaves the catalogue lands here too, and
 * shows its own name instead of vanishing.
 */
export function MeterIcon({
  icon,
  size = 15,
  filled = false,
}: {
  icon: string | undefined;
  size?: number;
  /** Drawn solid — what a counted pip looks like when it is one of the ones you have. */
  filled?: boolean;
}) {
  if (!icon) return null;
  const Glyph = getGlyph(icon);
  // eslint-disable-next-line react-hooks/static-components -- getGlyph reads a fixed lookup table, so a given name returns the same stable component reference every render
  if (Glyph) return <Glyph size={size} fill={filled ? "currentColor" : "none"} />;
  return (
    <span className="icon-as-text" style={{ fontSize: size }}>
      {icon}
    </span>
  );
}
