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

const baseSpec = createCodeBlockSpec({
  defaultLanguage: DEFAULT_CODE_LANGUAGE,
  supportedLanguages: CODE_LANGUAGES,
  createHighlighter: () => createHighlighter({ themes: ["github-dark", "github-light"], langs: [] }),
});

/**
 * Our code block: upstream's, with a header bar inserted into what it renders.
 *
 * **Only `render` is wrapped, and the rest of the spec is passed through
 * untouched — that's the whole reason this is a wrapper rather than a block of
 * our own.** `extensions` carries the syntax-highlighting plugin and the
 * keyboard shortcuts (Tab indents instead of leaving the block, Enter doesn't
 * escape it), and `implementation` carries the parse rules and the
 * `toExternalHTML` that decides what lands on the clipboard. Rebuilding this as
 * a custom block would mean owning all of that, and the highlighting plugin is
 * keyed on the node type name `codeBlock`, so a differently-named block silently
 * stops being highlighted at all.
 *
 * What the header is for: upstream renders a bare `<select>` absolutely
 * positioned over the first line of code at `opacity: 0`, revealed at half
 * opacity when anything in the block is hovered. That reads as a grey smear
 * appearing over your writing when the mouse passes by, and there's nowhere to
 * put a Copy button. A real strip across the top gives the language a place to
 * sit that isn't on top of the text, and gives the block somewhere to grow
 * controls.
 *
 * **Two things about wrapping this function, both learned by breaking the app
 * with them.**
 *
 * 1. **It reads `this`.** Upstream's wrapper reaches for
 *    `this.blockContentDOMAttributes`, `this.renderType`, `this.props` and
 *    `this.propSchema`, and BlockNote supplies them by calling
 *    `render.call({...})` rather than as arguments. Calling it plainly makes
 *    `this` undefined and throws on the first property read — which took the
 *    whole window blank the moment a page containing a code block was opened.
 *    So `render` here is a method, not an arrow, and forwards its own `this`.
 * 2. **`rendered.dom` is not the code, it's the block.** By the time we see it,
 *    `wrapInBlockStructure` has already put the fragment inside the
 *    `div.bn-block-content[data-content-type="codeBlock"]` that every one of
 *    BlockNote's own selectors and parse rules is written against. Returning a
 *    different element in its place throws all of that away. **Rearrange what's
 *    inside it; never replace it.**
 */
type CodeRender = typeof baseSpec.implementation.render;
type CodeRendered = ReturnType<CodeRender>;

// The declared `this` type is satisfied only by upstream's own implementation
// object, so forwarding our caller's `this` needs the cast. `unknown` rather
// than `any` so nothing here can accidentally read a property off it.
const baseRender = baseSpec.implementation.render as unknown as (
  this: unknown,
  block: Parameters<CodeRender>[0],
  editor: Parameters<CodeRender>[1],
) => CodeRendered;

export const codeBlockSpec = {
  ...baseSpec,
  implementation: {
    ...baseSpec.implementation,
    render(this: unknown, block: Parameters<CodeRender>[0], editor: Parameters<CodeRender>[1]): CodeRendered {
      const rendered = baseRender.call(this, block, editor);
      const root = rendered.dom as ParentNode;
      const pre = root.querySelector("pre");

      // If upstream ever stops rendering a `<pre>`, hand back exactly what it
      // gave us rather than guessing. An unstyled code block is a bad day; a
      // blank window is a lost afternoon.
      if (!pre?.parentElement) return rendered;

      const header = document.createElement("div");
      header.className = "editor-code-header";
      // ProseMirror must not treat any of this as content. Without it the
      // header becomes a place the caret can land and backspace can delete.
      header.contentEditable = "false";

      // Moved rather than recreated, so the change listener upstream attached
      // to the `<select>` — and the `destroy` that removes it — still find it.
      // Its old wrapper goes once it's empty.
      const select = root.querySelector("select");
      const oldWrapper = select?.parentElement;
      if (select) header.append(select);
      if (oldWrapper && oldWrapper !== header) oldWrapper.remove();

      const copy = buildCopyButton(() => pre.textContent ?? "");
      header.append(copy.element);
      pre.parentElement.insertBefore(header, pre);

      return {
        ...rendered,
        // The Copy button changes its own `data-state` when clicked, and
        // ProseMirror watches this subtree for mutations. Left unclaimed, that
        // attribute change marks the node dirty and can cost the block a
        // redraw mid-click. Anything outside the header falls through to
        // whatever the answer was before, so the editable half is untouched.
        ignoreMutation: (mutation) => header.contains(mutation.target) || (rendered.ignoreMutation?.(mutation) ?? false),
        destroy: () => {
          copy.destroy();
          rendered.destroy?.();
        },
      };
    },
  },
} as typeof baseSpec;

