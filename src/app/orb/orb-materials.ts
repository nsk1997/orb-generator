import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  FrontSide,
  ShaderMaterial,
} from "three";

import {
  createOrbDisplacementUniforms,
  type OrbDisplacementUniforms,
  type OrbUniform,
} from "./orb-displacement";
import { orbDisplacementChunk, orbNoiseChunk } from "./orb-shader-chunks";

const orbLayerVertexShader = /* glsl */ `
${orbNoiseChunk}
${orbDisplacementChunk}

varying vec3 vOrbNormal;
varying vec3 vOrbView;

void main() {
  vec3 displaced;
  vec3 normalObject = orbDisplacedNormal(position, orbDistortion, displaced);
  vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);

  vOrbNormal = normalize(normalMatrix * normalObject);
  vOrbView = normalize(-viewPosition.xyz);

  gl_Position = projectionMatrix * viewPosition;
}
`;

const orbHaloVertexShader = /* glsl */ `
varying vec2 vOrbUv;

void main() {
  vOrbUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const orbHaloFragmentShader = /* glsl */ `
uniform vec3 orbGlowColor;
uniform float orbGlowIntensity;
uniform float orbGlowSpread;

varying vec2 vOrbUv;

void main() {
  float radius = length(vOrbUv - 0.5) * 2.0;
  // Punch out the middle: the orb hides it on screen, but the transmission
  // sampler still reads it and a solid disc blows out the whole interior.
  float ring = smoothstep(0.2, 0.58, radius);
  float falloff = pow(clamp(1.0 - radius, 0.0, 1.0), orbGlowSpread);

  gl_FragColor = vec4(orbGlowColor * ring * falloff * orbGlowIntensity, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const orbCoreFragmentShader = /* glsl */ `
uniform vec3 orbCoreColor;
uniform float orbCoreIntensity;

varying vec3 vOrbNormal;
varying vec3 vOrbView;

void main() {
  float facing = clamp(abs(dot(normalize(vOrbNormal), normalize(vOrbView))), 0.0, 1.0);
  float hot = pow(facing, 3.0);
  vec3 plasma = mix(orbCoreColor * 0.05, orbCoreColor * 1.45, hot);

  gl_FragColor = vec4(plasma * orbCoreIntensity, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export type OrbGlowMaterial = ShaderMaterial & {
  uniforms: {
    orbGlowColor: OrbUniform<Color>;
    orbGlowIntensity: OrbUniform<number>;
    orbGlowSpread: OrbUniform<number>;
  };
};

export type OrbCoreMaterial = ShaderMaterial & {
  uniforms: OrbDisplacementUniforms & {
    orbCoreColor: OrbUniform<Color>;
    orbCoreIntensity: OrbUniform<number>;
  };
};

/**
 * Camera-facing additive halo drawn behind the orb. A billboard reads as light
 * bleeding past the silhouette; a back-faced shell reads as a hard rind.
 */
export function createOrbGlowMaterial(): OrbGlowMaterial {
  return new ShaderMaterial({
    blending: AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    fragmentShader: orbHaloFragmentShader,
    side: DoubleSide,
    transparent: true,
    uniforms: {
      orbGlowColor: { value: new Color("#7C5CFF") },
      orbGlowIntensity: { value: 0.8 },
      orbGlowSpread: { value: 2.8 },
    },
    vertexShader: orbHaloVertexShader,
  }) as OrbGlowMaterial;
}

/** Emissive heart seen refracted through the glass shell. */
export function createOrbCoreMaterial(scale: number): OrbCoreMaterial {
  return new ShaderMaterial({
    blending: AdditiveBlending,
    depthWrite: false,
    fragmentShader: orbCoreFragmentShader,
    side: FrontSide,
    transparent: true,
    uniforms: {
      ...createOrbDisplacementUniforms(scale),
      orbCoreColor: { value: new Color("#22D3EE") },
      orbCoreIntensity: { value: 1 },
    },
    vertexShader: orbLayerVertexShader,
  }) as OrbCoreMaterial;
}

const orbDomeVertexShader = /* glsl */ `
varying vec3 vOrbDomeDirection;

void main() {
  vOrbDomeDirection = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const orbDomeFragmentShader = /* glsl */ `
uniform vec3 orbDomeTop;
uniform vec3 orbDomeHorizon;
uniform vec3 orbDomeBottom;

varying vec3 vOrbDomeDirection;

void main() {
  float height = normalize(vOrbDomeDirection).y;
  vec3 sky = mix(orbDomeHorizon, orbDomeTop, smoothstep(0.0, 0.75, height));
  vec3 ground = mix(orbDomeHorizon, orbDomeBottom, smoothstep(0.0, -0.6, height));
  vec3 dome = height >= 0.0 ? sky : ground;

  gl_FragColor = vec4(dome, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * Continuous surround for the environment probe. Light cards alone leave the
 * probe mostly black, and clear glass then refracts as a shattered mirror.
 */
export function createOrbDomeMaterial(
  colors: Readonly<{ bottom: string; horizon: string; top: string }>,
): ShaderMaterial {
  return new ShaderMaterial({
    depthWrite: false,
    fragmentShader: orbDomeFragmentShader,
    side: BackSide,
    uniforms: {
      orbDomeBottom: { value: new Color(colors.bottom) },
      orbDomeHorizon: { value: new Color(colors.horizon) },
      orbDomeTop: { value: new Color(colors.top) },
    },
    vertexShader: orbDomeVertexShader,
  });
}

const orbLightCardVertexShader = /* glsl */ `
varying vec2 vOrbCardUv;

void main() {
  vOrbCardUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const orbLightCardFragmentShader = /* glsl */ `
uniform vec3 orbCardColor;
uniform float orbCardIntensity;
uniform float orbCardSoftness;

varying vec2 vOrbCardUv;

void main() {
  float radius = length((vOrbCardUv - 0.5) * 2.0);
  float falloff = pow(clamp(1.0 - radius, 0.0, 1.0), orbCardSoftness);

  gl_FragColor = vec4(orbCardColor * orbCardIntensity * falloff, 1.0);
}
`;

/**
 * A studio light with a soft edge. Drei's Lightformer draws a hard-edged quad,
 * which near-mirror glass reflects as a shard rather than a highlight.
 */
export function createOrbLightCardMaterial(
  color: string,
  intensity: number,
  softness: number,
): ShaderMaterial {
  return new ShaderMaterial({
    blending: AdditiveBlending,
    depthWrite: false,
    fragmentShader: orbLightCardFragmentShader,
    side: DoubleSide,
    toneMapped: false,
    transparent: true,
    uniforms: {
      orbCardColor: { value: new Color(color) },
      orbCardIntensity: { value: intensity },
      orbCardSoftness: { value: softness },
    },
    vertexShader: orbLightCardVertexShader,
  });
}
