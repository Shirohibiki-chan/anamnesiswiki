// "Open folder", made forgiving (Phase 27).
//
// Unzipping a world commonly produces `Valeraverse/Valeraverse/`, and picking
// the outer folder used to be told there was no project in it. This looks one
// level in before giving up. The picker component just renders whatever comes
// back — see CLAUDE.md's layer order.
import { useCallback } from "react";
import { resolveChosenFolder } from "../services/filesystem-service";
import type { OpenFolderOutcome } from "../services/world-scan";

export function useOpenFolder(): (path: string) => Promise<OpenFolderOutcome> {
  return useCallback((path: string) => resolveChosenFolder(path), []);
}
