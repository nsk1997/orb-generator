import { transform } from "esbuild";
import { describe, expect, it } from "vitest";

import {
  createOrbCodeSnippet,
  createOrbSnippetStates,
} from "./orb-code-snippet";
import {
  easeFor,
  orbTransitionEnvelope,
  orbTransitionMorph,
} from "./orb-transition";
import { orbGlassTintHex } from "./orb-materials";
import { orbResponse } from "./orb-response";
import { orbDisplacementChunk } from "./orb-shader-chunks";
import {
  orbParamRanges,
  orbStateDeltas,
  orbStateOrder,
  orbStyleOrder,
  orbStyles,
  resolveOrbPreset,
  type OrbStateId,
} from "./orb-styles";

function snippetFor(
  styleId: (typeof orbStyleOrder)[number],
  stateId: OrbStateId = "idle",
): string {
  return createOrbCodeSnippet(resolveOrbPreset(styleId, stateId), {
    backgroundColor: "#0A0A12",
    stateId,
    style: orbStyles[styleId],
    viewDistance: 8,
  });
}

describe("copy code snippet", () => {
  it("emits syntactically valid JSX for every style", async () => {
    // Cheap guard on the one promise this feature makes: that the copied
    // text actually runs. A template-escaping slip is invisible by eye.
    for (const styleId of orbStyleOrder) {
      await expect(
        transform(snippetFor(styleId), { loader: "jsx" }),
      ).resolves.toBeTruthy();
    }
  });

  it("carries the selected style's material, not the default one", () => {
    // Copying while on Metal must not hand back Glass code.
    const metal = snippetFor("metal");
    expect(metal).toContain("metalness={1}");
    expect(metal).toContain("transmission={0}");
    expect(metal).toContain("backside={false}");
    expect(metal).toContain(`"${orbStyles.metal.base.primaryColor}"`);

    const glass = snippetFor("glass");
    expect(glass).toContain("metalness={0}");
    expect(glass).toContain("transmission={1}");
    expect(glass).toContain("backside={true}");
  });

  it("emits a distinct snippet for every style", () => {
    const snippets = orbStyleOrder.map((styleId) => snippetFor(styleId));
    expect(new Set(snippets).size).toBe(orbStyleOrder.length);
  });

  it("carries each style's studio and geometry", () => {
    for (const styleId of orbStyleOrder) {
      const style = orbStyles[styleId];
      const snippet = snippetFor(styleId);

      expect(snippet).toContain(`"${style.studio.domeTop}"`);
      expect(snippet).toContain(
        `args={[${style.haloSize}, ${style.haloSize}]}`,
      );
      expect(snippet).toContain(`thickness={${style.material.thickness}}`);
      expect(snippet).toContain(`style: "${styleId}"`);
    }
  });

  it("emits the aurora ramp and both of its colours", () => {
    // The ramp reads the primary colour as well as the core one, so a snippet
    // that forgot the tint uniform would compile and render grey bands.
    const aurora = snippetFor("aurora");
    expect(aurora).toContain("orbAuroraRamp");
    expect(aurora).toContain("orbAuroraSpread: { value:");
    expect(aurora).toContain("orbAuroraTint: { value: new THREE.Color(ORB.primaryColor) }");

    expect(snippetFor("glass")).not.toContain("orbAuroraRamp");
  });

  it("emits the interior the selected style actually renders", () => {
    // The two interiors are different fragment stages, not a parameter, so a
    // copied volume style that pasted the emissive core would be a different
    // object from the one on screen.
    const nebula = snippetFor("nebula");
    expect(nebula).toContain("orbNebulaSample");
    expect(nebula).toContain("orbNebulaDensity: { value:");
    expect(nebula).toContain("varying vec3 vOrbWorld;");

    const glass = snippetFor("glass");
    expect(glass).not.toContain("orbNebulaSample");
    expect(glass).not.toContain("orbNebulaDensity");
  });

  it("emits the shell geometry and shading the style uses", () => {
    for (const styleId of orbStyleOrder) {
      const { shell } = orbStyles[styleId];
      const snippet = snippetFor(styleId);

      expect(snippet).toContain(`args={[1, ${shell.detail}]}`);
      expect(snippet).toContain(`flatShading={${shell.flatShading}}`);
    }

    // The one style that is faceted must not paste back as a smooth sphere.
    expect(snippetFor("crystal")).toContain("flatShading={true}");
  });

  it("carries the post pipeline, or a pasted orb would lose its glow", () => {
    for (const styleId of orbStyleOrder) {
      const snippet = snippetFor(styleId);
      expect(snippet).toContain("@react-three/postprocessing");
      expect(snippet).toContain("<EffectComposer>");
      expect(snippet).toContain(
        `bloomThreshold: ${orbStyles[styleId].bloom.threshold}`,
      );
    }
  });

  it("declares every uniform the embedded shader requires", () => {
    // The snippet embeds the shader chunk verbatim, so adding a uniform to the
    // app without adding it here ships code that cannot compile.
    const required = [
      ...orbDisplacementChunk.matchAll(/uniform\s+float\s+(\w+)\s*;/g),
    ].map((match) => match[1]);

    expect(required.length).toBeGreaterThan(3);

    for (const styleId of orbStyleOrder) {
      const snippet = snippetFor(styleId);
      for (const name of required) {
        expect(snippet, `snippet is missing uniform ${name}`).toContain(
          `${name}: { value:`,
        );
      }
    }
  });

  it("keeps the looping phase wrap the app uses", () => {
    const snippet = snippetFor("glass");
    expect(snippet).toContain("% ORB_LOOP_SPAN");
    expect(snippet).toContain("fract(orbFlow / ORB_LOOP_SPAN)");
  });
});

