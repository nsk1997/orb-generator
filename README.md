# Orb Generator

**Live: https://orb-generator.netlify.app**

An interactive **AI orb generator**: a refractive, fluidly morphing orb you tune from a form panel, then export as an image or copy as a ready-to-paste React Three Fiber component that your own app can drive.

Built on [Toolcraft](https://www.npmjs.com/package/@pixel-point/toolcraft) with React Three Fiber, Drei, and three.js.

## What it does

- **Eleven styles that differ in kind, not degree** — Glass, Bubble, Crystal, Amber, Frost, Obsidian, Metal, Ferrofluid, Nebula, Aurora, and Plasma. Some are transmissive and some are opaque; Crystal is faceted, Ferrofluid is spiked, Amber takes its colour from how far light travelled through it, Nebula raymarches a volume interior, and Aurora flows bands of hue like an assistant orb. Choosing one rewrites the palette and the resting parameters, and hides the controls it has no use for — an opaque style has no refractive index.
- **Four states** — Idle, Think, Search, and Speak. A state change plays an authored sequence rather than easing everything at one rate: the shape commits first, the forms that read as motion arrive after it with a little overshoot, and the light leads the geometry. Each style moves in its own way, so Amber arrives slowly and never springs while Plasma is the fastest and the springiest.
- **Surface** — refractive index, roughness, and chromatic aberration on a `MeshTransmissionMaterial` shell.
- **Motion** — a noise field displaces the surface in the vertex shader, with distortion intensity and flow speed. Speed integrates into a phase, so changing it never jumps the surface, and **Flow speed 0 stops the orb** rather than merely slowing it.
- **Glow** — a camera-facing additive halo with intensity and spread, feeding a bloom pass that export runs through too.
- **Colours** — a primary tint carried by volume attenuation, and an emissive core seen refracted through the shell. Both belong to the style until you change them, and a state change never overrides them.
- **Export** — PNG or JPG at 2K / 4K / 8K, with an optional transparent background. Framing holds the orb at the same share of the frame across every aspect ratio.
- **Copy Code** emits a self-contained R3F component that carries **all four states and takes a `state` prop**, so a pasted orb can be driven from your own app rather than frozen in whichever state was on screen. It includes the vertex displacement Drei does not ship with, and reproduces what the generator shows — the same glass tint, the same background, the same response curves.

## Running it

```bash
npm install
npm install-scripts approve esbuild   # npm 12+ blocks postinstall scripts by default
npm run dev
```

## How the orb is rendered

Displacement is injected into the transmission material through a wrapped `onBeforeCompile` that rewrites the `beginnormal_vertex` and `begin_vertex` chunks, so lighting, refraction, the transmission buffer, and export all follow the morphed surface. Normals are rebuilt from two displaced neighbours on the sphere.

The studio environment is local — a gradient dome plus soft-falloff light panels, never a fetched HDR — so highlights are identical offline, in tests, and in export. Drei's transmission sampler renders the *main* scene, so the environment probe is handed to it explicitly as `background`; without that, the glass refracts empty black.

The renderer owns its own clock. Drei's transmission material otherwise drives its `time` uniform from the R3F clock every frame, which discards the integrated flow phase and leaves Flow speed unable to affect the surface at all.

Anything the generator and the copied snippet both need — the glass tint, the response curves behind bloom, glow, and distortion, the transition timings — has exactly one definition, which the emitter serialises into the snippet. Two copies of one formula agree until someone retunes one of them, and the difference only shows up if you render both and compare pixels.

Product decisions and their evidence live in [`docs/toolcraft/agent-worklog.md`](docs/toolcraft/agent-worklog.md).

## Verification

```bash
npm run typecheck
npx vitest run src        # 523 tests
npm run ai:check
npm run build
```

Browser acceptance does not currently run: the app declares eleven browser scenarios and ten of them have never been written. `npm run verify:delivery` and `npm run verify:perf` are both blocked behind that, the second because it requires a current delivery receipt and the first because the delivery catalog refuses a named test that is absent from the Playwright suite.

Writing them is ordinary work rather than a blocked path, but it is not trivial. The scene is heavy enough that a run takes minutes, and the acceptance gate needs a byte-identical baseline before each action, which an orb running its own clock cannot give. Two real product properties make one reachable: `Flow speed` at 0 stops the surface, and an opaque style skips the transmission sampler whose multi-pass buffers are the part that still varies between frames. An opaque style at rest measures 0.0000 mean channel difference between consecutive frames, so it can anchor a comparison. Clicks need `force` because a busy WebGL frame defeats Playwright's actionability check. The measurements and the dead ends are in the worklog.
