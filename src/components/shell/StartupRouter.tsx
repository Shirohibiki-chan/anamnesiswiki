// Startup routing — loads the last-opened project automatically if one
// still exists on disk, otherwise falls back to the project picker.
import { useEffect, useState } from "react";
import { useProject } from "../../hooks/use-project";
import { useAppSettings } from "../../hooks/use-app-settings";
import { AppLayout } from "./AppLayout";
import { ProjectPicker } from "./ProjectPicker";
import "./shell.css";

export function StartupRouter() {
  const { isLoaded, loadProject } = useProject();
  const { getLastOpenedProject } = useAppSettings();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const lastPath = await getLastOpenedProject();
      if (lastPath) {
        await loadProject(lastPath);
        // If the project is gone (moved/deleted), loadProject resolves null
        // and isLoaded stays false — the render below falls through to the picker.
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
