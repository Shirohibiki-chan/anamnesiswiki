// Feeds the shortcut sheet's Slash Commands tab: every `/` command, grouped
// the way the menu groups them. Read once for the life of the process — the
// list is a build artefact as far as the running app is concerned.
import { useMemo } from "react";
import { slashMenuCatalogue, type SlashCommand } from "../services/editor-blocks/slash-menu";

export type SlashCommandGroup = { group: string; commands: SlashCommand[] };

export function useSlashCatalogue(): SlashCommandGroup[] {
  return useMemo(() => {
    const groups: SlashCommandGroup[] = [];
    for (const command of slashMenuCatalogue()) {
      const last = groups[groups.length - 1];
      if (last && last.group === command.group) last.commands.push(command);
      else groups.push({ group: command.group, commands: [command] });
    }
    return groups;
  }, []);
}
