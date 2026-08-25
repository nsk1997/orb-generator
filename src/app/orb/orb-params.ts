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

export const orbDefaults: OrbParams = {
  chromaticAberration: 0.32,
  coreColor: "#22D3EE",
  distortion: 0.3,
  flowSpeed: 0.55,
  glowIntensity: 0.8,
  glowSpread: 2.8,
  ior: 1.42,
  primaryColor: "#7C5CFF",
  roughness: 0.06,
};

export const orbSceneBackgroundDefault = "#0A0A12";
export const orbViewDistanceDefault = 8;

/**
 * Preset states an assistant orb moves through. Each one is a complete
 * parameter set so applying a preset never leaves a stale slider behind.
 */
export type OrbStateId = "idle" | "thinking" | "searching" | "speaking";

export const orbStatePresets: Record<OrbStateId, OrbParams> = {
  idle: {
    chromaticAberration: 0.28,
    coreColor: "#22D3EE",
    distortion: 0.16,
    flowSpeed: 0.28,
    glowIntensity: 0.6,
    glowSpread: 3.2,
    ior: 1.4,
    primaryColor: "#7C5CFF",
    roughness: 0.06,
  },
  thinking: {
    chromaticAberration: 0.46,
    coreColor: "#A78BFA",
    distortion: 0.42,
    flowSpeed: 0.9,
    glowIntensity: 0.95,
    glowSpread: 2.6,
    ior: 1.62,
    primaryColor: "#5B7CFF",
    roughness: 0.04,
  },
  searching: {
    chromaticAberration: 0.62,
    coreColor: "#34D399",
    distortion: 0.3,
    flowSpeed: 1.85,
    glowIntensity: 1.0,
    glowSpread: 2.1,
    ior: 1.86,
    primaryColor: "#22D3EE",
    roughness: 0.02,
  },
  speaking: {
    chromaticAberration: 0.34,
    coreColor: "#FDE68A",
    distortion: 0.5,
    flowSpeed: 1.25,
    glowIntensity: 1.15,
    glowSpread: 1.9,
    ior: 1.34,
    primaryColor: "#FF6FB1",
    roughness: 0.08,
  },
};

export const orbStateOrder: readonly OrbStateId[] = [
  "idle",
  "thinking",
  "searching",
  "speaking",
];

export const orbStateLabels: Record<OrbStateId, string> = {
  idle: "Idle",
  searching: "Searching",
  speaking: "Speaking",
  thinking: "Thinking",
};

export const orbStateActionPrefix = "orb.state.";

export function getOrbStateActionValue(id: OrbStateId): string {
  return `${orbStateActionPrefix}${id}`;
}

export function readOrbStateActionValue(value: string): OrbStateId | null {
  if (!value.startsWith(orbStateActionPrefix)) {
    return null;
  }

  const id = value.slice(orbStateActionPrefix.length);

  return orbStateOrder.includes(id as OrbStateId) ? (id as OrbStateId) : null;
}

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
