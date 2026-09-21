// Every shortcut on one screen, raised with `?`.
//
// **Nothing in the app could show you your own keys.** Every shortcut is
// rebindable, which is the accessibility feature it was built as — and the
// cost of it is that there is no fixed list anybody could learn from a manual,
// because yours may not be mine. Settings → Keyboard can change them one at a
// time; it is a screen for editing, not for looking something up mid-sentence.
//
// So this reads the same store the listener does. A key you rebound yesterday
// is what this shows today, and a shortcut added to the registry appears here
// without anyone remembering to add it.
//
// **Three tabs since 2026-09-21: Keys, Slash Commands, Markdown.** The
// reference's own sheet has the second two, and ours had only keys. The slash
// list is built from the menu itself (services/editor-blocks/slash-menu.tsx)
// for the same reason the keys are read from the store — a typed-out copy
// would be wrong within a month. The markdown list is the opposite case:
// those are BlockNote's input rules, not ours, so it is a written list that
// says where it came from (constants/markdown-shortcuts.ts). The Keys tab
// also gained the editor's own chords, written down the same way.
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { MARKDOWN_SHORTCUTS } from "../../constants/markdown-shortcuts";
import { EDITOR_KEYS, FIXED_KEYS, SHEET_KEYS, type FixedKey } from "../../constants/shortcuts";
import { useShortcutSettings } from "../../hooks/use-shortcuts";
import { useSlashCatalogue } from "../../hooks/use-slash-catalogue";

const TABS = ["Keys", "Slash Commands", "Markdown"] as const;
type SheetTab = (typeof TABS)[number];

function tabIndexForKey(key: string, from: number, count: number): number | null {
  const last = count - 1;
  if (key === "ArrowRight" || key === "ArrowDown") return from === last ? 0 : from + 1;
  if (key === "ArrowLeft" || key === "ArrowUp") return from === 0 ? last : from - 1;
  if (key === "Home") return 0;
  if (key === "End") return last;
  return null;
}

function FixedRows({ keys, modifierName }: { keys: readonly FixedKey[]; modifierName: string }) {
  return (
    <ul className="shortcut-sheet-list">
      {keys.map((fixed) => (
        <li key={fixed.key} className="shortcut-sheet-row">
          <span className="shortcut-sheet-label">{fixed.what}</span>
          <kbd className="shortcut-sheet-keys">{fixed.mod ? `${modifierName}+${fixed.key}` : fixed.key}</kbd>
        </li>
      ))}
    </ul>
  );
}

export function ShortcutSheet({ onClose }: { onClose: () => void }) {
  const { rows, modifierName } = useShortcutSettings();
  const slashGroups = useSlashCatalogue();
  const [tab, setTab] = useState<SheetTab>("Keys");
  const closeRef = useRef<HTMLButtonElement>(null);

  function onTabsKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const next = tabIndexForKey(event.key, TABS.indexOf(tab), TABS.length);
    if (next === null) return;
    event.preventDefault();
    setTab(TABS[next]);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  // Focus lands on the close button rather than nowhere: the dialog has no
  // field to type into, and Tab from a body-focused page walks the window
  // behind this one instead of the dialog in front of it.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return createPortal(
    <div className="ui-backdrop" onMouseDown={onClose}>
      <div
        className="ui-modal ui-modal-lg shortcut-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-sheet-title"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.stopPropagation();
          onClose();
        }}
      >
        <header className="shortcut-sheet-header">
          <h2 id="shortcut-sheet-title" className="shortcut-sheet-title">
            Keyboard Shortcuts
          </h2>
          <button ref={closeRef} type="button" className="ui-icon-btn ui-icon-btn-lg" aria-label="Close" onClick={onClose}>
            <X size={15} />
          </button>
        </header>

        {/* The same strip Patch Notes uses: one Tab stop, arrow keys inside. */}
        <div className="shortcut-sheet-tabs" role="tablist" aria-label="Kinds of shortcut" onKeyDown={onTabsKeyDown}>
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={name === tab}
              tabIndex={name === tab ? 0 : -1}
              className={`shortcut-sheet-tab${name === tab ? " shortcut-sheet-tab-active" : ""}`}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="shortcut-sheet-body" role="tabpanel">
          {tab === "Keys" && (
            <>
              <h3 className="shortcut-sheet-group">Yours</h3>
              <ul className="shortcut-sheet-list">
                {rows.map((row) => (
                  <li key={row.action} className="shortcut-sheet-row">
                    <span className="shortcut-sheet-label">{row.label}</span>
                    <kbd className="shortcut-sheet-keys">{row.keys}</kbd>
                  </li>
                ))}
              </ul>

              {/* Separate, and named for why they're separate. A row you can't
                  change sitting in the same list as eight you can is a row that
                  reads as broken the first time somebody tries. */}
              <h3 className="shortcut-sheet-group">Fixed — these can't be changed</h3>
              <FixedRows keys={FIXED_KEYS} modifierName={modifierName} />

              <h3 className="shortcut-sheet-group">While writing</h3>
              <FixedRows keys={EDITOR_KEYS} modifierName={modifierName} />
            </>
          )}

          {tab === "Slash Commands" &&
            slashGroups.map(({ group, commands }) => (
              <div key={group}>
                <h3 className="shortcut-sheet-group">{group}</h3>
                <ul className="shortcut-sheet-list">
                  {commands.map((command) => (
                    <li key={command.title} className="shortcut-sheet-row">
                      <span className="shortcut-sheet-label">
                        {command.title}
                        {command.subtext && <span className="shortcut-sheet-subtext">{command.subtext}</span>}
                      </span>
                      <kbd className="shortcut-sheet-keys">/{command.short}</kbd>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

          {tab === "Markdown" && (
            <>
              <h3 className="shortcut-sheet-group">Typed on an empty line, or round a word</h3>
              <ul className="shortcut-sheet-list">
                {MARKDOWN_SHORTCUTS.map((shortcut) => (
                  <li key={shortcut.typed} className="shortcut-sheet-row">
                    <span className="shortcut-sheet-label">{shortcut.what}</span>
                    <kbd className="shortcut-sheet-keys">{shortcut.typed}</kbd>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <p className="shortcut-sheet-footnote">
          {tab === "Keys" && (
            <>
              Everything in the first list can be changed in Settings → Keyboard; the other two are the app&rsquo;s and
              the editor&rsquo;s own.{" "}
            </>
          )}
          {tab === "Slash Commands" && (
            <>Type <kbd>/</kbd> at the start of a line and the name, or the short form on the right. </>
          )}
          {tab === "Markdown" && (
            <>
              Type these while writing and they turn into the formatting as you go. These are the editor&rsquo;s own
              rules, written down here rather than read from it.{" "}
            </>
          )}
          <kbd>{SHEET_KEYS.question}</kbd> opens this and closes it again, and <kbd>{SHEET_KEYS.function}</kbd> does
          the same while you&rsquo;re writing, where a question mark is just a question mark.
        </p>
      </div>
    </div>,
    document.body,
  );
}
