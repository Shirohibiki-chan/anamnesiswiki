// The single source of truth for template definitions — default tabs,
// property schemas, and which templates can hold child pages. See
// CLAUDE.md's Templates section: the placeholder copy below is a designed
// asset, written for this project in Phase 11 (2026-08-04). It replaced copy
// transcribed from docs/prototype/anamnesis.jsx, which had come verbatim from
// LegendKeeper's own templates. Don't reword it without asking the user, and
// don't reintroduce the prototype's wording — that's what this replaced.
//
// The *layout* those words sit in was LK's too, and stayed LK's until
// 2026-08-28 — same tabs, same headings, same block scaffold on every tab.
// The comment above TEMPLATE_REGISTRY says what replaced it and why. Neither
// the wording nor the shape should drift back.
import { createTab, TEMPLATE_KEYS, type Tab } from "../constants/schema";

export type PropertySpec = {
  key: string;
  label: string;
  type: "text" | "longtext" | "refs" | "date";
  placeholder?: string;
};

type BlockSeed = Record<string, unknown>;
type TabSeed = { id: string; label: string; hidden: boolean; content: BlockSeed[] };

export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export type TemplateDefinition = {
  key: TemplateKey;
  label: string;
  /**
   * Whether a page of this template is a directory on disk even with nothing
   * inside it. **Not** a permission — every page can hold pages, and one made
   * from a template with this false grows a directory the moment it does (see
   * filesystem-service's `usesDirectoryStorage`).
   *
   * True for the templates that normally acquire children — folder, character,
   * location, faction, species — so their shape doesn't churn as the last
   * child comes and goes. It was called `canHaveChildren` until 2026-08-10,
   * when nesting stopped depending on the template; the old name would now
   * read as a restriction that no longer exists.
   */
  alwaysDirectory: boolean;
  tabs: TabSeed[];
  properties: PropertySpec[];
};

// ---- BlockNote content helpers (see editor-blocks/editor-schema.ts for the block types) ----
function text(value: string) {
  return value ? [{ type: "text", text: value, styles: {} }] : [];
}
function p(value: string): BlockSeed {
  return { type: "paragraph", content: text(value) };
}
function h2(value: string): BlockSeed {
  return { type: "heading", props: { level: 2 }, content: text(value) };
}
function info(value: string): BlockSeed {
  return { type: "calloutInfo", content: text(value) };
}
function quote(value: string): BlockSeed {
  return { type: "calloutQuote", content: text(value) };
}
function secret(value: string): BlockSeed {
  return { type: "calloutSecret", content: text(value) };
}

