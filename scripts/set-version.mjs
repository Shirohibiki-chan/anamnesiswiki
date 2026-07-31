// Sets the app's version everywhere it's written down.
//
//   node scripts/set-version.mjs 0.3.0
//
// Four files hold the same number, and they have to agree: package.json,
// src-tauri/tauri.conf.json, src-tauri/Cargo.toml and src-tauri/Cargo.lock.
// The one that matters most is tauri.conf.json — the updater compares the
// running app's version against latest.json, so a stale one there means every
// install's update button goes quiet and nobody finds out for a release or two.
//
// Deliberately dependency-free and deliberately not clever: no version
// arithmetic, no git tagging, no committing. It edits four files and stops.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const version = process.argv[2];
if (!version) {
  console.error("Usage: node scripts/set-version.mjs <version>   e.g. 0.3.0");
  process.exit(1);
}
// No leading "v" and no pre-release suffixes: Cargo and the updater's version
// comparison both want a plain three-part number, and quietly accepting "v0.3"
// here would produce a tag that never matches.
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Not a version: "${version}". Expected three numbers, like 0.3.0 — no "v".`);
  process.exit(1);
}

/** Replaces the first match of `pattern` (which must capture the old version in group 1). */
function replaceIn(relativePath, pattern, build) {
  const path = join(repoRoot, relativePath);
  const before = readFileSync(path, "utf8");
  const match = before.match(pattern);
  if (!match) {
    console.error(`Couldn't find the version line in ${relativePath}. Nothing has been changed in it.`);
    process.exit(1);
  }
  const after = before.replace(pattern, build);
  writeFileSync(path, after);
  console.log(`  ${relativePath}: ${match[1]} → ${version}`);
}

console.log(`Setting version to ${version}`);

replaceIn("package.json", /"version": "(\d+\.\d+\.\d+)"/, `"version": "${version}"`);
replaceIn("src-tauri/tauri.conf.json", /"version": "(\d+\.\d+\.\d+)"/, `"version": "${version}"`);
// Cargo.toml has one `version =` in [package] and possibly others under
// [dependencies]; anchoring to the start of a line and taking the first match
// keeps it to the package's own.
replaceIn("src-tauri/Cargo.toml", /^version = "(\d+\.\d+\.\d+)"/m, `version = "${version}"`);
// Cargo.lock repeats it under the crate's own [[package]] entry. Cargo would
// fix this itself on the next build, but leaving it stale means the release
// build's first act is an unexpected lockfile change.
// `\r?\n` because this repo is checked out with CRLF on Windows and LF on the
// Linux runner that verifies it, and the two have to agree.
replaceIn(
  "src-tauri/Cargo.lock",
  /(?<=name = "anamnesis"\r?\nversion = ")(\d+\.\d+\.\d+)/,
  version,
);

console.log(`\nDone. Next:\n  git commit -am "Release v${version}"\n  git tag v${version}\n  git push && git push --tags`);
