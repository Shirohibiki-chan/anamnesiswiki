// The single source of truth for template definitions — default tabs,
// property schemas, and which templates can hold child pages. See
// CLAUDE.md's Templates section: the placeholder copy below is a designed
// asset, written for this project in Phase 11 (2026-08-04). It replaced copy
// transcribed from docs/prototype/anamnesis.jsx, which had come verbatim from
// LegendKeeper's own templates. Don't reword it without asking the user, and
// don't reintroduce the prototype's wording — that's what this replaced.
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
  canHaveChildren: boolean;
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

export const TEMPLATE_REGISTRY: Record<TemplateKey, TemplateDefinition> = {
  folder: {
    key: "folder",
    label: "Folder",
    canHaveChildren: true,
    tabs: [],
    properties: [],
  },
  blank: {
    key: "blank",
    label: "Blank",
    canHaveChildren: false,
    tabs: [],
    properties: [],
  },
  character: {
    key: "character",
    label: "Character",
    canHaveChildren: true,
    tabs: [
      {
        id: "overview",
        label: "Overview",
        hidden: false,
        content: [
          info("Who this person is, in a couple of sentences — the version you'd give someone who's never met them."),
          quote(`"A line they'd actually say. The one that gives them away."`),
          h2("Description"),
          p("What do they look like? Face, build, how they carry themselves, what they wear when nobody's making them. Go for the detail someone would still remember a week later."),
          h2("Traits and Motivations"),
          p("What do they want, and what will they do to get it? The temper, the soft spot, the bad habit, the thing they'd never admit they're afraid of."),
          h2("Routine"),
          p("What does an ordinary day look like — the boring one, not the plot one? Where are they at three in the afternoon on a nothing Tuesday?"),
          secret("A Secret block is a flag for you: spoilers, twists, things a reader shouldn't hit yet. It doesn't lock anything on its own — to actually hold material back, hide the whole tab."),
        ],
      },
      {
        id: "backstory",
        label: "Backstory",
        hidden: true,
        content: [
          info("How they got here. Only the parts that still show."),
          h2("Early Life"),
          p("Where did they start, and who raised them? What did that leave them with — an accent, a debt, a fear of deep water?"),
          h2("Formative Events"),
          p("The handful of moments that carved the person out. Losses, wins, the day everything stopped being the same."),
          h2("Recent Past"),
          p("What have they been doing lately, right up to where your story picks them up?"),
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
    canHaveChildren: true,
    tabs: [
      {
        id: "overview",
        label: "Overview",
        hidden: false,
        content: [
          info("Somewhere a scene can happen. A market street, a shut-up house on a hill, a station nobody's docked at in years."),
          quote(`"Something said about this place — a warning, a joke, a piece of local wisdom."`),
          h2("Description"),
          p("What's it like to stand here? The light, the noise, the smell, who's around. Start with the first thing a stranger would notice."),
          h2("Origin"),
          p("Why is this place here at all? Did someone build it, or did it just happen? What's it for now, versus what it was for then?"),
          h2("Routine"),
          p("What does an ordinary day look like here? Who turns up, when, and what are they doing?"),
          secret("A Secret block is a flag for you: spoilers, twists, things a reader shouldn't hit yet. It doesn't lock anything on its own — to actually hold material back, hide the whole tab."),
        ],
      },
      {
        id: "map",
        label: "Map",
        hidden: false,
        content: [
          info("Somewhere to keep this place's map. Drop an image in below, or delete the tab if it doesn't need one."),
        ],
      },
      {
        id: "history",
        label: "History",
        hidden: true,
        content: [
          info("What's happened here before now."),
          h2("Founding"),
          p("How did this place come to be, and when? Who decided it should exist?"),
          h2("Key Events"),
          p("What happened here that people still talk about? Battles, betrayals, discoveries, and the ordinary things that turned out to matter."),
          h2("Recent History"),
          p("What's changed here in the last few years?"),
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
    canHaveChildren: true,
    tabs: [
      {
        id: "overview",
        label: "Overview",
        hidden: false,
        content: [
          info("People organized around something they all want. A guild, a cult, a company, a household, a crew that's never called itself anything."),
          quote(`"Something a member says, or something everyone else says about them."`),
          h2("Purpose"),
          p("What are they for? Put the stated goal first, then the real one, then what they actually spend their days doing."),
          h2("Structure"),
          p("Who's in charge, who's underneath, and how does anyone move up? Is it earned, bought, or inherited?"),
          h2("Reputation"),
          p("What do outsiders make of them? Who's afraid of them, who owes them, who's laughing at them?"),
          secret("What are they actually up to, under the part everyone can see?"),
        ],
      },
      {
        id: "members",
        label: "Members",
        hidden: false,
        content: [
          info("Who's in it. Type @ to link people who already have a page, or just list names for now."),
          h2("Leadership"),
          p(""),
          h2("Notable Members"),
          p(""),
          h2("Former Members"),
          p(""),
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
    canHaveChildren: false,
    tabs: [
      {
        id: "overview",
        label: "Overview",
        hidden: false,
        content: [
          info("A thing that matters. A weapon, an heirloom, a relic, a cheap trinket somebody won't let go of."),
          quote(`"Something said about it, or by whoever's holding it."`),
          h2("Description"),
          p("What does it look like, and what's it made of? Weight, wear, the scratch it picked up in the fight nobody talks about."),
          h2("Function"),
          p("What does it do, and what does it cost to use? Rules, limits, side effects."),
          h2("Origin"),
          p("Where did it come from, who made it, and how did it end up where it is now?"),
          secret("What's true about this one that nearly nobody knows?"),
        ],
      },
      {
        id: "history",
        label: "History",
        hidden: true,
        content: [
          info("Where it's been, and whose hands it's passed through."),
          h2("Previous Owners"),
          p("Who held it before? How did it change hands — sold, stolen, buried, inherited?"),
          h2("Notable Uses"),
          p("When has it been used, and what happened afterwards?"),
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
    canHaveChildren: false,
    tabs: [
      {
        id: "overview",
        label: "Overview",
        hidden: false,
        content: [
          info("Something that happened, is happening, or is about to. A battle, a wedding, a heist, the first time two people met."),
          quote(`"Something said during it, or about it afterwards."`),
          h2("Summary"),
          p("What happened, in a sentence or two?"),
          h2("Context"),
          p("What led up to it? What made it possible, or made it inevitable?"),
          h2("Consequences"),
          p("What was different afterwards, and for whom?"),
          secret("What actually happened, as opposed to the version that got around?"),
        ],
      },
      {
        id: "details",
        label: "Details",
        hidden: true,
        content: [
          info("The blow-by-blow. Who was there, in what order, and what's left as proof."),
          h2("Timeline"),
          p("Step by step — what happened when?"),
          h2("Participants"),
          p("Who was there, and what did each of them do?"),
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
  species: {
    key: "species",
    label: "Species",
    canHaveChildren: true,
    tabs: [
      {
        id: "overview",
        label: "Overview",
        hidden: false,
        content: [
          info("A people. A species, a lineage, a whole kind of person — who they are and how they live."),
          quote(`"Something they say about themselves, or something everyone else says about them."`),
          h2("At a glance"),
          p("The one-paragraph version. What are they, where are they, and what makes them not-us?"),
          h2("Origins"),
          p("Where did they come from? Native to somewhere, descended from something, made on purpose? How long have they been around?"),
        ],
      },
      {
        id: "biology",
        label: "Biology",
        hidden: true,
        content: [
          info("The physical facts. Bodies, lifespans, how new ones arrive."),
          h2("Appearance"),
          p("What do they look like? Size, coloration, the traits that read as theirs — and how much any two of them differ."),
          h2("Lifespan & Reproduction"),
          p("How long do they live, and how do they pair up and have young? Anything biology forces on them that culture then has to work around?"),
          h2("Abilities & Limitations"),
          p("What can they do that others can't, and what can't they do that everyone else takes for granted?"),
        ],
      },
      {
        id: "lifestyle",
        label: "Lifestyle",
        hidden: false,
        content: [
          info("How they actually live. Work, food, houses, manners."),
          h2("Daily Life"),
          p("What does an ordinary day look like for one of them?"),
          h2("Social Structure"),
          p("Who lives with whom, and who has power over whom? Families, households, ranks."),
          h2("Art & Craft"),
          p("What do they make, and what do they think is worth making?"),
        ],
      },
      {
        id: "beliefs",
        label: "Beliefs",
        hidden: false,
        content: [
          info("What they hold true, and what they hold unforgivable."),
          h2("Worldview"),
          p("How do they explain the world, and their place in it?"),
          h2("Practices"),
          p("Rituals, holidays, and the small daily habits nobody there thinks of as religious."),
          h2("Taboos"),
          p("What's unthinkable? What would get someone quietly cut off?"),
        ],
      },
      {
        id: "relations",
        label: "Relations",
        hidden: false,
        content: [
          info("How they get on with everyone else. Allies, enemies, and the complicated ones."),
          h2("Allies & Trade Partners"),
          p("Who do they get on with, and what's actually holding the relationship together?"),
          h2("Rivals & Enemies"),
          p("Who do they clash with? Old grudges, live conflicts, or both?"),
          h2("Reputation"),
          p("What do outsiders say about them, and how much of it is fair?"),
        ],
      },
    ],
    properties: [
      { key: "summary", label: "Summary", type: "longtext", placeholder: "A one-line summary." },
      { key: "homeland", label: "Homeland", type: "refs" },
    ],
  },
  note: {
    key: "note",
    label: "Note",
    canHaveChildren: false,
    tabs: [
      {
        id: "overview",
        label: "Overview",
        hidden: false,
        content: [
          info("For anything that doesn't fit a template. Magic systems, languages, timelines, half-formed ideas you want out of your head."),
          h2("Notes"),
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

export function canHaveChildren(key: string): boolean {
  return getTemplate(key)?.canHaveChildren ?? false;
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
