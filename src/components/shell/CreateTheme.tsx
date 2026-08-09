// "Copy what's on screen into a file I can edit" — the one way a new theme
// gets made, in the three places it's worth offering.
//
// It lived inside the Colours panel, which is the one place you only reach by
// going looking for it: Themes is where you'd expect to make a theme, and the
// button wasn't there. Now Themes has it as a plain button, and the two panels
// that can't do their job on a built-in — Colours and Fonts — offer it with a
// name field as the thing to do instead of the controls they can't show.
//
// A new theme is a copy of the one in force rather than a blank, because a
// blank isn't useful: every token has to be declared for a theme to be
// complete, and starting from what she's already looking at means the first
// edit is the one she wanted rather than the twentieth.
import { useState } from "react";
import { Plus } from "lucide-react";
import { useTheme } from "../../hooks/use-theme";

/** What a copy of the current theme would be called if she doesn't say. */
function useSuggestion(): string {
  const { themeLabel } = useTheme();
  return `${themeLabel} copy`;
}

/**
 * The full control: a name to give it, and the button.
 *
 * `note` is the sentence above it, because the reason for offering a copy is
 * different in each panel — one can't edit colours, the other can't edit fonts
 * — and a single wording would be vague in both.
 */
export function CreateTheme({ note }: { note: React.ReactNode }) {
  const { createTheme, themesDir } = useTheme();
  const suggestion = useSuggestion();
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
      <p className="appearance-note">{note}</p>
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
 * The same thing as one button, for the Themes panel's row of actions.
 *
 * No name field: that row is four buttons wide already, and the name is the
 * part you can change afterwards by renaming the file — or by making it in
 * Colours, where the field still is. Pressing this is exactly pressing the
 * button above with the field left empty.
 */
export function NewThemeButton() {
  const { createTheme, themesDir } = useTheme();
  const suggestion = useSuggestion();
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      await createTheme(suggestion);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className="ui-btn ui-btn-secondary"
      disabled={!themesDir || busy}
      title={`Copies ${suggestion.replace(/ copy$/, "")} into a new theme you can edit`}
      onClick={() => void create()}
    >
      <Plus size={14} />
      {busy ? "Making…" : "New theme"}
    </button>
  );
}
