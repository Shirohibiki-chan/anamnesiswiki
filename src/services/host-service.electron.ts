// The door, with Electron behind it (Phase 29 step 2).
//
// **The twin of `host-service.ts`.** Same names, same signatures, same
// promises — both are checked against `host-contract.ts` at the bottom of the
// file, so neither can quietly lose a capability the other has. Which one the
// app is built with is decided in `vite.config.ts` by `ANAMNESIS_SHELL`, and
// nothing above this file knows or asks.
//
// What is here is translation, not decisions: the preload bridge deals in ids
// and plain objects, and this turns those into the vocabulary the app already
// speaks — an unwatch function rather than a watch id, a `Response` rather than
// a bag of bytes, a store object rather than five channels.
import type {
  DirEntry,
  DownloadProgress,
  FileFilter,
  FileInfo,
  HostContract,
  KeyValueStore,
  ShellUpdate,
} from "./host-contract";

/** Exactly what `electron/preload.cjs` exposes, and nothing more. */
type HostBridge = {
  separator: string;
  documentsDir(): Promise<string>;
  joinPath(segments: string[]): Promise<string>;
  exists(path: string): Promise<boolean>;
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, contents: string): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, contents: Uint8Array): Promise<void>;
  readDir(path: string): Promise<DirEntry[]>;
  makeDir(path: string, options?: { recursive?: boolean }): Promise<void>;
  removePath(path: string, options?: { recursive?: boolean }): Promise<void>;
  renamePath(from: string, to: string): Promise<void>;
  copyFile(from: string, to: string): Promise<void>;
  fileInfo(path: string): Promise<{ size: number; modifiedAt: Date | string | null }>;
  watch(paths: string | string[], options: { delayMs: number; recursive: boolean }): Promise<number>;
  unwatch(id: number): Promise<void>;
  onWatchEvent(handler: (id: number, changed: string[]) => void): () => void;
  showWindow(): Promise<void>;
  closeWindow(): Promise<void>;
  destroyWindow(): Promise<void>;
  watchClose(wanted: boolean): Promise<void>;
  announceOpenProject(projectPath: string | null): Promise<void>;
  focusWindowWithProject(projectPath: string): Promise<boolean>;
  onCloseRequested(handler: () => void): () => void;
  appVersion(): Promise<string>;
  restart(): Promise<void>;
  chooseDirectory(options?: { title?: string; defaultPath?: string }): Promise<string | null>;
  chooseFile(options?: { title?: string; defaultPath?: string; filters?: FileFilter[] }): Promise<string | null>;
  chooseSavePath(options?: { title?: string; defaultPath?: string; filters?: FileFilter[] }): Promise<string | null>;
  openInSystem(path: string): Promise<void>;
  openInBrowser(url: string): Promise<void>;
  revealInFileManager(path: string): Promise<void>;
  fetchBytes(url: string): Promise<{ ok: boolean; status: number; bytes: Uint8Array }>;
  storeLoad(fileName: string): Promise<void>;
  storeGet(fileName: string, key: string): Promise<unknown>;
  storeSet(fileName: string, key: string, value: unknown): Promise<void>;
  storeDelete(fileName: string, key: string): Promise<boolean>;
  storeSave(fileName: string): Promise<void>;
  checkForUpdate(): Promise<{ version: string; body?: string } | null>;
  downloadUpdate(): Promise<void>;
  onUpdateProgress(handler: (progress: DownloadProgress) => void): () => void;
};

/**
 * **Absent when the page is open in a plain browser**, which is `pnpm dev`
 * without a shell around it. Every call below then fails with one sentence
 * saying why, rather than `undefined is not a function` from somewhere deep in
 * a service — the same courtesy the Tauri build gets from its own runtime.
 */
function bridge(): HostBridge {
  const host = (globalThis as { anamnesisHost?: HostBridge }).anamnesisHost;
  if (!host) throw new Error("No desktop shell here — this build needs to run inside Electron.");
  return host;
}

// ---------------------------------------------------------------- paths

export function documentsDir(): Promise<string> {
  return bridge().documentsDir();
}

export function joinPath(...segments: string[]): Promise<string> {
  return bridge().joinPath(segments);
}

export function pathSeparator(): string {
  return bridge().separator;
}

// ------------------------------------------------------------ filesystem

export function exists(path: string): Promise<boolean> {
  return bridge().exists(path);
}

export function readTextFile(path: string): Promise<string> {
  return bridge().readTextFile(path);
}

export function writeTextFile(path: string, contents: string): Promise<void> {
  return bridge().writeTextFile(path, contents);
}

export function readFile(path: string): Promise<Uint8Array> {
  return bridge().readFile(path);
}

export function writeFile(path: string, contents: Uint8Array): Promise<void> {
  return bridge().writeFile(path, contents);
}

export function readDir(path: string): Promise<DirEntry[]> {
  return bridge().readDir(path);
}

export function makeDir(path: string, options?: { recursive?: boolean }): Promise<void> {
  return bridge().makeDir(path, options);
}

export function removePath(path: string, options?: { recursive?: boolean }): Promise<void> {
  return bridge().removePath(path, options);
}

export function renamePath(from: string, to: string): Promise<void> {
  return bridge().renamePath(from, to);
}

