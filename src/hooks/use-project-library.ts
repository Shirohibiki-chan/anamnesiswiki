// How the start screen's library is organised: the groups, the archive, and
// which chip is currently on.
//
// One hook rather than one per feature, and that is a claim about the screen
// rather than laziness. Groups and the archive are the same job — filing a
// project without moving it — they are read together on every render of the
// chip row, and the scope that says which chip is on is meaningless without
// both. Splitting them would mean two loading flags to reconcile before the
// row could draw once.
//
// Held here rather than in a store for the reason `use-pins.ts` gives: both
// ends are in one screen, and a store would be a second home for state that
// never leaves the house.
import { useCallback, useEffect, useMemo, useState } from "react";
import * as appSettings from "../services/app-settings-service";
import { isScopeAvailable, SCOPE_ALL, type LibraryScope } from "../services/library-scope";
import * as projectGroups from "../services/project-groups";
import type { ProjectGroup } from "../services/project-groups";
import { addRef, hasRef, healRefs, removeRef, type ProjectRef } from "../services/project-refs";
import type { ListedWorld } from "../services/world-scan";

export function useProjectLibrary(worlds: readonly ListedWorld[]) {
  const [groups, setGroups] = useState<ProjectGroup[]>([]);
  const [archived, setArchived] = useState<ProjectRef[]>([]);
  // Until the settings file has been read, an empty chip row means "not read
  // yet" rather than "nothing is filed" — and those two draw differently.
  const [isLoaded, setIsLoaded] = useState(false);
  // Not persisted, deliberately. A filter that survived closing the app would
  // greet her with a library that looks like it has lost most of her projects,
  // and the one keystroke that fixes it is the one she has no reason to guess.
  const [chosenScope, setScope] = useState<LibraryScope>(SCOPE_ALL);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      appSettings.getProjectGroups().catch(() => []),
      appSettings.getArchivedProjects().catch(() => []),
    ]).then(([storedGroups, storedArchived]) => {
      if (cancelled) return;
      setGroups(storedGroups);
      setArchived(storedArchived);
      setIsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Applied to the screen first and written after, unawaited — the same shape
  // pins and preferences use. A chip that waits on a disk round trip before it
  // lights up is a chip that feels broken.
  const applyGroups = useCallback((next: ProjectGroup[]) => {
    setGroups(next);
    void appSettings.setProjectGroups(next).catch(() => {});
  }, []);

  const applyArchived = useCallback((next: ProjectRef[]) => {
    setArchived(next);
    void appSettings.setArchivedProjects(next).catch(() => {});
  }, []);

  // Whatever the scan has since learned — an id a project gained the first
  // time it was opened, a path that changed under an entry matched by id.
  // Derived rather than stored so there is one answer rather than two; both
  // healers return the list they were given when nothing drifted, so this is
  // the stored state itself on all but the rare pass that finds something.
  const healedGroups = useMemo(() => projectGroups.healGroups(groups, worlds) ?? groups, [groups, worlds]);
  const healedArchived = useMemo(() => healRefs(archived, worlds) ?? archived, [archived, worlds]);

  useEffect(() => {
    if (healedGroups !== groups) void appSettings.setProjectGroups(healedGroups).catch(() => {});
  }, [healedGroups, groups]);

  useEffect(() => {
    if (healedArchived !== archived) void appSettings.setArchivedProjects(healedArchived).catch(() => {});
  }, [healedArchived, archived]);

  // A chip that has gone — a deleted group, or the archive after the last
  // project came out of it — falls back to All rather than leaving the row
  // with nothing pressed and the grid empty. Derived for the same reason the
  // healed lists are: an effect would leave one render showing the gap.
  const library = { groups: healedGroups, archived: healedArchived };
  const scope = isScopeAvailable(chosenScope, library) ? chosenScope : SCOPE_ALL;

  return {
    groups: healedGroups,
    archived: healedArchived,
    isLoaded,
    scope,
    setScope,
    isArchived: useCallback((world: ListedWorld) => hasRef(healedArchived, world), [healedArchived]),
    archive: useCallback(
      (world: ListedWorld) => applyArchived(addRef(healedArchived, world)),
      [applyArchived, healedArchived],
    ),
    unarchive: useCallback(
      (world: ListedWorld) => applyArchived(removeRef(healedArchived, world)),
      [applyArchived, healedArchived],
    ),
    /**
     * Strips a project out of the archive and every group it was filed in.
     *
     * Only for a project that has actually gone. `healRefs` and `healGroups`
     * deliberately keep a ref they can't currently match — a project on an
     * unplugged drive or a not-yet-synced folder must come back to the same
     * chips it left — so nothing else ever removes one, and a deleted project
     * would otherwise sit in the archive count for good.
     */
    forget: useCallback(
      (world: ListedWorld) => {
        applyArchived(removeRef(healedArchived, world));
        applyGroups(
          healedGroups.reduce(
            (groupsSoFar, group) =>
              projectGroups.groupsOf(groupsSoFar, world).some((candidate) => candidate.id === group.id)
                ? projectGroups.toggleGroupMember(groupsSoFar, group.id, world)
                : groupsSoFar,
            healedGroups,
          ),
        );
      },
      [applyArchived, applyGroups, healedArchived, healedGroups],
    ),
    createGroup: useCallback(
      (name: string, first?: ListedWorld) => applyGroups(projectGroups.createGroup(healedGroups, name, first)),
      [applyGroups, healedGroups],
    ),
    renameGroup: useCallback(
      (id: string, name: string) => applyGroups(projectGroups.renameGroup(healedGroups, id, name)),
      [applyGroups, healedGroups],
    ),
    deleteGroup: useCallback(
      (id: string) => applyGroups(projectGroups.deleteGroup(healedGroups, id)),
      [applyGroups, healedGroups],
    ),
    toggleGroupMember: useCallback(
      (id: string, world: ListedWorld) => applyGroups(projectGroups.toggleGroupMember(healedGroups, id, world)),
      [applyGroups, healedGroups],
    ),
    groupsOf: useCallback(
      (world: ListedWorld) => projectGroups.groupsOf(healedGroups, world),
      [healedGroups],
    ),
  };
}
