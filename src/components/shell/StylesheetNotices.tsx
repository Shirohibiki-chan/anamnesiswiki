// The two things Settings has to say about the `.css` files she keeps in her
// own folders. Both the Theme panel and the Snippets panel need them, and both
// need them about *their own* folder, which is why they take a `folder` rather
// than being rendered once at the bottom of everything: a snippet that tried to
// load a webfont is a fact about snippets, and it belongs on that screen.
import { AlertTriangle } from "lucide-react";
import type { CustomStylesheet, ThemeStoreState } from "../../state/theme-store";

/** The "we stripped some URLs" notice. Names them — see sanitizeCustomCss. */
export function BlockedNotice({ sheet }: { sheet: CustomStylesheet }) {
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
 * Shown when a theme's file wouldn't delete — locked, refused, or on a drive
 * that isn't there. Same shape as the folder notice and for the same reason:
 * the path is what she needs, because the folder is hers and she can finish
 * the job in Explorer.
 */
export function DeleteErrorNotice({ error }: { error: ThemeStoreState["deleteError"] }) {
  if (!error) return null;
  return (
    <p className="appearance-blocked">
      <AlertTriangle size={12} />
      <span>
        Couldn't delete <strong>{error.file}</strong> — something else may have it open. It's still in <code>{error.path}</code>.
      </span>
    </p>
  );
}

/**
 * Shown when an import didn't turn into a theme.
 *
 * Three sentences rather than one, because the three failures need three
 * different next moves and "couldn't import that" tells her none of them. The
 * middle one is the interesting case: a `.json` full of colours is a palette
 * and a `.json` full of anything else is a settings file somebody grabbed by
 * mistake, and only the second is worth going back to the picker for.
 */
export function ImportErrorNotice({ error }: { error: ThemeStoreState["importError"] }) {
  if (!error) return null;
  const said = {
    unreadable: "couldn't be opened — it may have moved, or be on a drive that isn't plugged in.",
    "no-colours": "doesn't have colours in it that could be read as a palette. A palette file is a list of names and hex codes.",
    unwritable: "was read fine, but the copy couldn't be saved into your themes folder.",
  }[error.reason];
  return (
    <p className="appearance-blocked">
      <AlertTriangle size={12} />
      <span>
        <strong>{error.file}</strong> {said}
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
export function FolderErrorNotice({ error, folder }: { error: ThemeStoreState["folderError"]; folder: "themes" | "snippets" }) {
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
