// The `⋯` menu on a project: its cover, which groups it is filed under, and
// whether it is folded away.
//
// **In both views now.** It shipped as list view's substitute for the grid's
// hover button, because a 44px row thumbnail is too small to carry one — and
// then groups and the archive arrived, which are three actions rather than one
// and belong to the project rather than to its picture. The grid keeps its
// corner cover button exactly as it was (her call, 2026-08-19: a hover button
// on the tile), and this sits beside it carrying everything that isn't the
// cover. One component for both views, so a fourth action can never arrive in
// one view and not the other.
//
// **Portaled through `TreePopover` rather than positioned inside the tile.**
// `.start-area` is `overflow: hidden` while the grid is paged — deliberately,
// so a page is exactly what fits — and a menu opened from the bottom row would
// be cut off by that. The popover also flips and clamps against the window,
// which is the same problem the template picker hit near the bottom of a tall
// tree.
import { useRef, useState } from "react";
import { Archive, ArchiveRestore, Check, Copy, FolderOpen, ImagePlus, MoreHorizontal, Pencil, Plus, Share2, X } from "lucide-react";
import type { ProjectGroup } from "../../services/project-groups";
import type { ListedWorld } from "../../services/world-scan";
import { TreePopover } from "../tree/TreePopover";

/**
 * Everything the menu can do to a project, handed down as one prop.
 *
 * One bundle rather than seven callbacks threaded separately through the grid:
 * they are all the same feature, they all go to the same hook, and a tile that
 * takes them one at a time grows a new prop every time the menu does.
 */
export type ProjectLibraryActions = {
  groups: ProjectGroup[];
  groupIdsOf: (project: ListedWorld) => string[];
  isArchived: (project: ListedWorld) => boolean;
  onToggleGroup: (project: ListedWorld, groupId: string) => void;
  onCreateGroup: (project: ListedWorld, name: string) => void;
  onArchive: (project: ListedWorld) => void;
  onUnarchive: (project: ListedWorld) => void;
};

type ProjectTileMenuProps = {
  project: ListedWorld;
  library: ProjectLibraryActions;
  disabled: boolean;
  /** Null when nothing is set, which is what decides between adding a cover and removing one. */
  coverUrl: string | null;
  onSetCover: () => void;
  onRemoveCover: () => void;
  /**
   * The OS's own word for its file manager. Releases build for three
   * platforms and this is a label someone reads to find out what it does, so
   * a hard-coded "File Explorer" is wrong on two of them — same reasoning, and
   * the same source, as the tree row's menu.
   */
  fileManagerName: string;
  onShowInFolder: () => void;
  onDuplicate: (name: string) => void;
  /**
   * Renames the project *and* its folder. Named "Rename" rather than "Rename
   * project" because everything in this menu is about the project — see the
   * note on `onExportTemplate`.
   */
  onRename: (name: string) => void;
  /**
   * This project's shape written out as a template file (Phase 27). Up here
   * with the cover, the file manager and Duplicate rather than down among the
   * groups: those four are things done *to* the project, and everything below
   * the Groups label is filing.
   */
  onExportTemplate: () => void;
};

