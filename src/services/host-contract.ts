// What the app asks of whatever is hosting it, as types only.
//
// **This file exists so the two shells can't drift.** `host-service.ts` speaks
// Tauri and `host-service.electron.ts` speaks Electron; both import these
// types, and both end with a `satisfies HostContract` block listing every name
// they export. Add a capability and TypeScript fails the build until both
// shells have it — which is the whole point, because the failure mode being
// designed out is one shell quietly missing something nobody notices until it
// is running on somebody's machine.
//
// Nothing here imports anything. It is the vocabulary, not an implementation.

/** One entry in a directory listing. */
export type DirEntry = {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
};

/** What this app has ever wanted to know about a file it isn't reading. */
export type FileInfo = {
  size: number;
  /** Null where the host doesn't report a modification time. */
  modifiedAt: Date | null;
};

/** A named set of extensions for a file dialog to filter by. */
export type FileFilter = { name: string; extensions: string[] };

/**
 * A small key-value file the host keeps for us — app settings, not world data.
 * Worlds are plain JSON written through `filesystem-service.ts`; this is for the
 * handful of things that belong to the installation instead.
 */
export type KeyValueStore = {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  save(): Promise<void>;
};

/** How far along a download is. Total is null where the server declared none. */
export type DownloadProgress = { received: number; total: number | null };

/**
 * An update the host is offering.
 *
 * **The leakiest thing in the contract, and deliberately the smallest leak
 * available.** An updater is the one capability that can't be reduced to a
 * function call: it hands back a handle, and the download reports progress
 * through it. A shell has to provide this much — a version, whatever notes came
 * with it, and an `install` that reports bytes — and each shell's own event
 * shapes stop at its own door.
 */
export type ShellUpdate = {
  version: string;
  /** Release notes exactly as the feed supplied them, if it supplied any. */
  body?: string;
  install(onProgress: (progress: DownloadProgress) => void): Promise<void>;
};

/**
 * Every capability the app can ask of a shell.
 *
 * **The rule for what belongs here:** it goes in if only the thing hosting the
 * web page can answer it — a real path, a native dialog, a window, an
 * installer. It does not go in if it is a decision. No walking directories, no
 * naming files, no working out whether a world is valid; that all lives above
 * the door, where it stays testable without a shell at all.
 */
