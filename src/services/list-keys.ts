// Which way a keypress moves through a list of suggestions. One answer shared
// by every list in the app that you drive from a text field without leaving it
// — the quick switcher, the settings search, and the editor's slash, @ and
// wikilink menus — because a key that works in three of the four is worse than
// one that works nowhere: you stop trusting it and go back to the arrows.

export type ListStep = "next" | "previous";

/**
 * `Ctrl-N` / `Ctrl-P` alongside the arrow keys.
 *
 * These are the Emacs readline bindings, which macOS honours system-wide in
 * every text field. They're here for the same reason Obsidian added them in
 * 1.13: on a laptop the arrow keys are a reach off the home row, and a
 * suggestion list is exactly where you're already typing.
 *
 * **Control only, never Command.** On macOS `Cmd-N` is new-window, and this app
 * binds it to a new page; the Emacs convention has always been Control there
 * too, so honouring Command would take a key people use for something else and
 * gain nothing. `Alt` is excluded for the same kind of reason — `Alt`+arrow is
 * bound to back/forward, and it has to keep meaning that.
 */
export function listStepForKey(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}): ListStep | null {
  if (event.altKey) return null;
  if (!event.ctrlKey && !event.metaKey) {
    if (event.key === "ArrowDown") return "next";
    if (event.key === "ArrowUp") return "previous";
    return null;
  }
  if (event.metaKey || !event.ctrlKey) return null;
  const key = event.key.toLowerCase();
  if (key === "n") return "next";
  if (key === "p") return "previous";
  return null;
}

/** Where `step` lands from `from` in a list of `length`, wrapping at both ends. */
export function stepIndex(from: number, step: ListStep, length: number): number {
  if (length === 0) return 0;
  const delta = step === "next" ? 1 : -1;
  return (from + delta + length) % length;
}
