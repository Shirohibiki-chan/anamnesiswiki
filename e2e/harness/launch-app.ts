// Starts the real app and hands back its window.
//
// **The app under test is the built one, not a dev server.** `pnpm
// electron:dev` starts Vite and then Electron, which is right for working on
// the app and wrong for measuring it: a scenario would be racing a compiler,
// and a failure could always be blamed on hot reload. `scripts/app-tests.mjs`
// builds the page once and everything here opens that, which is also the
// artefact a release actually ships.
//
// **Nothing here can reach her real data**, and that is the property to protect
// if this file changes. Two separate things would have to be got right by
// accident for a run to touch anything of hers:
//
//   - The world is a generated one in the temp folder (see `test-world.ts`).
//   - `--user-data-dir` moves `app.getPath("userData")` somewhere temporary, so
//     the settings file the app reads and writes is one we wrote a moment ago.
//     That also sidesteps the legacy-settings copy in `electron/main.js`, which
//     reads the Tauri build's store when ours is missing — ours is never
//     missing, because `seedSettings` writes it before the app starts.
import { _electron, type ElectronApplication, type Page } from "playwright-core";
import electronBinary from "electron";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { makeTestWorld, removeQuietly, REPO_ROOT, type TestWorld, type TestWorldOptions } from "./test-world";

/** How long the window gets to appear before we call it a failure to start. */
const WINDOW_TIMEOUT_MS = 30_000;

/** How long a graceful quit gets before the process is killed instead. */
const CLOSE_TIMEOUT_MS = 10_000;

export type RunningApp = {
  /** The app's window. Everything in `screen.ts` takes this. */
  window: Page;
  /** The Playwright handle, for the rare scenario that needs the main process. */
  electron: ElectronApplication;
  /** The generated world this run opened, or null if it started on the picker. */
  world: TestWorld | null;
  /**
   * Everything the page logged as an error or threw uncaught, in order.
   *
   * **Collected for every run whether a scenario asks or not**, because the
   * cheapest real assertion this harness can make is "the app did that without
   * complaining", and a scenario cannot subscribe retroactively to a message
   * logged during startup.
   */
  errors: string[];
  /** Quits the app and deletes everything it was given. Safe to call twice. */
  close: () => Promise<void>;
};

export type LaunchOptions = TestWorldOptions & {
  /**
   * Whether to start with a world already open.
   *
   * True — the default — generates one and writes it into the settings as the
   * last-opened project, so the app routes straight into it exactly as it would
   * on her machine the morning after. False lands on the start screen instead,
   * with no recent projects, which is what a first launch looks like.
   */
  openWorld?: boolean;
};

