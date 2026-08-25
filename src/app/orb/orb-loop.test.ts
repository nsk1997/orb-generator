import { describe, expect, it } from "vitest";

import { orbDisplacementChunk, orbLoopSpan } from "./orb-shader-chunks";

/**
 * The cross-fade the shader performs, transcribed. The identity it must hold
 * is independent of the noise function, so a stub proves the technique: at
 * t=0 and t=1 both terms resolve to a sample of the same point.
 */
function loopSample(
  noise: (x: number) => number,
  point: number,
  drift: number,
  t: number,
): number {
  const a = noise(point + drift * t);
  const b = noise(point + drift * (t - 1));
  return a * (1 - t) + b * t;
}

// A hash stand-in proves the identity holds for *any* function; a smooth one
// is needed for continuity, because real simplex noise is smooth.
function hashNoise(x: number): number {
  const v = Math.sin(x * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

function smoothNoise(x: number): number {
  return Math.sin(x * 1.7) * 0.6 + Math.sin(x * 0.41 + 2.1) * 0.4;
}

function breathe(t: number): number {
  const angle = t * Math.PI * 2;
  return (Math.sin(angle) * 0.7 + Math.sin(angle * 2 + 1.3) * 0.3) * 0.18;
}

function advance(phase: number, step: number, speed: number): number {
  return (phase + step * speed) % orbLoopSpan;
}

describe("orb surface loop", () => {
  it("returns to its starting value at the end of a cycle, for any noise", () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const point = seed * 3.7 - 74;
      const drift = seed * 0.61 - 12;

      expect(loopSample(hashNoise, point, drift, 1)).toBeCloseTo(
        loopSample(hashNoise, point, drift, 0),
        12,
      );
    }
  });

  it("stays continuous across the wrap point", () => {
    const point = 4.25;
    const drift = 3.3;
    const justBefore = loopSample(smoothNoise, point, drift, 1 - 1e-6);
    const atStart = loopSample(smoothNoise, point, drift, 0);

    expect(Math.abs(justBefore - atStart)).toBeLessThan(1e-4);
  });

  it("loops the global breathe pulse exactly", () => {
    expect(breathe(1)).toBeCloseTo(breathe(0), 12);
    expect(breathe(0.25)).not.toBeCloseTo(breathe(0), 3);
  });

  it("breathes twice per cycle, by construction", () => {
    // The fundamental is zero at both 0 and 0.5 while the second harmonic
    // returns, so the pulse repeats mid-cycle. Recorded because it is a real
    // property of the chosen harmonics, not an accident to rely on silently.
    expect(breathe(0.5)).toBeCloseTo(breathe(0), 12);
  });

  it("wraps the integrated phase without drifting out of range", () => {
    let phase = 0;
    for (let frame = 0; frame < 5000; frame += 1) {
      phase = advance(phase, 1 / 60, 2.4);
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(orbLoopSpan);
    }
  });

  it("keeps the shipped shader on the looping form", () => {
    // Guards against a silent revert to a translating field, which looks fine
    // live but can never be captured as a seamless cycle.
    expect(orbDisplacementChunk).toContain("fract(orbFlow / ORB_LOOP_SPAN)");
    expect(orbDisplacementChunk).toContain(
      "mix(orbSimplex(p + drift * t), orbSimplex(p + drift * (t - 1.0)), t)",
    );
  });

  it("preserves the original motion rate through the rework", () => {
    // Drift per cycle must equal the pre-loop per-phase-unit travel times the
    // span, or the orb silently speeds up or slows down.
    const driftFromShader = (name: string): number[] => {
      const match = new RegExp(`vec3 ${name} = vec3\\(([^)]+)\\)`).exec(
        orbDisplacementChunk,
      );
      if (!match) throw new Error(`${name} is missing from the shader chunk`);
      return match[1].split(",").map((part) => Number(part.trim()));
    };

    const cases: readonly [string, number[]][] = [
      ["swellDrift", [0.55, -0.41, 0.27]],
      ["rippleDrift", [0.0, 0.72, 0.44]],
    ];

    for (const [name, perPhaseRate] of cases) {
      const shipped = driftFromShader(name);
      expect(shipped).toHaveLength(3);
      shipped.forEach((value, axis) => {
        expect(value).toBeCloseTo(perPhaseRate[axis] * orbLoopSpan, 2);
      });
    }
  });
});
