# Implementation plan: A Level simulation suite (9709 Paper 4 Mechanics and 9702 AS Physics)

## 0. Problems to fix before building

1. **The 9702 topic numbers in your brief and in the project data are wrong for 2025–2027.** The syllabus text (lines 255–266 and 438–763) gives the AS topics as:
   - 1 Physical quantities and units. Errors and uncertainties are now 1.3; there is no separate "Measurement techniques" topic.
   - 2 Kinematics. **The projectile flagship is topic 2 (outcome 2.1.9), not topic 3.**
   - 3 Dynamics
   - 4 Forces, density and pressure
   - 5 Work, energy and power
   - 6 Deformation of solids
   - 7 Waves
   - 8 Superposition
   - 9 Electricity
   - 10 D.C. circuits
   - 11 Particle physics (missing entirely from your data)

   `data/syllabus_9709_9702.json` (`as_topics`) and `CURRICULUM_MAP.md` use the 2022–24 numbering. Fix them before tagging. The A Level topics 12–25 are correct.
2. **The scratchpad is volatile.** Copy `(temporary scratchpad) raw/*.txt` (121 files, pages separated by `\f`, made with pdfplumber by `bulk.py`) into the project, e.g. `data/papers_text/`. Otherwise you can re-run `bulk.py` on `data/papers`.
3. **The mark-total check already works on the raw text.** All 121 raw files give exactly 50 (9709) or 100 (9702) with `re.findall(r'\[(\d{1,2})\]')` after removing `[Total: n]`. Five 9702 files have `[Total:]` lines that sum to 95, so one `[Total]` line was lost in extraction; the part marks are still fine. Those files are 9702 s21_41, s21_43, w18_41, w18_43 and w19_42.
4. **9702 Paper 4 papers from 2018–2021 follow an older syllabus.** They contain op‑amps (every year 2018–21) and communication topics (modulation, dB). 2022 onwards has astronomy instead. The tagger needs legacy tags (section C).
5. **There are no 9702 Paper 1/2 texts.** The AS question-type list below comes from the syllabus and typical Paper 1/2 items. To validate it, extract 9702 `qp_1x` and `qp_2x` with the same `bulk.py` glob changed.

## 9709 Paper 4 learning outcomes (from memory, 2020+ wording, unchanged for 2026–27)

Please check these. The note wording is paraphrased.

- **4.1 Forces and equilibrium**
  - Identify the forces acting in a given situation.
  - Understand the vector nature of force; find and use components and resultants.
  - Use the principle that a particle in equilibrium has zero vector sum of forces, or equivalently that the sum of components in any direction is zero.
  - Understand that a contact force between two surfaces can be represented by two components, the normal component and the frictional component.
  - Use the model of a "smooth" contact and understand its limitations.
  - Understand limiting friction and limiting equilibrium; recall the definition of coefficient of friction; use F = μR or F ≤ μR as appropriate.
  - Use Newton's third law.
  - Notes: two dimensions only. Lami's theorem or the triangle of forces may be used but are not required (I'm not certain of the exact note). No moments.
- **4.2 Kinematics of motion in a straight line**
  - Distance and speed as scalars; displacement, velocity and acceleration as vectors (one dimension).
  - Sketch and interpret s–t and v–t graphs: area under v–t is displacement, gradient of s–t is velocity, gradient of v–t is acceleration.
  - Use differentiation and integration with respect to t for s, v, a. Calculus is limited to P1 techniques: powers of t, including fractional and negative, and (at+b)ⁿ. There is no ln, because ∫t⁻¹ needs P2/P3.
  - Use constant-acceleration formulae.
- **4.3 Momentum**
  - Use the definition of linear momentum and its vector nature (1D).
  - Use conservation of linear momentum for direct impact of two bodies, including coalescence.
  - Impulse and coefficient of restitution are not required; they are Further Maths.
- **4.4 Newton's laws of motion**
  - Apply Newton's laws to the linear motion of a particle of constant mass under constant forces, which may include friction, tension in an inextensible string and thrust in a connecting rod.
  - Use the relationship between mass and weight.
  - Motion vertically or on an inclined plane with constant acceleration.
  - Connected particles: string over a fixed smooth pulley or peg, car and trailer with rope or tow-bar, lifts.
- **4.5 Energy, work and power**
  - Work by a constant force, W = Fd cos θ (no scalar product).
  - Gravitational PE and KE.
  - Work–energy relationship and conservation of energy, including non-linear paths where only overall energy changes matter (e.g. a smooth curved slide).
  - Power as rate of doing work; P = Fv for a force in the direction of motion.
  - Instantaneous acceleration of a car on a hill against resistance.
- g = 10 m s⁻². The paper cover says: "Where a numerical value for g is needed, use 10 m s⁻²." Answers to 3 s.f., angles to 1 d.p.

---

## A. File and folder layout

There are no ES modules, because Chrome blocks `import` over `file://`. Every file is a classic `<script>` that attaches to `window.SIM`. Engine files also use a UMD footer so node can `require` them:

```js
(function(root,f){var m=f(root);if(typeof module==='object'&&module.exports)module.exports=m;else(root.SIM=root.SIM||{}).forces=m;})(typeof self!=='undefined'?self:this,function(root){ const U=(typeof require==='function')?require('../core/util.js'):root.SIM.util; ... return {...}; });
```

```
sim/
  index.html                 hub: topic → question types → links (built from catalog.js)
  catalog.js                 the single source of truth (section B tables); also read by the paper tagger
  assets/theme.css           CSS variables, light/dark, colour semantics
  core/
    util.js      sf(x,3) Cambridge formatting, deg/rad, stable quadratic, bisection, scanRoots, RK4, niceTicks, clamp, approxEq
    ui.js        slider builder (range + number box synced, label/symbol/unit), preset <select>, "solve for" select,
                 URL-hash state (#preset=…&m=3&θ=30), readout panel, eq() helper (HTML sub/sup; KaTeX optional if present),
                 "exam mode" toggle that hides derived answers, course switch (?course=9709|9702 sets g=10|9.81 and hides off-syllabus UI)
    view.js      Viewport (world↔screen, uniform scale, y-up, autoscale to bbox, DPR), primitives: arrow(scaled with N-per-px legend,
                 min length), dashed component arrows, angle arc + label, right-angle mark, hatched ground, incline, pulley,
                 string polyline, block/particle, spring, beam, labels with backgrounds; colour roles:
                 weight, normal, friction, tension, applied, resultant, velocity, acceleration
    plot.js      Plot(canvas,{xLabel,yLabel}): nice ticks, multiple series (function or samples), cursor at t, signed area
                 shading (+ and − colours), markers (roots/turning points), hover readout, stacked plots sharing an x-axis
    anim.js      Clock: play/pause/reset, speed ×0.25–×4, scrub slider, step ±; drives model.stateAt(t) (analytic) or
                 an interpolated precomputed RK4 track
  engine/                    pure functions, no DOM, node-testable
    mech-forces.js     resultant, 2-unknown equilibrium solver, strings, plane/friction regime
    mech-kinematics.js multistage segments, vertical motion and events, meeting times
    mech-calculus.js   term expressions c·(pt+q)^n, piecewise, d/dt, ∫dt, constants from conditions, roots, distance
    mech-momentum.js   1D collisions, event timeline (particles + wall)
    mech-dynamics.js   string chain, vehicle/power, lift
    mech-energy.js     work–energy along slope/path, stop-and-return
    phys-kinematics.js projectile (+ drag RK4 for qualitative ghost), free-fall experiment data
    phys-dynamics.js   1D/2D momentum, elastic formulae, F=Δp/Δt, drag/terminal
    phys-statics.js    moments/beam/hinge solver, pressure/upthrust
    phys-materials.js  Hooke, stress/strain, loading/unloading model
    phys-waves.js      progressive, Doppler, Malus, stationary modes, two-source, grating
    phys-circuits.js   MNA (nodal) solver, emf/internal resistance, divider, potentiometer
    phys-measure.js    unit-exponent algebra (kg,m,s,A,K), prefixes, uncertainty propagation
    phys-particles.js  nuclide/decay checks, quark tables
  sims/9709/*.html  (11 files; view code inline, engine via <script src>)
  sims/9702/*.html  (26 files; 3 more 9702 sims reuse 9709 pages via ?course=9702)
  tests/run.js, tests/cases-9709.js, tests/cases-9702.js   (node tests/run.js; uses only `assert`)
tools/papers/  (project root, Python 3 stdlib; pdfplumber already installed for extraction)
  clean.py  split.py  tag.py  validate.py  rules_9709.json  rules_9702.json  gold/*.json
data/questions/9709_p4.json  data/questions/9702_p4.json
```

