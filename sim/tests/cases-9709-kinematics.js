/* 9709 M2 kinematics: PLAN section D rows for S4 (journeys), S5 (vertical motion), S6 (variable acceleration),
   plus extra past-paper values (checked against the mark schemes) and edge cases.
   All PLAN expected values were re-derived by hand (working in the comments); none needed correcting. */
const K = require('../engine/mech-kinematics.js');
const C = require('../engine/mech-calculus.js');
const S = (type, o) => Object.assign({ type }, o || {});
const g = 10;

module.exports = {
  /* ======================= S4 multi-stage journeys ======================= */
  'S4 s24_41 Q1 car 0→20 in 10 s, 30 s constant, 20 s to rest: 900 m': () => {
    // ½(10)(20) + 30(20) + ½(20)(20) = 100 + 600 + 200 = 900
    const j = K.journey(0, [S('ta', { t: 10, a: 2 }), S('hold', { t: 30 }), S('tv', { t: 20, v: 0 })]);
    check(!j.error, 'valid'); approx(j.total.dist, 900, 1e-9); approx(j.total.s, 900, 1e-9); approx(j.total.T, 60, 1e-9);
    approx(j.segs[2].a, -1, 1e-9);
  },
  'S4 w24_41 Q4 bus a, 0.75a, 16 m/s, 240 s, 3000 m: a = 16/45': () => {
    // t1 = 16/a, t3 = 64/(3a); 3000 = 3840 − ½·16·(112/(3a)) ⇒ 896/(3a) = 840 ⇒ a = 16/45
    const r = K.solveFor(0, [S('av', { a: 1, v: 16 }), S('fill', { T: 240 }), S('av', { a: -0.75, v: 0 })],
      [{ stage: 0, field: 'a', k: 1 }, { stage: 2, field: 'a', k: -0.75 }], { kind: 'dist' }, 3000, 0.01, 2, 4000);
    check(r.roots.length === 1, 'one root, got ' + r.roots.length); approx(r.roots[0].X, 16 / 45, 1e-9); approx(r.roots[0].X, 0.355556);
    approx(r.roots[0].journey.segs[1].T, 135, 1e-9);   // constant-speed time (ms: T = 135)
  },
  'S4 s25_42 Q4: T = 20 (1060 rejected, T < 30); AC = 3279': () => {
    // 630 + 81T + 27T − 0.1T² = 2750 ⇒ T² − 1080T + 21200 = 0 ⇒ T = 20 or 1060; v_B = 27 − 4 = 23; BC = 23²/1 = 529
    const st = [S('ta', { t: 30, a: 0.4 }), S('hold', { t: 60 }), S('ta', { t: 20, a: -0.2 }), S('av', { a: -0.5, v: 0 })];
    const r = K.solveFor(15, st, [{ stage: 1, field: 't', k: 3 }, { stage: 2, field: 't', k: 1 }], { kind: 'sk', k: 2 }, 2750, 0, 1200, 4000);
    check(r.roots.length === 2, 'two roots'); approx(r.roots[0].X, 20, 1e-9); approx(r.roots[1].X, 1060, 1e-9);
    check(r.roots[0].warnings.length === 0, 'T = 20 valid'); check(r.roots[1].warnings.length > 0, 'T = 1060 flagged');
    approx(r.roots[0].journey.total.dist, 3279, 1e-9); approx(r.roots[0].journey.segs[2].v, 23, 1e-9);
  },
  'S4 m26_42 Q2 cyclist: v = 8, distance 106, average speed 4.41667': () => {
    // v² = 5² + 2(1.5)(13) = 64; t2 = 2; t4 = 2(28)/8 = 7; 106 / 24
    const j = K.journey(0, [S('ta', { t: 10, a: 0.5 }), S('da', { d: 13, a: 1.5 }), S('hold', { t: 5 }), S('dv', { d: 28, v: 0 })]);
    approx(j.segs[1].v, 8, 1e-9); approx(j.segs[1].T, 2, 1e-9); approx(j.segs[3].T, 7, 1e-9);
    approx(j.total.dist, 106, 1e-9); approx(j.total.avgSpeed, 4.41667); approx(j.total.avgSpeed, 106 / 24, 1e-9);
  },
  'S4 m21_42 Q4 elevator, 7 segments, net displacement 0: V = 46/27, first a = 4/3': () => {
    // up 1.5 + 9 + 1 = 11.5; down V + 5V + 0.75V = 6.75V ⇒ V = 11.5/6.75 = 46/27
    const st = [S('tv', { t: 1.5, v: 2 }), S('hold', { t: 4.5 }), S('tv', { t: 1, v: 0 }), S('rest', { t: 6 }), S('tv', { t: 2, v: -1 }), S('hold', { t: 5 }), S('tv', { t: 1.5, v: 0 })];
    const r = K.solveFor(0, st, [{ stage: 4, field: 'v', k: -1 }], { kind: 's' }, 0, 0, 10, 4000);
    check(r.roots.length === 1); approx(r.roots[0].X, 46 / 27, 1e-9); approx(r.roots[0].X, 1.70370);
    approx(r.roots[0].journey.segs[0].a, 1.33333);
  },
  'S4 extra s19_43 Q1 bus: 309.75 m': () => {
    // v = 10.5; ½(5)(10.5) + 24(10.5) + ½(6)(10.5) = 26.25 + 252 + 31.5
    approx(K.journey(0, [S('ta', { t: 5, a: 2.1 }), S('hold', { t: 24 }), S('tv', { t: 6, v: 0 })]).total.dist, 309.75, 1e-9);
  },
  'S4 extra w21_41 Q1: V = 15, deceleration 2.5': () => {
    // ½(30 + 48)V = 585 ⇒ V = 15
    const r = K.solveFor(0, [S('tv', { t: 12, v: 1 }), S('hold', { t: 30 }), S('tv', { t: 6, v: 0 })], [{ stage: 0, field: 'v', k: 1 }], { kind: 'dist' }, 585, 0, 50);
    approx(r.roots[0].X, 15, 1e-9); approx(r.roots[0].journey.segs[2].a, -2.5, 1e-9);
  },
  'S4 extra w23_41 Q3: a = 0.42, average speed 10.236': () => {
    // 12.6 − 14a − 16a = 0; distance 50.4 + 504 + 135.24 + 26.88 = 716.52; ÷ 70
    const r = K.solveFor(0, [S('tv', { t: 8, v: 12.6 }), S('hold', { t: 40 }), S('ta', { t: 14, a: -1 }), S('ta', { t: 8, a: -2 })],
      [{ stage: 2, field: 'a', k: -1 }, { stage: 3, field: 'a', k: -2 }], { kind: 'v' }, 0, 0, 2);
    approx(r.roots[0].X, 0.42, 1e-9); approx(r.roots[0].journey.total.dist, 716.52, 1e-9); approx(r.roots[0].journey.total.avgSpeed, 10.236, 1e-9);
  },
  'S4 extra s23_43 Q6 elevator: greatest speed 2, distance 65': () => {
    const j = K.journey(0, [S('ta', { t: 5, a: 0.4 }), S('hold', { t: 25 }), S('av', { a: -0.2, v: 0 })]);
    approx(j.total.vmax, 2, 1e-9); approx(j.total.dist, 65, 1e-9); approx(j.segs[2].T, 10, 1e-9);
  },
  'S4 extra s22_43 Q3 s–t graph: returns to O, distance 400, average speed 20': () => {
    const j = K.journey(0, [S('ta', { t: 5, a: 4 }), S('hold', { t: 5 }), S('ta', { t: 5, a: -4 }), S('vt', { v: -40, t: 5 })]);
    approx(j.segs[0].s1, 50, 1e-9); approx(j.segs[1].s1, 150, 1e-9); approx(j.segs[2].s1, 200, 1e-9);
    approx(j.total.s, 0, 1e-9); approx(j.total.dist, 400, 1e-9); approx(j.total.avgSpeed, 20, 1e-9); check(j.segs[3].jump, 'velocity jump flagged');
  },
  'S4 sign change inside a stage: distance |s(t0)| + |s(t) − s(t0)|': () => {
    // u = 12, a = −3, 10 s: t0 = 4, s(4) = 24, s(10) = 120 − 150 = −30 ⇒ distance 24 + 54 = 78
    const j = K.journey(12, [S('ta', { t: 10, a: -3 })]);
    approx(j.segs[0].tTurn, 4, 1e-12); approx(j.total.s, -30, 1e-12); approx(j.total.dist, 78, 1e-12);
    approx(j.distanceAt(4), 24, 1e-12); approx(j.distanceAt(6), 30, 1e-12); approx(j.total.avgVel, -3, 1e-12);
  },
  'S4 distance in the 3rd second (u = 2, a = 3): u + a(n − ½) = 9.5': () => {
    const j = K.journey(2, [S('ta', { t: 6, a: 3 })]);
    approx(j.distanceAt(3) - j.distanceAt(2), 9.5, 1e-12);
  },
  'S4 two bodies: B catches A at t = 18, 360 m (also level at the start)': () => {
    // B: 2.5 m/s² to 30 m/s (12 s, 180 m); then 180 + 30(t − 12) = 20t ⇒ t = 18
    const jA = K.journey(20, [S('hold', { t: 30 })], { extend: true }), jB = K.journey(0, [S('av', { a: 2.5, v: 30 }), S('hold', { t: 30 })], { extend: true });
    const m = K.meetings(K.track(jA, 0, 0, 42), K.track(jB, 0, 0, 42), 42);
    check(m.list.length === 2, 'two meeting times, got ' + m.list.length); approx(m.list[0].t, 0, 1e-9); approx(m.list[1].t, 18, 1e-9); approx(m.list[1].s, 360, 1e-9);
  },
  'S4 two bodies with a delay and a head start (quadratic piece)': () => {
    // A from rest a = 2 from s = 0; B at constant 10 m/s starting 1 s later from s = 5: t² = 5 + 10(t − 1) ⇒ t² − 10t + 5 = 0
    const jA = K.journey(0, [S('ta', { t: 20, a: 2 })], { extend: true }), jB = K.journey(10, [S('hold', { t: 20 })], { extend: true });
    const m = K.meetings(K.track(jA, 0, 0, 20), K.track(jB, 1, 5, 20), 20);
    // roots 5 ± √20 = 0.528, 9.472; the first is before B starts (B still waiting at s = 5 while A is at 0.28), so only t = 9.472 counts
    check(m.list.length === 1, 'one meeting, got ' + m.list.length); approx(m.list[0].t, 5 + Math.sqrt(20), 1e-9); approx(m.list[0].s, Math.pow(5 + Math.sqrt(20), 2), 1e-9);
  },
  'S4 edge: impossible stages are reported, earlier stages kept': () => {
    let j = K.journey(0, [S('ta', { t: 2, a: 1 }), S('dv', { d: 10, v: -2 })]);      // u + v = 0
    check(j.error && j.error.stage === 1 && j.segs.length === 1, 'u + v = 0');
    j = K.journey(5, [S('da', { d: 10, a: -2 })]);                                      // stops after 6.25 m
    check(j.error && /never reached/.test(j.error.msg), 'never reaches d');
    j = K.journey(5, [S('av', { a: 1, v: 0 })]);                                         // velocity moves away
    check(j.error && j.error.stage === 0, 'av moving away');
    j = K.journey(0, [S('tv', { t: 0, v: 3 })]);
    check(j.error, 'zero time but velocity change');
    j = K.journey(0, [S('ta', { t: 100, a: 1 }), S('fill', { T: 60 })]);
    check(j.error && j.error.stage === 1, 'fill shorter than other stages');
    j = K.journey(0, []); check(!j.error && j.total.T === 0 && isNaN(j.total.avgSpeed), 'empty journey');
    j = K.journey(0, [S('fill', { T: 10 }), S('fill', { T: 20 })]); check(j.error && j.error.stage === 1, 'two fill stages');
  },
  'S4 edge: da with a reversal reaches a negative displacement on the way back': () => {
    // u = 10, a = −2, d = −11: 10t − t² = −11 ⇒ t = 11 (positive root); v = −12
    const j = K.journey(10, [S('da', { d: -11, a: -2 })]);
    approx(j.segs[0].T, 11, 1e-12); approx(j.segs[0].v, -12, 1e-12); approx(j.total.dist, 25 + 36, 1e-12);
  },
  'S4 edge: rest stage after motion = instantaneous stop (flagged jump)': () => {
    const j = K.journey(0, [S('ta', { t: 2, a: 3 }), S('rest', { t: 4 })]);
    check(j.segs[1].jump, 'jump flagged'); approx(j.total.s, 6, 1e-12);
  },

  /* ======================= S5 vertical motion ======================= */
  'S5 w24_41 Q5: T = 3.5, height 218.75, C returns to O at 18.4303': () => {
    // 80T − 5T² = 100(T−1) − 5(T−1)² ⇒ 30T = 105; v_A = 45, v_B = 75 ⇒ v_C = 60; −218.75 = 60τ − 5τ² ⇒ τ = (12 + √319)/2
    const v = K.vertical({ g, A: { h: 0, u: 80, m: 1 }, B: { h: 0, u: 100, m: 1, delay: 1 }, ground: 'stop', collide: 'coalesce' });
    const e = v.events.filter(x => x.type === 'meet')[0];
    approx(e.t, 3.5, 1e-12); approx(e.y, 218.75, 1e-12); approx(e.vA2, 60, 1e-12);
    approx(v.tEnd, 3.5 + (12 + Math.sqrt(319)) / 2, 1e-12); approx(v.tEnd, 18.4303);
  },
  'S5 s22_43 Q2: apex 45 ⇒ u = 30; time with speed ≥ 10 is 4 s': () => {
    const u = Math.sqrt(2 * g * 45); approx(u, 30, 1e-12);
    const v = K.vertical({ g, A: { h: 0, u, m: 1 }, ground: 'stop' });
    approx(K.apexes(v.tracks.A, v.tEnd)[0].y, 45, 1e-12);
    const q = K.timeSpeedAtLeast(v.tracks.A, 10, v.tEnd);
    approx(q.total, 4, 1e-12); check(q.intervals.length === 2, 'two bands');
  },
  'S5 w23_42 Q5: speed 15 at 20 m; A after = −4.5; landing interval 0.4 s': () => {
    // A meets B at t = 1 (20 = 25t − 5t²); B set up as h = 47.5, u = −22.5 so v_B(1) = −32.5 at 20 m
    // 0.5(15) + 0.3(−32.5) = 0.5 v ⇒ v = −4.5; A: 20 = 4.5t + 5t² ⇒ 1.6 s; B from rest: 2 s
    const v = K.vertical({ g, A: { h: 0, u: 25, m: 0.5 }, B: { h: 47.5, u: -22.5, m: 0.3, delay: 0 }, ground: 'stop', collide: 'Brest' });
    const e = v.events.filter(x => x.type === 'meet')[0];
    approx(e.t, 1, 1e-12); approx(e.y, 20, 1e-12); approx(e.vA, 15, 1e-12); approx(e.vB, -32.5, 1e-12); approx(e.vA2, -4.5, 1e-12);
    const lands = v.events.filter(x => x.type === 'land');
    approx(lands[1].t - lands[0].t, 0.4, 1e-12);
    const h = K.timesAtHeight(v.tracks.A, 20, v.tEnd)[0]; approx(h.v, 15, 1e-12);
  },
  'S5 m23_42 Q2: speed 5 at 10 m; meet at 1.2 s, 10.8 m': () => {
    const v = K.vertical({ g, A: { h: 0, u: 15, m: 1 }, B: { h: 18, u: 0, m: 1, delay: 0 }, ground: 'stop', collide: 'off' });
    const e = v.events.filter(x => x.type === 'meet')[0]; approx(e.t, 1.2, 1e-12); approx(e.y, 10.8, 1e-12);
    const h = K.timesAtHeight(v.tracks.A, 10, v.tEnd); approx(Math.abs(h[0].v), 5, 1e-12); approx(Math.abs(h[1].v), 5, 1e-12);
    approx(K.timeHeightAtLeast(v.tracks.A, 10, v.tEnd).total, 1, 1e-12);
  },
  'S5 w24_42 Q5: speeds 3 and 5 before; Q down 3.5 after ⇒ P lands at 5.39096': () => {
    // meet when 1 + 2t = 2 ⇒ t = 0.5, y = 0.75; 2m(−3) + m(−5) = 2m v + m(−3.5) ⇒ v = −3.75; v² = 3.75² + 2(10)(0.75) = 29.0625
    const pre = K.vertical({ g, A: { h: 1, u: 2, m: 2 }, B: { h: 2, u: 0, m: 1, delay: 0 }, ground: 'stop', collide: 'off' });
    const m0 = pre.events.filter(x => x.type === 'meet')[0];
    approx(m0.vA, -3, 1e-12); approx(m0.vB, -5, 1e-12); approx(m0.y, 0.75, 1e-12);
    const vA = (2 * m0.vA + 1 * m0.vB - 1 * -3.5) / 2; approx(vA, -3.75, 1e-12);
    const v = K.vertical({ g, A: { h: 1, u: 2, m: 2 }, B: { h: 2, u: 0, m: 1, delay: 0 }, ground: 'stop', collide: 'vA', vA });
    const e = v.events.filter(x => x.type === 'meet')[0]; approx(e.vB2, -3.5, 1e-12);
    const landP = v.events.filter(x => x.type === 'land' && x.who === 'A')[0]; approx(Math.abs(landP.vBefore), Math.sqrt(29.0625), 1e-12); approx(Math.abs(landP.vBefore), 5.39096);
  },
  'S5 w25_42 Q4: collide at 19.6875 m; coalesce at 6.5; ground speed √436': () => {
    // 30t − 5t² = 15 + 10t − 5t² ⇒ t = 0.75; v_P = 22.5, v_Q = 2.5; (0.1·22.5 + 0.4·2.5)/0.5 = 6.5; v² = 6.5² + 2·10·19.6875 = 436
    const v = K.vertical({ g, A: { h: 0, u: 30, m: 0.1 }, B: { h: 15, u: 10, m: 0.4, delay: 0 }, ground: 'stop', collide: 'coalesce' });
    const e = v.events.filter(x => x.type === 'meet')[0];
    approx(e.t, 0.75, 1e-12); approx(e.y, 19.6875, 1e-12); approx(e.vA2, 6.5, 1e-12);
    const land = v.events.filter(x => x.type === 'land')[0]; approx(Math.abs(land.vBefore), Math.sqrt(436), 1e-12); check(land.who === 'C');
  },
  'S5 s18_43 Q2 bounce: V = 13 after 0.8 s; rebounds at 6.5 to B (2.1125 m) at 1.45 s': () => {
    const v = K.vertical({ g, A: { h: 7.2, u: -5, m: 1 }, ground: 'rebound', k: 0.5 });
    const b = v.events.filter(x => x.type === 'bounce')[0];
    approx(b.t, 0.8, 1e-12); approx(b.vBefore, -13, 1e-12); approx(b.vAfter, 6.5, 1e-12);
    const top = K.apexes(v.tracks.A, v.tEnd)[0]; approx(top.t, 1.45, 1e-12); approx(top.y, 2.1125, 1e-12);
    check(v.events.filter(x => x.type === 'bounce').length <= 20, 'bounce cap');
  },
  'S5 edge: KE increase in a specified collision is flagged; momentum conserved': () => {
    const v = K.vertical({ g, A: { h: 0, u: 20, m: 1 }, B: { h: 30, u: 0, m: 1, delay: 0 }, ground: 'stop', collide: 'vA', vA: 50 });
    const e = v.events.filter(x => x.type === 'meet')[0];
    approx(1 * e.vA + 1 * e.vB, 1 * e.vA2 + 1 * e.vB2, 1e-12); check(e.keGain && v.warnings.length, 'KE gain warning');
  },
  'S5 edge: particle at rest on the ground, delay longer than the flight, downward from ground': () => {
    let v = K.vertical({ g, A: { h: 0, u: 0, m: 1 }, ground: 'stop' }); check(v.tEnd === 0 && v.stateAt(1).A.y === 0, 'stays');
    v = K.vertical({ g, A: { h: 0, u: -5, m: 1 }, ground: 'stop' }); check(v.warnings.length === 1, 'warned');
    v = K.vertical({ g, A: { h: 0, u: 10, m: 1 }, B: { h: 0, u: 10, m: 1, delay: 5 }, ground: 'stop', collide: 'coalesce' });
    check(!v.events.some(x => x.type === 'meet'), 'never both in the air together'); approx(v.tEnd, 7, 1e-12);
    approx(v.stateAt(3).B.y, 0, 1e-12);
  },

  /* ======================= S6 variable acceleration ======================= */
  'S6 w23_42 Q7 cubic: a = 0 at 2, 10; v(10) = 25.6; v(14) = 0; double root at 2; distance 0–15 = 184.425': () => {
    // v = −0.1(t − 2)²(t − 14); s = −0.025t⁴ + 0.6t³ − 3t² + 5.6t; s(14) = 176.4, s(15) = 168.375; 176.4 + 8.025
    const M = C.analyse({ pieces: [{ t0: 0, t1: 15, given: 'v', expr: '-0.1t^3 + 1.8t^2 - 6t + 5.6' }], conds: [{ q: 's', t: 0, val: 0 }] });
    check(M.ok, M.error);
    const A = C.intervalAnalysis(M, 0, 15);
    check(A.turning.length === 2); approx(A.turning[0].t, 2, 1e-9); approx(A.turning[1].t, 10, 1e-9);
    approx(M.v(10), 25.6, 1e-12); approx(M.v(14), 0, 1e-9); approx(M.s(14), 176.4, 1e-12); approx(M.s(15), 168.375, 1e-12);
    const r2 = A.rest.filter(r => Math.abs(r.t - 2) < 1e-6)[0], r14 = A.rest.filter(r => Math.abs(r.t - 14) < 1e-6)[0];
    check(r2 && r2.kind === 'touch' && r2.cross === false, 't = 2 is a touching (double) root');
    check(r14 && r14.kind === 'reverses', 't = 14 reverses');
    approx(A.distance, 184.425, 1e-9); approx(A.displacement, 168.375, 1e-9); approx(A.vmax.v, 25.6, 1e-9);
    check(C.format(M.pieces[0].num.s) === '−0.025t<sup>4</sup> + 0.6t<sup>3</sup> − 3t<sup>2</sup> + 5.6t', C.format(M.pieces[0].num.s));
  },
  'S6 s26_41 Q3 s = 4t³ − 39t² + 120t: rest at 2.5, 4; distance [1, 4] = 40.5; |a(3)| = 6': () => {
    const M = C.analyse({ pieces: [{ t0: 0, t1: 5, given: 's', expr: '4t^3 - 39t^2 + 120t' }], conds: [] });
    check(M.ok && M.needed === 0);
    const A = C.intervalAnalysis(M, 0, 5);
    const rs = A.rest.map(r => r.t); check(rs.length === 2); approx(rs[0], 2.5, 1e-9); approx(rs[1], 4, 1e-9);
    approx(C.intervalAnalysis(M, 1, 4).distance, 40.5, 1e-9); approx(Math.abs(M.a(3)), 6, 1e-12);
  },
  'S6 m26_42 Q7 v = t − 7t^½ + 12: rest at 9, 16; a(4) = −0.75; distance 0–25 = 31.5': () => {
    // √t = 3, 4; s = t²/2 − (14/3)t^{3/2} + 12t: 22.5, 21.3333, 29.1667 ⇒ 22.5 + 1.16667 + 7.83333
    const M = C.analyse({ pieces: [{ t0: 0, t1: 25, given: 'v', expr: 't - 7t^(1/2) + 12' }], conds: [{ q: 's', t: 0, val: 0 }] });
    check(M.ok, M.error); check(M.notes.length === 1, 'a undefined at t = 0 noted');
    const A = C.intervalAnalysis(M, 0, 25);
    approx(A.rest[0].t, 9, 1e-9); approx(A.rest[1].t, 16, 1e-9); approx(M.a(4), -0.75, 1e-12); approx(A.distance, 31.5, 1e-9);
    check(A.amin === null && A.aInf.length === 1 && A.aInf[0].sign < 0, 'a → −∞ at t = 0: no least a');
  },
  'S6 a = 6t − 12 with s(1) = 5, s(3) = 1: C1 = 9, C2 = 1; v = 3(t − 1)(t − 3)': () => {
    // s = t³ − 6t² + C1 t + C2: C1 + C2 = 10, 3C1 + C2 = 28
    const M = C.analyse({ pieces: [{ t0: 0, t1: 4, given: 'a', expr: '6t - 12' }], conds: [{ q: 's', t: 1, val: 5 }, { q: 's', t: 3, val: 1 }] });
    check(M.ok, M.error); approx(M.values.C1, 9, 1e-12); approx(M.values.C2, 1, 1e-12);
    [0, 0.5, 2, 3.7].forEach(t => approx(M.v(t), 3 * (t - 1) * (t - 3), 1e-12));
  },
  'S6 s21_42 Q7 piecewise a (6+4t; 14; 16−2t) from rest: v(2) = 20, v(4) = 48; v = 55 at 5 and 11': () => {
    // v = 6t + 2t²; 20 + 14(t − 2); 48 + 16(t − 4) − (t² − 16) = 16t − t²; t² − 16t + 55 = 0
    const M = C.analyse({ pieces: [{ t0: 0, t1: 2, given: 'a', expr: '6 + 4t' }, { t0: 2, t1: 4, given: 'a', expr: '14' }, { t0: 4, t1: 16, given: 'a', expr: '16 - 2t' }],
      conds: [{ q: 'v', t: 0, val: 0 }, { q: 's', t: 0, val: 0 }] });
    check(M.ok, M.error); check(!M.warnings.length, 'continuous');
    approx(M.v(2), 20, 1e-12); approx(M.v(4), 48, 1e-12); approx(M.v(16), 0, 1e-12);
    const t55 = C.timesWhen(M, 'v', 55, 0, 16); check(t55.length === 2); approx(t55[0], 5, 1e-9); approx(t55[1], 11, 1e-9);
    // ms 7(c): distance while decelerating (8 < t ≤ 16) = 1024/3 = 341⅓
    approx(C.intervalAnalysis(M, 8, 16).distance, 1024 / 3, 1e-9);
  },
  'S6 extra w24_41 Q8 a = 0.6t − 2.7, v(0) = 4.2: rests at 2 and 7, distance between 6.25': () => {
    const M = C.analyse({ pieces: [{ t0: 0, t1: 9, given: 'a', expr: '0.6t - 2.7' }], conds: [{ q: 'v', t: 0, val: 4.2 }, { q: 's', t: 0, val: 0 }] });
    const A = C.intervalAnalysis(M, 0, 9); approx(A.rest[0].t, 2, 1e-9); approx(A.rest[1].t, 7, 1e-9);
    approx(C.intervalAnalysis(M, 2, 7).distance, 6.25, 1e-9);
  },
  'S6 extra s22_43 Q7 v = 9/4 + b/(t+1)² − ct²: b = 9, c = 0.1, distance 0–10 = 350/11': () => {
    // v(5) = 9/4 + b/36 − 25c = 0, a(5) = −b/108 − 10c = −13/12; s = 9t/4 − 9/(t+1) − t³/30 + 9
    const M = C.analyse({ pieces: [{ t0: 0, t1: 10, given: 'v', expr: '9/4 + b/(t+1)^2 - ct^2' }], conds: [{ q: 'v', t: 5, val: 0 }, { q: 'a', t: 5, val: -13 / 12 }, { q: 's', t: 0, val: 0 }] });
    check(M.ok, M.error); approx(M.values.b, 9, 1e-9); approx(M.values.c, 0.1, 1e-9);
    approx(C.intervalAnalysis(M, 0, 10).distance, 350 / 11, 1e-9);
  },
  'S6 extra s23_43 Q5 a = k√t then v = 0.2(t−9)² + 1.8: k = 0.1, distances 6.48 and 64.8, greatest a 0.4': () => {
    const M = C.analyse({ pieces: [{ t0: 0, t1: 9, given: 'a', expr: 'k t^(1/2)' }, { t0: 9, t1: 18, given: 'v', expr: '0.2(t-9)^2 + 1.8' }],
      conds: [{ q: 'v', t: 0, val: 0 }, { q: 's', t: 0, val: 0 }, { q: 'v', t: 9, val: 1.8 }] });
    check(M.ok, M.error); approx(M.values.k, 0.1, 1e-9);
    approx(C.intervalAnalysis(M, 0, 9).distance, 6.48, 1e-9); approx(C.intervalAnalysis(M, 9, 18).distance, 64.8, 1e-9);
    approx(C.intervalAnalysis(M, 0, 10).amax.a, 0.4, 1e-9);
  },
  'S6 extra m23_42 Q3 a = 4√t from rest: v(9) = 72; s = v when t = 5/2': () => {
    const M = C.analyse({ pieces: [{ t0: 0, t1: 9, given: 'a', expr: '4t^(1/2)' }], conds: [{ q: 'v', t: 0, val: 0 }, { q: 's', t: 0, val: 0 }] });
    approx(M.v(9), 72, 1e-12);
    const r = C.roots(t => M.s(t) - M.v(t), 0.5, 9).list; check(r.length === 1); approx(r[0].x, 2.5, 1e-9);
  },
  'S6 rules: d/dt and ∫ of c(pt+q)^n; n = −1 under ∫ is blocked': () => {
    const d = C.diff(C.parse('3(2t+1)^4')); approx(d[0].c, 24, 1e-12); approx(d[0].n, 3, 1e-12);
    const i = C.integ(C.parse('3(2t+1)^4')); approx(i[0].c, 0.3, 1e-12); approx(i[0].n, 5, 1e-12);
    let threw = false; try { C.integ(C.parse('5/(2t+1)')); } catch (e) { threw = e.code === 'ln'; } check(threw, 'n = −1 blocked');
    const M = C.analyse({ pieces: [{ t0: 1, t1: 5, given: 'v', expr: '3/t' }], conds: [{ q: 's', t: 1, val: 0 }] });
    check(!M.ok && M.lnBlocked && /ln/.test(M.error), 'analyse reports the ln block');
    const Ms = C.analyse({ pieces: [{ t0: 1, t1: 5, given: 's', expr: '3/t' }], conds: [] });   // differentiating 1/t is fine
    check(Ms.ok); approx(Ms.v(3), -1 / 3, 1e-12);
  },
  'S6 domain checks: fractional power of a negative base, infinity inside the interval': () => {
    let M = C.analyse({ pieces: [{ t0: 0, t1: 5, given: 'v', expr: '(t-2)^(1/2)' }], conds: [{ q: 's', t: 2, val: 0 }] });
    check(!M.ok && /not defined/.test(M.error), 'negative base');
    M = C.analyse({ pieces: [{ t0: 0, t1: 5, given: 'v', expr: '(t-2)^-2' }], conds: [{ q: 's', t: 0, val: 0 }] });
    check(!M.ok && /infinite/.test(M.error), 'singular inside');
    M = C.analyse({ pieces: [{ t0: 0, t1: 5, given: 'v', expr: '(t+1)^-2' }], conds: [{ q: 's', t: 0, val: 0 }] });
    check(M.ok); approx(M.s(1), -0.5 + 1, 1e-12);   // s = −(t+1)⁻¹ + 1
  },
  'S6 parser and formatter': () => {
    const f = C.format(C.parse('-0.1t^3 + 1.8t^2 - 6t + 5.6'));
    check(f === '−0.1t<sup>3</sup> + 1.8t<sup>2</sup> − 6t + 5.6', f);
    check(C.format(C.parse('t - 7t^(1/2) + 12')) === 't − 7t<sup>1/2</sup> + 12');
    check(C.format(C.parse('t − 7√t + 12'), { html: false }) === 't - 7*t^(1/2) + 12');
    const back = C.parse(C.format(C.parse('9/4 + b/(t+1)^2 - ct^2'), { html: false }));
    check(back.length === 3 && back[1].sym === 'b' && back[1].n === -2 && back[2].sym === 'c', 'round trip');
    check(C.format(C.parse('0.2(t-9)^2 + 1.8')) === '0.2(t − 9)<sup>2</sup> + 1.8');
    check(C.format(C.parse('2t*t^2 + t^3')) === '3t<sup>3</sup>', 'like terms merged');
    ['t^', '(t^2+1)^2', 'k*b*t', 'x+1', '2/(0)'].forEach(s => { let bad = false; try { C.parse(s); } catch (e) { bad = true; } check(bad, 'should reject ' + s); });
  },
  'S6 edge: condition that cannot fix the constant; inconsistent conditions; s-given pieces that jump': () => {
    let M = C.analyse({ pieces: [{ t0: 0, t1: 5, given: 'v', expr: '2t' }], conds: [{ q: 'v', t: 0, val: 0 }] });
    check(!M.ok && /does not involve/.test(M.error), 'v-condition cannot find C in s');
    M = C.analyse({ pieces: [{ t0: 0, t1: 5, given: 'a', expr: '2' }], conds: [{ q: 's', t: 1, val: 0 }, { q: 's', t: 1, val: 3 }] });
    check(!M.ok, 'two conditions at the same instant');
    M = C.analyse({ pieces: [{ t0: 0, t1: 2, given: 's', expr: 't^2' }, { t0: 2, t1: 4, given: 's', expr: '3t' }], conds: [] });
    check(M.ok && M.warnings.length === 2, 'jumps in s and v flagged');
    M = C.analyse({ pieces: [{ t0: 0, t1: 2, given: 'v', expr: '1' }, { t0: 3, t1: 4, given: 'v', expr: '1' }], conds: [{ q: 's', t: 0, val: 0 }] });
    check(!M.ok && /join/.test(M.error), 'gap between intervals');
    M = C.analyse({ pieces: [{ t0: 0, t1: 4, given: 'v', expr: '0' }], conds: [{ q: 's', t: 0, val: 2 }] });
    const A = C.intervalAnalysis(M, 0, 4); check(A.restAll.length === 1 && A.distance === 0, 'at rest throughout');
  }
};
