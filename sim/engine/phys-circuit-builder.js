/* SIM.cbuild — circuit builder for 9702 topics 9–10: parts placed on the edges of a dot grid.
   A part sits on one grid edge, from end a = (x, y) to end b = (x + 1, y) ('h') or (x, y + 1) ('v').
   analyse() turns the drawing into a netlist, solves it with the MNA solver in SIM.circuits, and returns
   per-part I, V, P, plain-words diagnostics, and the data for a step-by-step method:
     - series / parallel reduction (one cell, no diodes), or
     - Kirchhoff's laws (branch currents, junction equations, independent loops).
   Wires, closed switches, ideal ammeters and fuses are zero-resistance links: the dots they join form one
   node ("net"). Currents in the links are found afterwards from the currents entering each dot.
   Diodes: ideal (0 V) or a fixed 0.7 V forward drop, found by switching each diode on / off until consistent.
   Units: SI. Pure functions, no DOM. */
(function (root, f) {
  var node = typeof require === 'function' && typeof module === 'object';
  var m = f(node ? require('../core/util.js') : root.SIM.util, node ? require('./phys-circuits.js') : root.SIM.circuits);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).cbuild = m;
})(typeof self !== 'undefined' ? self : this, function (U, CI) {
  'use strict';
  var W = 9, H = 6;          // grid of dots: x = 0 … W − 1, y = 0 … H − 1 (y down)
  var EPS = 1e-12;

  /* vals: the numbers stored for each type, in the order they are written to the share string */
  var TYPES = {
    wire: { code: 'w', label: 'Wire', vals: [], def: {} },
    cell: { code: 'E', label: 'Cell', vals: ['E', 'r'], def: { E: 6, r: 0 }, polar: true, fam: 'E' },
    battery: { code: 'B', label: 'Battery', vals: ['E', 'r'], def: { E: 12, r: 0 }, polar: true, fam: 'E' },
    res: { code: 'R', label: 'Resistor', vals: ['R'], def: { R: 10 }, fam: 'R' },
    var: { code: 'X', label: 'Variable resistor', vals: ['R'], def: { R: 20 }, fam: 'R' },
    lamp: { code: 'L', label: 'Lamp', vals: ['R'], def: { R: 12 }, fam: 'L' },
    switch: { code: 'S', label: 'Switch', vals: ['on'], def: { on: 1 }, fam: 'S' },
    amm: { code: 'A', label: 'Ammeter', vals: ['R'], def: { R: 0 }, fam: 'A' },
    volt: { code: 'V', label: 'Voltmeter', vals: ['R'], def: { R: 0 }, fam: 'V' },
    therm: { code: 'T', label: 'Thermistor', vals: [], def: {}, fam: 'Th' },
    ldr: { code: 'G', label: 'LDR', vals: [], def: {}, fam: 'LDR' },
    diode: { code: 'D', label: 'Diode', vals: ['Vf'], def: { Vf: 0.7 }, polar: true, fam: 'D' },
    fuse: { code: 'F', label: 'Fuse', vals: ['max'], def: { max: 3 }, fam: 'F' }
  };
  var CODE = {}; Object.keys(TYPES).forEach(function (k) { CODE[TYPES[k].code] = k; });

  /* ---------------- geometry ---------------- */
  function isFree(p) { return p && p.x1 !== undefined; }
  function endB(p) { return isFree(p) ? [p.x2, p.y2] : (p.d === 'h' ? [p.x + 1, p.y] : [p.x, p.y + 1]); }
  function ends(p) { return isFree(p) ? [[p.x1, p.y1], [p.x2, p.y2]] : [[p.x, p.y], endB(p)]; }
  function dkey(x, y) {
    if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < W && y >= 0 && y < H) return y * W + x;
    return 'f:' + Math.round(x * 100) + ',' + Math.round(y * 100);
  }
  function coordsOfKey(k) {
    if (typeof k === 'string' && k.indexOf('f:') === 0) {
      var pts = k.slice(2).split(',');
      return [Number(pts[0]) / 100, Number(pts[1]) / 100];
    }
    var n = Number(k);
    return [n % W, Math.floor(n / W)];
  }
  function ekey(p) {
    if (isFree(p)) return p.t + ':' + Math.round(p.x1 * 100) + ',' + Math.round(p.y1 * 100) + '>' + Math.round(p.x2 * 100) + ',' + Math.round(p.y2 * 100);
    return p.x + '.' + p.y + p.d;
  }
  function inGrid(x, y, d) { return x >= 0 && y >= 0 && (d === 'h' ? x + 1 < W && y < H : x < W && y + 1 < H); }
  function make(t, x, y, d, vals, rev) {
    var T = TYPES[t], v = {};
    Object.keys(T.def).forEach(function (k) { v[k] = T.def[k]; });
    if (vals) Object.keys(vals).forEach(function (k) { v[k] = vals[k]; });
    return { t: t, x: x, y: y, d: d, v: v, rev: !!rev };
  }
  function makeFree(t, x1, y1, x2, y2, vals, rev) {
    var T = TYPES[t], v = {};
    Object.keys(T.def).forEach(function (k) { v[k] = T.def[k]; });
    if (vals) Object.keys(vals).forEach(function (k) { v[k] = vals[k]; });
    return { t: t, x1: Number(x1.toFixed(2)), y1: Number(y1.toFixed(2)), x2: Number(x2.toFixed(2)), y2: Number(y2.toFixed(2)), v: v, rev: !!rev };
  }
  /** the unit edges along an axis-aligned polyline [[x, y], …] */
  function edgesOf(pts) {
    var out = [];
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      if (a[1] === b[1]) for (var x = Math.min(a[0], b[0]); x < Math.max(a[0], b[0]); x++) out.push({ x: x, y: a[1], d: 'h' });
      else if (a[0] === b[0]) for (var y = Math.min(a[1], b[1]); y < Math.max(a[1], b[1]); y++) out.push({ x: a[0], y: y, d: 'v' });
    }
    return out;
  }
  /** parts plus plain wires on every edge of the polylines that is not already taken */
  function build(parts, polylines) {
    var taken = {}, out = parts.slice();
    parts.forEach(function (p) { taken[ekey(p)] = 1; });
    (polylines || []).forEach(function (pl) {
      edgesOf(pl).forEach(function (e) { var k = e.x + '.' + e.y + e.d; if (!taken[k]) { taken[k] = 1; out.push(make('wire', e.x, e.y, e.d)); } });
    });
    return out;
  }

  /* ---------------- share string: "R2.1h_10~E3.0h_6_0.5_r~w1.1v" or free "R1.5,2.3>4.1,2.3_10" ---------------- */
  function fmtN(v) { return String(Number(Number(v).toPrecision(6))); }
  function encode(parts) {
    return parts.map(function (p) {
      var T = TYPES[p.t];
      var s = isFree(p) ? (T.code + fmtN(p.x1) + ',' + fmtN(p.y1) + '>' + fmtN(p.x2) + ',' + fmtN(p.y2)) : (T.code + p.x + '.' + p.y + p.d);
      T.vals.forEach(function (k) { s += '_' + fmtN(p.v[k]); });
      return s + (p.rev ? '_r' : '');
    }).join('~');
  }
  function decode(str) {
    var out = [], at = {};
    String(str || '').split('~').forEach(function (tok) {
      var q = tok.split('_');
      var mf = /^([A-Za-z])(-?[\d.]+),(-?[\d.]+)>(-?[\d.]+),(-?[\d.]+)$/.exec(q[0]);
      var m = !mf && /^([A-Za-z])(\d+)\.(\d+)([hv])$/.exec(q[0]);
      var p = null;
      if (mf && CODE[mf[1]]) {
        p = makeFree(CODE[mf[1]], Number(mf[2]), Number(mf[3]), Number(mf[4]), Number(mf[5]));
      } else if (m && CODE[m[1]]) {
        var t = CODE[m[1]], x = Number(m[2]), y = Number(m[3]), d = m[4];
        if (!inGrid(x, y, d)) return;
        p = make(t, x, y, d);
      } else return;
      var T = TYPES[p.t], vi = 0;
      q.slice(1).forEach(function (z) {
        if (z === 'r') p.rev = true;
        else if (z !== '' && isFinite(Number(z)) && vi < T.vals.length) p.v[T.vals[vi++]] = Math.max(0, Number(z));
      });
      var k = ekey(p);
      if (at[k] !== undefined) out[at[k]] = p; else { at[k] = out.length; out.push(p); }
    });
    return out;
  }

  /* ---------------- names: R₁, R₂, E₁, A₁ … ---------------- */
  function sub(n) { return String(n).replace(/\d/g, function (d) { return '₀₁₂₃₄₅₆₇₈₉'[Number(d)]; }); }
  function names(parts) {
    var cnt = {};
    return parts.map(function (p) { var f = TYPES[p.t].fam; if (!f) return ''; cnt[f] = (cnt[f] || 0) + 1; return f + sub(cnt[f]); });
  }
  /** internal-resistance symbol that goes with a cell name: E₂ → r₂ */
  function rName(cellName) { return 'r' + String(cellName).replace(/^E/, ''); }

  function isSource(p) { return p.t === 'cell' || p.t === 'battery'; }
  function Vf(p) { return p.v.Vf > 0 ? p.v.Vf : 0; }
  /** resistance of a part (Ω); Infinity = no conduction (ideal voltmeter), 0 = zero-resistance link */
  function resistance(p, env) {
    env = env || {};
    switch (p.t) {
      case 'res': case 'var': case 'lamp': return Math.max(p.v.R, 1e-6);
      case 'therm': return CI.IV.thermistorR(env.T === undefined ? 25 : env.T, CI.IV_DEFAULTS.thermistor);
      case 'ldr': return CI.IV.ldrR(env.L === undefined ? 20 : env.L, CI.IV_DEFAULTS.ldr);
      case 'amm': return p.v.R > 0 ? p.v.R : 0;
      case 'volt': return p.v.R > 0 ? p.v.R : Infinity;
      default: return 0;
    }
  }
  var RESISTIVE = { res: 1, var: 1, lamp: 1, therm: 1, ldr: 1 };

  function UF() {
    var par = {};
    function find(a) { if (par[a] === undefined) par[a] = a; while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; }
    return { find: find, union: function (a, b) { a = find(a); b = find(b); if (a !== b) par[a] = b; } };
  }

  /* ================= analyse ================= */
  function analyse(parts, env) {
    env = env || {};
    var N = parts.length, nm = names(parts), E = parts.map(ends);
    var out = { names: nm, parts: parts.map(function () { return { I: 0, V: 0, P: 0 }; }), issues: [], fatal: null, method: null, dotDeg: {}, netOf: {}, netList: [], empty: !N };
    if (!N) return out;
    E.forEach(function (e) { e.forEach(function (q) { var k = dkey(q[0], q[1]); out.dotDeg[k] = (out.dotDeg[k] || 0) + 1; }); });
    var Rof = parts.map(function (p) { return resistance(p, env); });
    var diodeOn = parts.map(function (p) { return p.t === 'diode'; }), blown = parts.map(function () { return false; }), blowI = {};
    function link(i) { var p = parts[i]; return p.t === 'wire' || (p.t === 'switch' && p.v.on > 0) || (p.t === 'amm' && !(p.v.R > 0)) || (p.t === 'fuse' && !blown[i]); }

    function normKey(k) { return /^\d+$/.test(k) ? Number(k) : k; }
    function solveState() {
      var uf = UF(), dots = Object.keys(out.dotDeg).map(normKey);
      parts.forEach(function (p, i) { if (link(i)) uf.union(dkey(E[i][0][0], E[i][0][1]), dkey(E[i][1][0], E[i][1][1])); });
      var refDot = null;
      parts.forEach(function (p, i) { if (refDot === null && isSource(p)) { var mi = p.rev ? 0 : 1; refDot = dkey(E[i][mi][0], E[i][mi][1]); } });
      if (refDot === null) refDot = dots[0];
      var roots = {}, netList = [], netOf = {};
      function nid(k) { var r = uf.find(k); if (roots[r] === undefined) { roots[r] = netList.length; netList.push([]); } return roots[r]; }
      nid(refDot);
      dots.forEach(function (k) { netOf[k] = nid(k); netList[netOf[k]].push(k); });
      var M = netList.length;
      function na(i) { return netOf[dkey(E[i][0][0], E[i][0][1])]; }
      function nb(i) { return netOf[dkey(E[i][1][0], E[i][1][1])]; }
      var st = { netOf: netOf, netList: netList, M: M, na: na, nb: nb };
      for (var s = 0; s < N; s++) if (isSource(parts[s]) && na(s) === nb(s) && !(parts[s].v.r > 0)) { st.fatal = 'short'; st.shorted = s; return st; }
      var els = [];
      parts.forEach(function (p, i) {
        var a = na(i), b = nb(i);
        if (isSource(p)) els.push({ id: 'p' + i, type: 'E', a: p.rev ? b : a, b: p.rev ? a : b, E: p.v.E, r: p.v.r > 0 ? p.v.r : 0, i: i, kind: 'E' });
        else if (p.t === 'diode') { if (diodeOn[i] && a !== b) els.push({ id: 'p' + i, type: 'E', a: p.rev ? b : a, b: p.rev ? a : b, E: Vf(p), r: 0, i: i, kind: 'D' }); }
        else if ((RESISTIVE[p.t] || p.t === 'amm' || p.t === 'volt') && !link(i) && isFinite(Rof[i]) && Rof[i] > 0) els.push({ id: 'p' + i, type: 'R', a: a, b: b, R: Rof[i], i: i, kind: 'R' });
      });
      // every part of the drawing not conductively joined to the reference gets a 1 TΩ path to it, so it has a defined potential
      var cu = UF(); els.forEach(function (e) { cu.union(e.a, e.b); });
      var r0 = cu.find(0), seen = {};
      for (var n = 1; n < M; n++) { var rt = cu.find(n); if (rt === r0 || seen[rt]) continue; seen[rt] = 1; els.push({ id: 'g' + n, type: 'R', a: n, b: 0, R: 1e12, gmin: true }); }
      var sol = els.length ? CI.solve({ n: M, elements: els }) : { V: netList.map(function () { return 0; }), I: {} };
      if (sol.error) { st.fatal = 'singular'; return st; }
      var Iab = new Array(N).fill(0), Vab = parts.map(function (p, i) { return sol.V[na(i)] - sol.V[nb(i)]; });
      els.forEach(function (e) { if (e.gmin) return; var k = sol.I[e.id]; Iab[e.i] = e.type === 'R' ? k : (parts[e.i].rev ? k : -k); });
      // currents in the links of each net: flow from the dots where current enters to where it leaves
      var inj = {};
      parts.forEach(function (p, i) {
        if (link(i) || !Iab[i]) return;
        var ka = dkey(E[i][0][0], E[i][0][1]), kb = dkey(E[i][1][0], E[i][1][1]);
        inj[ka] = (inj[ka] || 0) - Iab[i]; inj[kb] = (inj[kb] || 0) + Iab[i];
      });
      var linksIn = netList.map(function () { return []; });
      parts.forEach(function (p, i) { if (link(i)) linksIn[na(i)].push(i); });
      netList.forEach(function (list, ni) {
        if (list.length < 2 || !linksIn[ni].length) return;
        var idx = {}; list.forEach(function (k, j) { idx[k] = j; });
        var n = list.length - 1, A = [], b = [];
        for (var r = 0; r < n; r++) { A.push(new Array(n).fill(0)); b.push(inj[list[r + 1]] || 0); }
        function g(i) { return parts[i].t === 'amm' ? 1e-3 : 1; }   // a plain wire carries current in preference to an ammeter
        linksIn[ni].forEach(function (i) {
          var p = idx[dkey(E[i][0][0], E[i][0][1])] - 1, q = idx[dkey(E[i][1][0], E[i][1][1])] - 1, G = g(i);
          if (p >= 0) A[p][p] += G; if (q >= 0) A[q][q] += G;
          if (p >= 0 && q >= 0) { A[p][q] -= G; A[q][p] -= G; }
        });
        var x = U.gauss(A, b); if (!x) return;
        var phi = [0].concat(x);
        linksIn[ni].forEach(function (i) { Iab[i] = g(i) * (phi[idx[dkey(E[i][0][0], E[i][0][1])]] - phi[idx[dkey(E[i][1][0], E[i][1][1])]]); });
      });
      st.els = els; st.sol = sol; st.Iab = Iab; st.Vab = Vab;
      return st;
    }

    var st;
    for (var iter = 0; iter < 80; iter++) {
      st = solveState(); if (st.fatal) break;
      // diodes: an "on" diode must carry forward current; an "off" diode must not have more than V_f across it
      var worst = -1, wv = 0;
      parts.forEach(function (p, i) {
        if (p.t !== 'diode') return;
        var sg = p.rev ? -1 : 1;
        if (diodeOn[i]) { var If = sg * st.Iab[i]; if (If < -1e-12 && -If > wv) { wv = -If; worst = i; } }
        else { var over = sg * st.Vab[i] - Vf(p); if (over > 1e-9 && over > wv) { wv = over; worst = i; } }
      });
      if (worst >= 0) { diodeOn[worst] = !diodeOn[worst]; continue; }
      var fz = -1, ratio = 1;
      parts.forEach(function (p, i) { if (p.t === 'fuse' && !blown[i]) { var q = Math.abs(st.Iab[i]) / Math.max(p.v.max, 1e-9); if (q > ratio * (1 + 1e-9)) { ratio = q; fz = i; } } });
      if (fz >= 0) { blown[fz] = true; blowI[fz] = Math.abs(st.Iab[fz]); continue; }
      break;
    }
    out.netOf = st.netOf; out.netList = st.netList;
    var na = st.na, nb = st.nb;
    function issue(kind, text, idx) { out.issues.push({ kind: kind, text: text, parts: idx || [] }); }
    function list(idx) { return idx.map(function (i) { return nm[i]; }).join(', '); }

    if (st.fatal) {
      if (st.fatal === 'short') {
        var s = st.shorted;
        out.fatal = 'Short circuit across ' + nm[s] + ': a zero-resistance path joins its two terminals. An ideal cell (r = 0) would drive an infinite current. Remove the wire / ammeter, add a resistor, or give the cell an internal resistance.';
        out.shorted = s;
      } else out.fatal = 'This circuit has no single answer: two ideal cells (r = 0) with different e.m.f.s are joined directly in parallel, or an ideal cell is shorted through a diode. Give the cells some internal resistance or add a resistor.';
      issue('warn', out.fatal, st.fatal === 'short' ? [st.shorted] : []);
      return out;
    }

    /* ---------- per-part results ---------- */
    parts.forEach(function (p, i) {
      var o = out.parts[i]; o.I = st.Iab[i]; o.V = st.Vab[i]; o.R = Rof[i]; o.link = link(i);
      if (isSource(p)) { var Io = p.rev ? st.Iab[i] : -st.Iab[i]; o.Iout = Io; o.E = p.v.E; o.r = p.v.r || 0; o.Vt = p.rev ? -st.Vab[i] : st.Vab[i]; o.P = p.v.E * Io; o.Pr = Io * Io * o.r; }
      else if (RESISTIVE[p.t] || ((p.t === 'amm' || p.t === 'volt') && isFinite(Rof[i]) && Rof[i] > 0)) o.P = o.I * o.I * Rof[i];
      if (p.t === 'diode') { o.on = diodeOn[i] && na(i) !== nb(i); o.P = Vf(p) * Math.abs(o.I); }
      if (p.t === 'amm') o.reading = Math.abs(o.I);
      if (p.t === 'volt') o.reading = Math.abs(o.V);
      if (p.t === 'fuse') o.blown = blown[i];
      if (Math.abs(o.I) < 1e-13) o.I = 0;
    });

    /* ---------- diagnostics ---------- */
    var srcIdx = [], netDeg = {}, pairOf = [];
    parts.forEach(function (p, i) {
      if (isSource(p)) srcIdx.push(i);
      if (!link(i)) { netDeg[na(i)] = (netDeg[na(i)] || 0) + 1; netDeg[nb(i)] = (netDeg[nb(i)] || 0) + 1; }
      pairOf.push(Math.min(na(i), nb(i)) + '-' + Math.max(na(i), nb(i)));
    });
    var named = function (i) { return parts[i].t !== 'wire'; };
    if (!srcIdx.length) issue('warn', 'There is no cell or battery, so nothing drives a current. Add a cell from the parts list.');
    // loose ends
    var loose = [];
    parts.forEach(function (p, i) { E[i].forEach(function (q) { if (out.dotDeg[dkey(q[0], q[1])] === 1 && loose.indexOf(i) < 0) loose.push(i); }); });
    out.looseDots = Object.keys(out.dotDeg).filter(function (k) { return out.dotDeg[k] === 1; }).map(normKey);
    if (loose.length) {
      var ln = loose.filter(named);
      issue('warn', 'Loose end' + (out.looseDots.length > 1 ? 's' : '') + ': ' + (ln.length ? list(ln) + (ln.length > 1 ? ' are' : ' is') + ' not joined at one end' : 'a wire stops at a dot with nothing else on it') + '. Current only flows round a complete loop.', loose);
    }
    // parts short-circuited by a wire or by an ideal ammeter
    var wuf = UF();
    parts.forEach(function (p, i) { if (p.t === 'wire' || (p.t === 'switch' && p.v.on > 0) || (p.t === 'fuse' && !blown[i])) wuf.union(dkey(E[i][0][0], E[i][0][1]), dkey(E[i][1][0], E[i][1][1])); });
    function byWire(i) { return wuf.find(dkey(E[i][0][0], E[i][0][1])) === wuf.find(dkey(E[i][1][0], E[i][1][1])); }
    parts.forEach(function (p, i) {
      if (link(i) || p.t === 'wire' || na(i) !== nb(i)) return;
      if (isSource(p)) {
        issue('warn', 'Short circuit across ' + nm[i] + ': its terminals are joined by a ' + (byWire(i) ? 'plain wire' : 'zero-resistance ammeter') + '. The current is limited only by the internal resistance: I = E/r = ' + U.sf(p.v.E) + '/' + U.sf(p.v.r) + ' = ' + U.sf(Math.abs(out.parts[i].Iout)) + ' A, and the terminal p.d. is 0.', [i]);
      } else if (p.t === 'volt') {
        issue('warn', nm[i] + ' is connected across a plain wire (or an ideal ammeter), so it reads 0 V. Connect it across the part whose p.d. you want.', [i]);
      } else if (p.t === 'switch' || p.t === 'fuse' || p.t === 'amm') {
        // an open switch / blown fuse / real ammeter bypassed by a wire: nothing to measure across it
        if (p.t === 'amm') issue('warn', nm[i] + ' has a plain wire in parallel with it, so the current goes round it and it reads 0. Ammeters go in series.', [i]);
      } else if (byWire(i)) {
        issue('warn', nm[i] + ' is short-circuited: a plain wire joins its two ends, so all the current takes the wire and none flows through ' + nm[i] + '.', [i]);
      } else {
        var am = [];
        parts.forEach(function (q, j) { if (q.t === 'amm' && link(j) && na(j) === na(i)) am.push(j); });
        issue('warn', (am.length ? list(am) : 'An ammeter') + ' is connected in parallel with ' + nm[i] + '. An ideal ammeter has zero resistance, so it short-circuits ' + nm[i] + ' (no current through ' + nm[i] + '). Ammeters go in series.', am.concat([i]));
      }
    });
    // a real ammeter (with resistance) in parallel with another part
    parts.forEach(function (p, i) {
      if (p.t !== 'amm' || link(i) || na(i) === nb(i)) return;
      var par = []; parts.forEach(function (q, j) { if (j !== i && q.t !== 'volt' && !link(j) && q.t !== 'wire' && pairOf[j] === pairOf[i]) par.push(j); });
      if (par.length) issue('warn', nm[i] + ' is connected in parallel with ' + list(par) + '. An ammeter must be in series, so that the current it measures goes through it.', [i].concat(par));
    });
    // voltmeter in series: one of its ends meets only one other part, and nothing else is connected across the same two points
    // (counted with ammeters as parts, so a voltmeter in series with an ammeter is caught too)
    var vSeries = [], wDeg = {}, wPair = [];
    function wn(i, e) { return wuf.find(dkey(E[i][e][0], E[i][e][1])); }
    function wLink(i) { var p = parts[i]; return p.t === 'wire' || (p.t === 'switch' && p.v.on > 0) || (p.t === 'fuse' && !blown[i]); }
    parts.forEach(function (p, i) {
      var a = wn(i, 0), b = wn(i, 1); wPair.push(a < b ? a + '-' + b : b + '-' + a);
      if (!wLink(i)) { wDeg[a] = (wDeg[a] || 0) + 1; wDeg[b] = (wDeg[b] || 0) + 1; }
    });
    parts.forEach(function (p, i) {
      if (p.t !== 'volt' || na(i) === nb(i)) return;
      if (wDeg[wn(i, 0)] !== 2 && wDeg[wn(i, 1)] !== 2) return;
      if (out.dotDeg[dkey(E[i][0][0], E[i][0][1])] === 1 || out.dotDeg[dkey(E[i][1][0], E[i][1][1])] === 1) return; // loose end, reported above
      var across = parts.some(function (q, j) { return j !== i && !wLink(j) && wPair[j] === wPair[i]; });
      if (!across) { vSeries.push(i); issue('warn', nm[i] + ' is in series. A voltmeter has a very high resistance, so it ' + (isFinite(Rof[i]) ? 'lets through only a tiny current' : 'stops the current') + ' and reads nearly the full e.m.f. (' + U.sf(out.parts[i].reading) + ' V). Connect it in parallel, across the part you want to measure.', [i]); }
    });
    // floating parts: not connected (through any parts at all) to a cell
    var cuf = UF();
    parts.forEach(function (p, i) { cuf.union('n' + na(i), 'n' + nb(i)); });
    var srcRoot = {}; srcIdx.forEach(function (i) { srcRoot[cuf.find('n' + na(i))] = 1; });
    var floating = [];
    if (srcIdx.length) parts.forEach(function (p, i) { if (named(i) && !srcRoot[cuf.find('n' + na(i))]) floating.push(i); });
    if (floating.length) issue('warn', list(floating) + (floating.length > 1 ? ' are' : ' is') + ' not connected to any cell, so no current flows there.', floating);
    // fuses, diodes
    parts.forEach(function (p, i) {
      if (p.t === 'fuse' && blown[i]) issue('warn', 'Fuse ' + nm[i] + ' has blown: the current through it would have been ' + U.sf(blowI[i]) + ' A, more than its ' + U.sf(p.v.max) + ' A rating. The wire in the fuse melts and breaks the circuit.', [i]);
      if (p.t === 'diode' && !out.parts[i].on && na(i) !== nb(i) && srcRoot[cuf.find('n' + na(i))]) {
        var rb = (p.rev ? -1 : 1) * st.Vab[i] < 0;
        issue('info', nm[i] + (rb ? ' is reverse-biased (its arrow points against the current the cells try to drive), so it does not conduct.' : ' does not conduct: the p.d. across it is less than ' + U.sf(Vf(p)) + ' V.'), [i]);
      }
    });
    // open circuit
    var anyI = srcIdx.some(function (i) { return Math.abs(out.parts[i].Iout) > 1e-12; });
    out.anyCurrent = anyI;
    if (srcIdx.length && !anyI) {
      var why = [];
      parts.forEach(function (p, i) { if (p.t === 'switch' && !(p.v.on > 0)) why.push(nm[i] + ' is open'); });
      if (vSeries.length) why.push(list(vSeries) + ' is in series');
      if (loose.length) why.push('there is a loose end');
      parts.forEach(function (p, i) { if (p.t === 'diode' && !out.parts[i].on) why.push(nm[i] + ' blocks the current'); if (p.t === 'fuse' && blown[i]) why.push(nm[i] + ' has blown'); });
      out.openCircuit = true;
      issue('warn', 'Open circuit: there is no complete loop through ' + (srcIdx.length > 1 ? 'a cell' : nm[srcIdx[0]]) + ', so no current flows' + (why.length ? ' (' + why.join('; ') + ')' : '') + '. Every p.d. across a resistor is 0.', []);
    }
    if (parts.some(function (p) { return p.t === 'lamp'; })) issue('info', 'Lamps are treated as fixed resistors here. A real filament lamp’s resistance rises as it gets hotter, so its I–V graph curves.');
    if (parts.some(function (p) { return p.t === 'therm' || p.t === 'ldr'; })) issue('info', 'Thermistor / LDR resistance comes from an illustrative model curve (it falls as temperature / light intensity rises).');

    out.method = method(parts, out, st, nm);
    return out;
  }

  /* ================= method: series–parallel reduction or Kirchhoff's laws ================= */
  function method(parts, out, st, nm) {
    var live = [];
    st.els.forEach(function (e) {
      if (e.gmin) return;
      live.push({ i: e.i, u: e.a, v: e.b, kind: e.kind, R: e.type === 'R' ? e.R : 0, E: e.type === 'E' ? e.E : 0, r: e.type === 'E' ? e.r : 0,
        I: e.type === 'R' ? st.sol.I[e.id] : -st.sol.I[e.id] });   // I: current through the element from u to v
    });
    // drop parts that cannot carry current: shorted (both ends on one node) and dead ends
    live = live.filter(function (e) { return e.kind === 'E' || e.u !== e.v; });
    for (var guard = 0; guard < 200; guard++) {
      var deg = {}; live.forEach(function (e) { deg[e.u] = (deg[e.u] || 0) + 1; deg[e.v] = (deg[e.v] || 0) + 1; });
      var keep = live.filter(function (e) { return deg[e.u] > 1 && deg[e.v] > 1; });
      if (keep.length === live.length) break; live = keep;
    }
    var cu = UF(); live.forEach(function (e) { cu.union(e.u, e.v); });
    var hasSrc = {}; live.forEach(function (e) { if (e.kind === 'E') hasSrc[cu.find(e.u)] = 1; });
    live = live.filter(function (e) { return hasSrc[cu.find(e.u)]; });
    if (!live.length || !out.anyCurrent) return { live: live, reduce: null, kirchhoff: null };
    var srcs = live.filter(function (e) { return e.kind === 'E'; }), diodes = live.filter(function (e) { return e.kind === 'D'; });
    return { live: live, reduce: srcs.length === 1 && !diodes.length ? reduce(live, srcs[0], nm) : null, kirchhoff: kirchhoff(live, nm) };
  }

  var LETTERS = ['X', 'Y', 'Z', 'W', 'P', 'Q', 'S', 'T', 'U', 'K'];
  function reduce(live, src, nm) {
    var p = src.u, q = src.v, edges = [], steps = [], nextL = 0;
    live.forEach(function (e) { if (e !== src) edges.push({ kind: 'leaf', i: e.i, R: e.R, u: e.u, v: e.v, name: nm[e.i] }); });
    function label() { return 'R<sub>' + (LETTERS[nextL] || String(nextL + 1)) + '</sub>' + (nextL++ , ''); }
    for (var guard = 0; guard < 200; guard++) {
      var groups = {}, order = [];
      edges.forEach(function (e) { var k = Math.min(e.u, e.v) + '-' + Math.max(e.u, e.v); if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(e); });
      var g = null; order.forEach(function (k) { if (!g && groups[k].length > 1) g = groups[k]; });
      if (g) {
        var node = { kind: 'par', kids: g, u: g[0].u, v: g[0].v, R: 1 / g.reduce(function (s, e) { return s + 1 / e.R; }, 0) };
        node.name = label(); steps.push(node);
        var at = edges.indexOf(g[0]); edges = edges.filter(function (e) { return g.indexOf(e) < 0; }); edges.splice(Math.min(at, edges.length), 0, node);
        continue;
      }
      var deg = {}, inc = {};
      edges.forEach(function (e) { [e.u, e.v].forEach(function (n) { deg[n] = (deg[n] || 0) + 1; (inc[n] = inc[n] || []).push(e); }); });
      var w = null;
      edges.forEach(function (e) { [e.u, e.v].forEach(function (n) { if (w === null && n !== p && n !== q && deg[n] === 2 && inc[n][0] !== inc[n][1]) w = n; }); });
      if (w === null) break;
      // the whole chain through nodes that meet exactly two parts
      var chain = [inc[w][0]], endA = inc[w][0].u === w ? inc[w][0].v : inc[w][0].u, endB = w, cur = inc[w][1];
      for (var k = 0; k < 200; k++) {
        chain.push(cur); var nx = cur.u === endB ? cur.v : cur.u; endB = nx;
        if (nx === p || nx === q || deg[nx] !== 2) break;
        var nxt = inc[nx][0] === cur ? inc[nx][1] : inc[nx][0]; if (chain.indexOf(nxt) >= 0) break; cur = nxt;
      }
      for (k = 0; k < 200; k++) {
        if (endA === p || endA === q || deg[endA] !== 2) break;
        var prv = inc[endA][0] === chain[0] ? inc[endA][1] : inc[endA][0]; if (chain.indexOf(prv) >= 0) break;
        chain.unshift(prv); endA = prv.u === endA ? prv.v : prv.u;
      }
      var sn = { kind: 'ser', kids: chain, u: endA, v: endB, R: chain.reduce(function (s, e) { return s + e.R; }, 0) };
      sn.name = label(); steps.push(sn);
      var at2 = edges.indexOf(chain[0]); edges = edges.filter(function (e) { return chain.indexOf(e) < 0; }); edges.splice(Math.min(at2, edges.length), 0, sn);
    }
    var ok = (edges.length === 1 && ((edges[0].u === p && edges[0].v === q) || (edges[0].u === q && edges[0].v === p))) || (!edges.length && p === q);
    if (!ok) return null;
    var top = edges[0] || null, Rext = top ? top.R : 0, I = src.E / (Rext + src.r);
    function assign(n, cur) { n.I = cur; n.V = cur * n.R; if (n.kind === 'ser') n.kids.forEach(function (k) { assign(k, cur); }); else if (n.kind === 'par') n.kids.forEach(function (k) { assign(k, n.V / k.R); }); }
    if (top) assign(top, I);
    return { src: src.i, E: src.E, r: src.r, steps: steps, top: top, Rext: Rext, I: I };
  }

  function kirchhoff(live, nm) {
    var deg = {}, adj = {};
    live.forEach(function (e, k) { [e.u, e.v].forEach(function (n) { deg[n] = (deg[n] || 0) + 1; (adj[n] = adj[n] || []).push(k); }); });
    var isJ = {}, junctions = Object.keys(deg).map(Number).filter(function (n) { return deg[n] >= 3; }).sort(function (a, b) { return a - b; });
    junctions.forEach(function (n) { isJ[n] = 1; });
    var visited = {}, branches = [];
    function walk(start, k) {
      var path = [], cur = start, e = k;
      for (var guard = 0; guard < 500; guard++) {
        visited[e] = 1; var el = live[e], fwd = el.u === cur, nxt = fwd ? el.v : el.u;
        path.push({ k: e, fwd: fwd }); cur = nxt;
        if (isJ[cur] || cur === start) break;
        var cand = adj[cur].filter(function (x) { return !visited[x]; }); if (!cand.length) break; e = cand[0];
      }
      return { path: path, start: start, end: cur };
    }
    junctions.forEach(function (j) { adj[j].forEach(function (k) { if (!visited[k]) branches.push(walk(j, k)); }); });
    live.forEach(function (el, k) { if (!visited[k]) branches.push(walk(el.u, k)); });
    branches.forEach(function (b) {
      var s0 = b.path[0], I = s0.fwd ? live[s0.k].I : -live[s0.k].I;
      if (I < -EPS) { b.path = b.path.reverse().map(function (s) { return { k: s.k, fwd: !s.fwd }; }); var t = b.start; b.start = b.end; b.end = t; I = -I; }
      b.I = Math.abs(I) < EPS ? 0 : I;
      b.parts = b.path.map(function (s) { return live[s.k].i; });
    });
    var J = junctions.map(function (n) {
      return { net: n, ins: branches.map(function (b, i) { return b.end === n && b.start !== n ? i : -1; }).filter(function (i) { return i >= 0; }),
        outs: branches.map(function (b, i) { return b.start === n && b.end !== n ? i : -1; }).filter(function (i) { return i >= 0; }) };
    });
    // spanning tree of the branch graph; each branch not in the tree closes one independent loop
    var depth = {}, parent = {}, pBranch = {}, tree = {}, nodes = [];
    branches.forEach(function (b) { [b.start, b.end].forEach(function (n) { if (nodes.indexOf(n) < 0) nodes.push(n); }); });
    nodes.forEach(function (r) {
      if (depth[r] !== undefined) return; depth[r] = 0; var queue = [r];
      while (queue.length) {
        var x = queue.shift();
        branches.forEach(function (b, bi) {
          if (b.start === b.end) return;
          var y = b.start === x ? b.end : b.end === x ? b.start : null;
          if (y === null || depth[y] !== undefined) return;
          depth[y] = depth[x] + 1; parent[y] = x; pBranch[y] = bi; tree[bi] = 1; queue.push(y);
        });
      }
    });
    function upList(n) { var l = [n]; while (parent[n] !== undefined) { n = parent[n]; l.push(n); } return l; }
    var loops = [];
    branches.forEach(function (b, bi) {
      if (tree[bi]) return;
      var items = [{ b: bi, s: 1 }];
      if (b.start !== b.end) {
        var ux = upList(b.end), uy = upList(b.start), lca = null;
        for (var i = 0; i < ux.length && lca === null; i++) if (uy.indexOf(ux[i]) >= 0) lca = ux[i];
        for (i = 0; ux[i] !== lca; i++) { var pb = pBranch[ux[i]]; items.push({ b: pb, s: branches[pb].start === ux[i] ? 1 : -1 }); }
        var down = []; for (i = 0; uy[i] !== lca; i++) down.unshift(uy[i]);
        down.forEach(function (n) { var pb2 = pBranch[n]; items.push({ b: pb2, s: branches[pb2].start === parent[n] ? 1 : -1 }); });
      }
      loops.push(loopTerms(items));
    });
    function loopTerms(items) {
      var emf = [], drops = [], seq = [];
      items.forEach(function (it) {
        var b = branches[it.b], path = it.s > 0 ? b.path : b.path.slice().reverse().map(function (s) { return { k: s.k, fwd: !s.fwd }; });
        path.forEach(function (st) {
          var el = live[st.k]; seq.push(el.i);
          if (el.kind === 'E') {
            emf.push({ i: el.i, sign: st.fwd ? -1 : 1, E: el.E });                        // − → + terminal: a rise of E
            if (el.r > 0) drops.push({ i: el.i, sign: it.s, I: b.I, R: el.r, internal: true, b: it.b });
          } else if (el.kind === 'D') { if (el.E > 0) drops.push({ i: el.i, sign: st.fwd ? 1 : -1, Vf: el.E, b: it.b }); }
          else drops.push({ i: el.i, sign: it.s, I: b.I, R: el.R, b: it.b });
        });
      });
      return { items: items, seq: seq, emf: emf, drops: drops,
        sumE: emf.reduce(function (s, t) { return s + t.sign * t.E; }, 0),
        sumIR: drops.reduce(function (s, t) { return s + t.sign * (t.Vf !== undefined ? t.Vf : t.I * t.R); }, 0) };
    }
    return { branches: branches, junctions: J, loops: loops };
  }

  return { W: W, H: H, TYPES: TYPES, ends: ends, endB: endB, dkey: dkey, coordsOfKey: coordsOfKey, ekey: ekey, inGrid: inGrid, isFree: isFree, make: make, makeFree: makeFree, build: build, edgesOf: edgesOf,
    encode: encode, decode: decode, names: names, rName: rName, sub: sub, isSource: isSource, resistance: resistance, analyse: analyse };
});
