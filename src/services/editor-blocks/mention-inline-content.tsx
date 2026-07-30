// Mention inline content — `@` cross-reference to another node. The chip
// itself (with live rename-safe lookup + click-to-navigate) lives in
// MentionChip.tsx; this file only wires up the BlockNote spec.
//
// This is a documented exception to "services are plain TS, no React" —
// CLAUDE.md names src/services/editor-blocks/ as where BlockNote's mention
// extension lives, and BlockNote's render callback is itself a mounted React
// component, so MentionChip using useProject() (for live node lookup +
// navigation) is the render boundary, not a layering violation.
import { createReactInlineContentSpec } from "@blocknote/react";
import { MentionChip } from "./MentionChip";

export const mentionConfig = {
  type: "mention",
  propSchema: {
    nodeId: { default: "" },
    label: { default: "" },
  },
  content: "none",
} as const;

export type MentionConfig = typeof mentionConfig;

export const mentionInlineContentSpec = createReactInlineContentSpec(mentionConfig, { render: MentionChip });
