// What the `:` menu offers. Phase 19.5.
//
// **`:` already belonged to something, and this took it over on purpose.**
// BlockNote ships an emoji picker on that key and `BlockNoteView` mounts it by
// default — so before this, typing `:swo` in a page opened *their* grid and
// inserted a bare character. Two menus on one trigger is not a thing that can
// work: ours drew on screen while theirs answered the Enter, which is exactly
// what the first run of the scenarios found. `emojiPicker={false}` in
// `Editor.tsx` is what settles it, the same way `slashMenu={false}` already
// did for `/`.
//
// **So this menu owes her everything theirs did.** The emoji half is
// BlockNote's own list — the full emoji-mart set behind
// `getDefaultEmojiPickerItems`, several thousand of them — and not
// `constants/emoji.ts`, which is a curated few hundred chosen for a picker
// that browses rather than searches. Swapping their list for that one would
// have been a downgrade wearing a feature's clothes.
//
// **An emoji goes in as a character and a glyph goes in as an icon**, which is
// the one asymmetry here and it is deliberate. An emoji *is* a letter — it was
// one before this change and copying it out of a page should still give you
// one — so the emoji entries keep BlockNote's own insert. A glyph has no
// character to be, so it arrives as inline content that can be clicked and
// changed later.
//
// **The glyph search is ours rather than `filterSuggestionItems`.** That helper
// matches a menu item's title and aliases, and the glyph sets carry keywords
// that are the whole point — "health" reaches the heart, "hp" reaches it too.
// Running the items through it afterwards would throw that away and match on
// the name alone, so these arrive already filtered.
import { getDefaultEmojiPickerItems } from "@blocknote/core";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { searchGlyphs, searchCatalogue } from "../../constants/glyphs";
import { ICON_INLINE_TYPE } from "../../constants/schema";

/**
 * How many of each kind reach the menu.
 *
 * **A suggestion menu is not the picker and should not try to be.** Fifteen
 * hundred icons in a dropdown is a scroll nobody finishes; the picker exists
 * for browsing, and this exists for when she already knows the word. The cap is
 * what keeps typing `:s` from building an enormous list on every keystroke —
 * and the icon is clickable afterwards, so a near miss here opens the full
 * picker with one click rather than being a dead end.
 */
const GLYPH_LIMIT = 48;
/**
 * **Both are generous because the menu is a grid.** They were much smaller
 * while this drew as a list, where every entry cost a whole row; eight across
 * means a screenful of icons is a couple of centimetres. Still capped, because
 * the catalogue is fifteen hundred and the picker is where browsing all of
 * them belongs.
 */
const EMOJI_LIMIT = 24;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
export async function getIconMenuItems(editor: any, query: string): Promise<DefaultReactSuggestionItem[]> {
  // Curated first and the rest of Lucide behind it — the same order the picker
  // shows them in, so the two do not disagree about which sword is the obvious
  // one.
  const curated = searchGlyphs(query).flatMap((group) => group.glyphs);
  const rest = searchCatalogue(query);
  const glyphs = [...curated, ...rest].slice(0, GLYPH_LIMIT);

  // Theirs, kept whole: the items *and* their own `onItemClick`, so an emoji
  // lands exactly as it did before this menu existed. `id` is the character.
  //
  // **Only once she has typed something.** With an empty query their list is
  // every emoji there is, and the first twelve of several thousand are
  // whichever the data file happens to start with — a row of `💯` and `🆔`
  // under the glyphs, which is noise standing where the useful default should
  // be. A bare `:` shows the glyphs; the emoji arrive when there is a word to
  // match them against.
  const emoji = query.trim()
    ? (await getDefaultEmojiPickerItems(editor, query)).slice(0, EMOJI_LIMIT)
    : [];

  return [
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
    ...emoji.map((entry) => ({
      // **The character is the title and there is no icon beside it.** It is
      // the one row in this menu whose title *is* a picture, so giving it an
      // icon as well drew every emoji twice — once in the icon column and once
      // in the text. An emoji is recognised by looking at it and by nothing
      // else, which is why there is no name here to put in the title instead:
      // BlockNote's items carry the character and its click, and that is all.
      title: entry.id,
      group: "Emoji",
      onItemClick: entry.onItemClick,
    })),
  ];
}
