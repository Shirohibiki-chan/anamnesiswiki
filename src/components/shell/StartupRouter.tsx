// Startup routing — loads the last-opened project automatically if one
// still exists on disk, otherwise falls back to the project picker.
import { useEffect, useState } from "react";
import { useProject } from "../../hooks/use-project";
import { useAppSettings } from "../../hooks/use-app-settings";
import { useLoadShortcuts } from "../../hooks/use-shortcuts";
import { useLoadPanelWidths } from "../../hooks/use-panel-widths";
import { useLoadPreferences } from "../../hooks/use-preferences";
import { findBlockingClaim } from "../../hooks/use-project-claim";
import { AppLayout } from "./AppLayout";
import { StartScreen } from "../start/StartScreen";
import "./shell.css";

export function StartupRouter() {
  const { isLoaded, loadProject } = useProject();
  const { getLastOpenedProject } = useAppSettings();
  const loadShortcuts = useLoadShortcuts();
  const loadPanelWidths = useLoadPanelWidths();
  const loadPreferences = useLoadPreferences();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      // Shortcuts load before either screen, since Settings — and so the
      // shortcuts screen — is reachable from the picker as well as from
      // inside a project.
      // All three before either screen, and all for the same reason: none of
      // them ever rejects, and a settings file that won't open leaves the
      // defaults. Panel widths matter most here — the shell's columns are
      // already right on its first paint rather than snapping from the
      // fallback a frame later.
      await Promise.all([loadShortcuts(), loadPanelWidths(), loadPreferences()]);
      // Anything that goes wrong here has to end with the picker on screen.
      // Without the catch, a settings store that won't open — or any other
      // unexpected rejection — left `isChecking` true forever, and the app
      // sat on "Loading..." with no error and no way forward.
      try {
        // **A second launch starts here rather than back where it left off.**
        // The host puts this on the URL when it opens a window for a launch
        // that arrived while the app was already running (electron/main.js).
        // Reopening the last project in that window is what put two autosaving
        // copies on one project, which is the whole reason the open-marker
        // exists — and from the picker, a project another window already has
        // is now a window to be brought forward rather than a refusal.
        if (window.location.hash === "#picker") {
          if (!cancelled) setIsChecking(false);
          return;
        }
        const lastPath = await getLastOpenedProject();
        // The whole reason the marker exists. Launching the app twice would
        // otherwise put two autosaving copies on the same files by the most
        // ordinary path there is — neither of them asked for, neither of them
        // told. A project another copy has open falls through to the picker,
        // which is what this router already does for one that has moved.
        if (lastPath && !(await findBlockingClaim(lastPath))) {
          await loadProject(lastPath);
          // If the project is gone (moved/deleted) or can't be read,
          // loadProject resolves null and isLoaded stays false — the render
          // below falls through to the picker.
        }
      } catch {
        // Fall through to the picker.
      }
      if (!cancelled) setIsChecking(false);
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
    // Only ever runs once on mount — this is one-shot startup routing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isChecking) {
    return (
      <main className="startup-loading">
        <p>Loading...</p>
      </main>
    );
  }

  return isLoaded ? <AppLayout /> : <StartScreen />;
}
