// Popover content for picking a new node's type. Bare nodes only for now —
// no pre-filled tabs/properties, that's Phase 7's template-registry.ts.
// Positioning/portaling is handled by the TreePopover wrapper around this.
import { TEMPLATE_KEYS } from "../../constants/schema";
import { TEMPLATE_LABELS } from "../../constants/templates";
import { getTemplateIcon } from "../../constants/icons";

type TemplatePickerProps = {
  onSelect: (templateKey: string) => void;
};

export function TemplatePicker({ onSelect }: TemplatePickerProps) {
  return (
    <div className="tree-template-picker">
      {TEMPLATE_KEYS.map((key) => {
        const Icon = getTemplateIcon(key);
        return (
          <button key={key} type="button" className="tree-template-option" onClick={() => onSelect(key)}>
            <Icon size={16} />
            <span>{TEMPLATE_LABELS[key]}</span>
          </button>
        );
      })}
    </div>
  );
}
