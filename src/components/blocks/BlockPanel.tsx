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
//
// **Drawing the blocks is BlockList's job as of Phase 19.5**, because the page
// body and the infobox draw the same blocks and none of them are the sidebar.
// What is left here is everything that *is* the sidebar: which page is showing,
// what an empty one says, the template prompt, Add Block, and the timestamps at
// the bottom. This file is also where a block's position in `node.blocks` is
// worked out, since it is the one holding the whole list.
import { useRef, useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { getPropertySuggestions } from "../../constants/property-suggestions";
import {
  BLANK_TEMPLATE_KEY,
  FOLDER_TEMPLATE_KEY,
  PROPERTY_TYPE_LABELS,
  type CustomPropertySpec,
} from "../../constants/schema";
import { useBlocks } from "../../hooks/use-blocks";
import { useProject } from "../../hooks/use-project";
import { TemplatePicker } from "../tree/TemplatePicker";
import { TreePopover } from "../tree/TreePopover";
import { AddBlockMenu } from "./AddBlockMenu";
import { BlockList } from "./BlockList";
import { PropertyTimestamps } from "../properties/PropertyTimestamps";
import "../properties/properties.css";
import "./blocks.css";

export function BlockPanel() {
  const { project, nodes, applyTemplate, addCustomProperty, addBlock, reorderBlocks, setTemplatePromptHidden } =
    useProject();
  const selectedId = project?.selectedId ?? null;
  const node = selectedId ? nodes[selectedId] : undefined;
  const { blocks, inSidebar, properties, unshown } = useBlocks(node);

  const [templateRect, setTemplateRect] = useState<DOMRect | null>(null);
  const [addRect, setAddRect] = useState<DOMRect | null>(null);
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [newPropertyLabel, setNewPropertyLabel] = useState("");
  const [newPropertyType, setNewPropertyType] = useState<CustomPropertySpec["type"]>("text");
  const newPropertyInput = useRef<HTMLInputElement | null>(null);

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

  // BlockList reports which block moved onto which, as ids, and the panel turns
  // that into positions in `node.blocks`.
  //
  // **Since Phase 19.5 those two lists really are different**, which is what the
  // split was for: a block dragged into the page body is still in `node.blocks`
  // and no longer on screen here, so the third row in the sidebar may be the
  // fifth record on disk. Looking the ids up in `blocks` rather than `inSidebar`
  // is the whole translation — everything on screen is in both.
  function handleReorder(activeId: string, overId: string) {
    const from = blocks.findIndex((block) => block.id === activeId);
    const to = blocks.findIndex((block) => block.id === overId);
    if (from === -1 || to === -1) return;
    reorderBlocks(node!.id, from, to);
  }

  // **Up and down mean the next one *in the sidebar*, not the next record.**
  // Stepping one index through `node.blocks` can land on a block that is in the
  // page body, which looks from here like a menu item that did nothing. So the
  // neighbour is found on screen and then translated back.
  function handleMove(blockId: string, direction: -1 | 1) {
    const onScreen = inSidebar.findIndex((block) => block.id === blockId);
    const neighbour = inSidebar[onScreen + direction];
    if (onScreen === -1 || !neighbour) return;
    handleReorder(blockId, neighbour.id);
  }

  return (
    <div
      className="properties-panel block-panel"
      // Right-clicking the panel itself — the gaps between blocks, the header
      // strip — offers Add Block. A block's own right-click stops the event
      // before it gets here, so the two never both fire.
      onContextMenu={(e) => {
        e.preventDefault();
        setAddRect(new DOMRect(e.clientX, e.clientY, 0, 0));
      }}
    >
      {/* **Dismissable, and it stays dismissed.** A page that means to stay
          blank was being asked about it every time it was opened, with the
          prompt sitting in the way of the blocks underneath. The way back is
          Add Block, which carries the same picker — see AddBlockMenu, and the
          note on `hideTemplatePrompt` about why that route had to exist first. */}
      {node.templateKey === BLANK_TEMPLATE_KEY && !node.hideTemplatePrompt && (
        <div className="properties-panel-apply-template">
          <button
            type="button"
            className="properties-panel-apply-dismiss"
            aria-label="Don't ask about a template for this page"
            title="Don't ask again on this page"
            onClick={() => setTemplatePromptHidden(node.id, true)}
          >
            <X size={12} />
          </button>
          <p>This page doesn't have a template yet.</p>
          <button
            type="button"
            className="ui-btn ui-btn-secondary"
            onClick={(e) => setTemplateRect(e.currentTarget.getBoundingClientRect())}
          >
            Apply a template
          </button>
        </div>
      )}
      {templateRect && (
        <TreePopover anchorRect={templateRect} onClose={() => setTemplateRect(null)}>
          <TemplatePicker onSelect={handleApplyTemplate} excludeKeys={["folder", "blank"]} />
        </TreePopover>
      )}

      <BlockList
        node={node}
        blocks={inSidebar}
        properties={properties}
        onReorder={handleReorder}
        onMove={handleMove}
      />

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

      {/* The empty space under the last block answers a right-click too, with
          the same menu the button opens. Right-clicking where a block would go
          is how you ask for one, and it was doing nothing. */}
      <div
        className="block-panel-space"
        onContextMenu={(e) => {
          e.preventDefault();
          setAddRect(new DOMRect(e.clientX, e.clientY, 0, 0));
        }}
      />

      {addRect && (
        <TreePopover anchorRect={addRect} onClose={() => setAddRect(null)}>
          <AddBlockMenu
            unshown={unshown}
            onApplyTemplate={
              node.templateKey === BLANK_TEMPLATE_KEY
                ? () => {
                    // Anchored where the menu was, since the button that would
                    // normally anchor it may have been dismissed.
                    setTemplateRect(addRect);
                    setAddRect(null);
                  }
                : undefined
            }
            onAdd={(kind) => {
              addBlock(node.id, kind);
              setAddRect(null);
            }}
            onAddCollection={(source) => {
              addBlock(node.id, "collection", { source });
              setAddRect(null);
            }}
            onAddMeter={(style) => {
              addBlock(node.id, "meter", { meter: style });
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
