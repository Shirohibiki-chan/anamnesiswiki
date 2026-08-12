// The only import path components have into the project-wide property and tag
// index. See CLAUDE.md's layer order — components never import services or
// stores directly.
//
// The preview functions and the apply actions are deliberately separate. The
// view runs a preview to write the sentence it shows before anything happens
// ("this will merge with the 4 pages that already use POV"), and the store
// re-plans against the live graph when the button is actually pressed.
import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { PropertyOption } from "../constants/schema";
import { getPropertySchema } from "../services/template-registry";
import {
  indexProperties,
  indexPropertyOptions,
  indexTags,
  knownOptionsFor,
  planOptionDelete,
  planOptionRename,
  planPropertyDelete,
  planPropertyRename,
  planTagDelete,
  planTagRename,
  type TagIndexEntry,
} from "../services/property-service";
import { useProjectStore } from "../state/project-store";

// Re-exported because the tag picker renders one of these per row, and a
// component may not reach into services for the type. See CLAUDE.md's layers.
export type { TagIndexEntry } from "../services/property-service";

export function usePropertyIndex() {
  const nodes = useProjectStore((state) => state.nodes);
  const actions = useProjectStore(
    useShallow((state) => ({
      renameProperty: state.renamePropertyEverywhere,
      deleteProperty: state.deletePropertyEverywhere,
      renameTag: state.renameTagEverywhere,
      deleteTag: state.deleteTagEverywhere,
      renameOption: state.renameOptionEverywhere,
      recolourOption: state.recolourOptionEverywhere,
      deleteOption: state.deleteOptionEverywhere,
    })),
  );

  // Walking every page's properties is cheap, but it happens on every
  // keystroke into any page while this is open — the store replaces the whole
  // `nodes` map each time — so it's memoised on the map identity.
  const properties = useMemo(() => indexProperties(nodes, getPropertySchema), [nodes]);
  const tags = useMemo(() => indexTags(nodes), [nodes]);

  return {
    properties,
    tags,
    previewPropertyRename: (label: string, newLabel: string) =>
      planPropertyRename(nodes, label, newLabel, getPropertySchema),
    previewPropertyDelete: (label: string) => planPropertyDelete(nodes, label),
    previewTagRename: (tag: string, newTag: string) => planTagRename(nodes, tag, newTag),
    previewTagDelete: (tag: string) => planTagDelete(nodes, tag),
    optionsFor: (propertyLabel: string) => indexPropertyOptions(nodes, propertyLabel),
    previewOptionRename: (propertyLabel: string, optionLabel: string, newLabel: string) =>
      planOptionRename(nodes, propertyLabel, optionLabel, newLabel),
    previewOptionDelete: (propertyLabel: string, optionLabel: string) =>
      planOptionDelete(nodes, propertyLabel, optionLabel),
    ...actions,
  };
}

/**
 * Every tag in the project, alphabetically, with the pages carrying each.
 *
 * Its own hook rather than a read off `usePropertyIndex` for the same reason
 * `useKnownOptions` is separate: the properties panel is on screen while she
 * types, and building the whole project-wide property index on every keystroke
 * to answer "what tags exist" would be silly. This walks tags alone.
 */
export function useAllTags(): TagIndexEntry[] {
  const nodes = useProjectStore((state) => state.nodes);
  return useMemo(() => indexTags(nodes), [nodes]);
}

/**
 * The options already in use for a property name on pages of the same kind.
 *
 * Its own hook rather than part of the index above because the properties
 * panel needs it on every page, and building the whole project-wide index on
 * every keystroke to answer one question would be silly.
 */
export function useKnownOptions(): (templateKey: string, propertyLabel: string) => PropertyOption[] {
  const nodes = useProjectStore((state) => state.nodes);
  return useCallback(
    (templateKey: string, propertyLabel: string) => knownOptionsFor(nodes, templateKey, propertyLabel),
    [nodes],
  );
}
