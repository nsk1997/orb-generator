import { describe, expect, it } from "vitest";
import {
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  ShaderLib,
  type WebGLProgramParametersWithUniforms,
} from "three";

import {
  applyOrbDisplacementToShader,
  attachOrbDisplacement,
  createOrbDisplacementUniforms,
  OrbDisplacementError,
} from "./orb-displacement";

function shaderFor(name: "physical" | "standard"): WebGLProgramParametersWithUniforms {
  return {
    fragmentShader: ShaderLib[name].fragmentShader,
    uniforms: {},
    vertexShader: ShaderLib[name].vertexShader,
  } as unknown as WebGLProgramParametersWithUniforms;
}

describe("orb displacement injection", () => {
  // Both bases matter: glass styles ride MeshPhysicalMaterial, an opaque
  // metal style rides MeshStandardMaterial, and both must displace.
  it.each(["physical", "standard"] as const)(
    "replaces both vertex chunks in three's %s shader",
    (name) => {
      const shader = shaderFor(name);

      applyOrbDisplacementToShader(shader, createOrbDisplacementUniforms(1));

      expect(shader.vertexShader).not.toContain("#include <beginnormal_vertex>");
      expect(shader.vertexShader).not.toContain("#include <begin_vertex>");
      expect(shader.vertexShader).toContain("orbDisplacedNormal(position");
      expect(shader.vertexShader).toContain("vec3 transformed = orbSurfacePosition;");
      expect(shader.vertexShader).toContain("float orbSimplex(vec3 v)");
    },
  );

  it("wires the shared uniform objects rather than copying their values", () => {
    const shader = shaderFor("physical");
    const uniforms = createOrbDisplacementUniforms(1.14);

    applyOrbDisplacementToShader(shader, uniforms);
    uniforms.orbFlow.value = 3.5;

    // The render loop mutates these every frame, so identity must survive.
    expect(shader.uniforms.orbFlow).toBe(uniforms.orbFlow);
    expect(shader.uniforms.orbDistortion).toBe(uniforms.orbDistortion);
    expect(shader.uniforms.orbScale.value).toBe(1.14);
    expect((shader.uniforms.orbFlow as { value: number }).value).toBe(3.5);
  });

  it("fails loudly when a chunk marker is missing", () => {
    const shader = {
      fragmentShader: "",
      uniforms: {},
      vertexShader: "void main() { gl_Position = vec4(0.0); }",
    } as unknown as WebGLProgramParametersWithUniforms;

    // Without this guard the shader still compiles and renders a motionless
    // sphere, which is the worst possible failure mode.
    expect(() =>
      applyOrbDisplacementToShader(shader, createOrbDisplacementUniforms(1)),
    ).toThrow(OrbDisplacementError);
  });

  it("preserves a material's own onBeforeCompile", () => {
    const material = new MeshPhysicalMaterial();
    const calls: string[] = [];
    material.onBeforeCompile = (shader) => {
      calls.push("inherited");
      shader.fragmentShader = `// drei-style patch\n${shader.fragmentShader}`;
    };

    attachOrbDisplacement(material, createOrbDisplacementUniforms(1), "orb-test");

    const shader = shaderFor("physical");
    material.onBeforeCompile(shader, null as never);

    expect(calls).toEqual(["inherited"]);
    expect(shader.fragmentShader).toContain("// drei-style patch");
    expect(shader.vertexShader).toContain("vec3 transformed = orbSurfacePosition;");
  });

  it("does not patch the same material twice", () => {
    const material = new MeshStandardMaterial();
    const uniforms = createOrbDisplacementUniforms(1);

    attachOrbDisplacement(material, uniforms, "orb-test");
    attachOrbDisplacement(material, uniforms, "orb-test");

    const shader = shaderFor("standard");
    material.onBeforeCompile(shader, null as never);

    const preambleCount = shader.vertexShader.split("float orbSimplex(vec3 v)").length - 1;
    expect(preambleCount).toBe(1);
    expect(material.customProgramCacheKey()).toBe("orb-test");
  });
});
