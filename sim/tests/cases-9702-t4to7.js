/* 9702 AS topics 4–7: statics/pressure, energy, materials, waves. g = 9.81 throughout.
   Every expected value is worked by hand in the comment beside it. */
const S = require('../engine/phys-statics.js');
const E = require('../engine/phys-energy.js');
const M = require('../engine/phys-materials.js');
const W = require('../engine/phys-waves.js');
const g = 9.81;
const beam = (o) => Object.assign({ L: 4, W: 0, xG: 2, loads: [], mode: 'pin', xP: 0, xA: 0, xB: 4 }, o);
const ld = (x, F, ang) => ({ x, F, ang: ang === undefined ? -90 : ang, on: true });

module.exports = {
  /* ---------------- topic 4: moments ---------------- */
  'PLAN D: 4 m beam on end supports, 200 N at 2 m, 300 N at 1 m: R_B = 175, R_A = 325': () => {
    // moments about A: R_B × 4 = 200 × 2 + 300 × 1 = 700 ⇒ R_B = 175; R_A = 500 − 175 = 325
    const r = S.solveBeam(beam({ mode: 'supports', loads: [ld(2, 200), ld(1, 300)] }));
    approx(r.RB, 175); approx(r.RA, 325); check(r.balanced && !r.tips, 'balanced');
  },
  'moments about ANY point sum to zero once the reactions are included': () => {
    const r = S.solveBeam(beam({ mode: 'supports', W: 120, xG: 2, loads: [ld(2, 200), ld(1, 300), ld(3.5, 80)] }));
    [-1, 0, 0.7, 2, 4, 9].forEach(x => approx(S.sumM(r.all, x), 0, 1e-9));
    approx(S.sumF(r.all).y, 0, 1e-9);
  },
  'perpendicular distance: 10 N at 60° below the beam, 2 m from O': () => {
    // M = (x − x_O) F sin(ang) = 2 × 10 × sin(−60°) = −17.3205 N m (clockwise); d⊥ = 2 sin 60° = 1.73205 m
    const f = { x: 2, F: 10, ang: -60 };
    approx(S.momentAbout(f, 0), -17.3205); approx(S.perpDist(f, 0), 1.73205);
    approx(S.momentAbout({ x: 2, F: 10, ang: 0 }, 0), 0, 1e-12);     // along the beam: line passes through O
  },
  'tipping: 600 N person on a 200 N plank, supports at 1 m and 4 m: R_A = 0 at x = 4.333 m': () => {
    // about B (x = 4): weight 200 N at 3 m gives 200 × 1 = 200 N m anticlockwise; person 600 × (x − 4) clockwise ⇒ x = 4 + 1/3
    const m = beam({ L: 6, mode: 'supports', W: 200, xG: 3, xA: 1, xB: 4, loads: [ld(5, 600)] });
    approx(S.solveUnknown(m, 'x1', 'RA').value, 4.333333);
    check(S.solveBeam(m).tips === 'B', 'at x = 5 the plank tips about B');
    const m2 = Object.assign({}, m, { loads: [ld(13 / 3, 600)] }); const r2 = S.solveBeam(m2);
    approx(r2.RA, 0, 1e-6); approx(r2.RB, 800, 1e-9);
  },
  '9702/22 O/N 24 Q3(c): shelf 0.65 m, 33 N, cup 1.5 N 0.12 m from B, wire at midpoint at 50°: T = 46 N': () => {
    // T sin 50° × 0.325 = 33 × 0.325 + 1.5 × 0.53 = 11.52 ⇒ T = 11.52 / 0.248964 = 46.2716 N (MS: 46 N)
    const m = beam({ L: 0.65, W: 33, xG: 0.325, loads: [ld(0.53, 1.5), ld(0.325, 0, 130)] });
    const T = S.solveUnknown(m, 'F2', 'M').value;
    approx(T, 11.52 / (0.325 * Math.sin(50 * Math.PI / 180))); approx(T, 46.2716, 1e-5);
    m.loads[1].F = T; const r = S.solveBeam(m);
    check(r.balanced, 'balanced'); approx(r.R.x, T * Math.cos(50 * Math.PI / 180), 1e-9);    // hinge pushes away from wall: 29.74 N
    approx(r.R.y, 34.5 - T * Math.sin(50 * Math.PI / 180), 1e-6);                            // 34.5 − 35.4462 = −0.9462 N
  },
  '9702/21 M/J 23 Q2(a): hinged beam, spring 8.2 N up, block 0.30 N, string 4.8 N at 30°: W = 1.6 N, H = 4.2 N': () => {
    // 8.2 × 0.50 = W × 0.60 + 0.30 × 0.80 + (4.8 sin 30°) × 1.2  ⇒ W = (4.1 − 0.24 − 2.88)/0.60 = 1.63333 N (MS 1.6 N)
    const m = beam({ L: 1.2, W: 1, xG: 0.6, loads: [ld(0.5, 8.2, 90), ld(0.8, 0.3), ld(1.2, 4.8, -30)] });
    const Wb = S.solveUnknown(m, 'W', 'M').value; approx(Wb, 1.633333);
    m.W = Wb; const r = S.solveBeam(m); check(r.balanced);
    approx(Math.abs(r.R.x), 4.8 * Math.cos(Math.PI / 6));                                   // 4.157 N (MS 4.2 N)
  },
  'non-uniform rod: centre of gravity from balance': () => {
    // 2.0 m rod, weight 12 N, pivot at 0.80 m, 5.0 N at x = 0: 5 × 0.8 = 12 × (x_G − 0.8) ⇒ x_G = 0.8 + 4/12 = 1.13333 m
    const m = beam({ L: 2, W: 12, xG: 1, xP: 0.8, loads: [ld(0, 5)] });
    approx(S.solveUnknown(m, 'xG', 'M').value, 1.133333);
    // reaction at pivot once balanced = 17 N upward
    m.xG = 1.1333333333333; const r = S.solveBeam(m); approx(r.R.y, 17); approx(r.R.x, 0, 1e-12);
  },
  'unknown load magnitude and position (principle of moments)': () => {
    // pivot at 1.0 m; 30 N at 0.2 m (24 N m anticlockwise); F1 at 1.6 m ⇒ F1 = 24/0.6 = 40 N
    const m = beam({ L: 2, xP: 1, loads: [ld(1.6, 10), ld(0.2, 30)] });
    approx(S.solveUnknown(m, 'F1', 'M').value, 40);
    // with F1 = 60 N, x1 = 1 + 24/60 = 1.4 m
    m.loads[0].F = 60; approx(S.solveUnknown(m, 'x1', 'M').value, 1.4);
    // a force through the pivot cannot balance
    const m3 = beam({ L: 2, xP: 1, loads: [ld(1, 10), ld(0.2, 30)] });
    check(isNaN(S.solveUnknown(m3, 'F1', 'M').value), 'no solution through pivot');
  },
  'couple: torque = F × perpendicular separation, same about every point, zero resultant': () => {
    // F = 20 N, d = 0.50 m: θ = 90° ⇒ 10 N m; θ = 30° ⇒ 20 × 0.50 × sin 30° = 5 N m
    const c = S.couple(20, 0.5, 90); approx(c.torque, 10);
    [-2, 0, 0.25, 0.5, 3].forEach(x => approx(c.momentAbout(x), 10, 1e-12));
    approx(c.resultant.x, 0, 1e-12); approx(c.resultant.y, 0, 1e-12);
    const c2 = S.couple(20, 0.5, 30); approx(c2.torque, 5); approx(c2.dPerp, 0.25); approx(c2.momentAbout(-1.3), 5, 1e-12);
  },
  'coincident supports are rejected': () => check(S.solveBeam(beam({ mode: 'supports', xA: 2, xB: 2, loads: [ld(1, 10)] })).invalid, 'invalid'),

  /* ---------------- topic 4: density and pressure ---------------- */
  'PLAN D: 2 m of water: Δp = 19620 Pa': () => approx(S.hydro(1000, g, 2), 19620),       // 1000 × 9.81 × 2
  'density and pressure definitions': () => {
    approx(S.density(2.7, 1e-3), 2700);                                                     // 2.7 kg / 1.0×10⁻³ m³
    approx(S.pressure(600, 0.04), 15000);                                                   // 600 N / 0.04 m²
  },
  'PLAN D: 1×10⁻³ m³ fully in water: upthrust 9.81 N, from the pressure difference, p₀ cancels': () => {
    // A = V/H = 0.01 m², top at 0.5 m: p_top = 1000×9.81×0.5 = 4905 Pa, p_bottom = 1000×9.81×0.6 = 5886 Pa
    // U = (5886 − 4905) × 0.01 = 9.81 N = ρgV = 1000 × 9.81 × 1×10⁻³
    const o = S.submerged({ rhoF: 1000, rhoO: 2700, V: 1e-3, H: 0.1, d: 0.5, g, p0: 0, mode: 'held' });
    approx(o.pTop, 4905); approx(o.pBottom, 5886); approx(o.U, 9.81); approx(o.Uarch, 9.81);
    // aluminium: W = 2700 × 1×10⁻³ × 9.81 = 26.487 N ⇒ spring balance reads 26.487 − 9.81 = 16.677 N
    approx(o.W, 26.487); approx(o.apparent, 16.677);
    const o2 = S.submerged({ rhoF: 1000, rhoO: 2700, V: 1e-3, H: 0.1, d: 0.5, g, p0: 1.01e5, mode: 'held' });
    approx(o2.U, 9.81, 1e-9); approx(o2.pTop, 101000 + 4905);
  },
  'upthrust does not depend on depth once fully submerged': () => {
    const a = S.submerged({ rhoF: 1030, rhoO: 3000, V: 0.02, H: 0.4, d: 1, g, p0: 0, mode: 'held' });
    const b = S.submerged({ rhoF: 1030, rhoO: 3000, V: 0.02, H: 0.4, d: 15, g, p0: 0, mode: 'held' });
    approx(a.U, b.U); approx(a.U, 1030 * g * 0.02);                                         // 202.086 N
  },
  'partly submerged (top 0.05 m above surface)': () => {
    // A = 0.01 m², immersed height 0.05 m ⇒ U = 1000 × 9.81 × 0.01 × 0.05 = 4.905 N
    const o = S.submerged({ rhoF: 1000, rhoO: 500, V: 1e-3, H: 0.1, d: -0.05, g, p0: 0, mode: 'held' });
    approx(o.U, 4.905); approx(o.Uarch, 4.905); check(o.state === 'partial');
  },
  'floating block: immersed fraction = ρ_object/ρ_fluid, upthrust = weight': () => {
    // ρ = 600 in water, H = 0.20 m ⇒ immersed depth 0.12 m; U = W = 600 × 2×10⁻³ × 9.81 = 11.772 N
    const o = S.submerged({ rhoF: 1000, rhoO: 600, V: 2e-3, H: 0.2, d: 0, g, p0: 0, mode: 'free' });
    approx(o.sub, 0.12); approx(o.fraction, 0.6); approx(o.U, o.W); approx(o.W, 11.772);
  },
  '9702/22 F/M 24 Q2(c)(ii): diver 7.5×10⁻² m³ in water: upthrust ≈ 740 N': () => {
    // 1000 × 9.81 × 0.075 = 735.75 N ("show that 740 N")
    const o = S.submerged({ rhoF: 1000, rhoO: 1040, V: 0.075, H: 0.5, d: 1, g, p0: 0, mode: 'held' });
    approx(o.U, 735.75); approx(o.mass, 78);                                                // 1040 × 0.075 = 78 kg
  },
  'sinking object rests on the bottom: reaction = W − U': () => {
    const o = S.submerged({ rhoF: 1000, rhoO: 7800, V: 1e-4, H: 0.05, d: 2, g, p0: 0, mode: 'free' });
    check(o.state === 'sinks'); approx(o.apparent, (7800 - 1000) * 1e-4 * g);              // 6.6708 N
    // shallow liquid D = 0.03 m < H = 0.05 m: A = 2×10⁻³ m², covered height 0.03 m ⇒ U = 1000 × 9.81 × 2×10⁻³ × 0.03 = 0.5886 N
    const s2 = S.submerged({ rhoF: 1000, rhoO: 7800, V: 1e-4, H: 0.05, d: 0, D: 0.03, g, p0: 0, mode: 'free' });
    approx(s2.U, 0.5886); approx(s2.Uarch, 0.5886); approx(s2.pTop, 0, 1e-12);
  },

  /* ---------------- topic 5: work, energy, power ---------------- */
  'work done = F s cos φ': () => { approx(E.work(50, 4, 60), 100); approx(E.work(50, 4, 90), 0, 1e-12); approx(E.work(50, 4, 0), 200); },
  'slide 5 m down a 30° slope from rest with 3.0 N resistance: v = 5.835 m/s': () => {
    // Δh = −5 sin 30° = −2.5 m; ½mv² = mg(2.5) − 3×5 = 2×9.81×2.5 − 15 = 49.05 − 15 = 34.05 J ⇒ v = √34.05 = 5.83524
    const r = E.slope({ m: 2, g, theta: 30, s: 5, u: 0, dir: 'down', Fr: 3, Fd: 0 });
    approx(r.dGPE, -49.05); approx(r.Wr, 15); approx(r.KE1, 34.05); approx(r.v, 5.83524);
    approx(r.a, 3.405); approx(r.stateAt(r.tEnd).v, 5.83524, 1e-6);                         // a = (9.81 − 3)/2
  },
  'projected up a slope: stops before covering s': () => {
    // a = −(2 + 1×9.81×0.5)/1 = −6.905; d_stop = 10²/(2×6.905) = 7.24113 m < 20 m
    const r = E.slope({ m: 1, g, theta: 30, s: 20, u: 10, dir: 'up', Fr: 2, Fd: 0 });
    check(r.stops, 'stops'); approx(r.dEnd, 7.24113); approx(r.KE1, 0, 1e-9); approx(r.v, 0, 1e-6);
    // energy check: ½×1×10² = 50 = mgΔh + F_r d = 9.81 × 3.620565 + 2 × 7.24113
    approx(r.dGPE + r.Wr, 50, 1e-9);
  },
  'free fall 10 m: v = √(2gh) = 14.0071 m/s': () => approx(E.slope({ m: 0.5, g, theta: 90, s: 10, u: 0, dir: 'down', Fr: 0, Fd: 0 }).v, 14.0071),
  'no motion when nothing overcomes the resistance from rest': () => check(E.slope({ m: 1, g, theta: 0, s: 5, u: 0, dir: 'up', Fr: 2, Fd: 1 }).noStart),
  'motor lifting 50 kg at 0.40 m/s with 400 W input: η = 0.4905': () => {
    // P_out = mgv = 50 × 9.81 × 0.40 = 196.2 W; η = 196.2/400 = 0.4905; t = 10/0.4 = 25 s; E_in = 400 × 25 = 10 000 J; mgh = 4905 J
    const r = E.motor({ m: 50, g, v: 0.4, h: 10, Pin: 400 });
    approx(r.Pout, 196.2); approx(r.eta, 0.4905); approx(r.t, 25); approx(r.Ein, 10000); approx(r.Euseful, 4905); approx(r.Ewasted, 5095);
    check(E.motor({ m: 50, g, v: 1, h: 10, Pin: 400 }).impossible, 'η > 1 flagged');
  },
  'P = Fv: car 1200 kg, 30 kW, 600 N resistance': () => {
    // at 20 m/s: F = 30000/20 = 1500 N, a = (1500 − 600)/1200 = 0.75; level v_max = 30000/600 = 50 m/s
    const r = E.vehicle({ m: 1200, g, theta: 0, Fr: 600, P: 30000, v: 20 });
    approx(r.Fdrive, 1500); approx(r.a, 0.75); approx(r.vmax, 50); approx(r.Pconst, 12000);
    // 5° hill: resistance = 600 + 1200 × 9.81 × sin 5° = 600 + 1026.00 = 1626.00 N ⇒ v_max = 18.4502 m/s
    approx(E.vehicle({ m: 1200, g, theta: 5, Fr: 600, P: 30000, v: 20 }).vmax, 18.4502, 1e-5);
  },
  'P = W/t and efficiency': () => { approx(E.power(4500, 9), 500); approx(E.efficiency(30, 120), 0.25); },

  /* ---------------- topic 6: deformation ---------------- */
  'PLAN D: k = 50 N/m, F = 4 N: x = 0.08 m, EPE = 0.16 J': () => {
    approx(M.hookeX(4, 50), 0.08); approx(M.epe(4, 0.08), 0.16); approx(M.epeK(50, 0.08), 0.16);  // ½ × 4 × 0.08
    const r = M.loadUnload({ k: 50, FP: 10, FE: 10, r: 0.3 }, 4); approx(r.epe, 0.16); approx(r.work, 0.16); check(!r.plastic);
  },
  'PLAN D: wire L = 2 m, d = 0.5 mm, F = 50 N, x = 2.5 mm: E = 2.03718×10¹¹ Pa': () => {
    // A = π(0.25×10⁻³)² = 1.96350×10⁻⁷ m²; σ = 50/A = 2.54648×10⁸ Pa; ε = 2.5×10⁻³/2 = 1.25×10⁻³; E = σ/ε
    const r = M.wire(2, 0.5e-3, 50, 2.5e-3);
    approx(r.A, 1.96350e-7); approx(r.stress, 2.54648e8); approx(r.strain, 1.25e-3); approx(r.E, 2.03718e11);
    approx(M.wireX(2, 0.5e-3, 50, 2.0e11), 2.54648e-3);                                     // 100/(1.9635e-7 × 2e11)
  },
  'beyond the elastic limit: permanent extension and work done (area)': () => {
    // k = 100, F_P = 10 (x_P = 0.1), r = 0.25 ⇒ gradient 25 N/m; load 15 N: x = 0.1 + 5/25 = 0.3 m
    // area = ½×10×0.1 + ½×(10 + 15)×0.2 = 0.5 + 2.5 = 3.0 J; unload with gradient 100 ⇒ x_perm = 0.3 − 0.15 = 0.15 m
    // energy released on unloading = ½ × 15 × 0.15 = 1.125 J
    const r = M.loadUnload({ k: 100, FP: 10, FE: 12, r: 0.25 }, 15);
    approx(r.x, 0.3); approx(r.work, 3.0); check(r.plastic); approx(r.xPerm, 0.15); approx(r.recovered, 1.125); check(isNaN(r.epe));
    const e = M.loadUnload({ k: 100, FP: 10, FE: 12, r: 0.25 }, 11);                          // between LoP and elastic limit
    check(!e.plastic && !e.withinLoP, 'elastic but beyond LoP'); approx(e.x, 0.14); approx(e.xPerm, 0, 1e-12);
  },
  'Young modulus percentage uncertainty: d counts twice': () => {
    // 1% + 0.1% + 2 × 2% + 4% = 9.1%
    approx(M.youngUncertainty(50, 0.5, 2, 0.002, 0.5e-3, 0.01e-3, 2.5e-3, 0.1e-3).pE, 9.1);
  },

  /* ---------------- topic 7: waves ---------------- */
  'PLAN D: f = 50 Hz, λ = 0.4 m: v = 20 m/s': () => { approx(W.speed(50, 0.4), 20); approx(W.period(50), 0.02); },
  'displacement formula y = A sin 2π(ft − x/λ)': () => { approx(W.y(2, 4, 1, 1, 0), -2); approx(W.y(2, 4, 1, 0, 0.25), 2); },
  'phase difference 360°Δx/λ': () => {
    const a = W.phaseDiff(0.3, 0.4); approx(a.deg, 270); approx(a.min, 90);                  // 360 × 0.3/0.4
    const b = W.phaseDiff(0.2, 0.4); approx(b.deg, 180); check(b.anti, 'antiphase');
    const c = W.phaseDiff(0.8, 0.4); approx(c.mod, 0, 1e-9); check(c.inPhase, 'in phase');
    approx(W.phaseFromTime(0.5e-3, 2e-3), 90);                                               // Δt = T/4
  },
  'longitudinal: compressions where displacement is zero with negative gradient': () => {
    const c = W.compressions(1, 1, 0, -0.01, 3.01);                                         // λ = 1, t = 0 ⇒ C at x = 0,1,2,3; R at 0.5, 1.5, 2.5
    check(c.C.length === 4 && Math.abs(c.C[1] - 1) < 1e-12, 'C at integers'); check(c.R.length === 3 && Math.abs(c.R[0] - 0.5) < 1e-12, 'R at halves');
    // check against the displacement: just left of a compression particles move right (+), just right they move left (−)
    check(W.y(1, 1, 1, 1 - 0.05, 0) > 0 && W.y(1, 1, 1, 1 + 0.05, 0) < 0, 'particles converge on C');
  },
  'intensity = P/area and I ∝ A²': () => {
    approx(W.intensity(0.5, 4 * Math.PI * 4), 0.00994718);                                 // 0.5 / (4π × 2²)
    approx(W.intensityScale(4, 1, 2), 16); approx(W.intensityScale(9, 3, 1), 1);
  },
  'CRO: 5000 Hz on 0.05 ms/div ⇒ 4 div per cycle; 3.0 V peak on 1 V/div ⇒ 3 div': () => {
    const r = W.cro({ f: 5000, V0: 3, tb: 0.05e-3, yg: 1 });
    approx(r.divPerCycle, 4); approx(r.ampDiv, 3); approx(r.fRead, 5000); approx(r.cycles, 2.5); check(!r.clipped);
    check(W.cro({ f: 5000, V0: 5, tb: 0.05e-3, yg: 1 }).clipped, '5 div amplitude is off an 8-div screen');
  },
  'PLAN D: Doppler f_s 500, v 340, v_s 20: 531.25 approaching, 472.222 receding': () => {
    approx(W.doppler(500, 340, 20, true), 531.25); approx(W.doppler(500, 340, 20, false), 472.222);   // 500×340/320, 500×340/360
    approx(W.dopplerWavelength(500, 340, 20, true), 0.64); approx(W.dopplerWavelength(500, 340, 20, false), 0.72);
  },
  '9702 MCQ: siren 440 Hz heard as 494 Hz, v = 340: 37 m/s towards the observer': () => {
    // v_s = v(1 − f_s/f_o) = 340 × (1 − 440/494) = 340 × 54/494 = 37.166 m/s, approaching
    const r = W.dopplerSourceSpeed(440, 494, 340); approx(r.vs, 37.1660); check(r.approaching === true);
    const r2 = W.dopplerSourceSpeed(500, 472.2222222, 340); approx(r2.vs, 20, 1e-6); check(r2.approaching === false);
  },
  'Doppler: observer on the line hears a step from high to low as the source passes': () => {
    const p = { fs: 500, v: 340, vs: 20, x0: -100 };                                         // passes x = 0 at t = 5 s
    approx(W.observedAt(p, 0, 4.9), 531.25); approx(W.observedAt(p, 0, 5.1), 472.222);
    const fronts = W.wavefronts(p, 1, 340); check(fronts.length > 0 && fronts.every(f => f.r <= 340), 'fronts');
    approx(fronts[0].r, 0, 1e-9);                                                            // crest emitted at t = 1 s exactly
  },
  'EM spectrum regions and c = 3.00×10⁸': () => {
    check(W.emRegions(5e-7).join() === 'visible'); check(W.emRegions(1e-12).length === 2, 'X/γ overlap');
    check(W.emRegions(0.03)[0] === 'microwaves'); approx(W.freq(5e-7), 6e14);
  },
  'PLAN D: Malus I₀ = 8 at 60° ⇒ 2; 8 then 30°, 30° ⇒ 4.5': () => {
    approx(W.malus(8, 60), 2);                                                               // 8 cos² 60° = 8 × 0.25
    approx(W.malusChain(8, 0, [30, 60]).I, 4.5);                                             // 8 × 0.75 × 0.75
    approx(W.malusChain(8, 0, [90]).I, 0, 1e-12);
  },
  '9702/22 M/J 23 Q5(c): 8.5 W m⁻² through 35° then α: α = 52°': () => {
    // 8.5 cos² 35° = 5.7036 W m⁻² (MS 5.7); 5.2 = 5.7036 cos²(α − 35°) ⇒ α − 35° = 17.28° ⇒ α = 52.3° (MS 52°)
    const first = W.malusChain(8.5, 0, [35]).I; approx(first, 5.70359, 1e-5);
    const rel = W.malusAngle(first, 5.2); approx(rel, 17.28, 2e-3); check(Math.round(35 + rel) === 52, 'α ≈ 52°');
    check(isNaN(W.malusAngle(5, 6)), 'cannot gain intensity');
  }
};