describe("copy code snippet states", () => {
  it("reproduces the copied values exactly for the state that was active", () => {
    // The whole offset scheme is worthless if the state the user was looking
    // at comes back changed.
    for (const stateId of orbStateOrder) {
      const params = resolveOrbPreset("glass", stateId);
      const states = createOrbSnippetStates(params, "glass", stateId);

      expect(states[stateId].ior).toBeCloseTo(params.ior, 10);
      expect(states[stateId].flowSpeed).toBeCloseTo(params.flowSpeed, 10);
      expect(states[stateId].roughness).toBeCloseTo(params.roughness, 10);
    }
  });

  it("carries a tuned look across to the states the user never visited", () => {
    // Copying while Idle with a hand-tuned refractive index must not hand back
    // a Think state that snaps to the shipped preset.
    const preset = resolveOrbPreset("glass", "idle");
    const tuned = { ...preset, ior: preset.ior + 0.3 };
    const states = createOrbSnippetStates(tuned, "glass", "idle");
    const thinkPreset = resolveOrbPreset("glass", "think");

    expect(states.idle.ior).toBeCloseTo(tuned.ior, 10);
    expect(states.think.ior).toBeCloseTo(thinkPreset.ior + 0.3, 10);
  });

  it("keeps every state inside its control range", () => {
    const preset = resolveOrbPreset("glass", "idle");
    // A user who pinned a slider to its top must not produce an out-of-range
    // state for the ones that scale it further up.
    const tuned = { ...preset, flowSpeed: 3, glowIntensity: 2 };
    const states = createOrbSnippetStates(tuned, "glass", "idle");

    for (const stateId of orbStateOrder) {
      expect(states[stateId].flowSpeed).toBeLessThanOrEqual(
        orbParamRanges.flowSpeed[1],
      );
      expect(states[stateId].glowIntensity).toBeLessThanOrEqual(
        orbParamRanges.glowIntensity[1],
      );
    }
  });

  it("gives every state the form weights that define it", () => {
    const states = createOrbSnippetStates(
      resolveOrbPreset("glass", "idle"),
      "glass",
      "idle",
    );

    for (const stateId of orbStateOrder) {
      expect(states[stateId].sweep).toBe(orbStateDeltas[stateId].form.sweep);
      expect(states[stateId].swirl).toBe(orbStateDeltas[stateId].form.swirl);
    }
  });
});

