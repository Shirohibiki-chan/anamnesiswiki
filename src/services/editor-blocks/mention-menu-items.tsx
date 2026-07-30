// Suggestion items for the "@" mention menu — every node in the project
// except the one currently being edited. See docs/spec.md §BlockNote editor.
import type { BlockNoteEditor } from "@blocknote/core";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { getTemplateIcon } from "../../constants/icons";
import { TEMPLATE_LABELS } from "../../constants/templates";
import type { Node } from "../../constants/schema";

export function getMentionMenuItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- schema-agnostic: accepts an editor with any custom block/inline-content schema
  editor: BlockNoteEditor<any, any, any>,
  nodes: Record<string, Node>,
  currentNodeId: string,
): DefaultReactSuggestionItem[] {
  return Object.values(nodes)
    .filter((node) => node.id !== currentNodeId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((node) => {
      const Icon = getTemplateIcon(node.templateKey);
      return {
        title: node.name,
        subtext: TEMPLATE_LABELS[node.templateKey as keyof typeof TEMPLATE_LABELS],
        icon: <Icon size={14} />,
        onItemClick: () => {
          editor.insertInlineContent([{ type: "mention", props: { nodeId: node.id, label: node.name } }, " "]);
        },
      };
    });
}
