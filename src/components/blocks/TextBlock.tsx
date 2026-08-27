// A free-text block in the sidebar. Phase 18a, and the first block whose data
// exists nowhere else — everything else in 18a points at a field the node
// already had, so this is the one kind that stores its value in the block
// record itself.
//
// Deliberately a plain textarea rather than a BlockNote editor: this is a
// sidebar note beside a page, not a second document, and mounting a rich
// editor per block would put an editor instance behind every sidebar in the
// project. If it ever needs formatting, that is a decision to raise.
//
// **It grows with what is written in it** (2026-08-27). It was a fixed three
// rows, so a note of four lines was clipped behind a scrollbar inside a panel
// that already scrolls — raised from use, and the objection was to having to
// scroll at all rather than to where the bar sat.
import { GrowTextarea } from "../properties/GrowTextarea";

type TextBlockProps = {
  value: string;
  onChange: (value: string) => void;
};

export function TextBlock({ value, onChange }: TextBlockProps) {
  return (
    <GrowTextarea
      className="property-value-textarea"
      value={value}
      placeholder="Write something..."
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
