// Turns a stored Binding into the two things the app needs from it: does this
// keypress match, and what does it read as on this keyboard. Kept out of the
// listener hook so both halves are testable without a DOM — the matching rules
// are where an off-by-one modifier hides, and they're impossible to eyeball
// inside an event handler.
import type { Binding } from "../constants/shortcuts";

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
