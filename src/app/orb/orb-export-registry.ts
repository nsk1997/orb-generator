/**
 * The live R3F renderer is the single source of orb pixels. Export borrows it
 * through this registry so a PNG is exactly the frame on screen, at any size.
 */
export type OrbFrameRenderer = (
  width: number,
  height: number,
) => HTMLCanvasElement | null;

let activeRenderer: OrbFrameRenderer | null = null;

export function registerOrbFrameRenderer(renderer: OrbFrameRenderer): () => void {
  activeRenderer = renderer;

  return () => {
    if (activeRenderer === renderer) {
      activeRenderer = null;
    }
  };
}

export function getOrbFrameRenderer(): OrbFrameRenderer | null {
  return activeRenderer;
}
