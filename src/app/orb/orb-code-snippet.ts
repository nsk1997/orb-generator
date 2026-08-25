import { orbNoiseChunk, orbDisplacementChunk, orbLoopSpan } from "./orb-shader-chunks";
import type { OrbParams } from "./orb-params";

/** Matches the live renderer: glass stays light, attenuation carries colour. */
function lightenTowardWhite(hex: string, amount: number): string {
  const channel = (offset: number): string => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16);
    const mixed = Math.round(value + (255 - value) * amount);
    return mixed.toString(16).padStart(2, "0").toUpperCase();
  };

  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

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
  options: Readonly<{ backgroundColor: string; viewDistance: number }>,
): string {
  const vertexPreamble = `${orbNoiseChunk}\n${orbDisplacementChunk}`.trim();
  const glassTint = lightenTowardWhite(params.primaryColor, 0.55);

  return `// Orb generated with the Orb Generator.
// npm i three @react-three/fiber @react-three/drei
import { useMemo, useRef, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";

const ORB_LOOP_SPAN = ${orbLoopSpan};

const ORB = {
  chromaticAberration: ${round(params.chromaticAberration)},
  coreColor: "${params.coreColor}",
  distortion: ${round(params.distortion)},
  flowSpeed: ${round(params.flowSpeed)},
  glowIntensity: ${round(params.glowIntensity)},
  glowSpread: ${round(params.glowSpread)},
  ior: ${round(params.ior)},
  glassTint: "${glassTint}",
  primaryColor: "${params.primaryColor}",
  roughness: ${round(params.roughness)},
};

const ORB_VERTEX_PREAMBLE = \`
${vertexPreamble}
\`;

const ORB_LAYER_VERTEX = \`\${ORB_VERTEX_PREAMBLE}
varying vec3 vOrbNormal;
varying vec3 vOrbView;
void main() {
  vec3 displaced;
  vec3 normalObject = orbDisplacedNormal(position, orbDistortion, displaced);
  vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
  vOrbNormal = normalize(normalMatrix * normalObject);
  vOrbView = normalize(-viewPosition.xyz);
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

const ORB_CORE_FRAGMENT = \`
uniform vec3 orbCoreColor;
uniform float orbCoreIntensity;
varying vec3 vOrbNormal;
varying vec3 vOrbView;
void main() {
  float facing = clamp(abs(dot(normalize(vOrbNormal), normalize(vOrbView))), 0.0, 1.0);
  float hot = pow(facing, 1.7);
  vec3 plasma = mix(orbCoreColor * 0.28, orbCoreColor * 1.75, hot);
  gl_FragColor = vec4(plasma * orbCoreIntensity, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}\`;

function useDisplacementUniforms(scale, distortion) {
  return useMemo(
    () => ({
      orbDistortion: { value: distortion },
      orbFlow: { value: 0 },
      orbScale: { value: scale },
    }),
    [distortion, scale],
  );
}

function Orb() {
  const bodyUniforms = useDisplacementUniforms(1, ORB.distortion);
  const coreUniforms = useDisplacementUniforms(0.42, ORB.distortion * 0.55);
  const phase = useRef(0);
  const halo = useRef(null);

  const attachBody = useCallback(
    (material) => {
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
    // Wrapped to the loop span so the surface returns to its start every
    // cycle; one cycle lasts ORB_LOOP_SPAN / flowSpeed seconds.
    phase.current = (phase.current + Math.min(delta, 1 / 20) * ORB.flowSpeed) % ORB_LOOP_SPAN;
    bodyUniforms.orbFlow.value = phase.current;
    coreUniforms.orbFlow.value = phase.current;
    if (halo.current) halo.current.quaternion.copy(camera.quaternion);
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
              orbDomeBottom: { value: new THREE.Color("#282A4A") },
              orbDomeHorizon: { value: new THREE.Color("#3C3F6B") },
              orbDomeTop: { value: new THREE.Color("#9AA1E0") },
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
                orbCardIntensity: { value: card.intensity },
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
          fragmentShader={ORB_CORE_FRAGMENT}
          transparent
          uniforms={{
            ...coreUniforms,
            orbCoreColor: { value: new THREE.Color(ORB.coreColor) },
            orbCoreIntensity: { value: 0.5 + ORB.glowIntensity * 0.28 },
          }}
          vertexShader={ORB_LAYER_VERTEX}
        />
      </mesh>

      <mesh renderOrder={1}>
        <icosahedronGeometry args={[1, 24]} />
        <MeshTransmissionMaterial
          anisotropicBlur={0.4}
          attenuationColor={ORB.primaryColor}
          attenuationDistance={2.6}
          clearcoat={1}
          clearcoatRoughness={0.06}
          iridescence={0.22}
          iridescenceIOR={1.35}
          iridescenceThicknessRange={[120, 560]}
          backside
          backsideThickness={0.22}
          chromaticAberration={ORB.chromaticAberration}
          color={ORB.glassTint}
          distortion={0.06}
          distortionScale={0.5}
          envMapIntensity={2}
          ior={ORB.ior}
          ref={attachBody}
          resolution={512}
          roughness={ORB.roughness}
          samples={8}
          temporalDistortion={0.02}
          thickness={0.62}
          transmission={1}
        />
      </mesh>

      <mesh ref={halo} renderOrder={-1}>
        <planeGeometry args={[4.2, 4.2]} />
        <shaderMaterial
          blending={THREE.AdditiveBlending}
          depthTest={false}
          depthWrite={false}
          fragmentShader={ORB_GLOW_FRAGMENT}
          side={THREE.DoubleSide}
          transparent
          uniforms={{
            orbGlowColor: { value: new THREE.Color(ORB.primaryColor) },
            orbGlowIntensity: { value: ORB.glowIntensity },
            orbGlowSpread: { value: ORB.glowSpread },
          }}
          vertexShader={ORB_GLOW_VERTEX}
        />
      </mesh>
    </>
  );
}

export default function OrbScene() {
  return (
    <Canvas
      camera={{ far: 40, fov: 30, near: 0.1, position: [0, 0, ${round(options.viewDistance, 2)}] }}
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ background: "${options.backgroundColor}" }}
    >
      <Orb />
    </Canvas>
  );
}
`;
}
