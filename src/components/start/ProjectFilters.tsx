// The chip row under the library's heading: All, her groups, and the archive.
//
// **Chips rather than a folder tree down the side.** A group is a filter over
// the library, not a place a project lives (her call, 2026-08-14) — and a row
// of chips is the one shape that says so, because everything is still one
// list underneath and one click puts it back.
//
// The row only ever shows what exists. No groups and nothing archived means
// one "All" chip and a way to make a group, rather than a rank of empty
// categories explaining a feature she hasn't used yet.
import { useRef, useState } from "react";
import { Archive, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useClickOutside } from "../../hooks/use-click-outside";
import { SCOPE_ALL, SCOPE_ARCHIVED, type LibraryScope } from "../../services/library-scope";
import type { ProjectGroup } from "../../services/project-groups";

type ProjectFiltersProps = {
  groups: ProjectGroup[];
  /** How many projects are folded away — the archive chip's whole reason to be on screen. */
  archivedCount: number;
  scope: LibraryScope;
  onScope: (scope: LibraryScope) => void;
  onCreateGroup: (name: string) => void;
  onRenameGroup: (id: string, name: string) => void;
  onDeleteGroup: (id: string) => void;
};

export function ProjectFilters({
  groups,
  archivedCount,
  scope,
  onScope,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
}: ProjectFiltersProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");

  function addGroup() {
    onCreateGroup(newName);
    setNewName("");
    setIsAdding(false);
  }

  return (
    <div className="start-scopes" role="group" aria-label="Filter projects">
      <button
        type="button"
        className="start-scope"
        aria-pressed={scope === SCOPE_ALL}
        onClick={() => onScope(SCOPE_ALL)}
      >
        All
      </button>

      {groups.map((group) => (
        <GroupChip
          key={group.id}
          group={group}
          isActive={scope === group.id}
          onSelect={() => onScope(group.id)}
          onRename={(name) => onRenameGroup(group.id, name)}
          onDelete={() => onDeleteGroup(group.id)}
        />
      ))}

      {archivedCount > 0 && (
        <button
          type="button"
          className="start-scope"
          aria-pressed={scope === SCOPE_ARCHIVED}
          onClick={() => onScope(SCOPE_ARCHIVED)}
        >
          <Archive size={12} />
          Archived
          <span className="start-scope-count">{archivedCount}</span>
        </button>
      )}

      {isAdding ? (
        <form
          className="start-scope-form"
          onSubmit={(event) => {
            event.preventDefault();
            addGroup();
          }}
        >
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Group name"
            aria-label="Group name"
            autoFocus
            // Committed on blur rather than thrown away: she has typed a name,
            // and clicking off a text box is not a decision to discard it. An
            // empty one makes no group, so a stray click still costs nothing.
            onBlur={addGroup}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.stopPropagation();
              setNewName("");
              setIsAdding(false);
            }}
          />
        </form>
      ) : (
        <button type="button" className="start-scope start-scope-add" onClick={() => setIsAdding(true)}>
          <Plus size={12} />
          New group
        </button>
      )}
    </div>
  );
}

/**
 * One group's chip: a filter, and — once it is the one you are looking at —
 * the way to rename or remove it.
 *
 * **Its menu button only appears on the chip that is on.** A row of chips each
 * carrying a permanent `⋯` is a row of furniture, and renaming a group is
 * rare enough to be worth one extra click; clicking the group first is also
 * the click that shows her what is in the thing she is about to rename.
 */
function GroupChip({
  group,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: {
  group: ProjectGroup;
  isActive: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draft, setDraft] = useState(group.name);
  const boundary = useRef<HTMLDivElement>(null);
  useClickOutside(boundary, () => setIsMenuOpen(false), isMenuOpen);

  function commitRename() {
    onRename(draft);
    setIsRenaming(false);
  }

  if (isRenaming) {
    return (
      <form
        className="start-scope-form"
        onSubmit={(event) => {
          event.preventDefault();
          commitRename();
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          aria-label={`Rename ${group.name}`}
          autoFocus
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            setDraft(group.name);
            setIsRenaming(false);
          }}
        />
      </form>
    );
  }

  return (
    <div className="start-scope-wrap" ref={boundary}>
      <button type="button" className="start-scope" aria-pressed={isActive} onClick={onSelect}>
        {group.name}
        {/* Nothing rather than a zero. Every other chip carries a number, so
            an absent one reads as none — where a "0" beside a name she just
            typed reads as something having gone wrong with it. */}
        {group.members.length > 0 && <span className="start-scope-count">{group.members.length}</span>}
      </button>

      {isActive && (
        <button
          type="button"
          className="ui-icon-btn ui-icon-btn-sm start-scope-menu-btn"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          aria-label={`Actions for ${group.name}`}
          title="Group actions"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <MoreHorizontal size={13} />
        </button>
      )}

      {isMenuOpen && (
        <div className="start-menu start-scope-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className="project-tile-menu-item"
            onClick={() => {
              setIsMenuOpen(false);
              setDraft(group.name);
              setIsRenaming(true);
            }}
          >
            <Pencil size={13} />
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            className="project-tile-menu-item"
            title="The projects in it stay exactly where they are."
            onClick={() => {
              setIsMenuOpen(false);
              onDelete();
            }}
          >
            <Trash2 size={13} />
            Delete group
          </button>
        </div>
      )}
    </div>
  );
}
