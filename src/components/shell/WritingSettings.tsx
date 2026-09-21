// Settings → Writing. How the editor behaves while she is writing in it, as
// opposed to what it looks like (that is Theme and Fonts).
//
// One setting so far. Its own section rather than a row bolted onto Sidebar or
// Fonts because neither of those is about the editor, and a setting filed
// somewhere it does not belong is a setting nobody finds twice.
import { useFormattingBar, useLinkMarks, usePreferenceActions } from "../../hooks/use-preferences";
import { FORMATTING_BAR_MODES, type FormattingBarMode } from "../../services/preferences-service";

const BAR_LABELS: Record<FormattingBarMode, { label: string; hint: string }> = {
  floating: {
    label: "Appears When You Select Something",
    hint: "It shows up over the text you've selected and goes away again. Out of the way while you're writing.",
  },
  fixed: {
    label: "Stays at the Top of the Page",
    hint: "Always there, above what you're writing, whether anything is selected or not. The buttons still act on whatever you've selected.",
  },
};

export function WritingSettings() {
  const formattingBar = useFormattingBar();
  const linkMarks = useLinkMarks();
  const { setFormattingBar, setLinkMarks } = usePreferenceActions();

  return (
    <div className="appearance-settings">
      <fieldset className="sidebar-setting" data-setting="formatting-bar">
        <legend className="sidebar-setting-label">The formatting bar</legend>
        <p className="sidebar-setting-blurb">
          The strip with bold, italic and the rest. Whichever of these is on, the buttons do the same thing — this is
          only about where the strip lives.
        </p>
        {FORMATTING_BAR_MODES.map((mode) => (
          <label key={mode} className="sidebar-setting-option">
            <input
              type="radio"
              name="formatting-bar"
              value={mode}
              checked={formattingBar === mode}
              onChange={() => setFormattingBar(mode)}
            />
            <span className="sidebar-setting-option-text">
              <span className="sidebar-setting-option-label">{BAR_LABELS[mode].label}</span>
              <span className="sidebar-setting-option-hint">{BAR_LABELS[mode].hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {/* A single switch rather than a pair of radios, since it is on or off
          and there is no third way to have it. Same box the fonts toggle uses. */}
      <fieldset className="sidebar-setting" data-setting="link-marks">
        <legend className="sidebar-setting-label">Names that could be links</legend>
        <p className="sidebar-setting-blurb">
          A dotted line under a word in your writing that is the name of another page. It changes nothing on its own —
          <em>/Link page names</em> is what turns them into links — and it is the same list that command would offer.
        </p>
        <label className="sidebar-setting-option">
          <input type="checkbox" checked={linkMarks} onChange={(event) => setLinkMarks(event.target.checked)} />
          <span className="sidebar-setting-option-text">
            <span className="sidebar-setting-option-label">Mark them while I write</span>
          </span>
        </label>
      </fieldset>
    </div>
  );
}
