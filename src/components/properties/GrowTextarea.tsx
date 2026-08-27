// A textarea that is exactly as tall as what is written in it.
//
// **Every multi-line field in the app should be one of these.** A fixed
// `rows={3}` box has two failure modes and a page hits both: fewer lines than
// that and it reserves empty space, more and it clips the text behind a
// scrollbar inside a panel that is already scrollable. The second is what a
// sidebar note looks like when it goes past three lines, and it reads as
// broken — a scrollbar inside a box inside a column is not a place anybody
// expects to have to drag.
//
// Lives here rather than in `blocks/` because `.property-value-textarea` does:
// this is the behaviour that class always wanted, and the meter ends, the
// sidebar's text blocks and the properties panel's multi-line fields are all
// the same problem.
import { useCallback, useEffect, useLayoutEffect, useRef, type ComponentPropsWithoutRef } from "react";

/**
 * Whether this engine can size a field to its own text.
 *
 * **It is not a given, and the app has a user on the engine that can't.**
 * `field-sizing` reached Chromium in early 2024 and WebKitGTK — what Linux
 * gives a Tauri app — only in 2.52, March 2026. One of the two Fedora machines
 * this runs on is older than that. Without it a `rows={1}` textarea with
 * `overflow: hidden` draws one line and silently clips the rest, which is worse
 * than the ellipsis the wrapping fields replaced: at least an ellipsis admits
 * something is missing.
 *
 * Read once at module load. It's a capability of the engine, not of the moment.
 */
const SIZES_ITSELF = typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");

/**
 * A textarea that grows to fit its text, by hand where the engine won't do it.
 *
 * Does nothing at all where `field-sizing: content` works — no measuring, no
 * layout effect firing on every keystroke. The fallback path sets the height
 * from `scrollHeight`, plus whatever the borders take, and re-measures when the
 * field's own width changes: the sidebar is resizable, and a narrower panel
 * wraps the same words onto more lines.
 */
export function GrowTextarea({
  value,
  ...rest
}: { value: string } & Omit<ComponentPropsWithoutRef<"textarea">, "value" | "rows" | "ref">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const lastWidth = useRef(0);

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Collapse first, or a field that just lost a line keeps the taller height:
    // scrollHeight can only report what the box is already big enough to hold.
    el.style.height = "auto";
    // `clientHeight` leaves the borders out and `scrollHeight` measures the same
    // box, so the difference is what the borders take. Adding it back matters
    // because the field is `border-box`: without it every field loses two
    // pixels, and a two-line one starts scrolling.
    el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`;
    lastWidth.current = el.clientWidth;
  }, []);

  useLayoutEffect(() => {
    if (SIZES_ITSELF) return;
    fit();
  }, [fit, value]);

  useEffect(() => {
    if (SIZES_ITSELF) return;
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // **Width only.** This observer watches the very element whose height it
    // changes, so reacting to every resize would set a height, observe the
    // height it just set, and go round again. A narrower sidebar wraps the same
    // words onto more lines, which is the case worth re-measuring for; a height
    // change is this function's own footprint.
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== lastWidth.current) fit();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit]);

  return <textarea {...rest} ref={ref} rows={1} value={value} />;
}
