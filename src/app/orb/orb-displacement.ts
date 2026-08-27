import type { Material, WebGLProgramParametersWithUniforms } from "three";

import { orbDisplacementChunk, orbNoiseChunk } from "./orb-shader-chunks";

export type OrbUniform<Value> = { value: Value };

export type OrbDisplacementUniforms = {
  orbCalm: OrbUniform<number>;
  orbDistortion: OrbUniform<number>;
  orbFlow: OrbUniform<number>;
  orbPulse: OrbUniform<number>;
  orbRidge: OrbUniform<number>;
  orbScale: OrbUniform<number>;
  orbSweep: OrbUniform<number>;
  orbSwirl: OrbUniform<number>;
};

export function createOrbDisplacementUniforms(
  scale: number,
  ridge = 0,
): OrbDisplacementUniforms {
  return {
    orbCalm: { value: 1 },
    orbDistortion: { value: 0 },
    orbFlow: { value: 0 },
    orbPulse: { value: 0 },
    orbRidge: { value: ridge },
    orbScale: { value: scale },
    orbSweep: { value: 0 },
    orbSwirl: { value: 0 },
  };
}

const orbVertexPreamble = `${orbNoiseChunk}\n${orbDisplacementChunk}\n`;

/**
 * The two three.js vertex chunks that own object-space normal and position.
 * Replacing both is what makes lighting, refraction, the transmission buffer,
 * and export all follow the displaced surface instead of the base sphere.
 */
const normalMarker = "#include <beginnormal_vertex>";
const positionMarker = "#include <begin_vertex>";

const displacedNormalSource = /* glsl */ `
vec3 orbSurfacePosition;
vec3 objectNormal = orbDisplacedNormal(position, orbDistortion, orbSurfacePosition);
`;
const displacedPositionSource = "vec3 transformed = orbSurfacePosition;";

export class OrbDisplacementError extends Error {
  constructor(marker: string) {
    super(
      `Orb displacement could not find "${marker}" in the vertex shader. ` +
        "three.js renamed or removed the chunk, so the orb would silently " +
        "render as a static sphere.",
    );
    this.name = "OrbDisplacementError";
  }
}

function replaceMarker(source: string, marker: string, replacement: string): string {
  if (!source.includes(marker)) {
    throw new OrbDisplacementError(marker);
  }

  return source.replace(marker, replacement);
}

/**
 * Adds fluid displacement to any lit three material by rewriting the vertex
 * chunks that own position and normal. Material-agnostic on purpose: the glass
 * shell, an opaque metal shell, and any future style share this one path.
 *
 * Throws rather than returning an unmodified shader — a missing marker
 * otherwise compiles cleanly and renders a motionless sphere.
 */
export function applyOrbDisplacementToShader(
  shader: WebGLProgramParametersWithUniforms,
  uniforms: OrbDisplacementUniforms,
): void {
  for (const name of Object.keys(uniforms) as (keyof OrbDisplacementUniforms)[]) {
    shader.uniforms[name] = uniforms[name];
  }

  let vertexShader = orbVertexPreamble + shader.vertexShader;
  vertexShader = replaceMarker(vertexShader, normalMarker, displacedNormalSource);
  vertexShader = replaceMarker(
    vertexShader,
    positionMarker,
    displacedPositionSource,
  );

  shader.vertexShader = vertexShader;
}

type OrbPatchedMaterial = Material & {
  customProgramCacheKey?: () => string;
  userData: { orbDisplacementAttached?: boolean };
};

/**
 * Chains onto whatever `onBeforeCompile` the material already has, so a
 * material that patches its own shader — Drei's transmission material rewrites
 * the whole fragment stage — keeps working. Idempotent: attaching twice is a
 * no-op rather than a double patch.
 */
export function attachOrbDisplacement(
  material: Material,
  uniforms: OrbDisplacementUniforms,
  cacheKey: string,
): void {
  const patched = material as OrbPatchedMaterial;

  if (patched.userData.orbDisplacementAttached) {
    return;
  }

  const inherited = material.onBeforeCompile.bind(material);

  material.onBeforeCompile = (shader, renderer) => {
    inherited(shader, renderer);
    applyOrbDisplacementToShader(shader, uniforms);
  };
  patched.customProgramCacheKey = () => cacheKey;
  patched.userData.orbDisplacementAttached = true;
  material.needsUpdate = true;
}
