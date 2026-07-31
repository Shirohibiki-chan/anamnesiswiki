// Startup routing — loads the last-opened project automatically if one
// still exists on disk, otherwise falls back to the project picker.
import { useEffect, useState } from "react";
import { useProject } from "../../hooks/use-project";
import { useAppSettings } from "../../hooks/use-app-settings";
import { useLoadShortcuts } from "../../hooks/use-shortcuts";
import { AppLayout } from "./AppLayout";
import { ProjectPicker } from "./ProjectPicker";
import "./shell.css";

export function StartupRouter() {
  const { isLoaded, loadProject } = useProject();
  const { getLastOpenedProject } = useAppSettings();
  const loadShortcuts = useLoadShortcuts();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      // Before either screen, since Settings — and so the shortcuts screen —
      // is reachable from the picker as well as from inside a project. Never
      // rejects; a settings file that won't open leaves the defaults.
      await loadShortcuts();
      // Anything that goes wrong here has to end with the picker on screen.
      // Without the catch, a settings store that won't open — or any other
      // unexpected rejection — left `isChecking` true forever, and the app
      // sat on "Loading..." with no error and no way forward.
      try {
        const lastPath = await getLastOpenedProject();
        if (lastPath) {
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

  return isLoaded ? <AppLayout /> : <ProjectPicker />;
}
