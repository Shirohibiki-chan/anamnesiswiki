// A free-text block in the sidebar. Phase 18a, and the first block whose data
// exists nowhere else — everything else in 18a points at a field the node
// already had, so this is the one kind that stores its value in the block
// record itself.
//
// Deliberately a plain textarea rather than a BlockNote editor: this is a
// sidebar note beside a page, not a second document, and mounting a rich
// editor per block would put an editor instance behind every sidebar in the
// project. If it ever needs formatting, that is a decision to raise.
type TextBlockProps = {
  value: string;
  onChange: (value: string) => void;
};

export function TextBlock({ value, onChange }: TextBlockProps) {
  return (
    <textarea
      className="property-value-textarea"
      value={value}
      placeholder="Write something..."
      rows={3}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
