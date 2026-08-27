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

### Iteration 4 — Bloom, the Plasma style, and export through the composer

- Request: phase 2
- Task type: Renderer, post processing, export, controls, acceptance, performance.
- User-visible result: A Plasma style joins the four existing ones: an emissive core inside a partly transmissive shell, in a dark room, with heavy bloom. All styles now render through a bloom pass whose strength is per style and scaled by the existing Glow control, and exported PNGs carry that bloom.
- Source/reference checked: `@react-three/postprocessing` 3.1.0 peer ranges against the installed React Three Fiber and three versions, browser captures of Glass before and after the composer, a Plasma export decoded and compared against the screen.
- Reference inputs: None. Written product brief only.
- Docs/contracts read: `core/performance.md`, `renderer-technique.md`, `core/setup-export.md`, `component-rules.md`.
- Contract rules applied: `renderer-technique-inventory`, `output-export-required`, `controls-product-coverage`, `acceptance-product-observable`.
- View interaction intent: Unchanged; orbit with `view.orbit`.
- Interaction ownership: Unchanged. Bloom has no control of its own; it rides the existing Glow value.
- Decision: The composer takes over rendering from the default loop, so export renders through the composer too rather than calling the renderer directly, which would have produced un-bloomed images that still looked correct on screen. Bloom strength lives on the style instead of becoming a tenth slider, and is scaled by Glow so the existing control gains reach. Tone mapping stayed on the materials rather than moving into a tone-mapping effect, because moving it would have shifted all four tuned styles.
- Alternatives rejected: A dedicated bloom slider, which would duplicate what Glow already means. Moving tone mapping into the composer, which is more correct but would have re-tuned every existing style. Leaving bloom uniform across styles, which would have made a mirror bleed like a plasma.
- State/output mapping: `orb.style` selects the bloom configuration; the render loop multiplies its intensity by the live Glow value; the same configuration is emitted into the Copy Code snippet so a pasted orb keeps its glow.
- Performance intent: ordinary-product-work
- Verification: `npm run verify:delivery`.
- Risks: Risk: bloom visibly softened the existing styles at first, and their intensities were reduced until the change reads as an addition rather than a retune; Glass is still slightly softer than before Phase 2. Risk: the bloom pass runs every frame on top of a transmissive scene, and its cost has only been observed under software rendering.

### Iteration 5 — States as departure forms, tinted and transient

- Request: make state chnages dynamic it they should feel like wow and able to show difference, lets discuss this. Then: subtle to medium colour, restrained transient, and check the best libraries for orbs.
- Task type: Renderer, shader, colour, controls behaviour, acceptance.
- User-visible result: The four states now differ in kind rather than degree. Think churns the core inside a calm shell, Search runs a ridge circling the orb, Speak bursts on a beat, Idle breathes. Each state also shifts the active style's palette a little in OKLCH, and switching states fires one short envelope where light leads and geometry follows.
- Source/reference checked: three shipped references supplied by the user and inspected in a browser — the Liquid Orb Editor, Thinking Logos, and the ElevenLabs UI Orb component and its documented API.
- Reference inputs: The user supplied two URLs as look-and-feel references, not as material to clone. Their contribution is conceptual: Thinking Logos states each leave the mark for a different form and come back, on a dwell plus two morphs cycle, and ElevenLabs exposes a seed for reproducible animation and an agent state of thinking, listening, or talking.
- Docs/contracts read: `component-rules.md`, `core/performance.md`, `renderer-technique.md`.
- Contract rules applied: `renderer-technique-inventory`, `controls-product-coverage`, `acceptance-product-observable`.
- View interaction intent: Unchanged; orbit with `view.orbit`.
- Interaction ownership: Unchanged. No control was added; the existing State control gained meaning.
- Decision: A state became a form rather than an amount, because the previous deltas were one dial and Search in particular was only Idle played faster. Every form is driven off the cycle angle so the seamless loop from Phase 0 survives. Colour returned to states as a bounded OKLCH modulation of the style palette rather than a replacement, which keeps the Phase 1 rule that colour carries style identity while making the four states legible at rest. The transient is deliberately small and staggered rather than a flash, so it still reads on the tenth click.
- Alternatives rejected: Adopting a library. The ElevenLabs orb is a component copy rather than a package, and taking it would mean replacing the renderer and losing transmission, the styles and export; react-native-magic-orb is the wrong platform; the Liquid Orb Editor is a product. Also rejected for now: the internal banding and ridge flow that gives the Liquid Orb its richness, because it changes the material and would re-tune all five styles.
- State/output mapping: `orb.state` selects a form and a tint; the form weights are damped in the render loop so states morph rather than cut; the tint is resolved into the visible colour controls, so Copy Code inherits it.
- Performance intent: ordinary-product-work
- Verification: `npm run verify:delivery`.
- Risks: Risk: the sweep ridge and the beat are motion, and a still frame cannot show them, so only the silhouette and palette differences are proven by capture. Risk: the transient is time based and not part of state, so a frame exported mid-transition is not reproducible from the parameters alone; steady state export is unaffected.

