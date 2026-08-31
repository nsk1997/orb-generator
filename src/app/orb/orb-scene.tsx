import * as React from "react";
import { Environment } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import type { BloomEffect, EffectComposer as EffectComposerImpl } from "postprocessing";
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
} from "three";

import {
  createOrbAuroraMaterial,
  createOrbCoreMaterial,
  createOrbDomeMaterial,
  createOrbGlowMaterial,
  createOrbLightCardMaterial,
  createOrbNebulaMaterial,
} from "./orb-materials";
import {
  attachOrbDisplacement,
  createOrbDisplacementUniforms,
} from "./orb-displacement";
import {
  getOrbComposer,
  registerOrbComposer,
  registerOrbFrameRenderer,
} from "./orb-export-registry";
import { orbLoopSpan } from "./orb-shader-chunks";
import {
  createOrbTransition,
  type OrbTransition,
  type OrbTransitionValues,
} from "./orb-transition";
import { orbDefaults, orbViewDistanceDefault, type OrbParams } from "./orb-params";
import {
  orbStateDeltas,
  orbStyles,
  type OrbStateId,
  type OrbStudioConfig,
  type OrbStyleId,
} from "./orb-styles";

export type OrbViewPose = {
  position: readonly [number, number, number];
  up: readonly [number, number, number];
};

export type OrbSceneInputs = {
  backgroundColor: string;
  stateId: OrbStateId;
  includeBackground: boolean;
  params: OrbParams;
  pose: OrbViewPose;
  viewDistance: number;
};

