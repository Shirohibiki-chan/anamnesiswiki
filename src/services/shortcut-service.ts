// Turns a stored Binding into the two things the app needs from it: does this
// keypress match, and what does it read as on this keyboard. Kept out of the
// listener hook so both halves are testable without a DOM — the matching rules
// are where an off-by-one modifier hides, and they're impossible to eyeball
// inside an event handler.
import {
  DEFAULT_BINDINGS,
  EDITOR_RESERVED_BINDINGS,
  SHORTCUT_ACTIONS,
  SHORTCUT_LABELS,
  SYSTEM_RESERVED_BINDINGS,
  type Binding,
  type ShortcutAction,
} from "../constants/shortcuts";

/**
 * True on macOS, where the modifier is Cmd rather than Ctrl and the symbols
 * differ. Read from the browser rather than passed in, so callers don't each
 * have to answer it; `formatBinding` still takes it as an argument so the
 * tests can render both platforms.
 */
export function isMacPlatform(): boolean {
  return navigator.platform.toLowerCase().includes("mac");
}

// `event.key` gives "K" when Shift is held and "k" when it isn't, so a binding
// stored as "k" would stop matching the moment a Shift-bearing combination was
// assigned to it. Length-1 is the test rather than a letter check because it
// has to leave "F2", "Enter" and "ArrowDown" alone.
export function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

/**
 * Exact match, not a subset match: a binding without Shift does *not* fire on
 * a Shift-bearing keypress. Without that, Ctrl+Shift+K would open search on
 * its way to whatever it was actually meant to do.
 *
 * Ctrl and Cmd are both accepted for `mod` regardless of platform. That means
 * Ctrl+K works on a Mac too, which is wrong-ish and harmless — the alternative
 * is storing a different binding per platform for no gain.
 */
export function matchesBinding(event: KeyboardEvent, binding: Binding): boolean {
  const mod = event.metaKey || event.ctrlKey;
  if (mod !== Boolean(binding.mod)) return false;
  if (event.shiftKey !== Boolean(binding.shift)) return false;
  if (event.altKey !== Boolean(binding.alt)) return false;
  return normalizeKey(event.key) === normalizeKey(binding.key);
}

// Names for keys whose `event.key` is unreadable or invisible on a button.
const KEY_LABELS: Record<string, string> = {
  " ": "Space",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Escape: "Esc",
  Enter: "Enter",
  Backspace: "Backspace",
  Delete: "Delete",
  Tab: "Tab",
};

export function formatKey(key: string): string {
  return KEY_LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key);
}

/**
 * The label the user sees: "⌘K" on a Mac, "Ctrl+K" elsewhere. Mac stacks bare
 * symbols with no separator the way the platform does; everywhere else joins
 * with "+". Modifier order is fixed (mod, alt, shift) so the same binding
 * always renders the same way.
 */
export function formatBinding(binding: Binding, isMac: boolean): string {
  const parts: string[] = [];
  if (binding.mod) parts.push(isMac ? "⌘" : "Ctrl");
  if (binding.alt) parts.push(isMac ? "⌥" : "Alt");
  if (binding.shift) parts.push(isMac ? "⇧" : "Shift");
  parts.push(formatKey(binding.key));
  return parts.join(isMac ? "" : "+");
}

export function bindingsEqual(a: Binding, b: Binding): boolean {
  return (
    normalizeKey(a.key) === normalizeKey(b.key) &&
    Boolean(a.mod) === Boolean(b.mod) &&
    Boolean(a.shift) === Boolean(b.shift) &&
    Boolean(a.alt) === Boolean(b.alt)
  );
}

// ─── Recording ──────────────────────────────────────────────────────────────

const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta", "CapsLock", "OS"]);

/**
 * The binding a keypress describes, or null while the user is still only
 * holding modifiers down. Holding Ctrl before reaching for the letter is how
 * people actually type a chord, so those frames have to be ignored rather than
 * recorded as "Ctrl".
 */
export function bindingFromEvent(event: KeyboardEvent): Binding | null {
  if (MODIFIER_KEYS.has(event.key)) return null;
  const binding: Binding = { key: normalizeKey(event.key) };
  if (event.metaKey || event.ctrlKey) binding.mod = true;
  if (event.shiftKey) binding.shift = true;
  if (event.altKey) binding.alt = true;
  return binding;
}

// ─── Validation ─────────────────────────────────────────────────────────────

const FUNCTION_KEY = /^F([1-9]|1[0-2])$/;

