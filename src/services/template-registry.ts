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
// headings, and the same block scaffold on every single tab — an info callout
// defining the page type, a quote callout, three headings each followed by a
// paragraph of instructions, a secret callout at the bottom. New words in
// someone else's furniture.
//
// What replaces it, and why it looks the way it does:
//
// - **No two templates share a scaffold.** Tab counts, section counts and
//   callout placement vary by what the page is for. The uniform rhythm was the
//   most recognisable part of what we were copying.
// - **Headings are prompts, not labels.** "What you notice first" rather than
//   "Description". The guidance moves into the heading, so a heading that
//   speaks for itself gets an empty paragraph to type in instead of a
//   paragraph of instructions to delete first.
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
          h2("What you notice first"),
          p("Face, build, how they carry themselves, what they wear when nobody's making them. Go for the detail someone would still remember a week later."),
          h2("What they want"),
          p(""),
          h2("What they're like to be around"),
          p("The temper, the soft spot, the bad habit, the thing they'd never admit they're afraid of."),
          quote(`"A line only they would say."`),
        ],
      },
      {
        id: "ties",
        label: "Ties",
        hidden: false,
        content: [
          info("Who they're bound to, and how. Type @ to link a page that already exists — names on their own are fine until then."),
          h2("Closest to"),
          p(""),
          h2("At odds with"),
          p(""),
          h2("Owes, or is owed"),
          p(""),
        ],
      },
      {
        id: "history",
        label: "History",
        hidden: true,
        content: [
          info("Only the parts that still show."),
          h2("Where they started"),
          p("Who raised them, and what it left them with — an accent, a debt, a fear of deep water."),
          h2("Turning points"),
          p("The handful of moments that carved this person out. Two or three is usually enough."),
          h2("Where they are when the story picks them up"),
          p(""),
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
          h2("Standing there"),
          p("The light, the noise, the smell, who's around."),
          h2("What it's for"),
          p("What people come here to do — and whether that's what it was built for."),
          h2("Who's usually here"),
          p(""),
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
          h2("How it started"),
          p("Did someone build it, or did it just happen?"),
          h2("What people here still talk about"),
          p(""),
          h2("What's changed lately"),
          p(""),
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
          p(""),
          h2("The real one"),
          p(""),
          h2("How they spend an ordinary week"),
          p("Not the plot week. The dull one."),
          secret("What are they actually up to, under the part everyone can see?"),
        ],
      },
      {
        id: "inside",
        label: "Inside",
        hidden: false,
        content: [
          info("Who's in it, and who answers to whom. Type @ to link people who already have pages."),
          h2("Who's in charge"),
          p(""),
          h2("Worth knowing"),
          p(""),
          h2("Gone, but still relevant"),
          p(""),
          h2("How you get in, and how you move up"),
          p("Earned, bought, or inherited?"),
        ],
      },
      {
        id: "outside",
        label: "From Outside",
        hidden: true,
        content: [
          info("What everyone else makes of them."),
          h2("Who's afraid of them, who owes them, who's laughing"),
          p(""),
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
          h2("What it looks like"),
          p(""),
          h2("What it does"),
          p(""),
          h2("What it costs to use"),
          p("Limits, side effects, the reason it isn't reached for more often."),
        ],
      },
      {
        id: "hands",
        label: "Whose Hands",
        hidden: true,
        content: [
          info("Where it's been, and how it changed hands each time — sold, stolen, buried, inherited."),
          h2("Before now"),
          p(""),
          h2("The time it mattered"),
          p("When was it used, and what happened afterwards?"),
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
          h2("In short"),
          p(""),
          h2("What made it possible — or inevitable"),
          p(""),
          h2("What was different afterwards, and for whom"),
          p(""),
        ],
      },
      {
        id: "close",
        label: "Up Close",
        hidden: true,
        content: [
          info("The blow-by-blow, for when the scene actually gets written."),
          h2("In order"),
          p(""),
          h2("Who was there, and what each of them did"),
          p("Type @ to link people who already have pages."),
          h2("What's left of it"),
          p("Wreckage, a scar, a holiday, a rule nobody remembers the reason for."),
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
  species: {
    key: "species",
    label: "Species",
    alwaysDirectory: true,
    tabs: [
      {
        id: "short",
        label: "The Short Version",
        hidden: false,
        content: [
          info("One paragraph, before anything else. What are they, where are they, and what makes them not-us?"),
          h2("Where they came from"),
          p("Native to somewhere, descended from something, made on purpose? How long have they been around?"),
          quote(`"Something they say about themselves — or something everyone else says about them."`),
        ],
      },
      {
        id: "bodies",
        label: "Bodies",
        hidden: false,
        content: [
          info("The physical facts, and what they force on everything else."),
          h2("What they look like"),
          p("Size, colouring, the traits that read as theirs — and how much any two of them differ."),
          h2("How long they live, and how new ones arrive"),
          p(""),
          h2("What they can do that others can't"),
          p("And what they can't do that everyone else takes for granted."),
        ],
      },
      {
        id: "living",
        label: "Living",
        hidden: false,
        content: [
          info("An ordinary day, and the rules nobody there writes down."),
          h2("A day in it"),
          p(""),
          h2("Who has power over whom"),
          p("Families, households, ranks — and whether any of it can be changed."),
          h2("What they hold true"),
          p("How they explain the world and their place in it. Rituals and holidays go here too, including the ones nobody there thinks of as religious."),
          h2("What's unthinkable"),
          p("The thing that would get someone quietly cut off."),
          h2("Everyone else"),
          p("Who they get on with, who they don't, and how fair any of it is."),
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
