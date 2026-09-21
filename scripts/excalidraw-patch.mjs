// The source of `patches/@excalidraw__excalidraw@0.18.1.patch`. Phase 32.
//
// **Why a patch at all**: a board has to work the way her hands expect
// from Canva and from LegendKeeper's boards, and the library's rules do
// not, in six places it has no switch for: a selection box takes only
// what it swallows whole; a click inside an unfilled shape picks up
// nothing; its labels are sentence case; a frame can neither hold a
// frame nor turn; every embed wears a link icon, which a sticky note
// and a video must not; and a moving GIF stands still. Each is written
// into its two builds, in its own section below.
//
// **Why this script exists beside the patch**: the patch file is enormous
// because the library's built files are single minified lines, so nobody
// can read the change off it. The change is what is below, and this is
// how it is re-applied when the library is upgraded:
//
//   pnpm patch @excalidraw/excalidraw@<version> --edit-dir <some folder>
//   node scripts/excalidraw-patch.mjs <that folder>
//   pnpm patch-commit <that folder>
//
// Each replacement asserts its target is present exactly once, so an
// upgrade that moved or renamed anything stops here with the name of what
// moved, rather than quietly shipping the library's own rule again. The
// minified names in the prod halves (`ei`, `ui`, `Wt`, `Ea`, `zE`, `Ne`, `C`
// and the rest) are the ones 0.18.1 happened to give those functions; a
// new version will have new ones, found by grepping for the readable
// strings around them. `e2e/a-board-selection.e2e.ts` and
// `e2e/a-board-frames.e2e.ts` are the other guards: they fail against an
// unpatched library.
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("usage: node scripts/excalidraw-patch.mjs <patch dir>");

function edit(file, replacements) {
  const full = path.join(dir, file);
  let text = fs.readFileSync(full, "utf8");
  for (const [from, to, expected = 1] of replacements) {
    const count = text.split(from).length - 1;
    if (count !== expected) throw new Error(`${file}: expected ${expected} match(es), found ${count} for: ${from.slice(0, 80)}`);
    text = text.split(from).join(to);
  }
  fs.writeFileSync(full, text);
  console.log("patched", file);
}

// ---- dev build ----

// The second change: a click anywhere inside a hollow rectangle, diamond
// or ellipse selects it, the way Canva and every drawing app she has used
// behave — the library takes only the outline of an unfilled shape, which
// reads as a shape that cannot be picked up. Lines, arrows and scribbles
// keep the library's rule; a shape on top of another still wins the click,
// which is what "send to back" is for.
const devInside = `var shouldTestInside = (element) => {
  if (element.type === "rectangle" || element.type === "diamond" || element.type === "ellipse") {
    return true; // Anamnesis patch: a hollow shape is picked up from inside
  }
  if (element.type === "arrow") {`;

const devTouch = `
// Anamnesis patch: whether the selection box *touches* an element, for box
// selection that takes what it crosses rather than only what it swallows
// (the rule the whiteboard LegendKeeper's boards run on). A hollow shape is
// touched only where the box crosses its outline, so a box drawn inside a
// big empty rectangle does not take the rectangle; a filled shape, text, a
// picture, an embed or a scribble is touched anywhere their boxes overlap;
// a line or arrow is touched where the box crosses one of its segments or
// holds one of its points.
var anamnesisSegmentsCross = ([a, b], [c, d]) => {
  const orient = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
  return o1 !== o2 && o3 !== o4;
};
var anamnesisSelectionTouches = (element, elementsMap, [sx1, sy1, sx2, sy2], [ex1, ey1, ex2, ey2]) => {
  if (sx2 < ex1 || sx1 > ex2 || sy2 < ey1 || sy1 > ey2) return false;
  const edges = [
    [[sx1, sy1], [sx2, sy1]],
    [[sx2, sy1], [sx2, sy2]],
    [[sx2, sy2], [sx1, sy2]],
    [[sx1, sy2], [sx1, sy1]],
  ];
  switch (element.type) {
    case "rectangle":
    case "diamond":
    case "ellipse":
      if (!isTransparent(element.backgroundColor)) return true;
      return edges.some((edge) => intersectElementWithLineSegment(element, edge).length > 0);
    case "frame":
    case "magicframe":
      return edges.some((edge) => intersectElementWithLineSegment(element, edge).length > 0);
    case "arrow":
    case "line": {
      const points = element.points.map(([px, py]) => [element.x + px, element.y + py]);
      const inside = ([x, y]) => x >= sx1 && x <= sx2 && y >= sy1 && y <= sy2;
      if (points.some(inside)) return true;
      for (let i = 0; i + 1 < points.length; i++) {
        const segment = [points[i], points[i + 1]];
        if (edges.some((edge) => anamnesisSegmentsCross(edge, segment))) return true;
      }
      return false;
    }
    default:
      return true;
  }
};
var getElementsWithinSelection = (elements, selection, elementsMap, excludeElementsInFrames = true, touching = false) => {`;

edit("dist/dev/chunk-4FTI6OG3.js", [
  [
    `var shouldTestInside = (element) => {
  if (element.type === "arrow") {`,
    devInside,
  ],
  [
    `var getElementsWithinSelection = (elements, selection, elementsMap, excludeElementsInFrames = true) => {`,
    devTouch,
  ],
  [
    `    return element.locked === false && element.type !== "selection" && !isBoundToContainer(element) && selectionX1 <= elementX1 && selectionY1 <= elementY1 && selectionX2 >= elementX2 && selectionY2 >= elementY2;
  });
  elementsInSelection = excludeElementsInFrames ?`,
    `    if (!(element.locked === false && element.type !== "selection" && !isBoundToContainer(element))) return false;
    const contained = selectionX1 <= elementX1 && selectionY1 <= elementY1 && selectionX2 >= elementX2 && selectionY2 >= elementY2;
    if (contained || !touching) return contained;
    return anamnesisSelectionTouches(element, elementsMap, [selectionX1, selectionY1, selectionX2, selectionY2], [elementX1, elementY1, elementX2, elementY2]);
  });
  elementsInSelection = excludeElementsInFrames ?`,
  ],
]);

edit("dist/dev/index.js", [
  [
    `          const elementsWithinSelection = this.state.selectionElement ? getElementsWithinSelection(
            elements,
            this.state.selectionElement,
            this.scene.getNonDeletedElementsMap(),
            false
          ) : [];`,
    `          const elementsWithinSelection = this.state.selectionElement ? getElementsWithinSelection(
            elements,
            this.state.selectionElement,
            this.scene.getNonDeletedElementsMap(),
            false,
            true // Anamnesis patch: the box takes what it touches
          ) : [];`,
  ],
]);

// ---- prod build (minified; Wt = isTransparent, Ea = intersectElementWithLineSegment) ----
const prodTouch =
  `anamnesisCross=([a,b],[c,d])=>{let o=(p,q,r)=>Math.sign((q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0])),o1=o(a,b,c),o2=o(a,b,d),o3=o(c,d,a),o4=o(c,d,b);return o1!==o2&&o3!==o4},` +
  `anamnesisTouches=(e,n,[o,i,a,s],[l,U,p,m])=>{if(a<l||o>p||s<U||i>m)return!1;let g=[[[o,i],[a,i]],[[a,i],[a,s]],[[a,s],[o,s]],[[o,s],[o,i]]];switch(e.type){case"rectangle":case"diamond":case"ellipse":return Wt(e.backgroundColor)?g.some(h=>Ea(e,h).length>0):!0;case"frame":case"magicframe":return g.some(h=>Ea(e,h).length>0);case"arrow":case"line":{let h=e.points.map(([x,y])=>[e.x+x,e.y+y]),x=([X,Y])=>X>=o&&X<=a&&Y>=i&&Y<=s;if(h.some(x))return!0;for(let X=0;X+1<h.length;X++){let Y=[h[X],h[X+1]];if(g.some(Z=>anamnesisCross(Z,Y)))return!0}return!1}default:return!0}},` +
  `ui=(e,t,n,r=!0,T=!1)=>{let[o,i,a,s]=C(t,n)`;

