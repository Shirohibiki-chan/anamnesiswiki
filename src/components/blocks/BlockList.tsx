// An ordered list of blocks, drawn wherever it is asked to be drawn.
// Phase 19.5. See docs/plan.md.
//
// **This is the half of the old BlockPanel that does not know it is the
// sidebar.** The panel used to be one component that found the selected page,
// derived its blocks and drew them; Phase 19.5 puts blocks in the page body
// and inside an infobox as well, so the drawing half has to accept *a* block
// list rather than reach for *the* one. Everything about where the list came
// from — the selection, the empty states, Add Block, the template prompt —
// stayed behind in BlockPanel.
//
// **It takes the node as well as the blocks, and that is not a leftover.** An
// image block shows the page's picture, a tags block its tags, an alias block
// its other names: those blocks are windows onto the page they sit on, so a
// block in the page body reads the same node the sidebar does. What changed is
// that the caller says which node, instead of this file asking the store.
//
// **Ordering comes in as ids, not indices.** A list drawn here may be part of
// a longer one — an infobox holds some of a page's blocks, not all of them —
// and an index into what is on screen is not an index into `node.blocks`. So
// this file says which block moved where, and the caller works out what that
// means for storage.
import { useState, type ReactNode } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { getCollectionSourceOption } from "../../constants/collection-sources";
import { getMeterStyleOption } from "../../constants/meter-styles";
import type { Block, Node, PropertyOption } from "../../constants/schema";
import { useDialogs } from "../../hooks/use-dialogs";
import { useProject } from "../../hooks/use-project";
import { usePageImage } from "../../hooks/use-page-image";
import { useAllTags, useKnownOptions } from "../../hooks/use-property-index";
import { isPipMeter, meterPip, meterSegmented, metersOf } from "../../services/meter-service";
import type { RenderableProperty } from "../../services/property-service";
import { DateProperty } from "../properties/DateProperty";
import { ImageSlot } from "../properties/ImageSlot";
import { NumberProperty } from "../properties/NumberProperty";
import { RefsProperty } from "../properties/RefsProperty";
import { SelectProperty } from "../properties/SelectProperty";
import { TagsProperty } from "../properties/TagsProperty";
import { TextProperty } from "../properties/TextProperty";
import { TreePopover } from "../tree/TreePopover";
import { AliasBlock } from "./AliasBlock";
import { BlockShell } from "./BlockShell";
import { CollectionBlock } from "./CollectionBlock";
import { IconPicker } from "./IconPicker";
import { MeterBlock } from "./MeterBlock";
import { TextBlock } from "./TextBlock";
import "../properties/properties.css";
import "./blocks.css";

type BlockListProps = {
  /** The page these blocks belong to — the one whose picture, tags and aliases they show. */
  node: Node;
  /** The blocks to draw, in the order to draw them. May be part of a longer list. */
  blocks: Block[];
  /** Every field the page has, keyed for lookup: a property block stores only a key. */
  properties: Map<string, RenderableProperty>;
  /** One block was dragged onto another. Both ids are in `blocks`. */
  onReorder: (activeId: string, overId: string) => void;
  /** Move up or down by one, from the block's own menu. */
  onMove: (blockId: string, direction: -1 | 1) => void;
};

