// The order the project grid is in, as a pill that opens a menu.
//
// A pill and not a second pair of icon buttons beside the view toggle. The
// toggle can be icons because covers and rows are pictures of themselves;
// "newest first" is a sentence, and four of them are four sentences. The
// closed pill also has to say which order is on, which an icon can't.
//
// It carries its own open state rather than taking it from the grid, because
// nothing outside this control opens or closes it — the same reason the
// scope menu in the search palette owns its own, minus the field that has to
// be able to open it from underneath.
import { useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useClickOutside } from "../../hooks/use-click-outside";
import { PROJECT_SORTS, PROJECT_SORT_LABELS, type ProjectSort } from "../../services/preferences-service";

type SortPillProps = {
  value: ProjectSort;
  onChange: (sort: ProjectSort) => void;
};

export function SortPill({ value, onChange }: SortPillProps) {
  const [isOpen, setIsOpen] = useState(false);
  // The pill and its menu together: clicking the pill to close it must not
  // also count as a click outside, or it would close and reopen in one press.
  const boundary = useRef<HTMLDivElement>(null);
  useClickOutside(boundary, () => setIsOpen(false), isOpen);

  return (
    <div className="start-sort" ref={boundary}>
      <button
        type="button"
        className="start-pill"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        // The label as written, not lowercased to fit the sentence: doing
        // that turns "Name A–Z" into "name a–z", which is a worse thing to
        // hear read out than a capital letter mid-sentence is to read.
        aria-label={`Sorted by ${PROJECT_SORT_LABELS[value]} — change the order`}
        onClick={() => setIsOpen((open) => !open)}
        // Escape closes it from the pill, which is where focus returns to
        // after a pick. The menu itself doesn't listen: it never holds focus
        // long enough for a keydown on it to fire.
        onKeyDown={(event) => {
          if (event.key === "Escape" && isOpen) {
            event.stopPropagation();
            setIsOpen(false);
          }
        }}
      >
        {PROJECT_SORT_LABELS[value]}
        <ChevronDown size={12} aria-hidden />
      </button>

      {isOpen && (
        <div className="start-sort-menu" role="listbox" aria-label="Order projects by">
          {PROJECT_SORTS.map((sort) => (
            <button
              key={sort}
              type="button"
              role="option"
              aria-selected={sort === value}
              className="start-sort-option"
              onClick={() => {
                onChange(sort);
                setIsOpen(false);
              }}
            >
              <Check size={12} className="start-sort-check" aria-hidden={sort !== value} />
              {PROJECT_SORT_LABELS[sort]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
