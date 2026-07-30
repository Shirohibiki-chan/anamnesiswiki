// Tab strip beneath the page title. Hidden tabs (GM-only content) render
// dimmer and italic; the eye icon toggles visibility. See docs/spec.md
// §Page view — "the tab-with-hidden-eye pattern is the signature interaction."
import { Eye, EyeOff } from "lucide-react";
import type { Tab } from "../../constants/schema";

type PageTabsProps = {
  tabs: Tab[];
  activeTabId: string | null;
  onSelect: (tabId: string) => void;
  onToggleHidden: (tabId: string) => void;
};

export function PageTabs({ tabs, activeTabId, onSelect, onToggleHidden }: PageTabsProps) {
  return (
    <div className="page-tabs">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`page-tab${isActive ? " page-tab-active" : ""}${tab.hidden ? " page-tab-hidden" : ""}`}
          >
            <button type="button" className="page-tab-label" onClick={() => onSelect(tab.id)}>
              {tab.label}
            </button>
            <button
              type="button"
              className="page-tab-eye"
              title={tab.hidden ? "Hidden — click to reveal" : "Visible — click to hide"}
              onClick={() => onToggleHidden(tab.id)}
            >
              {tab.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
