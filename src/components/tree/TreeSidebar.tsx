// Left sidebar container — top tab strip, and whichever view it selects.
//
// The strip was three buttons with two of them `disabled` from Phase 3 until
// Phase 17, which made both real.
//
// Which tab is open is local state on purpose. It isn't a property of the
// world — nothing about Valeraverse changes because you looked at your
// templates — so it doesn't belong in `project.json`, and it deliberately
// doesn't persist across launches either: the sidebar is the app's main
// navigation and it should open showing the tree.
import { useState } from "react";
import { useTemplateActions } from "../../hooks/use-template-editing";
import { AssetsPanel } from "./AssetsPanel";
import { ProjectHeader } from "./ProjectHeader";
import { TemplatesPanel } from "./TemplatesPanel";
import { TreePanel } from "./TreePanel";
import "./tree.css";

type SidebarTab = "project" | "templates" | "assets";

export function TreeSidebar() {
  const [tab, setTab] = useState<SidebarTab>("project");
  const { openTemplate } = useTemplateActions();

  /**
   * Arriving on the Project tab closes whatever template was open.
   *
   * That tab *is* the page navigator — it exists to choose what the centre
   * panel shows — so standing on it while the centre still edits a template is
   * the sidebar and the page disagreeing about where you are. Selecting a page
   * closes the template too (see the store's applySelection), but that only
   * fires once you've clicked a row, and the first click is exactly the one
   * that looked broken.
   *
   * Assets deliberately doesn't do this. It's a source panel you open *for*
   * whatever's in the centre rather than a way of getting somewhere, and a
   * picture can be dragged into a template as readily as into a page.
   */
  function selectTab(next: SidebarTab) {
    setTab(next);
    if (next === "project") openTemplate(null);
  }

  return (
    <div className="tree-sidebar">
      <div className="tree-sidebar-tabs" role="tablist">
        <SidebarTabButton label="Project" tab="project" current={tab} onSelect={selectTab} />
        <SidebarTabButton label="Templates" tab="templates" current={tab} onSelect={selectTab} />
        <SidebarTabButton label="Assets" tab="assets" current={tab} onSelect={selectTab} />
      </div>

      {/* The project header and search belong to the tree, not to the sidebar —
          a search box above a list of templates would search the wrong thing. */}
      {tab === "project" && (
        <>
          <ProjectHeader />
          <TreePanel />
        </>
      )}
      {tab === "templates" && <TemplatesPanel />}
      {/* Remounted every time the tab is opened, which is deliberate: it reads
          `assets/` off disk on mount, and coming back to it after uploading a
          picture should show the picture. */}
      {tab === "assets" && <AssetsPanel />}
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
