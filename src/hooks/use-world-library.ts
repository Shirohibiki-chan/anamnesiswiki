// The start screen's list of worlds: everything in the projects folder plus
// everything opened from outside it. The only import path components have into
// the world scan — see CLAUDE.md's layer order.
import { useCallback, useEffect, useState } from "react";
import * as appSettings from "../services/app-settings-service";
import { collectWorldFiles } from "../services/filesystem-service";
import { buildWorldList, type ListedWorld } from "../services/world-scan";

export function useWorldLibrary() {
  const [worlds, setWorlds] = useState<ListedWorld[]>([]);
  // When the list was read, for the screen that says "4 hours ago" against
  // each project. It belongs to the scan rather than to the render: a clock
  // read while drawing is a value that changes on a re-render nothing asked
  // for, and forty tiles reading it separately can straddle a minute and
  // disagree with each other about the same project.
  const [scannedAt, setScannedAt] = useState(() => Date.now());
  // Starts true so the first paint says "looking" rather than "no worlds" —
  // the scan is disk work, and an empty list shown for a frame reads as an
  // empty projects folder.
  const [isScanning, setIsScanning] = useState(true);

  const readWorlds = useCallback(async () => {
    const [projectsDir, remembered] = await Promise.all([
      appSettings.getProjectsDir(),
      appSettings.getRecentProjects(),
    ]);
    const onDisk = await collectWorldFiles(
      projectsDir,
      remembered.map((world) => world.path),
    );
    return buildWorldList({ onDisk, remembered, projectsDir });
  }, []);

  const refreshWorlds = useCallback(async () => {
    setIsScanning(true);
    try {
      setWorlds(await readWorlds());
      setScannedAt(Date.now());
    } finally {
      setIsScanning(false);
    }
  }, [readWorlds]);

  useEffect(() => {
    let cancelled = false;
    // Nothing here rejects — `collectWorldFiles` swallows an unreadable folder
    // per folder — but the start screen must never be left on "looking for
    // your worlds" by a surprise, since it's the only way into the app.
    readWorlds()
      .catch(() => [])
      .then((found) => {
        if (cancelled) return;
        setWorlds(found);
        setScannedAt(Date.now());
        setIsScanning(false);
      });
    return () => {
      cancelled = true;
    };
  }, [readWorlds]);

  return { worlds, isScanning, scannedAt, refreshWorlds };
}
