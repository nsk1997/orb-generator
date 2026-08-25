import { describe, expect, it } from "vitest";

import { createOrbCodeSnippet } from "./orb-code-snippet";
import { orbStyleOrder, orbStyles, resolveOrbPreset } from "./orb-styles";

function snippetFor(styleId: (typeof orbStyleOrder)[number]): string {
  return createOrbCodeSnippet(resolveOrbPreset(styleId, "idle"), {
    backgroundColor: "#0A0A12",
    style: orbStyles[styleId],
    viewDistance: 8,
  });
}

describe("copy code snippet", () => {
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

  it("keeps the looping phase wrap the app uses", () => {
    const snippet = snippetFor("glass");
    expect(snippet).toContain("% ORB_LOOP_SPAN");
    expect(snippet).toContain("fract(orbFlow / ORB_LOOP_SPAN)");
  });
});
