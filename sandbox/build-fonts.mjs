// Regenerates the sandbox's font files. Two outputs, two different jobs:
//
//   fonts.css          the app's three real bundled faces, inlined
//   fonts-library.css  ~90 open-licence families for trying things out
//   fonts-library.js   the manifest the sandbox builds its dropdowns from
//
// Why inline rather than just pointing at ../public/fonts/: the sandbox is
// opened by double-clicking it, so it runs from a file:// URL, and browsers
// refuse to load @font-face files across file:// origins. A relative <link>
// to a stylesheet in the same folder is fine; the font bytes have to be
// *inside* that stylesheet. The result is a sandbox that works offline, from
// anywhere on disk, with no dev server and no install.
//
// The library families are fetched from Google Fonts *here, at build time, by
// a developer* — never by the sandbox and never by the app. Downloads are
// cached in sandbox/.font-cache/ (gitignored), so a rerun is offline and
// instant. This does not put a network call anywhere near the product; see
// CLAUDE.md §Policy Boundary.
//
// Run after changing anything in public/fonts, or after editing LIBRARY:
//   node sandbox/build-fonts.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(here, "..", "public", "fonts");
const cacheDir = join(here, ".font-cache");

/* ---------------------------------------------------------------------------
   1. The app's own faces
   Mirrors the @font-face set in src/index.css. Keep them in step, or the
   sandbox stops being an honest preview of the app.
   ------------------------------------------------------------------------ */
const SHIPPED = [
  { family: "Inter", style: "normal", weight: "400", file: "inter-400.woff2" },
  { family: "Inter", style: "normal", weight: "500", file: "inter-500.woff2" },
  { family: "Inter", style: "normal", weight: "600", file: "inter-600.woff2" },
  { family: "Newsreader", style: "normal", weight: "400", file: "newsreader-400.woff2" },
  { family: "Newsreader", style: "italic", weight: "400", file: "newsreader-400-italic.woff2" },
  { family: "Fraunces", style: "normal", weight: "100 900", file: "fraunces-variable.woff2", variations: true },
];

/* ---------------------------------------------------------------------------
   2. The try-it-out library

   Every family here is under the SIL Open Font License or Apache 2.0, so any
   of them can be bundled into the app for real if she falls for one. That is
   the whole point of the list: everything in it is a font we're allowed to
   ship, unlike the Windows faces the sandbox also offers.

   Weights are deliberately mean. Two per text family, one for display and
   handwriting faces — the preview only needs enough to judge the shape, and
   every extra weight is another 20KB of base64 in the repo.
   ------------------------------------------------------------------------ */
const TEXT_SERIF = { weights: [400, 600], italic: true, cat: "serif" };
const TEXT_SANS = { weights: [400, 600], italic: false, cat: "sans" };
const ONE = { weights: [400], italic: false, cat: "display" };
const HAND = { weights: [400], italic: false, cat: "hand" };
const MONO = { weights: [400], italic: false, cat: "mono" };

const LIBRARY = [
  // --- serif: made for long stretches of reading -------------------------
  ...["EB Garamond", "Cormorant Garamond", "Lora", "Crimson Pro", "Spectral",
      "Libre Baskerville", "Vollkorn", "Alegreya", "Literata", "Petrona",
      "Faustina", "Bitter", "Zilla Slab", "Source Serif 4", "Cardo",
      "Gentium Book Plus", "Frank Ruhl Libre", "Merriweather", "PT Serif",
      "Domine", "Eczar", "Rosarivo", "Neuton",
     ].map((family) => ({ family, ...TEXT_SERIF })),

  // --- sans: interface faces ---------------------------------------------
  ...["Manrope", "DM Sans", "Plus Jakarta Sans", "Figtree", "Lexend", "Outfit",
      "Sora", "Space Grotesk", "Work Sans", "Public Sans", "Karla", "Rubik",
      "Nunito Sans", "Mulish", "Cabin", "Barlow", "Archivo", "Urbanist",
      "Epilogue", "Chivo", "Raleway", "Quicksand", "Josefin Sans",
      "Source Sans 3", "Assistant", "Hanken Grotesk",
     ].map((family) => ({ family, ...TEXT_SANS })),

  // --- display: titles, and titles only ----------------------------------
  ...["Playfair Display", "Cinzel", "Cinzel Decorative", "Marcellus",
      "Gilda Display", "Prata", "Yeseva One", "Old Standard TT", "Italiana",
      "Julius Sans One", "Cormorant Unicase", "Cormorant SC", "IM Fell English",
      "Uncial Antiqua", "MedievalSharp", "Grenze Gotisch", "Metamorphous",
      "Almendra", "Pirata One", "Trade Winds", "Bodoni Moda",
      "DM Serif Display", "Abril Fatface", "Bebas Neue", "Oswald",
      "Philosopher", "Amatic SC", "Cormorant Infant", "Antic Didone",
     ].map((family) => ({ family, ...ONE })),

  // --- handwriting --------------------------------------------------------
  ...["Caveat", "Kalam", "Shadows Into Light", "Indie Flower",
      "Architects Daughter", "Patrick Hand", "Gloria Hallelujah", "Tangerine",
      "Great Vibes", "Dancing Script",
     ].map((family) => ({ family, ...HAND })),

  // --- monospace ----------------------------------------------------------
  ...["JetBrains Mono", "IBM Plex Mono", "Fira Code", "Source Code Pro",
      "Space Mono", "Roboto Mono", "Inconsolata", "DM Mono", "Courier Prime",
      "Azeret Mono",
     ].map((family) => ({ family, ...MONO })),
];

/* --- fetching ------------------------------------------------------------ */

// Google serves woff2 only to browsers it recognises; with Node's default
// user agent it hands back ancient TrueType instead, which is four times the
// size for the same glyphs.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

