// Where analytics go, and what it is allowed to say.
//
// **She asked for this**, 2026-08-26. The Two Promises in CLAUDE.md rule out
// *unrequested* collection rather than network access, and this is the
// requested kind — she wants to know which parts of the app get used. What the
// promises still decide is the shape of it, and that is what this file is:
//
//   1. There is a switch, it is visible, and it works from the first version.
//   2. **An event may name a feature and may never carry content.** "A meter
//      block was added" is data about the app; a page title, a world's name, a
//      tag, or anything typed into the editor is her writing, and none of it
//      may appear in an event name or a prop. This is the rule that makes the
//      feature safe to have, so it is stated here rather than left to taste.
//   3. Everyone who runs the app is told, once, and can turn it off.
//
// Aptabase, chosen 2026-08-26: open source, free tier, self-hostable later
// without changing any of this, and its own web SDK posts to the same endpoint
// straight from a browser — which is why this needs no shell capability and
// works the same under Tauri, Electron and the eventual browser build.

/**
 * Which Aptabase host serves which region, keyed by the middle part of an app
 * key (`A-US-1234567890` → `US`). Mirrors the region table in their SDKs.
 *
 * `SH` means self-hosted and carries no host of its own — the address has to
 * be supplied alongside the key, which is the door left open for moving off
 * their cloud without touching anything else here.
 */
export const APTABASE_HOSTS: Record<string, string> = {
  US: "https://us.aptabase.com",
  EU: "https://eu.aptabase.com",
  DEV: "https://localhost:3000",
  SH: "",
};

/** The path every region serves the ingest endpoint at. */
export const APTABASE_EVENT_PATH = "/api/v0/event";

/**
 * The app key, supplied at build time as `VITE_APTABASE_KEY`.
 *
 * **Empty is the normal state and is not an error.** No key means nothing is
 * ever sent, which is what a clone of this repository, a contributor's build,
 * and every build made before she created the account all want. The switch in
 * Settings still shows, and still remembers what it was set to, so the absence
 * of a key changes what happens rather than what the app looks like.
 *
 * It is not a secret. Aptabase keys are compiled into the clients that send
 * with them — theirs is a write-only ingest endpoint — so this sits in the
 * build rather than in a secret store, and appears in the shipped bundle by
 * design.
 */
export const APTABASE_APP_KEY: string = import.meta.env.VITE_APTABASE_KEY ?? "";

/**
 * How long a gap makes the next event a new session, in seconds.
 *
 * One hour, matching their SDKs, so the session counts on the dashboard mean
 * what their documentation says they mean. A session here is "a stretch of
 * use", not a launch: leaving the app open overnight and coming back to it is
 * two sessions, which is the more useful reading of a worldbuilding tool
 * somebody keeps open for days.
 */
export const ANALYTICS_SESSION_TIMEOUT_SECONDS = 3600;

/**
 * What we call ourselves in `systemProps.sdkVersion`.
 *
 * Deliberately not claiming to be one of their SDKs, because it isn't one —
 * this is a few dozen lines posting to a documented endpoint. If something on
 * their side ever behaves oddly for this app, this string is what says why.
 */
export const ANALYTICS_SDK_VERSION = "anamnesis-inhouse@1";

/**
 * Every event the app is allowed to send, and the only place new ones are
 * added.
 *
 * A closed list rather than free strings, for the same reason the props rule
 * above exists: an event name assembled at a call site is one refactor away
 * from having a page title in it. Adding one here is a deliberate act, and
 * reviewing this list is how anyone checks what the app reports without
 * reading every call site.
 *
 * **Names describe what happened, never what it was about.** `page-created`
 * says a page was made; nothing says which one, what it was called, or what
 * went in it.
 */
export const ANALYTICS_EVENTS = {
  /** The app started. Carries the shell it started under, nothing else. */
  appLaunched: "app-launched",
  /** A world was opened — not which world, and never its name. */
  worldOpened: "world-opened",
  /** A page was created, with the template chosen for it. */
  pageCreated: "page-created",
  /** A sidebar block was added, with its kind. */
  blockAdded: "block-added",
  /** An import ran, with the format and whether it finished. */
  importRun: "import-run",
  /** An export ran, same idea. */
  exportRun: "export-run",
  /** An update was installed, with the version moved to. */
  updateInstalled: "update-installed",
  /** The switch in Settings was turned on or off. */
  analyticsToggled: "analytics-toggled",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/**
 * What a prop value is allowed to be.
 *
 * Their ingest takes strings, numbers and booleans. The rule that matters is
 * not the type though — it is that whatever goes in one is a value *this
 * codebase chose*, like a template key or a block kind, and never a value the
 * user typed.
 */
export type AnalyticsProps = Record<string, string | number | boolean>;
