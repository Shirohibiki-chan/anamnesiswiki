// The only import path components have into dialog-service.ts and
// dialog-store.ts. See CLAUDE.md's layer order — components never import
// services or stores directly.
import { pickFolder } from "../services/dialog-service";
import { useDialogStore } from "../state/dialog-store";

export function useDialogs() {
  const pendingConfirm = useDialogStore((s) => s.pendingConfirm);
  const requestConfirm = useDialogStore((s) => s.requestConfirm);
  const resolveConfirm = useDialogStore((s) => s.resolveConfirm);
  return { pickFolder, confirmDestructive: requestConfirm, pendingConfirm, resolveConfirm };
}
