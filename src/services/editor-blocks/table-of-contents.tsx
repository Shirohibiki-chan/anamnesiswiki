// A contents list, built from the headings already in the page. Phase 19.5.
//
// **It is the one item on the phase's list with no data model question in it.**
// The block stores nothing at all: it reads the document each time it draws, so
// a heading renamed is renamed here, a heading deleted is gone from here, and
// there is no second copy of anything to go stale. The rules for reading them
// are in `toc-service.ts`, testable without the app.
//
// **`pageContents` rather than `tableOfContents`.** BlockNote reserves the
// names of its own blocks, and a custom block sharing one gets that block's
// plugins attached to it — which is how the first go at columns froze the
// editor. The prefix is the habit that keeps it from happening again; see the
// note on `COLUMN_LIST_TYPE`.
import { createReactBlockSpec } from "@blocknote/react";
import { PAGE_CONTENTS_TYPE } from "../../constants/schema";
import { PageContents } from "./PageContents";

export const pageContentsConfig = {
  type: PAGE_CONTENTS_TYPE,
  propSchema: {},
  content: "none",
} as const;

export const pageContentsSpec = createReactBlockSpec(pageContentsConfig, {
  // `contentEditable={false}` for the same reason every other block of ours has
  // it: there is no text of ours in here, and without it the caret goes
  // somewhere it cannot be drawn and the next keystroke lands in the document
  // rather than where it looks like it should.
  render: () => <PageContents />,
})();
