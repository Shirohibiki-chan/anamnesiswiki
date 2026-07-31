// App-level keyboard shortcuts. Held here rather than at the listener so the
// set is readable in one place — and so nothing claims a combination the
// editor already owns. EDITOR_RESERVED_BINDINGS below is that list, verified
// against the installed BlockNote; anything added here must stay clear of it,
// or be declared editor-scoped and stand down while the caret is in text.
//
// A binding is stored as the modifiers plus `event.key`, not as a display
// string, so matching an incoming event is a field comparison rather than
// parsing "Ctrl+K" back apart on every keystroke. Rendering runs the other way
// — see services/shortcut-service.ts.

export type Binding = {
  /** `event.key`, lowercased for single characters. "k", "n", "F2", "Enter". */
  key: string;
  /** Cmd on macOS, Ctrl everywhere else. Matched at the event, not stored per platform. */
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
};

// Order matters: the listener walks this list and stops at the first match, so
// this is the tie-break if two actions ever end up on the same combination.
// Matching is exact — Ctrl+Shift+K is not Ctrl+K — so nothing today overlaps.
export const SHORTCUT_ACTIONS = ["search", "newPage", "save", "undo", "redo"] as const;

export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number];

export const SHORTCUT_LABELS: Record<ShortcutAction, string> = {
  search: "Search",
  newPage: "New page",
  save: "Save now",
  undo: "Undo (sidebar)",
  redo: "Redo (sidebar)",
};

export const DEFAULT_BINDINGS: Record<ShortcutAction, Binding> = {
  search: { key: "k", mod: true },
  newPage: { key: "n", mod: true },
  save: { key: "s", mod: true },
  undo: { key: "z", mod: true },
  redo: { key: "y", mod: true },
};

// Actions that stand down while the caret is in text — the editor, a rename
// box, any input. They are allowed to sit on combinations the editor owns,
// because the two never both want the keypress: Ctrl+Z inside a page is the
// editor's undo, and Ctrl+Z anywhere else is the app's.
//
// This is the only exception to EDITOR_RESERVED_BINDINGS below, and it is a
// narrow one. It works because these two actions mean the *same thing* as the
// editor's — an action that meant something different couldn't share the key
// without the user having to know which half of the window had focus.
export const EDITOR_SCOPED_ACTIONS: ReadonlySet<ShortcutAction> = new Set<ShortcutAction>(["undo", "redo"]);

// Combinations a custom binding may not take, because something else already
// answers them and the app would be stealing the keypress.
//
// Verified against the installed @blocknote/core rather than assumed — the
// list below is what a grep for `Mod-*` in its dist actually returns. Every
// Mod-Alt combination is off limits as a rule rather than by enumeration:
// headings register as `Mod-Alt-${level}` from a configured list of levels, so
// there is no fixed set to name.
export const EDITOR_RESERVED_BINDINGS: Binding[] = [
  { key: "z", mod: true }, // undo
  { key: "y", mod: true }, // redo
  // Not bound by the installed version, but it's the Mac redo convention, so
  // an app action landing here would surprise anyone who reaches for it.
  { key: "z", mod: true, shift: true },
  { key: "6", mod: true, shift: true },
  { key: "7", mod: true, shift: true },
  { key: "8", mod: true, shift: true },
  { key: "9", mod: true, shift: true },
  { key: "Enter", mod: true },
  { key: "ArrowUp", mod: true },
  { key: "ArrowDown", mod: true },
];

// Not the editor's, but not ours to take either — the OS and the webview
// answer these, and rebinding one costs the user copy or paste inside every
// text box in the app.
export const SYSTEM_RESERVED_BINDINGS: Binding[] = [
  { key: "a", mod: true },
  { key: "c", mod: true },
  { key: "v", mod: true },
  { key: "x", mod: true },
];
