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
import { FileText, Image as ImageIcon, Link2, Tags } from "lucide-react";
import type { BlockKind } from "../../constants/schema";
import type { RenderableProperty } from "../../services/property-service";

type AddBlockMenuProps = {
  /** Fields the page has that no block is currently showing. */
  unshown: RenderableProperty[];
  onAdd: (kind: BlockKind) => void;
  onAddProperty: (key: string) => void;
  onNewProperty: () => void;
};

export function AddBlockMenu({ unshown, onAdd, onAddProperty, onNewProperty }: AddBlockMenuProps) {
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
      <button type="button" onClick={() => onAdd("link")}>
        <Link2 size={13} /> Link block
      </button>

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
