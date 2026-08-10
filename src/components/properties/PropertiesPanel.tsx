// Right sidebar — renders the selected node's template properties. See
// docs/plan.md Phase 6/7/13. Folders never have properties (mirrors the
// prototype's `if (template.isFolder) return null`), and nothing renders
// when no node is selected. Blank pages (Phase 7's template-optional new
// page) get a prompt to apply a template instead of a fixed field list.
//
// Phase 13 added four value types, per-page reordering, suggested property
// names and the Created/Updated footer. The ordering is the part with a trap
// in it: the default grouping below (fixed fields, then refs, then custom)
// exists so a growing Friends/Participants list can't shove Summary off the
// bottom of the panel, but a manual order has to be allowed to override
// exactly that — interleaving them is the whole point of dragging one. So the
// grouping is only ever the *input* to orderProperties, never enforced after.
import { useRef, useState, type FormEvent } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import { getPropertySuggestions } from "../../constants/property-suggestions";
import {
  FOLDER_TEMPLATE_KEY,
  PROPERTY_TYPE_LABELS,
  type CustomPropertySpec,
  type PropertyOption,
} from "../../constants/schema";
import { useProject } from "../../hooks/use-project";
import { useKnownOptions } from "../../hooks/use-property-index";
import { useTemplates } from "../../hooks/use-templates";
import { orderProperties, type RenderableProperty } from "../../services/property-service";
import { TemplatePicker } from "../tree/TemplatePicker";
import { TreePopover } from "../tree/TreePopover";
import { DateProperty } from "./DateProperty";
import { ImageSlot } from "./ImageSlot";
import { NumberProperty } from "./NumberProperty";
import { PropertyTimestamps } from "./PropertyTimestamps";
import { RefsProperty } from "./RefsProperty";
import { SelectProperty } from "./SelectProperty";
import { TagsProperty } from "./TagsProperty";
import { TextProperty } from "./TextProperty";
import "./properties.css";

const BLANK_TEMPLATE_KEY = "blank";

