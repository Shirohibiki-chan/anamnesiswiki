// The sidebar's Templates tab — this world's own templates, the ones made with
// "Save as template" on any page's right-click menu.
//
// Until now they only surfaced as a strip on the new-page screen, which meant
// the only way to see what you'd saved was to make a page you might not want.
// This is where they live.
//
// They are deliberately *not* the project tree: they come from the store's
// `templates` record, never from `nodes`, and nothing here may put them in one.
// See docs/handoff.md §Editor & templates for why that separation is the whole
// safety argument for the feature.
import { ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { getTemplateIcon } from "../../constants/icons";
import { useCustomTemplateTree, useProjectActions } from "../../hooks/use-project";
import { useDialogs } from "../../hooks/use-dialogs";
import { useTemplates } from "../../hooks/use-templates";
import type { TemplateTreeItem } from "../../services/template-library";

export function TemplatesPanel() {
  const templates = useCustomTemplateTree();
  const { deleteTemplate } = useProjectActions();
  const { confirmDestructive } = useDialogs();
  const { getLabel } = useTemplates();

  // Which templates are showing their sub-pages. Collapsed to start: the list
  // is a list of templates, and a template that happens to carry four pages
  // shouldn't take up four times the room before you've asked it to.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  // Asked before it happens. Undo covers it, but undo is only a comfort if you
  // noticed — same reasoning as the new-page screen's copy of this.
  async function handleDelete(templateId: string, name: string) {
    const ok = await confirmDestructive(`Delete the "${name}" template? Pages already made from it aren't affected.`);
    if (ok) deleteTemplate(templateId);
  }

  if (templates.length === 0) {
    return (
      <div className="tree-templates-empty">
        <p>No templates yet.</p>
        <p>
          Build a page the way you want that kind of page to start — its headings, its properties, even its pictures —
          then right-click it in the tree and choose <strong>Save as template</strong>. It'll be here, and on the
          screen every new page opens with.
        </p>
      </div>
    );
  }

  return (
    <div className="tree-templates">
      <ul className="tree-templates-list">
        {templates.map((item) => (
          <TemplateRow
            key={item.node.id}
            item={item}
            depth={0}
            isExpanded={expanded.has(item.node.id)}
            onToggle={toggle}
            onDelete={handleDelete}
            getLabel={getLabel}
          />
        ))}
      </ul>
    </div>
  );
}

function TemplateRow({
  item,
  depth,
  isExpanded,
  onToggle,
  onDelete,
  getLabel,
}: {
  item: TemplateTreeItem;
  depth: number;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  getLabel: (key: string) => string;
}) {
  const { node, children } = item;
  const Icon = getTemplateIcon(node.templateKey);
  const isRoot = depth === 0;

  return (
    <li>
      <div className="tree-templates-row" style={{ paddingLeft: `calc(var(--space-md) + ${depth} * var(--space-lg))` }}>
        {/* Only a template with sub-pages gets a twisty; the space is held
            either way so the icons below it line up. */}
        {children.length > 0 ? (
          <button
            type="button"
            className="tree-templates-twisty"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? `Hide what's inside ${node.name}` : `Show what's inside ${node.name}`}
            onClick={() => onToggle(node.id)}
          >
            <ChevronRight size={12} className={isExpanded ? "tree-templates-twisty-open" : undefined} />
          </button>
        ) : (
          <span className="tree-templates-twisty" aria-hidden="true" />
        )}

        {/* eslint-disable-next-line react-hooks/static-components -- getTemplateIcon reads a fixed lookup table, so it returns the same stable component reference for a given templateKey every render */}
        <Icon size={14} className="tree-templates-icon" />
        <span className="tree-templates-name">{node.name}</span>
        <span className="tree-templates-kind">{getLabel(node.templateKey)}</span>

        {/* Deleting a sub-page on its own would leave the template describing a
            shape it no longer has, so only a whole template can go. */}
        {isRoot && (
          <button
            type="button"
            className="tree-templates-delete"
            title={`Delete the "${node.name}" template`}
            aria-label={`Delete the "${node.name}" template`}
            onClick={() => void onDelete(node.id, node.name)}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {isExpanded && children.length > 0 && (
        <ul className="tree-templates-list">
          {children.map((child) => (
            <TemplateSubtree key={child.node.id} item={child} depth={depth + 1} getLabel={getLabel} />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * A template's sub-pages, always shown once their template is open.
 *
 * They have no twisty of their own — a template three levels deep is rare and a
 * second collapse level inside a panel this narrow buys less than it costs.
 */
function TemplateSubtree({
  item,
  depth,
  getLabel,
}: {
  item: TemplateTreeItem;
  depth: number;
  getLabel: (key: string) => string;
}) {
  const { node, children } = item;
  const Icon = getTemplateIcon(node.templateKey);

  return (
    <li>
      <div className="tree-templates-row" style={{ paddingLeft: `calc(var(--space-md) + ${depth} * var(--space-lg))` }}>
        <span className="tree-templates-twisty" aria-hidden="true" />
        {/* eslint-disable-next-line react-hooks/static-components -- as above: a fixed lookup, stable per templateKey */}
        <Icon size={14} className="tree-templates-icon" />
        <span className="tree-templates-name">{node.name}</span>
        <span className="tree-templates-kind">{getLabel(node.templateKey)}</span>
      </div>
      {children.length > 0 && (
        <ul className="tree-templates-list">
          {children.map((child) => (
            <TemplateSubtree key={child.node.id} item={child} depth={depth + 1} getLabel={getLabel} />
          ))}
        </ul>
      )}
    </li>
  );
}
