// The Keyboard section of Settings — every app-level shortcut, what it's
// currently bound to, and a way to change it.
//
// Built as an accessibility feature rather than a power-user one, which is
// what settles the arguments in here: the whole screen has to be operable
// without a mouse, a refused key has to say *why* out loud rather than just
// not taking, and a single function key is a legal binding even though a
// modifier is normally required. See checkBindingShape in
// services/shortcut-service.ts for that last one.
import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useShortcutSettings } from "../../hooks/use-shortcuts";
import type { ShortcutAction } from "../../constants/shortcuts";

// Every change here is a write to app-settings.json, and a write can fail. The
// store leaves the old binding in place when it does, so the screen has to say
// so — otherwise the row goes on showing a key that never took. This app has
// been bitten once by a silent failed write already (docs/handoff.md
// §Storage); it isn't doing it again on a smaller scale.
const SAVE_FAILED_MESSAGE = "Couldn't save that — your shortcuts are unchanged.";

export function ShortcutSettings() {
  const { rows, hasAnyOverride, modifierName, readBinding, checkBinding, setBinding, resetBinding, resetAll, setRecording } =
    useShortcutSettings();
  const [recordingAction, setRecordingAction] = useState<ShortcutAction | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!recordingAction) return;
    // Bound to a local so the handler below reads as non-null. TypeScript
    // won't carry the guard above into a function that could be called later.
    const action = recordingAction;
    setRecording(true);

    // Capture phase, so the keypress is claimed before anything else in the
    // app can act on it — including the modal's own Escape-to-close, which is
    // why Escape cancels recording here instead of shutting Settings.
    function handleKeyDown(event: KeyboardEvent) {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        setRecordingAction(null);
        setProblem(null);
        return;
      }

      // Null while the user is still only holding modifiers down, which is how
      // a chord is actually typed — wait for the real key.
      const binding = readBinding(event);
      if (!binding) return;

      // Stay in recording mode on a refusal. The alternative is dropping the
      // user out and making them click Change again to try a second key,
      // which is a worse deal the harder key presses are for you.
      const nextProblem = checkBinding(action, binding);
      if (nextProblem) {
        setProblem(nextProblem.message);
        return;
      }

      setBinding(action, binding).catch(() => setProblem(SAVE_FAILED_MESSAGE));
      setRecordingAction(null);
      setProblem(null);
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      setRecording(false);
    };
  }, [recordingAction, readBinding, checkBinding, setBinding, setRecording]);

  function startRecording(action: ShortcutAction) {
    setProblem(null);
    setRecordingAction(action);
  }

  return (
    <div className="shortcut-settings">
      <ul className="shortcut-list">
        {rows.map((row) => {
          const isRecording = recordingAction === row.action;
          return (
            <li key={row.action} className="shortcut-row">
              <span className="shortcut-row-label">{row.label}</span>
              <button
                type="button"
                className={`shortcut-row-keys${isRecording ? " shortcut-row-keys-recording" : ""}`}
                aria-label={
                  isRecording ? `Press the keys for ${row.label}, or Escape to cancel` : `Change the shortcut for ${row.label}, currently ${row.keys}`
                }
                onClick={() => (isRecording ? setRecordingAction(null) : startRecording(row.action))}
              >
                {isRecording ? <span className="shortcut-recording-text">Press keys…</span> : <kbd>{row.keys}</kbd>}
              </button>
              <button
                type="button"
                className="ui-icon-btn"
                aria-label={`Reset ${row.label} to its default`}
                // Kept mounted and greyed rather than removed when there's
                // nothing to reset, so the row doesn't reflow the moment a
                // shortcut is changed. (Disabled buttons are skipped by Tab
                // either way — this is about the layout holding still.)
                disabled={row.isDefault}
                onClick={() => resetBinding(row.action).catch(() => setProblem(SAVE_FAILED_MESSAGE))}
              >
                <RotateCcw size={13} />
              </button>
            </li>
          );
        })}
      </ul>

      {/* Announced as well as shown — the refusal is the only feedback there
          is when a key press doesn't take, and it can't be mouse-only. */}
      <p className="shortcut-message" role="status" aria-live="polite">
        {problem ?? (recordingAction ? "Press the keys you want, or Escape to cancel." : "")}
      </p>

      <p className="shortcut-hint">
        Shortcuts need {modifierName} held down, or a function key (F1–F12) on its own. Combinations the editor uses
        while you're writing can't be taken.
      </p>

      {hasAnyOverride && (
        <button type="button" className="ui-link shortcut-reset-all" onClick={() => resetAll().catch(() => setProblem(SAVE_FAILED_MESSAGE))}>
          Reset all to defaults
        </button>
      )}
    </div>
  );
}
