// A meter in the sidebar: one number, drawn six ways. Phase 18c.
//
// One block with a switchable shape rather than six block kinds, the same way
// a collection carries a source — a bar that should have been a gauge is a
// setting rather than a delete and a rebuild, and every shape keeps the number
// that was already typed into it.
//
// The arithmetic and the arc geometry are in meter-service, which is where
// they can be tested; everything here is presentation and clicks.
import { Fragment, useState } from "react";
import { Circle, Coins, Donut, Gauge, RectangleHorizontal, Star } from "lucide-react";
import type { Block, MeterStyle } from "../../constants/schema";
import {
  ARC_GEOMETRY,
  arcPath,
  isPipMeter,
  meterFraction,
  meterMax,
  meterReadout,
  meterStyleOf,
  meterValue,
  pipClickValue,
} from "../../services/meter-service";
import { NumberProperty } from "../properties/NumberProperty";
import { TreePopover } from "../tree/TreePopover";

// Grouped by what the number *means*, because that is the choice underneath
// the six pictures: the first four measure a proportion and the last two count
// whole things. Someone picking between a gauge and a token pool is picking
// between those two ideas, not between two drawings.
const STYLES: { key: MeterStyle; label: string; hint: string; icon: typeof Circle }[] = [
  { key: "bar", label: "Progress bar", hint: "A filled track", icon: RectangleHorizontal },
  { key: "circle", label: "Circle", hint: "A full ring", icon: Circle },
  { key: "semicircle", label: "Semi-circle", hint: "An arc over the top", icon: Donut },
  { key: "gauge", label: "Gauge", hint: "A dial with a gap at the bottom", icon: Gauge },
  { key: "rating", label: "Rating", hint: "Stars you set a level with", icon: Star },
  { key: "pool", label: "Token pool", hint: "Tokens you spend one at a time", icon: Coins },
];

/** Where the readout sits inside each round shape. */
const READOUT_Y: Record<"circle" | "semicircle" | "gauge", number> = { circle: 50, semicircle: 44, gauge: 58 };

/** How much of the 100-wide box each round shape actually draws in. */
const VIEW_HEIGHT: Record<"circle" | "semicircle" | "gauge", number> = { circle: 100, semicircle: 58, gauge: 90 };

type MeterBlockProps = {
  block: Block;
  onSetStyle: (style: MeterStyle) => void;
  onSetValue: (value: number | undefined) => void;
  onSetMax: (max: number | undefined) => void;
};

export function MeterBlock({ block, onSetStyle, onSetValue, onSetMax }: MeterBlockProps) {
  const [styleRect, setStyleRect] = useState<DOMRect | null>(null);

  const style = meterStyleOf(block);
  const max = meterMax(block);
  const value = meterValue(block);
  const pips = isPipMeter(style);

  return (
    <div className="block-meter">
      <button
        type="button"
        className="block-collection-source block-meter-style"
        onClick={(e) => setStyleRect(e.currentTarget.getBoundingClientRect())}
      >
        {STYLES.find((option) => option.key === style)?.label ?? "Progress bar"}
      </button>

      {style === "bar" && (
        <div className="block-meter-bar">
          <div className="block-meter-track">
            <div className="block-meter-fill" style={{ width: `${meterFraction(block) * 100}%` }} />
          </div>
          <span className="block-meter-readout">{meterReadout(block)}</span>
        </div>
      )}

      {(style === "circle" || style === "semicircle" || style === "gauge") && (
        <svg className="block-meter-arc" viewBox={`0 0 100 ${VIEW_HEIGHT[style]}`} role="img" aria-label={meterReadout(block)}>
          {/* The empty part of the shape is drawn as a full sweep underneath
              rather than as a separate outline, so the two always agree about
              where the ends are. */}
          <path className="block-meter-arc-track" d={arcPath(1, ARC_GEOMETRY[style].start, ARC_GEOMETRY[style].sweep)} />
          <path
            className="block-meter-arc-fill"
            d={arcPath(meterFraction(block), ARC_GEOMETRY[style].start, ARC_GEOMETRY[style].sweep)}
          />
          <text className="block-meter-arc-readout" x="50" y={READOUT_Y[style]} textAnchor="middle" dominantBaseline="middle">
            {meterReadout(block)}
          </text>
        </svg>
      )}

      {pips && (
        <div className="block-meter-pips">
          {Array.from({ length: max }, (_, index) => {
            const filled = index < value;
            const Pip = style === "rating" ? Star : Circle;
            return (
              <button
                key={index}
                type="button"
                className={`block-meter-pip${filled ? " block-meter-pip-filled" : ""}`}
                aria-label={`${index + 1} of ${max}`}
                aria-pressed={filled}
                onClick={() => onSetValue(pipClickValue(style, value, index) || undefined)}
              >
                <Pip size={15} fill={filled ? "currentColor" : "none"} />
              </button>
            );
          })}
        </div>
      )}

      {/* Typed rather than clamped on the way in — see setBlockValue. The
          inputs show what is stored, not what is drawn, so a rating whose pip
          count was lowered still says what it will go back to. */}
      <div className="block-meter-numbers">
        <NumberProperty label="" value={block.value} placeholder="0" onChange={onSetValue} />
        <span className="block-meter-of">of</span>
        <NumberProperty label="" value={block.max} placeholder={String(max)} onChange={onSetMax} />
      </div>

      {styleRect && (
        <TreePopover anchorRect={styleRect} onClose={() => setStyleRect(null)}>
          <div className="tree-context-menu block-source-menu">
            <div className="tree-context-menu-heading">Measures a proportion</div>
            {STYLES.map((option) => (
              <Fragment key={option.key}>
                {option.key === "rating" && <div className="tree-context-menu-heading">Counts whole units</div>}
                <button
                  type="button"
                  onClick={() => {
                    onSetStyle(option.key);
                    setStyleRect(null);
                  }}
                >
                  <option.icon size={13} />
                  <span className="block-source-label">
                    {option.label}
                    <small>{option.hint}</small>
                  </span>
                </button>
              </Fragment>
            ))}
          </div>
        </TreePopover>
      )}
    </div>
  );
}