describe("copy code snippet motion", () => {
  it("emits a component driven by a state prop", () => {
    const snippet = snippetFor("glass", "think");

    expect(snippet).toContain("export default function OrbScene({ state = ORB_DEFAULT_STATE })");
    expect(snippet).toContain('const ORB_DEFAULT_STATE = "think"');
    for (const stateId of orbStateOrder) {
      expect(snippet).toContain(`  ${stateId}: {`);
    }
  });

  it("tells the reader gsap is required", () => {
    // The snippet is copy-paste-run; a missing dependency in the install line
    // is a broken promise, not a nitpick.
    const snippet = snippetFor("glass");
    expect(snippet).toContain("npm i three");
    expect(snippet).toContain("gsap");
    expect(snippet).toContain('import gsap from "gsap"');
  });

  it("replays the app's own choreography rather than a second copy of it", () => {
    // Timings live in orb-transition and are emitted from there. If someone
    // retunes the app and the snippet keeps the old feel, this catches it.
    const snippet = snippetFor("glass");

    const { motion } = orbStyles.glass;

    for (const step of orbTransitionMorph) {
      expect(snippet).toContain(
        `at: ${step.atSeconds * motion.durationScale}, duration: ${step.durationSeconds * motion.durationScale}, ease: "${easeFor(step.role, motion)}"`,
      );
    }
    for (const step of orbTransitionEnvelope) {
      expect(snippet).toContain(
        `at: ${step.atSeconds * motion.durationScale}, duration: ${step.durationSeconds * motion.durationScale}, ease: "${step.ease}"`,
      );
    }
  });

  it("carries the copied style's motion signature, not a shared default", () => {
    // A pasted Amber that moves like Glass is the same failure as a pasted
    // Amber that looks like Glass.
    expect(snippetFor("plasma")).toContain(`ease: "${orbStyles.plasma.motion.motionEase}"`);
    expect(snippetFor("amber")).toContain(`ease: "${orbStyles.amber.motion.motionEase}"`);
    expect(snippetFor("amber")).not.toContain(`ease: "${orbStyles.plasma.motion.motionEase}"`);
  });

  it("lifts the glass tint in the renderer's colour space, not in sRGB", () => {
    // Both sides lift the primary toward white by the style's tintLift, but
    // Color.lerp runs in linear space and lerping hex digits does not. The
    // snippet used to do the second, which made every style read lighter and
    // less saturated in the app than in the orb the user pasted.
    for (const styleId of orbStyleOrder) {
      const params = resolveOrbPreset(styleId, "idle");
      const expected = orbGlassTintHex(
        params.primaryColor,
        orbStyles[styleId].tintLift,
      );

      expect(snippetFor(styleId)).toContain(`glassTint: "${expected}"`);
    }
  });

  it("keeps a lifted tint distinguishable from an sRGB lift", () => {
    // Guards the guard: if the two spaces ever agreed, the test above would
    // pass against either implementation and prove nothing.
    const srgbLift = (hex: string, amount: number): string => {
      const channel = (offset: number): string => {
        const value = Number.parseInt(hex.slice(offset, offset + 2), 16);
        return Math.round(value + (255 - value) * amount)
          .toString(16)
          .padStart(2, "0")
          .toUpperCase();
      };

      return `#${channel(1)}${channel(3)}${channel(5)}`;
    };
    const primary = orbStyles.aurora.base.primaryColor;
    const lift = orbStyles.aurora.tintLift;

    expect(orbGlassTintHex(primary, lift)).not.toBe(srgbLift(primary, lift));
  });

  it("clears the background inside WebGL rather than in CSS", () => {
    // The halo is additive and writes alpha 1, so a style whose halo reaches
    // the frame edge turns the canvas opaque and masks any CSS background.
    // Nebula's 4.6 halo does exactly that; Glass's 4.2 one does not, which is
    // why relying on CSS looked correct for a long time.
    for (const styleId of orbStyleOrder) {
      expect(snippetFor(styleId)).toContain(
        'onCreated={({ gl }) => gl.setClearColor("#0A0A12", 1)}',
      );
    }
  });

  it("serialises the response coefficients instead of restating them", () => {
    // These five expressions used to be copy-pasted between the render loop and
    // this emitter, with nothing keeping them in step. Every coefficient must
    // reach the snippet as data and be read back by name, so retuning the app
    // cannot leave a pasted orb responding the old way.
    const snippet = snippetFor("glass");

    for (const [key, value] of Object.entries(orbResponse)) {
      expect(snippet, `${key} must be emitted as data`).toContain(
        `${key}: ${value},`,
      );
      expect(snippet, `${key} must be read back by name`).toContain(
        `RESPONSE.${key}`,
      );
    }
  });

  it("pins both ends of every emitted tween", () => {
    // A plain to() would make the emitted timeline resolve differently when
    // seeked backwards, which is the bug the app avoids the same way.
    const snippet = snippetFor("glass");

    expect(snippet).toContain("timeline.fromTo(");
    expect(snippet).not.toContain("timeline.to(");
    expect(snippet).toContain("gsap.timeline({ paused: true })");
  });
});
