// Pinned pages as a row of tiles under the tree search — LegendKeeper's "Set
// as shortcut", which is on every row's right-click menu.
//
// Deliberately a rail of icons rather than a list of names. The pages that
// earn a pin are the handful you open constantly, and for those the name is
// something you already know; a list would cost a line of sidebar height each
// for information you don't need to read. The tooltip carries the name for the
// times you do.
import { getTemplateIcon } from "../../constants/icons";
import { getPaletteHex } from "../../constants/palette";
import { useEffectiveColor } from "../../hooks/use-tree-data";
import { useNode } from "../../hooks/use-project";

type BookmarksRailProps = {
  pinnedIds: string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUnpin: (id: string) => void;
};

function BookmarkTile({
  nodeId,
  isSelected,
  onSelect,
  onUnpin,
}: {
  nodeId: string;
  isSelected: boolean;
  onSelect: () => void;
  onUnpin: () => void;
}) {
  const node = useNode(nodeId);
  const { color: effectiveKey } = useEffectiveColor(nodeId);
  // A pin whose page is gone renders nothing rather than a broken tile. The
  // store prunes on delete, so this only covers the gap between a project
  // loading and its nodes being there.
  if (!node) return null;

  const Icon = getTemplateIcon(node.templateKey);
  // Inherited, not just the page's own — a tile for a page inside a coloured
  // folder should read as belonging to it, the same way its tree row does.
  const effectiveHex = getPaletteHex(effectiveKey ?? undefined);
  return (
    <button
      type="button"
      className={`bookmark-tile${isSelected ? " is-selected" : ""}`}
      style={effectiveHex ? { color: effectiveHex } : undefined}
      title={node.name}
      aria-label={node.name}
      aria-current={isSelected ? "page" : undefined}
      onClick={onSelect}
      // Middle-click, the same gesture that closes a browser tab. Not the only
      // way to unpin — the right-click menu it was set from is still the
      // obvious one — but the rail is where you'd think to reach for it.
      onAuxClick={(event) => {
        if (event.button !== 1) return;
        event.preventDefault();
        onUnpin();
      }}
    >
      {/* eslint-disable-next-line react-hooks/static-components -- getTemplateIcon reads a fixed lookup table, so it returns the same stable component reference for a given templateKey every render */}
      <Icon size={15} />
    </button>
  );
}

export function BookmarksRail({ pinnedIds, selectedId, onSelect, onUnpin }: BookmarksRailProps) {
  // No pins, no rail — and no empty-state prompt either. Somewhere to put
  // shortcuts is worth nothing to someone who hasn't made one, and a strip of
  // instructions above the tree would be paid for daily by everyone who has.
  if (pinnedIds.length === 0) return null;

  return (
    <div className="bookmarks-rail" role="toolbar" aria-label="Shortcuts">
      {pinnedIds.map((id) => (
        <BookmarkTile
          key={id}
          nodeId={id}
          isSelected={id === selectedId}
          onSelect={() => onSelect(id)}
          onUnpin={() => onUnpin(id)}
        />
      ))}
    </div>
  );
}
