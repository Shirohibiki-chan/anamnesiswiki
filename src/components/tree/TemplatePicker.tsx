// Popover content for picking a node's template — new pages instantiate the
// chosen template's default tabs/properties from template-registry.ts.
// Positioning/portaling is handled by the TreePopover wrapper around this.
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
