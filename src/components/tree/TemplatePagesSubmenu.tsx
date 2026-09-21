// The "Add Pages From Template" submenu: which of this world's templates to
// take the pages from. Only templates that hold pages are listed — the panel
// hosting this does not offer the item at all when there are none.
//
// This is the second route to a template's structure and the one that
// reaches a world already full of characters (child-naming.ts): the page's
// own writing and fields stay as they are, and only the pages saved inside
// the template arrive, named after this page if the template says so. Swaps
// into the same popover the context menu was in, the way SortMenu does.
import { ArrowLeft } from "lucide-react";
import type { Node } from "../../constants/schema";
import { getTemplateIcon } from "../../constants/icons";

type Props = {
  templates: Node[];
  onSelect: (templateRootId: string) => void;
  onBack: () => void;
};

export function TemplatePagesSubmenu({ templates, onSelect, onBack }: Props) {
  return (
    <div className="tree-context-menu">
      <button type="button" className="tree-context-menu-back" onClick={onBack}>
        <ArrowLeft size={13} /> Add Pages From Template
      </button>
      {templates.map((template) => {
        const Icon = getTemplateIcon(template.templateKey);
        return (
          <button key={template.id} type="button" onClick={() => onSelect(template.id)}>
            <Icon size={13} /> {template.name}
          </button>
        );
      })}
    </div>
  );
}