edit("dist/prod/chunk-K2UTITRG.js", [
  [
    `ei=e=>{if(e.type==="arrow")return!1;let t=!Wt(e.backgroundColor)||bn(e)||gt(e)||k(e)`,
    `ei=e=>{if(e.type==="rectangle"||e.type==="diamond"||e.type==="ellipse")return!0;if(e.type==="arrow")return!1;let t=!Wt(e.backgroundColor)||bn(e)||gt(e)||k(e)`,
  ],
  [`ui=(e,t,n,r=!0)=>{let[o,i,a,s]=C(t,n)`, prodTouch],
  [
    `return c.locked===!1&&c.type!=="selection"&&!Ne(c)&&o<=l&&i<=U&&a>=p&&s>=m})`,
    `if(!(c.locked===!1&&c.type!=="selection"&&!Ne(c)))return!1;let $c=o<=l&&i<=U&&a>=p&&s>=m;return $c||!T?$c:anamnesisTouches(c,n,[o,i,a,s],[l,U,p,m])})`,
  ],
]);

edit("dist/prod/index.js", [
  [
    `zE(p,this.state.selectionElement,this.scene.getNonDeletedElementsMap(),!1)`,
    `zE(p,this.state.selectionElement,this.scene.getNonDeletedElementsMap(),!1,!0)`,
  ],
]);

// ---- Frames that nest and turn (Phase 32, step 3) ----
//
// The library refuses a frame as a child of a frame (`addElementsToFrame`
// skips frame-like elements, upstream issue #8359) and refuses to turn one
// (the rotation grip is omitted, `rotateSingleElement` pins the angle to
// zero, `maybeHandleResize` bails). LK's frames do both, and a frame that
// has to be straight and cannot hold another is a frame with the useful
// half missing. Two helpers carry the nesting: the *contents* of a frame
// at any depth, and the *ancestors* of an element — every frame enclosing
// it, nearest first. Everything that moved, duplicated, deleted, selected
// or erased "a frame's children" now takes its contents; everything that
// asked "which frame holds this" walks its ancestors. A frame may hold any
// element but itself and its own ancestors, so no cycle can be made. A
// turned frame is drawn, clipped, hit and labelled by its turned box, and
// turning it turns everything in it about its centre.
const devFrameHelpers = `// Anamnesis patch: frames inside frames, and frames that turn.
var anamnesisFrameAncestors = (element, elementsMap) => {
  const frames = [];
  let frame = element?.frameId ? elementsMap.get(element.frameId) : null;
  while (frame && isFrameLikeElement(frame) && !frame.isDeleted && frames.length < 64 && !frames.includes(frame)) {
    frames.push(frame);
    frame = frame.frameId ? elementsMap.get(frame.frameId) : null;
  }
  return frames;
};
var anamnesisFrameContents = (allElements, frameIds) => {
  const list = Array.from(allElements.values());
  const inside = new Set(frameIds);
  let grew = true;
  while (grew) {
    grew = false;
    for (const element of list) {
      if (element.frameId && inside.has(element.frameId) && !inside.has(element.id)) {
        inside.add(element.id);
        grew = true;
      }
    }
  }
  return list.filter((element) => inside.has(element.id) && !frameIds.includes(element.id));
};
var anamnesisFrameCanHold = (frame, element, elementsMap) => element.id !== frame.id && !anamnesisFrameAncestors(frame, elementsMap).some((ancestor) => ancestor.id === element.id);
var anamnesisPointInFrame = ([px, py], frame) => {
  const [x, y] = pointRotateRads(pointFrom(px, py), pointFrom(frame.x + frame.width / 2, frame.y + frame.height / 2), -frame.angle);
  return x >= frame.x && x <= frame.x + frame.width && y >= frame.y && y <= frame.y + frame.height;
};
var getElementsCompletelyInFrame = (elements, frame, elementsMap) => omitGroupsContainingFrameLikes(
  getElementsWithinSelection(elements, frame, elementsMap, false)
).filter(
  (element) => anamnesisFrameCanHold(frame, element, elementsMap) && (!element.frameId || element.frameId === frame.id || anamnesisFrameAncestors(frame, elementsMap).some((ancestor) => ancestor.id === element.frameId))
);`;

