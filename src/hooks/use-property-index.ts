// The only import path components have into the project-wide property and tag
// index. See CLAUDE.md's layer order — components never import services or
// stores directly.
//
// The preview functions and the apply actions are deliberately separate. The
// view runs a preview to write the sentence it shows before anything happens
// ("this will merge with the 4 pages that already use POV"), and the store
// re-plans against the live graph when the button is actually pressed.
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { getPropertySchema } from "../services/template-registry";
import {
  indexProperties,
  indexTags,
  planPropertyDelete,
  planPropertyRename,
  planTagDelete,
  planTagRename,
} from "../services/property-service";
import { useProjectStore } from "../state/project-store";

export function usePropertyIndex() {
  const nodes = useProjectStore((state) => state.nodes);
  const actions = useProjectStore(
    useShallow((state) => ({
      renameProperty: state.renamePropertyEverywhere,
      deleteProperty: state.deletePropertyEverywhere,
      renameTag: state.renameTagEverywhere,
      deleteTag: state.deleteTagEverywhere,
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
    ...actions,
  };
}
