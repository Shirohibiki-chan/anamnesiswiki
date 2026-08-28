// Custom Info callout — blue-tinted, left border accent, for intro/description
// text. See docs/spec.md §BlockNote editor.
import { createReactBlockSpec } from "@blocknote/react";
import { CalloutWrapper } from "./callout-wrapper";

export const infoBlockSpec = createReactBlockSpec(
  {
    type: "calloutInfo",
    // **A default of "" is what keeps every callout ever written looking the
    // way it did.** BlockNote fills a missing prop in with this on read, so a
    // page from before Phase 19.5 comes back as an uncoloured callout rather
    // than as a block the schema does not recognise.
    propSchema: { color: { default: "" } },
    content: "inline",
  },
  {
    render: ({ block, editor, contentRef }) => (
      <CalloutWrapper
        variant="info"
        color={block.props.color}
        onColor={(color) => editor.updateBlock(block, { props: { color } })}
        contentRef={contentRef}
      />
    ),
  },
)();
