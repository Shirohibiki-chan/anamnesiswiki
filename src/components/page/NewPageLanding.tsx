// What a brand-new page shows before it's anything in particular: its title,
// waiting to be typed into, and the choice of what kind of page this is.
//
// The choice used to be a popover you answered *before* the page existed —
// which meant deciding what a page was for at the one moment you'd thought
// about it least, and no page at all if you changed your mind. Now the page is
// made first and this is what's on it. Rendered by PageView; the condition for
// showing it is there.
//
// "Blank" isn't in the grid because the page already is blank. It's the skip
// button underneath, and all it does is give the page somewhere to write —
// which is the difference between an unanswered question and an answered one.
import { BLANK_TEMPLATE_KEY, PAGE_TEMPLATE_KEYS, type Node } from "../../constants/schema";
import { X } from "lucide-react";
import { getTemplateIcon } from "../../constants/icons";
import { useCustomTemplates, useProjectActions } from "../../hooks/use-project";
import { useDialogs } from "../../hooks/use-dialogs";
import { useTemplates } from "../../hooks/use-templates";

// Matches the first tab every other template starts with, so a page that
// skipped the templates and one that took the plainest of them don't disagree
// about what the tab it's written in is called.
const FIRST_TAB_LABEL = "Overview";

export function NewPageLanding({ node }: { node: Node }) {
  const { applyTemplate, applyCustomTemplate, addTab, deleteTemplate } = useProjectActions();
  const customTemplates = useCustomTemplates();
  const { confirmDestructive } = useDialogs();
  const { getLabel } = useTemplates();

  const choices = PAGE_TEMPLATE_KEYS.filter((key) => key !== BLANK_TEMPLATE_KEY);

  // Asked before it happens, unlike most things here — every other button on
  // this screen is a choice you can change by pressing a different one, and
  // this is the only one that throws something away. Undo covers it too, but
  // undo is only a comfort if you noticed.
  async function handleDeleteTemplate(templateId: string, name: string) {
    const ok = await confirmDestructive(
      `Delete the "${name}" template? Pages already made from it aren't affected.`,
    );
    if (ok) deleteTemplate(templateId);
  }

  return (
    <div className="new-page-landing">
      <p className="new-page-landing-hint">
        What kind of page is this? It fills in headings and properties to write against — and you can change it, or add
        your own, at any point.
      </p>

      <div className="new-page-landing-grid">
        {choices.map((key) => {
          const Icon = getTemplateIcon(key);
          return (
            <button
              key={key}
              type="button"
              className="new-page-landing-choice"
              onClick={() => void applyTemplate(node.id, key)}
            >
              <Icon size={20} />
              <span>{getLabel(key)}</span>
            </button>
          );
        })}
      </div>

      {/* This world's own templates, made with "Save as template" on any page's
          right-click menu. Below the built-in ones and under their own heading
          rather than mixed in: these are hers, they can be deleted, and a row
          of them with no explanation would read as pages that wandered in.
          The section isn't there at all until she's made one. */}
      {customTemplates.length > 0 && (
        <>
          <p className="new-page-landing-hint new-page-landing-custom-hint">Or one of this world&rsquo;s own:</p>
          <div className="new-page-landing-grid">
            {customTemplates.map((template) => {
              const Icon = getTemplateIcon(template.templateKey);
              return (
                // A wrapper rather than a button inside a button, which isn't
                // legal HTML and which browsers resolve by dropping one of them.
                <div key={template.id} className="new-page-landing-custom">
                  <button
                    type="button"
                    className="new-page-landing-choice"
                    onClick={() => void applyCustomTemplate(node.id, template.id)}
                  >
                    <Icon size={20} />
                    <span>{template.name}</span>
                  </button>
                  {/* The only way to get rid of a template until Phase 17 gives
                      them a tab of their own. Without it a template saved by
                      mistake is permanent, which is a bad trade for a menu item
                      that's one slip away from "Set color". Hover-only, so it
                      isn't clutter on a row of things you're picking from. */}
                  <button
                    type="button"
                    className="new-page-landing-custom-remove"
                    title={`Delete the "${template.name}" template`}
                    onClick={() => void handleDeleteTemplate(template.id, template.name)}
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <button type="button" className="new-page-landing-skip" onClick={() => addTab(node.id, FIRST_TAB_LABEL)}>
        Skip this — just start writing
      </button>
    </div>
  );
}
