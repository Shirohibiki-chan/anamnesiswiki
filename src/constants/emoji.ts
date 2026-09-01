// The emoji half of the icon picker.
//
// **Characters, not images.** An emoji is stored as the character itself and
// drawn by the system font, so it needs no registry to read back, nothing is
// ever fetched, and an unknown stored value degrades to text rather than to a
// crash.
//
// **Every emoji there is, as of 2026-09-01, and the curated list it replaced
// was the whole problem.** Phase 18c shipped 129 of them chosen by hand, on the
// reasoning that a grid nobody can scan is worse than a short one somebody can.
// That reasoning was wrong in the way curated lists always are: her question
// was how you find an emoji whose name you do not know if you cannot scroll to
// it, and the answer under a hand-picked list is that you cannot, because it
// probably is not there. It also became a regression the moment `:` opened this
// picker instead of BlockNote's, which had carried the full set all along.
//
// **The data is `@emoji-mart/data` — MIT, and the same file BlockNote itself
// depends on**, so this is the list she was already getting, now reachable from
// every picker in the app rather than only inside the editor. It is read at
// module load and reshaped once into what the picker draws.
//
// **Cost, stated plainly:** about 475KB of JSON in the bundle, read off her own
// disk at launch. That is the same trade `glyph-catalogue.ts` records for the
// icons, and the same first place to look if launch ever feels slow — the fix
// there would be loading both on demand when the picker opens, not trimming
// either list again.
import data from "@emoji-mart/data";

export type EmojiGroup = { name: string; emoji: { char: string; keywords: string }[] };

/**
 * emoji-mart's own category ids, in its own order, given the names it gives
 * them in English.
 *
 * **Its order rather than one of ours.** It is the order every emoji keyboard
 * uses — faces, then animals, then food — so it is the one somebody scrolling
 * already knows. `frequent`, `search` and `custom` are the picker's own runtime
 * groups over there and have no emoji of their own here.
 */
const CATEGORY_NAMES: Record<string, string> = {
  people: "Smileys & People",
  nature: "Animals & Nature",
  foods: "Food & Drink",
  activity: "Activity",
  places: "Travel & Places",
  objects: "Objects",
  symbols: "Symbols",
  flags: "Flags",
};

type EmojiMartEntry = { id: string; name: string; keywords: string[]; skins: { native: string }[] };
type EmojiMartData = {
  categories: { id: string; emojis: string[] }[];
  emojis: Record<string, EmojiMartEntry>;
};

const emojiData = data as unknown as EmojiMartData;

/**
 * Every emoji, grouped the way the data ships them.
 *
 * **The searchable text is the name *and* the keywords, joined once here.**
 * `searchEmoji` runs on every keystroke over close to two thousand entries, and
 * rebuilding that string each time is the difference between a picker that
 * filters as you type and one that stutters. The id is in there too, because it
 * is the word emoji-mart's own users know — `:joy:` and the like.
 */
export const EMOJI_GROUPS: EmojiGroup[] = emojiData.categories
  .filter((category) => CATEGORY_NAMES[category.id])
  .map((category) => ({
    name: CATEGORY_NAMES[category.id],
    emoji: category.emojis
      .map((id) => emojiData.emojis[id])
      // A category can name an emoji the data does not carry — a version the
      // set was built without. Dropping it is right; drawing `undefined` in a
      // grid is not.
      .filter((entry): entry is EmojiMartEntry => Boolean(entry?.skins?.[0]?.native))
      .map((entry) => ({
        char: entry.skins[0].native,
        keywords: `${entry.id} ${entry.name} ${entry.keywords.join(" ")}`.toLowerCase(),
      })),
  }))
  .filter((group) => group.emoji.length > 0);

/**
 * The emoji matching a search, or every emoji when nothing is typed.
 *
 * Searched by name and keyword, since the character itself isn't something
 * anyone types into a search box. Groups with nothing left in them drop out
 * rather than showing an empty heading.
 */
export function searchEmoji(query: string): EmojiGroup[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return EMOJI_GROUPS;
  return EMOJI_GROUPS.map((group) => ({
    name: group.name,
    emoji: group.emoji.filter((entry) => entry.keywords.includes(trimmed)),
  })).filter((group) => group.emoji.length > 0);
}
