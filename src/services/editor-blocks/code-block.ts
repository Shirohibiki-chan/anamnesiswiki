// The code block, with syntax highlighting and a shortened language list.
//
// BlockNote already ships a code block in `defaultBlockSpecs` and this app has
// had one all along without ever saying so. What it did *not* ship is a
// highlighter: that lives in a separate package, and without it the block has
// no language dropdown at all and every character is the same grey. This file
// is the wiring, and three of the decisions in it are load-bearing.
//
// **Nothing is fetched at runtime, and that had to be checked rather than
// assumed** — see CLAUDE.md's Policy Boundary. Shiki can pull grammars from a
// CDN; this path does not. Every grammar below is a static `import()` that Vite
// turns into an ordinary chunk inside the app bundle, and the highlighter
// starts empty and loads from those chunks on demand. So a language costs one
// read from local disk the first time it's chosen, and the app highlights
// exactly as well with the network unplugged.
//
// **Highlighting is skipped for plain text** — that isn't our rule, it's
// BlockNote's, and it's the behaviour that makes this safe for what she keeps
// in here. A block left on the default language is never handed to the
// highlighter at all, so a prompt full of `{{char}}`, asterisks and braces
// renders as the literal characters it has to stay as.
import { createCodeBlockSpec } from "@blocknote/core";
import { createBundledHighlighter } from "@shikijs/core";
import { createJavaScriptRawEngine } from "@shikijs/engine-javascript/raw";
import { CODE_LANGUAGES, DEFAULT_CODE_LANGUAGE } from "../../constants/code-languages";

/**
 * The grammars we ship, one dynamic import each.
 *
 * **This map is hand-written instead of using `codeBlockOptions.createHighlighter`,
 * and the reason is measured rather than tidiness.** Upstream's bundle names all
 * 48 of its languages, and a bundler has to emit a chunk for every `import()` it
 * can see whether or not anything ever asks for it — so taking theirs put **3.6 MB**
 * of grammars into the build, including a 1 MB C++ grammar for a worldbuilding
 * wiki that doesn't offer C++ in its dropdown. The list below is the same
 * languages `CODE_LANGUAGES` offers and costs about **0.8 MB**. Nothing about
 * runtime changes either way; this is download and disk.
 *
 * **The cost of doing it this way is that four `@shikijs/*` packages are now
 * direct dependencies of this app, pinned to the same major version
 * `@blocknote/code-block` asks for.** If those drift apart, two copies of Shiki
 * get bundled and the saving is undone — so when BlockNote's version moves,
 * these move with it. The failure is loud (a build error or highlighting that
 * stops working), not a quiet corruption of anyone's writing.
 *
 * **The keys must match `CODE_LANGUAGES`.** A language offered in the dropdown
 * with no grammar here loads nothing and silently renders as plain text; a
 * grammar here that the dropdown doesn't offer is dead weight in the build. The
 * test in `code-block.test.ts` holds the two together.
 */
const langs = {
  json: () => import("@shikijs/langs-precompiled/json"),
  jsonc: () => import("@shikijs/langs-precompiled/jsonc"),
  yaml: () => import("@shikijs/langs-precompiled/yaml"),
  regexp: () => import("@shikijs/langs-precompiled/regexp"),
  markdown: () => import("@shikijs/langs-precompiled/markdown"),
  xml: () => import("@shikijs/langs-precompiled/xml"),
  html: () => import("@shikijs/langs-precompiled/html"),
  css: () => import("@shikijs/langs-precompiled/css"),
  javascript: () => import("@shikijs/langs-precompiled/javascript"),
  typescript: () => import("@shikijs/langs-precompiled/typescript"),
  python: () => import("@shikijs/langs-precompiled/python"),
  shellscript: () => import("@shikijs/langs-precompiled/shellscript"),
  sql: () => import("@shikijs/langs-precompiled/sql"),
  lua: () => import("@shikijs/langs-precompiled/lua"),
};

/**
 * Both themes, though only one is ever asked for.
 *
 * BlockNote hands the highlighter to `prosemirror-highlight` without naming a
 * theme, so the first loaded one wins and `github-dark` is what actually paints
 * every code block, on every Anamnesis theme. That's why the block's own
 * colours are dark in every theme too — see `--color-code-*` in index.css.
 * `github-light` stays listed because dropping it would make the day someone
 * wires up theme-following a package change rather than a two-line one.
 */
const themes = {
  "github-dark": () => import("@shikijs/themes/github-dark"),
  "github-light": () => import("@shikijs/themes/github-light"),
};

/**
 * The *raw* engine, not the one upstream uses.
 *
 * Shiki's default JavaScript engine carries a compiler that turns Oniguruma
 * regexes into JavaScript ones at load time — 424 KB of it. Every grammar above
 * comes from `@shikijs/langs-precompiled`, where that conversion has already
 * happened, so the compiler is 424 KB of code that would never run. The raw
 * engine is the documented pairing for precompiled grammars and has no
 * dependencies at all.
 *
 * **It only works with precompiled grammars.** A grammar pulled from plain
 * `@shikijs/langs` instead would fail at runtime rather than at build time, so
 * keep the imports above pointing at `-precompiled`.
 */
const createHighlighter = createBundledHighlighter({ langs, themes, engine: () => createJavaScriptRawEngine() });

export const codeBlockSpec = createCodeBlockSpec({
  defaultLanguage: DEFAULT_CODE_LANGUAGE,
  supportedLanguages: CODE_LANGUAGES,
  createHighlighter: () => createHighlighter({ themes: ["github-dark", "github-light"], langs: [] }),
});

/** What the highlighter can actually paint. Exported for the test above. */
export const HIGHLIGHTED_LANGUAGES = Object.keys(langs);