export async function launchApp(options: LaunchOptions = {}): Promise<RunningApp> {
  assertElectronIsInstalled();
  await assertPageIsBuiltForElectron();

  const world = options.openWorld === false ? null : await makeTestWorld(options);
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "anamnesis-e2e-userdata-"));
  await seedSettings(userDataDir, world);

  const electron = await _electron.launch({
    executablePath: electronBinary as unknown as string,
    args: ["electron/main.js", `--user-data-dir=${userDataDir}`, ...linuxCiArgs()],
    cwd: REPO_ROOT,
    env: { ...process.env, ANAMNESIS_SHELL: "electron" },
    timeout: WINDOW_TIMEOUT_MS,
  });

  // **Kept because a launch that fails says nothing on its own.** Playwright's
  // answer to a window that never appears is a timeout naming the wait, not the
  // reason — so a broken install, a missing system library or a main process
  // that threw all arrive looking identical. Electron says exactly what went
  // wrong on its own stderr; this is only there to hand that back.
  const startupOutput: string[] = [];
  electron.process().stdout?.on("data", (chunk) => startupOutput.push(String(chunk)));
  electron.process().stderr?.on("data", (chunk) => startupOutput.push(String(chunk)));
  // **And the main process's console separately, because Playwright takes it.**
  // Attaching to the main process routes its console through the debugger
  // rather than the pipes above, so anything `electron/main.js` logs — or throws
  // where Electron logs it for you — is invisible to a reader of raw stderr.
  // Which is the half that matters: the pipes carried nothing useful through
  // four failed CI runs while this channel was never being read.
  electron.on("console", (message) => {
    startupOutput.push(`[main] ${message.type()}: ${message.text()}`);
  });

  let window: Page;
  try {
    window = await electron.firstWindow({ timeout: WINDOW_TIMEOUT_MS });
  } catch {
    // **Asked before quitting, and asked of the main process.** Playwright only
    // reports a window it can attach to, so "no window" covers everything from
    // a window that was never created to one that exists and is still hidden
    // because the renderer has not said it drew — which are opposite problems
    // with the same symptom. The main process can be asked either way, because
    // it is reachable without a page.
    const account = await describeWindows(electron);
    await quit(electron);
    const said = startupOutput.join("").trim();
    throw new Error(
      `The app started but never opened a window within ${WINDOW_TIMEOUT_MS / 1000}s.\n` +
        `The main process says: ${account}\n` +
        (said ? `Electron's own output:\n${said}` : "Electron printed nothing at all."),
    );
  }

  const errors: string[] = [];
  window.on("console", (message) => {
    if (message.type() !== "error") return;
    // Electron prints this into every unpackaged run. It is about the dev
    // build's CSP and says so itself; it is not the app going wrong.
    if (message.text().includes("Electron Security Warning")) return;
    errors.push(message.text());
  });
  window.on("pageerror", (error) => errors.push(String(error)));

  await window.waitForLoadState("domcontentloaded");

  let closed = false;
  const close = async () => {
    if (!closed) {
      closed = true;
      await quit(electron);
    }
    await world?.dispose();
    await removeQuietly(userDataDir);
  };

  return { window, electron, world, errors, close };
}

/**
 * What the main process thinks it has, for when Playwright says it has nothing.
 *
 * Deliberately tolerant: every part of this runs inside a failure, so it says
 * what went wrong rather than throwing a second error over the first one. If
 * even this cannot be asked, the main process is gone, which is itself the
 * answer.
 */
async function describeWindows(electron: ElectronApplication): Promise<string> {
  try {
    return await electron.evaluate(({ app, BrowserWindow }) => {
      const windows = BrowserWindow.getAllWindows();
      if (windows.length === 0) {
        // **`createWindow` runs off `app.whenReady()`, so which of these two is
        // true says where to look.** Not ready means Electron itself never
        // finished starting, and nothing in this repo is implicated. Ready with
        // no window means `createWindow` was reached and did not produce one.
        return (
          `no windows exist at all — app.isReady()=${app.isReady()}, ` +
          `DISPLAY=${process.env.DISPLAY ?? "(unset)"}.`
        );
      }
      return windows
        .map((win, index) => {
          const contents = win.webContents;
          return (
            `window ${index + 1}: ` +
            `visible=${win.isVisible()}, ` +
            `destroyed=${win.isDestroyed()}, ` +
            `loading=${contents.isLoading()}, ` +
            `crashed=${contents.isCrashed()}, ` +
            `url=${contents.getURL() || "(none)"}`
          );
        })
        .join("; ");
    });
  } catch (error) {
    return `it could not be asked (${String(error)}).`;
  }
}

/**
 * The one flag this harness adds to the app, and only on a build server.
 *
 * **Chromium's setuid sandbox needs a helper binary that is configured on a
 * desktop and generally is not in a CI container**, and Electron refuses to
 * start rather than run without it. `--no-sandbox` is the standard answer; it
 * turns off the operating system's process sandbox, not the app's own
 * arrangements — `contextIsolation` stays on, `nodeIntegration` stays off, and
 * the preload still exposes the same fixed list — so the scenarios are still
 * exercising the same door.
 *
 * **Narrowed to CI on Linux on purpose.** A run on somebody's own Linux desktop
 * keeps the sandbox, which is where a sandbox-related problem would be worth
 * hearing about. Nothing here can reach a shipped build: this is an argument to
 * one child process started by a test run.
 */
function linuxCiArgs(): string[] {
  return process.platform === "linux" && process.env.CI ? ["--no-sandbox"] : [];
}

