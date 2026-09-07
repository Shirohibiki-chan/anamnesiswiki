// Draws a database in whichever layout its view names. Phase 23, step 5.
//
// **The one place that knows there are four of them.** A page-level database
// and an index block both come through here, so neither can quietly grow a
// layout the other does not have — which is the whole reason a layout is a
// setting on a view rather than a kind of thing.
import type { DatabaseSurface } from "../../hooks/use-database";
import type { RenderableProperty } from "../../services/property-service";
import { DatabaseBoard } from "./DatabaseBoard";
import { DatabaseCards } from "./DatabaseCards";
import { DatabaseList } from "./DatabaseList";
import { DatabaseTable } from "./DatabaseTable";

export function DatabaseLayouts({
  data,
  allColumns,
  dense,
}: {
  data: DatabaseSurface;
  /** Every column, shown or not — the board needs the one it is grouped by. */
  allColumns: RenderableProperty[];
  /** Drawn inside a sidebar block, which is a third of a page wide. */
  dense?: boolean;
}) {
  switch (data.view.layout) {
    case "cards":
      return <DatabaseCards data={data} />;
    case "board":
      return <DatabaseBoard data={data} allColumns={allColumns} />;
    case "list":
      return <DatabaseList data={data} />;
    default:
      return <DatabaseTable data={data} dense={dense} />;
  }
}
