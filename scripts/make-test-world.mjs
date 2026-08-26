// Generates a junk world on disk, big enough and awkward enough to find things
// by opening it.
//
// **Why a real folder and not a fake filesystem.** The app opens a directory —
// that is its entire relationship with a project. So a test world is just a
// directory with the right things in it, written by this script, and it needs
// no stub shell, no test hooks in the app, and nothing that has to be kept in
// step with whichever shell we are running under this month. It works the same
// under Tauri, under Electron, and under the eventual browser build.
//
// **Deterministic.** The same `--seed` produces identical output, so a check
// that asserts "the deep chain is nine levels down" keeps meaning the same
// thing tomorrow. Change the seed to get a different world; change nothing to
// get the same one back.
//
// **The awkward cases are the point.** A generator that made three hundred
// tidy pages would tell us nothing we do not already know. This one
// deliberately writes the names and shapes that have actually broken the app:
// names longer than a filename can hold, names with characters no filesystem
// will take, sibling pages that collide, emoji that must not be sliced in
// half, meters whose labels are too long for the row, pages nested deep enough
// to threaten the Windows path limit. See HARD_CASES below — every one is
// there because it is a real failure mode, and each is named after what it
// tests so a screenshot explains itself.
//
//   node scripts/make-test-world.mjs
//   node scripts/make-test-world.mjs --pages 800 --seed 7
//   node scripts/make-test-world.mjs --out "D:/scratch/Big World" --force
//
// Refuses to write over a directory it did not generate. The marker it checks
// for has no `.json` extension on purpose: the loader reads every `.json` at
// the project root as a page, so a marker with that extension would turn up in
// the tree as a broken one.
import { deflateSync } from "node:zlib";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// ---------------------------------------------------------------- contract
// Mirrors of the app's own rules. Every one of these is a value the app decides
// elsewhere, restated here because this script writes the files the app will
// read. `scripts/make-test-world.test.ts` checks they still agree, by resolving
// the generated graph through the app's own path code — if you change one here
// and nowhere else, that test is what tells you.
const PROJECT_FILE = "project.json";
const FOLDER_META_FILE = "_folder.json";
const PAGE_META_FILE = "_page.json";
const ASSETS_DIR = "assets";
const ASSET_NAMES_FILE = ".names.json";
const MARKER_FILE = ".generated-test-world";
const MAX_SEGMENT_CHARS = 96;
const ILLEGAL_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;
// folder/character/location/faction/species are a directory even while empty.
const ALWAYS_DIRECTORY = new Set(["folder", "character", "location", "faction", "species"]);
const PALETTE = [
  "teal", "sky", "indigo", "purple", "rose", "red", "orange", "amber",
  "emerald", "cyan", "blue", "violet", "fuchsia", "pink", "coral", "sage",
  "pine", "ocean", "navy", "plum", "wine", "rust", "bronze", "gray",
];

// ---------------------------------------------------------------- options
/**
 * Where the app's own worlds live, so a generated one lands beside them and
 * turns up in the same picker.
 *
 * `homedir()/Documents` is not good enough and this is not a corner case:
 * Windows lets Documents be redirected, OneDrive redirects it by default, and
 * on a machine where that has happened `C:/Users/<name>/Documents` still
 * exists — it is just empty and is not the folder anyone means. The app asks
 * the OS through the shell and gets the redirected path; this has no shell to
 * ask, so it tries the same candidates the OS would and takes the first that
 * is really there.
 */
function documentsDir() {
  const candidates = [
    process.env.OneDrive && join(process.env.OneDrive, "Documents"),
    process.env.USERPROFILE && join(process.env.USERPROFILE, "Documents"),
    join(homedir(), "Documents"),
  ].filter(Boolean);
  return candidates.find((path) => existsSync(path)) ?? join(homedir(), "Documents");
}

