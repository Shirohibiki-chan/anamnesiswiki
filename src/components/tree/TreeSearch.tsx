// The filter at the top of the tree. Actual fuzzy matching happens in
// tree-service.ts's createSearchMatcher, wired up in TreePanel — this
// component owns the input and the scope menu hanging off it.
//
// The scope control exists because tag-only search was already built and
// nobody could find it. It was reached by typing `#` in front of the query,
// which the placeholder mentioned and which is, as a discovery mechanism, a
// documentation problem wearing a feature's clothes — reported from use,
// 2026-08-08: *"i didnt realize i had to actually type the hashtag. I thought
// some UI selection would show up or something."* Right instinct. A capability
// you can only reach by knowing a character is one most people don't have.
//
// So `#` still works, but it now *sets the scope and deletes itself* rather
// than living in the text. Two things fall out of that and both are the point:
// there's one place that says what you're searching rather than a character in
// the field and a control elsewhere disagreeing, and typing the shortcut once
// shows you the menu, which is the only way a shortcut ever teaches anyone the
// UI it stands for.
import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { SearchScopeChip, SearchScopeMenu } from "../search/SearchScopeMenu";
import type { TreeSearchMode } from "../../hooks/use-tree-data";

// Order is menu order, and the first is the default — `SearchScopeChip` reads
// it that way to decide there's nothing worth saying.
const TREE_SCOPES = [
  { value: "all", label: "Everything", hint: "names and tags" },
  { value: "name", label: "Names", hint: "page and folder names only" },
  { value: "tag", label: "Tags", hint: "tags only — the same as typing #" },
] as const;

const PLACEHOLDERS: Record<TreeSearchMode, string> = {
  all: "Find by name or tag",
  name: "Find by name",
  tag: "Find by tag",
};

type TreeSearchProps = {
  value: string;
  onChange: (value: string) => void;
  mode: TreeSearchMode;
  onModeChange: (mode: TreeSearchMode) => void;
};

export function TreeSearch({ value, onChange, mode, onModeChange }: TreeSearchProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  // The field and the menu together. Clicking the input is not clicking
  // outside — see SearchScopeMenu's `boundary`.
  const boundaryRef = useRef<HTMLDivElement>(null);

  // A leading `#` is the old tag-scope shortcut. It sets the scope and drops
  // out of the text, so the field never holds a character that means something
  // — only ever the words being searched for. Mid-word hashes are left alone;
  // they're part of a name.
  function onInputChange(next: string) {
    setMenuOpen(false);
    if (next.startsWith("#")) {
      onModeChange("tag");
      onChange(next.slice(1));
      return;
    }
    onChange(next);
  }

  return (
    <div className="tree-search" ref={boundaryRef}>
      <div className="tree-search-field">
        <Search size={12} className="tree-search-icon" />
        <input
          type="text"
          className="tree-search-input"
          value={value}
          onChange={(e) => onInputChange(e.target.value)}
          // Only on an empty field. Clicking back into a query you're part-way
          // through is editing, not starting over, and a menu that opened over
          // the results every time you moved the caret would be the pills
          // again with extra steps.
          onFocus={() => setMenuOpen(value.length === 0)}
          placeholder={PLACEHOLDERS[mode]}
        />
        <SearchScopeChip scopes={TREE_SCOPES} value={mode} onClick={() => setMenuOpen((open) => !open)} />
      </div>

      {menuOpen && (
        <SearchScopeMenu
          scopes={TREE_SCOPES}
          value={mode}
          onChange={(next) => onModeChange(next as TreeSearchMode)}
          onClose={() => setMenuOpen(false)}
          boundary={boundaryRef}
        />
      )}
    </div>
  );
}