### Iteration 6 — Frost repair

- Request: frost does not anything check it
- Task type: Renderer, style tuning, acceptance.
- User-visible result: Frost reads as translucent ice instead of a flat milky blob. The speckle is gone, light now survives the crossing so the orb has an inside, a crisp clearcoat gives it ice-like glints, and its core can finally respond to a state.
- Source/reference checked: Frost captured in all four states before and after, with pairwise pixel differences measured against Glass as a control.
- Reference inputs: None. User report of the shipped app.
- Docs/contracts read: `renderer-technique.md`, `component-rules.md`.
- Contract rules applied: `renderer-technique-inventory`, `acceptance-product-observable`.
- View interaction intent: Unchanged; orbit with `view.orbit`.
- Interaction ownership: Unchanged.
- Decision: Three faults, and the first was a wrong assumption recorded in Phase 1. Sample count was set to six on the reasoning that a rough surface blurs its samples anyway; the opposite is true, because rough transmission scatters samples wider and therefore needs more of them, so six read as speckle. Attenuation distance was shorter than the shell thickness, which absorbed nearly all transmitted light and left an opaque blob with no interior. The core was pure white, which has no headroom for a lightness lift, so all four states shared an identical and invisible core.
- Alternatives rejected: Raising distortion to add interest, which would have made Frost lumpier rather than icier. Dropping Frost, since the fault was tuning rather than concept.
- State/output mapping: Unchanged. Frost's material, palette, and sample count feed the same style pipeline as the other four.
- Performance intent: ordinary-product-work
- Verification: `npm run verify:delivery`.
- Risks: Risk: Frost's sample count went from six to sixteen, so it is now among the more expensive styles rather than one of the cheapest, and that cost has only been observed under software rendering.

### Iteration 7 — Colour belongs to the style and the user, never to a state

- Request: when I am changing the state of orb it is chnaging the color also for example ig my orb color is red in thinking and when I am change state to search it changes the color it should not change color right? what do you think?
- Task type: Controls behaviour, colour model, acceptance.
- User-visible result: Hand-picking a colour and then switching state leaves the colour alone; only behaviour changes. Picking a style still brings that style's palette, because a palette is part of what a style is.
- Source/reference checked: The reported behaviour reproduced in a browser with a hand-picked red, and the two references revisited: ElevenLabs treats colours as developer-owned props while state changes appearance and animation, and Thinking Logos makes colour a brand choice while states change form. Neither lets a state override colour.
- Reference inputs: User report of the shipped app.
- Docs/contracts read: `component-rules.md`, `core/control-selection.md`.
- Contract rules applied: `controls-product-coverage`, `acceptance-product-observable`.
- View interaction intent: Unchanged; orbit with `view.orbit`.
- Interaction ownership: Unchanged.
- Decision: The state tint added in the previous iteration was worse than reported. It tinted the style's palette rather than the current colour, so switching state did not shift a hand-picked red, it discarded it. The tint is removed entirely rather than reapplied at render time, because a swatch that disagrees with the screen is its own defect, and the per-state forms plus glow and bloom already carry the difference. The rule that decides which controls a preset may write is now a pure function, so it can be proven directly instead of through a flaky dropdown click.
- Alternatives rejected: Tinting the current colour instead of the style base, which accumulates drift across repeated state changes. Applying the tint at render time only, which leaves the colour control disagreeing with the visible orb. Removing colour from styles too, which would cost the styles their identity.
- State/output mapping: `getOrbPresetWrites` resolves a selection change into the exact set of control writes; a style change includes the palette, a state change excludes it, and a first observation writes nothing so a reload cannot overwrite restored values.
- Performance intent: ordinary-product-work
- Verification: `npm run verify:delivery`.
- Risks: Risk: the style dropdown could not be driven from the browser harness, so the style-brings-palette half is proven by unit test rather than by capture. Risk: states are now slightly less distinguishable in a still frame, since only form, glow and bloom separate them; motion and energy still do.

