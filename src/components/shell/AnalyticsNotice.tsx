// Shown once, before anything is ever reported.
//
// **This is what makes on-by-default honest.** The switch starts on because
// analytics that starts off measures nothing and would not be worth building —
// but "on by default" and "without telling anyone" are different things, and
// only the second one is a problem. So `use-analytics` sends nothing at all
// until this has been answered, on a fresh install and on an existing one
// alike.
//
// Two buttons, both of which are an answer. There is no way to dismiss this
// without saying which, because a modal that can be clicked past leaves the
// person who clicked past it being counted by something they never read.
import { createPortal } from "react-dom";
import { APTABASE_APP_KEY } from "../../constants/analytics";
import { apiUrlFor } from "../../services/analytics-service";
import { useAnalyticsNoticeSeen, usePreferenceActions } from "../../hooks/use-preferences";

export function AnalyticsNotice() {
  const seen = useAnalyticsNoticeSeen();
  const { setAnalytics, markAnalyticsNoticeSeen } = usePreferenceActions();

  if (seen) return null;
  // **A build with no key never asks.** Without one nothing can be sent, and a
  // modal seeking agreement to something that is not happening is worse than
  // no modal: it teaches people the app asks for things it does not do, and it
  // would burn the one-time notice on a build that had nothing to report. That
  // covers every contributor's clone, and every build made before the account
  // existed. Settings → Privacy still says where the switch is.
  if (!apiUrlFor(APTABASE_APP_KEY)) return null;

  function answer(enabled: boolean) {
    setAnalytics(enabled);
    markAnalyticsNoticeSeen();
  }

  return createPortal(
    <div className="ui-backdrop">
      <div className="ui-modal ui-modal-sm confirm-dialog" onClick={(event) => event.stopPropagation()}>
        <h2 className="confirm-dialog-title">A quick note about usage reporting</h2>
        <p className="confirm-dialog-message">
          Anamnesis reports which of its features get used — that a page was made, that an import ran, which version
          and operating system it's running on. It's how the time spent on the app goes to the parts people actually
          open.
        </p>
        <p className="confirm-dialog-message">
          <strong>Nothing you write is ever included.</strong> No page titles, no world names, no text from the
          editor, no file paths. Your worlds stay on your own disk, exactly as they always have.
        </p>
        <p className="confirm-dialog-message">
          You can change your mind whenever you like, in Settings → Privacy.
        </p>
        <div className="confirm-dialog-actions">
          <button type="button" className="ui-btn" onClick={() => answer(false)}>
            No thanks
          </button>
          <button type="button" className="ui-btn ui-btn-primary" onClick={() => answer(true)} autoFocus>
            That's fine
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
