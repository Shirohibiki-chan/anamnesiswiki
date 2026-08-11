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
import { BLANK_TEMPLATE_KEY, TEMPLATE_KEYS, type Node } from "../../constants/schema";
import { getTemplateIcon } from "../../constants/icons";
import { useProjectActions } from "../../hooks/use-project";
import { useTemplates } from "../../hooks/use-templates";

// Matches the first tab every other template starts with, so a page that
// skipped the templates and one that took the plainest of them don't disagree
// about what the tab it's written in is called.
const FIRST_TAB_LABEL = "Overview";

export function NewPageLanding({ node }: { node: Node }) {
  const { applyTemplate, addTab } = useProjectActions();
  const { getLabel } = useTemplates();

  const choices = TEMPLATE_KEYS.filter((key) => key !== BLANK_TEMPLATE_KEY);

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

      <button type="button" className="new-page-landing-skip" onClick={() => addTab(node.id, FIRST_TAB_LABEL)}>
        Skip this — just start writing
      </button>
    </div>
  );
}
