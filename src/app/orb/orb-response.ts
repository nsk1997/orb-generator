/**
 * How the orb's controls turn into the quantities the renderer actually draws
 * with — one definition, shared by the live renderer and by Copy Code.
 *
 * These five expressions used to exist twice: once in the render loop and once
 * as copy-pasted text in the snippet emitter. Nothing kept the two in step, so
 * retuning one left the pasted orb responding the old way, and the divergence
 * was invisible until someone rendered both and compared pixels. That is not
 * hypothetical — it is exactly how the glass tint came to be computed in two
 * different colour spaces.
 *
 * The coefficients live here as data so the emitter can serialise them into the
 * snippet rather than restate them. Changing a number here moves the app and
 * every orb anyone has already copied out of it.
 */
export const orbResponse = {
  /** Bloom rides the glow control, and a transient lead brightens the flash. */
  bloomBase: 0.55,
  bloomGlow: 0.45,
  bloomLead: 0.3,
  /** The interior keeps a floor so a dimmed orb still reads as lit. */
  coreBase: 0.5,
  coreGlow: 0.28,
  /** The core churns at a fraction of the shell, so it can move inside a still surface. */
  coreDistortion: 0.55,
  /** The halo answers the same glow control, a little ahead of the surface. */
  glowLead: 0.25,
  /** A transient follow swells the shell without touching the Distortion control. */
  shellDistortionFollow: 0.1,
} as const;

/** Glow already means "how much light escapes", so it scales bloom too. */
export function orbBloomIntensity(
  bloomIntensityScale: number,
  glowIntensity: number,
  transientLead: number,
): number {
  return (
    bloomIntensityScale *
      (orbResponse.bloomBase + glowIntensity * orbResponse.bloomGlow) +
    orbResponse.bloomLead * transientLead
  );
}

export function orbCoreIntensity(
  glowIntensity: number,
  coreIntensityScale: number,
): number {
  return (
    (orbResponse.coreBase + glowIntensity * orbResponse.coreGlow) *
    coreIntensityScale
  );
}

export function orbGlowIntensity(
  glowIntensity: number,
  transientLead: number,
): number {
  return glowIntensity + orbResponse.glowLead * transientLead;
}

export function orbShellDistortion(
  distortion: number,
  transientFollow: number,
): number {
  return distortion + orbResponse.shellDistortionFollow * transientFollow;
}

export function orbCoreDistortion(
  shellDistortion: number,
  coreAgitation: number,
): number {
  return shellDistortion * orbResponse.coreDistortion * coreAgitation;
}
