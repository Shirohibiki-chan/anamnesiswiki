// A block pointing at another page. Phase 18a.
//
// It stores a node id, never a name — a page renamed after being linked has
// to stay linked, which is the same reason the rest of the app keys on ids.
// A target that has since been deleted renders as a missing link rather than
// disappearing, so the block can be repointed instead of quietly emptying.
import { useState } from "react";
import { Link2, Link2Off } from "lucide-react";
import type { Node } from "../../constants/schema";
import { TreePopover } from "../tree/TreePopover";

type LinkBlockProps = {
  targetId: string | undefined;
  nodes: Record<string, Node>;
  onChange: (targetId: string | undefined) => void;
  onOpen: (nodeId: string) => void;
};

export function LinkBlock({ targetId, nodes, onChange, onOpen }: LinkBlockProps) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [query, setQuery] = useState("");

  const target = targetId ? nodes[targetId] : undefined;
  const trimmed = query.trim().toLowerCase();
  const matches = Object.values(nodes)
    .filter((node) => (trimmed ? node.name.toLowerCase().includes(trimmed) : true))
    .slice(0, 30);

  if (targetId && !target) {
    return (
      <div className="block-link-missing">
        <Link2Off size={13} />
        <span>That page is gone.</span>
        <button type="button" className="block-inline-link" onClick={() => onChange(undefined)}>
          Clear
        </button>
      </div>
    );
  }

  return (
    <>
      {target ? (
        <div className="block-link-row">
          <button type="button" className="block-link" onClick={() => onOpen(target.id)}>
            <Link2 size={13} /> {target.name || "Untitled"}
          </button>
          <button type="button" className="block-inline-link" onClick={() => onChange(undefined)}>
            Change
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="block-link-empty"
          onClick={(e) => setAnchorRect(e.currentTarget.getBoundingClientRect())}
        >
          + Add link
        </button>
      )}

      {anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={() => setAnchorRect(null)}>
          <div className="block-link-picker">
            <input
              className="property-field-input"
              autoFocus
              placeholder="Find a page"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="block-link-results">
              {matches.map((node) => (
                <button
                  key={node.id}
                  type="button"
                 
                  onClick={() => {
                    onChange(node.id);
                    setAnchorRect(null);
                    setQuery("");
                  }}
                >
                  {node.name || "Untitled"}
                </button>
              ))}
              {matches.length === 0 && <div className="block-link-empty-hint">Nothing matches.</div>}
            </div>
          </div>
        </TreePopover>
      )}
    </>
  );
}
