// Prints one version's section of RELEASES.md, for the release workflow to use
// as the release body.
//
//   node scripts/release-notes.mjs 0.3.0
//
// This exists because the body isn't only what the releases page shows. The
// updater's `latest.json` carries a `notes` field, tauri-action fills it from
// the body **at build time**, and that field is what Settings → Updates puts on
// screen. So a body left as a placeholder can't be corrected afterwards by
// editing the release on the web: the page would change and the update panel
// would not, because its copy was baked when the tag was pushed. Getting the
// real notes in has to happen here, before the build.
//
// The heading is dropped: GitHub titles the release already, and the update
// panel's own headline says which version it's offering.
//
// Kept in step with `src/services/release-history.ts`, which splits the same
// file for the in-app Patch Notes panel. Two readers of one file — but the app
// imports it through Vite's `?raw`, which a workflow step has no way to run, so
// this parses it again rather than sharing a module across that boundary. The
// heading shape is the contract between them; both are tested against the real
// file.
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * `## v0.3.0 — 2026-08-08`, with any dash and an optional date. Three numbers
 * are required, which is what stops it matching `## Release notes` or another
 * second-level heading added later.
 */
const VERSION_HEADING = /^##\s+v?(\d+\.\d+\.\d+)\s*(?:[—–-]\s*(.*))?$/;

/** The body of one version's section, or null if the file has no such version. */
export function releaseNotesFor(version, markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const body = [];
  let inside = false;

  for (const line of lines) {
    const heading = VERSION_HEADING.exec(line.trim());
    if (heading) {
      // The next version's heading ends this one — the file runs newest first,
      // so without this the top section would swallow the whole history.
      if (inside) break;
      inside = heading[1] === version;
      continue;
    }
    if (inside) body.push(line);
  }

  if (!inside && body.length === 0) return null;
  // The `---` rules separate sections in the file and mean nothing inside one.
  return body.join("\n").replace(/(?:\s*^-{3,}\s*$)+/gm, "").trim() || null;
}

// Only when run as a command, so the test can import the function above.
// Compared as URLs rather than by pasting the path into a `file://` string:
// a Windows path produces `file:///C:/…` and the hand-built one produced
// `file://C:/…`, which never matched — so this whole block quietly did nothing
// and the script printed an empty release body while exiting 0.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const version = process.argv[2];
  if (!version) {
    console.error("Usage: node scripts/release-notes.mjs <version>");
    process.exit(1);
  }

  const notes = releaseNotesFor(version, readFileSync(join(repoRoot, "RELEASES.md"), "utf8"));
  // Loudly, not quietly. A release whose notes are missing should stop the
  // build and be fixed, rather than ship a version whose update panel has
  // nothing to say — which is the exact failure this script was written for.
  if (!notes) {
    console.error(`RELEASES.md has no section for ${version}. Write one before tagging — see docs/releasing.md.`);
    process.exit(1);
  }
  process.stdout.write(notes);
}
