# Orb Generator

An interactive **AI orb generator**: a refractive, fluidly morphing glass orb you tune from a form panel, then export as a PNG or copy as a ready-to-paste React Three Fiber component.

Built on [Toolcraft](https://www.npmjs.com/package/@pixel-point/toolcraft) with React Three Fiber, Drei, and three.js.

## What it does

- **State presets** — Idle, Thinking, Searching, and Speaking. Clicking one writes a complete parameter set; the orb eases into it rather than snapping.
- **Glass** — refractive index (1.0–3.0), roughness, and chromatic aberration on a `MeshTransmissionMaterial` shell.
- **Motion** — a noise field displaces the surface in the vertex shader, with distortion intensity and flow speed. Speed integrates into a phase, so changing it never jumps the surface.
- **Glow** — a camera-facing additive halo with intensity and spread.
- **Colors** — a primary tint carried by volume attenuation, and an emissive core seen refracted through the glass.
- **Export PNG** at 2K / 4K / 8K, with an optional transparent background.
- **Copy Code** emits a self-contained R3F component carrying the current values, including the vertex displacement that Drei does not ship with.

## Running it

```bash
npm install
npm install-scripts approve esbuild   # npm 12+ blocks postinstall scripts by default
npm run dev
```

## How the orb is rendered

Displacement is injected into the transmission material through a wrapped `onBeforeCompile` that rewrites the `beginnormal_vertex` and `begin_vertex` chunks, so lighting, refraction, the transmission buffer, and export all follow the morphed surface. Normals are rebuilt from two displaced neighbours on the sphere.

The studio environment is local — a gradient dome plus soft-falloff light panels, never a fetched HDR — so highlights are identical offline, in tests, and in export. Drei's transmission sampler renders the *main* scene, so the environment probe is handed to it explicitly as `background`; without that, the glass refracts empty black.

Product decisions and their evidence live in [`docs/toolcraft/agent-worklog.md`](docs/toolcraft/agent-worklog.md).

## Verification

```bash
npm run typecheck
npx vitest run src        # 441 tests
npm run build
```
