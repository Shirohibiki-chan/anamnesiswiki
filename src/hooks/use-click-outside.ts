// Closes a popover (color picker, context menu, template picker) when the
// user clicks or taps outside it.
import { useEffect, type RefObject } from "react";

export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) {
        onOutside();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [ref, onOutside, enabled]);
}
