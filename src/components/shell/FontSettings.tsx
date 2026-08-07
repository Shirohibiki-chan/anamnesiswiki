// Settings → Fonts and text. Four typeface slots and two size sliders.
//
// They share a panel because they're one question asked twice — what the words
// look like — and because neither is long enough to be a screen on its own.
import { CONTENT_SCALE_MAX, CONTENT_SCALE_MIN, TEXT_SCALE_MAX, TEXT_SCALE_MIN, TEXT_SCALE_STEP, type FontSlot } from "../../constants/themes";
import { fontChoicesFor, useTheme } from "../../hooks/use-theme";

function FontPicker({ slot }: { slot: FontSlot }) {
  const { fonts, setFont, stackFor, themeFontFor } = useTheme();
  const chosen = fonts[slot.key] ?? "";
  const stack = stackFor(slot.key);
  // Naming it matters: "whatever the theme uses" is true but useless — the
  // themes use different faces and there was no way to find out which without
  // reading down a list of 98 trying to spot the one already on screen.
  //
  // A theme that names no face isn't a gap: `--font-mono` hands the choice to
  // the OS on purpose, so that slot gets said out loud too, differently.
  const themeFont = themeFontFor(slot.key);
  const leaveItLabel = themeFont.family
    ? `Whatever the theme uses — ${themeFont.family}`
    : themeFont.stack
      ? "Whatever the theme uses — your system's own"
      : "Whatever the theme uses";

  return (
    <div className="appearance-font">
      <label className="appearance-font-label" htmlFor={`font-${slot.key}`}>
        {slot.label}
        <span className="appearance-font-hint">{slot.hint}</span>
      </label>

      <select
        id={`font-${slot.key}`}
        className="appearance-select"
        value={chosen}
        onChange={(event) => void setFont(slot.key, event.target.value || null)}
      >
        {/* Empty value, not a sentinel family name — an unset slot has to mean
            "whatever the theme says", so switching theme still changes it. The
            label names the face; the value stays empty. */}
        <option value="">{leaveItLabel}</option>
        {fontChoicesFor(slot).map((group) => (
          <optgroup key={group.cat} label={group.label}>
            {group.fonts.map((font) => (
              // Each name written in its own face, so the list can be browsed
              // by looking rather than by picking one at a time and undoing.
              <option key={font.family} value={font.family} style={{ fontFamily: `"${font.family}"` }}>
                {font.family}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <p className="appearance-specimen" style={stack ? { fontFamily: stack } : undefined}>
        {slot.specimen}
      </p>
    </div>
  );
}

function ScaleSlider({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => Promise<void>;
}) {
  return (
    <div className="appearance-font">
      <span className="appearance-font-label">
        {label}
        <span className="appearance-font-hint">{hint}</span>
      </span>
      <div className="appearance-scale">
        <input
          type="range"
          className="appearance-range"
          min={min}
          max={max}
          step={TEXT_SCALE_STEP}
          value={value}
          aria-label={`${label} text size`}
          onChange={(event) => void onChange(Number(event.target.value))}
        />
        <span className="appearance-scale-value">{Math.round(value * 100)}%</span>
      </div>
    </div>
  );
}

export function FontSettings() {
  const { textScale, contentScale, slots, setTextScale, setContentScale } = useTheme();

  return (
    <div className="appearance-settings">
      <section className="appearance-section">
        <p className="ui-eyebrow">Typefaces</p>
        <div className="appearance-grid">
          {slots.map((slot) => (
            <FontPicker key={slot.key} slot={slot} />
          ))}
        </div>
        <p className="appearance-note">
          These stay put when you change theme, so a face you like survives trying something else. A theme can set its own — leave a
          slot on <em>whatever the theme uses</em> and it will.
        </p>
      </section>

      <section className="appearance-section">
        <p className="ui-eyebrow">Size</p>

        {/* Two, because they answer different questions — the app's labels want
            to be as small as you can still read them and the text you write in
            wants to be comfortable, and those aren't the same number. */}
        <div className="appearance-grid">
          <ScaleSlider
            label="Writing"
            hint="the text on your pages"
            value={contentScale}
            min={CONTENT_SCALE_MIN}
            max={CONTENT_SCALE_MAX}
            onChange={setContentScale}
          />
          <ScaleSlider
            label="Interface"
            hint="menus, titles, labels — everything else"
            value={textScale}
            min={TEXT_SCALE_MIN}
            max={TEXT_SCALE_MAX}
            onChange={setTextScale}
          />
        </div>

        <p className="appearance-note">Text only — the panels and spacing stay where they are.</p>
      </section>
    </div>
  );
}
