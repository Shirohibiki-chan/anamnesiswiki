// The `/` entry that offers to link the page names written on this page.
// Phase 19.5. See docs/plan.md.
//
// **The odd one in this menu: it inserts nothing.** Every other entry puts
// something where the cursor is; this one acts on prose already written, which
// is what it was asked for as — it came off her list of the reference's `/`
// commands, where it sits beside them. The menu is where she will look for it,
// so it goes here rather than into a menu of its own.
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { Link } from "lucide-react";

export function getAutoLinkSlashMenuItems(run: () => void): DefaultReactSuggestionItem[] {
  return [
    {
      title: "Link page names",
      subtext: "Find names written on this page and offer to link them",
      // "autolink" because that is what it is called everywhere else; "names"
      // and "links" because that is what somebody looking for it would type.
      aliases: ["autolink", "link", "links", "names", "linknames"],
      group: "Page blocks",
      icon: <Link size={16} />,
      onItemClick: run,
    },
  ];
}
