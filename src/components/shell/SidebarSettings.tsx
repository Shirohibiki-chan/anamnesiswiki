// Settings → Sidebar. How the page tree behaves, as opposed to how it looks.
import { usePropertiesPanelDefault, useTreeDoubleClick, usePreferenceActions } from "../../hooks/use-preferences";
import {
  PROPERTIES_PANEL_DEFAULTS,
  TREE_DOUBLE_CLICK_ACTIONS,
  type PropertiesPanelDefault,
  type TreeDoubleClickAction,
} from "../../services/preferences-service";

const DOUBLE_CLICK_LABELS: Record<TreeDoubleClickAction, { label: string; hint: string }> = {
  expand: { label: "Opens It", hint: "Shows what's inside, the way a folder works everywhere else." },
  rename: { label: "Renames It", hint: "What it did before. Opening is still the chevron, or the arrow keys." },
};

const PANEL_LABELS: Record<PropertiesPanelDefault, { label: string; hint: string }> = {
  open: { label: "Open by Default", hint: "Every page starts with it showing. Hide it on a page and that page stays hidden." },
  closed: { label: "Closed by Default", hint: "Every page starts without it. Show it on a page and that page remembers." },
};

export function SidebarSettings() {
  const treeDoubleClick = useTreeDoubleClick();
  const propertiesPanel = usePropertiesPanelDefault();
  const { setTreeDoubleClick, setPropertiesPanelDefault } = usePreferenceActions();

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

      {/* The panel on the right, remembered per page — this is only the
          default for a page she has not decided about yet. */}
      <fieldset className="sidebar-setting" data-setting="properties-panel">
        <legend className="sidebar-setting-label">The properties panel</legend>
        <p className="sidebar-setting-blurb">
          Each page remembers on its own whether the panel on the right is showing. This is what a page does before
          you have hidden or shown it there.
        </p>
        {PROPERTIES_PANEL_DEFAULTS.map((mode) => (
          <label key={mode} className="sidebar-setting-option">
            <input
              type="radio"
              name="properties-panel"
              value={mode}
              checked={propertiesPanel === mode}
              onChange={() => setPropertiesPanelDefault(mode)}
            />
            <span className="sidebar-setting-option-text">
              <span className="sidebar-setting-option-label">{PANEL_LABELS[mode].label}</span>
              <span className="sidebar-setting-option-hint">{PANEL_LABELS[mode].hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
