// The whole `/` menu, assembled in one place — and listed from the same place.
//
// This used to be built inside `use-editor.ts`, which was fine while the only
// reader was the editor. The shortcut sheet now lists the commands too (Queued
// Adjustments, 2026-09-21), and a hand-written second copy of that list would
// be wrong within a month — the same mistake the rebindable-keys design was
// built to avoid. So the assembly lives here, the editor calls it with its
// real actions, and the sheet calls it with none against a throwaway editor
// and keeps only the words.
import { BlockNoteEditor } from "@blocknote/core";
import { getDefaultReactSlashMenuItems, type DefaultReactSuggestionItem } from "@blocknote/react";
import { editorSchema } from "./editor-schema";
import { getAutoLinkSlashMenuItems } from "./auto-link-slash-menu";
import { getCalloutSlashMenuItems, withoutBuiltInQuote } from "./callout-slash-menu";
import { getColumnSlashMenuItems } from "./column-slash-menu";
import { getIconSlashMenuItems } from "./icon-slash-menu";
import { getMediaSlashMenuItems } from "./media-slash-menu";
import { getNewPageSlashMenuItems } from "./new-page-slash-menu";
import { getPageBlockSlashMenuItems, type AddPageBlock } from "./page-block-slash-menu";

/** What the menu's own entries do that the editor alone cannot. */
export type SlashMenuActions = {
  /** `/New page`: makes a page and links it here. */
  newPage: () => void;
  /** A sidebar block offered in the page — makes the record, returns its id. */
  addPageBlock: AddPageBlock;
  /** `/Link page names`: the one entry that inserts nothing. */
  linkPageNames: () => void;
};

export function slashMenuItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
  editor: BlockNoteEditor<any, any, any>,
  actions: SlashMenuActions,
): DefaultReactSuggestionItem[] {
  return [
    ...withoutBuiltInQuote(getDefaultReactSlashMenuItems(editor)),
    ...getCalloutSlashMenuItems(editor),
    ...getNewPageSlashMenuItems(actions.newPage),
    ...getIconSlashMenuItems(editor),
    // The sidebar's blocks, offered in the page. See page-block-slash-menu.tsx.
    ...getPageBlockSlashMenuItems(editor, actions.addPageBlock),
    // Side-by-side lanes. Nothing to make first — a row is made of blocks the
    // editor already knows how to draw. See column-slash-menu.tsx.
    ...getColumnSlashMenuItems(editor),
    // A player, for a link not on the clipboard yet. Phase 31. Pasting the
    // link on an empty line is the other way in — see use-editor.ts.
    ...getMediaSlashMenuItems(editor),
    // The one entry that inserts nothing: it acts on prose already written.
    ...getAutoLinkSlashMenuItems(actions.linkPageNames),
  ];
}

export type SlashCommand = {
  title: string;
  subtext: string;
  group: string;
  /** The other words the menu answers to. */
  aliases: string[];
  /**
   * The shortest thing to type after the `/` that reaches this command and
   * no earlier one — "ul" for Bullet List, and then not "ul" again for Check
   * List, whose aliases start with the same word. The title when every alias
   * is already taken.
   */
  short: string;
};

let catalogue: SlashCommand[] | null = null;

/**
 * Every command the `/` menu offers, as words: title, what it does, its
 * group and the aliases it answers to.
 *
 * **Built once, from a headless editor, with no actions behind it.** The
 * items need an editor to exist — BlockNote's own take one to insert with —
 * but nothing here ever inserts, so a throwaway editor on the app's schema is
 * enough and is made the first time anybody asks. The order is the menu's
 * order; the sheet groups it the way the menu does.
 */
export function slashMenuCatalogue(): SlashCommand[] {
  if (catalogue) return catalogue;
  const editor = BlockNoteEditor.create({ schema: editorSchema });
  const nothing = () => {};
  const claimed = new Set<string>();
  catalogue = slashMenuItems(editor, { newPage: nothing, addPageBlock: () => "", linkPageNames: nothing }).map(
    (item) => {
      const aliases = item.aliases ?? [];
      const short = aliases.find((alias) => !claimed.has(alias.toLowerCase())) ?? item.title;
      claimed.add(short.toLowerCase());
      return { title: item.title, subtext: item.subtext ?? "", group: item.group ?? "", aliases, short };
    },
  );
  return catalogue;
}
