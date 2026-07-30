// Stand-in for the real BlockNote editor (Phase 5). Plain textarea, same
// autosave path as everything else. See docs/plan.md Phase 4.
type PlaceholderEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function PlaceholderEditor({ value, onChange }: PlaceholderEditorProps) {
  return (
    <textarea
      className="page-body-placeholder wiki-body"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Start writing..."
    />
  );
}
