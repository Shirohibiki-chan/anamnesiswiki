// What the app knows about itself, shaped into something somebody can file.
//
// **The app fills in the boring half and never presses send.** A report needs
// a version, an operating system and which of the two builds is running, and
// nobody should have to go and look those up while annoyed — but the sentence
// describing what went wrong is the part only a person can write, and the
// button that submits it is on GitHub's page, not in here. Everything this
// file produces is visible on screen before it goes anywhere.
//
// Prefilling rather than posting is also what keeps this honest against
// `CLAUDE.md` → Two Promises. A crash record carries file paths, and a file
// path carries a world's name and a page's title; handing that to a form the
// reporter reads first is a different act from uploading it, and it is the
// only one of the two this app does.
import { BUG_REPORT_BUILD_FIELD, BUG_REPORT_FORM, bugReportUrl } from "../constants/links";
import { describeCrash, type CrashRecord } from "./crash-log-service";
import { appVersion, openInBrowser, shellName } from "./host-service";

/**
 * How much prefilled text is put in the URL.
 *
 * GitHub stops honouring a `new issue` link somewhere past 8KB of URL, and
 * percent-encoding a stack trace roughly triples it — newlines, colons and
 * slashes are all escaped — so the budget in characters is far smaller than it
 * looks. 1500 comfortably holds the build lines plus the error and the top of
 * its trace, and the full text goes on the clipboard at the same moment, which
 * is the copy that has no limit.
 */
export const MAX_PREFILL = 1500;

/** What the build is, with nothing that needed a round trip to the disk. */
export type BuildFacts = {
  version: string;
  shell: string;
  system: string;
  userAgent: string;
};

/**
 * Which operating system, in the words somebody would use for it.
 *
 * Coarse on purpose: the user agent can say `Windows NT 10.0` for both Windows
 * 10 and 11, and it cannot say Fedora at all. Guessing a number that turns out
 * wrong sends whoever reads the report looking at the wrong system, so this
 * answers only what the string actually proves and leaves the raw line
 * underneath it for anything finer.
 */
export function describeSystem(userAgent: string): string {
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(userAgent)) return "macOS";
  if (/Android/i.test(userAgent)) return "Android";
  if (/Linux|X11/i.test(userAgent)) return "Linux";
  return "an unknown system";
}

/**
 * The build's own description, as the lines that go at the top of a report.
 *
 * The shell is named because the version alone cannot tell the two apart — the
 * Tauri and Electron builds have shipped under the same number, which is a
 * known bug and not something a bug report should have to work around.
 */
export function describeBuild(facts: BuildFacts): string {
  return [`Anamnesis ${facts.version} — ${facts.shell} build`, `Running on ${facts.system}`, facts.userAgent].join("\n");
}

/**
 * The build as a crash record remembers it.
 *
 * The crash panel uses this rather than asking the shell, for the reason the
 * crash log itself records: the moment these facts are wanted is the moment
 * the app has just fallen over, which is the worst time to depend on anything
 * still answering. The record was filled in when the app was healthy.
 *
 * The shell is the one thing a record cannot supply — it is not in the file —
 * so it is read here, where it is a constant baked into the build rather than
 * a call to anything.
 */
export function factsFromCrash(crash: CrashRecord): BuildFacts {
  return {
    version: crash.version,
    shell: shellName(),
    system: describeSystem(crash.userAgent),
    userAgent: crash.userAgent,
  };
}

/**
 * Everything the app can say, with the crash appended when there was one.
 *
 * The version appears twice when there is a crash — once for the build that is
 * running and once inside the crash's own text — and that is worth keeping:
 * the log survives updates, so the crash being reported may have happened on a
 * version that is no longer installed.
 */
export function reportDetails(facts: BuildFacts, crash: CrashRecord | null): string {
  const build = describeBuild(facts);
  if (!crash) return build;
  return [build, "", "The last thing that went wrong:", describeCrash(crash)].join("\n");
}

/**
 * The same text, cut to what a URL will carry.
 *
 * It says it was cut, and where the rest is. A prefill that silently stops
 * mid-trace looks like the app collected half a crash rather than like a
 * limit, and the missing half is already on the clipboard by the time anyone
 * reads this.
 */
export function trimForUrl(details: string, limit = MAX_PREFILL): string {
  if (details.length <= limit) return details;
  const note = "\n\n(Trimmed to fit the link — the whole thing is on your clipboard, ready to paste.)";
  return `${details.slice(0, Math.max(0, limit - note.length)).trimEnd()}${note}`;
}

/** Where "Open a bug report" goes, with the build details already in the form. */
export function reportUrl(details: string): string {
  const params = new URLSearchParams({
    template: BUG_REPORT_FORM,
    labels: "bug",
    [BUG_REPORT_BUILD_FIELD]: trimForUrl(details),
  });
  return bugReportUrl(params);
}

/**
 * Asks the shell for what only it knows.
 *
 * A shell that cannot answer — a plain browser tab under `pnpm dev` — leaves
 * the version as `unknown` rather than failing, because a report missing one
 * line is worth more than a button that does nothing.
 */
export async function collectBuildFacts(): Promise<BuildFacts> {
  const userAgent = typeof navigator === "undefined" ? "unknown" : navigator.userAgent;
  let version = "unknown";
  try {
    version = await appVersion();
  } catch {
    // Left as "unknown". Whoever reads the report can still see the build from
    // the user agent and the shell name below.
  }
  return { version, shell: shellName(), system: describeSystem(userAgent), userAgent };
}

/** Hands the prefilled form to the system browser. Not a fetch — a link. */
export async function openBugReport(details: string): Promise<void> {
  await openInBrowser(reportUrl(details));
}
