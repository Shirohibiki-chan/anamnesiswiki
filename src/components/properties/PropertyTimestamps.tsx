// Created / Updated, at the foot of the properties panel (Phase 13).
//
// Rendering only — both values have been on every node and on disk since
// Phase 1, and nothing has ever shown them. No relative times ("2 days ago"):
// they read nicely for something edited this week and badly for the rest of a
// world, and they need a ticking clock to stay honest. The full timestamp is
// on the `title` for when the date alone isn't enough.
import { CalendarClock } from "lucide-react";

const DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, DATE);
}

export function PropertyTimestamps({ createdAt, updatedAt }: { createdAt: number; updatedAt: number }) {
  return (
    <div className="property-timestamps">
      <CalendarClock size={11} className="property-timestamps-icon" />
      <span title={new Date(createdAt).toLocaleString()}>Created {formatDate(createdAt)}</span>
      <span className="property-timestamps-sep">·</span>
      <span title={new Date(updatedAt).toLocaleString()}>Updated {formatDate(updatedAt)}</span>
    </div>
  );
}
