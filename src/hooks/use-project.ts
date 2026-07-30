// The only import path components have into project-store.ts. See CLAUDE.md's
// layer order — components never import stores directly.
import { useProjectStore } from "../state/project-store";

export function useProject() {
  return useProjectStore();
}
