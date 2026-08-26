import React from "react";
import ReactDOM from "react-dom/client";
import { showWindow } from "./services/host-service";
import App from "./App";
import { FONT_SLOTS } from "./constants/themes";
import { applyCachedAppearance } from "./services/theme-service";
import "./index.css";

// Before React, before anything is on screen. The real appearance settings
// live in the Tauri store, and reading that is a round trip into Rust that
// lands several frames after the window has pixels in it — long enough that
// picking a light theme meant watching the app open dark and change every
// launch. This replays the last applied result from localStorage, which is
// synchronous. useThemeBootstrap corrects it a moment later if it's stale.
applyCachedAppearance(FONT_SLOTS);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// The window is created hidden (`"visible": false` in tauri.conf.json) and
// revealed here, once something has actually been painted into it. Showing it
// any earlier means one frame of the webview's default white before our own
// background lands — brief, but on a dark app it reads as a camera flash.
//
// A window that is never shown is far worse than a flash, so this deliberately
// has two triggers and no conditions: the frame callback for the normal path,
// and a timer in case rAF never fires (a background/minimised launch throttles
// it). `show()` on an already-visible window is a no-op, so both firing is fine.
function revealWindow() {
  // Absent outside the desktop shell (`pnpm dev` in a plain browser), where
  // there is no window to reveal and nothing was ever hidden.
  showWindow().catch(() => {});
}

requestAnimationFrame(() => requestAnimationFrame(revealWindow));
setTimeout(revealWindow, 3000);
