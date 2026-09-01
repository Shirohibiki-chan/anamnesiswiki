// Custom Secret callout — purple-tinted with a "🔒 SECRET" label chip, for
// admin-only content. Hidden-tab visibility and secret-block visibility are
// separate concerns — see docs/constants-and-theming.md §Callout blocks.
import { createReactBlockSpec } from "@blocknote/react";
import { CalloutWrapper } from "./callout-wrapper";

export const secretBlockSpec = createReactBlockSpec(
  {
    type: "calloutSecret",
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
        variant="secret"
        color={block.props.color}
        icon={block.props.icon}
        onIcon={(icon) => editor.updateBlock(block, { props: { icon } })}
        onColor={(color) => editor.updateBlock(block, { props: { color } })}
        contentRef={contentRef}
      />
    ),
  },
)();
