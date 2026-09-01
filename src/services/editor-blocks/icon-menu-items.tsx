// What the `:` menu offers. Phase 19.5.
//
// **A type-ahead, not a picker, and the two are different jobs.** This is the
// Discord gesture: you know what you want, you type `:sm`, you take it with
// Enter or Tab without your hands leaving the keyboard. It is a single column
// with a name against each row because that is a list you *read down*, and it
// only appears once there is something to match — a colon on its own is
// punctuation far more often than it is a request.
//
// **The picker is the other half and lives on Ctrl+`:`** — the whole
// catalogue, both tabs, and a grid to scroll when you do not know the name.
// Neither replaces the other, which is the thing three attempts at this got
// wrong by trying to make one control do both.
//
// **Emoji are named `:joy:` here, with the colons written back in.** That is
// what the thing is called everywhere else somebody types one, and it is what
// makes the list legible as emoji rather than as a column of pictures.
import type { BlockNoteEditor } from "@blocknote/core";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { searchEmoji } from "../../constants/emoji";
import { searchCatalogue, searchGlyphs } from "../../constants/glyphs";
import { ICON_INLINE_TYPE } from "../../constants/schema";

/**
 * How many of each kind reach the menu.
 *
 * **A type-ahead is not a place to browse.** Anything past the first screenful
 * is not being read; it is being scrolled past on the way to giving up and
 * opening the picker, which is the control that exists for exactly that. The
 * caps keep the list to something you can take in at a glance and keep the
 * work per keystroke small.
 */
const GLYPH_LIMIT = 10;
const EMOJI_LIMIT = 15;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
export function getIconMenuItems(editor: BlockNoteEditor<any, any, any>, query: string): DefaultReactSuggestionItem[] {
  const curated = searchGlyphs(query).flatMap((group) => group.glyphs);
  const glyphs = [...curated, ...searchCatalogue(query)].slice(0, GLYPH_LIMIT);
  const emoji = searchEmoji(query)
    .flatMap((group) => group.emoji)
    .slice(0, EMOJI_LIMIT);

  return [
    // **Emoji first**, because `:` is the emoji key everywhere else and that is
    // what the hand reaching for it expects to find. The glyphs are ours alone
    // and sit under them.
    ...emoji.map((entry) => ({
      title: `:${entry.id}:`,
      group: "Emoji",
      icon: <span className="icon-as-text">{entry.char}</span>,
      onItemClick: () => {
        // **A plain character, the way it has always gone in.** An emoji *is* a
        // letter: it copies out of the page as itself, exports as itself, and
        // has nothing a click could usefully change. Only a glyph needs to stay
        // an object, because it has no character to be.
        editor.insertInlineContent([entry.char, " "]);
      },
    })),
    ...glyphs.map((glyph) => {
      const Glyph = glyph.icon;
      return {
        title: glyph.name,
        group: "Icons",
        icon: <Glyph size={16} />,
        onItemClick: () => {
          editor.insertInlineContent([{ type: ICON_INLINE_TYPE, props: { icon: glyph.name } }, " "]);
        },
      };
    }),
  ];
}
