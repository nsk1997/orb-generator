import {
  orbAuroraFragmentShader,
  orbNebulaFragmentShader,
} from "./orb-materials";
import { orbBaseFov } from "./orb-framing";
import { orbGlassTintHex } from "./orb-materials";
import { orbNoiseChunk, orbDisplacementChunk, orbLoopSpan } from "./orb-shader-chunks";
import type { OrbParams } from "./orb-params";
import {
  orbParamRanges,
  orbStateDeltas,
  orbStateOrder,
  resolveOrbPreset,
  type OrbStateId,
  type OrbStyle,
} from "./orb-styles";
import {
  easeFor,
  orbTransitionEnvelope,
  orbTransitionFormKeys,
  orbTransitionMorph,
} from "./orb-transition";

/** The scalars a state moves. Colours belong to the style, not the state. */
const orbSnippetScalarKeys = [
  "chromaticAberration",
  "distortion",
  "flowSpeed",
  "glowIntensity",
  "glowSpread",
  "ior",
  "roughness",
] as const;

type OrbSnippetScalarKey = (typeof orbSnippetScalarKeys)[number];

/**
 * Resolves all four states against the values that were on screen when the
 * user copied.
 *
 * The copied params are whatever the sliders held, which may be nowhere near
 * the preset. Carrying that difference across as an offset means a pasted orb
 * switching to Think keeps the look the user tuned instead of snapping back to
 * the shipped preset. The copied state reproduces exactly, by construction.
 */
export function createOrbSnippetStates(
  params: OrbParams,
  styleId: OrbStyle["id"],
  stateId: OrbStateId,
): Record<OrbStateId, Record<string, number>> {
  const copiedPreset = resolveOrbPreset(styleId, stateId);
  const offsets = Object.fromEntries(
    orbSnippetScalarKeys.map((key) => [key, params[key] - copiedPreset[key]]),
  ) as Record<OrbSnippetScalarKey, number>;

  return Object.fromEntries(
    orbStateOrder.map((id) => {
      const preset = resolveOrbPreset(styleId, id);
      const scalars = orbSnippetScalarKeys.map((key) => {
        const [min, max] = orbParamRanges[key];
        return [key, Math.min(max, Math.max(min, preset[key] + offsets[key]))];
      });

      return [id, { ...orbStateDeltas[id].form, ...Object.fromEntries(scalars) }];
    }),
  ) as Record<OrbStateId, Record<string, number>>;
}

/**
 * The emissive interior, as a value rather than inline text, so a style that
 * raymarches a volume instead can swap the whole fragment stage.
 */
const orbCoreFragmentSource = /* glsl */ `
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

function round(value: number, places = 3): string {
  return Number(value.toFixed(places)).toString();
}

/**
 * Emits a self-contained React Three Fiber component that reproduces the
 * current orb, including the vertex displacement that Drei's transmission
 * material does not ship with.
 */
export function createOrbCodeSnippet(
  params: OrbParams,
  options: Readonly<{
    backgroundColor: string;
    stateId: OrbStateId;
    style: OrbStyle;
    viewDistance: number;
  }>,
): string {
  const { stateId, style } = options;
  const { interior, material, studio } = style;
  const states = createOrbSnippetStates(params, style.id, stateId);
  const form = orbStateDeltas[stateId].form;
  // The shape role carries the scalars too. The snippet has no sliders, so
  // nothing is mid-drag and every value can ride the transition; keeping them
  // off the overshooting motion tween avoids pushing a bounded scalar out of
  // its range on the way to a lower target.
  const morphKeys = {
    motion: [...orbTransitionFormKeys.motion],
    shape: [...orbTransitionFormKeys.shape, ...orbSnippetScalarKeys].filter(
      (key) => key !== "ridge",
    ),
  } as const;
  const vertexPreamble = `${orbNoiseChunk}\n${orbDisplacementChunk}`.trim();
  const glassTint = orbGlassTintHex(params.primaryColor, style.tintLift);
  // A volume interior is a whole fragment stage, not a parameter, so the two
  // interiors are emitted as alternatives rather than as one shader with a
  // dead branch in it.
  const interiorFragment = {
    aurora: orbAuroraFragmentShader,
    core: orbCoreFragmentSource,
    nebula: orbNebulaFragmentShader,
  }[interior.kind];
  const interiorUniforms =
    interior.kind === "nebula"
      ? `\n            orbNebulaDensity: { value: ${interior.density} },`
      : interior.kind === "aurora"
        ? `\n            orbAuroraSpread: { value: ${interior.spread} },` +
          `\n            orbAuroraTint: { value: new THREE.Color(ORB.primaryColor) },`
        : "";

  return `// Orb generated with the Orb Generator.
