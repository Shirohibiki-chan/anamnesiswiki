// Custom Secret callout — purple-tinted with a "🔒 SECRET" label chip, for
// admin-only content. Hidden-tab visibility and secret-block visibility are
// separate concerns — see docs/constants-and-theming.md §Callout blocks.
import { createReactBlockSpec } from "@blocknote/react";
import { CalloutWrapper } from "./callout-wrapper";

export const secretBlockSpec = createReactBlockSpec(
  { type: "calloutSecret", propSchema: {}, content: "inline" },
  { render: ({ contentRef }) => <CalloutWrapper variant="secret" contentRef={contentRef} /> },
)();
