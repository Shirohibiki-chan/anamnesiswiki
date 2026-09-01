// The `/` entry that puts an icon in the sentence. Phase 19.5.
//
// **It inserts and does not ask.** Every other picker in the app opens on a
// thing that is already there; this one would have to open on nothing, in the
// middle of a half-typed line, before she necessarily knows which icon she
// wants. So it drops a heart in and leaves — the icon is clickable afterwards,
// which is the entire difference between this and BlockNote's emoji command.
import type { BlockNoteEditor } from "@blocknote/core";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { Heart } from "lucide-react";
import { DEFAULT_INLINE_ICON, ICON_INLINE_TYPE } from "../../constants/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
export function getIconSlashMenuItems(editor: BlockNoteEditor<any, any, any>): DefaultReactSuggestionItem[] {
  return [
    {
      title: "Icon",
      subtext: "A small picture in the line you are writing",
      // "glyph" and "emoji" are both here because both tabs are behind this
      // one entry — somebody hunting for an emoji finds the picker that has
      // them rather than nothing.
      aliases: ["icon", "glyph", "emoji", "symbol"],
      group: "Basic blocks",
      icon: <Heart size={16} />,
      onItemClick: () => {
        editor.insertInlineContent([
          { type: ICON_INLINE_TYPE, props: { icon: DEFAULT_INLINE_ICON } },
          // A trailing space so the caret lands after the icon in ordinary
          // text rather than against its edge, where the next keystroke reads
          // as being inside it.
          " ",
        ]);
      },
    },
  ];
}
