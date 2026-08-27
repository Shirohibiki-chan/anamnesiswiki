// Settings → Privacy. The crash log, and deliberately nothing else.
//
// **It said more than this for a few hours on 2026-08-27, and the extra was
// removed the same day.** There was a section declaring that the app collects
// nothing and a section listing the two times it reaches the network. Both
// were true, both read well, and both were commitments — and neither of the
// things they promised is settled. Usage reporting could come back if the app
// finds an audience worth measuring, and what it fetches will change as
// features land. A page that has to be walked back is worse than a page that
// never made the claim, so the claims are gone rather than hedged.
//
// **The crash log stays, because it is a description rather than a promise.**
// It says where a file is written and what goes in it, which is something
// somebody needs in order to find it and send it on. If that ever changes,
// this section changes with it, and nothing has to be retracted.
//
// The rule the removed sections were trying to serve still holds and lives in
// `CLAUDE.md` → Two Promises: nothing about her or her worlds is sent anywhere
// she did not ask for. That is a constraint on what gets built. It was never a
// reason to advertise.
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { describeCrash, getCrashes, MAX_CRASHES, type CrashRecord } from "../../services/crash-log-service";

export function PrivacySettings() {
  return (
    <div className="appearance-settings">
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
        <strong>That file stays on your computer.</strong> Nothing about a crash is sent anywhere on its own. If
        you'd like one looked at, copying it and sending it on is yours to decide.
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
