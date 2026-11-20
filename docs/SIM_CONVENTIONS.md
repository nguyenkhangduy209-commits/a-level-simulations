# Simulation conventions (read before writing a sim)

Reference implementation: `sim/sims/9709/m1m4-plane.html` + `sim/engine/mech-plane.js` + `sim/tests/cases-9709-plane.js`.
Copy its structure. The full design spec for every sim is `docs/PLAN.md` (section B for sims, section D for test values).

## Stack
- Plain HTML + canvas + vanilla JS (ES5-ish style is fine, ES2015+ is fine too). **No build step, no npm, no ES modules** (pages must work from `file://`). No CDN dependencies.
- Pages: `sim/sims/9709/<id>.html` or `sim/sims/9702/<id>.html`. They load, in order:
  `../../assets/theme.css`, `../../core/util.js`, `../../core/ui.js`, `../../core/view.js`, `../../core/plot.js`, `../../core/anim.js`, then their engine file(s) from `../../engine/`.
- Engines: `sim/engine/<name>.js`, **pure functions, no DOM**, UMD wrapper so node can `require` them (copy the header of `mech-plane.js`; attach to `SIM.<name>` in the browser). All physics/maths lives in the engine; the page only draws and formats.
- Tests: `sim/tests/cases-<group>.js` exporting `{ 'name': () => { approx(got, expected, rel?); check(cond, msg); } }`. Run `node sim/tests/run.js [filter]`. Every engine function that produces a number shown to students needs at least one hand-computed test. Use the expected values from `docs/PLAN.md` section D where listed; verify any extra expected values by hand (show working in a comment).
- Catalog entry: `sim/catalog/<group>.js` pushes objects onto `window.SIM_CATALOG` (see `sim/catalog/9709-plane.js`): `{id, course, path, title, tags, summary, questionTypes:[{topic, text, preset}]}` where `preset` is the index into the page's preset list (the hub deep-links with `?preset=N`). Tags: `9709-M1`…`9709-M5`; 9702 AS uses the **2025–27 numbering**: `9702-1` Physical quantities and units, `9702-2` Kinematics, `9702-3` Dynamics, `9702-4` Forces, density and pressure, `9702-5` Work, energy and power, `9702-6` Deformation of solids, `9702-7` Waves, `9702-8` Superposition, `9702-9` Electricity, `9702-10` D.C. circuits, `9702-11` Particle physics.

## Core API (sim/core)
- `SIM.util`: `sf(x,n=3)` Cambridge 3 s.f. string (HTML, may contain `<sup>`), `dp(x,d)`, `num(x,d)`, `rad`, `deg`, `clamp`, `sgn`, `approxEq`, `quadratic(a,b,c)` (stable, ascending real roots), `bisect`, `scanRoots(f,a,b,n,{touch,scale})` → `[{x,cross}]`, `rk4(f,t,y,dt)`, `niceTicks`, `solve2`, `gauss(A,b)`.
- `SIM.ui`:
  - `course(default)` returns '9709' or '9702' (URL `?course=` overrides); `gFor(course)` gives 10 or 9.81.
  - `page({title, tags, g})` → `{left, right, card(where, title)}`; `canvas(container, 'main-canvas')`.
  - `params(container, specs, onChange)` → `{values, set(obj, silent), lock(k, on, value), show(k, vis), label(k, html), range(k,min,max,step)}`; spec `{key,label,sym,unit,min,max,step,value}`. **Every numeric parameter gets a slider + typed box.**
  - `select`, `toggle`, `presets(container, [{name, values, note}], apply)` → `{select(i), fromQuery()}` (call `fromQuery()` as the LAST line of setup).
  - `Readout(container)`: `.clear().head(t).eq(lhs, working, value, unit).badge(text,'ok'|'warn'|'info').html(s).render()`. Numbers passed as `value` are auto-formatted to 3 s.f.
  - `examToggle(container, target)`, `notes(container, [html])`, `legend(container, [{color,label}])`, `colors()` (CSS variable colours, re-read on theme change), `onTheme(fn)`, `readHash()/writeHash(obj)`, `esc(str)`.
- `SIM.view`: `new Viewport(canvas,{pad})` with `fit(x0,x1,y0,y1)` (uniform scale, y up), `X(x)`, `Y(y)`, `P(x,y)`, `begin()` (clears, returns ctx), `onResize`. `SIM.view.draw`: `arrow`, `arrowPolar(c,sx,sy,angleRad,lenPx,color,{label,dash,width,hollow})`, `label`, `arc`, `rightAngle`, `ground`, `block`, `particle`, `pulley`, `line`, `spring`. `forceScale(list, maxPx)`.
- `SIM.plot`: `new Plot(canvas,{yLabel,xLabel})`, `.draw({x:[a,b], y?, series:[{fn|pts,color,shade,breaks,dash}], cursor, markers, vlines, hlines, title})`.
- `SIM.anim`: `new Clock(container,{duration,onFrame})` with `.t`, `.seek(t)`, `.pause()`, `.setDuration(T)`. Models must be **analytic in t** (`stateAt(t)`) or precomputed tracks, so scrubbing is exact.

## Page layout (same in every sim)
Left: scene canvas (`main-canvas`), animation clock (if anything moves), legend, plots grid (`ui.h('div',{class:'plots'})`).
Right, in this order: "Exam setups" (presets), "Parameters", "Live working" (exam toggle + Readout), "Common traps" (notes).

## Content rules (strict)
- **Only syllabus content.** 9709: particle model, g = 10, no air resistance, no moments, no impulse/restitution, no variable mass, 1-D momentum only. 9702: g = 9.81 (data sheet). Anything outside the learning outcomes is left out. Anything qualitative-only in the syllabus is labelled "qualitative only" and must not produce numbers students might copy.
- Show working as `symbol = formula = substituted numbers = result unit`, 3 s.f. (angles 1 d.p.). State the sign convention on screen.
- Detect impossible or invalid regimes and say so: string slack, loses contact, no real root, division by zero.
- Presets: realistic exam setups. If a preset reproduces a past-paper question, name it like `9709/41 M/J 24 Q5` and check the numbers against the mark scheme PDF in `data/papers/...` (pdf text can be extracted with the venv python + pdfplumber: `/private/tmp/claude-501/-Users-tranquanh-Documents-A-levels-simulation/2590aec6-b9a8-42e2-b20f-de9be3c8fb3c/scratchpad/venv/bin/python -I`). Question-paper text is already in `data/papers_text/*.txt`.
- Colours: use roles from `ui.colors()` (`weight`, `normal`, `friction`, `tension`, `applied`, `resultant`, `velocity`, `accel`, `component`, `s1..s4`). Works in light and dark.
- Must look right at 375 px wide (stacks to one column) and on desktop.

## Verify before reporting done
1. `node sim/tests/run.js` passes.
2. Open each page via the static server (`python3 -m http.server 8765 --directory sim` → `http://localhost:8765/sims/...`) or headless check: at minimum load it in node? No — use the browser if you have browser tools; otherwise carefully re-read the page code for runtime errors (undefined vars, typos in SIM.* names, hoisting: variables used by `update()` must be assigned before the first `update()` call).
3. Try every preset and the slider extremes (0, max) for NaN/Infinity in readouts.
