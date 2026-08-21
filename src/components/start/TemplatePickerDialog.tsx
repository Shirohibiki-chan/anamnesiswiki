// "Start from a template" — the third entry under Add a Project, and the last
// thing Phase 27 was waiting on.
//
// **The tree preview is the feature, not decoration.** A template is somebody
// else's folder setup, and the only question worth answering before building
// one is "what am I about to get". A list of names with a file size next to
// them would make her create a project to find out, then delete it.
//
// One window rather than a submenu of templates plus a naming step somewhere
// else: choosing a shape and naming the thing it makes is one intention, and
// the same reasoning that put pinning and reordering in one window.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Folder, FolderOpen, X } from "lucide-react";
import { FOLDER_TEMPLATE_KEY } from "../../constants/schema";
import type { ProjectTemplateFile, ProjectTemplateNode } from "../../constants/project-template";
import type { TemplateChoice } from "../../hooks/use-project-templates";

type TemplatePickerDialogProps = {
  choices: TemplateChoice[];
  isBusy: boolean;
  error: string | null;
  /** Resolves with what she opened, so the list can select it. Null if she cancelled or it wouldn't parse. */
  onOpenFile: () => Promise<TemplateChoice | null>;
  onCreate: (choice: TemplateChoice, name: string) => void;
  onClose: () => void;
};

/**
 * How deep each entry sits, for indenting the preview.
 *
 * Walking the flat list once works because the file guarantees parents come
 * before their children (see `constants/project-template.ts`) — so a parent's
 * depth is always already known by the time its child is read.
 */
function depthsOf(file: ProjectTemplateFile): Map<string, number> {
  const depths = new Map<string, number>();
  for (const node of file.nodes) {
    const parentDepth = node.parentId === null ? -1 : (depths.get(node.parentId) ?? -1);
    depths.set(node.id, parentDepth + 1);
  }
  return depths;
}

/** "6 folders, 5 starter pages" — plural handled, zero halves dropped. */
function countLine(folders: number, pages: number): string {
  const parts: string[] = [];
  if (folders > 0) parts.push(`${folders} folder${folders === 1 ? "" : "s"}`);
  if (pages > 0) parts.push(`${pages} starter page${pages === 1 ? "" : "s"}`);
  return parts.join(", ");
}

export function TemplatePickerDialog({
  choices,
  isBusy,
  error,
  onOpenFile,
  onCreate,
  onClose,
}: TemplatePickerDialogProps) {
  // Opens on the template that ships, which is the only one there is until she
  // opens a file. Selecting what she just opened happens in the handler that
  // opened it — `onOpenFile` resolves with the choice — rather than in an
  // effect watching the list: an effect would also fire on a re-open of a file
  // already listed and move the selection she had just made by hand.
  const [selectedId, setSelectedId] = useState(() => choices[0]?.id ?? "");
  const [name, setName] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  const selected = choices.find((choice) => choice.id === selectedId) ?? choices[0];
  const depths = selected ? depthsOf(selected.file) : new Map<string, number>();

  return createPortal(
    <div className="ui-backdrop" onClick={onClose}>
      <div className="ui-modal template-picker" onClick={(event) => event.stopPropagation()}>
        <header className="template-picker-head">
          <h2>Start from a Template</h2>
          <p>A folder setup somebody worked out, ready to build in. Nothing of theirs is inside it.</p>
          <button type="button" className="ui-icon-btn template-picker-close" aria-label="Close" onClick={onClose}>
            <X size={15} />
          </button>
        </header>

        <div className="template-picker-body">
          <ul className="template-picker-list" role="radiogroup" aria-label="Templates">
            {choices.map((choice) => (
              <li key={choice.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={choice.id === selected?.id}
                  className="template-picker-choice"
                  // The path for a file, nothing for the built-in — a tooltip
                  // reading "built-in" would say less than the row already does.
                  title={choice.origin === "file" ? choice.id : undefined}
                  onClick={() => setSelectedId(choice.id)}
                >
                  <b>{choice.file.name}</b>
                  <span>
                    {choice.file.description ||
                      countLine(choice.summary.folders, choice.summary.pages) ||
                      "An empty shape."}
                  </span>
                  {choice.origin === "built-in" && <em>Included with Anamnesis</em>}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="template-picker-choice template-picker-open"
                onClick={() =>
                  void onOpenFile().then((choice) => {
                    if (choice) setSelectedId(choice.id);
                  })
                }
                disabled={isBusy}
              >
                <b>
                  <FolderOpen size={13} />
                  Open a template file…
                </b>
                <span>One somebody sent you. It stays where it is — nothing is copied anywhere.</span>
              </button>
            </li>
          </ul>

          {selected && (
            <div className="template-picker-preview">
              <h3 className="template-picker-subhead">
                What you'll get
                <em>{countLine(selected.summary.folders, selected.summary.pages)}</em>
              </h3>
              <ol className="template-picker-tree">
                {selected.file.nodes.map((node) => (
                  <PreviewRow key={node.id} node={node} depth={depths.get(node.id) ?? 0} />
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Above the form rather than below it. The form is the last thing
            in the window and carries its bottom padding, so an error under
            it would either sit outside that padding or need a negative
            margin to climb back into it. Above, it also lands next to the
            box the message is usually about. */}
        {error && <p className="template-picker-error">{error}</p>}

        <form
          className="template-picker-foot"
          onSubmit={(event) => {
            event.preventDefault();
            if (selected) onCreate(selected, name);
          }}
        >
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Project name"
            aria-label="Project name"
            autoFocus
            disabled={isBusy}
          />
          <button type="submit" className="ui-btn ui-btn-primary" disabled={isBusy || !selected}>
            Create
          </button>
          <button type="button" className="ui-btn" onClick={onClose} disabled={isBusy}>
            Cancel
          </button>
        </form>

      </div>
    </div>,
    document.body,
  );
}

/**
 * One line of the preview.
 *
 * Indented with a style rather than nested lists, because the file is flat and
 * rebuilding a nesting here to then draw it flat again would be work in
 * service of markup nobody reads.
 */
function PreviewRow({ node, depth }: { node: ProjectTemplateNode; depth: number }) {
  const isFolder = node.templateKey === FOLDER_TEMPLATE_KEY;
  return (
    <li className="template-picker-row" style={{ paddingLeft: `calc(${depth} * var(--space-md))` }}>
      {isFolder ? <Folder size={13} /> : <FileText size={13} />}
      <span className={isFolder ? "template-picker-folder" : undefined}>{node.name}</span>
    </li>
  );
}
