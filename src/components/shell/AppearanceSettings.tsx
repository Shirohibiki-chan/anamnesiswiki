// Settings → Appearance. Picks a theme, four fonts and two text sizes, edits a
// theme's colours and gradients, lists the stylesheets she's written herself,
// and switches snippets on and off.
//
// This screen used to stop at "pick one" on the reasoning that the sandbox is a
// better place to *make* a theme than a settings panel could be. Half of that
// held and half didn't: the sandbox is still better for starting from nothing,
// but she asked the obvious question — *"why not both"* — and there wasn't an
// answer. So ThemeEditor.tsx is here too, and the thing that keeps the two from
// becoming two features is that neither has a format of its own. A theme is a
// `.css` file in a folder, wherever it was made.
import { AlertTriangle, Check, FolderOpen, RefreshCw } from "lucide-react";
import {
  BUILT_IN_THEMES,
  CONTENT_SCALE_MAX,
  CONTENT_SCALE_MIN,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_SCALE_STEP,
  type FontSlot,
} from "../../constants/themes";
import { fontChoicesFor, useTheme } from "../../hooks/use-theme";
import { ThemeEditor } from "./ThemeEditor";
import type { CustomStylesheet, ThemeStoreState } from "../../state/theme-store";
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

function FontPicker({ slot }: { slot: FontSlot }) {
  const { fonts, setFont, stackFor, themeFontFor } = useTheme();
  const chosen = fonts[slot.key] ?? "";
  const stack = stackFor(slot.key);
  // Naming it matters: "whatever the theme uses" is true but useless — the
  // themes use different faces and there was no way to find out which without
  // reading down a list of 98 trying to spot the one already on screen.
  //
  // A theme that names no face isn't a gap: `--font-mono` hands the choice to
  // the OS on purpose, so that slot gets said out loud too, differently.
  const themeFont = themeFontFor(slot.key);
  const leaveItLabel = themeFont.family
    ? `Whatever the theme uses — ${themeFont.family}`
    : themeFont.stack
      ? "Whatever the theme uses — your system's own"
      : "Whatever the theme uses";

  return (
    <div className="appearance-font">
      <label className="appearance-font-label" htmlFor={`font-${slot.key}`}>
        {slot.label}
        <span className="appearance-font-hint">{slot.hint}</span>
      </label>

      <select
        id={`font-${slot.key}`}
        className="appearance-select"
        value={chosen}
        onChange={(event) => void setFont(slot.key, event.target.value || null)}
      >
        {/* Empty value, not a sentinel family name — an unset slot has to mean
            "whatever the theme says", so switching theme still changes it. The
            label names the face; the value stays empty. */}
        <option value="">{leaveItLabel}</option>
        {fontChoicesFor(slot).map((group) => (
          <optgroup key={group.cat} label={group.label}>
            {group.fonts.map((font) => (
              // Each name written in its own face, so the list can be browsed
              // by looking rather than by picking one at a time and undoing.
              <option key={font.family} value={font.family} style={{ fontFamily: `"${font.family}"` }}>
                {font.family}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <p className="appearance-specimen" style={stack ? { fontFamily: stack } : undefined}>
        {slot.specimen}
      </p>
    </div>
  );
}

function ScaleSlider({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => Promise<void>;
}) {
  return (
    <div className="appearance-font">
      <span className="appearance-font-label">
        {label}
        <span className="appearance-font-hint">{hint}</span>
      </span>
      <div className="appearance-scale">
        <input
          type="range"
          className="appearance-range"
          min={min}
          max={max}
          step={TEXT_SCALE_STEP}
          value={value}
          aria-label={`${label} text size`}
          onChange={(event) => void onChange(Number(event.target.value))}
        />
        <span className="appearance-scale-value">{Math.round(value * 100)}%</span>
      </div>
    </div>
  );
}

/** The "we stripped some URLs" notice. Names them — see sanitizeCustomCss. */
function BlockedNotice({ sheet }: { sheet: CustomStylesheet }) {
  return (
    <p className="appearance-blocked">
      <AlertTriangle size={12} />
      <span>
        <strong>{sheet.file}</strong> asked to load {sheet.blocked.length === 1 ? "something" : `${sheet.blocked.length} things`} from
        the internet, and that part was ignored:{" "}
        {sheet.blocked.map((what, index) => (
          <span key={what}>
            {index > 0 && ", "}
            <code>{what}</code>
          </span>
        ))}
        . Everything else in it works normally.
      </span>
    </p>
  );
}

/**
 * Shown when "Open … folder" couldn't hand the folder to the file manager.
 * The path is the point: a button that silently does nothing leaves her with
 * no way to reach the folder at all, and this at least gives her something to
 * paste into Explorer.
 */
function FolderErrorNotice({ error, folder }: { error: ThemeStoreState["folderError"]; folder: "themes" | "snippets" }) {
  if (!error || error.folder !== folder) return null;
  return (
    <p className="appearance-blocked">
      <AlertTriangle size={12} />
      <span>
        Couldn't open that folder. It's here: <code>{error.path}</code>
      </span>
    </p>
  );
}

export function AppearanceSettings() {
  const {
    themeId,
    themeFile,
    textScale,
    contentScale,
    enabledSnippets,
    customThemes,
    snippets,
    isScanning,
    folderError,
    slots,
    selectTheme,
    setTextScale,
    setContentScale,
    toggleSnippet,
    scanFolders,
    resetAppearance,
    openThemesFolder,
    openSnippetsFolder,
  } = useTheme();

  const withBlocked = [...customThemes, ...snippets].filter((sheet) => sheet.blocked.length > 0);
  const currentLabel =
    (themeFile ? customThemes.find((theme) => theme.file === themeFile)?.label : BUILT_IN_THEMES.find((t) => t.id === themeId)?.label) ??
    "Theme";

  return (
    <div className="appearance-settings">
      <section className="appearance-section">
        <p className="ui-eyebrow">Theme</p>
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
          Themes you make go in a folder as plain <code>.css</code> files. Build one in the sandbox, press{" "}
          <em>Show me the CSS</em>, save it there, and it turns up in this list.
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
      </section>

      <section className="appearance-section">
        <p className="ui-eyebrow">Colours and gradients</p>
        <ThemeEditor currentLabel={currentLabel} />
      </section>

      <section className="appearance-section">
        <p className="ui-eyebrow">Fonts</p>
        {slots.map((slot) => (
          <FontPicker key={slot.key} slot={slot} />
        ))}
        <p className="appearance-note">
          These stay put when you change theme, so a face you like survives trying something else. A theme can set its own — leave a
          slot on <em>whatever the theme uses</em> and it will.
        </p>
      </section>

      <section className="appearance-section">
        <p className="ui-eyebrow">Text size</p>

        {/* Two, because they answer different questions — the app's labels want
            to be as small as you can still read them and the text you write in
            wants to be comfortable, and those aren't the same number. */}
        <ScaleSlider
          label="Writing"
          hint="the text on your pages"
          value={contentScale}
          min={CONTENT_SCALE_MIN}
          max={CONTENT_SCALE_MAX}
          onChange={setContentScale}
        />
        <ScaleSlider
          label="Interface"
          hint="menus, titles, labels — everything else"
          value={textScale}
          min={TEXT_SCALE_MIN}
          max={TEXT_SCALE_MAX}
          onChange={setTextScale}
        />

        <p className="appearance-note">Text only — the panels and spacing stay where they are.</p>
      </section>

      <section className="appearance-section">
        <p className="ui-eyebrow">Snippets</p>
        <p className="appearance-note">
          Small bits of CSS that sit on top of whichever theme is on, each switched on and off by itself. For changing one thing
          without making a whole theme.
        </p>

        {snippets.length === 0 ? (
          <p className="appearance-empty">Nothing in the snippets folder yet.</p>
        ) : (
          <ul className="appearance-snippets">
            {snippets.map((snippet) => (
              <li key={snippet.file}>
                <label className="appearance-snippet">
                  <input
                    type="checkbox"
                    checked={enabledSnippets.includes(snippet.file)}
                    onChange={() => void toggleSnippet(snippet.file)}
                  />
                  <span className="appearance-snippet-name">{snippet.label}</span>
                  <span className="appearance-snippet-file">{snippet.file}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <p className="appearance-actions">
          <button type="button" className="ui-btn ui-btn-secondary" onClick={() => void openSnippetsFolder()}>
            <FolderOpen size={14} />
            Open snippets folder
          </button>
        </p>

        <FolderErrorNotice error={folderError} folder="snippets" />
      </section>

      {withBlocked.length > 0 && (
        <section className="appearance-section">
          {withBlocked.map((sheet) => (
            <BlockedNotice key={sheet.file} sheet={sheet} />
          ))}
        </section>
      )}

      <p className="appearance-actions">
        <button type="button" className="ui-link" onClick={() => void resetAppearance()}>
          Put everything back to default
        </button>
      </p>
    </div>
  );
}
