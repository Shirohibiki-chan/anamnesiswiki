// The colour and gradient pickers — Settings → Colours.
//
// This exists because of a fair question: *"i know we have css override but
// shouldn't we enable people to change colors in-app too, or is that too
// complicated? ... Idk i get that CSS is more robust but why not both."* The
// answer was that there's no reason not to have both, as long as they're the
// same both — so these controls don't have a format of their own. Every change
// here edits a `.css` file in the themes folder, and every one of those files
// reads back into these controls. Build a theme with the pickers and open it in
// Notepad; write one in Notepad and open it here. Same file.
//
// *Edits*, note — not rewrites. That distinction is load-bearing and it cost
// somebody's work to learn: see `patchTheme` in services/theme-editor.ts.
//
// What's deliberately *not* here is a live preview pane. The app is the
// preview — the window behind this panel is already showing every change as
// it's made, at full size, on real content.
import { useState } from "react";
import { ChevronDown, FileText, Plus } from "lucide-react";
import { COLOR_GROUPS, GRADIENT_SLOTS, RADIAL_ORIGINS, type ColorToken, type GradientSlot } from "../../constants/theme-tokens";
import { BUILT_IN_THEMES } from "../../constants/themes";
import { useTheme } from "../../hooks/use-theme";
import { gradientCss, type Gradient } from "../../services/theme-editor";

function ColorRow({ token, value, onChange }: { token: ColorToken; value: string; onChange: (hex: string) => void }) {
  return (
    <label className="theme-edit-color">
      {/* The swatch *is* the input — a 28px square of the colour that opens the
          OS picker when you click it. A separate "edit" affordance beside a
          preview would be two things where one will do. */}
      <input type="color" className="theme-edit-swatch" value={value} onChange={(event) => onChange(event.target.value)} />
      <span className="theme-edit-color-text">
        <span className="theme-edit-color-label">{token.label}</span>
        {token.hint && <span className="theme-edit-color-hint">{token.hint}</span>}
      </span>
      <code className="theme-edit-hex">{value}</code>
    </label>
  );
}

