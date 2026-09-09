// Saltmere: the world the app can hand somebody who has just installed it.
//
// **This is not a project template, and the difference is the whole reason
// this file exists.** A `.antpl` describes a shape and structurally refuses to
// carry anybody's writing (see `project-template.ts`) — an example world is
// almost nothing *but* writing. Somebody opening this app for the first time
// does not need six empty folders; they need to see what a filled-in world
// looks like, because "a character is a page" is a sentence that means nothing
// until you have seen one.
//
// **Nothing in here may describe the interface.** Not a panel, not a button,
// not where anything sits on screen — that is the tour's half of Phase 26, and
// keeping the two apart is what stops this world going quietly wrong every time
// a later phase moves something. What this world teaches is what a world is
// made of. See `docs/plan.md` § Phase 26.
//
// **Somebody else's world on purpose.** It ships to strangers, so it is a small
// invented setting rather than anything of hers.
//
// A description rather than finished nodes, for the same reason the project
// template format is one: tabs, property schemas and sidebar blocks are built
// from `template-registry` when the world is made, so a page here arrives with
// today's prompts on the tabs nobody has written into rather than a copy of
// whatever they said the day this was typed.
import type { DatabaseView } from "./schema";

/**
 * A run of text, or a link to another page in this world by its key.
 *
 * Links are keys rather than ids because ids do not exist until the world is
 * built — `buildExampleWorld` resolves them, and a key that names no page is a
 * test failure rather than a link that silently renders as nothing.
 */
export type ExampleSpan = string | { to: string };

export type ExampleBlock =
  | { kind: "p"; spans: ExampleSpan[] }
  | { kind: "h2"; text: string }
  | { kind: "info"; spans: ExampleSpan[] }
  | { kind: "quote"; spans: ExampleSpan[] }
  | { kind: "bullet"; spans: ExampleSpan[] };

/**
 * Content for one of the page's tabs, named by the id its template gives it.
 *
 * **A tab nobody writes here keeps its template's prompts**, which is the
 * point: Old Thessaly's Ties tab is untouched, so the world contains a page
 * somebody started and did not finish — which is what most pages in most
 * worlds look like, and worth seeing on day one.
 */
export type ExampleTab = { id: string; blocks: ExampleBlock[] };

export type ExamplePage = {
  /** This world's own name for the page. Never written to disk. */
  key: string;
  parent: string | null;
  templateKey: string;
  name: string;
  tags?: string[];
  /** Plain property values, by the key the template's schema uses. */
  properties?: Record<string, string>;
  /** Reference properties, as the keys of the pages they point at. */
  refs?: Record<string, string[]>;
  tabs?: ExampleTab[];
  /** Shown as a database instead of as a page. */
  view?: DatabaseView;
  hideTemplatePrompt?: boolean;
};

/**
 * The canvas of a storyline in this world, in page keys.
 *
 * Positions are given rather than computed, because a storyline canvas has no
 * layout and must not grow one — tidying is a button she presses, never
 * behaviour. These are the positions tidying would choose, so the world arrives
 * looking arranged rather than arriving with a chore waiting on it.
 */
export type ExampleStoryline = {
  page: string;
  scenes: { page: string; x: number; y: number }[];
  edges: [string, string][];
  notes: { x: number; y: number; width: number; text: string }[];
  bands: { x: number; y: number; width: number; height: number; label: string }[];
};

/** What the project is called before anybody renames it. */
export const EXAMPLE_WORLD_NAME = "Saltmere Example";

const PLACES_VIEW: DatabaseView = { layout: "table", templateKey: "location", scope: "subpages" };

