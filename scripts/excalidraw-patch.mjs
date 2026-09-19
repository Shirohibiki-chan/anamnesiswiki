// The source of `patches/@excalidraw__excalidraw@0.18.1.patch`. Phase 32.
//
// **Why a patch at all**: selecting on a board has to work the way her
// hands expect from Canva and from LegendKeeper's boards, and two of the
// library's rules do not: a selection box takes only what it swallows
// whole, and a click inside an unfilled shape picks up nothing. The library
// has no switch for either, so both are written into its two builds.
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
// minified names in the prod half (`ei`, `ui`, `Wt`, `Ea`, `zE`, `Ne`, `C`) are
// the ones 0.18.1 happened to give those functions; a new version will
// have new ones, found by grepping for the readable strings around them.
// `e2e/a-board-selection.e2e.ts` is the other guard: it fails against
// an unpatched library.
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("usage: node scripts/excalidraw-patch.mjs <patch dir>");

function edit(file, replacements) {
  const full = path.join(dir, file);
  let text = fs.readFileSync(full, "utf8");
  for (const [from, to] of replacements) {
    const count = text.split(from).length - 1;
    if (count !== 1) throw new Error(`${file}: expected 1 match, found ${count} for: ${from.slice(0, 80)}`);
    text = text.replace(from, to);
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