export function isFunctionKey(key: string): boolean {
  return FUNCTION_KEY.test(key);
}

export type BindingProblem = {
  reason: "needsModifier" | "reservedByEditor" | "reservedBySystem" | "alreadyTaken";
  /** Plain-language, shown to the user as-is. */
  message: string;
};

/**
 * Why this binding can't be used, or null if it can.
 *
 * The first rule is the accessibility decision worth understanding before
 * changing it. A bare letter can't work: Anamnesis is mostly a text editor, so
 * binding `k` would fire every time the user typed the letter. But requiring a
 * two-key chord is exactly what's hard for the people this screen exists for.
 * Function keys resolve it — they don't collide with typing, so they're
 * allowed alone, and they're the one-key option for anyone who needs one.
 * Don't tighten this to "modifier always required" without replacing that
 * escape hatch with another one.
 *
 * `current` is every action's binding as it stands now, so a collision can
 * name the action holding the key rather than just refusing.
 */
export function checkBinding(
  binding: Binding,
  action: ShortcutAction,
  current: Record<ShortcutAction, Binding>,
): BindingProblem | null {
  const shapeProblem = checkBindingShape(binding);
  if (shapeProblem) return shapeProblem;

  const clash = SHORTCUT_ACTIONS.find((other) => other !== action && bindingsEqual(current[other], binding));
  if (clash) {
    return { reason: "alreadyTaken", message: `Already used by "${SHORTCUT_LABELS[clash]}".` };
  }

  return null;
}

/**
 * The half of `checkBinding` that depends only on the binding itself — is it
 * usable at all, and is it something else's. Split out because stored
 * overrides are checked against this and *not* against collisions: swapping
 * two actions' keys is a legitimate thing to have in the file, and checking
 * each override against the defaults would throw the swap away as a clash with
 * the key it was swapped out of.
 */
export function checkBindingShape(binding: Binding): BindingProblem | null {
  if (!binding.mod && !isFunctionKey(binding.key)) {
    return {
      reason: "needsModifier",
      message: "Needs Ctrl or Cmd held down — otherwise it would fire while you're typing. A function key (F1–F12) on its own is fine.",
    };
  }

  // Headings are registered as `Mod-Alt-${level}` from a configurable list, so
  // there's no fixed set of them to name — the whole space is off limits.
  if (binding.mod && binding.alt) {
    return {
      reason: "reservedByEditor",
      message: "The editor uses every Ctrl+Alt combination for headings and callouts.",
    };
  }

  if (EDITOR_RESERVED_BINDINGS.some((reserved) => bindingsEqual(reserved, binding))) {
    return { reason: "reservedByEditor", message: "The editor already uses this while you're writing." };
  }

  if (SYSTEM_RESERVED_BINDINGS.some((reserved) => bindingsEqual(reserved, binding))) {
    return { reason: "reservedBySystem", message: "This is a system shortcut — taking it would break it everywhere in the app." };
  }

  return null;
}

// ─── Stored overrides ───────────────────────────────────────────────────────

function isBinding(value: unknown): value is Binding {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.key !== "string" || candidate.key.length === 0) return false;
  return (["mod", "shift", "alt"] as const).every(
    (flag) => candidate[flag] === undefined || typeof candidate[flag] === "boolean",
  );
}

/**
 * Whatever came back out of app-settings.json, reduced to bindings we'd accept
 * today. It's a plain JSON file the user can edit, it outlives any given
 * version of the app, and a binding that was legal when it was written may not
 * be — a key the editor claimed since, or an action that no longer exists.
 * Anything that doesn't survive this is dropped, which falls back to the
 * default rather than leaving a shortcut that can't fire.
 */
export function parseOverrides(raw: unknown): Partial<Record<ShortcutAction, Binding>> {
  if (typeof raw !== "object" || raw === null) return {};
  const source = raw as Record<string, unknown>;
  const parsed: Partial<Record<ShortcutAction, Binding>> = {};

  // Shape only — see checkBindingShape for why collisions aren't checked here.
  // Two overrides that genuinely land on the same key can only come from a
  // hand-edited file, and the listener's fixed action order settles it.
  for (const action of SHORTCUT_ACTIONS) {
    const value = source[action];
    if (!isBinding(value)) continue;
    if (checkBindingShape(value)) continue;
    parsed[action] = value;
  }
  return parsed;
}

export function mergeBindings(overrides: Partial<Record<ShortcutAction, Binding>>): Record<ShortcutAction, Binding> {
  return { ...DEFAULT_BINDINGS, ...overrides };
}
