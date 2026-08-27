// The only import path components have into dialog-service.ts and
// dialog-store.ts. See CLAUDE.md's layer order — components never import
// services or stores directly.
import { pickFolder, pickImportFile, pickLkSavePath } from "../services/dialog-service";
import { useDialogStore } from "../state/dialog-store";

export function useDialogs() {
  const pendingConfirm = useDialogStore((s) => s.pendingConfirm);
  const requestConfirm = useDialogStore((s) => s.requestConfirm);
  const resolveConfirm = useDialogStore((s) => s.resolveConfirm);
  const exportRequest = useDialogStore((s) => s.exportRequest);
  const requestExport = useDialogStore((s) => s.requestExport);
  const closeExport = useDialogStore((s) => s.closeExport);
  const notice = useDialogStore((s) => s.notice);
  const showNotice = useDialogStore((s) => s.showNotice);
  const dismissNotice = useDialogStore((s) => s.dismissNotice);
  const pendingTemplateScope = useDialogStore((s) => s.pendingTemplateScope);
  const requestTemplateScope = useDialogStore((s) => s.requestTemplateScope);
  const resolveTemplateScope = useDialogStore((s) => s.resolveTemplateScope);
  const historyNodeId = useDialogStore((s) => s.historyNodeId);
  const openHistory = useDialogStore((s) => s.openHistory);
  const closeHistory = useDialogStore((s) => s.closeHistory);
  const pendingAssetPick = useDialogStore((s) => s.pendingAssetPick);
  const requestAssetPick = useDialogStore((s) => s.requestAssetPick);
  const resolveAssetPick = useDialogStore((s) => s.resolveAssetPick);
  return {
    historyNodeId,
    openHistory,
    closeHistory,
    pendingAssetPick,
    requestAssetPick,
    resolveAssetPick,
    notice,
    showNotice,
    dismissNotice,
    pendingTemplateScope,
    requestTemplateScope,
    resolveTemplateScope,
    pickFolder,
    pickImportFile,
    pickLkSavePath,
    confirmDestructive: requestConfirm,
    pendingConfirm,
    resolveConfirm,
    exportRequest,
    requestExport,
    closeExport,
  };
}
