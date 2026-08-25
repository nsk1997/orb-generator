/**
 * The live R3F renderer is the single source of orb pixels. Export borrows it
 * through this registry so a PNG is exactly the frame on screen, at any size.
 */
export type OrbFrameRenderer = (
  width: number,
  height: number,
) => HTMLCanvasElement | null;

export type OrbComposer = {
  render: () => void;
  setSize: (width: number, height: number) => void;
};

let activeRenderer: OrbFrameRenderer | null = null;
let activeComposer: OrbComposer | null = null;

/**
 * Export must composite through the same post pipeline the screen uses, or a
 * bloomed preview would download as an un-bloomed image.
 */
export function registerOrbComposer(composer: OrbComposer): () => void {
  activeComposer = composer;

  return () => {
    if (activeComposer === composer) {
      activeComposer = null;
    }
  };
}

export function getOrbComposer(): OrbComposer | null {
  return activeComposer;
}

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
