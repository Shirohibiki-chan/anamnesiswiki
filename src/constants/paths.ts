// Default on-disk locations. See docs/constants-and-theming.md §Key Constants.
import { documentDir, join } from "@tauri-apps/api/path";

export const PROJECT_FILE = "project.json";
export const FOLDER_META_FILE = "_folder.json";
// Own-data marker for a nestable non-folder node (character/location/faction/
// species) — same idea as FOLDER_META_FILE, so a page that can hold children
// stores itself inside its own directory instead of a flat sibling file. That
// makes its directory's identity independent of its current name, so a
// rename can never orphan its children on the next project load.
export const PAGE_META_FILE = "_page.json";
export const ASSETS_DIR = "assets";

export async function getDefaultProjectsDir(): Promise<string> {
  return join(await documentDir(), "Anamnesis");
}
