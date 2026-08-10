// Thin wrapper around Tauri's native dialog plugin — the only file that
// touches @tauri-apps/plugin-dialog directly. Folder browsing stays a native
// OS dialog (that's the expected look for a file picker); destructive
// confirm prompts moved to an in-app themed modal instead — see
// state/dialog-store.ts and components/shell/ConfirmDialog.tsx.
import { open, save } from "@tauri-apps/plugin-dialog";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";

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

/**
 * Opens the folder a file sits in with that file *selected*, rather than
 * opening the file. Distinct from `showFolder` above and not a duplicate of
 * it: pointing Explorer at a page's own folder would show its insides, and
 * "show me where this is" means the row highlighted among its siblings — the
 * same thing every editor's Reveal in File Explorer does.
 *
 * Also not a disk touch, same as `showFolder`: nothing is read or written.
 * Whether the path is really there is settled before this is called, by
 * `findNodeOnDisk` in filesystem-service, because a missing path here fails
 * differently on each OS and on Windows tends to open Documents instead.
 */
export async function revealItem(path: string): Promise<void> {
  await revealItemInDir(path);
}

/**
 * What to call the thing the menu item opens. Releases build for Windows,
 * macOS and Linux, so a fixed "Show in File Explorer" is wrong on two of the
 * three — and this is a menu entry someone reads to find out what it does,
 * which makes the OS's own word for it the whole content of the label.
 *
 * Lowercase "file manager" on Linux is deliberate: there's no single name to
 * capitalise, since it could be Nautilus, Dolphin or Thunar.
 */
export function fileManagerName(): string {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes("mac")) return "Finder";
  if (platform.includes("win")) return "File Explorer";
  return "file manager";
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
