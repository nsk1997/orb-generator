import { converter, formatHex, toGamut } from "culori";

import type { OrbParams } from "./orb-params";

export type OrbStyleId = "glass" | "bubble" | "frost" | "metal" | "plasma";
export type OrbStateId = "idle" | "think" | "search" | "speak";

/**
 * Everything a style owns that has no slider. These reach the material and the
 * studio directly, which is why the style has to be a stored value rather than
 * a one-shot preset.
 */
export type OrbMaterialConfig = {
  attenuationDistance: number;
  backsideThickness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  envMapIntensity: number;
  iridescence: number;
  iridescenceIOR: number;
  iridescenceThicknessRange: [number, number];
  metalness: number;
  samples: number;
  thickness: number;
  /** 0 skips Drei's backside and buffer passes entirely. */
  transmission: number;
};

export type OrbStudioConfig = {
  cardIntensityScale: number;
  domeBottom: string;
  domeHorizon: string;
  domeTop: string;
};

/**
 * Bloom is per style rather than a tenth slider: a mirror should barely bleed
 * and a plasma should bleed a lot, and the existing Glow control already
 * scales it so the user still has reach.
 */
export type OrbBloomConfig = {
  intensity: number;
  radius: number;
  threshold: number;
};

export type OrbStyle = {
  /** Resting parameter set. States are deltas on top of this. */
  base: OrbParams;
  bloom: OrbBloomConfig;
  coreIntensityScale: number;
  coreScale: number;
  haloSize: number;
  id: OrbStyleId;
  label: string;
  material: OrbMaterialConfig;
  studio: OrbStudioConfig;
  /** How far the transmitted tint is lifted toward white before it is used. */
  tintLift: number;
};

export const orbStyleOrder: readonly OrbStyleId[] = [
  "glass",
  "bubble",
  "frost",
  "metal",
  "plasma",
];

export const orbStyles: Record<OrbStyleId, OrbStyle> = {
  glass: {
    base: {
      chromaticAberration: 0.32,
      coreColor: "#22D3EE",
      distortion: 0.3,
      flowSpeed: 0.55,
      glowIntensity: 0.8,
      glowSpread: 2.8,
      ior: 1.42,
      primaryColor: "#7C5CFF",
      roughness: 0.06,
    },
    bloom: { intensity: 0.26, radius: 0.6, threshold: 0.88 },
    coreIntensityScale: 1,
    coreScale: 0.42,
    haloSize: 4.2,
    id: "glass",
    label: "Glass",
    material: {
      attenuationDistance: 2.6,
      backsideThickness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 2,
      iridescence: 0.22,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: [120, 560],
      metalness: 0,
      samples: 10,
      thickness: 0.62,
      transmission: 1,
    },
    studio: {
      cardIntensityScale: 1,
      domeBottom: "#282A4A",
      domeHorizon: "#3C3F6B",
      domeTop: "#9AA1E0",
    },
    tintLift: 0.55,
  },
  bubble: {
    base: {
      chromaticAberration: 0.5,
      coreColor: "#FFD6F5",
      distortion: 0.18,
      flowSpeed: 0.4,
      glowIntensity: 0.9,
      glowSpread: 3.4,
      ior: 1.2,
      primaryColor: "#A7F3FF",
      roughness: 0.02,
    },
    bloom: { intensity: 0.34, radius: 0.68, threshold: 0.84 },
    coreIntensityScale: 0.9,
    coreScale: 0.3,
    haloSize: 4.6,
    id: "bubble",
    label: "Bubble",
    material: {
      // A thin film with almost no volume: colour comes from interference,
      // not from absorption through thickness.
      attenuationDistance: 6,
      backsideThickness: 0.06,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.6,
      iridescence: 1,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [200, 820],
      metalness: 0,
      samples: 10,
      thickness: 0.18,
      transmission: 1,
    },
    studio: {
      cardIntensityScale: 1.25,
      domeBottom: "#31344F",
      domeHorizon: "#4A4E77",
      domeTop: "#B9BFEE",
    },
    tintLift: 0.8,
  },
  frost: {
    base: {
      chromaticAberration: 0.1,
      coreColor: "#CFF3FF",
      distortion: 0.35,
      flowSpeed: 0.3,
      glowIntensity: 0.55,
      glowSpread: 3.6,
      ior: 1.31,
      primaryColor: "#BFE6FF",
      roughness: 0.38,
    },
    bloom: { intensity: 0.18, radius: 0.55, threshold: 0.9 },
    coreIntensityScale: 1.15,
    coreScale: 0.5,
    haloSize: 4,
    id: "frost",
    label: "Frost",
    material: {
      // Milky, but not opaque: enough light has to survive the crossing for
      // the orb to have an inside at all.
      attenuationDistance: 2.2,
      backsideThickness: 0.6,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.9,
      iridescence: 0.12,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 400],
      metalness: 0,
      // Rough transmission scatters samples wider, so it needs MORE of
      // them, not fewer. Six read as speckle rather than as frost.
      samples: 16,
      thickness: 1.0,
      transmission: 1,
    },
    studio: {
      cardIntensityScale: 1.1,
      domeBottom: "#2B3450",
      domeHorizon: "#44557B",
      domeTop: "#A8C4E8",
    },
    tintLift: 0.7,
  },
  metal: {
    base: {
      chromaticAberration: 0,
      coreColor: "#FFB870",
      distortion: 0.28,
      flowSpeed: 0.5,
      glowIntensity: 0.5,
      glowSpread: 3,
      ior: 1.42,
      primaryColor: "#C8CDD8",
      roughness: 0.08,
    },
    bloom: { intensity: 0.16, radius: 0.5, threshold: 0.92 },
    coreIntensityScale: 0.7,
    coreScale: 0.2,
    haloSize: 4,
    id: "metal",
    label: "Metal",
    material: {
      attenuationDistance: 1,
      backsideThickness: 0,
      clearcoat: 0,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.6,
      iridescence: 0.15,
      iridescenceIOR: 1.4,
      iridescenceThicknessRange: [100, 400],
      metalness: 1,
      samples: 6,
      thickness: 0,
      // Zero transmission makes Drei skip both buffer passes, so an opaque
      // style costs less than a transmissive one instead of the same.
      transmission: 0,
    },
    studio: {
      // A mirror shows the room, so the room has to be worth showing.
      cardIntensityScale: 1.5,
      domeBottom: "#1E2030",
      domeHorizon: "#3A3E5C",
      domeTop: "#B7BEE4",
    },
    tintLift: 0.15,
  },
  plasma: {
    base: {
      chromaticAberration: 0.15,
      coreColor: "#FFD166",
      distortion: 0.45,
      flowSpeed: 1.1,
      glowIntensity: 1.3,
      glowSpread: 2.2,
      ior: 1.15,
      primaryColor: "#FF3D8B",
      roughness: 0.25,
    },
    // Bloom is what makes an emissive core read as light rather than as a
    // bright ball, so this style is the reason the composer exists.
    bloom: { intensity: 1.9, radius: 0.85, threshold: 0.42 },
    coreIntensityScale: 2.4,
    coreScale: 0.72,
    haloSize: 4.8,
    id: "plasma",
    label: "Plasma",
    material: {
      // Partial transmission over a short attenuation distance: the shell
      // glows from within instead of showing the room through it.
      attenuationDistance: 0.7,
      backsideThickness: 0.3,
      clearcoat: 0,
      clearcoatRoughness: 0.4,
      envMapIntensity: 0.6,
      iridescence: 0,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 400],
      metalness: 0,
      samples: 8,
      thickness: 0.9,
      transmission: 0.55,
    },
    studio: {
      // A dark room, so the orb is the only light source in frame.
      cardIntensityScale: 0.5,
      domeBottom: "#0B0814",
      domeHorizon: "#171226",
      domeTop: "#2A2140",
    },
    tintLift: 0.3,
  },
};

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

