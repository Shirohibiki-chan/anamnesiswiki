// What the app writes down when it falls over, kept on this machine and sent
// nowhere.
//
// **Nothing here leaves the disk, and that is what lets the record be
// complete.** Usage reporting was removed on 2026-08-27, and a crash report is
// the one thing that could never have replaced it honestly: an error message
// carries file paths, and a file path carries a world's name and a page's
// title. Uploading that would have broken the promise the events were built to
// keep. Writing it to a file the person who crashed can read turns the same
// fact around — the details are worth having *because* they are specific, and
// the only reader is the one they are about. See `docs/plan.md` → Phase 29.
//
// A file of its own rather than a key in `app-settings.json`: settings are read
// on every launch, and a run of crashes should not make that read heavier.
import { appVersion, openKeyValueStore, type KeyValueStore } from "./host-service";

const CRASH_FILE = "crash-log.json";
const CRASHES_KEY = "crashes";

/**
 * How many crashes are kept, newest first.
 *
 * Five rather than one, because the interesting case is a crash that repeats —
 * and rather than fifty, because nobody reads the fiftieth and the file is
 * meant to stay small enough to paste.
 */
export const MAX_CRASHES = 5;

/**
 * Where it came from.
 *
 * `render` is React giving up on drawing the window, and it is the only one
 * that puts a panel on screen. The other two are recorded and nothing more: a
 * rejected promise usually leaves the app perfectly usable, and blanking the
 * window over one would be a worse bug than the one being reported.
 */
export type CrashKind = "render" | "error" | "rejection";

export type CrashRecord = {
  /** Epoch milliseconds, so the file stays readable in any timezone. */
  at: number;
  kind: CrashKind;
  name: string;
  message: string;
  stack: string | null;
  /** React's trace of which components were on screen. `render` only. */
  componentStack: string | null;
  version: string;
  userAgent: string;
};

/**
 * The version, read once at startup and remembered.
 *
 * Asking the shell for it takes a round trip, and the moment it is wanted is
 * the moment the app has just fallen over — the worst time to depend on
 * anything still working. Startup is minutes earlier and calm, so the answer
 * is fetched there and this is a plain string by the time it matters.
 */
let knownVersion = "unknown";

let storePromise: Promise<KeyValueStore> | null = null;
let handlersInstalled = false;

function getStore(): Promise<KeyValueStore> {
  if (!storePromise) storePromise = openKeyValueStore(CRASH_FILE);
  return storePromise;
}

/**
 * Whatever was thrown, as three strings.
 *
 * Anything at all can be thrown in JavaScript, and the things that are not
 * `Error`s turn up exactly when something is already going wrong. Every branch
 * here ends in something printable rather than in a second failure.
 */
function describeThrown(value: unknown): { name: string; message: string; stack: string | null } {
  if (value instanceof Error) {
    return { name: value.name || "Error", message: value.message, stack: value.stack ?? null };
  }
  if (typeof value === "string") return { name: "Error", message: value, stack: null };
  try {
    return { name: "Error", message: JSON.stringify(value) ?? String(value), stack: null };
  } catch {
    // A value whose own serialisation throws is not a thing anyone has seen,
    // but this function running mid-crash is the whole reason it exists.
    return { name: "Error", message: "Something was thrown that could not be described.", stack: null };
  }
}

/**
 * A record, built without touching the disk or the shell.
 *
 * Synchronous on purpose: the error boundary needs something to render the
 * instant React hands it an error, and saving can happen in its own time.
 */
export function buildCrash(kind: CrashKind, thrown: unknown, componentStack: string | null = null): CrashRecord {
  const { name, message, stack } = describeThrown(thrown);
  return {
    at: Date.now(),
    kind,
    name,
    message,
    stack,
    componentStack,
    version: knownVersion,
    userAgent: typeof navigator === "undefined" ? "unknown" : navigator.userAgent,
  };
}

function isCrashRecord(value: unknown): value is CrashRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Partial<CrashRecord>;
  return typeof record.at === "number" && typeof record.message === "string";
}

/** The newest few, newest first. An unreadable file reads as none. */
export async function getCrashes(): Promise<CrashRecord[]> {
  try {
    const store = await getStore();
    const saved = await store.get<unknown>(CRASHES_KEY);
    if (!Array.isArray(saved)) return [];
    return saved.filter(isCrashRecord).slice(0, MAX_CRASHES);
  } catch {
    return [];
  }
}

/**
 * Writes one down.
 *
 * **This cannot be allowed to throw.** It runs while the app is already
 * failing, and a crash logger that crashes replaces a bad situation with an
 * incomprehensible one — so every path out of here is a quiet one, and nothing
 * on screen depends on this having worked.
 */
export async function persistCrash(record: CrashRecord): Promise<void> {
  try {
    const store = await getStore();
    const existing = await getCrashes();
    await store.set(CRASHES_KEY, [record, ...existing].slice(0, MAX_CRASHES));
    await store.save();
  } catch {
    // Nothing to do, and nowhere to say it. The panel still has the details and
    // the copy button still works, because both read the record in memory.
  }
}

/** Both at once, for callers that want the record back straight away. */
export function recordCrash(kind: CrashKind, thrown: unknown, componentStack: string | null = null): CrashRecord {
  const record = buildCrash(kind, thrown, componentStack);
  void persistCrash(record);
  return record;
}

/** What each kind is called in English rather than in code. */
export function describeKind(kind: CrashKind): string {
  if (kind === "render") return "while drawing the window";
  if (kind === "rejection") return "a background task failed";
  return "an unhandled error";
}

/**
 * The plain-text version, which is what the copy button puts on the clipboard.
 *
 * Shaped to be pasted into a message or an issue by somebody who is already
 * annoyed: what and when at the top, the trace underneath, and no JSON braces
 * to wade through. It is deliberately the same text the panel shows, so nobody
 * has to wonder whether the button copied more than it displayed.
 */
export function describeCrash(record: CrashRecord): string {
  const when = new Date(record.at).toLocaleString();
  const lines = [
    `Anamnesis ${record.version}`,
    `${when} — ${describeKind(record.kind)}`,
    record.userAgent,
    "",
    `${record.name}: ${record.message}`,
  ];
  if (record.stack) lines.push("", record.stack);
  if (record.componentStack) lines.push("", "Components on screen:", record.componentStack.trim());
  return lines.join("\n");
}

/**
 * Catches what React's error boundary cannot: a throw from a timer, a handler
 * outside the tree, a promise nobody awaited.
 *
 * **These are recorded and nothing else happens.** The app is usually still
 * working after one, and taking the window away would turn a bug somebody
 * might not have noticed into one they cannot get past. They surface in
 * Settings → Privacy, which is where the log is explained.
 *
 * Called once from `main.tsx`, before React, so a crash during the very first
 * render is already covered.
 */
export function installCrashHandlers(): void {
  if (handlersInstalled) return;
  handlersInstalled = true;

  // Fetched here rather than where it is used — see `knownVersion`. A shell
  // that cannot answer (a plain browser tab under `pnpm dev`) leaves it alone.
  void appVersion()
    .then((version) => {
      knownVersion = version;
    })
    .catch(() => {});

  window.addEventListener("error", (event) => {
    // A failed image or stylesheet fires this too, with no error on it and the
    // element as the target. That is not a crash, and it does not belong in a
    // file people are asked to read.
    if (!(event instanceof ErrorEvent) || event.error == null) return;
    recordCrash("error", event.error);
  });

  window.addEventListener("unhandledrejection", (event) => {
    recordCrash("rejection", event.reason);
  });
}