/**
 * The settings file the app finds on its first read.
 *
 * **Three of these four keys exist to stop a first launch getting in the way**
 * rather than to set anything up. A fresh settings folder means a fresh set of
 * preferences, which means the one-time analytics notice would be sitting over
 * the window of every scenario; `analyticsNoticeSeen` puts the app in the state
 * every subsequent launch is in. `analytics: false` is belt and braces on top
 * of that — development runs do not report anyway, but a test run is not a
 * person and has no business appearing in a dashboard either way.
 *
 * `projectsDir` is pointed somewhere temporary for the same reason as the world
 * is: anything the app decides to create on its own lands there instead of in
 * her Documents.
 */
async function seedSettings(userDataDir: string, world: TestWorld | null): Promise<void> {
  const settings: Record<string, unknown> = {
    projectsDir: path.join(userDataDir, "Projects"),
    preferences: { analytics: false, analyticsNoticeSeen: true },
  };
  if (world) {
    settings.lastOpenedProject = world.path;
    settings.recentProjects = [
      { path: world.path, name: path.basename(world.path), lastOpenedAt: Date.now() },
    ];
  }
  await fs.writeFile(
    path.join(userDataDir, "app-settings.json"),
    JSON.stringify(settings, null, 2),
    "utf8",
  );
}

/**
 * **Electron the package is not Electron the program.** The npm package is a
 * few kilobytes of JavaScript holding the path to a binary its postinstall
 * downloads, so a checkout where that step did not run has an `electron` import
 * that resolves happily and points at nothing. Launching it produces a process
 * that dies immediately and a window that never arrives — which reads as the
 * app being broken rather than as never having been installed.
 *
 * Cost this suite its first CI run on 2026-08-26. See `pnpm-workspace.yaml`.
 */
function assertElectronIsInstalled(): void {
  const binary = electronBinary as unknown as string;
  if (typeof binary === "string" && existsSync(binary)) return;
  throw new Error(
    `Electron's binary isn't on disk (expected ${binary}).\n` +
      "The npm package is only a pointer; its postinstall fetches the program.\n" +
      "Run `pnpm install`, and check that `allowBuilds` in pnpm-workspace.yaml lists electron.",
  );
}

/**
 * **The failure this guards against is silent, which is why it is worth a
 * check rather than a note in a readme.** A page built for Tauri installs
 * fine, opens fine and cannot read a single file, because the shell resolver
 * in `vite.config.ts` only swaps the door when `ANAMNESIS_SHELL=electron` is
 * set. Told apart by the asset paths: the Electron build makes them relative,
 * because it is opened from a file rather than served. Same trap
 * `scripts/electron-package.mjs` exists to avoid.
 */
async function assertPageIsBuiltForElectron(): Promise<void> {
  const indexPath = path.join(REPO_ROOT, "dist", "index.html");
  let html: string;
  try {
    html = await fs.readFile(indexPath, "utf8");
  } catch {
    throw new Error(
      `No built page at ${indexPath}.\nRun \`pnpm test:app\`, which builds it first.`,
    );
  }
  if (!/(src|href)="\.\/assets\//.test(html)) {
    throw new Error(
      "dist/ holds a page built for Tauri, not Electron — its asset paths are absolute.\n" +
        "That build opens to a window that cannot read a single file.\n" +
        "Run `pnpm test:app`, which builds the right one.",
    );
  }
}

/**
 * Quits, and kills if quitting does not take.
 *
 * **The app is allowed to refuse to close.** `window:watchClose` lets the
 * renderer hold the close while it finishes writing, which is the right
 * behaviour for someone's world and a way to hang a test run forever if
 * anything above the door goes wrong. A scenario that ends in a hang tells you
 * nothing; one that ends in a killed process at least ends.
 */
async function quit(electron: ElectronApplication): Promise<void> {
  const timeout = new Promise<"timeout">((resolve) =>
    setTimeout(() => resolve("timeout"), CLOSE_TIMEOUT_MS),
  );
  const outcome = await Promise.race([electron.close().then(() => "closed" as const), timeout]);
  if (outcome === "timeout") electron.process().kill();
}
