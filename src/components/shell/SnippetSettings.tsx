// Settings → Snippets. The small CSS files that layer over whichever theme is
// on, each with its own switch.
import { FolderOpen } from "lucide-react";
import { useTheme } from "../../hooks/use-theme";
import { BlockedNotice, FolderErrorNotice } from "./StylesheetNotices";

export function SnippetSettings() {
  const { snippets, enabledSnippets, folderError, toggleSnippet, openSnippetsFolder } = useTheme();
  const blocked = snippets.filter((sheet) => sheet.blocked.length > 0);

  return (
    <div className="appearance-settings">
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
      {blocked.map((sheet) => (
        <BlockedNotice key={sheet.file} sheet={sheet} />
      ))}
    </div>
  );
}
