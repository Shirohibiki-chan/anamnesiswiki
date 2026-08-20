// The start screen's list of worlds: everything in the projects folder plus
// everything opened from outside it. The only import path components have into
// the world scan — see CLAUDE.md's layer order.
import { useCallback, useEffect, useState } from "react";
import * as appSettings from "../services/app-settings-service";
import { collectWorldFiles, reidentifyForkedProject } from "../services/filesystem-service";
import { buildWorldList, planForkResolutions, type ListedWorld } from "../services/world-scan";

/**
 * The one thing a listing writes, and only when it finds evidence of a fork.
 *
 * Two projects wearing one id is what a folder copied in File Explorer looks
 * like — which is how she forks — so the scan is the only place that can ever
 * notice. `planForkResolutions` decides which one keeps the id; this hands the
 * others their own, and records what they were copied from.
 *
 * **This does not contradict "listing never writes".** That rule is about not
 * touching every project on the disk to backfill an id — the cost that made
 * `readWorldSummary` deliberately refuse to mint one. Here nothing is written
 * unless a duplicate is actually found, which is rare and is a repair.
 *
 * The result is patched in memory rather than re-scanning: exactly what
 * changed is already known, a second full scan would double the work of every
 * start, and a re-scan that kept finding an unwritable duplicate would loop.
 * A write that fails leaves the pair as they were, to be found again next
 * time.
 */
async function resolveForks(worlds: ListedWorld[]): Promise<ListedWorld[]> {
  const plan = planForkResolutions(worlds);
  if (plan.length === 0) return worlds;

  const minted = await Promise.all(
    plan.map(async (fork) => ({ fork, id: await reidentifyForkedProject(fork.path, fork.forkedFromId) })),
  );

  return worlds.map((world) => {
    const done = minted.find((entry) => entry.fork.path === world.path && entry.id !== null);
    return done ? { ...world, id: done.id, forkedFromId: done.fork.forkedFromId } : world;
  });
}

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
    return resolveForks(buildWorldList({ onDisk, remembered, projectsDir }));
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
