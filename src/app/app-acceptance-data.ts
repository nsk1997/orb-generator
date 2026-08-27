import type {
  ToolcraftComponentAcceptance,
  ToolcraftControlSectionInventoryEntry,
  ToolcraftProductReadiness,
  ToolcraftTransferMode,
} from "./acceptance/types";
import { appSchema } from "./app-schema";

const persistenceSlices =
  appSchema.persistence.storage === "localStorage"
    ? appSchema.persistence.include
    : [];

export const appTransferMode: ToolcraftTransferMode = {
  animationIntent: {
    behaviorCoverage: [
      "no-user-facing-transport",
      "no-play-pause",
      "no-scrub",
      "no-duration-control",
      "no-loop-control",
      "no-export-at-time",
    ],
    mode: "autonomous",
    reason:
      "The orb surface flows continuously from a noise field advanced by Flow speed. It is ambient presence, not authored product time: there is no start, no end, and no frame a user would seek to, so a transport would offer nothing to control.",
  },
  mode: "new-toolcraft-app",
  referenceInputs: [],
};

export const appProductReadiness: ToolcraftProductReadiness = {
  exportIntent: {
    image: { mode: "toolcraft-default" },
    svg: { mode: "not-requested" },
    video: { mode: "not-requested" },
  },
  interactionOwnership: [
    {
      alternative: {
        reason:
          "Three numeric fields for a view direction make the user solve a rotation in their head instead of turning the orb they can see.",
        surface: "panel",
      },
      capability: "direct-spatial-edit",
      evidence: {
        detail:
          "The requested product is a refractive orb whose highlights and caustics only read when the viewing angle can be changed against the visible result.",
        source: "usability-analysis",
      },
      id: "view-orbit-handle",
      reason:
        "Turning the view is a spatial operation, so it belongs on the canvas next to the output it changes.",
      surface: "canvas",
      target: "view.orbit",
    },
    {
      alternative: {
        reason:
          "A canvas dolly gesture would compete with the orbit handle for the same pointer without adding precision.",
        surface: "canvas",
      },
      capability: "precise-value-entry",
      evidence: {
        detail:
          "Framing the orb for an export at a repeatable size needs a readable number, not a gesture.",
        source: "usability-analysis",
      },
      id: "view-distance-value",
      reason:
        "Camera distance is a single scalar that users set exactly and reuse between exports.",
      selectionScope: { mode: "global" },
      surface: "panel",
      target: "view.distance",
    },
  ],
  mode: "product",
  productName: "Orb Generator",
  productSummary:
    "A refractive, fluidly morphing assistant orb tuned from a form panel and delivered as a PNG or a React Three Fiber snippet.",
  requestedBehavior:
    "Render an orb with transmission, refraction, and surface distortion; switch it between styles that differ in kind — smooth glass, a faceted crystal, amber that takes its colour from depth, a polished opaque stone, a spiked ferrofluid, a raymarched nebula interior, and flowing hue bands — move it between Idle, Thinking, Searching, and Speaking presets; bind colours, refractive index, flow speed, distortion, and outer glow to live form controls; and copy a usable R3F snippet for the current values.",
  viewInteraction: {
    mode: "orbit",
    orientationTargets: ["view.orbit"],
  },
};

