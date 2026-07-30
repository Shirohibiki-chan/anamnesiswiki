// Thin wrapper around Tauri's native dialog plugin — the only file that
// touches @tauri-apps/plugin-dialog directly. The browser's own
// window.confirm()/alert() don't reliably work inside Tauri's webview, so
// anything needing a confirm prompt goes through here instead.
import { confirm, open } from "@tauri-apps/plugin-dialog";

export async function pickFolder(options?: { title?: string; defaultPath?: string }): Promise<string | null> {
  const result = await open({ directory: true, multiple: false, ...options });
  return typeof result === "string" ? result : null;
}

export async function confirmDestructive(message: string): Promise<boolean> {
  return confirm(message, { kind: "warning", okLabel: "Delete", cancelLabel: "Cancel" });
}