edit("dist/dev/chunk-4FTI6OG3.js", [
  [
    `var getElementsCompletelyInFrame = (elements, frame, elementsMap) => omitGroupsContainingFrameLikes(
  getElementsWithinSelection(elements, frame, elementsMap, false)
).filter(
  (element) => !isFrameLikeElement(element) && !element.frameId || element.frameId === frame.id
);`,
    devFrameHelpers,
  ],
  // A turned frame's bounds are its turned box, not the box around it.
  [
    `var elementsAreInFrameBounds = (elements, frame, elementsMap) => {
  const [frameX1, frameY1, frameX2, frameY2] = getElementAbsoluteCoords(
    frame,
    elementsMap
  );
  const [elementX1, elementY1, elementX2, elementY2] = getCommonBounds(elements);
  return frameX1 <= elementX1 && frameY1 <= elementY1 && frameX2 >= elementX2 && frameY2 >= elementY2;
};`,
    `var elementsAreInFrameBounds = (elements, frame, elementsMap) => {
  const [elementX1, elementY1, elementX2, elementY2] = getCommonBounds(elements);
  return [[elementX1, elementY1], [elementX2, elementY1], [elementX1, elementY2], [elementX2, elementY2]].every((corner) => anamnesisPointInFrame(corner, frame));
};`,
  ],
  [
    `var isCursorInFrame = (cursorCoords, frame, elementsMap) => {
  const [fx1, fy1, fx2, fy2] = getElementAbsoluteCoords(frame, elementsMap);
  return isPointWithinBounds(
    pointFrom(fx1, fy1),
    pointFrom(cursorCoords.x, cursorCoords.y),
    pointFrom(fx2, fy2)
  );
};`,
    `var isCursorInFrame = (cursorCoords, frame, elementsMap) => {
  return anamnesisPointInFrame([cursorCoords.x, cursorCoords.y], frame);
};`,
  ],
  // A frame may be given to a frame — any but itself and its ancestors.
  [
    `    if (isFrameLikeElement(element) || element.frameId && otherFrames.has(element.frameId)) {`,
    `    if (!anamnesisFrameCanHold(frame, element, elementsMap) || element.frameId && otherFrames.has(element.frameId)) {`,
    2,
  ],
  // A frame dragged out of its frame leaves it, like anything else.
  [
    `    if (element.frameId && !isFrameLikeElement(element) && !isElementInFrame(element, elementsMap, appState)) {`,
    `    if (element.frameId && !isElementInFrame(element, elementsMap, appState)) {`,
  ],
  // Selecting a frame carries everything in it, at any depth.
  [
    `      if (isFrameLikeElement(element)) {
        getFrameChildren(elements, element.id).forEach(
          (e) => !addedElements.has(e.id) && elementsToInclude.push(e)
        );
      }`,
    `      if (isFrameLikeElement(element)) {
        anamnesisFrameContents(elements, [element.id]).forEach(
          (e) => !addedElements.has(e.id) && addedElements.add(e.id) && elementsToInclude.push(e)
        );
      }`,
  ],
  // Clipping: by the frame's turned box, and by every frame around it.
  [
    `var frameClip = (frame, context, renderConfig, appState) => {
  context.translate(frame.x + appState.scrollX, frame.y + appState.scrollY);
  context.beginPath();
  if (context.roundRect) {
    context.roundRect(
      0,
      0,
      frame.width,
      frame.height,
      FRAME_STYLE.radius / appState.zoom.value
    );
  } else {
    context.rect(0, 0, frame.width, frame.height);
  }
  context.clip();
  context.translate(
    -(frame.x + appState.scrollX),
    -(frame.y + appState.scrollY)
  );
};`,
    `var frameClip = (frame, context, renderConfig, appState, elementsMap, depth = 0) => {
  // Anamnesis patch: a frame in a frame is clipped by both; a turned frame clips to its turned box.
  const parent = elementsMap && frame.frameId && depth < 64 ? elementsMap.get(frame.frameId) : null;
  if (parent && isFrameLikeElement(parent) && !parent.isDeleted) {
    frameClip(parent, context, renderConfig, appState, elementsMap, depth + 1);
  }
  const cx = frame.x + frame.width / 2 + appState.scrollX;
  const cy = frame.y + frame.height / 2 + appState.scrollY;
  context.translate(cx, cy);
  context.rotate(frame.angle);
  context.beginPath();
  if (context.roundRect) {
    context.roundRect(
      -frame.width / 2,
      -frame.height / 2,
      frame.width,
      frame.height,
      FRAME_STYLE.radius / appState.zoom.value
    );
  } else {
    context.rect(-frame.width / 2, -frame.height / 2, frame.width, frame.height);
  }
  context.clip();
  context.rotate(-frame.angle);
  context.translate(-cx, -cy);
};`,
  ],
  [`          frameClip(frame, context, renderConfig, appState);`, `          frameClip(frame, context, renderConfig, appState, elementsMap);`, 2],
  [
    `var shouldApplyFrameClip = (element, frame, appState, elementsMap, checkedGroups) => {
  if (!appState.frameRendering || !appState.frameRendering.clip) {
    return false;
  }`,
    `var shouldApplyFrameClip = (element, frame, appState, elementsMap, checkedGroups) => {
  if (!appState.frameRendering || !appState.frameRendering.clip) {
    return false;
  }
  if (frame.angle || frame.frameId) {
    return true; // Anamnesis patch: a turned or nested frame always clips
  }`,
  ],
  // The frame itself is drawn turned.
  [
    `        context.translate(
          element.x + appState.scrollX,
          element.y + appState.scrollY
        );
        context.fillStyle = "rgba(0, 0, 200, 0.04)";`,
    `        context.translate(
          element.x + appState.scrollX + element.width / 2,
          element.y + appState.scrollY + element.height / 2
        );
        context.rotate(element.angle);
        context.translate(-element.width / 2, -element.height / 2);
        context.fillStyle = "rgba(0, 0, 200, 0.04)";`,
  ],
  // Its label goes with it in an export.
  [
    `      textElement = truncateText(textElement, element.width);
      nextElements.push(textElement);`,
    `      textElement = truncateText(textElement, element.width);
      if (element.angle) {
        const [tx, ty] = pointRotateRads(
          pointFrom(textElement.x + textElement.width / 2, textElement.y + textElement.height / 2),
          pointFrom(element.x + element.width / 2, element.y + element.height / 2),
          element.angle
        );
        textElement = newElementWith(textElement, { x: tx - textElement.width / 2, y: ty - textElement.height / 2, angle: element.angle });
      }
      nextElements.push(textElement);`,
  ],
  [
    `  } else if (isFrameLikeElement(element)) {
    omitSides = {
      ...omitSides,
      rotation: true
    };
  }
  const margin = isLinearElement(element)`,
    `  }
  const margin = isLinearElement(element)`,
  ],
  [
    `  let angle;
  if (isFrameLikeElement(element)) {
    angle = 0;
  } else {
    angle = 5 * Math.PI / 2 + Math.atan2(pointerY - cy, pointerX - cx);`,
    `  let angle;
  {
    angle = 5 * Math.PI / 2 + Math.atan2(pointerY - cy, pointerX - cx);`,
  ],
  [
    `  for (const element of elements) {
    if (!isFrameLikeElement(element)) {
      const [x1, y1, x2, y2] = getElementAbsoluteCoords(element, elementsMap);`,
    `  for (const element of elements) {
    {
      const [x1, y1, x2, y2] = getElementAbsoluteCoords(element, elementsMap);`,
  ],
  // Turning a frame turns everything in it, about the selection's centre.
  [
    `var transformElements = (originalElements, transformHandleType, selectedElements, elementsMap, scene, shouldRotateWithDiscreteAngle2, shouldResizeFromCenter2, shouldMaintainAspectRatio2, pointerX, pointerY, centerX, centerY) => {
  if (selectedElements.length === 1) {`,
    `var transformElements = (originalElements, transformHandleType, selectedElements, elementsMap, scene, shouldRotateWithDiscreteAngle2, shouldResizeFromCenter2, shouldMaintainAspectRatio2, pointerX, pointerY, centerX, centerY) => {
  if (transformHandleType === "rotation" && selectedElements.some((element) => isFrameLikeElement(element))) {
    // Anamnesis patch: a frame turns with everything in it
    const carried = anamnesisFrameContents(elementsMap, selectedElements.filter((element) => isFrameLikeElement(element)).map((frame) => frame.id));
    const turning = [...selectedElements, ...carried.filter((element) => !element.isDeleted && !isBoundToContainer(element) && !selectedElements.includes(element))];
    rotateMultipleElements(originalElements, turning, elementsMap, scene, pointerX, pointerY, shouldRotateWithDiscreteAngle2, centerX, centerY);
    return true;
  }
  if (selectedElements.length === 1) {`,
  ],
  // Dragging a frame drags everything in it.
  [
    `  if (frames.length > 0) {
    for (const element of scene.getNonDeletedElements()) {
      if (element.frameId !== null && frames.includes(element.frameId)) {
        elementsToUpdate.add(element);
      }
    }
  }`,
    `  if (frames.length > 0) {
    for (const element of anamnesisFrameContents(scene.getNonDeletedElements(), frames)) {
      elementsToUpdate.add(element);
    }
  }`,
  ],
  // SVG export: clip by every frame around, and turn the clip in degrees
  // as the rest of the SVG does (the library wrote radians there).
  [
    `  const frame = getContainingFrame(element, elementsMap);
  if (frame) {
    const g = root.ownerDocument.createElementNS(SVG_NS, "g");
    g.setAttributeNS(SVG_NS, "clip-path", \`url(#\${frame.id})\`);
    nodes.forEach((node) => g.appendChild(node));
    return g;
  }
  return null;
};`,
    `  let wrapped = null;
  for (const frame of anamnesisFrameAncestors(element, elementsMap)) {
    const g = root.ownerDocument.createElementNS(SVG_NS, "g");
    g.setAttributeNS(SVG_NS, "clip-path", \`url(#\${frame.id})\`);
    (wrapped ? [wrapped] : nodes).forEach((node) => g.appendChild(node));
    wrapped = g;
  }
  return wrapped;
};`,
  ],
  [
    `\`translate(\${frame.x + offsetX} \${frame.y + offsetY}) rotate(\${frame.angle} \${cx} \${cy})\``,
    `\`translate(\${frame.x + offsetX} \${frame.y + offsetY}) rotate(\${frame.angle * 180 / Math.PI} \${cx} \${cy})\``,
  ],
  [
    `  getFrameChildren,
  getFrameLikeElements,`,
    `  getFrameChildren,
  anamnesisFrameContents,
  anamnesisFrameAncestors,
  getFrameLikeElements,`,
  ],
]);