**Shared UI conventions:**
- Every parameter gets a slider plus a numeric box, so students can type exact exam values.
- Every derived value is shown as `symbol = formula = substituted numbers = result unit`.
- "Solve for" disables one slider and computes it from a stated constraint.
- Presets are named `9709_w23_42_q7` and set several parameters at once. **Verify every past-paper preset against the mark schemes**, which sit next to the question papers in `data/papers/.../*_ms_*.pdf`.

---

## B. Simulations

Sign conventions are stated on screen in every sim. Tolerance for regime equality: relative 1e‑9. "≈ limiting" is shown when within 0.5%.

### 9709 (g = 10)

#### S1 `m1-resultant`: coplanar forces at a point [M1]
- **Parameters:**
  - n forces: 2–5, default 3.
  - Each Fᵢ: 0–200 N, step 0.1.
  - Each θᵢ: 0–360°, step 0.5, measured anticlockwise from +x.
  - Optional common factor k for forces given as F, 2F.
- **Modes:** Resultant | Equilibrium: solve 2 unknowns | Constraint: "resultant has no y-component" (1 unknown).
- **Equations:** X = ΣFᵢcosθᵢ, Y = ΣFᵢsinθᵢ, R = √(X²+Y²), direction = atan2(Y, X), shown as 0–360° and as "β° above/below +x" or relative to a named force.
- **Solving:**
  - Unknown magnitude and angle of the same force: P = √(X′²+Y′²), θ = atan2(Y′, X′), where X′ = −ΣX_known.
  - Two magnitudes with known directions: Cramer's rule, det = sin(θb−θa). det = 0 means parallel, no unique solution. A negative solution means the force would have to reverse, so it is flagged.
  - General case (e.g. F, 2F and θ): Newton–Raphson with a numeric Jacobian, seeds θ = 0..330 step 30. De-duplicate and keep solutions with magnitude > 0.
  - Constraint mode: F = −Y_known / sinθ_F.
- **Draw:** forces from O with arcs; dashed components; resultant; force polygon tip-to-tail beside it (closes iff R ≈ 0); component table.
- **Edge cases:** "equilibrium" when R < 1e‑9·ΣF; angle-reference ambiguity (show the arc actually used).
- **Presets:** two forces with zero y-resultant (s24_41 Q2), 52/39/P (w24_41 Q3), F/2F/20 (m26_42 Q3), four forces (s26_41 Q1).

#### S2 `m1-strings`: particle or ring held by strings and forces [M1; also 9702 4.2.3 via ?course=9702]
- **Configurations:**
  - (a) Two strings to fixed points, given by angles (0–89.5° from vertical or horizontal) or by lengths L₁, L₂ and separation d (angles from the cosine rule).
  - (b) Smooth ring threaded on one string: same T on both sides.
  - (c) One string plus an applied force P at angle φ (option: "perpendicular to string").
- **Parameters:** m 0.01–100 kg (default 10); P 0–300 N; angles.
- **Unknowns:** any two of {T₁, T₂, m, P}, solved linearly from resolving horizontally and vertically. There is a toggle to resolve along/perpendicular to a string, which shows the shortcut when the strings are perpendicular.
- **Regime:** every T ≥ 0. If a solved T < 0, show "string slack – equilibrium impossible". Compute the critical P where Tᵢ = 0 and report "greatest P".
- **Draw:** geometry, FBD, triangle of forces.

#### S3 `m1m4-plane`: particle on a rough plane, equilibrium and motion [M1, M4, plus M2 follow-on]
- **Parameters:**
  - m 0.1–200 kg (default 5).
  - θ 0–80° (default 30), or type sin θ.
  - μ 0–1.5 step 0.01 (default 0.3), with a "smooth" checkbox.
  - P 0–500 N.
  - φ −180..180°, angle of P from the up-slope line, positive away from the plane. A "horizontal force" button sets φ = −θ for a push towards the slope.
  - u −20..20 m/s (up-slope positive).
  - Contact type: block on surface | ring on rod.
- **Regime logic:**
  - N_raw = mg cosθ − P sinφ.
    - Surface: if N_raw < 0, stop with "loses contact".
    - Ring on rod: R = |N_raw| (reaction may act on either side; draw it flipped).
  - D = P cosφ − mg sinθ (driving component, up-slope +). F_max = μR.
  - If v = 0:
    - |D| ≤ F_max → static. Friction = −D, magnitude |D|. Show "F ≤ μR; limiting iff |D| = μR". Meter: |D|/μR.
    - Otherwise a = (D − sgn(D)·F_max)/m.
  - If v ≠ 0: a = (D − sgn(v)·F_max)/m.
  - Phases have constant a. When v reaches 0 at t* = −v/a, re-evaluate the static test: it either stays (permanently) or reverses with a new a. This is the "does it slide back?" exam point.
- **Range of P for equilibrium:** use linear inequalities rather than formulas, so all signs are handled.
  - D ≤ μR ⇔ P(cosφ + μ sinφ) ≤ mg(sinθ + μ cosθ).
  - −D ≤ μR ⇔ P(μ sinφ − cosφ) ≤ mg(μ cosθ − sinθ).
  - Also P ≥ 0 and R ≥ 0.
  - Each is a·P ≤ b: if a > 0 then P ≤ b/a; if a < 0 then P ≥ b/a; if a = 0 it holds iff b ≥ 0. Intersect the intervals.
  - Display the textbook forms: P_up = mg(sinθ+μcosθ)/(cosφ+μsinφ) and P_down = mg(sinθ−μcosθ)/(cosφ−μsinφ). P_down ≤ 0 when tanθ ≤ μ, meaning it rests with P = 0.
  - Ring on rod: split the R ≥ 0 and R < 0 cases and take the union.
  - Least μ for rest: μ = |D|/R.
- **Draw:** incline, FBD (W, R, F with a dashed μR "maximum" ghost, P), toggle for mg sinθ and mg cosθ components with θ marked inside the component triangle (to fight sin/cos swaps), friction meter, s–t and v–t plots.
- **Live readout:** distance in the n-th second, s(n) − s(n−1).
- **Edge cases:** θ = 0 with P = 0; tanθ = μ exactly (stays: "on the point of slipping"); denominators ≤ 0 (no finite P_up).

#### S4 `m2-journey`: multi-stage constant-acceleration motion [M2; also 9702 topic 2 as p2-motion-graphs]
- **Stages:** up to 8. Types: (t, a) | (t, v_end) | (d, v_end) | constant v for t | rest for t.
- **Parameters:** u₀ −50..50; per-stage t 0–600 s, a −10..10 step 0.01, v, d.
- **Formulas:**
  - v = u + at, s = ut + ½at², s = ½(u+v)t, v² = u² + 2as.
  - From (u, v, t): a = (v−u)/t.
  - From (u, v, d): t = 2d/(u+v) (requires u+v ≠ 0), a = (v²−u²)/(2d).
- **Sign change inside a stage:** t₀ = −u/a; distance = |s(t₀)| + |s(t) − s(t₀)|.
- **Solve-for:** one parameter against one constraint (total time, total distance, final displacement = 0, v_max). Scan the slider range for sign changes, refine by bisection, list all roots, and let the student apply side conditions such as T < 30.
- **Two-body mode:** solve s₁ = s₂ piecewise with quadratics.
- **s–t input mode:** for questions like s22_43 Q3.
- **Draw:** v–t with shaded trapezia, signed and labelled per stage; s–t; a–t; particle on a line. Table of u, v, a, t, s per stage. Totals: displacement, distance, average speed, average velocity.

