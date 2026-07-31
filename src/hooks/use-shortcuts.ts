// The only import path components have into shortcut-service.ts and
// shortcut-store.ts. See CLAUDE.md's layer order — components never import
// services or stores directly.
import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { DEFAULT_BINDINGS, SHORTCUT_ACTIONS, SHORTCUT_LABELS, type Binding, type ShortcutAction } from "../constants/shortcuts";
import { useShortcutStore } from "../state/shortcut-store";
import {
  bindingFromEvent,
  bindingsEqual,
  checkBinding,
  formatBinding,
  isMacPlatform,
  type BindingProblem,
} from "../services/shortcut-service";

/**
 * How a shortcut should be written on a button or a menu row — "⌘K" on a Mac,
 * "Ctrl+K" everywhere else. Every place that advertises a shortcut goes
 * through here, so a rebound key updates its own label rather than leaving a
 * hardcoded string behind saying something else.
 */
export function useShortcutLabel(action: ShortcutAction): string {
  return useShortcutStore((state) => formatBinding(state.bindings[action], isMacPlatform()));
}

/** Reads the saved shortcuts at startup. See StartupRouter. */
export function useLoadShortcuts(): () => Promise<void> {
  return useShortcutStore((state) => state.loadBindings);
}

export type ShortcutRow = {
  action: ShortcutAction;
  label: string;
  binding: Binding;
  /** Rendered form of `binding`, for display. */
  keys: string;
  /** False once the user has changed it — drives whether Reset is offered. */
  isDefault: boolean;
};

export type ShortcutSettings = {
  rows: ShortcutRow[];
  hasAnyOverride: boolean;
  /** "Cmd" or "Ctrl", for prose that has to name the modifier. */
  modifierName: string;
  /** The binding a keypress describes, or null while only modifiers are held. */
  readBinding: (event: KeyboardEvent) => Binding | null;
  /** Why this binding can't be used for this action, or null if it can. */
  checkBinding: (action: ShortcutAction, binding: Binding) => BindingProblem | null;
  formatBinding: (binding: Binding) => string;
  setBinding: (action: ShortcutAction, binding: Binding) => Promise<void>;
  resetBinding: (action: ShortcutAction) => Promise<void>;
  resetAll: () => Promise<void>;
  /** Suspends the global listener while the settings screen is capturing keys. */
  setRecording: (isRecording: boolean) => void;
};

export function useShortcutSettings(): ShortcutSettings {
  const bindings = useShortcutStore(useShallow((state) => state.bindings));
  const { setBinding, resetBinding, resetAllBindings, setRecording } = useShortcutStore(
    useShallow((state) => ({
      setBinding: state.setBinding,
      resetBinding: state.resetBinding,
      resetAllBindings: state.resetAllBindings,
      setRecording: state.setRecording,
    })),
  );

  const isMac = isMacPlatform();

  const rows: ShortcutRow[] = useMemo(
    () =>
      SHORTCUT_ACTIONS.map((action) => ({
        action,
        label: SHORTCUT_LABELS[action],
        binding: bindings[action],
        keys: formatBinding(bindings[action], isMac),
        isDefault: bindingsEqual(bindings[action], DEFAULT_BINDINGS[action]),
      })),
    [bindings, isMac],
  );

  // Stable while `bindings` is, so the settings screen's key-capture effect
  // can depend on them without tearing its listener down every render.
  const check = useCallback(
    (action: ShortcutAction, binding: Binding) => checkBinding(binding, action, bindings),
    [bindings],
  );
  const format = useCallback((binding: Binding) => formatBinding(binding, isMac), [isMac]);

  return {
    rows,
    hasAnyOverride: rows.some((row) => !row.isDefault),
    modifierName: isMac ? "Cmd" : "Ctrl",
    readBinding: bindingFromEvent,
    checkBinding: check,
    formatBinding: format,
    setBinding,
    resetBinding,
    resetAll: resetAllBindings,
    setRecording,
  };
}
