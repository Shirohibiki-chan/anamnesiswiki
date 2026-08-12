// The centre panel while a template is open for editing.
//
// Deliberately the page editor, not a form. A template *is* a copied page, so
// editing one is editing a page's title, tabs and writing — building a separate
// screen with its own fields would be a second editor to keep working, and it's
// what the 2026-07-31 decision was actually against. See docs/plan.md Phase 17.
//
// What it doesn't share with PageView, and why: no breadcrumb trail (a template
// has no place in the tree), no home badge, no hidden-page state, no "what kind
// of page is this" grid (a template already knows), and no properties panel —
// that's driven by the project's selection and is the next thing to reach for
// if template properties ever need editing.
import { useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import type { Node } from "../../constants/schema";
import { getTemplateIcon } from "../../constants/icons";
import { useDialogs } from "../../hooks/use-dialogs";
import { useOpenBuiltInKey, useTemplateActions, useTemplateEditing } from "../../hooks/use-template-editing";
import { useTemplates } from "../../hooks/use-templates";
import { Editor } from "./Editor";
import { PageTabs } from "./PageTabs";
import "./page.css";

// Rendered with `key={template.id}` by AppLayout, so activeTabId is recomputed
// fresh when a different template is opened — the same remount trick PageView
// uses instead of resetting state in an effect.
export function TemplateView({ template }: { template: Node }) {
  const { openTemplate, resetBuiltInTemplate } = useTemplateActions();
  const editing = useTemplateEditing(template.id);
  const { getLabel } = useTemplates();
  const { confirmDestructive } = useDialogs();
  // Set when this is this world's version of a built-in template rather than
  // one she saved herself — the only case with an original to go back to.
  const builtInKey = useOpenBuiltInKey();

  const [activeTabId, setActiveTabId] = useState<string | null>(template.tabs[0]?.id ?? null);
  const [isRenaming, setIsRenaming] = useState(false);

  const activeTab = template.tabs.find((tab) => tab.id === activeTabId) ?? template.tabs[0];
  const Icon = getTemplateIcon(template.templateKey);

  function handleAddTab() {
    const tab = editing.addTab("New Tab");
    if (tab) setActiveTabId(tab.id);
  }

  async function handleReset(templateKey: string) {
    const label = getLabel(templateKey);
    const ok = await confirmDestructive(
      `Put the ${label} template back to the original? Your changes to it are lost, and pages already made from it aren't affected.`,
    );
    if (ok) resetBuiltInTemplate(templateKey);
  }

  function commitName(value: string) {
    const trimmed = value.trim();
    // An empty name would leave the template unnameable in the sidebar list,
    // where the name is the only thing identifying it. Refuse rather than
    // store one.
    if (trimmed) editing.rename(trimmed);
    setIsRenaming(false);
  }

  return (
    <div className="page-view-shell">
      <div className="page-view">
        {/* Two rows when there's a Put back button — back and the button on
            one line, the note under them. One row without it, as before. The
            modifier is on the bar rather than a `:has()` rule so the layout is
            decided in the component that knows, and it's the only stylesheet
            in the app that would have needed one. */}
        <div className={`template-view-bar${builtInKey ? " template-view-bar-resettable" : ""}`}>
          <button type="button" className="template-view-back" onClick={() => openTemplate(null)}>
            <ArrowLeft size={14} />
            Back to templates
          </button>
          {/* Offered here as well as in the sidebar because this is where she'd
              be when she decides the edit was a mistake, and the sidebar row is
              behind whatever the panel is showing. */}
          {builtInKey && (
            <button type="button" className="template-view-reset" onClick={() => void handleReset(builtInKey)}>
              <RotateCcw size={13} />
              Put back to the original
            </button>
          )}
          {/* Said plainly because "template" reads like a live link and isn't
              one: applying a template deep-copies it, so a page made earlier
              has its own copy and nothing here can reach it. */}
          <p className="template-view-note">
            {builtInKey
              ? "This is this world's copy of a built-in template. Other worlds keep the original, and pages you've already made aren't affected."
              : "You're editing a template. Pages you've already made from it aren't affected."}
          </p>
        </div>

        <div className="template-view-title">
          {/* eslint-disable-next-line react-hooks/static-components -- getTemplateIcon reads a fixed lookup table, so it returns the same stable component reference for a given templateKey every render */}
          <Icon size={24} className="template-view-icon" />
          {isRenaming ? (
            <input
              className="template-view-title-input"
              autoFocus
              defaultValue={template.name}
              onBlur={(event) => commitName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitName(event.currentTarget.value);
                if (event.key === "Escape") setIsRenaming(false);
              }}
            />
          ) : (
            <button type="button" className="template-view-title-text" onClick={() => setIsRenaming(true)}>
              {template.name}
            </button>
          )}
          <span className="template-view-kind">{getLabel(template.templateKey)} template</span>
        </div>

        {template.tabs.length === 0 ? (
          <div className="page-view-no-tabs">
            <p>This template doesn't have any tabs yet.</p>
            <button type="button" className="ui-btn ui-btn-lg ui-btn-secondary" onClick={handleAddTab}>
              Add a tab
            </button>
          </div>
        ) : (
          <>
            <PageTabs
              tabs={template.tabs}
              activeTabId={activeTab?.id ?? null}
              onSelect={setActiveTabId}
              onToggleHidden={editing.toggleTabHidden}
              onAdd={handleAddTab}
              onRename={editing.renameTab}
              onDelete={editing.deleteTab}
              onReorder={editing.reorderTabs}
            />
            {activeTab && (
              <Editor
                key={activeTab.id}
                // The template's own id. Editor only uses this to keep a page
                // from offering itself as a mention target, and a template
                // isn't in `nodes`, so nothing matches and every page stays
                // offerable — which is right: a template may link to a page.
                nodeId={template.id}
                content={activeTab.content}
                onContentChange={(content) => editing.updateTabContent(activeTab.id, content)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
