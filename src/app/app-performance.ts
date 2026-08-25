import {
  defineToolcraftPerformance,
  deriveToolcraftPerformancePaths,
  registerToolcraftRendererPipeline,
  type ToolcraftEnvelopePerformanceConfig,
  type ToolcraftPerformanceScenario,
} from "@/toolcraft/runtime";

import { appSchema } from "./app-schema";

const exportPixelsByResolution: Readonly<Record<string, number>> = {
  "2k": 2048,
  "4k": 4096,
  "8k": 8192,
};

const resolutionByExportPixels = new Map(
  Object.entries(exportPixelsByResolution).map(([option, pixels]) => [
    pixels,
    option,
  ]),
);

type OrbPipelineContracts = {
  "environment-probe": {
    resource: { readonly probeId: string };
    resourceKey: readonly [string];
    result: { readonly ready: boolean };
  };
  "orb-transmission-buffer": {
    resource: { readonly bufferId: string };
    resourceKey: readonly [string, number, number];
    result: { readonly sampled: boolean };
  };
  "orb-surface": {
    resource: { readonly sceneId: string };
    resourceKey: readonly [string, string];
    result: { readonly drawn: boolean };
  };
  "orb-export-frame": {
    resource: never;
    resourceKey: never;
    result: { readonly longEdgePixels: number };
  };
};