export const appControlSectionInventory: readonly ToolcraftControlSectionInventoryEntry[] =
  [
    {
      entity: "Orb surface",
      entityId: "orb-surface",
      groupingReason:
        "The style selector lives beside the surface properties it governs, because refraction and aberration only apply to the styles that transmit light.",
      id: "orb-style",
      targets: [
        "orb.style",
        "orb.ior",
        "orb.roughness",
        "orb.chromaticAberration",
      ],
      title: "Style",
    },
    {
      entity: "Orb state",
      entityId: "orb-state",
      groupingReason:
        "One control for how agitated the orb is, applied on top of whichever style is selected.",
      id: "orb-state",
      targets: ["orb.state"],
      title: "State",
    },
    {
      entity: "Orb colour",
      entityId: "orb-colour",
      groupingReason:
        "Both colours describe the same orb body: the glass and halo tint, and the emissive heart seen through it.",
      id: "orb-colors",
      targets: ["appearance.primaryColor", "appearance.coreColor"],
      title: "Colors",
    },
    {
      entity: "Orb surface motion",
      entityId: "orb-motion",
      groupingReason:
        "Distortion and flow speed are the amplitude and rate of the one noise field that morphs the surface.",
      id: "orb-motion",
      targets: ["orb.distortion", "orb.flowSpeed"],
      title: "Motion",
    },
    {
      entity: "Orb outer glow",
      entityId: "orb-glow",
      groupingReason:
        "Intensity and spread are the two parameters of the single halo drawn behind the orb.",
      id: "orb-glow",
      targets: ["orb.glowIntensity", "orb.glowSpread"],
      title: "Glow",
    },
    {
      entity: "Orb camera view",
      entityId: "orb-view",
      groupingReason:
        "The orbit handle and the camera distance together position the one camera that frames the orb.",
      id: "orb-view",
      targets: ["view.orbit", "view.distance"],
      title: "View",
    },
    {
      entity: "Output background",
      entityId: "orb-background",
      groupingReason:
        "The include switch and the colour are the one background decision shared by preview and export.",
      id: "orb-background",
      targets: ["export.includeBackground", "scene.background"],
      title: "Background",
    },
    {
      entity: "Image export settings",
      entityId: "orb-image-export",
      groupingReason:
        "Format and resolution are the two settings of the single PNG export artifact.",
      id: "orb-image-export",
      targets: ["export.image.format", "export.image.resolution"],
      title: "Image Export",
    },
  ];

function control(
  entry: Readonly<{
    componentType: string;
    expectedObservable: string;
    id: string;
    interactionId?: string;
    target: string;
    userAction: string;
  }>,
): ToolcraftComponentAcceptance {
  return {
    ...(entry.interactionId ? { interactionId: entry.interactionId } : {}),
    automated: true,
    automatedTestName: `applies ${entry.id} to the orb render model`,
    browser: true,
    browserTestName: `browser: ${entry.id} changes visible orb pixels`,
    componentType: entry.componentType,
    evidence: "rendered-pixels",
    expectedObservable: entry.expectedObservable,
    fixture: "default orb at the Idle preset",
    id: entry.id,
    kind: "control",
    target: entry.target,
    userAction: entry.userAction,
  };
}