export function PropertiesPanel() {
  const {
    project,
    nodes,
    updateNodeProperty,
    updateNodeTags,
    applyTemplate,
    addCustomProperty,
    updateCustomProperty,
    removePropertyOption,
    removeCustomProperty,
    reorderProperties,
  } = useProject();
  const { getPropertySchema } = useTemplates();
  const knownOptions = useKnownOptions();
  const selectedId = project?.selectedId ?? null;
  const node = selectedId ? nodes[selectedId] : undefined;
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [newPropertyLabel, setNewPropertyLabel] = useState("");
  const [newPropertyType, setNewPropertyType] = useState<CustomPropertySpec["type"]>("text");
  const newPropertyInput = useRef<HTMLInputElement | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

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
  const custom = node.customProperties ?? [];
  const removableKeys = new Set(custom.map((prop) => prop.key));
  // Fixed text/date fields first, refs next, custom last — the starting order
  // for a page nobody has dragged anything on. See the header comment.
  const defaultOrder: RenderableProperty[] = [
    ...schema.filter((prop) => prop.type !== "refs"),
    ...schema.filter((prop) => prop.type === "refs"),
    ...custom,
  ];
  const ordered = orderProperties(defaultOrder, node.propertyOrder);

  // A suggestion for something the page already has is noise, and picking it
  // would make a second field with the same name.
  const taken = new Set(ordered.map((prop) => prop.label.toLowerCase()));
  const suggestions = getPropertySuggestions(node.templateKey).filter((s) => !taken.has(s.label.toLowerCase()));

  function renderField(prop: RenderableProperty, onRemove?: () => void) {
    const raw = node!.properties[prop.key];

    if (prop.type === "refs") {
      const nodeIds = Array.isArray(raw) ? (raw as string[]) : [];
      return (
        <RefsProperty
          label={prop.label}
          nodeIds={nodeIds}
          excludeNodeId={node!.id}
          nodes={nodes}
          onChange={(next) => updateNodeProperty(node!.id, prop.key, next)}
          onRemove={onRemove}
        />
      );
    }

    if (prop.type === "select" || prop.type === "multiselect" || prop.type === "status") {
      const isMulti = prop.type === "multiselect";
      const value = isMulti
        ? Array.isArray(raw)
          ? (raw as string[])
          : []
        : typeof raw === "string" && raw
          ? [raw]
          : [];
      return (
        <SelectProperty
          label={prop.label}
          type={prop.type}
          options={prop.options ?? []}
          knownOptions={knownOptions(node!.templateKey, prop.label)}
          value={value}
          onChange={(ids) => updateNodeProperty(node!.id, prop.key, isMulti ? ids : (ids[0] ?? undefined))}
          onOptionsChange={(options: PropertyOption[]) => updateCustomProperty(node!.id, prop.key, { options })}
          onRemoveOption={(optionId) => removePropertyOption(node!.id, prop.key, optionId)}
          onRemove={onRemove}
        />
      );
    }

    if (prop.type === "number") {
      return (
        <NumberProperty
          label={prop.label}
          value={typeof raw === "number" ? raw : undefined}
          placeholder={prop.placeholder}
          onChange={(value) => updateNodeProperty(node!.id, prop.key, value)}
          onRemove={onRemove}
        />
      );
    }

    if (prop.type === "date") {
      return (
        <DateProperty
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

  // A suggestion fills the form in rather than committing the property — it's
  // a starting point, not a decision. Half of them want a small edit before
  // they're right ("Affiliation" → "Affiliations", "Eyes" → "Eye colour"),
  // and a click that creates the field outright means fixing the name is a
  // delete and a retype. The cursor goes back to the name so the edit is
  // already possible; Add is one keystroke away for the case that needed
  // nothing changed.
  function applySuggestion(label: string, type: CustomPropertySpec["type"]) {
    setNewPropertyLabel(label);
    setNewPropertyType(type);
    newPropertyInput.current?.focus();
    newPropertyInput.current?.select();
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ordered.findIndex((prop) => prop.key === active.id);
    const newIndex = ordered.findIndex((prop) => prop.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    // The order is written whole rather than as a diff, so a page that had no
    // stored order gets a complete one on its first drag and every later drag
    // is a straight replacement.
    reorderProperties(
      node!.id,
      arrayMove(ordered, oldIndex, newIndex).map((prop) => prop.key),
    );
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ordered.map((prop) => prop.key)} strategy={verticalListSortingStrategy}>
          {ordered.map((prop) => (
            <SortableProperty key={prop.key} id={prop.key}>
              {renderField(prop, removableKeys.has(prop.key) ? () => removeCustomProperty(node.id, prop.key) : undefined)}
            </SortableProperty>
          ))}
        </SortableContext>
      </DndContext>

      {isAddingProperty ? (
        <form className="property-add-form" onSubmit={handleAddProperty}>
          <input
            ref={newPropertyInput}
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
            {Object.entries(PROPERTY_TYPE_LABELS).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
          {suggestions.length > 0 && (
            <div className="property-add-suggestions">
              <div className="ui-eyebrow property-field-label">Suggested</div>
              <div className="property-add-suggestion-list">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    className={`property-add-suggestion${
                      newPropertyLabel === suggestion.label ? " property-add-suggestion-active" : ""
                    }`}
                    title={`Fill in as ${PROPERTY_TYPE_LABELS[suggestion.type]}`}
                    onClick={() => applySuggestion(suggestion.label, suggestion.type)}
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          )}
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
      <PropertyTimestamps createdAt={node.createdAt} updatedAt={node.updatedAt} />
    </div>
  );
}

// The grip is its own element carrying the drag listeners, rather than the
// whole row the way PageTabs does it — a property field is mostly text input,
// and dragging to select text inside one would otherwise start a reorder.
function SortableProperty({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      className="property-sortable"
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
    >
      <span className="property-grip" title="Drag to reorder" {...listeners}>
        <GripVertical size={12} />
      </span>
      {children}
    </div>
  );
}