edit("dist/dev/index.js", [
  [
    `  getFrameChildren,
  getFrameLikeElements,`,
    `  getFrameChildren,
  anamnesisFrameContents,
  anamnesisFrameAncestors,
  getFrameLikeElements,`,
  ],
  // Deleting a frame deletes everything in it, at any depth. The library
  // unframed the contents instead and left them selected — its Delete key
  // disagreed with its own eraser, which takes the contents — and a frame
  // that survives its frame's deletion is not what a hand expects from
  // Canva or LK.
  [
    `  for (const frameId of framesToBeDeleted) {
    const frameChildren = getFrameChildren(elements, frameId);`,
    `  for (const frameId of framesToBeDeleted) {
    const frameChildren = []; // Anamnesis patch: the contents go with the frame, so nothing is left to select`,
  ],
  [
    `      if (el.frameId && framesToBeDeleted.has(el.frameId)) {
        shouldSelectEditingGroup = false;
        selectedElementIds[el.id] = true;
        return el;
      }
      if (boundElement?.frameId && framesToBeDeleted.has(boundElement?.frameId)) {
        return el;
      }
      if (el.boundElements) {`,
    `      if (el.boundElements) {`,
  ],
  [
    `    if (el.frameId && framesToBeDeleted.has(el.frameId)) {
      shouldSelectEditingGroup = false;
      if (!isBoundToContainer(el)) {
        selectedElementIds[el.id] = true;
      }
      return newElementWith(el, { frameId: null });
    }`,
    `    if (el.frameId && anamnesisFrameAncestors(el, elementsMap).some((frame) => framesToBeDeleted.has(frame.id))) {
      return newElementWith(el, { isDeleted: true });
    }`,
  ],
  // Duplicating one duplicates everything in it.
  [
    `      const frameId = element.id;
      const frameChildren = getFrameChildren(elements, frameId);`,
    `      const frameId = element.id;
      const frameChildren = anamnesisFrameContents(elements, [frameId]);`,
  ],
  // Wrap Selection in Frame takes a frame too, and the new frame goes
  // where the selection was: inside the frame that held all of it.
  [
    `    return selectedElements.length > 0 && !selectedElements.some((element) => isFrameLikeElement(element));
  },`,
    `    return selectedElements.length > 0;
  },`,
  ],
  [
    `    const frame = newFrameElement({
      x: x1 - PADDING,`,
    `    const frame = newFrameElement({
      frameId: selectedElements.every((element) => element.frameId === selectedElements[0].frameId) ? selectedElements[0].frameId : null,
      x: x1 - PADDING,`,
  ],
  [
    `  if (property === "angle" && isFrameLikeElement(element)) {
    return false;
  }`,
    ``,
  ],
  // The drop highlight is the frame's turned box.
  [
    `var renderFrameHighlight = (context, appState, frame, elementsMap) => {
  const [x1, y1, x2, y2] = getElementAbsoluteCoords(frame, elementsMap);
  const width = x2 - x1;
  const height = y2 - y1;`,
    `var renderFrameHighlight = (context, appState, frame, elementsMap) => {
  const [x1, y1, width, height] = [frame.x, frame.y, frame.width, frame.height];`,
  ],
  // The label sits on the turned frame's top-left corner and turns with it.
  [
    `        const { x: x1, y: y1 } = sceneCoordsToViewportCoords(
          { sceneX: f.x, sceneY: f.y },
          this.state
        );`,
    `        const anamnesisCorner = pointRotateRads(pointFrom(f.x, f.y), pointFrom(f.x + f.width / 2, f.y + f.height / 2), f.angle);
        const { x: x1, y: y1 } = sceneCoordsToViewportCoords(
          { sceneX: anamnesisCorner[0], sceneY: anamnesisCorner[1] },
          this.state
        );`,
  ],
  [
    `              bottom: \`\${this.state.height + FRAME_STYLE.nameOffsetY - y1 + this.state.offsetTop}px\`,
              left: \`\${x1 - this.state.offsetLeft}px\`,`,
    `              bottom: \`\${this.state.height + FRAME_STYLE.nameOffsetY - y1 + this.state.offsetTop}px\`,
              left: \`\${x1 - this.state.offsetLeft}px\`,
              transform: f.angle ? \`rotate(\${f.angle}rad)\` : void 0,
              transformOrigin: \`0 calc(100% + \${FRAME_STYLE.nameOffsetY}px)\`,`,
  ],
  [
    `        // Frames cannot be rotated.
        selectedFrames.length > 0 && transformHandleType === "rotation" || // Elbow arrows cannot be transformed (resized or rotated).
`,
    `        // Elbow arrows cannot be transformed (resized or rotated).
`,
  ],
  // The frame under the pointer is the innermost one there, never one
  // being carried by the drag.
  [
    `    __publicField(this, "getTopLayerFrameAtSceneCoords", (sceneCoords) => {
      const elementsMap = this.scene.getNonDeletedElementsMap();
      const frames = this.scene.getNonDeletedFramesLikes().filter(
        (frame) => isCursorInFrame(sceneCoords, frame, elementsMap)
      );
      return frames.length ? frames[frames.length - 1] : null;
    });`,
    `    __publicField(this, "getTopLayerFrameAtSceneCoords", (sceneCoords, excluded) => {
      const elementsMap = this.scene.getNonDeletedElementsMap();
      const frames = this.scene.getNonDeletedFramesLikes().filter(
        (frame) => !excluded?.has(frame.id) && isCursorInFrame(sceneCoords, frame, elementsMap)
      );
      let innermost = null;
      let depth = -1;
      for (const frame of frames) {
        const frameDepth = anamnesisFrameAncestors(frame, elementsMap).length;
        if (frameDepth >= depth) {
          innermost = frame;
          depth = frameDepth;
        }
      }
      return innermost;
    });
    __publicField(this, "anamnesisCarriedFrameIds", (selectedElements) => {
      const frames = selectedElements.filter((element) => isFrameLikeElement(element));
      const carried = new Set(frames.map((frame) => frame.id));
      for (const element of anamnesisFrameContents(this.scene.getNonDeletedElements(), [...carried])) {
        if (isFrameLikeElement(element)) carried.add(element.id);
      }
      return carried;
    });`,
  ],
  [
    `        const topLayerFrame = this.getTopLayerFrameAtSceneCoords(pointerCoords);
        const frameToHighlight = topLayerFrame && !selectedElementsHasAFrame ? topLayerFrame : null;`,
    `        const topLayerFrame = this.getTopLayerFrameAtSceneCoords(pointerCoords, this.anamnesisCarriedFrameIds(selectedElements));
        const frameToHighlight = topLayerFrame ? topLayerFrame : null;`,
  ],
  [
    `          const topLayerFrame = this.getTopLayerFrameAtSceneCoords(sceneCoords);
          const selectedElements = this.scene.getSelectedElements(this.state);`,
    `          const selectedElements = this.scene.getSelectedElements(this.state);
          const topLayerFrame = this.getTopLayerFrameAtSceneCoords(sceneCoords, this.anamnesisCarriedFrameIds(selectedElements));`,
  ],
  // The eraser takes a frame's contents at any depth.
  [
    `        if (this.elementsPendingErasure.has(ele.id) || ele.frameId && this.elementsPendingErasure.has(ele.frameId) ||`,
    `        if (this.elementsPendingErasure.has(ele.id) || ele.frameId && anamnesisFrameAncestors(ele, this.scene.getNonDeletedElementsMap()).some((frame) => this.elementsPendingErasure.has(frame.id)) ||`,
  ],
  // A frame drawn inside a frame is its child from the start.
  [
    `      const frame = type === TOOL_TYPE.magicframe ? newMagicFrameElement(constructorOpts) : newFrameElement(constructorOpts);`,
    `      constructorOpts.frameId = this.getTopLayerFrameAtSceneCoords({ x: gridX, y: gridY })?.id ?? null;
      const frame = type === TOOL_TYPE.magicframe ? newMagicFrameElement(constructorOpts) : newFrameElement(constructorOpts);`,
  ],
  // Clicking a frame drops what it carries from the selection; clicking
  // something carried by a selected frame keeps the frame.
  [
    `                  if (isFrameLikeElement(hitElement)) {
                    getFrameChildren(
                      previouslySelectedElements,
                      hitElement.id
                    ).forEach((element) => {
                      delete nextSelectedElementIds[element.id];
                    });
                  } else if (hitElement.frameId) {
                    if (nextSelectedElementIds[hitElement.frameId]) {
                      delete nextSelectedElementIds[hitElement.id];
                    }
                  } else {`,
    `                  const anamnesisMap = this.scene.getNonDeletedElementsMap();
                  if (isFrameLikeElement(hitElement)) {
                    previouslySelectedElements.filter(
                      (element) => anamnesisFrameAncestors(element, anamnesisMap).some((frame) => frame.id === hitElement.id)
                    ).forEach((element) => {
                      delete nextSelectedElementIds[element.id];
                    });
                  } else if (hitElement.frameId) {
                    if (anamnesisFrameAncestors(hitElement, anamnesisMap).some((frame) => nextSelectedElementIds[frame.id])) {
                      delete nextSelectedElementIds[hitElement.id];
                    }
                  } else {`,
  ],
]);

