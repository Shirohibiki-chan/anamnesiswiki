// A storyline's canvas: scenes in narrative order, where she put them, with
// the notes and labels that say what a reader cannot see. Phase 25, steps 1–2.
//
// **Drawn in the page rather than opened over it, which is the opposite call
// Phase 24 made for the graph, on purpose.** A graph is a lens — a temporary
// way of looking at pages that live elsewhere — so it takes the whole window
// and gives it back. A storyline is a place she works: it is the body of a
// page, it is what that page is *for*, and a canvas you had to summon over the
// page holding it would make the page itself an empty shell. `Expand` is here
// for when the arrangement wants the whole monitor, and it is a mode of this
// same component rather than a second surface.
//
// **Lines are SVG and everything else is HTML**, the same one decision the
// graph makes: the CSS token themes — hers included — apply to an ordinary
// element for free, while a line is what SVG is for. All of it sits inside one
// transformed scene, so it pans and zooms together.
//
// **Three kinds of thing sit on this canvas and only one of them is the
// story.** A scene is a page. A note and a band are annotations: no edges, no
// page behind them, never counted in the sequence. Keeping that distinction
// legible on screen — different shapes, different words on the buttons — is
// most of what the markup below is doing.
//
// All of the behaviour is in hooks/use-storyline-view.ts; this renders.
import { useCallback, useEffect, useRef, useState } from "react";
import { FilePlus2, Link2, Maximize2, Minimize2, Plus, StickyNote, SquareDashed, Wand2 } from "lucide-react";
import { getPaletteHex } from "../../constants/palette";
import { STORYLINE_CAST_SHOWN, STORYLINE_NODE_HEIGHT, STORYLINE_NODE_WIDTH } from "../../constants/storyline";
import type { Node } from "../../constants/schema";
import {
  useSceneCandidates,
  useStoryline,
  useStorylineActions,
  useStorylineIsUntidy,
  type ConnectRefusal,
  type DrawnNote,
  type SceneRefusal,
} from "../../hooks/use-storyline";
import { useStorylineView } from "../../hooks/use-storyline-view";
import { useShortcutLabel } from "../../hooks/use-shortcuts";
import { NodeIcon } from "../blocks/IconPicker";
import "./storyline.css";

/**
 * Why a line was refused, in words rather than as a shrug.
 *
 * **Every refusal says something true about the story**, which is why the
 * canvas explains rather than silently doing nothing: a gesture that produces
 * no line and no reason is indistinguishable from a bug in the dragging.
 */
const REFUSALS: Record<ConnectRefusal, string> = {
  "same-node": "A scene can't lead to itself.",
  "already-joined": "These two are already joined.",
  "would-loop": "That would make the story loop back on itself.",
};

/**
 * Why a page could not be put on the canvas.
 *
 * **The universe one is the only surprising refusal, so it says the reason
 * rather than the rule.** A storyline is one version of events, and a page from
 * another universe is a page from a different one — telling her that is more
 * use than telling her it is not allowed. The picker leaves such pages out
 * anyway; this is for the route that skips it.
 */
const SCENE_REFUSALS: Record<SceneRefusal, string> = {
  itself: "A storyline can't be a scene on itself.",
  "already-here": "That page is already on this canvas.",
  "another-universe": "That page belongs to a different universe, and a storyline is one version of events.",
};

