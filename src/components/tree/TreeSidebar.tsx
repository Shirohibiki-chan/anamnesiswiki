// Left sidebar container — top tab strip, and whichever view it selects.
//
// The strip has been three buttons with two of them `disabled` since Phase 3.
// Phase 17 makes Templates real; Assets follows in the same phase and keeps its
// placeholder until then.
//
// Which tab is open is local state on purpose. It isn't a property of the
// world — nothing about Valeraverse changes because you looked at your
// templates — so it doesn't belong in `project.json`, and it deliberately
// doesn't persist across launches either: the sidebar is the app's main
// navigation and it should open showing the tree.
import { useState } from "react";
import { ProjectHeader } from "./ProjectHeader";
import { TemplatesPanel } from "./TemplatesPanel";
import { TreePanel } from "./TreePanel";
import "./tree.css";

type SidebarTab = "project" | "templates";

export function TreeSidebar() {
  const [tab, setTab] = useState<SidebarTab>("project");

  return (
    <div className="tree-sidebar">
      <div className="tree-sidebar-tabs" role="tablist">
        <SidebarTabButton label="Project" tab="project" current={tab} onSelect={setTab} />
        <SidebarTabButton label="Templates" tab="templates" current={tab} onSelect={setTab} />
        <button type="button" className="tree-sidebar-tab" disabled title="Coming in this phase">
          Assets
        </button>
      </div>

      {/* The project header and search belong to the tree, not to the sidebar —
          a search box above a list of templates would search the wrong thing. */}
      {tab === "project" ? (
        <>
          <ProjectHeader />
          <TreePanel />
        </>
      ) : (
        <TemplatesPanel />
      )}
    </div>
  );
}

function SidebarTabButton({
  label,
  tab,
  current,
  onSelect,
}: {
  label: string;
  tab: SidebarTab;
  current: SidebarTab;
  onSelect: (tab: SidebarTab) => void;
}) {
  const isActive = current === tab;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      className={`tree-sidebar-tab${isActive ? " tree-sidebar-tab-active" : ""}`}
      onClick={() => onSelect(tab)}
    >
      {label}
    </button>
  );
}
