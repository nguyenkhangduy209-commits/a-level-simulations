/* SIM.motion — 9702 topic 2.1: multi-stage straight-line motion with constant acceleration in each stage,
   bouncing ball (rebound speed = given fraction of impact speed; NOT a coefficient of restitution),
   and data for the free-fall experiment (2.1.8) with random and systematic errors.
   Sign convention: displacement, velocity, acceleration positive in the chosen + direction (up for vertical motion). */
(function (root, f) {
  var m = f(typeof require === 'function' && typeof module === 'object' ? require('../core/util.js') : root.SIM.util,
    typeof require === 'function' && typeof module === 'object' ? require('./phys-measure.js') : root.SIM.measure);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).motion = m;
})(typeof self !== 'undefined' ? self : this, function (U, M) {
  'use strict';
  var EPS = 1e-12;

  /* ---------- multi-stage journey ---------- */
  /**
   * u0: initial velocity; stages: [{type:'a', t, a} | {type:'v', t, v} | {type:'c', t} | {type:'d', d, v} | {type:'fall', t}], g for 'fall'.
   * Returns {segs, T, stateAt(t), totals, invalid}
   */
  function journey(u0, stages, g) {
    var segs = [], t = 0, s = 0, u = u0, dist = 0, invalid = null;
    for (var i = 0; i < stages.length; i++) {
      var st = stages[i], dur, a;
      if (st.type === 'a') { dur = st.t; a = st.a; }
      else if (st.type === 'fall') { dur = st.t; a = -(g || 9.81); }
      else if (st.type === 'c') { dur = st.t; a = 0; }
      else if (st.type === 'v') {
        dur = st.t;
        if (!(dur > EPS)) { invalid = 'Stage ' + (i + 1) + ': a velocity change needs a time t > 0'; break; }
        a = (st.v - u) / dur;
      } else if (st.type === 'd') {
        if (Math.abs(u + st.v) < 1e-9) { invalid = 'Stage ' + (i + 1) + ': u + v = 0, so t = 2s ÷ (u + v) is undefined'; break; }
        dur = 2 * st.d / (u + st.v);
        if (!(dur > EPS)) { invalid = 'Stage ' + (i + 1) + ': t = 2s ÷ (u + v) is not positive, so this displacement and final velocity are impossible'; break; }
        a = (st.v * st.v - u * u) / (2 * st.d);
      } else continue;
      if (!(dur > EPS)) continue;
      var v = u + a * dur, s1 = s + u * dur + 0.5 * a * dur * dur;
      // distance within the stage (split at a turning point)
      var dd, tTurn = Math.abs(a) > EPS ? -u / a : -1;
      if (tTurn > EPS && tTurn < dur - EPS) { var sT = u * tTurn + 0.5 * a * tTurn * tTurn; dd = Math.abs(sT) + Math.abs((s1 - s) - sT); }
      else { tTurn = null; dd = Math.abs(s1 - s); }
      segs.push({ i: i, type: st.type, t0: t, t1: t + dur, dur: dur, u: u, v: v, a: a, s0: s, s1: s1, ds: s1 - s, dist0: dist, dist: dd, tTurn: tTurn === null ? null : t + tTurn });
      t += dur; s = s1; u = v; dist += dd;
    }
    var T = t;
    function stateAt(time) {
      if (!segs.length) return { s: 0, v: u0, a: 0, dist: 0, seg: -1 };
      var tt = U.clamp(time, 0, T);
      for (var k = 0; k < segs.length; k++) {
        var g0 = segs[k];
        if (tt <= g0.t1 + 1e-12 || k === segs.length - 1) {
          var d = tt - g0.t0, sd = g0.u * d + 0.5 * g0.a * d * d, ds;
          if (g0.tTurn !== null && tt > g0.tTurn) { var tau = g0.tTurn - g0.t0, sT = g0.u * tau + 0.5 * g0.a * tau * tau; ds = Math.abs(sT) + Math.abs(sd - sT); }
          else ds = Math.abs(sd);
          return { s: g0.s0 + sd, v: g0.u + g0.a * d, a: g0.a, dist: g0.dist0 + ds, seg: k };
        }
      }
      return { s: s, v: u, a: 0, dist: dist, seg: segs.length - 1 };
    }
    return { segs: segs, T: T, stateAt: stateAt, invalid: invalid,
      totals: { disp: s, dist: dist, avgSpeed: T > 0 ? dist / T : NaN, avgVel: T > 0 ? s / T : NaN, vEnd: u } };
  }
  /** displacement between t1 and t2 (signed area under v–t) and distance (unsigned area) */
  function areaBetween(J, t1, t2) {
    var a = J.stateAt(t1), b = J.stateAt(t2);
    return { disp: b.s - a.s, dist: b.dist - a.dist };
  }

  /* ---------- bouncing ball ---------- */
  /** h ≥ 0 start height, u initial velocity (up +), k rebound fraction (speed after = k × speed before), g. */
  function bounce(h, u, k, g, maxBounces) {
    maxBounces = maxBounces || 30;
    var flights = [], impacts = [], t = 0, y0 = Math.max(0, h), v0 = u, distance = 0;
    for (var n = 0; n <= maxBounces; n++) {
      var D = v0 * v0 + 2 * g * y0;
      var tau = (v0 + Math.sqrt(D)) / g;
      var vIn = -Math.sqrt(D);
      // distance in this flight: up to apex (if rising) then down
      var up = v0 > 0 ? v0 * v0 / (2 * g) : 0;
      flights.push({ t0: t, t1: t + tau, y0: y0, v0: v0, dist0: distance });
      distance += 2 * up + y0;
      t += tau;
      var vOut = k * Math.abs(vIn);
      impacts.push({ t: t, vIn: vIn, vOut: vOut, n: n + 1 });
      if (vOut < 1e-3 || n === maxBounces) { impacts[impacts.length - 1].last = true; break; }
      y0 = 0; v0 = vOut;
    }
    var tRest = t;
    function stateAt(time) {
      if (time >= tRest) return { y: 0, v: 0, a: 0, rest: true, dist: distance };
      for (var i = 0; i < flights.length; i++) {
        var f = flights[i];
        if (time <= f.t1) {
          var d = Math.max(0, time - f.t0), y = f.y0 + f.v0 * d - 0.5 * g * d * d, v = f.v0 - g * d;
          var tApex = f.v0 > 0 ? f.v0 / g : 0, yA = f.y0 + (f.v0 > 0 ? f.v0 * f.v0 / (2 * g) : 0);
          var dd = d <= tApex ? (y - f.y0) : (yA - f.y0) + (yA - y);
          return { y: y, v: v, a: -g, rest: false, dist: f.dist0 + Math.abs(dd), flight: i };
        }
      }
      return { y: 0, v: 0, a: 0, rest: true, dist: distance };
    }
    return { flights: flights, impacts: impacts, tRest: tRest, stateAt: stateAt, distance: distance };
  }

  /* ---------- straight-line fit ---------- */
  function linfit(xs, ys) {
    var n = xs.length; if (n < 2) return null;
    var sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
    for (var i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; syy += ys[i] * ys[i]; }
    var den = n * sxx - sx * sx; if (Math.abs(den) < 1e-300) return null;
    var m = (n * sxy - sx * sy) / den, c = (sy - m * sx) / n;
    var rden = Math.sqrt(den * (n * syy - sy * sy));
    return { m: m, c: c, r: rden > 0 ? (n * sxy - sx * sy) / rden : 1 };
  }

  /* ---------- free-fall experiment ---------- */
  /**
   * o = {method:'trapdoor'|'lightgate', hs:[recorded heights], g, delay (s, trapdoor only: timer runs this long extra),
   *      hErr (m: recorded h − true fall distance), sigma (s, random timing error per reading), repeats, L (card length, light gate), seed}
   */
  function freefallExp(o) {
    var r = M.rng(o.seed || 1), rows = [], warn = null, g = o.g;
    for (var i = 0; i < o.hs.length; i++) {
      var hRec = o.hs[i], hTrue = hRec - (o.hErr || 0);
      if (!(hTrue > 0)) return { invalid: 'With this h error the true fall distance would be zero or negative' };
      var reps = [];
      for (var j = 0; j < (o.repeats || 1); j++) {
        var tm;
        if (o.method === 'lightgate') {
          var dtTrue = Math.sqrt(2 * (hTrue + o.L) / g) - Math.sqrt(2 * hTrue / g);
          tm = dtTrue + (o.sigma || 0) * M.gaussian(r);
          if (tm < 0.2 * dtTrue) { tm = 0.2 * dtTrue; warn = 'Random error is so large compared with the card transit time that some readings were clipped.'; }
        } else {
          tm = Math.sqrt(2 * hTrue / g) + (o.delay || 0) + (o.sigma || 0) * M.gaussian(r);
          if (tm <= 0.001) { tm = 0.001; warn = 'Random error larger than the fall time: some readings were clipped.'; }
        }
        reps.push(tm);
      }
      var st = M.stats(reps);
      var row = { h: hRec, hTrue: hTrue, reps: reps, t: st.mean, halfRange: st.halfRange };
      if (o.method === 'lightgate') { row.v = o.L / st.mean; row.v2 = row.v * row.v; }
      else { row.t2 = st.mean * st.mean; row.sqrtH = Math.sqrt(hRec); }
      rows.push(row);
    }
    var out = { rows: rows, warn: warn, method: o.method };
    if (o.method === 'lightgate') {
      out.fitV2 = linfit(rows.map(function (q) { return q.h; }), rows.map(function (q) { return q.v2; }));
      if (out.fitV2) out.gFromV2 = out.fitV2.m / 2;                 // v² = 2gh ⇒ gradient 2g
    } else {
      out.fitH = linfit(rows.map(function (q) { return q.t2; }), rows.map(function (q) { return q.h; }));
      if (out.fitH) out.gFromH = 2 * out.fitH.m;                    // h = ½gt² ⇒ gradient g/2
      out.fitT = linfit(rows.map(function (q) { return q.sqrtH; }), rows.map(function (q) { return q.t; }));
      if (out.fitT && Math.abs(out.fitT.m) > 1e-12) out.gFromT = 2 / (out.fitT.m * out.fitT.m);   // t = √(2/g)·√h + δ
    }
    return out;
  }

  return { journey: journey, areaBetween: areaBetween, bounce: bounce, linfit: linfit, freefallExp: freefallExp };
});
