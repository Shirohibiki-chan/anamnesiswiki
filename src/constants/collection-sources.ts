// Where a collection block gets its pages, with the names and icons the UI
// uses. Phase 18b, moved here in 18c.
//
// In constants because three places need the same list and must not disagree:
// the block's heading (which *is* the source's name), the source picker in the
// block's menu, and Add Block's four entries. The names are the ones Add Block
// offers, so the block you asked for is the block you get — "Tagged" was not
// one of them, and reading it on a block you added as a Tag index is the kind
// of small lie that makes a panel feel untrustworthy.
import { History, Link2, ListTree, Pin, Sparkles, Tags as TagsIcon, type LucideIcon } from "lucide-react";
import type { CollectionSource } from "./schema";

export type CollectionSourceOption = {
  key: CollectionSource;
  label: string;
  hint: string;
  icon: LucideIcon;
};

export const COLLECTION_SOURCES: CollectionSourceOption[] = [
  { key: "manual", label: "Manual Links", hint: "A list you curate yourself", icon: Link2 },
  { key: "subpages", label: "Subpage Index", hint: "This page's children", icon: ListTree },
  { key: "tags", label: "Tag Index", hint: "Pages carrying tags you pick", icon: TagsIcon },
  { key: "mentions", label: "Backlinks", hint: "Pages that mention this one", icon: Sparkles },
  // Phase 30: the two a home page was missing. Both read orders the app
  // already keeps, so nothing has to be maintained by hand for either.
  { key: "recent", label: "Recently Edited", hint: "The pages touched last, newest first", icon: History },
  // "Shortcuts", because that is the word on the right-click menu and over
  // the rail — the source key says "pinned" and the person never sees it.
  { key: "pinned", label: "Shortcuts", hint: "The pages set as shortcuts, in the rail's order", icon: Pin },
];

export function getCollectionSourceOption(source: CollectionSource | undefined): CollectionSourceOption {
  return COLLECTION_SOURCES.find((option) => option.key === source) ?? COLLECTION_SOURCES[0];
}
