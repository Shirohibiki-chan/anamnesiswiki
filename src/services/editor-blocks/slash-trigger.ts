// When a typed `/` is a command and when it is a slash.
//
// **BlockNote opens the menu for any `/` at all**, measured 2026-08-28: typing
// one straight after a full stop, or in the middle of `and/or`, popped the
// command list over her writing. Her call the same day — that is not behaviour
// worth keeping, and a slash only means a command **at the start of a line**.
//
// The editor has a hook for exactly this: `shouldOpen` on the suggestion menu's
// options, wired up in `page/Editor.tsx`. Nothing here forks or patches
// anything, which is what `CLAUDE.md` requires of BlockNote work.
/**
 * The part of a ProseMirror transaction this needs.
 *
 * Structural rather than imported: `prosemirror-state` is BlockNote's
 * dependency and not ours, and adding a direct one to name a single parameter
 * would put a second copy of ProseMirror's types in our tree for nothing. A real
 * `Transaction` satisfies this, which is all the call site needs.
 */
export type TriggerTransaction = {
  selection: { empty: boolean; from: number; $from: { parentOffset: number } };
  doc: { textBetween: (from: number, to: number) => string };
};

/**
 * Whether a `/` just typed should open the command menu.
 *
 * **Both readings of "before" are accepted, on purpose.** The hook is handed
 * the transaction carrying the keystroke, and whether the `/` is already in the
 * document by the time this runs is an implementation detail of a library we do
 * not control. So a line whose text before the caret is either `"/"` (the slash
 * has landed) or `""` (it has not yet) is the same situation — the caret is at
 * the start of its block — and anything else is prose.
 *
 * That is why this is a *whole-prefix* comparison rather than a look at the one
 * character before the caret: `"and/"` and `"scale."` both have to be false,
 * and only an empty line can be true.
 */
export function slashOpensCommandMenu(tr: TriggerTransaction): boolean {
  const { selection } = tr;
  // A selection rather than a caret means she is replacing text, which is not a
  // command being typed.
  if (!selection.empty) return false;

  const blockStart = selection.from - selection.$from.parentOffset;
  const before = tr.doc.textBetween(blockStart, selection.from);
  return before === "" || before === "/";
}
