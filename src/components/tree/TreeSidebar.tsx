// Left sidebar container — whichever of the three panels the rail has chosen.
//
// **The tab strip that used to sit on top of this moved into the rail** in
// Phase 21, and with it the choice itself: which panel is showing is now state
// in AppLayout, because two components need it — the rail draws the selection
// and this draws the panel. See LeftRail.
//
// It is still not a property of the world — nothing about Valeraverse changes
// because you looked at your templates — so it stays out of `project.json`, and
// it deliberately doesn't persist across launches either: the sidebar is the
// app's main navigation and it should open showing the tree.
import type { SidebarPanel } from "../shell/LeftRail";
import { AssetsPanel } from "./AssetsPanel";
import { ProjectHeader } from "./ProjectHeader";
import { TemplatesPanel } from "./TemplatesPanel";
import { TreePanel } from "./TreePanel";
import "./tree.css";

type TreeSidebarProps = {
  panel: SidebarPanel;
  /** Only used to go back to the tree once a template has made a page. */
  onSelectPanel: (panel: SidebarPanel) => void;
};

export function TreeSidebar({ panel, onSelectPanel }: TreeSidebarProps) {
  return (
    <div className="tree-sidebar">
      {/* The project header and search belong to the tree, not to the sidebar —
          a search box above a list of templates would search the wrong thing. */}
      {panel === "project" && (
        <>
          <ProjectHeader />
          <TreePanel />
        </>
      )}
      {panel === "templates" && (
        <>
          <div className="tree-panel-head">Templates</div>
          <TemplatesPanel onPageCreated={() => onSelectPanel("project")} />
        </>
      )}
      {/* Remounted every time the panel is opened, which is deliberate: it reads
          `assets/` off disk on mount, and coming back to it after uploading a
          picture should show the picture. */}
      {panel === "assets" && (
        <>
          {/* "Library" on screen, `assets` in the code — see PANELS in LeftRail. */}
          <div className="tree-panel-head">Library</div>
          <AssetsPanel />
        </>
      )}
    </div>
  );
}
