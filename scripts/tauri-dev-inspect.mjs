// Runs `tauri dev` with the webview's remote-inspection port open, so the real
// desktop window can be read and scripted from outside it.
//
//   pnpm tauri:inspect          # port 9222
//   pnpm tauri:inspect 9333     # some other port
//
// **Why this exists.** Everything about this app that's worth checking — the
// tree, the themes, a page with her actual writing in it — only exists inside
// the Tauri window. `pnpm dev` in a browser has no disk, so it stops at the
// project picker with nothing to look at, and a hand-assembled copy of a
// component is a drawing of the thing rather than the thing: on 2026-08-13 one
// shipped three bugs in a single PR, including one that blanked the whole app.
// With this, the running window answers questions directly.
//
// **Why it can't reach a release build.** It sets an environment variable for
// one child process and runs `tauri dev`. There is no path from here to
// `tauri build`, nothing is written to any config file, and the variable is
// gone when the process exits. That separation is the entire safety argument
// and it must stay that way — a shipped desktop app holding someone's private
// worlds must never sit there accepting connections. See CLAUDE.md's Policy
// Boundary, and note that this is *inbound* rather than outbound: nothing is
// sent anywhere, but anything already on the machine could drive the app.
//
// The port is bound to loopback by the webview itself, so it isn't reachable
// from the network.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const port = process.argv[2] ?? "9222";
if (!/^\d+$/.test(port)) {
  console.error(`Not a port number: ${port}`);
  process.exit(1);
}

// Each platform's Tauri window is a different browser engine, so there is no
// single switch. Windows is the one that's actually used and the only one
// verified (2026-08-14); the others are written from their engines' documented
// variables and are untested here.
//
// On Windows, `--remote-allow-origins` is not optional padding: without it the
// debugger serves its HTTP endpoints but rejects the WebSocket handshake that
// carries the protocol, and it fails as a bare connection error with nothing
// naming the cause.
const inspectionEnv = {
  win32: { WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-allow-origins=*` },
  linux: { WEBKIT_INSPECTOR_SERVER: `127.0.0.1:${port}` },
}[process.platform];

if (!inspectionEnv) {
  // macOS has no port to open — WKWebView is inspected by attaching Safari's
  // Web Inspector to the running app, which needs no help from here.
  console.warn(`No inspection port on ${process.platform}; starting a normal dev build.`);
} else {
  console.log(`Inspection port: ${port}. Dev build only — see the note at the top of this file.`);
}

// One string rather than a command plus an args array, because `shell: true`
// with separate args is deprecated as of Node 22 and prints a warning over the
// dev server's output every single launch. Nothing here is interpolated — the
// port went into the environment above, not into this line.
const child = spawn("pnpm tauri dev", {
  cwd: repoRoot,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ...inspectionEnv },
});

child.on("exit", (code, signal) => {
  // Ctrl+C reaches the child directly, and it exits by signal rather than with
  // a code. Reporting that as a failure is noise on the normal way to stop.
  process.exit(signal ? 0 : (code ?? 0));
});
