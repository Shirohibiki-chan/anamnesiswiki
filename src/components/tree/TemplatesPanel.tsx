// The sidebar's Templates tab — this world's own templates, the ones made with
// "Save as template" on any page's right-click menu.
//
// Until now they only surfaced as a strip on the new-page screen, which meant
// the only way to see what you'd saved was to make a page you might not want.
// This is where they live, and since Phase 17 clicking one opens it for
// editing in the centre panel.
//
// They are deliberately *not* the project tree: they come from the store's
// `templates` record, never from `nodes`, and nothing here may put them in one.
// See docs/handoff.md §Editor & templates for why that separation is the whole
// safety argument for the feature.
import { ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { getTemplateIcon } from "../../constants/icons";
import { useCustomTemplateTree, useProjectActions } from "../../hooks/use-project";
import { useOpenTemplateId, useTemplateActions } from "../../hooks/use-template-editing";
import { useDialogs } from "../../hooks/use-dialogs";
import { useTemplates } from "../../hooks/use-templates";
import type { TemplateTreeItem } from "../../services/template-library";

export function TemplatesPanel() {
  const templates = useCustomTemplateTree();
  const { deleteTemplate } = useProjectActions();
  const { openTemplate } = useTemplateActions();
  const openTemplateId = useOpenTemplateId();
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
            expanded={expanded}
            onToggle={toggle}
            onDelete={handleDelete}
            onOpen={openTemplate}
            openTemplateId={openTemplateId}
            getLabel={getLabel}
          />
        ))}
      </ul>
    </div>
  );
}

type RowProps = {
  item: TemplateTreeItem;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onOpen: (id: string) => void;
  openTemplateId: string | null;
  getLabel: (key: string) => string;
};

/**
 * One row, and its sub-pages beneath it when open.
 *
 * Recursive rather than two components: a template's sub-page is editable in
 * exactly the way its root is — it's a page either way — so the only thing
 * depth changes is the indent and whether Delete is offered. Deleting a
 * sub-page on its own would leave the template describing a shape it no longer
 * has, so only a whole template can go.
 */
function TemplateRow({ item, depth, expanded, onToggle, onDelete, onOpen, openTemplateId, getLabel }: RowProps) {
  const { node, children } = item;
  const Icon = getTemplateIcon(node.templateKey);
  const isExpanded = expanded.has(node.id);
  const isOpen = openTemplateId === node.id;

  return (
    <li>
      <div
        className={`tree-templates-row${isOpen ? " tree-templates-row-open" : ""}`}
        style={{ paddingLeft: `calc(var(--space-md) + ${depth} * var(--space-lg))` }}
      >
        {/* Only a row with sub-pages gets a twisty; the space is held either
            way so the icons below it line up. It's a separate button from the
            name so opening a template and looking inside it stay two
            different gestures. */}
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

        <button type="button" className="tree-templates-open" onClick={() => onOpen(node.id)}>
          {/* eslint-disable-next-line react-hooks/static-components -- getTemplateIcon reads a fixed lookup table, so it returns the same stable component reference for a given templateKey every render */}
          <Icon size={14} className="tree-templates-icon" />
          <span className="tree-templates-name">{node.name}</span>
          <span className="tree-templates-kind">{getLabel(node.templateKey)}</span>
        </button>

        {depth === 0 && (
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
            <TemplateRow
              key={child.node.id}
              item={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onDelete={onDelete}
              onOpen={onOpen}
              openTemplateId={openTemplateId}
              getLabel={getLabel}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
