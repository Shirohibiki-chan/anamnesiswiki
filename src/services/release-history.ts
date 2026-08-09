// Splits RELEASES.md into one entry per published version.
//
// **The file is bundled into the app at build time, not fetched.** That's the
// whole design: the Patch Notes panel opens instantly, works with no internet,
// and adds no network call to an app that deliberately has only two. The
// tradeoff is that it can only ever show versions up to the one installed —
// which is the honest thing for a "what's in the copy you're running" screen,
// and the Updates panel already covers the other direction by fetching the
// notes for a version you *don't* have yet.
//
// Rendering is `release-notes.ts` — same parser the update panel uses, so a
// release reads identically in both places, and the same no-HTML rule applies.
import releasesMarkdown from "../../RELEASES.md?raw";

export type ReleaseHistoryEntry = {
  /** The version as written in the heading, without the `v` — e.g. `0.3.0`. */
  version: string;
  /** The date beside it, as written, or null if the heading had none. */
  date: string | null;
  /** The section's markdown, headline excluded. */
  body: string;
};

// `## v0.3.0 — 2026-08-08`. The dash is an em-dash in the file; any dash is
// accepted so a hand-typed hyphen doesn't silently drop the date. The version
// must be three numbers, which is what keeps this from matching `## Release
// notes` or any other second-level heading someone adds later.
const VERSION_HEADING = /^##\s+v?(\d+\.\d+\.\d+)\s*(?:[—–-]\s*(.*))?$/;

/**
 * Every version in RELEASES.md, newest first — the order the file is written
 * in. Returns an empty array if the file has no version headings at all,
 * which is a bad build rather than something to render around.
 */
export function parseReleaseHistory(markdown: string = releasesMarkdown): ReleaseHistoryEntry[] {
  const entries: ReleaseHistoryEntry[] = [];
  let current: { version: string; date: string | null; lines: string[] } | null = null;

  function end() {
    if (!current) return;
    entries.push({
      version: current.version,
      date: current.date,
      // Trailing `---` rules separate the sections in the file and carry no
      // meaning inside one. Leading and trailing blank lines go the same way.
      body: current.lines.join("\n").replace(/(?:\s*^-{3,}\s*$)+/gm, "").trim(),
    });
    current = null;
  }

  for (const raw of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const heading = VERSION_HEADING.exec(raw.trim());
    if (heading) {
      end();
      current = { version: heading[1], date: heading[2]?.trim() || null, lines: [] };
      continue;
    }
    if (current) current.lines.push(raw);
  }

  end();
  return entries;
}

/**
 * The newest `count` versions. Fewer if the file holds fewer — early in a
 * project's life it will, and a panel asking for three shouldn't have to care.
 */
export function recentReleases(count: number, markdown?: string): ReleaseHistoryEntry[] {
  return parseReleaseHistory(markdown).slice(0, count);
}
