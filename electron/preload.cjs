// The only thing the page can see of the shell (Phase 29 step 2).
//
// **This file is the security boundary, and it is deliberately dull.** It hands
// the renderer a fixed list of functions and nothing else — no `require`, no
// `fs`, no `ipcRenderer` — so a bug or a bad paste in the app cannot reach the
// disk except through a channel that exists here and a handler that exists in
// `main.js`. Adding a capability means adding it in both places on purpose,
// which is the property worth keeping.
//
// CommonJS on purpose: the package is ESM, and a sandboxed preload has to be
// CommonJS. The `.cjs` extension is what says so.
//
// Nothing here is a decision either. Every function forwards and returns; the
// shapes it produces are turned into the app's own vocabulary one layer up, in
// `src/services/host-service.electron.ts`.
const { contextBridge, ipcRenderer } = require("electron");

// The one thing the app asks for synchronously. It never changes while the app
// is running, so it is read once here rather than being a round trip.
const separator = process.platform === "win32" ? "\\" : "/";

/**
 * Calls the main process and turns a reported failure back into a thrown one.
 *
 * Every handler over there answers with `{ ok }` rather than by rejecting —
 * see the note on `handle` in main.js for why — so this is where that becomes
 * an ordinary rejected promise again. Callers above this file never see the
 * envelope.
 *
 * The code is attached here but **does not survive into the renderer**:
 * contextBridge strips custom properties off an Error on the way across,
 * measured 2026-08-26. What reaches the page is the message, which begins with
 * the code because that is how Node writes it.
 */
async function invoke(channel, ...args) {
  const result = await ipcRenderer.invoke(channel, ...args);
  if (result && result.ok === false) {
    const error = new Error(result.message);
    if (result.code) error.code = result.code;
    throw error;
  }
  return result ? result.value : undefined;
}

contextBridge.exposeInMainWorld("anamnesisHost", {
  separator,

  // ---- paths
  documentsDir: () => invoke("path:documentsDir"),
  joinPath: (segments) => invoke("path:join", segments),

  // ---- filesystem
  exists: (target) => invoke("fs:exists", target),
  readTextFile: (target) => invoke("fs:readTextFile", target),
  writeTextFile: (target, contents) => invoke("fs:writeTextFile", target, contents),
  readFile: (target) => invoke("fs:readFile", target),
  writeFile: (target, contents) => invoke("fs:writeFile", target, contents),
  readDir: (target) => invoke("fs:readDir", target),
  makeDir: (target, options) => invoke("fs:makeDir", target, options),
  removePath: (target, options) => invoke("fs:remove", target, options),
  trashPath: (target) => invoke("os:trashPath", target),
  renamePath: (from, to) => invoke("fs:rename", from, to),
  copyFile: (from, to) => invoke("fs:copyFile", from, to),
  fileInfo: (target) => invoke("fs:fileInfo", target),
  watch: (targets, options) => invoke("fs:watch", targets, options),
  unwatch: (id) => invoke("fs:unwatch", id),
  onWatchEvent: (handler) => {
    const listener = (_event, id, changed) => handler(id, changed);
    ipcRenderer.on("fs:watch-event", listener);
    return () => ipcRenderer.off("fs:watch-event", listener);
  },

  // ---- window
  showWindow: () => invoke("window:show"),
  // The window's own controls, which the page draws everywhere but macOS.
  drawsWindowControls: () => invoke("window:drawsControls"),
  minimiseWindow: () => invoke("window:minimise"),
  toggleMaximiseWindow: () => invoke("window:toggleMaximise"),
  isWindowMaximised: () => invoke("window:isMaximised"),
  onMaximisedChanged: (handler) => {
    const listener = (_event, maximised) => handler(maximised);
    ipcRenderer.on("window:maximised", listener);
    return () => ipcRenderer.off("window:maximised", listener);
  },
  // The polite close a person's click means, as against `closeWindow`, which is
  // the renderer saying it has finished saving. See host-contract.ts.
  requestWindowClose: () => invoke("window:requestClose"),
  closeWindow: () => invoke("window:close"),
  destroyWindow: () => invoke("window:destroy"),
  watchClose: (wanted) => invoke("window:watchClose", wanted),
  // Which project this window has open, and asking for the window that already
  // has one. Both exist so a project open in a second window can be brought to
  // the front rather than refused — see `window:focusProject` in main.js.
  announceOpenProject: (projectPath) => invoke("window:announceProject", projectPath),
  focusWindowWithProject: (projectPath) => invoke("window:focusProject", projectPath),
  onCloseRequested: (handler) => {
    const listener = () => handler();
    ipcRenderer.on("window:close-requested", listener);
    return () => ipcRenderer.off("window:close-requested", listener);
  },

  // ---- the app itself
  appVersion: () => invoke("app:version"),
  restart: () => invoke("app:restart"),

  // ---- dialogs
  chooseDirectory: (options) => invoke("dialog:chooseDirectory", options),
  chooseFile: (options) => invoke("dialog:chooseFile", options),
  chooseSavePath: (options) => invoke("dialog:chooseSavePath", options),

  // ---- handing things to the OS
  openInSystem: (target) => invoke("os:openPath", target),
  openInBrowser: (url) => invoke("os:openExternal", url),
  revealInFileManager: (target) => invoke("os:revealItem", target),

  // ---- network
  fetchBytes: (url) => invoke("net:fetch", url),

  // ---- settings
  storeLoad: (fileName) => invoke("store:load", fileName),
  storeGet: (fileName, key) => invoke("store:get", fileName, key),
  storeSet: (fileName, key, value) => invoke("store:set", fileName, key, value),
  storeDelete: (fileName, key) => invoke("store:delete", fileName, key),
  storeSave: (fileName) => invoke("store:save", fileName),

  // ---- updates
  checkForUpdate: () => invoke("updates:check"),
  downloadUpdate: () => invoke("updates:download"),
  onUpdateProgress: (handler) => {
    const listener = (_event, progress) => handler(progress);
    ipcRenderer.on("updates:progress", listener);
    return () => ipcRenderer.off("updates:progress", listener);
  },
});
