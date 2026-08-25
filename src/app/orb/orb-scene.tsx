import * as React from "react";
import { Environment } from "@react-three/drei";
import { MeshTransmissionMaterial } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  MathUtils,
  Mesh,
  PerspectiveCamera,
  Vector2,
  Vector3,
  type Texture,
  type MeshPhysicalMaterial,
  type WebGLProgramParametersWithUniforms,
} from "three";

import {
  applyOrbDisplacementToShader,
  createOrbCoreMaterial,
  createOrbDomeMaterial,
  createOrbGlowMaterial,
  createOrbLightCardMaterial,
  type OrbDisplacementUniforms,
} from "./orb-materials";
import { registerOrbFrameRenderer } from "./orb-export-registry";
import { orbDefaults, orbViewDistanceDefault, type OrbParams } from "./orb-params";

export type OrbViewPose = {
  position: readonly [number, number, number];
  up: readonly [number, number, number];
};

export type OrbSceneInputs = {
  backgroundColor: string;
  includeBackground: boolean;
  params: OrbParams;
  pose: OrbViewPose;
  viewDistance: number;
};

export const orbSceneInputDefaults: OrbSceneInputs = {
  backgroundColor: "#0A0A12",
  includeBackground: true,
  params: orbDefaults,
  pose: { position: [0, 0, 5], up: [0, 1, 0] },
  viewDistance: orbViewDistanceDefault,
};

type OrbTransmissionMaterial = MeshPhysicalMaterial & {
  chromaticAberration: number;
  distortion: number;
  distortionScale: number;
  temporalDistortion: number;
  thickness: number;
  time: number;
};

/** How fast displayed values chase the panel values, per parameter family. */
const responseRates = {
  color: 5,
  motion: 3.2,
  surface: 4.5,
  view: 6,
} as const;

function useSmoothedColor(hex: string): Color {
  return React.useMemo(() => new Color(hex), [hex]);
}

