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
export const SHORTCUT_ACTIONS = [
  "search",
  "allProperties",
  "newPage",
  "save",
  "undo",
  "redo",
  "navigateBack",
  "navigateForward",
  "navigateHome",
] as const;

export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number];

export const SHORTCUT_LABELS: Record<ShortcutAction, string> = {
  search: "Search",
  allProperties: "All properties & tags",
  newPage: "New page",
  save: "Save now",
  undo: "Undo (sidebar)",
  redo: "Redo (sidebar)",
  navigateBack: "Back",
  navigateForward: "Forward",
  navigateHome: "Project home",
};

export const DEFAULT_BINDINGS: Record<ShortcutAction, Binding> = {
  search: { key: "k", mod: true },
  // Next door to search on purpose — it's the other way of finding your way
  // around a project by something other than the tree. Matching is exact, so
  // this and Ctrl+K never collide.
  allProperties: { key: "k", mod: true, shift: true },
  newPage: { key: "n", mod: true },
  save: { key: "s", mod: true },
  undo: { key: "z", mod: true },
  redo: { key: "y", mod: true },
  // The convention every browser and file manager on Windows and Linux uses,
  // which is the one someone reaches for without being told. Alt with a *named*
  // key can't be typed as a character, which is why these are allowed to skip
  // the Ctrl/Cmd requirement — see checkBindingShape.
  //
  // **Known cost on macOS:** Option+← / Option+→ are move-by-word inside a text
  // field there, so these take a keypress the OS gives to the caret. The user
  // this app is built for is on Windows, and the answer for a Mac user is to
  // rebind — the alternative is per-platform defaults, which nothing else in
  // this file has and which would be a shape change for one action.
  navigateBack: { key: "ArrowLeft", alt: true },
  navigateForward: { key: "ArrowRight", alt: true },
  navigateHome: { key: "Home", alt: true },
};

/**
 * The keys that are not rebindable, and what each one does.
 *
 * Fixed because each belongs to something other than the app's own shortcut
 * table: three are the window's (`use-shell-keys.ts`, plus the shell's own
 * devtools binding) and the fourth opens the list of all the others, which is
 * the one key somebody has to be able to find without already knowing where
 * the keys are written down.
 *
 * `mod` means the row renders with Ctrl or Cmd in front of it, the same way a
 * binding does. **Settings → Keyboard names these in prose as well** — it is
 * the screen somebody lands on wanting to change one, and "you can't" has to
 * be said there rather than only here. Keep the two in step.
 */
export type FixedKey = {
  /** As typed, without the modifier — "R", "F11", "?". */
  key: string;
  /** Whether Ctrl/Cmd is held with it. */
  mod?: boolean;
  what: string;
};

export const FIXED_KEYS: readonly FixedKey[] = [
  { key: "R", mod: true, what: "Reload the window" },
  { key: "F11", what: "Fullscreen" },
  { key: "F12", what: "Developer tools" },
  { key: "?", what: "This list of shortcuts" },
];

/**
 * What opens the list. Two keys rather than one, and neither is rebindable.
 *
 * `?` is the convention every app with a cheat sheet uses, and it is the one
 * this was asked for by name. It cannot be a rebindable binding: those must
 * carry Ctrl or be a function key (`checkBindingShape`), because a bare letter
 * fires while you type — `?` gets to break that rule only because the listener
 * stands down whenever the caret is in text, which a rebindable key set from a
 * settings screen could not be trusted to do.
 *
 * `F1` is the same idea from the other direction: it is what a Windows user
 * presses for help without being told, and it works while typing, which is
 * exactly when somebody is most likely to want it.
 */
export const SHEET_KEYS = { question: "?", function: "F1" } as const;

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
