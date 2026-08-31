import gsap from "gsap";

import type { OrbMotionSignature, OrbStateForm } from "./orb-styles";

/**
 * The set of weights a state change owns. Slider-driven scalars are not here:
 * those chase the panel continuously while a drag is in flight, and damping is
 * the right model for a value the user is still moving. A state change is a
 * discrete event with a beginning and an end, which is what a timeline models.
 */
export type OrbTransitionValues = OrbStateForm & {
  ridge: number;
  transientFollow: number;
  transientLead: number;
};

/**
 * Shape settles first and motion arrives after it. Splitting the morph in two
 * is the whole reason this is a timeline: one damp rate per family could say
 * how fast a weight closes its gap, but never that these arrive after those.
 */
export type OrbTransitionRole = "motion" | "shape";

export type OrbTransitionMorphStep = Readonly<{
  atSeconds: number;
  durationSeconds: number;
  role: OrbTransitionRole;
}>;

export type OrbTransitionEnvelopeStep = Readonly<{
  atSeconds: number;
  durationSeconds: number;
  ease: string;
  from: number;
  key: "transientFollow" | "transientLead";
  to: number;
}>;

/** Long enough to read as a move, short enough to not feel like a wait. */
export const orbTransitionDurationSeconds = 0.9;

/**
 * Timing only, with no mention of which values move. The generated snippet
 * replays this same choreography over a wider set of keys — it has no sliders,
 * so its scalars morph too — and sharing the timings is what keeps a pasted
 * orb moving like the one the user copied it from.
 */
export const orbTransitionMorph: readonly OrbTransitionMorphStep[] = [
  { atSeconds: 0, durationSeconds: 0.72, role: "shape" },
  // Offset, because the forms that read as motion should arrive after the
  // shape has committed rather than alongside it.
  { atSeconds: 0.08, durationSeconds: 0.78, role: "motion" },
];

/**
 * Light leads, geometry follows. A fast rise and a slow fall is what makes a
 * state change land as an event instead of a crossfade.
 */
export const orbTransitionEnvelope: readonly OrbTransitionEnvelopeStep[] = [
  {
    atSeconds: 0,
    durationSeconds: 0.16,
    ease: "power3.out",
    from: 0,
    key: "transientLead",
    to: 1,
  },
  {
    atSeconds: 0.16,
    durationSeconds: 0.62,
    ease: "power2.inOut",
    from: 1,
    key: "transientLead",
    to: 0,
  },
  {
    atSeconds: 0.06,
    durationSeconds: 0.22,
    ease: "power3.out",
    from: 0,
    key: "transientFollow",
    to: 1,
  },
  {
    atSeconds: 0.28,
    durationSeconds: 0.6,
    ease: "power2.inOut",
    from: 1,
    key: "transientFollow",
    to: 0,
  },
];

/** Which weights each role moves in the app. The snippet adds its scalars. */
export const orbTransitionFormKeys: Readonly<
  Record<OrbTransitionRole, readonly (keyof OrbTransitionValues)[]>
> = {
  motion: ["pulse", "sweep", "swirl"],
  shape: ["calm", "coreAgitation", "ridge"],
};

export type OrbTransition = {
  durationSeconds: number;
  /**
   * Pure: the same `seconds` yields the same weights no matter when, how often,
   * or in what order it is called. That is the property export needs, and the
   * damped chase this replaces could not offer it.
   */
  sampleAt: (seconds: number) => OrbTransitionValues;
};

export type OrbTransitionOptions = {
  /** The moving style's signature. Scales the timings and picks the eases. */
  signature: OrbMotionSignature;
  /**
   * A state change fires the light-leads-geometry envelope; a style change that
   * only moves the ridge weight must not, or switching preset would flash.
   */
  withTransient: boolean;
};

/** The signature every style is read against, and the fallback for tests. */
export const orbNeutralMotionSignature: OrbMotionSignature = {
  durationScale: 1,
  motionEase: "back.out(1.2)",
  shapeEase: "power2.inOut",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function easeFor(
  role: OrbTransitionRole,
  signature: OrbMotionSignature,
): string {
  return role === "motion" ? signature.motionEase : signature.shapeEase;
}

function pick(
  values: OrbTransitionValues,
  keys: readonly (keyof OrbTransitionValues)[],
): Record<string, number> {
  return Object.fromEntries(keys.map((key) => [key, values[key]]));
}

/**
 * Builds the authored envelope for one state change.
 *
 * Every tween is a `fromTo` with literal endpoints, and that is load-bearing
 * rather than stylistic. A plain `to()` records its start value the first time
 * it renders, so a timeline seeked backwards then forwards can resolve
 * differently than one played straight through. Pinning both ends makes the
 * whole timeline a function of time alone.
 */
export function createOrbTransition(
  from: OrbTransitionValues,
  to: OrbTransitionValues,
  options: OrbTransitionOptions,
): OrbTransition {
  const values: OrbTransitionValues = { ...from };
  const timeline = gsap.timeline({ paused: true });

  const { durationScale } = options.signature;

  orbTransitionMorph.forEach((step, index) => {
    const keys = orbTransitionFormKeys[step.role];

    timeline.fromTo(
      values,
      pick(from, keys),
      {
        ...pick(to, keys),
        duration: step.durationSeconds * durationScale,
        ease: easeFor(step.role, options.signature),
        // The first tween may render at build time; every later one must not,
        // or it would stamp its start value over the object before any seek.
        immediateRender: index === 0,
      },
      step.atSeconds * durationScale,
    );
  });

  if (options.withTransient) {
    // The envelope keeps its own eases across every style. Light leading
    // geometry is how a state change reads as an event at all; it is not a
    // trait one style should have more of than another. Only its clock scales,
    // so it stays inside the morph it belongs to.
    for (const step of orbTransitionEnvelope) {
      timeline.fromTo(
        values,
        { [step.key]: step.from },
        {
          [step.key]: step.to,
          duration: step.durationSeconds * durationScale,
          ease: step.ease,
          immediateRender: false,
        },
        step.atSeconds * durationScale,
      );
    }
  }

  const durationSeconds = timeline.duration();

  return {
    durationSeconds,
    sampleAt: (seconds: number): OrbTransitionValues => {
      // `true` suppresses the tween callbacks a seek would otherwise fire, and
      // renders the whole timeline at that time rather than only what changed.
      timeline.time(clamp(seconds, 0, durationSeconds), true);

      // Rebuilt key by key rather than spread: GSAP hangs a `_gsap` cache off
      // every object it animates, and a spread would hand that internal out
      // with the weights.
      return {
        calm: values.calm,
        coreAgitation: values.coreAgitation,
        pulse: values.pulse,
        ridge: values.ridge,
        sweep: values.sweep,
        swirl: values.swirl,
        transientFollow: values.transientFollow,
        transientLead: values.transientLead,
      };
    },
  };
}