#### S5 `m2-vertical`: vertical motion, two particles, bounce, mid-air collision [M2, M3]
- **Parameters:**
  - Particle A: u_A −50..100 (up +), h_A 0–300.
  - Optional particle B: u_B, h_B, delay τ 0–10 s.
  - Masses 0.01–10 kg.
  - Ground: stop | "rebounds with fraction k of speed" (k 0–1). This is given data, **not** a coefficient of restitution.
  - Collision on meeting: off | A to rest | B to rest | coalesce | specify v_A.
- **Equations:** y = h + u(t−t₀) − ½g(t−t₀)², v = u − g(t−t₀).
  - Apex h + u²/2g at t = u/g.
  - Ground hit at t = [u + √(u² + 2gh)]/g.
- **Event loop:** next event = min(ground hits, meeting). Meeting time comes from Δy(t) = 0. With equal accelerations this is linear, but solve the general quadratic and take the smallest root > now + ε. Cap bounces at 20 or when speed < 1e‑3.
- **Query panel:** total time with |v| ≥ V, total time with y ≥ H (shaded bands).
- **Draw:** column view, y–t, v–t (jumps at bounce or collision).

#### S6 `m2-calculus`: variable acceleration [M2]
- **Given:** s(t) | v(t) | a(t).
- **Expression:** up to 5 terms c·(pt+q)ⁿ.
  - c −50..50 step 0.01.
  - n ∈ {−3, −2, −1.5, −1, −0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 4}.
  - p, q default 1, 0 (an "advanced" toggle exposes them).
  - Optional text entry parsed into these terms.
  - Up to 3 piecewise intervals.
  - Up to 2 named constants (k, b, c) solved from conditions such as v(t₁) = …, a(t₁) = …, or max v = … (a = 0 plus a value).
- **Calculus rules:**
  - d/dt c(pt+q)ⁿ = c·n·p·(pt+q)ⁿ⁻¹.
  - ∫c(pt+q)ⁿ dt = c(pt+q)ⁿ⁺¹ / (p(n+1)) + C.
  - **n = −1 under ∫ is blocked** with the message "needs ln – beyond P4".
- **Constants:**
  - From one condition: C = s₀ − F(t₀).
  - From a(t) with two s-conditions: s = ∬a + C₁t + C₂; solve the 2×2 system.
  - Piecewise: carry v (and s) continuity forward. This is the "no sudden change in velocity" condition.
- **Domain:** non-integer n needs pt+q ≥ 0 (> 0 if n < 0); negative integer n needs pt+q ≠ 0. Flag otherwise.
- **Roots of v on [ta, tb]:** sample 4000 points, find sign changes, bisect to 1e‑12. Also find minima of |v| below 1e‑9·scale; these are double roots: "instantaneously at rest, no reversal".
  - Distance = Σ|s(t_{k+1}) − s(t_k)| over sign-change roots only. Displacement = s(tb) − s(ta).
  - Max/min v at roots of a and at the endpoints.
- **Display:** symbolic s, v, a with substituted numbers, the "+C" step, and an interval table.
- **Draw:** three stacked plots with a shared cursor; signed-area shading on v–t.

#### S7 `m3-collisions`: direct impact on a smooth line [M3, M5]
- **Parameters:**
  - Up to 3 particles: m 0.01–20 kg, u −20..20 step 0.1, position x.
  - Optional wall at x_W with a given rebound speed.
  - Per-collision outcome (no restitution in the syllabus): given velocity of X after (sign selectable) | X brought to rest | coalesce.
- **Equations:**
  - Unknown velocity: v = (m₁u₁ + m₂u₂ − m_k·v_k)/m_unknown.
  - Coalesce: V = (m₁u₁ + m₂u₂)/(m₁ + m₂).
- **Consistency warnings:** these are physical checks, not syllabus content.
  - Must approach: u_left > u_right.
  - No pass-through: v_left ≤ v_right.
  - KE_after ≤ KE_before, otherwise "impossible unless explosive".
  - When a question gives a speed only, show both signs and mark which is valid.
- **Timeline:** pair collision t = (x_j − x_i)/(v_i − v_j) if v_i > v_j; wall t = (x_W − x_i)/v_i.
- **Draw:** track; signed velocity arrows; momentum and KE bars before/after; x–t worldline diagram.
- **Optional preset:** "separation from joint motion" (flag: rare in P4).

#### S8 `m4-connected`: string chain over smooth pulleys [M4, M1, M2, M5]
- **Configurations (presets of one general model):**
  - Atwood.
  - Table + hanging.
  - Incline (pulley at top) + hanging.
  - Two inclines meeting at a pulley.
  - Incline–horizontal–hanging (2 strings).
  - Two particles on one slope pulled by a force.
  - Extra mass attached to a hanging particle.
- **Model:**
  - Particles 1..N along the chain. eᵢ is the direction particle i moves when the chain moves "positive".
  - Gravity along eᵢ: Gᵢ = mᵢg(ĝ·eᵢ). Hanging and moving down: +mg; up a slope θ: −mg sinθ; horizontal: 0.
  - Applied force along the track: Pᵢ∥. Rᵢ = mᵢg cosθᵢ − Pᵢ⊥. F_max,i = μᵢRᵢ.
  - D = Σ(Gᵢ + Pᵢ∥), M = Σmᵢ, F_max = ΣF_max,i.
- **Regime:**
  - At rest:
    - If |D| ≤ F_max, static. With one rough contact, its friction = −D and tensions are unique.
    - With two or more rough contacts and not limiting, **tension is statically indeterminate**. Show the exact range: friction on the first k particles is S₁ ∈ [−A, A] ∩ [−D−B, −D+B], where A = Σ_{i≤k}F_max,i and B = Σ_{i>k}F_max,i. Then T_{k,k+1} = −Σ_{i≤k}(Gᵢ + Pᵢ∥) − S₁.
  - Moving, or released from rest with |D| > F_max: σ = sgn(v), or sgn(D) from rest. a = (D − σF_max)/M.
- **Tensions:** sweep from particle 1. The string between i and i+1 pulls i along +eᵢ and i+1 along −e_{i+1}.
  - T₁₂ = m₁a − G₁ − P₁ + σF₁, then the next particle, and so on.
  - The last particle's equation is a residual check; assert it is 0 in tests.
  - **Any T < 0 means the string is slack** and the common-acceleration model is invalid; switch to independent particles.
- **Phase events:**
  - Hanging particle hits the floor at height h: string slack, and each particle continues with its own a. An Atwood riser has a = −g.
  - String breaks at time / speed / distance.
  - Mass detaches at distance d.
  - Particle reaches the pulley: stop and flag.
  - v crosses 0: re-run the static test.
  - String becomes taut again: stop with "impulsive tension – beyond syllabus".
  - All phases have constant a, so scrubbing is exact.
- **Draw:** geometry, pulley, strings labelled with T, and a **split-FBD panel per particle** (targets the "one F=ma across different planes" mistake). v–t per particle. Optional energy check: ΔKE + ΔGPE + W_friction − W_applied = 0.

#### S9 `m4-vehicle`: vehicle with trailer, force or power, hill [M4, M5; also 9702 5.1.7 via ?course=9702]
- **Parameters:**
  - m₁ 50–200000 kg; m₂ 0–100000 (0 = none).
  - θ −15..15° or sinθ input (negative = downhill).
  - R₁, R₂ 0–60000 N. Option "resistance = μmg" (winch block). Optional R = R₀ + kvⁿ, n ∈ {1, 2}, flagged "only if the question states it".
  - Driving: force D | power P (W or kW) at speed v.
  - Braking force.
  - Coupling: rope (T ≥ 0) | rigid tow-bar (T < 0 means **thrust**).
