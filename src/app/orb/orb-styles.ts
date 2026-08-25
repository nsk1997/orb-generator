import type { OrbParams } from "./orb-params";

export type OrbStyleId = "glass" | "bubble" | "frost" | "metal";
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

export type OrbStyle = {
  /** Resting parameter set. States are deltas on top of this. */
  base: OrbParams;
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
      coreColor: "#FFFFFF",
      distortion: 0.35,
      flowSpeed: 0.3,
      glowIntensity: 0.55,
      glowSpread: 3.6,
      ior: 1.31,
      primaryColor: "#BFE6FF",
      roughness: 0.55,
    },
    coreScale: 0.5,
    haloSize: 4,
    id: "frost",
    label: "Frost",
    material: {
      // Short attenuation over real thickness is what makes light scatter out
      // milky instead of transmitting a sharp image.
      attenuationDistance: 0.9,
      backsideThickness: 0.6,
      clearcoat: 0.4,
      clearcoatRoughness: 0.3,
      envMapIntensity: 1.4,
      iridescence: 0,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 400],
      metalness: 0,
      // A rough surface blurs the samples anyway, so fewer of them cost
      // nothing visible.
      samples: 6,
      thickness: 1.4,
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
};

/**
 * A state is the same gesture in every style: how agitated the surface is.
 * Colour deliberately belongs to the style, or every style would look alike
 * the moment a state was applied.
 */
export type OrbStateDelta = {
  chromaticAberrationAdd: number;
  distortionAdd: number;
  flowSpeedScale: number;
  glowIntensityScale: number;
  glowSpreadScale: number;
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
