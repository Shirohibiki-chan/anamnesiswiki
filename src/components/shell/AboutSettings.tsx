// Settings → About: which version this is, what it is built with, and under
// what terms — the other half of a Phase 12 bullet whose first half became
// Patch Notes. Small and self-contained; everything it shows is a constant
// (constants/about.ts) or the version the shell reports.
//
// Every name is a button that opens the page in the system browser, the way
// "Read this on GitHub" does in Patch Notes. Nothing is fetched to draw this.
import {
  APP_COPYRIGHT,
  APP_LICENCE,
  CREDITS,
  DEFAULT_FACES,
  FONT_LICENCE_NOTE,
  GOOGLE_FONTS_URL,
} from "../../constants/about";
import { FONT_LIBRARY } from "../../constants/font-library";
import { LICENCE_URL, REPO_URL } from "../../constants/links";
import { useAbout } from "../../hooks/use-about";

export function AboutSettings() {
  const { version, openLink } = useAbout();

  return (
    <div className="about-settings">
      <p className="about-settings-name">
        Anamnesis
        {version && <span className="about-settings-version">{version}</span>}
      </p>
      <p className="about-settings-line">
        A worldbuilding wiki that lives on your own disk. Your worlds are ordinary files in a folder you chose, and
        nothing about them is sent anywhere.
      </p>
      <p className="about-settings-line">
        Free and open source under the {APP_LICENCE} licence, {APP_COPYRIGHT}.{" "}
        <button type="button" className="ui-link" onClick={() => openLink(LICENCE_URL)}>
          Read the Licence
        </button>{" "}
        <button type="button" className="ui-link" onClick={() => openLink(REPO_URL)}>
          Source Code on GitHub
        </button>
      </p>

      <h3 className="ui-eyebrow about-settings-heading">Built With</h3>
      <ul className="about-settings-credits">
        {CREDITS.map((credit) => (
          <li key={credit.name} className="about-settings-credit">
            <button type="button" className="ui-link about-settings-credit-name" onClick={() => openLink(credit.url)}>
              {credit.name}
            </button>
            <span className="about-settings-credit-role">{credit.role}</span>
            <span className="about-settings-credit-licence">{credit.licence}</span>
          </li>
        ))}
      </ul>

      <h3 className="ui-eyebrow about-settings-heading">Fonts</h3>
      <p className="about-settings-line">
        The app is set in {DEFAULT_FACES[0]}, {DEFAULT_FACES[1]} and {DEFAULT_FACES[2]} until you pick otherwise, and
        ships a library of {FONT_LIBRARY.length} more. All of them are open typefaces under the {FONT_LICENCE_NOTE},
        bundled with the app so nothing is fetched to draw a page.{" "}
        <button type="button" className="ui-link" onClick={() => openLink(GOOGLE_FONTS_URL)}>
          Each Family&rsquo;s Licence
        </button>
      </p>
    </div>
  );
}
