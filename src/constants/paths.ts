// Default on-disk locations. See docs/constants-and-theming.md §Key Constants.
import { documentDir, join } from "@tauri-apps/api/path";

export const PROJECT_FILE = "project.json";
export const FOLDER_META_FILE = "_folder.json";
export const ASSETS_DIR = "assets";

export async function getDefaultProjectsDir(): Promise<string> {
  return join(await documentDir(), "Anamnesis");
}