mkdirSync(cacheDir, { recursive: true });

async function cached(url) {
  const file = join(cacheDir, createHash("sha1").update(url).digest("hex").slice(0, 20));
  if (existsSync(file)) return readFileSync(file);
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(file, buf);
  return buf;
}

// Candidate specs, most complete first. Not every family has every weight or
// an italic, and Google rejects the whole request when one piece is missing —
// so ask for less until it says yes rather than hand-maintaining a weight
// table for ninety families.
function specs(entry) {
  const w = entry.weights;
  const out = [];
  if (entry.italic) out.push(`ital,wght@${w.map((n) => `0,${n}`).join(";")};1,${w[0]}`);
  out.push(`wght@${w.join(";")}`);
  out.push(`wght@${w[0]}`);
  out.push(null); // bare family — whatever its single face is
  return out;
}

async function familyCss(entry) {
  let lastError;
  for (const spec of specs(entry)) {
    const name = entry.family.replace(/ /g, "+");
    const url = `https://fonts.googleapis.com/css2?family=${name}${spec ? `:${spec}` : ""}&display=block`;
    try {
      return { css: (await cached(url)).toString("utf8"), italic: entry.italic && spec?.includes("1,") };
    } catch (err) { lastError = err; }
  }
  throw lastError;
}

// Google splits each face across a dozen unicode subsets (cyrillic, greek,
// vietnamese…). Only the latin one is worth 20KB of base64 here, and it is
// the block whose range starts at U+0000-00FF.
function latinFaces(css) {
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)]
    .map((m) => m[1])
    .filter((body) => {
      const range = /unicode-range:\s*([^;]+);/.exec(body);
      return !range || range[1].trim().startsWith("U+0000-00FF");
    })
    .map((body) => ({
      style: (/font-style:\s*([^;]+);/.exec(body)?.[1] || "normal").trim(),
      weight: (/font-weight:\s*([^;]+);/.exec(body)?.[1] || "400").trim(),
      url: /src:\s*url\(([^)]+)\)/.exec(body)?.[1],
    }))
    .filter((f) => f.url);
}

function faceBlock({ family, style, weight, base64, format = "woff2" }) {
  return [
    "@font-face {",
    `  font-family: "${family}";`,
    `  font-style: ${style};`,
    `  font-weight: ${weight};`,
    "  font-display: block;",
    `  src: url(data:font/woff2;base64,${base64}) format("${format}");`,
    "}",
  ].join("\n");
}

/* --- 1. the shipped three ------------------------------------------------ */
const shippedBlocks = SHIPPED.map((face) => faceBlock({
  ...face,
  base64: readFileSync(join(fontsDir, face.file)).toString("base64"),
  format: face.variations ? "woff2-variations" : "woff2",
}));

writeFileSync(join(here, "fonts.css"),
  `/* GENERATED FILE — do not edit by hand.
   Run \`node sandbox/build-fonts.mjs\` to regenerate.

   The app's three bundled faces, inlined as data: URIs so the sandbox works
   when opened straight off disk. See build-fonts.mjs for why. */\n\n` +
  shippedBlocks.join("\n\n") + "\n");

const shippedBytes = SHIPPED.reduce((n, f) => n + readFileSync(join(fontsDir, f.file)).length, 0);
console.log(`fonts.css — ${SHIPPED.length} faces, ${Math.round(shippedBytes / 1024)}KB (the app's own)`);

/* --- 2. the library ------------------------------------------------------ */
const blocks = [];
const manifest = [];
const failed = [];
let bytes = 0;

for (const entry of LIBRARY) {
  try {
    const { css } = await familyCss(entry);
    const faces = latinFaces(css);
    if (!faces.length) throw new Error("no latin subset");
    let hasItalic = false;
    for (const face of faces) {
      const buf = await cached(face.url);
      bytes += buf.length;
      if (face.style === "italic") hasItalic = true;
      blocks.push(faceBlock({ family: entry.family, style: face.style, weight: face.weight, base64: buf.toString("base64") }));
    }
    manifest.push({ family: entry.family, cat: entry.cat, italic: hasItalic });
    process.stdout.write(".");
  } catch (err) {
    failed.push(`${entry.family} (${err.message})`);
    process.stdout.write("!");
  }
}
process.stdout.write("\n");

writeFileSync(join(here, "fonts-library.css"),
  `/* GENERATED FILE — do not edit by hand.
   Run \`node sandbox/build-fonts.mjs\` to regenerate.

   ${manifest.length} open-licence families for trying things out in the sandbox.
   None of these ship with the app; every one of them *could*. */\n\n` +
  blocks.join("\n\n") + "\n");

// The manifest is generated rather than hand-listed in the HTML so the two can
// never disagree: a family that failed to download simply isn't offered.
const byCat = (cat) => manifest.filter((m) => m.cat === cat)
  .map((m) => `  { family: ${JSON.stringify(m.family)}, cat: ${JSON.stringify(m.cat)}, italic: ${m.italic} },`)
  .join("\n");

writeFileSync(join(here, "fonts-library.js"),
  `/* GENERATED FILE — do not edit by hand.
   Run \`node sandbox/build-fonts.mjs\` to regenerate.

   What actually made it into fonts-library.css. theme-sandbox.html builds its
   font dropdowns from this, so the list and the faces can't drift apart. */
window.FONT_LIBRARY = [
${["serif", "sans", "display", "hand", "mono"].map(byCat).filter(Boolean).join("\n")}
];\n`);

console.log(`fonts-library.css — ${manifest.length} families, ${blocks.length} faces, ${(bytes / 1024 / 1024).toFixed(1)}MB of woff2 inlined`);
if (failed.length) console.log(`skipped ${failed.length}: ${failed.join(", ")}`);
