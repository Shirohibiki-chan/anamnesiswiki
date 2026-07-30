// Slash-menu entries for the three callouts, added alongside BlockNote's
// built-in items (see page/Editor.tsx). See docs/spec.md §BlockNote editor.
import { insertOrUpdateBlockForSlashMenu, type BlockNoteEditor } from "@blocknote/core";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { Info, Lock, MessageSquareQuote } from "lucide-react";

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
