// How the app behaves. A store rather than component state because the two
// ends are far apart: the control is in the settings dialog, and what reads it
// is a tree row several components away that must react the moment it changes.
import { create } from "zustand";
import * as appSettings from "../services/app-settings-service";
import { setSnapshotRetention } from "../services/filesystem-service";
import {
  DEFAULT_PREFERENCES,
  parsePreferences,
  withSavedColor,
  type HistoryIntervalMinutes,
  type HistoryKeepDays,
  type HistoryPerPage,
  type ListPageSize,
  type ListPagingMode,
  type Preferences,
  type ProjectSort,
  type ProjectView,
  type TreeDoubleClickAction,
} from "../services/preferences-service";

export type PreferencesStoreState = {
  preferences: Preferences;
  /** Called once at startup. See StartupRouter. */
  loadPreferences: () => Promise<void>;
  setTreeDoubleClick: (action: TreeDoubleClickAction) => void;
  setListPaging: (mode: ListPagingMode) => void;
  setListPageSize: (size: ListPageSize) => void;
  setProjectView: (view: ProjectView) => void;
  setProjectSort: (sort: ProjectSort) => void;
  setHistoryInterval: (minutes: HistoryIntervalMinutes) => void;
  setHistoryKeepDays: (days: HistoryKeepDays) => void;
  setHistoryPerPage: (count: HistoryPerPage) => void;
  /** Keeps a colour mixed in the system picker, for use anywhere else. */
  saveColor: (color: string) => void;
  forgetColor: (color: string) => void;
};

export const usePreferencesStore = create<PreferencesStoreState>((set, get) => {
  // Applied to the screen first and written after, and the write is not
  // awaited by the caller — a settings toggle that waits on a disk round trip
  // before it moves is a toggle that feels broken. Same shape as the panel
  // widths, minus the debounce: nobody flips a checkbox sixty times a second.
  const apply = (preferences: Preferences) => {
    set({ preferences });
    pushRetention(preferences);
    void appSettings.setPreferences(preferences).catch(() => {});
  };

  // The one preference that something outside React has to be told about: the
  // code that prunes old copies runs on a disk write, not on a render, so it
  // cannot read a store. Pushed on every change and once on load — the second
  // matters more, since most sessions never open Settings at all.
  const pushRetention = (preferences: Preferences) => {
    setSnapshotRetention({
      intervalMs: preferences.historyIntervalMinutes * 60_000,
      maxAgeMs: preferences.historyKeepDays * 24 * 60 * 60_000,
      maxPerNode: preferences.historyPerPage,
    });
  };

  return {
    preferences: DEFAULT_PREFERENCES,

    // A settings file that won't open must not cost the user a usable app, so
    // a failure here leaves the defaults in place — which is also exactly what
    // a first run looks like. Same shape as loadPanelWidths and loadBindings.
    async loadPreferences() {
      try {
        const preferences = parsePreferences(await appSettings.getPreferences());
        set({ preferences });
        pushRetention(preferences);
      } catch {
        set({ preferences: DEFAULT_PREFERENCES });
        pushRetention(DEFAULT_PREFERENCES);
      }
    },

    setTreeDoubleClick(action) {
      apply({ ...get().preferences, treeDoubleClick: action });
    },

    setListPaging(mode) {
      apply({ ...get().preferences, listPaging: mode });
    },

    setListPageSize(size) {
      apply({ ...get().preferences, listPageSize: size });
    },

    setProjectView(view) {
      apply({ ...get().preferences, projectView: view });
    },

    setProjectSort(sort) {
      apply({ ...get().preferences, projectSort: sort });
    },

    setHistoryInterval(minutes) {
      apply({ ...get().preferences, historyIntervalMinutes: minutes });
    },

    setHistoryKeepDays(days) {
      apply({ ...get().preferences, historyKeepDays: days });
    },

    setHistoryPerPage(count) {
      apply({ ...get().preferences, historyPerPage: count });
    },

    saveColor(color) {
      const saved = withSavedColor(get().preferences.savedColors, color);
      if (saved === get().preferences.savedColors) return;
      apply({ ...get().preferences, savedColors: saved });
    },

    forgetColor(color) {
      apply({
        ...get().preferences,
        savedColors: get().preferences.savedColors.filter((entry) => entry !== color.toLowerCase()),
      });
    },
  };
});
