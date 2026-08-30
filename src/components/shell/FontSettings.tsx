// Settings → Fonts and text. Four typeface slots and two size sliders.
//
// They share a panel because they're one question asked twice — what the words
// look like — and because neither is long enough to be a screen on its own.
//
// The switch at the top is the answer to these controls having quietly meant
// something different from the identical-looking ones in Colours. A colour has
// always belonged to a theme; a face used to belong to the app, outranking
// every theme, with nothing on screen saying so. Both are reasonable — a
// reading face is a readability preference, a title face is part of the look —
// so rather than pick one, the panel says which it's doing and lets her
// change it. Off is the default and the one that matches Colours.
import {
  CONTENT_SCALE_MAX,
  CONTENT_SCALE_MIN,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_SCALE_STEP,
  type FontSlot,
} from "../../constants/themes";
import { fontChoicesFor, useTheme } from "../../hooks/use-theme";
import { CreateTheme } from "./CreateTheme";
import { FontPicker } from "./FontPicker";

/**
 * A slot as it works when faces belong to the theme: the value comes out of
 * the theme's file and picking one writes it back there.
 */
function ThemeFontPicker({ slot }: { slot: FontSlot }) {
  const { setFont, stackFor, declaredFontFor, fallbackFontFor } = useTheme();
  const chosen = declaredFontFor(slot) ?? "";
  const stack = stackFor(slot.key);
  // The empty option is "this theme doesn't ask for a face", which is a real
  // state a theme file can be in — not a placeholder. Named where it can be:
  // while nothing is declared, what's on screen *is* the fallback, so it can
  // be pointed at. Once she picks one that's no longer knowable, and claiming
  // otherwise would be a guess printed as a fact.
  const fallback = fallbackFontFor(slot);
  const emptyLabel = chosen ? "The app's own" : fallback ? `The app's own — ${fallback}` : "The app's own — your system's";

  return (
    <FontSlotField slot={slot} chosen={chosen} stack={stack} emptyLabel={emptyLabel} onPick={(family) => void setFont(slot.key, family)} />
  );
}

/** The same slot in everywhere-mode: her choice, over the top of any theme. */
function EveryThemeFontPicker({ slot }: { slot: FontSlot }) {
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
  const emptyLabel = themeFont.family
    ? `Whatever the theme uses — ${themeFont.family}`
    : themeFont.stack
      ? "Whatever the theme uses — your system's own"
      : "Whatever the theme uses";

  return (
    <FontSlotField slot={slot} chosen={chosen} stack={stack} emptyLabel={emptyLabel} onPick={(family) => void setFont(slot.key, family)} />
  );
}

/**
 * The control itself, which is the same in both modes — a menu of every
 * bundled face and a specimen underneath. Only the value and the wording of
 * the empty option differ, so only those are passed in.
 */
function FontSlotField({
  slot,
  chosen,
  stack,
  emptyLabel,
  onPick,
}: {
  slot: FontSlot;
  chosen: string;
  stack: string | null;
  emptyLabel: string;
  onPick: (family: string | null) => void;
}) {
  // A face the file names that isn't one of ours — a hand-written stack, or a
  // font from a theme somebody else made. Offered as itself so the menu isn't
  // sitting on a blank while the page plainly shows something.
  const unlisted = chosen && !fontChoicesFor(slot).some((group) => group.fonts.some((font) => font.family === chosen)) ? chosen : null;

  return (
    // See ThemeEditor's ColorRow for what `data-setting` is — the id Settings
    // search scrolls to. A typeface slot's id is its token, both sides.
    <div className="appearance-font" data-setting={slot.token}>
      {/* Still a `<label htmlFor>` even though the control is a button now:
          the association is what makes clicking the word "Interface" open the
          menu, and what a screen reader reads out before it. */}
      <label className="appearance-font-label" htmlFor={`font-${slot.key}`}>
        {slot.label}
        <span className="appearance-font-hint">{slot.hint}</span>
      </label>

      <FontPicker slot={slot} chosen={chosen} emptyLabel={emptyLabel} unlisted={unlisted} onPick={onPick} />

      <p className="appearance-specimen" style={stack ? { fontFamily: stack } : undefined}>
        {slot.specimen}
      </p>
    </div>
  );
}