- **Equations:**
  - D = P/v (clamp v ≥ 0.1, with a flag).
  - a = (D − R₁ − R₂ − (m₁+m₂)g sinθ)/(m₁+m₂).
  - T = m₂(a + g sinθ) + R₂. If T < 0 with a rope: "rope slack – invalid".
  - v_max = P/(R₁ + R₂ + Mg sinθ) when the denominator > 0. With R₀ + kv: kv² + R₀v − P = 0, take the positive root.
- **Animation:** at constant P, RK4 on M·dv/dt = P/v − R − Mg sinθ, labelled "exam asks instantaneous values".
- **Draw:** forces on both bodies; graph of D = P/v (hyperbola) against the resistance line, whose intersection is v_max.

#### S10 `m4-lift`: lift with load [M4, M2]
- **Parameters:** M 0–5000 kg, m 0–500 kg, stage profile reused from S4.
- **Equations:** T = (M+m)(g+a) and R = m(g+a), with a positive upwards. T < 0 means cable slack; R < 0 means the load leaves the floor.
- **Plots:** v–t, a–t, T–t, R–t.

#### S11 `m5-energy`: work–energy along a slope or path [M5, M1, M4]
- **Path:** straight slope (θ, L) | drop h over path length L | smooth curved preset profiles (only Δh matters; no friction on curves, because R varies — beyond syllabus; constant resistance × path length is allowed).
- **Parameters:**
  - m 0.1–200000; u 0–50.
  - Resistance: none | constant F | μ (straight only, R = mg cosθ − P sinφ).
  - Applied force P at φ to the motion.
  - W_engine direct entry, or P × t.
  - Up or down.
- **Equations:**
  - W_P = Pd cosφ, W_res = F·d, ΔGPE = mgΔh.
  - ½mv² = ½mu² + W_P + W_eng − W_res − mgΔh.
  - If this goes negative it stops: d_stop = ½mu² / (mg sinθ + F − P cosφ) going up. Then apply the S3 static test and run the return leg with friction work on both legs.
  - Solve modes: find v, F, μ, d or W_res.
- **Draw:** energy bar "account" that must balance; KE, GPE, cumulative W_res and total plotted against distance.

### 9702 AS sims (g = 9.81)

Shared with 9709 via ?course=9702: `m1-strings` (4.2.3 vector triangle), `m4-vehicle` (5.1.7 P = Fv), `m4-lift` (3.1.6 weight/apparent weight).

#### Flagship: `p2-projectile` [2.1.9, 2.1.7, 2.1.1–2.1.5, 1.4.3, qualitative 3.2.2]
- **Parameters:**
  - u 0–50 m/s step 0.1 (default 20).
  - θ −90..90° step 0.5 (default 30).
  - h₀ −50..200 m (default 0).
  - Landing level y_L (default 0).
  - g default 9.81, adjustable 1–20 (for "on the Moon" questions).
  - Optional wall at distance X with height H.
  - Optional second body dropped at the same time.
- **Equations:**
  - uₓ = u cosθ, u_y = u sinθ; x = uₓt; y = h₀ + u_y·t − ½gt²; v_y = u_y − gt.
  - Speed = √(uₓ² + v_y²); direction = atan(v_y/uₓ).
  - Reaching y_L: ½gt² − u_y·t + (y_L − h₀) = 0, with Δ = u_y² − 2g(y_L − h₀).
    - Δ < 0: never reaches that level.
    - Otherwise the landing time is the larger root, computed with the stable form. If y_L > h₀, show both crossings.
  - Apex only if u_y > 0: t = u_y/g, H = h₀ + u_y²/2g.
  - Level-ground range R = u²sin2θ/g, shown only when h₀ = y_L.
  - Impact speed cross-check √(u² + 2g(h₀ − y_L)) (topic 5).
  - Wall clearance: y(X) = h₀ + X tanθ − gX²/(2u²cos²θ).
- **Draw:**
  - Predicted path (dashed) and traced path.
  - Velocity vector with **horizontal component constant** and vertical component shrinking and reversing.
  - Strobe dots at equal Δt, showing equal horizontal spacing.
  - Plots: x–t, y–t, vₓ–t, v_y–t (area = Δy).
- **Air-resistance toggle:** warranted, because 3.2.2 says "describe and explain qualitatively the motion of objects in a uniform gravitational field with air resistance".
  - Ghost path from RK4 (dt 1e‑3) of dv/dt = g − (k/m)|v|v, with k/m ∈ {0.005, 0.02, 0.05} m⁻¹ labelled low/med/high.
  - Banner: "WITH AIR RESISTANCE – qualitative only, not for calculations".
  - No numeric readouts for the ghost; show only qualitative comparisons (lower apex, shorter range, steeper descent, vₓ decreasing).
- **Edge cases:** θ = ±90°, u = 0, h₀ < 0, target above the apex.

#### Remaining 9702 sims

