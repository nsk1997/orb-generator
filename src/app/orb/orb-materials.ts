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

const orbWhitePoint = new Color("#FFFFFF");

/**
 * The shell's own colour: the primary lifted toward white so transmitted light
 * stays luminous while volume attenuation carries the saturated colour through
 * the thick middle. How far to lift belongs to the style, because a soap film
 * is nearly white and a ferrofluid is nearly black.
 *
 * This lives here rather than in each consumer because `Color.lerp` runs in
 * three's linear working space while lerping the sRGB hex digits does not. The
 * two produce visibly different colours for the same `tintLift` — lighter and
 * less saturated in linear — so a second implementation is not a duplicate but
 * a divergence waiting to happen. It already happened once: the copied snippet
 * lifted in sRGB and rendered every style more saturated than the app.
 */
export function applyOrbGlassTint(
  out: Color,
  primary: Color,
  tintLift: number,
): Color {
  return out.copy(primary).lerp(orbWhitePoint, tintLift);
}

/**
 * Takes ownership of the transmission material's `time` uniform.
 *
 * Drei's `MeshTransmissionMaterial` assigns `uniforms.time.value` from the R3F
 * clock on every frame, before it checks transmission, so it does this for
 * opaque styles too. That made the product's own write a no-op: the surface
 * carried wall-clock time rather than the integrated flow phase, so `Flow
 * speed` could not slow the material's internal distortion and setting it to 0
 * did not stop the orb. Redefining the accessor makes the library's assignment
 * the no-op instead, and the product the single owner of the clock.
 */
export function attachOrbProductTime(
  material: Readonly<{ uniforms: Record<string, { value: unknown }> }>,
  readPhase: () => number,
): void {
  const uniform = material.uniforms.time;

  if (!uniform) {
    throw new Error("The orb body material must expose a time uniform to own.");
  }

  Object.defineProperty(uniform, "value", {
    configurable: true,
    enumerable: true,
    get: readPhase,
    set: () => {},
  });
}

/** The same tint as a hex string, for code that emits a colour rather than sets one. */
export function orbGlassTintHex(primary: string, tintLift: number): string {
  const tint = applyOrbGlassTint(new Color(), new Color(primary), tintLift);

  return `#${tint.getHexString().toUpperCase()}`;
}

const orbLayerVertexShader = /* glsl */ `
${orbNoiseChunk}
${orbDisplacementChunk}

varying vec3 vOrbNormal;
varying vec3 vOrbView;
varying vec3 vOrbWorld;

void main() {
  vec3 displaced;
  vec3 normalObject = orbDisplacedNormal(position, orbDistortion, displaced);
  vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);

  vOrbNormal = normalize(normalMatrix * normalObject);
  vOrbView = normalize(-viewPosition.xyz);
  // The volume interior marches against three's cameraPosition uniform, which
  // is world space, so the entry point has to be world space too.
  vOrbWorld = (modelMatrix * vec4(displaced, 1.0)).xyz;

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
    /** Present only on the aurora interior, which ramps between both colours. */
    orbAuroraTint?: OrbUniform<Color>;
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

/** Ten steps band visibly; a fixed per-pixel offset breaks the bands up. */
export const orbNebulaSteps = 10;

export const orbNebulaFragmentShader = /* glsl */ `
${orbNoiseChunk}
${orbDisplacementChunk}
uniform vec3 orbCoreColor;
uniform float orbCoreIntensity;
uniform float orbNebulaDensity;

varying vec3 vOrbWorld;

const int ORB_NEBULA_STEPS = ${orbNebulaSteps};

/**
 * Density at one point inside the shell. Densest in a band partway out, so the
 * volume reads as cloud with structure rather than as one bright ball, and
 * driven by the same looping noise as the surface so a captured cycle still
 * stitches.
 */
float orbNebulaSample(vec3 point, float phase) {
  vec3 turned = mix(point, orbRotateY(point, phase * ORB_TAU), orbSwirl);
  const vec3 volumeDrift = vec3(-1.8, 2.4, 1.2);
  float field = orbLoopFbm(turned * (3.4 / orbScale), volumeDrift, phase);
  float radial = clamp(length(point) / orbScale, 0.0, 1.0);
  float band = smoothstep(0.0, 0.3, radial) * pow(1.0 - radial, 0.9);

  // Raising the positive half to a power thins the field into filaments and
  // voids. Left linear it accumulates into an even haze with no structure.
  return pow(max(field, 0.0), 1.8) * band;
}

