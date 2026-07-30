// Thin wrapper around Tauri's native dialog plugin — the only file that
// touches @tauri-apps/plugin-dialog directly. Folder browsing stays a native
// OS dialog (that's the expected look for a file picker); destructive
// confirm prompts moved to an in-app themed modal instead — see
// state/dialog-store.ts and components/shell/ConfirmDialog.tsx.
import { open } from "@tauri-apps/plugin-dialog";

export async function pickFolder(options?: { title?: string; defaultPath?: string }): Promise<string | null> {
  const result = await open({ directory: true, multiple: false, ...options });
  return typeof result === "string" ? result : null;
}
