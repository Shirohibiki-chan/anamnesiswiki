// The rendered chip for the "mention" inline content type — split into its
// own file so mention-inline-content.tsx exports only the spec, keeping Vite
// fast-refresh boundaries clean. See mention-inline-content.tsx for the
// custom-block-in-services/ layering note.
import type { ReactCustomInlineContentRenderProps } from "@blocknote/react";
import type { DefaultStyleSchema } from "@blocknote/core";
import { Hash } from "lucide-react";
import { getTemplateIcon } from "../../constants/icons";
import { useHoverPreview } from "../../hooks/use-hover-preview";
import { useNode, useProjectActions } from "../../hooks/use-project";
import { HoverPreviewCard } from "./HoverPreviewCard";
import type { MentionConfig } from "./mention-inline-content";

type MentionChipProps = ReactCustomInlineContentRenderProps<MentionConfig, DefaultStyleSchema>;

export function MentionChip({ inlineContent, contentRef }: MentionChipProps) {
  const { nodeId, label, text, blockId } = inlineContent.props;
  // Narrow subscriptions on purpose: a document can hold dozens of these, and
  // a full-store subscription re-rendered every one of them on every keystroke.
  const target = useNode(nodeId);
  const { selectNode, openBlockLink } = useProjectActions();
  const { preview, anchorRect, open, close } = useHoverPreview(target?.id ?? null);
  const Icon = getTemplateIcon(target?.templateKey ?? "note");

  // **A link to a spot on a page is still a link to the page**, so losing the
  // spot — the block deleted, or the page rewritten around it — leaves an
  // ordinary mention rather than a dead one. The store works out which tab the
  // block is in and quietly skips the scroll when the answer is none.
  const follow = (): void => {
    if (!target) return;
    if (blockId) openBlockLink(target.id, blockId);
    else selectNode(target.id);
  };

  return (
    <>
      <span
        ref={contentRef}
        className={`editor-mention${target ? "" : " editor-mention-broken"}`}
        role={target ? "link" : undefined}
        tabIndex={target ? 0 : undefined}
        onClick={follow}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") follow();
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
        {/* **Said on the chip, because the two go to different places.** A
            link to a spot on a page and a link to the page read identically
            otherwise, and which one she wrote is the thing she would be
            checking. */}
        {blockId && <Hash size={10} className="editor-mention-spot" aria-label="a spot on that page" />}
      </span>
      {preview && anchorRect && <HoverPreviewCard anchorRect={anchorRect} preview={preview} />}
    </>
  );
}
