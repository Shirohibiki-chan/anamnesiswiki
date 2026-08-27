// What replaces the white window when the app falls over.
//
// **The window going blank is the worst failure this app has**, worse than the
// bug behind it: nothing on screen says whether the work was saved, whether
// the world is damaged, or whether closing it will make things worse. Every
// choice here answers one of those before it says anything technical.
//
// The details are shown rather than hidden behind the copy button on purpose.
// Nothing about a crash is sent anywhere, so there is nothing to disclose and
// no reason to be coy — and somebody who can see the text can decide for
// themselves whether to pass it on.
import { AlertTriangle, Check, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { describeCrash, type CrashRecord } from "../../services/crash-log-service";

export function CrashScreen({ record, onRestart }: { record: CrashRecord; onRestart: () => void }) {
  const [copied, setCopied] = useState(false);
  const details = describeCrash(record);

  async function copy() {
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Denied or unavailable. The text is on screen and selectable, which is
      // why it is on screen — the button is the convenience, not the only way.
    }
  }

  return (
    <div className="crash-screen" role="alert">
      <div className="crash-screen-card">
        <AlertTriangle size={22} className="crash-screen-icon" />
        <h1 className="crash-screen-title">Anamnesis ran into a problem</h1>

        <p className="crash-screen-message">
          Something went wrong that the app couldn't carry on from, so it stopped here rather than keep going and
          risk making a mess of your work.
        </p>
        <p className="crash-screen-message">
          <strong>Your worlds are files on your own disk, and this didn't touch them.</strong> Everything saved is
          still saved. If you were typing when it happened, the last few seconds of that may not have been written
          yet — worth checking the page you were on once you're back in.
        </p>

        <div className="crash-screen-actions">
          <button type="button" className="ui-btn ui-btn-primary" onClick={onRestart}>
            <RefreshCw size={14} />
            Restart Anamnesis
          </button>
          <button type="button" className="ui-btn" onClick={() => void copy()}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy the details"}
          </button>
        </div>

        <details className="crash-screen-details">
          <summary className="crash-screen-summary">What went wrong</summary>
          <pre className="crash-screen-trace">{details}</pre>
        </details>

        <p className="crash-screen-footnote">
          This is written to a file on your computer and sent nowhere. If you'd like it looked at, the button above
          copies the same text you can read here, ready to paste. Settings → Privacy says where the file lives.
        </p>
      </div>
    </div>
  );
}
