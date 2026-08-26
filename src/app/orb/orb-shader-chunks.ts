/**
 * GLSL shared by the orb surface, its glow shell, and its core. The same
 * displacement function runs everywhere so all three layers morph together.
 */
export const orbNoiseChunk = /* glsl */ `
vec3 orbMod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 orbMod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 orbPermute(vec4 x) { return orbMod289(((x * 34.0) + 1.0) * x); }
vec4 orbTaylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float orbSimplex(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = orbMod289(i);
  vec4 p = orbPermute(orbPermute(orbPermute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = orbTaylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

/**
 * `orbFlow` is a distance-like phase, not a raw clock: the app integrates
 * speed over time on the CPU so changing Flow speed never snaps the surface.
 * It is wrapped to `ORB_LOOP_SPAN`, so the surface returns to exactly where it
 * started every cycle and a captured cycle can be looped without a visible cut.
 */
export const orbLoopSpan = 6;

export const orbDisplacementChunk = /* glsl */ `
uniform float orbFlow;
uniform float orbDistortion;
uniform float orbScale;

// Form weights. A state departs into its own shape language rather than
// doing the same thing harder; every term below is driven off the cycle
// angle, so each form loops by construction.
uniform float orbCalm;
uniform float orbPulse;
uniform float orbSweep;
uniform float orbSwirl;

const float ORB_LOOP_SPAN = ${orbLoopSpan.toFixed(1)};
const float ORB_TAU = 6.2831853;

/**
 * Seamless flow. Translating a noise field never returns to its start, so the
 * field is sampled twice, one full drift apart, and cross-faded across the
 * cycle: at t=0 and t=1 both expressions resolve to the same sample.
 */
float orbLoopNoise(vec3 p, vec3 drift, float t) {
  return mix(orbSimplex(p + drift * t), orbSimplex(p + drift * (t - 1.0)), t);
}

float orbLoopFbm(vec3 p, vec3 drift, float t) {
  // Two octaves, not three: cross-fading doubles every sample, and the third
  // octave carried too little weight to justify the extra cost.
  return 0.72 * orbLoopNoise(p, drift, t)
       + 0.28 * orbLoopNoise(p * 1.97, drift * 1.97, t);
}

vec3 orbRotateY(vec3 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

/** Three beats per cycle, so it returns exactly with the loop. */
float orbBeat(float angle) {
  float strike = pow(max(sin(angle * 3.0), 0.0), 4.0);
  float tail = 0.5 * pow(max(sin(angle * 3.0 + 2.1), 0.0), 6.0);
  return clamp(strike + tail, 0.0, 1.5) / 1.5;
}

vec3 orbDisplace(vec3 p, float amount) {
  vec3 unit = normalize(p);
  float t = fract(orbFlow / ORB_LOOP_SPAN);
  float angle = t * ORB_TAU;

  // Swirl turns the sampling domain instead of drifting it. A whole turn per
  // cycle lands back on the start.
  vec3 sampled = mix(unit, orbRotateY(unit, angle), orbSwirl);

  // Drift per cycle equals the old per-phase-unit travel times the span, so
  // the motion keeps its original rate while gaining a loop point.
  const vec3 swellDrift = vec3(3.3, -2.46, 1.62);
  const vec3 rippleDrift = vec3(0.0, 4.32, 2.64);

  float swell = orbLoopNoise(sampled * 0.85, swellDrift, t);
  float ripple = orbLoopFbm(sampled * 1.35, rippleDrift, t) * orbCalm;
  float breathe = (sin(angle) * 0.7 + sin(angle * 2.0 + 1.3) * 0.3) * 0.18;

  // A ridge circling the orb, anchored to the world rather than to the swirl,
  // so it reads as something scanning across the surface.
  float azimuth = atan(unit.z, unit.x);
  float aligned = cos(azimuth - angle * 2.0);
  float band = pow(max(aligned, 0.0), 14.0) * (0.55 + 0.45 * (1.0 - abs(unit.y)));

  // Bursts and settles rather than buzzing evenly.
  float pulseGain = mix(1.0, 0.45 + 1.35 * orbBeat(angle), orbPulse);

  float offset =
    amount * 0.72 * pulseGain * (0.56 * swell + 0.34 * ripple + breathe) +
    amount * 0.5 * band * orbSweep;

  return unit * (orbScale + offset);
}

vec3 orbTangent(vec3 unit) {
  vec3 reference = abs(unit.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  return normalize(cross(reference, unit));
}

/** Rebuilds the surface normal from two displaced neighbours on the sphere. */
vec3 orbDisplacedNormal(vec3 p, float amount, out vec3 displaced) {
  vec3 unit = normalize(p);
  vec3 tangent = orbTangent(unit);
  vec3 bitangent = cross(unit, tangent);
  const float epsilon = 0.045;

  displaced = orbDisplace(unit, amount);
  vec3 alongTangent = orbDisplace(normalize(unit + tangent * epsilon), amount);
  vec3 alongBitangent = orbDisplace(normalize(unit + bitangent * epsilon), amount);

  return normalize(cross(alongTangent - displaced, alongBitangent - displaced));
}
`;