// The same, minified. Names 0.18.1 gave the functions, found by grepping
// for the readable strings around them: de = isFrameLikeElement, T =
// pointRotateRads, u = pointFrom, $e = getCommonBounds, _i =
// omitGroupsContainingFrameLikes, ui = getElementsWithinSelection, Ne =
// isBoundToContainer, vt = newElementWith, Pe = FRAME_STYLE, co =
// getFrameChildren, Gp = isElementInFrame, ip = frameClip, as =
// shouldApplyFrameClip, I9/R9/y9 = rotateSingle/rotateMultiple/
// transformElements, We = getContainingFrame, re = SVG_NS. In the App
// chunk the same things arrive as ko = getFrameChildren, ie =
// isFrameLikeElement, bt = pointRotateRads, z = pointFrom, mo =
// FRAME_STYLE, yt = getElementAbsoluteCoords, Ym = isCursorInFrame, $ =
// getSelectedElements, xt = sceneCoordsToViewportCoords, ri/ba =
// newFrameElement/newMagicFrameElement, kt = TOOL_TYPE.
const prodFrameHelpers =
  `var anamnesisFrameAncestors=(e,t)=>{let n=[],r=e?.frameId?t.get(e.frameId):null;for(;r&&de(r)&&!r.isDeleted&&n.length<64&&!n.includes(r);)n.push(r),r=r.frameId?t.get(r.frameId):null;return n},` +
  `anamnesisFrameContents=(e,t)=>{let n=Array.from(e.values()),r=new Set(t),o=!0;for(;o;){o=!1;for(let i of n)i.frameId&&r.has(i.frameId)&&!r.has(i.id)&&(r.add(i.id),o=!0)}return n.filter(i=>r.has(i.id)&&!t.includes(i.id))},` +
  `anamnesisFrameCanHold=(e,t,n)=>t.id!==e.id&&!anamnesisFrameAncestors(e,n).some(r=>r.id===t.id),` +
  `anamnesisPointInFrame=([e,t],n)=>{let[r,o]=T(u(e,t),u(n.x+n.width/2,n.y+n.height/2),-n.angle);return r>=n.x&&r<=n.x+n.width&&o>=n.y&&o<=n.y+n.height},` +
  `qp=(e,t,n)=>_i(ui(e,t,n,!1)).filter(r=>anamnesisFrameCanHold(t,r,n)&&(!r.frameId||r.frameId===t.id||anamnesisFrameAncestors(t,n).some(o=>o.id===r.frameId))),`;

edit("dist/prod/chunk-K2UTITRG.js", [
  [`var qp=(e,t,n)=>_i(ui(e,t,n,!1)).filter(r=>!de(r)&&!r.frameId||r.frameId===t.id),`, prodFrameHelpers],
  [
    `Bi=(e,t,n)=>{let[r,o,i,a]=C(t,n),[s,d,c,l]=$e(e);return r<=s&&o<=d&&i>=c&&a>=l}`,
    `Bi=(e,t,n)=>{let[s,d,c,l]=$e(e);return[[s,d],[c,d],[s,l],[c,l]].every(p=>anamnesisPointInFrame(p,t))}`,
  ],
  [`mH=(e,t,n)=>{let[r,o,i,a]=C(t,n);return So(u(r,o),u(e.x,e.y),u(i,a))}`, `mH=(e,t,n)=>anamnesisPointInFrame([e.x,e.y],t)`],
  [`if(!(de(a)||a.frameId&&n.has(a.frameId)))`, `if(!(!anamnesisFrameCanHold(t,a,r)||a.frameId&&n.has(a.frameId)))`],
  [`{if(de(c)||c.frameId&&d.has(c.frameId)||`, `{if(!anamnesisFrameCanHold(n,c,o)||c.frameId&&d.has(c.frameId)||`],
  [`s.frameId&&!de(s)&&!Gp(s,a,t)&&i.add(s)`, `s.frameId&&!Gp(s,a,t)&&i.add(s)`],
  [
    `de(a)&&co(e,a.id).forEach(s=>!r.has(s.id)&&i.push(s)),i.push(a)`,
    `de(a)&&anamnesisFrameContents(e,[a.id]).forEach(s=>!r.has(s.id)&&r.add(s.id)&&i.push(s)),i.push(a)`,
  ],
  [
    `ip=(e,t,n,r)=>{t.translate(e.x+r.scrollX,e.y+r.scrollY),t.beginPath(),t.roundRect?t.roundRect(0,0,e.width,e.height,Pe.radius/r.zoom.value):t.rect(0,0,e.width,e.height),t.clip(),t.translate(-(e.x+r.scrollX),-(e.y+r.scrollY))}`,
    `ip=(e,t,n,r,o,i=0)=>{let a=o&&e.frameId&&i<64?o.get(e.frameId):null;a&&de(a)&&!a.isDeleted&&ip(a,t,n,r,o,i+1);let s=e.x+e.width/2+r.scrollX,d=e.y+e.height/2+r.scrollY;t.translate(s,d),t.rotate(e.angle),t.beginPath(),t.roundRect?t.roundRect(-e.width/2,-e.height/2,e.width,e.height,Pe.radius/r.zoom.value):t.rect(-e.width/2,-e.height/2,e.width,e.height),t.clip(),t.rotate(-e.angle),t.translate(-s,-d)}`,
  ],
  [`ip(x,p,s,a)`, `ip(x,p,s,a,n)`, 2],
  [
    `as=(e,t,n,r,o)=>{if(!n.frameRendering||!n.frameRendering.clip)return!1;`,
    `as=(e,t,n,r,o)=>{if(!n.frameRendering||!n.frameRendering.clip)return!1;if(t.angle||t.frameId)return!0;`,
  ],
  [
    `o.save(),o.translate(e.x+a.scrollX,e.y+a.scrollY),o.fillStyle="rgba(0, 0, 200, 0.04)"`,
    `o.save(),o.translate(e.x+a.scrollX+e.width/2,e.y+a.scrollY+e.height/2),o.rotate(e.angle),o.translate(-e.width/2,-e.height/2),o.fillStyle="rgba(0, 0, 200, 0.04)"`,
  ],
  [
    `o.y-=o.height,o=h7(o,r.width),n.push(o)`,
    `o.y-=o.height,o=h7(o,r.width);if(r.angle){let[i,a]=T(u(o.x+o.width/2,o.y+o.height/2),u(r.x+r.width/2,r.y+r.height/2),r.angle);o=vt(o,{x:i-o.width/2,y:a-o.height/2,angle:r.angle})}n.push(o)`,
  ],
  [`else de(e)&&(o={...o,rotation:!0});`, `;`],
  [
    `p;de(e)?p=0:(p=5*Math.PI/2+Math.atan2(o-U,r-l),i&&(p=p+Nt/2,p=p-p%Nt),p=hr(p));`,
    `p;p=5*Math.PI/2+Math.atan2(o-U,r-l),i&&(p=p+Nt/2,p=p-p%Nt),p=hr(p);`,
  ],
  [`for(let l of t)if(!de(l)){let[U,p,m,b]=C(l,n)`, `for(let l of t){let[U,p,m,b]=C(l,n)`],
  [
    `y9=(e,t,n,r,o,i,a,s,d,c,l,U)=>{if(n.length===1){`,
    `y9=(e,t,n,r,o,i,a,s,d,c,l,U)=>{if(t==="rotation"&&n.some(p=>de(p))){let p=anamnesisFrameContents(r,n.filter(m=>de(m)).map(m=>m.id)),m=[...n,...p.filter(b=>!b.isDeleted&&!Ne(b)&&!n.includes(b))];return R9(e,m,r,o,d,c,i,l,U),!0}if(n.length===1){`,
  ],
  [
    `if(d.length>0)for(let U of r.getNonDeletedElements())U.frameId!==null&&d.includes(U.frameId)&&s.add(U);`,
    `if(d.length>0)for(let U of anamnesisFrameContents(r.getNonDeletedElements(),d))s.add(U);`,
  ],
  [
    `let i=We(e,o);if(i){let a=t.ownerDocument.createElementNS(re,"g");return a.setAttributeNS(re,"clip-path",\`url(#\${i.id})\`),n.forEach(s=>a.appendChild(s)),a}return null}`,
    `let i=null;for(let a of anamnesisFrameAncestors(e,o)){let s=t.ownerDocument.createElementNS(re,"g");s.setAttributeNS(re,"clip-path",\`url(#\${a.id})\`),(i?[i]:n).forEach(d=>s.appendChild(d)),i=s}return i}`,
  ],
  [`rotate(\${_.angle} \${j} \${ye})`, `rotate(\${_.angle*180/Math.PI} \${j} \${ye})`],
  [`co as Bi,`, `co as Bi,anamnesisFrameContents,anamnesisFrameAncestors,`],
]);

