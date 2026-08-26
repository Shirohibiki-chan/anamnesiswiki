// The only way anything in the app reports that something happened.
//
// One door, for the same reason `constants/analytics.ts` keeps a closed list of
// event names: the rule that events never carry her writing is only as good as
// the number of places that can send one. This is that number.
//
// **Four things have to be true before a single request is made**, and they are
// checked here rather than at any call site:
//
//   1. There is a valid app key in the build.
//   2. The switch in Settings is on.
//   3. The one-time notice has been seen — so nobody is reported on before
//      being told, which is what makes on-by-default honest.
//   4. This is not a development run.
//
// Any of them false and `track` returns having done nothing. It never throws
// and never makes a caller wait: a call site is doing something that matters
// and this is the least important thing in the app.
import { useCallback, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { usePreferencesStore } from "../state/preferences-store";
import {
  ANALYTICS_EVENTS,
  APTABASE_APP_KEY,
  type AnalyticsEvent,
  type AnalyticsProps,
} from "../constants/analytics";
import {
  apiUrlFor,
  buildPayload,
  readSystemInfo,
  sendEvent,
  touchSession,
  type SessionState,
  type SystemInfo,
} from "../services/analytics-service";
import { appVersion } from "../services/host-service";

/**
 * The session, module-level rather than in a ref or the store.
 *
 * It has to survive re-renders and outlive any one component, and it is not
 * state anything renders from — the same argument that keeps `autosave.ts` a
 * plain service. It deliberately does not persist across restarts: a session
 * is a stretch of use, and one written to disk would be a record of her
 * activity sitting there between runs.
 */
let session: SessionState | null = null;

/**
 * The system description, worked out once. Nothing in it can change while the
 * app is open, and the app version is a promise we would rather not await on
 * every event.
 */
let system: SystemInfo | null = null;
let systemPending: Promise<SystemInfo> | null = null;

function getSystemInfo(): Promise<SystemInfo> {
  if (system) return Promise.resolve(system);
  if (!systemPending) {
    systemPending = appVersion()
      .catch(() => "")
      .then((version) => {
        system = readSystemInfo(version);
        return system;
      });
  }
  return systemPending;
}

export type TrackFn = (event: AnalyticsEvent, props?: AnalyticsProps) => void;

/**
 * Hands back a `track` that respects the switch.
 *
 * The returned function is stable, so it can sit in an effect's dependency
 * list without re-running it.
 */
export function useAnalytics(): TrackFn {
  const { enabled, noticeSeen } = usePreferencesStore(
    useShallow((state) => ({
      enabled: state.preferences.analytics,
      noticeSeen: state.preferences.analyticsNoticeSeen,
    })),
  );

  // Read through a ref so `track` never changes identity when the switch is
  // flipped — a caller holding it in an effect would otherwise re-run on a
  // settings change that has nothing to do with it.
  //
  // Written in an effect rather than during render, which this project's lint
  // rules forbid and are right to: the only cost is that the very first render
  // sees `false`, and there is nothing to report during a first render anyway.
  const allowed = useRef(false);
  useEffect(() => {
    allowed.current = enabled && noticeSeen;
  }, [enabled, noticeSeen]);

  return useCallback((event: AnalyticsEvent, props?: AnalyticsProps) => {
    if (!allowed.current) return;
    // `isDebug` is reported either way, but a development run is noise in her
    // numbers rather than data, so it is not sent at all.
    if (import.meta.env.DEV) return;
    const apiUrl = apiUrlFor(APTABASE_APP_KEY);
    if (!apiUrl) return;

    void getSystemInfo().then((info) => {
      const now = Date.now();
      session = touchSession(session, now, Math.random());
      return sendEvent(
        apiUrl,
        APTABASE_APP_KEY,
        buildPayload({ eventName: event, sessionId: session.id, now, system: info, props }),
      );
    });
  }, []);
}

/**
 * Reports that the app started, once per run.
 *
 * Mounted high up (see App.tsx) rather than left to a call site, because it is
 * the one event whose whole meaning is "this happened at startup". The guard
 * is a module-level flag rather than a ref: React mounts twice in StrictMode
 * during development, and a ref would let the second mount through in any
 * build where that behaviour reached production.
 */
let launchReported = false;

export function useReportLaunch(): void {
  const track = useAnalytics();
  const noticeSeen = usePreferencesStore((state) => state.preferences.analyticsNoticeSeen);

  useEffect(() => {
    // Deliberately waits for the notice. On a first run the launch event is
    // simply not sent — being told comes before being counted, and one missing
    // launch is a cheaper thing to own than the alternative.
    if (!noticeSeen || launchReported) return;
    launchReported = true;
    // Read off the user agent rather than from `ANAMNESIS_SHELL`, which picks
    // the door at build time in vite.config.ts and never reaches the client —
    // asking for it as `import.meta.env` would have quietly answered "tauri"
    // for every Electron build. Electron puts its own name in the UA; nothing
    // else here does.
    track(ANALYTICS_EVENTS.appLaunched, {
      shell: navigator.userAgent.includes("Electron") ? "electron" : "tauri",
    });
  }, [track, noticeSeen]);
}
