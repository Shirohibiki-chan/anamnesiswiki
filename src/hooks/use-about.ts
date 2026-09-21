// Feeds Settings → About: the running version, and the way out to a web page.
//
// The version is read the same way the update panel reads it, and for the
// same reason it is nullable — outside the desktop shell (`pnpm dev` in a
// plain browser) there is no version to report, and the panel says
// "Anamnesis" rather than "Anamnesis undefined".
import { useCallback, useEffect, useState } from "react";
import { appVersion, openInBrowser } from "../services/host-service";

export function useAbout(): {
  version: string | null;
  openLink: (url: string) => void;
} {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    appVersion()
      .then((found) => {
        if (!cancelled) setVersion(found);
      })
      .catch(() => {
        if (!cancelled) setVersion(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openLink = useCallback((url: string) => void openInBrowser(url), []);

  return { version, openLink };
}
