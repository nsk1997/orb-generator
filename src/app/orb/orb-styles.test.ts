import { describe, expect, it } from "vitest";

import {
  getOrbPresetWrites,
  orbColourParamKeys,
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

  it("never lets a state change colour", () => {
    // Colour is the style's and then the user's. Hand-picking red and
    // switching state must leave the orb red, so a state may not resolve to a
    // different colour than rest.
    for (const styleId of orbStyleOrder) {
      const base = orbStyles[styleId].base;

      for (const stateId of orbStateOrder) {
        const resolved = resolveOrbPreset(styleId, stateId);

        for (const key of orbColourParamKeys) {
          expect(
            resolved[key],
            `${styleId}/${stateId} moved ${key} away from the style`,
          ).toBe(base[key]);
        }
      }
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

  it("gives the emissive style the strongest bloom and the mirror the weakest", () => {
    const intensities = orbStyleOrder.map((id) => orbStyles[id].bloom.intensity);

    expect(orbStyles.plasma.bloom.intensity).toBe(Math.max(...intensities));
    expect(orbStyles.metal.bloom.intensity).toBe(Math.min(...intensities));
    // A threshold at or above 1 would never trigger on tone-mapped output.
    for (const id of orbStyleOrder) {
      expect(orbStyles[id].bloom.threshold).toBeGreaterThan(0);
      expect(orbStyles[id].bloom.threshold).toBeLessThan(1);
      expect(orbStyles[id].bloom.intensity).toBeGreaterThan(0);
    }
  });

  it("gives each state a distinct shape language, not just more of the same", () => {
    const forms = orbStateOrder.map((id) => JSON.stringify(orbStateDeltas[id].form));
    expect(new Set(forms).size).toBe(orbStateOrder.length);

    // The four behaviours that make the states readable at a glance.
    expect(orbStateDeltas.search.form.sweep).toBeGreaterThan(0.5);
    expect(orbStateDeltas.speak.form.pulse).toBeGreaterThan(0.5);
    expect(orbStateDeltas.think.form.coreAgitation).toBeGreaterThan(1.5);
    expect(orbStateDeltas.idle.form.calm).toBe(1);
    // Only Search sweeps, or "scanning" stops meaning anything.
    for (const id of orbStateOrder.filter((s) => s !== "search")) {
      expect(orbStateDeltas[id].form.sweep).toBe(0);
    }
  });

  it("gives every style a core colour a state can actually move", () => {
    // A pure white core has nowhere to go: it cannot be tinted by the user
    // and it reads as a flat blown-out centre. Frost shipped that way once.
    for (const styleId of orbStyleOrder) {
      const core = orbStyles[styleId].base.coreColor.toUpperCase();
      expect(core, `${styleId} core has no headroom for a state tint`).not.toBe(
        "#FFFFFF",
      );
    }
  });

  it("samples rough transmission densely enough to avoid speckle", () => {
    // Rough transmission scatters samples wider, so a rough style needs more
    // of them, not fewer. The inverse assumption shipped visible grain.
    for (const styleId of orbStyleOrder) {
      const style = orbStyles[styleId];
      if (style.material.transmission > 0 && style.base.roughness > 0.25) {
        expect(
          style.material.samples,
          `${styleId} is rough and transmissive but samples sparsely`,
        ).toBeGreaterThanOrEqual(12);
      }
    }
  });

  it("writes behaviour but not colour when only the state changes", () => {
    const writes = getOrbPresetWrites(
      { state: "think", style: "glass" },
      { state: "search", style: "glass" },
    );
    const keys = writes.map((write) => write.key);

    expect(keys.length).toBeGreaterThan(0);
    for (const colourKey of orbColourParamKeys) {
      expect(keys, `a state change must not write ${colourKey}`).not.toContain(
        colourKey,
      );
    }
    expect(keys).toContain("flowSpeed");
    expect(keys).toContain("distortion");
  });

  it("brings the palette when the style changes", () => {
    const writes = getOrbPresetWrites(
      { state: "search", style: "glass" },
      { state: "search", style: "plasma" },
    );
    const byKey = new Map(writes.map((write) => [write.key, write.value]));

    for (const colourKey of orbColourParamKeys) {
      expect(byKey.get(colourKey)).toBe(orbStyles.plasma.base[colourKey]);
    }
  });

  it("writes nothing on first observation or when nothing changed", () => {
    // Without this a reload would overwrite the tweaks it just restored.
    expect(getOrbPresetWrites(null, { state: "speak", style: "metal" })).toEqual(
      [],
    );
    expect(
      getOrbPresetWrites(
        { state: "speak", style: "metal" },
        { state: "speak", style: "metal" },
      ),
    ).toEqual([]);
  });

  it("labels every state within the segmented control budget", () => {
    const labels = orbStateOrder.map((id) => orbStateDeltas[id].label);

    expect(labels.length).toBeLessThanOrEqual(4);
    for (const label of labels) expect(label.length).toBeLessThanOrEqual(9);
    expect(labels.join("").length).toBeLessThanOrEqual(24);
  });
});
