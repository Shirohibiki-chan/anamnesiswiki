// Phase 10 — Cmd+K search over the whole project. The tree's own filter box
// only ever looked at names and tags and only ever hid rows; this searches the
// text inside every tab as well, and jumps straight to the tab the match was
// found in. Ranking and matching live in search-service.ts.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getTemplateIcon } from "../../constants/icons";
import { useProjectActions } from "../../hooks/use-project";
import { useSearchResults, type SearchRow, type SearchScopeMode } from "../../hooks/use-search";
import { useShortcutLabel } from "../../hooks/use-shortcuts";
import { listStepForKey, stepIndex } from "../../services/list-keys";
import { SearchScopeChip, SearchScopeMenu } from "./SearchScopeMenu";
import "./search.css";

// Order is menu order, and the first is the default — `SearchScopeChip` reads
// it that way to decide there's nothing worth saying. The tree's list is the
// same minus Text, which it has no equivalent of; keep the shared three
// worded identically, because two answers to "what am I searching" is worse
// than one imperfect answer.
const PALETTE_SCOPES = [
  { value: "all", label: "Everything", hint: "names, tags and page text" },
  { value: "name", label: "Names", hint: "page and folder names only" },
  { value: "tag", label: "Tags", hint: "tags only — the same as typing #" },
  { value: "text", label: "Page text", hint: "the words written on a page" },
] as const;

const PLACEHOLDERS: Record<SearchScopeMode, string> = {
  all: "Search every page — name, #tag, or anything written on one",
  name: "Search page and folder names",
  tag: "Search tags",
  text: "Search the text written on every page",
};

const SCOPE_BLURBS: Record<SearchScopeMode, string> = {
  all: "names, tags and the text on every page",
  name: "page and folder names only",
  tag: "tags only",
  text: "the text written on pages only",
};

