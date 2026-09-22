// Settings → Writing. How the editor behaves while she is writing in it, as
// opposed to what it looks like (that is Theme and Fonts).
//
// Its own section rather than rows bolted onto Sidebar or Fonts because
// neither of those is about the editor, and a setting filed somewhere it does
// not belong is a setting nobody finds twice.
import { useFormattingBar, useLinkMarks, usePlainCopy, usePreferenceActions } from "../../hooks/use-preferences";
import {
  FORMATTING_BAR_MODES,
  PLAIN_COPY_MODES,
  type FormattingBarMode,
  type PlainCopyMode,
} from "../../services/preferences-service";

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

const COPY_LABELS: Record<PlainCopyMode, { label: string; hint: string }> = {
  text: {
    label: "Plain Text",
    hint: "The words as they read, and nothing around them. Bold and headings go — they were never characters you typed.",
  },
  markdown: {
    label: "Markdown",
    hint: "The formatting written out as marks: ** around bold, # before a heading. What Discord and most bot tools read.",
  },
};

export function WritingSettings() {
  const formattingBar = useFormattingBar();
  const linkMarks = useLinkMarks();
  const plainCopy = usePlainCopy();
  const { setFormattingBar, setLinkMarks, setPlainCopy } = usePreferenceActions();

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

      {/* Radios rather than a switch because neither one is the off state:
          both are a whole answer, and a checkbox would have to pick which of
          them gets to be "on". */}
      <fieldset className="sidebar-setting" data-setting="plain-copy">
        <legend className="sidebar-setting-label">What Ctrl+C copies</legend>
        <p className="sidebar-setting-blurb">
          Only for pasting somewhere that can hold nothing but characters — a lorebook field, a character card, a chat
          box. Word, Google Docs and another page here take the formatting either way. The other one is a button on the
          formatting bar.
        </p>
        {PLAIN_COPY_MODES.map((mode) => (
          <label key={mode} className="sidebar-setting-option">
            <input
              type="radio"
              name="plain-copy"
              value={mode}
              checked={plainCopy === mode}
              onChange={() => setPlainCopy(mode)}
            />
            <span className="sidebar-setting-option-text">
              <span className="sidebar-setting-option-label">{COPY_LABELS[mode].label}</span>
              <span className="sidebar-setting-option-hint">{COPY_LABELS[mode].hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
