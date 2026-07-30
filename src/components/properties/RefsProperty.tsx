// Searchable multi-node reference picker — used for things like a
// character's Friends or an event's Participants. See docs/plan.md Phase 6.
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { FOLDER_TEMPLATE_KEY, type Node } from "../../constants/schema";
import { getTemplateIcon } from "../../constants/icons";

type RefsPropertyProps = {
  label: string;
  nodeIds: string[];
  excludeNodeId: string;
  nodes: Record<string, Node>;
  onChange: (nodeIds: string[]) => void;
};

export function RefsProperty({ label, nodeIds, excludeNodeId, nodes, onChange }: RefsPropertyProps) {
  const [query, setQuery] = useState("");

  const candidates = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return Object.values(nodes)
      .filter((n) => n.templateKey !== FOLDER_TEMPLATE_KEY && n.id !== excludeNodeId && !nodeIds.includes(n.id))
      .filter((n) => !trimmed || n.name.toLowerCase().includes(trimmed))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [nodes, nodeIds, excludeNodeId, query]);

  function addRef(id: string) {
    onChange([...nodeIds, id]);
    setQuery("");
  }

  return (
    <div className="property-field">
      <div className="property-field-label">{label}</div>
      <input
        type="text"
        className="property-field-input"
        placeholder="Search pages to add…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim() && candidates.length > 0 && (
        <div className="property-refs-candidates">
          {candidates.map((n) => {
            const Icon = getTemplateIcon(n.templateKey);
            return (
              <button type="button" key={n.id} className="property-refs-candidate" onClick={() => addRef(n.id)}>
                <Icon size={12} className="property-refs-chip-icon" />
                {n.name}
              </button>
            );
          })}
        </div>
      )}
      {nodeIds.length > 0 && (
        <div className="property-refs-list">
          {nodeIds.map((id) => {
            const refNode = nodes[id];
            if (!refNode) return null;
            const Icon = getTemplateIcon(refNode.templateKey);
            return (
              <div key={id} className="property-refs-chip">
                <Icon size={12} className="property-refs-chip-icon" />
                <span className="property-refs-chip-name">{refNode.name}</span>
                <button
                  type="button"
                  className="property-refs-remove"
                  aria-label={`Remove ${refNode.name}`}
                  onClick={() => onChange(nodeIds.filter((refId) => refId !== id))}
                >
                  <X size={10} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
