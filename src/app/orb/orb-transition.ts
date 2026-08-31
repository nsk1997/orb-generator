import gsap from "gsap";

import type { OrbStateForm } from "./orb-styles";

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
  /**
   * A state change fires the light-leads-geometry envelope; a style change that
   * only moves the ridge weight must not, or switching preset would flash.
   */
  withTransient: boolean;
};

/** Long enough to read as a move, short enough to not feel like a wait. */
export const orbTransitionDurationSeconds = 0.9;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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

  // The shape morph carries the change and starts immediately.
  timeline.fromTo(
    values,
    { calm: from.calm, coreAgitation: from.coreAgitation, ridge: from.ridge },
    {
      calm: to.calm,
      coreAgitation: to.coreAgitation,
      duration: 0.72,
      ease: "power2.inOut",
      ridge: to.ridge,
    },
    0,
  );

  // Pulse, sweep and swirl are the forms that read as motion rather than shape,
  // so they lag the morph slightly and settle with a little overshoot. Four
  // damp rates could not express "these three arrive after those three".
  timeline.fromTo(
    values,
    { pulse: from.pulse, sweep: from.sweep, swirl: from.swirl },
    {
      duration: 0.78,
      ease: "back.out(1.2)",
      immediateRender: false,
      pulse: to.pulse,
      sweep: to.sweep,
      swirl: to.swirl,
    },
    0.08,
  );

  if (options.withTransient) {
    // Light leads. A fast rise and a slow fall is what makes the switch land as
    // an event instead of a crossfade.
    timeline
      .fromTo(
        values,
        { transientLead: 0 },
        {
          duration: 0.16,
          ease: "power3.out",
          immediateRender: false,
          transientLead: 1,
        },
        0,
      )
      .fromTo(
        values,
        { transientLead: 1 },
        {
          duration: 0.62,
          ease: "power2.inOut",
          immediateRender: false,
          transientLead: 0,
        },
        0.16,
      );

    // Geometry follows, trailing the light by about one frame at 30fps on the
    // way up and settling a beat later.
    timeline
      .fromTo(
        values,
        { transientFollow: 0 },
        {
          duration: 0.22,
          ease: "power3.out",
          immediateRender: false,
          transientFollow: 1,
        },
        0.06,
      )
      .fromTo(
        values,
        { transientFollow: 1 },
        {
          duration: 0.6,
          ease: "power2.inOut",
          immediateRender: false,
          transientFollow: 0,
        },
        0.28,
      );
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
