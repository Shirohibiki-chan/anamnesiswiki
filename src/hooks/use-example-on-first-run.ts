// Putting the example world in the library on a fresh install. Phase 26.
//
// **Her call, 2026-09-09: everybody gets it, rather than everybody being
// offered it.** The version this replaces only made Saltmere when somebody
// chose it on the start screen, which meant the one person most likely to want
// it — somebody who opens their own world first and wonders later what this app
// can do — had to go looking for an entry they had already walked past. It is a
// world; it belongs in the library like a world.
//
// **What it must not do is come back.** Once it exists it is an ordinary
// project, so deleting it means deleting it; `exampleWorldMade` is written the
// moment one is made and never cleared. That is also why a failure leaves the
// flag alone — a run that could not write anything has not given anybody
// anything, and next launch may be able to.
import { useEffect, useRef } from "react";
import { getExampleWorldMade, setExampleWorldMade } from "../services/app-settings-service";
import { useAppSettings } from "./use-app-settings";
import { useProject } from "./use-project";

/**
 * Makes it once, then tells the caller so the library can pick it up.
 *
 * `onMade` rather than a returned flag: the start screen's list comes from a
 * scan of the projects folder that has already run by the time this finishes,
 * and a world nobody rescanned for is a world that appears on the next launch
 * instead of this one.
 */
export function useExampleOnFirstRun(onMade: () => void): void {
  const { prepareNewProjectsDir } = useAppSettings();
  const { writeExampleProject } = useProject();
  // Once per window, whatever remounts the screen that calls this.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    let cancelled = false;
    void (async () => {
      try {
        if (await getExampleWorldMade()) return;
        const parentDir = await prepareNewProjectsDir();
        const result = await writeExampleProject(parentDir);
        if (cancelled || !result.ok) return;
        await setExampleWorldMade(true);
        onMade();
      } catch {
        // Silent on purpose. A first launch that could not write into the
        // projects folder has bigger problems than a missing example, and every
        // one of them says so the moment she tries to make a project of her
        // own — an error on the start screen about a world she never asked for
        // would be the app's first words to her being an apology.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onMade, prepareNewProjectsDir, writeExampleProject]);
}
