// A box to write a thought into, and a button that files it as a page.
// Phase 30, step 1. See docs/plan.md.
//
// **The trip it saves is the point.** A stray idea about the magic system,
// had mid-chapter, used to mean opening the tree, making a page, naming it and
// finding the way back. Here it is typed, captured, and the page you were on
// is still the page you are on — with a link to where the thought went.
//
// **The destination is a box you type into, not a dropdown.** Her call,
// 2026-09-10: a dropdown works for five destinations and stops working for
// twenty. So the popover is the same control the move-to menu uses — the
// whole list until you type, narrowing as you do, Enter takes the top match.
// A code word in the text (`magic - a thought`) moves that picker on its own,
// and the block says so rather than switching silently. See capture-service.
import { useRef, useState } from "react";
import { ArrowRight, ChevronDown, Search } from "lucide-react";
import type { Block, Node } from "../../constants/schema";
import { useCapture } from "../../hooks/use-capture";
import { CAPTURE_PLACEHOLDER, filterDestinations, type CaptureDestination } from "../../services/capture-service";
import { GrowTextarea } from "../properties/GrowTextarea";
import { TreePopover } from "../tree/TreePopover";
import { NodeIcon } from "./IconPicker";

type CaptureBlockProps = {
  block: Block;
  node: Node;
  nodes: Record<string, Node>;
  onOpen: (nodeId: string) => void;
  /** Put the caret in the box on mount — the dialog opened by the shortcut wants it; a block in a page must not steal it. */
  autoFocus?: boolean;
};

