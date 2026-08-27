// The Electron main process — the other side of the door (Phase 29 step 2).
//
// **Everything here answers a question from `host-service.electron.ts`**, and
// the channel names match the contract's function names one for one, so the two
// files can be read side by side. Nothing in here decides anything about
// worlds, pages or files: the renderer says "read this path", this says what
// the disk answered. All the judgement stays above the door where it is
// testable without a shell — see `src/services/host-contract.ts`.
//
// **Why the renderer touches no Node at all.** `contextIsolation` is on,
// `nodeIntegration` is off and the preload is sandboxed, so the page gets a
// fixed list of functions and nothing else — no `require`, no `fs`, no way to
// reach the filesystem except through the handlers below. That is the same
// shape Tauri enforced from Rust, kept deliberately rather than inherited.
import { app, BrowserWindow, dialog, ipcMain, Menu, net, shell } from "electron";
import electronUpdater from "electron-updater";
import fs from "node:fs/promises";
import { watch as watchFs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// **Both of these have to happen before anything asks Electron a question**,
// because the answers depend on them.
//
// The name decides where settings live (`%APPDATA%/Anamnesis` rather than
// `%APPDATA%/anamnesis`), and it has to match between a run from source and an
// installed build or the two keep separate settings.
//
// The app id is what Windows uses to decide which windows belong to which
// program — taskbar grouping, pinning, notifications, and the icon on the title
// bar. **Left unset, an unpackaged Electron app shares whatever default is
// lying around**, and this app was seen wearing another Electron app's icon on
// 2026-08-25 because of exactly that. It matches `tauri.conf.json`'s identifier
// so an installed Anamnesis keeps its identity across the shell change.
app.setName("Anamnesis");
app.setAppUserModelId("com.anamnesis.app");

/**
 * The app's own version, read from its `package.json` rather than asked of
 * Electron.
 *
 * **`app.getVersion()` answers 44.0.0 in development** — Electron's version,
 * not this app's — because an unpackaged run has no packaged manifest to read.
 * That number is on the start screen, so it would have been wrong in front of
 * anyone running from source. The file sits beside this one in a packaged build
 * too, inside the asar, so one path covers both.
 */
async function readAppVersion() {
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(here, "..", "package.json"), "utf8"));
    return typeof manifest.version === "string" ? manifest.version : app.getVersion();
  } catch {
    return app.getVersion();
  }
}

/** Where the page comes from: the dev server if one was named, else the build. */
const DEV_URL = process.env.ANAMNESIS_DEV_URL ?? null;

/**
 * What this process knows about each of its windows.
 *
 * **A second window is an ordinary thing now, so nothing about a window may
 * live in a module-level variable.** These three were `mainWindow`,
 * `rendererWantsCloseSay` and `closeApproved` — one set of each, shared by
 * whatever window happened to be open. With two windows that is not a tidiness
 * problem but a correctness one: approving the close of one window approved the
 * close of the other, and a dialog opened from either was parented to whichever
 * was created last.
 *
 * Keyed by the window itself and deleted when it closes, so a window's state
 * lives exactly as long as the window does.
 *
 * `projectPath` is what makes "focus the window that already has this project"
 * answerable — see `window:focusProject`. Null while a window is sitting on the
 * picker, which is every window's starting state.
 *
 * @type {Map<BrowserWindow, { wantsCloseSay: boolean, closeApproved: boolean, projectPath: string | null }>}
 */
const windows = new Map();

/** This window's state, created on first ask. */
function stateOf(window) {
  let state = windows.get(window);
  if (!state) {
    state = { wantsCloseSay: false, closeApproved: false, projectPath: null };
    windows.set(window, state);
  }
  return state;
}

/**
 * The window a renderer message came from.
 *
 * Every window-shaped handler below asks this rather than reaching for one
 * remembered window: a message is always about the window that sent it, and
 * with two open the remembered one is a coin flip.
 */