/** The matched span, marked up without dangerouslySetInnerHTML. */
function Highlighted({ text, start, end }: { text: string; start: number; end: number }) {
  if (end <= start) return <>{text}</>;
  return (
    <>
      {text.slice(0, start)}
      <mark className="search-palette-mark">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

function ResultRow({ row, isActive, onPick }: { row: SearchRow; isActive: boolean; onPick: () => void }) {
  const Icon = getTemplateIcon(row.templateKey);
  const ref = useRef<HTMLButtonElement>(null);

  // Arrow keys move the selection without moving the mouse, so the list has to
  // follow it — otherwise holding Down walks the highlight off the bottom.
  useEffect(() => {
    if (isActive) ref.current?.scrollIntoView({ block: "nearest" });
  }, [isActive]);

  return (
    <button
      ref={ref}
      type="button"
      className={`search-palette-result${isActive ? " search-palette-result-active" : ""}`}
      // Mousedown rather than click: the input is focused, and letting the
      // button take focus first would close the palette on blur mid-click.
      onMouseDown={(e) => {
        e.preventDefault();
        onPick();
      }}
    >
      {/* eslint-disable-next-line react-hooks/static-components -- getTemplateIcon reads a fixed lookup table, so it returns the same stable component reference for a given templateKey every render */}
      <Icon size={14} className="search-palette-result-icon" />
      <span className="search-palette-result-body">
        <span className="search-palette-result-name">{row.name}</span>
        {row.path.length > 0 && <span className="search-palette-result-path">{row.path.join(" / ")}</span>}
        {row.kind === "tag" && (
          <span className="search-palette-result-tag">
            #<Highlighted text={row.snippet} start={row.matchStart} end={row.matchEnd} />
          </span>
        )}
        {/* Phase 18b: an alias hit says which alias, so a page whose own name
            has nothing to do with the query never looks like a stray result. */}
        {row.kind === "alias" && (
          <span className="search-palette-result-tag">
            also <Highlighted text={row.snippet} start={row.matchStart} end={row.matchEnd} />
          </span>
        )}
        {row.kind === "content" && (
          <span className="search-palette-result-snippet">
            <span className="search-palette-result-tab">
              {row.tabLabel}
              {row.tabHidden && " (hidden)"}
            </span>
            <Highlighted text={row.snippet} start={row.matchStart} end={row.matchEnd} />
          </span>
        )}
      </span>
    </button>
  );
}

export function SearchPalette({
  onClose,
  onOpenAllProperties,
}: {
  onClose: () => void;
  onOpenAllProperties: () => void;
}) {
  const { selectNode } = useProjectActions();
  const allPropertiesKeys = useShortcutLabel("allProperties");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [scope, setScope] = useState<SearchScopeMode>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const boundaryRef = useRef<HTMLDivElement>(null);
  const results = useSearchResults(query, scope);

  function pick(row: SearchRow | undefined) {
    if (!row) return;
    selectNode(row.nodeId, row.tabId);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Tab opens the scope menu rather than moving focus. There is nothing else
    // in this dialog to tab to — it's one field over a list you drive with the
    // arrows — so the key was doing nothing, and the menu needs a way in that
    // doesn't cost the caret its place.
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      setMenuOpen((open) => !open);
      return;
    }
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      pick(results[activeIndex]);
      return;
    }
    const step = listStepForKey(e);
    if (step) {
      e.preventDefault();
      // Ctrl-N is bound to "new page" at the window level, and a shortcut that
      // fires *as well* would leave a page behind every time you walked the
      // list. The arrows don't need this, but claiming the keypress for
      // whichever key got us here is one rule instead of two.
      e.stopPropagation();
      if (results.length === 0) return;
      setActiveIndex((i) => stepIndex(i, step, results.length));
    }
  }

  return createPortal(
    <div className="ui-backdrop ui-backdrop-top" onMouseDown={onClose}>
      <div className="ui-surface search-palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="search-palette-field" ref={boundaryRef}>
          <input
            type="text"
            className="search-palette-input"
            value={query}
            autoFocus
            // Typing reshuffles the list under the highlight, so it goes back to
            // the top rather than pointing at whatever now sits at that index.
            // Done here rather than in an effect: this input is the only thing
            // that can change the query.
            onChange={(e) => {
              setMenuOpen(false);
              // Same shortcut the tree honours: a leading `#` sets the scope
              // and drops out of the text rather than staying in the field as
              // a character that means something.
              if (e.target.value.startsWith("#")) {
                setScope("tag");
                setQuery(e.target.value.slice(1));
              } else {
                setQuery(e.target.value);
              }
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDERS[scope]}
          />
          <SearchScopeChip scopes={PALETTE_SCOPES} value={scope} onClick={() => setMenuOpen((open) => !open)} />

          {menuOpen && (
            <SearchScopeMenu
              scopes={PALETTE_SCOPES}
              value={scope}
              onChange={(next) => setScope(next as SearchScopeMode)}
              onClose={() => setMenuOpen(false)}
              boundary={boundaryRef}
            />
          )}
        </div>

        {query.trim() === "" ? (
          <p className="search-palette-hint">
            {/* The palette opens focused and empty every time, so unlike the
                tree's field there's no "click into it" moment to hang the menu
                off — opening the menu on mount would put it over the results
                before there were any. This line is what points at it instead. */}
            Searching {SCOPE_BLURBS[scope]}. Press <kbd>Tab</kbd> to search something else.
          </p>
        ) : results.length === 0 ? (
          <p className="search-palette-hint">Nothing matches “{query.trim()}”.</p>
        ) : (
          <ul className="search-palette-results">
            {results.map((row, index) => (
              <li key={`${row.nodeId}:${row.tabId ?? row.kind}`}>
                <ResultRow row={row} isActive={index === activeIndex} onPick={() => pick(row)} />
              </li>
            ))}
          </ul>
        )}

        {/* The way in to the All properties & tags view, which is a different
            question from the one this field answers — not "where is this page"
            but "what have I actually been using". Mousedown for the same
            reason the result rows use it: the input has focus and letting the
            button take it first would close the palette mid-click. */}
        <div className="search-palette-footer">
          <button
            type="button"
            className="search-palette-footer-action"
            onMouseDown={(e) => {
              e.preventDefault();
              onOpenAllProperties();
            }}
          >
            All properties &amp; tags
            <kbd>{allPropertiesKeys}</kbd>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
