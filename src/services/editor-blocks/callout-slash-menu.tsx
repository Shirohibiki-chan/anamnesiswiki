// Slash-menu entries for the three callouts, added alongside BlockNote's
// built-in items (see page/Editor.tsx). See docs/spec.md §BlockNote editor.
//
// **And one of the built-in items removed.** BlockNote ships its own Quote,
// which inserts its own quote block — a different type from our Quote callout,
// kept because LK import maps a plain blockquote to it. Since both are now
// drawn the same (page.css), two entries called Quote in one menu are a coin
// toss with no visible difference and a different `.lk` export behind it. Ours
// stays, since it is the one the app is built around.
import { insertOrUpdateBlockForSlashMenu, type BlockNoteEditor } from "@blocknote/core";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { Info, Lock, MessageSquareQuote } from "lucide-react";

/**
 * BlockNote's own Quote entry, taken out of its default list.
 *
 * **Matched on the title, which is the only handle there is.** The core type
 * carries a stable `key`, and the React wrapper `Omit`s it before we ever see
 * the item — so a title it is. The app has no i18n, so the string is fixed;
 * and if BlockNote ever renames it the failure is the duplicate coming back,
 * which is visible in the menu rather than dangerous.
 */
export function withoutBuiltInQuote(items: DefaultReactSuggestionItem[]): DefaultReactSuggestionItem[] {
  return items.filter((item) => item.title !== "Quote");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
export function getCalloutSlashMenuItems(editor: BlockNoteEditor<any, any, any>): DefaultReactSuggestionItem[] {
  return [
    {
      title: "Info",
      subtext: "Blue callout for intro or description text",
      aliases: ["info", "callout"],
      group: "Callouts",
      icon: <Info size={16} />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "calloutInfo" }),
    },
    {
      title: "Quote",
      subtext: "Grey italic callout for character quotes",
      aliases: ["quote", "callout"],
      group: "Callouts",
      icon: <MessageSquareQuote size={16} />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "calloutQuote" }),
    },
    {
      title: "Secret",
      subtext: "Purple callout for admin-only content",
      aliases: ["secret", "callout"],
      group: "Callouts",
      icon: <Lock size={16} />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "calloutSecret" }),
    },
  ];
}