function ScaleSlider({
  label,
  hint,
  settingId,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  /** The settings-search entry this slider answers to. */
  settingId: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => Promise<void>;
}) {
  return (
    <div className="appearance-font" data-setting={settingId}>
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

/**
 * Which of the two models is in force.
 *
 * A switch rather than a pair of radios because there is a normal answer and a
 * deliberate exception, and radios present those as equals. The sentence
 * underneath changes with it: what this does is not guessable from the label
 * alone, and it's the thing that was invisible before.
 */
function EveryThemeSwitch() {
  const { fontsEveryTheme, setFontsEveryTheme, canEditThemeFonts, themeLabel } = useTheme();

  return (
    <div className="appearance-toggle">
      <label className="appearance-toggle-row">
        <input type="checkbox" checked={fontsEveryTheme} onChange={(event) => void setFontsEveryTheme(event.target.checked)} />
        <span className="appearance-toggle-label">Use one set of fonts in every theme</span>
      </label>
      <p className="appearance-note">
        {fontsEveryTheme ? (
          <>
            On — the faces below win over every theme, including ones that ask for their own. Turn it off and each theme goes back to
            its own, and these are remembered in case you want them again.
          </>
        ) : canEditThemeFonts ? (
          <>
            Off — a face belongs to the theme, the way its colours do. Picking one below changes <em>{themeLabel}</em> and nothing
            else, and switching theme switches the fonts with it.
          </>
        ) : (
          // No pickers under this sentence in this state, so it mustn't
          // describe any. What's below is the offer of a theme to put them on.
          <>Off — a face belongs to the theme, the way its colours do, and switching theme switches the fonts with it.</>
        )}
      </p>
    </div>
  );
}

export function FontSettings() {
  const { textScale, contentScale, slots, fontsEveryTheme, canEditThemeFonts, themeLabel, setTextScale, setContentScale } = useTheme();

  // Editing a theme's faces needs a theme with a file in it, exactly as
  // editing its colours does. The way out is the same one Colours offers, and
  // it's offered here rather than pointing at the other panel — being told
  // where the button is instead of being given it is the thing that made this
  // annoying in the first place.
  const canPick = fontsEveryTheme || canEditThemeFonts;

  return (
    <div className="appearance-settings">
      <section className="appearance-section">
        <p className="ui-eyebrow">Typefaces</p>

        <EveryThemeSwitch />

        {canPick ? (
          <>
            <div className="appearance-grid">
              {slots.map((slot) =>
                fontsEveryTheme ? <EveryThemeFontPicker key={slot.key} slot={slot} /> : <ThemeFontPicker key={slot.key} slot={slot} />,
              )}
            </div>
            <p className="appearance-note">
              {fontsEveryTheme ? (
                <>
                  Leave a slot on <em>whatever the theme uses</em> and that one still follows the theme — it's per slot, so a reading
                  face can stay put while the titles change with the theme.
                </>
              ) : (
                <>
                  These are written into the theme's own <code>.css</code> file, and the rest of it is left exactly as it is. Set a slot
                  back to <em>the app's own</em> and the line comes out again.
                </>
              )}
            </p>
          </>
        ) : (
          <CreateTheme
            note={
              <>
                <em>{themeLabel}</em> is one of the built-in themes, so its fonts ship with the app and can't be changed — same as its
                colours. Take a copy and you can set them on that. Or switch the above on, and your fonts will override every theme,
                built-in ones included.
              </>
            }
          />
        )}
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
            settingId="text-size-writing"
            value={contentScale}
            min={CONTENT_SCALE_MIN}
            max={CONTENT_SCALE_MAX}
            onChange={setContentScale}
          />
          <ScaleSlider
            label="Interface"
            hint="menus, titles, labels — everything else"
            settingId="text-size-interface"
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
