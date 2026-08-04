// Right sidebar — renders the selected node's template properties. See
// docs/plan.md Phase 6/7. Folders never have properties (mirrors the
// prototype's `if (template.isFolder) return null`), and nothing renders
// when no node is selected. Blank pages (Phase 7's template-optional new
// page) get a prompt to apply a template instead of a fixed field list.
import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { FOLDER_TEMPLATE_KEY, type CustomPropertySpec } from "../../constants/schema";
import { useProject } from "../../hooks/use-project";
import { useTemplates } from "../../hooks/use-templates";
import { TemplatePicker } from "../tree/TemplatePicker";
import { TreePopover } from "../tree/TreePopover";
import { DateProperty } from "./DateProperty";
import { ImageSlot } from "./ImageSlot";
import { RefsProperty } from "./RefsProperty";
import { TagsProperty } from "./TagsProperty";
import { TextProperty } from "./TextProperty";
import "./properties.css";

const BLANK_TEMPLATE_KEY = "blank";

const CUSTOM_PROPERTY_TYPE_LABELS: Record<CustomPropertySpec["type"], string> = {
  text: "Text",
  longtext: "Long text",
  refs: "References",
  date: "Date",
};

export function PropertiesPanel() {
  const { project, nodes, updateNodeProperty, updateNodeTags, applyTemplate, addCustomProperty, removeCustomProperty } =
    useProject();
  const { getPropertySchema } = useTemplates();
  const selectedId = project?.selectedId ?? null;
  const node = selectedId ? nodes[selectedId] : undefined;
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [newPropertyLabel, setNewPropertyLabel] = useState("");
  const [newPropertyType, setNewPropertyType] = useState<CustomPropertySpec["type"]>("text");

  if (!node) {
    return (
      <div className="properties-panel-empty">
        <p>Select a page to see its properties.</p>
      </div>
    );
  }

  if (node.templateKey === FOLDER_TEMPLATE_KEY) {
    return (
      <div className="properties-panel-empty">
        <p>Folders don't have properties.</p>
      </div>
    );
  }

  const schema = getPropertySchema(node.templateKey);
  // Fixed text/date fields (Summary, When) always render first, so they
  // never get shoved down the panel by a growing Friends/Participants list.
  // Tags stays last regardless.
  const fixedFields = schema.filter((prop) => prop.type !== "refs");
  const refFields = schema.filter((prop) => prop.type === "refs");

  function renderField(
    prop: { key: string; label: string; type: CustomPropertySpec["type"]; placeholder?: string },
    onRemove?: () => void,
  ) {
    const raw = node!.properties[prop.key];

    if (prop.type === "refs") {
      const nodeIds = Array.isArray(raw) ? (raw as string[]) : [];
      return (
        <RefsProperty
          key={prop.key}
          label={prop.label}
          nodeIds={nodeIds}
          excludeNodeId={node!.id}
          nodes={nodes}
          onChange={(next) => updateNodeProperty(node!.id, prop.key, next)}
          onRemove={onRemove}
        />
      );
    }

    if (prop.type === "date") {
      return (
        <DateProperty
          key={prop.key}
          label={prop.label}
          value={typeof raw === "string" ? raw : ""}
          placeholder={prop.placeholder}
          onChange={(value) => updateNodeProperty(node!.id, prop.key, value)}
          onRemove={onRemove}
        />
      );
    }

    return (
      <TextProperty
        key={prop.key}
        label={prop.label}
        value={typeof raw === "string" ? raw : ""}
        placeholder={prop.placeholder}
        multiline={prop.type === "longtext"}
        onChange={(value) => updateNodeProperty(node!.id, prop.key, value)}
        onRemove={onRemove}
      />
    );
  }

  function handleApplyTemplate(templateKey: string) {
    applyTemplate(node!.id, templateKey);
    setAnchorRect(null);
  }

  function handleAddProperty(e: FormEvent) {
    e.preventDefault();
    const trimmed = newPropertyLabel.trim();
    if (!trimmed) return;
    addCustomProperty(node!.id, trimmed, newPropertyType);
    setNewPropertyLabel("");
    setNewPropertyType("text");
    setIsAddingProperty(false);
  }

  return (
    <div className="properties-panel">
      <ImageSlot nodeId={node.id} image={node.image} />
      {node.templateKey === BLANK_TEMPLATE_KEY && (
        <div className="properties-panel-apply-template">
          <p>This page doesn't have a template yet.</p>
          <button
            type="button"
            className="ui-btn ui-btn-secondary"
            onClick={(e) => setAnchorRect(e.currentTarget.getBoundingClientRect())}
          >
            Apply a template
          </button>
          {anchorRect && (
            <TreePopover anchorRect={anchorRect} onClose={() => setAnchorRect(null)}>
              <TemplatePicker onSelect={handleApplyTemplate} excludeKeys={["folder", "blank"]} />
            </TreePopover>
          )}
        </div>
      )}
      {fixedFields.map((prop) => renderField(prop))}
      {refFields.map((prop) => renderField(prop))}
      {(node.customProperties ?? []).map((prop) => renderField(prop, () => removeCustomProperty(node.id, prop.key)))}

      {isAddingProperty ? (
        <form className="property-add-form" onSubmit={handleAddProperty}>
          <input
            className="property-field-input"
            placeholder="Property name"
            autoFocus
            value={newPropertyLabel}
            onChange={(e) => setNewPropertyLabel(e.target.value)}
          />
          <select
            className="property-add-type"
            value={newPropertyType}
            onChange={(e) => setNewPropertyType(e.target.value as CustomPropertySpec["type"])}
          >
            {Object.entries(CUSTOM_PROPERTY_TYPE_LABELS).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
          <div className="property-add-actions">
            <button type="button" className="ui-btn ui-btn-secondary" onClick={() => setIsAddingProperty(false)}>
              Cancel
            </button>
            <button type="submit" className="ui-btn ui-btn-secondary">
              Add
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="property-add-trigger" onClick={() => setIsAddingProperty(true)}>
          <Plus size={12} /> Add property
        </button>
      )}

      <TagsProperty label="Tags" tags={node.tags} onChange={(tags) => updateNodeTags(node.id, tags)} />
    </div>
  );
}
