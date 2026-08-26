// Four questions asked of whatever is on screen, in the real window.
//
// **These are the app's actual bug history, turned into checks.** Not a generic
// accessibility sweep — every rule here is something that has gone wrong in this
// app and been reported by eye:
//
//   - text cut off with no way to read the rest (`docs/handoff.md`, and the
//     spectrum meter fixes of 2026-08-25)
//   - things sitting off the edge of their panel
//   - a control with something else on top of it
//   - a control too small to hit
//
// **A rule may only be added here once it has caught something real**, and it
// arrives as a count rather than a failure — see `e2e/layout-rules.e2e.ts` for
// why, and for the counts as they stand.
//
// **Everything runs inside the page, in one pass.** The alternative is asking
// Playwright about elements one at a time across a process boundary, which for
// a few thousand nodes is minutes rather than milliseconds — slow enough that
// nobody would sweep more than one screen.
import type { Page } from "playwright-core";

export type LayoutRule =
  | "dead-end-truncation"
  | "off-the-edge"
  | "sideways-scroll"
  | "covered-control"
  | "tiny-target";

export type LayoutFinding = {
  rule: LayoutRule;
  /** Roughly where it is: tag plus its first couple of classes. */
  where: string;
  /** What it says, shortened — usually enough to find it by eye. */
  text: string;
  /** The measurement that made it a finding. */
  detail: string;
};

/**
 * The smallest a control may be, in CSS pixels.
 *
 * WCAG 2.2's Target Size (Minimum) figure. Chosen rather than invented because
 * an invented number is one somebody argues with; this one has a standard behind
 * it and the same exemption for links sitting inside a sentence.
 */
const MIN_TARGET_PX = 24;

/** Everything a person can click, press, drag or focus. */
const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "[role=button]",
  "[role=link]",
  "[role=menuitem]",
  "[role=tab]",
  "[role=checkbox]",
  "[role=slider]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** Sweeps whatever is currently on screen and says what is wrong with it. */
