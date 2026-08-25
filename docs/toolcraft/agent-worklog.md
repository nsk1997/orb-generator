# Implementation Worklog

This file records product decisions and the evidence behind them. Keep it short, factual, and current. Update it after schema, renderer, timeline, layer, export, performance, or acceptance decisions.

## Status

Mode: product

Orb Generator renders a refractive, fluidly morphing assistant orb in WebGL, tunes it from the controls panel, and delivers it as a PNG or as a React Three Fiber snippet on the clipboard.

## Automatic Delivery Lifecycle

Keep this worklog human-shaped. For the first product delivery, record the request, decisions, state/output mapping, reference evidence, rejected alternatives, and known risks; one bare `npm run verify:delivery` derives complete contract proof, one build, full functional acceptance, and no measured performance. For later ordinary edits, record new intent and material decisions, the exact unit/component test, and acceptance IDs passed to `npm run test:feature`.

Classifier output establishes complaint authority only and never path localization. A localized performance complaint adds the domain authority fields, then one bare `npm run verify:delivery` runs one targeted iteration. The full audit remains separate and requires an explicit operator request or accepted offer before `npm run verify:perf` may run.

## Decisions

### Renderer

- Decision: Render the orb with React Three Fiber and Drei's `MeshTransmissionMaterial`, adding a vertex-displacement chunk to the material through a wrapped `onBeforeCompile`.
- Reason: Screen-space transmission gives real refraction, chromatic aberration, and volume attenuation, and injecting displacement at `beginnormal_vertex`/`begin_vertex` makes lighting, the transmission buffer, and the export frame all follow the morphed surface instead of a static sphere.
- Evidence: `src/app/orb/orb-scene.tsx`, `src/app/orb/orb-materials.ts`, `src/app/orb/orb-shader-chunks.ts`.

### View Interaction

- Decision: Use `orbit` with `view.orbit` as the single orientation target, applied to the product camera each frame.
- Reason: A refractive orb only reads when the viewing angle can be changed against the visible highlights, and there is a real three-dimensional scene, so `non-spatial` would be false.
- Evidence: `appProductReadiness.viewInteraction` in `src/app/app-acceptance-data.ts`; camera application in `src/app/orb/orb-scene.tsx`.

### Interaction Ownership

- Decision: The canvas owns turning the view through the runtime orientation handle; the panel owns camera distance as an exact number.
- Reason: Rotation is spatial and belongs beside the output; distance is one scalar users set precisely and reuse between exports, so the two operations do not mirror each other.
- Evidence: `appProductReadiness.interactionOwnership` entries `view-orbit-handle` and `view-distance-value`.

### Timeline

- Decision: Do not enable the timeline; declare `appTransferMode.animationIntent` mode `autonomous`.
- Reason: The surface flow is ambient presence with no start, end, or frame a user would seek to, and there is no video export, so a transport would offer nothing to control.
- Evidence: `appSchema.panels.timeline` is omitted; `appTransferMode.animationIntent` in `src/app/app-acceptance-data.ts`.

### Layers

- Decision: Do not enable layers.
- Reason: The product edits one orb; there are no multiple editable objects, groups, visibility, or ordering.
- Evidence: `appSchema.panels.layers` is omitted.

### Controls

- Decision: Group controls by orb entity — State presets, Colors, Glass, Motion, Glow, View — with Background and Image Export as the runtime-owned output sections.
- Reason: Each section names one thing about the orb, so a user changing "how glassy" never has to hunt across sections; the colour targets live under `appearance.*` because they describe the orb's appearance rather than its glass, motion, or glow parameters.
- Evidence: `src/app/app-schema.ts` and `appControlSectionInventory` in `src/app/app-acceptance-data.ts`.

### Export

- Decision: Image export only, through the runtime `export-image` action plus an `exportRenderer` that re-renders the live WebGL scene at the requested backing size. Copy Code is an additional clipboard action.
- Reason: The user asked for PNG-style delivery and a code snippet, not SVG or video; borrowing the live renderer guarantees the export is the frame on screen rather than a second scene that can drift.
- Evidence: `orbExportRenderer` in `src/app/app-composition.tsx`, `src/app/orb/orb-export-registry.ts`, `src/app/orb/orb-code-snippet.ts`.

