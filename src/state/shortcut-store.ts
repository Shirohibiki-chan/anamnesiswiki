// Which key does what, app-wide. A store rather than component state because
// three unrelated places need the same answer: the listener in AppLayout, the
// labels on buttons like the top bar's Search, and the settings screen that
// changes them.
import { create } from "zustand";
import { DEFAULT_BINDINGS, type Binding, type ShortcutAction } from "../constants/shortcuts";
import * as appSettings from "../services/app-settings-service";
import { mergeBindings, parseOverrides } from "../services/shortcut-service";

export type ShortcutStoreState = {
  /** Only the shortcuts the user has changed. This is what gets persisted. */
  overrides: Partial<Record<ShortcutAction, Binding>>;
  /** Defaults with the overrides applied — what everything else reads. */
  bindings: Record<ShortcutAction, Binding>;
  /**
   * True while the settings screen is waiting for the user to press a key.
   * The global listener sits out, so recording a binding can't also fire the
   * shortcut that binding currently belongs to.
   */
  isRecording: boolean;
  loadBindings: () => Promise<void>;
  setBinding: (action: ShortcutAction, binding: Binding) => Promise<void>;
  resetBinding: (action: ShortcutAction) => Promise<void>;
  resetAllBindings: () => Promise<void>;
  setRecording: (isRecording: boolean) => void;
};

export const useShortcutStore = create<ShortcutStoreState>((set, get) => {
  // Writes the overrides and updates what the app is using, in that order, so
  // a store that won't write leaves the keys as they were rather than working
  // until the next launch and then quietly reverting.
  const persist = async (overrides: Partial<Record<ShortcutAction, Binding>>) => {
    await appSettings.setShortcutOverrides(overrides);
    set({ overrides, bindings: mergeBindings(overrides) });
  };

  return {
    overrides: {},
    bindings: DEFAULT_BINDINGS,
    isRecording: false,

    // Called once at startup. A settings file that won't open must not cost
    // the user their shortcuts, so a failure here leaves the defaults in
    // place — which is also exactly what a first run looks like.
    async loadBindings() {
      try {
        const overrides = parseOverrides(await appSettings.getShortcutOverrides());
        set({ overrides, bindings: mergeBindings(overrides) });
      } catch {
        set({ overrides: {}, bindings: DEFAULT_BINDINGS });
      }
    },

    async setBinding(action, binding) {
      await persist({ ...get().overrides, [action]: binding });
    },

    async resetBinding(action) {
      const rest = { ...get().overrides };
      delete rest[action];
      await persist(rest);
    },

    async resetAllBindings() {
      await persist({});
    },

    setRecording(isRecording) {
      set({ isRecording });
    },
  };
});
