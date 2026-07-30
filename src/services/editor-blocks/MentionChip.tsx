// The rendered chip for the "mention" inline content type — split into its
// own file so mention-inline-content.tsx exports only the spec, keeping Vite
// fast-refresh boundaries clean. See mention-inline-content.tsx for the
// custom-block-in-services/ layering note.
import type { ReactCustomInlineContentRenderProps } from "@blocknote/react";
import type { DefaultStyleSchema } from "@blocknote/core";
import { getTemplateIcon } from "../../constants/icons";
import { useProject } from "../../hooks/use-project";
import type { MentionConfig } from "./mention-inline-content";

type MentionChipProps = ReactCustomInlineContentRenderProps<MentionConfig, DefaultStyleSchema>;

export function MentionChip({ inlineContent, contentRef }: MentionChipProps) {
  const { nodeId, label } = inlineContent.props;
  const { nodes, selectNode } = useProject();
  const target = nodes[nodeId];
  const Icon = getTemplateIcon(target?.templateKey ?? "note");

  return (
    <span
      ref={contentRef}
      className={`editor-mention${target ? "" : " editor-mention-broken"}`}
      role={target ? "link" : undefined}
      tabIndex={target ? 0 : undefined}
      onClick={() => target && selectNode(target.id)}
      onKeyDown={(e) => {
        if (target && (e.key === "Enter" || e.key === " ")) selectNode(target.id);
      }}
    >
      {/* eslint-disable-next-line react-hooks/static-components -- getTemplateIcon returns a stable component reference for a given templateKey */}
      <Icon size={12} />
      {target?.name ?? label}
    </span>
  );
}
