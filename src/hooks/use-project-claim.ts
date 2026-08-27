// Holding the "this project is open" marker while a project is open, and
// asking whether somebody else holds it before opening one.
//
// The only import path components have into `project-claim.ts` and into the
// marker half of `filesystem-service` — see CLAUDE.md's layer order.
import { useEffect } from "react";
import * as fsService from "../services/filesystem-service";
import { announceOpenProject } from "../services/host-service";
import {
  isHeldElsewhere,
  newProjectClaim,
  parseProjectClaim,
  setClaimRelease,
  startClaimHeartbeat,
  stopClaimHeartbeat,
  type ProjectClaim,
} from "../services/project-claim";

/**
 * Claims the project for as long as this component is mounted.
 *
 * Mounted in `AppLayout`, which exists exactly while a project is open — so
 * the claim's lifetime is the project's, with no separate bookkeeping to keep
 * in step and nothing to forget on a path that closes a project some new way.
 *
 * Every write is best-effort. A project on read-only media still opens; it
 * simply can't say that it is open, which costs the warning and nothing else.
 * The same goes for the release on the way out — the staleness window in
 * `project-claim.ts` is what covers a crash, a power cut, and every other way
 * this cleanup doesn't get to run.
 */
export function useHoldProjectClaim(rootPath: string | null): void {
  useEffect(() => {
    if (!rootPath) return;

    // Guards the write that a stopped heartbeat can still have in flight: an
    // interval fires, the effect tears down, and the write lands afterwards —
    // re-creating the marker we just removed and locking the project until it
    // goes stale.
    let held = true;
    const refresh = () => {
      if (!held) return;
      void fsService.writeProjectClaim(rootPath, newProjectClaim(Date.now())).catch(() => {});
    };

    refresh();
    startClaimHeartbeat(refresh);

    // **The in-process half of the same statement.** The marker is a file, so
    // it is the only way to say "open" to a copy of the app that is a separate
    // process or on another machine. This says it to the windows of *this*
    // process, which is what lets the picker bring an already-open project to
    // the front instead of reporting it as a problem. Best-effort in the same
    // way: a shell that cannot manage two windows ignores it.
    void announceOpenProject(rootPath).catch(() => {});

    // Removing the marker on unmount covers leaving a project; this covers
    // closing the window, which never unmounts anything. See `releaseClaimNow`.
    const release = async () => {
      held = false;
      stopClaimHeartbeat();
      await fsService.clearProjectClaim(rootPath);
    };
    setClaimRelease(release);

    return () => {
      setClaimRelease(null);
      void announceOpenProject(null).catch(() => {});
      void release();
    };
  }, [rootPath]);
}

/**
 * The claim standing in the way of opening this project, or null if there
 * isn't one.
 *
 * A plain function rather than a hook because every caller asks at the moment
 * of a click or a startup check, not while rendering. Our own marker and a
 * stale one both answer null — see `isHeldElsewhere`.
 */
export async function findBlockingClaim(rootPath: string): Promise<ProjectClaim | null> {
  const claim = parseProjectClaim(await fsService.readProjectClaim(rootPath));
  return claim && isHeldElsewhere(claim, Date.now()) ? claim : null;
}

/**
 * Which of these projects are open in another copy of the app right now.
 *
 * Answered for the whole listing in one pass so the start screen can mark them
 * before she clicks, rather than only refusing afterwards.
 */
export async function findProjectsHeldElsewhere(paths: readonly string[]): Promise<Set<string>> {
  const claims = await fsService.readProjectClaims(paths);
  const now = Date.now();
  const held = new Set<string>();
  for (const [path, raw] of claims) {
    if (isHeldElsewhere(parseProjectClaim(raw), now)) held.add(path);
  }
  return held;
}