function windowFrom(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

/**
 * Opens a window.
 *
 * `startAtPicker` is how a second launch says "do not reopen the last project"
 * — the app's normal startup does reopen it, which is the behaviour that put
 * two autosaving copies on one project and is the whole reason the open-marker
 * exists. It travels as a fragment on the page's URL rather than as another
 * question the renderer has to ask: the host already knows the answer at the
 * moment it creates the window, and a window that has to ask cannot render
 * until the answer comes back.
 */
function createWindow({ startAtPicker = false } = {}) {
  // The same window the Tauri build opened, down to the background colour: it
  // is painted before the page is, and the wrong one is a white flash on a dark
  // app. Hidden until the renderer says it has drawn something — see
  // `showWindow` in the contract and `revealWindow` in main.tsx.
  const window = new BrowserWindow({
    title: "Anamnesis",
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0f0f14",
    show: false,
    // Windows and macOS take the icon from the built executable; Linux takes it
    // from here, and so does any unpackaged run on any platform.
    icon: path.join(here, "..", "src-tauri", "icons", "icon.png"),
    webPreferences: {
      preload: path.join(here, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Electron puts a File/Edit/View menu bar on every window by default. The
  // Tauri build had none and the app draws its own chrome, so a menu bar would
  // be a strip of somebody else's furniture across the top.
  Menu.setApplicationMenu(null);

  // What that menu was also carrying: the developer tools. Kept on the usual
  // keys, because losing them was never the point of removing the menu.
  window.webContents.on("before-input-event", (_event, input) => {
    const devtools =
      input.key === "F12" || (input.control && input.shift && input.key.toLowerCase() === "i");
    if (input.type === "keyDown" && devtools) window.webContents.toggleDevTools();
  });

  window.on("close", (event) => {
    const state = stateOf(window);
    if (state.closeApproved || !state.wantsCloseSay) return;
    // Held, not cancelled. The renderer flushes whatever it is still writing
    // and then either approves the close or takes the window away itself.
    event.preventDefault();
    window.webContents.send("window:close-requested");
  });

  window.on("closed", () => {
    windows.delete(window);
  });

  stateOf(window);
  const hash = startAtPicker ? "picker" : "";
  if (DEV_URL) void window.loadURL(hash ? `${DEV_URL}#${hash}` : DEV_URL);
  else void window.loadFile(path.join(here, "..", "dist", "index.html"), hash ? { hash } : undefined);
  return window;
}

/**
 * Registers a handler whose failures cross the wire as data.
 *
 * **Electron logs every rejection out of an `ipcMain.handle` as an unhandled
 * error, with a stack trace.** Plenty of failures here are ordinary and
 * expected — the commonest is reading a world's open-marker file that isn't
 * there, which is how the app asks "is anyone else in this world?" and gets
 * told no. Left as a rejection, opening the start screen printed a wall of
 * stack traces into the console window, which is the window she is told to
 * keep open and reads as the app's state. It looked broken and was not.
 *
 * So a failure comes back as `{ ok: false }` carrying the message and the
 * system's error code, and the preload turns it back into a thrown error on
 * the other side. Callers see exactly what they saw before: a rejected promise
 * with the same message on it.
 *
 * **The code does not reach the page**, and that was worth measuring rather
 * than assuming — contextBridge strips custom properties off an Error as it
 * crosses into the renderer's world, so `error.code` arrives undefined. It is
 * carried here anyway because the preload can read it, and because Node writes
 * the code at the front of its own message (`ENOENT: no such file...`), which
 * is the part that does survive.
 */
function handle(channel, responder) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return { ok: true, value: await responder(event, ...args) };
    } catch (error) {
      return {
        ok: false,
        message: String(error && error.message ? error.message : error),
        code: error && error.code ? error.code : null,
      };
    }
  });
}

// ------------------------------------------------------------------- paths

handle("path:documentsDir", () => app.getPath("documents"));
handle("path:join", (_event, segments) => path.join(...segments));

// ------------------------------------------------------------- filesystem

handle("fs:exists", async (_event, target) => {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
});

handle("fs:readTextFile", (_event, target) => fs.readFile(target, "utf8"));

handle("fs:writeTextFile", (_event, target, contents) => fs.writeFile(target, contents, "utf8"));

handle("fs:readFile", async (_event, target) => {
  const buffer = await fs.readFile(target);
  // A Buffer is a Uint8Array, but it arrives in the renderer as one only if it
  // is sent as plain bytes rather than as Node's subclass.
  return new Uint8Array(buffer);
});

handle("fs:writeFile", (_event, target, contents) => fs.writeFile(target, Buffer.from(contents)));

handle("fs:readDir", async (_event, target) => {
  const entries = await fs.readdir(target, { withFileTypes: true });
  return entries.map((entry) => ({
    name: entry.name,
    isDirectory: entry.isDirectory(),
    isFile: entry.isFile(),
  }));
});

handle("fs:makeDir", (_event, target, options) => fs.mkdir(target, { recursive: !!options?.recursive }));

handle("fs:remove", (_event, target, options) =>
  fs.rm(target, { recursive: !!options?.recursive, force: false }),
);

handle("fs:rename", (_event, from, to) => fs.rename(from, to));

handle("fs:copyFile", (_event, from, to) => fs.copyFile(from, to));

handle("fs:fileInfo", async (_event, target) => {
  const info = await fs.stat(target);
  return { size: info.size, modifiedAt: info.mtime ?? null };
});

// Watches, by id, so the renderer can stop one without holding a handle to it.
/** @type {Map<number, { close: () => void }>} */
const watches = new Map();
let nextWatchId = 1;

handle("fs:watch", (event, targets, options) => {
  const id = nextWatchId++;
  const roots = Array.isArray(targets) ? targets : [targets];
  /** @type {Set<string>} */
  const pending = new Set();
  /** @type {NodeJS.Timeout | null} */
  let timer = null;

  // **Batched, because one save is many events.** An editor writing a file can
  // produce a create, a write and a rename in a few milliseconds, and the
  // caller wants to be told once. The delay is the caller's — see WATCH_DELAY_MS
  // in filesystem-service.
  const flush = () => {
    timer = null;
    const changed = [...pending];
    pending.clear();
    if (changed.length > 0) event.sender.send("fs:watch-event", id, changed);
  };

  const watchers = roots.map((root) =>
    watchFs(root, { recursive: !!options?.recursive }, (_type, name) => {
      pending.add(name ? path.join(root, name) : root);
      if (timer === null) timer = setTimeout(flush, options?.delayMs ?? 0);
    }),
  );

  watches.set(id, {
    close: () => {
      if (timer !== null) clearTimeout(timer);
      for (const watcher of watchers) watcher.close();
    },
  });
  return id;
});

handle("fs:unwatch", (_event, id) => {
  watches.get(id)?.close();
  watches.delete(id);
});

// ------------------------------------------------------------------ window

handle("window:show", (event) => {
  windowFrom(event)?.show();
});

handle("window:close", (event) => {
  const window = windowFrom(event);
  if (!window) return;
  stateOf(window).closeApproved = true;
  window.close();
});

handle("window:destroy", (event) => {
  const window = windowFrom(event);
  if (!window) return;
  stateOf(window).closeApproved = true;
  window.destroy();
});

handle("window:watchClose", (event, wanted) => {
  const window = windowFrom(event);
  if (window) stateOf(window).wantsCloseSay = !!wanted;
});

/**
 * Which project this window has open, or null when it is on the picker.
 *
 * Told rather than asked: only the renderer knows when a project has finished
 * opening, and only this process can see every window at once.
 */
handle("window:announceProject", (event, projectPath) => {
  const window = windowFrom(event);
  if (window) stateOf(window).projectPath = projectPath ?? null;
});

/**
 * Brings the window that already has this project to the front, and says
 * whether there was one.
 *
 * **This is what replaces refusing to open it.** A project open in another
 * window of this app is not a problem to be reported — it is a window the
 * person is trying to get back to, which is what every other app with more
 * than one window does. The caller closes itself when this answers true.
 *
 * Only ever finds windows of *this* process, which is the point: a copy on
 * another machine, reached through a synced folder, cannot be focused from
 * here and is the one case the open-marker still exists for.
 */
handle("window:focusProject", (event, projectPath) => {
  if (!projectPath) return false;
  const asking = windowFrom(event);
  for (const [window, state] of windows) {
    if (window === asking || window.isDestroyed()) continue;
    if (state.projectPath !== projectPath) continue;
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
    return true;
  }
  return false;
});

// -------------------------------------------------------------- app itself

handle("app:version", () => readAppVersion());

handle("app:restart", () => {
  // **After a download, restarting means installing.** The panel's flow is
  // "install, then restart to finish", and on this shell the installer only
  // runs as the app is going away — so the restart is where the new version
  // actually arrives. Without an update waiting, this is an ordinary restart.
  if (updateReadyToInstall) {
    getUpdater().quitAndInstall();
    return;
  }
  app.relaunch();
  app.exit(0);
});

// ----------------------------------------------------------------- dialogs

// Parented to the window that asked, so the dialog is modal to that one
// rather than to whichever window happened to be created last.
handle("dialog:chooseDirectory", async (event, options) => {
  const result = await dialog.showOpenDialog(windowFrom(event) ?? undefined, {
    title: options?.title,
    defaultPath: options?.defaultPath,
    properties: ["openDirectory"],
  });
  return result.canceled ? null : (result.filePaths[0] ?? null);
});

handle("dialog:chooseFile", async (event, options) => {
  const result = await dialog.showOpenDialog(windowFrom(event) ?? undefined, {
    title: options?.title,
    defaultPath: options?.defaultPath,
    filters: options?.filters,
    properties: ["openFile"],
  });
  return result.canceled ? null : (result.filePaths[0] ?? null);
});

handle("dialog:chooseSavePath", async (event, options) => {
  const result = await dialog.showSaveDialog(windowFrom(event) ?? undefined, {
    title: options?.title,
    defaultPath: options?.defaultPath,
    filters: options?.filters,
  });
  return result.canceled ? null : (result.filePath ?? null);
});

// ------------------------------------------------- handing things to the OS

handle("os:openPath", (_event, target) => shell.openPath(target));

handle("os:openExternal", (_event, url) => shell.openExternal(url));

handle("os:revealItem", (_event, target) => {
  shell.showItemInFolder(target);
});

// ------------------------------------------------------------------- fetch

// Goes out from the main process rather than the page, which is what stops the
// page's own origin rules applying — the same reason the Tauri build proxied
// this through Rust. See `fetchLkImage` in lk-import.
handle("net:fetch", async (_event, url) => {
  const response = await net.fetch(url);
  return {
    ok: response.ok,
    status: response.status,
    bytes: new Uint8Array(await response.arrayBuffer()),
  };
});

// --------------------------------------------------------- settings stores

/** @type {Map<string, Record<string, unknown>>} */
const stores = new Map();

function storePath(fileName) {
  return path.join(app.getPath("userData"), fileName);
}

/**
 * Where the Tauri build kept the same file, so an existing installation's
 * settings are not lost when the shell changes.
 *
 * **Worlds were never in here** — they are folders of JSON on disk and both
 * shells read the same ones. What is here is the small stuff that would
 * otherwise silently reset: which projects are recent, which one was open last,
 * and the projects folder if she moved it. Losing that is not data loss, but it
 * is the app forgetting her on first launch, which reads like one.
 *
 * Keyed by the same identifier Tauri used. Several candidates because Tauri's
 * store sits under a different base directory per platform.
 */
function legacyStorePaths(fileName) {
  const home = app.getPath("home");
  const bases =
    process.platform === "win32"
      ? [path.join(app.getPath("appData"), "com.anamnesis.app")]
      : process.platform === "darwin"
        ? [path.join(home, "Library", "Application Support", "com.anamnesis.app")]
        : [
            path.join(home, ".config", "com.anamnesis.app"),
            path.join(home, ".local", "share", "com.anamnesis.app"),
          ];
  return bases.map((base) => path.join(base, fileName));
}

async function readJsonIfPresent(target) {
  try {
    const parsed = JSON.parse(await fs.readFile(target, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    // Missing, or not JSON any more. Neither is worth refusing to start over.
    return null;
  }
}

async function loadStore(fileName) {
  const existing = stores.get(fileName);
  if (existing) return existing;

  let contents = await readJsonIfPresent(storePath(fileName));

  if (contents === null) {
    // **Read, never moved.** The Tauri build may still be installed and may
    // still be the one she opens tomorrow; taking its settings away would break
    // it to fix this. The copy is one-way and happens once, because after this
    // run there is a file of our own to find.
    for (const legacy of legacyStorePaths(fileName)) {
      contents = await readJsonIfPresent(legacy);
      if (contents !== null) break;
    }
  }

  const store = contents ?? {};
  stores.set(fileName, store);
  return store;
}

handle("store:load", async (_event, fileName) => {
  await loadStore(fileName);
});

handle("store:get", async (_event, fileName, key) => (await loadStore(fileName))[key]);

handle("store:set", async (_event, fileName, key, value) => {
  (await loadStore(fileName))[key] = value;
});

handle("store:delete", async (_event, fileName, key) => {
  const store = await loadStore(fileName);
  const had = key in store;
  delete store[key];
  return had;
});

handle("store:save", async (_event, fileName) => {
  const store = await loadStore(fileName);
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(storePath(fileName), JSON.stringify(store, null, 2), "utf8");
});

// ----------------------------------------------------------------- updates

/**
 * The updater, built the first time something asks for it rather than on load.
 *
 * **`electronUpdater.autoUpdater` is a getter that constructs the updater**, so
 * naming the property is not free — it picks the platform's implementation and
 * runs its constructor there and then. That constructor reads
 * `app.getVersion()` and refuses anything that is not valid semver.
 *
 * **On Linux, an unpackaged run answers `0.0`, so this threw during module
 * load** — before `app.whenReady()`, before any window existed. Electron
 * reported a main process that failed to load and then sat there: no window, no
 * error on screen, nothing in the app's own logs. The Electron shell could not
 * be run from source on Linux at all, which matters rather a lot for a phase
 * whose entire reason is Linux. Windows never saw it, because an unpackaged run
 * there answers `44.0.0` — Electron's own version, valid semver by luck.
 *
 * Found by the app test suite on 2026-08-26, after six CI runs that could only
 * say "ready, but no window".
 *
 * Deferring it also matches when the updater is actually wanted: nothing here
 * checks for an update until a button is pressed.
 *
 * @returns {import("electron-updater").AppUpdater}
 */
function getUpdater() {
  if (updater) return updater;
  // Remembered rather than retried. It fails identically every time, and the
  // Updates panel needs a sentence rather than a spinner.
  if (updaterUnavailable) throw updaterUnavailable;

  let built;
  try {
    built = electronUpdater.autoUpdater;
  } catch (error) {
    updaterUnavailable = new Error(
      `Updates aren't available in this build: ${error && error.message ? error.message : error}`,
    );
    throw updaterUnavailable;
  }

  // Nothing happens without a button press: no check at launch, no check on a
  // timer, no download until the panel asks for one. That was true of the Tauri
  // updater and it stays true here.
  built.autoDownload = false;
  built.autoInstallOnAppQuit = false;

  // **This app is not code signed, and that is a decision rather than an
  // oversight** (2026-08-25): a Windows certificate is a few hundred a year to
  // remove a first-run warning, and an Apple one is another hundred on top. So
  // there is no publisher name for electron-updater to check a download
  // against, and what stands behind an update instead is the SHA-512 published
  // in the release feed and fetched from GitHub over HTTPS.
  //
  // **Worth knowing before an electron-builder major upgrade:** skipping this
  // check is deprecated. A future version treats a missing publisher as a
  // failed verification rather than a skipped one, which would stop updates
  // dead. See docs/releasing.md.
  if ("verifyUpdateCodeSignature" in built) built.verifyUpdateCodeSignature = false;

  updater = built;
  return updater;
}

/** @type {import("electron-updater").AppUpdater | null} */
let updater = null;

/** @type {Error | null} */
let updaterUnavailable = null;

/** Set once a download has finished, so quitting can hand over to the installer. */
let updateReadyToInstall = false;

handle("updates:check", async () => {
  const result = await getUpdater().checkForUpdates();
  if (!result?.updateInfo) return null;
  if (result.updateInfo.version === app.getVersion()) return null;

  const notes = result.updateInfo.releaseNotes;
  return {
    version: result.updateInfo.version,
    // GitHub hands these back as a string; other providers can send an array of
    // per-version entries, which is not a shape anything above the door reads.
    body: typeof notes === "string" ? notes : undefined,
  };
});

handle("updates:download", async (event) => {
  const updating = getUpdater();
  const forward = (progress) => {
    event.sender.send("updates:progress", {
      received: progress.transferred,
      total: typeof progress.total === "number" ? progress.total : null,
    });
  };
  updating.on("download-progress", forward);
  try {
    await updating.downloadUpdate();
    updateReadyToInstall = true;
  } finally {
    updating.off("download-progress", forward);
  }
});

// -------------------------------------------------------------- lifecycle

/**
 * **Launching Anamnesis again talks to the copy already running.**
 *
 * Without this, a second launch is a second process, and two processes cannot
 * see each other's windows — which is why a project open in one of them could
 * only ever be reported as a refusal rather than brought to the front. The lock
 * is the operating system's, so it is released however this process ends,
 * including badly.
 *
 * The second launch opens a window on the picker rather than reopening the last
 * project, because reopening it is exactly what put two autosaving copies on
 * one project (verified 2026-08-14). From the picker, choosing a project
 * already open in another window focuses that window instead of opening it
 * twice — see `window:focusProject`.
 */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    createWindow({ startAtPicker: true });
  });

  app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on("window-all-closed", () => {
  // macOS convention is to keep the app running with no windows; everywhere
  // else, closing the window is quitting.
  if (process.platform !== "darwin") app.quit();
});

// Nothing in this app opens a second window or a popup, so anything trying to
// is either a stray target=_blank or something worse. Links that should leave
// the app go through `openInBrowser`, which hands them to the real browser.
app.on("web-contents-created", (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
});
