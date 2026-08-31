import type { OrbParams } from "./orb-params";
import {
  orbStyleOrder,
  orbStyles,
  type OrbStyleId,
} from "./orb-style-presets";

export type {
  OrbBloomConfig,
  OrbInterior,
  OrbMaterialConfig,
  OrbMotionSignature,
  OrbShellConfig,
  OrbStudioConfig,
  OrbStyle,
  OrbStyleId,
  OrbSurfaceKind,
} from "./orb-style-presets";
export {
  isOrbStyleOpaque,
  orbOpaqueStyleIds,
  orbStyleOrder,
  orbStyles,
} from "./orb-style-presets";

export type OrbStateId = "idle" | "think" | "search" | "speak";

/**
 * A state is the same gesture in every style: how agitated the surface is.
 * Colour deliberately belongs to the style, or every style would look alike
 * the moment a state was applied.
 */
/**
 * The shape language of a state, not its amount. Each state departs into its
 * own form and returns; the weights are damped, so switching states morphs
 * between forms instead of cutting.
 */
export type OrbStateForm = {
  /** Damps the fine ripple so a calm state reads as calm, not merely slow. */
  calm: number;
  /** Multiplies core displacement, so a state can churn inside a still shell. */
  coreAgitation: number;
  /** Beat envelope on the whole displacement: bursts rather than an even buzz. */
  pulse: number;
  /** A travelling ridge that circles the orb, reading as a scan. */
  sweep: number;
  /** Rotates the noise domain instead of drifting it. */
  swirl: number;
};

export type OrbStateDelta = {
  chromaticAberrationAdd: number;
  distortionAdd: number;
  flowSpeedScale: number;
  glowIntensityScale: number;
  glowSpreadScale: number;
  form: OrbStateForm;
  iorAdd: number;
  label: string;
  roughnessScale: number;
};

export const orbStateOrder: readonly OrbStateId[] = [
  "idle",
  "think",
  "search",
  "speak",
];

export const orbStateDeltas: Record<OrbStateId, OrbStateDelta> = {
  idle: {
    chromaticAberrationAdd: 0,
    distortionAdd: 0,
    form: { calm: 1, coreAgitation: 1, pulse: 0, sweep: 0, swirl: 0.15 },
    flowSpeedScale: 1,
    glowIntensityScale: 1,
    glowSpreadScale: 1,
    iorAdd: 0,
    label: "Idle",
    roughnessScale: 1,
  },
  think: {
    chromaticAberrationAdd: 0.08,
    distortionAdd: 0.1,
    form: { calm: 0.55, coreAgitation: 2.2, pulse: 0.15, sweep: 0, swirl: 0.9 },
    flowSpeedScale: 1.7,
    glowIntensityScale: 1.15,
    glowSpreadScale: 0.92,
    iorAdd: 0.14,
    label: "Think",
    roughnessScale: 0.85,
  },
  search: {
    chromaticAberrationAdd: 0.25,
    distortionAdd: 0.02,
    form: { calm: 0.7, coreAgitation: 0.8, pulse: 0, sweep: 1, swirl: 0.35 },
    flowSpeedScale: 3.2,
    glowIntensityScale: 1.35,
    glowSpreadScale: 0.78,
    iorAdd: 0.42,
    label: "Search",
    roughnessScale: 0.4,
  },
  speak: {
    chromaticAberrationAdd: 0.05,
    distortionAdd: 0.28,
    form: { calm: 0.3, coreAgitation: 1.4, pulse: 1, sweep: 0, swirl: 0.25 },
    flowSpeedScale: 2.2,
    glowIntensityScale: 1.9,
    glowSpreadScale: 0.72,
    iorAdd: -0.08,
    label: "Speak",
    roughnessScale: 1.1,
  },
};

/** Slider domains, so a delta can never push a value off its control. */
export const orbParamRanges = {
  chromaticAberration: [0, 1],
  distortion: [0, 1],
  flowSpeed: [0, 3],
  glowIntensity: [0, 2],
  glowSpread: [1, 6],
  ior: [1, 3],
  roughness: [0, 1],
} as const satisfies Record<string, readonly [number, number]>;

function clamp(value: number, [min, max]: readonly [number, number]): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Number(value.toFixed(3));
}

export function resolveOrbPreset(
  styleId: OrbStyleId,
  stateId: OrbStateId,
): OrbParams {
  const style = orbStyles[styleId];
  const delta = orbStateDeltas[stateId];
  const { base } = style;

  return {
    chromaticAberration: round(
      clamp(
        base.chromaticAberration + delta.chromaticAberrationAdd,
        orbParamRanges.chromaticAberration,
      ),
    ),
    coreColor: base.coreColor,
    distortion: round(
      clamp(base.distortion + delta.distortionAdd, orbParamRanges.distortion),
    ),
    flowSpeed: round(
      clamp(base.flowSpeed * delta.flowSpeedScale, orbParamRanges.flowSpeed),
    ),
    glowIntensity: round(
      clamp(
        base.glowIntensity * delta.glowIntensityScale,
        orbParamRanges.glowIntensity,
      ),
    ),
    glowSpread: round(
      clamp(base.glowSpread * delta.glowSpreadScale, orbParamRanges.glowSpread),
    ),
    ior: round(clamp(base.ior + delta.iorAdd, orbParamRanges.ior)),
    primaryColor: base.primaryColor,
    roughness: round(
      clamp(base.roughness * delta.roughnessScale, orbParamRanges.roughness),
    ),
  };
}

/** Colour belongs to the style and to the user; a state never rewrites it. */
export const orbColourParamKeys = ["coreColor", "primaryColor"] as const;

export type OrbPresetSelection = { state: OrbStateId; style: OrbStyleId };
export type OrbPresetWrite = { key: keyof OrbParams; value: number | string };

/**
 * Which controls a preset change is allowed to write.
 *
 * Picking a style brings its palette, because a palette is part of what a
 * style is. Picking a state writes behaviour only and never colour, because
 * colour is the user's: hand-picking red and switching state must leave the
 * orb red.
 */
export function getOrbPresetWrites(
  previous: OrbPresetSelection | null,
  next: OrbPresetSelection,
): OrbPresetWrite[] {
  if (!previous) {
    return [];
  }

  const styleChanged = previous.style !== next.style;
  const stateChanged = previous.state !== next.state;

  if (!styleChanged && !stateChanged) {
    return [];
  }

  const resolved = resolveOrbPreset(next.style, next.state);
  const colourKeys = new Set<string>(orbColourParamKeys);

  return (Object.keys(resolved) as (keyof OrbParams)[])
    .filter((key) => styleChanged || !colourKeys.has(key))
    .map((key) => ({ key, value: resolved[key] }));
}

export function readOrbStyleId(value: unknown): OrbStyleId {
  return orbStyleOrder.includes(value as OrbStyleId)
    ? (value as OrbStyleId)
    : "glass";
}

export function readOrbStateId(value: unknown): OrbStateId {
  return orbStateOrder.includes(value as OrbStateId)
    ? (value as OrbStateId)
    : "idle";
}