/**
 * Subtle-to-medium palette shift in OKLCH. States modulate the style's colours
 * rather than replacing them, so style identity survives while the four states
 * stay legible at a glance.
 */
export type OrbStateTint = {
  chromaAdd: number;
  coreLightnessAdd: number;
  hueRotate: number;
  lightnessAdd: number;
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
  tint: OrbStateTint;
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
    tint: { chromaAdd: 0, coreLightnessAdd: 0, hueRotate: 0, lightnessAdd: 0 },
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
    tint: { chromaAdd: 0.03, coreLightnessAdd: 0.05, hueRotate: -8, lightnessAdd: 0.02 },
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
    tint: { chromaAdd: 0.05, coreLightnessAdd: 0.03, hueRotate: 14, lightnessAdd: 0.03 },
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
    tint: { chromaAdd: 0.04, coreLightnessAdd: 0.09, hueRotate: 5, lightnessAdd: 0.05 },
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

const toOklch = converter("oklch");
const intoDisplayGamut = toGamut("rgb", "oklch");

/**
 * Shifts a colour in OKLCH so lightness and chroma move perceptually rather
 * than by RGB arithmetic, then gamut-maps instead of clipping so a pushed
 * chroma stays hue-true.
 */
export function applyOrbTint(
  hex: string,
  shift: Readonly<{ chromaAdd: number; hueRotate: number; lightnessAdd: number }>,
): string {
  const base = toOklch(hex);

  if (!base) {
    return hex;
  }

  const shifted = {
    ...base,
    c: Math.max(0, (base.c ?? 0) + shift.chromaAdd),
    h: ((base.h ?? 0) + shift.hueRotate + 360) % 360,
    l: Math.min(1, Math.max(0, base.l + shift.lightnessAdd)),
  };

  return formatHex(intoDisplayGamut(shifted)).toUpperCase();
}

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
    coreColor: applyOrbTint(base.coreColor, {
      chromaAdd: delta.tint.chromaAdd * 0.5,
      hueRotate: delta.tint.hueRotate * 0.5,
      lightnessAdd: delta.tint.coreLightnessAdd,
    }),
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
    primaryColor: applyOrbTint(base.primaryColor, delta.tint),
    roughness: round(
      clamp(base.roughness * delta.roughnessScale, orbParamRanges.roughness),
    ),
  };
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
