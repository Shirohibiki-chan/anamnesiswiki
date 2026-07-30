// Custom Quote callout — grey-tinted, italic, for character quotes. See
// docs/spec.md §BlockNote editor.
import { createReactBlockSpec } from "@blocknote/react";
import { CalloutWrapper } from "./callout-wrapper";

export const quoteBlockSpec = createReactBlockSpec(
  { type: "calloutQuote", propSchema: {}, content: "inline" },
  { render: ({ contentRef }) => <CalloutWrapper variant="quote" contentRef={contentRef} /> },
)();
