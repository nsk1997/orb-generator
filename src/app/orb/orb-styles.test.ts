import { describe, expect, it } from "vitest";

import {
  orbParamRanges,
  orbStateDeltas,
  orbStateOrder,
  orbStyleOrder,
  orbStyles,
  resolveOrbPreset,
  readOrbStateId,
  readOrbStyleId,
} from "./orb-styles";

const numericKeys = Object.keys(orbParamRanges) as (keyof typeof orbParamRanges)[];

describe("orb style and state composition", () => {
  it("keeps every resolved combination inside its slider domain", () => {
    for (const styleId of orbStyleOrder) {
      for (const stateId of orbStateOrder) {
        const resolved = resolveOrbPreset(styleId, stateId);

        for (const key of numericKeys) {
          const [min, max] = orbParamRanges[key];
          expect(
            resolved[key],
            `${styleId}/${stateId} ${key} = ${resolved[key]}`,
          ).toBeGreaterThanOrEqual(min);
          expect(resolved[key]).toBeLessThanOrEqual(max);
        }
      }
    }
  });

  it("lets the style own colour so states cannot flatten style identity", () => {
    for (const styleId of orbStyleOrder) {
      const colours = orbStateOrder.map((stateId) => {
        const { coreColor, primaryColor } = resolveOrbPreset(styleId, stateId);
        return `${primaryColor}/${coreColor}`;
      });

      expect(new Set(colours).size).toBe(1);
    }
  });

  it("gives every style a distinct palette", () => {
    const palettes = orbStyleOrder.map(
      (id) => `${orbStyles[id].base.primaryColor}/${orbStyles[id].base.coreColor}`,
    );

    expect(new Set(palettes).size).toBe(orbStyleOrder.length);
  });

  it("leaves the resting state exactly equal to the style base", () => {
    for (const styleId of orbStyleOrder) {
      expect(resolveOrbPreset(styleId, "idle")).toEqual(orbStyles[styleId].base);
    }
  });

  it("makes each state more agitated than rest, in every style", () => {
    for (const styleId of orbStyleOrder) {
      const idle = resolveOrbPreset(styleId, "idle");

      for (const stateId of orbStateOrder.filter((id) => id !== "idle")) {
        const resolved = resolveOrbPreset(styleId, stateId);
        expect(
          resolved.flowSpeed,
          `${styleId}/${stateId} should flow faster than idle`,
        ).toBeGreaterThan(idle.flowSpeed);
      }
    }
  });

  it("skips both transmission passes only for the opaque style", () => {
    // Drei renders the backside and main buffers unless transmission is 0,
    // so this is a real cost claim, not a cosmetic flag.
    expect(orbStyles.metal.material.transmission).toBe(0);
    expect(orbStyles.metal.material.metalness).toBe(1);

    for (const styleId of orbStyleOrder.filter((id) => id !== "metal")) {
      expect(orbStyles[styleId].material.transmission).toBeGreaterThan(0);
      expect(orbStyles[styleId].material.metalness).toBe(0);
    }
  });

  it("falls back to a usable style and state for unknown stored values", () => {
    expect(readOrbStyleId("nope")).toBe("glass");
    expect(readOrbStyleId(undefined)).toBe("glass");
    expect(readOrbStateId(42)).toBe("idle");
    expect(readOrbStateId("speak")).toBe("speak");
  });

  it("labels every state within the segmented control budget", () => {
    const labels = orbStateOrder.map((id) => orbStateDeltas[id].label);

    expect(labels.length).toBeLessThanOrEqual(4);
    for (const label of labels) expect(label.length).toBeLessThanOrEqual(9);
    expect(labels.join("").length).toBeLessThanOrEqual(24);
  });
});
