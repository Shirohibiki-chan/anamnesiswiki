// Reports the repairs a load can make to a project on the way in. All of them
// are good news, not warnings — but each one is still worth saying out loud,
// because each means an earlier write left the folder in a state it shouldn't
// have been in, and a repair staying quiet is exactly what turned the first of
// them into lost pages on 2026-07-31.
import { LifeBuoy, X } from "lucide-react";
import { useProject } from "../../hooks/use-project";

// "A", "A" and "B", "A", "B" and "C". Quoted because a page name can be a
// whole phrase, and an unquoted list of those doesn't read as a list.
function formatNames(names: string[]): string {
  const quoted = names.map((name) => `“${name}”`);
  if (quoted.length <= 1) return quoted.join("");
  return `${quoted.slice(0, -1).join(", ")} and ${quoted[quoted.length - 1]}`;
}

export function RecoveryNotice() {
  const { recoveredCount, reunitedNames, supersededNames, dismissRecovered } = useProject();
  if (recoveredCount === 0 && reunitedNames.length === 0 && supersededNames.length === 0) return null;

  const one = recoveredCount === 1;

  return (
    <div className="recovery-notice" role="status">
      <LifeBuoy size={14} className="recovery-notice-icon" />
      <div className="recovery-notice-body">
        {recoveredCount > 0 && (
          <p className="recovery-notice-message">
            {one ? "1 page was" : `${recoveredCount} pages were`} put back after a move that didn't finish.{" "}
            {one ? "It's" : "They're"} where {one ? "it" : "they"} started out — worth a look to check{" "}
            {one ? "it's" : "they're"} where you want {one ? "it" : "them"}.
          </p>
        )}
        {reunitedNames.length > 0 && (
          <p className="recovery-notice-message">
            The pages nested inside {formatNames(reunitedNames)} had come loose{" "}
            {reunitedNames.length === 1 ? "from it" : "from them"} on disk, and have been put back inside. Nothing was
            lost, and there's nothing to do — this fixes itself once and stays fixed.
          </p>
        )}
        {supersededNames.length > 0 && (
          <p className="recovery-notice-message">
            There {supersededNames.length === 1 ? "was an older copy" : "were older copies"} of{" "}
            {formatNames(supersededNames)} on disk as well as the current one, left behind by a save that didn&rsquo;t
            finish tidying up. The newest version is the one you&rsquo;re looking at, and the old{" "}
            {supersededNames.length === 1 ? "one has" : "ones have"} been set aside as a{" "}
            <code>.old-copy</code> file next to {supersededNames.length === 1 ? "it" : "them"} in your project folder,
            in case you want {supersededNames.length === 1 ? "it" : "them"}.
          </p>
        )}
      </div>
      <button type="button" className="ui-icon-btn ui-icon-btn-sm" aria-label="Dismiss" onClick={dismissRecovered}>
        <X size={13} />
      </button>
    </div>
  );
}
