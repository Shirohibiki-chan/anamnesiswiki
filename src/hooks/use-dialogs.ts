// The only import path components have into dialog-service.ts. See CLAUDE.md's
// layer order — components never import services directly.
import { confirmDestructive, pickFolder } from "../services/dialog-service";

export function useDialogs() {
  return { pickFolder, confirmDestructive };
}