/** What the highlighter can actually paint. Exported for the test above. */
export const HIGHLIGHTED_LANGUAGES = Object.keys(langs);

// Lucide's `copy` and `check`, inlined. The rest of the app gets its icons as
// React components from `constants/icons.ts`, which is no use here — a block's
// render is plain DOM, called by ProseMirror rather than by React.
const COPY_ICON = '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>';
const CHECK_ICON = '<path d="M20 6 9 17l-5-5"/>';

function icon(paths: string, state: string): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-when="${state}">${paths}</svg>`;
}

/**
 * The Copy button, and the confirmation that it worked.
 *
 * The text is read from the `<pre>` at click time rather than from the block
 * that was passed to `render`, and that's deliberate: `render` runs once and the
 * block it was given is a snapshot, so a button closing over it would copy
 * whatever the code said when the block first appeared.
 *
 * `execCommand` is kept as a fallback because `navigator.clipboard` needs a
 * secure context, and the Tauri webview's origin isn't `https:`. It works
 * today; if a webview update ever changes that, this degrades to the old API
 * instead of a button that silently does nothing.
 *
 * **All three states are in the DOM from the start and CSS shows one of them.**
 * The obvious version rewrites `innerHTML` on each click, but this subtree lives
 * inside a ProseMirror node view that watches for exactly that; one attribute
 * changing is the smallest thing that can say "it worked" without handing the
 * editor a pile of added and removed nodes to interpret mid-click.
 */
function buildCopyButton(getText: () => string): { element: HTMLButtonElement; destroy: () => void } {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "editor-code-copy";
  element.title = "Copy";
  element.dataset.state = "idle";
  element.innerHTML =
    `${icon(COPY_ICON, "idle")}${icon(CHECK_ICON, "copied")}${icon(COPY_ICON, "failed")}` +
    `<span data-when="idle">Copy</span><span data-when="copied">Copied</span><span data-when="failed">Couldn't copy</span>`;

  let timer: ReturnType<typeof setTimeout> | undefined;

  const confirm = (ok: boolean): void => {
    element.dataset.state = ok ? "copied" : "failed";
    clearTimeout(timer);
    timer = setTimeout(() => {
      element.dataset.state = "idle";
    }, 1600);
  };

  const write = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const scratch = document.createElement("textarea");
      scratch.value = text;
      scratch.setAttribute("aria-hidden", "true");
      scratch.style.cssText = "position:fixed;top:-1000px;opacity:0";
      document.body.append(scratch);
      scratch.select();
      const ok = document.execCommand("copy");
      scratch.remove();
      return ok;
    }
  };

  const onClick = (event: MouseEvent): void => {
    event.preventDefault();
    void write(getText()).then(confirm);
  };

  // Without this, pressing the button moves the caret out of whatever you were
  // writing before the click ever fires.
  const onMouseDown = (event: MouseEvent): void => event.preventDefault();

  element.addEventListener("click", onClick);
  element.addEventListener("mousedown", onMouseDown);

  return {
    element,
    destroy: () => {
      clearTimeout(timer);
      element.removeEventListener("click", onClick);
      element.removeEventListener("mousedown", onMouseDown);
    },
  };
}
