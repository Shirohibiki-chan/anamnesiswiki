// The emoji half of the icon picker. Phase 18c.
//
// **Characters, not images.** An emoji is stored as the character itself and
// drawn by the system font, so this costs nothing in the bundle, needs no
// registry to read back, and can never fetch anything — which is the only way
// an emoji picker belongs in an app with this Policy Boundary.
//
// A curated set for the same reason `glyphs.ts` is curated: the full list is
// several thousand, most of them irrelevant to a world, and a grid nobody can
// scan is worse than a short one somebody can.
export type EmojiGroup = { name: string; emoji: { char: string; keywords: string }[] };

export const EMOJI_GROUPS: EmojiGroup[] = [
  {
    name: "Faces",
    emoji: [
      { char: "😀", keywords: "happy smile grin joy" },
      { char: "😅", keywords: "nervous sweat laugh" },
      { char: "😂", keywords: "laugh crying joy" },
      { char: "🙂", keywords: "slight smile content" },
      { char: "😊", keywords: "warm happy blush" },
      { char: "😍", keywords: "love hearts adore" },
      { char: "😘", keywords: "kiss love" },
      { char: "😎", keywords: "cool sunglasses confident" },
      { char: "🤔", keywords: "thinking wonder doubt" },
      { char: "😐", keywords: "neutral blank flat" },
      { char: "😴", keywords: "sleep tired rest" },
      { char: "😭", keywords: "cry sob grief sad" },
      { char: "😡", keywords: "angry rage furious" },
      { char: "😱", keywords: "scream fear shock" },
      { char: "🥶", keywords: "cold freezing" },
      { char: "🥵", keywords: "hot burning heat" },
      { char: "🤒", keywords: "sick ill fever" },
      { char: "🤕", keywords: "hurt injured wound" },
      { char: "😇", keywords: "innocent angel halo" },
      { char: "😈", keywords: "devil mischief evil" },
      { char: "💀", keywords: "death skull dead" },
      { char: "👻", keywords: "ghost spirit haunt" },
      { char: "🤖", keywords: "robot machine construct" },
      { char: "👽", keywords: "alien strange other" },
    ],
  },
  {
    name: "People & body",
    emoji: [
      { char: "👑", keywords: "crown king queen royal" },
      { char: "🧙", keywords: "wizard mage magic" },
      { char: "🧝", keywords: "elf fae" },
      { char: "🧛", keywords: "vampire undead" },
      { char: "🧜", keywords: "merfolk mermaid sea" },
      { char: "🧟", keywords: "zombie undead" },
      { char: "🦸", keywords: "hero super" },
      { char: "🦹", keywords: "villain super" },
      { char: "👤", keywords: "person silhouette anonymous" },
      { char: "👥", keywords: "people group party" },
      { char: "🫀", keywords: "heart organ life" },
      { char: "🧠", keywords: "brain mind sanity" },
      { char: "👁️", keywords: "eye sight watch" },
      { char: "🦴", keywords: "bone skeleton" },
      { char: "💪", keywords: "strength muscle power" },
      { char: "🤝", keywords: "handshake alliance deal" },
      { char: "🙏", keywords: "pray please thanks" },
      { char: "✊", keywords: "fist resolve rebellion" },
    ],
  },
  {
    name: "Nature",
    emoji: [
      { char: "🔥", keywords: "fire flame burn rage" },
      { char: "💧", keywords: "water drop blood" },
      { char: "🌊", keywords: "wave sea ocean" },
      { char: "❄️", keywords: "snow ice cold frost" },
      { char: "⚡", keywords: "lightning energy power" },
      { char: "🌪️", keywords: "tornado storm wind" },
      { char: "🌙", keywords: "moon night lunar" },
      { char: "☀️", keywords: "sun day light" },
      { char: "⭐", keywords: "star rating favourite" },
      { char: "🌟", keywords: "star shine magic" },
      { char: "🌈", keywords: "rainbow hope colour" },
      { char: "🌍", keywords: "world earth globe" },
      { char: "🏔️", keywords: "mountain peak snow" },
      { char: "🌲", keywords: "tree forest pine" },
      { char: "🌳", keywords: "tree forest wood" },
      { char: "🍂", keywords: "leaves autumn fall" },
      { char: "🌸", keywords: "flower blossom spring" },
      { char: "🌹", keywords: "rose flower love" },
      { char: "🍄", keywords: "mushroom fungus forest" },
      { char: "🌾", keywords: "wheat harvest rations" },
    ],
  },
  {
    name: "Creatures",
    emoji: [
      { char: "🐺", keywords: "wolf beast pack" },
      { char: "🦊", keywords: "fox cunning" },
      { char: "🐱", keywords: "cat feline familiar" },
      { char: "🐶", keywords: "dog hound companion" },
      { char: "🐴", keywords: "horse mount steed" },
      { char: "🐉", keywords: "dragon wyrm beast" },
      { char: "🐍", keywords: "snake serpent venom" },
      { char: "🕷️", keywords: "spider web venom" },
      { char: "🦅", keywords: "eagle bird flight" },
      { char: "🦉", keywords: "owl wisdom night" },
      { char: "🐦", keywords: "bird messenger" },
      { char: "🐟", keywords: "fish sea food" },
      { char: "🦌", keywords: "deer stag forest" },
      { char: "🐻", keywords: "bear beast strength" },
      { char: "🐀", keywords: "rat vermin plague" },
      { char: "🦇", keywords: "bat night cave" },
    ],
  },
  {
    name: "Objects",
    emoji: [
      { char: "⚔️", keywords: "swords battle war combat" },
      { char: "🗡️", keywords: "dagger blade knife" },
      { char: "🛡️", keywords: "shield defence armour" },
      { char: "🏹", keywords: "bow arrow archer" },
      { char: "🔮", keywords: "crystal ball magic fortune" },
      { char: "🧪", keywords: "potion flask alchemy" },
      { char: "⚗️", keywords: "alembic alchemy brew" },
      { char: "📜", keywords: "scroll lore document" },
      { char: "📖", keywords: "book lore knowledge" },
      { char: "🗝️", keywords: "key unlock secret" },
      { char: "🔒", keywords: "lock closed secure" },
      { char: "💰", keywords: "money gold wealth" },
      { char: "💎", keywords: "gem jewel treasure" },
      { char: "👜", keywords: "bag inventory carry" },
      { char: "🎭", keywords: "masks theatre drama" },
      { char: "🎲", keywords: "dice chance luck" },
      { char: "🕯️", keywords: "candle light ritual" },
      { char: "⚓", keywords: "anchor ship sea" },
      { char: "🧭", keywords: "compass direction travel" },
      { char: "🗺️", keywords: "map world atlas" },
      { char: "🏰", keywords: "castle keep fortress" },
      { char: "⛺", keywords: "tent camp travel" },
      { char: "🚪", keywords: "door passage exit" },
      { char: "⌛", keywords: "hourglass time fate" },
      { char: "🔔", keywords: "bell alarm alert" },
      { char: "🎵", keywords: "music song bard" },
      { char: "🍷", keywords: "wine drink tavern" },
      { char: "🍖", keywords: "meat food rations" },
      { char: "🍞", keywords: "bread food rations" },
      { char: "☠️", keywords: "poison death danger" },
    ],
  },
  {
    name: "Symbols",
    emoji: [
      { char: "❤️", keywords: "heart love health" },
      { char: "💔", keywords: "broken heart grief" },
      { char: "💜", keywords: "purple heart love" },
      { char: "🖤", keywords: "black heart dark" },
      { char: "✨", keywords: "sparkles magic shine" },
      { char: "💥", keywords: "explosion impact clash" },
      { char: "☯️", keywords: "balance yin yang" },
      { char: "☮️", keywords: "peace truce" },
      { char: "♻️", keywords: "cycle renewal" },
      { char: "⚠️", keywords: "warning danger caution" },
      { char: "❓", keywords: "question mystery unknown" },
      { char: "❗", keywords: "important alert" },
      { char: "✅", keywords: "done complete yes" },
      { char: "❌", keywords: "no wrong failed" },
      { char: "🔴", keywords: "red dot token" },
      { char: "🔵", keywords: "blue dot token" },
      { char: "🟢", keywords: "green dot token" },
      { char: "🟣", keywords: "purple dot token" },
      { char: "⬛", keywords: "black square block" },
      { char: "🔺", keywords: "triangle up increase" },
    ],
  },
];

/**
 * The emoji matching a search, or all of them when nothing is typed.
 *
 * Searched only by keyword, since the character itself isn't something anyone
 * types into a search box.
 */
export function searchEmoji(query: string): EmojiGroup[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return EMOJI_GROUPS;
  return EMOJI_GROUPS.map((group) => ({
    name: group.name,
    emoji: group.emoji.filter((entry) => entry.keywords.includes(trimmed)),
  })).filter((group) => group.emoji.length > 0);
}