| id | outcomes | parameters (min–max, default) | core equations and logic |
|---|---|---|---|
| p1-units | 1.1.2, 1.2.1–4 | quantity picker; equation templates; prefix slider p–T | units as exponent vectors over (kg, m, s, A, K) only, since the syllabus lists five base units; homogeneity = vector equality of each term; find units of a constant (e.g. k in F = kv²); estimates quiz |
| p1-uncertainty | 1.3.1–3 | bias 0–5, spread 0–5, zero error ±; value ± abs for up to 3 inputs, power n | accuracy/precision target and scatter; sum/difference: add absolute uncertainties; product/quotient: add fractional; xⁿ: \|n\|×fractional |
| p1-vectors | 1.4.1–3 | two vectors (mag 0–50, angle) | add, subtract (Δv = v₂ − v₁), components; reuses the S1 engine; boat/river and plane/wind presets |
| p2-motion-graphs | 2.1.1–7 | S4 engine, g 9.81 | adds a bounce preset (drop h, rebound fraction; v–t sawtooth with sign convention) and a "derive suvat from v–t area" overlay |
| p2-freefall-exp | 2.1.8 | h 0.2–2 m, timing random error, release delay | trapdoor/light-gate data; plot h against t² (gradient g/2); intercept shows systematic delay |
| p3-momentum | 3.1.1–6, 3.3.1–4 | m₁, m₂ 0.1–10; u₁, u₂ −20..20; mode elastic / stick / given v₁; contact time 0.001–0.5 s | elastic: v₁ = ((m₁−m₂)u₁ + 2m₂u₂)/(m₁+m₂), v₂ = ((m₂−m₁)u₂ + 2m₁u₁)/(m₁+m₂); show relative speed of approach = separation; KE change; F = Δp/Δt; F–t panel (area = Δp; "impulse" term is borderline, so label Δp); Newton's third-law pair panel |
| p3-momentum-2d | 3.3.2 | masses, initial velocity vectors, one final velocity | Σpₓ and Σp_y conserved; momentum vector triangle; explosion-from-rest preset |
| p3-drag | 3.2.1–3 | m, drag model kv or kv², upthrust, parachute opens at t | v–t to terminal (v_t = (mg−U)/k for linear); force arrows; qualitative labels |
| p4-moments | 4.1.1–4, 4.2.1–2 | beam L 1–10 m, pivot/supports, up to 5 forces (position, magnitude, angle), uniform weight at CG; hinge mode | ΣFₓ = 0, ΣF_y = 0, ΣM about a draggable point = Σ(r×F)_z (zero about every point in equilibrium); solve 2 support reactions, or hinge Hₓ, H_y plus string T; perpendicular-distance construction; couple torque = F×d, the same about any point |
| p4-pressure | 4.3.1–6 | ρ_fluid 500–13600, depth 0–20 m, object V, ρ_obj, p₀ toggle | Δp = ρgΔh; derivation panel; upthrust = (p_bottom − p_top)A = ρgV; floating fraction ρ_obj/ρ_f; spring-balance apparent weight |
| p5-energy | 5.1.1–7, 5.2.1–4 | S11 engine, g 9.81 | adds efficiency (motor lifting load: η = mgv/P_in) and derivation panels for mgΔh and ½mv² |
| p6-deformation | 6.1.1–6, 6.2.1–4 | spring k 1–500 N/m, LoP, elastic limit, load; wire L, d, F, E | F = kx; stress F/A; strain x/L; E = FL/(Ax); EPE = ½Fx = ½kx² (area); beyond elastic limit, unload parallel to the loading line gives permanent extension; experiment panel (d from micrometer, %U(E) with d counted twice) |
| p7-waves | 7.1.1–7, 7.2.1–2 | A, f, λ, type T/L, two probe points | v = fλ; Δφ = 360°Δx/λ; y–x and y–t graphs; longitudinal compressions mapped to the displacement graph; I = P/area, I ∝ A² |
| p7-cro | 7.1.3 | signal f, amplitude, time-base 1 µs–10 ms/div, y-gain mV–V/div; 2 traces | T = divisions × time-base, f = 1/T, amplitude = divisions × y-gain; phase between traces |
| p7-doppler | 7.3.1–2 | f_s, v_s 0–0.9v, v = 340 | f_o = f_s·v/(v ∓ v_s) (minus when approaching); observer on the line of motion only (off-line passing needs v_s cosα — not in syllabus) |
| p7-em-polarisation | 7.4.1–3, 7.5.1–2 | log λ cursor; polariser angles (up to 3) | region ranges (approximate); 400–700 nm; I = I₀cos²θ chained; **incident light already plane-polarised** (the ½ for unpolarised light is not required) |
| p8-stationary | 8.1.1–4 | mode: string / closed pipe / open pipe / microwave reflector; L, v, harmonic n | string and open pipe f = nv/2L; closed pipe f = (2n−1)v/4L; node spacing λ/2; no end correction |
| p8-interference | 8.2.1–2, 8.3.1–4 | λ, separation a, D, source phase 0/180°, coherence toggle, single-gap mode (gap width) | path difference nλ or (n+½)λ; pixel intensity map; x = λD/a; single gap is a Huygens-sum visual, qualitative only |
| p8-grating | 8.4.1–2 | N lines/mm 100–1200, λ 380–750 nm, white light | d = 10⁻³/N; sinθ = nλ/d; n_max = largest n with nλ/d < 1 (if d/λ is an integer, that order sits at 90° and is unobservable) |
| p9-current | 9.1.1–4, 9.2.1–3, 9.3.6 | I, n, wire A₁/A₂, L, d, ρ | Q = It; I = Anvq (v ∝ 1/A in series); V = W/Q; P = VI = I²R = V²/R; R = ρL/A scaling |
| p9-iv | 9.3.1–5, 7–8 | component select; T, light level | metal (linear), lamp (R rises), diode (~0.6 V threshold), NTC thermistor, LDR; **R = V/I at a point, not the gradient** |
| p10-emf | 10.1.3–5 | E 0–24, r 0–10, R 0–100 | I = E/(R+r); V = E − Ir; V–I line with gradient −r and intercept E; power curve (max at R = r flagged as not listed) |
| p10-circuits | 10.1.1–2, 10.2.1–7 | template networks (series, parallel, mixed, two sources), R and E sliders, voltmeter resistance | MNA nodal solver (Gaussian elimination); show junction sums and loop sums; derived series/parallel formulae |
| p10-divider | 10.3.1–4 | V_in, R₁, R₂, sensor (T or light), load R; potentiometer wire L, driver cell | V_out = V_in·R₂/(R₁+R₂); loading; null method E₁/E₂ = l₁/l₂ (no current, so no lost volts) |
| p11-alpha | 11.1.1–2 | impact parameter spread, energy (scaled) | Coulomb-repulsion RK4 trajectories in scaled units; deflection histogram; qualitative |
| p11-nuclear | 11.1.3–12, 11.2.1–6 | nuclide builder A, Z; decay type; quark picker | A and Z conservation checks; α/β⁻/β⁺/γ properties; ν̄ in β⁻, ν in β⁺; continuous β spectrum vs discrete α; quark charges u, c, t +2/3 and d, s, b −1/3, antiquarks opposite; baryon = qqq, meson = qq̄; β⁻: d→u, β⁺: u→d; 1 u = 1.66×10⁻²⁷ kg |

### Catalogue: topic → question types → sim [preset/mode]

**9709 (from the papers)**

- **M1**
  1. Resultant of coplanar forces, magnitude and direction → S1 [resultant]
  2. Equilibrium: find P and θ, or two magnitudes → S1 [solve]
  3. "Resultant has no y-component" → S1 [constraint]
  4. Particle on two strings; greatest F before a string goes slack → S2
  5. Smooth ring on a string; force perpendicular to a string → S2
  6. Rough horizontal plane: limiting μ; force at an angle → S3
  7. Rough incline: on the point of moving up/down; range of P; least μ → S3
  8. Ring on rough rod → S3 [ring]
  9. Connected particles at rest: least μ → S8 [static]
- **M2**
  1. Multi-stage journey: sketch, total distance, unknown a/T/V → S4
  2. Two-body comparison, catching up → S4
  3. Reading an s–t graph, average speed → S4
  4. Vertical projection: speed at a height, time with speed ≥ V → S5
  5. Two particles projected with a delay, meeting → S5
  6. v(t) given: rest times, max v, total distance across turning points → S6
  7. s(t) given → S6
  8. a(t) with boundary conditions, including two s-conditions → S6
  9. Piecewise a → S6
  10. Unknown constants from conditions → S6
  11. Distance in the n-th second → S3/S4
- **M3**
  1. One velocity after collision given, find the other → S7
  2. Coalescence → S7
  3. KE loss → S7
  4. Collision chains; wall rebound; position of the second collision → S7 [timeline]
  5. Mid-air vertical collision → S5
  6. Unknown mass from momentum or KE loss → S7 [solve]
- **M4**
  1. Incline/plane dynamics then SUVAT; slides back? → S3
  2. Atwood pulley, then floor/break; greatest height → S8
  3. Table or incline with hanging particle; does it move? → S8
  4. Double incline; three particles with two strings → S8
  5. Same-slope pair pulled by a force, string breaks → S8
  6. Mass detaches → S8
  7. Car and trailer: tension or thrust → S9
  8. Lift: cable tension, floor reaction → S10
- **M5**
  1. W = Fd cosθ and power at constant speed → S11/S9
  2. Work–energy on a slope (find v, F, μ, d) → S11
  3. Energy method up and back down → S11
  4. Engine work on a hill → S11
  5. P = Fv: a at speed v, max speed, hill angle at constant speed → S9
  6. Car and trailer with power → S9
  7. Smooth curved path → S11
  8. Average power W/t → S11
  9. KE loss in collision → S7

**9702 AS (from the syllabus; validate against Paper 1/2 texts)**
- **Topic 1:** base units and homogeneity; prefixes; estimates → p1-units. Systematic/random errors, zero error, precision vs accuracy, combining uncertainties → p1-uncertainty. Vector add/subtract, Δv, components → p1-vectors.
- **Topic 2:** graphs (gradient/area) and suvat free fall → p2-motion-graphs. Bouncing ball → p2-motion-graphs [bounce]. Experiment for g → p2-freefall-exp. Projectiles: horizontal from a cliff, angled launch, max height/range/time, impact velocity, clearing a wall → p2-projectile.
- **Topic 3:** F = ma, weight, Newton's laws, third-law pairs, F = Δp/Δt (rebound from a wall) → p3-momentum. 1D elastic/inelastic → p3-momentum. 2D → p3-momentum-2d. Drag/terminal velocity → p3-drag, plus the projectile ghost path.
- **Topic 4:** moments, beams, centre of gravity, couples → p4-moments. Vector triangle → m1-strings?course=9702. Density, pressure, upthrust, floating → p4-pressure.
- **Topic 5:** work, energy conservation, efficiency → p5-energy. P = W/t and P = Fv → m4-vehicle?course=9702 and p5-energy [motor].
- **Topic 6:** Hooke, EPE, stress/strain/E, experiment, elastic vs plastic → p6-deformation.
- **Topic 7:** wave terms, phase, graphs, intensity → p7-waves. CRO → p7-cro. Doppler → p7-doppler. EM spectrum and Malus → p7-em-polarisation.
- **Topic 8:** stationary waves → p8-stationary. Diffraction and interference, λ = ax/D → p8-interference. Grating → p8-grating.
- **Topic 9:** Q = It, I = Anvq, V = W/Q, power, R = ρL/A → p9-current. I–V curves, thermistor, LDR → p9-iv.
- **Topic 10:** emf and internal resistance → p10-emf. Kirchhoff, series/parallel → p10-circuits. Potential divider, potentiometer → p10-divider.
- **Topic 11:** α-scattering → p11-alpha. Nuclides, decay equations, particles, quarks → p11-nuclear.

