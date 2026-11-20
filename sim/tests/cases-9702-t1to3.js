/* 9702 AS topics 1–3 (2025–27): p1-units, p1-uncertainty, p1-vectors, p2-motion-graphs, p2-freefall-exp,
   p3-momentum, p3-momentum-2d, p3-drag. g = 9.81 m s^-2. Working shown in comments. */
const M = require('../engine/phys-measure.js');
const MO = require('../engine/phys-motion.js');
const D = require('../engine/phys-dynamics.js');
const g = 9.81;
const eqv = (a, b) => check(M.equal(a, b), 'units ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b));

module.exports = {
  /* ---------- PLAN section D rows ---------- */
  'p1-units: J = kg m^2 s^-2': () => { eqv(M.Q.energy.unit, [1, 2, -2, 0, 0]); check(M.format(M.Q.energy.unit) === 'kg m<sup>2</sup> s<sup>−2</sup>'); },
  'p1-units: v^2 = u^2 + 2as homogeneous': () => {
    const r = M.homogeneity([{ f: { v: 2 } }, { f: { u: 2 } }, { f: { a: 1, s: 1 } }]);
    check(r.homogeneous); eqv(r.units[2], [0, 2, -2, 0, 0]);
  },
  'p1-uncertainty: V 5.0±0.1, I 0.50±0.02 → R = 10.0 ± 0.6 (6%)': () => {
    // R = V/I = 10; %R = 0.1/5 + 0.02/0.5 = 2% + 4% = 6%; ΔR = 0.6
    const r = M.uncProduct(1, [{ x: 5, dx: 0.1, n: 1 }, { x: 0.5, dx: 0.02, n: -1 }]);
    approx(r.Q, 10); approx(r.pct, 6); approx(r.dQ, 0.6);
    const s = M.roundWithUnc(r.Q, r.dQ); check(s.value === '10.0' && s.unc === '0.6', s.value + ' ± ' + s.unc);
  },
  'p2-motion-graphs: drop 1.25 m → 4.95227 m/s at 0.504819 s': () => {
    // t = √(2h/g) = √(2.5/9.81) = 0.504819; v = √(2gh) = √24.525 = 4.95227
    const b = MO.bounce(1.25, 0, 0.6, g);
    approx(b.impacts[0].t, 0.504819); approx(-b.impacts[0].vIn, 4.95227);
  },
  'p3-momentum: 2 kg at 3 elastic on 1 kg at rest → v1 = 1, v2 = 4, KE 9 → 9': () => {
    const r = D.collide1D({ m1: 2, m2: 1, u1: 3, u2: 0, mode: 'elastic' });
    approx(r.v1, 1); approx(r.v2, 4); approx(r.KE0, 9); approx(r.KE1, 9); approx(r.separation, r.approach);
  },
  'p3-momentum: 0.15 kg, 20 → −15 in 0.05 s → |F| = 105 N': () => {
    // Δp = 0.15(−15 − 20) = −5.25 N s; F = −5.25/0.05 = −105 N
    approx(D.forceFromMomentum(0.15 * (-15 - 20), 0.05), -105);
  },
  'p3-momentum-2d: 2 kg at 5 hits 3 kg at rest; 2 kg leaves 3 @60° → 3 kg 2.90593 @ −36.587°': () => {
    // P = (10, 0); p1' = 2·3(cos60, sin60) = (3, 5.19615); p2' = (7, −5.19615); |v2| = √(49+27)/3 = 2.90593; angle = −atan(5.19615/7) = −36.587°
    const r = D.collide2D({ mode: 'one', m1: 2, m2: 3, u1: [5, 0], u2: [0, 0], v1: D.polar(3, 60) });
    const ma = D.magAng(r.v2); approx(ma.mag, 2.90593); approx(ma.ang, -36.587);
  },
  'p3-drag: m 0.1, k 0.002 (kv^2) → v_t = 22.1472 (illustrative model)': () => {
    // v_t = √(mg/k) = √(0.981/0.002) = √490.5 = 22.1472
    approx(D.terminal(0.1, g, 0, 0.002, 2), 22.1472);
  },

  /* ---------- extra hand-verified: topic 1 ---------- */
  'units: D = 6πrηv → η in kg m^-1 s^-1 (9702/21 O/N 25 Q1, 9702/22 O/N 24 Q1)': () => {
    // η = D/(r v): kg m s^-2 / (m · m s^-1) = kg m^-1 s^-1
    eqv(M.solveConstant([{ f: { D: 1 } }, { f: { r: 1, eta: 1, v: 1 } }], 1, 'eta', { eta: [0, 0, 0, 0, 0] }), [1, -1, -1, 0, 0]);
  },
  'units: F = ½CρAv^2 → C has no unit (9702/21 M/J 24 Q1)': () => {
    // [ρAv²] = kg m^-3 · m² · m² s^-2 = kg m s^-2 = [F]
    check(M.isDimensionless(M.solveConstant([{ f: { F: 1 } }, { f: { C: 1, rho: 1, A: 1, v: 2 } }], 1, 'C', { C: [0, 0, 0, 0, 0] })));
  },
  'units: F = kv^2 → k in kg m^-1': () => eqv(M.solveConstant([{ f: { F: 1 } }, { f: { K: 1, v: 2 } }], 1, 'K', { K: [0, 0, 0, 0, 0] }), [1, -1, 0, 0, 0]),
  'units: R = ρL/A → resistivity kg m^3 s^-3 A^-2': () => {
    // ρ = RA/L: (kg m² s^-3 A^-2)(m²)/m = kg m³ s^-3 A^-2
    eqv(M.solveConstant([{ f: { R: 1 } }, { f: { rho: 1, L: 1, A: -1 } }], 1, 'rho', { rho: [0, 0, 0, 0, 0] }), M.Q.resistivity.unit);
  },
  'units: T = 2π(L/g)^n → n = 1/2 (9702/12 M/J 25 Q4)': () => {
    // [L/g] = m / (m s^-2) = s²; [T] = s = (s²)^n ⇒ n = ½
    const r = M.solveExponent(M.Q.time.unit, M.div(M.Q.length.unit, M.Q.acceleration.unit)); check(r.ok); approx(r.n, 0.5);
  },
  'units: s = ut + at is not homogeneous': () => check(!M.homogeneity([{ f: { s: 1 } }, { f: { u: 1, t: 1 } }, { f: { a: 1, t: 1 } }]).homogeneous),
  'units: power kg m^2 s^-3, pressure kg m^-1 s^-2': () => { eqv(M.Q.power.unit, [1, 2, -3, 0, 0]); eqv(M.Q.pressure.unit, [1, -1, -2, 0, 0]); },
  'prefix: 0.25 kN mm^-2 = 2.5 × 10^8 N m^-2 (9702/12 M/J 25 Q2)': () => {
    // 0.25 × 10^3 N per (10^-3 m)^2 = 0.25 × 10^3 × 10^6 = 2.5 × 10^8
    const k = M.convertPrefix(0.25, 'k', '', 1).value; const r = M.convertPrefix(k, 'm', '', -2); approx(r.value, 2.5e8);
  },
  'prefix: 3.2 cm^3 = 3.2 × 10^-6 m^3; 450 nm = 4.5 × 10^-7 m': () => {
    approx(M.convertPrefix(3.2, 'c', '', 3).value, 3.2e-6); approx(M.convertPrefix(450, 'n', '', 1).value, 4.5e-7);
  },
  'estimates: 70 kg adult good; 7 kg order; 0.7 kg off': () => {
    const e = M.ESTIMATES[0]; check(M.judgeEstimate(e, 70) === 'good'); check(M.judgeEstimate(e, 7) === 'order'); check(M.judgeEstimate(e, 0.7) === 'off');
  },
  'uncertainty: steel cube 975±10 g, 5.0±0.1 cm → 7.8 g cm^-3 ± 7.0% (9702/12 M/J 25 Q3)': () => {
    // ρ = 975/125 = 7.8; % = 10/975 + 3(0.1/5) = 1.026% + 6% = 7.03%
    const r = M.uncProduct(1, [{ x: 975, dx: 10, n: 1 }, { x: 5, dx: 0.1, n: -3 }]); approx(r.Q, 7.8); approx(r.pct, 7.02564);
  },
  'uncertainty: a = v^2/(2s), v 2.75 ±0.8%, s 3.89 ±0.5% → 0.97 ± 0.02 (9702/22 F/M 23 Q1)': () => {
    // a = 7.5625/7.78 = 0.972044; % = 2(0.8) + 0.5 = 2.1%; Δa = 0.0204
    const r = M.uncProduct(0.5, [{ x: 2.75, dx: 0.022, n: 2 }, { x: 3.89, dx: 0.01945, n: -1 }]);
    approx(r.Q, 0.972044); approx(r.pct, 2.1); const s = M.roundWithUnc(r.Q, r.dQ); check(s.value === '0.97' && s.unc === '0.02', s.value + '±' + s.unc);
  },
  'uncertainty: cube A 31.3±0.5 g, 1.53±0.01 cm → 8.74 g cm^-3, 3.56% (9702/22 F/M 25 Q1)': () => {
    // ρ = 31.3/1.53³ = 31.3/3.581577 = 8.73917; % = 0.5/31.3 + 3(0.01/1.53) = 1.5974% + 1.9608% = 3.5582%
    const r = M.uncProduct(1, [{ x: 31.3, dx: 0.5, n: 1 }, { x: 1.53, dx: 0.01, n: -3 }]); approx(r.Q, 8.73917); approx(r.pct, 3.5582);
  },
  'uncertainty: difference 45.0±0.5 − 20.0±0.5 = 25.0 ± 1.0 (4%)': () => {
    const r = M.uncSum([{ x: 45, dx: 0.5, s: 1 }, { x: 20, dx: 0.5, s: -1 }]); approx(r.Q, 25); approx(r.dQ, 1); approx(r.pct, 4);
  },
  'uncertainty: rounding 0.96 → ±1 and value to units': () => { const s = M.roundWithUnc(12.34, 0.96); check(s.value === '12' && s.unc === '1', s.value + '±' + s.unc); },
  'uncertainty: readings with zero error shift the mean by the zero error (σ = 0)': () => {
    const r = M.readings({ trueValue: 2.5, zero: 0.03, bias: 0, sigma: 0, n: 5, seed: 3 }); approx(r.mean, 2.53); approx(r.halfRange, 0, 1, 'half range');
  },

  /* ---------- extra: vectors (1.4) — pure components ---------- */
  'vectors: boat 4.0 across + river 3.0 → 5.0 at 53.1° to bank': () => {
    const r = D.add(D.polar(4, 90), D.polar(3, 0)), ma = D.magAng(r); approx(ma.mag, 5); approx(ma.ang, 53.1301);
  },
  'vectors: plane 200 north, wind 50 towards east → 206.155 at 75.964°': () => {
    const ma = D.magAng(D.add(D.polar(200, 90), D.polar(50, 0))); approx(ma.mag, 206.155); approx(ma.ang, 75.9638);
  },
  'vectors: Δv = v2 − v1 for 10 east → 10 north is 14.1421 at 135°': () => {
    const ma = D.magAng(D.add(D.polar(10, 90), D.scale(D.polar(10, 0), -1))); approx(ma.mag, 14.1421); approx(ma.ang, 135);
  },

  /* ---------- extra: kinematics ---------- */
  'journey: 0→20 in 10 s, 30 s constant, 20 s to rest → 900 m': () => {
    // areas: ½·10·20 + 30·20 + ½·20·20 = 100 + 600 + 200 = 900
    const J = MO.journey(0, [{ type: 'v', t: 10, v: 20 }, { type: 'c', t: 30 }, { type: 'v', t: 20, v: 0 }], g);
    approx(J.totals.disp, 900); approx(J.totals.dist, 900); approx(J.T, 60); approx(J.totals.avgSpeed, 15);
  },
  'journey: thrown up at 15 m/s for 3 s → displacement 0.855 m, distance 22.0826 m': () => {
    // s = 15·3 − ½·9.81·9 = 45 − 44.145 = 0.855; apex at 15/9.81 = 1.529052 s, height 11.46789 m;
    // distance = 11.46789 + (11.46789 − 0.855) = 22.08078
    const J = MO.journey(15, [{ type: 'fall', t: 3 }], g);
    approx(J.totals.disp, 0.855); approx(J.totals.dist, 22.08078); approx(J.stateAt(3).v, 15 - 29.43);
  },
  'journey: (d, v) stage — 100 m from 10 to 30 m/s → t = 5 s, a = 4': () => {
    // t = 2d/(u+v) = 200/40 = 5; a = (900 − 100)/200 = 4
    const J = MO.journey(10, [{ type: 'd', d: 100, v: 30 }], g); approx(J.T, 5); approx(J.segs[0].a, 4);
  },
  'journey: invalid (d, v) when u + v = 0': () => check(!!MO.journey(5, [{ type: 'd', d: 10, v: -5 }], g).invalid),
  'journey: 9702/12 M/J 25 Q7 — 1 kg at 60 m/s down, 50 N up for 2 s → speed 20 m/s': () => {
    // up +: u = −60, a = (50 − 9.81)/1 = 40.19; v = −60 + 80.38 = 20.38 (upward), speed ≈ 20
    const J = MO.journey(-60, [{ type: 'a', t: 2, a: 40.19 }], g); approx(J.stateAt(2).v, 20.38);
  },
  'bounce: drop 1.25 m, k = 0.6 → rebound 2.97136 m/s, second impact at 1.110620 s, apex 0.45 m': () => {
    // vOut = 0.6 × 4.95227 = 2.971362; flight 2·2.971362/9.81 = 0.605782; t2 = 0.504819 + 0.605782 = 1.110601
    // apex = 0.36 × 1.25 = 0.45 m
    const b = MO.bounce(1.25, 0, 0.6, g);
    approx(b.impacts[0].vOut, 2.971362); approx(b.impacts[1].t, 1.110601); approx(b.stateAt(0.504819 + 2.971362 / g).y, 0.45);
    check(b.stateAt(0.6).v > 0 && b.stateAt(0.4).v < 0, 'velocity reverses at bounce');
  },
  'bounce: k = 0 stops at first impact': () => { const b = MO.bounce(2, 0, 0, g); check(b.impacts.length === 1); approx(b.stateAt(5).y, 0); },
  'freefall: no errors → h–t² gradient g/2 exactly, intercept 0': () => {
    const r = MO.freefallExp({ method: 'trapdoor', hs: [0.2, 0.5, 0.8, 1.1, 1.4], g, delay: 0, hErr: 0, sigma: 0, repeats: 1, seed: 1 });
    approx(r.fitH.m, g / 2); approx(r.fitH.c, 0, 1e-6); approx(r.gFromH, g); approx(r.gFromT, g);
  },
  'freefall: h measured 0.02 m too large → intercept 0.02 m, gradient still g/2': () => {
    // h_rec = ½ g t² + 0.02 is exactly linear in t²
    const r = MO.freefallExp({ method: 'trapdoor', hs: [0.3, 0.6, 0.9, 1.2], g, delay: 0, hErr: 0.02, sigma: 0, repeats: 1, seed: 1 });
    approx(r.fitH.c, 0.02); approx(r.gFromH, g);
  },
  'freefall: timer delay 0.02 s → t–√h intercept 0.02 s, gradient √(2/g)': () => {
    // t = √(2/g)·√h + δ exactly linear in √h
    const r = MO.freefallExp({ method: 'trapdoor', hs: [0.3, 0.6, 0.9, 1.2], g, delay: 0.02, hErr: 0, sigma: 0, repeats: 1, seed: 1 });
    approx(r.fitT.c, 0.02); approx(r.fitT.m, Math.sqrt(2 / g)); approx(r.gFromT, g);
  },
  'freefall light gate: card 0.05 m from 0.5 m → Δt = 0.0155835 s': () => {
    // Δt = √(2·0.55/9.81) − √(2·0.5/9.81) = √0.1121305 − √0.1019368 = 0.3348589 − 0.3192754 = 0.0155835
    const r = MO.freefallExp({ method: 'lightgate', hs: [0.5], g, sigma: 0, repeats: 1, L: 0.05, seed: 1 });
    approx(r.rows[0].t, Math.sqrt(1.1 / g) - Math.sqrt(1 / g)); approx(r.rows[0].t, 0.0155835, 1e-4);
  },

  /* ---------- extra: dynamics ---------- */
  'momentum: 9702/23 O/N 24 Q2 — 0.24 kg at 16 hits 0.48 kg at rest, X stops → 8.0, ΔKE −15.36 J, F 1920 N': () => {
    // v_Y = 0.24·16/0.48 = 8; KE 30.72 → 15.36 J; F on X = 0.24(0 − 16)/0.002 = −1920 N (ms: 1900 N to the left)
    const r = D.collide1D({ m1: 0.24, m2: 0.48, u1: 16, u2: 0, mode: 'given', v1: 0 });
    approx(r.v2, 8); approx(r.dKE, -15.36); approx(D.forceFromMomentum(r.dp1, 0.002), -1920); approx(D.forceFromMomentum(r.dp2, 0.002), 1920);
  },
  'momentum: 9702/22 F/M 26 Q2 — sack 23 kg at 3.4 sticks to 160 kg boat → 0.427322, E2/E1 = 0.125683': () => {
    // v = 78.2/183 = 0.427322; E2/E1 = m1/(m1 + m2) = 23/183 = 0.125683 (ms 0.43, 0.13)
    const r = D.collide1D({ m1: 23, m2: 160, u1: 3.4, u2: 0, mode: 'stick' }); approx(r.v1, 0.427322); approx(r.KE1 / r.KE0, 0.125683);
  },
  'momentum: 9702/21 O/N 23 Q3 — trolleys 0.25 at 0.48, 0.75 at 0.12, elastic → A −0.06, B 0.30': () => {
    // v1 = ((0.25−0.75)0.48 + 2·0.75·0.12)/1 = −0.24 + 0.18 = −0.06; v2 = (0.5·0.12 + 2·0.25·0.48)/1 = 0.06 + 0.24 = 0.30
    const r = D.collide1D({ m1: 0.25, m2: 0.75, u1: 0.48, u2: 0.12, mode: 'elastic' }); approx(r.v1, -0.06); approx(r.v2, 0.30);
    approx(D.forceFromMomentum(r.dp2, 0.2) / 0.75, 0.9);   // acceleration of B over 0.20 s contact (ms 0.90)
  },
  'momentum: no collision when u1 ≤ u2; given v1 that passes through is flagged': () => {
    check(D.collide1D({ m1: 1, m2: 1, u1: 1, u2: 2, mode: 'elastic' }).noCollision);
    check(D.collide1D({ m1: 1, m2: 1, u1: 4, u2: 0, mode: 'given', v1: 3 }).flag === 'pass');
  },
  'momentum: force profile areas equal Δp (triangle peak = 2 × average)': () => {
    approx(D.cumulative('tri', 1), 1); approx(D.cumulative('tri', 0.5), 0.5); approx(D.profile('tri', 0.5), 2);
    const tr = D.contactTrack(4, -2, 1, 0.1, 'tri', 0); approx(tr.v(1.1), -2); approx(tr.x(1.1), 4 * 0.1 + (-6) * 0.1 * 0.5);
  },
  'momentum: rocket 90 kg/s at 190 m/s → 17100 N (9702/12 M/J 25 Q9)': () => approx(D.forceFromMomentum(90 * 190, 1), 17100),
  'momentum-2d: 9702/21 M/J 24 Q3 — 2m at 5 on 3m, both leave at 30° → v 2.88675, w 1.92450': () => {
    // y: 2v sin30 = 3w sin30 ⇒ v = 1.5w; x: 2v cos30 + 3w cos30 = 10 ⇒ 6w cos30 = 10 ⇒ w = 1.924501, v = 2.886751 (ms 2.9, 1.9)
    const r = D.collide2D({ mode: 'dirs', m1: 2, m2: 3, u1: [5, 0], u2: [0, 0], a1: 30, a2: -30 }); approx(r.s1, 2.886751); approx(r.s2, 1.924501);
  },
  'momentum-2d: 9702/23 M/J 23 Q3 — firework 3m at 4.0, 2m at 6.0 at 90° → m at 16.9706, 45°': () => {
    // p_C = −(12, 12)m ⇒ v = 12√2 = 16.9706 at 225° (45° to the line of A, reversed) (ms θ = 45°, v = 17)
    const r = D.collide2D({ mode: 'explode', m1: 3, m2: 2, m3: 1, uC: [0, 0], v1: [4, 0], v2: [0, 6] });
    const ma = D.magAng(r.v3); approx(ma.mag, 16.9706); approx(ma.ang, -135); approx(r.P1[0], 0, 1, 'Px'); approx(r.P1[1], 0, 1, 'Py');
  },
  'momentum-2d: equal masses, elastic oblique → 90° between final velocities, KE conserved': () => {
    // v1 = 4cos30 at 30°, v2 = (4 − 3, −√3) = 2 at −60°
    const r = D.collide2D({ mode: 'one', m1: 1, m2: 1, u1: [4, 0], u2: [0, 0], v1: D.polar(4 * Math.cos(Math.PI / 6), 30) });
    const ma = D.magAng(r.v2); approx(ma.mag, 2); approx(ma.ang, -60); approx(r.KE1, r.KE0);
  },
  'momentum-2d: parallel final directions → invalid': () => check(!!D.collide2D({ mode: 'dirs', m1: 1, m2: 1, u1: [1, 0], u2: [0, 0], a1: 0, a2: 180 }).invalid),
  'drag: 9702/22 M/J 24 Q2 — 68 kg skydiver, D 1800 N → a = −16.6606 (16.7 up)': () => {
    // a = (68·9.81 − 1800)/68 = (667.08 − 1800)/68 = −16.6606 (ms 17 m s^-2 upwards)
    approx(D.accelAt(68, g, 0, 1800), -16.66059);
  },
  'drag: 9702/22 O/N 23 Q2(c) — 4.0 kg sphere at a = 1.9 → resistive force 31.64 N': () => approx(D.dragFromAccel(4, g, 0, 1.9), 31.64),
  'drag: diver 78 kg, U 740 N, D 950 N → a = −11.8567 (upwards)': () => approx(D.accelAt(78, g, 740, 950), (765.18 - 1690) / 78),
  'drag: illustrative track approaches v_t; linear v_t = (mg − U)/k': () => {
    approx(D.terminal(2, g, 5, 0.5, 1), (19.62 - 5) / 0.5);
    const tr = D.fall({ m: 0.1, g, U: 0, k: 0.002, n: 2, v0: 0, T: 30, steps: 1500 }); approx(tr.stateAt(30).v, 22.1472, 1e-4);
    // early: a ≈ g
    approx(tr.stateAt(0).a, g);
    check(D.terminal(1, g, 20, 1, 2) === null, 'no terminal velocity when U ≥ mg');
  },
  'drag: parachute opens → v falls to new terminal from above': () => {
    const tr = D.fall({ m: 68, g, U: 0, k: 667.08 / 39 / 39, n: 2, v0: 0, open: { t: 30, k: 667.08 / 5.7 / 5.7 }, T: 60, steps: 3000 });
    approx(tr.stateAt(29.9).v, 39, 2e-3); approx(tr.stateAt(60).v, 5.7, 1e-3); check(tr.stateAt(30.2).a < 0, 'decelerates after opening');
  }
  ,
  /* ---------- smooth-disc 2-D collisions (p3-momentum-2d animation) ---------- */
  'discs: equal masses elastic glancing, α = 30° → speeds u cos α, u sin α at 90°': () => {
    // R = 1, b = 0.5 ⇒ sin α = 0.5, α = 30°; target leaves along n at u cos 30° = 3.46410; striker u sin 30° = 2 at −60°
    const r = D.discCollision({ m1: 1, m2: 1, r1: 0.5, r2: 0.5, u1: [4, 0], u2: [0, 0], b: 0.5, mode: 'elastic' });
    const a = D.magAng(r.v1), b = D.magAng(r.v2);
    approx(r.alpha, 30); approx(b.mag, 4 * Math.cos(Math.PI / 6)); approx(b.ang, 30); approx(a.mag, 2); approx(a.ang, -60);
    approx(D.angleBetween(r.v1, r.v2), 90); approx(r.KE1, r.KE0, 1e-12);
  },
  'discs: b = 0 elastic reduces to 1-D (2 kg at 3 on 1 kg at rest → 1, 4)': () => {
    const r = D.discCollision({ m1: 2, m2: 1, r1: 0.3, r2: 0.3, u1: [3, 0], u2: [0, 0], b: 0, mode: 'elastic' });
    approx(r.v1[0], 1); approx(r.v2[0], 4); approx(r.v1[1], 0, 1, 'v1y'); approx(r.separation, r.approach);
  },
  'discs: stick → V = (m1u1 + m2u2)/(m1 + m2) as a vector; KE lost': () => {
    // 0.2(3, 0) + 0.3(0, 2) = (0.6, 0.6) ⇒ V = (1.2, 1.2), |V| = 1.69706; KE 0.9 + 0.6 = 1.5 → ½·0.5·2.88 = 0.72 J
    const r = D.discCollision({ m1: 0.2, m2: 0.3, r1: 0.1, r2: 0.1, u1: [3, 0], u2: [0, 2], b: 0.05, mode: 'stick' });
    approx(r.v1[0], 1.2); approx(r.v1[1], 1.2); approx(r.v2[0], 1.2); approx(r.KE0, 1.5); approx(r.KE1, 0.72);
  },
  'discs: random elastic inputs conserve momentum and KE to 1e-9; centre of mass moves uniformly': () => {
    let seed = 12345; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 200; i++) {
      const m1 = 0.1 + 10 * rnd(), m2 = 0.1 + 10 * rnd(), r1 = 0.1 + rnd(), r2 = 0.1 + rnd();
      const u1 = [20 * rnd() - 10, 20 * rnd() - 10], u2 = [20 * rnd() - 10, 20 * rnd() - 10], b = 0.999 * (r1 + r2) * rnd();
      const r = D.discCollision({ m1, m2, r1, r2, u1, u2, b, mode: 'elastic' });
      const sc = Math.max(1, Math.hypot(r.P0[0], r.P0[1]));
      check(Math.abs(r.P1[0] - r.P0[0]) < 1e-9 * sc && Math.abs(r.P1[1] - r.P0[1]) < 1e-9 * sc, 'momentum');
      check(Math.abs(r.KE1 - r.KE0) < 1e-9 * Math.max(1, r.KE0), 'KE');
      check(r.approach > 0 && Math.abs(r.separation - r.approach) < 1e-9 * Math.max(1, r.approach), 'approach = separation along n');
      const tr = D.pairTrack(m1, m2, u1, u2, r.v1, r.v2, r.d, 1);
      [0, 0.5, 1, 1.7, 3].forEach(t => { const s = tr(t); approx(s.cm[0], r.cm[0] * (t - 1), 1e-9, 'cm x'); approx(s.cm[1], r.cm[1] * (t - 1), 1e-9, 'cm y'); });
      approx(Math.hypot(tr(1).x2[0] - tr(1).x1[0], tr(1).x2[1] - tr(1).x1[1]), r1 + r2, 1e-9, 'touching at tc');
    }
  },
  'discs: same velocity → no collision': () => check(!!D.discCollision({ m1: 1, m2: 1, r1: 1, r2: 1, u1: [2, 1], u2: [2, 1], b: 0, mode: 'elastic' }).noCollision)
};
