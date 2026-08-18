// Thin wrapper around Tauri's native dialog plugin — the only file that
// touches @tauri-apps/plugin-dialog directly. Folder browsing stays a native
// OS dialog (that's the expected look for a file picker); destructive
// confirm prompts moved to an in-app themed modal instead — see
// state/dialog-store.ts and components/shell/ConfirmDialog.tsx.
import { open, save } from "@tauri-apps/plugin-dialog";
import { openPath, openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";

/**
 * Whether a native picker is already up.
 *
 * The OS dialog is modal to the app window, so the app cannot know the user
 * clicked the button again — but React can, if the click landed before the
 * dialog appeared. Asking the OS for a second dialog while the first is still
 * open is how you get a picker that seems not to open at all: the second call
 * is the one the caller is waiting on, and it never gets a window.
 *
 * A module-level flag rather than component state because the callers are in
 * different trees — the import modal, the start screen, settings — and there
 * is only ever one OS dialog to be had between them.
 */
let pending: Promise<unknown> | null = null;

/**
 * Runs one native dialog at a time, and lets its failures out.
 *
 * Every caller reaches this through a click handler that discards the promise,
 * so a rejection here used to end as an unhandled one in the console: the
 * button did nothing, said nothing, and left no way to tell a cancelled dialog
 * from a broken one.
 *
 * **A repeat press joins the dialog that is already open rather than being
 * turned away.** The first shape of this was a boolean and an early `null`,
 * which is a trap: one call that never settles — and a dialog this app cannot
 * see is exactly the kind that might not — would leave the flag stuck on, and
 * every picker in the app dead until restart, silently, which is a worse
 * version of the bug this file is trying to fix. Handing back the in-flight
 * promise has no state to get stuck in. There is nothing to reset, because the
 * promise itself is the record of whether a dialog is open.
 */
async function onePicker<T>(run: () => Promise<T>): Promise<T | null> {
  if (pending) return (await pending) as T | null;
  const call = run();
  pending = call;
  try {
    return await call;
  } finally {
    // Only if it is still ours: a later call may already have replaced it.
    if (pending === call) pending = null;
  }
}

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
  const result = await onePicker(() => open({ directory: true, multiple: false, ...options }));
  return typeof result === "string" ? result : null;
}

// Phase 9 export destination. A native save dialog, same reasoning as the
// folder browser above: this is the look people expect from "save as", and it
// puts the file wherever they point it rather than somewhere we chose.
export async function pickLkSavePath(defaultName: string): Promise<string | null> {
  return onePicker(() =>
    save({
      // Still named here, unlike the import side: this file is *for* that
      // app, and a generic label would hide the one thing she needs to know
      // about it. The export modal behind it says the same.
      title: "Export to LegendKeeper",
      defaultPath: `${defaultName}.lk`,
      filters: [{ name: "LegendKeeper export", extensions: ["lk"] }],
    }),
  );
}

/**
 * Where to put a copy of a picture that's in a page (Phase 16). No extension
 * filter: the copy keeps whatever the original is, and offering to "save as
 * .png" a file that's a .webp would either lie about the contents or convert
 * something nobody asked to convert. The suggested name already carries the
 * right extension.
 */
export async function pickImageSavePath(defaultName: string): Promise<string | null> {
  return onePicker(() => save({ title: "Save a copy of this picture", defaultPath: defaultName }));
}

/**
 * Hands a web address to the OS's default browser. The app makes no request of
 * its own — this is the same mechanism the releases link uses, and the reason
 * "save a copy" of an *embedded* picture opens it rather than downloading it:
 * saving it here would mean fetching it here, and the browser is already the
 * tool for that.
 */
export async function openExternalUrl(url: string): Promise<void> {
  await openUrl(url);
}

/**
 * Phase 12 theme import. Two extensions in one filter on purpose: from where
 * she's standing, "a theme somebody sent me" and "the colours out of my other
 * project" are the same errand, and two menu entries that both mean *import a
 * look* would be a distinction the app cares about and she doesn't. What the
 * file turns out to be is worked out from it afterwards.
 */
export async function pickThemeFile(): Promise<string | null> {
  const result = await onePicker(() =>
    open({
      directory: false,
      multiple: false,
      title: "Import a theme or palette",
      filters: [
        { name: "Theme or palette", extensions: ["css", "json"] },
        { name: "All files", extensions: ["*"] },
      ],
    }),
  );
  return typeof result === "string" ? result : null;
}

/**
 * The file to import a project from.
 *
 * **The second filter is not padding.** A single-extension filter hides every
 * file that isn't named exactly right, and an export that arrived as
 * `world.lk.zip`, or one whose extension Windows is hiding, is then invisible
 * in a folder she can see it in — which reads as the picker being broken
 * rather than as a filter doing its job. Letting her pick anything means a bad
 * choice fails at the parse step with a message, which is a better place to
 * fail than a file list that silently omits the file.
 *
 * `.lk` is the only format there is so far. When the Markdown, Obsidian and
 * World Anvil importers land (docs/plan.md), they belong in this same picker
 * as more entries rather than as separate buttons — the errand is "bring my
 * world in", and which program it came out of is a detail of the file.
 */
export async function pickImportFile(): Promise<string | null> {
  const result = await onePicker(() =>
    open({
      directory: false,
      multiple: false,
      title: "Import a project",
      filters: [
        { name: "Project export (.lk)", extensions: ["lk"] },
        { name: "All files", extensions: ["*"] },
      ],
    }),
  );
  return typeof result === "string" ? result : null;
}
