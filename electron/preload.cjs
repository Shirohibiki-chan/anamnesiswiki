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

contextBridge.exposeInMainWorld("anamnesisHost", {
  separator,

  // ---- paths
  documentsDir: () => ipcRenderer.invoke("path:documentsDir"),
  joinPath: (segments) => ipcRenderer.invoke("path:join", segments),

  // ---- filesystem
  exists: (target) => ipcRenderer.invoke("fs:exists", target),
  readTextFile: (target) => ipcRenderer.invoke("fs:readTextFile", target),
  writeTextFile: (target, contents) => ipcRenderer.invoke("fs:writeTextFile", target, contents),
  readFile: (target) => ipcRenderer.invoke("fs:readFile", target),
  writeFile: (target, contents) => ipcRenderer.invoke("fs:writeFile", target, contents),
  readDir: (target) => ipcRenderer.invoke("fs:readDir", target),
  makeDir: (target, options) => ipcRenderer.invoke("fs:makeDir", target, options),
  removePath: (target, options) => ipcRenderer.invoke("fs:remove", target, options),
  renamePath: (from, to) => ipcRenderer.invoke("fs:rename", from, to),
  copyFile: (from, to) => ipcRenderer.invoke("fs:copyFile", from, to),
  fileInfo: (target) => ipcRenderer.invoke("fs:fileInfo", target),
  watch: (targets, options) => ipcRenderer.invoke("fs:watch", targets, options),
  unwatch: (id) => ipcRenderer.invoke("fs:unwatch", id),
  onWatchEvent: (handler) => {
    const listener = (_event, id, changed) => handler(id, changed);
    ipcRenderer.on("fs:watch-event", listener);
    return () => ipcRenderer.off("fs:watch-event", listener);
  },

  // ---- window
  showWindow: () => ipcRenderer.invoke("window:show"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  destroyWindow: () => ipcRenderer.invoke("window:destroy"),
  watchClose: (wanted) => ipcRenderer.invoke("window:watchClose", wanted),
  onCloseRequested: (handler) => {
    const listener = () => handler();
    ipcRenderer.on("window:close-requested", listener);
    return () => ipcRenderer.off("window:close-requested", listener);
  },

  // ---- the app itself
  appVersion: () => ipcRenderer.invoke("app:version"),
  restart: () => ipcRenderer.invoke("app:restart"),

  // ---- dialogs
  chooseDirectory: (options) => ipcRenderer.invoke("dialog:chooseDirectory", options),
  chooseFile: (options) => ipcRenderer.invoke("dialog:chooseFile", options),
  chooseSavePath: (options) => ipcRenderer.invoke("dialog:chooseSavePath", options),

  // ---- handing things to the OS
  openInSystem: (target) => ipcRenderer.invoke("os:openPath", target),
  openInBrowser: (url) => ipcRenderer.invoke("os:openExternal", url),
  revealInFileManager: (target) => ipcRenderer.invoke("os:revealItem", target),

  // ---- network
  fetchBytes: (url) => ipcRenderer.invoke("net:fetch", url),

  // ---- settings
  storeLoad: (fileName) => ipcRenderer.invoke("store:load", fileName),
  storeGet: (fileName, key) => ipcRenderer.invoke("store:get", fileName, key),
  storeSet: (fileName, key, value) => ipcRenderer.invoke("store:set", fileName, key, value),
  storeDelete: (fileName, key) => ipcRenderer.invoke("store:delete", fileName, key),
  storeSave: (fileName) => ipcRenderer.invoke("store:save", fileName),

  // ---- updates
  checkForUpdate: () => ipcRenderer.invoke("updates:check"),
});
