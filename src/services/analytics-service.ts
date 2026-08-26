// Turning "this happened" into a request, and deciding whether to make it.
//
// Plain TS, no React, and no shell: a public HTTPS endpoint is ordinary web
// rather than something only the host can answer, and Aptabase's own web SDK
// posts to this endpoint straight from a browser. So this works the same under
// Tauri, under Electron, and under the browser edition when it exists, and adds
// nothing to `host-contract.ts`.
//
// **If a Content-Security-Policy is ever added to either shell**, this is what
// breaks, and the fix is `connect-src` for the region host rather than moving
// the call behind the door. Both shells run with `csp: null` today.
//
// Everything above the send is pure and tested. The send itself never throws
// and never retries — see `sendEvent`.
import {
  ANALYTICS_SDK_VERSION,
  ANALYTICS_SESSION_TIMEOUT_SECONDS,
  APTABASE_EVENT_PATH,
  APTABASE_HOSTS,
  type AnalyticsProps,
} from "../constants/analytics";

// ---------------------------------------------------------------- the key

export type AppKeyParts = { valid: boolean; region: string | null };

/**
 * An Aptabase key is three dash-separated parts, the middle one naming a
 * region. Anything else is a typo, and a typo must disable sending rather than
 * post to a guessed address.
 */
export function parseAppKey(appKey: string): AppKeyParts {
  const parts = appKey.split("-");
  if (parts.length !== 3) return { valid: false, region: null };
  const region = parts[1];
  if (APTABASE_HOSTS[region] === undefined) return { valid: false, region: null };
  return { valid: true, region };
}

/**
 * Where events for this key go, or null if they go nowhere.
 *
 * Null rather than a thrown error: no key and a malformed key are both
 * ordinary states — a fresh clone has the first — and the caller's response to
 * either is the same, which is to send nothing.
 */
export function apiUrlFor(appKey: string, selfHostedHost?: string): string | null {
  const { valid, region } = parseAppKey(appKey);
  if (!valid || !region) return null;
  if (region === "SH") {
    // A self-hosted key names no address, so one has to be supplied. Without
    // it there is nothing to send to, which is a misconfiguration rather than
    // a reason to fall back to their cloud with her data.
    if (!selfHostedHost) return null;
    return selfHostedHost.replace(/\/+$/, "") + APTABASE_EVENT_PATH;
  }
  return APTABASE_HOSTS[region] + APTABASE_EVENT_PATH;
}

// ------------------------------------------------------------- the session

/**
 * Their session id format: epoch seconds followed by eight random digits.
 * Reproduced rather than invented so the dashboard groups events the way their
 * documentation describes.
 */
export function newSessionId(now: number, random: number): string {
  const epochSeconds = Math.floor(now / 1000).toString();
  const suffix = Math.floor(random * 100000000)
    .toString()
    .padStart(8, "0");
  return epochSeconds + suffix;
}

export type SessionState = { id: string; lastTouched: number };

/**
 * The session this event belongs to, given the last one.
 *
 * A gap longer than the timeout starts a new session; anything shorter extends
 * the current one. Pure, so the boundary is testable without waiting an hour.
 */
export function touchSession(
  previous: SessionState | null,
  now: number,
  random: number,
  timeoutSeconds = ANALYTICS_SESSION_TIMEOUT_SECONDS,
): SessionState {
  if (previous && (now - previous.lastTouched) / 1000 <= timeoutSeconds) {
    return { id: previous.id, lastTouched: now };
  }
  return { id: newSessionId(now, random), lastTouched: now };
}

// ------------------------------------------------------------- the payload

export type SystemInfo = {
  isDebug: boolean;
  locale: string;
  osName: string;
  osVersion: string;
  engineName: string;
  engineVersion: string;
  appVersion: string;
};

export type EventPayload = {
  timestamp: string;
  sessionId: string;
  eventName: string;
  systemProps: SystemInfo & { sdkVersion: string };
  props?: AnalyticsProps;
};

export function buildPayload(input: {
  eventName: string;
  sessionId: string;
  now: number;
  system: SystemInfo;
  props?: AnalyticsProps;
}): EventPayload {
  return {
    timestamp: new Date(input.now).toISOString(),
    sessionId: input.sessionId,
    eventName: input.eventName,
    systemProps: { ...input.system, sdkVersion: ANALYTICS_SDK_VERSION },
    props: input.props,
  };
}

/**
 * What the app can work out about the machine without asking the shell.
 *
 * Read from the renderer rather than through `host-contract.ts` on purpose:
 * both shells are a browser engine, so one implementation covers both and the
 * browser edition for free, and none of it is a question only a host can
 * answer.
 *
 * **The version is coarser than a shell call would give**, and that is the
 * trade. Windows reports itself as "Windows NT 10.0" whether it is 10 or 11,
 * so `osVersion` is approximate there. If the OS breakdown ever looks too
 * blunt to act on, the upgrade is a `systemInfo()` on the host contract
 * reading `os.release()`, and only this function changes.
 */
export function readSystemInfo(appVersion: string): SystemInfo {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const osName = ua.includes("Windows")
    ? "Windows"
    : ua.includes("Mac OS X") || ua.includes("Macintosh")
      ? "macOS"
      : ua.includes("Linux") || ua.includes("X11")
        ? "Linux"
        : "Unknown";

  const versionMatch =
    /Windows NT ([\d._]+)/.exec(ua) ??
    /Mac OS X ([\d._]+)/.exec(ua) ??
    /(?:Chrome|Firefox|Version)\/([\d.]+)/.exec(ua);
  const engineMatch = /(?:Chrome|CriOS)\/([\d.]+)/.exec(ua) ?? /AppleWebKit\/([\d.]+)/.exec(ua);

  return {
    // `import.meta.env.DEV` rather than asking whether the app is packaged:
    // it is the same answer, it is true in exactly the runs we want excluded
    // from the numbers, and it needs no shell.
    isDebug: import.meta.env.DEV,
    locale: typeof navigator === "undefined" ? "en" : navigator.language,
    osName,
    osVersion: versionMatch ? versionMatch[1].replace(/_/g, ".") : "",
    engineName: ua.includes("Chrome") ? "Chromium" : "WebKit",
    engineVersion: engineMatch ? engineMatch[1] : "",
    appVersion,
  };
}

// ---------------------------------------------------------------- the send

/**
 * Post one event. **Never throws, never retries, never blocks anything.**
 *
 * Analytics is the least important thing the app does, and it runs alongside
 * work that matters — so a refused request, a captive-portal redirect, or no
 * network at all has to cost nothing and be invisible. A failure is swallowed
 * here rather than surfaced; the app keeping working with no internet is one
 * of the Two Promises, and a feature that reports on the app must not be the
 * thing that breaks it.
 *
 * No retry queue on purpose. A dropped event is a lost row on a dashboard,
 * which is worth nothing, and a queue that survives restarts is a file of her
 * activity sitting on disk waiting to be sent — a worse thing to own than the
 * missing row.
 */
export async function sendEvent(
  apiUrl: string,
  appKey: string,
  payload: EventPayload,
): Promise<boolean> {
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "App-Key": appKey },
      credentials: "omit",
      body: JSON.stringify(payload),
    });
    return response.status < 300;
  } catch {
    return false;
  }
}
