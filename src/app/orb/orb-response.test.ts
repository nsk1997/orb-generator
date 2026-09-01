import { describe, expect, it } from "vitest";

import {
  orbBloomIntensity,
  orbCoreDistortion,
  orbCoreIntensity,
  orbGlowIntensity,
  orbResponse,
  orbShellDistortion,
} from "./orb-response";

describe("orb response", () => {
  it("keeps every coefficient reachable as data", () => {
    // The emitter serialises this object into the snippet, so a coefficient
    // that stops being data stops reaching a copied orb.
    for (const [key, value] of Object.entries(orbResponse)) {
      expect(Number.isFinite(value), `${key} must be a finite number`).toBe(true);
    }
  });

  it("scales bloom by glow and lifts it on the transient lead", () => {
    const rest = orbBloomIntensity(2, 0.8, 0);

    expect(rest).toBeCloseTo(2 * (0.55 + 0.8 * 0.45), 10);
    expect(orbBloomIntensity(2, 0.8, 1)).toBeCloseTo(rest + 0.3, 10);
  });

  it("keeps a lit floor under the interior", () => {
    // A glow of 0 must still leave the core visible, or a dimmed orb goes dark
    // instead of dim.
    expect(orbCoreIntensity(0, 1)).toBeGreaterThan(0);
    expect(orbCoreIntensity(0, 1)).toBeCloseTo(orbResponse.coreBase, 10);
    expect(orbCoreIntensity(1, 2)).toBeCloseTo((0.5 + 0.28) * 2, 10);
  });

  it("moves the halo with the glow control", () => {
    expect(orbGlowIntensity(0.8, 0)).toBe(0.8);
    expect(orbGlowIntensity(0.8, 1)).toBeCloseTo(0.8 + 0.25, 10);
  });

  it("lets the core churn inside a still shell", () => {
    // Think is exactly this: no shell motion to speak of, an agitated interior.
    const shell = orbShellDistortion(0.3, 0);

    expect(shell).toBe(0.3);
    expect(orbCoreDistortion(shell, 2)).toBeGreaterThan(orbCoreDistortion(shell, 1));
    expect(orbShellDistortion(0.3, 1)).toBeCloseTo(0.4, 10);
  });
});
