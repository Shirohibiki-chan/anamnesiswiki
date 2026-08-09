// Renders parsed release notes inside the update panel.
//
// Every branch below emits React elements from parsed data. Nothing here
// builds an HTML string and nothing reaches `dangerouslySetInnerHTML` — that's
// what keeps it safe to show text the app fetched from GitHub. Links are
// deliberately not rendered as links: their words are kept by the parser and
// their addresses dropped, so nothing in a release body can send someone
// somewhere. The one way out is the releases-page button, which goes to an
// address the app already knows. See services/release-notes.ts.
import type { ReleaseNoteBlock, ReleaseNoteSpan } from "../../services/release-notes";

function Spans({ spans }: { spans: ReleaseNoteSpan[] }) {
  return (
    <>
      {spans.map((span, index) => {
        switch (span.kind) {
          case "strong":
            return <strong key={index}>{span.text}</strong>;
          case "em":
            return <em key={index}>{span.text}</em>;
          case "code":
            return <code key={index}>{span.text}</code>;
          default:
            return <span key={index}>{span.text}</span>;
        }
      })}
    </>
  );
}

export function ReleaseNotes({ blocks }: { blocks: ReleaseNoteBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <div className="release-notes">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          // h4 rather than h3: the panel's own "Anamnesis 0.3.0 is available"
          // headline sits directly above these, so they're a level under it.
          return (
            <h4 key={index} className="release-notes-heading">
              <Spans spans={block.spans} />
            </h4>
          );
        }

        if (block.kind === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={index} className="release-notes-list">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Spans spans={item} />
                </li>
              ))}
            </List>
          );
        }

        return (
          <p key={index} className="release-notes-paragraph">
            <Spans spans={block.spans} />
          </p>
        );
      })}
    </div>
  );
}