export function CaptureBlock({ block, node, nodes, onOpen, autoFocus }: CaptureBlockProps) {
  const { root, rootIsOwn, destinations, pickerDestination, resolve, choose, capture, setRoot } = useCapture(
    node,
    block,
  );
  const [text, setText] = useState("");
  const [saved, setSaved] = useState<{ page: Node; destination: CaptureDestination } | null>(null);
  // Which popover is open: the destination list, or the page-wide search for
  // a new root. One state rather than two because they share an anchor row
  // and never open together.
  const [picker, setPicker] = useState<{ kind: "destination" | "root"; rect: DOMRect } | null>(null);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  const resolution = resolve(text);
  const empty = text.trim() === "";

  function closePicker() {
    setPicker(null);
    setQuery("");
  }

  function handleCapture() {
    if (empty) return;
    const result = capture(text);
    if (!result) return;
    setText("");
    setSaved(result);
    // Back into the box: the next thought usually follows the last one.
    boxRef.current?.querySelector("textarea")?.focus();
  }

  // The root page has been deleted from under the block. Say so and offer
  // the way out, rather than a picker over an empty list.
  if (!root) {
    return (
      <div className="block-capture">
        {/* Divs rather than paragraphs throughout: in the page body the
            editor's own paragraph rule reaches a paragraph element inside a
            block and sizes it as writing, which made this footnote larger than
            the box. */}
        <div className="block-collection-empty">
          The page this filed under is gone.{" "}
          <button type="button" className="block-inline-link block-capture-link" onClick={() => setRoot(undefined)}>
            File Under This Page Instead
          </button>
        </div>
      </div>
    );
  }

  const destinationMatches = filterDestinations(destinations, query);
  const trimmedQuery = query.trim().toLowerCase();
  const rootMatches = Object.values(nodes)
    .filter((candidate) => trimmedQuery === "" || candidate.name.toLowerCase().includes(trimmedQuery))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    .slice(0, 30);

  return (
    <div className="block-capture" ref={boxRef}>
      <GrowTextarea
        className="property-value-textarea block-capture-text"
        autoFocus={autoFocus}
        value={text}
        placeholder={CAPTURE_PLACEHOLDER}
        onChange={(e) => {
          setText(e.target.value);
          if (saved) setSaved(null);
        }}
        onKeyDown={(e) => {
          // Ctrl/Cmd+Enter captures; plain Enter is a new line, because a
          // thought is allowed to be more than one.
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleCapture();
          }
        }}
      />

      <div className="block-capture-row">
        <button
          type="button"
          className="block-capture-destination"
          aria-label="Where this will be filed"
          title={resolution?.viaCodeWord ? "Picked by the code word at the start of the text" : "Choose where this goes"}
          onClick={(e) => setPicker({ kind: "destination", rect: e.currentTarget.getBoundingClientRect() })}
        >
          <span className="block-capture-destination-label">{resolution?.viaCodeWord ? "Files under" : "File under"}</span>
          <DestinationName destination={resolution?.destination ?? pickerDestination} nodes={nodes} />
          {resolution?.viaCodeWord ? (
            <span className="block-capture-codeword">code word</span>
          ) : (
            <ChevronDown size={12} className="block-capture-destination-chevron" />
          )}
        </button>
        <button type="button" className="ui-btn ui-btn-primary block-capture-button" disabled={empty} onClick={handleCapture}>
          Capture <ArrowRight size={13} />
        </button>
      </div>

      {saved && nodes[saved.page.id] && (
        <div className="block-capture-saved">
          Saved as{" "}
          <button type="button" className="block-inline-link block-capture-link" onClick={() => onOpen(saved.page.id)}>
            {saved.page.name}
          </button>{" "}
          under{" "}
          <button
            type="button"
            className="block-inline-link block-capture-link"
            onClick={() => onOpen(saved.destination.id)}
          >
            {saved.destination.name}
          </button>
        </div>
      )}

      {/* Where the list of destinations comes from. Shown as a footnote rather
          than a setting in the menu, because it is the one thing somebody
          setting up a capture page has to find — and a block that files under
          "this page" needs to say so, or the list of children reads as
          arbitrary. */}
      <div className="block-capture-root">
        Destinations are pages under{" "}
        <button
          type="button"
          className="block-inline-link block-capture-link"
          onClick={(e) => setPicker({ kind: "root", rect: e.currentTarget.getBoundingClientRect() })}
        >
          {rootIsOwn ? "this page" : root.name || "Untitled"}
        </button>
      </div>

      {picker && (
        <TreePopover anchorRect={picker.rect} onClose={closePicker}>
          <div className="block-link-picker">
            <div className="block-capture-search">
              <Search size={12} className="block-capture-search-icon" />
              <input
                className="property-field-input"
                autoFocus
                placeholder={picker.kind === "destination" ? "Find a destination" : "Find a page"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    closePicker();
                    return;
                  }
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  // Enter takes the top match — three keys and it is chosen.
                  if (picker.kind === "destination") {
                    const top = destinationMatches[0];
                    if (!top) return;
                    choose(top.id);
                  } else {
                    const top = rootMatches[0];
                    if (!top) return;
                    setRoot(top.id === node.id ? undefined : top.id);
                  }
                  closePicker();
                }}
              />
            </div>
            <div className="block-link-results">
              {picker.kind === "destination"
                ? destinationMatches.map((destination) => (
                    <button
                      key={destination.id}
                      type="button"
                      className={destination.id === pickerDestination?.id ? "block-capture-current" : undefined}
                      onClick={() => {
                        choose(destination.id);
                        closePicker();
                      }}
                    >
                      <DestinationName destination={destination} nodes={nodes} />
                      {destination.isRoot && <span className="block-capture-root-tag">itself</span>}
                    </button>
                  ))
                : rootMatches.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      className={candidate.id === root.id ? "block-capture-current" : undefined}
                      onClick={() => {
                        setRoot(candidate.id === node.id ? undefined : candidate.id);
                        closePicker();
                      }}
                    >
                      <NodeIcon icon={candidate.icon} templateKey={candidate.templateKey} size={13} />
                      {candidate.name || "Untitled"}
                      {candidate.id === node.id && <span className="block-capture-root-tag">this page</span>}
                    </button>
                  ))}
              {(picker.kind === "destination" ? destinationMatches : rootMatches).length === 0 && (
                <div className="block-link-empty-hint">Nothing matches.</div>
              )}
            </div>
          </div>
        </TreePopover>
      )}
    </div>
  );
}

/** A destination's icon and name, the way the page looks in the tree. */
function DestinationName({ destination, nodes }: { destination: CaptureDestination | undefined; nodes: Record<string, Node> }) {
  if (!destination) return <span className="block-capture-destination-name">—</span>;
  const page = nodes[destination.id];
  return (
    <>
      {page && <NodeIcon icon={page.icon} templateKey={page.templateKey} size={13} />}
      <span className="block-capture-destination-name">{destination.name}</span>
    </>
  );
}