### Performance

- Decision: Use lifecycle-aware protected delivery verification.
- Reason: The runner chooses complete initial functional proof, exact ownership-derived later functional proof, or one request-backed targeted performance iteration; full certification remains operator-only.
- Evidence: `npm run verify:delivery` protected receipt.

## Decision Trail

### Iteration 1 — Orb Generator first product delivery

- Request: Build an interactive "AI Orb Generator" using React, React Three Fiber, React Three Drei, and Tailwind CSS, with a dark two-pane layout, a refractive/morphing orb, Idle/Thinking/Searching/Speaking state presets, form controls for primary and core colours, refractive index, flow speed, distortion intensity and outer glow, real-time state binding, and a Copy Code button emitting an R3F snippet for the current values.
- Task type: Schema, custom WebGL renderer, controls, export, acceptance, and performance.
- User-visible result: The canvas shows a glass orb that refracts a local studio environment, flows continuously, and carries an emissive core and an outer halo. The panel applies four state presets, binds every listed parameter live, exports PNG at 2K/4K/8K, and copies a self-contained R3F component.
- Source/reference checked: The user prompt; Drei's `MeshTransmissionMaterial` source in `node_modules/@react-three/drei/core/MeshTransmissionMaterial.js`; three's vertex chunk order in `node_modules/three/src/renderers/shaders`; screenshots of the running app at each tuning step under `.toolcraft/browser-artifacts/`.
- Reference inputs: None. The user supplied a written product brief only, with no external design or motion source to port.
- Docs/contracts read: `workflow.md`, `schema-reference.md`, `component-rules.md`, `core/runtime-boundary.md`, `core/setup-export.md`, `core/control-selection.md`, `core/performance.md`.
- Contract rules applied: `runtime-shell-required`, `canvas-surface-preserved`, `controls-product-coverage`, `output-export-required`, `interaction-surface-ownership`, `renderer-view-interaction`, `acceptance-product-observable`, `persistence-policy-explicit`.
- View interaction intent: orbit; `view.orbit` is the one orientation target and the runtime handle is the only surface that writes it.
- Interaction ownership: The canvas owns direct view rotation; the panel owns camera distance as precise value entry. No other product operation appears on two surfaces.
- Decision: Keep one WebGL scene for preview and export. Read runtime values through a null-rendering bridge into a ref so a slider drag never re-renders the R3F tree, then damp displayed values toward panel values each frame, which is also what makes preset changes interpolate rather than snap. Integrate flow speed into a phase instead of sampling a clock, so changing speed never jumps the surface. Feed the environment probe to the transmission sampler as its background.
- Alternatives rejected: A second offscreen renderer for export, because it would drift from the preview; Drei `Lightformer` studio cards, because near-mirror glass reflects their hard quad edges as shards (replaced with soft-falloff panels plus a gradient dome); a back-faced fresnel shell for the outer glow, because it reads as a rind rather than light bleeding past the silhouette (replaced with a camera-facing halo with a punched-out centre so the transmission sampler does not blow out the interior); an HDR environment preset, because it would add a network fetch and make offline and test renders differ.
- State/output mapping: Runtime `state.values` feed `readOrbParams`, which feeds the render loop through `inputsRef`; the same reader feeds `createOrbCodeSnippet` for Copy Code and the export renderer for PNG, so panel, preview, snippet, and artifact cannot disagree.
- Performance intent: ordinary-product-work
- Verification: `npm run verify:delivery`.
- Risks: Screen-space transmission approximates refraction, so extreme distortion with a very low roughness can still show sampling artifacts. `canvas.renderScale` is intentionally not enabled: the preview already runs at device pixel ratio up to 2 and export renders at its own backing size, so the extra control would add a runtime knob with no product benefit — this is a deliberate deviation from the WebGL default in `core/setup-export.md`.

### Iteration 2 — Seamless surface loop and a reusable displacement attachment