edit("dist/prod/index.js", [
  [`Bi as ko,`, `Bi as ko,anamnesisFrameContents,anamnesisFrameAncestors,`],
  [`for(let m of r){let d=ko(e,m);`, `for(let m of r){let d=[];`],
  [
    `return m.frameId&&r.has(m.frameId)?(l=!1,n[m.id]=!0,m):d?.frameId&&r.has(d?.frameId)?m:(m.boundElements&&`,
    `return(m.boundElements&&`,
  ],
  [
    `return m.frameId&&r.has(m.frameId)?(l=!1,qe(m)||(n[m.id]=!0),q(m,{frameId:null})):qe(m)&&`,
    `return m.frameId&&anamnesisFrameAncestors(m,i).some(p=>r.has(p.id))?q(m,{isDeleted:!0}):qe(m)&&`,
  ],
  [`if(ie(f)){let x=f.id,T=ko(e,x),`, `if(ie(f)){let x=f.id,T=anamnesisFrameContents(e,[x]),`],
  [
    `predicate:(e,o,t,r)=>{let n=$(e,o);return n.length>0&&!n.some(i=>ie(i))},perform:(e,o,t,r)=>{let n=$(e,o),[i,a,l,s]=Se(n,r.scene.getNonDeletedElementsMap()),c=16,m=ri({x:i-c,`,
    `predicate:(e,o,t,r)=>{let n=$(e,o);return n.length>0},perform:(e,o,t,r)=>{let n=$(e,o),[i,a,l,s]=Se(n,r.scene.getNonDeletedElementsMap()),c=16,m=ri({frameId:n.every(p=>p.frameId===n[0].frameId)?n[0].frameId:null,x:i-c,`,
  ],
  [`||o==="angle"&&ie(e))`, `)`],
  [
    `v5=(e,o,t,r)=>{let[n,i,a,l]=yt(t,r),s=a-n,c=l-i;e.strokeStyle="rgb(0,118,255)"`,
    `v5=(e,o,t,r)=>{let[n,i,s,c]=[t.x,t.y,t.width,t.height];e.strokeStyle="rgb(0,118,255)"`,
  ],
  [
    `let{x:n,y:i}=xt({sceneX:r.x,sceneY:r.y},this.state),a=6,l,s=lE(r);`,
    `let anamnesisCorner=bt(z(r.x,r.y),z(r.x+r.width/2,r.y+r.height/2),r.angle),{x:n,y:i}=xt({sceneX:anamnesisCorner[0],sceneY:anamnesisCorner[1]},this.state),a=6,l,s=lE(r);`,
  ],
  [
    `left:\`\${n-this.state.offsetLeft}px\`,zIndex:2,fontSize:mo.nameFontSize`,
    `left:\`\${n-this.state.offsetLeft}px\`,transform:r.angle?\`rotate(\${r.angle}rad)\`:void 0,transformOrigin:\`0 calc(100% + \${mo.nameOffsetY}px)\`,zIndex:2,fontSize:mo.nameFontSize`,
  ],
  [
    `if(i.length>0&&a==="rotation"||n.length===1&&ee(n[0])||this.state.croppingElementId)return!1;`,
    `if(n.length===1&&ee(n[0])||this.state.croppingElementId)return!1;`,
  ],
  [
    `C(this,"getTopLayerFrameAtSceneCoords",t=>{let r=this.scene.getNonDeletedElementsMap(),n=this.scene.getNonDeletedFramesLikes().filter(i=>Ym(t,i,r));return n.length?n[n.length-1]:null});`,
    `C(this,"getTopLayerFrameAtSceneCoords",(t,o)=>{let r=this.scene.getNonDeletedElementsMap(),n=this.scene.getNonDeletedFramesLikes().filter(i=>!o?.has(i.id)&&Ym(t,i,r)),a=null,l=-1;for(let i of n){let s=anamnesisFrameAncestors(i,r).length;s>=l&&(a=i,l=s)}return a});C(this,"anamnesisCarriedFrameIds",t=>{let r=new Set(t.filter(n=>ie(n)).map(n=>n.id));for(let n of anamnesisFrameContents(this.scene.getNonDeletedElements(),[...r]))ie(n)&&r.add(n.id);return r});`,
  ],
  [
    `let u=p.find(b=>ie(b)),h=this.getTopLayerFrameAtSceneCoords(n),f=h&&!u?h:null;`,
    `let h=this.getTopLayerFrameAtSceneCoords(n,this.anamnesisCarriedFrameIds(p)),f=h||null;`,
  ],
  [
    `else{let x=this.getTopLayerFrameAtSceneCoords(b),T=this.scene.getSelectedElements(this.state),`,
    `else{let T=this.scene.getSelectedElements(this.state),x=this.getTopLayerFrameAtSceneCoords(b,this.anamnesisCarriedFrameIds(T)),`,
  ],
  [
    `n.frameId&&this.elementsPendingErasure.has(n.frameId)||`,
    `n.frameId&&anamnesisFrameAncestors(n,this.scene.getNonDeletedElementsMap()).some(i=>this.elementsPendingErasure.has(i.id))||`,
  ],
  [
    `locked:!1,...mo},l=r===kt.magicframe?ba(a):ri(a);`,
    `locked:!1,...mo};a.frameId=this.getTopLayerFrameAtSceneCoords({x:n,y:i})?.id??null;let l=r===kt.magicframe?ba(a):ri(a);`,
  ],
  [
    `ie(l))ko(d,l.id).forEach(p=>{delete m[p.id]});else if(l.frameId)m[l.frameId]&&delete m[l.id];else{`,
    `ie(l))d.filter(p=>anamnesisFrameAncestors(p,this.scene.getNonDeletedElementsMap()).some(u=>u.id===l.id)).forEach(p=>{delete m[p.id]});else if(l.frameId)anamnesisFrameAncestors(l,this.scene.getNonDeletedElementsMap()).some(p=>m[p.id])&&delete m[l.id];else{`,
  ],
]);