// npm i three @react-three/fiber @react-three/drei @react-three/postprocessing postprocessing gsap
import { useCallback, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, MeshTransmissionMaterial } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";

const ORB_LOOP_SPAN = ${orbLoopSpan};
const ORB_BASE_FOV = ${orbBaseFov};

/**
 * A perspective camera measures its field of view vertically, so a fixed fov
 * holds the orb at a constant share of the frame's height and lets its share
 * of the width run wherever the container's shape puts it. Widening the field
 * on a portrait frame pins the horizontal field instead, which keeps the orb
 * at the same share of whichever side is shorter.
 */
function orbFovForAspect(aspect) {
  if (!Number.isFinite(aspect) || aspect <= 0 || aspect >= 1) return ORB_BASE_FOV;
  return THREE.MathUtils.radToDeg(
    2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(ORB_BASE_FOV) / 2) / aspect),
  );
}

const ORB = {
  bloomIntensityScale: ${style.bloom.intensity},
  bloomRadius: ${style.bloom.radius},
  bloomThreshold: ${style.bloom.threshold},
  coreColor: "${params.coreColor}",
  glassTint: "${glassTint}",
  primaryColor: "${params.primaryColor}",
  ridge: ${style.ridge},
  style: "${style.id}",
};

// Every state the generator offers, resolved against the values that were on
// screen when this was copied. Pass one as the \`state\` prop and the orb
// morphs to it with the same choreography the generator uses.
const ORB_STATES = {
${orbStateOrder
  .map(
    (id) =>
      `  ${id}: { ${Object.entries(states[id])
        .map(([key, value]) => `${key}: ${round(value)}`)
        .join(", ")} },`,
  )
  .join("\n")}
};

const ORB_DEFAULT_STATE = "${stateId}";
const ORB_INITIAL = ORB_STATES[ORB_DEFAULT_STATE];

// Timing lifted straight from the generator, so a pasted orb moves like the
// one it was copied from. Shape settles first; the forms that read as motion
// arrive after it, with a little overshoot.
const ORB_TRANSITION_MORPH = [
${orbTransitionMorph
  .map(
    (step) =>
      `  { at: ${round(step.atSeconds * style.motion.durationScale, 4)}, duration: ${round(
        step.durationSeconds * style.motion.durationScale,
        4,
      )}, ease: "${easeFor(step.role, style.motion)}", keys: [${morphKeys[
        step.role
      ]
        .map((key) => `"${key}"`)
        .join(", ")}] },`,
  )
  .join("\n")}
];

// Light leads, geometry follows. The fast rise and slow fall is what makes a
// state change land as an event rather than a crossfade.
const ORB_TRANSITION_ENVELOPE = [
${orbTransitionEnvelope
  .map(
    (step) =>
      `  { at: ${round(step.atSeconds * style.motion.durationScale, 4)}, duration: ${round(
        step.durationSeconds * style.motion.durationScale,
        4,
      )}, ease: "${step.ease}", from: ${step.from}, key: "${step.key}", to: ${step.to} },`,
  )
  .join("\n")}
];

/**
 * Every tween pins both endpoints. A plain to() records its start value the
 * first time it renders, so a timeline seeked backwards then forwards resolves
 * differently than one played straight through; pinning both ends makes this a
 * function of time alone. It is never played, only seeked.
 */
