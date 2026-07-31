// App-level modal state: things asked for from somewhere deep in the tree but
// rendered up at the shell.
//
// The confirm dialog is here because Tauri's native confirm() rendered as an
// OS-chrome dialog box, visually inconsistent with the app's own dark theme —
// this replaces it with a themed in-app modal while keeping the same "await a
// yes/no" call shape for consumers (see use-dialogs.ts and
// components/shell/ConfirmDialog.tsx).
//
// The export request is here for the routing reason rather than the theming
// one: it's raised by a row's right-click menu, and react-arborist renders
// rows itself, so there are no props to thread a callback down through.
import { create } from "zustand";

type PendingConfirm = { message: string; resolve: (ok: boolean) => void };

/** The nodes to export, plus their descendants. Null when the modal is shut. */
type ExportRequest = { rootIds: string[] };

type DialogStoreState = {
  pendingConfirm: PendingConfirm | null;
  requestConfirm: (message: string) => Promise<boolean>;
  resolveConfirm: (ok: boolean) => void;
  exportRequest: ExportRequest | null;
  requestExport: (rootIds: string[]) => void;
  closeExport: () => void;
};

export const useDialogStore = create<DialogStoreState>((set, get) => ({
  pendingConfirm: null,
  exportRequest: null,

  requestExport(rootIds) {
    set({ exportRequest: { rootIds } });
  },

  closeExport() {
    set({ exportRequest: null });
  },

  requestConfirm(message) {
    return new Promise<boolean>((resolve) => {
      set({ pendingConfirm: { message, resolve } });
    });
  },

  resolveConfirm(ok) {
    const pending = get().pendingConfirm;
    if (!pending) return;
    set({ pendingConfirm: null });
    pending.resolve(ok);
  },
}));
