// The cover a project wears when it hasn't been given one (Phase 27).
//
// Pure maths, no React and no disk: a project's key in, two colours and an
// angle out. The CSS that paints them lives with the screen.

/**
 * How far apart the two hues have to be.
 *
 * **One hue with a lighter version of itself over it was tried and rejected in
 * the strongest terms available**, so this is the rule that stops the generator
 * quietly drifting back to it. Forty degrees is roughly the point where two
 * hues read as two colours rather than one colour and a shadow.
 */
const MIN_HUE_GAP = 40;
const MAX_HUE_GAP = 150;

/**
 * Saturation and lightness for the pair. Deliberately vibrant — that is the
 * point of these and it is not up for softening; the setting that tones them
 * down is a switch the reader chooses, not a compromise baked in here.
 *
 * The two ends differ in lightness as well as hue so the gradient has
 * somewhere to travel, and the darker end sits under the caption, where the
 * scrim and the project's name go.
 */
const FROM = { saturation: 72, lightness: 52 };
const TO = { saturation: 68, lightness: 28 };

/** Diagonal, never straight up or across — the plan asks for travel. */
const MIN_ANGLE = 110;
const MAX_ANGLE = 160;

export type ProjectCover = {
  from: string;
  to: string;
  /** CSS degrees, for `linear-gradient`. */
  angle: number;
};

/**
 * A stable number from a string. FNV-1a — small, dependency-free, and spreads
 * near-identical inputs apart, which matters because her project names are
 * things like `Valeraverse` and `Valeraverse3` and two forks sitting side by
 * side in the same colour would look like one project listed twice.
 */
function hash(key: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    value ^= key.charCodeAt(i);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value;
}

/**
 * The cover for a project, keyed so it is the same every time.
 *
 * **Keyed on the id where there is one**, so a project keeps its colours
 * through a rename or a move — the whole reason ids exist. A project that has
 * never been opened has no id yet and falls back to its path, which means its
 * colours can change once, on the day it is first opened and gains an id. That
 * is the right way round: the alternative is keying everything on the path and
 * having every project change colour the day the projects folder moves.
 */
export function coverFor(project: { id: string | null; path: string }): ProjectCover {
  const seed = hash(project.id ?? project.path);
  const fromHue = seed % 360;
  // A second draw from the same seed, so the gap doesn't track the hue.
  const gap = MIN_HUE_GAP + (Math.floor(seed / 360) % (MAX_HUE_GAP - MIN_HUE_GAP + 1));
  const toHue = (fromHue + gap) % 360;
  const angle = MIN_ANGLE + (Math.floor(seed / 7) % (MAX_ANGLE - MIN_ANGLE + 1));

  return {
    from: `hsl(${fromHue} ${FROM.saturation}% ${FROM.lightness}%)`,
    to: `hsl(${toHue} ${TO.saturation}% ${TO.lightness}%)`,
    angle,
  };
}

export function coverGradient(cover: ProjectCover): string {
  return `linear-gradient(${cover.angle}deg, ${cover.from}, ${cover.to})`;
}
