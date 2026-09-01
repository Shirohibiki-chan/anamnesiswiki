// Custom Quote callout — grey-tinted, italic, for character quotes. See
// docs/spec.md §BlockNote editor.
import { createReactBlockSpec } from "@blocknote/react";
import { CalloutWrapper } from "./callout-wrapper";

export const quoteBlockSpec = createReactBlockSpec(
  {
    type: "calloutQuote",
    // **A default of "" is what keeps every callout ever written looking the
    // way it did.** BlockNote fills a missing prop in with this on read, so a
    // page from before Phase 19.5 comes back as an uncoloured callout rather
    // than as a block the schema does not recognise.
    propSchema: { color: { default: "" }, icon: { default: "" } },
    content: "inline",
  },
  {
    render: ({ block, editor, contentRef }) => (
      <CalloutWrapper
        variant="quote"
        color={block.props.color}
        icon={block.props.icon}
        onIcon={(icon) => editor.updateBlock(block, { props: { icon } })}
        onColor={(color) => editor.updateBlock(block, { props: { color } })}
        contentRef={contentRef}
      />
    ),
  },
)();
