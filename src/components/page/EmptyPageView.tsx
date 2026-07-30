// Shown when no node is selected — rare in practice, since the tree usually
// has something selected once a project has any pages.
export function EmptyPageView() {
  return (
    <div className="empty-page-view">
      <p>Select a page to begin.</p>
    </div>
  );
}