export type HostContract = {
  // ---- paths
  documentsDir(): Promise<string>;
  joinPath(...segments: string[]): Promise<string>;
  pathSeparator(): string;

  // ---- filesystem
  exists(path: string): Promise<boolean>;
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, contents: string): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, contents: Uint8Array): Promise<void>;
  readDir(path: string): Promise<DirEntry[]>;
  makeDir(path: string, options?: { recursive?: boolean }): Promise<void>;
  removePath(path: string, options?: { recursive?: boolean }): Promise<void>;
  /**
   * Moves a file or folder to the OS recycle bin, recoverable by the user.
   *
   * **Deliberately not the same call as `removePath`.** That one is how the app
   * tidies up after itself — a temp file, a directory it just made — and it is
   * gone for good. This one is only ever reached by a person choosing to delete
   * something of their own, and the difference between the two is whether they
   * can change their mind. A host that cannot offer the recycle bin must reject
   * rather than fall back to `removePath`.
   */
  trashPath(path: string): Promise<void>;
  renamePath(from: string, to: string): Promise<void>;
  copyFile(from: string, to: string): Promise<void>;
  fileInfo(path: string): Promise<FileInfo>;
  watchPath(
    paths: string | string[],
    onChange: (changed: string[]) => void,
    options: { delayMs: number; recursive: boolean },
  ): Promise<() => void>;

  // ---- window
  showWindow(): Promise<void>;
  /**
   * Whether the page has to draw the window's minimise, maximise and close.
   *
   * **This replaced tinting the system's own buttons on 2026-09-05**, and the
   * reason was the user rather than the platform: Windows draws those controls
   * 46px wide and offers a colour and a height and nothing else, which in a 32px
   * themed bar is three grey slabs. The one thing keeping them bought was Windows
   * 11's snap layouts — the grid that appears on hovering the native maximise
   * button — and she did not know it existed. `setTitleBarColors` went with them.
   *
   * False on macOS, whose traffic lights are the platform's convention rather
   * than a default nobody chose, and false on a shell that still draws its own
   * frame. The bar asks before drawing anything.
   */
  drawsWindowControls(): Promise<boolean>;
  minimiseWindow(): Promise<void>;
  /**
   * Maximises the window, or restores it if it is maximised already.
   *
   * One call rather than two, because the button is one button and the window
   * already knows which state it is in — asking the page to decide is how the
   * page's idea of that state and the window's come apart.
   */
  toggleMaximiseWindow(): Promise<void>;
  /**
   * Watches whether the window is maximised, firing once with the state as it
   * stands and again whenever it changes. Returns the unsubscribe.
   *
   * **The button cannot track this by itself.** A window is also maximised by a
   * double-click on the bar, by Win+Up, by a snap and by a drag to the top of the
   * screen, and the glyph has to be right after all of them.
   */
  watchWindowMaximised(handler: (maximised: boolean) => void): Promise<() => void>;
  /**
   * Asks the window to close the way the system's own close button did.
   *
   * **Not `closeWindow`, and the difference costs unsaved work if it is got
   * wrong.** `closeWindow` is the *approved* close the renderer calls once it
   * has finished flushing — it skips the handshake by design, because the
   * handshake is what called it. This is the other end: the button a person
   * presses, which has to raise `onWindowCloseRequested` and let the app save
   * first. The system's close button always did this; ours has to as well.
   */
  requestWindowClose(): Promise<void>;
  closeWindow(): Promise<void>;
  destroyWindow(): Promise<void>;
  onWindowCloseRequested(handler: () => boolean | Promise<boolean>): Promise<() => void>;
  /**
   * Says which project this window has open, or null while it is on the picker.
   *
   * Only the host can see more than one window at a time, so it is the only
   * thing that can answer the question below — and it can only answer it if it
   * is told this.
   */
  announceOpenProject(projectPath: string | null): Promise<void>;
  /**
   * Brings the window that already has this project to the front, answering
   * whether there was one.
   *
   * **A project open in another window is somewhere to go, not an error.** A
   * shell that cannot manage more than one window answers false, and the caller
   * falls back to the open-marker's warning — which is also what happens when
   * the other copy is on another machine behind a synced folder, where no
   * amount of window management can reach it.
   */
  focusWindowWithProject(projectPath: string): Promise<boolean>;

  // ---- the app itself
  appVersion(): Promise<string>;
  /**
   * Which shell this is, as a word a person can read: `Tauri` or `Electron`.
   *
   * **Only the host can answer it, and a version number cannot.** Both shells
   * ship the same version string out of the same four files, so a bug report
   * carrying `0.5.0` says nothing about which of the two builds produced it —
   * which is exactly the confusion that reached a tester's machine (see
   * `docs/plan.md` → Known Bugs). Synchronous like `pathSeparator`, because
   * the answer is decided when the build is made, not when it is asked.
   */
  shellName(): string;
  restart(): Promise<void>;

  // ---- dialogs
  chooseDirectory(options?: { title?: string; defaultPath?: string }): Promise<string | null>;
  chooseFile(options?: { title?: string; defaultPath?: string; filters?: FileFilter[] }): Promise<string | null>;
  chooseSavePath(options?: { title?: string; defaultPath?: string; filters?: FileFilter[] }): Promise<string | null>;

  // ---- handing things to the OS
  openInSystem(path: string): Promise<void>;
  openInBrowser(url: string): Promise<void>;
  revealInFileManager(path: string): Promise<void>;

  // ---- network
  hostFetch(url: string): Promise<Response>;

  // ---- settings
  openKeyValueStore(fileName: string): Promise<KeyValueStore>;

  // ---- updates
  checkForShellUpdate(): Promise<ShellUpdate | null>;
};
