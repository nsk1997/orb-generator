import type { OrbParams } from "./orb-params";

export type OrbStyleId =
  | "glass"
  | "bubble"
  | "crystal"
  | "amber"
  | "frost"
  | "obsidian"
  | "metal"
  | "ferrofluid"
  | "nebula"
  | "aurora"
  | "plasma";

/**
 * Everything a style owns that has no slider. These reach the material and the
 * studio directly, which is why the style has to be a stored value rather than
 * a one-shot preset.
 */
export type OrbMaterialConfig = {
  /**
   * How far the transmission sampler blurs what it sees through the body. A
   * style whose interior is the subject cannot afford much of it; a style
   * whose surface is the subject wants it.
   */
  anisotropicBlur: number;
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

/**
 * Whether the body transmits light at all. This is the cost claim as much as
 * the look: Drei skips its backside and buffer passes only at transmission 0,
 * so an opaque style is genuinely cheaper than a transmissive one.
 */
export type OrbSurfaceKind = "opaque" | "transmissive";

/**
 * What lives inside the shell. `core` is the emissive heart every style
 * shipped with; `nebula` raymarches a volume through the interior instead, so
 * the orb has depth rather than a bright centre.
 */
export type OrbInterior =
  | Readonly<{ kind: "core" }>
  | Readonly<{ density: number; kind: "nebula" }>
  /**
   * Flowing hue bands. `spread` is how far, in radians, the ramp rotates past
   * each of the two colours the user owns — which is what turns two pickers
   * into the four-or-more hues this look needs without taking the pickers
   * away from them.
   */
  | Readonly<{ kind: "aurora"; spread: number }>;

/**
 * How a style moves, as distinct from how it looks.
 *
 * Bloom is already per style on the reasoning that a mirror should barely
 * bleed and a plasma should bleed a lot. The same argument applies to motion:
 * a soap film and a block of resin should not arrive at a new state on the
 * same curve, and a single damp rate has no vocabulary for saying so.
 */
export type OrbMotionSignature = {
  /** Multiplies every authored time. A resin is slower than a soap film. */
  durationScale: number;
  /**
   * How the forms that read as motion arrive. This is where the character
   * lives: overshoot for anything light or energetic, none for anything heavy.
   */
  motionEase: string;
  /** How the shape morph settles. Steadier than the motion ease, by design. */
  shapeEase: string;
};

export type OrbShellConfig = {
  /**
   * Icosahedron subdivision. High detail is what lets displacement read as a
   * smooth fluid; low detail is what makes a faceted style faceted, so this
   * belongs to the style rather than being one number for the whole app.
   */
  detail: number;
  /** Flat shading reads the facets off the geometry instead of smoothing them. */
  flatShading: boolean;
};

export type OrbStyle = {
  /** Resting parameter set. States are deltas on top of this. */
  base: OrbParams;
  bloom: OrbBloomConfig;
  coreIntensityScale: number;
  coreScale: number;
  haloSize: number;
  id: OrbStyleId;
  interior: OrbInterior;
  label: string;
  material: OrbMaterialConfig;
  motion: OrbMotionSignature;
  /** 0 is the fluid swell every style shipped with; 1 spikes it into cones. */
  ridge: number;
  shell: OrbShellConfig;
  studio: OrbStudioConfig;
  surface: OrbSurfaceKind;
  /** How far the transmitted tint is lifted toward white before it is used. */
  tintLift: number;
};

export const orbStyleOrder: readonly OrbStyleId[] = [
  "glass",
  "bubble",
  "crystal",
  "amber",
  "frost",
  "obsidian",
  "metal",
  "ferrofluid",
  "nebula",
  "aurora",
  "plasma",
];
