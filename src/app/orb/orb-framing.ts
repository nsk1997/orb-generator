import { MathUtils } from "three";

/**
 * Vertical field of view at a 1:1 frame. Every other aspect is derived from
 * this one, so the square case stays the reference the styles were tuned in.
 */
export const orbBaseFov = 30;

/**
 * A three.js perspective camera measures its field of view vertically, so a
 * fixed fov keeps the orb at a constant share of the frame's *height* and lets
 * its share of the width run wherever the aspect puts it: at 16:9 the orb
 * covered a quarter of the width, and at 9:16 it covered four fifths and
 * nearly touched the sides. Those do not read as one orb in two crops.
 *
 * Widening the vertical fov on a portrait frame pins the horizontal field
 * instead, which leaves the orb at the same share of whichever side is
 * shorter. That is the property a framing has to hold to survive a crop.
 */
export function orbFovForAspect(aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0 || aspect >= 1) {
    return orbBaseFov;
  }

  const halfHeight = Math.tan(MathUtils.degToRad(orbBaseFov) / 2);

  return MathUtils.radToDeg(2 * Math.atan(halfHeight / aspect));
}
