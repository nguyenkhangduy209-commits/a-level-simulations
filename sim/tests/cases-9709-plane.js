const P = require('../engine/mech-plane.js');
const base = (o) => Object.assign({ m: 1, g: 10, theta: 0, mu: 0, P: 0, phi: 0, u: 0, contact: 'surface' }, o);
module.exports = {
  'limiting horizontal: least mu = 0.6': () => approx(P.leastMu(base({ m: 0.2, P: 1.2 })), 0.6),
  'mu 0.3: a = 3, distance in 3rd second 7.5': () => {
    const s = P.simulate(base({ m: 0.2, P: 1.2, mu: 0.3 }));
    approx(s.phases[0].a, 3); approx(s.stateAt(3).s - s.stateAt(2).s, 7.5);
  },
  'P_up / P_down along slope': () => {
    const r = P.equilibriumRange(base({ m: 5, theta: 30, mu: 0.2 }));
    approx(r.Pup, 33.6603); approx(r.Pdown, 16.3397);
    approx(r.intervals[0][0], 16.3397); approx(r.intervals[0][1], 33.6603);
  },
  'P_up / P_down horizontal push (phi = -30)': () => {
    const r = P.equilibriumRange(base({ m: 5, theta: 30, mu: 0.2, phi: -30 }));
    approx(r.Pup, 43.9414); approx(r.Pdown, 16.9144);
    approx(r.intervals[0][0], 16.9144); approx(r.intervals[0][1], 43.9414);
  },
  'static on slope mu 0.8: F = 25, muR = 34.641': () => {
    const s = P.simulate(base({ m: 5, theta: 30, mu: 0.8 }));
    check(s.phases[0].kind === 'static', 'should be static'); approx(Math.abs(s.phases[0].F), 25); approx(s.f.Fmax, 34.641);
    approx(Math.abs(s.f.D) / s.f.Fmax, 0.72169);
  },
  'projected up rough slope then slides back': () => {
    const s = P.simulate(base({ m: 3, theta: 30, mu: 0.2, u: 8 }));
    approx(s.phases[0].a, -6.73205); const t1 = s.phases[0].t1; approx(s.stateAt(t1).s, 4.75338);
    check(s.phases[1].kind === 'sliding', 'slides back'); approx(s.phases[1].a, -3.26795);
    const tBack = t1 + Math.sqrt(2 * 4.75338 / 3.26795); approx(Math.abs(s.stateAt(tBack).v), 5.57383, 1e-4);
    approx(P.distanceAt(s, tBack), 2 * 4.75338, 1e-6);
  },
  'projected up slope, stays at rest when tan(theta) <= mu': () => {
    const s = P.simulate(base({ m: 2, theta: 20, mu: 0.5, u: 4 }));
    check(s.phases.length === 2 && s.phases[1].kind !== 'sliding', 'remains at rest');
  },
  'bobsled smooth: v after 60 m = 16.5679': () => {
    const s = P.simulate(base({ m: 1, theta: 12, u: -5 }));     // moving DOWN the slope (negative)
    const a = s.phases[0].a; const v = Math.sqrt(25 + 2 * Math.abs(a) * 60); approx(v, 16.5679);
  },
  'bobsled mu 0.03: a = 1.78567, t = 5.86261': () => {
    const s = P.simulate(base({ m: 1, theta: 12, mu: 0.03, u: -5 }));
    approx(Math.abs(s.phases[0].a), 1.78567);
    const U = require('../core/util.js'); const t = U.bisect(T => -s.stateAt(T).s - 60, 0, 20); approx(t, 5.86261);
  },
  'ring on rod: reaction can act on either side': () => {
    // ring 1 kg on horizontal rough rod, force 20 N at 60° above horizontal: Nraw = 10 - 17.32 < 0 → R = 7.32
    const f = P.forces(base({ m: 1, P: 20, phi: 60, mu: 0.5, contact: 'ring' }));
    approx(f.R, 20 * Math.sin(Math.PI / 3) - 10); check(f.ringReactionSide === 'above');
    const surf = P.forces(base({ m: 1, P: 20, phi: 60, mu: 0.5 })); check(surf.lostContact, 'block would lift off');
  },
  'smooth plane: no equilibrium interval unless P cos(phi) = mg sin(theta)': () => {
    const r = P.equilibriumRange(base({ m: 2, theta: 30 }));
    approx(r.intervals[0][0], 10); approx(r.intervals[0][1], 10);
  }
};