export const orbRendererPipeline = registerToolcraftRendererPipeline<OrbPipelineContracts>()({
    interactionInvalidation: [
      {
        interaction: "initial-render",
        invalidates: [
          "environment-probe",
          "orb-transmission-buffer",
          "orb-surface",
        ],
        targets: ["appearance.primaryColor", "orb.ior", "view.distance"],
      },
      {
        interaction: "animation-frame",
        invalidates: ["orb-transmission-buffer", "orb-surface"],
        mustNotInvalidate: ["environment-probe"],
        targets: ["orb.flowSpeed", "orb.distortion"],
      },
      {
        interaction: "control-change",
        invalidates: ["orb-transmission-buffer", "orb-surface"],
        mustNotInvalidate: ["environment-probe"],
        targets: [
          "appearance.primaryColor",
          "appearance.coreColor",
          "orb.ior",
          "orb.roughness",
          "orb.chromaticAberration",
          "orb.distortion",
          "orb.flowSpeed",
          "orb.glowIntensity",
          "orb.glowSpread",
          "view.orbit",
          "view.distance",
          "scene.background",
          "export.includeBackground",
        ],
      },
      {
        interaction: "control-drag",
        invalidates: ["orb-transmission-buffer", "orb-surface"],
        mustNotInvalidate: ["environment-probe"],
        targets: [
          "orb.ior",
          "orb.roughness",
          "orb.chromaticAberration",
          "orb.distortion",
          "orb.flowSpeed",
          "orb.glowIntensity",
          "orb.glowSpread",
          "view.distance",
        ],
      },
      {
        interaction: "viewport-drag",
        invalidates: [],
        mustNotInvalidate: [
          "environment-probe",
          "orb-transmission-buffer",
          "orb-surface",
        ],
        targets: ["canvas.offset.x", "canvas.offset.y"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: [
          "environment-probe",
          "orb-transmission-buffer",
          "orb-surface",
        ],
        targets: ["canvas.zoom"],
      },
      {
        interaction: "export",
        invalidates: ["orb-export-frame"],
        mustNotInvalidate: ["environment-probe"],
        targets: ["export.image.format", "export.image.resolution"],
      },
    ],
    passes: [
      {
        cacheKey: ["studio-environment"],
        cost: {
          dimensions: [],
          frequency: "once",
          relationship: "constant",
        },
        id: "environment-probe",
        inputs: ["studio-dome", "studio-light-panels"],
        invalidatedBy: ["initial-render"],
        kind: "preprocess",
        lifecycle: { cache: "retained-resource", resourceScope: "renderer" },
        output: "intermediate",
        quality: "full",
        runsOn: "gpu",
      },
      {
        cost: {
          dimensions: [],
          frequency: "frame",
          relationship: "constant",
        },
        cacheKey: ["orb-transmission-fbo", "canvas.size.width", "canvas.size.height"],
        id: "orb-transmission-buffer",
        inputs: ["environment-probe", "orb-core", "orb-halo"],
        invalidatedBy: [
          "animation-frame",
          "control-change",
          "control-drag",
          "initial-render",
        ],
        kind: "composite",
        lifecycle: { cache: "retained-resource", resourceScope: "renderer" },
        output: "intermediate",
        quality: "full",
        runsOn: "gpu",
      },
      {
        cost: {
          dimensions: [],
          frequency: "frame",
          relationship: "constant",
        },
        cacheKey: ["orb-scene-graph", "orb-surface-program"],
        id: "orb-surface",
        inputs: ["environment-probe", "orb-transmission-buffer"],
        invalidatedBy: [
          "animation-frame",
          "control-change",
          "control-drag",
          "initial-render",
        ],
        kind: "composite",
        lifecycle: { cache: "retained-resource", resourceScope: "renderer" },
        output: "preview",
        quality: "full",
        runsOn: "gpu",
      },
      {
        cost: {
          dimensions: ["export-output-pixels"],
          frequency: "batch",
          relationship: "quadratic",
        },
        id: "orb-export-frame",
        inputs: ["orb-surface"],
        invalidatedBy: ["export"],
        kind: "export",
        lifecycle: { cache: "none", resourceScope: "call" },
        output: "export",
        quality: "export",
        runsOn: "export-only",
      },
    ],
    runtimeId: "orb-generator-webgl",
});

const scenarioProse: Readonly<
  Record<string, { expectedObservable: string; fixture: string }>
> = {
  "animation-frame": {
    expectedObservable:
      "The orb surface keeps flowing while the transmission buffer and scene composite are reused rather than rebuilt.",
    fixture: "default orb at the Idle preset",
  },
  "control-change": {
    expectedObservable:
      "A committed control value reaches the orb on the next frame without recompiling the environment probe.",
    fixture: "default orb at the Idle preset",
  },
  "control-drag": {
    expectedObservable:
      "The orb keeps responding during the whole slider gesture, not only on release.",
    fixture: "default orb at the Idle preset",
  },
  export: {
    expectedObservable:
      "Export PNG downloads a decodable image whose long edge matches the selected resolution.",
    fixture: "default orb at the Idle preset",
  },
  "initial-render": {
    expectedObservable:
      "The first frame shows the refracted orb after the environment probe has been built once.",
    fixture: "cold load of the default orb",
  },
  "viewport-drag": {
    expectedObservable:
      "Panning the workspace moves the canvas without re-rendering the orb scene.",
    fixture: "default orb at the Idle preset",
  },
  "viewport-zoom": {
    expectedObservable:
      "Zooming the workspace scales the existing canvas without re-rendering the orb scene.",
    fixture: "default orb at the Idle preset",
  },
};

function createScenarios(): ToolcraftPerformanceScenario[] {
  const paths = deriveToolcraftPerformancePaths(appSchema, {
    rendererPipeline: orbRendererPipeline,
  } as unknown as ToolcraftEnvelopePerformanceConfig);

  return paths.map((path, index): ToolcraftPerformanceScenario => {
    const prose = scenarioProse[path.interaction] ?? {
      expectedObservable: "The orb output stays correct on this path.",
      fixture: "default orb at the Idle preset",
    };
    const base = {
      automated: true,
      automatedTestName: `orb ${path.interaction} path stays on its declared passes`,
      browser: true,
      browserTestName: `browser perf: orb ${path.interaction} path`,
      coversTargets: path.targets,
      expectedObservable: prose.expectedObservable,
      fixture: prose.fixture,
      id: `orb-${path.interaction}-${index}`,
      pathId: path.id,
      uiSelector: '[data-toolcraft-product-output="orb"] canvas',
    };

    if (path.interaction === "export") {
      return {
        ...base,
        actionValue: "export.png",
        completionEvidence: "download",
        controlLabel: "Export PNG",
        interaction: "export",
      };
    }

    return { ...base, interaction: path.interaction };
  });
}

export const appPerformance: ToolcraftEnvelopePerformanceConfig =
  defineToolcraftPerformance({
    fixtureAdapters: {
      dimensions: {
        "export-output-pixels": {
          apply: (value: number) =>
            resolutionByExportPixels.get(value) ?? "4k",
          dimensionId: "export-output-pixels",
          domain: {
            kind: "schema-options",
            optionValues: ["2k", "4k", "8k"],
            target: "export.image.resolution",
          },
          entries: [
            { appliedValue: "2k", value: 2048 },
            { appliedValue: "4k", value: 4096 },
            { appliedValue: "8k", value: 8192 },
          ],
          kind: "exhaustive-discrete",
          observe: (appliedValue) =>
            exportPixelsByResolution[String(appliedValue)] ?? 4096,
        },
      },
    },
    rendererPipeline: orbRendererPipeline,
    rendererStrategy: "webgl",
    rendererTechnique: {
      exportRenderer: "webgl",
      fidelityRisks: [
        "Screen-space transmission samples the environment probe rather than tracing rays, so refraction is an approximation that changes with surface curvature.",
      ],
      layers: [
        {
          content: ["shader", "geometry"],
          exportMode: "included",
          id: "orb-body",
          kind: "product-foreground",
          primitiveCount: "high",
          renderer: "webgl",
          uiSelector: '[data-toolcraft-product-output="orb"] canvas',
        },
        {
          content: ["shader"],
          exportMode: "included",
          id: "orb-halo",
          kind: "background",
          primitiveCount: "low",
          renderer: "webgl",
        },
      ],
      performanceRisks: [
        "The transmission sampler renders the scene into a 1024px buffer every frame, and the backside pass doubles that cost.",
      ],
      previewRenderer: "webgl",
      productRepresentation: "pixel",
      rendererStrategy: "webgl",
      sourceRepresentation: "procedural-data",
      whyNotAlternativeStrategies: [
        "Canvas 2D cannot evaluate a per-vertex noise field or index-of-refraction sampling, so a glass orb would become a painted gradient.",
        "SVG has no volumetric transmission, chromatic aberration, or displaced normals.",
        "WebGPU would add a capability gate for a scene that already holds frame budget on WebGL.",
      ],
    },
    scenarios: createScenarios(),
    usesCustomRenderer: true,
    workloadEnvelope: {
      dimensions: [
        {
          batchMax: 8192,
          defaultValue: 4096,
          id: "export-output-pixels",
          // Long edge in, area out: doubling the edge quadruples the pixels
          // rendered, read back, and encoded.
          mapping: "quadratic",
          source: {
            kind: "schema-target",
            target: "export.image.resolution",
          },
          unit: "px",
        },
      ],
    },
  });