### Iteration 8 — Every style switch was freezing the orb

- Request: there is no movement in metal orb please check it
- Task type: Renderer lifecycle, acceptance.
- User-visible result: Switching style at runtime keeps the orb moving. Before this, picking any style other than the one loaded produced a motionless sphere.
- Source/reference checked: Frame-to-frame pixel difference measured on a fresh load and after a runtime style switch, with the fix stashed and restored to get both numbers.
- Reference inputs: User report of the shipped app.
- Docs/contracts read: `core/runtime-boundary.md`, `core/performance.md`.
- Contract rules applied: `renderer-technique-inventory`, `acceptance-product-observable`.
- View interaction intent: Unchanged; orbit with `view.orbit`.
- Interaction ownership: Unchanged.
- Decision: The material carries `samples` in Drei's constructor args, so the style key remounts it. The attach callback guarded on whether a uniform set already existed and returned early for every material after the first, so a remounted material never received the displacement patch and the render loop went on writing uniforms belonging to a destroyed one. The uniform set is now created once for the lifetime of the scene and every material that arrives is patched; `attachOrbDisplacement` was already idempotent per material, so re-attaching is safe.
- Alternatives rejected: Dropping the remount key, which would leave `samples` stale across styles. Recreating the uniform set per material, which would strand the render loop on whichever object it captured.
- State/output mapping: Unchanged. One uniform set now spans every material the scene mounts.
- Performance intent: ordinary-product-work
- Verification: `npm run verify:delivery`.
- Risks: Risk: this was invisible to the capture harness because every screenshot seeded the style and loaded fresh, so no test ever switched style at runtime. Runtime transitions in general remain thinly covered.

### Iteration 9 — Three styles that differ in kind, and an opacity rule instead of a style name

- Request: "add more orb types, they should be good,cool and advanced" and, after the options were discussed, "lets do nebula, ferrofluid and crystal, generalise the test".
- Task type: Renderer technique, controls behaviour, acceptance.
- User-visible result: Three new styles. **Crystal** is a faceted cut stone with strong dispersion. **Ferrofluid** is a black, oily, spiked surface. **Nebula** is a raymarched volume rendered inside a clear shell rather than a bright core. Picking any of them changes the shell geometry, the surface character, or the interior — not only the palette and the slider values.
- Source/reference checked: The Codrops procedural vortex inside a glass sphere, which renders an interior against a transmissive shell rather than an emissive one, and the Codrops droplet metaballs, which is where the ridging idea of folding a field at zero came from. Unicorn Studio's scene-defining effects were reviewed for what makes a centrepiece read as a centrepiece: they composite, they do not retune one material. Everything shipped here is derived, not copied.
- Reference inputs: None. No motion reference was supplied, so `referenceInputs` stays empty and no preprocessing ran.
- Docs/contracts read: `AGENTS.md`, `docs/toolcraft/workflow.md` (verification routing for later edits).
- Contract rules applied: `renderer-technique-inventory`, `controls-product-coverage`, `acceptance-product-observable`, `output-export-required`.
- View interaction intent: Unchanged; orbit with `view.orbit`.
- Interaction ownership: Unchanged.
- Decision: A style was previously only a data change against one material, so more styles would have meant more colourways. Three things became style-owned instead. `shell` carries icosahedron detail and flat shading, because a faceted style is faceted in its geometry — flat-shading a subdivided sphere still reads as a sphere. `ridge` mixes the displacement between the fluid swell and a ridged field, and the spike term samples its own much tighter noise, because ridging the broad swell produces broad creases that read as crushed foil rather than as cones. `interior` is a discriminated union rather than a flag, so a volume style carries its own density and a core style carries no dead field. The volume marches ten steps against a closed-form chord, which is exact because the entry point lies on the shell, and jitters the start per pixel because ten steps band visibly. The opacity rule was turned inside out: styles declare `surface`, `orbOpaqueStyleIds` is derived from that declaration, and both the schema applicability and the test read the derived list, so a second opaque style cannot silently keep showing controls that only describe transmitted light.
- Alternatives rejected: One shader with a branch per interior, which pays for the volume on every style. A `ridge` state delta, which would have turned every style into a ferrofluid on the way to Speak. Naming `ferrofluid` alongside `metal` in the applicability conditions and in the test, which is the exact coupling this iteration was asked to remove. A fullscreen SDF raymarch for a liquid style, which would need its own export path and its own snippet and was held back as separate work.
- State/output mapping: `shell.detail` and `shell.flatShading` reach the body geometry and material; `ridge` reaches the `orbRidge` uniform, damped on the form clock so switching into a spiked style morphs; `interior` selects which fragment stage the interior mesh mounts. `material.anisotropicBlur` became style-owned so a style whose subject is its interior can stop the sampler blurring it into fog. Copy Code emits all four.
- Two fixes were required rather than chosen. `tintLift` was declared on every style, documented, used by the copied snippet, and ignored by the renderer, which hardcoded 0.55; a near-black body cannot survive a fixed 55% lift toward white, so Ferrofluid was impossible until the renderer read the style. Bubble, Frost, Metal, and Plasma therefore move to the value they already declared. The snippet's interior fragment also carried different constants from the app's and dropped `coreIntensityScale`, so a copied Crystal blew out through its own facets; both now match the renderer.
- Performance intent: ordinary-product-work. The volume is the only new per-fragment cost and it is confined to one style, on a mesh at 0.72 of the orb radius, at ten steps.
- Verification: `npm run typecheck`, `npx vitest run src`, `node scripts/check-toolcraft-integrity.mjs`, `npm run ai:check`, `npm run docs:check`, plus the browser checks recorded below.
- Risks: Risk: the volume style raymarches inside the transmission sampler's passes, so its cost scales with output resolution more steeply than the other styles do; a 2K export measured four seconds under SwiftShader and was not measured on a real GPU. Risk: `orbDisplacedNormal` rebuilds normals from a finite difference, narrowed under ridging but still band-limited, so the spikes are lit slightly softer than the geometry actually is. Risk: `npm run test:feature -- orb.style` cannot run, because the acceptance entry has named a browser test since the first delivery that has never existed in the Playwright suite; this predates this iteration and the browser evidence below was gathered with the project's own harness instead.

