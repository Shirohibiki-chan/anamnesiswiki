// The only import path components have into shortcut-service.ts. See
// CLAUDE.md's layer order — components never import services directly.
import { DEFAULT_BINDINGS, type ShortcutAction } from "../constants/shortcuts";
import { formatBinding, isMacPlatform } from "../services/shortcut-service";

/**
 * How a shortcut should be written on a button or a menu row — "⌘K" on a Mac,
 * "Ctrl+K" everywhere else. Every place that advertises a shortcut goes
 * through here, so a rebound key updates its own label rather than leaving a
 * hardcoded string behind saying something else.
 */
export function useShortcutLabel(action: ShortcutAction): string {
  return formatBinding(DEFAULT_BINDINGS[action], isMacPlatform());
}
