// Where a collection block gets its pages, with the names and icons the UI
// uses. Phase 18b, moved here in 18c.
//
// In constants because three places need the same list and must not disagree:
// the block's heading (which *is* the source's name), the source picker in the
// block's menu, and Add Block's four entries. The names are the ones Add Block
// offers, so the block you asked for is the block you get — "Tagged" was not
// one of them, and reading it on a block you added as a Tag index is the kind
// of small lie that makes a panel feel untrustworthy.
import { Link2, ListTree, Sparkles, Tags as TagsIcon, type LucideIcon } from "lucide-react";
import type { CollectionSource } from "./schema";

export type CollectionSourceOption = {
  key: CollectionSource;
  label: string;
  hint: string;
  icon: LucideIcon;
};

export const COLLECTION_SOURCES: CollectionSourceOption[] = [
  { key: "manual", label: "Manual links", hint: "A list you curate yourself", icon: Link2 },
  { key: "subpages", label: "Subpage index", hint: "This page's children", icon: ListTree },
  { key: "tags", label: "Tag index", hint: "Pages carrying tags you pick", icon: TagsIcon },
  { key: "mentions", label: "Backlinks", hint: "Pages that mention this one", icon: Sparkles },
];

export function getCollectionSourceOption(source: CollectionSource | undefined): CollectionSourceOption {
  return COLLECTION_SOURCES.find((option) => option.key === source) ?? COLLECTION_SOURCES[0];
}
