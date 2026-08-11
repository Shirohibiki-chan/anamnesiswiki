// Popover content for giving an existing page a template — its default
// tabs/properties come from template-registry.ts, and any the page already has
// are left alone. Positioning/portaling is handled by the TreePopover wrapper
// around this.
//
// Only the properties panel reaches this now: a page that was made blank and
// then written in, deciding later what it is. A page being made picks from
// components/page/NewPageLanding.tsx instead, which is the same list laid out
// for a whole column rather than a popover.
import { TEMPLATE_KEYS } from "../../constants/schema";
import { getTemplateIcon } from "../../constants/icons";
import { useTemplates } from "../../hooks/use-templates";

type TemplatePickerProps = {
  onSelect: (templateKey: string) => void;
  // Hides specific keys — used when applying a template to an existing page,
  // where "Folder" and "Blank" itself aren't meaningful choices.
  excludeKeys?: string[];
};

export function TemplatePicker({ onSelect, excludeKeys = [] }: TemplatePickerProps) {
  const { getLabel } = useTemplates();
  const keys = TEMPLATE_KEYS.filter((key) => !excludeKeys.includes(key));

  return (
    <div className="tree-template-picker">
      {keys.map((key) => {
        const Icon = getTemplateIcon(key);
        return (
          <button key={key} type="button" className="tree-template-option" onClick={() => onSelect(key)}>
            <Icon size={16} />
            <span>{getLabel(key)}</span>
          </button>
        );
      })}
    </div>
  );
}
