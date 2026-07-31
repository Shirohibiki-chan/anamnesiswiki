// The single source of truth for template definitions — default tabs,
// property schemas, and which templates can hold child pages. See
// CLAUDE.md's Templates section: the placeholder copy below is a designed
// asset, transcribed verbatim (markup translated, wording untouched) from
// docs/prototype/anamnesis.jsx's TEMPLATES object. Do not reword without
// asking the user.
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
function em(value: string): BlockSeed {
  return { type: "paragraph", content: value ? [{ type: "text", text: value, styles: { italic: true } }] : [] };
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
          info("A brief description of your character."),
          quote(`"Something the character has said."`),
          h2("Description"),
          p("Your character's physical description; things like eye color, hair color, hair style, physical mannerisms, distinguishing features, fitness, strengths, and weaknesses."),
          h2("Traits and Motivations"),
          p("What is their personality type? Are they funny? Do they have a temper? Are they motivated to protect a loved one? Do they have particular virtues? Bad habits? Any fears or phobias?"),
          h2("Routine"),
          p("What does your character's normal day look like? What do they do? What do they think about?"),
          secret("Content in this block is a secret; information that only admins can see. By the way, this is an example template! Modify it to fit your needs."),
        ],
      },
      {
        id: "backstory",
        label: "Backstory",
        hidden: true,
        content: [
          info("Their past. What made them who they are today."),
          h2("Early Life"),
          p("Where were they born? What was their childhood like? Who raised them, and how did that shape them?"),
          h2("Formative Events"),
          p("What happened to make them who they are? Loss, love, trauma, triumph — the moments that carved out their personality."),
          h2("Recent Past"),
          p("What have they been up to leading into the current story?"),
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
          info("A template for a specific location. For example, a bustling marketplace, a lonely shack in the countryside, a long-forgotten dungeon, or a derelict space station — anywhere that a meaningful scene could take place."),
          quote(`"This is an interesting place." — Insightful Person`),
          h2("Description"),
          p("Your location's physical description; what is this place? What's the environment like? Is it a populated or remote location? What's the local culture like? What's the first thing a visitor would notice about this place?"),
          h2("Origin"),
          p("Why is this place here? What is its purpose? Is it naturally occurring or was it made? Why do people come here, if at all?"),
          h2("Routine"),
          p("What does a normal day look like here?"),
          secret("Content in this block is a secret; information that only admins can see. By the way, this is an example template! Modify it to fit your needs."),
        ],
      },
      {
        id: "map",
        label: "Map",
        hidden: false,
        content: [
          info("A place for the location's map. Drop an image below, or leave it blank if the location doesn't need one."),
          em("Map placeholder — in the real build, this tab would render an interactive Leaflet map with pins."),
        ],
      },
      {
        id: "history",
        label: "History",
        hidden: true,
        content: [
          info("The location's past. Wars fought here, rulers who came and went, changes to the landscape."),
          h2("Founding"),
          p("How did this place come to be? Who made it, if anyone? When?"),
          h2("Key Events"),
          p("What has happened here that matters? Battles, births, betrayals, discoveries."),
          h2("Recent History"),
          p("What's happened here in the last few years?"),
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
          info("A group of people united by a shared cause, ideology, or purpose. Guilds, cults, corporations, noble houses, criminal syndicates, revolutionary cells — whatever shape it takes."),
          quote(`"Something a member has said, or something said about them."`),
          h2("Purpose"),
          p("What does this faction stand for? What are their public goals? What are their private goals? How do they operate day-to-day?"),
          h2("Structure"),
          p("How is the faction organized? Who leads it? Who's beneath them? How do you rise through the ranks?"),
          h2("Reputation"),
          p("How is this faction perceived by the public? By other factions? By its enemies?"),
          secret("What's the real story here? What are they actually up to?"),
        ],
      },
      {
        id: "members",
        label: "Members",
        hidden: false,
        content: [
          info("Notable members of this faction. Reference character pages here or just list names."),
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
          info("An object of significance in your world. A weapon, an artifact, a family heirloom, a strange trinket found in a market stall."),
          quote(`"Something said about this item, or by whoever holds it."`),
          h2("Description"),
          p("What does this item look like? What's it made of? How big is it? Any distinguishing features — carvings, discoloration, damage?"),
          h2("Function"),
          p("What does it do? How does it work? Are there rules for using it? Costs, dangers, limits?"),
          h2("Origin"),
          p("Where did it come from? Who made it, if anyone? How did it end up where it is now?"),
          secret("What don't most people know about this item?"),
        ],
      },
      {
        id: "history",
        label: "History",
        hidden: true,
        content: [
          info("The item's past owners and where it's been."),
          h2("Previous Owners"),
          p("Who has held this item before? How did it change hands?"),
          h2("Notable Uses"),
          p("When has this item been used, and to what effect?"),
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
          info("Something that happened, or is happening, or will happen. A battle, a coronation, a heist, a first meeting."),
          quote(`"Something said during or about the event."`),
          h2("Summary"),
          p("What happened, in a sentence or two?"),
          h2("Context"),
          p("What led up to this? What made it possible or inevitable?"),
          h2("Consequences"),
          p("What changed because of it? Who was affected? What does the world look like after?"),
          secret("What really happened, versus what the public knows?"),
        ],
      },
      {
        id: "details",
        label: "Details",
        hidden: true,
        content: [
          info("A blow-by-blow of the event. Timeline, participants, evidence."),
          h2("Timeline"),
          p("Step by step, what happened when?"),
          h2("Participants"),
          p("Who was there? What did each of them do?"),
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
          info("A sapient species, a race, a lineage, an entire people. Everything about who they are and how they live."),
          quote(`"Something said by or about this species."`),
          h2("At a glance"),
          p("The one-paragraph pitch. What are they? Where do they live? What sets them apart?"),
          h2("Origins"),
          p("Where did they come from? Are they native to somewhere, or descended from something else? How long have they been around?"),
        ],
      },
      {
        id: "biology",
        label: "Biology",
        hidden: true,
        content: [
          info("The physical facts. Appearance, lifespan, reproduction, biological quirks."),
          h2("Appearance"),
          p("What do they look like? Size, coloration, distinguishing traits, variation within the species."),
          h2("Lifespan & Reproduction"),
          p("How long do they live? How do they mate, bond, produce offspring? Any biological requirements or taboos?"),
          h2("Abilities & Limitations"),
          p("What can they do that others can't? What can't they do that others can?"),
        ],
      },
      {
        id: "lifestyle",
        label: "Lifestyle",
        hidden: false,
        content: [
          info("How they actually live day-to-day. Culture, food, work, social norms."),
          h2("Daily Life"),
          p("What does a typical day look like for one of them?"),
          h2("Social Structure"),
          p("Family units, community structures, hierarchies. Who has power over whom?"),
          h2("Art & Craft"),
          p("What do they make? What do they value making?"),
        ],
      },
      {
        id: "beliefs",
        label: "Beliefs",
        hidden: false,
        content: [
          info("What they think about the world and themselves. Religion, philosophy, taboos, values."),
          h2("Worldview"),
          p("How do they understand the universe? What do they believe about their place in it?"),
          h2("Practices"),
          p("Rituals, ceremonies, holidays, everyday spiritual habits."),
          h2("Taboos"),
          p("What is unthinkable to them? What crosses a line?"),
        ],
      },
      {
        id: "relations",
        label: "Relations",
        hidden: false,
        content: [
          info("How they relate to other peoples, species, and factions. Allies, enemies, complicated histories."),
          h2("Allies & Trade Partners"),
          p("Who do they get along with? What's the basis of the relationship?"),
          h2("Rivals & Enemies"),
          p("Who do they clash with? Old grievances, active conflicts?"),
          h2("Reputation"),
          p("What do outsiders think of them? Is the reputation deserved?"),
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
          info("A general-purpose page for anything that doesn't fit a specific template. Worldbuilding concepts, magic systems, cultural notes, scene ideas."),
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