---

## C. Paper 4 extraction and tagging

### 1. Cleaning (per page; split raw on `\f`)

**Drop the cover page.** For 9702, also drop the data/formulae pages: any page containing "acceleration of free fall" or "Formulae" with no question start.

**Drop these lines:**
- Page number: the first non-barcode line, a bare integer equal to the page index. Record it for provenance.
- Barcodes: `^\* ?\d{10,} ?\*$`, `^\*\d{10}\*$`.
- Lines that are more than 50% `(cid:\d+)` tokens. Also remove `(cid:\d+)` inline.
- Margin text: `^(NIGRAM|SIHT|NI|ETIRW|TON|OD)$` and `DO NOT WRITE IN THIS MARGIN`.
- Boilerplate: `© UCLES`, `[Turn over`, `BLANK ?PAGE`, `This document has \d+ pages`, `^DC \(`.
- From `Additional ?[Pp]age` or `Permission to reproduce` to the end of the paper.
- PapaCambridge watermarks (2026 files): `Trace ID:`, `Re-uploading`, `Licensed for hosting`, `Downloaded from PapaCambridge`, the garbled header containing `Question Paper`, and `^DFD$`.

**Answer lines:**
- `^\s*\.{6,}\s*$` → drop, but leave an `<ANS>` marker.
- Mixed lines `^(.*?)\s*\.{6,}\s*(.*)$` → `label ____ units [n]`. 9702 marks often sit on these lines, e.g. `ω = ..... rad s–1 [2]`.

**Normalisation:**
- `Å` → `°` (2018–2023 9709 files).
- `–` / `−` → `-`.
- Join superscript-only lines (`-1`, `-2`, `−1`) to the previous line.
- Glyph map seen in the 2024+ 9709 files: ` G ` = ≤ (`0 G t G 3`), ` 1 ` = < (`T 1 30`), ` 2 ` = > (`m 2 1.5`), `i` = θ (`i°`, "angle i"). Probably ` H ` = ≥ (verify).
- **Apply the glyph map only in math contexts** and record each substitution in `flags`. Keep `raw` alongside.
- Some files have words concatenated with no spaces (e.g. w23_42, s22_43). Record `spacing_ratio`; the tagger is insensitive to this.

### 2. Splitting (a state machine over cleaned lines with `<PB>` and `<ANS>` markers; expected = 1)

- **Question start:** a line matching `^(\d{1,2})(\s+(.*))?$` where the number equals `expected`, and either:
  - the rest starts with a capital letter, `(a)` or `(i)`; or
  - it is a **bare number line** that comes directly after `<PB>` or an `<ANS>` block. Diagram-first questions look like this: "4" then "3 kg A B 1.5 kg".
- **Reject** if the rest starts with a unit or decimal (`kg|m|N|s|cm|°|\d`), e.g. "2.6 m 35 N".
- **Parts:**
  - `^\(([a-h])\)` is level 1.
  - `^\((i|ii|iii|iv|v|vi)\)` is level 2. If a question has no (a), the roman numerals are level 1 (2018–19 style).
  - Combined forms such as `(b) (i) Verify` and `1 (a) Define` are handled on one line.
- **Marks:** each `\[(\d{1,2})\]` attaches to the current part. `[Total: n]` (9702) closes the question.
- **Preamble:** text after a mark bracket and before the next part label becomes the `preamble` of the next part. Text before the first part is the `stem`.

### 3. JSON schema

```json
{"paper_id":"9709_s24_qp_41","syllabus":"9709","component":"41","series":"s","year":2024,"session":"May/June",
 "syllabus_version":"2020-2027","total_marks_expected":50,"total_marks_found":50,"warnings":[],
 "questions":[{"q":6,"pages":[10,11],"stem":"…","raw":"…","marks":11,"total_stated":null,
   "tags":["9709-M2"],"primary_tag":"9709-M2","qtypes":["M2.6"],"flags":["glyph_subst"],
   "parts":[{"id":"6b(ii)","label":"b","sub":"ii","preamble":"","text":"…","marks":5,
     "tags":[{"tag":"9709-M2","score":6,"rules":["v=f(t)","distance travelled"]}],
     "qtypes":["M2.6"],"sim":{"id":"m2-calculus","preset":null}}]}]}
```

- Series from the filename: `([msw])(\d\d)`. m = Feb/Mar, s = May/Jun, w = Oct/Nov.
- `syllabus_version`:
  - 9709: ≤2019 = "2017-19 M1" (same five areas, (i)(ii) labelling); else "2020-2027".
  - 9702: ≤2021 = "2019-21 legacy"; 2022–24 = "2022-24"; ≥2025 = "2025-27".

### 4. Tagger

- **Normalisation:** lowercase with all whitespace removed, so concatenated words still match.
- **Rules:** `{tag, regex, weight}`, each counted once.
- **Text scored per part:** part text + preamble + 0.5 × stem.
- **Thresholds:** include a tag if score ≥ 2; primary tag = maximum score. Question tags = union of part tags.

**9709 rules** (regex on the normalised text, weight in brackets):
- **M1:**
  - `equilibrium` (3); `coplanarforces` (3); `resultant` (3); `limitingequilibrium` (3).
  - `onthepointof(moving|sliding|slipping)` (3); `magnitudeanddirection` (2).
  - `smoothring|roughring|threaded` (2); `atrest|remainsatrest` (1).
  - `coefficientoffriction` (1; also +1 M4 when `acceleration` is present).
- **M2:**
  - `velocity-timegraph|v-tgraph` (3); `displacement-timegraph` (3).
  - `[vsa]=[^.;]*t` (3); `differentiat|integrat` (2).
  - `distancetravelled|totaldistance|averagespeed` (2); `instantaneous(ly)?(at)?rest` (2).
  - `projectedverticallyupwards` (2); `decelerat|uniformly|constantspeed` (1).
- **M3:** `collid|collision|coalesce|momentum` (3); `rebound` (1, only with `collid` or `wall`).
- **M4:**
  - `pulley` (3); `towing|trailer|caravan|tow-?bar|coupling` (3).
  - On the spaced text: `\blift\b|elevator` (3); `drivingforce` (2).
  - `findtheacceleration|accelerationof` (2); `tension` (1).
  - `stringbreaks|hitstheground|reachesthefloor` (2).
- **M5:**
  - `workdone|energymethod` (3); `power|kw|rateofworking|workingatarate` (3).
  - `kineticenergy|potentialenergy|energylost` (2); `\d(kj|j)\b` (2).
  - `maximumspeed|greatestspeed|steadyspeed` (1).
- **qtype codes:** pattern combinations, e.g. `pulley` + `inclined` → M4.3; `power` + `trailer` → M5.6.

