// Template-key -> icon mapping. The only place lucide-react is imported for
// template icons — components go through getTemplateIcon(). See
// docs/constants-and-theming.md §Key Constants.
import {
  Calendar,
  Clapperboard,
  Cog,
  File,
  FileText,
  Flag,
  Folder as FolderIcon,
  Globe,
  MapPin,
  Package,
  PawPrint,
  PersonStanding,
  Scroll,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  universe: Globe,
  folder: FolderIcon,
  character: User,
  race: PersonStanding,
  creature: PawPrint,
  location: MapPin,
  country: Flag,
  faction: Users,
  item: Package,
  technology: Cog,
  event: Calendar,
  scene: Clapperboard,
  quest: Scroll,
  note: FileText,
  blank: File,
  // Pre-rename pages still arriving as `species` are translated to `race` on
  // load; this entry is only for anything that reads a raw stored key.
  species: PersonStanding,
};

export function getTemplateIcon(templateKey: string): LucideIcon {
  return TEMPLATE_ICONS[templateKey] ?? FileText;
}
