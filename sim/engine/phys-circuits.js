/* SIM.circuits — 9702 topic 9 Electricity and topic 10 D.C. circuits (2025–27 syllabus).
   9.1 Q = It, quantised charge, I = Anvq; 9.2 V = W/Q, P = VI = I²R = V²/R; 9.3 V = IR, R = ρL/A, I–V characteristics
   (illustrative model curves for the lamp, diode, NTC thermistor and LDR: SHAPES are the syllabus content);
   10.1 e.m.f. and internal resistance; 10.2 Kirchhoff's laws (general nodal solver); 10.3 potential divider, potentiometer.
   Units: SI (A, V, Ω, m, s). Pure functions, no DOM. */
(function (root, f) {
  var m = f(typeof require === 'function' && typeof module === 'object' ? require('../core/util.js') : root.SIM.util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).circuits = m;
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';
  var E_CHARGE = 1.60e-19; // data sheet: elementary charge

  /* ================= 9.1 – 9.3 basic relations ================= */
  function charge(I, t) { return I * t; }                                  // Q = It
  function carriers(Q, q) { return Q / (q || E_CHARGE); }                  // number of charge carriers
  function area(d) { return Math.PI * d * d / 4; }                         // A = πd²/4
  function driftSpeed(I, n, A, q) { var den = A * n * (q || E_CHARGE); return den > 0 ? I / den : Infinity; } // I = Anvq
  function resistivityR(rho, L, A) { return A > 0 ? rho * L / A : Infinity; } // R = ρL/A
  function power(V, I) { return V * I; }

  /* ================= 9.3 illustrative I–V models ================= */
  /* These are model curves with the correct SHAPE (what the syllabus asks students to sketch / explain).
     Numbers read from them are like numbers read from an exam graph: valid for this curve only. */
  var IV = {
    /** metallic conductor at constant temperature: ohmic, I = V/R */
    metal: function (V, p) { return V / p.R; },
    /** filament lamp: R = R₀(1 + c|V|) rises with current because the filament gets hotter */
    lamp: function (V, p) { return V / (p.R0 * (1 + p.c * Math.abs(V))); },
    lampR: function (V, p) { return p.R0 * (1 + p.c * Math.abs(V)); },
    /** semiconductor diode: I = I_s (e^{V/V_T'} − 1); conducts noticeably only above about 0.6 V forward */
    diode: function (V, p) { var x = Math.min(V, 1.2) / p.VT; return p.Is * (Math.exp(x) - 1); },
    /** NTC thermistor: R decreases as temperature increases (model R = R₂₅ exp(B(1/T − 1/298.15))) */
    thermistorR: function (Tc, p) { var T = Tc + 273.15; return p.R25 * Math.exp(p.B * (1 / T - 1 / 298.15)); },
    /** LDR: R decreases as light intensity increases (model R = R_dark / (1 + k·L^0.8), L in arbitrary units) */
    ldrR: function (L, p) { return p.Rdark / (1 + p.k * Math.pow(Math.max(0, L), 0.8)); }
  };
  var IV_DEFAULTS = {
    metal: { R: 6 },
    lamp: { R0: 1.5, c: 0.25 },            // 12 V, 2 A lamp: hot R = 6 Ω, cold R = 1.5 Ω
    diode: { Is: 5e-9, VT: 0.1 / Math.LN10 }, // ×10 current per 0.1 V; I ≈ 5 mA at 0.6 V
    thermistor: { R25: 10000, B: 3950 },
    ldr: { Rdark: 1e6, k: 25 }
  };

  /* ================= 10.1 e.m.f. and internal resistance ================= */
  /** cell (E, r) driving external R. R = Infinity means open circuit. */
  function cell(E, r, R) {
    if (R === Infinity) return { I: 0, V: E, lost: 0, Pext: 0, Pint: 0, Ptot: 0 };
    var tot = R + r;
    if (!(tot > 0)) return { invalid: 'Short circuit with an ideal cell (R + r = 0): the current would be unlimited' };
    var I = E / tot;
    return { I: I, V: I * R, lost: I * r, Pext: I * I * R, Pint: I * I * r, Ptot: E * I };
  }
  /** E and r from two (I, V) readings: V = E − Ir */
  function fromTwoReadings(I1, V1, I2, V2) {
    if (Math.abs(I1 - I2) < 1e-12) return null;
    var r = (V1 - V2) / (I2 - I1);
    return { r: r, E: V1 + I1 * r };
  }

  /* ================= 10.2 combinations ================= */
  function series(list) { return list.reduce(function (s, R) { return s + R; }, 0); }
  function parallel(list) {
    if (list.some(function (R) { return R <= 0; })) return 0;
    var g = list.reduce(function (s, R) { return s + 1 / R; }, 0);
    return g > 0 ? 1 / g : Infinity;
  }

  /* ================= general nodal (MNA) solver ================= */
  /**
   * net = {n: number of nodes (node 0 is the reference, 0 V), elements: [...]}
   *  {id, type: 'R', a, b, R}                 resistor; R ≤ 1e-9 Ω is treated as an ideal wire / ammeter
   *  {id, type: 'E', a: + terminal, b: − terminal, E, r}   cell with internal resistance r ≥ 0
   * Element current I is from a to b through a resistor; for a cell it is the current OUT of its + terminal
   * (i.e. from b to a inside the cell; negative ⇒ the cell is being charged).
   * Returns {V:[...], I:{id: current}, P:{id: power dissipated (R, internal r) / supplied (EI)}, Vab:{id}} or {error}.
   */
  function solve(net) {
    var n = net.n, els = net.elements, srcIdx = {}, m = 0;
    els.forEach(function (e) {
      if (e.type === 'E' || (e.type === 'R' && !(e.R > 1e-9))) srcIdx[e.id] = (n - 1) + (m++);
    });
    var N = (n - 1) + m;
    if (N === 0) return { error: 'Empty circuit' };
    var A = [], b = [], i, j;
    for (i = 0; i < N; i++) { A.push(new Array(N).fill(0)); b.push(0); }
    function vi(node) { return node - 1; } // row/col of node voltage (node 0 is reference)
    els.forEach(function (e) {
      var a = e.a, c = e.b;
      if (srcIdx[e.id] === undefined) { // resistor
        var G = 1 / e.R;
        if (a > 0) A[vi(a)][vi(a)] += G;
        if (c > 0) A[vi(c)][vi(c)] += G;
        if (a > 0 && c > 0) { A[vi(a)][vi(c)] -= G; A[vi(c)][vi(a)] -= G; }
      } else {
        var k = srcIdx[e.id], E = e.type === 'E' ? e.E : 0, r = e.type === 'E' ? (e.r || 0) : 0;
        // current k leaves the source at a (enters node a from the source) and returns at b
        if (a > 0) A[vi(a)][k] -= 1;
        if (c > 0) A[vi(c)][k] += 1;
        // Va − Vb + r I = E
        if (a > 0) A[k][vi(a)] += 1;
        if (c > 0) A[k][vi(c)] -= 1;
        A[k][k] += r; b[k] = E;
      }
    });
    var x = U.gauss(A, b);
    if (!x || x.some(function (v) { return !isFinite(v); })) return { error: 'This circuit has no unique solution: an ideal cell is short-circuited, two ideal cells are in parallel, or part of the circuit is not connected' };
    var V = [0]; for (i = 1; i < n; i++) V.push(x[vi(i)]);
    var I = {}, P = {}, Vab = {};
    els.forEach(function (e) {
      var vab = V[e.a] - V[e.b]; Vab[e.id] = vab;
      if (srcIdx[e.id] === undefined) { I[e.id] = vab / e.R; P[e.id] = I[e.id] * I[e.id] * e.R; return; }
      // the branch unknown k enters node a from the branch and leaves node b into it: k flows b → a inside the branch
      var k = x[srcIdx[e.id]];
      if (e.type === 'E') { I[e.id] = k; P[e.id] = e.E * k; P[e.id + ':r'] = k * k * (e.r || 0); } // current out of + terminal
      else { I[e.id] = -k; P[e.id] = 0; }                                                     // wire: current a → b
    });
    return { V: V, I: I, P: P, Vab: Vab };
  }

  /**
   * Kirchhoff checks for a solved network.
   * junctions: for every node with ≥ 3 connections: currents into the node (signed), sum ≈ 0.
   * loops: given loops [{name, path:[{id, s}]}], s = +1 traverses the element from a to b, −1 from b to a.
   *  ΣE (e.m.f. terms) = Σ IR (p.d. terms), from Σ(potential drops) = 0.
   */
  function kirchhoff(net, sol, loops) {
    var byId = {}; net.elements.forEach(function (e) { byId[e.id] = e; });
    var deg = new Array(net.n).fill(0);
    net.elements.forEach(function (e) { deg[e.a]++; deg[e.b]++; });
    var junctions = [];
    for (var nd = 0; nd < net.n; nd++) {
      if (deg[nd] < 3) continue;
      var terms = [];
      net.elements.forEach(function (e) {
        var I = sol.I[e.id], into;
        if (e.type === 'E') { if (e.a === nd) into = I; else if (e.b === nd) into = -I; else return; }
        else { if (e.b === nd) into = I; else if (e.a === nd) into = -I; else return; }
        terms.push({ id: e.id, into: into });
      });
      junctions.push({ node: nd, terms: terms, sum: terms.reduce(function (s, t) { return s + t.into; }, 0) });
    }
    var L = (loops || []).map(function (lp) {
      var emf = [], ir = [];
      lp.path.forEach(function (st) {
        var e = byId[st.id]; if (!e) return; var I = sol.I[e.id];
        if (e.type === 'E') {
          emf.push({ id: e.id, val: -st.s * e.E });
          if (e.r > 0) ir.push({ id: e.id + ':r', val: -st.s * I * e.r, I: -st.s * I, R: e.r });
        } else if (e.R > 1e-9) ir.push({ id: e.id, val: st.s * I * e.R, I: st.s * I, R: e.R });
      });
      return { name: lp.name, emf: emf, ir: ir,
        sumE: emf.reduce(function (s, t) { return s + t.val; }, 0), sumIR: ir.reduce(function (s, t) { return s + t.val; }, 0) };
    });
    return { junctions: junctions, loops: L };
  }

  /**
   * Template networks used by the p10-circuits page. Node 0 = negative terminal of the (first) cell = 0 V.
   * p: {E, r, R1, R2, R3, R4, E2, r2, polarity2: 'aid'|'oppose', meter: bool, Rv}
   * Returns {n, elements, loops, nodeNames, Rext (equivalent external resistance, where defined)}.
   */
  function template(name, p) {
    var el = [], loops = [], n, Rext = null;
    var cellEl = { id: 'E1', type: 'E', a: 1, b: 0, E: p.E, r: p.r };
    if (name === 'series') {
      // cell + → node1 → R1 → node2 → R2 → node3 → R3 → node0 (−). Optional voltmeter (resistance Rv) across R2.
      n = 4; el = [cellEl, { id: 'R1', type: 'R', a: 1, b: 2, R: p.R1 }, { id: 'R2', type: 'R', a: 2, b: 3, R: p.R2 }, { id: 'R3', type: 'R', a: 3, b: 0, R: p.R3 }];
      loops.push({ name: 'Main loop', path: [{ id: 'E1', s: -1 }, { id: 'R1', s: 1 }, { id: 'R2', s: 1 }, { id: 'R3', s: 1 }] });
      if (p.meter) {
        el.push({ id: 'V', type: 'R', a: 2, b: 3, R: p.Rv });
        loops.push({ name: 'Loop through the voltmeter', path: [{ id: 'E1', s: -1 }, { id: 'R1', s: 1 }, { id: 'V', s: 1 }, { id: 'R3', s: 1 }] });
        Rext = p.R1 + parallel([p.R2, p.Rv]) + p.R3;
      } else Rext = p.R1 + p.R2 + p.R3;
    } else if (name === 'parallel') {
      n = 2; el = [cellEl, { id: 'R1', type: 'R', a: 1, b: 0, R: p.R1 }, { id: 'R2', type: 'R', a: 1, b: 0, R: p.R2 }, { id: 'R3', type: 'R', a: 1, b: 0, R: p.R3 }];
      loops.push({ name: 'Loop through R1', path: [{ id: 'E1', s: -1 }, { id: 'R1', s: 1 }] });
      loops.push({ name: 'Loop through R2', path: [{ id: 'E1', s: -1 }, { id: 'R2', s: 1 }] });
      loops.push({ name: 'Loop R1 → R2 (no cell)', path: [{ id: 'R1', s: 1 }, { id: 'R2', s: -1 }] });
      Rext = parallel([p.R1, p.R2, p.R3]);
    } else if (name === 'mixed') {
      // R1 in series with (R2 ∥ R3)
      n = 3; el = [cellEl, { id: 'R1', type: 'R', a: 1, b: 2, R: p.R1 }, { id: 'R2', type: 'R', a: 2, b: 0, R: p.R2 }, { id: 'R3', type: 'R', a: 2, b: 0, R: p.R3 }];
      loops.push({ name: 'Loop through R1 and R2', path: [{ id: 'E1', s: -1 }, { id: 'R1', s: 1 }, { id: 'R2', s: 1 }] });
      loops.push({ name: 'Loop through R1 and R3', path: [{ id: 'E1', s: -1 }, { id: 'R1', s: 1 }, { id: 'R3', s: 1 }] });
      Rext = p.R1 + parallel([p.R2, p.R3]);
    } else if (name === 'branches') {
      // two parallel branches: (R1 then R2) and (R3 then R4); midpoints are nodes 2 and 3
      n = 4; el = [cellEl, { id: 'R1', type: 'R', a: 1, b: 2, R: p.R1 }, { id: 'R2', type: 'R', a: 2, b: 0, R: p.R2 },
        { id: 'R3', type: 'R', a: 1, b: 3, R: p.R3 }, { id: 'R4', type: 'R', a: 3, b: 0, R: p.R4 }];
      loops.push({ name: 'Loop through R1, R2', path: [{ id: 'E1', s: -1 }, { id: 'R1', s: 1 }, { id: 'R2', s: 1 }] });
      loops.push({ name: 'Loop through R3, R4', path: [{ id: 'E1', s: -1 }, { id: 'R3', s: 1 }, { id: 'R4', s: 1 }] });
      Rext = parallel([p.R1 + p.R2, p.R3 + p.R4]);
    } else if (name === 'twocells') {
      // three branches between top node T (= 1) and bottom node 0:
      //  left:   E1 (+ at node 2) then R1 from node 2 up to T;  middle: E2 (+ at node 3 if aiding) then R2 up to T;  right: R3 from T to 0
      n = 4;
      var aid = p.polarity2 !== 'oppose';
      el = [{ id: 'E1', type: 'E', a: 2, b: 0, E: p.E, r: p.r }, { id: 'R1', type: 'R', a: 2, b: 1, R: p.R1 },
        aid ? { id: 'E2', type: 'E', a: 3, b: 0, E: p.E2, r: p.r2 } : { id: 'E2', type: 'E', a: 0, b: 3, E: p.E2, r: p.r2 },
        { id: 'R2', type: 'R', a: 3, b: 1, R: p.R2 }, { id: 'R3', type: 'R', a: 1, b: 0, R: p.R3 }];
      var s2 = aid ? -1 : 1; // traversing the middle branch upwards (node 0 → node 3)
      loops.push({ name: 'Left loop (E1, R1, R3)', path: [{ id: 'E1', s: -1 }, { id: 'R1', s: 1 }, { id: 'R3', s: 1 }] });
      loops.push({ name: 'Middle loop (E2, R2, R3)', path: [{ id: 'E2', s: s2 }, { id: 'R2', s: 1 }, { id: 'R3', s: 1 }] });
      loops.push({ name: 'Outer loop (E1, R1, R2, E2)', path: [{ id: 'E1', s: -1 }, { id: 'R1', s: 1 }, { id: 'R2', s: -1 }, { id: 'E2', s: -s2 }] });
    } else return null;
    return { n: n, elements: el, loops: loops, Rext: Rext };
  }

  /* ================= 10.3 potential divider and potentiometer ================= */
  /** V_out across the lower resistor R2 (optionally loaded by RL in parallel); ideal supply */
  function divider(Vin, R1, R2, RL) {
    var R2e = RL !== undefined && RL !== null && isFinite(RL) ? parallel([R2, RL]) : R2;
    var tot = R1 + R2e;
    if (!(tot > 0)) return { invalid: 'R1 + R2 = 0: the supply is short-circuited' };
    var I = Vin / tot;
    return { R2eff: R2e, I: I, Vout: I * R2e, V1: I * R1 };
  }
  /**
   * Potentiometer: driver cell (E0, r0) + series resistor Rs + uniform wire (resistance Rw, length L).
   * Test cell (Ex, rx) with + to the same end A as the driver's +, − via galvanometer (Rg) to the jockey at distance x from A.
   * Returns wire p.d., potential gradient k (V per metre), balance length, galvanometer current at x (+ ⇒ from jockey into the
   * test-cell branch… reported as signed I from the jockey towards the galvanometer/test cell).
   */
  function potentiometer(p) {
    var tot = p.r0 + p.Rs + p.Rw;
    if (!(tot > 0)) return { invalid: 'Driver cell is short-circuited (r + R_s + R_wire = 0)' };
    if (!(p.L > 0)) return { invalid: 'Wire length must be greater than zero' };
    var Iw = p.E0 / tot, Vw = Iw * p.Rw, k = Vw / p.L;
    var bal = k > 0 ? p.Ex / k : Infinity;
    var res = { Iwire: Iw, Vwire: Vw, k: k, balance: bal, hasBalance: k > 0 && bal <= p.L + 1e-12 && p.Ex >= 0 };
    if (p.x !== undefined) {
      var x = U.clamp(p.x, 0, p.L), Rleft = p.Rw * x / p.L, Rright = p.Rw - Rleft;
      // nodes: 0 = B (wire end, driver −), 1 = driver + , 2 = A (wire start), 3 = jockey J, 4 = test-cell − terminal
      var net = { n: 5, elements: [
        { id: 'E0', type: 'E', a: 1, b: 0, E: p.E0, r: p.r0 }, { id: 'Rs', type: 'R', a: 1, b: 2, R: p.Rs },
        { id: 'AJ', type: 'R', a: 2, b: 3, R: Rleft }, { id: 'JB', type: 'R', a: 3, b: 0, R: Rright },
        { id: 'Ex', type: 'E', a: 2, b: 4, E: p.Ex, r: p.rx }, { id: 'G', type: 'R', a: 3, b: 4, R: p.Rg }] };
      var sol = solve(net);
      if (sol.error) res.galvError = sol.error;
      else { res.Ig = sol.I.G; res.VAJ = sol.V[2] - sol.V[3]; res.Itest = sol.I.Ex; }
    }
    return res;
  }
  /** comparing e.m.f.s with a potentiometer: E1/E2 = l1/l2 */
  function compareEmf(Es, ls, lx) { return ls > 0 ? Es * lx / ls : NaN; }

  return { E_CHARGE: E_CHARGE, charge: charge, carriers: carriers, area: area, driftSpeed: driftSpeed, resistivityR: resistivityR, power: power,
    IV: IV, IV_DEFAULTS: IV_DEFAULTS, cell: cell, fromTwoReadings: fromTwoReadings, series: series, parallel: parallel,
    solve: solve, kirchhoff: kirchhoff, template: template, divider: divider, potentiometer: potentiometer, compareEmf: compareEmf };
});
