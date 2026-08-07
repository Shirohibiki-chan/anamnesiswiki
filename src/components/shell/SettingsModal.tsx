// The app's settings surface: a left rail of sections beside one panel.
//
// It was four tabs across the top of a 28rem dialog, and Appearance alone held
// five stacked sections — theme, colours, gradients, fonts, sizes, snippets —
// in a single column about four hundred pixels wide. *"Why is it one tiny ass
// column? it goes on and on and on."* Right on both counts, and they're the
// same count: a narrow dialog can only stack, and a stack that long stops being
// a screen you look at and becomes one you scroll.
//
// So the dialog is wide, Appearance's sections are peers of the other panels
// rather than nested inside one of them, and the rail is vertical because seven
// entries down the side is a list you read at a glance, while seven across the
// top is a strip that scrolls.
//
// Portaled to document.body for the same reason ConfirmDialog is: it has to
// paint above the tree's stacking contexts.
//
// The rail follows the ARIA tabs pattern properly (roving tabindex, arrow keys,
// Home/End) rather than being buttons that look like tabs. Keyboard rebinding
// lives behind one of these, so a nav you can only reach with a mouse would put
// the accessibility screen behind a mouse.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { FontSettings } from "./FontSettings";
import { ProjectsSettings } from "./ProjectsSettings";
import { ShortcutSettings } from "./ShortcutSettings";
import { SnippetSettings } from "./SnippetSettings";
import { ThemeEditor } from "./ThemeEditor";
import { ThemeSettings } from "./ThemeSettings";
import { UpdateCheck } from "./UpdateCheck";

// Adding a settings area is one entry here. Order is rail order, and `group`
// only draws the hairline where it changes — the rail has no group headings,
// because seven entries don't need to be sorted into piles to be scanned.
const SETTINGS_TABS = [
  {
    id: "theme",
    group: "look",
    label: "Theme",
    blurb: "The whole look, in one pick. Themes you've made yourself are in the list too.",
    Panel: ThemeSettings,
  },
  {
    id: "colours",
    group: "look",
    label: "Colours",
    blurb: "Change a theme's colours and gradients here — it writes an ordinary .css file you can also open in Notepad.",
    Panel: ThemeEditor,
  },
  {
    id: "fonts",
    group: "look",
    label: "Fonts and text",
    blurb: "Which typefaces to use, and how big.",
    Panel: FontSettings,
  },
  {
    id: "snippets",
    group: "look",
    label: "Snippets",
    blurb: "Small bits of CSS that sit on top of whichever theme is on, each switched on and off by itself.",
    Panel: SnippetSettings,
  },
  {
    id: "projects",
    group: "app",
    label: "Projects",
    blurb: "Where new and imported projects get saved.",
    Panel: ProjectsSettings,
  },
  {
    id: "keyboard",
    group: "app",
    label: "Keyboard",
    blurb: "Every shortcut, and what it's bound to.",
    Panel: ShortcutSettings,
  },
  {
    id: "updates",
    group: "app",
    label: "Updates",
    blurb: "Check for a new version. Only ever when you press the button.",
    Panel: UpdateCheck,
  },
] as const;

type TabId = (typeof SETTINGS_TABS)[number]["id"];

type SettingsModalProps = {
  onClose: () => void;
};

// Null for any key the rail doesn't own, so it falls through to whatever else
// wants it. Both axes: the rail is a column at a normal window size and wraps
// to a row on a short or narrow one, and a key that works in one shape and not
// the other is worse than one that always works.
function tabIndexForKey(key: string, from: number): number | null {
  const last = SETTINGS_TABS.length - 1;
  if (key === "ArrowDown" || key === "ArrowRight") return from === last ? 0 : from + 1;
  if (key === "ArrowUp" || key === "ArrowLeft") return from === 0 ? last : from - 1;
  if (key === "Home") return 0;
  if (key === "End") return last;
  return null;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>(SETTINGS_TABS[0].id);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Arrow keys select as they move (automatic activation), which is the right
  // call when switching panels is free — no loading, no unsaved state to lose.
  function onRailKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = SETTINGS_TABS.findIndex((tab) => tab.id === activeTab);
    const next = tabIndexForKey(event.key, index);
    if (next === null) return;

    event.preventDefault();
    setActiveTab(SETTINGS_TABS[next].id);
    // Focus has to follow the selection or the next arrow press comes from the
    // old tab. Read in a handler, never during render.
    const buttons = railRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[next]?.focus();
  }

  const active = SETTINGS_TABS.find((tab) => tab.id === activeTab) ?? SETTINGS_TABS[0];
  const ActivePanel = active.Panel;

  return createPortal(
    <div className="ui-backdrop" onClick={onClose}>
      <div
        className="ui-modal ui-modal-xl settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-header">
          <h2 id="settings-title" className="settings-title">
            Settings
          </h2>
          <button type="button" className="ui-icon-btn ui-icon-btn-lg" aria-label="Close settings" onClick={onClose} autoFocus>
            <X size={15} />
          </button>
        </header>

        <div className="settings-body">
          <div
            className="settings-nav"
            role="tablist"
            aria-orientation="vertical"
            aria-label="Settings sections"
            ref={railRef}
            onKeyDown={onRailKeyDown}
          >
            {SETTINGS_TABS.map((tab, index) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`settings-tab-${tab.id}`}
                aria-controls={`settings-panel-${tab.id}`}
                aria-selected={tab.id === activeTab}
                // Roving tabindex: the rail is one Tab stop, and arrow keys move
                // within it. Tabbing through every section name would be noise.
                tabIndex={tab.id === activeTab ? 0 : -1}
                data-group-start={index > 0 && SETTINGS_TABS[index - 1].group !== tab.group ? "" : undefined}
                className={`settings-nav-item${tab.id === activeTab ? " settings-nav-item-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            className="settings-content"
            role="tabpanel"
            id={`settings-panel-${active.id}`}
            aria-labelledby={`settings-tab-${active.id}`}
          >
            {/* Outside the scroller on purpose: with the nav down the side, this
                heading is the only thing on screen naming where you are, and it
                can't be the first thing that scrolls away. */}
            <div className="settings-panel-head">
              <h3 className="settings-panel-title">{active.label}</h3>
              <p className="settings-panel-blurb">{active.blurb}</p>
            </div>

            {/* Keyed, so switching sections starts at the top of the new one
                rather than wherever the last one was scrolled to. */}
            <div className="settings-panel" key={active.id}>
              <ActivePanel />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
