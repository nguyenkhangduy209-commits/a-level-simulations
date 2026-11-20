# Brief: real-life look + step-by-step explanations (per page)

Project: `/Users/tranquanh/Documents/A-levels simulation`, plain HTML/canvas/vanilla JS simulations for Cambridge 9709 Mechanics (g = 10) and 9702 AS Physics (g = 9.81).
Read `docs/SIM_CONVENTIONS.md` first (stack, content rules), then `sim/core/scene.js` (the prop library, API in the header comment) and look at `sim/tests/props.html` (a gallery of every prop).

The students asked for two things on every simulation page:

## 1. Make the scene look like the real situation (lively, recognisable): in a soft, pleasant illustrated style
- Style (from the user: "unique / soft and pleasant", not clip-art realism): pastel fills, rounded shapes, thin light outlines (rgba, never black), gentle gradients, soft shadows, minimal texture. `sim/core/scene.js` sets the palette; match it in any page-local drawing (`SIM.scene.shade(hex, k)` tints).
- Every page now loads `../../core/scene.js` (`SIM.scene`). The stage has a **Real life / Diagram** switch (already built). `SIM.scene.real()` tells you which is on. Switching calls the page's `ui.onTheme` listeners, so the page simply redraws — no extra wiring.
- **Diagram look must stay exactly as it is now** (clean exam-style drawing). Put every real-life addition behind `if (SIM.scene.real()) { … }`.
- In the real-life look, draw the situation the question describes, using `SIM.scene` props: sky + ground (grass / road / floor / ice / table), wooden ramps, crates, cars / vans / lorries / trailers / caravans with turning wheels, people pushing/pulling, a lift car with cable, pulleys that turn with the string (`angle = distance moved ÷ radius`), ropes, balls (football / tennis / cricket / steel) that spin as they roll or fly, pucks, cliffs, water, walls, tables, cannons, impact bursts and dust puffs at collisions / landings, speed streaks behind fast objects.
  - `SIM.view.draw.block` already becomes a crate, `draw.particle` a shaded ball and `draw.pulley` a spoked wheel when the look is real — check that this looks right on your page (pass `{plain:true}` to keep the old look for a particular call).
  - Motion must be visible: scroll road/grass markings (`ground(..., {scroll})`), turn wheels and pulleys by the distance travelled, spin balls, show a short impact burst / dust for ~0.3 s after an event (use the clock time, so scrubbing is exact — everything stays a pure function of t).
  - Pick props that match each preset (e.g. "car towing a trailer" → car + trailer; "lift" → lift car with a person; "ball thrown from a cliff" → cliff + sea; "block on a rough plane" → crate on a wooden ramp). Use the preset name / mode / parameters to choose.
  - Physics overlays (force arrows, velocity arrows, labels, dimension lines, angle arcs) stay on top and stay readable: draw backdrop → props → overlays. Never hide a number students need.
  - Non-mechanics pages (waves, circuits, particles, uncertainty…): add realistic apparatus where it helps understanding — e.g. a real-looking battery/resistor/bulb that glows with current, ammeter/voltmeter dials, a rope or slinky for waves, a speaker/microphone, a laser and slits with a glowing screen pattern, a CRO screen with a green trace and graticule, an ambulance with siren for Doppler, a gold foil + alpha source, a ruler/micrometer/stopwatch for measurement. Draw these inline in the page (helper functions inside the page script) if `SIM.scene` has nothing suitable.
  - Must work in light and dark themes (scene props handle their own colours; for your own drawing check `SIM.scene.dark()`), at 375 px wide and on desktop, and with `prefers-reduced-motion`.
- Content rules still apply: nothing outside the syllabus, no air resistance drawn as if it were part of a 9709 model, etc. Visual realism must not change any number.

## 2. Step-by-step working with explanations
- The "Live working" card is now a full-width row under the scene, and each `R.eq(...)` is shown as a numbered step. `R.eq(lhs, work, value, unit, why)` takes a 5th argument **why**: one or two short plain-English sentences saying *why this step / which principle* (e.g. "Nothing accelerates perpendicular to the plane, so the forces that way balance."). There is also `R.why(text)` (attaches to the step just added, or adds a stand-alone line).
- Add a specific, correct `why` to **every** `R.eq` call on your pages (a fallback dictionary exists in `ui.js`, but write page-specific text — it is better). Keep them short, student-friendly, exam-accurate (Cambridge wording). Where the working has several stages, group them with `R.head('…')` so the step-by-step walkthrough appears (it activates with 2+ heads).
- Do not change the numbers or formulas.

## Rules
- Edit only the page files assigned to you (and, if needed, your own new test cases). **Do not edit** `sim/core/*`, `sim/assets/theme.css`, `sim/engine/*`, catalog files, or pages not on your list — another session is editing some pages at the same time. If you need a new shared prop, write it as a helper inside your page.
- Do not run git commands, do not commit.
- Do not use the browser pane (other agents share it). Verify with:
  - `node sim/tests/run.js` (must stay all-passing),
  - `node sim/tests/smoke.js <page-name>` (fake DOM: loads the page, every preset, slider extremes, toggles; must be clean). Note the fake canvas: `createRadialGradient` is missing there, so use `SIM.scene` helpers or guard it (`c.createRadialGradient ? … : solidColour`).
  - Re-read your code for runtime errors in both looks (variables defined before first draw, no NaN sizes when a slider is at 0).
- Report back: per page, what the real-life scene shows (per preset/mode if it varies), anything you could not do, and anything that needs a core change.
