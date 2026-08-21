// Portals popover content (color picker, template picker, context menu) to
// document.body with fixed positioning computed from the trigger's
// bounding rect. Necessary because every react-arborist row is its own
// position:absolute stacking context inside the virtualized list — a
// position:absolute popover nested inside one row can't paint above a
// neighboring row no matter what z-index it's given, since z-index only
// resolves within a shared stacking context.
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useClickOutside } from "../../hooks/use-click-outside";

const POPOVER_MARGIN = 4;
const VIEWPORT_MARGIN = 8;

type TreePopoverProps = {
  anchorRect: DOMRect;
  onClose: () => void;
  className?: string;
  children: ReactNode;
};

// Everything inside a popover that the keyboard can land on. `:not([disabled])`
// matters for the block menu, whose Move up / Move down are disabled at the
// ends of the list — arrowing onto a dead item reads as the keys not working.
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function TreePopover({ anchorRect, onClose, className, children }: TreePopoverProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  useClickOutside(ref, onClose, true);
  // Whatever opened the popover, so closing can hand focus back rather than
  // dropping it at the top of the document.
  const opener = useRef<HTMLElement | null>(typeof document === "undefined" ? null : (document.activeElement as HTMLElement));

  const itemsIn = useCallback(
    () => Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
    [],
  );


  // Focus is returned on unmount rather than in the close handler, so it
  // happens however the popover closed — Escape, a click outside, or picking
  // something.
  useEffect(() => {
    const returnTo = opener.current;
    const el = ref.current;
    return () => {
      // **Only when the popover still had focus.** Closing by clicking
      // something else already moved focus to that thing, and yanking it back
      // to the trigger would take it straight off whatever she just clicked.
      // `body` counts as ours: that is where focus lands when the focused item
      // is removed from the document.
      const now = document.activeElement;
      if (now && now !== document.body && !el?.contains(now)) return;
      returnTo?.focus?.({ preventScroll: true });
    };
  }, []);

  // **A native listener, not React's `onKeyDown`.** The popover is portaled to
  // `document.body`, which is *outside* the React root container — and React
  // delegates events at that root, so a real keystroke inside the popover
  // bubbles body → html → document and never passes through React's listener.
  // The handler simply never ran. It looked like it worked because the first
  // check dispatched synthetic events straight at this element; a real Tab
  // walked out of the menu the whole time. Measured 2026-08-21.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      const items = itemsIn();
      if (items.length === 0) return;
      const at = items.indexOf(document.activeElement as HTMLElement);

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        const next = at === -1 ? 0 : (at + step + items.length) % items.length;
        items[next].focus({ preventScroll: true });
        return;
      }

      // Tab wraps rather than escaping into the page behind. Leaving a menu by
      // tabbing past its last item drops focus somewhere invisible, since the
      // popover is drawn away from whatever opened it.
      if (event.key === "Tab") {
        const last = items.length - 1;
        if (!event.shiftKey && (at === last || at === -1)) {
          event.preventDefault();
          items[0].focus({ preventScroll: true });
        } else if (event.shiftKey && at <= 0) {
          event.preventDefault();
          items[last].focus({ preventScroll: true });
        }
      }
    }

    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [itemsIn, onClose]);

  // Popover content varies in size (color grid vs. template grid vs. context
  // menu), so its footprint isn't known until it's actually in the DOM.
  // Render once invisibly to measure it, then clamp/flip against the
  // viewport so it can't open off the bottom or side of the window — e.g. a
  // template picker opened from a row near the bottom of a tall tree used to
  // push its last grid row (Species/Note) below the visible window entirely.
  const [style, setStyle] = useState<CSSProperties>({
    position: "fixed",
    top: anchorRect.bottom + POPOVER_MARGIN,
    left: anchorRect.right,
    transform: "translateX(-100%)",
    visibility: "hidden",
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    let left = anchorRect.right - rect.width;
    if (left < VIEWPORT_MARGIN) left = anchorRect.left;
    left = Math.min(Math.max(left, VIEWPORT_MARGIN), window.innerWidth - rect.width - VIEWPORT_MARGIN);

    let top = anchorRect.bottom + POPOVER_MARGIN;
    if (top + rect.height > window.innerHeight - VIEWPORT_MARGIN) {
      top = anchorRect.top - rect.height - POPOVER_MARGIN;
    }
    top = Math.min(Math.max(top, VIEWPORT_MARGIN), window.innerHeight - rect.height - VIEWPORT_MARGIN);

    setStyle({ position: "fixed", top, left, visibility: "visible" });
  }, [anchorRect]);

  // A popover portals to the end of <body>, so Tab from the trigger walks the
  // rest of the *page* and never enters the menu — which is what made these
  // unreachable from the keyboard. Moving focus in on open is what fixes that,
  // and it has to happen after the measuring pass below makes it visible.
  //
  // Only when nothing inside has claimed focus already: several popovers open
  // on an `autoFocus` search box, and stealing it back to the first button
  // would undo the more useful thing.
  const hasFocused = useRef(false);
  useEffect(() => {
    const el = ref.current;
    // **Not until it is visible.** The measuring pass below renders the
    // popover `visibility: hidden` for one frame, and focusing a hidden
    // element is silently a no-op — which is exactly how this looked fixed
    // while doing nothing. Measured 2026-08-21.
    if (!el || hasFocused.current || style.visibility === "hidden") return;
    hasFocused.current = true;
    if (el.contains(document.activeElement)) return;
    (itemsIn()[0] ?? el).focus({ preventScroll: true });
  }, [itemsIn, style]);

  return createPortal(
    <div
      ref={ref}
      className={`tree-popover${className ? ` ${className}` : ""}`}
      style={style}
      tabIndex={-1}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}