export async function findLayoutProblems(window: Page): Promise<LayoutFinding[]> {
  return window.evaluate(
    ({ minTarget, interactiveSelector }) => {
      const findings: LayoutFinding[] = [];
      const alreadySaid = new Set<string>();

      function describe(element: Element): string {
        const raw = element.getAttribute("class") ?? "";
        const classes = raw.trim() ? "." + raw.trim().split(/\s+/).slice(0, 2).join(".") : "";
        return element.tagName.toLowerCase() + classes;
      }

      function textOf(element: Element): string {
        return (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 70);
      }

      function isVisible(element: Element): boolean {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return false;
        // Hover-revealed controls sit at zero opacity until the mouse arrives —
        // the tree's row buttons are laid out that way on purpose. Nobody can
        // see them, so nothing here has an opinion about them.
        if (Number(style.opacity) === 0) return false;
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      }

      function record(rule: string, element: Element, detail: string): void {
        const key = `${rule}|${describe(element)}|${textOf(element)}`;
        // The same row repeated three hundred times down a tree is one finding.
        // Without this, one bad rule buries every other rule's output.
        if (alreadySaid.has(key)) return;
        alreadySaid.add(key);
        findings.push({ rule, where: describe(element), text: textOf(element), detail } as LayoutFinding);
      }

      /** Whether this element holds text of its own, rather than only children. */
      function holdsItsOwnText(element: Element): boolean {
        for (const node of element.childNodes) {
          if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim()) return true;
        }
        return false;
      }

      /**
       * Whether the full text is available some other way — a tooltip on the
       * element or on something wrapping it.
       *
       * **Truncation is only a bug when it is a dead end.** A name cut short in
       * a narrow sidebar with its full text on hover is a deliberate and
       * reasonable design; the same name with nothing behind it is the thing
       * that reads as broken.
       */
      function revealsTheRest(element: Element): boolean {
        let current: Element | null = element;
        for (let step = 0; current && step < 3; step++) {
          const title = current.getAttribute("title");
          const label = current.getAttribute("aria-label");
          if ((title && title.trim()) || (label && label.trim())) return true;
          current = current.parentElement;
        }
        return false;
      }

      /** Whether anything above this element clips or scrolls, rather than it sticking out. */
      function anAncestorClips(element: Element): boolean {
        let current = element.parentElement;
        while (current && current !== document.documentElement) {
          const style = getComputedStyle(current);
          const clips = `${style.overflowX} ${style.overflowY}`;
          if (/hidden|auto|scroll|clip/.test(clips)) return true;
          current = current.parentElement;
        }
        return false;
      }

      // ------------------------------------------------ text and its edges
      for (const element of document.body.querySelectorAll("*")) {
        if (!isVisible(element)) continue;
        const style = getComputedStyle(element);

        // A field's content scrolls and the caret reaches all of it, so a full
        // input is not a dead end the way a clipped label is.
        const isField = /^(input|textarea|select)$/.test(element.tagName.toLowerCase());

        if (!isField && holdsItsOwnText(element)) {
          const ellipsised =
            element.scrollWidth > element.clientWidth + 1 &&
            (style.textOverflow === "ellipsis" || style.overflowX === "hidden");
          const clampLines = style.webkitLineClamp;
          const clamped =
            !!clampLines &&
            clampLines !== "none" &&
            element.scrollHeight > element.clientHeight + 1;

          if ((ellipsised || clamped) && !revealsTheRest(element)) {
            record(
              "dead-end-truncation",
              element,
              clamped ? `clamped to ${clampLines} lines` : "ellipsised",
            );
          }
        }

        const box = element.getBoundingClientRect();
        const stickingOut = box.right > innerWidth + 1 || box.left < -1;
        if (stickingOut && !anAncestorClips(element)) {
          record(
            "off-the-edge",
            element,
            `spans ${Math.round(box.left)}…${Math.round(box.right)} in a ${innerWidth}px window`,
          );
        }
      }

      // -------------------------------------------------------- the controls
      for (const element of document.querySelectorAll(interactiveSelector)) {
        if (!isVisible(element)) continue;
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();

        // **Only controls that are an icon and nothing else.**
        //
        // The first version of this rule asked the question of everything and
        // was useless for it: a breadcrumb link is 133×18 and a block's title
        // button is 228×17, and both were reported as too small to hit, which
        // is nonsense — they are the width of their own words and easy to press.
        // Twenty findings a screen, nineteen of them noise, is how a check
        // teaches people to ignore it.
        //
        // A control carrying no words is the real case: there is nothing making
        // it any bigger than whatever the icon was set to, and the tree's row
        // buttons at 14×14 are the ones that are actually fiddly. WCAG's own
        // exemption says the same thing from the other end — a target sized by
        // text in a sentence is excused.
        //
        // Text inside an `svg` does not count as words: an icon set may put a
        // `<title>` in there for screen readers, and it is not a label anybody
        // can aim at.
        const withoutIcons = element.cloneNode(true) as Element;
        for (const icon of withoutIcons.querySelectorAll("svg")) icon.remove();
        const carriesWords = (withoutIcons.textContent ?? "").trim().length > 0;

        // A drag handle is thin because that is what a drag handle is, and the
        // cursor is what tells you it is there. Marked by role rather than by
        // class name, so this keeps working when the class changes.
        const isDragHandle =
          element.getAttribute("role") === "separator" || /resize$/.test(style.cursor);

        // Half a pixel of slack, because a box laid out to exactly 24 measures
        // as 23.99 often enough to matter — the meter's name field was reported
        // as "24×24, wants 24×24", which is the sort of nonsense that gets a
        // whole rule switched off.
        const tooSmall = box.width < minTarget - 0.5 || box.height < minTarget - 0.5;
        if (!carriesWords && !isDragHandle && tooSmall) {
          record(
            "tiny-target",
            element,
            `${Math.round(box.width)}×${Math.round(box.height)}, wants ${minTarget}×${minTarget}`,
          );
        }

        // Something on top of it. Asked at the middle, because that is where
        // anyone aiming at it would click.
        const x = Math.round(box.left + box.width / 2);
        const y = Math.round(box.top + box.height / 2);
        // Off-screen is the previous rule's business, not this one's.
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
        if (style.pointerEvents === "none") continue;

        // **Scrolled out of its own strip is not the same as covered.** A tab
        // strip with `overflow-x: auto` lays its children out past its own edge
        // on purpose: they are reached by scrolling to them, and what is
        // painted where they currently sit is whatever the strip is standing in
        // front of. Counting those as covered controls makes the rule fire on a
        // strip that works perfectly — which is precisely how a check stops
        // being read, and the reason this file starts with that warning.
        //
        // Measured on the page tab strip at 900px (2026-08-26): 352px of tabs
        // in a 252px strip, with the add-tab button 52px past the centre
        // column and its middle landing on the properties panel. Scrolling the
        // strip 100px brings it inside the column, and the click lands.
        //
        // Only an ancestor that genuinely has somewhere to scroll counts. An
        // `overflow: hidden` ancestor clips without offering a way to reach
        // what it clipped, and that is not something to wave through.
        let reachableByScrolling = false;
        for (let parent = element.parentElement; parent; parent = parent.parentElement) {
          const parentStyle = getComputedStyle(parent);
          const canScrollX =
            /auto|scroll/.test(parentStyle.overflowX) && parent.scrollWidth > parent.clientWidth;
          const canScrollY =
            /auto|scroll/.test(parentStyle.overflowY) && parent.scrollHeight > parent.clientHeight;
          if (!canScrollX && !canScrollY) continue;
          const edge = parent.getBoundingClientRect();
          if (x < edge.left || x > edge.right || y < edge.top || y > edge.bottom) {
            reachableByScrolling = true;
            break;
          }
        }
        if (reachableByScrolling) continue;

        const whatIsThere = document.elementFromPoint(x, y);
        if (!whatIsThere) continue;
        // A hit on a child is the control; a hit on a wrapper is still the
        // control, since the press reaches it either way.
        const reachesIt =
          whatIsThere === element ||
          element.contains(whatIsThere) ||
          whatIsThere.contains(element);
        if (!reachesIt) {
          record("covered-control", element, `its middle belongs to ${describe(whatIsThere)}`);
        }
      }

      // **Its own rule, not a variety of `off-the-edge`.** The two look alike
      // and are not: one element can hang past the window without the page
      // gaining a scrollbar, and a page can scroll sideways because of margins
      // and widths with no single element to blame. Kept apart so each keeps
      // its own count, and because "the whole page slides" is the one a person
      // notices first.
      //
      // One finding about the page rather than one per element — whatever is
      // sticking out is already reported above.
      const page = document.documentElement;
      if (page.scrollWidth > page.clientWidth + 1) {
        findings.push({
          rule: "sideways-scroll",
          where: "the page itself",
          text: "",
          detail: `scrolls sideways: ${page.scrollWidth}px of content in ${page.clientWidth}px`,
        } as LayoutFinding);
      }

      return findings;
    },
    { minTarget: MIN_TARGET_PX, interactiveSelector: INTERACTIVE_SELECTOR },
  );
}

