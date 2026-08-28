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
    /**
     * The target's name at the moment the chip was written.
     *
     * **A fallback, not what the chip shows.** The chip looks the page up live
     * so a rename reaches every link to it; this is only what is left to show
     * when the page is gone, and what a `.lk` export writes for a target that
     * is not in the export.
     */
    label: { default: "" },
    /**
     * What she asked this link to read as, when that is not the page's name —
     * "the bell" pointing at *Ninefold Bell*. Phase 19.5.
     *
     * **Empty is the normal case and means "follow the page".** That is the
     * whole reason this is a second prop rather than a use of `label`: `label`
     * is written on every chip, so it cannot tell a name that was copied from
     * one she chose, and a chip that preferred it would stop following renames
     * for everybody. Set only when the New page dialog's Link text box has
     * something in it.
     */
    text: { default: "" },
  },
  content: "none",
} as const;

export type MentionConfig = typeof mentionConfig;

export const mentionInlineContentSpec = createReactInlineContentSpec(mentionConfig, { render: MentionChip });
