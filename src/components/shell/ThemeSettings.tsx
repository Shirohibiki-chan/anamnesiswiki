// Settings → Theme. Picks one, and points at the folder they live in.
//
// This was the first of five sections stacked in one narrow column, which is
// what made Settings a page you scrolled rather than a place you went. Each of
// those sections is now its own panel behind its own entry in the left rail —
// see SettingsModal.tsx.
import { Check, FolderOpen, Import, RefreshCw, Trash2 } from "lucide-react";
import { BUILT_IN_THEMES } from "../../constants/themes";
import { useDialogs } from "../../hooks/use-dialogs";
import { useTheme } from "../../hooks/use-theme";
import { NewThemeButton } from "./CreateTheme";
import { BlockedNotice, DeleteErrorNotice, FolderErrorNotice, ImportErrorNotice } from "./StylesheetNotices";
import type { ThemeSwatch } from "../../services/theme-service";

/**
 * The three dots beside a theme's name.
 *
 * For a built-in there's nothing to pass: putting its `data-theme` on the
 * element makes the real theme block match *this element*, so the dots read
 * the same tokens the app would. Custom themes aren't in the document until
 * they're selected, so those come with colours read out of the file.
 */
function ThemeSwatchDots({ themeId, swatch }: { themeId?: string; swatch?: ThemeSwatch | null }) {
  const style = (color: string | undefined, token: string) => ({ background: color ?? `var(${token})` });
  return (
    <span className="appearance-swatch" data-theme={themeId} aria-hidden="true">
      <i style={style(swatch?.bg, "--color-bg")} />
      <i style={style(swatch?.panel, "--color-panel")} />
      <i style={style(swatch?.accent, "--color-accent-light")} />
    </span>
  );
}

/**
 * One theme in the list.
 *
 * The picker itself is the button and the delete is a *sibling*, not a child —
 * a button inside a button isn't valid HTML and browsers disagree about which
 * one a click belongs to. The wrapper carries the frame so the two still read
 * as one row.
 */
