// The sidebar's Templates tab: every template this world can start a page
// from, in two sections — the ones the app ships with, then the ones made with
// "Save as template" on a page's right-click menu.
//
// Hers used to only surface as a strip on the new-page screen, which meant the
// only way to see what you'd saved was to make a page you might not want. This
// is where they live, and since Phase 17 clicking one opens it for editing in
// the centre panel.
//
// Both sections open the same way. A built-in template is seed data in
// services/template-registry.ts and the same in every world, so editing one
// can only mean editing *this world's* version of it — clicking the row makes
// that version the first time and opens it, and "Put back" throws it away
// again. See docs/plan.md Phase 17.
//
// The two sections are in the same order as the new-page screen (built-in
// first, hers under their own heading) so the answer to "which templates do I
// have" doesn't change shape depending on where you asked it.
//
// Hers are deliberately *not* the project tree: they come from the store's
// `templates` record, never from `nodes`, and nothing here may put them in one.
// See docs/handoff.md §Editor & templates for why that separation is the whole
// safety argument for the feature.
import { ChevronRight, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { getTemplateIcon } from "../../constants/icons";
import { TEMPLATE_KEYS } from "../../constants/schema";
import { useCustomTemplateTree, useProjectActions } from "../../hooks/use-project";
import { useBuiltInTemplateStates, useOpenTemplateId, useTemplateActions } from "../../hooks/use-template-editing";
import { useDialogs } from "../../hooks/use-dialogs";
import { useTemplates } from "../../hooks/use-templates";
import type { TemplateTreeItem } from "../../services/template-library";

export function TemplatesPanel() {
  const templates = useCustomTemplateTree();
  const { deleteTemplate } = useProjectActions();
  const { openTemplate, openBuiltInTemplate, resetBuiltInTemplate } = useTemplateActions();
  const openTemplateId = useOpenTemplateId();
  const builtInStates = useBuiltInTemplateStates();
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

  // Asked for the same reason deleting one is: it throws away writing, and
  // there's no sign of how much until it's gone.
  async function handleReset(templateKey: string, label: string) {
    const ok = await confirmDestructive(
      `Put the ${label} template back to the original? Your changes to it are lost, and pages already made from it aren't affected.`,
    );
    if (ok) resetBuiltInTemplate(templateKey);
  }

  return (
    <div className="tree-templates">
      <h3 className="tree-templates-heading">Built in</h3>
      <p className="tree-templates-note">
        The kinds a new page can start as. Edit one and you&rsquo;re editing this world&rsquo;s version of it — other
        worlds keep the original.
      </p>
      <ul className="tree-templates-list">
        {TEMPLATE_KEYS.map((key) => {
          const state = builtInStates[key];
          return (
            <BuiltInRow
              key={key}
              templateKey={key}
              label={getLabel(key)}
              isModified={state?.modified ?? false}
              isOpen={!!state && state.nodeId === openTemplateId}
              onOpen={openBuiltInTemplate}
              onReset={handleReset}
            />
          );
        })}
      </ul>

      <h3 className="tree-templates-heading">This world&rsquo;s own</h3>
      {templates.length === 0 ? (
        <p className="tree-templates-note">
          None yet. Build a page the way you want that kind of page to start — its headings, its properties, even its
          pictures — then right-click it in the tree and choose <strong>Save as template</strong>. It&rsquo;ll be here,
          and on the screen every new page opens with.
        </p>
      ) : (
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
      )}
    </div>
  );
}

/**
 * One of the templates the app ships with, and this world's version of it once
 * there is one.
 *
 * Nothing on the right where a saved template shows its kind, until it's been
 * changed. That emptiness is correct rather than a gap: hers needs a kind label
 * because a template called "Valera's sheet" doesn't say what kind of page it
 * makes, and a built-in is named after its kind already. A count of what it
 * sets up went in that slot briefly and came back out — measured at the
 * sidebar's minimum width (180px), "4 tabs · 6 properties" left 12px for the
 * name, and the name is the thing being read. "Edited" fits where that didn't,
 * and only appears when it's true.
 *
 * It carries the same twisty-width spacer as a row that could have sub-pages,
 * so the icons in both sections line up down a panel this narrow.
 */
function BuiltInRow({
  templateKey,
  label,
  isModified,
  isOpen,
  onOpen,
  onReset,
}: {
  templateKey: string;
  label: string;
  isModified: boolean;
  isOpen: boolean;
  onOpen: (templateKey: string) => void;
  onReset: (templateKey: string, label: string) => void;
}) {
  const Icon = getTemplateIcon(templateKey);

  return (
    <li>
      <div className={`tree-templates-row tree-templates-row-flush${isOpen ? " tree-templates-row-open" : ""}`}>
        <span className="tree-templates-twisty" aria-hidden="true" />
        <button type="button" className="tree-templates-open" onClick={() => onOpen(templateKey)}>
          {/* eslint-disable-next-line react-hooks/static-components -- getTemplateIcon reads a fixed lookup table, so it returns the same stable component reference for a given templateKey every render */}
          <Icon size={14} className="tree-templates-icon" />
          <span className="tree-templates-name">{label}</span>
          {isModified && <span className="tree-templates-kind">Edited</span>}
        </button>

        {/* Only offered once there's something to undo. A Put back on an
            untouched template is a button whose only effect is to look like it
            did something. */}
        {isModified && (
          <button
            type="button"
            className="tree-templates-delete"
            title={`Put the ${label} template back to the original`}
            aria-label={`Put the ${label} template back to the original`}
            onClick={() => void onReset(templateKey, label)}
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>
    </li>
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
