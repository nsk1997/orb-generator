import { describe, expect, it } from "vitest";

import { attachOrbProductTime } from "./orb-materials";

function fakeTransmissionMaterial(): {
  uniforms: Record<string, { value: unknown }>;
} {
  return { uniforms: { time: { value: 0 } } };
}

describe("orb product time", () => {
  it("ignores the library's per-frame clock write and reports the product phase", () => {
    // Drei's MeshTransmissionMaterial assigns uniforms.time.value from the R3F
    // clock every frame, before it checks transmission, so it does this for
    // opaque styles too. That made Flow speed unable to slow the material's
    // internal distortion, and setting it to 0 did not stop the orb.
    const material = fakeTransmissionMaterial();
    let phase = 4.25;

    attachOrbProductTime(material, () => phase);
    material.uniforms.time.value = 123.456;

    expect(material.uniforms.time.value).toBe(4.25);

    phase = 9.5;
    expect(material.uniforms.time.value).toBe(9.5);
  });

  it("fails loudly when the material has no time uniform to own", () => {
    expect(() => attachOrbProductTime({ uniforms: {} }, () => 0)).toThrow(
      /time uniform/u,
    );
  });
});