- Request: Start phase 0 — swap the onBeforeCompile hack for three-custom-shader-material, and make the noise loop over a fixed period, before any style is tuned.
- Task type: Renderer, shader, unit proof.
- User-visible result: The surface now returns to exactly where it started every cycle, so a captured cycle can be looped without a cut. Motion keeps its previous rate and reads slightly softer and rounder.
- Source/reference checked: Drei's `MeshTransmissionMaterial` module exports, three-custom-shader-material 6.4.0 package typings and vanilla build, three's `ShaderLib` vertex sources.
- Reference inputs: None. Continuation of the written product brief.
- Docs/contracts read: `workflow.md`, `core/runtime-boundary.md`, `core/performance.md`, `renderer-technique.md`.
- Contract rules applied: `runtime-shell-required`, `canvas-surface-preserved`, `renderer-technique-inventory`.
- View interaction intent: Unchanged; orbit with `view.orbit` as the only orientation target.
- Interaction ownership: Unchanged; no new user-facing surfaces.
- Decision: Rejected three-custom-shader-material after inspecting it. It does chain a base material's existing `onBeforeCompile` and accepts a material instance, but Drei exports only the `MeshTransmissionMaterial` component and never its class, and that component owns the per-frame backside and buffer passes. Wrapping it would mean reimplementing Drei's transmission loop. Instead the existing injection moved to `orb-displacement.ts`, became material-agnostic, gained an idempotence guard, and now throws when a chunk marker is absent. For the loop, a translating noise field can never return, so each sample is taken twice one full drift apart and cross-faded across the cycle; the global pulse became harmonics of the cycle angle, and the integrated phase wraps to the loop span.
- Alternatives rejected: three-custom-shader-material, for the reason above. Rotating the noise domain, which loops exactly but reads as rigid spinning rather than flow. Higher-dimensional noise, which needs five dimensions for a looping three-dimensional field. Wall-clock browser sampling as the loop proof, because the render loop clamps its step to 1/20s and phase therefore advances slower than real time under software rendering.
- State/output mapping: `orb.flowSpeed` still integrates into `flowPhase`, now wrapped to `orbLoopSpan`; every layer shares that one phase so a future capture has a single period. Loop duration is `orbLoopSpan / flowSpeed` seconds.
- Performance intent: ordinary-product-work
- Verification: `npm run verify:delivery`.
- Risks: Risk: cross-fading doubles every noise sample, so the fbm dropped from three octaves to two to hold cost roughly level; the third octave carried 0.08 weight. Risk: the chosen breathe harmonics repeat at mid-cycle, so the global pulse beats twice per loop — recorded and covered by a test rather than left implicit.

### Iteration 3 — Orb styles composed with states

- Request: We will do all the above things but before it can we have presets of orbs of different different styles and with there states that we already have. Then: start phase 0, then next.
- Task type: Schema, renderer, controls, acceptance, performance.
- User-visible result: A Style control offers Glass, Bubble, Frost, and Metal. Each carries its own material, studio, palette, and resting parameters. The four states became Idle, Think, Search, and Speak, applied as energy deltas on top of whichever style is active, so a style stays recognisable in all four. Refractive index and Chromatic aberration disappear on the opaque style, where they do nothing.
- Source/reference checked: Drei's `MeshTransmissionMaterial` frame loop, the Toolcraft control-layout dependency validator, browser captures of all four styles under software rendering.
- Reference inputs: None. Written product brief only.
- Docs/contracts read: `component-rules.md`, `core/control-selection.md`, `core/layout.md`, `schema-reference.md`, `core/performance.md`.
- Contract rules applied: `controls-product-coverage`, `controls-layout-heuristics`, `control-section-entity-cohesion`, `acceptance-product-observable`, `performance-coverage-levels`.
- View interaction intent: Unchanged; orbit with `view.orbit`.
- Interaction ownership: Unchanged. Style and state are panel property edits; neither adds a canvas surface.
- Decision: A style owns everything with no slider — material, studio, palette, core scale, halo size — so it is a stored value rather than a one-shot preset, and structural values re-render the scene while continuous slider values still reach the render loop through a ref. States became deltas rather than twenty authored sets, which cuts tuning to five bases plus four deltas and keeps a state meaning the same thing everywhere. Colour belongs to the style, because a state that set colour would flatten every style into the same look. Metal reuses the same transmission material with `transmission: 0`, which makes Drei skip both buffer passes, so the opaque style costs less rather than the same.
- Alternatives rejected: A full twenty-set matrix, for tuning cost and state drift. A second material component for the opaque style, once Drei was found to skip its passes at zero transmission. A segmented style control, because Plasma would push it past the four-option cap. Keeping Refractive index visible on Metal, because an inert visible control is exactly what conditional applicability exists to prevent.
- State/output mapping: `orb.style` and `orb.state` are stored values; a bridge resolves them to the nine slider values and dispatches, skipping the first observation so a reload cannot overwrite restored tweaks. The same style feeds the material, the studio probe, and the Copy Code snippet.
- Performance intent: ordinary-product-work
- Verification: `npm run verify:delivery`.
- Risks: Risk: the style control now rebuilds the environment probe, which is declared in the render pipeline but only proven by eye so far. Risk: Frost reads grainy under software rendering because rough transmission samples sparsely at six samples; it needs checking on real hardware before the sample count is judged. Risk: Bubble is the most expensive style, and could not be rasterised at full canvas size under SwiftShader at all.

