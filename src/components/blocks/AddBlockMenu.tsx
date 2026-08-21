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
  Circle,
  Coins,
  Donut,
  FileText,
  Gauge,
  Image as ImageIcon,
  Link2,
  ListTree,
  RectangleHorizontal,
  Sparkles,
  Star,
  Tags,
  Tags as TagsIcon,
} from "lucide-react";
import type { BlockKind, CollectionSource, MeterStyle } from "../../constants/schema";
import type { RenderableProperty } from "../../services/property-service";

type AddBlockMenuProps = {
  /** Fields the page has that no block is currently showing. */
  unshown: RenderableProperty[];
  onAdd: (kind: BlockKind) => void;
  onAddCollection: (source: CollectionSource) => void;
  onAddMeter: (style: MeterStyle) => void;
  onAddProperty: (key: string) => void;
  onNewProperty: () => void;
};

// The six meters are one block kind with a shape setting, but they are offered
// as six entries: nobody adding a rating wants to add a progress bar and then
// go looking for where to change it. The shape stays switchable afterwards —
// see MeterBlock.
const METERS: { style: MeterStyle; label: string; icon: typeof Circle }[] = [
  { style: "bar", label: "Progress bar", icon: RectangleHorizontal },
  { style: "circle", label: "Circle", icon: Circle },
  { style: "semicircle", label: "Semi-circle", icon: Donut },
  { style: "gauge", label: "Gauge", icon: Gauge },
  { style: "rating", label: "Rating", icon: Star },
  { style: "pool", label: "Token pool", icon: Coins },
];

export function AddBlockMenu({
  unshown,
  onAdd,
  onAddCollection,
  onAddMeter,
  onAddProperty,
  onNewProperty,
}: AddBlockMenuProps) {
  return (
    <div className="tree-context-menu block-add-menu">
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
      {METERS.map((meter) => (
        <button key={meter.style} type="button" onClick={() => onAddMeter(meter.style)}>
          <meter.icon size={13} /> {meter.label}
        </button>
      ))}

      <div className="tree-context-menu-heading">Properties</div>
      <button type="button" onClick={onNewProperty}>
        + New property
      </button>
      {unshown.map((prop) => (
        <button key={prop.key} type="button" onClick={() => onAddProperty(prop.key)}>
          {prop.label}
        </button>
      ))}
    </div>
  );
}
