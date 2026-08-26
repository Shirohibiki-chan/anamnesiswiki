// Builds the page for Electron, then runs the scenarios in `e2e/` against it.
//
//   pnpm test:app                            # build, then run everything
//   pnpm test:app --no-build                 # reuse what is already in dist/
//   pnpm test:app e2e/awkward-names.e2e.ts   # one file
//
// **Two steps in one command for the same reason as
// `scripts/electron-package.mjs`: the first is easy to forget and its failure
// is silent.** The page has to be built with `ANAMNESIS_SHELL=electron`, which
// is what swaps the door to the Electron one. A page built for Tauri opens to a
// window that cannot read a single file — so a suite run against one would fail
// with sixteen mysterious timeouts rather than one clear message.
// `launchApp` checks for that mistake too, in case somebody runs vitest
// directly; this is the arrangement that stops it happening in the first place.
//
// **The build is a real cost and can be skipped.** It is around twenty seconds,
// which is fine once and tiresome while writing a scenario — `--no-build` is
// for the second and subsequent runs when only the test file has changed.
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const skipBuild = args.includes("--no-build");
const passThrough = args.filter((argument) => argument !== "--no-build");
const shellEnv = { ...process.env, ANAMNESIS_SHELL: "electron" };

/** Runs one command, inheriting the terminal, and resolves with its code. */
function run(command, commandArgs, env) {
  return new Promise((resolve) => {
    const child = spawn(command, commandArgs, { env, stdio: "inherit" });
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

if (!skipBuild) {
  const built = await run("node", ["node_modules/vite/bin/vite.js", "build"], shellEnv);
  if (built !== 0) process.exit(built);
}

const ran = await run(
  "node",
  ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.e2e.config.ts", ...passThrough],
  shellEnv,
);
process.exit(ran);
