// An icon with its word underneath: the shape every standing button in the
// app's left edge uses.
//
// **Its own file, and the class is not named for the rail**, because the shape
// has already been shared once: the sidebar's footer used it while home, back
// and forward carried words, and dropped it when they went icon-only
// (2026-09-05). The next thing wanting an icon over a word should take this
// rather than grow a second copy in its own stylesheet.
//
// **Every button says its own word, and the first version of this rail did not.**
// It shipped icon-only at 48px wide with the name reachable only by hovering for
// a tooltip, and the user could not tell what any of them were (2026-09-05). A
// word that does not fit wraps rather than truncating: `Switch project` is two
// lines at this width and that is the intended outcome, since a rail whose
// labels trail off is a rail you have to hover to read again.
import type { LucideIcon } from "lucide-react";

type RailButtonProps = {
  label: string;
  /** The tooltip, when there is more to say than the word underneath — the
      keyboard shortcut, usually. Defaults to the label.

      **It is not the accessible name.** That is the label, which is also the
      text on screen, and the two matching is the point: a button reading
      `Back (Alt+Left)` to a screen reader while saying `Back` on screen is a
      control with two names. It also broke `goBack` in the harness, which asks
      for a button named exactly Back. */
  title?: string;
  Icon: LucideIcon;
  pressed?: boolean;
  /** Dimmed and inert rather than removed. A control that vanishes when it has
      nothing to do moves the ones beside it, so the button under the pointer
      changes identity between clicks — and a greyed-out Back is what says the
      feature exists before you have been anywhere. */
  disabled?: boolean;
  onClick: () => void;
};

export function RailButton({ label, title, Icon, pressed, disabled, onClick }: RailButtonProps) {
  return (
    <button
      type="button"
      className="icon-word-btn"
      // `.icon-word-btn` takes its accent from aria-pressed, so the selected
      // look is not a class this has to remember to pass.
      aria-pressed={pressed}
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}
