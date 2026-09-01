// Icon inline content — the BlockNote wiring for a clickable icon in a line of
// writing. Phase 19.5. The chip that draws it is IconChip.tsx.
//
// This is the same documented exception to "services are plain TS, no React"
// that the mention spec beside it carries: CLAUDE.md names
// src/services/editor-blocks/ as where BlockNote's extensions live, and
// BlockNote's render callback is itself a mounted React component.
import { createReactInlineContentSpec } from "@blocknote/react";
import { DEFAULT_INLINE_ICON, ICON_INLINE_TYPE } from "../../constants/schema";
import { IconChip } from "./IconChip";

export const iconInlineConfig = {
  type: ICON_INLINE_TYPE,
  propSchema: {
    /**
     * A Lucide name for a glyph, or the character itself for an emoji — the
     * one storage shape every icon in this app uses, so the page title, a
     * tree row, a meter and this all read back through the same lookup.
     *
     * **The default is what makes an unfinished icon still an icon.** BlockNote
     * fills a missing prop in with it on read, so nothing in a document can
     * ever be an icon with nothing to draw.
     */
    icon: { default: DEFAULT_INLINE_ICON },
  },
  content: "none",
} as const;

export type IconInlineConfig = typeof iconInlineConfig;

export const iconInlineContentSpec = createReactInlineContentSpec(iconInlineConfig, {
  render: ({ inlineContent, updateInlineContent }) => (
    <IconChip
      icon={inlineContent.props.icon}
      onPick={(icon) => updateInlineContent({ type: ICON_INLINE_TYPE, props: { icon } })}
    />
  ),
});
