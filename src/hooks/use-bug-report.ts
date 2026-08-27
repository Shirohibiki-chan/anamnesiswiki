// Feeds Settings → Report a bug.
//
// The build details are asked for once when the panel opens, because the
// version is the one line that needs the shell and the answer never changes
// while the app is running. Everything else here is the two things the panel
// can do with that text: put it on the clipboard, or hand it to the browser
// inside a prefilled form.
import { useCallback, useEffect, useState } from "react";
import { collectBuildFacts, openBugReport, reportDetails } from "../services/bug-report-service";
import { getCrashes } from "../services/crash-log-service";

export function useBugReport() {
  const [details, setDetails] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [facts, crashes] = await Promise.all([collectBuildFacts(), getCrashes()]);
      if (live) setDetails(reportDetails(facts, crashes[0] ?? null));
    })();
    return () => {
      live = false;
    };
  }, []);

  const copy = useCallback(async () => {
    if (details === null) return;
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Denied or unavailable. The same text is on screen and selectable,
      // which is why the panel shows it rather than hiding it behind a button.
    }
  }, [details]);

  // The clipboard is loaded first on purpose. What the link can carry is capped
  // by the URL, so anything trimmed out of the form is already pasteable by the
  // time the browser opens — and a report is worth more with its whole trace.
  const report = useCallback(async () => {
    if (details === null) return;
    await copy();
    await openBugReport(details);
  }, [copy, details]);

  return { details, copied, copy, report };
}
