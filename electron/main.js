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
import fs from "node:fs/promises";
import { watch as watchFs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

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

/** @type {BrowserWindow | null} */
let mainWindow = null;

/**
 * Whether the renderer has asked to be consulted before the window closes, and
 * whether it has since said yes.
 *
 * **Without the first flag a window with no listener would never close.** The
 * renderer registers its handler after the page loads, and between launch and
 * that moment the close button has to work on its own.
 */
let rendererWantsCloseSay = false;
let closeApproved = false;

function createWindow() {
  // The same window the Tauri build opened, down to the background colour: it
  // is painted before the page is, and the wrong one is a white flash on a dark
  // app. Hidden until the renderer says it has drawn something — see
  // `showWindow` in the contract and `revealWindow` in main.tsx.
  mainWindow = new BrowserWindow({
    title: "Anamnesis",
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0f0f14",
    show: false,
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
  mainWindow.webContents.on("before-input-event", (_event, input) => {
    const devtools =
      input.key === "F12" || (input.control && input.shift && input.key.toLowerCase() === "i");
    if (input.type === "keyDown" && devtools) mainWindow?.webContents.toggleDevTools();
  });

  mainWindow.on("close", (event) => {
    if (closeApproved || !rendererWantsCloseSay) return;
    // Held, not cancelled. The renderer flushes whatever it is still writing
    // and then either approves the close or takes the window away itself.
    event.preventDefault();
    mainWindow?.webContents.send("window:close-requested");
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (DEV_URL) void mainWindow.loadURL(DEV_URL);
  else void mainWindow.loadFile(path.join(here, "..", "dist", "index.html"));
}

// ------------------------------------------------------------------- paths

ipcMain.handle("path:documentsDir", () => app.getPath("documents"));
ipcMain.handle("path:join", (_event, segments) => path.join(...segments));

// ------------------------------------------------------------- filesystem

ipcMain.handle("fs:exists", async (_event, target) => {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("fs:readTextFile", (_event, target) => fs.readFile(target, "utf8"));

ipcMain.handle("fs:writeTextFile", (_event, target, contents) => fs.writeFile(target, contents, "utf8"));

ipcMain.handle("fs:readFile", async (_event, target) => {
  const buffer = await fs.readFile(target);
  // A Buffer is a Uint8Array, but it arrives in the renderer as one only if it
  // is sent as plain bytes rather than as Node's subclass.
  return new Uint8Array(buffer);
});

ipcMain.handle("fs:writeFile", (_event, target, contents) => fs.writeFile(target, Buffer.from(contents)));

ipcMain.handle("fs:readDir", async (_event, target) => {
  const entries = await fs.readdir(target, { withFileTypes: true });
  return entries.map((entry) => ({
    name: entry.name,
    isDirectory: entry.isDirectory(),
    isFile: entry.isFile(),
  }));
});

ipcMain.handle("fs:makeDir", (_event, target, options) => fs.mkdir(target, { recursive: !!options?.recursive }));

ipcMain.handle("fs:remove", (_event, target, options) =>
  fs.rm(target, { recursive: !!options?.recursive, force: false }),
);

ipcMain.handle("fs:rename", (_event, from, to) => fs.rename(from, to));

ipcMain.handle("fs:copyFile", (_event, from, to) => fs.copyFile(from, to));

ipcMain.handle("fs:fileInfo", async (_event, target) => {
  const info = await fs.stat(target);
  return { size: info.size, modifiedAt: info.mtime ?? null };
});

// Watches, by id, so the renderer can stop one without holding a handle to it.
/** @type {Map<number, { close: () => void }>} */
const watches = new Map();
let nextWatchId = 1;

ipcMain.handle("fs:watch", (event, targets, options) => {
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

ipcMain.handle("fs:unwatch", (_event, id) => {
  watches.get(id)?.close();
  watches.delete(id);
});

// ------------------------------------------------------------------ window

ipcMain.handle("window:show", () => {
  mainWindow?.show();
});

ipcMain.handle("window:close", () => {
  closeApproved = true;
  mainWindow?.close();
});

ipcMain.handle("window:destroy", () => {
  closeApproved = true;
  mainWindow?.destroy();
});

ipcMain.handle("window:watchClose", (_event, wanted) => {
  rendererWantsCloseSay = !!wanted;
});

// -------------------------------------------------------------- app itself

ipcMain.handle("app:version", () => readAppVersion());

ipcMain.handle("app:restart", () => {
  app.relaunch();
  app.exit(0);
});

// ----------------------------------------------------------------- dialogs

ipcMain.handle("dialog:chooseDirectory", async (_event, options) => {
  const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
    title: options?.title,
    defaultPath: options?.defaultPath,
    properties: ["openDirectory"],
  });
  return result.canceled ? null : (result.filePaths[0] ?? null);
});

ipcMain.handle("dialog:chooseFile", async (_event, options) => {
  const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
    title: options?.title,
    defaultPath: options?.defaultPath,
    filters: options?.filters,
    properties: ["openFile"],
  });
  return result.canceled ? null : (result.filePaths[0] ?? null);
});

ipcMain.handle("dialog:chooseSavePath", async (_event, options) => {
  const result = await dialog.showSaveDialog(mainWindow ?? undefined, {
    title: options?.title,
    defaultPath: options?.defaultPath,
    filters: options?.filters,
  });
  return result.canceled ? null : (result.filePath ?? null);
});

// ------------------------------------------------- handing things to the OS

ipcMain.handle("os:openPath", (_event, target) => shell.openPath(target));

ipcMain.handle("os:openExternal", (_event, url) => shell.openExternal(url));

ipcMain.handle("os:revealItem", (_event, target) => {
  shell.showItemInFolder(target);
});

// ------------------------------------------------------------------- fetch

// Goes out from the main process rather than the page, which is what stops the
// page's own origin rules applying — the same reason the Tauri build proxied
// this through Rust. See `fetchLkImage` in lk-import.
ipcMain.handle("net:fetch", async (_event, url) => {
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

async function loadStore(fileName) {
  const existing = stores.get(fileName);
  if (existing) return existing;
  /** @type {Record<string, unknown>} */
  let contents = {};
  try {
    contents = JSON.parse(await fs.readFile(storePath(fileName), "utf8"));
  } catch {
    // No file yet, or an unreadable one. An unreadable settings file is not
    // worth refusing to start over — the worst case is defaults.
    contents = {};
  }
  stores.set(fileName, contents);
  return contents;
}

ipcMain.handle("store:load", async (_event, fileName) => {
  await loadStore(fileName);
});

ipcMain.handle("store:get", async (_event, fileName, key) => (await loadStore(fileName))[key]);

ipcMain.handle("store:set", async (_event, fileName, key, value) => {
  (await loadStore(fileName))[key] = value;
});

ipcMain.handle("store:delete", async (_event, fileName, key) => {
  const store = await loadStore(fileName);
  const had = key in store;
  delete store[key];
  return had;
});

ipcMain.handle("store:save", async (_event, fileName) => {
  const store = await loadStore(fileName);
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(storePath(fileName), JSON.stringify(store, null, 2), "utf8");
});

// ----------------------------------------------------------------- updates

// **Deliberately answering "nothing to update to" for now.** The updater is
// step 3's work: it needs a feed, signing keys and a release pipeline, none of
// which exist for an Electron build yet, and a half-wired updater is worse than
// an absent one — it is the one feature that runs an installer. Until then the
// Check for updates button reports the app as current, which is true of every
// build that can't be updated. See docs/plan.md → Phase 29.
ipcMain.handle("updates:check", () => null);

// -------------------------------------------------------------- lifecycle

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

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
