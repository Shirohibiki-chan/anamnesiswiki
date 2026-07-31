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

// Prefix for the temporary name a node is parked under mid-move. Several
// nodes swapping paths have to be staged out of the way first, or one lands on
// another's name (see filesystem-service's applyRelocations).
//
// The load walk knows this prefix too, and that is not optional: if a move is
// interrupted, whatever is still parked under one of these names is a real
// page, and the loader has to recognise it as one rather than treat it as
// junk. Changing this string without changing both sides makes any
// interrupted move look like data loss.
export const MOVE_TEMP_PREFIX = ".anamnesis-move-";

export async function getDefaultProjectsDir(): Promise<string> {
  return join(await documentDir(), "Anamnesis");
}
