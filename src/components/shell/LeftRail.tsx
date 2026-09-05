// The rail down the left edge of the window. Phase 21.
//
// **It holds what belongs to the app, not what belongs to the page.** Project,
// Templates and Assets choose what the sidebar beside it is showing; search,
// the project switcher and settings are errands that have nothing to do with
// whichever page is open. What stayed in the bar above the page is the other
// kind — back and forward, the save and history indicators, the properties
// toggle — because every one of those is about the page being read, and when
// the panes of Phase 21.5 arrive each pane will need its own set.
//
// **The three panel buttons used to be text tabs inside the sidebar** (see
// TreeSidebar, which now takes the choice as a prop). They moved because the
// rail is where the choice belongs once there is a rail: a tab strip that only
// ever sits above one panel is a rail with one column's reach.
//
// **Icon-only, so the shortcut has nowhere to be written down but the tooltip.**
// The search button used to carry a visible `Ctrl+K`, and it was the only place
// in the app that said so. The label and the title still say it, which is what
// a screen reader and a hover get; if search turns out to be hard to find, that
// is the thing to put back rather than the whole bar.
import { FolderOpen, FolderTree, Images, LayoutTemplate, Search } from "lucide-react";
import { useShortcutLabel } from "../../hooks/use-shortcuts";
import { SettingsButton } from "./SettingsButton";

/** Which panel the sidebar is showing. Lives in AppLayout; the rail chooses it. */
export type SidebarPanel = "project" | "templates" | "assets";

const PANELS = [
  { panel: "project", label: "Project", Icon: FolderTree },
  { panel: "templates", label: "Templates", Icon: LayoutTemplate },
  { panel: "assets", label: "Assets", Icon: Images },
] as const satisfies readonly { panel: SidebarPanel; label: string; Icon: typeof FolderTree }[];

type LeftRailProps = {
  panel: SidebarPanel;
  onSelectPanel: (panel: SidebarPanel) => void;
  onOpenSearch: () => void;
  onSwitchProject: () => void;
};

export function LeftRail({ panel, onSelectPanel, onOpenSearch, onSwitchProject }: LeftRailProps) {
  const searchShortcut = useShortcutLabel("search");

  return (
    <nav className="left-rail" aria-label="Main">
      <div className="left-rail-group">
        {PANELS.map(({ panel: which, label, Icon }) => (
          <button
            key={which}
            type="button"
            className="ui-icon-btn ui-icon-btn-lg left-rail-btn"
            // `.ui-icon-btn` takes its accent from aria-pressed, so the selected
            // look is not a class this has to remember to pass.
            aria-pressed={panel === which}
            aria-label={label}
            title={label}
            onClick={() => onSelectPanel(which)}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>

      {/* Pushed to the bottom by the group above growing — the errands sit away
          from the panel switches so the two groups do not read as one list. */}
      <div className="left-rail-group">
        <button
          type="button"
          className="ui-icon-btn ui-icon-btn-lg left-rail-btn"
          aria-label={`Search (${searchShortcut})`}
          title={`Search (${searchShortcut})`}
          onClick={onOpenSearch}
        >
          <Search size={18} />
        </button>
        <button
          type="button"
          className="ui-icon-btn ui-icon-btn-lg left-rail-btn"
          aria-label="Switch project"
          title="Switch project"
          onClick={onSwitchProject}
        >
          <FolderOpen size={18} />
        </button>
        <SettingsButton />
      </div>
    </nav>
  );
}
