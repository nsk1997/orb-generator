import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react";
import type { ToolcraftProductExportRenderer } from "@/toolcraft/runtime";

import { orbRendererPipeline } from "./app-performance";
import { appSchema } from "./app-schema";
import { OrbCanvas } from "./orb/orb-canvas";
import { createOrbCodeSnippet } from "./orb/orb-code-snippet";
import { getOrbFrameRenderer } from "./orb/orb-export-registry";
import {
  orbTargets,
  readOrbParams,
  readOrbSceneBackground,
  readOrbViewDistance,
} from "./orb/orb-params";
import {
  orbStateDeltas,
  orbStyles,
  readOrbStateId,
  readOrbStyleId,
} from "./orb/orb-styles";

const orbExportRenderer: ToolcraftProductExportRenderer = {
  baseFileName: "orb",
  renderFrame: ({ context, frame, pixelRatio }) => {
    const renderOrbFrame = getOrbFrameRenderer();

    if (!renderOrbFrame) {
      return;
    }

    const width = Math.max(1, Math.round(frame.width * pixelRatio));
    const height = Math.max(1, Math.round(frame.height * pixelRatio));
    const snapshot = renderOrbFrame(width, height);

    if (!snapshot) {
      return;
    }

    context.drawImage(snapshot, frame.x, frame.y, frame.width, frame.height);
  },
};

export const appComposition: ToolcraftAppComposition = {
  canvasContent: <OrbCanvas />,
  exportRenderer: orbExportRenderer,
  modelPresentation: { mode: "runtime" },
  rendererPipelineRegistration: orbRendererPipeline,
  onPanelAction: ({ action, reportFeedback, state }) => {
    if (action.value !== "orb.copyCode") {
      return;
    }

    const snippet = createOrbCodeSnippet(readOrbParams(state.values), {
      backgroundColor: readOrbSceneBackground(state.values),
      form: orbStateDeltas[readOrbStateId(state.values[orbTargets.state])].form,
      style: orbStyles[readOrbStyleId(state.values[orbTargets.style])],
      viewDistance: readOrbViewDistance(state.values),
    });

    return navigator.clipboard.writeText(snippet).catch(() => {
      reportFeedback({
        code: "clipboard-unavailable",
        message: "The browser blocked clipboard access, so the code was not copied.",
      });
    });
  },
  sceneBoundsProvider: ({ state }) => [
    {
      height: state.canvas.size.height,
      width: state.canvas.size.width,
      x: 0,
      y: 0,
    },
  ],
  schema: appSchema,
};