function parseArgs(argv) {
  const opts = {
    out: join(documentsDir(), "Anamnesis", "Projects", "Test World (generated)"),
    pages: 300,
    seed: 1,
    force: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--force") opts.force = true;
    else if (arg === "--out") opts.out = argv[++i];
    else if (arg === "--pages") opts.pages = Number(argv[++i]);
    else if (arg === "--seed") opts.seed = Number(argv[++i]);
    else if (arg === "--help" || arg === "-h") {
      console.log("node scripts/make-test-world.mjs [--out PATH] [--pages N] [--seed N] [--force]");
      process.exit(0);
    } else {
      console.error("Unknown option: " + arg);
      process.exit(1);
    }
  }
  if (!Number.isFinite(opts.pages) || opts.pages < 1) {
    console.error("--pages must be a positive number");
    process.exit(1);
  }
  if (!Number.isFinite(opts.seed)) {
    console.error("--seed must be a number");
    process.exit(1);
  }
  return opts;
}

// ---------------------------------------------------------------- randomness
// mulberry32: small, fast, and seeded — the whole reason it is here rather than
// Math.random, which would make every run a different world and every assertion
// about one meaningless.
function makeRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let random = makeRandom(1);
const pick = (list) => list[Math.floor(random() * list.length)];
const between = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
const chance = (p) => random() < p;

// UUID-shaped, but drawn from the seeded stream. The app only ever compares
// these and never parses them, so the shape is all that matters.
function uuid() {
  const hex = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < 32; i++) out += hex[Math.floor(random() * 16)];
  return (
    out.slice(0, 8) + "-" + out.slice(8, 12) + "-4" + out.slice(13, 16) +
    "-a" + out.slice(17, 20) + "-" + out.slice(20)
  );
}

// ---------------------------------------------------------------- vocabulary
const FIRST = ["Valera", "Ordwin", "Sable", "Kestrel", "Mirin", "Thonn", "Aleiya", "Bracken", "Ceriwen", "Dorne", "Eluned", "Fenrick", "Galia", "Hesper", "Ivo", "Jorun", "Kalla", "Lisbet", "Marrow", "Nessa", "Oriel", "Pell", "Quill", "Rhone", "Sorrel", "Tamsin", "Ulva", "Verity", "Wren", "Yarrow"];
const LAST = ["Jiang", "Ashgrove", "Vance", "Holloway", "Reyes", "Okonkwo", "Marsh", "Delacroix", "Ferrow", "Ilves", "Kirumba", "Lindqvist", "Moreau", "Nakamura", "Oyelaran", "Petrov", "Quintero", "Rask", "Sandoval", "Thorne"];
const PLACE_HEAD = ["Ash", "Bell", "Cold", "Dun", "Ever", "Fen", "Grey", "High", "Iron", "Kel", "Long", "Mere", "North", "Old", "Pale", "Quiet", "Red", "Salt", "Thorn", "West"];
const PLACE_TAIL = ["harbour", "reach", "hollow", "mere", "fell", "gate", "ford", "watch", "barrow", "cross", "hythe", "stead", "wick", "moor", "spire", "landing"];
const FACTION_HEAD = ["The Quiet", "The Salt", "The Long", "The Broken", "The Amber", "The Grey", "The Second", "The Last"];
const FACTION_TAIL = ["Assembly", "Compact", "Circle", "Hand", "Ledger", "Chorus", "Watch", "Table", "Bargain"];
const SPECIES = ["Fenwalker", "Saltling", "Ashkin", "Highmoth", "Tidebound", "Emberling", "Stonewake", "Nightgrass"];
const ITEMS = ["Cracked Astrolabe", "Ledger of Small Debts", "Bell That Rings Wrong", "Salt-Stained Coat", "Third Key", "Lantern of Poor Judgement", "Folded Map", "Borrowed Ring"];
const EVENTS = ["The Long Winter", "The Salt Riot", "Closing of the Gate", "Night the River Turned", "First Assembly", "The Quiet Year", "Burning of the Ledgers"];
const TAGS = ["canon", "draft", "wip", "needs-art", "spoiler", "npc", "major", "minor", "unused", "au", "revisit", "player-facing", "gm-only", "hook", "timeline"];
const SENTENCES = [
  "Nobody agrees on when this started, which is itself part of the record.",
  "The short version is the one people repeat; the long version is in ledgers nobody reads.",
  "It cost more than anyone admits, and the accounting was quietly revised afterwards.",
  "Three people were there. Two of them tell it the same way, which is suspicious.",
  "What survives is mostly paperwork, and paperwork is written by whoever won.",
  "It is not a secret so much as a thing nobody has bothered to write down until now.",
  "Ask about it in the wrong room and the conversation changes subject smoothly.",
  "The practical upshot is that the road is closed and nobody will say who closed it.",
  "This has happened before, though not in living memory and not at this scale.",
  "There is a version of this story with a happy ending and it is not the true one.",
];

