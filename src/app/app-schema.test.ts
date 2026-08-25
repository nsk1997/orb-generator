import { describe, expect, it } from "vitest";

import {
  appAcceptance,
  validateProductAcceptanceCoverage,
} from "./app-acceptance";
import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";

describe("appSchema", () => {
  it("publishes the base Toolcraft template app contract for AI assembly", () => {
    expect(appSchema.canvas.draggable).toBe(true);
    expect(appSchema.canvas.enabled).toBe(true);
    expect(appSchema.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(appSchema.canvas.upload).toBe(false);
    expect(appSchema.panels.controls?.sections[0]?.title).toBe("Setup");
    expect(appSchema.panels.controls?.sections[0]?.controls.settingsTransfer).toMatchObject({
      target: "runtime.settingsTransfer",
      type: "settingsTransfer",
    });
    expect(appSchema.panels.controls?.sections[0]?.controls.canvasAspectRatio).toMatchObject({
      target: "canvas.aspectRatio",
      type: "aspectRatio",
    });
    expect(appSchema.panels.controls?.sections[0]?.controls.canvasWidth).toMatchObject({
      target: "canvas.size.width",
      type: "text",
    });
    expect(appSchema.panels.controls?.sections[0]?.controls.canvasHeight).toMatchObject({
      target: "canvas.size.height",
      type: "text",
    });
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.panels.timeline).toBeUndefined();
    expect(appSchema.toolbar).toEqual({
      history: true,
      radar: true,
      theme: true,
      zoom: true,
    });
    expect(appSchema.assembly.components).toEqual([
      "canvas",
      "controlsPanel",
      "toolbar",
    ]);
    expect(appSchema.assembly.capabilities).toEqual(
      expect.arrayContaining([
        "canvas.draggable",
        "canvas.editableSize",
        "controls.defaults",
        "controls.panel",
        "toolbar.history",
        "toolbar.radar",
        "toolbar.theme",
        "toolbar.zoom",
      ]),
    );
    expect(appSchema.assembly.capabilities).not.toContain("timeline.playback");
    expect(appSchema.assembly.capabilities).not.toContain("timeline.keyframes");
    expect(appSchema.assembly.commands).toEqual(
      expect.arrayContaining([
        "canvas.center",
        "canvas.setSize",
        "canvas.setViewport",
        "canvas.zoomIn",
        "controls.reset",
        "controls.setValue",
        "history.undo",
      ]),
    );
    expect(appSchema.assembly.commands).not.toContain("timeline.setCurrentTime");
    // The orb is generated, not uploaded, so media import stays off.
    expect(appSchema.assembly.commands).not.toContain("media.import");
  });

  it("renders runtime setup first, then the orb product sections in order", () => {
    const titles = (appSchema.panels.controls?.sections ?? []).map(
      (section) => section.title,
    );

    expect(titles[0]).toBe("Setup");
    expect(titles).toEqual(
      expect.arrayContaining([
        "Style",
        "State",
        "Motion",
        "Glow",
        "View",
        "Image Export",
      ]),
    );
    // The orb is ambient motion, not authored product time.
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.panels.timeline).toBeUndefined();
  });

  it("does not imply timeline behavior before a product needs it", () => {
    expect(appSchema.assembly.capabilities).not.toContain("timeline.playback");
    expect(appSchema.assembly.capabilities).not.toContain("timeline.keyframes");
    expect(appSchema.assembly.commands).not.toContain("timeline.toggleControlKeyframes");
    expect(appSchema.assembly.commands).not.toContain("timeline.moveKeyframe");
  });

  it("declares the orb WebGL renderer and its one export workload dimension", () => {
    expect(appPerformance.rendererStrategy).toBe("webgl");
    expect(appPerformance.usesCustomRenderer).toBe(true);
    expect(appPerformance.workloadEnvelope.dimensions).toHaveLength(1);
    expect(appPerformance.workloadEnvelope.dimensions[0]).toMatchObject({
      batchMax: 8192,
      defaultValue: 4096,
      id: "export-output-pixels",
      mapping: "quadratic",
    });
    expect(appPerformance.scenarios.length).toBeGreaterThan(0);
  });

  it("declares production reload coverage for the orb schema", () => {
    expect(appSchema.persistence.storage).toBe("localStorage");
    if (appSchema.persistence.storage !== "localStorage") {
      throw new Error("The orb must persist user settings in localStorage.");
    }
    expect(appSchema.persistence.include).toContain("canvas");
    expect(
      appAcceptance.find((entry) => entry.id === "persistence.reload"),
    ).toMatchObject({
      automated: true,
      browser: true,
      evidence: "persistence-state",
      kind: "runtime",
      persistenceCoverage: "reload",
      persistenceSlices: appSchema.persistence.include,
      target: "canvas.size.width",
    });
    expect(validateProductAcceptanceCoverage()).toEqual([]);
  });
});
