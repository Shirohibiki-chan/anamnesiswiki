// The one file that knows which shell this app is running in.
//
// **Everything Tauri lives behind this door.** Phase 29 step 1, 2026-08-25:
// before it, ten files imported `@tauri-apps/*` across about seventeen call
// sites — the filesystem, the dialogs, the window, the updater, the settings
// store, the proxied fetch — which meant "swap the shell" touched ten files in
// four layers. Now it touches one, and the rest of the app is ordinary React
// and TypeScript that could run anywhere.
//
// **This is architecture rule 4 finally kept.** That rule says
// `filesystem-service.ts` is the only file that touches disk, and nine other
// files quietly broke it. The rule now reads properly in two parts: this file
// is the only one that talks to the shell, and `filesystem-service.ts` is the
// only one that decides what to do with the disk. The split matters — the disk
// logic (walking the tree, resolving name collisions, planning relocations) is
// the part with the bugs that cost real data, and it stays exactly where it is,
// tested, untouched by any of this.
//
// **Two rules for what belongs here.** It goes in this file if it can only be
// answered by the thing hosting the web page — a real path, a native dialog, a
// window, an installer. It does *not* go here if it is a decision: no walking
// directories, no naming files, no working out whether a world is valid. The
// door is thin on purpose; everything above it stays testable without a shell.
//
// **The other shell already exists**: `host-service.electron.ts`, added in
// Phase 29 step 2. Both files are checked against `host-contract.ts`, which is
// where the vocabulary lives, and `vite.config.ts` decides which one the app is
// built with. Add a capability here and the build fails until the other shell
// has it too — that is the contract doing its job, not an obstacle.
import { getVersion } from "@tauri-apps/api/app";
import { documentDir, join, sep } from "@tauri-apps/api/path";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import {
  copyFile as fsCopyFile,
  exists as fsExists,
  mkdir as fsMkdir,
  readDir as fsReadDir,
  readFile as fsReadFile,
  readTextFile as fsReadTextFile,
  remove as fsRemove,
  rename as fsRename,
  stat as fsStat,
  watch as fsWatch,
  writeFile as fsWriteFile,
  writeTextFile as fsWriteTextFile,
} from "@tauri-apps/plugin-fs";
import { fetch as proxiedFetch } from "@tauri-apps/plugin-http";
import { openPath, openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { relaunch } from "@tauri-apps/plugin-process";
import { load as loadStore, type Store } from "@tauri-apps/plugin-store";
import { check as checkUpdate } from "@tauri-apps/plugin-updater";
import type {
  DirEntry,
  DownloadProgress,
  FileFilter,
  FileInfo,
  HostContract,
  KeyValueStore,
  ShellUpdate,
} from "./host-contract";

// ---------------------------------------------------------------- paths

/** Where the operating system says this user's documents live. */
export function documentsDir(): Promise<string> {
  return documentDir();
}

/**
 * Joins path segments the way the host does.
 *
 * **Async, and that is the shell's fault rather than a design choice** — under
 * Tauri this is a round trip into Rust for every call. `filesystem-service.ts`
 * has its own synchronous `joinPath` for the paths it builds in bulk, and the
 * comment there explains why; this one is for the handful of places that build
 * a single path and can afford to wait.
 */
export function joinPath(...segments: string[]): Promise<string> {
  return join(...segments);
}

/** The host's path separator — `\` on Windows, `/` elsewhere. */
export function pathSeparator(): string {
  return sep();
}

// ------------------------------------------------------------ filesystem

export function exists(path: string): Promise<boolean> {
  return fsExists(path);
}

export function readTextFile(path: string): Promise<string> {
  return fsReadTextFile(path);
}

export function writeTextFile(path: string, contents: string): Promise<void> {
  return fsWriteTextFile(path, contents);
}

export function readFile(path: string): Promise<Uint8Array> {
  return fsReadFile(path);
}

export function writeFile(path: string, contents: Uint8Array): Promise<void> {
  return fsWriteFile(path, contents);
}

export function readDir(path: string): Promise<DirEntry[]> {
  return fsReadDir(path);
}

// Both of these forward the call exactly as it arrived, options and all —
// passing an explicit `undefined` where the caller passed nothing would be this
// door putting words in its mouth, and the filesystem tests check the shape of
// the request as well as its path.
export function makeDir(path: string, options?: { recursive?: boolean }): Promise<void> {
  return options ? fsMkdir(path, options) : fsMkdir(path);
}

export function removePath(path: string, options?: { recursive?: boolean }): Promise<void> {
  return options ? fsRemove(path, options) : fsRemove(path);
}

/**
 * **Rejects, on purpose.** Tauri's fs plugin has no recycle-bin call, and the
 * available alternative — `fsRemove` with `recursive` — deletes her writing
 * with no way back. Failing here means the delete-a-project action reports that
 * it could not do it, which is the correct outcome; falling through to a
 * permanent delete would mean the app quietly did something worse than what it
 * offered. Nothing has shipped from this shell since v0.5.0, so in practice
 * this is a guard rather than a gap.
 */
export function trashPath(path: string): Promise<void> {
  return Promise.reject(new Error(`This build can't move ${path} to the recycle bin.`));
}

export function renamePath(from: string, to: string): Promise<void> {
  return fsRename(from, to);
}

export function copyFile(from: string, to: string): Promise<void> {
  return fsCopyFile(from, to);
}

/**
 * Narrower than the host's own `stat` on purpose. Two things are asked of a
 * file's metadata in this whole app — how big is it, and did it change under
 * us — and a full metadata record is a much larger thing for the next shell to
 * reimplement for no gain.
 */
export async function fileInfo(path: string): Promise<FileInfo> {
  const info = await fsStat(path);
  return { size: info.size, modifiedAt: info.mtime ?? null };
}

/**
 * Watches a path and calls back when anything inside it changes, returning the
 * function that stops watching.
 *
 * The callback gets the paths that changed and nothing else — the host's own
 * event carries a kind (created, modified, removed) that nothing here has ever
 * read, and passing it through would be a shape the next shell has to match
 * for no reason.
 */
export async function watchPath(
  paths: string | string[],
  onChange: (changed: string[]) => void,
  options: { delayMs: number; recursive: boolean },
): Promise<() => void> {
  return fsWatch(paths, (event) => onChange(Array.isArray(event.paths) ? event.paths : []), options);
}

// --------------------------------------------------------------- window

/** Shows the main window. It starts hidden so nobody sees an unstyled frame. */
export async function showWindow(): Promise<void> {
  await getCurrentWindow().show();
}

/**
 * Nothing, on this shell.
 *
 * The Tauri build opens with the system's own decorations and has shipped
 * nothing since v0.5.0; the themed bar is Phase 21 and lives on the Electron
 * side. Present so the contract is whole rather than because it does anything —
 * see the note on `setTitleBarColors` in host-contract.ts, which says a shell
 * without a bar of its own is allowed to say nothing.
 */
export async function setTitleBarColors(colors: { background: string; symbol: string }): Promise<void> {
  // Named and discarded rather than omitted: the signature is the contract's,
  // and a shorter one here would only typecheck because this file is not the
  // one the Electron build compiles against.
  void colors;
}

/** Closes the window the polite way, letting the host run its own handlers. */
export async function closeWindow(): Promise<void> {
  await getCurrentWindow().close();
}

/** Ends the window without asking anything else first. */
export async function destroyWindow(): Promise<void> {
  await getCurrentWindow().destroy();
}

/**
 * Runs `handler` when the user tries to close the window, and hands back the
 * function that unregisters it.
 *
 * **Registering this at all changes how closing works** — see the long comment
 * in `use-save-on-exit.ts`, which is the only caller and the only place that
 * knows what to do about it. This door just passes the fact along.
 */
export async function onWindowCloseRequested(
  handler: () => boolean | Promise<boolean>,
): Promise<() => void> {
  return getCurrentWindow().onCloseRequested(async (event) => {
    // The handler answers one question — may the window go now? Anything that
    // needs time says no, does its work, and takes the window away itself.
    if (!(await handler())) event.preventDefault();
  });
}

/**
 * Both are no-ops on this shell, and deliberately so rather than by oversight.
 *
 * This build opens one window per process and has no way to reach another
 * process's window, which is the constraint the open-marker was designed around
 * in the first place. Answering false here keeps exactly the behaviour this
 * shell has always had: the marker's warning, with "open it anyway" behind it.
 * The Electron shell is where the better answer lives (Phase 29).
 */
export function announceOpenProject(projectPath: string | null): Promise<void> {
  void projectPath;
  return Promise.resolve();
}

export function focusWindowWithProject(projectPath: string): Promise<boolean> {
  void projectPath;
  return Promise.resolve(false);
}

// ------------------------------------------------------------ app itself

/** The running app's version, as the installer stamped it. */
export function appVersion(): Promise<string> {
  return getVersion();
}

/** Which shell this build is — see the contract. This file is the Tauri one. */
export function shellName(): string {
  return "Tauri";
}

/** Quits and starts the app again — used after an update installs. */
export async function restart(): Promise<void> {
  await relaunch();
}

// -------------------------------------------------------------- dialogs

/** Asks for one existing folder. Null if the picker was dismissed. */
export async function chooseDirectory(options?: { title?: string; defaultPath?: string }): Promise<string | null> {
  const picked = await openDialog({ directory: true, multiple: false, ...options });
  return typeof picked === "string" ? picked : null;
}

/** Asks for one existing file. Null if the picker was dismissed. */
export async function chooseFile(options?: {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
}): Promise<string | null> {
  const picked = await openDialog({ directory: false, multiple: false, ...options });
  return typeof picked === "string" ? picked : null;
}

/** Asks where to write a new file. Null if the picker was dismissed. */
export async function chooseSavePath(options?: {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
}): Promise<string | null> {
  const picked = await saveDialog(options ?? {});
  return typeof picked === "string" ? picked : null;
}

// -------------------------------------------------- handing things to the OS

/** Opens a file or folder in whatever the system uses for it. */
export async function openInSystem(path: string): Promise<void> {
  await openPath(path);
}

/** Opens a web address in the user's own browser, never in this window. */
export async function openInBrowser(url: string): Promise<void> {
  await openUrl(url);
}

/** Shows a file where it lives, selected, in the system's file manager. */
export async function revealInFileManager(path: string): Promise<void> {
  await revealItemInDir(path);
}

// ------------------------------------------------------------------ http

/**
 * A fetch that goes through the host rather than the web page.
 *
 * The page's own `fetch` is subject to the webview's CORS rules, which is why
 * this exists at all — see `lk-import.ts`, which uses it to pull the pictures
 * a `.lk` file points at.
 */
export function hostFetch(url: string): Promise<Response> {
  return proxiedFetch(url);
}

// -------------------------------------------------------- settings store

export async function openKeyValueStore(fileName: string): Promise<KeyValueStore> {
  const store: Store = await loadStore(fileName);
  return {
    get: (key) => store.get(key),
    set: (key, value) => store.set(key, value),
    delete: (key) => store.delete(key),
    save: () => store.save(),
  };
}

// --------------------------------------------------------------- updates

/** Asks whether there's a newer version. Null means this one is current. */
export async function checkForShellUpdate(): Promise<ShellUpdate | null> {
  const update = await checkUpdate();
  if (!update) return null;

  return {
    version: update.version,
    body: update.body,
    install: async (onProgress) => {
      let received = 0;
      let total: number | null = null;
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            total = event.data.contentLength ?? null;
            onProgress({ received, total });
            break;
          case "Progress":
            received += event.data.chunkLength;
            onProgress({ received, total });
            break;
          case "Finished":
            onProgress({ received: total ?? received, total });
            break;
        }
      });
    },
  };
}

// **Compile-time proof that this shell can do everything the app asks of one.**
// If a capability is added to the contract and not to this file, or its shape
// drifts from the Electron side, the build fails here rather than on somebody's
// machine. `host-service.electron.ts` carries the same block.
const conformance = {
  documentsDir,
  joinPath,
  pathSeparator,
  exists,
  readTextFile,
  writeTextFile,
  readFile,
  writeFile,
  readDir,
  makeDir,
  removePath,
  trashPath,
  renamePath,
  copyFile,
  fileInfo,
  watchPath,
  showWindow,
  setTitleBarColors,
  closeWindow,
  destroyWindow,
  onWindowCloseRequested,
  announceOpenProject,
  focusWindowWithProject,
  appVersion,
  shellName,
  restart,
  chooseDirectory,
  chooseFile,
  chooseSavePath,
  openInSystem,
  openInBrowser,
  revealInFileManager,
  hostFetch,
  openKeyValueStore,
  checkForShellUpdate,
} satisfies HostContract;
void conformance;

export type { DirEntry, DownloadProgress, FileFilter, FileInfo, KeyValueStore, ShellUpdate };