## Evidence

- Source reviewed: `src/app/app-schema.ts`, `src/app/app-composition.tsx`, `src/app/app-acceptance-data.ts`, `src/app/app-performance.ts`, `src/app/orb/orb-scene.tsx`, `src/app/orb/orb-materials.ts`, `src/app/orb/orb-shader-chunks.ts`, `src/app/orb/orb-params.ts`, `src/app/orb/orb-canvas.tsx`, `src/app/orb/orb-code-snippet.ts`, `src/app/orb/orb-export-registry.ts`.
- Contract applied: `runtime-shell-required`, `canvas-surface-preserved`, `controls-product-coverage`, `output-export-required`, `interaction-surface-ownership`, `renderer-view-interaction`, `acceptance-product-observable`, `persistence-policy-explicit`.
- Evidence: contracts read were `docs/toolcraft/workflow.md`, `docs/toolcraft/schema-reference.md`, `docs/toolcraft/component-rules.md`, `docs/toolcraft/core/runtime-boundary.md`, `docs/toolcraft/core/setup-export.md`, `docs/toolcraft/core/control-selection.md`, `docs/toolcraft/core/performance.md`.
- Style proof: `src/app/orb/orb-styles.test.ts` proves every style/state combination lands inside its slider domain, that colour is style-owned across all four states, that each state is more agitated than rest in every style, and that only the opaque style skips the transmission passes. `src/app/orb/orb-code-snippet.test.ts` proves Copy Code emits the selected style's material, studio, and geometry rather than the default one.
- Loop proof: `src/app/orb/orb-loop.test.ts` proves the cross-fade identity for an arbitrary noise function, continuity across the wrap, the exact pulse loop, phase wrapping over 5000 frames, and that the shipped shader keeps both the looping form and the original drift rate. `src/app/orb/orb-displacement.test.ts` proves injection against three's real physical and standard vertex shaders, uniform identity, idempotence, chaining onto a material's own `onBeforeCompile`, and a hard failure when a chunk marker is missing.
- Product observations: the rendered orb, the applied state presets, the clipboard snippet, and a decodable 4096x4096 `orb.png` from Export PNG at the default 4K setting are stored under `.toolcraft/browser-artifacts/`.

## Verification

- `npm run typecheck` passes.
- `npx vitest run src` passes.
- `node scripts/check-toolcraft-integrity.mjs` passes.
- `npm run verify:delivery` is the protected first-delivery gate and owns build plus browser acceptance evidence.

## Risks

- Risk: The Drei transmission material overwrites its own `time` uniform from the R3F clock each frame, so the material's internal distortion is not phase-integrated. The product displacement that owns the visible motion is, so a Flow speed change never jumps the surface.
- Risk: Very large exports allocate a full-size canvas twice, once as WebGL backing and once as the 2D composite, so 8K export is memory-heavy on low-end machines.
- Risk: Screen-space transmission approximates refraction, so extreme distortion combined with a very low roughness can still show sampling artifacts.
