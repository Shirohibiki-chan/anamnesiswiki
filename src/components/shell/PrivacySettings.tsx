// Settings → Privacy. Nothing to switch, which is the point.
//
// A tab of its own rather than a line in a README nobody opens. "It collects
// nothing" is only worth saying where somebody would go looking to turn
// something off — anyone who arrives here suspicious should be able to read
// the page and leave satisfied.
//
// **Usage reporting was built and then removed, 2026-08-27.** It was hers to
// ask for and hers to drop: with a handful of users the numbers would have
// said less than asking them would, and the app is easier to hand to somebody
// when the answer to "what does it send" is nothing at all. See
// `docs/plan.md` → Phase 29.
//
// **If anything in the app ever sends something, it gets said here**, in this
// file, before it ships. That is what makes this page worth having.
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { describeCrash, getCrashes, MAX_CRASHES, type CrashRecord } from "../../services/crash-log-service";

export function PrivacySettings() {
  return (
    <div className="appearance-settings">
      <section className="sidebar-setting" data-setting="privacy-collected">
        <h3 className="sidebar-setting-label">What Anamnesis collects</h3>
        <p className="sidebar-setting-blurb">
          Nothing. There's no account and no sign-in, and nothing reports back on how you use the app — not which
          features you open, not how often, not from where. There's no switch on this page because there's nothing
          running to turn off.
        </p>
        <p className="sidebar-setting-blurb">
          Your worlds are ordinary folders of files on your own disk. You can open them, copy them, back them up or
          walk away with them, and none of that needs Anamnesis's permission.
        </p>
      </section>

      <section className="sidebar-setting" data-setting="privacy-network">
        <h3 className="sidebar-setting-label">When it uses the internet</h3>
        <p className="sidebar-setting-blurb">Twice, and both times because you pressed something:</p>
        <ul className="sidebar-setting-list">
          <li>
            Fetching the pictures in a world you're importing from a <code>.lk</code> file.
          </li>
          <li>Checking whether a newer version exists, when you press Check for updates.</li>
        </ul>
        <p className="sidebar-setting-blurb">
          That's the whole list. Nothing happens on a timer, nothing happens in the background, and the app works the
          same with the internet switched off.
        </p>
      </section>

      <CrashLogSetting />
    </div>
  );
}

/**
 * Where the crash log is explained, and the only place it can be got at when
 * the panel never appeared.
 *
 * **Most crashes never show a panel.** A rejected promise or a throw from a
 * timer is written down and otherwise ignored, because blanking the window
 * over something the app carried on through would be worse than the bug. This
 * is how those become findable — otherwise they are a file nobody knows about.
 */
function CrashLogSetting() {
  const [crashes, setCrashes] = useState<CrashRecord[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    void getCrashes().then((found) => {
      if (live) setCrashes(found);
    });
    return () => {
      live = false;
    };
  }, []);

  const latest = crashes?.[0] ?? null;

  async function copyLatest() {
    if (!latest) return;
    try {
      await navigator.clipboard.writeText(describeCrash(latest));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Nothing to say about it. The file is on disk either way.
    }
  }

  return (
    <section className="sidebar-setting" data-setting="privacy-crash-log">
      <h3 className="sidebar-setting-label">If something goes wrong</h3>
      <p className="sidebar-setting-blurb">
        When Anamnesis hits a problem it can't carry on from, it writes down what happened — the error, the version
        and which operating system — in a file called <code>crash-log.json</code>, kept alongside your settings. The
        last {MAX_CRASHES} are held and older ones drop off.
      </p>
      <p className="sidebar-setting-blurb">
        <strong>That file stays where it is.</strong> Nothing about a crash is sent anywhere, and there's no switch
        for it because there's nothing to switch off. If you'd like one looked at, copying it and sending it on is
        yours to decide.
      </p>
      {crashes !== null && (
        <p className="sidebar-setting-blurb">
          {latest ? `Most recent: ${new Date(latest.at).toLocaleString()}.` : "Nothing has been recorded."}
        </p>
      )}
      {latest && (
        <button type="button" className="ui-btn" onClick={() => void copyLatest()}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy the last one"}
        </button>
      )}
    </section>
  );
}
