// The only import path components have into color-preview-store.ts. See
// CLAUDE.md's layer order — components never import stores directly.
import { useShallow } from "zustand/react/shallow";
import { useColorPreviewStore } from "../state/color-preview-store";

/**
 * The colour this thing is about to become, or null.
 *
 * Selected down to one answer per caller on purpose: a preview changes on
 * every pointer move inside the colour dialog, and the whole point of it
 * living outside the project store is that only the thing being recoloured
 * re-renders while that happens.
 */
export function useColorPreview(targetId: string): string | null {
  return useColorPreviewStore((state) => (state.targetId === targetId ? state.color : null));
}

export function useColorPreviewActions() {
  return useColorPreviewStore(
    useShallow((state) => ({ preview: state.preview, clear: state.clear })),
  );
}
