import { describe, expect, it } from "vitest";

import { orbBaseFov, orbFovForAspect } from "./orb-framing";

/** What the camera can see at `distance`, in world units, for a given frame. */
function visibleExtent(
  aspect: number,
  distance = 8,
): { height: number; width: number } {
  const height =
    2 * distance * Math.tan((orbFovForAspect(aspect) * Math.PI) / 360);

  return { height, width: height * aspect };
}

const aspects = [16 / 9, 4 / 3, 3 / 2, 1, 3 / 4, 2 / 3, 9 / 16];

describe("orb framing", () => {
  it("keeps the orb at one share of the shorter side, whatever the crop", () => {
    // The bug this replaces: a fixed vertical fov held the orb at 47% of the
    // height in every frame, which put it at 26% of the width at 16:9 and 83%
    // at 9:16 — the same orb reading as two different compositions.
    const shares = aspects.map((aspect) => {
      const { height, width } = visibleExtent(aspect);
      return 2 / Math.min(height, width);
    });

    for (const share of shares) {
      expect(share).toBeCloseTo(shares[0], 10);
    }
  });

  it("leaves the square frame exactly as it was tuned", () => {
    expect(orbFovForAspect(1)).toBe(orbBaseFov);
  });

  it("never narrows the field, so no crop can clip the orb", () => {
    for (const aspect of aspects) {
      expect(orbFovForAspect(aspect)).toBeGreaterThanOrEqual(orbBaseFov);
    }
  });

  it("leaves landscape frames on the base field of view", () => {
    // Widening a landscape frame would only add empty sky above and below.
    for (const aspect of [16 / 9, 4 / 3, 3 / 2, 1]) {
      expect(orbFovForAspect(aspect)).toBe(orbBaseFov);
    }
  });

  it("falls back to the base field for a frame with no size yet", () => {
    for (const aspect of [0, -2, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(orbFovForAspect(aspect)).toBe(orbBaseFov);
    }
  });
});
