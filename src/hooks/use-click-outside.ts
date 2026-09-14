// Closes a popover (color picker, context menu, template picker) when the
// user clicks or taps outside it.
import { useEffect, type RefObject } from "react";

export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as globalThis.Node;
      if (!ref.current || ref.current.contains(target)) return;
      // A press on the control that opened this is that control's own toggle,
      // not a click outside. Without this the press closed the menu here and
      // the click that followed reopened it, so the button could never close
      // what it had opened — her report 2026-09-14, on the graph's Filter and
      // Display menus, and the database's menus were the same. The control
      // says so with aria-haspopup and aria-expanded together — expanded alone
      // is also a tree row or a folded section, and a press on those should
      // still close a menu.
      if (target instanceof Element && target.closest('[aria-haspopup][aria-expanded="true"]')) return;
      onOutside();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [ref, onOutside, enabled]);
}