export function OrbScene({
  inputsRef,
}: Readonly<{
  inputsRef: React.RefObject<OrbSceneInputs>;
}>): React.JSX.Element {
  const bodyMaterialRef = React.useRef<OrbTransmissionMaterial | null>(null);
  const bodyUniforms = React.useRef<OrbDisplacementUniforms | null>(null);

  const glowMaterial = React.useMemo(() => createOrbGlowMaterial(), []);
  const coreMaterial = React.useMemo(() => createOrbCoreMaterial(0.34), []);

  const bodyRef = React.useRef<Mesh | null>(null);
  const haloRef = React.useRef<Mesh | null>(null);

  // Drei's transmission sampler renders the main scene, which holds no sky.
  // Handing it the environment probe is what turns refraction from a
  // shattered black mirror into glass.
  const scene = useThree((three) => three.scene);
  const [environmentMap, setEnvironmentMap] = React.useState<Texture | null>(null);

  // Displayed state. Panel values are targets; these chase them every frame.
  const shown = React.useRef({
    chromaticAberration: orbDefaults.chromaticAberration,
    distortion: orbDefaults.distortion,
    flowPhase: 0,
    flowSpeed: orbDefaults.flowSpeed,
    glowIntensity: orbDefaults.glowIntensity,
    glowSpread: orbDefaults.glowSpread,
    ior: orbDefaults.ior,
    roughness: orbDefaults.roughness,
    viewDistance: orbViewDistanceDefault,
  });
  const whitePoint = useSmoothedColor("#FFFFFF");
  const shownPrimary = useSmoothedColor(orbDefaults.primaryColor);
  const shownCore = useSmoothedColor(orbDefaults.coreColor);
  const targetPrimary = useSmoothedColor(orbDefaults.primaryColor);
  const targetCore = useSmoothedColor(orbDefaults.coreColor);
  const glassTint = React.useMemo(() => new Color(), []);
  const cameraTarget = React.useMemo(() => new Vector3(0, 0, 1), []);
  const cameraUp = React.useMemo(() => new Vector3(0, 1, 0), []);

  React.useEffect(() => {
    return () => {
      glowMaterial.dispose();
      coreMaterial.dispose();
    };
  }, [coreMaterial, glowMaterial]);

  const attachBodyMaterial = React.useCallback(
    (material: OrbTransmissionMaterial | null) => {
      bodyMaterialRef.current = material;

      if (!material || bodyUniforms.current) {
        return;
      }

      const uniforms: OrbDisplacementUniforms = {
        orbDistortion: { value: orbDefaults.distortion },
        orbFlow: { value: 0 },
        orbScale: { value: 1 },
      };
      const inherited = material.onBeforeCompile.bind(material);

      material.onBeforeCompile = (
        shader: WebGLProgramParametersWithUniforms,
        renderer,
      ) => {
        inherited(shader, renderer);
        applyOrbDisplacementToShader(shader, uniforms);
      };
      material.customProgramCacheKey = () => "orb-displaced-transmission";
      material.needsUpdate = true;
      bodyUniforms.current = uniforms;
    },
    [],
  );

  useFrame(({ camera }, delta) => {
    if (scene.environment && scene.environment !== environmentMap) {
      setEnvironmentMap(scene.environment);
    }

    const inputs = inputsRef.current ?? orbSceneInputDefaults;
    const { params } = inputs;
    const state = shown.current;
    const step = Math.min(delta, 1 / 20);

    state.chromaticAberration = MathUtils.damp(
      state.chromaticAberration,
      params.chromaticAberration,
      responseRates.surface,
      step,
    );
    state.distortion = MathUtils.damp(
      state.distortion,
      params.distortion,
      responseRates.motion,
      step,
    );
    state.flowSpeed = MathUtils.damp(
      state.flowSpeed,
      params.flowSpeed,
      responseRates.motion,
      step,
    );
    state.glowIntensity = MathUtils.damp(
      state.glowIntensity,
      params.glowIntensity,
      responseRates.surface,
      step,
    );
    state.glowSpread = MathUtils.damp(
      state.glowSpread,
      params.glowSpread,
      responseRates.surface,
      step,
    );
    state.ior = MathUtils.damp(state.ior, params.ior, responseRates.surface, step);
    state.roughness = MathUtils.damp(
      state.roughness,
      params.roughness,
      responseRates.surface,
      step,
    );
    state.viewDistance = MathUtils.damp(
      state.viewDistance,
      inputs.viewDistance,
      responseRates.view,
      step,
    );

    // Integrating speed keeps the surface continuous when speed changes.
    state.flowPhase += step * state.flowSpeed;

    targetPrimary.set(params.primaryColor);
    targetCore.set(params.coreColor);
    shownPrimary.lerp(targetPrimary, 1 - Math.exp(-responseRates.color * step));
    shownCore.lerp(targetCore, 1 - Math.exp(-responseRates.color * step));

    const body = bodyMaterialRef.current;
    if (body) {
      body.ior = state.ior;
      body.roughness = state.roughness;
      body.chromaticAberration = state.chromaticAberration;
      // A lightened primary keeps transmitted light luminous while volume
      // attenuation carries the saturated colour through the thick middle.
      glassTint.copy(shownPrimary).lerp(whitePoint, 0.55);
      body.color.copy(glassTint);
      body.attenuationColor.copy(shownPrimary);
      body.time = state.flowPhase;
    }
    if (bodyUniforms.current) {
      bodyUniforms.current.orbDistortion.value = state.distortion;
      bodyUniforms.current.orbFlow.value = state.flowPhase;
    }

    glowMaterial.uniforms.orbGlowColor.value.copy(shownPrimary);
    glowMaterial.uniforms.orbGlowIntensity.value = state.glowIntensity;
    glowMaterial.uniforms.orbGlowSpread.value = state.glowSpread;

    coreMaterial.uniforms.orbDistortion.value = state.distortion * 0.55;
    coreMaterial.uniforms.orbFlow.value = state.flowPhase * 1.35;
    coreMaterial.uniforms.orbCoreColor.value.copy(shownCore);
    coreMaterial.uniforms.orbCoreIntensity.value =
      0.5 + state.glowIntensity * 0.28;

    const pose = inputs.pose;
    cameraTarget.set(pose.position[0], pose.position[1], pose.position[2]);
    if (cameraTarget.lengthSq() < 1e-6) {
      cameraTarget.set(0, 0, 1);
    }
    cameraTarget.normalize().multiplyScalar(state.viewDistance);
    cameraUp.set(pose.up[0], pose.up[1], pose.up[2]);

    camera.position.lerp(cameraTarget, 1 - Math.exp(-responseRates.view * step));
    camera.up.copy(cameraUp);
    camera.lookAt(0, 0, 0);

    if (bodyRef.current) {
      bodyRef.current.rotation.y = state.flowPhase * 0.08;
    }
    if (haloRef.current) {
      haloRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <>
      <StudioEnvironment />
      <mesh material={coreMaterial} renderOrder={0}>
        <icosahedronGeometry args={[1, 10]} />
      </mesh>
      <mesh ref={bodyRef} renderOrder={1}>
        <icosahedronGeometry args={[1, 24]} />
        <MeshTransmissionMaterial
          anisotropicBlur={0.4}
          background={environmentMap ?? undefined}
          attenuationDistance={2.6}
          backside
          backsideThickness={0.22}
          chromaticAberration={orbDefaults.chromaticAberration}
          distortion={0.06}
          distortionScale={0.5}
          envMapIntensity={2}
          ior={orbDefaults.ior}
          clearcoat={1}
          clearcoatRoughness={0.06}
          iridescence={0.22}
          iridescenceIOR={1.35}
          iridescenceThicknessRange={[120, 560]}
          ref={attachBodyMaterial as never}
          resolution={1024}
          roughness={orbDefaults.roughness}
          samples={10}
          temporalDistortion={0.02}
          thickness={0.62}
          transmission={1}
        />
      </mesh>
      <mesh material={glowMaterial} ref={haloRef} renderOrder={-1}>
        <planeGeometry args={[4.2, 4.2]} />
      </mesh>
    </>
  );
}

type OrbLightCard = {
  color: string;
  intensity: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  softness: number;
};

const orbLightCards: readonly OrbLightCard[] = [
  {
    color: "#FFFFFF",
    intensity: 16,
    position: [0, 7, -1.5],
    rotation: [Math.PI / 2, 0, 0],
    scale: [16, 12, 1],
    softness: 1.6,
  },
  {
    color: "#9FB6FF",
    intensity: 9,
    position: [-8, 1.5, 2],
    rotation: [0, Math.PI / 2, 0],
    scale: [12, 12, 1],
    softness: 2.2,
  },
  {
    color: "#FFA9D6",
    intensity: 6,
    position: [7.5, -1, 3],
    rotation: [0, -Math.PI / 2, 0],
    scale: [10, 10, 1],
    softness: 2.4,
  },
  {
    color: "#8AF2E4",
    intensity: 4,
    position: [1.5, -6.5, 3],
    rotation: [-Math.PI / 2, 0, 0],
    scale: [12, 9, 1],
    softness: 2.6,
  },
  {
    color: "#FFFFFF",
    intensity: 5,
    position: [-2, 2, 9],
    rotation: [0, 0, 0],
    scale: [7, 7, 1],
    softness: 3,
  },
  // Small and very bright: the crisp specular that reads as a glass surface.
  {
    color: "#FFFFFF",
    intensity: 60,
    position: [-3.4, 3.6, 5.5],
    rotation: [0, 0, 0],
    scale: [2.2, 2.2, 1],
    softness: 2,
  },
];

function OrbLightPanel({
  card,
}: Readonly<{ card: OrbLightCard }>): React.JSX.Element {
  const material = React.useMemo(
    () => createOrbLightCardMaterial(card.color, card.intensity, card.softness),
    [card.color, card.intensity, card.softness],
  );

  React.useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh
      material={material}
      position={card.position}
      rotation={card.rotation}
      scale={card.scale}
    >
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

/**
 * A local studio built from soft light panels and a gradient dome. It never
 * fetches an HDR, so refraction highlights are identical offline and in export.
 */
function StudioEnvironment(): React.JSX.Element {
  const domeMaterial = React.useMemo(() => createOrbDomeMaterial(), []);

  React.useEffect(() => () => domeMaterial.dispose(), [domeMaterial]);

  return (
    <>
      <ambientLight intensity={0.08} />
      <Environment frames={1} resolution={256}>
        <mesh material={domeMaterial} scale={60}>
          <sphereGeometry args={[1, 32, 24]} />
        </mesh>
        {orbLightCards.map((card, index) => (
          <OrbLightPanel card={card} key={index} />
        ))}
      </Environment>
    </>
  );
}

/**
 * Keeps the WebGL clear colour in sync with the runtime background decision
 * and lends the live renderer to runtime-owned export.
 */
export function OrbCanvasBridge({
  inputsRef,
}: Readonly<{
  inputsRef: React.RefObject<OrbSceneInputs>;
}>): null {
  const gl = useThree((three) => three.gl);
  const scene = useThree((three) => three.scene);
  const camera = useThree((three) => three.camera);
  const clearColor = React.useMemo(() => new Color(), []);

  useFrame(() => {
    const inputs = inputsRef.current ?? orbSceneInputDefaults;
    clearColor.set(inputs.backgroundColor);
    gl.setClearColor(clearColor, inputs.includeBackground ? 1 : 0);
  });

  React.useEffect(() => {
    return registerOrbFrameRenderer((width, height) => {
      if (width < 1 || height < 1) {
        return null;
      }

      const perspective = camera as PerspectiveCamera;
      const previousSize = gl.getSize(new Vector2());
      const previousPixelRatio = gl.getPixelRatio();
      const previousAspect = perspective.aspect;
      const previousClear = new Color();
      gl.getClearColor(previousClear);
      const previousClearAlpha = gl.getClearAlpha();

      let snapshot: HTMLCanvasElement | null = null;

      try {
        gl.setPixelRatio(1);
        gl.setSize(width, height, false);
        gl.setClearColor(previousClear, 0);
        perspective.aspect = width / height;
        perspective.updateProjectionMatrix();
        gl.render(scene, camera);

        snapshot = document.createElement("canvas");
        snapshot.width = width;
        snapshot.height = height;
        snapshot.getContext("2d")?.drawImage(gl.domElement, 0, 0, width, height);
      } finally {
        gl.setPixelRatio(previousPixelRatio);
        gl.setSize(previousSize.x, previousSize.y, false);
        gl.setClearColor(previousClear, previousClearAlpha);
        perspective.aspect = previousAspect;
        perspective.updateProjectionMatrix();
      }

      return snapshot;
    });
  }, [camera, gl, scene]);

  return null;
}
