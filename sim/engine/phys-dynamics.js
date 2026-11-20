/* SIM.dynamics — 9702 topic 3: momentum and Newton's laws (3.1), non-uniform motion with drag (3.2, qualitative),
   conservation of momentum in one and two dimensions (3.3).
   No coefficient of restitution (3.3.2): elastic collisions use "relative speed of approach = relative speed of separation". */
(function (root, f) {
  var m = f(typeof require === 'function' && typeof module === 'object' ? require('../core/util.js') : root.SIM.util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).dynamics = m;
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';
  var TOL = 1e-9;

  /* ---------- 1-D collisions (body 1 starts on the left; + to the right) ---------- */
  function collide1D(o) {
    var m1 = o.m1, m2 = o.m2, u1 = o.u1, u2 = o.u2, v1, v2, flag = null;
    var approach = u1 - u2;
    var p0 = m1 * u1 + m2 * u2, KE0 = 0.5 * m1 * u1 * u1 + 0.5 * m2 * u2 * u2;
    if (approach <= TOL) return { noCollision: true, p0: p0, KE0: KE0, approach: approach };
    if (o.mode === 'elastic') {
      v1 = ((m1 - m2) * u1 + 2 * m2 * u2) / (m1 + m2);
      v2 = ((m2 - m1) * u2 + 2 * m1 * u1) / (m1 + m2);
    } else if (o.mode === 'stick') {
      v1 = v2 = p0 / (m1 + m2);
    } else {
      v1 = o.v1; v2 = (p0 - m1 * v1) / m2;
    }
    var KE1 = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2, dKE = KE1 - KE0;
    var separation = v2 - v1;
    if (separation < -1e-9 * Math.max(1, Math.abs(approach))) flag = 'pass';            // 1 would pass through 2
    else if (dKE > 1e-9 * Math.max(1, KE0)) flag = 'gain';                              // KE increases: needs stored energy released
    var kind = flag === 'pass' ? 'impossible' : Math.abs(dKE) <= 1e-9 * Math.max(1, KE0) ? 'elastic'
      : Math.abs(separation) <= 1e-9 * Math.max(1, Math.abs(approach)) ? 'perfectly inelastic (bodies move together)' : dKE > 0 ? 'KE gained (explosive)' : 'inelastic';
    return { v1: v1, v2: v2, p0: p0, p1: m1 * v1 + m2 * v2, KE0: KE0, KE1: KE1, dKE: dKE, approach: approach, separation: separation,
      dp1: m1 * (v1 - u1), dp2: m2 * (v2 - u2), flag: flag, kind: kind };
  }

  /**
   * Several bodies on a line (point bodies; + to the right), every collision of one type:
   *   chain1D({ bodies: [{ name, m, u, x }], mode: 'elastic' | 'stick', tMax })
   * Event-driven: the next pair to meet (adjacent bodies, left one faster to the right) collides with
   * collide1D; 'stick' merges the pair into one body. Returns
   *   { events: [{ t, x, n, names, ids, m:[mL,mR], u:[uL,uR], v:[vL,vR], res, merged }], segments, stateAt(t), stopReason, error }.
   */
  function chain1D(o) {
    var mode = o.mode === 'stick' ? 'stick' : 'elastic', tMax = o.tMax > 0 ? o.tMax : 10;
    var bodies = (o.bodies || []).map(function (b, i) { return { ids: [i], name: b.name !== undefined ? String(b.name) : String(i + 1), m: b.m, x: b.x, v: b.u }; });
    function empty(msg) { return { error: msg, events: [], segments: [], stateAt: function () { return []; }, stopReason: msg }; }
    if (bodies.some(function (b) { return !(b.m > 0); })) return empty('Masses must be positive.');
    if (bodies.some(function (b) { return !isFinite(b.x) || !isFinite(b.v); })) return empty('Positions and velocities must be numbers.');
    bodies.sort(function (a, b) { return a.x - b.x; });
    var t = 0, segs = [], events = [], stop = null;
    function snap() { return bodies.map(function (b) { return { ids: b.ids.slice(), name: b.name, m: b.m, x0: b.x, v: b.v }; }); }
    for (var guard = 0; guard < 60; guard++) {
      var best = Infinity, idx = -1;
      for (var j = 0; j + 1 < bodies.length; j++) {
        var dv = bodies[j].v - bodies[j + 1].v;
        if (dv > TOL) { var tc = Math.max(0, (bodies[j + 1].x - bodies[j].x) / dv); if (tc < best - 1e-12) { best = tc; idx = j; } }
      }
      var tEnd = Math.min(t + (best < Infinity ? best : Infinity), tMax);
      segs.push({ t0: t, t1: tEnd, bodies: snap() });
      if (!(best < Infinity)) { stop = 'no further collisions'; break; }
      if (t + best > tMax) { stop = 'time window ends'; break; }
      bodies.forEach(function (b) { b.x += b.v * best; }); t += best;
      var L = bodies[idx], R = bodies[idx + 1];
      R.x = L.x;   // they meet at one point
      var res = collide1D({ m1: L.m, u1: L.v, m2: R.m, u2: R.v, mode: mode });
      var ev = { t: t, x: L.x, n: events.length + 1, names: [L.name, R.name], ids: [L.ids.slice(), R.ids.slice()], m: [L.m, R.m], u: [L.v, R.v], v: [res.v1, res.v2], res: res, merged: mode === 'stick' };
      events.push(ev);
      if (mode === 'stick') bodies.splice(idx, 2, { ids: L.ids.concat(R.ids), name: L.name + '+' + R.name, m: L.m + R.m, x: L.x, v: res.v1 });
      else { L.v = res.v1; R.v = res.v2; }
    }
    if (!stop) stop = 'too many collisions';
    var last = segs[segs.length - 1];
    function stateAt(T) {
      var s = segs[0];
      for (var k = 0; k < segs.length; k++) if (T >= segs[k].t0 - 1e-12) s = segs[k];
      var d = s === last ? T - s.t0 : Math.min(T, s.t1) - s.t0;
      return s.bodies.map(function (b) { return { ids: b.ids, name: b.name, m: b.m, x: b.x0 + b.v * Math.max(0, d), v: b.v }; });
    }
    return { events: events, segments: segs, stateAt: stateAt, stopReason: stop };
  }

  /* ---------- force–time profile for a contact of duration dt (area = Δp) ---------- */
  // shape 'rect': constant force; 'tri': rises linearly then falls (peak = 2 × average). x = τ/dt in [0,1].
  function profile(shape, x) {           // force ÷ average force
    if (x < 0 || x > 1) return 0;
    if (shape === 'tri') return x < 0.5 ? 4 * x : 4 * (1 - x);
    return 1;
  }
  function cumulative(shape, x) {        // ∫0^x profile = fraction of Δp delivered
    if (x <= 0) return 0; if (x >= 1) return 1;
    if (shape === 'tri') return x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x);
    return x;
  }
  function cumulative2(shape, x) {       // ∫0^x cumulative (for position)
    if (x <= 0) return 0;
    if (x >= 1) return 0.5 + (x - 1);
    if (shape === 'tri') return x < 0.5 ? 2 * x * x * x / 3 : x + 2 * Math.pow(1 - x, 3) / 3 - 0.5;
    return x * x / 2;
  }
  /** velocity and position of a body with velocity u before contact at tc, v after, contact time dt */
  function contactTrack(u, v, tc, dt, shape, x0) {
    return {
      v: function (t) { return t <= tc ? u : u + (v - u) * cumulative(shape, (t - tc) / dt); },
      x: function (t) { if (t <= tc) return x0 + u * (t - tc); var x = (t - tc) / dt; return x0 + u * (t - tc) + (v - u) * dt * cumulative2(shape, x); }
    };
  }
  /** F = Δp/Δt */
  function forceFromMomentum(dp, dt) { return dt > 0 ? dp / dt : NaN; }

  /* ---------- 2-D momentum ---------- */
  function polar(mag, deg) { var r = U.rad(deg); return [mag * Math.cos(r), mag * Math.sin(r)]; }
  function magAng(v) { return { mag: Math.hypot(v[0], v[1]), ang: U.deg(Math.atan2(v[1], v[0])) }; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  function scale(a, k) { return [a[0] * k, a[1] * k]; }
  function ke(m, v) { return 0.5 * m * (v[0] * v[0] + v[1] * v[1]); }
  /**
   * mode 'one': v1 given → v2. 'dirs': final directions a1, a2 (deg) given → speeds. 'stick': coalesce.
   * 'explode': three fragments m1, m2, m3 from a body moving with uC; v1, v2 given → v3.
   */
  function collide2D(o) {
    var res = { mode: o.mode };
    if (o.mode === 'explode') {
      var M = o.m1 + o.m2 + o.m3, P = scale(o.uC, M);
      var v3 = scale(add(P, scale(add(scale(o.v1, o.m1), scale(o.v2, o.m2)), -1)), 1 / o.m3);
      res.P0 = P; res.P1 = add(add(scale(o.v1, o.m1), scale(o.v2, o.m2)), scale(v3, o.m3));
      res.v1 = o.v1; res.v2 = o.v2; res.v3 = v3;
      res.KE0 = ke(M, o.uC); res.KE1 = ke(o.m1, o.v1) + ke(o.m2, o.v2) + ke(o.m3, v3);
      return res;
    }
    var P0 = add(scale(o.u1, o.m1), scale(o.u2, o.m2));
    res.P0 = P0; res.KE0 = ke(o.m1, o.u1) + ke(o.m2, o.u2);
    if (o.mode === 'one') { res.v1 = o.v1; res.v2 = scale(add(P0, scale(o.v1, -o.m1)), 1 / o.m2); }
    else if (o.mode === 'stick') { res.v1 = res.v2 = scale(P0, 1 / (o.m1 + o.m2)); }
    else {
      var c1 = Math.cos(U.rad(o.a1)), s1 = Math.sin(U.rad(o.a1)), c2 = Math.cos(U.rad(o.a2)), s2 = Math.sin(U.rad(o.a2));
      var sol = U.solve2(o.m1 * c1, o.m2 * c2, o.m1 * s1, o.m2 * s2, P0[0], P0[1]);
      if (!sol) return Object.assign(res, { invalid: 'The two final directions are parallel (or opposite): the speeds cannot be found from momentum alone' });
      res.s1 = sol[0]; res.s2 = sol[1];
      if (sol[0] < -1e-9 || sol[1] < -1e-9) res.warn = 'A speed comes out negative: that body would actually move in the opposite direction to the one drawn';
      res.v1 = polar(sol[0], o.a1); res.v2 = polar(sol[1], o.a2);
    }
    res.P1 = add(scale(res.v1, o.m1), scale(res.v2, o.m2));
    res.KE1 = ke(o.m1, res.v1) + ke(o.m2, res.v2);
    return res;
  }

  /* ---------- drag (3.2: qualitative; the model numbers are illustrative only) ---------- */
  /** resultant force and acceleration at an instant, down positive: a = (mg − U − D)/m */
  function accelAt(m, g, Up, D) { return (m * g - Up - D) / m; }
  function dragFromAccel(m, g, Up, a) { return m * g - Up - m * a; }
  /** illustrative terminal velocity for D = k v^n (n = 1 or 2); null if no terminal velocity (k = 0 or mg ≤ U) */
  function terminal(m, g, Up, k, n) {
    var net = m * g - Up;
    if (!(k > 0) || net <= 0) return null;
    return Math.pow(net / k, 1 / n);
  }
  /**
   * Precomputed track (RK4, adaptive sub-steps) for vertical fall, down positive.
   * o = {m, g, U, k, n, v0, open: {t, k} | null, T, steps}
   */
  function fall(o) {
    var steps = o.steps || 1500, dt = o.T / steps, n = o.n || 2;
    function kAt(t) { return o.open && t >= o.open.t ? o.open.k : o.k; }
    function acc(t, v) { var k = kAt(t); return o.g - o.U / o.m - (k / o.m) * Math.pow(Math.abs(v), n) * U.sgn(v); }
    var ts = [0], vs = [o.v0 || 0], xs = [0], t = 0, v = o.v0 || 0, x = 0;
    for (var i = 0; i < steps; i++) {
      var k = Math.max(kAt(t), kAt(t + dt));
      var rate = n * k * Math.pow(Math.max(Math.abs(v), 1e-6), n - 1) / o.m;
      var sub = Math.min(4000, Math.max(1, Math.ceil(dt * rate / 0.2)));
      var h = dt / sub;
      if (o.open && t < o.open.t && t + dt > o.open.t) sub = Math.max(sub, 20), h = dt / sub;
      for (var j = 0; j < sub; j++) {
        var y = U.rk4(function (tt, Y) { return [Y[1], acc(tt, Y[1])]; }, t, [x, v], h);
        x = y[0]; v = y[1]; t += h;
      }
      ts.push(t); vs.push(v); xs.push(x);
    }
    function stateAt(T) {
      var tt = U.clamp(T, 0, o.T), i = Math.min(steps - 1, Math.floor(tt / dt)), f = (tt - ts[i]) / dt;
      var vv = vs[i] + (vs[i + 1] - vs[i]) * f, xx = xs[i] + (xs[i + 1] - xs[i]) * f, k = kAt(tt);
      var D = k * Math.pow(Math.abs(vv), n) * U.sgn(vv);
      return { v: vv, x: xx, D: D, a: o.g - o.U / o.m - D / o.m, W: o.m * o.g, U: o.U };
    }
    return { ts: ts, vs: vs, xs: xs, stateAt: stateAt };
  }

  /* ---------- smooth discs on a smooth horizontal surface (top view) ---------- */
  /**
   * o = {m1, m2, r1, r2, u1:[x,y], u2:[x,y], b (impact parameter, 0 ≤ b < r1 + r2), mode: 'elastic' | 'stick'}
   * Line of centres at contact: n = cos φ ŵ + sin φ p̂, sin φ = b/(r1 + r2), ŵ = direction of u1 − u2, p̂ = ŵ turned +90°.
   * Elastic: components perpendicular to n unchanged; along n the 1-D elastic result (approach = separation along n).
   * Stick: both move off with V = (m1u1 + m2u2)/(m1 + m2).
   */
  function discCollision(o) {
    var Rs = o.r1 + o.r2, w = [o.u1[0] - o.u2[0], o.u1[1] - o.u2[1]], wm = Math.hypot(w[0], w[1]);
    var M = o.m1 + o.m2, P0 = add(scale(o.u1, o.m1), scale(o.u2, o.m2)), KE0 = ke(o.m1, o.u1) + ke(o.m2, o.u2);
    var res = { P0: P0, KE0: KE0, R: Rs, cm: scale(P0, 1 / M) };
    if (wm < 1e-12) return Object.assign(res, { noCollision: 'Same velocity: the discs never meet', v1: o.u1, v2: o.u2, P1: P0, KE1: KE0 });
    var sb = U.clamp(o.b / Rs, 0, 0.999999), cb = Math.sqrt(1 - sb * sb);
    var wh = [w[0] / wm, w[1] / wm], ph = [-wh[1], wh[0]];
    var n = [cb * wh[0] + sb * ph[0], cb * wh[1] + sb * ph[1]], t = [-n[1], n[0]];
    var a1 = o.u1[0] * n[0] + o.u1[1] * n[1], a2 = o.u2[0] * n[0] + o.u2[1] * n[1];
    var p1 = o.u1[0] * t[0] + o.u1[1] * t[1], p2 = o.u2[0] * t[0] + o.u2[1] * t[1];
    var v1, v2, b1 = a1, b2 = a2;
    if (o.mode === 'stick') { v1 = v2 = scale(P0, 1 / M); }
    else {
      b1 = ((o.m1 - o.m2) * a1 + 2 * o.m2 * a2) / M; b2 = ((o.m2 - o.m1) * a2 + 2 * o.m1 * a1) / M;
      v1 = add(o.u1, scale(n, b1 - a1)); v2 = add(o.u2, scale(n, b2 - a2));
    }
    return Object.assign(res, { n: n, t: t, d: scale(n, Rs), a1: a1, a2: a2, b1: b1, b2: b2, perp1: p1, perp2: p2, v1: v1, v2: v2,
      P1: add(scale(v1, o.m1), scale(v2, o.m2)), KE1: ke(o.m1, v1) + ke(o.m2, v2), approach: a1 - a2, separation: b2 - b1, alpha: U.deg(Math.asin(sb)) });
  }
  /**
   * Analytic track for two bodies that touch at time tc with centre offset d (= c2 − c1) and centre of mass at the origin.
   * Before tc they move with u1, u2; after with v1, v2. Returns stateAt(t) = {x1, x2, v1, v2, cm, after}.
   */
  function pairTrack(m1, m2, u1, u2, v1, v2, d, tc) {
    var M = m1 + m2, c1 = scale(d, -m2 / M), c2 = scale(d, m1 / M);
    return function (t) {
      var after = t >= tc, w1 = after ? v1 : u1, w2 = after ? v2 : u2, dt = t - tc;
      var x1 = add(c1, scale(w1, dt)), x2 = add(c2, scale(w2, dt));
      return { x1: x1, x2: x2, v1: w1, v2: w2, cm: scale(add(scale(x1, m1), scale(x2, m2)), 1 / M), after: after };
    };
  }
  /** angle between two vectors in degrees (null if either is zero) */
  function angleBetween(a, b) {
    var ma = Math.hypot(a[0], a[1]), mb = Math.hypot(b[0], b[1]);
    if (ma < 1e-12 || mb < 1e-12) return null;
    return U.deg(Math.acos(U.clamp((a[0] * b[0] + a[1] * b[1]) / (ma * mb), -1, 1)));
  }

  return { discCollision: discCollision, pairTrack: pairTrack, angleBetween: angleBetween,
    collide1D: collide1D, chain1D: chain1D, profile: profile, cumulative: cumulative, contactTrack: contactTrack, forceFromMomentum: forceFromMomentum,
    polar: polar, magAng: magAng, add: add, scale: scale, ke: ke, collide2D: collide2D,
    accelAt: accelAt, dragFromAccel: dragFromAccel, terminal: terminal, fall: fall };
});
