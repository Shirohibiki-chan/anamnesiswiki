// Settings → Sidebar. How the page tree behaves, as opposed to how it looks.
import { useTreeDoubleClick, usePreferenceActions } from "../../hooks/use-preferences";
import { TREE_DOUBLE_CLICK_ACTIONS, type TreeDoubleClickAction } from "../../services/preferences-service";

const DOUBLE_CLICK_LABELS: Record<TreeDoubleClickAction, { label: string; hint: string }> = {
  expand: { label: "Opens it", hint: "Shows what's inside, the way a folder works everywhere else." },
  rename: { label: "Renames it", hint: "What it did before. Opening is still the chevron, or the arrow keys." },
};

export function SidebarSettings() {
  const treeDoubleClick = useTreeDoubleClick();
  const { setTreeDoubleClick } = usePreferenceActions();

  return (
    <div className="appearance-settings">
      <fieldset className="sidebar-setting" data-setting="tree-double-click">
        <legend className="sidebar-setting-label">Double-clicking a page in the sidebar</legend>
        <p className="sidebar-setting-blurb">
          Renaming is always on the right-click menu, whichever of these is on — so this is about which one is a
          double-click away, not which one you can get to.
        </p>
        {TREE_DOUBLE_CLICK_ACTIONS.map((action) => (
          <label key={action} className="sidebar-setting-option">
            <input
              type="radio"
              name="tree-double-click"
              value={action}
              checked={treeDoubleClick === action}
              onChange={() => setTreeDoubleClick(action)}
            />
            <span className="sidebar-setting-option-text">
              <span className="sidebar-setting-option-label">{DOUBLE_CLICK_LABELS[action].label}</span>
              <span className="sidebar-setting-option-hint">{DOUBLE_CLICK_LABELS[action].hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
