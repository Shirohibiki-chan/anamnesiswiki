// Custom Info callout — blue-tinted, left border accent, for intro/description
// text. See docs/spec.md §BlockNote editor.
import { createReactBlockSpec } from "@blocknote/react";
import { CalloutWrapper } from "./callout-wrapper";

export const infoBlockSpec = createReactBlockSpec(
  { type: "calloutInfo", propSchema: {}, content: "inline" },
  { render: ({ contentRef }) => <CalloutWrapper variant="info" contentRef={contentRef} /> },
)();
