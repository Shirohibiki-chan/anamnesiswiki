// The universe selector, under the world's name on the Project panel's header
// row (Phase 22).
//
// **A selector rather than a row in the tree**, which is the load-bearing
// decision of the whole phase. A universe you change from a list is a thing the
// world has one of at a time; a universe you click in the tree is a folder with
// a different name, and a folder can sit anywhere and nest into anything, which
// is how the AUs wrapper ended up four levels deep. Obsidian's vault switcher
// sits in its sidebar's corner and is the shape the user pointed at.
//
// **It is here rather than on the left rail** because the rail already holds a
// *project* switcher, and two buttons side by side that both mean "switch
// something" is the confusion this avoids. The rail holds app errands; a
// universe is the tree's contents, so it belongs to the tree.
//
// **Nothing is drawn until a universe exists.** A world with none looks exactly
// as it did before this was built — that is what makes the feature opt-in
// rather than a migration that rearranges everyone's tree on first open.
import { useState } from "react";
import { Check, ChevronDown, Layers } from "lucide-react";
import { useUniverses, useProjectActions } from "../../hooks/use-project";
import { NodeIcon } from "../blocks/IconPicker";
import { TreePopover } from "./TreePopover";

/** What the top entry says, and what the button reads when nothing is chosen. */
const ALL_UNIVERSES = "All universes";

export function UniverseSwitcher() {
  const { universes, current } = useUniverses();
  const { setSelectedUniverse } = useProjectActions();
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  if (universes.length === 0) return null;

  function choose(id: string | null) {
    setSelectedUniverse(id);
    setAnchorRect(null);
  }

  return (
    <div className="tree-universe-switcher">
      <button
        type="button"
        className="tree-universe-button"
        // Named in full rather than left to the visible label alone: to a
        // screen reader "Canon" on its own is a word, not a control that
        // changes what the tree is showing.
        aria-label={`Universe: ${current?.name ?? ALL_UNIVERSES}. Choose another.`}
        aria-haspopup="menu"
        aria-expanded={anchorRect !== null}
        onClick={(event) => setAnchorRect(event.currentTarget.getBoundingClientRect())}
      >
        {current ? <NodeIcon icon={current.icon} templateKey={current.templateKey} size={13} /> : <Layers size={13} />}
        <span className="tree-universe-current">{current?.name ?? ALL_UNIVERSES}</span>
        <ChevronDown size={13} className="tree-universe-chevron" />
      </button>
      {anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={() => setAnchorRect(null)}>
          <div className="tree-context-menu tree-universe-menu">
            {/* Top of the list, not a setting in a dialog: seeing the whole
                world at once is one click from wherever you are, and it is the
                only view in which universes appear as rows in the tree. */}
            <button type="button" onClick={() => choose(null)}>
              <Layers size={13} /> {ALL_UNIVERSES}
              {!current && <Check size={13} className="tree-universe-tick" />}
            </button>
            <div className="tree-context-menu-heading">Universes</div>
            {universes.map((universe) => (
              <button key={universe.id} type="button" onClick={() => choose(universe.id)}>
                <NodeIcon icon={universe.icon} templateKey={universe.templateKey} size={13} />
                <span className="tree-universe-option-name">{universe.name}</span>
                {current?.id === universe.id && <Check size={13} className="tree-universe-tick" />}
              </button>
            ))}
          </div>
        </TreePopover>
      )}
    </div>
  );
}