export function ProjectTileMenu({
  project,
  library,
  disabled,
  coverUrl,
  onSetCover,
  onRemoveCover,
  fileManagerName,
  onShowInFolder,
  onDuplicate,
  onRename,
  onExportTemplate,
}: ProjectTileMenuProps) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  // Which of the two things in this menu is being named, or null. One piece of
  // state rather than a boolean each, because only one text box can be open at
  // a time and two flags could disagree about that.
  const [naming, setNaming] = useState<"group" | "copy" | "rename" | null>(null);
  const [draft, setDraft] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  // Whether the menu was open when this press started — see the button below.
  const wasOpenOnPress = useRef(false);

  const inGroups = library.groupIdsOf(project);
  const isArchived = library.isArchived(project);

  function close() {
    setAnchorRect(null);
    setNaming(null);
    setDraft("");
  }

  function startNaming(what: "group" | "copy" | "rename") {
    setNaming(what);
    // A copy is named after the thing it came from, so the box opens with that
    // in it and selected — most forks are the same name with a version on the
    // end, and retyping it is the part she would resent. A rename opens on the
    // name it has now, for the same reason and more so: most renames are a fix
    // to part of a name rather than a new one. A group is named after
    // something that does not exist yet, so it opens empty.
    if (what === "group") setDraft("");
    else setDraft(what === "copy" ? `${project.name} copy` : project.name);
  }

  function commitName() {
    if (naming === "group") library.onCreateGroup(project, draft);
    else if (naming === "copy") onDuplicate(draft);
    else if (naming === "rename") onRename(draft);
    close();
  }

  return (
    <div className="project-tile-menu">
      <button
        ref={trigger}
        type="button"
        className="ui-icon-btn project-tile-menu-btn"
        aria-haspopup="menu"
        aria-expanded={anchorRect !== null}
        aria-label="Project actions"
        title="Project actions"
        disabled={disabled}
        // **Opens on click, and remembers on pointer-down whether it was
        // already open.** Both halves are load-bearing, and opening on
        // pointer-down instead is a menu that never appears: `TreePopover`
        // attaches its close-on-outside listener as React flushes the effects
        // of that same discrete press, so the press is still on its way up to
        // `document` when the listener starts caring about it, and the menu is
        // torn down microseconds after it mounts. Synthetic events do not
        // reproduce that — it took a real one to see it.
        //
        // Opening on click alone has the opposite fault: the press that closed
        // the menu leaves the state saying "closed", so the click behind it
        // would reopen what she was shutting. The ref answers that, because it
        // is read before any of this happens. `anchorRect` is the keyboard
        // path, where there is no press to remember.
        onPointerDown={() => {
          wasOpenOnPress.current = anchorRect !== null;
        }}
        onClick={() => {
          const shouldClose = wasOpenOnPress.current || anchorRect !== null;
          wasOpenOnPress.current = false;
          if (shouldClose) close();
          else setAnchorRect(trigger.current?.getBoundingClientRect() ?? null);
        }}
      >
        <MoreHorizontal size={14} />
      </button>

      {anchorRect && (
        <TreePopover anchorRect={anchorRect} onClose={close} className="project-menu">
          <div role="menu">
            <button
              type="button"
              role="menuitem"
              className="project-tile-menu-item"
              onClick={() => {
                close();
                (coverUrl ? onRemoveCover : onSetCover)();
              }}
            >
              {coverUrl ? <X size={13} /> : <ImagePlus size={13} />}
              {coverUrl ? "Remove cover" : "Set cover"}
            </button>

            {/* Above the groups, with the cover: both are things done to the
                project itself, where everything below is filing. */}
            <button
              type="button"
              role="menuitem"
              className="project-tile-menu-item"
              onClick={() => {
                close();
                onShowInFolder();
              }}
            >
              <FolderOpen size={13} />
              Show in {fileManagerName}
            </button>

            {naming === "rename" ? (
              <NameForm draft={draft} onDraft={setDraft} onCommit={commitName} onCancel={close} label="New name" />
            ) : (
              <button
                type="button"
                role="menuitem"
                className="project-tile-menu-item"
                title="Renames the project and its folder together. Nothing inside it changes."
                onClick={() => startNaming("rename")}
              >
                <Pencil size={13} />
                Rename…
              </button>
            )}

            {naming === "copy" ? (
              <NameForm draft={draft} onDraft={setDraft} onCommit={commitName} onCancel={close} label="Name for the copy" />
            ) : (
              <button
                type="button"
                role="menuitem"
                className="project-tile-menu-item"
                title="Copies the whole project into a folder beside this one. Nothing here changes."
                onClick={() => startNaming("copy")}
              >
                <Copy size={13} />
                Duplicate…
              </button>
            )}

            <button
              type="button"
              role="menuitem"
              className="project-tile-menu-item"
              title="Saves this project's folders as a file you can send. None of your writing goes in it."
              onClick={() => {
                close();
                onExportTemplate();
              }}
            >
              <Share2 size={13} />
              Export as template…
            </button>

            <p className="project-menu-label">Groups</p>

            {/* Every group, ticked or not, rather than only the ones it is in:
                the menu is where filing happens, so the groups she could file
                it under are exactly the ones that have to be on offer. */}
            {library.groups.map((group) => (
              <button
                key={group.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={inGroups.includes(group.id)}
                className="project-tile-menu-item project-menu-check"
                // Left open on purpose: filing one project under two groups is
                // one errand, and a menu that shut after each tick would make
                // it two trips.
                onClick={() => library.onToggleGroup(project, group.id)}
              >
                <Check size={13} className="project-menu-tick" />
                {group.name}
              </button>
            ))}

            {naming === "group" ? (
              <NameForm draft={draft} onDraft={setDraft} onCommit={commitName} onCancel={close} label="New group name" />
            ) : (
              <button
                type="button"
                role="menuitem"
                className="project-tile-menu-item"
                onClick={() => startNaming("group")}
              >
                <Plus size={13} />
                New group…
              </button>
            )}

            <button
              type="button"
              role="menuitem"
              className="project-tile-menu-item"
              title={
                isArchived
                  ? "Put it back with the rest of your projects."
                  : "Folds it away without deleting anything. Nothing on disk moves."
              }
              onClick={() => {
                close();
                (isArchived ? library.onUnarchive : library.onArchive)(project);
              }}
            >
              {isArchived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
              {isArchived ? "Bring back" : "Archive"}
            </button>
          </div>
        </TreePopover>
      )}
    </div>
  );
}

/**
 * The menu's text box, for the two things in it that need a name.
 *
 * One component because the two behave identically and only differ in what
 * they are called: Enter commits, Escape puts the menu back as it was, and the
 * text is selected on open so typing replaces it — which is what makes a
 * prefilled copy name cost nothing when she wants a different one.
 */
function NameForm({
  draft,
  onDraft,
  onCommit,
  onCancel,
  label,
}: {
  draft: string;
  onDraft: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  label: string;
}) {
  return (
    <form
      className="project-menu-form"
      onSubmit={(event) => {
        event.preventDefault();
        onCommit();
      }}
    >
      <input
        type="text"
        value={draft}
        onChange={(event) => onDraft(event.target.value)}
        aria-label={label}
        placeholder={label}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.stopPropagation();
          onCancel();
        }}
      />
    </form>
  );
}
