// The app's settings surface. One tab per area rather than a single scrolling
// stack — the stack was already crowded at two sections, and this phase is
// still adding to it. Portaled to document.body for the same reason
// ConfirmDialog is: it has to paint above the tree's stacking contexts.
//
// The tab strip follows the ARIA tabs pattern properly (roving tabindex, arrow
// keys, Home/End) rather than being buttons that look like tabs. Keyboard
// rebinding lives behind one of these tabs, so a tab strip you can only reach
// with a mouse would put the accessibility screen behind a mouse.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { ProjectsSettings } from "./ProjectsSettings";
import { ShortcutSettings } from "./ShortcutSettings";
import { UpdateCheck } from "./UpdateCheck";

// Adding a settings area is one entry here. Order is tab order.
const SETTINGS_TABS = [
  { id: "projects", label: "Projects", Panel: ProjectsSettings },
  { id: "keyboard", label: "Keyboard", Panel: ShortcutSettings },
  { id: "updates", label: "Updates", Panel: UpdateCheck },
] as const;

type TabId = (typeof SETTINGS_TABS)[number]["id"];

type SettingsModalProps = {
  onClose: () => void;
};

// Null for any key the tab strip doesn't own, so it falls through to whatever
// else wants it. Left/right wrap; Home/End jump to the ends.
function tabIndexForKey(key: string, from: number): number | null {
  const last = SETTINGS_TABS.length - 1;
  if (key === "ArrowRight") return from === last ? 0 : from + 1;
  if (key === "ArrowLeft") return from === 0 ? last : from - 1;
  if (key === "Home") return 0;
  if (key === "End") return last;
  return null;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>(SETTINGS_TABS[0].id);
  const tablistRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Arrow keys select as they move (automatic activation), which is the right
  // call when switching panels is free — no loading, no unsaved state to lose.
  function onTablistKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = SETTINGS_TABS.findIndex((tab) => tab.id === activeTab);
    const next = tabIndexForKey(event.key, index);
    if (next === null) return;

    event.preventDefault();
    setActiveTab(SETTINGS_TABS[next].id);
    // Focus has to follow the selection or the next arrow press comes from the
    // old tab. Read in a handler, never during render.
    const buttons = tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[next]?.focus();
  }

  const active = SETTINGS_TABS.find((tab) => tab.id === activeTab) ?? SETTINGS_TABS[0];
  const ActivePanel = active.Panel;

  return createPortal(
    <div className="settings-backdrop" onClick={onClose}>
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-header">
          <h2 id="settings-title" className="settings-title">
            Settings
          </h2>
          <button type="button" className="settings-close" aria-label="Close settings" onClick={onClose} autoFocus>
            <X size={15} />
          </button>
        </header>

        <div className="settings-tabs" role="tablist" aria-label="Settings sections" ref={tablistRef} onKeyDown={onTablistKeyDown}>
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`settings-tab-${tab.id}`}
              aria-controls={`settings-panel-${tab.id}`}
              aria-selected={tab.id === activeTab}
              // Roving tabindex: the strip is one Tab stop, and arrow keys move
              // within it. Tabbing through every section name would be noise.
              tabIndex={tab.id === activeTab ? 0 : -1}
              className={`settings-tab${tab.id === activeTab ? " settings-tab-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          className="settings-panel"
          role="tabpanel"
          id={`settings-panel-${active.id}`}
          aria-labelledby={`settings-tab-${active.id}`}
        >
          <ActivePanel />
        </div>
      </div>
    </div>,
    document.body,
  );
}
