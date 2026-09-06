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
// **The row is always drawn, even in a world with no universes, and the "+" is
// how one is made.** It was hidden until a universe existed for its first day
// (2026-09-06) on the reasoning that the feature should cost nothing to anyone
// who does not want it — and the user's answer was immediate and correct: with
// the row hidden, the only way in was a right-click item you would have to
// already know was there, so the feature was undiscoverable by anyone who
// hadn't been told. A row that says "All universes" and offers a "+" teaches
// what a universe is by existing. The right-click item stays; it is now the
// shortcut rather than the entrance.
import { useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronRight, Folder, Layers, Plus, Search } from "lucide-react";
import { FOLDER_TEMPLATE_KEY, UNIVERSE_TEMPLATE_KEY } from "../../constants/schema";
import { useUniverses, useProjectActions } from "../../hooks/use-project";
import { useCreateUniverse } from "../../hooks/use-new-page";
import { NodeIcon } from "../blocks/IconPicker";
import { TreePopover } from "./TreePopover";

/** What the top entry says, and what the button reads when nothing is chosen. */
const ALL_UNIVERSES = "All universes";

type OpenMenu = "switch" | "add" | "shared" | "remove" | null;

export function UniverseSwitcher() {
  const { universes, current, convertible, shared } = useUniverses();
  const { setSelectedUniverse, setSharedUniverse, applyTemplate } = useProjectActions();
  const createUniverse = useCreateUniverse();
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [query, setQuery] = useState("");

  // Plain case-insensitive substring, the same matching the Move to submenu
  // uses and for the same reason: a stray near-match here converts the wrong
  // page into a universe, and predictable beats forgiving when the click
  // changes what something is.
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return convertible;
    return convertible.filter((node) => node.name.toLowerCase().includes(term));
  }, [convertible, query]);

  function open(menu: OpenMenu, element: HTMLElement) {
    setAnchorRect(element.getBoundingClientRect());
    setOpenMenu(menu);
  }

  function close() {
    setAnchorRect(null);
    setOpenMenu(null);
    setQuery("");
  }

  function choose(id: string | null) {
    setSelectedUniverse(id);
    close();
  }

  function pickShared(id: string | null) {
    setSharedUniverse(id);
    close();
  }

  function makeNew() {
    close();
    createUniverse();
  }

  function convert(nodeId: string) {
    close();
    void applyTemplate(nodeId, UNIVERSE_TEMPLATE_KEY);
  }

  // The exact inverse of `convert`, and the same single call. Nothing is
  // deleted and nothing moves: the page stops being a universe and is a folder
  // at the top level again, still holding everything it held. The store clears
  // the selected/shared pointers if they named it — see its `applyTemplate`.
  function unmake(nodeId: string) {
    close();
    void applyTemplate(nodeId, FOLDER_TEMPLATE_KEY);
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
        aria-expanded={openMenu === "switch"}
        onClick={(event) => open("switch", event.currentTarget)}
      >
        {current ? <NodeIcon icon={current.icon} templateKey={current.templateKey} size={13} /> : <Layers size={13} />}
        <span className="tree-universe-current">{current?.name ?? ALL_UNIVERSES}</span>
        <ChevronDown size={13} className="tree-universe-chevron" />
      </button>
      {/* Its own button rather than a line at the bottom of the switcher menu:
          making a universe is the thing a world with none needs to offer, and
          burying it one click inside a list of nothing is how it was missed the
          first time. */}
      <button
        type="button"
        className="ui-icon-btn ui-icon-btn-sm"
        title="New universe"
        aria-label="New universe"
        aria-haspopup="menu"
        aria-expanded={openMenu === "add"}
        onClick={(event) => open("add", event.currentTarget)}
      >
        <Plus size={12} />
      </button>

      {openMenu === "switch" && anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={close}>
          <div className="tree-context-menu tree-universe-menu">
            {/* Top of the list, not a setting in a dialog: seeing the whole
                world at once is one click from wherever you are, and it is the
                only view in which universes appear as rows in the tree. */}
            <button type="button" onClick={() => choose(null)}>
              <Layers size={13} /> {ALL_UNIVERSES}
              {!current && <Check size={13} className="tree-universe-tick" />}
            </button>
            {universes.length > 0 ? (
              <>
                <div className="tree-context-menu-heading">Universes</div>
                {universes.map((universe) => (
                  <button key={universe.id} type="button" onClick={() => choose(universe.id)}>
                    <NodeIcon icon={universe.icon} templateKey={universe.templateKey} size={13} />
                    <span className="tree-universe-option-name">{universe.name}</span>
                    {/* Marked in the list rather than only in the tree, so
                        "which one is the shared one" is answerable without
                        switching to each in turn to look. */}
                    {shared?.id === universe.id && <span className="tree-universe-tag">Shared</span>}
                    {current?.id === universe.id && <Check size={13} className="tree-universe-tick" />}
                  </button>
                ))}
                {/* Swaps this popover for the picker rather than closing it,
                    like Set color and Sort sub-pages do on a row's menu. It is
                    here as well as on a universe's right-click menu for the
                    reason the "+" exists: a designation reachable only from a
                    right-click is one nobody finds. */}
                <button type="button" className="tree-context-menu-submenu" onClick={() => setOpenMenu("shared")}>
                  <Layers size={13} /> Shared universe
                  <ChevronRight size={13} className="tree-context-menu-chevron" />
                </button>
                {/* The other half of the "+", and it belongs in the same place
                    for the same reason that button does. Removing was reachable
                    only by right-clicking a universe's row — and that row only
                    exists in the all-universes view, so from inside a universe
                    there was no way out of it at all. Reported 2026-09-06. */}
                <button type="button" className="tree-context-menu-submenu" onClick={() => setOpenMenu("remove")}>
                  <Folder size={13} /> Remove a universe
                  <ChevronRight size={13} className="tree-context-menu-chevron" />
                </button>
              </>
            ) : (
              // A one-item menu would look broken. Saying what is missing and
              // where the button is costs a line and answers the question the
              // person opening this menu actually has.
              <p className="tree-universe-empty">
                No universes yet. Use <strong>+</strong> to make one — a separate version of your world, like Canon or
                an AU.
              </p>
            )}
          </div>
        </TreePopover>
      )}

      {openMenu === "shared" && anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={close}>
          <div className="tree-context-menu tree-universe-menu">
            <button type="button" className="tree-context-menu-back" onClick={() => setOpenMenu("switch")}>
              <ArrowLeft size={13} /> Shared universe
            </button>
            {/* Said in the menu rather than assumed known. "Shared" is a word
                that could mean shared with other people, which is the one thing
                this app does not do. */}
            <p className="tree-universe-empty">
              One universe can hold the pages that are true in all of them — a species, a map, a language. Its pages
              show under whichever universe you&rsquo;re in.
            </p>
            <button type="button" onClick={() => pickShared(null)}>
              None
              {!shared && <Check size={13} className="tree-universe-tick" />}
            </button>
            <div className="tree-universe-list">
              {universes.map((universe) => (
                <button key={universe.id} type="button" onClick={() => pickShared(universe.id)}>
                  <NodeIcon icon={universe.icon} templateKey={universe.templateKey} size={13} />
                  <span className="tree-universe-option-name">{universe.name}</span>
                  {shared?.id === universe.id && <Check size={13} className="tree-universe-tick" />}
                </button>
              ))}
            </div>
          </div>
        </TreePopover>
      )}

      {openMenu === "remove" && anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={close}>
          <div className="tree-context-menu tree-universe-menu">
            <button type="button" className="tree-context-menu-back" onClick={() => setOpenMenu("switch")}>
              <ArrowLeft size={13} /> Remove a universe
            </button>
            {/* Said before the click rather than in a dialog after it.
                "Remove" reads as destructive, and this is the opposite of
                destructive — so the sentence that makes it safe has to be on
                screen at the moment you are choosing, not behind a confirm you
                would learn to dismiss. */}
            <p className="tree-universe-empty">
              It stops being a universe and goes back to being an ordinary folder at the top of your world.{" "}
              <strong>Every page inside it stays exactly where it is.</strong>
            </p>
            <div className="tree-universe-list">
              {universes.map((universe) => (
                <button key={universe.id} type="button" onClick={() => unmake(universe.id)}>
                  <NodeIcon icon={universe.icon} templateKey={universe.templateKey} size={13} />
                  <span className="tree-universe-option-name">{universe.name}</span>
                </button>
              ))}
            </div>
          </div>
        </TreePopover>
      )}

      {openMenu === "add" && anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={close}>
          <div className="tree-context-menu tree-universe-menu">
            <button type="button" onClick={makeNew}>
              <Plus size={13} /> New, empty universe
            </button>
            {/* The other half, and the one that matters for a world that
                already exists: hers has its AUs in folders today, and asking
                her to make new universes and move everything into them would
                be a migration by hand. Converting is the same action the row's
                own right-click menu offers, reached from where you are already
                looking. Only top-level pages are listed, because that is the
                only place a universe can be. */}
            {convertible.length > 0 && (
              <>
                <div className="tree-context-menu-heading">Or use a page you already have</div>
                {/* A search field and a list that scrolls, rather than every
                    top-level page in one column. Her own world has a long tail
                    of pages at the root, and the first version of this ran off
                    the bottom of the screen with them — the same problem the
                    Move to submenu already answers this way, and her call when
                    it was made (2026-08-11): typing a name is the thing a menu
                    mirroring the tree cannot do. */}
                <div className="tree-move-search">
                  <Search size={12} className="tree-move-search-icon" />
                  <input
                    className="tree-move-search-input"
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Find a page..."
                    aria-label="Find a page to turn into a universe"
                    autoFocus
                  />
                </div>
                <div className="tree-universe-list">
                  {matches.length === 0 ? (
                    <p className="tree-universe-empty">No pages match that.</p>
                  ) : (
                    matches.map((node) => (
                      <button key={node.id} type="button" onClick={() => convert(node.id)}>
                        <NodeIcon icon={node.icon} templateKey={node.templateKey} size={13} />
                        <span className="tree-universe-option-name">{node.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </TreePopover>
      )}
    </div>
  );
}