// ---- A sticky note and a video wear no link icon (Phase 32, steps 10 and 12) ----
//
// A note is an embed whose link, `anamnesis://note`, only says what it is
// (the library draws an embed with no link as nothing at all), and a video
// is the same with `anamnesis://video`. The library draws a link icon at
// the corner of every unselected linked element and opens the link when
// the icon is clicked; for these that icon would open an address that is
// not one. Both the drawing and the hit test skip their links, and nothing
// else about links changes. The addresses are the app's `BOARD_NOTE_LINK`
// and `BOARD_VIDEO_LINK`, repeated here because the library cannot import
// them.
const ICONLESS_LINKS = ['"anamnesis://note"', '"anamnesis://video"'];
const isIconless = (expr) => ICONLESS_LINKS.map((link) => `${expr}===${link}`).join("||");
const notIconless = (expr) => ICONLESS_LINKS.map((link) => `${expr}!==${link}`).join("&&");

edit("dist/dev/chunk-4FTI6OG3.js", [
  [
    `var renderLinkIcon = (element, context, appState, elementsMap) => {
  if (element.link && !appState.selectedElementIds[element.id]) {`,
    `var renderLinkIcon = (element, context, appState, elementsMap) => {
  if (element.link && ${notIconless("element.link")} && !appState.selectedElementIds[element.id]) {`,
  ],
  [
    `var isPointHittingLink = (element, elementsMap, appState, [x, y], isMobile) => {
  if (!element.link || appState.selectedElementIds[element.id]) {`,
    `var isPointHittingLink = (element, elementsMap, appState, [x, y], isMobile) => {
  if (!element.link || ${isIconless("element.link")} || appState.selectedElementIds[element.id]) {`,
  ],
]);

// The same, minified: sp = renderLinkIcon, BO = isPointHittingLink.
edit("dist/prod/chunk-K2UTITRG.js", [
  [`sp=(e,t,n,r)=>{if(e.link&&!n.selectedElementIds[e.id]){`, `sp=(e,t,n,r)=>{if(e.link&&${notIconless("e.link")}&&!n.selectedElementIds[e.id]){`],
  [`BO=(e,t,n,[r,o],i)=>!e.link||n.selectedElementIds[e.id]?!1:`, `BO=(e,t,n,[r,o],i)=>!e.link||${isIconless("e.link")}||n.selectedElementIds[e.id]?!1:`],
]);

// ---- Title Case, both builds ----
//
// Every control in the app is Title Case (CLAUDE.md § Labels), and the
// library's right-click menu and styles panel are controls she sees on
// every board. The English strings live in one locale chunk per build,
// keyed the same way in both, so each is replaced by its value: the value
// is what a reader would grep for, and it is present exactly once. Small
// words stay lowercase, as the rule says.
const retitled = [
  ["Paste as plaintext", "Paste as Plaintext"],
  ["Select all", "Select All"],
  ["Copy to clipboard as PNG", "Copy to Clipboard as PNG"],
  ["Copy to clipboard as SVG", "Copy to Clipboard as SVG"],
  ["Copy to clipboard as text", "Copy to Clipboard as Text"],
  ["Bring forward", "Bring Forward"],
  ["Send to back", "Send to Back"],
  ["Bring to front", "Bring to Front"],
  ["Send backward", "Send Backward"],
  ["Copy styles", "Copy Styles"],
  ["Paste styles", "Paste Styles"],
  ["Add to library", "Add to Library"],
  ["Group selection", "Group Selection"],
  ["Ungroup selection", "Ungroup Selection"],
  ["Flip horizontal", "Flip Horizontal"],
  ["Flip vertical", "Flip Vertical"],
  ["Wrap selection in frame", "Wrap Selection in Frame"],
  ["Copy link to object", "Copy Link to Object"],
  ["Edit link", "Edit Link"],
  ["Edit embeddable link", "Edit Embed Link"],
  ["Add link", "Add Link"],
  ["Edit line", "Edit Line"],
  ["Lock all", "Lock All"],
  ["Unlock all", "Unlock All"],
  ["Select all elements in frame", "Select All Elements in Frame"],
  ["Remove all elements from frame", "Remove All Elements from Frame"],
  ["Toggle grid", "Toggle Grid"],
  ["View mode", "View Mode"],
  ["Zen mode", "Zen Mode"],
  ["Snap to objects", "Snap to Objects"],
  ["Unbind text", "Unbind Text"],
  ["Bind text to the container", "Bind Text to the Container"],
  ["Wrap text in a container", "Wrap Text in a Container"],
  ["Font size", "Font Size"],
  ["Font family", "Font Family"],
  ["Text align", "Text Align"],
  ["Stroke width", "Stroke Width"],
  ["Stroke style", "Stroke Style"],
  ["Distribute horizontally", "Distribute Horizontally"],
  ["Distribute vertically", "Distribute Vertically"],
];

for (const file of ["dist/dev/chunk-LMHBUWQS.js", "dist/prod/chunk-6U3AYISY.js"]) {
  edit(
    file,
    retitled.map(([from, to]) => [`"${from}"`, `"${to}"`]),
  );
}

// ---- A moving GIF moves (Phase 32, step 9) ----
//
// The library draws a picture with `drawImage` from an `<img>`, and a
// canvas takes an animated picture's first frame only, so a GIF on a
// board stood still. The frames are decoded once per file with the
// engine's own `ImageDecoder` (Chromium has it; where it is missing the
// still is what shows, as before), and while a moving picture is on
// screen the static scene is drawn again on every frame change: a timer
// loop advances each GIF's frame from the clock — a `setTimeout` to the
// next frame change rather than `requestAnimationFrame`, which a window
// nobody is looking at never fires (CI's, 2026-09-20) — and the
// picture's cached element canvas is regenerated when its frame index
// has moved, since the cache is keyed on version and zoom, which a frame
// does not change. The loop ends by itself when a render draws no moving
// picture (scrolled away, deleted, the board closed) and starts again on
// the next render that does. Exports draw whichever frame is current.
//
// **A GIF is also kept as it came.** The library re-encodes every pasted
// or dropped picture but an SVG through the browser's own encoder to fit
// it in, and the browser cannot write a GIF, so a GIF came back as a PNG
// of its first frame before it ever reached the board — `resizeImageFile`
// now leaves a GIF alone, as it leaves an SVG. (A picture from the Assets
// tab never went through that; the app reads the file itself.)
const gifHelpers = (isInitializedImage) => [
  ["anamnesisGifs", "new Map()"],
  ["anamnesisGifsDrawn", "false"],
  ["anamnesisGifRedraw", "null"],
  ["anamnesisGifLast", "null"],
  ["anamnesisGifCanvas", "null"],
  ["anamnesisGifLoop", "0"],
  [
    "anamnesisDecodeGif",
    `async (gif, src) => {
  try {
    const bytes = await (await fetch(src)).arrayBuffer();
    const decoder = new ImageDecoder({ data: bytes, type: "image/gif" });
    await decoder.tracks.ready;
    const track = decoder.tracks.selectedTrack;
    const count = track ? track.frameCount : 0;
    const frames = [];
    for (let i = 0; i < count; i++) {
      const { image } = await decoder.decode({ frameIndex: i });
      let duration = (image.duration || 0) / 1000;
      if (duration < 20) duration = 100;
      frames.push({ bitmap: await createImageBitmap(image), duration });
      image.close();
    }
    decoder.close();
    if (frames.length > 1) {
      gif.frames = frames;
      gif.total = frames.reduce((sum, frame) => sum + frame.duration, 0);
      gif.at = performance.now();
      // Drawn again now the frames are here: the render that asked for
      // them drew the still, and nothing else may come for a while.
      if (anamnesisGifLast && anamnesisGifCanvas && anamnesisGifCanvas.isConnected) anamnesisGifLast();
    }
  } catch (error) {
    // Not decodable here: the still shows, as it did before.
  }
}`,
  ],
  [
    "anamnesisGifOf",
    `(fileId, cached) => {
  if (!cached || cached.mimeType !== "image/gif" || !cached.image || cached.image instanceof Promise || typeof ImageDecoder === "undefined") return null;
  let gif = anamnesisGifs.get(fileId);
  if (!gif) {
    gif = { frames: [], index: 0, at: 0, total: 0 };
    anamnesisGifs.set(fileId, gif);
    anamnesisDecodeGif(gif, cached.image.src);
  }
  return gif.frames.length > 1 ? gif : null;
}`,
  ],
  [
    "anamnesisGifKey",
    `(element, renderConfig) => {
  if (!renderConfig || !renderConfig.imageCache || !${isInitializedImage}(element)) return null;
  const gif = anamnesisGifOf(element.fileId, renderConfig.imageCache.get(element.fileId));
  if (!gif) return null;
  anamnesisGifsDrawn = true;
  return gif.index;
}`,
  ],
  [
    "anamnesisGifAdvance",
    `(gif, now) => {
  let elapsed = (now - gif.at) % gif.total;
  let index = 0;
  while (index < gif.frames.length - 1 && elapsed >= gif.frames[index].duration) {
    elapsed -= gif.frames[index].duration;
    index += 1;
  }
  gif.remaining = gif.frames[index].duration - elapsed;
  if (index === gif.index) return false;
  gif.index = index;
  return true;
}`,
  ],
  [
    "anamnesisGifTick",
    `() => {
  anamnesisGifLoop = 0;
  if (!anamnesisGifRedraw || !anamnesisGifCanvas || !anamnesisGifCanvas.isConnected) {
    anamnesisGifRedraw = null;
    return;
  }
  const now = performance.now();
  let changed = false;
  let wait = 1000;
  for (const gif of anamnesisGifs.values()) {
    if (gif.frames.length < 2) continue;
    if (anamnesisGifAdvance(gif, now)) changed = true;
    wait = Math.min(wait, gif.remaining);
  }
  if (changed) anamnesisGifRedraw();
  anamnesisGifLoop = setTimeout(anamnesisGifTick, Math.max(16, wait));
}`,
  ],
  [
    "anamnesisGifAfterRender",
    `(config, render) => {
  const drawn = anamnesisGifsDrawn;
  anamnesisGifsDrawn = false;
  if (config.renderConfig.isExporting || !config.canvas) return;
  anamnesisGifCanvas = config.canvas;
  anamnesisGifLast = () => render(config);
  if (drawn) {
    anamnesisGifRedraw = anamnesisGifLast;
    if (!anamnesisGifLoop) anamnesisGifLoop = setTimeout(anamnesisGifTick, 16);
  } else {
    anamnesisGifRedraw = null;
  }
}`,
  ],
];