function ThemeRow({
  label,
  note,
  selected,
  onSelect,
  onDelete,
  children,
}: {
  label: string;
  note: string;
  selected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`appearance-theme${selected ? " appearance-theme-selected" : ""}`}>
      <button type="button" role="radio" aria-checked={selected} className="appearance-theme-pick" onClick={onSelect}>
        {children}
        <span className="appearance-theme-text">
          <span className="appearance-theme-name">{label}</span>
          <span className="appearance-theme-note">{note}</span>
        </span>
        {selected && <Check size={14} className="appearance-theme-check" />}
      </button>
      {/* Only on themes she owns. A built-in has no file to remove — the
          button would have to either lie or explain itself, and neither is
          better than not being there. */}
      {onDelete && (
        <button type="button" className="appearance-theme-delete" aria-label={`Delete ${label}`} title="Delete this theme" onClick={onDelete}>
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

export function ThemeSettings() {
  const {
    themeId,
    themeFile,
    customThemes,
    isScanning,
    folderError,
    deleteError,
    importError,
    mutedCovers,
    selectTheme,
    importTheme,
    scanFolders,
    resetAppearance,
    openThemesFolder,
    deleteTheme,
    setMutedCovers,
  } = useTheme();
  const { confirmDestructive } = useDialogs();

  const blocked = customThemes.filter((theme) => theme.blocked.length > 0);

  // Names the file, not just the theme, because that's what's being removed and
  // it's the thing she can go and check for afterwards. No undo to offer — the
  // file is gone — so the sentence has to be enough on its own.
  async function remove(label: string, file: string) {
    const warning = `Delete "${label}"? Its file (${file}) is removed from the themes folder, and this can't be undone.`;
    if (await confirmDestructive(warning)) await deleteTheme(file);
  }

  return (
    <div className="appearance-settings">
      {/* See ThemeEditor's ColorRow for what `data-setting` is — the id
          Settings search scrolls to and flashes. */}
      <div className="appearance-themes" role="radiogroup" aria-label="Theme" data-setting="theme-pick">
        {BUILT_IN_THEMES.map((theme) => (
          <ThemeRow
            key={theme.id}
            label={theme.label}
            note={theme.note}
            selected={themeFile === null && themeId === theme.id}
            onSelect={() => void selectTheme(theme.id, null)}
          >
            <ThemeSwatchDots themeId={theme.id} />
          </ThemeRow>
        ))}

        {customThemes.map((theme) => (
          <ThemeRow
            key={theme.file}
            label={theme.label}
            note={theme.file}
            selected={themeFile === theme.file}
            onSelect={() => void selectTheme(theme.themeId, theme.file)}
            onDelete={() => void remove(theme.label, theme.file)}
          >
            <ThemeSwatchDots swatch={theme.swatch} />
          </ThemeRow>
        ))}
      </div>

      <p className="appearance-note">
        <em>New theme</em> copies the one you're on into a file of your own, and everything about it becomes editable — colours and
        fonts, in the two panels next door. Themes you make go in a folder as plain <code>.css</code> files, so you can also build one
        in the sandbox, press <em>Show me the CSS</em> and save it there. Open one in a text editor and the window follows every time
        you save.
      </p>

      {/* Making one comes first: it's the only button here that produces a
          theme rather than finding one, and it used to be reachable only from
          the Colours panel — which you'd have no reason to open unless you
          already had a theme of your own to edit. */}
      <p className="appearance-actions">
        <span data-setting="theme-new">
          <NewThemeButton />
        </span>
        <button type="button" className="ui-btn ui-btn-secondary" data-setting="theme-import" onClick={() => void importTheme()}>
          <Import size={14} />
          Import a theme
        </button>
        <button type="button" className="ui-btn ui-btn-secondary" data-setting="theme-folder" onClick={() => void openThemesFolder()}>
          <FolderOpen size={14} />
          Open themes folder
        </button>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={() => void scanFolders()} disabled={isScanning}>
          <RefreshCw size={14} />
          {isScanning ? "Looking…" : "Check for new ones"}
        </button>
      </p>

      <p className="appearance-note">
        <em>Import</em> takes a <code>.css</code> theme and copies it into the folder for you. It also takes a <code>.json</code> palette
        — a list of colours exported from somewhere else — and works out which colour does what here, checking every one for readability
        as it goes. Either way you get a normal theme file you can then edit.
      </p>

      <FolderErrorNotice error={folderError} folder="themes" />
      <DeleteErrorNotice error={deleteError} />
      <ImportErrorNotice error={importError} />
      {blocked.map((sheet) => (
        <BlockedNotice key={sheet.file} sheet={sheet} />
      ))}

      {/* Raised as a joke and kept because it's correct: bright colour on the
          start screen's covers is a taste question, and a taste question gets
          a setting rather than a compromise everyone lives with. Lands here
          rather than in Settings → Lists, which owns how those grids paginate
          — this is how they look, not how they behave. */}
      <div className="appearance-toggle" data-setting="muted-covers">
        <label className="appearance-toggle-row">
          <input type="checkbox" checked={mutedCovers} onChange={(event) => void setMutedCovers(event.target.checked)} />
          <span className="appearance-toggle-label">Mute project covers</span>
        </label>
        <p className="appearance-note">
          Desaturates every cover on the start screen — the generated colours and any picture you've set yourself. Off by default, and
          on automatically if your system already asks for higher contrast.
        </p>
      </div>

      {/* The one control that reaches across all four Appearance panels, so it
          sits on the one you land on rather than at the bottom of whichever
          panel happened to be last. */}
      <p className="appearance-reset">
        <button type="button" className="ui-link" onClick={() => void resetAppearance()}>
          Put everything back to default
        </button>
        <span className="appearance-note">
          Theme, fonts, text size, snippets and muted covers. Files you've made stay in their folders.
        </span>
      </p>
    </div>
  );
}
