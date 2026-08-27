import { transform } from "esbuild";
import { describe, expect, it } from "vitest";

import { createOrbCodeSnippet } from "./orb-code-snippet";
import { orbDisplacementChunk } from "./orb-shader-chunks";
import {
  orbStateDeltas,
  orbStyleOrder,
  orbStyles,
  resolveOrbPreset,
} from "./orb-styles";

function snippetFor(styleId: (typeof orbStyleOrder)[number]): string {
  return createOrbCodeSnippet(resolveOrbPreset(styleId, "idle"), {
    backgroundColor: "#0A0A12",
    form: orbStateDeltas.idle.form,
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
    const snippets = orbStyleOrder.map(snippetFor);
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
