// The `/` entry that makes a page and links to it. Phase 19.5.
//
// **It is called New page rather than Element.** The reference calls it that,
// and the plan was written down using the reference's word, but this app's word
// for a page is "page" — everywhere else in it, in the tree, in the templates,
// in her own vocabulary. A menu entry that introduces a second word for a thing
// the app already names is a menu entry she has to translate.
//
// **One entry, no block.** Everything else in the slash menu inserts something;
// this asks a question and then inserts a mention chip, which is why it takes a
// callback rather than a `type` to insert. The work of it lives in the dialog —
// see components/shell/NewPageLinkDialog.tsx.
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { FilePlus2 } from "lucide-react";

export function getNewPageSlashMenuItems(onPick: () => void): DefaultReactSuggestionItem[] {
  return [
    {
      title: "New page",
      subtext: "Make a page and link to it from here",
      // "element" is in the aliases and not in the title on purpose: somebody
      // arriving from the other app types the word they know, and finds the
      // thing this one calls a page.
      aliases: ["page", "element", "link", "new"],
      group: "Pages",
      icon: <FilePlus2 size={16} />,
      onItemClick: onPick,
    },
  ];
}
