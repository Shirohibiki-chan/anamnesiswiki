// Runs the app inside Electron against a dev server, with hot reload.
//
//   pnpm electron:dev              # just run it
//   pnpm electron:inspect          # same, plus a port to read the window from
//   pnpm electron:inspect 9333     # some other port
//
// **Why this exists as a script rather than two commands.** Electron has to be
// told where the page is, and it must not be started before the page is there —
// a window that loads nothing shows an error page and stays showing it, because
// nothing reloads a failed navigation. So this starts Vite, waits for it to
// answer, and only then opens the window.
//
// **It runs on its own port (1430).** Phase 29 is being built while the Tauri
// build is still the real one, and hers is usually already running on 1420. Two
// dev servers, two shells, one working tree — until step 3 turns the Electron
// build into the shipped one.
import { spawn } from "node:child_process";
import electronBinary from "electron";

// **Inspection is off unless asked for, and it is a dev-only arrangement.**
// A listening debug port is arbitrary code execution inside the app holding
// her worlds, so it must never reach a shipped build: this sets a flag on one
// child process, writes nothing to any config file, and the flag is gone when
// the process exits. That separation is the whole safety argument and it has to
// stay that way — the same reasoning as scripts/tauri-dev-inspect.mjs, which
// this replaces for the Electron shell.
//
// Unlike the Tauri one, there is no per-platform guesswork here. Electron is
// Chromium everywhere, so the same switch works on all three, and there is no
// `--remote-allow-origins` dance because the debugger is not being reached
// through a webview host.
const wantsInspection = process.argv.includes("--inspect");
const portArgument = process.argv.find((argument) => /^\d+$/.test(argument));
const inspectionPort = portArgument ?? "9222";

const PORT = 1430;
const URL = `http://localhost:${PORT}`;
const READY_TIMEOUT_MS = 60_000;

const shellEnv = { ...process.env, ANAMNESIS_SHELL: "electron" };

/** @type {import("node:child_process").ChildProcess[]} */
const children = [];

function stopEverything(code) {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

async function waitForServer() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(URL, { method: "GET" });
      if (response.ok) return;
    } catch {
      // Not up yet. Vite takes a couple of seconds from cold.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  console.error(`Vite never answered on ${URL}. Nothing to show Electron.`);
  stopEverything(1);
}

const vite = spawn("node", ["node_modules/vite/bin/vite.js"], {
  env: shellEnv,
  stdio: "inherit",
});
children.push(vite);
vite.on("exit", (code) => stopEverything(code ?? 0));

await waitForServer();

if (wantsInspection) {
  console.log(`Inspection port: ${inspectionPort}. Dev only — see the note at the top of this file.`);
}

const electron = spawn(
  electronBinary,
  wantsInspection
    ? ["electron/main.js", `--remote-debugging-port=${inspectionPort}`]
    : ["electron/main.js"],
  {
    env: { ...shellEnv, ANAMNESIS_DEV_URL: URL },
    stdio: "inherit",
  },
);
children.push(electron);
electron.on("exit", (code) => stopEverything(code ?? 0));

process.on("SIGINT", () => stopEverything(0));
process.on("SIGTERM", () => stopEverything(0));
