// The six shapes a meter block draws in, with the names and icons the UI uses
// for them. Phase 18c.
//
// In constants rather than beside the block because three places need the same
// list and must not disagree: the block's heading (which *is* the shape's
// name, the way the reference titles a section), the shape grid in the block's
// menu, and Add Block's Meters group.
import { ChartPie, Circle, Coins, Donut, Gauge, RectangleHorizontal, Star, type LucideIcon } from "lucide-react";
import type { MeterStyle } from "./schema";

export type MeterStyleOption = {
  key: MeterStyle;
  /** What the block is called when it wears this shape. */
  label: string;
  hint: string;
  icon: LucideIcon;
};

export const METER_STYLES: MeterStyleOption[] = [
  { key: "bar", label: "Progress bar", hint: "A filled track", icon: RectangleHorizontal },
  { key: "circle", label: "Circle", hint: "A full ring", icon: Circle },
  { key: "semicircle", label: "Semi-circle", hint: "An arc over the top", icon: Donut },
  { key: "gauge", label: "Gauge", hint: "A dial with a gap at the bottom", icon: Gauge },
  { key: "pie", label: "Pie chart", hint: "A solid wedge of a circle", icon: ChartPie },
  { key: "rating", label: "Rating", hint: "Stars you set a level with", icon: Star },
  { key: "pool", label: "Token pool", hint: "Tokens you spend one at a time", icon: Coins },
];

export function getMeterStyleOption(style: MeterStyle | undefined): MeterStyleOption {
  return METER_STYLES.find((option) => option.key === style) ?? METER_STYLES[0];
}
