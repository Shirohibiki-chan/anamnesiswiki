// The only import path SettingsModal has into settings-search.ts. See
// CLAUDE.md's layer order — components never import services directly.
import { useMemo } from "react";
import { groupByTab, searchSettings, type SettingsEntry } from "../services/settings-search";

export type SettingsResultGroup = { tabId: string; tabLabel: string; entries: SettingsEntry[] };

export function useSettingsSearch(query: string): { results: SettingsEntry[]; groups: SettingsResultGroup[] } {
  return useMemo(() => {
    const results = searchSettings(query);
    return { results, groups: groupByTab(results) };
  }, [query]);
}

export type { SettingsEntry };
