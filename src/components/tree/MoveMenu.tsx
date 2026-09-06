// The "Move to" submenu. Swaps into the same popover the context menu was in,
// exactly as SortMenu does and for the same reason — see that file.
//
// A search box rather than a submenu mirroring the tree (the user's call,
// 2026-08-11): a menu of everywhere doesn't survive a world of any size, and
// walking a nested menu to reach a folder is the same work as finding it in the
// sidebar and dragging. Typing its name is the thing dragging can't do.
//
// Matching is a plain case-insensitive substring on the destination's name, not
// the fuzzy index the tree filter uses. Deliberate: the tree filter *shows* you
// pages and a stray near-match costs a glance, whereas picking the wrong row
// here files your work somewhere you didn't choose. Predictable beats
// forgiving when the click moves something.
import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import type { MoveDestination } from "../../services/tree-service";

type MoveMenuProps = {
  destinations: MoveDestination[];
  /** null is the project root. */
  onSelect: (destinationId: string | null) => void;
  /**
   * What to say instead of the default when there is nowhere to go, for the
   * cases where the emptiness is a rule rather than a small world. A universe
   * is the one that has it (Phase 22): "nowhere else to put this yet" invites
   * someone to make a folder and try again, and no folder will ever work.
   */
  nowhereNote?: string;
  onBack: () => void;
};

export function MoveMenu({ destinations, onSelect, nowhereNote, onBack }: MoveMenuProps) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return destinations;
    return destinations.filter((destination) => destination.name.toLowerCase().includes(term));
  }, [destinations, query]);

  return (
    <div className="tree-context-menu tree-move-menu">
      <button type="button" className="tree-context-menu-back" onClick={onBack}>
        <ArrowLeft size={13} /> Move to
      </button>

      <div className="tree-move-search">
        <Search size={12} className="tree-move-search-icon" />
        <input
          className="tree-move-search-input"
          value={query}
          placeholder="Search pages…"
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter takes the top match, which is the whole point of typing
            // rather than scrolling — three keys and a page has moved.
            if (e.key === "Enter" && matches.length > 0) onSelect(matches[0].id);
            // Escape goes back to the menu rather than closing everything: the
            // popover only closes on a click outside, so without this a search
            // opened by mistake has no keyboard way out.
            if (e.key === "Escape") {
              e.stopPropagation();
              onBack();
            }
          }}
        />
      </div>

      <div className="tree-move-list">
        {matches.length === 0 ? (
          // Two different nothings. An empty list with an empty query is a
          // world with nowhere else to put this — one page at the top level,
          // or a folder that already holds everything — and telling that
          // person their search matched nothing would be a non-sequitur.
          <p className="tree-move-empty">
            {destinations.length === 0
              ? (nowhereNote ?? "There's nowhere else to put this yet.")
              : "No pages match that."}
          </p>
        ) : (
          matches.map((destination) => (
            <button
              key={destination.id ?? "__root__"}
              type="button"
              className="tree-move-option"
              onClick={() => onSelect(destination.id)}
            >
              <span className="tree-move-option-name">{destination.name}</span>
              {/* Two pages of one name are ordinary in a world — the trail is
                  what tells them apart, so it's part of the row rather than a
                  tooltip nobody hovers for. */}
              {destination.path.length > 0 && (
                <span className="tree-move-option-path">{destination.path.join(" / ")}</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
