import { describe, expect, it } from "vitest";

import {
  createOrbTransition,
  orbTransitionDurationSeconds,
  type OrbTransitionValues,
} from "./orb-transition";
import { orbStateDeltas } from "./orb-styles";

const idle: OrbTransitionValues = {
  ...orbStateDeltas.idle.form,
  ridge: 0,
  transientFollow: 0,
  transientLead: 0,
};

const search: OrbTransitionValues = {
  ...orbStateDeltas.search.form,
  ridge: 0.4,
  transientFollow: 0,
  transientLead: 0,
};

function build(withTransient = true) {
  return createOrbTransition(idle, search, { withTransient });
}

const weightKeys = [
  "calm",
  "coreAgitation",
  "pulse",
  "ridge",
  "sweep",
  "swirl",
] as const;

describe("orb transition timeline", () => {
  it("is a pure function of time, whatever order it is sampled in", () => {
    // The whole point of moving off the damped chase: the damp integrates
    // whatever deltas the machine happened to produce, so it cannot answer
    // "what does frame 12 look like" without replaying frames 0..11.
    const forward = build();
    const scrambled = build();

    const grid = Array.from({ length: 28 }, (_, index) => index / 30);
    const played = grid.map((time) => forward.sampleAt(time));

    for (const index of [17, 3, 26, 0, 9, 22, 1, 27, 14]) {
      expect(scrambled.sampleAt(grid[index])).toStrictEqual(played[index]);
    }
  });

  it("resolves the same whether it is stepped or jumped straight to", () => {
    // A backwards seek must not leave a tween holding a start value it
    // recorded on a previous pass. This is what the literal `fromTo`
    // endpoints buy, and it fails outright with plain `to()` tweens.
    const stepped = build();
    const jumped = build();
    const target = 0.4;

    for (let time = 0; time <= 0.9; time += 1 / 60) {
      stepped.sampleAt(time);
    }
    stepped.sampleAt(0);
    const afterRoundTrip = stepped.sampleAt(target);

    expect(afterRoundTrip).toStrictEqual(jumped.sampleAt(target));
  });

  it("starts exactly at the incoming weights and ends exactly at the target", () => {
    const transition = build();

    expect(transition.sampleAt(0)).toStrictEqual(idle);

    const settled = transition.sampleAt(transition.durationSeconds);
    for (const key of weightKeys) {
      expect(settled[key]).toBeCloseTo(search[key], 10);
    }
    // The envelope is a round trip: it must return to rest, or a state change
    // would leave the orb permanently brighter than it started.
    expect(settled.transientFollow).toBeCloseTo(0, 10);
    expect(settled.transientLead).toBeCloseTo(0, 10);
  });

  it("holds the settled state past the end rather than running on", () => {
    const transition = build();
    const atEnd = transition.sampleAt(transition.durationSeconds);

    expect(transition.sampleAt(transition.durationSeconds + 5)).toStrictEqual(atEnd);
  });

  it("fires the light-leads-geometry envelope only when asked", () => {
    const withTransient = build(true);
    const withoutTransient = build(false);

    const peak = Array.from({ length: 30 }, (_, index) =>
      withTransient.sampleAt(index / 30).transientLead,
    );
    expect(Math.max(...peak)).toBeGreaterThan(0.9);

    for (let index = 0; index < 30; index += 1) {
      const sample = withoutTransient.sampleAt(index / 30);
      expect(sample.transientFollow).toBe(0);
      expect(sample.transientLead).toBe(0);
    }
  });

  it("lets the light peak before the geometry does", () => {
    const transition = build();
    const samples = Array.from({ length: 40 }, (_, index) =>
      transition.sampleAt(index / 60),
    );

    const peakIndex = (key: "transientFollow" | "transientLead"): number =>
      samples.reduce(
        (best, sample, index) =>
          sample[key] > samples[best][key] ? index : best,
        0,
      );

    expect(peakIndex("transientLead")).toBeLessThan(peakIndex("transientFollow"));
  });

  it("runs no longer than the authored transition budget", () => {
    expect(build().durationSeconds).toBeLessThanOrEqual(
      orbTransitionDurationSeconds,
    );
  });
});
