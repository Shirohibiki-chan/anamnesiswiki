// Thin wrapper around Tauri's native dialog plugin — the only file that
// touches @tauri-apps/plugin-dialog directly. Folder browsing stays a native
// OS dialog (that's the expected look for a file picker); destructive
// confirm prompts moved to an in-app themed modal instead — see
// state/dialog-store.ts and components/shell/ConfirmDialog.tsx.
import { open, save } from "@tauri-apps/plugin-dialog";

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

export async function pickLkFile(): Promise<string | null> {
  const result = await open({
    directory: false,
    multiple: false,
    title: "Import a LegendKeeper export",
    filters: [{ name: "LegendKeeper export", extensions: ["lk"] }],
  });
  return typeof result === "string" ? result : null;
}