const sentence = () => pick(SENTENCES);
const paragraph = () => Array.from({ length: between(2, 5) }, sentence).join(" ");

// ------------------------------------------------------- BlockNote content
// The shapes in src/services/editor-blocks/. Kept to the block types the
// templates themselves seed, so a generated page and a hand-made one are the
// same kind of document.
const text = (value) => (value ? [{ type: "text", text: value, styles: {} }] : []);
const p = (value) => ({ type: "paragraph", content: text(value) });
const h2 = (value) => ({ type: "heading", props: { level: 2 }, content: text(value) });
const info = (value) => ({ type: "calloutInfo", content: text(value) });
const quote = (value) => ({ type: "calloutQuote", content: text(value) });
const secret = (value) => ({ type: "calloutSecret", content: text(value) });

// A paragraph with a mention chip in the middle of it. Mentions are what feed
// the link index and the backlinks panel, so a world without them exercises
// neither.
function paragraphMentioning(target) {
  return {
    type: "paragraph",
    content: [
      ...text("Most of this only makes sense alongside "),
      { type: "mention", props: { nodeId: target.id, label: target.name } },
      ...text(", for reasons " + (chance(0.5) ? "everyone" : "nobody") + " finds convenient. " + sentence()),
    ],
  };
}

function bodyFor(mentionTargets) {
  const blocks = [info(paragraph()), quote('"' + sentence() + '"')];
  for (let i = 0; i < between(2, 6); i++) {
    blocks.push(h2(pick(["Description", "Origin", "Routine", "Notes", "Aftermath", "Open Questions", "What Changed"])));
    blocks.push(p(paragraph()));
    if (mentionTargets.length && chance(0.45)) blocks.push(paragraphMentioning(pick(mentionTargets)));
  }
  if (chance(0.3)) blocks.push(secret(paragraph()));
  return blocks;
}

// ---------------------------------------------------------------- sidebar
function meterBlock(longLabels) {
  const face = pick(["bar", "spectrum", "rating", "pool", "pie"]);
  const labelPool = longLabels
    ? [
        "Absolutely Refuses To Discuss It Under Any Circumstances",
        "Would Sooner Walk Into The Sea Than Answer",
        "Considers The Question Itself An Insult",
      ]
    : ["Cold", "Warm", "Loyal", "Wary", "Open", "Closed", "Kind", "Cruel"];
  return {
    id: uuid(),
    kind: "meter",
    title: longLabels
      ? "Where They Land On Almost Every Question That Actually Matters"
      : pick(["Temperament", "Standing", "Condition", "Reputation"]),
    color: pick(PALETTE),
    face,
    segmented: chance(0.3),
    meters: Array.from({ length: between(1, 4) }, () => ({
      id: uuid(),
      label: pick(labelPool),
      value: between(0, 10),
      max: 10,
      ...(face === "spectrum" ? { lowLabel: pick(labelPool), highLabel: pick(labelPool) } : {}),
    })),
  };
}

function sidebarFor(node, refTargets, hardCase) {
  const blocks = [];
  if (node.image) blocks.push({ id: uuid(), kind: "image" });
  blocks.push({ id: uuid(), kind: "property", propertyKey: "summary" });
  if (chance(0.5)) blocks.push({ id: uuid(), kind: "tags" });
  if (chance(0.4)) blocks.push({ id: uuid(), kind: "text", title: "Note to self", text: sentence() });
  if (chance(0.45) || hardCase === "meters") blocks.push(meterBlock(hardCase === "meters"));
  if (refTargets.length && chance(0.35)) {
    blocks.push({
      id: uuid(),
      kind: "collection",
      title: "Connected",
      source: "manual",
      targetIds: Array.from({ length: between(1, 5) }, () => pick(refTargets).id),
    });
  }
  if (chance(0.15)) blocks.push({ id: uuid(), kind: "alias" });
  return blocks;
}

