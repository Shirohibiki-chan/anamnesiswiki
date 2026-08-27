// Builds the page for Electron, then runs the scenarios in `e2e/` against it.
//
//   pnpm test:app                            # build, then run everything
//   pnpm test:app --no-build                 # reuse what is already in dist/
//   pnpm test:app --show                     # watch it happen, on the screen
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
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const skipBuild = args.includes("--no-build");
// **The window stays off the screen unless you ask for it.** The suite launches
// the app once per scenario file, and windows appearing on top of your work and
// stealing the keyboard six times is the difference between a check you run and
// one you avoid. `--show` puts it back on the desk for the run, which is what
// you want when a scenario is failing and the assertions are not saying why.
const showWindow = args.includes("--show");
const passThrough = args.filter((argument) => argument !== "--no-build" && argument !== "--show");
const shellEnv = {
  ...process.env,
  ANAMNESIS_SHELL: "electron",
  ...(showWindow ? { ANAMNESIS_SHOW_WINDOW: "1" } : {}),
};

/** Runs one command, inheriting the terminal, and resolves with its code. */
function run(command, commandArgs, env) {
  return new Promise((resolve) => {
    const child = spawn(command, commandArgs, { env, stdio: "inherit" });
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

// **Electron the npm package is not Electron the program.** The package is a
// pointer; the program is fetched by its install step, which pnpm only runs for
// packages named in `allowBuilds` (pnpm-workspace.yaml). On a checkout where
// that did not happen, importing `electron` kicks the download off *lazily* —
// and then the first test races a 100 MB extract, which is exactly how this
// suite failed its first three CI runs on 2026-08-26.
//
// So it is fetched here instead, where waiting for it is the whole point.
// Electron's own installer is what pnpm would have run and does nothing when
// the program is already there, so on a normal checkout this is one `existsSync`
// and no output.
if (!existsSync("node_modules/electron/dist")) {
  console.log("Electron isn't installed yet — fetching it before the tests start.");
  const fetched = await run("node", ["node_modules/electron/install.js"], shellEnv);
  if (fetched !== 0) process.exit(fetched);
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
