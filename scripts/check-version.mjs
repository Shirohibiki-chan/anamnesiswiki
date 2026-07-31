// Confirms the four version files agree with each other, and — when given an
// expected version — with that too.
//
//   node scripts/check-version.mjs          # do the files agree?
//   node scripts/check-version.mjs 0.3.0    # ...and do they say this?
//
// Run by the release workflow against the pushed tag, before anything spends
// twenty minutes compiling. The failure it catches is quiet and expensive: an
// installer that says one version while the updater compares another, so every
// existing install's update button stops finding anything.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath, pattern) {
  const contents = readFileSync(join(repoRoot, relativePath), "utf8");
  const match = contents.match(pattern);
  if (!match) {
    console.error(`Couldn't find a version in ${relativePath}.`);
    process.exit(1);
  }
  return { file: relativePath, version: match[1] };
}

const found = [
  read("package.json", /"version": "(\d+\.\d+\.\d+)"/),
  read("src-tauri/tauri.conf.json", /"version": "(\d+\.\d+\.\d+)"/),
  read("src-tauri/Cargo.toml", /^version = "(\d+\.\d+\.\d+)"/m),
  // `\r?\n` because this repo is checked out with CRLF on Windows and LF on
  // the Linux runner that runs this, and the two have to agree.
  read("src-tauri/Cargo.lock", /name = "anamnesis"\r?\nversion = "(\d+\.\d+\.\d+)"/),
];

const expected = process.argv[2];
const wrong = found.filter((entry) => entry.version !== (expected ?? found[0].version));

if (wrong.length > 0) {
  console.error(expected ? `Expected ${expected}, but:` : "The version files disagree:");
  for (const entry of found) console.error(`  ${entry.file}: ${entry.version}`);
  console.error("\nFix with: node scripts/set-version.mjs <version>");
  process.exit(1);
}

console.log(`Version ${found[0].version} agrees across all ${found.length} files.`);
