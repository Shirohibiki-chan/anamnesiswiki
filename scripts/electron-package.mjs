// Builds the page for Electron, then packs it into something installable.
//
//   pnpm electron:package             # installer for this machine's platform
//   pnpm electron:package --dir       # unpacked, for looking inside quickly
//
// **Two steps in one command because the first is easy to forget.** The page
// has to be built with `ANAMNESIS_SHELL=electron` — that is what swaps the door
// to the Electron one and makes the asset paths relative. Packing a page built
// for Tauri produces an installer that looks right, installs fine, and opens to
// a window that cannot read a single file. That failure is silent enough to
// reach somebody's machine, which is why this isn't two lines in a README.
//
// Anything after the command is handed to electron-builder, so
// `--linux`, `--win`, `--dir` and friends work as they normally would.
import { spawn } from "node:child_process";

const passThrough = process.argv.slice(2);
const shellEnv = { ...process.env, ANAMNESIS_SHELL: "electron" };

/** Runs one command, inheriting the terminal, and resolves with its code. */
function run(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { env, stdio: "inherit" });
    child.on("exit", (code) => resolve(code ?? 0));
  });
}

const typeCheck = await run("node", ["node_modules/typescript/bin/tsc", "--noEmit"], shellEnv);
if (typeCheck !== 0) process.exit(typeCheck);

const built = await run("node", ["node_modules/vite/bin/vite.js", "build"], shellEnv);
if (built !== 0) process.exit(built);

const packed = await run(
  "node",
  ["node_modules/electron-builder/cli.js", ...passThrough],
  shellEnv,
);
process.exit(packed);