export const EXAMPLE_PAGES: ExamplePage[] = [
  {
    key: "start",
    parent: null,
    templateKey: "note",
    name: "Start Here",
    tabs: [
      {
        id: "notes",
        blocks: [
          {
            kind: "info",
            spans: [
              "This is an example world. Every page in it is an ordinary page — rewrite it, rename it, or delete the whole thing. Nothing here is special, and nothing you do to it touches any other world you make.",
            ],
          },
          {
            kind: "p",
            spans: [
              "Saltmere is a harbour town the sea is slowly leaving. There are four people who matter, one guild, one night everything went wrong, and a chapel that is only above water four days a year. It is small on purpose: small enough to read in ten minutes, and to see how the parts fit before you start your own.",
            ],
          },
          { kind: "h2", text: "How a world is put together" },
          {
            kind: "p",
            spans: [
              "A world is pages, and pages hold other pages. A person is a page. The town they live in is a page. The night the lantern went out is a page. There is no separate kind of thing for a character or a place — which is exactly why anything can hold anything, and why you never have to decide up front what shape your world is.",
            ],
          },
          {
            kind: "bullet",
            spans: [
              { to: "characters" },
              " is a folder — it holds pages and nothing else. Useful when you want a shelf rather than a subject.",
            ],
          },
          {
            kind: "bullet",
            spans: [
              { to: "places" },
              " is a page that lists the pages inside it as a table. The same pages, read as a set instead of one at a time.",
            ],
          },
          {
            kind: "bullet",
            spans: [
              { to: "tidewrights" },
              " is a page with a page inside it: the guild, holding the thing the guild is fighting over.",
            ],
          },
          {
            kind: "bullet",
            spans: [
              { to: "salt-tide" },
              " is a storyline — scenes joined by what leads to what, with no dates anywhere in it.",
            ],
          },
          { kind: "h2", text: "Two things worth noticing" },
          {
            kind: "p",
            spans: [
              { to: "maren" },
              " is the most written page here, and ",
              { to: "thessaly" },
              " is barely started. Both are normal. A world is not a form to fill in, and a page with one line on it is still doing its job.",
            ],
          },
          {
            kind: "p",
            spans: [
              "The names in these paragraphs are links, and each one was made by pointing at a page that already existed. That is also how the town knows who lives in it: nothing here is filed twice.",
            ],
          },
          { kind: "quote", spans: ["Every world starts as one page somebody could not stop thinking about."] },
        ],
      },
    ],
  },

  { key: "characters", parent: null, templateKey: "folder", name: "Characters" },

  {
    key: "maren",
    parent: "characters",
    templateKey: "character",
    name: "Maren Kell",
    tags: ["tidewrights", "saltmere"],
    properties: { summary: "A tidewright who reads the water for a living, and lies about what it tells her." },
    refs: { friends: ["thessaly"] },
    tabs: [
      {
        id: "who",
        blocks: [
          {
            kind: "p",
            spans: [
              "Thirty-one years old and has never slept more than a mile from grey water. Maren reads tides for the guild: which boats go out, which stay in, and — the part nobody writes down — which families are told the truth about why.",
            ],
          },
          { kind: "h2", text: "Appearance" },
          {
            kind: "p",
            spans: [
              "Short, sun-ruined, hands scarred white across the knuckles from a winter she does not discuss. Wears her father's coat, which does not fit and never did.",
            ],
          },
          { kind: "h2", text: "Manner" },
          {
            kind: "p",
            spans: [
              "Pleasant to strangers and impossible to the people who know her. She answers questions with the tide table, which is a way of not answering. The one thing that reliably breaks her composure is being thanked.",
            ],
          },
          { kind: "h2", text: "Motivations" },
          {
            kind: "p",
            spans: [
              "She wants the water back. Failing that, she wants to be the one who decides what the town is told about why it is going — which is a smaller ambition wearing the big one's coat.",
            ],
          },
          { kind: "quote", spans: ['"The tide does not lie. People do, and I am people."'] },
        ],
      },
      {
        id: "ties",
        blocks: [
          { kind: "h2", text: "Close ties" },
          {
            kind: "p",
            spans: [
              { to: "thessaly" },
              " taught her the water and has not spoken to her since the night of ",
              { to: "scene-lantern" },
              ". Maren still leaves food on her step, and Thessaly still eats it, and neither of them mentions it.",
            ],
          },
          { kind: "h2", text: "Debts and favours" },
          {
            kind: "p",
            spans: [
              "The ",
              { to: "tidewrights" },
              " let her keep ",
              { to: "lantern" },
              " after the inquest, which everyone involved understands was not a kindness.",
            ],
          },
        ],
      },
    ],
  },

  {
    key: "thessaly",
    parent: "characters",
    templateKey: "character",
    name: "Old Thessaly",
    tags: ["tidewrights"],
    properties: { summary: "The oldest tidewright left alive. Remembers the water before it began leaving." },
    tabs: [
      {
        id: "who",
        blocks: [
          {
            kind: "p",
            spans: [
              "Eighty-something, deaf on the left, and the only person in Saltmere who was already working when the sea came up to the chapel steps. She has a version of the night the lantern went out that nobody has written down, including her.",
            ],
          },
        ],
      },
    ],
  },

  {
    key: "places",
    parent: null,
    templateKey: "blank",
    name: "Places",
    hideTemplatePrompt: true,
    view: PLACES_VIEW,
  },

  {
    key: "saltmere",
    parent: "places",
    templateKey: "location",
    name: "Saltmere",
    tags: ["saltmere"],
    properties: { summary: "A harbour town the sea is quietly abandoning, one yard a year." },
    tabs: [
      {
        id: "place",
        blocks: [
          { kind: "h2", text: "Impressions" },
          {
            kind: "p",
            spans: [
              "You smell it before you see it: wet rope, cold iron, and the flat green stink of a harbour floor that used to be underwater. Half the moorings stand in mud. The town has moved its jetties out three times in living memory and is arguing about a fourth.",
            ],
          },
          { kind: "h2", text: "Purpose" },
          {
            kind: "p",
            spans: [
              "Fishing, and increasingly not fishing. What actually keeps Saltmere alive is the ",
              { to: "tidewrights" },
              ", who are paid by four inland towns to say when the water is safe — a service worth more every year the water behaves less.",
            ],
          },
          { kind: "h2", text: "Regulars" },
          {
            kind: "p",
            spans: [
              { to: "maren" },
              " on the harbour wall most mornings, ",
              { to: "thessaly" },
              " at the far end where the wall is broken and nobody else sits.",
            ],
          },
        ],
      },
    ],
  },

  {
    key: "chapel",
    parent: "places",
    templateKey: "location",
    name: "The Drowned Chapel",
    properties: { summary: "Older than the town. Above water four days a year, and getting greedier." },
    refs: { parent_location: ["saltmere"] },
    tabs: [
      {
        id: "place",
        blocks: [
          {
            kind: "p",
            spans: [
              "Stone, roofless, and full of the sea for most of the year. Four days each spring the water drops far enough to walk in, and the town does — carefully, and not alone. What it was for is not agreed on. That it was there before anybody who could write about it is not in doubt.",
            ],
          },
          {
            kind: "p",
            spans: [
              "As the water goes out, the chapel stands clear for longer every year. Nobody in Saltmere has said out loud what that will mean when it is dry for good.",
            ],
          },
        ],
      },
    ],
  },

  {
    key: "tidewrights",
    parent: null,
    templateKey: "faction",
    name: "The Tidewrights",
    tags: ["tidewrights"],
    properties: { summary: "The guild that reads the tides, and decides what the town is told about them." },
    refs: { leader: ["thessaly"], members: ["maren", "thessaly"] },
    tabs: [
      {
        id: "want",
        blocks: [
          {
            kind: "p",
            spans: [
              "To be believed. Everything else the guild does is in service of that, including the parts that look like superstition and the parts that look like fraud.",
            ],
          },
          {
            kind: "p",
            spans: [
              "They are the only people who know the water is not simply falling — it is falling faster each year, and the arithmetic gets worse every time somebody redoes it. The guild has known for six years and has not said so.",
            ],
          },
        ],
      },
    ],
  },

  {
    key: "lantern",
    parent: "tidewrights",
    templateKey: "item",
    name: "The Lantern of Ninefold Glass",
    properties: { summary: "Nine panes, one flame, and a rule about who is allowed to carry it." },
    refs: { owner: ["maren"] },
    tabs: [
      {
        id: "thing",
        blocks: [
          {
            kind: "p",
            spans: [
              "Nine panes of green glass around a flame that has been kept alight, in theory, since the chapel stood above water year-round. In practice it has gone out twice, and only one of those is written down.",
            ],
          },
          {
            kind: "p",
            spans: [
              "Carried by whichever tidewright reads the spring tide. That was ",
              { to: "thessaly" },
              " for forty years and is ",
              { to: "maren" },
              " now, which is the whole of the argument between them.",
            ],
          },
        ],
      },
    ],
  },

  { key: "salt-tide", parent: null, templateKey: "storyline", name: "The Salt Tide" },

  {
    key: "scene-lantern",
    parent: "salt-tide",
    templateKey: "scene",
    name: "The Lantern Goes Out",
    properties: { summary: "The spring reading, the wind through the broken wall, and a flame nobody can relight." },
    refs: { where: ["saltmere"], who: ["maren", "thessaly"] },
    tabs: [
      {
        id: "scene",
        blocks: [
          {
            kind: "p",
            spans: [
              "It goes out between the harbour wall and the chapel steps, with both of them holding it. Neither will say afterwards who was carrying it at the moment it happened, and both of them know.",
            ],
          },
        ],
      },
    ],
  },

  {
    key: "scene-boat",
    parent: "salt-tide",
    templateKey: "scene",
    name: "Maren Takes the Boat",
    properties: { summary: "Out on a falling tide, alone, with no light and no good reason she will give." },
    refs: { where: ["saltmere"], who: ["maren"] },
    tabs: [
      {
        id: "scene",
        blocks: [
          {
            kind: "p",
            spans: [
              "She goes out anyway. Half the town watches her do it and not one of them stops her, which is the part she thinks about afterwards.",
            ],
          },
        ],
      },
    ],
  },

  {
    key: "scene-chapel",
    parent: "salt-tide",
    templateKey: "scene",
    name: "What the Chapel Kept",
    properties: { summary: "Thessaly walks in on the low water and does not come out for two hours." },
    refs: { where: ["chapel"], who: ["thessaly"] },
    tabs: [
      {
        id: "scene",
        blocks: [
          {
            kind: "p",
            spans: [
              "The same night, at the other end of the town. Whatever she finds in there, she comes out with the tide table rewritten in her own hand and will not explain the corrections.",
            ],
          },
        ],
      },
    ],
  },

  {
    key: "scene-return",
    parent: "salt-tide",
    templateKey: "scene",
    name: "Two Tides Later",
    properties: { summary: "Both threads land in the same room, and the guild decides what the town is told." },
    refs: { where: ["saltmere"], who: ["maren", "thessaly"] },
    tabs: [
      {
        id: "scene",
        blocks: [
          {
            kind: "p",
            spans: [
              "Two threads, one room, and a decision made by nobody saying anything for long enough. This is where the two halves of that night meet — which is what the lines on the canvas are for.",
            ],
          },
        ],
      },
    ],
  },
];

/**
 * The canvases. Positions match what tidying would choose, so the world arrives
 * arranged: the night in one column, the two threads either side of the line,
 * and the room they both end in on the right.
 */
export const EXAMPLE_STORYLINES: ExampleStoryline[] = [
  {
    page: "salt-tide",
    scenes: [
      { page: "scene-lantern", x: 0, y: 0 },
      { page: "scene-boat", x: 260, y: -60 },
      { page: "scene-chapel", x: 260, y: 60 },
      { page: "scene-return", x: 520, y: 0 },
    ],
    edges: [
      ["scene-lantern", "scene-boat"],
      ["scene-lantern", "scene-chapel"],
      ["scene-boat", "scene-return"],
      ["scene-chapel", "scene-return"],
    ],
    notes: [
      {
        // Inside the box the canvas fits itself to when it opens, which is
        // drawn round the *scenes* — a note parked outside that is on the
        // canvas but off the screen until somebody drags the view, and this
        // world has to look right without being touched.
        x: 400,
        y: 120,
        width: 240,
        text: "Thessaly's version of this night is different, and she has never told it. [[The Drowned Chapel]]",
      },
    ],
    bands: [{ x: -120, y: -170, width: 520, height: 340, label: "One night in Saltmere" }],
  },
];
