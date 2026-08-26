// Settings → Privacy. One switch, and a plain account of what it does.
//
// A section of its own rather than a line inside Updates, because this is
// where someone goes looking when they want to turn it off, and a switch
// filed under something else reads as one that was meant to be hard to find.
import { APTABASE_APP_KEY } from "../../constants/analytics";
import { apiUrlFor } from "../../services/analytics-service";
import { useAnalyticsEnabled, usePreferenceActions } from "../../hooks/use-preferences";

export function PrivacySettings() {
  const analytics = useAnalyticsEnabled();
  const { setAnalytics } = usePreferenceActions();
  // A build with no key cannot send anything whatever this switch says, and
  // the panel says so rather than showing a control that does nothing.
  const configured = apiUrlFor(APTABASE_APP_KEY) !== null;

  return (
    <div className="appearance-settings">
      <fieldset className="sidebar-setting" data-setting="analytics">
        <legend className="sidebar-setting-label">Usage reporting</legend>
        <p className="sidebar-setting-blurb">
          Anamnesis can report which of its features get used, so the time spent on it goes to the parts people
          actually open. It's off in a second if you'd rather it didn't.
        </p>
        <label className="sidebar-setting-option">
          <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
          <span className="sidebar-setting-option-text">
            <span className="sidebar-setting-option-label">Report which features I use</span>
            <span className="sidebar-setting-option-hint">
              {configured
                ? "Takes effect immediately. Nothing is stored up to be sent later, so turning it off stops it there and then."
                : "This build isn't set up to report anything, so nothing is being sent whatever this says. The switch is here so it's already where you left it if that changes."}
            </span>
          </span>
        </label>
      </fieldset>

      <section className="sidebar-setting" data-setting="analytics-what">
        <h3 className="sidebar-setting-label">What gets sent</h3>
        <p className="sidebar-setting-blurb">
          Which kind of thing happened, and nothing about what it was about.
        </p>
        <ul className="sidebar-setting-list">
          <li>That the app started, which version it is, and which operating system.</li>
          <li>That a world was opened — never which one, and never its name.</li>
          <li>That a page was made, and which template it used.</li>
          <li>That a block, an import, an export or an update was used.</li>
        </ul>
        <p className="sidebar-setting-blurb">
          <strong>Nothing you write ever goes in one.</strong> No page titles, no world names, no tags, no text from
          the editor, no file paths. Your worlds stay on your own disk exactly as they always have — this reports on
          the app, not on what you keep in it.
        </p>
      </section>
    </div>
  );
}
