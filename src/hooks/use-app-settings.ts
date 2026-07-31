// The only import path components have into app-settings-service.ts. See
// CLAUDE.md's layer order — components never import services directly.
import { useCallback, useEffect, useState } from "react";
import * as appSettings from "../services/app-settings-service";
import type { RecentProject } from "../services/app-settings-service";
import { ensureDir } from "../services/filesystem-service";

export function useAppSettings() {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  // Null until the store has been read — the folder is only knowable
  // asynchronously, so anything rendering it has to cope with "not yet".
  const [projectsDir, setProjectsDirState] = useState<string | null>(null);
  const [isCustomProjectsDir, setIsCustomProjectsDir] = useState(false);

  const refreshRecentProjects = useCallback(async () => {
    setRecentProjects(await appSettings.getRecentProjects());
  }, []);

  const refreshProjectsDir = useCallback(async () => {
    const [dir, isCustom] = await Promise.all([appSettings.getProjectsDir(), appSettings.hasCustomProjectsDir()]);
    setProjectsDirState(dir);
    setIsCustomProjectsDir(isCustom);
  }, []);

  useEffect(() => {
    let cancelled = false;
    appSettings.getRecentProjects().then((projects) => {
      if (!cancelled) setRecentProjects(projects);
    });
    Promise.all([appSettings.getProjectsDir(), appSettings.hasCustomProjectsDir()]).then(([dir, isCustom]) => {
      if (cancelled) return;
      setProjectsDirState(dir);
      setIsCustomProjectsDir(isCustom);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const prepareProjectsDir = useCallback(async () => {
    const dir = await appSettings.getProjectsDir();
    await ensureDir(dir);
    return dir;
  }, []);

  const changeProjectsDir = useCallback(
    async (path: string | null) => {
      await appSettings.setProjectsDir(path);
      await refreshProjectsDir();
    },
    [refreshProjectsDir],
  );

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

  const clearLastOpenedProject = useCallback(() => appSettings.setLastOpenedProject(null), []);

  return {
    recentProjects,
    recordProjectOpened,
    forgetProject,
    getLastOpenedProject: appSettings.getLastOpenedProject,
    clearLastOpenedProject,
    projectsDir,
    isCustomProjectsDir,
    changeProjectsDir,
    // Read on demand rather than from the state above, for the call sites that
    // need the folder *now* (creating, importing) and can't wait on a render.
    // Makes the folder as well: it's otherwise only ever a default path that
    // nothing creates, so the first project of a fresh install would land in a
    // folder that doesn't exist, and a folder browser pointed at it would open
    // in Documents instead with the user expected to make it by hand.
    prepareProjectsDir,
  };
}