export const appAcceptance: readonly ToolcraftComponentAcceptance[] = [
  {
    automated: true,
    automatedTestName: "applies each style's material, studio, and palette",
    browser: true,
    browserTestName: "browser: each style changes the rendered orb and its sliders",
    componentType: "select",
    evidence: "rendered-pixels",
    expectedObservable:
      "Choosing a style writes that style's palette and resting parameters into the visible controls, rebuilds the studio it reflects, and switches the surface material, the shell geometry, and the interior; an opaque style also hides Refractive index and Chromatic aberration.",
    fixture: "default orb at the Glass style, Idle state",
    id: "orb.style",
    kind: "control",
    optionCoverage: "each-visible-item",
    target: "orb.style",
    userAction: "Choose each style in turn: Glass, Bubble, Crystal, Amber, Frost, Obsidian, Metal, Ferrofluid, Nebula, Aurora, and Plasma.",
  },
  {
    automated: true,
    automatedTestName: "applies every state delta on top of the active style",
    browser: true,
    browserTestName: "browser: each state moves the sliders and the rendered orb",
    componentType: "segmented",
    evidence: "rendered-pixels",
    expectedObservable:
      "Each state writes the resolved parameter set into the visible sliders, one undo restores the previous set, and the orb eases to the new surface while keeping the active style's colours.",
    fixture: "default orb at the Glass style, Idle state",
    id: "orb.state",
    kind: "control",
    optionCoverage: "each-visible-item",
    target: "orb.state",
    userAction:
      "Select Idle, Think, Search, and Speak in turn and read the Style, Motion, and Glow controls.",
  },
  control({
    componentType: "color",
    expectedObservable:
      "The glass tint, volume attenuation, and outer halo all take the chosen colour.",
    id: "appearance.primaryColor",
    target: "appearance.primaryColor",
    userAction: "Set Primary to a distinct hex value.",
  }),
  control({
    componentType: "color",
    expectedObservable:
      "The emissive heart seen through the glass takes the chosen colour.",
    id: "appearance.coreColor",
    target: "appearance.coreColor",
    userAction: "Set Core to a distinct hex value.",
  }),
  control({
    componentType: "slider",
    expectedObservable:
      "Refraction through the shell bends further as the value rises, changing the transmitted image.",
    id: "orb.ior",
    target: "orb.ior",
    userAction: "Drag Refractive index from 1.0 to 3.0.",
  }),
  control({
    componentType: "slider",
    expectedObservable:
      "Reflections and transmitted detail blur as roughness rises.",
    id: "orb.roughness",
    target: "orb.roughness",
    userAction: "Drag Roughness from 0 to 1.",
  }),
  control({
    componentType: "slider",
    expectedObservable:
      "Red, green, and blue separate along refraction edges as the value rises.",
    id: "orb.chromaticAberration",
    target: "orb.chromaticAberration",
    userAction: "Drag Chromatic aberration from 0 to 1.",
  }),
  control({
    componentType: "slider",
    expectedObservable:
      "The surface travels further from a sphere and its silhouette changes shape.",
    id: "orb.distortion",
    target: "orb.distortion",
    userAction: "Drag Distortion intensity from 0 to 1.",
  }),
  control({
    componentType: "slider",
    expectedObservable:
      "The surface flows faster without jumping, because the phase is integrated rather than sampled from a clock.",
    id: "orb.flowSpeed",
    target: "orb.flowSpeed",
    userAction: "Drag Flow speed from 0 to 3 and watch consecutive frames.",
  }),
  control({
    componentType: "slider",
    expectedObservable: "The halo behind the orb brightens as the value rises.",
    id: "orb.glowIntensity",
    target: "orb.glowIntensity",
    userAction: "Drag Glow intensity from 0 to 2.",
  }),
  control({
    componentType: "slider",
    expectedObservable:
      "The halo tightens against the silhouette at high values and spreads outward at low values.",
    id: "orb.glowSpread",
    target: "orb.glowSpread",
    userAction: "Drag Glow spread from 1 to 6.",
  }),
  control({
    componentType: "slider",
    expectedObservable:
      "The orb occupies less of the frame as the camera moves back.",
    id: "view.distance",
    interactionId: "view-distance-value",
    target: "view.distance",
    userAction: "Drag Camera distance from 3.5 to 16.",
  }),
  {
    automated: true,
    automatedTestName: "applies the orbit pose to the product camera",
    browser: true,
    browserTestName: "browser: the orientation handle turns the rendered orb",
    canvasHandle: {
      exportCleanTestName:
        "browser: exported orb pixels contain no orientation handle",
      outputObservable:
        "The orb is seen from the dragged direction and its highlights move with the camera.",
      testId: "toolcraft-orientation-gizmo",
      writesTarget: "view.orbit",
    },
    componentType: "orientationGizmo",
    evidence: "rendered-pixels",
    expectedObservable:
      "Dragging an axis turns the camera around the orb, snapping to an axis frames that side, undo and reset restore the previous pose, and the handle never appears in exported pixels.",
    fixture: "default orb at the Idle preset",
    id: "view.orbit",
    interactionId: "view-orbit-handle",
    kind: "canvas-handle",
    orientationGizmoCoverage: "all-required-orientation-gizmo-behavior",
    target: "view.orbit",
    userAction:
      "Drag the canvas orientation handle, click an axis, undo, and export.",
  },
  {
    automated: true,
    automatedTestName: "resolves background output for preview and export",
    backgroundOutputCoverage: "all-required-background-output",
    browser: true,
    browserTestName:
      "browser: background include and colour drive preview and exported pixels",
    componentType: "switch",
    evidence: "rendered-pixels",
    expectedObservable:
      "Background off clears the preview backdrop and exports a transparent PNG; background on paints the chosen colour in both.",
    fixture: "default orb at the Idle preset",
    id: "export.includeBackground",
    kind: "control",
    target: "export.includeBackground",
    userAction: "Toggle Background off and on, then export.",
  },
  control({
    componentType: "color",
    expectedObservable:
      "The preview backdrop and the exported PNG background take the chosen colour.",
    id: "scene.background",
    target: "scene.background",
    userAction: "Set Background color to a distinct hex value.",
  }),
  {
    automated: true,
    automatedTestName: "passes the selected image format to runtime export",
    browser: true,
    browserTestName: "browser: image format selects the downloaded artifact type",
    componentType: "select",
    evidence: "exported-bytes",
    expectedObservable:
      "PNG downloads a .png with transparency support and JPG downloads an opaque .jpg.",
    fixture: "default orb at the Idle preset",
    id: "export.image.format",
    kind: "control",
    optionCoverage: "each-visible-item",
    target: "export.image.format",
    userAction: "Choose each Format option and export.",
  },
  {
    automated: true,
    automatedTestName: "passes the selected image resolution to runtime export",
    browser: true,
    browserTestName:
      "browser: image resolution changes exported pixel dimensions",
    componentType: "select",
    evidence: "exported-bytes",
    expectedObservable:
      "2K, 4K, and 8K produce 2048, 4096, and 8192 pixel long edges in the downloaded file.",
    fixture: "default orb at the Idle preset",
    id: "export.image.resolution",
    kind: "control",
    optionCoverage: "each-visible-item",
    target: "export.image.resolution",
    userAction: "Choose each Resolution option and export.",
  },
  {
    actionCoverage: ["export.png", "orb.copyCode"],
    automated: true,
    automatedTestName: "delivers the tuned orb as pixels and as source",
    browser: true,
    browserTestName:
      "browser: Export PNG downloads orb pixels and Copy Code writes a snippet",
    componentType: "panelActions",
    evidence: "exported-bytes",
    exportArtifactCoverage: "all-required-image-export-behavior",
    expectedObservable:
      "Export PNG downloads a decodable image of the current orb at the selected format and resolution, and Copy Code places a React Three Fiber component carrying the current values on the clipboard.",
    fixture: "default orb at the Idle preset",
    id: "actions.output",
    kind: "control",
    target: "actions.output",
    userAction: "Click Export PNG, then click Copy Code and read the clipboard.",
  },
  {
    automated: true,
    automatedTestName: "declares production reload coverage for the orb schema",
    browser: true,
    browserTestName:
      "browser: app restores exact canvas, values, and panel workspace slices after reload",
    componentType: "persistence",
    evidence: "persistence-state",
    expectedObservable:
      "The tuned orb parameters, canvas size and zoom, and the moved and collapsed Orb panel remain visibly restored after a real browser reload.",
    fixture: "orb tuned away from every default",
    id: "persistence.reload",
    kind: "runtime",
    persistenceCoverage: "reload",
    persistenceSlices,
    target: "canvas.size.width",
    userAction:
      "Tune several orb controls, edit Canvas width and zoom, move and collapse the Orb panel, wait for persistence, and reload the page.",
  },
  {
    automated: true,
    automatedTestName: "keeps runtime canvas sizing wired to product output",
    browser: true,
    browserTestName: "browser: canvas sizing changes the product output frame",
    componentType: "runtime",
    evidence: "product-output",
    expectedObservable:
      "Aspect presets and manual width or height edits resize the orb viewport and the exported frame.",
    fixture: "default orb at the Idle preset",
    id: "canvas.sizing",
    kind: "runtime",
    target: "canvas.size.width",
    userAction:
      "Choose an aspect preset, then type a Canvas width and a Canvas height.",
  },
  {
    automated: true,
    automatedTestName: "restores finite canvas sizing when infinity is disabled",
    browser: true,
    browserTestName:
      "browser: infinity canvas hides finite sizing and restores it on exit",
    componentType: "runtime",
    evidence: "viewport-side-effect",
    expectedObservable:
      "Infinity canvas on hides Aspect ratio, Canvas width, and Canvas height, removes artboard clipping around the orb, and fills the viewport with the chosen background; turning it off restores the dormant finite size unchanged.",
    fixture: "default orb at the Idle preset",
    id: "canvas.infinity.mode",
    infinityCanvasCoverage: "mode-and-restoration",
    kind: "runtime",
    target: "canvas.infinity",
    userAction:
      "Turn Infinity canvas on, pan the workspace, then turn it off and read the sizing controls.",
  },
  {
    automated: true,
    automatedTestName: "crops infinite export to the declared orb scene bounds",
    browser: true,
    browserTestName:
      "browser: infinite image export crops to the orb scene bounds",
    componentType: "runtime",
    evidence: "exported-bytes",
    expectedObservable:
      "Exporting in Infinity mode produces an image framed by the orb scene rectangle from ToolcraftAppComposition.sceneBoundsProvider rather than the dormant finite canvas.",
    fixture: "default orb at the Idle preset in Infinity mode",
    id: "canvas.infinity.export",
    infinityCanvasCoverage: "scene-bounds-image-export",
    kind: "runtime",
    target: "canvas.infinity",
    userAction: "Turn Infinity canvas on, pan the workspace, and click Export PNG.",
  },
];