**9702 Paper 4 rules (A Level topics 12–25):**
- **12 Motion in a circle:** `radian`, `angularspeed`, `centripetal`, `horizontalcircle|verticalcircle|circularpath`.
- **13 Gravitational fields:** `gravitationalfield`, `gravitationalpotential`, `geostationary`, `orbit`, `satellite` (if not communication).
- **14 Temperature:** `thermalequilibrium`, `thermodynamic(temperature)?scale`, `absolutezero|kelvin`, `specificheatcapacity`, `specificlatentheat`.
- **15 Ideal gases:** `idealgas`, `pv=nrt`, `mole|avogadro`, `kinetictheory`, `meansquare|r\.?m\.?s\.?speed`, `molecule`.
- **16 Thermodynamics:** `internalenergy`, `firstlawofthermodynamics`, `workdoneon(the)?gas`.
- **17 Oscillations:** `simpleharmonic|s\.h\.m`, `oscillat`, `damp`, `resonan`, `naturalfrequency`.
- **18 Electric fields:** `electricfield`, `electricpotential`, `pointcharge`, `parallelplates` (without `capacitor`), `coulomb`.
- **19 Capacitance:** `capacit`, `timeconstant`, `discharg`, `μf|microfarad`.
- **20 Magnetic fields:** `magneticfluxdensity|magneticfield`, `hall(voltage|probe)`, `inducede\.?m\.?f`, `faraday|lenz`, `fluxlinkage`, `solenoid`, `velocityselector`.
- **21 Alternating currents:** `alternating`, `r\.?m\.?s\.?(current|voltage|value)`, `rectif`, `smoothing`, `peakvoltage|peakcurrent`.
- **22 Quantum physics:** `photon`, `photoelectric`, `workfunction`, `thresholdfrequency`, `debroglie`, `electrondiffraction`, `energylevel`, `(line|emission|absorption)spectr`.
- **23 Nuclear physics:** `massdefect`, `bindingenergy`, `fission|fusion`, `decayconstant`, `half-?life`, `activity`, `radioactive`.
- **24 Medical physics:** `ultrasound`, `piezo`, `acousticimpedance`, `intensityreflectioncoefficient`, `x-?ray`, `computedtomography|ctscan`, `\bpet\b|positronemission`, `tracer`. `attenuation` counts only with `x-?ray|ultrasound|attenuationcoefficient`.
- **25 Astronomy and cosmology:** `luminosity`, `standardcandle`, `radiantfluxintensity`, `stefan|wien`, `redshift`, `hubble`, `bigbang`, `cepheid`.
- **LEGACY-electronics (years ≤2021):** `operationalamplifier|op-amp`, `invertingamplifier`, `comparator`, `negativefeedback`, `sensingdevice`, `relay`, `straingauge`.
- **LEGACY-communication (years ≤2021):** `modulat`, `bandwidth`, `decibel|\bdb\b`, `attenuation` with `cable|fibre|signal`, `analogue|digital|sampling`, `mobilephone`.
- **Expected multi-tags:** 12+13 (orbits), 18+20 (crossed fields), 19+21 (smoothing capacitor).

### 5. Validation
- Σ part marks per paper must equal 50 or 100.
- Σ part marks per question must equal `[Total]` where present.
- Question numbers must be consecutive from 1. Typical counts: 9709 has 6–8 questions; 9702 Paper 4 has about 9–12.
- Every part has marks and at least one tag. Print a list of untagged parts.
- **Mark-scheme cross-check:** extract `*_ms_*.pdf` and parse row labels like `1(a)`, `2(b)(i)` with their marks. Compare the label set and marks with the question-paper split. This is the strongest check.
- **Gold set:** hand-tag about 6 papers, e.g. 9709 s24_41, w23_42, s22_43, m26_42, s18_41; 9702 s24_42, w19_41. Report per-tag precision and recall; target primary-tag recall ≥ 0.9.
- Print 10 random parts with their tags for spot checks.
- Per-paper topic spread: 9709 papers usually cover ≥4 of M1–M5.

---

## D. Headless test cases (node `tests/run.js`)

Use `approx(a, e, rel = 1e-4)`. Use 1e‑9 for exact values.

**9709 (g = 10)**

| Sim | Input | Expected |
|---|---|---|
| S1 | 10 N @0°, 20 N @90°, 15 N @210° | X = −2.99038, Y = 12.5, R = 12.8527, dir 103.454° |
| S1 | 52 N @0°, 39 N @90°, solve P and θ | P = 65, θ = 233.13° |
| S2 | strings 0.8/0.6, right angle at C, m 10, F = 20 horizontal towards B | T_AC = 76, T_BC = 68; T_BC = 0 at F = 133.33 |
| S2 | string 2.6, depth 2.4, 35 N perpendicular to string | m = 9.1, T = 84 |
| S2 | ring, AR 30° and BR 40° from vertical (A above, B below), 2 N horizontal | T = 1.75011, m = 0.017498 (synthetic geometry; verify the real one against the ms) |
| S3 | 0.2 kg, 1.2 N, limiting | μ = 0.6 |
| S3 | same with μ = 0.3 | a = 3; distance in 3rd second = 7.5 |
| S3 | m 5, θ 30, μ 0.2, φ = 0 | P_up = 33.6603, P_down = 16.3397 |
| S3 | same, horizontal push (φ = −30) | P_up = 43.9414, P_down = 16.9144 |
| S3 | m 5, θ 30, μ 0.8, P 0 | static; F = 25; μR = 34.641; ratio 0.72169 |
| S3 | m 3, θ 30, μ 0.2, u = 8 up | decel 6.73205, d = 4.75338, then slides down a = 3.26795, returns at 5.57383 |
| S3 | bobsled u 5, θ 12, μ 0 | v = 16.5679 after 60 m |
| S3 | bobsled with μ 0.03 | a = 1.78567, t = 5.86261 |
| S4 | 0→20 in 10 s, 30 s constant, 20 s to rest | 900 m |
| S4 | bus: a, 0.75a, 16 m/s, 240 s, 3000 m | a = 16/45 = 0.355556 |
| S4 | s25_42 Q4 quadratic | T = 20 (reject 1060 because T < 30); AC = 3279 |
| S4 | m26_42 Q2 | v = 8, distance 106, average speed 4.41667 |
| S4 | elevator, 7 segments, net displacement 0 | V = 46/27 = 1.70370; first acceleration 1.3333 |
| S5 | w24_41 Q5 (80 at 0 s, 100 at 1 s) | T = 3.5, height 218.75 |
| S5 | s22_43 Q2 (apex 45) | u = 30; time with speed ≥ 10 is 4 s |
| S5 | w23_42 Q5 collision | speed at 20 m = 15; A after = −4.5; ground-time interval 0.4 s |
| S6 | v = −0.1t³ + 1.8t² − 6t + 5.6 | a = 0 at t = 2, 10; v(10) = 25.6; v(14) = 0; t = 2 is a double root (no reversal); s(14) = 176.4, s(15) = 168.375; **distance 0–15 = 184.425** |
| S6 | s = 4t³ − 39t² + 120t | rest at 2.5, 4; distance over [1, 4] = 40.5; \|a(3)\| = 6 |
| S6 | v = t − 7t^½ + 12 (my reading of m26_42 Q7) | rest at 9, 16; a(4) = −0.75; distance 0–25 = 31.5 |
| S6 | a = 6t − 12 with s(1) = 5, s(3) = 1 | C₁ = 9, C₂ = 1; v = 3(t−1)(t−3) |
| S6 | piecewise a (6+4t; 14; 16−2t), from rest | v(2) = 20, v(4) = 48; v = 55 at t = 5 and 11 |
| S7 | 0.3 kg at 4 hits 0.2 kg at rest; Q moves at 3 | v_P = 2 |
| S7 | Q then coalesces with R at 2 | m_R = 0.1 |
| S7 | 0.2 at 5 and 0.1 at 2, coalesce | V = 4; KE loss 0.3 J |
| S7 | m26_42 Q6 | v = 6, m = 2; second collision 1.2 m from wall |
| S7 | 0.2 at +15, 0.1 at −20; P stops | Q = +10 |
| S8 | Atwood 1.8 / 1.2 | a = 2, T = 14.4 |
| S8 | same, floor after 1 m | lighter rises a further 0.2 m |
| S8 | double incline 0.3 kg @60°, 0.2 kg @30°, smooth | a = 3√3 − 2 = 3.19615; T = 0.6 + 0.6√3 = 1.63923 |
| S8 | same, BC rough, 3 N up BC | least μ = 4/√3 − 1.5 = 0.809401 |
| S8 | s25_42 Q5 | T = 40, 32; μ = 0.423390; A total distance 2.76923 |
| S8 | s26_41 Q4 | m = 3.5; total time 1.4 s |
| S8 | m26_42 Q5 | a = 15.5359; T = 7.2; time to rest after break 0.236292 |
| S8 | table: 2 kg with μ 0.25, 3 kg hanging 1.5 m | a = 5, v = √15, then 3 m more |
| S8 | all cases | last-particle residual = 0 |
| S9 | s24_41 Q4 | a = 0.075, T = 172.5 |
| S9 | w23_42 Q6 | a = 0.3, T = 43000; β = 3.66306° |
| S9 | s26_41 Q2 | a = 0.75; θ = 5.65920° |
| S9 | s22_43 Q5 | P = 204 W |
| S9 | winch (μ 0.8, 200 kg, 4000 W) | v = 2.5 |
| S10 | crate | m = 50 from T = 12250 at a = −0.2; greatest R = 520 N |
| S10 | lift 1500 kg, a = −2 | T = 12000 |
| S11 | w23_42 Q1 | 150 J |
| S11 | w23_42 Q3 | v = 4.77107 |
| S11 | s24_41 Q3 | 44427.8 kJ |
| S11 | w24_41 Q2 | v = 15.8114; F = 27.9 |
| S11 | s22_43 Q5c | d = 121.900 |
| S11 | m26_42 Q4 | 464800 J |
| S11 | s25_42 Q1 | W = 281.908 J; P = 35.2385 W |

