// App-level keyboard shortcuts. Held here rather than at the listener so the
// set is readable in one place — and so nothing claims a combination the
// editor already owns. BlockNote binds Mod-z, Mod-y, Mod-Alt-* and Mod-Shift-*
// for its own formatting and history; anything added below must stay clear of
// those or it will fight the editor for the keypress.
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
export const SHORTCUT_ACTIONS = ["search", "newPage", "save"] as const;

export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number];

export const SHORTCUT_LABELS: Record<ShortcutAction, string> = {
  search: "Search",
  newPage: "New page",
  save: "Save now",
};

export const DEFAULT_BINDINGS: Record<ShortcutAction, Binding> = {
  search: { key: "k", mod: true },
  newPage: { key: "n", mod: true },
  save: { key: "s", mod: true },
};