export function copyFile(from: string, to: string): Promise<void> {
  return bridge().copyFile(from, to);
}

export async function fileInfo(path: string): Promise<FileInfo> {
  const info = await bridge().fileInfo(path);
  // A Date survives the trip between processes, but a store that has been
  // through JSON hands back a string. Both arrive here; one shape leaves.
  const modifiedAt = info.modifiedAt === null ? null : new Date(info.modifiedAt);
  return { size: info.size, modifiedAt };
}

export async function watchPath(
  paths: string | string[],
  onChange: (changed: string[]) => void,
  options: { delayMs: number; recursive: boolean },
): Promise<() => void> {
  const host = bridge();
  const id = await host.watch(paths, options);
  const stopListening = host.onWatchEvent((eventId, changed) => {
    if (eventId === id) onChange(changed);
  });
  return () => {
    stopListening();
    void host.unwatch(id);
  };
}

// --------------------------------------------------------------- window

export function showWindow(): Promise<void> {
  return bridge().showWindow();
}

export function closeWindow(): Promise<void> {
  return bridge().closeWindow();
}

export function destroyWindow(): Promise<void> {
  return bridge().destroyWindow();
}

/**
 * **The window closes on its own until this is called.** Telling the main
 * process that somebody is listening is what makes it start asking, and
 * unregistering tells it to stop — otherwise quitting would hang forever on a
 * page that had navigated away from its own handler.
 */
export async function onWindowCloseRequested(
  handler: () => boolean | Promise<boolean>,
): Promise<() => void> {
  const host = bridge();
  await host.watchClose(true);
  const stopListening = host.onCloseRequested(() => {
    void (async () => {
      if (await handler()) await host.closeWindow();
    })();
  });
  return () => {
    stopListening();
    void host.watchClose(false);
  };
}

/** Told after a project finishes opening, and again with null when it closes. */
export function announceOpenProject(projectPath: string | null): Promise<void> {
  return bridge().announceOpenProject(projectPath);
}

/** True when another window had it and has been brought to the front. */
export function focusWindowWithProject(projectPath: string): Promise<boolean> {
  return bridge().focusWindowWithProject(projectPath);
}

// ------------------------------------------------------------ app itself

export function appVersion(): Promise<string> {
  return bridge().appVersion();
}

export function restart(): Promise<void> {
  return bridge().restart();
}

// -------------------------------------------------------------- dialogs

export function chooseDirectory(options?: { title?: string; defaultPath?: string }): Promise<string | null> {
  return bridge().chooseDirectory(options);
}

export function chooseFile(options?: {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
}): Promise<string | null> {
  return bridge().chooseFile(options);
}

export function chooseSavePath(options?: {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
}): Promise<string | null> {
  return bridge().chooseSavePath(options);
}

// -------------------------------------------------- handing things to the OS

export function openInSystem(path: string): Promise<void> {
  return bridge().openInSystem(path);
}

export function openInBrowser(url: string): Promise<void> {
  return bridge().openInBrowser(url);
}

export function revealInFileManager(path: string): Promise<void> {
  return bridge().revealInFileManager(path);
}

// ------------------------------------------------------------------ http

export async function hostFetch(url: string): Promise<Response> {
  const { ok, status, bytes } = await bridge().fetchBytes(url);
  // Rebuilt as a real Response so callers keep reading `ok`, `status` and
  // `arrayBuffer()` exactly as they did — the bytes crossed the process
  // boundary, the interface didn't.
  return new Response(ok ? bytes : null, { status });
}

// -------------------------------------------------------- settings store

export async function openKeyValueStore(fileName: string): Promise<KeyValueStore> {
  const host = bridge();
  await host.storeLoad(fileName);
  return {
    get: <T>(key: string) => host.storeGet(fileName, key) as Promise<T | undefined>,
    set: (key, value) => host.storeSet(fileName, key, value),
    delete: (key) => host.storeDelete(fileName, key),
    save: () => host.storeSave(fileName),
  };
}

// --------------------------------------------------------------- updates

/**
 * Asks the host whether there is a newer version, and hands back the handle
 * that downloads it.
 *
 * **`install` downloads; the restart is what installs.** On this shell the
 * installer can only run as the app goes away, so `restart()` hands over to it
 * — which matches the panel's own flow of installing and then offering to
 * restart. The Tauri build ran the installer during `install` and restarted
 * afterwards; the visible sequence is the same either way.
 */
export async function checkForShellUpdate(): Promise<ShellUpdate | null> {
  const host = bridge();
  const info = await host.checkForUpdate();
  if (!info) return null;

  return {
    version: info.version,
    body: info.body,
    install: async (onProgress) => {
      const stopListening = host.onUpdateProgress(onProgress);
      try {
        await host.downloadUpdate();
      } finally {
        stopListening();
      }
    },
  };
}

// **Compile-time proof that this shell can do everything the app asks of one.**
// If a capability is added to the contract and not to this file, or its shape
// drifts from the Tauri side, the build fails here rather than on somebody's
// machine. `host-service.ts` carries the same block.
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
  renamePath,
  copyFile,
  fileInfo,
  watchPath,
  showWindow,
  closeWindow,
  destroyWindow,
  onWindowCloseRequested,
  announceOpenProject,
  focusWindowWithProject,
  appVersion,
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
