// Name-and-#tag filter input at the top of the tree. Actual fuzzy matching
// happens in tree-service.ts's createSearchMatcher, wired up in TreePanel —
// this component just owns the input field.
import { Search } from "lucide-react";

type TreeSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export function TreeSearch({ value, onChange }: TreeSearchProps) {
  return (
    <div className="tree-search">
      <Search size={12} className="tree-search-icon" />
      <input
        type="text"
        className="tree-search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Find by name or #tag"
      />
    </div>
  );
}