export function PageStoryline({ node }: { node: Node }) {
  const model = useStoryline(node.id);
  const untidy = useStorylineIsUntidy(node.id);
  const actions = useStorylineActions();
  const { addSceneToStoryline, addExistingPageToStoryline, moveStorylineNodes, connectStorylineNodes } = actions;
  const { disconnectStorylineEdge, removeStorylineNode, selectNode, tidyStoryline } = actions;
  const { addStorylineNote, setStorylineNoteText, moveStorylineNote, removeStorylineNote } = actions;
  const { addStorylineBand, setStorylineBandLabel, moveStorylineBand } = actions;
  const { resizeStorylineBand, removeStorylineBand } = actions;

  const undoKey = useShortcutLabel("undo");
  const [expanded, setExpanded] = useState(false);
  /** The "put an existing page on it" search, or null while it is closed. */
  const [picking, setPicking] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const pickerInputRef = useRef<HTMLInputElement | null>(null);
  const candidates = useSceneCandidates(node.id, picking ?? "");
  const [refusal, setRefusal] = useState<string | null>(null);
  /**
   * The annotation being typed into, and the draft it currently holds.
   *
   * **The draft lives here rather than in the canvas file**, so typing is not
   * one write to her disk per letter. It is committed on blur — the same moment
   * a drag commits, and for the same reason.
   */
  const [editing, setEditing] = useState<{ kind: "note" | "band"; id: string; draft: string } | null>(null);

  const onArrange = useCallback(
    (moved: Record<string, { x: number; y: number }>) => moveStorylineNodes(node.id, moved),
    [moveStorylineNodes, node.id],
  );

  const onConnect = useCallback(
    (fromId: string, toId: string) => {
      const refused = connectStorylineNodes(node.id, fromId, toId);
      setRefusal(refused ? REFUSALS[refused] : null);
    },
    [connectStorylineNodes, node.id],
  );

  const onMoveNote = useCallback(
    (noteId: string, to: { x: number; y: number }) => moveStorylineNote(node.id, noteId, to),
    [moveStorylineNote, node.id],
  );

  const onMoveBand = useCallback(
    (bandId: string, to: { x: number; y: number }, carried: string[]) =>
      moveStorylineBand(node.id, bandId, to, carried),
    [moveStorylineBand, node.id],
  );

  const onResizeBand = useCallback(
    (bandId: string, size: { width: number; height: number }) => resizeStorylineBand(node.id, bandId, size),
    [resizeStorylineBand, node.id],
  );

  const view = useStorylineView(model, {
    resetKey: node.id,
    onArrange,
    onConnect,
    onMoveNote,
    onMoveBand,
    onResizeBand,
  });
  const { stageRef, scenes, edges, notes, bands, bounds, sceneTransform, linking, zoom } = view;
  const { selectedId, selectedEdgeId, selectedAnnotation, select, selectEdge, selectAnnotation } = view;
  const { startSceneDrag, moveSceneDrag, endSceneDrag, startLink, moveLink, endLink } = view;
  const { startNoteDrag, moveNoteDrag, endNoteDrag } = view;
  const { startBandDrag, moveBandDrag, endBandDrag, startBandResize, moveBandResize, endBandResize } = view;
  const { startPan, movePan, endPan, handleWheel } = view;

  const selectedScene = scenes.find((scene) => scene.id === selectedId);
  const selectedNote = selectedAnnotation?.kind === "note" ? notes.find((n) => n.id === selectedAnnotation.id) : undefined;
  const selectedBand = selectedAnnotation?.kind === "band" ? bands.find((b) => b.id === selectedAnnotation.id) : undefined;

  // The explanation goes away on its own — it is a reply to a gesture, not a
  // state of the canvas, and one still sitting there three minutes later reads
  // as a problem rather than as an answer.
  useEffect(() => {
    if (!refusal) return;
    const timer = window.setTimeout(() => setRefusal(null), 4000);
    return () => window.clearTimeout(timer);
  }, [refusal]);

  /**
   * A press anywhere outside puts the picker away.
   *
   * **Without this its only exit was Escape while the box still had focus**,
   * so clicking a result and then clicking the button again *closed* it instead
   * of reopening it — and the next thing typed went nowhere. Found 2026-09-09
   * driving the real app. `pointerdown` rather than `click`, so it lands before
   * the button's own toggle rather than fighting it.
   */
  useEffect(() => {
    if (picking === null) return;
    function onPointerDown(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as globalThis.Node)) setPicking(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [picking]);

  // Escape leaves the expanded canvas, matching every other full-window surface
  // in the app. Only bound while expanded, so it never eats the key from
  // something else on an ordinary page — and never while she is mid-sentence in
  // a note, where Escape means "stop editing this" instead.
  useEffect(() => {
    if (!expanded || editing) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded, editing]);

  function putExistingPageOn(pageId: string) {
    const refused = addExistingPageToStoryline(node.id, pageId);
    setRefusal(refused ? SCENE_REFUSALS[refused] : null);
    if (refused) return;
    // Left open on success: putting three pages on a storyline in a row is the
    // ordinary way an existing world gets one, and closing after each would
    // make that three trips to the same button. The focus goes back to the box
    // as well as the text being cleared — without it the next name is typed at
    // a button that has just been clicked and goes nowhere.
    setPicking("");
    pickerInputRef.current?.focus();
  }

  function addScene() {
    // Deliberately not opened afterwards. Adding three scenes in a row is the
    // ordinary way a storyline gets started, and jumping to a full editor after
    // each one turns that into three round trips.
    if (!addSceneToStoryline(node.id)) setRefusal("Couldn't make a page for that scene.");
  }

  function addNote() {
    const id = addStorylineNote(node.id);
    // Straight into typing: a note with nothing in it says nothing, and the
    // whole reason for one is the sentence about to go in it.
    setEditing({ kind: "note", id, draft: "" });
    selectAnnotation({ kind: "note", id });
  }

  function addBand() {
    const id = addStorylineBand(node.id);
    setEditing({ kind: "band", id, draft: "" });
    selectAnnotation({ kind: "band", id });
  }

  /** Writes the draft away and stops editing. Called on blur and on Escape. */
  function commitEdit() {
    if (!editing) return;
    if (editing.kind === "note") setStorylineNoteText(node.id, editing.id, editing.draft);
    else setStorylineBandLabel(node.id, editing.id, editing.draft);
    setEditing(null);
  }

  /** A note's text with its links drawn as links. */
  function noteBody(note: DrawnNote) {
    return note.segments.map((segment, index) =>
      segment.kind === "text" ? (
        <span key={index}>{segment.text}</span>
      ) : segment.kind === "link" ? (
        <button
          key={index}
          type="button"
          className="storyline-note-link"
          // A press must not also start dragging the note it sits in.
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => selectNode(segment.nodeId)}
        >
          {segment.text}
        </button>
      ) : (
        // Kept and marked rather than drawn as prose: an exit that stopped
        // working is the one thing about a note worth being able to see.
        <span key={index} className="storyline-note-broken" title="No page by that name">
          {segment.text}
        </span>
      ),
    );
  }

  return (
    <section className={`storyline${expanded ? " storyline-expanded" : ""}`} aria-label={`Storyline: ${node.name}`}>
      <div className="storyline-bar">
        <button type="button" className="ui-btn ui-btn-secondary" onClick={addScene}>
          <Plus size={15} />
          Add a scene
        </button>
        {/* Its own button rather than a mode of the one above. Making a page
            and pointing at one you already have are both first-class — the
            plan is explicit about that — and hiding the second behind a menu
            would make it the exception. */}
        <div className="storyline-picker-anchor" ref={pickerRef}>
          <button
            type="button"
            className="ui-btn ui-btn-secondary"
            aria-expanded={picking !== null}
            onClick={() => setPicking((open) => (open === null ? "" : null))}
          >
            <FilePlus2 size={15} />
            Put a page on it
          </button>

          {picking !== null && (
            <div className="storyline-picker" role="dialog" aria-label="Put an existing page on this storyline">
              <input
                type="text"
                className="property-field-input"
                placeholder="Search pages…"
                aria-label="Search pages to put on this storyline"
                value={picking}
                autoFocus
                ref={pickerInputRef}
                onChange={(event) => setPicking(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setPicking(null);
                }}
              />
              {picking.trim() && candidates.length === 0 && (
                <p className="storyline-picker-empty">
                  No page by that name that isn&rsquo;t already here. Pages in other universes aren&rsquo;t
                  offered — a storyline is one version of events.
                </p>
              )}
              {candidates.map((candidate) => (
                <button
                  type="button"
                  key={candidate.id}
                  className="storyline-picker-row"
                  onClick={() => putExistingPageOn(candidate.id)}
                >
                  <NodeIcon icon={candidate.icon} templateKey={candidate.templateKey} size={14} />
                  <span className="storyline-picker-name">{candidate.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" className="ui-btn ui-btn-secondary" onClick={addNote}>
          <StickyNote size={15} />
          Add a note
        </button>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={addBand}>
          <SquareDashed size={15} />
          Label a stretch
        </button>

        <span className="storyline-count">
          {model.scenes.length === 0
            ? "No scenes yet"
            : `${model.scenes.length} ${model.scenes.length === 1 ? "scene" : "scenes"}`}
        </span>

        <div className="storyline-bar-end">
          {/* Disabled rather than hidden once there is nothing to tidy: a button
              that vanishes when it has done its job reads as the app losing a
              control, and this row must not change height. */}
          <button
            type="button"
            className="ui-btn ui-btn-secondary"
            onClick={() => tidyStoryline(node.id)}
            disabled={!untidy}
            // **The key comes from the binding, never from a string here.**
            // Undo is Ctrl+Shift+Z rather than Ctrl+Z — her call, 2026-08-27,
            // because Ctrl+Z belongs to whatever is being written — and it is
            // rebindable, so a hardcoded label goes stale the day she changes
            // it. This tooltip said the wrong key until an app-suite scenario
            // pressed the one it advertised and nothing happened.
            title={
              untidy
                ? `Line the scenes up in order. ${undoKey} puts your arrangement back.`
                : "Already lined up"
            }
          >
            <Wand2 size={15} />
            Tidy up
          </button>
          <button
            type="button"
            className="storyline-icon-btn"
            aria-label={expanded ? "Shrink the canvas" : "Fill the window"}
            title={expanded ? "Shrink the canvas (Esc)" : "Fill the window"}
            onClick={() => setExpanded((was) => !was)}
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      <div
        className="storyline-stage"
        ref={stageRef}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onWheel={handleWheel}
      >
        <div className="storyline-scene" style={{ transform: sceneTransform }}>
          {/* Behind everything, because a band is the ground the scenes stand
              on. It is still not a container — see `scenesOnBand`. */}
          {bands.map((band) => {
            const isEditing = editing?.kind === "band" && editing.id === band.id;
            return (
              <div
                key={band.id}
                className={`storyline-band${band.id === selectedBand?.id ? " storyline-band-selected" : ""}`}
                style={{ left: band.x, top: band.y, width: band.width, height: band.height }}
                onPointerDown={(event) => startBandDrag(event, band)}
                onPointerMove={moveBandDrag}
                onPointerUp={(event) => endBandDrag(event, band)}
                onPointerCancel={(event) => endBandDrag(event, band)}
              >
                {isEditing ? (
                  <input
                    className="storyline-band-input"
                    value={editing.draft}
                    autoFocus
                    placeholder="Act 1"
                    aria-label="What this stretch is called"
                    onPointerDown={(event) => event.stopPropagation()}
                    onChange={(event) => setEditing({ ...editing, draft: event.target.value })}
                    onBlur={commitEdit}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur();
                    }}
                  />
                ) : (
                  <span
                    className="storyline-band-label"
                    onDoubleClick={() => setEditing({ kind: "band", id: band.id, draft: band.label })}
                  >
                    {band.label || "Double-click to name this stretch"}
                  </span>
                )}

                {/* Bottom-right, where a resize handle goes everywhere else. */}
                <button
                  type="button"
                  className="storyline-band-corner"
                  aria-label={`Resize ${band.label || "this stretch"}`}
                  onPointerDown={(event) => startBandResize(event, band)}
                  onPointerMove={moveBandResize}
                  onPointerUp={endBandResize}
                  onPointerCancel={endBandResize}
                />
              </div>
            );
          })}

          <svg
            className="storyline-edges"
            style={{ left: bounds.minX, top: bounds.minY, width: bounds.width, height: bounds.height }}
            viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
          >
            {/* One marker, referenced by every line. Drawn in the same token
                colour the lines take, so a theme that recolours the canvas
                recolours the arrowheads with it rather than leaving them
                behind at the old value. */}
            <defs>
              <marker
                id="storyline-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path className="storyline-arrowhead" d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
            </defs>

            {edges.map((edge) => (
              // A line is clickable so it can be removed, which means it is a
              // control and not decoration — hence the role and the label. The
              // wide transparent twin underneath is what makes a two-pixel line
              // possible to actually hit.
              <g
                key={edge.id}
                className={`storyline-edge${edge.id === selectedEdgeId ? " storyline-edge-selected" : ""}`}
                role="button"
                tabIndex={0}
                aria-label="A line between two scenes"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  selectEdge(edge.id === selectedEdgeId ? null : edge.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") selectEdge(edge.id);
                }}
              >
                <line className="storyline-edge-hit" x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} />
                <line
                  className="storyline-edge-line"
                  markerEnd="url(#storyline-arrow)"
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                />
              </g>
            ))}

            {/* The line being drawn right now. Decorative — it exists for the
                duration of a pointer gesture and there is nothing to read. */}
            {linking && (
              <line
                className="storyline-edge-line storyline-edge-drawing"
                aria-hidden="true"
                x1={scenes.find((scene) => scene.id === linking.fromId)?.x ?? linking.to.x}
                y1={scenes.find((scene) => scene.id === linking.fromId)?.y ?? linking.to.y}
                x2={linking.to.x}
                y2={linking.to.y}
              />
            )}
          </svg>

          {scenes.map((scene) => {
            const hex = getPaletteHex(scene.color ?? undefined);
            return (
              <div
                key={scene.id}
                className={`storyline-node${scene.id === selectedId ? " storyline-node-selected" : ""}`}
                style={
                  {
                    left: scene.x - STORYLINE_NODE_WIDTH / 2,
                    top: scene.y - STORYLINE_NODE_HEIGHT / 2,
                    ...(hex ? { "--storyline-node-color": hex } : {}),
                  } as React.CSSProperties
                }
              >
                {/* `data-scene-id` is how a dropped line finds what it landed
                    on — see `endLink`, which reads the document because a
                    pointer capture means nothing else is getting events. */}
                <button
                  type="button"
                  className="storyline-node-body"
                  data-scene-id={scene.id}
                  title={scene.name}
                  onPointerDown={(event) => startSceneDrag(event, scene)}
                  onPointerMove={moveSceneDrag}
                  onPointerUp={(event) => endSceneDrag(event, scene)}
                  onPointerCancel={(event) => endSceneDrag(event, scene)}
                  // Only the keyboard's click reaches this — a mouse click is
                  // decided in endSceneDrag, where a press that travelled can
                  // be told from one that did not.
                  onClick={(event) => {
                    if (event.detail === 0) select(scene.id);
                  }}
                  onDoubleClick={() => selectNode(scene.pageId)}
                >
                  <span className="storyline-node-icon">
                    <NodeIcon icon={scene.icon} templateKey={scene.templateKey} size={16} />
                  </span>
                  <span className="storyline-node-name">{scene.name}</span>

                  {/* Who and what is in the scene, from the reference index —
                      whatever its page points at, however it points. **The row
                      is always drawn, empty or not**, so a card is the same
                      height whether or not anybody is in it: a canvas whose
                      cards changed size as pages were written in would move
                      under her every time. The names are in the tooltip and in
                      the strip below; at this size only the icons fit. */}
                  <span className="storyline-node-cast" aria-hidden="true">
                    {scene.cast.slice(0, STORYLINE_CAST_SHOWN).map((member) => (
                      <span key={member.id} className="storyline-cast-dot" title={member.name}>
                        <NodeIcon icon={member.icon} templateKey={member.templateKey} size={11} />
                      </span>
                    ))}
                    {scene.cast.length > STORYLINE_CAST_SHOWN && (
                      <span className="storyline-cast-more">+{scene.cast.length - STORYLINE_CAST_SHOWN}</span>
                    )}
                  </span>
                </button>

                {/* Its own element rather than a modifier key on the card: the
                    two things you do to a scene are move it and join it, and
                    telling those apart by whether Shift was held is how half
                    the lines end up drawn by accident. */}
                <button
                  type="button"
                  className="storyline-node-handle"
                  aria-label={`Draw a line from ${scene.name}`}
                  title="Drag to the scene this leads to"
                  onPointerDown={(event) => startLink(event, scene)}
                  onPointerMove={moveLink}
                  onPointerUp={endLink}
                  onPointerCancel={endLink}
                >
                  <Link2 size={13} />
                </button>
              </div>
            );
          })}

          {/* In front of the scenes: a note is an aside about what is under it,
              and one hidden behind a card would be an aside nobody can read. */}
          {notes.map((note) => {
            const isEditing = editing?.kind === "note" && editing.id === note.id;
            return (
              <div
                key={note.id}
                className={`storyline-note${note.id === selectedNote?.id ? " storyline-note-selected" : ""}`}
                style={{ left: note.x, top: note.y, width: note.width }}
                onPointerDown={(event) => startNoteDrag(event, note)}
                onPointerMove={moveNoteDrag}
                onPointerUp={(event) => endNoteDrag(event, note)}
                onPointerCancel={(event) => endNoteDrag(event, note)}
                onDoubleClick={() => setEditing({ kind: "note", id: note.id, draft: note.text })}
              >
                {isEditing ? (
                  <textarea
                    className="storyline-note-input"
                    value={editing.draft}
                    autoFocus
                    rows={3}
                    aria-label="What this note says"
                    placeholder="Continued in [[another page]]"
                    onPointerDown={(event) => event.stopPropagation()}
                    onChange={(event) => setEditing({ ...editing, draft: event.target.value })}
                    onBlur={commitEdit}
                    // Escape commits and leaves rather than throwing the
                    // sentence away — a note is writing, and the app does not
                    // discard writing on a keystroke anywhere else either.
                    onKeyDown={(event) => {
                      if (event.key === "Escape") event.currentTarget.blur();
                    }}
                  />
                ) : (
                  <p className="storyline-note-text">
                    {note.text ? noteBody(note) : <span className="storyline-note-empty">Double-click to write</span>}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {model.scenes.length === 0 && model.notes.length === 0 && model.bands.length === 0 && (
          <p className="storyline-empty">
            Nothing on this storyline yet. Add a scene — it becomes a page inside this one, and you write in it
            like any other. Drag from a scene&rsquo;s handle to the one it leads to.
          </p>
        )}

        {refusal && (
          <p className="storyline-refusal" role="status">
            {refusal}
          </p>
        )}

        {/* Read out rather than shown as a number to act on: how far in she is
            zoomed is not something to fix. Inside the stage, so the selection
            strip cannot be drawn over it. */}
        <span className="storyline-zoom" aria-live="off">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* One strip, in one place, whatever is selected. A panel that appeared
          beside whichever thing was clicked would sit somewhere different every
          time, which is the thing that reads as the app moving underneath. */}
      {(selectedScene || selectedNote || selectedBand || selectedEdgeId) && (
        <div className="storyline-selection">
          <span className="storyline-selection-name">
            {selectedScene?.name ??
              (selectedNote ? "Note" : undefined) ??
              (selectedBand ? selectedBand.label || "Unnamed stretch" : undefined) ??
              "Line between two scenes"}
          </span>

          {selectedScene && (
            <>
              {/* The names, where there is room for them — the card only had
                  space for icons. Each one goes to its page, which is the
                  useful thing to do with "who is in this scene". */}
              {selectedScene.cast.length > 0 && (
                <span className="storyline-selection-cast">
                  {selectedScene.cast.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className="storyline-cast-chip"
                      onClick={() => selectNode(member.id)}
                    >
                      <NodeIcon icon={member.icon} templateKey={member.templateKey} size={12} />
                      {member.name}
                    </button>
                  ))}
                </span>
              )}
              <button
                type="button"
                className="ui-btn ui-btn-secondary"
                onClick={() => selectNode(selectedScene.pageId)}
              >
                Open this scene
              </button>
              {/* Says "off the canvas", never "delete": the page keeps
                  existing, in the tree, with everything written in it. */}
              <button
                type="button"
                className="ui-btn ui-btn-secondary"
                onClick={() => {
                  removeStorylineNode(node.id, selectedScene.id);
                  select(null);
                }}
              >
                Take off the canvas
              </button>
            </>
          )}

          {selectedNote && (
            <>
              <button
                type="button"
                className="ui-btn ui-btn-secondary"
                onClick={() => setEditing({ kind: "note", id: selectedNote.id, draft: selectedNote.text })}
              >
                Edit
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-secondary"
                onClick={() => {
                  removeStorylineNote(node.id, selectedNote.id);
                  selectAnnotation(null);
                }}
              >
                Remove this note
              </button>
            </>
          )}

          {selectedBand && (
            <>
              <button
                type="button"
                className="ui-btn ui-btn-secondary"
                onClick={() => setEditing({ kind: "band", id: selectedBand.id, draft: selectedBand.label })}
              >
                Rename
              </button>
              {/* The scenes are not "in" it, so removing it removes a label. */}
              <button
                type="button"
                className="ui-btn ui-btn-secondary"
                onClick={() => {
                  removeStorylineBand(node.id, selectedBand.id);
                  selectAnnotation(null);
                }}
              >
                Remove this label
              </button>
            </>
          )}

          {selectedEdgeId && !selectedScene && !selectedNote && !selectedBand && (
            <button
              type="button"
              className="ui-btn ui-btn-secondary"
              onClick={() => {
                disconnectStorylineEdge(node.id, selectedEdgeId);
                selectEdge(null);
              }}
            >
              Remove this line
            </button>
          )}
        </div>
      )}

    </section>
  );
}