function createOrbTransition(from, to) {
  const values = { ...from, transientFollow: 0, transientLead: 0 };
  const timeline = gsap.timeline({ paused: true });

  ORB_TRANSITION_MORPH.forEach((step, index) => {
    const pick = (source) =>
      Object.fromEntries(step.keys.map((key) => [key, source[key]]));

    timeline.fromTo(
      values,
      pick(from),
      { ...pick(to), duration: step.duration, ease: step.ease, immediateRender: index === 0 },
      step.at,
    );
  });

  for (const step of ORB_TRANSITION_ENVELOPE) {
    timeline.fromTo(
      values,
      { [step.key]: step.from },
      { [step.key]: step.to, duration: step.duration, ease: step.ease, immediateRender: false },
      step.at,
    );
  }

  const duration = timeline.duration();

  return {
    duration,
    kill: () => timeline.kill(),
    sampleAt: (seconds) => {
      timeline.time(Math.min(Math.max(seconds, 0), duration), true);
      return values;
    },
  };
}

const ORB_VERTEX_PREAMBLE = \`
${vertexPreamble}
\`;

const ORB_LAYER_VERTEX = \`\${ORB_VERTEX_PREAMBLE}
varying vec3 vOrbNormal;
varying vec3 vOrbView;
varying vec3 vOrbWorld;
void main() {
  vec3 displaced;
  vec3 normalObject = orbDisplacedNormal(position, orbDistortion, displaced);
  vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
  vOrbNormal = normalize(normalMatrix * normalObject);
  vOrbView = normalize(-viewPosition.xyz);
  vOrbWorld = (modelMatrix * vec4(displaced, 1.0)).xyz;
  gl_Position = projectionMatrix * viewPosition;
}\`;

const ORB_GLOW_VERTEX = \`
varying vec2 vOrbHaloUv;
void main() {
  vOrbHaloUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}\`;

const ORB_GLOW_FRAGMENT = \`
uniform vec3 orbGlowColor;
uniform float orbGlowIntensity;
uniform float orbGlowSpread;
varying vec2 vOrbHaloUv;
void main() {
  float radius = length(vOrbHaloUv - 0.5) * 2.0;
  // The orb hides the middle on screen, but the transmission sampler still
  // reads it, so a solid disc would blow out the whole interior.
  float ring = smoothstep(0.2, 0.58, radius);
  float falloff = pow(clamp(1.0 - radius, 0.0, 1.0), orbGlowSpread);
  gl_FragColor = vec4(orbGlowColor * ring * falloff * orbGlowIntensity, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}\`;

const ORB_DOME_FRAGMENT = \`
uniform vec3 orbDomeTop;
uniform vec3 orbDomeHorizon;
uniform vec3 orbDomeBottom;
varying vec3 vOrbDomeDirection;
void main() {
  float height = normalize(vOrbDomeDirection).y;
  vec3 sky = mix(orbDomeHorizon, orbDomeTop, smoothstep(0.0, 0.75, height));
  vec3 ground = mix(orbDomeHorizon, orbDomeBottom, smoothstep(0.0, -0.6, height));
  gl_FragColor = vec4(height >= 0.0 ? sky : ground, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}\`;

const ORB_DOME_VERTEX = \`
varying vec3 vOrbDomeDirection;
void main() {
  vOrbDomeDirection = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}\`;

// Soft-edged studio panels. Hard-edged light quads reflect in near-mirror
// glass as shards, so the falloff matters as much as the placement.
const ORB_CARD_FRAGMENT = \`
uniform vec3 orbCardColor;
uniform float orbCardIntensity;
uniform float orbCardSoftness;
varying vec2 vOrbCardUv;
void main() {
  float radius = length((vOrbCardUv - 0.5) * 2.0);
  float falloff = pow(clamp(1.0 - radius, 0.0, 1.0), orbCardSoftness);
  gl_FragColor = vec4(orbCardColor * orbCardIntensity * falloff, 1.0);
}\`;

const ORB_CARD_VERTEX = \`
varying vec2 vOrbCardUv;
void main() {
  vOrbCardUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}\`;

const ORB_LIGHT_CARDS = [
  { color: "#FFFFFF", intensity: 16, position: [0, 7, -1.5], rotation: [Math.PI / 2, 0, 0], scale: [16, 12, 1], softness: 1.6 },
  { color: "#9FB6FF", intensity: 9, position: [-8, 1.5, 2], rotation: [0, Math.PI / 2, 0], scale: [12, 12, 1], softness: 2.2 },
  { color: "#FFA9D6", intensity: 6, position: [7.5, -1, 3], rotation: [0, -Math.PI / 2, 0], scale: [10, 10, 1], softness: 2.4 },
  { color: "#8AF2E4", intensity: 4, position: [1.5, -6.5, 3], rotation: [-Math.PI / 2, 0, 0], scale: [12, 9, 1], softness: 2.6 },
  { color: "#FFFFFF", intensity: 5, position: [-2, 2, 9], rotation: [0, 0, 0], scale: [7, 7, 1], softness: 3 },
  { color: "#FFFFFF", intensity: 60, position: [-3.4, 3.6, 5.5], rotation: [0, 0, 0], scale: [2.2, 2.2, 1], softness: 2 },
];

const ORB_INTERIOR_FRAGMENT = \`
${interiorFragment.trim()}
\`;

function useDisplacementUniforms(scale) {
  // Created once and written every frame: the state prop moves these, so a
  // memo keyed on their values would rebuild the material mid-transition.
  return useMemo(
    () => ({
      orbCalm: { value: ORB_INITIAL.calm },
      orbDistortion: { value: ORB_INITIAL.distortion },
      orbFlow: { value: 0 },
      orbPulse: { value: ORB_INITIAL.pulse },
      orbRidge: { value: ORB.ridge },
      orbScale: { value: scale },
      orbSweep: { value: ORB_INITIAL.sweep },
      orbSwirl: { value: ORB_INITIAL.swirl },
    }),
    [scale],
  );
}

function Orb({ bloom, state }) {
  const bodyUniforms = useDisplacementUniforms(1);
  const coreUniforms = useDisplacementUniforms(${style.coreScale});
  const glowUniforms = useMemo(
    () => ({
      orbGlowColor: { value: new THREE.Color(ORB.primaryColor) },
      orbGlowIntensity: { value: ORB_INITIAL.glowIntensity },
      orbGlowSpread: { value: ORB_INITIAL.glowSpread },
    }),
    [],
  );
  const interiorUniforms = useMemo(
    () => ({
      ...coreUniforms,
      orbCoreColor: { value: new THREE.Color(ORB.coreColor) },
      orbCoreIntensity: { value: (0.5 + ORB_INITIAL.glowIntensity * 0.28) * ${style.coreIntensityScale} },${interiorUniforms}
    }),
    [coreUniforms],
  );
  // Drei's transmission sampler renders the main scene, which holds no sky.
  // Handing it the environment probe is what turns refraction from a
  // shattered black mirror into glass.
  const scene = useThree((three) => three.scene);
  const [environment, setEnvironment] = useState(null);
  const phase = useRef(0);
  const halo = useRef(null);
  const body = useRef(null);
  const shown = useRef({ ...ORB_INITIAL, transientFollow: 0, transientLead: 0 });
  const transition = useRef(null);
  const elapsed = useRef(0);
  const lastState = useRef(ORB_DEFAULT_STATE);

  const attachBody = useCallback(
    (material) => {
      body.current = material;
      if (!material || material.userData.orbPatched) return;
      const inherited = material.onBeforeCompile.bind(material);
      material.onBeforeCompile = (shader, renderer) => {
        inherited(shader, renderer);
        Object.assign(shader.uniforms, bodyUniforms);
        shader.vertexShader = ORB_VERTEX_PREAMBLE + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <beginnormal_vertex>",
          "vec3 orbSurfacePosition;\\n vec3 objectNormal = orbDisplacedNormal(position, orbDistortion, orbSurfacePosition);",
        );
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          "vec3 transformed = orbSurfacePosition;",
        );
      };
      material.customProgramCacheKey = () => "orb-displaced-transmission";
      material.userData.orbPatched = true;
      material.needsUpdate = true;
    },
    [bodyUniforms],
  );

  useFrame(({ camera }, delta) => {
    const step = Math.min(delta, 1 / 20);
    if (scene.environment && scene.environment !== environment) {
      setEnvironment(scene.environment);
    }

    if (lastState.current !== state && ORB_STATES[state]) {
      lastState.current = state;
      transition.current?.kill();
      transition.current = createOrbTransition(shown.current, ORB_STATES[state]);
      elapsed.current = 0;
    }

    const active = transition.current;
    if (active) {
      elapsed.current = Math.min(elapsed.current + step, active.duration);
      Object.assign(shown.current, active.sampleAt(elapsed.current));
    }

    const shape = shown.current;
    // Integrating speed keeps the surface continuous when a state changes it,
    // and wrapping to the loop span gives every layer one shared cycle to
    // return to; one cycle lasts ORB_LOOP_SPAN / flowSpeed seconds.
    phase.current = (phase.current + step * shape.flowSpeed) % ORB_LOOP_SPAN;
    const distortion = shape.distortion + 0.1 * shape.transientFollow;

    bodyUniforms.orbCalm.value = shape.calm;
    bodyUniforms.orbDistortion.value = distortion;
    bodyUniforms.orbFlow.value = phase.current;
    bodyUniforms.orbPulse.value = shape.pulse;
    bodyUniforms.orbSweep.value = shape.sweep;
    bodyUniforms.orbSwirl.value = shape.swirl;

    coreUniforms.orbCalm.value = shape.calm;
    // The core can churn inside a still shell, which is what Think looks like.
    coreUniforms.orbDistortion.value = distortion * 0.55 * shape.coreAgitation;
    coreUniforms.orbFlow.value = phase.current;
    coreUniforms.orbPulse.value = shape.pulse;
    // Sweep reaches the interior only where the interior draws with it.
    coreUniforms.orbSweep.value = ${interior.kind === "aurora" ? "shape.sweep" : "0"};
    coreUniforms.orbSwirl.value = shape.swirl;

    interiorUniforms.orbCoreIntensity.value =
      (0.5 + shape.glowIntensity * 0.28) * ${style.coreIntensityScale};
    glowUniforms.orbGlowIntensity.value =
      shape.glowIntensity + 0.25 * shape.transientLead;
    glowUniforms.orbGlowSpread.value = shape.glowSpread;

    if (body.current) {
      body.current.chromaticAberration = shape.chromaticAberration;
      body.current.ior = shape.ior;
      body.current.roughness = shape.roughness;
    }
    // Glow already means "how much light escapes", so it scales bloom too.
    if (bloom.current) {
      bloom.current.intensity =
        ORB.bloomIntensityScale * (0.55 + shape.glowIntensity * 0.45) +
        0.3 * shape.transientLead;
    }
    if (halo.current) halo.current.quaternion.copy(camera.quaternion);

    const framedFov = orbFovForAspect(camera.aspect);
    if (camera.fov !== framedFov) {
      camera.fov = framedFov;
      camera.updateProjectionMatrix();
    }
  });

  return (
    <>
      <ambientLight intensity={0.08} />
      <Environment frames={1} resolution={256}>
        <mesh scale={60}>
          <sphereGeometry args={[1, 32, 24]} />
          <shaderMaterial
            depthWrite={false}
            fragmentShader={ORB_DOME_FRAGMENT}
            side={THREE.BackSide}
            uniforms={{
              orbDomeBottom: { value: new THREE.Color("${studio.domeBottom}") },
              orbDomeHorizon: { value: new THREE.Color("${studio.domeHorizon}") },
              orbDomeTop: { value: new THREE.Color("${studio.domeTop}") },
            }}
            vertexShader={ORB_DOME_VERTEX}
          />
        </mesh>
        {ORB_LIGHT_CARDS.map((card, index) => (
          <mesh key={index} position={card.position} rotation={card.rotation} scale={card.scale}>
            <planeGeometry args={[1, 1]} />
            <shaderMaterial
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              fragmentShader={ORB_CARD_FRAGMENT}
              side={THREE.DoubleSide}
              toneMapped={false}
              transparent
              uniforms={{
                orbCardColor: { value: new THREE.Color(card.color) },
                orbCardIntensity: { value: card.intensity * ${studio.cardIntensityScale} },
                orbCardSoftness: { value: card.softness },
              }}
              vertexShader={ORB_CARD_VERTEX}
            />
          </mesh>
        ))}
      </Environment>

      <mesh renderOrder={0}>
        <icosahedronGeometry args={[1, 10]} />
        <shaderMaterial
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fragmentShader={ORB_INTERIOR_FRAGMENT}
          transparent
          uniforms={interiorUniforms}
          vertexShader={ORB_LAYER_VERTEX}
        />
      </mesh>

      <mesh renderOrder={1}>
        <icosahedronGeometry args={[1, ${style.shell.detail}]} />
        <MeshTransmissionMaterial
          anisotropicBlur={${material.anisotropicBlur}}
          attenuationColor={ORB.primaryColor}
          attenuationDistance={${material.attenuationDistance}}
          background={environment ?? undefined}
          clearcoat={${material.clearcoat}}
          clearcoatRoughness={${material.clearcoatRoughness}}
          iridescence={${material.iridescence}}
          iridescenceIOR={${material.iridescenceIOR}}
          iridescenceThicknessRange={[${material.iridescenceThicknessRange[0]}, ${material.iridescenceThicknessRange[1]}]}
          backside={${material.transmission > 0}}
          backsideThickness={${material.backsideThickness}}
          chromaticAberration={ORB_INITIAL.chromaticAberration}
          color={ORB.glassTint}
          distortion={0.06}
          distortionScale={0.5}
          envMapIntensity={${material.envMapIntensity}}
          flatShading={${style.shell.flatShading}}
          metalness={${material.metalness}}
          ior={ORB_INITIAL.ior}
          ref={attachBody}
          resolution={1024}
          roughness={ORB_INITIAL.roughness}
          samples={${material.samples}}
          temporalDistortion={0.02}
          thickness={${material.thickness}}
          transmission={${material.transmission}}
        />
      </mesh>

      <mesh ref={halo} renderOrder={-1}>
        <planeGeometry args={[${style.haloSize}, ${style.haloSize}]} />
        <shaderMaterial
          blending={THREE.AdditiveBlending}
          depthTest={false}
          depthWrite={false}
          fragmentShader={ORB_GLOW_FRAGMENT}
          side={THREE.DoubleSide}
          transparent
          uniforms={glowUniforms}
          vertexShader={ORB_GLOW_VERTEX}
        />
      </mesh>
    </>
  );
}

// Drive the orb from your own app: <OrbScene state={isThinking ? "think" : "idle"} />
export default function OrbScene({ state = ORB_DEFAULT_STATE }) {
  const bloom = useRef(null);

  return (
    <Canvas
      camera={{ far: 40, fov: ORB_BASE_FOV, near: 0.1, position: [0, 0, ${round(options.viewDistance, 2)}] }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      // The background is cleared inside WebGL rather than set in CSS. The halo
      // is additive and writes alpha 1, so on any style whose halo reaches the
      // frame edge a CSS background is masked out and the orb sits on black.
      onCreated={({ gl }) => gl.setClearColor("${options.backgroundColor}", 1)}
      style={{ background: "${options.backgroundColor}" }}
    >
      <Orb bloom={bloom} state={state} />
      <EffectComposer>
        <Bloom
          intensity={ORB.bloomIntensityScale * (0.55 + ORB_INITIAL.glowIntensity * 0.45)}
          luminanceSmoothing={0.25}
          luminanceThreshold={ORB.bloomThreshold}
          mipmapBlur
          radius={ORB.bloomRadius}
          ref={bloom}
        />
      </EffectComposer>
    </Canvas>
  );
}
`;
}
