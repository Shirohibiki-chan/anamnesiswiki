// What "+ Add Block" offers. Phase 18a.
//
// Grouped the way the reference does it — Media, then Blocks — because the
// list only gets longer: Phase 18b adds the three index blocks and an alias,
// and 18c adds six meters. A flat list of eighteen things would need grouping
// then anyway, and regrouping a menu people have learned is worse than
// starting grouped.
//
// The properties section is the way back to a field whose block was removed.
// Removing a property block keeps the value on purpose, so without this the
// data would be stranded where only the file on disk shows it.
import {
  AtSign,
  FileText,
  Image as ImageIcon,
  LayoutTemplate,
  Link2,
  ListTree,
  Sparkles,
  Tags,
  Tags as TagsIcon,
} from "lucide-react";
import { METER_STYLES } from "../../constants/meter-styles";
import type { BlockKind, CollectionSource, MeterStyle } from "../../constants/schema";
import type { RenderableProperty } from "../../services/property-service";

type AddBlockMenuProps = {
  /** Fields the page has that no block is currently showing. */
  unshown: RenderableProperty[];
  onAdd: (kind: BlockKind) => void;
  /**
   * Present only on a page with no template yet.
   *
   * **This is the reason the prompt above the panel can be dismissed at all.**
   * Before it existed that prompt was the only route to applying a template to
   * a page that already exists, so sending it away would have stranded the
   * page. See `hideTemplatePrompt` in schema.ts.
   */
  onApplyTemplate?: () => void;
  onAddCollection: (source: CollectionSource) => void;
  onAddMeter: (style: MeterStyle) => void;
  onAddProperty: (key: string) => void;
  /**
   * Absent inside an infobox, where there is nowhere to put the form it opens.
   * **The button is hidden rather than made inert** — a menu item that does
   * nothing reads as broken, and the sidebar still has the full route.
   */
  onNewProperty?: () => void;
};

// The meters are one block kind with a shape setting, but they are offered as
// one entry each: nobody adding a rating wants to add a progress bar and then
// go looking for where to change it. The shape stays switchable afterwards —
// see MeterBlock.
//
// **Read from METER_STYLES rather than listed again here.** This menu kept its
// own copy and a seventh shape went into the constants without appearing in
// it, which is exactly the disagreement that file exists to prevent.

export function AddBlockMenu({
  unshown,
  onAdd,
  onApplyTemplate,
  onAddCollection,
  onAddMeter,
  onAddProperty,
  onNewProperty,
}: AddBlockMenuProps) {
  return (
    <div className="tree-context-menu block-add-menu">
      {onApplyTemplate && (
        <>
          <button type="button" onClick={onApplyTemplate}>
            <LayoutTemplate size={13} /> Apply a template
          </button>
          <div className="block-menu-separator" />
        </>
      )}

      <div className="tree-context-menu-heading">Media</div>
      <button type="button" onClick={() => onAdd("image")}>
        <ImageIcon size={13} /> Image
      </button>

      <div className="tree-context-menu-heading">Blocks</div>
      <button type="button" onClick={() => onAdd("text")}>
        <FileText size={13} /> Text block
      </button>
      <button type="button" onClick={() => onAdd("tags")}>
        <Tags size={13} /> Tags
      </button>
      <button type="button" onClick={() => onAddCollection("manual")}>
        <Link2 size={13} /> Manual links
      </button>
      <button type="button" onClick={() => onAddCollection("subpages")}>
        <ListTree size={13} /> Subpage index
      </button>
      <button type="button" onClick={() => onAddCollection("tags")}>
        <TagsIcon size={13} /> Tag index
      </button>
      {/* Named Backlinks rather than Mentions because that is the word she
          went looking for. Same block, same source picker underneath. */}
      <button type="button" onClick={() => onAddCollection("mentions")}>
        <Sparkles size={13} /> Backlinks
      </button>
      <button type="button" onClick={() => onAdd("alias")}>
        <AtSign size={13} /> Alias
      </button>

      <div className="tree-context-menu-heading">Meters</div>
      {METER_STYLES.map((meter) => (
        <button key={meter.key} type="button" onClick={() => onAddMeter(meter.key)}>
          <meter.icon size={13} /> {meter.label}
        </button>
      ))}

      {/* **A heading over nothing is worse than a missing section.** Inside an
          infobox there is no New property button, so a page whose fields are
          all already shown left the word Properties sitting at the bottom of
          the menu with an empty space under it, which reads as a list that
          failed to load rather than as a list with nothing in it. */}
      {(onNewProperty || unshown.length > 0) && (
        <>
          <div className="tree-context-menu-heading">Properties</div>
          {onNewProperty && (
            <button type="button" onClick={onNewProperty}>
              + New property
            </button>
          )}
          {unshown.map((prop) => (
            <button key={prop.key} type="button" onClick={() => onAddProperty(prop.key)}>
              {prop.label}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
