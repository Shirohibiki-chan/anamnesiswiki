// Which project this copy of the app has open, and how a *second* copy finds
// out — so two windows can't end up autosaving over each other's work.
//
// Verified 2026-08-14: two copies of Anamnesis run side by side quite happily,
// each with a real window. The trap is that both auto-open the last project,
// so the default path — launch it twice — puts two autosaving copies on the
// same files, and neither knows.
//
// **A marker file in the project's own folder, kept fresh while it is open.**
// The app can't ask the OS whether the process that wrote a marker is still
// running without a Rust command, and CLAUDE.md's architecture rules say not to
// add one for a job the fs plugin can do. So the marker says so itself: it
// carries the time it was last written, the holder rewrites it while the
// project is open, and anything that stops running stops rewriting. A marker
// past `PROJECT_CLAIM_STALE_MS` belongs to nobody — which is what keeps a crash
// from locking her out of her own project.
import { PROJECT_CLAIM_REFRESH_MS, PROJECT_CLAIM_STALE_MS } from "../constants/limits";

/**
 * What the marker holds. Deliberately small: two fields, both of which have a
 * job, in a file another version of the app has to be able to read.
 *
 * `sessionId` is this *launch* of the app, not this machine and not this user
 * — the question the marker answers is "is another copy of the app in here",
 * and a second launch is a second copy however it was started.
 */
export type ProjectClaim = {
  sessionId: string;
  refreshedAt: number;
};

/**
 * This launch's id, minted once when the module loads.
 *
 * Module scope rather than a hook, for the reason `autosave.ts` is a plain
 * service: it has to survive every re-render and outlive every component, and
 * a new id per mount would make the app a stranger to its own marker.
 */
export const SESSION_ID = crypto.randomUUID();

/** Read defensively — this file is written by a version of the app that isn't this one. */
export function parseProjectClaim(value: unknown): ProjectClaim | null {
  if (typeof value !== "object" || value === null) return null;
  const claim = value as ProjectClaim;
  if (typeof claim.sessionId !== "string" || typeof claim.refreshedAt !== "number") return null;
  return { sessionId: claim.sessionId, refreshedAt: claim.refreshedAt };
}

export function newProjectClaim(now: number): ProjectClaim {
  return { sessionId: SESSION_ID, refreshedAt: now };
}

/**
 * Whether a marker is old enough to ignore.
 *
 * A marker from the future is not stale — a clock that disagrees, or a file
 * synced from a machine running ahead, would otherwise read as abandoned while
 * the project is genuinely open somewhere.
 */
export function isClaimStale(claim: ProjectClaim, now: number): boolean {
  return now - claim.refreshedAt > PROJECT_CLAIM_STALE_MS;
}

/**
 * Whether opening this project would land on top of another copy of the app.
 *
 * **Our own marker never blocks us.** It is left behind by this same session —
 * closing a project and opening it again inside one run of the app is ordinary,
 * and a marker we wrote ourselves is not evidence of anybody else.
 */
export function isHeldElsewhere(claim: ProjectClaim | null, now: number): boolean {
  if (!claim) return false;
  if (claim.sessionId === SESSION_ID) return false;
  return !isClaimStale(claim, now);
}

/**
 * How long ago the other copy last said it was there, in words.
 *
 * Worth saying rather than a flat refusal: "a few seconds ago" means switch
 * windows, and a minute and a half means something has probably gone wrong and
 * the wait is nearly over. A refusal with no number in it is a wall.
 */
export function describeClaimAge(claim: ProjectClaim, now: number): string {
  const seconds = Math.max(0, Math.round((now - claim.refreshedAt) / 1000));
  if (seconds < 45) return "a few seconds ago";
  const minutes = Math.round(seconds / 60);
  return minutes <= 1 ? "about a minute ago" : `about ${minutes} minutes ago`;
}

/**
 * The heartbeat, as module state.
 *
 * A plain service and not a hook, the same call `autosave.ts` makes and for the
 * same reason: the timer has to survive re-renders, and there is exactly one of
 * it per running app however many components care.
 *
 * Nothing here touches disk — `filesystem-service.ts` is the only file allowed
 * to (CLAUDE.md §5), so the write is handed in by the caller that started the
 * heartbeat.
 */
let beat: ReturnType<typeof setInterval> | null = null;

export function startClaimHeartbeat(refresh: () => void): void {
  stopClaimHeartbeat();
  beat = setInterval(refresh, PROJECT_CLAIM_REFRESH_MS);
}

export function stopClaimHeartbeat(): void {
  if (beat === null) return;
  clearInterval(beat);
  beat = null;
}
