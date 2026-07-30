// Backs the in-app confirm dialog (see components/shell/ConfirmDialog.tsx).
// Tauri's native confirm() rendered as an OS-chrome dialog box, visually
// inconsistent with the app's own dark theme — this replaces it with a
// themed in-app modal while keeping the same "await a yes/no" call shape for
// consumers (see use-dialogs.ts).
import { create } from "zustand";

type PendingConfirm = { message: string; resolve: (ok: boolean) => void };

type DialogStoreState = {
  pendingConfirm: PendingConfirm | null;
  requestConfirm: (message: string) => Promise<boolean>;
  resolveConfirm: (ok: boolean) => void;
};

export const useDialogStore = create<DialogStoreState>((set, get) => ({
  pendingConfirm: null,

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