edit("dist/dev/chunk-4FTI6OG3.js", [
  [
    `  if (file2.type === MIME_TYPES.svg) {
    return file2;
  }
  const [pica, imageBlobReduce]`,
    `  if (file2.type === MIME_TYPES.svg || file2.type === MIME_TYPES.gif) {
    return file2; // Anamnesis patch: a GIF is kept as it came, or it would lose its frames
  }
  const [pica, imageBlobReduce]`,
  ],
  [
    `var elementWithCanvasCache = /* @__PURE__ */ new WeakMap();`,
    `// Anamnesis patch: a moving GIF moves — see scripts/excalidraw-patch.mjs.\n` +
      gifHelpers("isInitializedImageElement")
        .map(([name, expr]) => `var ${name} = ${expr};`)
        .join("\n") +
      `\nvar anamnesisGifRender = (config) => renderStaticScene(config, true);\nvar elementWithCanvasCache = /* @__PURE__ */ new WeakMap();`,
  ],
  [
    `  isArrowElement(element) && boundTextElement && element.angle !== prevElementWithCanvas.angle) {`,
    `  prevElementWithCanvas.anamnesisGif !== anamnesisGifKey(element, renderConfig) || // Anamnesis patch: a GIF's frame moved
  isArrowElement(element) && boundTextElement && element.angle !== prevElementWithCanvas.angle) {`,
  ],
  [
    `    elementWithCanvasCache.set(element, elementWithCanvas);`,
    `    elementWithCanvas.anamnesisGif = anamnesisGifKey(element, renderConfig);
    elementWithCanvasCache.set(element, elementWithCanvas);`,
  ],
  [
    `      const img = isInitializedImageElement(element) ? renderConfig.imageCache.get(element.fileId)?.image : void 0;`,
    `      const anamnesisGif = isInitializedImageElement(element) ? anamnesisGifOf(element.fileId, renderConfig.imageCache.get(element.fileId)) : null;
      const img = anamnesisGif ? anamnesisGif.frames[anamnesisGif.index].bitmap : isInitializedImageElement(element) ? renderConfig.imageCache.get(element.fileId)?.image : void 0;`,
  ],
  [
    `          width: img.naturalWidth,
          height: img.naturalHeight`,
    `          width: img.naturalWidth ?? img.width,
          height: img.naturalHeight ?? img.height`,
  ],
  [
    `    _renderStaticScene(config);`,
    `    _renderStaticScene(config);
    anamnesisGifAfterRender(config, anamnesisGifRender);`,
  ],
  [
    `  _renderStaticScene(renderConfig);`,
    `  _renderStaticScene(renderConfig);
  anamnesisGifAfterRender(renderConfig, anamnesisGifRender);`,
  ],
]);

// The same, minified: At = isInitializedImageElement, F1 = generateElementWithCanvas
// (its `n` is renderConfig), Jo = elementWithCanvasCache, K1 = generateElementCanvas,
// dp = _renderStaticScene, x7 = renderStaticSceneThrottled, cp = renderStaticScene,
// _Y = resizeImageFile, H = MIME_TYPES.
edit("dist/prod/chunk-K2UTITRG.js", [
  [`_Y=async(e,t)=>{if(e.type===H.svg)return e;`, `_Y=async(e,t)=>{if(e.type===H.svg||e.type===H.gif)return e;`],
  [
    `F1=(e,t,n,r)=>{let o=n?r.zoom`,
    gifHelpers("At")
      .map(([name, expr]) => `${name}=${expr},`)
      .join("") + `anamnesisGifRender=e=>cp(e,!0),F1=(e,t,n,r)=>{let o=n?r.zoom`,
  ],
  [
    `||ee(e)&&s&&e.angle!==i.angle){let U=K1(e,t,o,n,r);return U?(Jo.set(e,U),U):null}return i}`,
    `||i.anamnesisGif!==anamnesisGifKey(e,n)||ee(e)&&s&&e.angle!==i.angle){let U=K1(e,t,o,n,r);return U?(U.anamnesisGif=anamnesisGifKey(e,n),Jo.set(e,U),U):null}return i}`,
  ],
  [
    `case"image":{let i=At(e)?r.imageCache.get(e.fileId)?.image:void 0;`,
    `case"image":{let anamnesisGif=At(e)?anamnesisGifOf(e.fileId,r.imageCache.get(e.fileId)):null,i=anamnesisGif?anamnesisGif.frames[anamnesisGif.index].bitmap:At(e)?r.imageCache.get(e.fileId)?.image:void 0;`,
  ],
  [`width:i.naturalWidth,height:i.naturalHeight}`, `width:i.naturalWidth??i.width,height:i.naturalHeight??i.height}`],
  [
    `x7=pd(e=>{dp(e)},{trailing:!0}),cp=(e,t)=>{if(t){x7(e);return}dp(e)}`,
    `x7=pd(e=>{dp(e),anamnesisGifAfterRender(e,anamnesisGifRender)},{trailing:!0}),cp=(e,t)=>{if(t){x7(e);return}dp(e),anamnesisGifAfterRender(e,anamnesisGifRender)}`,
  ],
]);
