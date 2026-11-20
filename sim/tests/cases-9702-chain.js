/* 9702 p3-momentum: several bodies on a line (chain1D). Working in comments. */
const D = require('../engine/phys-dynamics.js');

module.exports = {
  'chain1D: two bodies, elastic = collide1D (2 kg at 3 on 1 kg at rest, 1 m apart)': () => {
    // meet after 1 / 3 s; v1 = (2−1)3/3 = 1, v2 = 2·2·3/3 = 4
    const r = D.chain1D({ bodies: [{ m: 2, u: 3, x: 0 }, { m: 1, u: 0, x: 1 }], mode: 'elastic', tMax: 5 });
    check(r.events.length === 1, 'one collision');
    approx(r.events[0].t, 1 / 3); approx(r.events[0].x, 1); approx(r.events[0].v[0], 1); approx(r.events[0].v[1], 4);
    check(r.stopReason === 'no further collisions');
    const s = r.stateAt(1);   // 2/3 s after: body 1 at 1 + 2/3, body 2 at 1 + 8/3
    approx(s[0].x, 1 + 2 / 3); approx(s[1].x, 1 + 8 / 3);
  },
  'chain1D: Newton\'s cradle, three equal masses elastic → the last moves off at u': () => {
    // 1 hits 2 (swap), 2 hits 3 (swap): final velocities 0, 0, 4; momentum 4 and KE 8 conserved
    const r = D.chain1D({ bodies: [{ m: 1, u: 4, x: 0 }, { m: 1, u: 0, x: 1 }, { m: 1, u: 0, x: 2 }], mode: 'elastic', tMax: 5 });
    check(r.events.length === 2, 'two collisions, got ' + r.events.length);
    const s = r.stateAt(5); approx(s[0].v, 0); approx(s[1].v, 0); approx(s[2].v, 4);
    r.events.forEach(e => { approx(e.res.p1, e.res.p0); approx(e.res.KE1, e.res.KE0); });
  },
  'chain1D: stick, 2 kg at 6 then 1 kg at 0 then 3 kg at 0 → 2 m/s at the end': () => {
    // first: 12 / 3 = 4 m/s; second: 12 / 6 = 2 m/s (momentum 12 N s throughout)
    const r = D.chain1D({ bodies: [{ name: '1', m: 2, u: 6, x: 0 }, { name: '2', m: 1, u: 0, x: 1 }, { name: '3', m: 3, u: 0, x: 3 }], mode: 'stick', tMax: 10 });
    check(r.events.length === 2);
    approx(r.events[0].v[0], 4); approx(r.events[1].v[0], 2);
    check(r.events[1].names[0] === '1+2', r.events[1].names[0]);
    const s = r.stateAt(10); check(s.length === 1); approx(s[0].m, 6); approx(s[0].v, 2);
  },
  'chain1D: bodies moving apart never collide': () => {
    const r = D.chain1D({ bodies: [{ m: 1, u: -1, x: 0 }, { m: 1, u: 1, x: 1 }, { m: 2, u: 3, x: 2 }], mode: 'elastic', tMax: 5 });
    check(r.events.length === 0 && r.stopReason === 'no further collisions');
  }
};
