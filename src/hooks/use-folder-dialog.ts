// The only import path components have into dialog-service.ts. See CLAUDE.md's
// layer order — components never import services directly.
import { pickFolder } from "../services/dialog-service";

export function useFolderDialog() {
  return { pickFolder };
}
