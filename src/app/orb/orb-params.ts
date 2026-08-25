import { orbStyles } from "./orb-styles";

export const orbTargets = {
  chromaticAberration: "orb.chromaticAberration",
  coreColor: "appearance.coreColor",
  distortion: "orb.distortion",
  flowSpeed: "orb.flowSpeed",
  glowIntensity: "orb.glowIntensity",
  glowSpread: "orb.glowSpread",
  includeBackground: "export.includeBackground",
  ior: "orb.ior",
  primaryColor: "appearance.primaryColor",
  roughness: "orb.roughness",
  sceneBackground: "scene.background",
  state: "orb.state",
  style: "orb.style",
  viewDistance: "view.distance",
  viewOrbit: "view.orbit",
} as const;

export type OrbParams = {
  chromaticAberration: number;
  coreColor: string;
  distortion: number;
  flowSpeed: number;
  glowIntensity: number;
  glowSpread: number;
  ior: number;
  primaryColor: string;
  roughness: number;
};

export const orbDefaults: OrbParams = orbStyles.glass.base;

export const orbSceneBackgroundDefault = "#0A0A12";
export const orbViewDistanceDefault = 8;

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readHex(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : fallback;
}

export function readOrbParams(values: Record<string, unknown>): OrbParams {
  return {
    chromaticAberration: readNumber(
      values[orbTargets.chromaticAberration],
      orbDefaults.chromaticAberration,
    ),
    coreColor: readHex(values[orbTargets.coreColor], orbDefaults.coreColor),
    distortion: readNumber(values[orbTargets.distortion], orbDefaults.distortion),
    flowSpeed: readNumber(values[orbTargets.flowSpeed], orbDefaults.flowSpeed),
    glowIntensity: readNumber(
      values[orbTargets.glowIntensity],
      orbDefaults.glowIntensity,
    ),
    glowSpread: readNumber(values[orbTargets.glowSpread], orbDefaults.glowSpread),
    ior: readNumber(values[orbTargets.ior], orbDefaults.ior),
    primaryColor: readHex(
      values[orbTargets.primaryColor],
      orbDefaults.primaryColor,
    ),
    roughness: readNumber(values[orbTargets.roughness], orbDefaults.roughness),
  };
}

export function readOrbSceneBackground(values: Record<string, unknown>): string {
  return readHex(values[orbTargets.sceneBackground], orbSceneBackgroundDefault);
}

export function readOrbViewDistance(values: Record<string, unknown>): number {
  return readNumber(values[orbTargets.viewDistance], orbViewDistanceDefault);
}