export const orbSceneInputDefaults: OrbSceneInputs = {
  backgroundColor: "#0A0A12",
  stateId: "idle",
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

/**
 * How fast displayed values chase the panel values, per parameter family.
 * These are the values a user is still dragging, where "keep closing the gap"
 * is the right model. Form weights are not here: a state change is a discrete
 * event, so `orb-transition` gives it an authored, seekable timeline instead.
 */
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
  styleId,
}: Readonly<{
  inputsRef: React.RefObject<OrbSceneInputs>;
  styleId: OrbStyleId;
}>): React.JSX.Element {
  // Structural values re-render the scene; continuous slider values reach the
  // render loop through the ref so a drag never re-renders the WebGL tree.
  const style = orbStyles[styleId];
  const { material } = style;
  const bodyMaterialRef = React.useRef<OrbTransmissionMaterial | null>(null);
  // One stable uniform set for the lifetime of the scene. The material itself
  // is remounted whenever the style changes, because Drei carries `samples` in
  // its constructor args, so the uniforms must outlive any single material.
  const bodyUniforms = React.useMemo(() => {
    const uniforms = createOrbDisplacementUniforms(1);
    uniforms.orbDistortion.value = orbDefaults.distortion;
    return uniforms;
  }, []);

  const glowMaterial = React.useMemo(() => createOrbGlowMaterial(), []);
  // Both interiors expose the same uniforms, so the render loop below drives
  // whichever one is mounted without branching.
  const { interior } = style;
  const coreMaterial = React.useMemo(() => {
    if (interior.kind === "nebula") {
      return createOrbNebulaMaterial(style.coreScale, interior.density);
    }

    if (interior.kind === "aurora") {
      return createOrbAuroraMaterial(style.coreScale, interior.spread);
    }

    return createOrbCoreMaterial(style.coreScale);
  }, [interior, style.coreScale]);

  const bodyRef = React.useRef<Mesh | null>(null);
  const haloRef = React.useRef<Mesh | null>(null);
  const bloomRef = React.useRef<BloomEffect | null>(null);

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
    // Form weights, morphed rather than switched.
    calm: 1,
    coreAgitation: 1,
    pulse: 0,
    ridge: 0,
    sweep: 0,
    swirl: 0.15,
    transientFollow: 0,
    transientLead: 0,
  });
  const lastStateRef = React.useRef<OrbStateId>("idle");
  // The live playhead into the current transition. Advanced by frame delta
  // here; because the timeline is seekable, an export could hand it a frame
  // time from the render schedule instead and get identical pixels.
  const transitionRef = React.useRef<OrbTransition | null>(null);
  const transitionTimeRef = React.useRef(0);
  const transitionKeyRef = React.useRef("");
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

      if (!material) {
        return;
      }

      // Every material gets patched, not just the first. Guarding on "have we
      // done this once" left every style switch rendering a static sphere.
      attachOrbDisplacement(material, bodyUniforms, "orb-displaced-transmission");
    },
    [bodyUniforms],
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

    const form = orbStateDeltas[inputs.stateId].form;

    // Ridge belongs to the style, not the state, but it morphs on the same
    // clock: cutting straight to spikes reads as a different object appearing.
    // So one key covers both, and either change authors a fresh transition
    // starting from wherever the previous one had reached.
    const transitionKey = `${inputs.stateId}:${style.ridge}`;
    if (transitionKeyRef.current !== transitionKey) {
      const stateChanged = lastStateRef.current !== inputs.stateId;
      lastStateRef.current = inputs.stateId;
      transitionKeyRef.current = transitionKey;
      transitionRef.current = createOrbTransition(
        {
          calm: state.calm,
          coreAgitation: state.coreAgitation,
          pulse: state.pulse,
          ridge: state.ridge,
          sweep: state.sweep,
          swirl: state.swirl,
          transientFollow: state.transientFollow,
          transientLead: state.transientLead,
        },
        {
          ...form,
          ridge: style.ridge,
          transientFollow: 0,
          transientLead: 0,
        } satisfies OrbTransitionValues,
        // Only a state change earns the envelope. Switching preset moves the
        // ridge weight alone and must not flash.
        { withTransient: stateChanged },
      );
      transitionTimeRef.current = 0;
    }

    const transition = transitionRef.current;
    if (transition) {
      transitionTimeRef.current = Math.min(
        transitionTimeRef.current + step,
        transition.durationSeconds,
      );
      const sampled = transition.sampleAt(transitionTimeRef.current);
      state.calm = sampled.calm;
      state.coreAgitation = sampled.coreAgitation;
      state.pulse = sampled.pulse;
      state.ridge = sampled.ridge;
      state.sweep = sampled.sweep;
      state.swirl = sampled.swirl;
      state.transientFollow = sampled.transientFollow;
      state.transientLead = sampled.transientLead;
    }

    // Integrating speed keeps the surface continuous when speed changes;
    // wrapping to the loop span keeps float precision exact and gives every
    // layer one shared cycle to return to.
    state.flowPhase = (state.flowPhase + step * state.flowSpeed) % orbLoopSpan;

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
      // attenuation carries the saturated colour through the thick middle. How
      // far to lift belongs to the style: a soap film is nearly white and a
      // ferrofluid is nearly black, and one fixed amount cannot be both.
      glassTint.copy(shownPrimary).lerp(whitePoint, style.tintLift);
      body.color.copy(glassTint);
      body.attenuationColor.copy(shownPrimary);
      body.time = state.flowPhase;
    }
    const shellDistortion = state.distortion + 0.1 * state.transientFollow;

    bodyUniforms.orbCalm.value = state.calm;
    bodyUniforms.orbDistortion.value = shellDistortion;
    bodyUniforms.orbFlow.value = state.flowPhase;
    bodyUniforms.orbPulse.value = state.pulse;
    bodyUniforms.orbRidge.value = state.ridge;
    bodyUniforms.orbSweep.value = state.sweep;
    bodyUniforms.orbSwirl.value = state.swirl;

    glowMaterial.uniforms.orbGlowColor.value.copy(shownPrimary);
    glowMaterial.uniforms.orbGlowIntensity.value =
      state.glowIntensity + 0.25 * state.transientLead;
    glowMaterial.uniforms.orbGlowSpread.value = state.glowSpread;

    coreMaterial.uniforms.orbCalm.value = state.calm;
    coreMaterial.uniforms.orbPulse.value = state.pulse;
    coreMaterial.uniforms.orbRidge.value = state.ridge;
    coreMaterial.uniforms.orbSwirl.value = state.swirl;
    // Sweep reaches the interior only where the interior draws with it. The
    // aurora bands use it for their scan; on the emissive core and the volume
    // it would ridge the interior geometry for no visible gain, which is why
    // it was never wired through before.
    coreMaterial.uniforms.orbSweep.value =
      interior.kind === "aurora" ? state.sweep : 0;
    // The core can churn inside a still shell, which is what Think looks like.
    coreMaterial.uniforms.orbDistortion.value =
      shellDistortion * 0.55 * state.coreAgitation;
    // Same phase as the shell: a seamless capture needs one period for the
    // whole orb, and the core already reads differently from its smaller
    // scale and lower distortion.
    coreMaterial.uniforms.orbFlow.value = state.flowPhase;
    coreMaterial.uniforms.orbCoreColor.value.copy(shownCore);
    // Only the aurora interior ramps between both colours; the others take
    // the core colour alone.
    coreMaterial.uniforms.orbAuroraTint?.value.copy(shownPrimary);
    coreMaterial.uniforms.orbCoreIntensity.value =
      (0.5 + state.glowIntensity * 0.28) * style.coreIntensityScale;

    // Glow already means "how much light escapes", so it scales bloom too
    // rather than adding a tenth control for the same idea.
    if (bloomRef.current) {
      bloomRef.current.intensity =
        style.bloom.intensity * (0.55 + state.glowIntensity * 0.45) +
        0.3 * state.transientLead;
    }

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
      <StudioEnvironment studio={style.studio} />
      <mesh material={coreMaterial} renderOrder={0}>
        <icosahedronGeometry args={[1, 10]} />
      </mesh>
      <mesh ref={bodyRef} renderOrder={1}>
        <icosahedronGeometry args={[1, style.shell.detail]} />
        <MeshTransmissionMaterial
          anisotropicBlur={material.anisotropicBlur}
          attenuationDistance={material.attenuationDistance}
          background={environmentMap ?? undefined}
          backside={material.transmission > 0}
          backsideThickness={material.backsideThickness}
          chromaticAberration={style.base.chromaticAberration}
          clearcoat={material.clearcoat}
          clearcoatRoughness={material.clearcoatRoughness}
          distortion={0.06}
          distortionScale={0.5}
          envMapIntensity={material.envMapIntensity}
          flatShading={style.shell.flatShading}
          ior={style.base.ior}
          iridescence={material.iridescence}
          iridescenceIOR={material.iridescenceIOR}
          iridescenceThicknessRange={material.iridescenceThicknessRange}
          key={styleId}
          metalness={material.metalness}
          ref={attachBodyMaterial as never}
          resolution={1024}
          roughness={style.base.roughness}
          samples={material.samples}
          temporalDistortion={0.02}
          thickness={material.thickness}
          transmission={material.transmission}
        />
      </mesh>
      <mesh material={glowMaterial} ref={haloRef} renderOrder={-1}>
        <planeGeometry args={[style.haloSize, style.haloSize]} />
      </mesh>
      <OrbEffects bloomRef={bloomRef} style={style} />
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
  intensityScale,
}: Readonly<{ card: OrbLightCard; intensityScale: number }>): React.JSX.Element {
  const material = React.useMemo(
    () =>
      createOrbLightCardMaterial(
        card.color,
        card.intensity * intensityScale,
        card.softness,
      ),
    [card.color, card.intensity, card.softness, intensityScale],
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
function StudioEnvironment({
  studio,
}: Readonly<{ studio: OrbStudioConfig }>): React.JSX.Element {
  const domeMaterial = React.useMemo(
    () =>
      createOrbDomeMaterial({
        bottom: studio.domeBottom,
        horizon: studio.domeHorizon,
        top: studio.domeTop,
      }),
    [studio.domeBottom, studio.domeHorizon, studio.domeTop],
  );

  React.useEffect(() => () => domeMaterial.dispose(), [domeMaterial]);

  return (
    <>
      <ambientLight intensity={0.08} />
      <Environment frames={1} resolution={256}>
        <mesh material={domeMaterial} scale={60}>
          <sphereGeometry args={[1, 32, 24]} />
        </mesh>
        {orbLightCards.map((card, index) => (
          <OrbLightPanel
            card={card}
            intensityScale={studio.cardIntensityScale}
            key={index}
          />
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

        // Render through the post pipeline when one is mounted; a direct
        // scene render would drop bloom from the exported image.
        const composer = getOrbComposer();
        if (composer) {
          composer.setSize(width, height);
          composer.render();
        } else {
          gl.render(scene, camera);
        }

        snapshot = document.createElement("canvas");
        snapshot.width = width;
        snapshot.height = height;
        snapshot.getContext("2d")?.drawImage(gl.domElement, 0, 0, width, height);
      } finally {
        gl.setPixelRatio(previousPixelRatio);
        gl.setSize(previousSize.x, previousSize.y, false);
        getOrbComposer()?.setSize(previousSize.x, previousSize.y);
        gl.setClearColor(previousClear, previousClearAlpha);
        perspective.aspect = previousAspect;
        perspective.updateProjectionMatrix();
      }

      return snapshot;
    });
  }, [camera, gl, scene]);

  return null;
}

/**
 * The composer takes over rendering from R3F's default loop, which is exactly
 * why export has to go through it too: rendering the scene directly would
 * silently produce un-bloomed pixels that still look fine on screen.
 */
function OrbEffects({
  bloomRef,
  style,
}: Readonly<{
  bloomRef: React.RefObject<BloomEffect | null>;
  style: (typeof orbStyles)[OrbStyleId];
}>): React.JSX.Element {
  const composerRef = React.useRef<EffectComposerImpl | null>(null);

  React.useEffect(() => {
    if (!composerRef.current) {
      return;
    }

    return registerOrbComposer(composerRef.current);
  }, []);

  return (
    <EffectComposer key={style.id} ref={composerRef}>
      <Bloom
        luminanceSmoothing={0.25}
        luminanceThreshold={style.bloom.threshold}
        mipmapBlur
        radius={style.bloom.radius}
        ref={bloomRef}
      />
    </EffectComposer>
  );
}
