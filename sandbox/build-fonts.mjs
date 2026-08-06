// Regenerates sandbox/fonts.css by inlining the app's real woff2 files as
// data: URIs.
//
// Why inline rather than just pointing at ../public/fonts/: the sandbox is
// opened by double-clicking it, so it runs from a file:// URL, and browsers
// refuse to load @font-face files across file:// origins. A relative <link>
// to a stylesheet in the same folder is fine; the font bytes have to be
// *inside* that stylesheet. The result is a sandbox that works offline, from
// anywhere on disk, with no dev server and no install.
//
// Run after changing anything in public/fonts:
//   node sandbox/build-fonts.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(here, "..", "public", "fonts");

// Mirrors the @font-face set in src/index.css. Keep them in step, or the
// sandbox stops being an honest preview of the app.
const FACES = [
  { family: "Inter", style: "normal", weight: "400", file: "inter-400.woff2" },
  { family: "Inter", style: "normal", weight: "500", file: "inter-500.woff2" },
  { family: "Inter", style: "normal", weight: "600", file: "inter-600.woff2" },
  { family: "Newsreader", style: "normal", weight: "400", file: "newsreader-400.woff2" },
  { family: "Newsreader", style: "italic", weight: "400", file: "newsreader-400-italic.woff2" },
  { family: "Fraunces", style: "normal", weight: "100 900", file: "fraunces-variable.woff2", variations: true },
];

const blocks = FACES.map((face) => {
  const bytes = readFileSync(join(fontsDir, face.file));
  const format = face.variations ? "woff2-variations" : "woff2";
  return [
    "@font-face {",
    `  font-family: "${face.family}";`,
    `  font-style: ${face.style};`,
    `  font-weight: ${face.weight};`,
    "  font-display: block;",
    `  src: url(data:font/woff2;base64,${bytes.toString("base64")}) format("${format}");`,
    "}",
  ].join("\n");
});

const header = `/* GENERATED FILE — do not edit by hand.
   Run \`node sandbox/build-fonts.mjs\` to regenerate.

   The app's three bundled faces, inlined as data: URIs so the sandbox works
   when opened straight off disk. See build-fonts.mjs for why. */\n\n`;

writeFileSync(join(here, "fonts.css"), header + blocks.join("\n\n") + "\n");

const total = FACES.reduce((sum, f) => sum + readFileSync(join(fontsDir, f.file)).length, 0);
console.log(`fonts.css written — ${FACES.length} faces, ${Math.round(total / 1024)}KB of woff2 inlined`);
