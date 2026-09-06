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
// **Every button says its own word, and the first version of this rail did not.**
// It shipped icon-only at 48px wide, with the name of each button reachable only
// by hovering it, and the user could not tell what any of them were 2026-09-05.
// A tooltip is not a label: it costs a hover and a wait to read, it is invisible
// to anyone scanning the rail, and it is the only thing on screen naming the
// button underneath it. The words are on screen now and the rail is as wide as
// it has to be to hold them — which is the trade, and it is the right way round.
//
// **A word that does not fit wraps rather than truncating.** `Switch project` is
// two lines at this width and that is fine; an ellipsis in a six-word interface
// would be hiding the one thing the label exists to say.
import { FolderOpen, FolderTree, Images, LayoutTemplate, Search } from "lucide-react";
import { useShortcutLabel } from "../../hooks/use-shortcuts";
import { NavButtons } from "./NavButtons";
import { RailButton } from "./RailButton";
import { SettingsButton } from "./SettingsButton";

/** Which panel the sidebar is showing. Lives in AppLayout; the rail chooses it. */
export type SidebarPanel = "project" | "templates" | "assets";

/**
 * **Order and wording are the user's, 2026-09-05.** Library sits between Project
 * and Templates rather than after them, and the panel that was called Assets is
 * called Library on screen.
 *
 * **The key stays `assets` on purpose.** It names the `assets/` directory on
 * disk, which has not moved and is not being renamed — the word that changed is
 * the one a person reads. Renaming the key would put a second name on a real
 * folder for the sake of a label.
 */
const PANELS = [
  { panel: "project", label: "Project", Icon: FolderTree },
  { panel: "assets", label: "Library", Icon: Images },
  { panel: "templates", label: "Templates", Icon: LayoutTemplate },
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
          <RailButton
            key={which}
            label={label}
            Icon={Icon}
            pressed={panel === which}
            onClick={() => onSelectPanel(which)}
          />
        ))}
      </div>

      {/* **Pushed to the bottom, and two groups rather than one.** Home, back and
          forward came down here when the bar above the page was removed
          (2026-09-05) — they are about the page being read, where search, the
          project switcher and settings are errands about the app, and running
          six buttons together would lose that. The gap between them is what
          separates them; a rule would be another horizontal line in a window
          that already has enough. */}
      <div className="left-rail-foot">
        <NavButtons />
        <div className="left-rail-group">
          <RailButton label="Search" title={`Search (${searchShortcut})`} Icon={Search} onClick={onOpenSearch} />
          <RailButton label="Switch project" Icon={FolderOpen} onClick={onSwitchProject} />
          <SettingsButton className="left-rail-btn" label="Settings" />
        </div>
      </div>
    </nav>
  );
}
