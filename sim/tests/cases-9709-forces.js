/* Tests for SIM.forces (S1 m1-resultant, S2 m1-strings). g = 10 unless stated.
   Directions: degrees anticlockwise from +x; string directions point from the particle to the fixed point. */
const F = require('../engine/mech-forces.js');
const f = (Fm, th, c) => ({ F: Fm, th: th, c: c === undefined ? null : c });
const r3 = Math.sqrt(3);

module.exports = {
  /* ------------------------------ S1: resultant ------------------------------ */
  'S1 resultant: 10@0, 20@90, 15@210 (PLAN D)': () => {
    // X = 10 + 15cos210 = 10 − 12.990381 = −2.990381 ; Y = 20 + 15sin210 = 20 − 7.5 = 12.5
    // R = √(8.942379 + 156.25) = 12.85272 ; dir = 180 − atan(12.5/2.990381) = 180 − 76.5456 = 103.4544°
    const r = F.resultant([f(10, 0), f(20, 90), f(15, 210)]);
    approx(r.X, -2.99038); approx(r.Y, 12.5); approx(r.R, 12.8527); approx(r.dir, 103.454);
    const d = F.dirInfo(r.dir); check(d.ref === '−x' && d.side === 'above', 'measured from −x'); approx(d.beta, 76.5456);
  },
  'S1 9709/41 M/J 24 Q2(b): 20 N @60°, F = 10 down → 12.4 N at 36.2°': () => {
    // MS: X = 20cos60 = 10, Y = 20sin60 − 10 = 7.3205, R = 12.393136, angle = 36.206023°
    const r = F.resultant([f(20, 60), f(10, 270)]);
    approx(r.X, 10, 1e-9); approx(r.Y, 7.320508); approx(r.R, 12.393136); approx(r.dir, 36.206023);
  },
  'S1 9709/41 M/J 24 Q2(a): no y-component ⇒ F = 20 sin 60 = 17.3205': () => {
    const s = F.solveConstraint([f(20, 60), f(0, 270)], 0, { kind: 'F', i: 1 }, 'y');
    check(s.status === 'ok', s.status); approx(s.value, 17.320508);
    const r = F.resultant(s.list); approx(r.Y, 0, 1e-9); approx(r.X, 10);
  },
  'S1 9709/41 M/J 26 Q1: four forces → 39.5 N at 12.7° above +x': () => {
    // From the diagram: 55 N at 30°, 16 N at 180°, 23 N at 345° (15° below +x), 20 N at 220° (40° below −x).
    // MS: X = 55sin60 + 23cos15 − 20cos40 − 16 = 38.5268 ; Y = 55cos60 − 23sin15 − 20sin40 = 8.69140
    //     R = 39.495…, direction 12.712… above the horizontal to the right.
    const r = F.resultant([f(55, 30), f(16, 180), f(23, 345), f(20, 220)]);
    approx(r.X, 38.5268); approx(r.Y, 8.69140); approx(r.R, 39.4950); approx(r.dir, 12.712, 1e-4);
  },
  'S1 equilibrium flagged when R ≈ 0; polygon closes': () => {
    const r = F.resultant([f(39, 0), f(52, 90), f(65, 180 + Math.atan2(52, 39) * 180 / Math.PI)]);
    check(r.equilibrium, 'should be in equilibrium'); check(r.R === 0, 'R reported as 0'); check(isNaN(r.dir), 'direction undefined');
    // closing property: sum of component vectors returns to the start
    const tip = r.comps.reduce((p, c) => [p[0] + c.x, p[1] + c.y], [0, 0]); approx(Math.hypot(tip[0], tip[1]), 0, 1e-9);
  },
  /* ------------------------------ S1: solving ------------------------------ */
  'S1 9709/41 O/N 24 Q3: 39 N @0°, 52 N @90°, solve P and θ → 65, 233.13° (θ = 53.1° in the paper)': () => {
    // Diagram: 39 N along +x, 52 N along +y, P down-left at θ below the −x direction.
    // P cos θ = 39, P sin θ = 52 ⇒ P = √(39² + 52²) = 65, θ = tan⁻¹(52/39) = 53.130° ⇒ direction 233.130°.
    // NOTE: PLAN.md lists this as "52 N @0°, 39 N @90° → 233.13°"; with that labelling the answer would be
    // 216.87° (= 180 + 36.87). The paper's diagram has 39 N horizontal, so 233.13° is correct for 39 @0°, 52 @90°.
    const s = F.solveEquilibrium([f(39, 0), f(52, 90), f(1, 0)], 0, [{ kind: 'F', i: 2 }, { kind: 'th', i: 2 }]);
    check(s.status === 'ok' && s.method === 'magdir', s.status);
    approx(s.solutions[0].vals[0], 65); approx(s.solutions[0].vals[1], 233.130102);
    approx(F.dirInfo(s.solutions[0].vals[1]).beta, 53.130102);
    const s2 = F.solveEquilibrium([f(52, 0), f(39, 90), f(1, 0)], 0, [{ kind: 'F', i: 2 }, { kind: 'th', i: 2 }]);
    approx(s2.solutions[0].vals[1], 216.869898);
  },
  'S1 9709/42 F/M 26 Q3: F @270°, 2F @210°, 20 N @θ ⇒ F = 7.55929, θ = 49.1066° (Newton)': () => {
    // x: 20cosθ + 2F cos210 = 0 ⇒ 20cosθ = √3 F ; y: 20 sinθ − F − 2F sin30 = 0 ⇒ 20 sinθ = 2F
    // tanθ = 2/√3 ⇒ θ = 49.10661° ; F = 20/√7 = 7.559289 (MS: θ = 49.1066…, F = 7.55928…)
    const list = [f(20, 0), f(0, 270, 1), f(0, 210, 2)];
    const s = F.solveEquilibrium(list, 1, [{ kind: 'k' }, { kind: 'th', i: 0 }]);
    check(s.status === 'ok' && s.method === 'newton', s.status + ' ' + s.method);
    check(s.solutions.length === 1, 'unique positive F, got ' + s.solutions.length);
    approx(s.solutions[0].vals[0], 20 / Math.sqrt(7)); approx(s.solutions[0].vals[1], Math.atan2(2, r3) * 180 / Math.PI);
    check(F.resultant(s.solutions[0].list, s.solutions[0].k).equilibrium, 'closes');
  },
  'S1 two magnitudes by Cramer: 30 N @270, P @30, Q @135': () => {
    // P cos30 + Q cos135 = 0 ; P sin30 + Q sin135 = 30 ; det = sin(135 − 30) = sin105 = 0.965926
    // P = 30·0.707107/0.965926 = 21.9615 ; Q = 30·0.866025/0.965926 = 26.8973
    const s = F.solveEquilibrium([f(30, 270), f(0, 30), f(0, 135)], 0, [{ kind: 'F', i: 1 }, { kind: 'F', i: 2 }]);
    check(s.status === 'ok' && s.method === 'cramer', s.status); approx(s.det, Math.sin(105 * Math.PI / 180));
    approx(s.solutions[0].vals[0], 21.9615); approx(s.solutions[0].vals[1], 26.8973);
  },
  'S1 Cramer negative magnitude is flagged': () => {
    // 20 N @45 balanced by P @0 and Q @90 ⇒ P = Q = −20cos45 = −14.1421 (forces would have to reverse)
    const s = F.solveEquilibrium([f(20, 45), f(0, 0), f(0, 90)], 0, [{ kind: 'F', i: 1 }, { kind: 'F', i: 2 }]);
    check(s.status === 'negative', s.status); approx(s.solutions[0].vals[0], -14.1421); check(s.solutions[0].negative[0] && s.solutions[0].negative[1]);
  },
  'S1 parallel unknowns (det = 0): none vs infinitely many': () => {
    const a = F.solveEquilibrium([f(10, 90), f(0, 0), f(0, 180)], 0, [{ kind: 'F', i: 1 }, { kind: 'F', i: 2 }]);
    check(a.status === 'parallel-none', a.status);
    const b = F.solveEquilibrium([f(10, 0), f(0, 0), f(0, 180)], 0, [{ kind: 'F', i: 1 }, { kind: 'F', i: 2 }]);
    check(b.status === 'parallel-many', b.status);
  },
  'S1 k and a magnitude by Cramer: 10 N @0, F @0, 2F @90, P @225': () => {
    // x: 10 + F + P cos225 = 0 ; y: 2F + P sin225 = 0 ⇒ F = P/√2·… : from y, P = 2√2 F ; x: 10 + F − 2F = 0 ⇒ F = 10, P = 28.2843
    const s = F.solveEquilibrium([f(10, 0), f(0, 0, 1), f(0, 90, 2), f(0, 225)], 1, [{ kind: 'k' }, { kind: 'F', i: 3 }]);
    check(s.status === 'ok', s.status); approx(s.solutions[0].vals[0], 10); approx(s.solutions[0].vals[1], 20 * Math.SQRT2);
  },
  'S1 two unknown angles: 10 N, 10 N balance 10 N down ⇒ (30°,150°) and (150°,30°)': () => {
    // 10(u1 + u2) = (0, 10) ⇒ u1 + u2 = (0, 1) ⇒ u1 = (√3/2, 1/2), u2 = (−√3/2, 1/2) or swapped
    const s = F.solveEquilibrium([f(10, 270), f(10, 0), f(10, 0)], 0, [{ kind: 'th', i: 1 }, { kind: 'th', i: 2 }]);
    check(s.status === 'ok' && s.solutions.length === 2, s.status + ' n=' + s.solutions.length);
    approx(s.solutions[0].vals[0], 30); approx(s.solutions[0].vals[1], 150);
    approx(s.solutions[1].vals[0], 150); approx(s.solutions[1].vals[1], 30);
  },
  'S1 no solution when the unknown-angle forces are too small': () => {
    const s = F.solveEquilibrium([f(50, 270), f(10, 0), f(10, 0)], 0, [{ kind: 'th', i: 1 }, { kind: 'th', i: 2 }]);
    check(s.status === 'none', s.status);
  },
  'S1 constraint impossible when the unknown force is horizontal and axis is y': () => {
    const s = F.solveConstraint([f(20, 60), f(0, 0)], 0, { kind: 'F', i: 1 }, 'y');
    check(s.status === 'impossible', s.status);
  },
  'S1 invalid unknowns are reported, not solved': () => {
    check(F.solveEquilibrium([f(1, 0), f(2, 90)], 0, [{ kind: 'F', i: 0 }, { kind: 'F', i: 0 }]).status === 'invalid');
    check(F.solveEquilibrium([f(1, 0), f(2, 90)], 0, [{ kind: 'k' }, { kind: 'F', i: 0 }]).status === 'invalid');
    check(F.solveEquilibrium([f(1, 0), f(2, 90)], 0, [{ kind: 'F', i: 4 }, { kind: 'F', i: 0 }]).status === 'invalid');
  },
  'S1 dirInfo quadrants': () => {
    check(F.dirInfo(90).ref === 'up' && F.dirInfo(270).ref === 'down');
    approx(F.dirInfo(300).beta, 60); check(F.dirInfo(300).side === 'below' && F.dirInfo(300).ref === '+x');
    approx(F.dirInfo(200).beta, 20); check(F.dirInfo(200).ref === '−x');
  },

  /* ------------------------------ S2: strings ------------------------------ */
  'S2 9709/43 M/J 22 Q4: AC 0.8, BC 0.6, right angle at C, m 10, F = 20 ⇒ 76, 68; greatest F = 133.33': () => {
    // cos A = 0.8 (AB = 1.0): T_A(−0.8, 0.6), T_B(0.6, 0.8), F(1, 0)
    // →: −0.8T_A + 0.6T_B + 20 = 0 ; ↑: 0.6T_A + 0.8T_B − 100 = 0 ⇒ T_A = 76, T_B = 68 (MS)
    // T_A = 60 + 0.8F, T_B = 80 − 0.6F ⇒ T_B = 0 at F = 400/3 = 133.33 (MS "allow 133")
    const geo = F.lengthsGeometry(0.8, 0.6, 1.0);
    check(geo.ok && !geo.degenerate); approx(geo.C, 90); approx(geo.cosA, 0.8);
    const s = { g: 10, m: 10, config: 'two', dir1: geo.dir1, dir2: geo.dir2, P: 20, phi: 0, unknowns: ['T1', 'T2'] };
    const r = F.solveParticle(s); check(r.status === 'ok', r.status);
    approx(r.values.T1, 76); approx(r.values.T2, 68); approx(r.residual, 0, 1e-9);
    const pr = F.pRange(s); approx(pr.lo, 0, 1e-9); approx(pr.hi, 400 / 3);
  },
  'S2 slack: same with F = 150 ⇒ T_BC = 80 − 90 = −10 < 0': () => {
    const geo = F.lengthsGeometry(0.8, 0.6, 1.0);
    const r = F.solveParticle({ g: 10, m: 10, config: 'two', dir1: geo.dir1, dir2: geo.dir2, P: 150, phi: 0, unknowns: ['T1', 'T2'] });
    check(r.status === 'slack' && r.slack[0] === 'T2', r.status); approx(r.values.T2, -10);
  },
  'S2 9709/42 M/J 25 Q3: string 2.6 m, depth 2.4 m, 35 N perpendicular ⇒ m = 9.1, T = 84': () => {
    // cos α = 2.4/2.6 = 12/13, sin α = 5/13 (α from vertical). Perpendicular: 35 = mg sin α ⇒ mg = 91, m = 9.1
    // Along string: T = mg cos α = 91·12/13 = 84 (MS)
    const geo = F.oneStringGeometry(2.6, 2.4); check(geo.ok); approx(geo.cosA, 12 / 13);
    const r = F.solveParticle({ g: 10, P: 35, config: 'one', dir1: geo.dir1, phi: geo.dir1 - 90, unknowns: ['T1', 'm'] });
    check(r.status === 'ok', r.status); approx(r.values.m, 9.1); approx(r.values.T1, 84);
  },
  'S2 ring (PLAN synthetic): AR 30°, BR 40° from vertical, 2 N horizontal ⇒ T = 1.75011, m = 0.017498': () => {
    // →: −T(sin30 + sin40) + 2 = 0 ⇒ T = 2/1.142788 = 1.75011
    // ↑: T(cos30 − cos40) = mg ⇒ m = 1.75011·0.099981/10 = 0.0174978
    const r = F.solveParticle({ g: 10, config: 'ring', dir1: F.orientDir(30, 'UL-v'), dir2: F.orientDir(40, 'DL-v'), P: 2, phi: 0, unknowns: ['T', 'm'] });
    check(r.status === 'ok', r.status); approx(r.values.T1, 1.75011); approx(r.values.m, 0.0174978); check(r.values.T2 === r.values.T1, 'equal tensions');
  },
  'S2 ring 9709/42 O/N 18 Q1: ARB = 90°, AR 45° to vertical, 2.5 N along BR ⇒ T = 1.25, m = √2/8': () => {
    // MS: 2T cos45 = 2.5 cos45 ⇒ T = 1.25 ; 2.5 sin45 = mg ⇒ m = 0.176777 (= √2/8)
    const d1 = F.orientDir(45, 'UL-v'), d2 = F.orientDir(45, 'DL-v');
    const r = F.solveParticle({ g: 10, config: 'ring', dir1: d1, dir2: d2, P: 2.5, phi: d2 + 180, unknowns: ['T', 'm'] });
    check(r.status === 'ok', r.status); approx(r.values.T1, 1.25); approx(r.values.m, Math.SQRT2 / 8);
  },
  'S2 ring 9709/43 M/J 23 Q3: AR 60° to vertical, BR horizontal, X ⟂ AR ⇒ T = 4 − 2√3, X = 2': () => {
    // →: −T cos30 − T + X cos60 = 0 ; ↑: T sin30 + X sin60 − 2 = 0 ⇒ X = 2, T = 0.535898 (MS: 0.536, X = 2)
    const d1 = F.orientDir(60, 'UL-v');   // 150°
    const r = F.solveParticle({ g: 10, m: 0.2, config: 'ring', dir1: d1, dir2: F.orientDir(0, 'UL-h'), phi: d1 - 90, unknowns: ['T', 'P'] });
    check(r.status === 'ok', r.status); approx(r.values.T1, 4 - 2 * r3); approx(r.values.P, 2);
  },
  'S2 9709/42 F/M 21 Q3: PQ 60° up to wall, QR 30° down to floor, 0.2 kg ⇒ 2√3, 2': () => {
    // MS: T_P cos60 = T_R cos30 ; T_P sin60 = T_R sin30 + 0.2g ⇒ T_P = 3.46, T_R = 2
    const r = F.solveParticle({ g: 10, m: 0.2, config: 'two', dir1: F.orientDir(60, 'UL-h'), dir2: F.orientDir(30, 'DR-h'), unknowns: ['T1', 'T2'] });
    check(r.status === 'ok', r.status); approx(r.values.T1, 2 * r3); approx(r.values.T2, 2);
  },
  'S2 9709/42 O/N 22 Q3: T = 4 at 60° to ceiling, 0.3 kg; wall string T and α ⇒ 2.05314, 76.9356°': () => {
    // MS: T sinα = 4cos60 = 2 ; T cosα = 4sin60 − 0.3g = 0.464102 ⇒ T = 2.05314, α = 76.9356° (α from the wall)
    const r = F.solveParticle({ g: 10, m: 0.3, T1: 4, config: 'two', dir1: F.orientDir(60, 'UL-h'), dir2: 0, unknowns: ['T2', 'dir2'] });
    check(r.status === 'ok', r.status); approx(r.values.T2, 2.05314);
    const a = F.alphaFromDir(r.values.dir2, 'DR-v'); check(a.ok, 'down-right quadrant'); approx(a.alpha, 76.9356);
  },
  'S2 9709/41 O/N 23 Q2: 2.4 kg, 35° and 40° to horizontal ⇒ 19.0336, 20.3532': () => {
    // T_A cos35 = T_B cos40 ; T_A sin35 + T_B sin40 = 24 ⇒ T_B(0.935166·0.573576 + 0.642788) = 24
    // ⇒ T_B = 20.3532, T_A = 19.0336 (MS: 19.033621 and 20.353166)
    const r = F.solveParticle({ g: 10, m: 2.4, config: 'two', dir1: F.orientDir(35, 'UL-h'), dir2: F.orientDir(40, 'UR-h'), unknowns: ['T1', 'T2'] });
    approx(r.values.T1, 19.033621); approx(r.values.T2, 20.353166);
  },
  'S2 9709/43 O/N 21 Q2: 8 kg, 60° and 45° above horizontal ⇒ 58.5641, 41.4110; Lami agrees': () => {
    // T1 cos60 = T2 cos45 ; T1 sin60 + T2 sin45 = 80 ⇒ T1 = 80/(sin60 + cos60) = 58.5641, T2 = 41.4110
    // Lami: 80/sin75 = 82.8221 = T1/sin135 = T2/sin150
    const r = F.solveParticle({ g: 10, m: 8, config: 'two', dir1: F.orientDir(60, 'UL-h'), dir2: F.orientDir(45, 'UR-h'), unknowns: ['T1', 'T2'] });
    approx(r.values.T1, 58.5641); approx(r.values.T2, 41.4110);
    const L = F.lami(r.forces); check(L && L.length === 3); L.forEach(x => approx(x.ratio, 80 / Math.sin(75 * Math.PI / 180)));
  },
  'S2 9709/43 M/J 24 Q2: string 30° to wall, X ⟂ string, 0.2 kg ⇒ T = √3, X = 1': () => {
    // MS: X cos30 = T sin30 ; X sin30 + T cos30 = 0.2g ⇒ X = 1, T = 1.73
    const d1 = F.orientDir(30, 'UL-v');
    const r = F.solveParticle({ g: 10, m: 0.2, config: 'one', dir1: d1, phi: d1 - 90, unknowns: ['T1', 'P'] });
    check(r.status === 'ok', r.status); approx(r.values.T1, r3); approx(r.values.P, 1);
    // resolving along the string: T − mg cos30 = 0 (X is perpendicular, contributes 0)
    const al = F.resolveAlong(r.forces, d1); approx(al.sum, 0, 1e-9);
    approx(al.terms.find(t => t.key === 'P').comp, 0, 1e-12);
  },
  'S2 9702 g = 9.81: 8 kg, 60° and 45° ⇒ T1 = 57.4514': () => {
    // T1 = 8·9.81/(sin60 + cos60) = 78.48/1.366025 = 57.4514
    const r = F.solveParticle({ g: 9.81, m: 8, config: 'two', dir1: 120, dir2: 45, unknowns: ['T1', 'T2'] });
    approx(r.values.T1, 57.4514);
  },
  'S2 parallel strings: two vertical strings, horizontal force ⇒ no equilibrium': () => {
    const a = F.solveParticle({ g: 10, m: 1, config: 'two', dir1: 90, dir2: 90, P: 5, phi: 0, unknowns: ['T1', 'T2'] });
    check(a.status === 'parallel-none', a.status);
    const b = F.solveParticle({ g: 10, m: 1, config: 'two', dir1: 90, dir2: 90, unknowns: ['T1', 'T2'] });
    check(b.status === 'parallel-many', b.status);
  },
  'S2 critical P lower bound: T1 negative at P = 0': () => {
    // strings at 120° (up-left) and 0° (horizontal right), weight 10, P horizontal to the LEFT (180°)
    // →: −0.5T1 + T2 − P = 0 ; ↑: (√3/2)T1 = 10 ⇒ T1 = 11.547, T2 = P + 5.7735 — always taut, range [0, ∞)
    const s = { g: 10, m: 1, config: 'two', dir1: 120, dir2: 0, P: 0, phi: 180, unknowns: ['T1', 'T2'] };
    const pr = F.pRange(s); approx(pr.lo, 0, 1e-9); check(pr.hi === Infinity, 'no upper limit');
    // P pushing right instead: T2 = 5.7735 − P ⇒ greatest P = 5.7735 = 10/√3
    const pr2 = F.pRange(Object.assign({}, s, { phi: 0 })); approx(pr2.hi, 10 / r3);
  },
  'S2 geometry checks': () => {
    check(!F.lengthsGeometry(0.3, 0.4, 1).ok, 'too short');
    check(!F.lengthsGeometry(2, 0.5, 1).ok, 'no triangle');
    check(F.lengthsGeometry(0.5, 0.5, 1).degenerate, 'flat');
    check(!F.oneStringGeometry(1, 2).ok, 'h > L');
    ['UL-v', 'UL-h', 'UR-v', 'UR-h', 'DL-v', 'DL-h', 'DR-v', 'DR-h'].forEach(o => {
      const a = F.alphaFromDir(F.orientDir(25, o), o); check(a.ok, o); approx(a.alpha, 25);
    });
    approx(F.alphaFromDir(0, 'DR-h').alpha, 0, 1e-9);
  },
  'S2 invalid unknown pair rejected': () => {
    check(F.solveParticle({ g: 10, m: 1, config: 'ring', dir1: 90, dir2: 270, unknowns: ['T1', 'T2'] }).status === 'invalid');
    check(F.solveParticle({ g: 10, m: 1, config: 'one', dir1: 90, unknowns: ['T2', 'm'] }).status === 'invalid');
  }
};