// ---------------------------------------------------------------- hard cases
// Pages the generator always writes, whatever the seed, because each one is a
// bug we have shipped or nearly shipped. The name says what it tests.
const HARD_CASES = [
  { kind: "long-name", name: "A Page Whose Name Runs On Considerably Past The Point Where Any Sensible Filesystem Would Still Be Interested In Storing It Verbatim" },
  { kind: "illegal-chars", name: 'Who? What: "Where" <When> | How\\Why /Which*' },
  { kind: "emoji", name: "\u{1F702}\u{1F703}\u{1F704}\u{1F701} The Four Humours of Longmoor \u{1F3F4}\u200D\u2620\uFE0F" },
  { kind: "duplicate", name: "Duplicate Name" },
  { kind: "duplicate", name: "Duplicate Name" },
  { kind: "duplicate", name: "Duplicate Name" },
  { kind: "trailing-dots", name: "Ends In A Dot..." },
  { kind: "single-char", name: "X" },
  { kind: "meters", name: "Every Meter Face At Once, With Labels Too Long For The Row" },
  { kind: "empty", name: "Deliberately Empty Page" },
  { kind: "rtl", name: "\u0645\u062F\u064A\u0646\u0629 \u0627\u0644\u0645\u0644\u062D \u2014 Salt City" },
  { kind: "whitespace", name: "   Leading And Trailing Spaces   " },
];

// ---------------------------------------------------------------- the graph
function buildGraph(pageCount) {
  const nodes = [];
  // A fixed clock rather than Date.now(), so two runs at the same seed agree
  // on creation order — which is what decides collision suffixes.
  let clock = Date.parse("2026-01-01T00:00:00Z");

  function add(input) {
    const node = {
      id: uuid(),
      parentId: input.parentId,
      templateKey: input.templateKey,
      name: input.name,
      tabs: input.tabs ?? [],
      properties: input.properties ?? {},
      customProperties: [],
      blocks: input.blocks ?? [],
      tags: input.tags ?? [],
      createdAt: (clock += 1000),
      updatedAt: clock,
    };
    if (input.color) node.color = input.color;
    if (input.aliases) node.aliases = input.aliases;
    if (input.hidden) node.hidden = true;
    nodes.push(node);
    return node;
  }

  // Root folders, in the shape a real world tends to grow into.
  const sections = [
    { name: "Characters", templateKey: "character", share: 0.34 },
    { name: "Locations", templateKey: "location", share: 0.22 },
    { name: "Factions", templateKey: "faction", share: 0.1 },
    { name: "Species", templateKey: "species", share: 0.06 },
    { name: "Items", templateKey: "item", share: 0.1 },
    { name: "Events", templateKey: "event", share: 0.1 },
    { name: "Notes", templateKey: "note", share: 0.08 },
  ];
  const roots = sections.map((section) =>
    add({ parentId: null, templateKey: "folder", name: section.name, color: pick(PALETTE) }),
  );

  const nameFor = (templateKey) => {
    if (templateKey === "character") return pick(FIRST) + " " + pick(LAST);
    if (templateKey === "location") return pick(PLACE_HEAD) + pick(PLACE_TAIL);
    if (templateKey === "faction") return pick(FACTION_HEAD) + " " + pick(FACTION_TAIL);
    if (templateKey === "species") return pick(SPECIES);
    if (templateKey === "item") return pick(ITEMS);
    if (templateKey === "event") return pick(EVENTS);
    return pick(["On", "Regarding", "Concerning", "About"]) + " " + pick(PLACE_HEAD) + pick(PLACE_TAIL);
  };

  // Pass one: the pages themselves. A quarter hang off another page rather
  // than the folder, which is what turns a flat-file template into a directory
  // one — the storage rule most likely to break quietly.
  sections.forEach((section, index) => {
    const root = roots[index];
    const wanted = Math.max(1, Math.round(pageCount * section.share));
    const placed = [];
    for (let i = 0; i < wanted; i++) {
      const parent = placed.length && chance(0.25) ? pick(placed) : root;
      placed.push(
        add({
          parentId: parent.id,
          templateKey: section.templateKey,
          name: nameFor(section.templateKey),
          tags: Array.from({ length: between(0, 4) }, () => pick(TAGS)),
          color: chance(0.25) ? pick(PALETTE) : undefined,
          aliases: chance(0.2) ? [pick(FIRST), pick(PLACE_HEAD) + pick(PLACE_TAIL)] : undefined,
          hidden: chance(0.06),
        }),
      );
    }
  });

  // One deliberately deep chain, to put a real path near the Windows limit.
  let deep = add({ parentId: roots[1].id, templateKey: "location", name: "Deep Nesting Test", color: "wine" });
  for (let i = 1; i <= 9; i++) {
    deep = add({
      parentId: deep.id,
      templateKey: "location",
      name: "Level " + i + " \u2014 " + pick(PLACE_HEAD) + pick(PLACE_TAIL) + " Sub-District Of The Lower Quarter",
    });
  }

  // The hard cases, as siblings under one folder so they are easy to find and
  // the duplicate-name rule actually has siblings to collide with.
  const oddities = add({ parentId: null, templateKey: "folder", name: "Hard Cases", color: "red" });
  const hardCaseIds = new Map();
  for (const testCase of HARD_CASES) {
    const node = add({
      parentId: oddities.id,
      templateKey: testCase.kind === "empty" ? "blank" : "note",
      name: testCase.name,
      tags: ["test-case"],
    });
    hardCaseIds.set(node.id, testCase.kind);
  }

  // Pass two: content. Separate because mentions and reference properties
  // point at other pages, which have to exist first.
  const mentionable = nodes.filter((node) => node.templateKey !== "folder");
  for (const node of nodes) {
    if (node.templateKey === "folder") continue;
    const hardCase = hardCaseIds.get(node.id);
    if (hardCase === "empty") continue;

    node.tabs = [{ id: "overview", label: "Overview", hidden: false, content: bodyFor(mentionable) }];
    if (chance(0.4)) {
      node.tabs.push({
        id: "backstory",
        label: pick(["Backstory", "History", "Behind the Scenes", "Notes"]),
        hidden: chance(0.5),
        content: bodyFor(mentionable),
      });
    }
    node.properties = {
      summary: sentence(),
      ...(chance(0.5) ? { friends: Array.from({ length: between(1, 4) }, () => pick(mentionable).id) } : {}),
    };
    node.blocks = sidebarFor(node, mentionable, hardCase);
  }

  return nodes;
}

