// Drives the "Check for updates" button. Every transition here starts with a
// click — there is no polling, no interval, and nothing runs on mount.
import { useCallback, useEffect, useRef, useState } from "react";
import { appVersion } from "../services/host-service";
import { flushAllSaves } from "../services/autosave";
import {
  checkForUpdate,
  installUpdate,
  openReleasesPage,
  restartApp,
  type DownloadProgress,
  type PendingUpdate,
} from "../services/update-service";

export type UpdateState =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "up-to-date" }
  | { phase: "available"; update: PendingUpdate }
  | { phase: "downloading"; update: PendingUpdate; progress: DownloadProgress }
  | { phase: "ready" }
  | { phase: "error"; message: string };

export function useUpdates() {
  const [state, setState] = useState<UpdateState>({ phase: "idle" });
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  // Guards a `setState` landing after the component is gone — a download can
  // outlive the screen it was started from if the user navigates away.
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Absent outside the desktop shell (`pnpm dev` in a plain browser), where
    // there's no version to report and no updating to do either.
    appVersion()
      .then((version) => {
        if (!cancelled) setCurrentVersion(version);
      })
      .catch(() => {
        if (!cancelled) setCurrentVersion(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const check = useCallback(async () => {
    setState({ phase: "checking" });
    const result = await checkForUpdate();
    if (!isMounted.current) return;

    if (result.status === "available") setState({ phase: "available", update: result.update });
    else if (result.status === "up-to-date") setState({ phase: "up-to-date" });
    else setState({ phase: "error", message: result.message });
  }, []);

  const install = useCallback(async (update: PendingUpdate) => {
    setState({ phase: "downloading", update, progress: { received: 0, total: null } });

    // The installer replaces the running executable and the app restarts, so
    // anything still sitting in a 300ms debounce would be lost. Nothing is
    // usually pending here — the button lives on the startup screen, before a
    // project is open — but "usually" isn't a guarantee worth taking.
    await flushAllSaves();

    try {
      await installUpdate(update, (progress) => {
        if (isMounted.current) setState({ phase: "downloading", update, progress });
      });
      if (isMounted.current) setState({ phase: "ready" });
    } catch (error) {
      if (!isMounted.current) return;
      const raw = error instanceof Error ? error.message : String(error);
      setState({
        phase: "error",
        message: `The update didn't install: ${raw}. Your current version is untouched and still works.`,
      });
    }
  }, []);

  const dismiss = useCallback(() => setState({ phase: "idle" }), []);

  return {
    state,
    currentVersion,
    check,
    install,
    restart: restartApp,
    dismiss,
    viewReleaseNotes: openReleasesPage,
  };
}