export function BlockList({ node, blocks, properties, onReorder, onMove }: BlockListProps) {
  const {
    nodes,
    selectNode,
    updateNodeProperty,
    updateNodeTags,
    updateCustomProperty,
    removePropertyOption,
    deletePageProperty,
    removeBlock,
    duplicateBlock,
    setBlockTitle,
    setBlockTitleShown,
    setBlockColor,
    setBlockText,
    setBlockSource,
    setBlockTargets,
    setBlockTags,
    setBlockMeter,
    setBlockMeterText,
    setBlockMeterMax,
    setBlockMeterFace,
    setBlockMeterSegmented,
    setBlockMeterPip,
    addMeter,
    duplicateMeter,
    removeMeter,
    editMeter,
    editMeters,
    setNodeAliases,
    setPageImageBlock,
  } = useProject();
  const { confirmDestructive } = useDialogs();
  const knownOptions = useKnownOptions();
  const allTags = useAllTags();
  // Asked of the page rather than of `blocks`: this list may be one block of a
  // page that has three, and which of them is the page's picture is a question
  // about all of them. See use-page-image.ts.
  const { pictureOf } = usePageImage(node);

  // Which block's rating symbol is being chosen. The picker is a popover over
  // the list rather than inside the block, because the menu that opens it has
  // already closed by the time it appears.
  const [pipBlockId, setPipBlockId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // The label is always empty: the block's own title strip draws the heading
  // now, so a field drawing its own would render it twice. See BlockShell.
  function renderPropertyField(prop: RenderableProperty) {
    const raw = node.properties[prop.key];

    if (prop.type === "refs") {
      return (
        <RefsProperty
          label=""
          nodeIds={Array.isArray(raw) ? (raw as string[]) : []}
          excludeNodeId={node.id}
          nodes={nodes}
          onChange={(next) => updateNodeProperty(node.id, prop.key, next)}
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
          knownOptions={knownOptions(node.templateKey, prop.label)}
          value={value}
          onChange={(ids) => updateNodeProperty(node.id, prop.key, isMulti ? ids : (ids[0] ?? undefined))}
          onOptionsChange={(options: PropertyOption[]) => updateCustomProperty(node.id, prop.key, { options })}
          onRemoveOption={(optionId) => removePropertyOption(node.id, prop.key, optionId)}
        />
      );
    }

    if (prop.type === "number") {
      return (
        <NumberProperty
          label=""
          value={typeof raw === "number" ? raw : undefined}
          placeholder={prop.placeholder}
          onChange={(value) => updateNodeProperty(node.id, prop.key, value)}
        />
      );
    }

    if (prop.type === "date") {
      return (
        <DateProperty
          label=""
          value={typeof raw === "string" ? raw : ""}
          placeholder={prop.placeholder}
          onChange={(value) => updateNodeProperty(node.id, prop.key, value)}
        />
      );
    }

    return (
      <TextProperty
        label=""
        value={typeof raw === "string" ? raw : ""}
        placeholder={prop.placeholder}
        multiline={prop.type === "longtext"}
        onChange={(value) => updateNodeProperty(node.id, prop.key, value)}
      />
    );
  }

  // A property block whose key no longer resolves renders as a stub rather
  // than being skipped. Skipping it would leave a gap nothing explains and a
  // block the user can't reach to remove.
  function renderBlock(block: Block): { natural: string; body: ReactNode } {
    if (block.kind === "image") {
      // **Its own picture, unless it is the one holding the page's** — Phase
      // 19.5, and the whole of what changed: two image blocks on a page are two
      // photographs now, not one shown twice.
      const picture = pictureOf(block);
      return {
        natural: "Image",
        body: (
          <ImageSlot
            nodeId={node.id}
            blockId={block.id}
            image={picture.image}
            imageAlt={picture.imageAlt}
            imageFocusY={picture.imageFocusY}
            hasBanner={node.banner !== undefined}
          />
        ),
      };
    }

    if (block.kind === "tags") {
      return {
        natural: "Tags",
        body: (
          <TagsProperty label="" tags={node.tags} allTags={allTags} onChange={(tags) => updateNodeTags(node.id, tags)} />
        ),
      };
    }

    if (block.kind === "text") {
      return {
        natural: "Text",
        body: <TextBlock value={block.text ?? ""} onChange={(value) => setBlockText(node.id, block.id, value)} />,
      };
    }

    if (block.kind === "collection") {
      // The heading *is* the source's name — one name per block, the way a
      // meter's heading is its shape. It uses the names Add Block offers, so
      // a block you added as a Tag index doesn't come back calling itself
      // "Tagged". Renaming still wins over this.
      return {
        natural: getCollectionSourceOption(block.source).label,
        body: (
          <CollectionBlock
            block={block}
            node={node}
            nodes={nodes}
            allTags={allTags}
            onSetTargets={(ids) => setBlockTargets(node.id, block.id, ids)}
            onSetTags={(tags) => setBlockTags(node.id, block.id, tags)}
            onOpen={(id) => selectNode(id)}
          />
        ),
      };
    }

    if (block.kind === "meter") {
      // The heading is the shape's name — one name per section, in the top
      // left, the way the reference does it. The first cut drew "Meter" here
      // and repeated the shape on a pill underneath, which is two names for
      // one thing. Renaming still wins over this, and is the normal case: a
      // block called "Circle" is a widget and one called after what it
      // measures is worldbuilding.
      return {
        natural: getMeterStyleOption(block.meter).label,
        body: (
          <MeterBlock
            block={block}
            onEdit={(meterId, patch) => editMeter(node.id, block.id, meterId, patch)}
            onEditMany={(patches) => editMeters(node.id, block.id, patches)}
            onRemove={(meterId) => removeMeter(node.id, block.id, meterId)}
            onAdd={() => addMeter(node.id, block.id)}
          />
        ),
      };
    }

    if (block.kind === "alias") {
      return {
        natural: "Alias",
        body: (
          <AliasBlock
            aliases={node.aliases ?? []}
            pageName={node.name}
            onChange={(aliases) => setNodeAliases(node.id, aliases)}
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

  // Every property block can be deleted, a template's fields included. Her
  // call, 2026-08-21: a page made from a template is a copy, and the app
  // already promises that editing a template leaves existing pages alone — so
  // a field sitting on her page is hers to throw away.
  function propertyKeyOf(block: Block): string | undefined {
    return block.kind === "property" ? block.propertyKey : undefined;
  }

  // Confirmed only when there is something to lose. Asking about an empty
  // field she just added by mistake is a dialog for nothing; asking about one
  // with an afternoon's writing in it is the whole point.
  //
  // The wording differs by what "gone" means. A field she invented is gone
  // outright, because nothing else defines it. One from the template can be
  // added back empty from Add Block, and saying so is the difference between
  // a decision and a gamble.
  async function deleteProperty(key: string, label: string) {
    const value = node.properties[key];
    const hasValue = Array.isArray(value) ? value.length > 0 : value !== undefined && value !== "";
    const isCustom = (node.customProperties ?? []).some((spec) => spec.key === key);
    if (hasValue) {
      const fate = isCustom ? "This page only, and it can't be brought back." : "You can add it back empty afterwards.";
      if (!(await confirmDestructive(`Delete "${label}" and what's in it? ${fate}`))) return;
    }
    deletePageProperty(node.id, key);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((block, index) => {
            const { natural, body } = renderBlock(block);
            const propertyKey = propertyKeyOf(block);
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
                onMove={(direction) => onMove(block.id, direction)}
                onRemove={() => removeBlock(node.id, block.id)}
                onDeleteProperty={propertyKey ? () => void deleteProperty(propertyKey, natural) : undefined}
                pageImage={
                  block.kind === "image"
                    ? {
                        isPageImage: pictureOf(block).isPageImage,
                        onUse: () => setPageImageBlock(node.id, block.id),
                      }
                    : undefined
                }
                collection={
                  block.kind === "collection"
                    ? {
                        source: block.source ?? "manual",
                        onSetSource: (source) => setBlockSource(node.id, block.id, source),
                      }
                    : undefined
                }
                meter={
                  block.kind === "meter"
                    ? {
                        style: block.meter ?? "bar",
                        textShown: block.showText !== false,
                        maxShown: block.showMax !== false,
                        face: block.face ?? "icon",
                        segmented: block.segmented === true,
                        onSetStyle: (style) => setBlockMeter(node.id, block.id, style),
                        onSetFace: (face) => setBlockMeterFace(node.id, block.id, face),
                        segmentedOfMeter: (meterId) => {
                          const entry = metersOf(block).find((m) => m.id === meterId);
                          return entry ? meterSegmented(block, entry) : block.segmented === true;
                        },
                        // **A reading that agrees with its block stores
                        // nothing.** Toggling one back into agreement clears
                        // the override rather than pinning the same answer, so
                        // the block's own setting keeps reaching it afterwards
                        // — the same rule every other block field follows.
                        onToggleSegments: (meterId) => {
                          if (!meterId) {
                            setBlockMeterSegmented(node.id, block.id, block.segmented !== true);
                            return;
                          }
                          const entry = metersOf(block).find((m) => m.id === meterId);
                          if (!entry) return;
                          const next = !meterSegmented(block, entry);
                          editMeter(node.id, block.id, meterId, {
                            segmented: next === (block.segmented === true) ? undefined : next,
                          });
                        },
                        pip: isPipMeter(block.meter ?? "bar") ? meterPip(block) : undefined,
                        onPickPip: isPipMeter(block.meter ?? "bar") ? () => setPipBlockId(block.id) : undefined,
                        onAdd: () => addMeter(node.id, block.id),
                        onDuplicateMeter: (meterId) => duplicateMeter(node.id, block.id, meterId),
                        onRemoveMeter: (meterId) => removeMeter(node.id, block.id, meterId),
                        colorOfMeter: (meterId) => metersOf(block).find((m) => m.id === meterId)?.color,
                        onSetMeterColor: (meterId, color) => editMeter(node.id, block.id, meterId, { color }),
                        onToggleText: () => setBlockMeterText(node.id, block.id, block.showText === false),
                        onToggleMax: () => setBlockMeterMax(node.id, block.id, block.showMax === false),
                      }
                    : undefined
                }
              >
                {body}
              </BlockShell>
            );
          })}
        </SortableContext>
      </DndContext>

      {pipBlockId && (
        <TreePopover anchorRect={new DOMRect(160, 160, 0, 0)} onClose={() => setPipBlockId(null)}>
          <IconPicker
            value={blocks.find((b) => b.id === pipBlockId)?.pip}
            onPick={(pip) => {
              setBlockMeterPip(node.id, pipBlockId, pip);
              setPipBlockId(null);
            }}
          />
        </TreePopover>
      )}
    </>
  );
}
