import { Color, MathUtils } from "three";

/**
 * Below this the remaining gap is smaller than anything the renderer can show,
 * so closing it costs nothing visible and buys an exact resting value.
 */
const settleEpsilon = 1e-4;

/**
 * Damping that actually arrives.
 *
 * `MathUtils.damp` approaches its target asymptotically and never reaches it,
 * which is right while a value is being dragged and wrong once it has settled:
 * Flow speed dragged to 0 left a speed of about 1e-9 rather than 0, so the flow
 * phase kept creeping and the surface never came to rest. A control set to its
 * minimum should mean that minimum, so the last sliver is closed outright.
 */
export function dampSettled(
  current: number,
  target: number,
  rate: number,
  step: number,
): number {
  const next = MathUtils.damp(current, target, rate, step);

  return Math.abs(target - next) <= settleEpsilon ? target : next;
}

/** The same arrival for a colour chase, so a resting palette is exactly its target. */
export function lerpSettled(
  current: Color,
  target: Color,
  alpha: number,
): Color {
  const next = current.lerp(target, alpha);

  if (
    Math.abs(target.r - next.r) <= settleEpsilon &&
    Math.abs(target.g - next.g) <= settleEpsilon &&
    Math.abs(target.b - next.b) <= settleEpsilon
  ) {
    next.copy(target);
  }

  return next;
}
