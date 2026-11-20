/* SIM.dyn — connected particles (string chain over smooth pulleys/pegs), vehicle + trailer, lift.
   9709 4.4 Newton's laws (connected particles, car and trailer, lifts), 4.1 friction, 4.5 P = Fv.

   STRING CHAIN MODEL (PLAN S8)
   Particles 1..N in order along the chain; string k joins particle k and k+1 (light, inextensible,
   smooth pulleys/pegs). e_k = direction particle k moves when the chain moves "positive".
   Each particle: { name, m, track:'hang'|'surface', alpha (deg: direction of e_k above the horizontal;
   hanging and moving up = +90, hanging and moving down = −90; up a slope θ = +θ, down it = −θ;
   horizontal = 0), mu, P (applied force component along e_k), Pn (component perpendicular to the
   surface, away from it), lo/hi (limits of its displacement x_k along e_k, measured from the start),
   loKind/hiKind: 'floor' (it lands and stays there) | 'pulley' (reaches the pulley: model ends) }.
   String k pulls particle k along +e_k and particle k+1 along −e_{k+1}.
   G_k = −m g sin α (weight along e_k), R_k = m g cos α − Pn, F_max,k = μ_k R_k.
   All phases have constant acceleration, so stateAt(t) is analytic. */
(function (root, f) {
  var m = f(typeof require === 'function' && typeof module === 'object' ? require('../core/util.js') : root.SIM.util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).dyn = m;
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';
  var REL = 1e-9;

  /* ---------------- per-particle forces ---------------- */
  function pforces(p, g, mass) {
    var m = mass === undefined ? p.m : mass, al = U.rad(p.alpha || 0);
    var G = -m * g * Math.sin(al), P = p.P || 0, Pn = p.Pn || 0;
    var R = 0, Nraw = 0, lost = false;
    if (p.track !== 'hang') {
      Nraw = m * g * Math.cos(al) - Pn;
      lost = Nraw < -1e-9 * Math.max(1, m * g);
      R = Math.max(0, Nraw);
    }
    var mu = p.track === 'hang' ? 0 : (p.mu || 0);
    return { m: m, G: G, P: P, Pn: Pn, W: m * g, Nraw: Nraw, R: R, mu: mu, F: mu * R, lost: lost };
  }

  /* ---------------- interval helpers ---------------- */
  function iadd(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  function isub(a, b) { return [a[0] - b[1], a[1] - b[0]]; }
  function icap(a, hi) { return [a[0], Math.min(a[1], hi)]; }
  function inter(a, b) { return [Math.max(a[0], b[0]), Math.min(a[1], b[1])]; }
  function nonempty(a, tol) { return a[0] <= a[1] + tol; }
  function mid(a) {
    if (isFinite(a[0]) && isFinite(a[1])) return 0.5 * (a[0] + a[1]);
    if (isFinite(a[0])) return Math.max(a[0], 0);
    if (isFinite(a[1])) return Math.min(a[1], 0);
    return 0;
  }

  /**
   * One group of contiguous taut particles idx[0..n-1] (ids into fs = per-particle forces).
   * v = common velocity, cap[k] = interval of the contact force along e available at rest
   * (friction [−F,F], floor reaction half-line, smooth [0,0]).
   * Returns {static, a, sigma, T:[n-1], Tlo, Thi, f:[n] (contact force along e), residual, D, M, Fmax, ok, why}
   */
  function solveGroup(fs, idx, v, cap, scale) {
    var n = idx.length, D = 0, M = 0, Fm = 0, i;
    var tol = 1e-9 * scale;
    for (i = 0; i < n; i++) { var q = fs[idx[i]]; D += q.G + q.P; M += q.m; Fm += q.F; }
    var res = { D: D, M: M, Fmax: Fm, n: n };
    if (Math.abs(v) < 1e-12) {
      // static test, with the string-tension constraints T ≥ 0 (cumulative contact force S_k ≤ c_k)
      var c = [], acc = 0;
      for (i = 0; i < n; i++) { acc += fs[idx[i]].G + fs[idx[i]].P; c.push(-acc); }
      var I = [[0, 0]], Ik = [0, 0];
      for (i = 0; i < n; i++) { Ik = iadd(Ik, cap[i]); if (i < n - 1) Ik = icap(Ik, c[i] + tol); I.push(Ik); }
      var target = -D;
      if (target >= Ik[0] - tol && target <= Ik[1] + tol) {
        // backward reachable sets J_k (k = n .. 0)
        var J = new Array(n + 1); J[n] = [target, target];
        for (i = n - 1; i >= 0; i--) { var Jm = isub(J[i + 1], cap[i]); if (i > 0) Jm = icap(Jm, c[i - 1] + tol); J[i] = Jm; }
        var Tlo = [], Thi = [], T = [], fsel = [], Sprev = 0;
        for (i = 0; i < n - 1; i++) {
          var feas = inter(I[i + 1], J[i + 1]);
          Tlo.push(Math.max(0, c[i] - feas[1])); Thi.push(c[i] - feas[0]);
        }
        // representative consistent distribution (sequential mid-point choice)
        for (i = 0; i < n; i++) {
          var opt = iadd([Sprev, Sprev], cap[i]);
          if (i < n - 1) { opt = icap(opt, c[i] + tol); opt = inter(opt, J[i + 1]); } else opt = [target, target];
          var S = mid(opt); fsel.push(S - Sprev); if (i < n - 1) T.push(Math.max(0, c[i] - S)); Sprev = S;
        }
        var limiting = Fm > 0 && Math.abs(Math.abs(D) - Fm) <= 1e-6 * scale && Math.abs(D) > tol &&
          cap.every(function (cp) { return isFinite(cp[0]) && isFinite(cp[1]); });
        return Object.assign(res, { static: true, a: 0, sigma: 0, T: T, Tlo: Tlo, Thi: Thi, f: fsel, residual: 0, limiting: limiting,
          indeterminate: Tlo.some(function (lo, k) { return Thi[k] - lo > 1e-9 * scale; }), ok: true });
      }
      // starts to move in the direction of D
      var sg = U.sgn(D);
      if (sg === 0) return Object.assign(res, { ok: false, why: 'no consistent state' });
      return moving(fs, idx, sg, cap, res, scale, true);
    }
    return moving(fs, idx, U.sgn(v), cap, res, scale, false);
  }
  function moving(fs, idx, sg, cap, res, scale, fromRest) {
    var n = idx.length, tol = 1e-9 * scale, i, Fm = 0;
    // grounded particles (half-line capacity) can only move away from the floor
    for (i = 0; i < n; i++) {
      var cp = cap[i];
      if (!isFinite(cp[1]) && sg < 0) return Object.assign(res, { ok: false, why: 'pushes into floor' });
      if (!isFinite(cp[0]) && sg > 0) return Object.assign(res, { ok: false, why: 'pushes into floor' });
      Fm += fs[idx[i]].F;
    }
    var a = (res.D - sg * Fm) / res.M;
    if (fromRest && a * sg <= 0) return Object.assign(res, { ok: false, why: 'would not start to move' });
    var T = [], f = [], Tprev = 0;
    for (i = 0; i < n; i++) {
      var q = fs[idx[i]], fr = -sg * q.F;
      f.push(fr);
      var Tn = Tprev + q.m * a - q.G - q.P - fr;      // string i (between i and i+1) from particle i's equation
      if (i < n - 1) { T.push(Tn); Tprev = Tn; } else res.residual = Tn;   // last particle: must be 0
    }
    var okT = T.every(function (t) { return t >= -tol; });
    return Object.assign(res, { static: false, a: a, sigma: sg, T: T, Tlo: T.slice(), Thi: T.slice(), f: f, limiting: false, indeterminate: false,
      ok: okT, why: okT ? '' : 'negative tension' });
  }

  /** capacity interval for a particle at rest */
  function capOf(q, p, grounded) {
    if (grounded === 'hi') return [-Infinity, 0];   // floor in the +e direction pushes back along −e
    if (grounded === 'lo') return [0, Infinity];
    return [-q.F, q.F];
  }

  /**
   * Whole chain treated as taut at one instant (the textbook "one system" analysis).
   * Returns solveGroup result + per-particle forces fs, least μ values, lost contact flag.
   */
  function analyse(parts, g, v) {
    var fs = parts.map(function (p) { return pforces(p, g); });
    var scale = scaleOf(fs);
    var idx = parts.map(function (p, i) { return i; });
    var r = solveGroup(fs, idx, v || 0, fs.map(function (q) { return capOf(q); }), scale);
    r.fs = fs;
    r.lost = fs.some(function (q) { return q.lost; });
    // least μ for each surface particle (others unchanged), and the least common μ
    var sumR = 0; fs.forEach(function (q, i) { if (parts[i].track !== 'hang') sumR += q.R; });
    r.leastMuCommon = sumR > 0 ? Math.abs(r.D) / sumR : (Math.abs(r.D) < 1e-12 ? 0 : Infinity);
    r.leastMu = fs.map(function (q, i) {
      if (parts[i].track === 'hang') return null;
      var others = r.Fmax - q.F;
      return q.R > 0 ? Math.max(0, (Math.abs(r.D) - others) / q.R) : (Math.abs(r.D) <= others + 1e-12 ? 0 : Infinity);
    });
    return r;
  }
  function scaleOf(fs) { var s = 0; fs.forEach(function (q) { s += q.W + Math.abs(q.P) + Math.abs(q.Pn); }); return Math.max(s, 1e-9); }

  /** earliest root τ > eps of c0 + c1 τ + ½ c2 τ² = 0 */
  function firstRoot(c0, c1, c2, eps) {
    var r = U.quadratic(0.5 * c2, c1, c0).filter(function (x) { return x > eps; });
    return r.length ? r[0] : Infinity;
  }

  /**
   * Event-driven simulation of the chain.
   * spec = { g, particles:[...], u (initial common velocity), tMax,
   *          brk: {string:k, at:'time'|'distance'|'speed', value, ref:particle},   // string breaks
   *          detach: {particle:k, dm, at:'distance'|'time', value, ref} }          // mass falls off
   * Returns { phases:[{t0,t1,x0[],v0[],a[],m[],groups,strings,events}], stateAt(t), energyAt(t), log[], stop, tStop, first }
   */
  function simulate(spec) {
    var g = spec.g, parts = spec.particles, N = parts.length, tMax = spec.tMax || 10;
    var x = parts.map(function () { return 0; }), v = parts.map(function () { return spec.u || 0; });
    var mass = parts.map(function (p) { return p.m; });
    var broken = parts.map(function () { return false; }).slice(0, Math.max(0, N - 1));
    var t = 0, phases = [], log = [], stop = null, dist = parts.map(function () { return 0; });
    var brk = spec.brk && spec.brk.at && spec.brk.at !== 'none' ? Object.assign({ done: false }, spec.brk) : null;
    var det = spec.detach && spec.detach.at && spec.detach.at !== 'none' && spec.detach.dm > 0 ? Object.assign({ done: false }, spec.detach) : null;
    var impactLoss = 0, carried = 0, Wfric = 0, Wapp = 0;  // cumulative energy terms at the start of the current phase
    var energyMarks = [];
    var first = null;

    // validate
    var fs0 = parts.map(function (p, i) { return pforces(p, g, mass[i]); });
    if (fs0.some(function (q) { return q.lost; })) {
      return { invalid: 'The applied force lifts a particle off its surface (R < 0).', phases: [], log: [], stateAt: function () { return null; }, energyAt: function () { return null; } };
    }
    if (parts.some(function (p) { return !(p.m > 0); })) {
      return { invalid: 'Every mass must be positive.', phases: [], log: [], stateAt: function () { return null; }, energyAt: function () { return null; } };
    }

    for (var guard = 0; guard < 60; guard++) {
      var fs = parts.map(function (p, i) { return pforces(p, g, mass[i]); });
      var scale = scaleOf(fs), vtol = 1e-9 * Math.max(1, Math.abs(spec.u || 0), maxAbs(v));
      var grounded = parts.map(function (p, i) {
        if (Math.abs(v[i]) > vtol) return null;
        if (p.hiKind === 'floor' && isFinite(p.hi) && x[i] >= p.hi - 1e-9) return 'hi';
        if (p.loKind === 'floor' && isFinite(p.lo) && x[i] <= p.lo + 1e-9) return 'lo';
        return null;
      });
      // strings: candidates for taut / slack / jerk
      var cand = [], slackS = [], jerk = -1;
      for (var k = 0; k < N - 1; k++) {
        if (broken[k]) continue;
        var gap = x[k] - x[k + 1];
        var gtol = 1e-9 * Math.max(1, Math.abs(x[k]), Math.abs(x[k + 1]));
        if (gap <= gtol) {
          if (Math.abs(v[k] - v[k + 1]) <= vtol) cand.push(k);
          else if (v[k] < v[k + 1]) { jerk = k; break; }
          else slackS.push(k);
        } else slackS.push(k);
      }
      if (jerk >= 0) {
        stop = 'String ' + (jerk + 1) + ' becomes taut again with the particles moving apart: an impulsive tension (a jerk) — beyond the syllabus. The model stops here.';
        log.push({ t: t, text: stop, kind: 'warn' });
        break;
      }
      // enumerate subsets of candidate strings, most taut first
      var best = null, nc = cand.length;
      var subsets = [];
      for (var mask = 0; mask < (1 << nc); mask++) subsets.push(mask);
      subsets.sort(function (a, b) { return popcount(b) - popcount(a); });
      for (var si = 0; si < subsets.length && !best; si++) {
        var taut = {}; cand.forEach(function (kk, j) { if (subsets[si] & (1 << j)) taut[kk] = true; });
        var groups = [], cur = [0];
        for (var i = 1; i < N; i++) { if (taut[i - 1]) cur.push(i); else { groups.push(cur); cur = [i]; } }
        groups.push(cur);
        var sols = [], ok = true;
        for (var gi = 0; gi < groups.length && ok; gi++) {
          var idx = groups[gi], gv = v[idx[0]];
          var caps = idx.map(function (ii) { return capOf(fs[ii], parts[ii], grounded[ii]); });
          var s = solveGroup(fs, idx, gv, caps, scale);
          if (!s.ok) ok = false; else { s.idx = idx; sols.push(s); }
        }
        if (!ok) continue;
        var accOf = []; sols.forEach(function (s) { s.idx.forEach(function (ii) { accOf[ii] = s.a; }); });
        var tolA = 1e-9 * Math.max(1, g);
        var slackOk = cand.every(function (kk) { return taut[kk] || accOf[kk] >= accOf[kk + 1] - tolA; });
        if (!slackOk) continue;
        best = { groups: sols, taut: taut, acc: accOf };
      }
      if (!best) { stop = 'No consistent motion found (internal).'; log.push({ t: t, text: stop, kind: 'warn' }); break; }
      var a = best.acc;
      // per-string info for this phase
      var strings = [];
      for (var k2 = 0; k2 < N - 1; k2++) {
        if (broken[k2]) { strings.push({ state: 'broken', T: 0, Tlo: 0, Thi: 0 }); continue; }
        if (best.taut[k2]) {
          var grp = best.groups.filter(function (s) { return s.idx.indexOf(k2) >= 0 && s.idx.indexOf(k2 + 1) >= 0; })[0];
          var j = grp.idx.indexOf(k2);
          strings.push({ state: 'taut', T: grp.T[j], Tlo: grp.Tlo[j], Thi: grp.Thi[j], indeterminate: grp.static && grp.Thi[j] - grp.Tlo[j] > 1e-9 * scale });
        } else strings.push({ state: 'slack', T: 0, Tlo: 0, Thi: 0 });
      }
      var contact = [];
      best.groups.forEach(function (s) { s.idx.forEach(function (ii, j) { contact[ii] = s.f[j]; }); });
      if (!first) first = { groups: best.groups, strings: strings, fs: fs };

      // ---------- find the next event ----------
      var eps = 1e-12, tauBest = tMax - t, evs = [];
      function consider(tau, ev) {
        if (!(tau > eps) || !isFinite(tau)) return;
        if (tau < tauBest - 1e-12) { tauBest = tau; evs = [ev]; }
        else if (Math.abs(tau - tauBest) <= 1e-12) evs.push(ev);
      }
      for (var p = 0; p < N; p++) {
        if (Math.abs(v[p]) <= vtol && Math.abs(a[p]) < 1e-15) continue;
        var pp = parts[p];
        if (isFinite(pp.hi) && x[p] < pp.hi + 1e-12) consider(firstRoot(x[p] - pp.hi, v[p], a[p], eps), { kind: 'limit', p: p, side: 'hi', what: pp.hiKind || 'pulley' });
        if (isFinite(pp.lo) && x[p] > pp.lo - 1e-12) consider(firstRoot(x[p] - pp.lo, v[p], a[p], eps), { kind: 'limit', p: p, side: 'lo', what: pp.loKind || 'pulley' });
      }
      best.groups.forEach(function (s) {
        var ii = s.idx[0];
        if (Math.abs(v[ii]) > vtol && a[ii] * v[ii] < 0) consider(-v[ii] / a[ii], { kind: 'rest', group: s.idx });
      });
      for (var k3 = 0; k3 < N - 1; k3++) {
        if (broken[k3] || best.taut[k3]) continue;
        var g0 = x[k3] - x[k3 + 1], dv = v[k3] - v[k3 + 1], da = a[k3] - a[k3 + 1];
        var Ls = spec.strLen && spec.strLen[k3];
        if (Ls > 0 && isFinite(Ls)) consider(firstRoot(g0 - Ls, dv, da, eps), { kind: 'meet', k: k3 });
        if (g0 <= 1e-9 && Math.abs(dv) <= vtol && da >= -1e-12) continue;
        consider(firstRoot(g0, dv, da, eps), { kind: 'retaut', k: k3 });
      }
      [brk, det].forEach(function (tr, which) {
        if (!tr || tr.done) return;
        var kindName = which === 0 ? 'break' : 'detach';
        if (tr.at === 'time') consider(tr.value - t <= eps ? 2 * eps : tr.value - t, { kind: kindName });
        else if (tr.at === 'distance') {
          var r = tr.ref === undefined ? 0 : tr.ref, rem = tr.value - dist[r];
          if (rem <= 1e-12) consider(2 * eps, { kind: kindName });
          else {
            var dir = Math.abs(v[r]) > vtol ? U.sgn(v[r]) : U.sgn(a[r]);
            if (dir !== 0) consider(firstRoot(-dir * rem, v[r], a[r], eps), { kind: kindName });
          }
        } else if (tr.at === 'speed') {
          var r2 = tr.ref === undefined ? 0 : tr.ref;
          if (Math.abs(Math.abs(v[r2]) - tr.value) <= 1e-12) consider(2 * eps, { kind: kindName });
          else if (Math.abs(a[r2]) > 1e-15) {
            var c1 = (tr.value - v[r2]) / a[r2], c2 = (-tr.value - v[r2]) / a[r2];
            var tt = [c1, c2].filter(function (z) { return z > eps; }); if (tt.length) consider(Math.min.apply(null, tt), { kind: kindName });
          }
        }
      });
      var allStatic = best.groups.every(function (s) { return s.static; });
      var noEvents = evs.length === 0;
      var phase = { t0: t, t1: allStatic && noEvents ? Infinity : t + tauBest, x0: x.slice(), v0: v.slice(), a: a.slice(), m: mass.slice(),
        groups: best.groups, strings: strings, contact: contact, fs: fs, broken: broken.slice(), grounded: grounded.slice(),
        E0: { impact: impactLoss, carried: carried, Wfric: Wfric, Wapp: Wapp } };
      phases.push(phase);
      if (allStatic && noEvents) { break; }
      // advance
      var tau = tauBest;
      for (var q = 0; q < N; q++) {
        var dx = v[q] * tau + 0.5 * a[q] * tau * tau;
        dist[q] += Math.abs(dx);
        Wfric += fs[q].F * Math.abs(dx);   // kinetic friction μR × distance (static particles have dx = 0)
        Wapp += fs[q].P * dx;
        x[q] += dx; v[q] += a[q] * tau;
      }
      t += tau;
      if (noEvents) { stop = null; break; }   // reached tMax
      // ---------- apply events ----------
      var stopNow = null;
      evs.forEach(function (ev) {
        if (ev.kind === 'break') {
          brk.done = true; broken[brk.string] = true;
          log.push({ t: t, text: 'String ' + (brk.string + 1) + ' breaks (' + describeTrigger(brk, parts) + ').', kind: 'info' });
        } else if (ev.kind === 'detach') {
          det.done = true;
          var kd = det.particle, dm = Math.min(det.dm, mass[kd] - 1e-9);
          carried += 0.5 * dm * v[kd] * v[kd] + dm * g * x[kd] * Math.sin(U.rad(parts[kd].alpha || 0));
          mass[kd] -= dm;
          log.push({ t: t, text: U.sf(dm) + ' kg falls off ' + parts[kd].name + ' (' + describeTrigger(det, parts) + '). Mass now ' + U.sf(mass[kd]) + ' kg; velocity unchanged.', kind: 'info' });
        }
      });
      evs.forEach(function (ev) {
        if (ev.kind === 'limit') {
          var pp2 = parts[ev.p];
          x[ev.p] = ev.side === 'hi' ? pp2.hi : pp2.lo;
          if (ev.what === 'floor') {
            impactLoss += 0.5 * mass[ev.p] * v[ev.p] * v[ev.p];
            log.push({ t: t, text: pp2.name + ' hits the floor at ' + U.sf(Math.abs(v[ev.p])) + ' m s⁻¹ and does not rebound.', kind: 'info', p: ev.p });
            v[ev.p] = 0;
          } else {
            stopNow = pp2.name + ' reaches the ' + (ev.what === 'end' ? 'end of its surface' : 'pulley') + ' — the model ends here.';
          }
        } else if (ev.kind === 'rest') {
          ev.group.forEach(function (ii) { v[ii] = 0; });
          var rough = ev.group.some(function (ii) { return parts[ii].track !== 'hang' && (parts[ii].mu || 0) > 0; });
          log.push({ t: t, text: ev.group.map(function (ii) { return parts[ii].name; }).join(' and ') + (ev.group.length > 1 ? ' are' : ' is') + ' instantaneously at rest' + (rough ? ' — re-test: can friction hold ' + (ev.group.length > 1 ? 'them' : 'it') + '?' : '.'), kind: 'info' });
        } else if (ev.kind === 'meet') {
          stopNow = parts[ev.k].name + ' and ' + parts[ev.k + 1].name + ' meet (the slack string has closed up completely): a collision — the model stops here.';
        } else if (ev.kind === 'retaut') {
          stopNow = 'String ' + (ev.k + 1) + ' becomes taut again: an impulsive tension (a jerk) — beyond the syllabus. The model stops here.';
        }
      });
      if (stopNow) { stop = stopNow; log.push({ t: t, text: stop, kind: 'warn' }); break; }
      if (t >= tMax - 1e-12) break;
    }
    // final frozen phase if stopped
    var tStop = stop ? t : null;
    if (stop) {
      var fsF = parts.map(function (p, i) { return pforces(p, g, mass[i]); });
      phases.push({ t0: t, t1: Infinity, x0: x.slice(), v0: v.slice(), a: x.map(function () { return 0; }), m: mass.slice(), groups: [], strings: (phases.length ? phases[phases.length - 1].strings : []),
        contact: [], fs: fsF, broken: broken.slice(), stopped: true, E0: { impact: impactLoss, carried: carried, Wfric: Wfric, Wapp: Wapp } });
    }
    function phaseAt(T) {
      for (var i = 0; i < phases.length; i++) if (T < phases[i].t1 || i === phases.length - 1) return phases[i];
      return phases[phases.length - 1];
    }
    function stateAt(T) {
      if (!phases.length) return null;
      var ph = phaseAt(T), d = Math.max(0, T - ph.t0);
      if (ph.stopped) d = 0;
      return { phase: ph, t: T, stopped: !!ph.stopped,
        x: ph.x0.map(function (x0, i) { return x0 + ph.v0[i] * d + 0.5 * ph.a[i] * d * d; }),
        v: ph.v0.map(function (v0, i) { return v0 + ph.a[i] * d; }), a: ph.a.slice(), m: ph.m.slice(), strings: ph.strings };
    }
    /** energy account at time T: KE, GPE (relative to start), work against friction, applied work, impact loss, carried off */
    function energyAt(T) {
      var s = stateAt(T); if (!s) return null;
      var ph = s.phase, d = ph.stopped ? 0 : Math.max(0, T - ph.t0), wf = ph.E0.Wfric, wa = ph.E0.Wapp;
      var KE = 0, GPE = 0;
      for (var i = 0; i < N; i++) {
        var dx = ph.v0[i] * d + 0.5 * ph.a[i] * d * d;
        wf += ph.fs[i].F * Math.abs(dx);
        wa += ph.fs[i].P * dx;
        KE += 0.5 * s.m[i] * s.v[i] * s.v[i];
        GPE += s.m[i] * g * s.x[i] * Math.sin(U.rad(parts[i].alpha || 0));
      }
      var KE0 = 0; for (var j = 0; j < N; j++) KE0 += 0.5 * parts[j].m * (spec.u || 0) * (spec.u || 0);
      return { KE: KE, GPE: GPE, Wfric: wf, Wapp: wa, impact: ph.E0.impact, carried: ph.E0.carried, KE0: KE0,
        balance: KE + GPE + wf + ph.E0.impact + ph.E0.carried - wa - KE0 };
    }
    return { phases: phases, stateAt: stateAt, energyAt: energyAt, log: log, stop: stop, tStop: tStop, first: first, tEnd: t };
  }
  function popcount(n) { var c = 0; while (n) { c += n & 1; n >>= 1; } return c; }
  function maxAbs(a) { var m = 0; a.forEach(function (z) { m = Math.max(m, Math.abs(z)); }); return m; }
  function describeTrigger(tr, parts) {
    var who = parts[tr.ref === undefined ? 0 : tr.ref].name;
    if (tr.at === 'time') return 't = ' + U.sf(tr.value) + ' s';
    if (tr.at === 'distance') return who + ' has moved ' + U.sf(tr.value) + ' m';
    if (tr.at === 'speed') return 'speed ' + U.sf(tr.value) + ' m s⁻¹';
    return '';
  }

  /**
   * Standard configurations → chain particles (chain order: particle 1's e points towards its pulley,
   * the last particle's e points away from its pulley, so "positive" is the natural direction).
   * c = { type:'atwood'|'table'|'incline'|'double'|'step'|'ihh'|'pair', m1,m2,m3, mC (extra mass on the last particle),
   *       th1, th2, mu1, mu2, mu3, P (force on the leading surface particle along its e; for 'pair' on the upper particle;
   *       for 'double'/'step' on particle B along e_B), h (height of the descending hanging particle above the floor),
   *       dP (distance of the leading surface particle from its pulley) }
   * Returns { particles, positive (text), slot: [names in drawing order] }
   */
  function build(c) {
    var INF = Infinity, h = c.h > 0 ? c.h : INF, dP = c.dP > 0 ? c.dP : INF, mC = c.mC || 0;
    var S = function (o) { return Object.assign({ track: 'surface', mu: 0, P: 0, Pn: 0, lo: -INF, hi: INF }, o); };
    var H = function (o) { return Object.assign({ track: 'hang', mu: 0, P: 0, Pn: 0, lo: -INF, hi: INF }, o); };
    switch (c.type) {
      case 'atwood': return { particles: [
          H({ name: 'A', m: c.m1, alpha: 90, hi: dP, hiKind: 'pulley' }),
          H({ name: 'B', m: c.m2 + mC, alpha: -90, hi: h, hiKind: 'floor' })],
        positive: 'B moves down, A moves up' };
      case 'table': return { particles: [
          S({ name: 'A', m: c.m1, alpha: 0, mu: c.mu1, P: c.P || 0, hi: dP, hiKind: 'pulley' }),
          H({ name: 'B', m: c.m2 + mC, alpha: -90, hi: h, hiKind: 'floor' })],
        positive: 'B moves down, A moves towards the pulley' };
      case 'incline': return { particles: [
          S({ name: 'A', m: c.m1, alpha: c.th1, mu: c.mu1, P: c.P || 0, hi: dP, hiKind: 'pulley' }),
          H({ name: 'B', m: c.m2 + mC, alpha: -90, hi: h, hiKind: 'floor' })],
        positive: 'B moves down, A moves up the slope' };
      case 'double': return { particles: [
          S({ name: 'A', m: c.m1, alpha: c.th1, mu: c.mu1, hi: dP, hiKind: 'pulley' }),
          S({ name: 'B', m: c.m2, alpha: -c.th2, mu: c.mu2, P: c.P || 0, lo: c.dP > 0 ? -c.dP : -INF, loKind: 'pulley' })],
        positive: 'A moves up its slope towards the pulley, B moves down its slope' };
      case 'step': return { particles: [   // s22_43 Q6 geometry: pulley at the corner B, both particles below/above it on the same side
          S({ name: 'B', m: c.m2, alpha: -c.th2, mu: c.mu2, P: c.P || 0, hi: dP, hiKind: 'pulley' }),
          S({ name: 'A', m: c.m1, alpha: -c.th1, mu: c.mu1 })],
        positive: 'B moves down its slope towards the pulley, A moves down its slope away from the pulley' };
      case 'ihh': return { particles: [
          S({ name: 'A', m: c.m1, alpha: c.th1, mu: c.mu1 }),
          S({ name: 'B', m: c.m2, alpha: 0, mu: c.mu2, hi: dP, hiKind: 'pulley' }),
          H({ name: 'C', m: c.m3 + mC, alpha: -90, hi: h, hiKind: 'floor' })],
        positive: 'C moves down, B moves towards C’s pulley, A moves up the slope' };
      case 'pair': return { particles: [
          S({ name: 'A', m: c.m1, alpha: c.th1, mu: c.mu1 }),
          S({ name: 'B', m: c.m2, alpha: c.th1, mu: c.mu2, P: c.P || 0 })],
        positive: 'up the slope (B is the upper particle, pulled by the force)', strLen: c.len > 0 ? [c.len] : undefined };
    }
    return null;
  }

  /* =====================================================================
     VEHICLE + TRAILER (PLAN S9). Positive = direction of motion (uphill if θ > 0).
     p = { m1, m2, g, theta (deg, + uphill), sinTheta (optional, overrides), R1, R2, k, n (resistance R0 + k vⁿ on the car+trailer,
           shared in proportion R1:R2 … simplest: k applies to the car only), mode:'force'|'power', D, P, v, brake }
     ===================================================================== */
  function sinOf(p) { return p.sinTheta !== undefined && p.sinTheta !== null && isFinite(p.sinTheta) ? p.sinTheta : Math.sin(U.rad(p.theta || 0)); }
  function vehicle(p) {
    var g = p.g, m1 = p.m1, m2 = p.m2 || 0, M = m1 + m2, s = sinOf(p);
    var out = { M: M, s: s, warn: [] };
    var v = p.v, vUsed = v;
    var kv = (p.k || 0) * Math.pow(Math.max(0, v || 0), p.n || 1);
    var R1 = (p.R1 || 0) + kv, R2 = p.R2 || 0, Bk = p.brake || 0;
    var Dr;
    if (p.mode === 'power') {
      if (!(v > 0)) { out.invalid = 'Speed must be positive to use D = P ÷ v.'; return out; }
      if (v < 0.1) { vUsed = 0.1; out.warn.push('v clamped to 0.1 m s⁻¹ (D = P ÷ v grows without limit as v → 0).'); }
      Dr = p.P / vUsed;
    } else Dr = p.D || 0;
    var a = (Dr - R1 - R2 - Bk - M * g * s) / M;
    var T = m2 > 0 ? m2 * (a + g * s) + R2 : 0;    // trailer: T − R2 − m2 g sinθ = m2 a
    out.D = Dr; out.R1 = R1; out.R2 = R2; out.brake = Bk; out.a = a; out.T = T; out.Wpar1 = m1 * g * s; out.Wpar2 = m2 * g * s;
    out.carCheck = Dr - R1 - Bk - m1 * g * s - T - m1 * a;     // car equation residual (must be 0)
    out.thrust = m2 > 0 && T < -1e-9 * Math.max(1, M * g);
    if (out.thrust && p.coupling === 'rope') out.slack = true;
    // maximum speed at this power (constant resistances + k vⁿ)
    if (p.mode === 'power' || p.P > 0) out.vmax = vmax({ P: p.P, R0: (p.R1 || 0) + R2 + Bk + M * g * s, k: p.k || 0, n: p.n || 1 });
    return out;
  }
  /** P/v = R0 + k vⁿ → v (positive root); Infinity / NaN when no finite maximum */
  function vmax(o) {
    var P = o.P, R0 = o.R0, k = o.k || 0, n = o.n || 1;
    if (!(P > 0)) return NaN;
    if (k <= 0) return R0 > 0 ? P / R0 : Infinity;
    if (n === 1) { var r = U.quadratic(k, R0, -P).filter(function (z) { return z > 0; }); return r.length ? r[r.length - 1] : Infinity; }
    var f = function (vv) { return k * Math.pow(vv, n + 1) + R0 * vv - P; };
    var hi = 1; while (f(hi) < 0 && hi < 1e7) hi *= 2;
    return f(hi) < 0 ? Infinity : U.bisect(f, 0, hi);
  }
  /** power needed for acceleration a at speed v */
  function powerFor(o) { return (o.M * o.a + o.R + o.M * o.g * (o.s || 0)) * o.v; }
  /** hill angle (deg) for constant speed v at power P against resistance R: P/v = R + M g sinθ */
  function hillAngle(o) { var s = (o.P / o.v - o.R) / (o.M * o.g); return Math.abs(s) <= 1 ? { s: s, theta: U.deg(Math.asin(s)) } : { s: s, theta: NaN }; }
  /** resistance for acceleration a at power P and speed v */
  function resistanceFor(o) { return o.P / o.v - o.M * o.a - o.M * o.g * (o.s || 0); }
  /** speed v at which power P gives acceleration a: P/v = M a + R + M g sinθ */
  function speedFor(o) { var den = o.M * o.a + o.R + o.M * o.g * (o.s || 0); return den > 0 ? o.P / den : NaN; }
  /**
   * Constant-power (or constant-force) motion with RK4: M dv/dt = D(v) − R0 − k vⁿ − M g sinθ.
   * Returns a precomputed track {t:[],v:[],s:[]} and at(T) by linear interpolation. Labelled
   * "exam questions use instantaneous values" in the page.
   */
  function track(o) {
    var M = o.M, g = o.g, s = o.s || 0, dt = o.dt || 0.01, Tm = o.tMax || 60, n = o.n || 1, k = o.k || 0;
    var vmin = 0.1, ts = [0], vs = [Math.max(o.v0, o.mode === 'power' ? vmin : -Infinity)], ss = [0];
    var acc = function (t, y) {
      var vv = y[0], D = o.mode === 'power' ? o.P / Math.max(vv, vmin) : o.D;
      var res = (o.R0 || 0) + k * Math.pow(Math.max(0, Math.abs(vv)), n);
      var dir = vv > 1e-9 ? 1 : (vv < -1e-9 ? -1 : 0);
      return [(D - res * (dir || 1) - M * g * s) / M, vv];
    };
    var y = [vs[0], 0], t = 0, steps = Math.ceil(Tm / dt), h = Tm / steps;
    for (var i = 0; i < steps; i++) {
      y = U.rk4(acc, t, y, h); t += h;
      if (o.mode === 'power' && y[0] < vmin) y[0] = vmin;
      ts.push(t); vs.push(y[0]); ss.push(y[1]);
    }
    function at(T) {
      if (T <= 0) return { v: vs[0], s: 0 };
      var j = Math.min(ts.length - 2, Math.floor(T / h)), f = U.clamp((T - ts[j]) / h, 0, 1);
      return { v: vs[j] + (vs[j + 1] - vs[j]) * f, s: ss[j] + (ss[j + 1] - ss[j]) * f };
    }
    return { t: ts, v: vs, s: ss, at: at, h: h };
  }

  /* =====================================================================
     LIFT (PLAN S10). Positive = UP. T = (M+m)(g+a), R = m(g+a).
     stages: [{type:'a', a, t} | {type:'v', v, t} (reach v_end in time t) | {type:'rest', t} | {type:'const', t}]
     ===================================================================== */
  function liftForces(o) {
    var T = (o.M + o.m) * (o.g + o.a), R = o.m * (o.g + o.a);
    return { T: T, R: R, slack: T < -1e-9, leavesFloor: R < -1e-9 && o.m > 0 };
  }
  function liftProfile(o) {
    var segs = [], t = 0, v = o.u || 0, s = 0;
    (o.stages || []).forEach(function (st) {
      var dur = Math.max(0, st.t || 0), a;
      if (st.type === 'v') a = dur > 0 ? (st.v - v) / dur : 0;
      else if (st.type === 'a') a = st.a;
      else if (st.type === 'rest') { a = 0; v = 0; }
      else a = 0;
      var f = liftForces({ M: o.M, m: o.m, g: o.g, a: a });
      segs.push({ t0: t, t1: t + dur, u: v, a: a, s0: s, T: f.T, R: f.R, slack: f.slack, leavesFloor: f.leavesFloor });
      s += v * dur + 0.5 * a * dur * dur; v += a * dur; t += dur;
    });
    function at(T) {
      if (!segs.length) return { t: T, v: o.u || 0, s: 0, a: 0, T: (o.M + o.m) * o.g, R: o.m * o.g, seg: -1 };
      var k = 0; while (k < segs.length - 1 && T > segs[k].t1) k++;
      var sg = segs[k], d = U.clamp(T - sg.t0, 0, sg.t1 - sg.t0);
      if (T > sg.t1) { // after the profile: constant velocity
        var vEnd = sg.u + sg.a * (sg.t1 - sg.t0), sEnd = sg.s0 + sg.u * (sg.t1 - sg.t0) + 0.5 * sg.a * Math.pow(sg.t1 - sg.t0, 2);
        var f0 = liftForces({ M: o.M, m: o.m, g: o.g, a: 0 });
        return { t: T, v: vEnd, s: sEnd + vEnd * (T - sg.t1), a: 0, T: f0.T, R: f0.R, seg: -1 };
      }
      return { t: T, v: sg.u + sg.a * d, s: sg.s0 + sg.u * d + 0.5 * sg.a * d * d, a: sg.a, T: sg.T, R: sg.R, seg: k };
    }
    var totT = t, vEnd = v, sEnd = s, dist = 0;
    segs.forEach(function (sg) {   // distance (velocity may change sign within a stage)
      var dur = sg.t1 - sg.t0, ts = [0, dur];
      if (Math.abs(sg.a) > 1e-15) { var tz = -sg.u / sg.a; if (tz > 0 && tz < dur) ts = [0, tz, dur]; }
      for (var i = 1; i < ts.length; i++) dist += Math.abs(sg.u * (ts[i] - ts[i - 1]) + 0.5 * sg.a * (ts[i] * ts[i] - ts[i - 1] * ts[i - 1]));
    });
    return { segs: segs, at: at, tEnd: totT, vEnd: vEnd, sEnd: sEnd, distance: dist };
  }
  /** load mass from a cable tension: m = T/(g+a) − M */
  function liftLoadFromT(o) { return o.T / (o.g + o.a) - o.M; }

  return { pforces: pforces, solveGroup: solveGroup, analyse: analyse, simulate: simulate, build: build,
    vehicle: vehicle, vmax: vmax, powerFor: powerFor, hillAngle: hillAngle, resistanceFor: resistanceFor, speedFor: speedFor, track: track,
    liftForces: liftForces, liftProfile: liftProfile, liftLoadFromT: liftLoadFromT };
});
