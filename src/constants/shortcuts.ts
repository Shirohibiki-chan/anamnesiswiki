// App-level keyboard shortcuts. Held here rather than at the listener so the
// set is readable in one place — and so nothing claims a combination the
// editor already owns. BlockNote binds Mod-z, Mod-y, Mod-Alt-* and Mod-Shift-*
// for its own formatting and history; anything added below must stay clear of
// those or it will fight the editor for the keypress.
//
// "Mod" is Cmd on macOS and Ctrl everywhere else, matched at the event rather
// than stored per platform — see use-global-shortcuts.ts.
export const SHORTCUT_KEYS = {
  /** Open project-wide search. */
  search: "k",
} as const;
