import gsap from "gsap";
import { describe, expect, it } from "vitest";

import {
  getOrbPresetWrites,
  isOrbStyleOpaque,
  orbColourParamKeys,
  orbOpaqueStyleIds,
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

  it("ties the transmission passes to the surface each style declares", () => {
    // Drei renders the backside and main buffers unless transmission is 0, so
    // `surface` is a cost claim, not a cosmetic flag. The rule is derived from
    // the declaration rather than from a style name, so a second opaque style
    // is covered the moment it exists instead of when someone remembers.
    const opaque = orbStyleOrder.filter(
      (id) => orbStyles[id].surface === "opaque",
    );

    expect(opaque.length).toBeGreaterThan(0);
    expect([...orbOpaqueStyleIds]).toEqual(opaque);

    for (const styleId of orbStyleOrder) {
      const style = orbStyles[styleId];

      expect(isOrbStyleOpaque(styleId)).toBe(style.surface === "opaque");

      if (style.surface === "opaque") {
        expect(
          style.material.transmission,
          `${styleId} declares an opaque surface but still transmits`,
        ).toBe(0);
        // An opaque body has only its reflection to be seen by, so it needs
        // something to reflect with: metal, or a polished coat over a dark
        // dielectric. Requiring metal specifically was too strong — a black
        // glossy stone is the counterexample.
        expect(
          Math.max(style.material.metalness, style.material.clearcoat),
          `${styleId} is opaque but has nothing to be seen by`,
        ).toBeGreaterThan(0);
        continue;
      }

      // Metalness closes transmission in the physical material, so a metal
      // style can only ever be an opaque one.
      expect(style.material.metalness).toBe(0);

      expect(
        style.material.transmission,
        `${styleId} declares a transmissive surface but transmits nothing`,
      ).toBeGreaterThan(0);
    }
  });

  it("keeps surface character with the style, not with the state", () => {
    // Ridge is what separates a fluid from a spiked one. If a state owned it,
    // every style would turn into a ferrofluid on the way to Speak.
    expect(orbStyleOrder.some((id) => orbStyles[id].ridge > 0)).toBe(true);

    for (const styleId of orbStyleOrder) {
      expect(orbStyles[styleId].ridge).toBeGreaterThanOrEqual(0);
      expect(orbStyles[styleId].ridge).toBeLessThanOrEqual(1);
    }

    for (const stateId of orbStateOrder) {
      expect(Object.keys(orbStateDeltas[stateId].form)).not.toContain("ridge");
    }
  });

  it("gives a faceted style geometry coarse enough to have faces", () => {
    // Flat shading a finely subdivided sphere still reads as a sphere: the
    // facets have to exist in the geometry before shading can show them.
    expect(orbStyleOrder.some((id) => orbStyles[id].shell.flatShading)).toBe(true);

    for (const styleId of orbStyleOrder) {
      const { shell } = orbStyles[styleId];

      if (shell.flatShading) {
        expect(
          shell.detail,
          `${styleId} shades flat but is too subdivided to read as faceted`,
        ).toBeLessThanOrEqual(4);
        continue;
      }

      // Smooth displacement needs vertices to displace.
      expect(shell.detail).toBeGreaterThanOrEqual(8);
    }
  });

  it("keeps a rendered interior inside the shell that contains it", () => {
    const rendered = orbStyleOrder.filter(
      (id) => orbStyles[id].interior.kind !== "core",
    );

    expect(rendered.length).toBeGreaterThan(0);

    for (const styleId of orbStyleOrder) {
      const style = orbStyles[styleId];

      if (style.interior.kind === "core") {
        continue;
      }

      if (style.interior.kind === "nebula") {
        expect(style.interior.density).toBeGreaterThan(0);
      }

      if (style.interior.kind === "aurora") {
        // Zero spread collapses the four-stop ramp onto the two colours the
        // user picked, and a full turn comes back to where it started, so
        // neither end is a usable value.
        expect(style.interior.spread).toBeGreaterThan(0);
        expect(style.interior.spread).toBeLessThan(Math.PI);
      }

      // An interior is only visible through a shell that transmits.
      expect(style.surface).toBe("transmissive");

      // Think agitates the core hardest. The dominant displacement term is
      // `amount * 0.72`, so this bounds the widest the volume can swell to
      // before it pushes out through the body.
      const reach =
        style.base.distortion *
        0.55 *
        orbStateDeltas.think.form.coreAgitation *
        0.72;

      expect(
        style.coreScale + reach,
        `${styleId} can push its interior out through its own shell`,
      ).toBeLessThan(0.98);
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

  it("gives every style a motion signature GSAP can actually parse", () => {
    // An unknown ease name is not an error in GSAP: it silently falls back to
    // the default curve, so a typo would ship as "this style has no character"
    // rather than as a crash.
    for (const styleId of orbStyleOrder) {
      const { motion } = orbStyles[styleId];

      expect(
        typeof gsap.parseEase(motion.motionEase),
        `${styleId} motionEase does not parse`,
      ).toBe("function");
      expect(
        typeof gsap.parseEase(motion.shapeEase),
        `${styleId} shapeEase does not parse`,
      ).toBe("function");
    }

    // Proves the assertion above can fail: a name GSAP does not know returns
    // undefined rather than a curve.
    expect(gsap.parseEase("definitely.notAnEase")).toBeUndefined();
  });

  it("lets the heavy styles take longer than the light ones", () => {
    // The signature is only worth carrying if it actually separates the
    // styles; resin and soap film arriving in the same time would not.
    expect(orbStyles.amber.motion.durationScale).toBeGreaterThan(
      orbStyles.bubble.motion.durationScale,
    );
    expect(orbStyles.nebula.motion.durationScale).toBeGreaterThan(
      orbStyles.plasma.motion.durationScale,
    );

    for (const styleId of orbStyleOrder) {
      // Nothing so fast it reads as a cut, nothing so slow it reads as a wait.
      expect(orbStyles[styleId].motion.durationScale).toBeGreaterThanOrEqual(0.5);
      expect(orbStyles[styleId].motion.durationScale).toBeLessThanOrEqual(2);
    }
  });

  it("keeps overshoot off the styles that have mass", () => {
    // Stone and resin that spring back read as rubber. The check is on the
    // resolved curve, not the ease name, so a renamed ease cannot dodge it.
    const overshoots = (ease: string): boolean => {
      const curve = gsap.parseEase(ease);
      return Array.from({ length: 40 }, (_, index) =>
        curve((index + 1) / 40),
      ).some((value) => value > 1.0001);
    };

    for (const styleId of ["amber", "obsidian", "metal", "nebula"] as const) {
      expect(
        overshoots(orbStyles[styleId].motion.motionEase),
        `${styleId} should not spring`,
      ).toBe(false);
    }

    for (const styleId of ["bubble", "plasma", "ferrofluid"] as const) {
      expect(
        overshoots(orbStyles[styleId].motion.motionEase),
        `${styleId} should spring`,
      ).toBe(true);
    }
  });

  it("labels every state within the segmented control budget", () => {
    const labels = orbStateOrder.map((id) => orbStateDeltas[id].label);

    expect(labels.length).toBeLessThanOrEqual(4);
    for (const label of labels) expect(label.length).toBeLessThanOrEqual(9);
    expect(labels.join("").length).toBeLessThanOrEqual(24);
  });
});
