/* SIM.kin — kinematics in a straight line with constant acceleration (9709 4.2 / 9702 topic 2).
   1. Multi-stage journeys (PLAN S4): stages of constant acceleration, totals, solve-for, two bodies.
   2. Vertical motion under gravity with events (PLAN S5): two particles, delay, ground stop / rebound,
      meeting and collision (momentum only — no restitution), queries "time with speed ≥ V / height ≥ H".
   Sign convention: s, v, a positive in the chosen positive direction (forwards / upwards). */
(function (root, f) {
  var m = f(typeof require === 'function' && typeof module === 'object' ? require('../core/util.js') : root.SIM.util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).kin = m;
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';
  var EPS = 1e-9;

  /* ======================================================================
     1. MULTI-STAGE JOURNEYS
     stage = { type, t, a, v, d, T }
       'ta'   time t with acceleration a
       'tv'   time t, ending with velocity v            (a = (v − u)/t)
       'dv'   displacement d, ending with velocity v    (t = 2d/(u + v), a = (v² − u²)/(2d))
       'da'   displacement d with acceleration a        (smallest t > 0 with ut + ½at² = d)
       'av'   acceleration a until velocity v           (t = (v − u)/a)
       'hold' constant velocity (the current one) for time t
       'vt'   constant velocity v (given) for time t — v may jump (corner on the s–t graph)
       'rest' at rest for time t
       'fill' constant velocity until the total time is T (duration found from the other stages)
     ====================================================================== */
  var STAGE_TYPES = {
    ta: { label: 'time t, acceleration a', fields: ['t', 'a'] },
    tv: { label: 'time t, final velocity v', fields: ['t', 'v'] },
    dv: { label: 'displacement d, final velocity v', fields: ['d', 'v'] },
    da: { label: 'displacement d, acceleration a', fields: ['d', 'a'] },
    av: { label: 'acceleration a until velocity v', fields: ['a', 'v'] },
    hold: { label: 'constant velocity for time t', fields: ['t'] },
    vt: { label: 'constant velocity v (given) for time t', fields: ['v', 't'] },
    rest: { label: 'at rest for time t', fields: ['t'] },
    fill: { label: 'constant velocity until total time T', fields: ['T'] }
  };

  function num(x) { return typeof x === 'number' && isFinite(x) ? x : NaN; }

  /** apply X-links: links = [{stage, field, k}] (stage −1 = initial velocity u0). Returns {u0, stages} copies. */
  function applyLinks(u0, stages, links, X) {
    var st = stages.map(function (s) { return Object.assign({}, s); });
    (links || []).forEach(function (L) {
      if (L.stage === -1) u0 = L.k * X;
      else if (st[L.stage]) st[L.stage][L.field] = L.k * X;
    });
    return { u0: u0, stages: st };
  }

  /** one stage from initial velocity u. Returns {T, a, uStart, v, jump} or {err}. */
  function stageKinematics(s, u, fillT) {
    var T, a, v, uStart = u, scale = Math.max(1, Math.abs(u));
    switch (s.type) {
      case 'ta':
        T = num(s.t); a = num(s.a);
        if (!(T >= 0)) return { err: 'time must be ≥ 0' };
        v = u + a * T; break;
      case 'tv':
        T = num(s.t); v = num(s.v);
        if (!(T > 0)) return { err: 'time must be > 0 to change velocity from ' + U.sf(u) + ' to ' + U.sf(v) };
        a = (v - u) / T; break;
      case 'dv': {
        var d = num(s.d); v = num(s.v);
        if (!isFinite(d) || !isFinite(v)) return { err: 'missing value' };
        if (Math.abs(u + v) < EPS * Math.max(scale, Math.abs(v))) return { err: 'u + v = 0, so t = 2d ÷ (u + v) has no value (the particle would have to reverse)' };
        T = 2 * d / (u + v);
        if (Math.abs(d) < EPS && Math.abs(v - u) < EPS * scale) { T = 0; a = 0; break; }
        if (!(T > 0)) return { err: 't = 2d ÷ (u + v) = ' + U.sf(T) + ' is not positive: displacement and velocities are inconsistent' };
        a = (v - u) / T; break;
      }
      case 'da': {
        var dd = num(s.d); a = num(s.a);
        if (!isFinite(dd) || !isFinite(a)) return { err: 'missing value' };
        if (Math.abs(dd) < 1e-12) { T = 0; v = u; break; }
        var roots = U.quadratic(0.5 * a, u, -dd).filter(function (r) { return r > 1e-12; });
        if (!roots.length) return { err: 'with u = ' + U.sf(u) + ' and a = ' + U.sf(a) + ' the displacement ' + U.sf(dd) + ' m is never reached' };
        T = roots[0]; v = u + a * T; break;
      }
      case 'av':
        a = num(s.a); v = num(s.v);
        if (Math.abs(v - u) < EPS * scale) { T = 0; break; }
        if (!(Math.abs(a) > 0)) return { err: 'a = 0, so the velocity never reaches ' + U.sf(v) };
        T = (v - u) / a;
        if (T < 0) return { err: 'velocity ' + U.sf(u) + ' moves away from ' + U.sf(v) + ' with a = ' + U.sf(a) + ' (t = (v − u) ÷ a would be negative)' };
        break;
      case 'hold':
        T = num(s.t); a = 0; v = u;
        if (!(T >= 0)) return { err: 'time must be ≥ 0' };
        break;
      case 'vt':
        T = num(s.t); a = 0; v = num(s.v); uStart = v;
        if (!(T >= 0) || !isFinite(v)) return { err: 'missing value' };
        break;
      case 'rest':
        T = num(s.t); a = 0; v = 0; uStart = 0;
        if (!(T >= 0)) return { err: 'time must be ≥ 0' };
        break;
      case 'fill':
        T = fillT; a = 0; v = u;
        if (!isFinite(T)) T = 0;
        if (T < -1e-9) return { err: 'the other stages already take ' + U.sf(num(s.T) - T) + ' s, more than the total time T = ' + U.sf(num(s.T)) + ' s' };
        T = Math.max(0, T); break;
      default: return { err: 'unknown stage type' };
    }
    if (!isFinite(T) || !isFinite(a) || !isFinite(v)) return { err: 'values give no finite result' };
    return { T: T, a: a, uStart: uStart, v: v, jump: Math.abs(uStart - u) > EPS * Math.max(1, Math.abs(u), Math.abs(uStart)) };
  }

  function segDisp(u, a, tau) { return u * tau + 0.5 * a * tau * tau; }
  /** distance along a constant-acceleration piece from 0 to tau (handles a reversal inside) */
  function segDist(u, a, tau) {
    if (tau <= 0) return 0;
    if (a !== 0) {
      var t0 = -u / a;
      if (t0 > 0 && t0 < tau) { var s0 = segDisp(u, a, t0); return Math.abs(s0) + Math.abs(segDisp(u, a, tau) - s0); }
    }
    return Math.abs(segDisp(u, a, tau));
  }

  /**
   * journey(u0, stages, opt) → { segs, error:{stage,msg}|null, total{...}, stateAt(t), distanceAt(t) }
   * seg = {i, type, t0, t1, T, u (start velocity, after any jump), uPrev, v, a, s0, s1, ds, dist, tTurn, jump}
   * Segments are kept up to the first invalid stage, so constraints on earlier stages can still be evaluated.
   */
  function journey(u0, stages, opt) {
    opt = opt || {};
    u0 = num(u0); if (!isFinite(u0)) u0 = 0;
    var fills = [];
    stages.forEach(function (s, i) { if (s.type === 'fill') fills.push(i); });
    var fillT = 0, err = null;
    if (fills.length > 1) err = { stage: fills[1], msg: 'only one "until total time" stage is allowed' };
    function pass(fT) {
      var segs = [], t = 0, s = 0, u = u0, e = null;
      for (var i = 0; i < stages.length; i++) {
        var k = stageKinematics(stages[i], u, fT);
        if (k.err) { e = { stage: i, msg: k.err }; break; }
        var ds = segDisp(k.uStart, k.a, k.T), tTurn = null;
        if (k.a !== 0) { var tt = -k.uStart / k.a; if (tt > 1e-12 && tt < k.T - 1e-12) tTurn = tt; }
        segs.push({ i: i, type: stages[i].type, t0: t, t1: t + k.T, T: k.T, uPrev: u, u: k.uStart, v: k.v, a: k.a, s0: s, s1: s + ds, ds: ds,
          dist: segDist(k.uStart, k.a, k.T), tTurn: tTurn === null ? null : t + tTurn, jump: k.jump });
        t += k.T; s += ds; u = k.v;
      }
      return { segs: segs, err: e };
    }
    var r;
    if (fills.length === 1 && !err) {
      var r0 = pass(0);
      if (r0.err && r0.err.stage !== fills[0]) r = r0;
      else {
        var other = r0.segs.reduce(function (acc, g) { return acc + g.T; }, 0);
        if (r0.err) other = NaN;
        fillT = num(stages[fills[0]].T) - other;
        r = pass(fillT);
      }
    } else r = pass(0);
    if (err && (!r.err || r.err.stage > err.stage)) { r.segs = r.segs.slice(0, err.stage); r.err = err; }
    var segs = r.segs;
    var last = segs[segs.length - 1];
    var T = last ? last.t1 : 0, sEnd = last ? last.s1 : 0, vEnd = last ? last.v : u0;
    var dist = segs.reduce(function (acc, g) { return acc + g.dist; }, 0);
    var vmax = Math.abs(u0), maxV = u0, minV = u0;
    segs.forEach(function (g) { [g.u, g.v, g.uPrev].forEach(function (x) { vmax = Math.max(vmax, Math.abs(x)); maxV = Math.max(maxV, x); minV = Math.min(minV, x); }); });
    var total = { T: T, s: sEnd, dist: dist, v: vEnd, vmax: vmax, maxV: maxV, minV: minV,
      avgSpeed: T > 0 ? dist / T : NaN, avgVel: T > 0 ? sEnd / T : NaN };

    function segAt(t) {
      for (var i = 0; i < segs.length; i++) if (t < segs[i].t1 || (i === segs.length - 1)) return segs[i];
      return null;
    }
    /** state at time t (after the end: continues at the final velocity if opt.extend, else stays at the end state) */
    function stateAt(t) {
      if (!segs.length || t <= 0) return { s: 0, v: segs.length ? segs[0].u : u0, a: segs.length ? segs[0].a : 0, stage: segs.length ? 0 : -1 };
      if (t >= T) {
        if (opt.extend) return { s: sEnd + vEnd * (t - T), v: vEnd, a: 0, stage: -2 };
        return { s: sEnd, v: vEnd, a: last.a, stage: segs.length - 1 };
      }
      var g = segAt(t), tau = t - g.t0;
      return { s: g.s0 + segDisp(g.u, g.a, tau), v: g.u + g.a * tau, a: g.a, stage: segs.indexOf(g) };
    }
    function distanceAt(t) {
      var d = 0;
      for (var i = 0; i < segs.length; i++) {
        var g = segs[i];
        if (t >= g.t1) { d += g.dist; continue; }
        if (t > g.t0) d += segDist(g.u, g.a, t - g.t0);
        return d;
      }
      if (opt.extend && t > T) d += Math.abs(vEnd) * (t - T);
      return d;
    }
    return { u0: u0, segs: segs, error: r.err, total: total, stateAt: stateAt, distanceAt: distanceAt, fillT: fills.length === 1 ? fillT : null };
  }

  /** value of a constraint for a journey; NaN if the stages it needs are invalid.
      c = {kind: 'T'|'s'|'dist'|'v'|'vmax'|'sk'|'dk'|'tk'|'vk', k (stage index for *k kinds)} */
  function metric(j, c) {
    var kind = c.kind;
    if (/k$/.test(kind)) {
      var g = j.segs[c.k];
      if (!g) return NaN;
      return kind === 'sk' ? g.s1 : kind === 'dk' ? j.distanceAt(g.t1) : kind === 'tk' ? g.t1 : g.v;
    }
    if (j.error) return NaN;
    return j.total[kind];
  }

  /**
   * Solve for the unknown X (linked into stages) so that metric = target.
   * Scans [lo, hi] with n samples, refines each sign change by bisection and also reports touching (double) roots.
   * Returns { roots: [{X, journey, warnings[]}], samples } — ALL roots in the range; side conditions are left to the student.
   */
  function solveFor(u0, stages, links, constraint, target, lo, hi, n) {
    n = n || 4000;
    function f(X) { var a = applyLinks(u0, stages, links, X); return metric(journey(a.u0, a.stages), constraint) - target; }
    var xs = [], fs = [], i;
    for (i = 0; i <= n; i++) { var x = lo + (hi - lo) * i / n; xs.push(x); fs.push(f(x)); }
    var found = [], scale = 1;
    fs.forEach(function (v) { if (isFinite(v)) scale = Math.max(scale, Math.abs(v)); });
    scale = Math.max(scale, Math.abs(target), 1);
    function push(x) {
      if (!isFinite(x)) return;
      var fx = f(x);
      if (!isFinite(fx) || Math.abs(fx) > 1e-7 * scale) return;
      if (found.some(function (r) { return Math.abs(r - x) <= 1e-7 * Math.max(1, Math.abs(x)); })) return;
      found.push(x);
    }
    for (i = 0; i <= n; i++) {
      if (fs[i] === 0) push(xs[i]);
      if (i < n && isFinite(fs[i]) && isFinite(fs[i + 1]) && fs[i] * fs[i + 1] < 0) push(U.bisect(f, xs[i], xs[i + 1], 1e-14));
    }
    // touching roots: local minimum of |f| very close to 0
    for (i = 1; i < n; i++) {
      var a = Math.abs(fs[i - 1]), b = Math.abs(fs[i]), c = Math.abs(fs[i + 1]);
      if (isFinite(a) && isFinite(b) && isFinite(c) && b <= a && b <= c && b < 1e-3 * scale) {
        var L = xs[i - 1], R = xs[i + 1];
        for (var k = 0; k < 100; k++) { var m1 = L + (R - L) / 3, m2 = R - (R - L) / 3; if (Math.abs(f(m1)) < Math.abs(f(m2))) R = m2; else L = m1; }
        push((L + R) / 2);
      }
    }
    found.sort(function (p, q) { return p - q; });
    var roots = found.map(function (X) {
      var a = applyLinks(u0, stages, links, X), j = journey(a.u0, a.stages), w = [];
      if (j.error) w.push('stage ' + (j.error.stage + 1) + ' is then impossible: ' + j.error.msg);
      j.segs.forEach(function (g) {
        if (g.tTurn !== null) w.push('velocity changes sign during stage ' + (g.i + 1) + ' (the particle reverses)');
        if (g.T < 0) w.push('negative time in stage ' + (g.i + 1));
      });
      a.stages.forEach(function (s, idx) { ['t', 'd', 'T'].forEach(function (fl) { if (s[fl] !== undefined && STAGE_TYPES[s.type].fields.indexOf(fl) >= 0 && s[fl] < 0 && fl !== 'd') w.push('stage ' + (idx + 1) + ': ' + fl + ' is negative'); }); });
      return { X: X, journey: j, warnings: w };
    });
    return { roots: roots, xs: xs, fs: fs };
  }

  /** piecewise track of a journey placed at start time tStart and start position sStart, covering [0, tMax];
      before tStart the body is at rest at sStart; after the journey it continues with its final velocity. */
  function track(j, tStart, sStart, tMax) {
    var P = [];
    tStart = tStart || 0; sStart = sStart || 0;
    if (tStart > 0) P.push({ ta: 0, tb: tStart, s: sStart, u: 0, a: 0 });
    j.segs.forEach(function (g) { if (g.T > 0) P.push({ ta: tStart + g.t0, tb: tStart + g.t1, s: sStart + g.s0, u: g.u, a: g.a }); });
    var endT = tStart + j.total.T;
    P.push({ ta: endT, tb: Math.max(tMax, endT) + 1e-9, s: sStart + j.total.s, u: j.total.v, a: 0 });
    return P;
  }
  function trackAt(P, t) {
    for (var i = 0; i < P.length; i++) if (t < P[i].tb || i === P.length - 1) {
      var p = P[i], tau = Math.max(0, t - p.ta);
      return { s: p.s + p.u * tau + 0.5 * p.a * tau * tau, v: p.u + p.a * tau, a: p.a };
    }
    return { s: 0, v: 0, a: 0 };
  }
  /** times in [0, tMax] where two tracks are at the same position (s1 = s2, solved piecewise with quadratics) */
  function meetings(P1, P2, tMax) {
    var cuts = [0, tMax];
    P1.concat(P2).forEach(function (p) { [p.ta, p.tb].forEach(function (t) { if (t > 0 && t < tMax) cuts.push(t); }); });
    cuts.sort(function (a, b) { return a - b; });
    var out = [], together = [];
    function add(t) {
      if (t < -1e-9 || t > tMax + 1e-9) return;
      t = U.clamp(t, 0, tMax);
      if (out.some(function (m) { return Math.abs(m.t - t) < 1e-7 * Math.max(1, t); })) return;
      var A = trackAt(P1, t), B = trackAt(P2, t);
      out.push({ t: t, s: A.s, v1: A.v, v2: B.v });
    }
    for (var i = 0; i + 1 < cuts.length; i++) {
      var ta = cuts[i], tb = cuts[i + 1]; if (tb - ta < 1e-12) continue;
      var tm = 0.5 * (ta + tb), A = trackAt(P1, ta), B = trackAt(P2, ta), Am = trackAt(P1, tm), Bm = trackAt(P2, tm);
      // relative motion from ta: d(τ) = d0 + dv τ + ½ da τ²
      var d0 = A.s - B.s, dv = A.v - B.v, da = Am.a - Bm.a;
      var sc = Math.max(1, Math.abs(A.s), Math.abs(B.s));
      if (Math.abs(d0) < 1e-9 * sc && Math.abs(dv) < 1e-9 * Math.max(1, Math.abs(A.v)) && Math.abs(da) < 1e-12) { together.push([ta, tb]); continue; }
      U.quadratic(0.5 * da, dv, d0).forEach(function (tau) { if (tau >= -1e-9 && tau <= tb - ta + 1e-9) add(ta + tau); });
    }
    out.sort(function (a, b) { return a.t - b.t; });
    return { list: out, together: together };
  }

  /* ======================================================================
     2. VERTICAL MOTION UNDER GRAVITY (up positive, ground at y = 0)
     opts = { g, A:{h,u,m}, B:{h,u,m,delay}|null, ground:'stop'|'rebound', k (speed fraction kept, GIVEN DATA — not restitution),
              collide:'off'|'Arest'|'Brest'|'coalesce'|'vA', vA (velocity of A just after, if 'vA'), maxBounces }
     ====================================================================== */
  function vertical(o) {
    var g = o.g || 10, k = o.k === undefined ? 0 : o.k, maxB = o.maxBounces || 20;
    var names = o.B ? ['A', 'B'] : ['A'];
    var P = {}, tracks = { A: [], B: [] }, events = [], warnings = [];
    function initP(name, spec) {
      var start = name === 'B' ? Math.max(0, spec.delay || 0) : 0;
      return { name: name, y: Math.max(0, spec.h), v: 0, m: spec.m || 1, mode: 'held', since: 0, u: spec.u, start: start, bounces: 0 };
    }
    P.A = initP('A', o.A); if (o.B) P.B = initP('B', o.B);
    var merged = false, collided = false, t = 0;
    function launch(p) {
      p.v = p.u;
      if (p.y <= 0 && p.v <= 0) {
        p.mode = 'ground'; p.v = 0;
        if (p.u < 0) warnings.push(p.name + ' cannot be projected downwards from the ground: it stays at rest');
      } else p.mode = 'fly';
      events.push({ t: t, type: 'launch', who: p.name, y: p.y, v: p.v });
    }
    function accel(p) { return p.mode === 'fly' ? -g : 0; }
    function advance(p, T) {
      var dt = T - t; if (dt <= 0) return;
      var a = accel(p);
      tracks[p.name].push({ t0: t, t1: T, y0: p.y, v0: p.v, a: a, mode: merged && p.name === 'B' ? 'merged' : p.mode });
      p.y = p.y + p.v * dt + 0.5 * a * dt * dt; p.v = p.v + a * dt;
      if (p.mode === 'fly' && p.y < 0) p.y = 0;
    }
    function groundTime(p) {
      if (p.mode !== 'fly') return Infinity;
      if (p.y <= 1e-12 && p.v <= 0) return 0;
      return (p.v + Math.sqrt(p.v * p.v + 2 * g * p.y)) / g;
    }
    names.forEach(function (n) { if (P[n].start <= 0) launch(P[n]); });
    for (var guard = 0; guard < 400; guard++) {
      var cand = [];
      names.forEach(function (n) {
        var p = P[n];
        if (merged && n === 'B') return;
        if (p.mode === 'held') cand.push({ dt: p.start - t, type: 'launch', who: n });
        var tg = groundTime(p); if (isFinite(tg)) cand.push({ dt: tg, type: 'ground', who: n });
      });
      if (o.B && !merged && P.A.mode === 'fly' && P.B.mode === 'fly') {
        var dy = P.A.y - P.B.y, dv = P.A.v - P.B.v;
        if (Math.abs(dv) > 1e-12) {
          var tau = -dy / dv;
          if (tau > 1e-9) {
            var ym = P.A.y + P.A.v * tau - 0.5 * g * tau * tau;
            if (ym > 1e-9) cand.push({ dt: tau, type: 'meet', who: 'AB' });
          }
        }
      }
      if (!cand.length) break;
      cand.sort(function (a, b) { return a.dt - b.dt; });
      var ev = cand[0], T = t + Math.max(0, ev.dt);
      names.forEach(function (n) { if (!(merged && n === 'B')) advance(P[n], T); });
      t = T;
      if (merged) { P.B.y = P.A.y; P.B.v = P.A.v; P.B.mode = P.A.mode; }
      if (ev.type === 'launch') { launch(P[ev.who]); continue; }
      if (ev.type === 'ground') {
        var p = P[ev.who], vin = p.v; p.y = 0;
        if (o.ground === 'rebound' && k > 0 && p.bounces < maxB && Math.abs(vin) * k >= 1e-3) {
          p.v = k * Math.abs(vin); p.bounces++;
          events.push({ t: t, type: 'bounce', who: merged ? 'C' : p.name, y: 0, vBefore: vin, vAfter: p.v });
        } else {
          p.v = 0; p.mode = 'ground';
          events.push({ t: t, type: 'land', who: merged ? 'C' : p.name, y: 0, vBefore: vin, vAfter: 0 });
        }
        if (merged) { P.B.y = 0; P.B.v = p.v; P.B.mode = p.mode; }
        continue;
      }
      // meeting
      var A = P.A, B = P.B, y = A.y, vA = A.v, vB = B.v, mA = A.m, mB = B.m, M = mA * vA + mB * vB;
      var e = { t: t, type: 'meet', who: 'AB', y: y, vA: vA, vB: vB, collision: false };
      if (!collided && o.collide && o.collide !== 'off') {
        collided = true; e.collision = o.collide;
        if (o.collide === 'Arest') { A.v = 0; B.v = M / mB; }
        else if (o.collide === 'Brest') { B.v = 0; A.v = M / mA; }
        else if (o.collide === 'vA') { A.v = o.vA; B.v = (M - mA * o.vA) / mB; }
        else if (o.collide === 'coalesce') { merged = true; A.m = mA + mB; A.v = M / (mA + mB); B.v = A.v; }
        e.vA2 = A.v; e.vB2 = B.v;
        e.keBefore = 0.5 * mA * vA * vA + 0.5 * mB * vB * vB;
        e.keAfter = merged ? 0.5 * A.m * A.v * A.v : 0.5 * mA * A.v * A.v + 0.5 * mB * B.v * B.v;
        if (e.keAfter > e.keBefore * (1 + 1e-9) + 1e-12) { e.keGain = true; warnings.push('The chosen velocity after the collision would INCREASE the kinetic energy — impossible without an energy source'); }
      }
      events.push(e);
    }
    var tEnd = t;
    // close tracks with a final constant segment so stateAt works for any t
    names.forEach(function (n) {
      var p = P[n];
      tracks[n].push({ t0: tEnd, t1: Infinity, y0: p.y, v0: p.v, a: p.mode === 'fly' ? -g : 0, mode: merged && n === 'B' ? 'merged' : p.mode });
    });
    if (merged) tracks.B = tracks.B.filter(function (s) { return s.t0 < events.filter(function (x) { return x.collision === 'coalesce'; })[0].t; })
      .concat(tracks.A.filter(function (s) { return s.t0 >= events.filter(function (x) { return x.collision === 'coalesce'; })[0].t - 1e-12; }).map(function (s) { return Object.assign({}, s, { mode: 'merged' }); }));
    function at(name, T) {
      var tr = tracks[name];
      if (!tr || !tr.length) return null;
      if (T < tr[0].t0) return { y: tr[0].y0, v: 0, mode: 'held' };
      for (var i = 0; i < tr.length; i++) {
        var s = tr[i];
        if (T < s.t1 || i === tr.length - 1) {
          var d = T - s.t0;
          return { y: Math.max(0, s.y0 + s.v0 * d + 0.5 * s.a * d * d), v: s.v0 + s.a * d, mode: s.mode, a: s.a };
        }
      }
      return null;
    }
    // B before its launch: held at h_B
    if (o.B && P.B && tracks.B.length && tracks.B[0].t0 > 0) tracks.B.unshift({ t0: 0, t1: tracks.B[0].t0, y0: Math.max(0, o.B.h), v0: 0, a: 0, mode: 'held' });
    return { tracks: tracks, events: events, tEnd: tEnd, merged: merged, warnings: warnings, g: g,
      stateAt: function (T) { return { A: at('A', T), B: o.B ? at('B', T) : null }; } };
  }

  /** intervals (within [0, tEnd]) on which |v| ≥ V for a vertical track; total length */
  function timeSpeedAtLeast(tr, V, tEnd) {
    var iv = [];
    tr.forEach(function (s) {
      var t1 = Math.min(s.t1, tEnd); if (t1 <= s.t0) return;
      var D = t1 - s.t0;
      if (s.a === 0) { if (Math.abs(s.v0) >= V - 1e-12) iv.push([s.t0, t1]); return; }
      // v(τ) = v0 + aτ (a < 0 in flight): v ≥ V  ⇔ τ ≤ (V − v0)/a ... handle generally
      function cut(lo, hi) { lo = Math.max(0, lo); hi = Math.min(D, hi); if (hi > lo + 1e-12) iv.push([s.t0 + lo, s.t0 + hi]); }
      var a = s.a, r1 = (V - s.v0) / a, r2 = (-V - s.v0) / a;   // times where v = V and v = −V
      if (a < 0) { cut(-Infinity, r1); cut(r2, Infinity); } else { cut(r1, Infinity); cut(-Infinity, r2); }
    });
    return mergeIv(iv);
  }
  /** intervals on which y ≥ H */
  function timeHeightAtLeast(tr, H, tEnd) {
    var iv = [];
    tr.forEach(function (s) {
      var t1 = Math.min(s.t1, tEnd); if (t1 <= s.t0) return;
      var D = t1 - s.t0;
      if (s.a === 0 && s.v0 === 0) { if (s.y0 >= H - 1e-12) iv.push([s.t0, t1]); return; }
      var r = U.quadratic(0.5 * s.a, s.v0, s.y0 - H);
      var pts = [0].concat(r.filter(function (x) { return x > 0 && x < D; })).concat([D]);
      for (var i = 0; i + 1 < pts.length; i++) {
        var m = 0.5 * (pts[i] + pts[i + 1]), y = s.y0 + s.v0 * m + 0.5 * s.a * m * m;
        if (y >= H - 1e-12) iv.push([s.t0 + pts[i], s.t0 + pts[i + 1]]);
      }
    });
    return mergeIv(iv);
  }
  /** times at which the track is at height H (with velocity) */
  function timesAtHeight(tr, H, tEnd) {
    var out = [];
    tr.forEach(function (s) {
      var t1 = Math.min(s.t1, tEnd); if (t1 < s.t0) return;
      if (s.a === 0) return;
      U.quadratic(0.5 * s.a, s.v0, s.y0 - H).forEach(function (x) {
        if (x >= -1e-12 && x <= t1 - s.t0 + 1e-12) {
          var T = s.t0 + Math.max(0, x);
          if (!out.some(function (o) { return Math.abs(o.t - T) < 1e-9; })) out.push({ t: T, v: s.v0 + s.a * x });
        }
      });
    });
    return out.sort(function (a, b) { return a.t - b.t; });
  }
  function apexes(tr, tEnd) {
    var out = [];
    tr.forEach(function (s) {
      if (s.a >= 0 || s.v0 <= 0) return;
      var x = -s.v0 / s.a, T = s.t0 + x;
      if (T <= Math.min(s.t1, tEnd) + 1e-12) out.push({ t: T, y: s.y0 + s.v0 * x + 0.5 * s.a * x * x });
    });
    return out;
  }
  function mergeIv(iv) {
    iv.sort(function (a, b) { return a[0] - b[0]; });
    var out = [];
    iv.forEach(function (x) { var L = out[out.length - 1]; if (L && x[0] <= L[1] + 1e-9) L[1] = Math.max(L[1], x[1]); else out.push(x.slice()); });
    return { intervals: out, total: out.reduce(function (a, x) { return a + x[1] - x[0]; }, 0) };
  }

  return { STAGE_TYPES: STAGE_TYPES, stageKinematics: stageKinematics, segDist: segDist, journey: journey, applyLinks: applyLinks, metric: metric,
    solveFor: solveFor, track: track, trackAt: trackAt, meetings: meetings,
    vertical: vertical, timeSpeedAtLeast: timeSpeedAtLeast, timeHeightAtLeast: timeHeightAtLeast, timesAtHeight: timesAtHeight, apexes: apexes };
});
