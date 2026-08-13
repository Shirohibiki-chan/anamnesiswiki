/**
 * The languages a code block offers, in the order the dropdown lists them.
 *
 * **A deliberate subset.** `@blocknote/code-block` ships 48, which is the right
 * number for a developer's notebook and the wrong number for a worldbuilding
 * wiki — a dropdown holding Haml, GLSL, WGSL and Objective-C is a list nobody
 * reads to the end of. What's here is what this app's writing actually
 * contains, ordered by how often it'll be reached for:
 *
 * - **Plain text is first and is the default**, because the main thing a code
 *   block holds here is a bot prompt, and a prompt has no syntax. Highlighting
 *   is skipped entirely for this one (see `code-block.ts`), which is what makes
 *   `{{char}}` and `**asterisks**` sit there as the literal characters they
 *   have to stay as.
 * - **JSON, JSONC and YAML** are the reason syntax highlighting was worth
 *   adding at all: lorebook entries and character cards travel as JSON, and a
 *   missing brace in a wall of grey is the bug you find an hour later.
 * - **Regular expression** because lorebook triggers are written as one.
 * - **Markdown, XML and HTML** because prompt formats use all three.
 * - **CSS** because this app's own themes are hand-written CSS files, and
 *   pasting one into a page to keep is a real thing she'd do.
 * - The rest are the general-purpose ones that cost nothing to leave in.
 *
 * Adding one back is a line here — the grammars for all 48 are still installed
 * and still lazily loaded, so nothing has to be fetched or bundled differently.
 * **The keys must match `codeBlockOptions.supportedLanguages`** in
 * `@blocknote/code-block`, or the highlighter has no grammar to load and the
 * block silently falls back to unhighlighted text.
 *
 * The keys are also what gets written into a saved page (`props.language`) and
 * into a `.lk` export, so renaming one strands every block already set to it.
 */
/**
 * The aliases are the names other tools write. They're what lets a pasted
 * `<code class="language-js">` land on JavaScript rather than falling back to
 * plain text, and they're why the key and the label aren't enough on their own.
 */
export type CodeLanguage = { name: string; aliases?: string[] };

export const CODE_LANGUAGES: Readonly<Record<string, CodeLanguage>> = {
  text: { name: "Plain text", aliases: ["txt", "plaintext", "plain", "none"] },
  json: { name: "JSON" },
  jsonc: { name: "JSON with comments" },
  yaml: { name: "YAML", aliases: ["yml"] },
  regexp: { name: "Regular expression", aliases: ["regex"] },
  markdown: { name: "Markdown", aliases: ["md"] },
  xml: { name: "XML" },
  html: { name: "HTML" },
  css: { name: "CSS" },
  javascript: { name: "JavaScript", aliases: ["js"] },
  typescript: { name: "TypeScript", aliases: ["ts"] },
  python: { name: "Python", aliases: ["py"] },
  shellscript: { name: "Shell", aliases: ["bash", "sh", "shell", "zsh"] },
  sql: { name: "SQL" },
  lua: { name: "Lua" },
};

/**
 * What a code block is set to when nothing says otherwise — including every
 * block that already exists, since `props.language` didn't used to be written.
 */
export const DEFAULT_CODE_LANGUAGE = "text";

/**
 * A language name from outside (a `.lk` file, a paste) narrowed to one this
 * app can actually highlight.
 *
 * Falls back to plain text rather than dropping the block or keeping a name
 * nothing recognises: an unhighlighted code block is still a code block, and
 * the text inside it — which is the part that matters — is untouched either
 * way. Case-folded because other tools write `JSON` and `Json` as freely as
 * `json`, and aliases are resolved so `yml` and `js` arrive somewhere.
 */
export function normalizeCodeLanguage(language: unknown): string {
  if (typeof language !== "string") return DEFAULT_CODE_LANGUAGE;
  const key = language.trim().toLowerCase();
  if (key in CODE_LANGUAGES) return key;
  for (const [candidate, { aliases }] of Object.entries(CODE_LANGUAGES)) {
    if (aliases?.includes(key)) return candidate;
  }
  return DEFAULT_CODE_LANGUAGE;
}
