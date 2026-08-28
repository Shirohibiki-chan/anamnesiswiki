// The rendered chip for the "mention" inline content type — split into its
// own file so mention-inline-content.tsx exports only the spec, keeping Vite
// fast-refresh boundaries clean. See mention-inline-content.tsx for the
// custom-block-in-services/ layering note.
import type { ReactCustomInlineContentRenderProps } from "@blocknote/react";
import type { DefaultStyleSchema } from "@blocknote/core";
import { getTemplateIcon } from "../../constants/icons";
import { useHoverPreview } from "../../hooks/use-hover-preview";
import { useNode, useProjectActions } from "../../hooks/use-project";
import { HoverPreviewCard } from "./HoverPreviewCard";
import type { MentionConfig } from "./mention-inline-content";

type MentionChipProps = ReactCustomInlineContentRenderProps<MentionConfig, DefaultStyleSchema>;

export function MentionChip({ inlineContent, contentRef }: MentionChipProps) {
  const { nodeId, label, text } = inlineContent.props;
  // Narrow subscriptions on purpose: a document can hold dozens of these, and
  // a full-store subscription re-rendered every one of them on every keystroke.
  const target = useNode(nodeId);
  const { selectNode } = useProjectActions();
  const { preview, anchorRect, open, close } = useHoverPreview(target?.id ?? null);
  const Icon = getTemplateIcon(target?.templateKey ?? "note");

  return (
    <>
      <span
        ref={contentRef}
        className={`editor-mention${target ? "" : " editor-mention-broken"}`}
        role={target ? "link" : undefined}
        tabIndex={target ? 0 : undefined}
        onClick={() => target && selectNode(target.id)}
        onKeyDown={(e) => {
          if (target && (e.key === "Enter" || e.key === " ")) selectNode(target.id);
        }}
        // Focus opens it too, and not only for a screen reader: this is a
        // tabbable link, and a preview you can only reach with a pointer is
        // one that doesn't exist for anyone driving the editor from the
        // keyboard. `onBlur` closes for the same reason `onMouseLeave` does.
        onMouseEnter={(e) => open(e.currentTarget)}
        onMouseLeave={close}
        onFocus={(e) => open(e.currentTarget)}
        onBlur={close}
      >
        {/* eslint-disable-next-line react-hooks/static-components -- getTemplateIcon returns a stable component reference for a given templateKey */}
        <Icon size={12} />
        {/* **Her wording wins, then the page's live name, then the name as it
            was.** The live lookup is what makes a rename reach every link to a
            page, and it must stay the default — `text` is only set when she
            deliberately asked this one link to read differently. */}
        {text || target?.name || label}
      </span>
      {preview && anchorRect && <HoverPreviewCard anchorRect={anchorRect} preview={preview} />}
    </>
  );
}