/** Counts per rule, for comparing against what a screen is allowed to have. */
export function countByRule(findings: LayoutFinding[]): Record<LayoutRule, number> {
  const counts = {
    "dead-end-truncation": 0,
    "off-the-edge": 0,
    "sideways-scroll": 0,
    "covered-control": 0,
    "tiny-target": 0,
  } satisfies Record<LayoutRule, number>;
  for (const finding of findings) counts[finding.rule] += 1;
  return counts;
}

/**
 * The findings as something worth reading in a terminal.
 *
 * **Written for the person who has to go and look**, which is the whole point of
 * a findings list: a count tells you a rule is failing, and this tells you where
 * to stand.
 */
export function describeFindings(findings: LayoutFinding[]): string {
  if (findings.length === 0) return "  nothing";
  const byRule = new Map<string, LayoutFinding[]>();
  for (const finding of findings) {
    const list = byRule.get(finding.rule) ?? [];
    list.push(finding);
    byRule.set(finding.rule, list);
  }
  const lines: string[] = [];
  for (const [rule, list] of byRule) {
    lines.push(`  ${rule} — ${list.length}`);
    for (const finding of list.slice(0, 8)) {
      const said = finding.text ? ` "${finding.text}"` : "";
      lines.push(`    ${finding.where}${said} — ${finding.detail}`);
    }
    if (list.length > 8) lines.push(`    …and ${list.length - 8} more`);
  }
  return lines.join("\n");
}