// ---------------------------------------------------------------- paths
// A restatement of buildPathIndex + resolveNodePath. The collision key is
// parent + storage kind + lowercased sanitized name, because a directory node
// and a flat-file node with the same name do not collide (one is a directory,
// the other a `.json`) but two of the same kind do.
function sanitizeSegment(name) {
  const cleaned = name.replace(ILLEGAL_CHARS, "_").trim().replace(/[. ]+$/, "");
  const capped =
    cleaned.length > MAX_SEGMENT_CHARS
      ? Array.from(cleaned).slice(0, MAX_SEGMENT_CHARS).join("").replace(/[. ]+$/, "")
      : cleaned;
  return capped.length > 0 ? capped : "Untitled";
}

function planPaths(nodes) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const parentIds = new Set(nodes.map((node) => node.parentId).filter(Boolean));
  const usesDirectory = (node) =>
    node.templateKey === "folder" || ALWAYS_DIRECTORY.has(node.templateKey) || parentIds.has(node.id);

  const segmentById = new Map();
  const taken = new Map();
  // Creation order, because that is the order the app suffixes collisions in.
  const inCreationOrder = [...nodes].sort(
    (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  );
  for (const node of inCreationOrder) {
    const base = sanitizeSegment(node.name);
    const key = JSON.stringify([node.parentId, usesDirectory(node), base.toLowerCase()]);
    const seen = taken.get(key) ?? 0;
    taken.set(key, seen + 1);
    segmentById.set(node.id, seen === 0 ? base : base + " (" + (seen + 1) + ")");
  }

  const ancestorSegments = (node) => {
    const segments = [];
    let current = node.parentId ? byId.get(node.parentId) : null;
    while (current) {
      segments.unshift(segmentById.get(current.id));
      current = current.parentId ? byId.get(current.parentId) : null;
    }
    return segments;
  };

  return nodes.map((node) => {
    const ancestors = ancestorSegments(node);
    const own = segmentById.get(node.id);
    return usesDirectory(node)
      ? {
          node,
          dirSegments: [...ancestors, own],
          fileName: node.templateKey === "folder" ? FOLDER_META_FILE : PAGE_META_FILE,
        }
      : { node, dirSegments: ancestors, fileName: own + ".json" };
  });
}

