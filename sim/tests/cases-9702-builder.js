/* 9702 topic 10: circuit builder (sim/engine/phys-circuit-builder.js) — grid drawing → netlist → solution + method.
   Hand-worked values in the comments. */
const B = require('../engine/phys-circuit-builder.js');
const P = (t, x, y, d, v, rev) => B.make(t, x, y, d, v, rev);
const RECT = [[1, 1], [7, 1], [7, 4], [1, 4], [1, 1]];
const has = (res, re) => res.issues.some(i => re.test(i.text));

module.exports = {
  'builder: series 6 V, 10 Ω + 20 Ω ⇒ I = 0.2 A, V = 2 V and 4 V, reduction R = 30 Ω': () => {
    const parts = B.build([P('cell', 3, 1, 'h', { E: 6 }), P('amm', 5, 1, 'h'), P('res', 7, 2, 'v', { R: 10 }), P('res', 4, 4, 'h', { R: 20 })], [RECT]);
    const r = B.analyse(parts); check(!r.fatal, r.fatal);
    approx(Math.abs(r.parts[2].I), 0.2, 1e-9); approx(Math.abs(r.parts[2].V), 2, 1e-9); approx(Math.abs(r.parts[3].V), 4, 1e-9);
    approx(r.parts[1].reading, 0.2, 1e-9); approx(r.parts[0].Iout, 0.2, 1e-9); approx(r.parts[0].P, 1.2, 1e-9);
    check(r.method.reduce, 'series circuit reduces'); approx(r.method.reduce.Rext, 30, 1e-9); approx(r.method.reduce.I, 0.2, 1e-9);
    check(r.method.kirchhoff.loops.length === 1, 'one loop');
    // every wire on the loop carries 0.2 A
    parts.forEach((p, i) => { if (p.t === 'wire') approx(Math.abs(r.parts[i].I), 0.2, 1e-9, 'wire ' + i); });
  },
  'builder: parallel 6 V across 6 Ω ∥ 3 Ω ⇒ 1 A + 2 A = 3 A; R = 2 Ω': () => {
    const parts = B.build([P('cell', 1, 2, 'v', { E: 6 }), P('res', 4, 2, 'v', { R: 6 }), P('res', 7, 2, 'v', { R: 3 }), P('amm', 2, 1, 'h')], [RECT, [[4, 1], [4, 4]]]);
    const r = B.analyse(parts); check(!r.fatal, r.fatal);
    approx(Math.abs(r.parts[1].I), 1, 1e-9); approx(Math.abs(r.parts[2].I), 2, 1e-9); approx(r.parts[3].reading, 3, 1e-9);
    approx(r.method.reduce.Rext, 2, 1e-9); check(r.method.reduce.steps.length === 1 && r.method.reduce.steps[0].kind === 'par');
    check(r.issues.filter(i => i.kind === 'warn').length === 0, 'no warnings');
  },
  'builder: mixed 12 V, r = 1, 4 Ω + (6 Ω ∥ 3 Ω) ⇒ I = 12/7, terminal p.d. 72/7': () => {
    const parts = B.build([P('cell', 1, 2, 'v', { E: 12, r: 1 }), P('res', 2, 1, 'h', { R: 4 }), P('res', 4, 2, 'v', { R: 6 }), P('res', 7, 2, 'v', { R: 3 })], [RECT, [[4, 1], [4, 4]]]);
    const r = B.analyse(parts), m = r.method.reduce;
    approx(m.I, 12 / 7, 1e-9); approx(r.parts[0].Vt, 72 / 7, 1e-9); approx(Math.abs(r.parts[3].I), 8 / 7, 1e-9);
    check(m.steps.length === 2 && m.steps[0].kind === 'par' && m.steps[1].kind === 'ser', 'parallel first, then series');
    approx(m.steps[0].I, 12 / 7, 1e-9); approx(m.steps[0].kids[1].I, 8 / 7, 1e-9);
  },
  'builder: two cells (12 V + 2 Ω, 6 V + 3 Ω, 6 Ω) ⇒ junction at 8 V, 6 V cell charged at 0.667 A': () => {
    const parts = B.build([P('cell', 1, 3, 'v', { E: 12 }), P('res', 1, 1, 'v', { R: 2 }), P('cell', 4, 3, 'v', { E: 6 }), P('res', 4, 1, 'v', { R: 3 }), P('res', 7, 2, 'v', { R: 6 })],
      [[[1, 0], [7, 0], [7, 5], [1, 5], [1, 0]], [[4, 0], [4, 5]]]);
    const r = B.analyse(parts); check(!r.fatal, r.fatal);
    approx(r.parts[0].Iout, 2, 1e-9); approx(r.parts[2].Iout, -2 / 3, 1e-9); approx(Math.abs(r.parts[4].I), 4 / 3, 1e-9); approx(Math.abs(r.parts[4].V), 8, 1e-9);
    check(!r.method.reduce, 'two sources: Kirchhoff'); const k = r.method.kirchhoff;
    check(k.junctions.length === 2 && k.branches.length === 3 && k.loops.length === 2, 'J ' + k.junctions.length + ' B ' + k.branches.length + ' L ' + k.loops.length);
    k.loops.forEach(l => approx(l.sumE, l.sumIR, 1e-9));
    k.junctions.forEach(j => approx(j.ins.reduce((s, b) => s + k.branches[b].I, 0), j.outs.reduce((s, b) => s + k.branches[b].I, 0), 1e-9));
  },
  'builder: unbalanced bridge does not reduce; Kirchhoff loops balance; matches nodal hand solution': () => {
    // 6 V; top branch 10 Ω, 20 Ω; bottom 30 Ω, 10 Ω; 10 Ω between the midpoints
    const parts = B.build([P('res', 2, 1, 'h', { R: 10 }), P('res', 5, 1, 'h', { R: 20 }), P('res', 2, 3, 'h', { R: 30 }), P('res', 5, 3, 'h', { R: 10 }), P('res', 4, 1, 'v', { R: 10 }), P('cell', 4, 5, 'h', { E: 6 })],
      [[[1, 1], [7, 1]], [[1, 3], [7, 3]], [[1, 1], [1, 5], [7, 5], [7, 1]], [[4, 1], [4, 3]]]);
    const r = B.analyse(parts); check(!r.fatal, r.fatal);
    check(!r.method.reduce, 'a bridge is not series-parallel'); const k = r.method.kirchhoff;
    check(k.loops.length === 3, 'three independent loops'); k.loops.forEach(l => approx(l.sumE, l.sumIR, 1e-9));
    // nodal: left node 6 V (cell + at left), right 0 V: (6 − a)/10 = a/20 + (a − b)/10 ; (6 − b)/30 + (a − b)/10 = b/10
    // ⇒ 5a − 2b = 12 ; −3a + 7b = 6 ⇒ a = 96/29, b = 66/29; I(bridge) = (a − b)/10 = 3/29
    approx(Math.abs(r.parts[4].I), 3 / 29, 1e-9);
  },
  'builder: voltmeter across 2 kΩ in a 1 kΩ + 2 kΩ divider: ideal 6 V, 2 kΩ meter 4.5 V': () => {
    const mk = (Rv) => B.build([P('cell', 1, 2, 'v', { E: 9 }), P('res', 5, 1, 'v', { R: 1000 }), P('res', 5, 3, 'v', { R: 2000 }), P('volt', 7, 3, 'v', { R: Rv })],
      [[[1, 0], [5, 0], [5, 5], [1, 5], [1, 0]], [[5, 3], [7, 3]], [[5, 4], [7, 4]]]);
    const a = B.analyse(mk(0)), b = B.analyse(mk(2000));
    approx(a.parts[3].reading, 6, 1e-9); approx(b.parts[3].reading, 4.5, 1e-9);
    check(a.method.reduce && a.method.reduce.Rext === 3000, 'ideal voltmeter draws no current');
    check(!has(a, /in series/), 'correctly placed voltmeter is not flagged');
  },
  'builder: swapped meters ⇒ voltmeter in series and ammeter in parallel are reported': () => {
    const parts = B.build([P('cell', 3, 1, 'h', { E: 6 }), P('volt', 5, 1, 'h'), P('res', 7, 2, 'v', { R: 10 }), P('amm', 5, 2, 'v')],
      [RECT, [[7, 2], [5, 2]], [[7, 3], [5, 3]]]);
    const r = B.analyse(parts); check(!r.fatal, r.fatal);
    check(has(r, /V₁ is in series/), 'voltmeter in series'); check(has(r, /parallel with R₁/), 'ammeter in parallel');
    approx(r.parts[1].reading, 6, 1e-9); check(r.openCircuit, 'no current');
  },
  'builder: open switch ⇒ open circuit; voltmeter across the switch reads the e.m.f.': () => {
    const parts = B.build([P('cell', 3, 1, 'h', { E: 6 }), P('switch', 4, 4, 'h', { on: 0 }), P('lamp', 7, 2, 'v', { R: 12 }), P('volt', 4, 5, 'h')],
      [RECT, [[4, 4], [4, 5]], [[5, 4], [5, 5]]]);
    const r = B.analyse(parts);
    check(r.openCircuit && has(r, /S₁ is open/), 'open circuit explained'); approx(r.parts[3].reading, 6, 1e-9);
    check(!has(r, /in series/), 'voltmeter across an open switch is in parallel with it');
    parts[1].v.on = 1; const c = B.analyse(parts); approx(Math.abs(c.parts[2].I), 0.5, 1e-9); approx(c.parts[3].reading, 0, 1e-9);
  },
  'builder: wire across an ideal cell is fatal; with r = 0.5 Ω, I = E/r = 12 A': () => {
    const parts = B.build([P('cell', 3, 1, 'h', { E: 6 }), P('res', 7, 2, 'v', { R: 10 })], [RECT, [[3, 1], [3, 2], [4, 2], [4, 1]]]);
    check(B.analyse(parts).fatal, 'ideal cell shorted');
    parts[0].v.r = 0.5; const r = B.analyse(parts); check(!r.fatal);
    approx(r.parts[0].Iout, 12, 1e-9); approx(r.parts[1].I, 0, 1e-9); check(has(r, /Short circuit across E₁/));
  },
  'builder: diode 0.7 V forward ⇒ I = (6 − 0.7)/100; reversed ⇒ off, no current': () => {
    const parts = B.build([P('cell', 3, 1, 'h', { E: 6 }, true), P('diode', 5, 1, 'h'), P('res', 7, 2, 'v', { R: 100 })], [RECT]);
    // cell + at its right end (rev), current leaves rightwards through the diode (anode at its left end)
    let r = B.analyse(parts); approx(Math.abs(r.parts[2].I), 0.053, 1e-9); check(r.parts[1].on);
    const k = r.method.kirchhoff; check(k && k.loops.length === 1); approx(k.loops[0].sumE, k.loops[0].sumIR, 1e-9);
    parts[1].rev = true; r = B.analyse(parts); check(!r.parts[1].on && r.openCircuit && has(r, /reverse-biased/), 'reverse biased');
    parts[1].rev = false; parts[1].v.Vf = 0; r = B.analyse(parts); approx(Math.abs(r.parts[2].I), 0.06, 1e-9);
  },
  'builder: 3 A fuse with 6 V across 1 Ω blows ⇒ open circuit': () => {
    const parts = B.build([P('cell', 3, 1, 'h', { E: 6 }), P('fuse', 5, 1, 'h', { max: 3 }), P('res', 7, 2, 'v', { R: 1 })], [RECT]);
    const r = B.analyse(parts); check(r.parts[1].blown && has(r, /has blown/), 'fuse blown'); approx(r.parts[2].I, 0, 1e-9);
    parts[2].v.R = 4; const ok = B.analyse(parts); check(!ok.parts[1].blown); approx(Math.abs(ok.parts[1].I), 1.5, 1e-9);
  },
  'builder: loose end and floating part are reported; two separate wire paths share current': () => {
    const parts = B.build([P('cell', 3, 1, 'h', { E: 6 }), P('res', 7, 2, 'v', { R: 10 }), P('res', 0, 0, 'h', { R: 5 })], [RECT, [[1, 4], [1, 5], [7, 5], [7, 4]]]);
    const r = B.analyse(parts);
    check(has(r, /Loose end/) && has(r, /R₂ is not connected to any cell/), 'diagnostics');
    approx(Math.abs(r.parts[1].I), 0.6, 1e-9);
    // currents into each dot from all parts sum to zero (wires included)
    const inflow = {};
    parts.forEach((p, i) => { const e = B.ends(p), I = r.parts[i].I; const a = B.dkey(...e[0]), b = B.dkey(...e[1]); inflow[a] = (inflow[a] || 0) - I; inflow[b] = (inflow[b] || 0) + I; });
    Object.values(inflow).forEach(v => approx(v, 0, 1e-9));
  },
  'builder: share string round-trips': () => {
    const parts = B.build([P('cell', 3, 1, 'h', { E: 1.5, r: 0.25 }, true), P('volt', 5, 1, 'h', { R: 10000 }), P('therm', 7, 2, 'v'), P('switch', 4, 4, 'h', { on: 0 })], [RECT]);
    const s = B.encode(parts), back = B.decode(s);
    check(back.length === parts.length && B.encode(back) === s, s);
    check(back[0].rev && back[0].v.r === 0.25 && back[3].v.on === 0);
    check(B.decode('junk~R99.1h~Q1.1h').length === 0, 'bad tokens are ignored');
  }
};
