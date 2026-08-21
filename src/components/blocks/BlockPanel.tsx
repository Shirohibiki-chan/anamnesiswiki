// The right-hand sidebar: an ordered list of blocks and nothing else.
// Phase 18a. See docs/plan.md.
//
// This replaced PropertiesPanel, whose shape was a fixed picture slot, then
// the properties, then tags. Everything is a block now — the picture and the
// tags included — so a brand new page's sidebar is empty but for Add Block,
// and every field it ever shows got there because something added one.
//
// **A page written before Phase 18a has no block list and is not given one on
// read.** `useBlocks` derives one that reproduces the old panel exactly, and
// the first edit through any of the store's block actions writes it for real.
// So opening an old world looks like nothing happened, which is the point.
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { getPropertySuggestions } from "../../constants/property-suggestions";
import {
  BLANK_TEMPLATE_KEY,
  FOLDER_TEMPLATE_KEY,
  PROPERTY_TYPE_LABELS,
  type Block,

  type CustomPropertySpec,
  type PropertyOption,
} from "../../constants/schema";
import { useBlocks } from "../../hooks/use-blocks";
import { useDialogs } from "../../hooks/use-dialogs";
import { useProject } from "../../hooks/use-project";
import { useAllTags, useKnownOptions } from "../../hooks/use-property-index";
import type { RenderableProperty } from "../../services/property-service";
import { DateProperty } from "../properties/DateProperty";
import { ImageSlot } from "../properties/ImageSlot";
import { NumberProperty } from "../properties/NumberProperty";
import { PropertyTimestamps } from "../properties/PropertyTimestamps";
import { RefsProperty } from "../properties/RefsProperty";
import { SelectProperty } from "../properties/SelectProperty";
import { TagsProperty } from "../properties/TagsProperty";
import { TextProperty } from "../properties/TextProperty";
import { TemplatePicker } from "../tree/TemplatePicker";
import { TreePopover } from "../tree/TreePopover";
import { AddBlockMenu } from "./AddBlockMenu";
import { AliasBlock } from "./AliasBlock";
import { BlockShell } from "./BlockShell";
import { CollectionBlock } from "./CollectionBlock";
import { TextBlock } from "./TextBlock";
import "../properties/properties.css";
import "./blocks.css";

