// A page drawn as a database: the settings bar, one of four layouts, and the
// way to add a page to it. Phase 23, step 4.
//
// **A layout is what a view is drawn *as*, not a different kind of thing.** All
// four read the same rows, the same columns and the same groups off the same
// record, which is why switching between them is a menu rather than a
// conversion and why nothing is lost either way round. Everything that decides
// *which* rows and *which* columns lives in `database-service.ts`; the files
// beside this one only draw.
import type { Node } from "../../constants/schema";
import { useDatabase } from "../../hooks/use-database";
import { useCreatePageIn } from "../../hooks/use-new-page";
import { DatabaseBoard } from "./DatabaseBoard";
import { DatabaseCards } from "./DatabaseCards";
import { DatabaseList } from "./DatabaseList";
import { DatabaseTable } from "./DatabaseTable";
import { DatabaseToolbar } from "./DatabaseToolbar";
import "./database.css";

export function PageDatabase({ node }: { node: Node }) {
  const { rows, allRows } = useDatabase(node);
  const createPageIn = useCreatePageIn();

  const layout = node.view?.layout ?? "table";

  return (
    <div className="database-view">
      <DatabaseToolbar node={node} />

      {allRows.length === 0 ? (
        <p className="database-empty">Nothing inside this page yet. Pages you add here become its rows.</p>
      ) : rows.length === 0 ? (
        // Distinct from the line above on purpose. "Nothing inside this page"
        // in front of a folder holding forty pages is the app telling her a
        // lie about her own world; this says where they went.
        <p className="database-empty">No page here matches the filters.</p>
      ) : layout === "cards" ? (
        <DatabaseCards node={node} />
      ) : layout === "board" ? (
        <DatabaseBoard node={node} />
      ) : layout === "list" ? (
        <DatabaseList node={node} />
      ) : (
        <DatabaseTable node={node} />
      )}

      {/* Kept whether or not there is anything to show, and kept at all because
          a folder that became a database would otherwise have lost the only way
          to make a page inside the thing you are looking at. See FolderView. */}
      <button type="button" className="ui-btn ui-btn-secondary database-add" onClick={() => createPageIn(node.id)}>
        Add a page
      </button>
    </div>
  );
}
