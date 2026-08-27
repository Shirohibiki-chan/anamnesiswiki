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

/** Where this window's id lives between reloads. */
const SESSION_ID_KEY = "anamnesis.sessionId";

/**
 * The id for this window, reusing the one it already had if there is one.
 *
 * **Reloading must not lock the app out of its own project.** The id used to
 * be minted on every module load, so a refresh produced a *new* one, found the
 * marker the previous load had written seconds earlier, and refused to open —
 * the app treating itself as another copy. Reported from use 2026-08-21, and
 * unbearable during development, where a reload happens constantly.
 *
 * `sessionStorage` is exactly the lifetime wanted here: it survives a reload of
 * this window and is gone when the window is, so a genuine second launch still
 * mints a genuinely different id and is still refused.
 */
export function resolveSessionId(stored: string | null, mint: () => string): string {
  return stored ? stored : mint();
}

// Storage can throw rather than merely be absent — a webview with storage
// disabled raises on access — so both the read and the write are guarded, and
// a failure just means the old behaviour of a fresh id per load.
function sessionStore(): Pick<Storage, "getItem" | "setItem"> | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

/**
 * This window's id, stable across its reloads.
 *
 * Module scope rather than a hook, for the reason `autosave.ts` is a plain
 * service: it has to survive every re-render and outlive every component, and
 * a new id per mount would make the app a stranger to its own marker.
 */
export const SESSION_ID = ((): string => {
  const store = sessionStore();
  const stored = ((): string | null => {
    try {
      return store?.getItem(SESSION_ID_KEY) ?? null;
    } catch {
      return null;
    }
  })();
  const id = resolveSessionId(stored, () => crypto.randomUUID());
  try {
    store?.setItem(SESSION_ID_KEY, id);
  } catch {
    // Nothing to do: a window that can't remember its id behaves as it did
    // before, which is to say it waits out the staleness window after a
    // reload rather than reclaiming immediately.
  }
  return id;
})();

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

/**
 * How the marker gets removed when the *window* closes rather than when the
 * project does.
 *
 * **React's cleanup does not run when a window is destroyed.** The claim is
 * held by an effect in `AppLayout`, so navigating out of a project releases it
 * properly — but quitting the app tears the renderer down without unmounting
 * anything, and the marker is left behind looking freshly written. The next
 * launch then finds it, does not recognise it (a new window is a new id), and
 * reports the project as open in another window. Reported from use twice:
 * 2026-08-21 and again 2026-08-26, where it was hit by simply closing the app
 * and reopening it inside the two-minute staleness window.
 *
 * A module-level slot rather than a hook for the same reason `autosave.ts` is a
 * plain service: the thing that needs to call it is the close handler, which is
 * registered once and must not depend on any component still being mounted.
 */
let releaseHeldClaim: (() => Promise<void>) | null = null;

/** Registered by whatever currently holds the marker; null when nothing does. */
export function setClaimRelease(release: (() => Promise<void>) | null): void {
  releaseHeldClaim = release;
}

/**
 * Removes the marker now, if this window holds one.
 *
 * Called on the way out of the window. Best-effort like every other write to
 * it: a project on read-only media never had a marker to remove, and the
 * staleness window still covers a crash, a power cut, and a kill.
 */
export async function releaseClaimNow(): Promise<void> {
  const release = releaseHeldClaim;
  releaseHeldClaim = null;
  try {
    await release?.();
  } catch {
    // Nothing to do — the staleness window is the fallback it always was.
  }
}

export function startClaimHeartbeat(refresh: () => void): void {
  stopClaimHeartbeat();
  beat = setInterval(refresh, PROJECT_CLAIM_REFRESH_MS);
}

export function stopClaimHeartbeat(): void {
  if (beat === null) return;
  clearInterval(beat);
  beat = null;
}
