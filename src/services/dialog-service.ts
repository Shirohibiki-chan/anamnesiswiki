// Thin wrapper around Tauri's native dialog plugin — the only file that
// touches @tauri-apps/plugin-dialog directly.
import { open } from "@tauri-apps/plugin-dialog";

export async function pickFolder(options?: { title?: string; defaultPath?: string }): Promise<string | null> {
  const result = await open({ directory: true, multiple: false, ...options });
  return typeof result === "string" ? result : null;
}
