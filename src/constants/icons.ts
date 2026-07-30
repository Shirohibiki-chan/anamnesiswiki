// Template-key -> icon mapping. The only place lucide-react is imported for
// template icons — components go through getTemplateIcon(). See
// docs/constants-and-theming.md §Key Constants.
import {
  Calendar,
  File,
  FileText,
  Folder as FolderIcon,
  MapPin,
  Package,
  Sparkles,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  folder: FolderIcon,
  character: User,
  location: MapPin,
  faction: Users,
  item: Package,
  event: Calendar,
  species: Sparkles,
  note: FileText,
  blank: File,
};

export function getTemplateIcon(templateKey: string): LucideIcon {
  return TEMPLATE_ICONS[templateKey] ?? FileText;
}
