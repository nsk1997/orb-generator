import { defineToolcraft } from "@/toolcraft/runtime";

import { appIdentity } from "./app-identity";
import {
  orbDefaults,
  orbSceneBackgroundDefault,
  orbTargets,
  orbViewDistanceDefault,
} from "./orb/orb-params";
import {
  orbOpaqueStyleIds,
  orbStateDeltas,
  orbStateOrder,
  orbStyleOrder,
  orbStyles,
} from "./orb/orb-styles";

const always = { mode: "always" } as const;

export const appSchema = defineToolcraft({
  canvas: {
    enabled: true,
    size: { height: 1080, unit: "px", width: 1080 },
    sizing: { mode: "editable-output" },
    upload: false,
  },
  identity: appIdentity,
  panels: {
    controls: {
      sections: [
        {
          controls: {
            style: {
              applicability: always,
              defaultValue: "glass",
              description:
                "The surface material and the studio it reflects. Each style carries its own palette and resting parameters.",
              label: false,
              options: orbStyleOrder.map((id) => ({
                label: orbStyles[id].label,
                value: id,
              })),
              orderRole: "mode",
              performanceReason:
                "Switching style rebuilds the environment probe once, then reuses it.",
              performanceRole: "responsiveness",
              target: orbTargets.style,
              type: "select",
            },
            ior: {
              // Index of refraction does nothing at metalness 1, so the
              // control disappears rather than sitting there inert. The list
              // is derived from the styles themselves, so a new opaque style
              // cannot forget to hide it.
              applicability: {
                all: [{ notOneOf: orbOpaqueStyleIds, target: orbTargets.style }],
                mode: "conditional",
              },
              defaultValue: orbDefaults.ior,
              description:
                "How sharply light bends inside the orb. 1.0 is air, 1.5 is glass, 2.4 is diamond.",
              label: "Refractive index",
              max: 3,
              min: 1,
              orderRole: "primary",
              performanceReason:
                "Refraction is resolved by the transmission sampler that already runs every frame.",
              performanceRole: "responsiveness",
              sliderValueKind: "continuous",
              step: 0.01,
              target: orbTargets.ior,
              type: "slider",
            },
            roughness: {
              applicability: always,
              defaultValue: orbDefaults.roughness,
              label: "Roughness",
              max: 1,
              min: 0,
              orderRole: "detail",
              performanceReason:
                "Roughness only changes the blur of samples the material already takes.",
              performanceRole: "responsiveness",
              sliderValueKind: "continuous",
              step: 0.01,
              target: orbTargets.roughness,
              type: "slider",
            },
            chromaticAberration: {
              // Aberration is a property of transmitted light; an opaque
              // style has none to split.
              applicability: {
                all: [{ notOneOf: orbOpaqueStyleIds, target: orbTargets.style }],
                mode: "conditional",
              },
              defaultValue: orbDefaults.chromaticAberration,
              description:
                "Splits red, green, and blue through different refraction paths for a prismatic edge.",
              label: "Chromatic aberration",
              max: 1,
              min: 0,
              orderRole: "detail",
              performanceReason:
                "Aberration reuses the same transmission samples with offset indices of refraction.",
              performanceRole: "responsiveness",
              sliderValueKind: "continuous",
              step: 0.01,
              target: orbTargets.chromaticAberration,
              type: "slider",
            },
          },
          id: "orb-style",
          title: "Style",
        },
        {
          controls: {
            state: {
              applicability: always,
              defaultValue: "idle",
              description:
                "How agitated the surface is. States change energy, not identity, so a style stays recognisable in all four.",
              label: false,
              options: orbStateOrder.map((id) => ({
                label: orbStateDeltas[id].label,
                value: id,
              })),
              orderRole: "mode",
              performanceReason:
                "A state writes values the renderer eases toward; it adds no pass and no new resource.",
              performanceRole: "responsiveness",
              target: orbTargets.state,
              type: "segmented",
            },
          },
          id: "orb-state",
          title: "State",
        },
        {
          controls: {
            primaryColor: {
              applicability: always,
              defaultValue: orbDefaults.primaryColor,
              label: "Primary",
              orderRole: "color",
              performanceReason:
                "Tinting the glass and halo reuses the existing frame without new render passes.",
              performanceRole: "responsiveness",
              target: orbTargets.primaryColor,
              type: "color",
            },
            coreColor: {
              applicability: always,
              defaultValue: orbDefaults.coreColor,
              label: "Core",
              orderRole: "color",
              performanceReason:
                "The emissive core colour is a uniform update on an already-scheduled frame.",
              performanceRole: "responsiveness",
              target: orbTargets.coreColor,
              type: "color",
            },
          },
          id: "orb-colors",
          title: "Colors",
        },
        {
          controls: {
            distortion: {
              applicability: always,
              defaultValue: orbDefaults.distortion,
              description:
                "How far the surface travels away from a sphere as the noise field moves through it.",
              label: "Distortion intensity",
              max: 1,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "Amplitude scales an existing per-vertex noise field; the vertex count, octave count, and pass list are unchanged at every value.",
              performanceRole: "responsiveness",
              sliderValueKind: "continuous",
              step: 0.01,
              target: orbTargets.distortion,
              type: "slider",
            },
            flowSpeed: {
              applicability: always,
              defaultValue: orbDefaults.flowSpeed,
              label: "Flow speed",
              max: 3,
              min: 0,
              orderRole: "primary",
              performanceReason:
                "Speed advances an integrated phase and never changes per-frame cost.",
              performanceRole: "responsiveness",
              sliderValueKind: "continuous",
              step: 0.01,
              target: orbTargets.flowSpeed,
              type: "slider",
            },
          },
          id: "orb-motion",
          title: "Motion",
        },
        {
          controls: {
            glowIntensity: {
              applicability: always,
              defaultValue: orbDefaults.glowIntensity,
              label: "Glow intensity",
              max: 2,
              min: 0,
              orderRole: "strength",
              performanceReason:
                "The halo is one additive shell already drawn on every frame.",
              performanceRole: "responsiveness",
              sliderValueKind: "continuous",
              step: 0.01,
              target: orbTargets.glowIntensity,
              type: "slider",
            },
            glowSpread: {
              applicability: always,
              defaultValue: orbDefaults.glowSpread,
              description:
                "Lower values push the halo further from the silhouette; higher values keep it tight.",
              label: "Glow spread",
              max: 6,
              min: 1,
              orderRole: "detail",
              performanceReason:
                "Spread is the falloff exponent inside the halo fragment shader.",
              performanceRole: "responsiveness",
              sliderValueKind: "continuous",
              step: 0.1,
              target: orbTargets.glowSpread,
              type: "slider",
            },
          },
          id: "orb-glow",
          title: "Glow",
        },
        {
          controls: {
            orbit: {
              applicability: always,
              defaultValue: { position: [0, 0, 5], up: [0, 1, 0] },
              keyframeable: false,
              label: false,
              orderRole: "spatial",
              performanceReason:
                "Orbiting updates the camera matrix; the scene graph and its GPU resources are reused.",
              performanceRole: "responsiveness",
              target: orbTargets.viewOrbit,
              type: "orientationGizmo",
            },
            distance: {
              applicability: always,
              defaultValue: orbViewDistanceDefault,
              label: "Camera distance",
              max: 16,
              min: 3.5,
              orderRole: "spatial",
              performanceReason:
                "Camera framing changes matrices only; no pass is rebuilt.",
              performanceRole: "responsiveness",
              sliderValueKind: "continuous",
              step: 0.1,
              target: orbTargets.viewDistance,
              type: "slider",
            },
          },
          id: "orb-view",
          title: "View",
        },
        {
          controls: {
            includeBackground: {
              applicability: always,
              defaultValue: true,
              description:
                "Controls preview and PNG background visibility while video keeps the background.",
              label: "Include",
              performanceReason:
                "Toggling the backdrop changes one clear colour, not the render plan.",
              performanceRole: "responsiveness",
              target: orbTargets.includeBackground,
              type: "switch",
            },
            background: {
              applicability: always,
              defaultValue: orbSceneBackgroundDefault,
              label: false,
              performanceReason:
                "The backdrop colour is a clear-colour update on an already-scheduled frame.",
              performanceRole: "responsiveness",
              target: orbTargets.sceneBackground,
              type: "color",
            },
          },
          id: "orb-background",
          layoutGroups: [
            {
              columns: 2,
              controls: ["includeBackground", "background"],
              layout: "inline",
            },
          ],
          title: "Background",
        },
        {
          controls: {
            imageFormat: {
              applicability: always,
              defaultValue: "png",
              label: "Format",
              options: [
                { label: "PNG", value: "png" },
                { label: "JPG", value: "jpg" },
              ],
              performanceReason:
                "Format is read once by runtime export encoding and never during preview.",
              performanceRole: "responsiveness",
              target: "export.image.format",
              type: "select",
            },
            imageResolution: {
              applicability: always,
              defaultValue: "4k",
              label: "Resolution",
              options: [
                { label: "2K", value: "2k" },
                { label: "4K", value: "4k" },
                { label: "8K", value: "8k" },
              ],
              performanceReason:
                "Resolution sizes the one-off export render and never the live preview.",
              performanceRole: "workload",
              target: "export.image.resolution",
              type: "select",
            },
          },
          id: "orb-image-export",
          layoutGroups: [
            {
              columns: 2,
              controls: ["imageFormat", "imageResolution"],
              layout: "inline",
            },
          ],
          title: "Image Export",
        },
        {
          controls: {
            outputActions: {
              actions: [
                {
                  icon: "copy",
                  label: "Copy Code",
                  role: "copy-output",
                  value: "orb.copyCode",
                  variant: "outline",
                },
                {
                  icon: "upload-simple",
                  label: "Export PNG",
                  role: "export-image",
                  value: "export.png",
                },
              ],
              applicability: always,
              target: "actions.output",
              type: "panelActions",
            },
          },
          id: "orb-output",
          title: "Output",
        },
      ],
      title: "Orb",
    },
  },
  toolbar: {
    history: true,
    radar: true,
    theme: true,
    zoom: true,
  },
});