// ---------------------------------------------------------------- pictures
// Real PNGs rather than placeholders: the assets tab, the lightbox, the banner
// and the export size estimate all read actual bytes, and a zero-byte file with
// a .png name exercises none of them.
function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(width, height, rgb) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolour
  const raw = Buffer.alloc(height * (width * 3 + 1));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // filter: none
    const fade = y / height;
    for (let x = 0; x < width; x++) {
      raw[offset++] = Math.round(rgb[0] * (1 - fade) + 255 * fade * 0.35);
      raw[offset++] = Math.round(rgb[1] * (1 - fade) + 255 * fade * 0.35);
      raw[offset++] = Math.round(rgb[2] * (1 - fade) + 255 * fade * 0.35);
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- writing
function guardTarget(out, force) {
  if (!existsSync(out)) return;
  if (readdirSync(out).length === 0) return;
  if (!existsSync(join(out, MARKER_FILE))) {
    console.error("Refusing to write to " + out);
    console.error("  It already exists and was not made by this script.");
    console.error("  Pick another --out, or delete it yourself if it really is junk.");
    process.exit(1);
  }
  if (!force) {
    console.error(out + " already holds a generated world.");
    console.error("  Re-run with --force to replace it.");
    process.exit(1);
  }
  rmSync(out, { recursive: true, force: true });
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  random = makeRandom(opts.seed);

  guardTarget(opts.out, opts.force);
  mkdirSync(join(opts.out, ASSETS_DIR), { recursive: true });

  const nodes = buildGraph(opts.pages);

  // Pictures first, so a node that claims one is claiming a file that is really
  // there — a missing asset is its own bug, and not the one this world is for.
  const assetNames = {};
  const assets = [];
  for (let i = 0; i < 12; i++) {
    const fileName = uuid() + ".png";
    const portrait = i % 3 !== 0;
    writeFileSync(
      join(opts.out, ASSETS_DIR, fileName),
      png(portrait ? 480 : 1200, portrait ? 480 : 400, [between(20, 200), between(20, 200), between(20, 200)]),
    );
    assetNames[fileName] =
      i === 6
        ? "A picture whose name is far longer than the tile it has to sit in, deliberately"
        : (portrait ? "Portrait " : "Banner ") + (i + 1);
    assets.push({ fileName, portrait });
  }
  writeFileSync(join(opts.out, ASSETS_DIR, ASSET_NAMES_FILE), JSON.stringify(assetNames, null, 2));

  const portraits = assets.filter((asset) => asset.portrait);
  const banners = assets.filter((asset) => !asset.portrait);
  for (const node of nodes) {
    if (node.templateKey === "folder") continue;
    if (chance(0.35)) node.image = pick(portraits).fileName;
    if (chance(0.15)) node.banner = pick(banners).fileName;
  }

  for (const { node, dirSegments, fileName } of planPaths(nodes)) {
    const dir = join(opts.out, ...dirSegments);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, fileName), JSON.stringify(node, null, 2));
  }

  const rootOrder = nodes.filter((node) => node.parentId === null).map((node) => node.id);
  writeFileSync(
    join(opts.out, PROJECT_FILE),
    JSON.stringify(
      {
        version: 1,
        id: uuid(),
        name: "Test World (generated)",
        rootOrder,
        expandedIds: rootOrder.slice(0, 3),
        selectedId: null,
        createdAt: Date.parse("2026-01-01T00:00:00Z"),
      },
      null,
      2,
    ),
  );

  writeFileSync(
    join(opts.out, MARKER_FILE),
    "Generated by scripts/make-test-world.mjs\n" +
      "seed: " + opts.seed + "\n" +
      "pages: " + opts.pages + "\n\n" +
      "This folder is disposable. Re-running the script with --force replaces it.\n",
  );

  const folders = nodes.filter((node) => node.templateKey === "folder").length;
  console.log("Wrote " + nodes.length + " pages (" + folders + " folders) and " + assets.length + " pictures");
  console.log("  " + opts.out);
  console.log("  seed " + opts.seed + " \u2014 same seed, same world");
}

main();
