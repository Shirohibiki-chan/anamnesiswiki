// A list of pages, from one of four sources. Phase 18b.
//
// One block rather than four, matching the reference and what the plan worked
// out underneath: Backlinks, a tag index and a subpage index are the same
// question asked three ways. The Add Block menu still offers those names — see
// AddBlockMenu — and this is what they all create.
import { useState } from "react";
import { Link2, ListTree, Sparkles, Tags as TagsIcon, X } from "lucide-react";
import type { Block, CollectionSource, Node } from "../../constants/schema";
import { useCollection } from "../../hooks/use-link-index";
import { TreePopover } from "../tree/TreePopover";

const SOURCES: { key: CollectionSource; label: string; hint: string; icon: typeof Link2 }[] = [
  { key: "manual", label: "Manual links", hint: "A list you curate yourself", icon: Link2 },
  { key: "subpages", label: "Subpages", hint: "This page's children", icon: ListTree },
  { key: "tags", label: "Tags", hint: "Pages carrying tags you pick", icon: TagsIcon },
  { key: "mentions", label: "Backlinks", hint: "Pages that mention this one", icon: Sparkles },
];

// What an empty collection says. Each source is empty for a different reason,
// and a single "Nothing here" is exactly the dead end that sent her digging
// through the reference's settings — see docs/plan.md Phase 18b.
const EMPTY: Record<CollectionSource, string> = {
  manual: "No pages added yet.",
  subpages: "This page has no pages inside it.",
  tags: "Pick a tag to list pages by.",
  mentions: "Nothing links here yet. A backlink appears when another page mentions this one.",
};

type CollectionBlockProps = {
  block: Block;
  node: Node;
  nodes: Record<string, Node>;
  allTags: { label: string }[];
  onSetSource: (source: CollectionSource) => void;
  onSetTargets: (targetIds: string[]) => void;
  onSetTags: (tags: string[]) => void;
  onOpen: (nodeId: string) => void;
};

export function CollectionBlock({
  block,
  node,
  nodes,
  allTags,
  onSetSource,
  onSetTargets,
  onSetTags,
  onOpen,
}: CollectionBlockProps) {
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null);
  const [pickerRect, setPickerRect] = useState<DOMRect | null>(null);
  const [query, setQuery] = useState("");

  const source = block.source ?? "manual";
  const rows = useCollection(nodes, node, block);
  const chosenTags = block.tags ?? [];

  const trimmed = query.trim().toLowerCase();
  const pageMatches = Object.values(nodes)
    .filter((candidate) => candidate.id !== node.id && !(block.targetIds ?? []).includes(candidate.id))
    .filter((candidate) => (trimmed ? candidate.name.toLowerCase().includes(trimmed) : true))
    .slice(0, 30);
  const tagMatches = allTags
    .filter((tag) => !chosenTags.some((chosen) => chosen.toLowerCase() === tag.label.toLowerCase()))
    .filter((tag) => (trimmed ? tag.label.toLowerCase().includes(trimmed) : true))
    .slice(0, 30);

  return (
    <div className="block-collection">
      <button
        type="button"
        className="block-collection-source"
        onClick={(e) => setSourceRect(e.currentTarget.getBoundingClientRect())}
      >
        {SOURCES.find((s) => s.key === source)?.label ?? "Manual links"}
      </button>

      {source === "tags" && (
        <div className="block-collection-tags">
          {chosenTags.map((tag) => (
            <span key={tag} className="block-collection-tag">
              {tag}
              <button
                type="button"
                className="ui-inline-remove"
                aria-label={`Stop listing ${tag}`}
                onClick={() => onSetTags(chosenTags.filter((t) => t !== tag))}
              >
                <X size={11} />
              </button>
            </span>
          ))}
          <button
            type="button"
            className="block-inline-link"
            onClick={(e) => setPickerRect(e.currentTarget.getBoundingClientRect())}
          >
            + Tag
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="block-collection-empty">{EMPTY[source]}</p>
      ) : (
        <ul className="block-collection-list">
          {rows.map((row) => (
            <li key={row.node.id} className="block-collection-row">
              <button type="button" className="block-link" onClick={() => onOpen(row.node.id)}>
                {row.node.name || "Untitled"}
              </button>
              {/* Backlinks say where each one came from. A list that cannot
                  explain itself is the failure this whole phase started from. */}
              {row.why && row.why.kind !== "prose" && (
                <span className="block-collection-why">
                  {row.why.kind === "property" ? (row.why.label ?? "reference") : "linked"}
                </span>
              )}
              {source === "manual" && (
                <button
                  type="button"
                  className="ui-inline-remove"
                  aria-label={`Remove ${row.node.name}`}
                  onClick={() => onSetTargets((block.targetIds ?? []).filter((id) => id !== row.node.id))}
                >
                  <X size={11} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {source === "manual" && (
        <button
          type="button"
          className="block-inline-link"
          onClick={(e) => setPickerRect(e.currentTarget.getBoundingClientRect())}
        >
          + Add page
        </button>
      )}

      {sourceRect && (
        <TreePopover anchorRect={sourceRect} onClose={() => setSourceRect(null)}>
          <div className="tree-context-menu block-source-menu">
            <div className="tree-context-menu-heading">Collection source</div>
            {SOURCES.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  onSetSource(option.key);
                  setSourceRect(null);
                }}
              >
                <option.icon size={13} />
                <span className="block-source-label">
                  {option.label}
                  <small>{option.hint}</small>
                </span>
              </button>
            ))}
          </div>
        </TreePopover>
      )}

      {pickerRect && (
        <TreePopover
          anchorRect={pickerRect}
          onClose={() => {
            setPickerRect(null);
            setQuery("");
          }}
        >
          <div className="block-link-picker">
            <input
              className="property-field-input"
              autoFocus
              placeholder={source === "tags" ? "Find a tag" : "Find a page"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="block-link-results">
              {source === "tags"
                ? tagMatches.map((tag) => (
                    <button
                      key={tag.label}
                      type="button"
                      onClick={() => {
                        onSetTags([...chosenTags, tag.label]);
                        setPickerRect(null);
                        setQuery("");
                      }}
                    >
                      {tag.label}
                    </button>
                  ))
                : pageMatches.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => {
                        onSetTargets([...(block.targetIds ?? []), candidate.id]);
                        setPickerRect(null);
                        setQuery("");
                      }}
                    >
                      {candidate.name || "Untitled"}
                    </button>
                  ))}
              {(source === "tags" ? tagMatches : pageMatches).length === 0 && (
                <div className="block-link-empty-hint">Nothing matches.</div>
              )}
            </div>
          </div>
        </TreePopover>
      )}
    </div>
  );
}
