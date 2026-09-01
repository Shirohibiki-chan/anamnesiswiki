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
// The search box is the third answer to the same pressure, and the one that
// scales: splitting sections stops working once there are enough of them that
// finding the right *section* is the problem. It replaces the panel while
// there's a query in it, rather than filtering the rail, so results have room
// to name the section they're in — half the answer, and the half you still
// need next time.
//
// The results are **one ranked list, not a list per section.** Grouping them
// was tried and reverted the same hour: it sorts by section, which means the
// best answer to a question lands wherever its panel sits in the rail —
// "where are my files saved" put *Projects folder* nineteenth. It also split
// the highlight from the ordering, so Enter opened a row other than the lit
// one. **The rank is the feature.** The section rides along on each row.
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
import { Search, X } from "lucide-react";
import { SETTINGS_TABS } from "../../constants/settings";
import { listStepForKey, stepIndex } from "../../services/list-keys";
import { useSettingsSearch } from "../../hooks/use-settings-search";
import { FontSettings } from "./FontSettings";
import { HistorySettings } from "./HistorySettings";
import { ListSettings } from "./ListSettings";
import { ProjectsSettings } from "./ProjectsSettings";
import { ShortcutSettings } from "./ShortcutSettings";
import { SidebarSettings } from "./SidebarSettings";
import { WritingSettings } from "./WritingSettings";
import { SnippetSettings } from "./SnippetSettings";
import { ThemeEditor } from "./ThemeEditor";
import { PatchNotes } from "./PatchNotes";
import { BugReportSettings } from "./BugReportSettings";
import { ThemeSettings } from "./ThemeSettings";
import { UpdateCheck } from "./UpdateCheck";

// The half of a settings section that can't live in `constants/settings.ts`:
// a constants file may not import a component. Ids come from there and are
// matched here, so a section with no panel is a build error rather than a
// blank screen.
const PANELS: Record<string, () => React.JSX.Element> = {
  theme: ThemeSettings,
  colours: ThemeEditor,
  fonts: FontSettings,
  snippets: SnippetSettings,
  sidebar: SidebarSettings,
  writing: WritingSettings,
  lists: ListSettings,
  history: HistorySettings,
  projects: ProjectsSettings,
  keyboard: ShortcutSettings,
  updates: UpdateCheck,
  report: BugReportSettings,
  "patch-notes": PatchNotes,
};

type TabId = string;