// The layouts below are ours. They were redesigned on 2026-08-28 because the
// copy had been rewritten in Phase 11 but the *shape* underneath it hadn't:
// the same tab names in the same order (Overview/Backstory, Overview/Map/
// History, Overview/Biology/Lifestyle/Beliefs/Relations), the same section
// headings, and the same block scaffold on every single tab.
//
// The rules the replacement follows. The first two are not style preferences —
// they are what a template *is*, and the first attempt at this redesign broke
// both:
//
// - **A section heading is a label, not a sentence.** One or two words,
//   occasionally three. "Appearance", "Provenance", "Departures". These render
//   at h2 and a page of them is meant to read as a structure you can see at a
//   glance — a heading phrased as a question ("What made it possible — or
//   inevitable") wraps to two lines, dwarfs the page, and stops looking like
//   an outline at all. The test caps this at five words; four is already too
//   many in practice.
// - **Every heading is followed by a line explaining what goes under it.**
//   No exceptions. The first attempt left a heading bare wherever it "spoke
//   for itself", which rendered as enormous headings floating over empty space
//   with the occasional grey line under one — a half-written document rather
//   than an example structure. The whole point of a template is that it shows
//   you the shape *and* tells you what belongs in it.
//
// The rest is what keeps it from being someone else's outline:
//
// - **Tab names say what's in the tab**, rather than "Overview" on all eight.
// - **No two templates share a scaffold.** Tab counts, section counts and
//   callout placement vary by what the page is for. The uniform rhythm was the
//   most recognisable part of what we were copying, and it's the part a
//   rewording pass can't fix.
// - **The section sets are a different cut from LK's**, not their list with
//   synonyms swapped in — Character gained a whole Ties tab, Faction splits
//   stated goal from real goal, Item is Provenance rather than Previous Owners.
// - **The opening callout asks for something.** It no longer defines the page
//   type — nobody making a Character page needs to be told what a character is.
// - **Quote and Secret callouts appear where they earn it**, not on every tab.
//   Secret is explained once, on Character, since that's the page most people
//   make first; everywhere else it's a real prompt.
// - **Species lost two tabs.** Five tabs on an empty page reads as homework.
//   Beliefs and Relations are sections of Living now.
//
// The tab-name signatures LK's own files carry are still matched on import —
// that lives in `lk-import.ts`'s TAB_SIGNATURE_TEMPLATES and is deliberately
// independent of this file. Reading LK's shape and writing our own are two
// different jobs, and they must not be made to share a list.
export const TEMPLATE_REGISTRY: Record<TemplateKey, TemplateDefinition> = {
  // Phase 22. No tabs and no properties on purpose: a universe is a container
  // for one version of the world, not a page about anything, and seeding it
  // with a scaffold would make it a page you are expected to write in. It is
  // never offered in a picker — see UNIVERSE_TEMPLATE_KEY in constants/schema
  // for how one is made and why it can only sit at the root.
  universe: {
    key: "universe",
    label: "Universe",
    alwaysDirectory: true,
    tabs: [],
    properties: [],
  },
  folder: {
    key: "folder",
    label: "Folder",
    alwaysDirectory: true,
    tabs: [],
    properties: [],
  },
  blank: {
    key: "blank",
    label: "Blank",
    alwaysDirectory: false,
    tabs: [],
    properties: [],
  },
  character: {
    key: "character",
    label: "Character",
    alwaysDirectory: true,
    tabs: [
      {
        id: "who",
        label: "Who They Are",
        hidden: false,
        content: [
          info("Two or three sentences, then move on. The rest of this page is for later, and most of it you won't need until you're writing them."),
          h2("Appearance"),
          p("Face, build, how they carry themselves, what they wear when nobody's making them. Go for the detail someone would still remember a week later."),
          h2("Manner"),
          p("How they come across in a room. The temper, the soft spot, the bad habit, the thing they'd never admit they're afraid of."),
          h2("Motivations"),
          p("What they'd reorganise their life around — and what they'd say they wanted instead, if asked in company."),
          quote(`"A line only they would say."`),
        ],
      },
      {
        id: "ties",
        label: "Ties",
        hidden: false,
        content: [
          info("Who they're bound to, and how. Type @ to link a page that already exists — plain names are fine until then."),
          h2("Close ties"),
          p("Whoever they'd call first, and whether that person would pick up."),
          h2("Rivals"),
          p("Not only enemies. The friend they can't be in a room with, the parent they don't ring."),
          h2("Debts and favours"),
          p("Who owes whom. The ones nobody has called in yet are usually the useful ones."),
        ],
      },
      {
        id: "history",
        label: "History",
        hidden: true,
        content: [
          info("Only the parts that still show."),
          h2("Early years"),
          p("Who raised them, and what it left them with — an accent, a debt, a fear of deep water."),
          h2("Turning points"),
          p("The handful of moments that carved this person out. Two or three is usually enough."),
          h2("Recent years"),
          p("What they've been doing lately, right up to the point your story picks them up."),
          secret("A Secret block is a flag for you: spoilers, twists, things a reader shouldn't hit yet. It marks the passage; it doesn't lock it. To actually hold material back, hide the whole tab."),
        ],
      },
    ],
    properties: [
      { key: "summary", label: "Summary", type: "longtext", placeholder: "A one-line summary." },
      { key: "friends", label: "Friends", type: "refs" },
    ],
  },
  location: {
    key: "location",
    label: "Location",
    alwaysDirectory: true,
    tabs: [
      {
        id: "place",
        label: "The Place",
        hidden: false,
        content: [
          info("Stand in it for a second. What's the first thing a stranger would notice?"),
          h2("Impressions"),
          p("What it's like to be here — the light, the noise, the smell, who's around."),
          h2("Purpose"),
          p("What people come here to do, and whether that's what it was built for."),
          h2("Regulars"),
          p("The staff, the locals, the ones nobody can get rid of. Type @ to link anyone who already has a page."),
        ],
      },
      {
        id: "map",
        label: "Map",
        hidden: false,
        content: [
          info("Drop a map in below. If this place doesn't need one, delete the tab."),
        ],
      },
      {
        id: "before",
        label: "Before Now",
        hidden: true,
        content: [
          info("How it got like this."),
          h2("Origins"),
          p("Did someone build it, or did it just happen? Who decided it should exist, and when?"),
          h2("Defining events"),
          p("What happened here that people still bring up — a battle, a scandal, the night the power went out."),
          h2("Recent years"),
          p("What's changed about this place lately, and who noticed."),
        ],
      },
    ],
    properties: [
      { key: "summary", label: "Summary", type: "longtext", placeholder: "A one-line summary." },
      { key: "parent_location", label: "Part of", type: "refs" },
    ],
  },
  faction: {
    key: "faction",
    label: "Faction",
    alwaysDirectory: true,
    tabs: [
      {
        id: "want",
        label: "What They Want",
        hidden: false,
        content: [
          info("A group gets easy to write once you know the gap between what it says it's for and what it actually does."),
          h2("The stated goal"),
          p("What they'd say if you asked at the door. The version on the sign."),
          h2("The real goal"),
          p("What they'd never put on the sign — even if it's only that they'd like to keep existing."),
          h2("Day-to-day"),
          p("Not the plot week. The dull one, where somebody still has to do the accounts."),
          secret("What are they actually up to, under the part everyone can see?"),
        ],
      },
      {
        id: "inside",
        label: "Inside",
        hidden: false,
        content: [
          info("Who's in it, and who answers to whom. Type @ to link people who already have pages."),
          h2("Leadership"),
          p("The name on the door, and whoever actually decides things when that name isn't in the room."),
          h2("Key figures"),
          p("The handful of members you'll write about. The quartermaster, the one who talks too much, the new recruit."),
          h2("Departures"),
          p("Who left, and whether they left quietly. The ones who didn't are the useful ones."),
          h2("Membership"),
          p("How you get in — earned, bought, or inherited — and whether there's any way to move up once you are."),
        ],
      },
      {
        id: "outside",
        label: "From Outside",
        hidden: true,
        content: [
          info("What everyone else makes of them."),
          h2("Reputation"),
          p("Who's afraid of them, who owes them, and who's quietly laughing."),
          quote(`"Something a member says — or something everyone else says about them."`),
        ],
      },
    ],
    properties: [
      { key: "summary", label: "Summary", type: "longtext", placeholder: "A one-line summary." },
      { key: "leader", label: "Leader", type: "refs" },
      { key: "members", label: "Members", type: "refs" },
    ],
  },
  item: {
    key: "item",
    label: "Item",
    alwaysDirectory: false,
    tabs: [
      {
        id: "thing",
        label: "The Thing Itself",
        hidden: false,
        content: [
          info("Weight, wear, and the one detail that makes it this one and not another like it."),
          h2("Appearance"),
          p("Material, size, condition — and the scratch it picked up in the fight nobody talks about."),
          h2("Abilities"),
          p("What happens when someone uses it. Plainly first, rules afterwards if it needs them."),
          h2("Limits"),
          p("What it costs to use: the side effects, the conditions, the reason it isn't reached for more often."),
        ],
      },
      {
        id: "hands",
        label: "Whose Hands",
        hidden: true,
        content: [
          info("Where it's been, and how it changed hands each time — sold, stolen, buried, inherited."),
          h2("Provenance"),
          p("Who held it, in what order, and what it did to them."),
          h2("Notable moments"),
          p("The occasions this thing decided something, and what happened afterwards."),
          secret("What's true about this one that nearly nobody knows?"),
        ],
      },
    ],
    properties: [
      { key: "summary", label: "Summary", type: "longtext", placeholder: "A one-line summary." },
      { key: "owner", label: "Current Owner", type: "refs" },
    ],
  },
  event: {
    key: "event",
    label: "Event",
    alwaysDirectory: false,
    tabs: [
      {
        id: "happened",
        label: "What Happened",
        hidden: false,
        content: [
          info("A sentence or two first. The order of events can wait until you need it."),
          h2("In brief"),
          p("The version you'd give someone in a corridor."),
          h2("Causes"),
          p("What led up to it, and whether it was ever really avoidable."),
          h2("Aftermath"),
          p("What was different afterwards, and for whom. An event nobody's life changed after is usually background."),
        ],
      },
      {
        id: "close",
        label: "Up Close",
        hidden: true,
        content: [
          info("The blow-by-blow, for when the scene actually gets written."),
          h2("Sequence"),
          p("Step by step. Hours, days or years apart — whatever the thing needs."),
          h2("Cast"),
          p("Everyone present, and what each of them did. Type @ to link people who already have pages."),
          h2("Traces"),
          p("What's left of it now: wreckage, a scar, a holiday, a rule nobody remembers the reason for."),
          secret("What actually happened, as opposed to the version that got around?"),
        ],
      },
    ],
    properties: [
      { key: "summary", label: "Summary", type: "longtext", placeholder: "A one-line summary." },
      { key: "when", label: "When", type: "text", placeholder: "e.g. Year 872, Third Age" },
      { key: "where", label: "Where", type: "refs" },
      { key: "participants", label: "Participants", type: "refs" },
    ],
  },
  race: {
    key: "race",
    label: "Race",
    alwaysDirectory: true,
    tabs: [
      {
        id: "short",
        label: "The Short Version",
        hidden: false,
        content: [
          info("One paragraph, before anything else. What are they, where are they, and what makes them not-us?"),
          h2("Origins"),
          p("Native to somewhere, descended from something, made on purpose? And how long have they been around?"),
          quote(`"Something they say about themselves — or something everyone else says about them."`),
        ],
      },
      {
        id: "bodies",
        label: "Bodies",
        hidden: false,
        content: [
          info("The physical facts, and what they force on everything else."),
          h2("Form"),
          p("Size, colouring, the traits that read as theirs — and how much any two of them differ."),
          h2("Lifespan"),
          p("How long they live, how they age, and how new ones arrive. Anything here that culture then has to work around?"),
          h2("Capabilities"),
          p("What comes easily to them that doesn't to others, and what they can't do that everyone else takes for granted."),
        ],
      },
      {
        id: "living",
        label: "Living",
        hidden: false,
        content: [
          info("An ordinary day, and the rules nobody there writes down."),
          h2("Habits"),
          p("Work, food, houses, manners. What does a dull Tuesday look like for one of them?"),
          h2("Hierarchy"),
          p("Families, households, ranks — and whether any of it can be changed by the person underneath it."),
          h2("Beliefs"),
          p("How they explain the world and their place in it. Rituals and holidays go here too, including the ones nobody there thinks of as religious."),
          h2("Prohibitions"),
          p("What's unthinkable, and what would get someone quietly cut off."),
          h2("Outsiders"),
          p("Who they get on with, who they don't, and how much of the reputation is fair."),
        ],
      },
    ],
    properties: [
      { key: "summary", label: "Summary", type: "longtext", placeholder: "A one-line summary." },
      { key: "homeland", label: "Homeland", type: "refs" },
    ],
  },
  country: {
    key: "country",
    label: "Country",
    alwaysDirectory: true,
    tabs: [
      {
        id: "nation",
        label: "The Nation",
        hidden: false,
        content: [
          info("A country isn't a place you can stand in — it's a claim over a lot of places at once. Start with what it holds."),
          h2("Territory"),
          p("Where it begins and ends, what the land is like, and which borders are argued over."),
          h2("Peoples"),
          p("Who lives here, and who was here first. Type @ to link a page that already exists."),
          h2("Economy"),
          p("What it grows, digs up or makes, what it has to buy in, and who it depends on for that."),
        ],
      },
      {
        id: "map",
        label: "Map",
        hidden: false,
        content: [
          info("Drop a map in below. If this one doesn't need its own, delete the tab."),
        ],
      },
      {
        id: "rule",
        label: "Rule",
        hidden: false,
        content: [
          info("Who decides things, and what happens to people who disagree."),
          h2("Government"),
          p("Who holds power, how they got it, and whether anyone can take it off them."),
          h2("Law"),
          p("What's forbidden, who enforces it, and how differently it lands depending on who you are."),
          h2("Force"),
          p("What it can put in the field — an army, a navy, a handful of paid swords, or nothing at all."),
          h2("Neighbours"),
          p("Who it borders, who it trades with, and who it's one bad harvest away from fighting."),
          secret("The part of how this country is run that its own people don't get told."),
        ],
      },
      {
        id: "past",
        label: "Past",
        hidden: true,
        content: [
          info("How it got these borders and this flag."),
          h2("Founding"),
          p("Who drew the first line around it, and what was here before they did."),
          h2("Wars"),
          p("What it has fought over, won and lost — and which of those is still resented."),
          h2("Recent years"),
          p("What's changed in living memory, and who's angry about it."),
        ],
      },
    ],
    properties: [
      { key: "summary", label: "Summary", type: "longtext", placeholder: "A one-line summary." },
      { key: "capital", label: "Capital", type: "refs" },
      { key: "ruler", label: "Ruler", type: "refs" },
      { key: "neighbours", label: "Borders", type: "refs" },
    ],
  },
  creature: {
    key: "creature",
    label: "Creature",
    alwaysDirectory: false,
    tabs: [
      {
        id: "beast",
        label: "The Creature",
        hidden: false,
        content: [
          info("An animal, a monster, a thing in the woods. Anything that lives without needing a culture page of its own."),
          h2("Appearance"),
          p("Size, build, colouring, and the one feature nobody forgets."),
          h2("Behaviour"),
          p("What it does all day, what it eats, and whether it's alone or in a group."),
          h2("Habitat"),
          p("Where it lives, and what it needs from that place. Type @ to link somewhere that already has a page."),
          quote(`"What people say about it — a warning, a hunter's rule, a story told to children."`),
        ],
      },
      {
        id: "encounters",
        label: "Encounters",
        hidden: false,
        content: [
          info("What it's like to run into one."),
          h2("Signs"),
          p("How you know one is near before you see it. Tracks, sounds, what goes quiet."),
          h2("Danger"),
          p("What it can actually do to a person, and whether it wants to."),
          h2("Handling"),
          p("How people deal with them — hunted, avoided, farmed, worshipped, kept."),
        ],
      },
    ],
    properties: [
      { key: "summary", label: "Summary", type: "longtext", placeholder: "A one-line summary." },
      { key: "habitat", label: "Habitat", type: "refs" },
    ],
  },
  technology: {
    key: "technology",
    label: "Technology",
    alwaysDirectory: false,
    tabs: [
      {
        id: "what",
        label: "What It Is",
        hidden: false,
        content: [
          info("An invention, a technique, a piece of magic that works like machinery. Whatever changed what was possible."),
          h2("Appearance"),
          p("What you'd actually be looking at. Size, materials, how it's operated."),
          h2("Principle"),
          p("How it works, in whatever terms your world uses. It doesn't have to be real physics, only consistent."),
          h2("Purpose"),
          p("What it was made to do — and what people ended up using it for instead."),
        ],
      },
      {
        id: "world",
        label: "In the World",
        hidden: false,
        content: [
          info("Who has it, what it cost to get, and what it broke on the way in."),
          h2("Who has it"),
          p("Widespread, restricted, or one person's secret? Type @ to link whoever holds it."),
          h2("Cost"),
          p("What it takes to make or run — money, materials, labour, something worse."),
          h2("Consequences"),
          p("What it made obsolete, and who lost a living when it arrived."),
          h2("Competition"),
          p("What people used before, what they use instead, and who's trying to build a better one."),
        ],
      },
    ],
    properties: [
      { key: "summary", label: "Summary", type: "longtext", placeholder: "A one-line summary." },
      { key: "maker", label: "Made by", type: "refs" },
    ],
  },
  scene: {
    key: "scene",
    label: "Scene",
    alwaysDirectory: false,
    tabs: [
      {
        id: "scene",
        label: "The Scene",
        hidden: false,
        content: [
          info("One moment, as a piece of writing rather than a piece of history. An Event page records what happened; this is for the version you're going to write."),
          h2("Setting"),
          p("Where and when, and what the room is doing while people talk. Type @ to link a place that already has a page."),
          h2("Present"),
          p("Who's in it, including whoever's listening and not speaking."),
          h2("Turn"),
          p("What's different by the end. A scene where nothing changes is usually two scenes, or none."),
        ],
      },
      {
        id: "drafting",
        label: "Drafting",
        hidden: true,
        content: [
          info("The working half. Fine to leave a mess in here."),
          h2("Beats"),
          p("The order it happens in, as short lines you can rearrange."),
          h2("Lines"),
          p("Dialogue and images you thought of early and don't want to lose."),
          h2("Problems"),
          p("What isn't working yet, so you don't have to rediscover it next time you open this."),
        ],
      },
    ],
    properties: [
      { key: "summary", label: "Summary", type: "longtext", placeholder: "A one-line summary." },
      { key: "where", label: "Where", type: "refs" },
      { key: "who", label: "Who", type: "refs" },
    ],
  },
  quest: {
    key: "quest",
    label: "Quest",
    alwaysDirectory: false,
    tabs: [
      {
        id: "job",
        label: "The Job",
        hidden: false,
        content: [
          info("Something someone is being asked to go and do. Written with a table in mind, but a plot thread works the same way."),
          h2("Objective"),
          p("What counts as done. If that's hard to put in one line, this is probably two quests."),
          h2("Who's asking"),
          p("Who wants this, and why them. Type @ to link a page that already exists."),
          h2("Stakes"),
          p("What happens if nobody does it, and what happens if it's done badly."),
          h2("Payment"),
          p("What's promised — coin, a favour, information, or nothing but the chance to."),
        ],
      },
      {
        id: "running",
        label: "Running It",
        hidden: true,
        content: [
          info("The parts the people doing it don't get to read."),
          h2("Steps"),
          p("How it's meant to go, loosely enough that it survives contact with anyone."),
          h2("Obstacles"),
          p("What's in the way: people, distance, locks, weather, somebody else wanting the same thing."),
          h2("Twists"),
          p("What isn't what it looks like, and when that becomes obvious."),
          secret("What the person asking hasn't mentioned."),
        ],
      },
    ],
    properties: [
      { key: "summary", label: "Summary", type: "longtext", placeholder: "A one-line summary." },
      { key: "client", label: "Given by", type: "refs" },
      { key: "where", label: "Where", type: "refs" },
    ],
  },
  note: {
    key: "note",
    label: "Note",
    alwaysDirectory: false,
    tabs: [
      {
        id: "notes",
        label: "Notes",
        hidden: false,
        content: [
          info("For anything that doesn't fit a template. Magic systems, languages, timelines, half-formed ideas you want out of your head."),
          p("Start writing."),
        ],
      },
    ],
    properties: [],
  },
};

export function getTemplate(key: string): TemplateDefinition | undefined {
  return TEMPLATE_REGISTRY[key as TemplateKey];
}

export function alwaysDirectory(key: string): boolean {
  return getTemplate(key)?.alwaysDirectory ?? false;
}

export function getPropertySchema(key: string): PropertySpec[] {
  return getTemplate(key)?.properties ?? [];
}

// Deep-cloned per call so mutating one node's tabs never touches the
// registry's own literal seed data.
export function getDefaultTabs(key: string): Tab[] {
  const seeds = getTemplate(key)?.tabs ?? [];
  return seeds.map((seed) =>
    createTab({ id: seed.id, label: seed.label, hidden: seed.hidden, content: seed.content.map((block) => ({ ...block })) }),
  );
}
