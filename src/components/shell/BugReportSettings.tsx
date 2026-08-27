// Settings → Report a bug. Where something that went wrong turns into a
// message somebody can act on.
//
// **This was the Privacy tab until 2026-08-27**, and by then it held one
// section: the crash log. The two claims it used to make were removed the same
// day for being commitments nothing had settled (see the PR that trimmed it),
// which left a tab named for a subject it no longer covered, sitting one place
// away from the thing the crash log exists for. So the tab is named after what
// it is for now, and the report path lives above the log it attaches.
//
// **The app fills the form in and never submits it.** The details are on
// screen, in full, before any button is pressed — the same reasoning as the
// crash panel's, which shows its trace rather than folding it away: nothing is
// being sent on its own, so there is nothing to be coy about.
import { Bug, Check, Copy, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useBugReport } from "../../hooks/use-bug-report";
import { describeCrash, getCrashes, MAX_CRASHES, type CrashRecord } from "../../services/crash-log-service";

export function BugReportSettings() {
  return (
    <div className="appearance-settings">
      <ReportSetting />
      <CrashLogSetting />
    </div>
  );
}

/**
 * The report path itself.
 *
 * Two buttons rather than one, because the browser route needs a GitHub
 * account and the person most likely to hit a bug in this app is somebody who
 * was handed a build and has never had a reason to make one. Copying the same
 * text and sending it to whoever does have an account is a whole path, not a
 * fallback — it is how the Linux build got tested at all.
 */
function ReportSetting() {
  const { details, copied, copy, report } = useBugReport();

  return (
    <section className="sidebar-setting" data-setting="bug-report">
      {/* Not "Report a bug" again: the panel's own heading two lines above
          already says that, and a section titled the same as the screen it is
          on reads like a rendering mistake. */}
      <h3 className="sidebar-setting-label">Sending one</h3>
      <p className="sidebar-setting-blurb">
        If Anamnesis does something wrong — it looks broken, it loses your place, it stops — this is where to say so.
        The button opens a form in your browser with a box to describe what happened. Which version you're running,
        which build it is and what system it's on are filled in already, so you don't have to go looking for them.
      </p>
      <p className="sidebar-setting-blurb">
        <strong>Nothing is sent until you press Submit on that page</strong>, and what the form arrives carrying is
        the text below — you can read it first, and change or delete any of it on the page itself.
      </p>
      <p className="sidebar-setting-blurb">
        <strong>A report filed there is public</strong> — anyone can read it. When something has crashed, the details
        include file paths, and a path carries the name of a world and of a page. That is why the text is here rather
        than hidden: trim anything you'd rather not publish before you submit, or send it privately instead.
      </p>
      <p className="sidebar-setting-blurb">
        Opening the form needs a GitHub account. If you haven't got one, <em>Copy the details</em> puts the same
        thing on your clipboard to paste into a message to somebody who has.
      </p>
      <p className="appearance-actions">
        <button type="button" className="ui-btn ui-btn-primary" onClick={() => void report()} disabled={details === null}>
          <Bug size={14} />
          Open a bug report
          <ExternalLink size={12} />
        </button>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={() => void copy()} disabled={details === null}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy the details"}
        </button>
      </p>
      {details !== null && <pre className="bug-report-details">{details}</pre>}
    </section>
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
    <section className="sidebar-setting" data-setting="crash-log">
      <h3 className="sidebar-setting-label">If something goes wrong</h3>
      <p className="sidebar-setting-blurb">
        When Anamnesis hits a problem it can't carry on from, it writes down what happened — the error, the version
        and which operating system — in a file called <code>crash-log.json</code>, kept alongside your settings. The
        last {MAX_CRASHES} are held and older ones drop off.
      </p>
      <p className="sidebar-setting-blurb">
        <strong>That file stays on your computer.</strong> Nothing about a crash is sent anywhere on its own. If
        you'd like one looked at, the most recent one is already part of the report above; this copies it on its own.
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
