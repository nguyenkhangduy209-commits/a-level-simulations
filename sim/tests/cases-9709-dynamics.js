/* Tests for SIM.mom (S7), SIM.dyn (S8 chain, S9 vehicle, S10 lift), SIM.energy (S11). g = 10.
   Every expected value below was re-derived by hand (working in the comments) and, for past-paper
   items, checked against the published mark scheme. */
const M = require('../engine/mech-momentum.js');
const D = require('../engine/mech-dynamics.js');
const E = require('../engine/mech-energy.js');
const PL = require('../engine/mech-plane.js');
const U = require('../core/util.js');
const g = 10;
const s3 = Math.sqrt(3);

const chain = (c, extra) => Object.assign({ g, tMax: 10 }, { particles: D.build(c).particles, strLen: D.build(c).strLen }, extra || {});
const firstMoving = (sim) => sim.phases[0];
const byName = (c, name) => D.build(c).particles.findIndex(p => p.name === name);

module.exports = {
  /* ======================= S7 momentum ======================= */
  'S7 0.3 kg at 4 hits 0.2 kg at rest, Q moves at 3 → v_P = 2': () => {
    // 1.2 = 0.3 v + 0.2(3) → v = 2
    const r = M.collide({ m1: 0.3, u1: 4, m2: 0.2, u2: 0, type: 'given', who: 'right', v: 3 });
    approx(r.v1, 2, 1e-9); check(r.valid, 'valid collision');
  },
  'S7 Q (0.2 kg at 3) coalesces with R at rest, moves at 2 → m_R = 0.1': () => {
    // 0.2(3) = (0.2 + m)2 → m = 0.1 ; via solveMomentum with v1 = v2 = 2
    approx(M.solveMomentum({ unknown: 'm2', m1: 0.2, u1: 3, u2: 0, v1: 2, v2: 2 }), 0.1, 1e-9);
  },
  'S7 s25_42 Q2: 0.2 at 5, 0.1 at 2 coalesce → V = 4, KE loss 0.3 J': () => {
    // V = (1 + 0.2)/0.3 = 4; KE 2.5 + 0.2 = 2.7 → 2.4
    const r = M.collide({ m1: 0.2, u1: 5, m2: 0.1, u2: 2, type: 'coalesce' });
    approx(r.v1, 4, 1e-9); approx(r.loss, 0.3, 1e-9); approx(M.maxLoss(0.2, 5, 0.1, 2), 0.3, 1e-9);
  },
  'S7 s24_41 Q7(b): 0.2 at +15, 0.1 at −20, P brought to rest → Q = +10': () => {
    // 3 − 2 = 0.1 v → v = 10 (upwards)
    const r = M.collide({ m1: 0.2, u1: 15, m2: 0.1, u2: -20, type: 'rest', who: 'left' });
    approx(r.v2, 10, 1e-9); check(r.valid, 'valid');
  },
  'S7 w23_42 Q5(b): A 0.5 at 15 up, B 0.3 at 32.5 down, B to rest → A = −4.5': () => {
    // 7.5 − 9.75 = 0.5 v → v = −4.5
    const r = M.collide({ m1: 0.5, u1: 15, m2: 0.3, u2: -32.5, type: 'rest', who: 'right' });
    approx(r.v1, -4.5, 1e-9);
  },
  'S7 m26_42 Q6: v = 6, m = 2, second collision 1.2 m from wall': () => {
    // 4m(6.5) = 4m(2) + 3m v → v = 6 ; loss = (84.5 − 8 − 54) m = 22.5 m = 45 → m = 2
    const r = M.collide({ m1: 4, u1: 6.5, m2: 3, u2: 0, type: 'given', who: 'left', v: 2 });
    approx(r.v2, 6, 1e-9);
    approx(M.massScaleFromLoss(4, 6.5, 3, 0, 2, 6, 45), 2, 1e-9);
    // Q travels 9 m to the wall (1.5 s), P is then 6 m from the wall; closing at 2.5 m/s → 2.4 s; Q moves 1.2 m
    const tl = M.timeline({ particles: [{ name: 'P', m: 8, x: -1, u: 6.5 }, { name: 'Q', m: 6, x: 0, u: 0 }], wall: { x: 9, speed: 0.5 },
      outcomes: [{ type: 'given', who: 'left', v: 2 }], tMax: 30 });
    const ev = tl.events; check(ev.length === 3, 'three events (collision, wall, second meeting)');
    check(ev[1].kind === 'wall' && ev[2].kind === 'pending', 'wall then pending collision');
    approx(9 - ev[2].x, 1.2, 1e-9);
    approx(ev[2].t - ev[0].t, 3.9, 1e-9);
  },
  'S7 s26_41 Q6: m = 3.5; B–C KE loss 6.875 J → roots, pass-through rejected; A catches B': () => {
    // m(2m) − 2(m+2) = 2m + 2(3.25) → 2m² − 4m − 10.5 = 0 → m = 3.5
    const r1 = M.collide({ m1: 3.5, u1: 7, m2: 2, u2: -5.5, type: 'given', who: 'left', v: 2 });
    approx(r1.v2, 3.25, 1e-9);
    // 6v_C² − 13 v_C + 6.875 = 0 → v_C = 1.25 (v_B = 0.75) or 0.916̇ (v_B = 1.416̇ > v_C: pass-through)
    const roots = M.keLossSolve(2, 3.25, 4, 0, 6.875);
    check(roots.length === 2, 'two roots');
    const good = roots.filter(r => r.valid); check(good.length === 1, 'one valid root');
    approx(good[0].v1, 0.75, 1e-9); approx(good[0].v2, 1.25, 1e-9);
    const tl = M.timeline({ particles: [{ name: 'A', m: 3.5, x: 0, u: 7 }, { name: 'B', m: 2, x: 1, u: -5.5 }, { name: 'C', m: 4, x: 3, u: 0 }],
      outcomes: [{ type: 'given', who: 'left', v: 2 }, { type: 'keloss', loss: 6.875 }], tMax: 50 });
    const last = tl.events[tl.events.length - 1];
    check(last.kind === 'pending' && last.names.join('') === 'AB', 'A catches B: a further collision');
  },
  'S7 warnings: not approaching / pass-through / KE gain': () => {
    check(!M.collide({ m1: 1, u1: 1, m2: 1, u2: 2, type: 'coalesce' }).approach, 'not approaching');
    const pt = M.collide({ m1: 1, u1: 4, m2: 1, u2: 0, type: 'given', who: 'left', v: 3 }); // v2 = 1 < 3
    check(pt.passThrough && !pt.valid, 'pass-through flagged');
    const gain = M.collide({ m1: 1, u1: 4, m2: 1, u2: 0, type: 'given', who: 'left', v: -2 }); // v2 = 6, KE 8 → 20
    check(gain.keGain && !gain.valid, 'KE gain flagged');
    const both = M.bothSigns({ m1: 0.3, u1: 4, m2: 0.2, u2: 0, who: 'right', v: 3 });
    check(both[0].valid && !both[1].valid, 'speed 3: +3 valid, −3 impossible');
  },
  'S7 property: momentum conserved in every collision of a timeline': () => {
    const tl = M.timeline({ particles: [{ name: 'A', m: 2, x: 0, u: 5 }, { name: 'B', m: 1, x: 2, u: 1 }, { name: 'C', m: 3, x: 5, u: -1 }],
      wall: { x: 9, speed: 1 }, outcomes: [{ type: 'coalesce' }, { type: 'given', who: 'left', v: 0.5 }, { type: 'rest', who: 'right' }, { type: 'coalesce' }], tMax: 40 });
    let n = 0;
    tl.events.filter(e => e.kind === 'pair').forEach(e => { n++; approx(e.res.p1, e.res.p0, 1e-12, 'momentum'); });
    check(n >= 2, 'at least two collisions');
    // scrubbing: state between events is linear in t
    const s1 = tl.stateAt(0.1); check(Math.abs(s1[0].x - 0.5) < 1e-12, 'A at 0.5 after 0.1 s');
  },

  /* ======================= S8 connected particles ======================= */
  'S8 w24_41 Q1 Atwood 1.8 / 1.2: a = 2, T = 14.4': () => {
    // a = (1.8 − 1.2)10 / 3 = 2 ; T = 1.2(10 + 2) = 14.4
    const r = D.analyse(D.build({ type: 'atwood', m1: 1.2, m2: 1.8 }).particles, g, 0);
    approx(r.a, 2, 1e-9); approx(r.T[0], 14.4, 1e-9); approx(r.residual, 0, 1e-9);
  },
  'S8 Atwood, floor 1 m below: lighter rises a further 0.2 m, then string re-tightens (stop)': () => {
    // v² = 2(2)(1) = 4 ; then A rises freely: 4 = 2(10)h → h = 0.2
    const sim = D.simulate(chain({ type: 'atwood', m1: 1.2, m2: 1.8, h: 1 }, { tMax: 5 }));
    let mx = 0; for (let t = 0; t <= 2; t += 1e-4) mx = Math.max(mx, sim.stateAt(t).x[0]);
    approx(mx - 1, 0.2, 1e-6);
    approx(sim.phases[1].a[0], -10, 1e-12); check(sim.phases[1].strings[0].state === 'slack', 'slack after landing');
    check(/taut again/.test(sim.stop), 'stops when the string becomes taut again');
  },
  'S8 double incline, pulley at the apex (synthetic): 0.3 kg @60°, 0.2 kg @30° smooth → a = 3√3 − 2, T = 0.6 + 0.6√3': () => {
    // (0.3·10 sin60 − 0.2·10 sin30)/0.5 = (1.5√3 − 1)/0.5 = 3√3 − 2 ; T = 0.2(a + 5) = 0.6√3 + 0.6
    const r = D.analyse(D.build({ type: 'double', m1: 0.2, th1: 30, m2: 0.3, th2: 60 }).particles, g, 0);
    approx(r.a, 3 * s3 - 2); approx(r.T[0], 0.6 + 0.6 * s3); approx(r.residual, 0, 1e-9);
  },
  'S8 double incline apex, 0.2 kg on rough BC with 3 N: least μ (plan value corrected)': () => {
    // PLAN said "3 N up BC → least μ = 4/√3 − 1.5 = 0.809401". In the apex geometry a 3 N force UP BC (towards the pulley)
    // gives D = 1.5√3 − 1 + 3 = 1.5√3 + 2 and least μ = D/(0.2·10·cos30) = (1.5√3 + 2)/√3 = 1.5 + 2/√3 = 2.65470.
    // 0.809401 is the value for 3 N acting DOWN BC: |D| = 3 + 1 − 1.5√3 = 4 − 1.5√3 → μ = 4/√3 − 1.5.
    const up = D.analyse(D.build({ type: 'double', m1: 0.2, th1: 30, mu1: 0, m2: 0.3, th2: 60 }).particles.map((p, i) => i === 0 ? Object.assign(p, { P: 3 }) : p), g, 0);
    approx(up.leastMu[0], 1.5 + 2 / s3);
    const dn = D.analyse(D.build({ type: 'double', m1: 0.2, th1: 30, m2: 0.3, th2: 60 }).particles.map((p, i) => i === 0 ? Object.assign(p, { P: -3 }) : p), g, 0);
    approx(dn.leastMu[0], 4 / s3 - 1.5);
  },
  'S8 s22_43 Q6 real geometry (both slopes fall away from the corner pulley): a = 3√3 + 2, T = 0.6√3 − 0.6; least μ = 1.5 − 2/√3': () => {
    // Mark scheme 6(a): a = 7.20, T = 0.439. P (0.3, 60°) and Q (0.2, 30°) both accelerate down their slopes:
    // a = (1.5√3 + 1)/0.5 = 3√3 + 2 = 7.19615 ; T = 0.3(5√3 − a) = 0.6√3 − 0.6 = 0.439230
    const c = { type: 'step', m1: 0.3, th1: 60, m2: 0.2, th2: 30 };
    const r = D.analyse(D.build(c).particles, g, 0);
    approx(r.a, 3 * s3 + 2); approx(r.T[0], 0.6 * s3 - 0.6); approx(r.residual, 0, 1e-9);
    // 6(b): BC rough, 3 N on Q directly up the plane (P = −3 along e_B, which points down BC): T + 0.2g sin30 = F + 3
    // F = 1.5√3 + 1 − 3 = 0.598 ; R = √3 → μ = 1.5 − 2/√3 = 0.345299 (ms 0.345)
    const r2 = D.analyse(D.build(Object.assign({}, c, { P: -3 })).particles, g, 0);
    approx(r2.leastMu[0], 1.5 - 2 / s3);
  },
  'S8 s25_42 Q5: T = 40, 32; μ = 0.423390; break at 1.5 s → A total 2.76923 m up the plane': () => {
    // C: 50 − T₂ = 5(2) → 40 ; B: 40 − T₁ = 4(2) → 32 ; A: 32 − 15 − F = 3(2) → F = 11 = μ(15√3) → μ = 0.423390
    const mu = 11 / (15 * s3);
    approx(mu, 0.423390, 1e-5);
    const c = { type: 'ihh', m1: 3, th1: 30, mu1: mu, m2: 4, mu2: 0, m3: 5 };
    const r = D.analyse(D.build(c).particles, g, 0);
    approx(r.a, 2, 1e-9); approx(r.T[0], 32, 1e-9); approx(r.T[1], 40, 1e-9); approx(r.residual, 0, 1e-9);
    // after 1.5 s: v = 3, s = 2.25 ; then a = −(15 + 11)/3 → extra 9/(2·26/3) = 27/52
    const sim = D.simulate(chain(c, { brk: { string: 0, at: 'time', value: 1.5 }, tMax: 4 }));
    let mx = 0; for (let t = 0; t <= 2.5; t += 1e-4) mx = Math.max(mx, sim.stateAt(t).x[0]);
    approx(mx, 2.25 + 27 / 52, 1e-6); approx(2.25 + 27 / 52, 2.76923, 1e-5);
  },
  'S8 s26_41 Q4: m = 3.5 from T = 37.5; C falls off after A rises 0.8 m; A at rest at t = 1.4 s': () => {
    // A: 37.5 − 30 = 3a → a = 2.5 ; (1.5+m)(10 − 2.5) = 37.5 → m = 3.5
    const a = (37.5 - 30) / 3; approx(37.5 / (g - a) - 1.5, 3.5, 1e-12);
    const c = { type: 'atwood', m1: 3, m2: 1.5, mC: 3.5 };
    const r = D.analyse(D.build(c).particles, g, 0); approx(r.a, 2.5, 1e-12); approx(r.T[0], 37.5, 1e-12);
    // v² = 2(2.5)(0.8) → v = 2 at t = 0.8 ; then a = (15 − 30)/4.5 = −10/3 → 0.6 s more
    const sim = D.simulate(chain(c, { detach: { particle: 1, dm: 3.5, at: 'distance', value: 0.8, ref: 0 }, tMax: 3 }));
    const restEv = sim.log.find(l => /at rest/.test(l.text));
    approx(restEv.t, 1.4, 1e-9);
  },
  'S8 m26_42 Q5: pair pulled up rough 30° slope by 12 N: a = 15.5359, T = 7.2; break at 2 m/s → P stops after 0.236292 s': () => {
    // a = (12 − 0.5·10·0.5 − 0.4·0.5·10·cos30)/0.5 = (9.5 − √3)/0.5 = 15.5359 ; T = 0.3a + 1.5 + 0.4(3 cos30) = 7.2
    const c = { type: 'pair', m1: 0.3, m2: 0.2, th1: 30, mu1: 0.4, mu2: 0.4, P: 12 };
    const r = D.analyse(D.build(c).particles, g, 0);
    approx(r.a, 19 - 2 * s3); approx(r.T[0], 7.2, 1e-9); approx(r.residual, 0, 1e-9);
    // after the break: decel = 5 + 0.4·10·cos30 = 5 + 2√3 → t = 2/(5 + 2√3) = 0.236292
    const sim = D.simulate(chain(c, { brk: { string: 0, at: 'speed', value: 2, ref: 0 }, tMax: 3 }));
    const tb = sim.log.find(l => /breaks/.test(l.text)).t; approx(tb, 2 / (19 - 2 * s3), 1e-9);
    const restP = sim.log.find(l => /^A is instantaneously at rest/.test(l.text)).t;
    approx(restP - tb, 0.236292, 1e-5);
    // then tan30 > 0.4 so A slides back down
    const ph = sim.phases.find(p => p.t0 >= restP - 1e-12);
    check(ph.a[0] < 0, 'A slides back down after stopping');
  },
  'S8 table: 2 kg μ 0.25, 3 kg hangs 1.5 m above floor → a = 5, v = √15, then A slides 3 m more': () => {
    // a = (30 − 0.25·20)/5 = 5 ; v² = 2·5·1.5 = 15 ; decel μg = 2.5 → 15/5 = 3 m
    const c = { type: 'table', m1: 2, mu1: 0.25, m2: 3, h: 1.5 };
    const sim = D.simulate(chain(c, { tMax: 6 }));
    approx(sim.phases[0].a[0], 5, 1e-12);
    const land = sim.log.find(l => /hits the floor/.test(l.text)); approx(land.t, Math.sqrt(0.6), 1e-9);
    approx(sim.stateAt(land.t).v[0], Math.sqrt(15), 1e-9);
    approx(sim.stateAt(5).x[0] - 1.5, 3, 1e-9);
    check(sim.phases[sim.phases.length - 1].t1 === Infinity, 'A ends at rest (static)');
  },
  'S8 two rough contacts at rest: tension statically indeterminate, exact range': () => {
    // A 3 kg on 30° (μ 0.5, F_A = 7.5√3), B 4 kg horizontal (μ 0.5, F_B = 20), C 2 kg hanging.
    // D = −15 + 0 + 20 = 5 ≤ F_max ⇒ static. T_BC = 20 exactly. T_AB = 15 − S₁ with S₁ ∈ [−7.5√3, 7.5√3] ∩ [−25, 15].
    const c = { type: 'ihh', m1: 3, th1: 30, mu1: 0.5, m2: 4, mu2: 0.5, m3: 2 };
    const r = D.analyse(D.build(c).particles, g, 0);
    check(r.static && r.indeterminate, 'static and indeterminate');
    approx(r.Tlo[0], 15 - 7.5 * s3); approx(r.Thi[0], 15 + 7.5 * s3);
    approx(r.Tlo[1], 20, 1e-9); approx(r.Thi[1], 20, 1e-9);
    // limiting: one contact only → unique. Incline: 2 kg on 30° μ 0.2 with 0.5 kg hanging: D = 5 − 10 = −5, μR = 2√3·... static
    const r2 = D.analyse(D.build({ type: 'incline', m1: 2, th1: 30, mu1: 0.4, m2: 0.5 }).particles, g, 0);
    check(r2.static && !r2.indeterminate, 'one rough contact: unique'); approx(r2.T[0], 5, 1e-9);
  },
  'S8 slack detection: upper particle slides faster down the slope → T < 0 ⇒ string slack, independent motion': () => {
    // lower A μ 0.5, upper B μ 0.1 on 30°: common a would need T < 0
    const c = { type: 'pair', m1: 1, m2: 1, th1: 30, mu1: 0.5, mu2: 0.1, len: 2 };
    const sim = D.simulate(chain(c, { tMax: 3 }));
    const ph = sim.phases[0];
    check(ph.strings[0].state === 'slack', 'string slack');
    approx(ph.a[0], -(5 - 0.5 * 5 * s3), 1e-9);      // A alone: −g(sin30 − 0.5 cos30)
    approx(ph.a[1], -(5 - 0.1 * 5 * s3), 1e-9);
    check(/meet/.test(sim.stop), 'they meet when the 2 m of slack closes');
    // pushing the lower particle cannot be transmitted by a string
    const push = D.simulate(chain({ type: 'pair', m1: 1, m2: 1, th1: 0, mu1: 0, mu2: 0, P: 0 }, { tMax: 1 }));
    check(push.phases[0].t1 === Infinity, 'no force: stays at rest');
  },
  'S8 property: last-particle residual = 0 in every moving configuration': () => {
    const cfgs = [
      { type: 'atwood', m1: 1.2, m2: 1.8 }, { type: 'table', m1: 2, mu1: 0.25, m2: 3 }, { type: 'incline', m1: 2, th1: 25, mu1: 0.1, m2: 3, P: 4 },
      { type: 'double', m1: 0.2, th1: 30, m2: 0.3, th2: 60, mu1: 0.1, mu2: 0.05 }, { type: 'step', m1: 0.3, th1: 60, m2: 0.2, th2: 30, mu2: 0.2 },
      { type: 'ihh', m1: 3, th1: 30, mu1: 0.2, m2: 4, mu2: 0.1, m3: 5 }, { type: 'pair', m1: 0.3, m2: 0.2, th1: 30, mu1: 0.4, mu2: 0.4, P: 12 }];
    cfgs.forEach(c => {
      [0, 1.5, -0.7].forEach(v => {
        const r = D.analyse(D.build(c).particles, g, v);
        if (!r.static) approx(r.residual, 0, 1e-9, c.type + ' v=' + v);
      });
    });
  },
  'S8 property: energy balance ΔKE + ΔGPE + W_friction + impact losses − W_applied = 0 matches the dynamics': () => {
    const runs = [
      chain({ type: 'atwood', m1: 1.2, m2: 1.8, h: 1 }, { tMax: 3 }),
      chain({ type: 'table', m1: 2, mu1: 0.25, m2: 3, h: 1.5 }, { tMax: 4 }),
      chain({ type: 'ihh', m1: 3, th1: 30, mu1: 11 / (15 * s3), m2: 4, m3: 5 }, { brk: { string: 0, at: 'time', value: 1.5 }, tMax: 4 }),
      chain({ type: 'pair', m1: 0.3, m2: 0.2, th1: 30, mu1: 0.4, mu2: 0.4, P: 12 }, { brk: { string: 0, at: 'speed', value: 2 }, tMax: 1 }),
      chain({ type: 'atwood', m1: 3, m2: 1.5, mC: 3.5 }, { detach: { particle: 1, dm: 3.5, at: 'distance', value: 0.8, ref: 0 }, tMax: 1.4 })];
    runs.forEach((spec, k) => {
      const sim = D.simulate(spec);
      for (let t = 0; t <= spec.tMax; t += spec.tMax / 37) {
        const e = sim.energyAt(t); approx(e.balance, 0, 1e-9, 'run ' + k + ' t=' + t.toFixed(3) + ' (|balance| scale ' + (e.KE + Math.abs(e.GPE)) + ')');
      }
    });
  },
  'S8 static (does it move at all?) and scrubbing consistency': () => {
    // incline 2 kg on 30° μ 0.4 with 0.5 kg hanging: |D| = |5 − 10| = 5 ≤ μR = 0.4·10√3 = 6.93 → stays
    const sim = D.simulate(chain({ type: 'incline', m1: 2, th1: 30, mu1: 0.4, m2: 0.5 }));
    check(sim.phases.length === 1 && sim.phases[0].t1 === Infinity, 'remains at rest');
    // scrubbing to t equals the analytic phase formula
    const s2 = D.simulate(chain({ type: 'atwood', m1: 1.2, m2: 1.8, h: 1 }, { tMax: 3 }));
    approx(s2.stateAt(0.5).x[1], 0.5 * 2 * 0.25, 1e-12);
  },

  /* ======================= S9 vehicle ======================= */
  's24_41 Q4: car 1700 + trailer 300, 400/150 N, 14 kW at 20 m/s → a = 0.075, T = 172.5': () => {
    // D = 14000/20 = 700 ; a = (700 − 550)/2000 = 0.075 ; T = 300(0.075) + 150 = 172.5
    const r = D.vehicle({ g, m1: 1700, m2: 300, R1: 400, R2: 150, mode: 'power', P: 14000, v: 20, coupling: 'rope' });
    approx(r.a, 0.075, 1e-9); approx(r.T, 172.5, 1e-9); approx(r.carCheck, 0, 1e-9);
  },
  'w23_42 Q6: engine 120 t + coach 60 t, sin = 0.02, D = 125 kN → a = 0.3, T = 43000; β = 3.66306°': () => {
    // a = (125000 − 35000 − 36000)/180000 = 0.3 ; T = 60000(0.3 + 0.2) + 13000 = 43000
    const r = D.vehicle({ g, m1: 120000, m2: 60000, sinTheta: 0.02, R1: 22000, R2: 13000, mode: 'force', D: 125000, coupling: 'bar' });
    approx(r.a, 0.3, 1e-9); approx(r.T, 43000, 1e-9);
    // 4.5e6/30 = 150000 = 35000 + 1.8e6 sinβ
    approx(D.hillAngle({ P: 4.5e6, v: 30, R: 35000, M: 180000, g }).theta, 3.66306, 1e-5);
  },
  's26_41 Q2: 1200 kg, 600 N, 27 kW at 18 m/s → a = 0.75; 22 kW at 12 m/s, 650 N → θ = 5.65920°': () => {
    approx(D.vehicle({ g, m1: 1200, R1: 600, mode: 'power', P: 27000, v: 18 }).a, 0.75, 1e-9);
    approx(D.hillAngle({ P: 22000, v: 12, R: 650, M: 1200, g }).theta, 5.65920, 1e-5);
  },
  's22_43 Q5(a): cyclist 70 kg, a = 0.3 at 4 m/s, 30 N → P = 204 W': () => {
    approx(D.powerFor({ M: 70, a: 0.3, R: 30, v: 4, g }), 204, 1e-12);
  },
  'm26_42 Q1: winch 4000 W, 200 kg, μ 0.8 → v = 2.5': () => {
    approx(D.vmax({ P: 4000, R0: 0.8 * 200 * g }), 2.5, 1e-12);
    approx(D.speedFor({ P: 4000, M: 200, a: 0, R: 1600, g }), 2.5, 1e-12);
  },
  'S9 tow-bar thrust and rope slack; v_max with kv resistance; RK4 track → v_max': () => {
    // braking downhill: trailer pushes the car → T < 0 (thrust in a bar; a rope would go slack)
    const r = D.vehicle({ g, m1: 1000, m2: 500, theta: 0, R1: 100, R2: 50, mode: 'force', D: 0, brake: 3000, coupling: 'rope' });
    // a = −3150/1500 = −2.1 ; T = 500(−2.1) + 50 = −1000
    approx(r.a, -2.1, 1e-12); approx(r.T, -1000, 1e-12); check(r.thrust && r.slack, 'thrust / slack');
    // P = 20 kW, R = 200 + 10 v → 10v² + 200 v − 20000 = 0 → v = 36.2348
    approx(D.vmax({ P: 20000, R0: 200, k: 10, n: 1 }), (-200 + Math.sqrt(40000 + 800000)) / 20, 1e-12);
    const tr = D.track({ M: 1000, g, s: 0, mode: 'power', P: 20000, R0: 500, v0: 5, tMax: 1500, dt: 0.05 });
    approx(tr.at(1500).v, 40, 1e-6);
  },

  /* ======================= S10 lift ======================= */
  'S10 s23_43 Q6: elevator 1200 kg, T = 12250 decelerating at 0.2 → m = 50; greatest R = 520 N; distance 65 m': () => {
    approx(D.liftLoadFromT({ T: 12250, a: -0.2, M: 1200, g }), 50, 1e-12);
    const prof = D.liftProfile({ M: 1200, m: 50, g, stages: [{ type: 'a', a: 0.4, t: 5 }, { type: 'const', t: 25 }, { type: 'v', v: 0, t: 10 }] });
    approx(prof.segs[2].a, -0.2, 1e-12);
    approx(Math.max.apply(null, prof.segs.map(s => s.R)), 520, 1e-12);
    approx(prof.segs[2].T, 12250, 1e-12);
    approx(prof.distance, 65, 1e-12); approx(prof.sEnd, 65, 1e-12);
  },
  'S10 m21_42 Q6(c): lift 1500 kg decelerating 2 → 0 in 1 s → T = 12000': () => {
    approx(D.liftForces({ M: 1500, m: 0, g, a: -2 }).T, 12000, 1e-12);
    const f = D.liftForces({ M: 100, m: 50, g, a: -12 }); check(f.slack && f.leavesFloor, 'a < −g: cable slack, load leaves floor');
  },

  /* ======================= S11 energy ======================= */
  'S11 w23_42 Q1: 15 kg, drop 1.6 m, 2 → 4 m/s → work against resistance 150 J': () => {
    // 15(10)(1.6) + ½·15(4 − 16) = 240 − 90 = 150
    const r = E.leg({ m: 15, g, u: 2, path: 'drop', h: 1.6, L: 4, resist: 'none', solve: 'Wx', vTarget: 4 });
    approx(r.WxSolved, 150, 1e-12);
  },
  'S11 w23_42 Q3: 10 kg, 30°, 120 N at 20°, 200 J resistance over 5 m → v = 4.77107': () => {
    // 600 cos20 − 250 − 200 = ½·10 v²
    const r = E.leg({ m: 10, g, u: 0, path: 'slope', theta: 30, dir: 'up', L: 5, resist: 'none', P: 120, phi: 20, Wx: 200 });
    approx(r.v, 4.77107, 1e-5);
  },
  'S11 s24_41 Q3: train 180 t up 1.5 km at 1.5°, 45 → 40, 12 000 kJ resistance → engine work 44427.8 kJ': () => {
    const r = E.leg({ m: 180000, g, u: 45, path: 'slope', theta: 1.5, dir: 'up', L: 1500, resist: 'none', Wx: 12e6, solve: 'Weng', vTarget: 40 });
    approx(r.WengSolved / 1000, 44427.8, 1e-6);
  },
  'S11 w24_41 Q2: 7.5 kg down 12.5 m: smooth v = 15.8114; rough 25 m path reaching 8 m/s → F = 27.9': () => {
    approx(E.leg({ m: 7.5, g, u: 0, path: 'drop', h: 12.5, L: 25, resist: 'none' }).v, 15.8114, 1e-5);
    // 937.5 − 25F = ½(7.5)(64) = 240 → F = 27.9
    approx(E.leg({ m: 7.5, g, u: 0, path: 'drop', h: 12.5, L: 25, resist: 'force', solve: 'F', vTarget: 8 }).Fsolved, 27.9, 1e-12);
  },
  'S11 s22_43 Q5(c): cyclist 70 kg freewheels down 5°, 6 → 12 m/s, 30 N → d = 121.900': () => {
    // 700 d sin5 − 30 d = 3780
    const r = E.leg({ m: 70, g, u: 6, path: 'slope', theta: 5, dir: 'down', L: 100, resist: 'force', F: 30, solve: 'd', vTarget: 12 });
    approx(r.dSolved, 121.900, 1e-5);
  },
  'S11 m26_42 Q4: car 1600 kg, 10 → 12 m/s, drop 50 m over 2 km, 150 N → braking work 464800 J': () => {
    // −35200 + 800000 − 300000
    const r = E.leg({ m: 1600, g, u: 10, path: 'drop', h: 50, L: 2000, resist: 'force', F: 150, solve: 'Wx', vTarget: 12 });
    approx(r.WxSolved, 464800, 1e-12);
  },
  'S11 s25_42 Q1: 25 N at 20° pushes a crate 12 m in 8 s at constant speed → W = 281.908 J, P = 35.2385 W': () => {
    const r = E.leg({ m: 5, g, u: 1.5, path: 'slope', theta: 0, dir: 'up', L: 12, resist: 'force', P: 25, phi: -20, solve: 'F', vTarget: 1.5, tAvg: 8 });
    approx(r.WP, 281.908, 1e-5); approx(r.powerP, 35.2385, 1e-5); approx(r.Fsolved, 25 * Math.cos(U.rad(20)), 1e-12);
  },
  'S11 s25_42 Q7: 3 kg up 30° at 8 m/s, μ = √3/12: stops after 5.12 m, returns at 6.19677 m/s (energy both legs)': () => {
    // 96 − 15d = 3.75d → d = 5.12 ; 1.5v² = 76.8 − 19.2 → v = √38.4
    const r = E.leg({ m: 3, g, u: 8, path: 'slope', theta: 30, dir: 'up', L: 20, resist: 'mu', mu: s3 / 12 });
    approx(r.sStop, 5.12, 1e-12); check(!r.staysAtRest, 'slides back'); approx(r.vReturn, Math.sqrt(38.4), 1e-12);
  },
  'S11 property: energy method agrees with the dynamics (SIM.plane) on a rough slope, both legs': () => {
    [[3, 30, 0.2, 8, 0, 0], [5, 20, 0.1, 6, 10, 15], [2, 35, 0.3, 10, 4, -10]].forEach(([m, th, mu, u, P, phi]) => {
      const en = E.leg({ m, g, u, path: 'slope', theta: th, dir: 'up', L: 1000, resist: 'mu', mu, P, phi });
      const sim = PL.simulate({ m, g, theta: th, mu, P, phi, u, contact: 'surface' });
      approx(en.sStop, sim.stateAt(sim.phases[0].t1).s, 1e-9, 'stopping distance');
      if (!en.staysAtRest) {
        const t1 = sim.phases[0].t1, a2 = sim.phases[1].a, tb = t1 + Math.sqrt(2 * en.sStop / Math.abs(a2));
        approx(en.vReturn, Math.abs(sim.stateAt(tb).v), 1e-9, 'return speed');
      }
      // the account balances at every distance
      for (let s = 0; s <= en.totalDist; s += en.totalDist / 13) approx(en.at(s).balance, 0, 1e-9);
    });
  }
};