function GradientRow({
  slot,
  gradient,
  onToggle,
  onChange,
}: {
  slot: GradientSlot;
  gradient: Gradient | undefined;
  onToggle: (on: boolean) => void;
  onChange: (gradient: Gradient | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const on = Boolean(gradient?.on);
  // Written by hand into the file in a shape these two stops can't express —
  // three colours, a conic, whatever. Shown, kept, and left alone.
  const handWritten = Boolean(gradient?.raw);

  const edit = (patch: Partial<Gradient>) => {
    if (!gradient) return;
    onChange({ ...gradient, ...patch });
  };

  return (
    <div className={`theme-edit-gradient${on ? " theme-edit-gradient-on" : ""}`}>
      <div className="theme-edit-gradient-head">
        <input
          type="checkbox"
          checked={on}
          aria-label={slot.label}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <button
          type="button"
          className="theme-edit-gradient-name"
          disabled={!on || handWritten}
          aria-expanded={open}
          onClick={() => setOpen((was) => !was)}
        >
          <span className="theme-edit-gradient-label">{slot.label}</span>
          <span className="theme-edit-gradient-hint">{slot.hint}</span>
        </button>
        {on && gradient && (
          // `raw` first: a hand-written gradient has to preview as what it is,
          // not as what these two stops would make of it.
          <span className="theme-edit-gradient-preview" style={{ backgroundImage: gradient.raw ?? gradientCss(gradient) }} aria-hidden="true" />
        )}
        {on && !handWritten && <ChevronDown size={14} className={`theme-edit-chevron${open ? " theme-edit-chevron-open" : ""}`} />}
      </div>

      {on && handWritten && (
        <p className="theme-edit-handwritten">
          Written by hand in the file, in a shape these controls can't show. It's left exactly as it is — edit the file to change it,
          or untick this to drop it.
        </p>
      )}

      {on && !handWritten && open && gradient && (
        <div className="theme-edit-gradient-body">
          <div className="theme-edit-field">
            <span className="theme-edit-field-label">Shape</span>
            <select
              className="appearance-select"
              value={gradient.type}
              onChange={(event) => edit({ type: event.target.value as Gradient["type"] })}
            >
              <option value="linear">Straight line</option>
              <option value="radial">Glow from a point</option>
            </select>
          </div>

          {gradient.type === "linear" ? (
            <div className="theme-edit-field">
              <span className="theme-edit-field-label">Direction</span>
              <input
                type="range"
                className="appearance-range"
                min={0}
                max={360}
                step={5}
                value={gradient.angle}
                aria-label="Direction"
                onChange={(event) => edit({ angle: Number(event.target.value) })}
              />
              <span className="theme-edit-field-value">{gradient.angle}°</span>
            </div>
          ) : (
            <div className="theme-edit-field">
              <span className="theme-edit-field-label">Comes from</span>
              <select className="appearance-select" value={gradient.origin} onChange={(event) => edit({ origin: event.target.value })}>
                {RADIAL_ORIGINS.map((origin) => (
                  <option key={origin.value} value={origin.value}>
                    {origin.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(["from", "to"] as const).map((end) => (
            <div className="theme-edit-field" key={end}>
              <span className="theme-edit-field-label">{end === "from" ? "Start" : "End"}</span>
              <input
                type="color"
                className="theme-edit-swatch"
                value={gradient[end].color}
                aria-label={`${end === "from" ? "Start" : "End"} colour`}
                onChange={(event) => edit({ [end]: { ...gradient[end], color: event.target.value } } as Partial<Gradient>)}
              />
              {/* See-through-ness, per end. Without it half of these are
                  unusable: the selected row, the tags and the callout wash all
                  sit *over* something and have to fade out rather than stop. */}
              <input
                type="range"
                className="appearance-range"
                min={0}
                max={1}
                step={0.02}
                value={gradient[end].alpha}
                aria-label={`${end === "from" ? "Start" : "End"} opacity`}
                onChange={(event) => edit({ [end]: { ...gradient[end], alpha: Number(event.target.value) } } as Partial<Gradient>)}
              />
              <span className="theme-edit-field-value">{Math.round(gradient[end].alpha * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** The "copy what's on screen into a file I can edit" control. */
function CreateTheme({ suggestion }: { suggestion: string }) {
  const { createTheme, themesDir } = useTheme();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      await createTheme(name.trim() || suggestion);
      setName("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="theme-edit-create">
      <p className="appearance-note">
        The built-in themes can't be edited — they ship with the app. Take a copy of this one and you can change anything in it.
      </p>
      <div className="theme-edit-create-row">
        <input
          type="text"
          className="theme-edit-name"
          value={name}
          placeholder={suggestion}
          aria-label="Name for the new theme"
          disabled={!themesDir || busy}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void create();
          }}
        />
        <button type="button" className="ui-btn ui-btn-secondary" disabled={!themesDir || busy} onClick={() => void create()}>
          <Plus size={14} />
          Make a copy I can edit
        </button>
      </div>
    </div>
  );
}

/**
 * What these controls will and won't do to her file.
 *
 * Here because the pickers used to rebuild the whole stylesheet from the
 * twenty-odd tokens they know about, so one click on a swatch replaced a
 * hand-written theme with the app's version of it — rules, comments and all.
 * That's fixed in `patchTheme`, but a promise about someone's work is worth
 * making out loud rather than leaving them to find out by risking it.
 */
function EditingNote({ folder, failed }: { folder: string | null; failed: boolean }) {
  return (
    <p className="theme-edit-note">
      <FileText size={12} />
      <span>
        These change the colours in your theme file and leave the rest of it exactly as it is — anything you wrote by hand stays.{" "}
        {failed ? (
          <>A spare copy couldn't be saved, so keep your own if the file matters.</>
        ) : (
          <>
            A copy of it from before this session's first change is kept in {folder ? <code>{folder}</code> : <code>themes/backups</code>}.
          </>
        )}
      </span>
    </p>
  );
}

export function ThemeEditor() {
  const {
    draft,
    themeId,
    themeFile,
    customThemes,
    backupFolder,
    backupFailed,
    setThemeColor,
    matchBackgroundsToPanel,
    toggleGradient,
    setGradient,
  } = useTheme();

  if (!draft) {
    // Only reachable on a built-in, since a custom theme always has a draft —
    // so this is the name of the theme being copied *from*.
    const label =
      (themeFile ? customThemes.find((theme) => theme.file === themeFile)?.label : BUILT_IN_THEMES.find((t) => t.id === themeId)?.label) ??
      "Theme";
    return <CreateTheme suggestion={`${label} copy`} />;
  }

  return (
    <div className="theme-edit">
      <EditingNote folder={backupFolder} failed={backupFailed} />
      {COLOR_GROUPS.map((group) => {
        const rows = group.tokens.map((token) => (
          <ColorRow
            key={token.token}
            token={token}
            // `resolved`, not `colors`. A theme file needn't set every token —
            // it inherits the rest — and showing black for the ones it skipped
            // would be a panel of black squares over an app that isn't black.
            // Touching one moves it into `colors` and it starts being written.
            value={draft.resolved[token.token] ?? "#000000"}
            onChange={(hex) => setThemeColor(token.token, hex)}
          />
        ));

        return group.advanced ? (
          // The two groups nobody edits often are folded away, and they have to
          // *look* folded. They used to be a `<summary>` styled exactly like the
          // headings above them — same size, same uppercase, same muted grey —
          // which made them read as sections that had come up empty. A chevron,
          // a border and a count of what's inside; sentence case, because it's a
          // row you press rather than a heading you read past.
          <details className="theme-edit-fold" key={group.key}>
            <summary className="theme-edit-fold-summary">
              <ChevronDown size={14} className="theme-edit-fold-chevron" />
              <span className="theme-edit-fold-label">{group.label}</span>
              <span className="theme-edit-fold-count">{group.tokens.length} colours</span>
            </summary>
            <div className="theme-edit-colors">{rows}</div>
          </details>
        ) : (
          <div className="theme-edit-group" key={group.key}>
            <p className="theme-edit-group-title">{group.label}</p>
            <div className="theme-edit-colors">{rows}</div>
            {/* Only under Backgrounds, and only because those four are the one
                group where changing a single swatch leaves the app looking
                broken rather than looking different — a pink panel behind navy
                boxes. The other groups are independent of each other. */}
            {group.key === "surfaces" && (
              <button type="button" className="ui-btn ui-btn-secondary theme-edit-match" onClick={matchBackgroundsToPanel}>
                Match the others to Panels
              </button>
            )}
          </div>
        );
      })}

      <div className="theme-edit-group">
        <p className="theme-edit-group-title">Gradients</p>
        <p className="appearance-note">
          Each one sits on top of the flat colour underneath it, so turning one off goes back to the plain surface.
        </p>
        <div className="theme-edit-gradients">
          {GRADIENT_SLOTS.map((slot) => (
            <GradientRow
              key={slot.key}
              slot={slot}
              gradient={draft.gradients[slot.key]}
              onToggle={(on) => toggleGradient(slot, on)}
              onChange={(gradient) => setGradient(slot.key, gradient)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
