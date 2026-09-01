import { Color, MathUtils } from "three";
import { describe, expect, it } from "vitest";

import { dampSettled, lerpSettled } from "./orb-damping";

describe("orb damping", () => {
  it("reaches its target instead of approaching it forever", () => {
    // The bug this exists for: Flow speed dragged to 0 left a speed of about
    // 1e-9 rather than 0, so the phase kept creeping and the orb never rested.
    let plain = 0.55;
    let settled = 0.55;

    for (let frame = 0; frame < 600; frame += 1) {
      plain = MathUtils.damp(plain, 0, 3.2, 1 / 60);
      settled = dampSettled(settled, 0, 3.2, 1 / 60);
    }

    expect(plain).not.toBe(0);
    expect(settled).toBe(0);
  });

  it("still eases rather than snapping while the gap is visible", () => {
    const next = dampSettled(0, 1, 3.2, 1 / 60);

    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
    expect(next).toBe(MathUtils.damp(0, 1, 3.2, 1 / 60));
  });

  it("settles a colour chase onto its exact target", () => {
    const shown = new Color("#7C5CFF");
    const target = new Color("#22D3EE");

    for (let frame = 0; frame < 600; frame += 1) {
      lerpSettled(shown, target, 1 - Math.exp(-5 * (1 / 60)));
    }

    expect(shown.getHexString()).toBe(target.getHexString());
    expect(shown.r).toBe(target.r);
    expect(shown.g).toBe(target.g);
    expect(shown.b).toBe(target.b);
  });
});