**9702 (g = 9.81)**

| Sim | Input | Expected |
|---|---|---|
| p2-projectile | u 20, θ 30 | T = 2.03874, R = 35.3119, H = 5.09684 |
| p2-projectile | u 15, θ 0, h₀ 20 | t = 2.01928, x = 30.2891, v = 24.8475 at 52.866° below horizontal |
| p2-projectile | u 25, θ 40, h₀ 1.5 | T = 3.36701, R = 64.4820, H = 14.6618 |
| p2-projectile | u 20, θ 90 | T = 4.07747, H = 20.3874 |
| p2-motion-graphs | drop 1.25 m | 4.95227 m/s at 0.504819 s |
| p3-momentum | 2 kg at 3 m/s elastic on 1 kg at rest | v₁ = 1, v₂ = 4; KE 9 → 9 |
| p3-momentum | 0.15 kg, 20 → −15 m/s in 0.05 s | F = 105 N |
| p3-momentum-2d | 2 kg at 5 m/s hits 3 kg at rest; 2 kg leaves at 3 m/s @60° | 3 kg: 2.90593 m/s at −36.587° |
| p3-drag | m 0.1, k 0.002 (kv²) | v_t = 22.1472 |
| p4-moments | 4 m beam on end supports, 200 N at 2 m, 300 N at 1 m | R_B = 175, R_A = 325 |
| p4-pressure | 1×10⁻³ m³ in water | upthrust 9.81 N |
| p4-pressure | 2 m of water | Δp = 19620 Pa |
| p6-deformation | k = 50, F = 4 | x = 0.08, EPE = 0.16 J |
| p6-deformation | L = 2, d = 0.5 mm, F = 50, x = 2.5 mm | E = 2.03718×10¹¹ Pa |
| p7-waves | f = 50, λ = 0.4 | v = 20 |
| p7-doppler | f_s 500, v 340, v_s 20 | 531.25 approaching; 472.222 receding |
| p7-em-polarisation | I₀ = 8 at 60° | 2 |
| p7-em-polarisation | I₀ = 8, then 30°, 30° | 4.5 |
| p8-stationary | string L = 0.8, v = 120 | f₁ = 75 |
| p8-stationary | closed pipe 0.3 m, v 340 | 283.333, then 850 |
| p8-stationary | open pipe 0.3 m | 566.667 |
| p8-interference | a = 0.5 mm, D = 2 m, λ = 600 nm | x = 2.4 mm |
| p8-grating | 600 /mm, 589 nm | θ₁ = 20.695°, θ₂ = 44.975°, n_max = 2 |
| p9-current | n = 8.5×10²⁸, A = 1 mm², I = 1 A | v = 7.35294×10⁻⁵ m/s |
| p9-current | ρ = 1.7×10⁻⁸, L = 2, d = 0.5 mm | R = 0.173161 Ω |
| p10-emf | E 12, r 0.5, R 5.5 | I = 2, V = 11, lost volts 1 |
| p10-circuits | 12 V + 2 Ω and 6 V + 3 Ω branches with 6 Ω across | V = 8; I₁ = 2, I₂ = −0.6667 (charging), I₃ = 1.3333 |
| p10-divider | 9 V, 1 kΩ/2 kΩ | 6 V; with 2 kΩ load 4.5 V |
| p10-divider | potentiometer, 1.5 V balances at 60 cm | 48 cm → 1.2 V |
| p1-uncertainty | V 5.0 ± 0.1, I 0.50 ± 0.02 | R = 10.0 ± 0.6 (6%) |
| p1-units | J | kg m² s⁻² |
| p1-units | v² = u² + 2as | homogeneous |
| p11-nuclear | β⁻ decay | udd → uud; charge and A, Z conserved |

**Property tests:**
- R = 0 implies a closed polygon.
- Momentum is conserved in every collision event.
- Energy balance in S11 and S8 matches the dynamics within 1e‑9.
- Scrubbing to t and playing to t give the same state.

---

## E. Order of implementation

1. Copy the raw texts into the project. Fix the 9702 numbering in the JSON and `CURRICULUM_MAP.md`.
2. `core/util.js` and the node test harness. Write all section D cases as failing tests first.
3. `engine/mech-forces.js` (plane regime, resultant, strings) until its tests pass.
4. `core/ui.js`, `view.js`, `plot.js`, `anim.js`, `theme.css`. Build **S3 m1m4-plane** as the template vertical slice, then S1 and S2.
5. M2 engines and sims: S4, S6, S5. Then `catalog.js` and `index.html` with deep links. The M1/M2 slice is now complete and polished.
6. S7, S8, S9, S10, S11.
7. 9702: `p2-projectile`, then p2 and p3 sims, then p4–p6, p7–p8, p9–p10, p1, p11. Set up ?course=9702 reuse.
8. The paper pipeline can run in parallel from step 2: clean → split → mark validation → mark-scheme cross-check → tagger → gold set → qtype→sim linking via `catalog.js`.

## Uncertain points to check
- **9709:**
  - The exact wording of the P4 notes (Lami's theorem; whether separation/explosion counts as "direct impact").
  - Resistance proportional to v or v² (use at an instant only).
  - 2018–19 papers belong to the old 9709 M1 syllabus; I believe the content is equivalent.
- **9702 items not explicitly in the outcomes:**
  - Springs in series/parallel.
  - Maximum power transfer.
  - The U-tube manometer.
  - Area under F–t as Δp ("impulse").
  - Vernier/micrometer reading (practical section only).
  - Brittle/ductile (absent from the 2025 list).
  - Doppler with an off-line observer (exclude).
  - Only five base units are listed in 1.2.1.
- **Text extraction:**
  - My readings of the garbled m26_42 Q7 and s24_41 Q6 formulas are reconstructions.
  - The ring-geometry test is synthetic.
  - The glyph mappings (G/H/1/2/i) need spot-checking per series.

### Critical files for implementation
- data/syllabus_9709_9702.json
- CURRICULUM_MAP.md
- (temporary scratchpad) syl/9702_2025-2027_syllabus.txt (lines 438–763; data sheet at 1886+)
- (temporary scratchpad) bulk.py and (temporary scratchpad) raw/ (e.g. 9709_s24_qp_41.txt for the old layout, 9709_w24_qp_41.txt for the barcode/cid layout, 9709_m26_qp_42.txt for watermarks, 9702_s24_qp_42.txt for the 9702 layout)
- data/papers/9709/<year>/<session>/*_ms_*.pdf (mark schemes, for preset and split validation)