## Evidence

- Style proof for this iteration: all three new styles captured with their own resolved palettes at `.toolcraft/browser-artifacts/preset-crystal.png`, `preset-ferrofluid.png`, and `preset-nebula.png`, and the five existing styles recaptured after the `tintLift` repair. Crystal shows facet-bounded dispersion, Ferrofluid shows cones with an iridescent sheen over a dark body, and Nebula shows a filamentary volume with voids rather than a bright centre.
- Runtime transition proof: the Style select was driven through a chain of runtime switches and frame-to-frame mean absolute channel difference measured after each one. Glass at initial mount 2.92, then Crystal 1.63, Nebula 1.53, Ferrofluid 7.94, Bubble 1.88, with no page or console errors. A frozen frame reads about 0.01, so every switch — including the two that change geometry and the one that swaps the interior's fragment stage — leaves the orb moving. This is the coverage the previous iteration recorded as missing.
- Copy Code proof: the emitted snippet for Nebula, Crystal, and Ferrofluid was written into the standalone snippet app and rendered in a browser with no errors, so the pasted component compiles and runs with the volume interior, the faceted low-poly shell, and the `orbRidge` uniform respectively. `src/app/orb/orb-code-snippet.test.ts` additionally requires every style's snippet to declare every uniform the shader chunk needs, to carry the shell detail and flat-shading flag, and to emit the volume interior only for a volume style.
- Opacity rule proof: `src/app/orb/orb-styles.test.ts` derives the opaque set from each style's declared `surface` and requires transmission 0 with non-zero metalness on those, transmission above 0 with metalness 0 on the rest, and `orbOpaqueStyleIds` to agree. The schema reads the same derived list, so the controls that describe transmitted light disappear for any opaque style rather than for a named one.
- Source reviewed: `src/app/app-schema.ts`, `src/app/app-composition.tsx`, `src/app/app-acceptance-data.ts`, `src/app/app-performance.ts`, `src/app/orb/orb-scene.tsx`, `src/app/orb/orb-materials.ts`, `src/app/orb/orb-shader-chunks.ts`, `src/app/orb/orb-params.ts`, `src/app/orb/orb-canvas.tsx`, `src/app/orb/orb-code-snippet.ts`, `src/app/orb/orb-export-registry.ts`.
- Contract applied: `runtime-shell-required`, `canvas-surface-preserved`, `controls-product-coverage`, `output-export-required`, `interaction-surface-ownership`, `renderer-view-interaction`, `acceptance-product-observable`, `persistence-policy-explicit`.
- Evidence: contracts read were `docs/toolcraft/workflow.md`, `docs/toolcraft/schema-reference.md`, `docs/toolcraft/component-rules.md`, `docs/toolcraft/core/runtime-boundary.md`, `docs/toolcraft/core/setup-export.md`, `docs/toolcraft/core/control-selection.md`, `docs/toolcraft/core/performance.md`.
- Style switch proof: frame-to-frame mean absolute channel difference over 2.5 seconds. Before the fix, Glass at initial mount measured 2.88 and Metal after a runtime switch measured 0.01, which is a frozen frame. After the fix the same measurements are 2.92 and 2.69. A unit test now attaches one uniform set to two different materials and requires both to compile with the displacement and to share uniform identity.
- Colour ownership proof: seeding a hand-picked `#FF0000` primary and `#FF8800` core in the Think state and then switching to Search and to Speak left both colours untouched while flow moved 0.55, 1.76, 1.21. `getOrbPresetWrites` is covered directly: a state change writes behaviour but never a colour key, a style change writes the new style's palette, and a first observation writes nothing.
- Frost proof: state separation on Frost measured 4.39 mean absolute channel difference before the repair and 4.88 after, against 5.27 for Glass as a control, so the states were always moving pixels and the fault was the style's own character. Two regression tests now pin the causes: no style may ship a pure white core, and a rough transmissive style must sample at least twelve times.
- State proof: all four states captured on the Glass style show distinct silhouettes and palettes, with resolved values moving as designed: index of refraction 1.42, 1.56, 1.84, 1.34 and flow 0.55, 0.94, 1.76, 1.21. `src/app/orb/orb-styles.test.ts` proves each state has a distinct form, that only Search sweeps, and that every state colour stays within 0.14 perceptual distance of its own style so a tint can never override style identity. `src/app/orb/orb-code-snippet.test.ts` extracts the uniform names from the shipped shader chunk and requires the generated snippet to declare every one, which is what stops a new uniform shipping code that cannot compile.
- Bloom and export proof: a Plasma frame was exported at 2048x2048 and compared against the screen capture; both carry the same bloom, confirming export runs through the composer. With bloom set to effectively zero the composer output differed from the pre-composer render by 3.82 mean absolute channel levels out of 255, which is animation phase rather than a colour-management shift, so the visible softening was bloom and not a double conversion. `src/app/orb/orb-code-snippet.test.ts` parses every generated snippet with esbuild, which is what caught a template-escaping slip that emitted invalid JSX.
- Style proof: `src/app/orb/orb-styles.test.ts` proves every style/state combination lands inside its slider domain, that colour is style-owned across all four states, that each state is more agitated than rest in every style, and that only the opaque style skips the transmission passes. `src/app/orb/orb-code-snippet.test.ts` proves Copy Code emits the selected style's material, studio, and geometry rather than the default one.
- Loop proof: `src/app/orb/orb-loop.test.ts` proves the cross-fade identity for an arbitrary noise function, continuity across the wrap, the exact pulse loop, phase wrapping over 5000 frames, and that the shipped shader keeps both the looping form and the original drift rate. `src/app/orb/orb-displacement.test.ts` proves injection against three's real physical and standard vertex shaders, uniform identity, idempotence, chaining onto a material's own `onBeforeCompile`, and a hard failure when a chunk marker is missing.
- Product observations: the rendered orb, the applied state presets, the clipboard snippet, and a decodable 4096x4096 `orb.png` from Export PNG at the default 4K setting are stored under `.toolcraft/browser-artifacts/`.

## Verification

- `npm run typecheck` passes.
- `npm run ai:check` and `npm run docs:check` pass; `orb-styles.ts` was split into `orb-style-presets.ts` (the style data) and `orb-styles.ts` (states, ranges, and preset resolution) to stay inside the module line budget.
- `npx vitest run src` passes.
- `node scripts/check-toolcraft-integrity.mjs` passes.
- `npm run verify:delivery` is the protected first-delivery gate and owns build plus browser acceptance evidence.

## Risks

- Risk: The Drei transmission material overwrites its own `time` uniform from the R3F clock each frame, so the material's internal distortion is not phase-integrated. The product displacement that owns the visible motion is, so a Flow speed change never jumps the surface.
- Risk: Very large exports allocate a full-size canvas twice, once as WebGL backing and once as the 2D composite, so 8K export is memory-heavy on low-end machines.
- Risk: Screen-space transmission approximates refraction, so extreme distortion combined with a very low roughness can still show sampling artifacts.