float orbNebulaDither(vec2 fragment) {
  return fract(sin(dot(fragment, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  // The interior mesh is untransformed, so the shell is centred on the world
  // origin and the chord from a point on it has a closed form: the near root
  // is zero, which leaves the far root alone.
  vec3 rayDirection = normalize(vOrbWorld - cameraPosition);
  float along = dot(vOrbWorld, rayDirection);
  float span = max(-2.0 * along, 0.0);
  float stepLength = span / float(ORB_NEBULA_STEPS);
  float phase = fract(orbFlow / ORB_LOOP_SPAN);
  float jitter = orbNebulaDither(gl_FragCoord.xy);

  float accumulated = 0.0;
  float peak = 0.0;

  for (int index = 0; index < ORB_NEBULA_STEPS; index++) {
    vec3 point = vOrbWorld + rayDirection * (float(index) + jitter) * stepLength;
    float density = orbNebulaSample(point, phase);
    accumulated += density * stepLength;
    peak = max(peak, density);
  }

  // Thickness carries brightness and the densest sample carries hue, so a thin
  // wisp stays deep and a knot in the cloud goes hot.
  // Tone mapping walks bright values toward white, so the volume is kept
  // under the knee and only the densest knots are allowed to go hot. Blowing
  // the middle out costs the style the colour it exists for.
  float amount = clamp(accumulated * orbNebulaDensity, 0.0, 1.3);
  vec3 deep = orbCoreColor * 0.5;
  vec3 hot = mix(orbCoreColor, vec3(1.0), 0.15) * 1.9;
  vec3 volume = mix(deep, hot, clamp(peak * 2.0, 0.0, 1.0)) * amount;

  gl_FragColor = vec4(volume * orbCoreIntensity, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * A volume raymarched through the shell instead of an emissive shell of its
 * own. Same uniforms as the core material, so the render loop drives either
 * interior without knowing which one is mounted.
 */
export function createOrbNebulaMaterial(
  scale: number,
  density: number,
): OrbCoreMaterial {
  return new ShaderMaterial({
    blending: AdditiveBlending,
    depthWrite: false,
    fragmentShader: orbNebulaFragmentShader,
    side: FrontSide,
    transparent: true,
    uniforms: {
      ...createOrbDisplacementUniforms(scale),
      orbCoreColor: { value: new Color("#FF7AE0") },
      orbCoreIntensity: { value: 1 },
      orbNebulaDensity: { value: density },
    },
    vertexShader: orbLayerVertexShader,
  }) as OrbCoreMaterial;
}

export const orbAuroraFragmentShader = /* glsl */ `
${orbNoiseChunk}
${orbDisplacementChunk}

uniform vec3 orbAuroraTint;
uniform vec3 orbCoreColor;
uniform float orbAuroraSpread;
uniform float orbCoreIntensity;

varying vec3 vOrbNormal;
varying vec3 vOrbView;
varying vec3 vOrbWorld;

/**
 * Rodrigues rotation about the grey axis, which is a true hue rotation and
 * costs a dot, a cross and two trig calls. Converting to HSV and back would
 * cost more and clip the same colours.
 */
vec3 orbHueRotate(vec3 colour, float angle) {
  const vec3 axis = vec3(0.5773502691896258);
  float c = cos(angle);

  return colour * c
    + cross(axis, colour) * sin(angle)
    + axis * dot(axis, colour) * (1.0 - c);
}

/**
 * A cyclic four-stop ramp. The two middle stops are exactly the colours the
 * user picked; the outer two are those colours rotated past themselves, which
 * is where the extra hues come from. Cyclic so the band pattern has no seam.
 */
vec3 orbAuroraRamp(float t) {
  vec3 a = orbHueRotate(orbAuroraTint, -orbAuroraSpread);
  vec3 b = orbAuroraTint;
  vec3 c = orbCoreColor;
  vec3 d = orbHueRotate(orbCoreColor, orbAuroraSpread);

  float s = fract(t) * 4.0;
  vec3 colour = mix(a, b, smoothstep(0.0, 1.0, clamp(s, 0.0, 1.0)));
  colour = mix(colour, mix(b, c, smoothstep(0.0, 1.0, clamp(s - 1.0, 0.0, 1.0))), step(1.0, s));
  colour = mix(colour, mix(c, d, smoothstep(0.0, 1.0, clamp(s - 2.0, 0.0, 1.0))), step(2.0, s));
  colour = mix(colour, mix(d, a, smoothstep(0.0, 1.0, clamp(s - 3.0, 0.0, 1.0))), step(3.0, s));

  return colour;
}

void main() {
  vec3 unit = normalize(vOrbWorld);
  float phase = fract(orbFlow / ORB_LOOP_SPAN);
  float angle = phase * ORB_TAU;
  float azimuth = atan(unit.z, unit.x);

  // Warped, not striped, but only gently: at higher warp the bands stop being
  // bands and become blotches. The band count is an integer so a full turn of
  // the azimuth still lands on a whole number of ramps and leaves no seam.
  const float ORB_AURORA_BANDS = 2.0;
  float warp = orbLoopFbm(unit * 1.1, vec3(2.2, -1.4, 1.8), phase);
  float t = (azimuth / ORB_TAU + unit.y * 0.55 + warp * 0.18 + phase)
    * ORB_AURORA_BANDS;

  // Brightest where the interior faces the camera, so the ball has a form
  // instead of reading as a flat disc of colour.
  float facing = clamp(abs(dot(normalize(vOrbNormal), normalize(vOrbView))), 0.0, 1.0);
  vec3 colour = orbAuroraRamp(t) * mix(0.15, 1.0, pow(facing, 1.8));

  // Additive compositing through a lit shell walks every band toward white,
  // so the ramp is pushed away from its own luminance to hold its hue.
  float luma = dot(colour, vec3(0.299, 0.587, 0.114));
  colour = max(mix(vec3(luma), colour, 1.45), vec3(0.0));

  // The state reaches the bands through the same weights that drive the
  // surface, so Search sweeps and Speak pulses without new controls.
  float scan = pow(max(cos(azimuth - angle * 2.0), 0.0), 10.0);
  colour += colour * scan * orbSweep * 1.2;
  float beat = mix(1.0, 0.55 + 0.9 * orbBeat(angle), orbPulse);

  gl_FragColor = vec4(colour * orbCoreIntensity * beat, 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * Flowing hue bands rendered on the interior shell. Same uniforms as the other
 * interiors plus the second colour, so the render loop drives it unchanged.
 */
export function createOrbAuroraMaterial(
  scale: number,
  spread: number,
): OrbCoreMaterial {
  return new ShaderMaterial({
    blending: AdditiveBlending,
    depthWrite: false,
    fragmentShader: orbAuroraFragmentShader,
    side: FrontSide,
    transparent: true,
    uniforms: {
      ...createOrbDisplacementUniforms(scale),
      orbAuroraSpread: { value: spread },
      orbAuroraTint: { value: new Color("#4C7DFF") },
      orbCoreColor: { value: new Color("#FF5FA2") },
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
