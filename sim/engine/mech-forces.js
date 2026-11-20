/* SIM.forces — coplanar forces at a point (9709 4.1): resultant, equilibrium with two unknowns,
   "resultant has no x/y-component" constraint, and particles / smooth rings held by strings.
   Conventions: x to the right, y up. Every direction is in DEGREES, measured anticlockwise from +x,
   and is the direction in which the force acts ON the particle (for a string: from the particle
   towards the fixed point). Pure functions, no DOM. */
(function (root, f) {
  var m = f(typeof require === 'function' && typeof module === 'object' ? require('../core/util.js') : root.SIM.util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).forces = m;
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';

  /* ------------------------------------------------------------------ helpers */
  function norm360(a) {
    a = a % 360; if (a < 0) a += 360;
    if (a >= 360 - 1e-9 || Math.abs(a) < 1e-9) return 0;
    return a;
  }
  /** signed angle in (−180, 180] */
  function norm180(a) { a = norm360(a); return a > 180 ? a - 360 : a; }
  function unit(deg) {
    // exact values on the axes avoid "20 cos 90° = 1.2e−15" noise
    var a = norm360(deg);
    if (a === 0) return [1, 0]; if (a === 90) return [0, 1]; if (a === 180) return [-1, 0]; if (a === 270) return [0, -1];
    var r = U.rad(a); return [Math.cos(r), Math.sin(r)];
  }
  function hyp(v) { return Math.hypot(v[0], v[1]); }

  /** Describe a direction the way exam answers do: β° above/below the +x or −x direction. */
  function dirInfo(deg) {
    var a = norm360(deg), beta, ref, side, text;
    if (Math.abs(a - 90) < 1e-9) return { deg: a, beta: 90, ref: 'up', side: '', text: 'vertically upwards' };
    if (Math.abs(a - 270) < 1e-9) return { deg: a, beta: 90, ref: 'down', side: '', text: 'vertically downwards' };
    if (a < 90) { beta = a; ref = '+x'; side = 'above'; }
    else if (a < 180) { beta = 180 - a; ref = '−x'; side = 'above'; }
    else if (a < 270) { beta = a - 180; ref = '−x'; side = 'below'; }
    else { beta = 360 - a; ref = '+x'; side = 'below'; }
    text = beta < 1e-9 ? 'along the ' + ref + ' direction' : U.dp(beta, 1) + '° ' + side + ' the ' + ref + ' direction';
    return { deg: a, beta: beta, ref: ref, side: side, text: text };
  }

  /* ====================================================================
     S1: forces at a point. A force is {F, th, c}: magnitude F (N) at angle th (deg).
     If c is a number (not null/undefined) the force is "c × F" with the common unknown F = k,
     so its magnitude is c·k and F is ignored.
     Unknown descriptors: {kind:'F', i} magnitude of force i (must be a plain force),
                          {kind:'th', i} direction of force i, {kind:'k'} the common F.
     ==================================================================== */
  function isMult(f) { return f.c !== null && f.c !== undefined && isFinite(f.c); }
  function magOf(f, k) { return isMult(f) ? f.c * k : f.F; }

  function resultant(list, k) {
    var X = 0, Y = 0, S = 0, comps = [];
    list.forEach(function (f) {
      var m = magOf(f, k), u = unit(f.th), x = m * u[0], y = m * u[1];
      comps.push({ mag: m, th: norm360(f.th), x: x, y: y });
      X += x; Y += y; S += Math.abs(m);
    });
    var R = Math.hypot(X, Y), eq = R <= 1e-9 * Math.max(1, S);
    if (Math.abs(X) <= 1e-12 * Math.max(1, S)) X = 0;
    if (Math.abs(Y) <= 1e-12 * Math.max(1, S)) Y = 0;
    return { X: X, Y: Y, R: eq ? 0 : R, dir: eq ? NaN : norm360(U.deg(Math.atan2(Y, X))), comps: comps, sumF: S,
      equilibrium: eq, nearEquilibrium: R <= 0.005 * S };
  }

  function sameUnknown(a, b) { return a.kind === b.kind && (a.kind === 'k' || a.i === b.i); }
  /** null if the pair of unknowns is usable, otherwise a message */
  function checkUnknowns(list, unk) {
    var anyMult = list.some(isMult);
    for (var j = 0; j < unk.length; j++) {
      var u = unk[j];
      if (u.kind === 'k') { if (!anyMult) return 'F is unknown but no force is given as a multiple of F.'; continue; }
      if (!(u.i >= 0 && u.i < list.length)) return 'Unknown refers to force ' + (u.i + 1) + ', but only ' + list.length + ' forces are in use.';
      if (u.kind === 'F' && isMult(list[u.i])) return 'Force ' + (u.i + 1) + ' is given as a multiple of F: make F the unknown instead of its magnitude.';
    }
    if (unk.length === 2 && sameUnknown(unk[0], unk[1])) return 'Choose two different unknowns.';
    return null;
  }

  /** substitute unknown values (angles in degrees) → {list, k} */
  function substitute(list, k, unk, vals) {
    var L = list.map(function (f) { return { F: f.F, th: f.th, c: f.c }; }), kk = k;
    unk.forEach(function (u, j) {
      if (u.kind === 'k') kk = vals[j];
      else if (u.kind === 'F') L[u.i].F = vals[j];
      else L[u.i].th = vals[j];
    });
    return { list: L, k: kk };
  }

  function knownScale(list, k) {
    var s = 0; list.forEach(function (f) { var m = magOf(f, k); if (isFinite(m)) s += Math.abs(m); });
    return Math.max(1, s);
  }

  /** column (∂(X,Y)/∂u) for a linear unknown */
  function column(list, u) {
    if (u.kind === 'F') return unit(list[u.i].th);
    var c = [0, 0];
    list.forEach(function (f) { if (isMult(f)) { var e = unit(f.th); c[0] += f.c * e[0]; c[1] += f.c * e[1]; } });
    return c;
  }

  /**
   * Equilibrium (resultant = 0) with two unknowns.
   * Returns {status, method, solutions:[{vals, list, k, negative:[bool,bool]}], det, message}
   *   status: 'ok' | 'negative' (Cramer gave a negative magnitude) | 'parallel-none' | 'parallel-many'
   *           | 'zero' (unknown force must be zero, direction undefined) | 'none' | 'many' | 'invalid'
   */
  function solveEquilibrium(list, k, unk) {
    var msg = checkUnknowns(list, unk);
    if (msg) return { status: 'invalid', message: msg, solutions: [] };
    var a = unk[0], b = unk[1];
    // A) magnitude and direction of the same (plain) force: closed form
    if (a.kind !== 'k' && b.kind !== 'k' && a.i === b.i && a.kind !== b.kind && !isMult(list[a.i])) {
      var i = a.i, Xo = 0, Yo = 0;
      list.forEach(function (f, j) { if (j === i) return; var m = magOf(f, k), e = unit(f.th); Xo += m * e[0]; Yo += m * e[1]; });
      var Xp = -Xo, Yp = -Yo, P = Math.hypot(Xp, Yp), sc = knownScale(list.filter(function (f, j) { return j !== i; }), k);
      if (P <= 1e-9 * sc) return { status: 'zero', method: 'magdir', Xp: Xp, Yp: Yp, message: 'The other forces already balance: the unknown force must be zero (its direction is undefined).', solutions: [] };
      var th = norm360(U.deg(Math.atan2(Yp, Xp)));
      var vals = a.kind === 'F' ? [P, th] : [th, P];
      var s = substitute(list, k, unk, vals);
      return { status: 'ok', method: 'magdir', Xp: Xp, Yp: Yp, solutions: [{ vals: vals, list: s.list, k: s.k, negative: [false, false] }] };
    }
    // B) two linear unknowns (magnitudes and/or F): Cramer's rule
    if (a.kind !== 'th' && b.kind !== 'th') {
      var c1 = column(list, a), c2 = column(list, b), rx = 0, ry = 0;
      list.forEach(function (f, j) {
        var lin = (isMult(f) && (a.kind === 'k' || b.kind === 'k')) || (a.kind === 'F' && a.i === j) || (b.kind === 'F' && b.i === j);
        if (lin) return;
        var m = magOf(f, k), e = unit(f.th); rx -= m * e[0]; ry -= m * e[1];
      });
      var det = c1[0] * c2[1] - c2[0] * c1[1], scale = hyp(c1) * hyp(c2), bs = Math.max(1, Math.hypot(rx, ry), knownScale(list, k));
      if (scale < 1e-12 || Math.abs(det) <= 1e-9 * scale) {
        var ref = hyp(c1) > 1e-12 ? c1 : c2, cr = hyp(ref) > 1e-12 ? (ref[0] * ry - ref[1] * rx) / hyp(ref) : Math.hypot(rx, ry);
        var many = Math.abs(cr) <= 1e-9 * bs;
        return { status: many ? 'parallel-many' : 'parallel-none', method: 'cramer', det: det, c1: c1, c2: c2, b: [rx, ry],
          message: many ? 'The two unknown forces act along the same line: infinitely many solutions (no unique answer).'
            : 'The two unknown forces act along the same line (det = 0) and cannot balance the other forces: no solution.', solutions: [] };
      }
      var u1 = (rx * c2[1] - c2[0] * ry) / det, u2 = (c1[0] * ry - rx * c1[1]) / det;
      var tol = 1e-9 * bs;
      if (Math.abs(u1) < tol) u1 = 0; if (Math.abs(u2) < tol) u2 = 0;
      var neg = [u1 < 0, u2 < 0], s2 = substitute(list, k, unk, [u1, u2]);
      return { status: neg[0] || neg[1] ? 'negative' : 'ok', method: 'cramer', det: det, c1: c1, c2: c2, b: [rx, ry],
        solutions: [{ vals: [u1, u2], list: s2.list, k: s2.k, negative: neg }] };
    }
    // C) general (at least one unknown angle): Newton–Raphson from seeds
    return newtonSolve(list, k, unk);
  }

  function newtonSolve(list, k, unk) {
    var isAng = unk.map(function (u) { return u.kind === 'th'; });
    var scale = 0;
    list.forEach(function (f, j) {
      var unknownMag = unk.some(function (u) { return (u.kind === 'F' && u.i === j) || (u.kind === 'k' && isMult(f)); });
      if (!unknownMag) scale += Math.abs(magOf(f, k));
    });
    scale = Math.max(1, scale);
    // internal vector: angles in radians
    function toVals(x) { return x.map(function (v, j) { return isAng[j] ? U.deg(v) : v; }); }
    function resid(x) {
      var s = substitute(list, k, unk, toVals(x)), X = 0, Y = 0;
      s.list.forEach(function (f) { var m = magOf(f, s.k), r = U.rad(f.th); X += m * Math.cos(r); Y += m * Math.sin(r); });
      return [X, Y];
    }
    function nrm(r) { return Math.hypot(r[0], r[1]); }
    var seeds = [], j1, j2, angs = [];
    for (var d = 0; d < 360; d += 30) angs.push(U.rad(d));
    if (isAng[0] && isAng[1]) { for (j1 = 0; j1 < angs.length; j1++) for (j2 = 0; j2 < angs.length; j2++) seeds.push([angs[j1], angs[j2]]); }
    else {
      var ai = isAng[0] ? 0 : 1, li = 1 - ai;
      angs.forEach(function (t) {
        // best linear value for this angle (least squares; residual is linear in it)
        var x0 = [0, 0]; x0[ai] = t; x0[li] = 0; var r0 = resid(x0);
        var x1 = x0.slice(); x1[li] = 1; var r1 = resid(x1), col = [r1[0] - r0[0], r1[1] - r0[1]];
        var cc = col[0] * col[0] + col[1] * col[1], lv = cc > 1e-20 ? -(r0[0] * col[0] + r0[1] * col[1]) / cc : 1;
        var x = [0, 0]; x[ai] = t; x[li] = lv; seeds.push(x);
        var xb = x.slice(); xb[li] = Math.abs(lv) + 1; seeds.push(xb);
      });
    }
    var sols = [];
    seeds.forEach(function (x) {
      x = x.slice(); var r = resid(x), n = nrm(r);
      for (var it = 0; it < 100 && n > 1e-13 * scale; it++) {
        var J = [[0, 0], [0, 0]];
        for (var q = 0; q < 2; q++) {
          var h = isAng[q] ? 1e-6 : 1e-6 * Math.max(1, Math.abs(x[q]));
          var xp = x.slice(), xm = x.slice(); xp[q] += h; xm[q] -= h;
          var rp = resid(xp), rm = resid(xm);
          J[0][q] = (rp[0] - rm[0]) / (2 * h); J[1][q] = (rp[1] - rm[1]) / (2 * h);
        }
        var det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
        if (Math.abs(det) < 1e-14 * Math.max(1, Math.abs(J[0][0] * J[1][1]), Math.abs(J[0][1] * J[1][0]))) break;
        var dx = [(-r[0] * J[1][1] + J[0][1] * r[1]) / det, (-J[0][0] * r[1] + r[0] * J[1][0]) / det];
        var lam = 1, accepted = false;
        for (var ls = 0; ls < 40; ls++) {
          var xn = [x[0] + lam * dx[0], x[1] + lam * dx[1]], rn = resid(xn), nn = nrm(rn);
          if (nn < n) { x = xn; r = rn; n = nn; accepted = true; break; }
          lam /= 2;
        }
        if (!accepted) break;
      }
      if (!(n <= 1e-9 * scale)) return;
      var vals = toVals(x);
      for (var q2 = 0; q2 < 2; q2++) {
        if (isAng[q2]) vals[q2] = norm360(vals[q2]);
        else if (!(vals[q2] > 1e-9 * scale)) return;   // magnitudes / F must be positive
      }
      var dup = sols.some(function (s) {
        return s.vals.every(function (v, q) { return isAng[q] ? Math.abs(norm180(v - vals[q])) < 1e-6 : Math.abs(v - vals[q]) <= 1e-6 * Math.max(1, Math.abs(v)); });
      });
      if (!dup) sols.push({ vals: vals });
    });
    sols.sort(function (p, q) { return p.vals[isAng[0] ? 0 : 1] - q.vals[isAng[0] ? 0 : 1]; });
    var out = sols.map(function (s) { var sb = substitute(list, k, unk, s.vals); return { vals: s.vals, list: sb.list, k: sb.k, negative: [false, false] }; });
    if (!out.length) return { status: 'none', method: 'newton', message: 'No equilibrium position exists with these known values (no real solution).', solutions: [] };
    if (out.length > 2) return { status: 'many', method: 'newton', message: 'Infinitely many solutions: the known values do not fix the unknowns.', solutions: out.slice(0, 2) };
    return { status: 'ok', method: 'newton', solutions: out };
  }

  /**
   * "Resultant has no y-component" (axis 'y') or no x-component (axis 'x'), one linear unknown (F_i or k).
   * Returns {status:'ok'|'negative'|'impossible'|'any'|'invalid', value, known, col, message}
   */
  function solveConstraint(list, k, u, axis) {
    var msg = checkUnknowns(list, [u]);
    if (msg) return { status: 'invalid', message: msg };
    if (u.kind === 'th') return { status: 'invalid', message: 'Constraint mode solves for a magnitude (or F).' };
    var ax = axis === 'x' ? 0 : 1, col = column(list, u), known = 0;
    list.forEach(function (f, j) {
      var lin = (u.kind === 'k' && isMult(f)) || (u.kind === 'F' && u.i === j);
      if (!lin) known += magOf(f, k) * unit(f.th)[ax];
    });
    var sc = knownScale(list, k);
    if (Math.abs(col[ax]) <= 1e-9 * Math.max(1, hyp(col))) {
      var any = Math.abs(known) <= 1e-9 * sc;
      return { status: any ? 'any' : 'impossible', known: known, col: col[ax],
        message: any ? 'The other forces already have zero ' + axis + '-component and the unknown has none: any value works.'
          : 'The unknown force has no ' + axis + '-component, so it cannot cancel the ' + axis + '-component of the others.' };
    }
    var v = -known / col[ax]; if (Math.abs(v) < 1e-12 * sc) v = 0;
    var s = substitute(list, k, [u], [v]);
    return { status: v < 0 ? 'negative' : 'ok', value: v, known: known, col: col[ax], list: s.list, k: s.k };
  }

  /* ====================================================================
     S2: particle (or smooth ring) held by strings and an applied force.
     ==================================================================== */
  var ORIENT = {   // direction from the particle towards the fixed point, from the angle α to a reference line
    'UR-h': function (a) { return a; }, 'UR-v': function (a) { return 90 - a; },
    'UL-h': function (a) { return 180 - a; }, 'UL-v': function (a) { return 90 + a; },
    'DL-h': function (a) { return 180 + a; }, 'DL-v': function (a) { return 270 - a; },
    'DR-h': function (a) { return 360 - a; }, 'DR-v': function (a) { return 270 + a; }
  };
  var ORIENT_INV = {
    'UR-h': function (d) { return d; }, 'UR-v': function (d) { return 90 - d; },
    'UL-h': function (d) { return 180 - d; }, 'UL-v': function (d) { return d - 90; },
    'DL-h': function (d) { return d - 180; }, 'DL-v': function (d) { return 270 - d; },
    'DR-h': function (d) { return 360 - d; }, 'DR-v': function (d) { return d - 270; }
  };
  function orientDir(alpha, orient) { return norm360((ORIENT[orient] || ORIENT['UL-v'])(alpha)); }
  /** α for a direction in a given orientation frame; ok = false if the direction is not in that quadrant */
  function alphaFromDir(dir, orient) {
    var a = norm180((ORIENT_INV[orient] || ORIENT_INV['UL-v'])(norm360(dir)));
    return { alpha: a, ok: a >= -1e-9 && a <= 90 + 1e-9 };
  }

  /** two strings from A (left) and B (right) on the same horizontal level, AB = d, AC = L1, BC = L2, C below AB */
  function lengthsGeometry(L1, L2, d) {
    if (!(L1 > 0 && L2 > 0 && d > 0)) return { ok: false, msg: 'Lengths must be positive.' };
    var tol = 1e-9 * Math.max(L1, L2, d);
    if (L1 + L2 < d - tol) return { ok: false, msg: 'L₁ + L₂ < d: the strings are too short to reach each other.' };
    if (Math.abs(L1 - L2) > d + tol) return { ok: false, msg: '|L₁ − L₂| > d: no triangle, so both strings cannot be taut.' };
    var cA = U.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), cB = U.clamp((L2 * L2 + d * d - L1 * L1) / (2 * L2 * d), -1, 1);
    var A = U.deg(Math.acos(cA)), B = U.deg(Math.acos(cB)), C = 180 - A - B;
    var degenerate = A < 1e-7 || B < 1e-7 || C < 1e-7;
    return { ok: true, degenerate: degenerate, A: A, B: B, C: C, cosA: cA, cosB: cB,
      dir1: norm360(180 - A), dir2: norm360(B), Cpt: [L1 * cA, -L1 * Math.sin(U.rad(A))], Apt: [0, 0], Bpt: [d, 0],
      msg: degenerate ? 'The strings lie along AB (the triangle is flat): they cannot support the weight.' : '' };
  }
  /** one string of length L from a ceiling point, particle a depth h below the ceiling (particle to the right) */
  function oneStringGeometry(L, h) {
    if (!(L > 0) || !(h >= 0)) return { ok: false, msg: 'Length must be positive.' };
    if (h > L * (1 + 1e-12)) return { ok: false, msg: 'Depth h is greater than the string length L: impossible.' };
    var alpha = U.deg(Math.acos(U.clamp(h / L, -1, 1)));
    return { ok: true, alpha: alpha, cosA: h / L, sinA: Math.sqrt(Math.max(0, 1 - (h / L) * (h / L))), dir1: norm360(90 + alpha), horiz: Math.sqrt(Math.max(0, L * L - h * h)) };
  }

  var LINEAR = { T1: 1, T2: 1, T: 1, m: 1, P: 1 };
  /** allowed unknown pairs per configuration (order-insensitive) */
  function pairAllowed(config, a, b) {
    if (a === b) return false;
    var set = config === 'two' ? ['T1', 'T2', 'm', 'P'] : config === 'ring' ? ['T', 'm', 'P'] : ['T1', 'm', 'P'];
    if (set.indexOf(a) >= 0 && set.indexOf(b) >= 0) return true;
    var pr = [a, b].sort().join(',');
    if (pr === 'P,phi') return true;
    if (config === 'two' && pr === 'T2,dir2') return true;
    return false;
  }

  /**
   * s = {g, m, config:'two'|'ring'|'one', dir1, dir2, T1, T2, P, phi, unknowns:[a, b]}
   * (ring: the tension T is held in T1). Returns
   * {status, message, values:{T1,T2,m,P,phi,dir2}, forces:[{key,name,mag,dir}], det, slack:[keys], residual}
   *   status: 'ok' | 'slack' | 'negP' | 'badm' | 'parallel-none' | 'parallel-many' | 'zero' | 'invalid'
   */
  function solveParticle(s) {
    var cfg = s.config || 'two', g = s.g, unk = s.unknowns || [];
    if (unk.length !== 2 || !pairAllowed(cfg, unk[0], unk[1])) return { status: 'invalid', message: 'Choose a valid pair of unknowns for this set-up.', values: {}, forces: [] };
    var v = { T1: s.T1 || 0, T2: cfg === 'one' ? 0 : (cfg === 'ring' ? (s.T1 || 0) : (s.T2 || 0)), m: s.m || 0, P: s.P || 0, phi: s.phi || 0, dir1: s.dir1, dir2: s.dir2 };
    var u1 = unit(v.dir1), u2 = cfg === 'one' ? [0, 0] : unit(v.dir2);
    var W = [0, -g];
    function col(name) {
      if (name === 'T1') return u1; if (name === 'T2') return u2; if (name === 'm') return W;
      if (name === 'T') return [u1[0] + u2[0], u1[1] + u2[1]];
      return unit(v.phi); // P
    }
    function contrib(name) {   // known force vector
      var c = col(name), val = name === 'T' ? v.T1 : v[name];
      return [c[0] * val, c[1] * val];
    }
    var names = cfg === 'ring' ? ['T', 'm', 'P'] : cfg === 'one' ? ['T1', 'm', 'P'] : ['T1', 'T2', 'm', 'P'];
    var scale = Math.max(1, Math.abs(v.m * g), Math.abs(v.P), Math.abs(v.T1), Math.abs(v.T2));
    var det = null, res = { values: null };
    var pr = unk.slice().sort().join(',');
    if (pr === 'T2,dir2' || pr === 'P,phi') {
      var target = pr === 'P,phi' ? 'P' : 'T2', V = [0, 0];
      names.forEach(function (n) { if (n === target) return; var c = contrib(n); V[0] -= c[0]; V[1] -= c[1]; });
      var mag = Math.hypot(V[0], V[1]);
      if (mag <= 1e-9 * scale) return { status: 'zero', message: 'The other forces already balance: the unknown force must be zero (direction undefined).', values: v, forces: buildForces(cfg, v, g) };
      var dir = norm360(U.deg(Math.atan2(V[1], V[0])));
      if (target === 'P') { v.P = mag; v.phi = dir; } else { v.T2 = mag; v.dir2 = dir; }
    } else {
      var a = col(unk[0]), b = col(unk[1]), r = [0, 0];
      names.forEach(function (n) { if (n === unk[0] || n === unk[1]) return; var c = contrib(n); r[0] -= c[0]; r[1] -= c[1]; });
      det = a[0] * b[1] - b[0] * a[1];
      var sc = hyp(a) * hyp(b);
      if (sc < 1e-12 || Math.abs(det) <= 1e-9 * sc) {
        var ref = hyp(a) > 1e-12 ? a : b, cr = hyp(ref) > 1e-12 ? (ref[0] * r[1] - ref[1] * r[0]) / hyp(ref) : Math.hypot(r[0], r[1]);
        var many = Math.abs(cr) <= 1e-9 * Math.max(scale, Math.hypot(r[0], r[1]));
        return { status: many ? 'parallel-many' : 'parallel-none', det: det, values: v, forces: buildForces(cfg, v, g),
          message: many ? 'The two unknowns act along the same line: no unique solution.' : 'The two unknown forces act along the same line (det = 0): they cannot balance the others, so no equilibrium.' };
      }
      var x1 = (r[0] * b[1] - b[0] * r[1]) / det, x2 = (a[0] * r[1] - r[0] * a[1]) / det;
      var tz = 1e-10 * scale; if (Math.abs(x1) < tz) x1 = 0; if (Math.abs(x2) < tz) x2 = 0;
      [[unk[0], x1], [unk[1], x2]].forEach(function (p) { if (p[0] === 'T') { v.T1 = p[1]; v.T2 = p[1]; } else v[p[0]] = p[1]; });
    }
    if (cfg === 'ring') v.T2 = v.T1;
    var forces = buildForces(cfg, v, g);
    var rx = 0, ry = 0; forces.forEach(function (f) { var e = unit(f.dir); rx += f.mag * e[0]; ry += f.mag * e[1]; });
    var tol = 1e-9 * scale, slack = [];
    if (v.T1 < -tol) slack.push(cfg === 'ring' ? 'T' : 'T1');
    if (cfg === 'two' && v.T2 < -tol) slack.push('T2');
    var status = 'ok', message = '';
    if (slack.length) { status = 'slack'; message = 'A tension would have to be negative: that string would go slack, so equilibrium in this position is impossible.'; }
    else if (!(v.m > tol / Math.max(g, 1e-9))) { status = 'badm'; message = 'The mass would have to be zero or negative: equilibrium in this position is impossible.'; }
    else if (v.P < -tol) { status = 'negP'; message = 'P would have to be negative: the force must act in the opposite direction.'; }
    return { status: status, message: message, values: v, forces: forces, det: det, slack: slack, residual: Math.hypot(rx, ry) };
  }
  function buildForces(cfg, v, g) {
    var out = [{ key: 'W', mag: v.m * g, dir: 270 }];
    out.push({ key: cfg === 'ring' ? 'T' : 'T1', mag: v.T1, dir: norm360(v.dir1) });
    if (cfg !== 'one') out.push({ key: cfg === 'ring' ? 'T' : 'T2', mag: v.T2, dir: norm360(v.dir2), second: true });
    if (Math.abs(v.P) > 0) out.push({ key: 'P', mag: v.P, dir: norm360(v.phi) });
    return out;
  }

  /**
   * Range of P ≥ 0 (direction fixed) for which every solved tension is ≥ 0 and the solved mass is > 0.
   * Only for linear unknowns that do not include P. Returns {lo, hi, crit:[{key, P}]} or null.
   */
  function pRange(s) {
    var unk = s.unknowns || [];
    if (unk.indexOf('P') >= 0 || unk.indexOf('phi') >= 0 || unk.indexOf('dir2') >= 0) return null;
    var s0 = Object.assign({}, s, { P: 0 }), s1 = Object.assign({}, s, { P: 1 });
    var a = solveParticle(s0), b = solveParticle(s1);
    if (!a.values || !b.values || /parallel|invalid|zero/.test(a.status) || /parallel|invalid|zero/.test(b.status)) return null;
    var lo = 0, hi = Infinity, crit = [], empty = false;
    unk.forEach(function (n) {
      var key = n === 'T' ? 'T1' : n, v0 = a.values[key], slope = b.values[key] - v0;
      var sc = Math.max(1, Math.abs(v0), Math.abs(slope));
      if (Math.abs(slope) <= 1e-12 * sc) { if (v0 < -1e-9 * sc) empty = true; return; }
      var Pc = -v0 / slope;
      if (Pc > 0) crit.push({ key: n, P: Pc });
      if (slope > 0) lo = Math.max(lo, Pc); else hi = Math.min(hi, Pc);
    });
    if (empty || lo > hi + 1e-9 * Math.max(1, lo)) return { lo: NaN, hi: NaN, crit: crit, empty: true };
    return { lo: lo, hi: hi, crit: crit, empty: false };
  }

  /** components of forces along a direction e (deg): angle between each force and e (0–180) and F cos(angle) */
  function resolveAlong(forces, eDeg) {
    var sum = 0;
    var terms = forces.map(function (f) {
      var ang = Math.abs(norm180(f.dir - eDeg)), comp = f.mag * Math.cos(U.rad(ang));
      if (Math.abs(ang - 90) < 1e-9) comp = 0;
      sum += comp; return { key: f.key, mag: f.mag, angle: ang, comp: comp };
    });
    return { terms: terms, sum: sum };
  }

  /** Lami's theorem check for exactly three non-zero forces: F_i / sin(angle between the other two) */
  function lami(forces) {
    var fs = forces.filter(function (f) { return Math.abs(f.mag) > 1e-12; });
    if (fs.length !== 3) return null;
    return fs.map(function (f, i) {
      var o = fs.filter(function (x, j) { return j !== i; }), ang = Math.abs(norm180(o[0].dir - o[1].dir)), sn = Math.sin(U.rad(ang));
      return { key: f.key, mag: f.mag, angle: ang, ratio: Math.abs(sn) > 1e-12 ? f.mag / sn : NaN };
    });
  }

  return { norm360: norm360, norm180: norm180, unit: unit, dirInfo: dirInfo,
    isMult: isMult, magOf: magOf, resultant: resultant, checkUnknowns: checkUnknowns, solveEquilibrium: solveEquilibrium, solveConstraint: solveConstraint,
    orientDir: orientDir, alphaFromDir: alphaFromDir, lengthsGeometry: lengthsGeometry, oneStringGeometry: oneStringGeometry,
    pairAllowed: pairAllowed, solveParticle: solveParticle, pRange: pRange, resolveAlong: resolveAlong, lami: lami };
});
