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
  | Readonly<{ density: number; kind: "nebula" }>;

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
    interior: { kind: "core" },
    label: "Glass",
    material: {
      anisotropicBlur: 0.4,
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
    ridge: 0,
    shell: { detail: 24, flatShading: false },
    studio: {
      cardIntensityScale: 1,
      domeBottom: "#282A4A",
      domeHorizon: "#3C3F6B",
      domeTop: "#9AA1E0",
    },
    surface: "transmissive",
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
    interior: { kind: "core" },
    label: "Bubble",
    material: {
      anisotropicBlur: 0.4,
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
    ridge: 0,
    shell: { detail: 24, flatShading: false },
    studio: {
      cardIntensityScale: 1.25,
      domeBottom: "#31344F",
      domeHorizon: "#4A4E77",
      domeTop: "#B9BFEE",
    },
    surface: "transmissive",
    tintLift: 0.8,
  },
  crystal: {
    base: {
      // Dispersion is the whole point of a cut stone, so aberration starts
      // high and Search still has somewhere to go before the clamp.
      chromaticAberration: 0.68,
      coreColor: "#C9A7FF",
      // Low, deliberately: a churning silhouette destroys the facets that
      // make this style legible. Crystal moves by turning, not by boiling.
      distortion: 0.16,
      flowSpeed: 0.45,
      glowIntensity: 0.5,
      glowSpread: 3.2,
      ior: 1.95,
      primaryColor: "#9FC6FF",
      roughness: 0.02,
    },
    bloom: { intensity: 0.42, radius: 0.62, threshold: 0.88 },
    coreIntensityScale: 1.1,
    coreScale: 0.38,
    haloSize: 4.2,
    id: "crystal",
    interior: { kind: "core" },
    label: "Crystal",
    material: {
      anisotropicBlur: 0.4,
      attenuationDistance: 2.2,
      backsideThickness: 0.35,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.4,
      iridescence: 0.35,
      iridescenceIOR: 1.5,
      iridescenceThicknessRange: [140, 620],
      metalness: 0,
      samples: 12,
      thickness: 0.85,
      transmission: 1,
    },
    ridge: 0,
    // The facets are the geometry, not a shading trick: a subdivided sphere
    // with flat shading still reads as a sphere. Detail 2 is 320 faces, which
    // is coarse enough to see and fine enough for displacement to bend.
    shell: { detail: 2, flatShading: true },
    studio: {
      // The small, very bright specular card blows a facet out at higher
      // scales, and a blown facet is a hole rather than a highlight.
      cardIntensityScale: 1,
      domeBottom: "#22263F",
      domeHorizon: "#3D4470",
      domeTop: "#AEBBF0",
    },
    surface: "transmissive",
    // A cut stone keeps its colour; lifting it toward white makes it milky.
    tintLift: 0.35,
  },
  amber: {
    base: {
      chromaticAberration: 0.18,
      coreColor: "#FFD9A0",
      // Resin is viscous. A fast amber reads as orange juice.
      distortion: 0.14,
      flowSpeed: 0.22,
      glowIntensity: 0.55,
      glowSpread: 3.4,
      ior: 1.55,
      primaryColor: "#F0C070",
      roughness: 0.05,
    },
    bloom: { intensity: 0.36, radius: 0.6, threshold: 0.8 },
    coreIntensityScale: 0.7,
    coreScale: 0.34,
    haloSize: 4.3,
    id: "amber",
    interior: { kind: "core" },
    label: "Amber",
    material: {
      anisotropicBlur: 0.35,
      // The whole style is here. Every other transmissive style crosses in
      // 2.2 units or more, so its colour comes from its surface; this one
      // absorbs within a single unit, so its colour comes from how far the
      // light had to travel through the body. Shorter than this and the
      // absorption eats the green channel and the gold turns to wine.
      attenuationDistance: 0.95,
      // Light crosses the backside pass and then the body, so this adds to
      // `thickness` in the absorption exponent. At 0.8 the gold came out
      // as wine.
      backsideThickness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 2.1,
      iridescence: 0,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 400],
      metalness: 0,
      samples: 10,
      // Deep, so there is a thick middle for the attenuation to act over.
      thickness: 1.6,
      transmission: 1,
    },
    ridge: 0,
    shell: { detail: 24, flatShading: false },
    studio: {
      // A warm room. Absorption can only subtract, so the light going in has
      // to carry what the body is meant to keep.
      cardIntensityScale: 0.85,
      domeBottom: "#241708",
      domeHorizon: "#3E2A12",
      domeTop: "#B8905A",
    },
    surface: "transmissive",
    tintLift: 0.25,
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
    interior: { kind: "core" },
    label: "Frost",
    material: {
      anisotropicBlur: 0.4,
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
    ridge: 0,
    shell: { detail: 24, flatShading: false },
    studio: {
      cardIntensityScale: 1.1,
      domeBottom: "#2B3450",
      domeHorizon: "#44557B",
      domeTop: "#A8C4E8",
    },
    surface: "transmissive",
    tintLift: 0.7,
  },
  obsidian: {
    base: {
      chromaticAberration: 0.06,
      coreColor: "#FF7A3C",
      // Volcanic glass is heavy and slow, and a black body only shows motion
      // through the highlights sliding across it.
      distortion: 0.22,
      flowSpeed: 0.35,
      glowIntensity: 0.4,
      glowSpread: 4.2,
      ior: 1.48,
      primaryColor: "#14101C",
      roughness: 0.06,
    },
    bloom: { intensity: 0.3, radius: 0.6, threshold: 0.78 },
    coreIntensityScale: 0.6,
    coreScale: 0.4,
    haloSize: 4,
    id: "obsidian",
    interior: { kind: "core" },
    label: "Obsidian",
    material: {
      anisotropicBlur: 0.4,
      // Unused at transmission 0, but kept honest: nothing crosses this body.
      attenuationDistance: 0.28,
      backsideThickness: 0,
      // A polished stone is a coat over a dark body. Full clearcoat reflects
      // so much white that the stone goes grey, so this is the level that
      // still reads as polish rather than as paint.
      clearcoat: 0.6,
      clearcoatRoughness: 0.06,
      envMapIntensity: 1,
      iridescence: 0,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 400],
      metalness: 0,
      samples: 8,
      thickness: 0,
      // None. Drei's transmission path samples the environment behind the
      // body, and at any level above zero the dome showed straight through
      // and turned the stone grey. Opaque is also what obsidian is, and it
      // skips both of Drei's extra passes.
      transmission: 0,
    },
    ridge: 0,
    shell: { detail: 24, flatShading: false },
    studio: {
      // Very dim. A polished black stone is mostly the room it reflects, so
      // a normal studio does not light it — it replaces it with a mirror.
      cardIntensityScale: 0.5,
      domeBottom: "#050408",
      domeHorizon: "#0D0B14",
      domeTop: "#241E30",
    },
    surface: "opaque",
    // Almost none, or the body goes grey and stops being obsidian.
    tintLift: 0.08,
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
    interior: { kind: "core" },
    label: "Metal",
    material: {
      anisotropicBlur: 0.4,
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
    ridge: 0,
    shell: { detail: 24, flatShading: false },
    studio: {
      // A mirror shows the room, so the room has to be worth showing.
      cardIntensityScale: 1.5,
      domeBottom: "#1E2030",
      domeHorizon: "#3A3E5C",
      domeTop: "#B7BEE4",
    },
    surface: "opaque",
    tintLift: 0.15,
  },
  ferrofluid: {
    base: {
      chromaticAberration: 0,
      coreColor: "#8A5CFF",
      // Enough to move, not so much that the body itself crumples: the cones
      // come from the ridging, and they need something round to stand on.
      distortion: 0.42,
      flowSpeed: 0.62,
      glowIntensity: 0.45,
      glowSpread: 3.8,
      ior: 1.42,
      primaryColor: "#241F33",
      roughness: 0.18,
    },
    bloom: { intensity: 0.22, radius: 0.55, threshold: 0.86 },
    coreIntensityScale: 0.5,
    coreScale: 0.22,
    haloSize: 4.4,
    id: "ferrofluid",
    interior: { kind: "core" },
    label: "Ferrofluid",
    material: {
      anisotropicBlur: 0.4,
      attenuationDistance: 1,
      backsideThickness: 0,
      // A wet sheen, not a chrome coat: clearcoat reflects white whatever the
      // body colour is, which is exactly how a black fluid turns into a mirror.
      clearcoat: 0.15,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.25,
      // A thin oil film over black metal. This is what stops the style from
      // being a silhouette: the colour lives in the sheen, not in the body.
      iridescence: 0.3,
      iridescenceIOR: 1.6,
      iridescenceThicknessRange: [180, 700],
      metalness: 1,
      samples: 6,
      thickness: 0,
      transmission: 0,
    },
    ridge: 1,
    shell: { detail: 24, flatShading: false },
    studio: {
      // A black surface only exists where something reflects in it, so the
      // room has to be brighter here than anywhere else.
      cardIntensityScale: 1.35,
      domeBottom: "#101018",
      domeHorizon: "#2A2C42",
      domeTop: "#8E96C8",
    },
    surface: "opaque",
    // Almost none: lifting a near-black body toward white is what turns a
    // ferrofluid into grey putty.
    tintLift: 0.05,
  },
  nebula: {
    base: {
      chromaticAberration: 0.22,
      coreColor: "#FF7AE0",
      distortion: 0.24,
      flowSpeed: 0.7,
      glowIntensity: 0.75,
      glowSpread: 3,
      ior: 1.28,
      primaryColor: "#5B4BFF",
      roughness: 0.05,
    },
    bloom: { intensity: 0.95, radius: 0.78, threshold: 0.6 },
    coreIntensityScale: 1,
    // Large enough to fill the orb, small enough that Think's core agitation
    // cannot push the volume out through the shell.
    coreScale: 0.72,
    haloSize: 4.6,
    id: "nebula",
    interior: { density: 26, kind: "nebula" },
    label: "Nebula",
    material: {
      // Almost none: this shell exists to be looked through, and the
      // sampler blur is what turns the volume behind it into fog.
      anisotropicBlur: 0.05,
      // A thin, barely-absorbing shell. Anything denser and the interior the
      // whole style exists to show is tinted away.
      attenuationDistance: 5,
      backsideThickness: 0.12,
      clearcoat: 0.4,
      clearcoatRoughness: 0.05,
      envMapIntensity: 0.7,
      iridescence: 0.18,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: [120, 520],
      metalness: 0,
      samples: 8,
      thickness: 0.35,
      transmission: 1,
    },
    ridge: 0,
    shell: { detail: 24, flatShading: false },
    studio: {
      // Dark, like Plasma: a volume that emits its own light needs a room
      // that is not already lit.
      cardIntensityScale: 0.3,
      domeBottom: "#080614",
      domeHorizon: "#151034",
      domeTop: "#1B1638",
    },
    surface: "transmissive",
    // Nearly white, because this shell's job is to be looked through: the
    // colour of a volume style belongs to the volume, not to the glass.
    tintLift: 0.85,
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
    interior: { kind: "core" },
    label: "Plasma",
    material: {
      anisotropicBlur: 0.4,
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
    ridge: 0,
    shell: { detail: 24, flatShading: false },
    studio: {
      // A dark room, so the orb is the only light source in frame.
      cardIntensityScale: 0.5,
      domeBottom: "#0B0814",
      domeHorizon: "#171226",
      domeTop: "#2A2140",
    },
    surface: "transmissive",
    tintLift: 0.3,
  },
};

/**
 * The styles whose body transmits nothing. Derived rather than listed, so a
 * new opaque style cannot forget to hide the controls that only describe
 * transmitted light, and the cost claim stays true by construction.
 */
export const orbOpaqueStyleIds: readonly OrbStyleId[] = orbStyleOrder.filter(
  (id) => orbStyles[id].surface === "opaque",
);

export function isOrbStyleOpaque(styleId: OrbStyleId): boolean {
  return orbStyles[styleId].surface === "opaque";
}
