// The only import path components have into app-settings-service.ts. See
// CLAUDE.md's layer order — components never import services directly.
import { useCallback, useEffect, useState } from "react";
import * as appSettings from "../services/app-settings-service";
import type { RecentProject } from "../services/app-settings-service";

export function useAppSettings() {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  const refreshRecentProjects = useCallback(async () => {
    setRecentProjects(await appSettings.getRecentProjects());
  }, []);

  useEffect(() => {
    let cancelled = false;
    appSettings.getRecentProjects().then((projects) => {
      if (!cancelled) setRecentProjects(projects);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const recordProjectOpened = useCallback(
    async (path: string, name: string) => {
      await appSettings.addRecentProject(path, name);
      await appSettings.setLastOpenedProject(path);
      await refreshRecentProjects();
    },
    [refreshRecentProjects],
  );

  const forgetProject = useCallback(
    async (path: string) => {
      await appSettings.removeRecentProject(path);
      await refreshRecentProjects();
    },
    [refreshRecentProjects],
  );

  return {
    recentProjects,
    recordProjectOpened,
    forgetProject,
    getLastOpenedProject: appSettings.getLastOpenedProject,
  };
}