export function BlockPanel() {
  const {
    project,
    nodes,
    selectNode,
    updateNodeProperty,
    updateNodeTags,
    applyTemplate,
    addCustomProperty,
    updateCustomProperty,
    removePropertyOption,
    removeCustomProperty,
    addBlock,
    removeBlock,
    reorderBlocks,
    duplicateBlock,
    setBlockTitle,
    setBlockTitleShown,
    setBlockColor,
    setBlockText,
    setBlockSource,
    setBlockTargets,
    setBlockTags,
    setNodeAliases,
  } = useProject();
  const { confirmDestructive } = useDialogs();
  const knownOptions = useKnownOptions();
  const allTags = useAllTags();
  const selectedId = project?.selectedId ?? null;
  const node = selectedId ? nodes[selectedId] : undefined;
  const { blocks, properties, unshown } = useBlocks(node);

  const [templateRect, setTemplateRect] = useState<DOMRect | null>(null);
  const [addRect, setAddRect] = useState<DOMRect | null>(null);
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

  const taken = new Set([...properties.values()].map((prop) => prop.label.toLowerCase()));
  const suggestions = getPropertySuggestions(node.templateKey).filter((s) => !taken.has(s.label.toLowerCase()));

  // The label is always empty: the block's own title strip draws the heading
  // now, so a field drawing its own would render it twice. See BlockShell.
  function renderPropertyField(prop: RenderableProperty) {
    const raw = node!.properties[prop.key];

    if (prop.type === "refs") {
      return (
        <RefsProperty
          label=""
          nodeIds={Array.isArray(raw) ? (raw as string[]) : []}
          excludeNodeId={node!.id}
          nodes={nodes}
          onChange={(next) => updateNodeProperty(node!.id, prop.key, next)}
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
          label=""
          type={prop.type}
          options={prop.options ?? []}
          knownOptions={knownOptions(node!.templateKey, prop.label)}
          value={value}
          onChange={(ids) => updateNodeProperty(node!.id, prop.key, isMulti ? ids : (ids[0] ?? undefined))}
          onOptionsChange={(options: PropertyOption[]) => updateCustomProperty(node!.id, prop.key, { options })}
          onRemoveOption={(optionId) => removePropertyOption(node!.id, prop.key, optionId)}
        />
      );
    }

    if (prop.type === "number") {
      return (
        <NumberProperty
          label=""
          value={typeof raw === "number" ? raw : undefined}
          placeholder={prop.placeholder}
          onChange={(value) => updateNodeProperty(node!.id, prop.key, value)}
        />
      );
    }

    if (prop.type === "date") {
      return (
        <DateProperty
          label=""
          value={typeof raw === "string" ? raw : ""}
          placeholder={prop.placeholder}
          onChange={(value) => updateNodeProperty(node!.id, prop.key, value)}
        />
      );
    }

    return (
      <TextProperty
        label=""
        value={typeof raw === "string" ? raw : ""}
        placeholder={prop.placeholder}
        multiline={prop.type === "longtext"}
        onChange={(value) => updateNodeProperty(node!.id, prop.key, value)}
      />
    );
  }

  // A property block whose key no longer resolves renders as a stub rather
  // than being skipped. Skipping it would leave a gap nothing explains and a
  // block the user can't reach to remove.
  function renderBlock(block: Block): { natural: string; body: ReactNode } {
    if (block.kind === "image") {
      return {
        natural: "Image",
        body: (
          <ImageSlot
            nodeId={node!.id}
            image={node!.image}
            imageAlt={node!.imageAlt}
            imageFocusY={node!.imageFocusY}
            hasBanner={node!.banner !== undefined}
          />
        ),
      };
    }

    if (block.kind === "tags") {
      return {
        natural: "Tags",
        body: (
          <TagsProperty label="" tags={node!.tags} allTags={allTags} onChange={(tags) => updateNodeTags(node!.id, tags)} />
        ),
      };
    }

    if (block.kind === "text") {
      return {
        natural: "Text",
        body: <TextBlock value={block.text ?? ""} onChange={(value) => setBlockText(node!.id, block.id, value)} />,
      };
    }

    if (block.kind === "collection") {
      // The heading follows the source, so a block switched from Subpages to
      // Backlinks stops claiming to be the other thing — unless she has given
      // it a title of her own, which BlockShell honours over this.
      const natural =
        block.source === "mentions"
          ? "Backlinks"
          : block.source === "subpages"
            ? "Subpages"
            : block.source === "tags"
              ? "Tagged"
              : "Links";
      return {
        natural,
        body: (
          <CollectionBlock
            block={block}
            node={node!}
            nodes={nodes}
            allTags={allTags}
            onSetSource={(source) => setBlockSource(node!.id, block.id, source)}
            onSetTargets={(ids) => setBlockTargets(node!.id, block.id, ids)}
            onSetTags={(tags) => setBlockTags(node!.id, block.id, tags)}
            onOpen={(id) => selectNode(id)}
          />
        ),
      };
    }

    if (block.kind === "alias") {
      return {
        natural: "Alias",
        body: (
          <AliasBlock
            aliases={node!.aliases ?? []}
            pageName={node!.name}
            onChange={(aliases) => setNodeAliases(node!.id, aliases)}
          />
        ),
      };
    }

    const prop = block.propertyKey ? properties.get(block.propertyKey) : undefined;
    if (!prop) {
      return {
        natural: "Missing property",
        body: <div className="block-missing">This field isn't on the page any more.</div>,
      };
    }
    return { natural: prop.label, body: renderPropertyField(prop) };
  }

  // Only a property she added herself. A template's own fields belong to the
  // template, and "delete" on one would either lie or quietly edit every page
  // of that kind.
  function customPropertyKeyOf(block: Block): string | undefined {
    if (block.kind !== "property" || !block.propertyKey) return undefined;
    const isCustom = (node!.customProperties ?? []).some((spec) => spec.key === block.propertyKey);
    return isCustom ? block.propertyKey : undefined;
  }

  // Confirmed only when there is something to lose. Asking about an empty
  // field she just added by mistake is a dialog for nothing; asking about one
  // with an afternoon's writing in it is the whole point.
  async function deleteProperty(key: string, label: string) {
    const value = node!.properties[key];
    const hasValue = Array.isArray(value) ? value.length > 0 : value !== undefined && value !== "";
    if (hasValue && !(await confirmDestructive(`Delete "${label}" and what's in it? This page only.`))) return;
    removeCustomProperty(node!.id, key);
  }

  function handleApplyTemplate(templateKey: string) {
    void applyTemplate(node!.id, templateKey);
    setTemplateRect(null);
  }

  function handleAddProperty(e: FormEvent) {
    e.preventDefault();
    const trimmed = newPropertyLabel.trim();
    if (!trimmed) return;
    // The store adds the property and the block that shows it in one step —
    // see addCustomProperty. Nothing to add here.
    addCustomProperty(node!.id, trimmed, newPropertyType);
    setNewPropertyLabel("");
    setNewPropertyType("text");
    setIsAddingProperty(false);
  }

  // A suggestion fills the form in rather than committing the property — it's
  // a starting point, not a decision. Carried over from the old panel, where
  // the reasoning was that half of them want a small edit before they're right
  // ("Affiliation" to "Affiliations"), and a click that creates the field
  // outright makes fixing the name a delete and a retype.
  function applySuggestion(label: string, type: CustomPropertySpec["type"]) {
    setNewPropertyLabel(label);
    setNewPropertyType(type);
    newPropertyInput.current?.focus();
    newPropertyInput.current?.select();
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((block) => block.id === active.id);
    const to = blocks.findIndex((block) => block.id === over.id);
    if (from === -1 || to === -1) return;
    reorderBlocks(node!.id, from, to);
  }

  return (
    <div className="properties-panel block-panel">
      {node.templateKey === BLANK_TEMPLATE_KEY && (
        <div className="properties-panel-apply-template">
          <p>This page doesn't have a template yet.</p>
          <button
            type="button"
            className="ui-btn ui-btn-secondary"
            onClick={(e) => setTemplateRect(e.currentTarget.getBoundingClientRect())}
          >
            Apply a template
          </button>
          {templateRect && (
            <TreePopover anchorRect={templateRect} onClose={() => setTemplateRect(null)}>
              <TemplatePicker onSelect={handleApplyTemplate} excludeKeys={["folder", "blank"]} />
            </TreePopover>
          )}
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((block, index) => {
            const { natural, body } = renderBlock(block);
            const customKey = customPropertyKeyOf(block);
            return (
              <BlockShell
                key={block.id}
                id={block.id}
                naturalTitle={natural}
                title={block.title}
                titleShown={block.showTitle !== false}
                color={block.color}
                canMoveUp={index > 0}
                canMoveDown={index < blocks.length - 1}
                onRetitle={(title) => setBlockTitle(node.id, block.id, title)}
                onToggleTitle={() => setBlockTitleShown(node.id, block.id, block.showTitle === false)}
                onColor={(color) => setBlockColor(node.id, block.id, color)}
                onDuplicate={() => duplicateBlock(node.id, block.id)}
                onMove={(direction) => reorderBlocks(node.id, index, index + direction)}
                onRemove={() => removeBlock(node.id, block.id)}
                onDeleteProperty={
                  customKey ? () => void deleteProperty(customKey, natural) : undefined
                }
              >
                {body}
              </BlockShell>
            );
          })}
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
        <button
          type="button"
          className="block-add-trigger"
          onClick={(e) => setAddRect(e.currentTarget.getBoundingClientRect())}
        >
          <Plus size={12} /> Add Block
        </button>
      )}

      {addRect && (
        <TreePopover anchorRect={addRect} onClose={() => setAddRect(null)}>
          <AddBlockMenu
            unshown={unshown}
            onAdd={(kind) => {
              addBlock(node.id, kind);
              setAddRect(null);
            }}
            onAddCollection={(source) => {
              addBlock(node.id, "collection", { source });
              setAddRect(null);
            }}
            onAddProperty={(key) => {
              addBlock(node.id, "property", { propertyKey: key });
              setAddRect(null);
            }}
            onNewProperty={() => {
              setIsAddingProperty(true);
              setAddRect(null);
            }}
          />
        </TreePopover>
      )}

      <PropertyTimestamps createdAt={node.createdAt} updatedAt={node.updatedAt} />
    </div>
  );
}
