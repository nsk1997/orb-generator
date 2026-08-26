import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping } from "three";
import {
  readToolcraftOrientationPose,
  useToolcraftSelector,
} from "@/toolcraft/runtime/react";
import { shouldIncludeToolcraftPreviewBackground } from "@/toolcraft/runtime";
import { useToolcraftDispatch } from "@/toolcraft/runtime/react";
import type { ToolcraftState } from "@/toolcraft/runtime";

import styles from "./orb-canvas.module.css";
import {
  OrbCanvasBridge,
  OrbScene,
  orbSceneInputDefaults,
  type OrbSceneInputs,
} from "./orb-scene";
import {
  orbTargets,
  readOrbParams,
  readOrbSceneBackground,
  readOrbViewDistance,
} from "./orb-params";
import {
  getOrbPresetWrites,
  readOrbStateId,
  readOrbStyleId,
  type OrbPresetSelection,
  type OrbStyleId,
} from "./orb-styles";

function selectOrbSceneInputs(state: ToolcraftState): OrbSceneInputs {
  return {
    backgroundColor: readOrbSceneBackground(state.values),
    includeBackground: shouldIncludeToolcraftPreviewBackground({ state }),
    params: readOrbParams(state.values),
    pose: readToolcraftOrientationPose(state.values[orbTargets.viewOrbit]),
    stateId: readOrbStateId(state.values[orbTargets.state]),
    viewDistance: readOrbViewDistance(state.values),
  };
}

function orbSceneInputsEqual(
  previous: OrbSceneInputs,
  next: OrbSceneInputs,
): boolean {
  const a = previous.params;
  const b = next.params;

  return (
    previous.backgroundColor === next.backgroundColor &&
    previous.stateId === next.stateId &&
    previous.includeBackground === next.includeBackground &&
    previous.viewDistance === next.viewDistance &&
    previous.pose.position.every(
      (value, index) => value === next.pose.position[index],
    ) &&
    previous.pose.up.every((value, index) => value === next.pose.up[index]) &&
    a.chromaticAberration === b.chromaticAberration &&
    a.coreColor === b.coreColor &&
    a.distortion === b.distortion &&
    a.flowSpeed === b.flowSpeed &&
    a.glowIntensity === b.glowIntensity &&
    a.glowSpread === b.glowSpread &&
    a.ior === b.ior &&
    a.primaryColor === b.primaryColor &&
    a.roughness === b.roughness
  );
}

/**
 * Subscribes to runtime values and hands them to the render loop through a
 * ref, so a slider drag never re-renders the WebGL tree.
 */
/**
 * Style and state are stored values, so picking either writes the resolved
 * parameters back into the visible controls.
 *
 * Two rules make this predictable. Picking a style brings its palette, because
 * a palette is part of what a style is. Picking a state never touches colour,
 * because colour is the user's: hand-picking red and then switching state must
 * leave the orb red. Skipping the first observation matters too, or a reload
 * would overwrite the tweaks that were just restored.
 */
function OrbPresetBridge(): null {
  const dispatch = useToolcraftDispatch();
  const styleId = useToolcraftSelector((state: ToolcraftState) =>
    readOrbStyleId(state.values[orbTargets.style]),
  );
  const stateId = useToolcraftSelector((state: ToolcraftState) =>
    readOrbStateId(state.values[orbTargets.state]),
  );
  const seenRef = React.useRef<OrbPresetSelection | null>(null);

  React.useEffect(() => {
    const previous = seenRef.current;
    const next: OrbPresetSelection = { state: stateId, style: styleId };
    seenRef.current = next;

    const writes = getOrbPresetWrites(previous, next);

    if (writes.length === 0) {
      return;
    }

    const label = previous && previous.style !== styleId ? "Orb style" : "Orb state";
    const historyGroup = `orb-preset:${styleId}:${stateId}`;

    for (const { key, value } of writes) {
      dispatch({
        historyGroup,
        label,
        target: orbTargets[key],
        type: "controls.setValue",
        value,
      });
    }
  }, [dispatch, stateId, styleId]);

  return null;
}

function OrbValueBridge({
  inputsRef,
}: Readonly<{
  inputsRef: React.RefObject<OrbSceneInputs>;
}>): null {
  const inputs = useToolcraftSelector(selectOrbSceneInputs, orbSceneInputsEqual);

  React.useEffect(() => {
    inputsRef.current = inputs;
  }, [inputs, inputsRef]);

  return null;
}

export function OrbCanvas(): React.JSX.Element {
  const inputsRef = React.useRef<OrbSceneInputs>(orbSceneInputDefaults);
  const styleId: OrbStyleId = useToolcraftSelector((state: ToolcraftState) =>
    readOrbStyleId(state.values[orbTargets.style]),
  );

  return (
    <div className={styles.stage} data-toolcraft-product-output="orb">
      <OrbPresetBridge />
      <OrbValueBridge inputsRef={inputsRef} />
      <Canvas
        camera={{ far: 40, fov: 30, near: 0.1, position: [0, 0, 8] }}
        dpr={[1, 2]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
          toneMapping: ACESFilmicToneMapping,
        }}
      >
        <OrbCanvasBridge inputsRef={inputsRef} />
        <OrbScene inputsRef={inputsRef} styleId={styleId} />
      </Canvas>
    </div>
  );
}
