// Settings → Theme. Picks one, and points at the folder they live in.
//
// This was the first of five sections stacked in one narrow column, which is
// what made Settings a page you scrolled rather than a place you went. Each of
// those sections is now its own panel behind its own entry in the left rail —
// see SettingsModal.tsx.
import { Check, FolderOpen, RefreshCw } from "lucide-react";
import { BUILT_IN_THEMES } from "../../constants/themes";
import { useTheme } from "../../hooks/use-theme";
import { BlockedNotice, FolderErrorNotice } from "./StylesheetNotices";
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

function ThemeRow({
  label,
  note,
  selected,
  onSelect,
  children,
}: {
  label: string;
  note: string;
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={`appearance-theme${selected ? " appearance-theme-selected" : ""}`}
      onClick={onSelect}
    >
      {children}
      <span className="appearance-theme-text">
        <span className="appearance-theme-name">{label}</span>
        <span className="appearance-theme-note">{note}</span>
      </span>
      {selected && <Check size={14} className="appearance-theme-check" />}
    </button>
  );
}

export function ThemeSettings() {
  const {
    themeId,
    themeFile,
    customThemes,
    isScanning,
    folderError,
    selectTheme,
    scanFolders,
    resetAppearance,
    openThemesFolder,
  } = useTheme();

  const blocked = customThemes.filter((theme) => theme.blocked.length > 0);

  return (
    <div className="appearance-settings">
      <div className="appearance-themes" role="radiogroup" aria-label="Theme">
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
          >
            <ThemeSwatchDots swatch={theme.swatch} />
          </ThemeRow>
        ))}
      </div>

      <p className="appearance-note">
        Themes you make go in a folder as plain <code>.css</code> files. Build one in the sandbox, press <em>Show me the CSS</em>, save
        it there, and it turns up in this list — or use <em>Colours</em> next door.
      </p>

      <p className="appearance-actions">
        <button type="button" className="ui-btn ui-btn-secondary" onClick={() => void openThemesFolder()}>
          <FolderOpen size={14} />
          Open themes folder
        </button>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={() => void scanFolders()} disabled={isScanning}>
          <RefreshCw size={14} />
          {isScanning ? "Looking…" : "Check for new ones"}
        </button>
      </p>

      <FolderErrorNotice error={folderError} folder="themes" />
      {blocked.map((sheet) => (
        <BlockedNotice key={sheet.file} sheet={sheet} />
      ))}

      {/* The one control that reaches across all four Appearance panels, so it
          sits on the one you land on rather than at the bottom of whichever
          panel happened to be last. */}
      <p className="appearance-reset">
        <button type="button" className="ui-link" onClick={() => void resetAppearance()}>
          Put everything back to default
        </button>
        <span className="appearance-note">Theme, fonts, text size and snippets. Files you've made stay in their folders.</span>
      </p>
    </div>
  );
}
