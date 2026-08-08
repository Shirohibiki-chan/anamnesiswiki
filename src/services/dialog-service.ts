// Thin wrapper around Tauri's native dialog plugin — the only file that
// touches @tauri-apps/plugin-dialog directly. Folder browsing stays a native
// OS dialog (that's the expected look for a file picker); destructive
// confirm prompts moved to an in-app themed modal instead — see
// state/dialog-store.ts and components/shell/ConfirmDialog.tsx.
import { open, save } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";

/**
 * Hands a folder to the OS file manager. Phase 12's themes and snippets are
 * loose `.css` files, and "put a file in this folder" is only a usable
 * instruction if there's a button that goes there — otherwise it's a Windows
 * path in a tooltip that has to be typed correctly.
 *
 * Not a disk touch, so it isn't in filesystem-service: nothing is read or
 * written, Explorer is just pointed at somewhere.
 */
export async function showFolder(path: string): Promise<void> {
  await openPath(path);
}

export async function pickFolder(options?: { title?: string; defaultPath?: string }): Promise<string | null> {
  const result = await open({ directory: true, multiple: false, ...options });
  return typeof result === "string" ? result : null;
}

// Phase 9 export destination. A native save dialog, same reasoning as the
// folder browser above: this is the look people expect from "save as", and it
// puts the file wherever they point it rather than somewhere we chose.
export async function pickLkSavePath(defaultName: string): Promise<string | null> {
  return save({
    title: "Export to LegendKeeper",
    defaultPath: `${defaultName}.lk`,
    filters: [{ name: "LegendKeeper export", extensions: ["lk"] }],
  });
}

/**
 * Phase 12 theme import. Two extensions in one filter on purpose: from where
 * she's standing, "a theme somebody sent me" and "the colours out of my other
 * project" are the same errand, and two menu entries that both mean *import a
 * look* would be a distinction the app cares about and she doesn't. What the
 * file turns out to be is worked out from it afterwards.
 */
export async function pickThemeFile(): Promise<string | null> {
  const result = await open({
    directory: false,
    multiple: false,
    title: "Import a theme or palette",
    filters: [{ name: "Theme or palette", extensions: ["css", "json"] }],
  });
  return typeof result === "string" ? result : null;
}

export async function pickLkFile(): Promise<string | null> {
  const result = await open({
    directory: false,
    multiple: false,
    title: "Import a LegendKeeper export",
    filters: [{ name: "LegendKeeper export", extensions: ["lk"] }],
  });
  return typeof result === "string" ? result : null;
}