type SettingsModalProps = {
  onClose: () => void;
  /**
   * Which section is open on first paint. Defaults to the first tab — every
   * existing caller opens the cog and lands on Theme, same as always. The
   * start screen's New Releases rows are the one caller that wants something
   * else: clicking a release should land on Patch Notes, not send the user
   * hunting for it after a detour through Theme.
   */
  initialTab?: TabId;
  /**
   * Handed straight to `PatchNotes` when `initialTab` is `"patch-notes"`.
   * Ignored otherwise — no other panel currently takes an initial value, and
   * this isn't the place to invent a generic mechanism for one that does.
   */
  initialVersion?: string;
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

export function SettingsModal({ onClose, initialTab, initialVersion }: SettingsModalProps) {
  // Trusts the caller's id without checking it against SETTINGS_TABS: both
  // callers that pass one hand-write it against a literal tab id right beside
  // the call, the same way `activeTab` itself is never validated against the
  // list either — a typo here is a wrong screen at dev time, not a state a
  // real build ships with a bad value in.
  const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? SETTINGS_TABS[0].id);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  // Which setting the last result click was aiming at, so the panel it lands
  // in can flash the row. Cleared once it's been used.
  const [target, setTarget] = useState<string | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { results } = useSettingsSearch(query);
  const searching = query.trim().length > 0;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Ctrl/Cmd-F puts the caret back in the box wherever you are in the
      // dialog — the one key everyone already presses to look for something.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      // Escape backs out one step at a time: it clears the search before it
      // closes the dialog. Closing outright would throw away the query *and*
      // the screen, when the thing being escaped is usually just the query.
      if (event.key === "Escape") {
        if (searchRef.current?.value) {
          setQuery("");
          setHighlighted(0);
          searchRef.current.focus();
          return;
        }
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Scroll the flashed row into view and take the flash off again. The class
  // is what the panels' CSS animates; the timer is what stops the row being
  // permanently marked once you've found it.
  useEffect(() => {
    if (!target) return;
    const node = panelRef.current?.querySelector<HTMLElement>(`[data-setting="${CSS.escape(target)}"]`);
    node?.scrollIntoView({ block: "center" });
    node?.classList.add("settings-found");
    const timer = window.setTimeout(() => {
      node?.classList.remove("settings-found");
      setTarget(null);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [target, activeTab]);

  // Every path that changes the query goes through here, so the highlight is
  // reset in one place rather than by an effect watching for it — a highlight
  // left several rows down while the list underneath it changed would point at
  // a different setting than the one that was under it a keystroke ago.
  function retype(next: string) {
    setQuery(next);
    setHighlighted(0);
  }

  function openResult(index: number) {
    const entry = results[index];
    if (!entry) return;
    setActiveTab(entry.tabId);
    retype("");
    // Set after the tab, so the effect above runs against the panel the result
    // actually points at rather than whichever one was open.
    setTarget(entry.id);
  }

  // Arrow keys walk the results and Enter opens one, from inside the field —
  // so a search is type, arrow, Enter without ever leaving the box.
  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!searching || results.length === 0) return;
    const step = listStepForKey(event);
    if (step) {
      event.preventDefault();
      // See the same call in SearchPalette: Ctrl-N opens a new page at the
      // window level, and it must not also do that from in here.
      event.stopPropagation();
      setHighlighted((at) => stepIndex(at, step, results.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      openResult(highlighted);
    }
  }

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
  const ActivePanel = PANELS[active.id];

  /**
   * **Settings is a panel down the right edge, not a dialog in the middle, and
   * it is that on every section.** The app behind it keeps its true colours and
   * stays clickable throughout.
   *
   * Three passes got here and the middle one is the instructive one. Reported
   * 2026-08-30: picking colours through an app dimmed 50% black means never
   * seeing the colour you picked. The fix docked the dialog aside *only* on the
   * four appearance sections and slid it back for the rest — and a window that
   * sits somewhere different depending on which section of it you are on was
   * reported as annoying within the day, fairly. Centring it everywhere instead
   * just traded that for a box covering the page, which is the surface you most
   * need to see. So: one position, at an edge, always.
   *
   * That means there is nothing here keyed off the section any more, and adding
   * something would be reintroducing the bug. The class list is unconditional
   * on purpose.
   */

  return createPortal(
    /* **No click-to-close, deliberately, and no handler here to suggest
       otherwise.** The backdrop is transparent and `pointer-events: none`, so a
       click lands on the app behind — which is the point: walk to another page,
       open a folder, watch the theme on something real while the picker is
       open. A panel that vanished every time you clicked the app it exists to
       change would be unusable. Escape and the × close it. If the backdrop is
       ever given pointer events back, this is the line that has to come back
       with it. */
    <div className="ui-backdrop ui-backdrop-see-through">
      <div
        className="ui-modal ui-modal-xl settings-modal"
        role="dialog"
        /* Never modal: the rest of the window is genuinely reachable by mouse
           and keyboard, and saying otherwise is a lie to a screen reader. */
        aria-modal={false}
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-header">
          <h2 id="settings-title" className="settings-title">
            Settings
          </h2>

          <div className="settings-search">
            <Search size={13} className="settings-search-icon" />
            <input
              ref={searchRef}
              type="text"
              className="settings-search-input"
              value={query}
              onChange={(e) => retype(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search settings"
              aria-label="Search settings"
            />
          </div>

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

          {searching ? (
            <div className="settings-content settings-results" role="region" aria-label="Search results">
              {results.length === 0 ? (
                <div className="settings-panel-head">
                  <h3 className="settings-panel-title">Nothing found</h3>
                  <p className="settings-panel-blurb">No setting matches “{query.trim()}”. The sections are all still there on the left.</p>
                </div>
              ) : (
                results.map((entry, index) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`settings-result${index === highlighted ? " settings-result-active" : ""}`}
                    // Following the mouse keeps one highlight rather than two —
                    // a hover that looked selected next to a keyboard row that
                    // was would make Enter a guess.
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={() => openResult(index)}
                  >
                    <span className="settings-result-text">
                      <span className="settings-result-label">{entry.label}</span>
                      {entry.hint && <span className="settings-result-hint">{entry.hint}</span>}
                    </span>
                    {/* The section, per row rather than as a heading over a
                        group of them. Grouping meant sorting by section, and
                        sorting by section meant the best answer to a question
                        could land nineteenth because its panel is fifth in the
                        rail. Ranking is the whole point of a search box; the
                        section is context, and context fits on the row. */}
                    <span className="settings-result-tab">{entry.tabLabel}</span>
                  </button>
                ))
              )}
            </div>
          ) : (
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
              <div className="settings-panel" key={active.id} ref={panelRef}>
                {/* The one panel that takes an initial value. Special-cased
                    here rather than widening `PANELS` to a props-carrying
                    type for every entry — the other nine don't have an
                    "initial" anything, and threading an unused prop through
                    all of them just to give this one its version would be the
                    generic mechanism CLAUDE.md's "no speculative abstraction"
                    rule exists to head off. */}
                {active.id === "patch-notes" ? <PatchNotes initialVersion={initialVersion} /> : <ActivePanel />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
