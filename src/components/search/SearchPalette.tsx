// Phase 10 — Cmd+K search over the whole project. The tree's own filter box
// only ever looked at names and tags and only ever hid rows; this searches the
// text inside every tab as well, and jumps straight to the tab the match was
// found in. Ranking and matching live in search-service.ts.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getTemplateIcon } from "../../constants/icons";
import { useProjectActions } from "../../hooks/use-project";
import { useSearchResults, type SearchRow } from "../../hooks/use-search";
import "./search.css";

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

export function SearchPalette({ onClose }: { onClose: () => void }) {
  const { selectNode } = useProjectActions();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useSearchResults(query);

  function pick(row: SearchRow | undefined) {
    if (!row) return;
    selectNode(row.nodeId, row.tabId);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      pick(results[activeIndex]);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => (i + step + results.length) % results.length);
    }
  }

  return createPortal(
    <div className="ui-backdrop ui-backdrop-top" onMouseDown={onClose}>
      <div className="ui-surface search-palette" onMouseDown={(e) => e.stopPropagation()}>
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
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search every page — name, #tag, or anything written on one"
        />

        {query.trim() === "" ? (
          <p className="search-palette-hint">
            Type to search names, tags and the text on every page. Start with <code>#</code> to search tags only.
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
      </div>
    </div>,
    document.body,
  );
}
