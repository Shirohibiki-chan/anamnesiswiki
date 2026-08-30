// The typeface menu in Settings → Fonts and text.
//
// **Why this is not a `<select>` any more.** It was one, and the categories
// inside it were `<optgroup>`s — whose headings the operating system draws, not
// us. With 119 families in one list they were reported as impossible to tell
// apart while scrolling, and there is nothing to be done about that from CSS:
// a native popup is drawn outside the document entirely. It cannot be styled,
// and it cannot even be screenshotted to check. Owning the menu is the only
// way the headings become ours to fix.
//
// Two things had to come with it rather than after it:
//
// - **The search box.** A native select has type-ahead built in, so replacing
//   one without a way to jump to a name would have *removed* a capability
//   while adding polish. At 119 families that is the difference between a
//   picker and a scroll.
// - **Sticky headings.** The complaint was about telling categories apart
//   while moving through the list, which a heading that scrolls away does not
//   answer.
//
// Keyboard, focus return, click-outside, Escape and viewport-flipping all come
// from TreePopover — the same menu machinery the tree and the properties panel
// use. Arrow keys walk the options because they are ordinary buttons and that
// is what it does with buttons; this file only adds the scrolling-into-view
// that its `preventScroll` focus deliberately leaves out.
import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import type { FontSlot } from "../../constants/themes";
import { fontChoicesFor } from "../../hooks/use-theme";
import { TreePopover } from "../tree/TreePopover";

type FontPickerProps = {
  slot: FontSlot;
  /** The family currently named, or "" for none. */
  chosen: string;
  /** What "nothing is asked for here" is called — it names the fallback. */
  emptyLabel: string;
  /**
   * A face the theme file names that isn't one of ours — a hand-written stack,
   * or a font from a theme somebody else made. Offered as itself so the menu
   * isn't sitting on a blank while the page plainly shows something.
   */
  unlisted: string | null;
  onPick: (family: string | null) => void;
};

/** Matches on the family, ignoring case, spaces and punctuation. */
const fold = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

export function FontPicker({ slot, chosen, emptyLabel, unlisted, onPick }: FontPickerProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const needle = fold(query);
    return fontChoicesFor(slot)
      .map((group) => ({ ...group, fonts: needle ? group.fonts.filter((font) => fold(font.family).includes(needle)) : group.fonts }))
      .filter((group) => group.fonts.length > 0);
  }, [slot, query]);

  const found = groups.reduce((total, group) => total + group.fonts.length, 0);

  function open() {
    setQuery("");
    setAnchorRect(triggerRef.current?.getBoundingClientRect() ?? null);
  }

  function choose(family: string | null) {
    onPick(family);
    setAnchorRect(null);
  }

  return (
    <>
      {/* Wears `.appearance-select` so it is the same control it always looked
          like — same height, same border, same focus ring, same gutter. Only
          what happens when it opens is different. */}
      <button
        ref={triggerRef}
        type="button"
        id={`font-${slot.key}`}
        className="appearance-select font-picker-trigger"
        role="combobox"
        aria-expanded={anchorRect !== null}
        aria-haspopup="listbox"
        aria-controls={anchorRect ? `font-menu-${slot.key}` : undefined}
        onClick={() => (anchorRect ? setAnchorRect(null) : open())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !anchorRect) {
            event.preventDefault();
            open();
          }
        }}
      >
        {/* In its own face, like the options — the trigger is the one row of
            this menu that is always on screen. */}
        <span style={chosen ? { fontFamily: `"${chosen}"` } : undefined}>{chosen || emptyLabel}</span>
        <ChevronDown size={14} className="font-picker-chevron" aria-hidden="true" />
      </button>

      {anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={() => setAnchorRect(null)} className="font-picker-menu">
          <div className="font-picker-search">
            <Search size={13} className="font-picker-search-icon" aria-hidden="true" />
            <input
              type="text"
              className="font-picker-search-input"
              value={query}
              autoFocus
              placeholder="Find a typeface"
              aria-label="Find a typeface"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="font-picker-list" id={`font-menu-${slot.key}`} role="listbox" aria-label={slot.label}>
            {/* Outside the groups and above the search's reach: it is not a
                typeface, it is the absence of one, and filtering it out by
                typing three letters would hide the way back. */}
            <Row family={null} label={emptyLabel} selected={!chosen} onChoose={choose} />

            {unlisted && (
              <Group label="In this theme" hint="not one of ours">
                <Row family={unlisted} label={unlisted} selected onChoose={choose} />
              </Group>
            )}

            {groups.map((group) => (
              <Group key={group.cat} label={group.label} hint={group.hint}>
                {group.fonts.map((font) => (
                  <Row key={font.family} family={font.family} label={font.family} selected={font.family === chosen} onChoose={choose} />
                ))}
              </Group>
            ))}

            {found === 0 && <p className="font-picker-empty">No typeface here is called “{query.trim()}”.</p>}
          </div>
        </TreePopover>
      )}
    </>
  );
}

/**
 * `role="group"` rather than a heading element: inside a listbox, a heading is
 * content the pattern has no place for, and a screen reader reads the group's
 * own label before its first option either way. The heading is `aria-hidden`
 * for the same reason — it would otherwise be announced twice.
 */
function Group({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="font-picker-group" role="group" aria-label={`${label} — ${hint}`}>
      <div className="font-picker-group-label" aria-hidden="true">
        {label}
        <span className="font-picker-group-hint">{hint}</span>
      </div>
      {children}
    </div>
  );
}

function Row({
  family,
  label,
  selected,
  onChoose,
}: {
  family: string | null;
  label: string;
  selected: boolean;
  onChoose: (family: string | null) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={`font-picker-row${selected ? " font-picker-row-selected" : ""}`}
      // Each name written in its own face, so the list can be browsed by
      // looking rather than by picking one at a time and undoing.
      style={family ? { fontFamily: `"${family}"` } : undefined}
      // TreePopover focuses with `preventScroll`, which is right for a menu of
      // eight items and wrong for one of 119 — arrowing down would walk the
      // focus off the bottom of a list that never moved. `nearest` keeps the
      // sticky heading in place rather than jumping the row to the middle.
      onFocus={(event) => event.currentTarget.scrollIntoView({ block: "nearest" })}
      onClick={() => onChoose(family)}
    >
      <span className="font-picker-row-name">{label}</span>
      {selected && <Check size={13} className="font-picker-row-check" aria-hidden="true" />}
    </button>
  );
}
