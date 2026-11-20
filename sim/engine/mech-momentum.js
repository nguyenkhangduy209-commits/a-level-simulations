/* SIM.mom — 1-D direct impact on a smooth horizontal line (9709 4.3 Momentum; KE loss is 4.5).
   No coefficient of restitution and no impulse (not in 9709): every collision outcome is GIVEN data
   (a velocity after, "brought to rest", "coalesce", or a stated KE loss).
   Sign convention: velocities positive to the RIGHT (+x). "Left"/"right" particle = smaller/larger x.
   Consistency checks are physical, not syllabus: the particles must approach, cannot pass through each
   other, and the total KE cannot increase (unless an explosion is described). */
(function (root, f) {
  var m = f(typeof require === 'function' && typeof module === 'object' ? require('../core/util.js') : root.SIM.util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).mom = m;
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';
  var TOL = 1e-9;

  function ke(m, v) { return 0.5 * m * v * v; }

  /** checks for a left particle (m1,u1→v1) and right particle (m2,u2→v2) */
  function checks(m1, u1, m2, u2, v1, v2) {
    var p0 = m1 * u1 + m2 * u2, p1 = m1 * v1 + m2 * v2;
    var K0 = ke(m1, u1) + ke(m2, u2), K1 = ke(m1, v1) + ke(m2, v2);
    var sc = Math.max(1, Math.abs(K0));
    var w = [];
    var approach = u1 > u2 + TOL;
    if (!approach) w.push('The particles are not approaching (u<sub>left</sub> ≤ u<sub>right</sub>): no collision happens.');
    var pass = v1 > v2 + 1e-9 * Math.max(1, Math.abs(v1), Math.abs(v2));
    if (pass) w.push('After the impact the left particle would be faster to the right than the right particle: they would pass through each other. Impossible.');
    var gain = K1 > K0 + 1e-9 * sc;
    if (gain) w.push('Kinetic energy would INCREASE by ' + U.sf(K1 - K0) + ' J: impossible unless an explosion/spring releases energy.');
    return { p0: p0, p1: p1, K0: K0, K1: K1, loss: K0 - K1, approach: approach, passThrough: pass, keGain: gain,
      valid: approach && !pass && !gain, warnings: w };
  }

  /**
   * Two-particle collision. o = {m1,u1,m2,u2, type:'given'|'rest'|'coalesce'|'keloss', who:'left'|'right', v, loss}
   * Returns {v1, v2, coalesced, ...checks} or, for 'keloss', {roots:[...], chosen} (both roots with validity).
   */
  function collide(o) {
    var m1 = o.m1, m2 = o.m2, u1 = o.u1, u2 = o.u2, P = m1 * u1 + m2 * u2, v1, v2;
    if (!(m1 > 0) || !(m2 > 0)) return { error: 'Masses must be positive.' };
    if (o.type === 'coalesce') {
      v1 = v2 = P / (m1 + m2);
      return Object.assign({ v1: v1, v2: v2, coalesced: true, formula: 'V = (m₁u₁ + m₂u₂) ÷ (m₁ + m₂)' }, checks(m1, u1, m2, u2, v1, v2));
    }
    if (o.type === 'keloss') {
      var roots = keLossSolve(m1, u1, m2, u2, o.loss);
      if (!roots.length) return { error: 'No real solution: a KE loss of ' + U.sf(o.loss) + ' J is impossible with these masses and velocities (the most that can be lost is ' + U.sf(maxLoss(m1, u1, m2, u2)) + ' J, when they coalesce).', roots: [] };
      var ok = roots.filter(function (r) { return r.valid; });
      var c = ok[0] || roots[0];
      return Object.assign({ v1: c.v1, v2: c.v2, coalesced: Math.abs(c.v1 - c.v2) < 1e-9, roots: roots, chosenValid: !!ok[0] }, checks(m1, u1, m2, u2, c.v1, c.v2));
    }
    var vk = o.type === 'rest' ? 0 : o.v;
    if (o.who === 'right') { v2 = vk; v1 = (P - m2 * v2) / m1; }
    else { v1 = vk; v2 = (P - m1 * v1) / m2; }
    return Object.assign({ v1: v1, v2: v2, coalesced: false }, checks(m1, u1, m2, u2, v1, v2));
  }

  /** greatest possible KE loss (coalescence) */
  function maxLoss(m1, u1, m2, u2) { return 0.5 * m1 * m2 / (m1 + m2) * (u1 - u2) * (u1 - u2); }

  /** momentum + stated KE loss → quadratic in v2. Returns roots [{v1,v2,valid,passThrough}] */
  function keLossSolve(m1, u1, m2, u2, loss) {
    var P = m1 * u1 + m2 * u2, K1 = ke(m1, u1) + ke(m2, u2) - loss;
    // v1 = (P - m2 v2)/m1 ;  ½ m1 v1² + ½ m2 v2² = K1  →  (m2²/m1 + m2) v2² − 2 P m2/m1 v2 + P²/m1 − 2 K1 = 0
    var r = U.quadratic(m2 * m2 / m1 + m2, -2 * P * m2 / m1, P * P / m1 - 2 * K1);
    return r.map(function (v2) {
      var v1 = (P - m2 * v2) / m1, c = checks(m1, u1, m2, u2, v1, v2);
      return { v1: v1, v2: v2, valid: !c.passThrough, passThrough: c.passThrough };
    });
  }

  /** "a speed only" is given for one particle after impact: both signs, with validity */
  function bothSigns(o) {
    return [1, -1].map(function (s) {
      var r = collide({ m1: o.m1, u1: o.u1, m2: o.m2, u2: o.u2, type: 'given', who: o.who, v: s * Math.abs(o.v) });
      r.sign = s; return r;
    });
  }

  /**
   * Linear unknown from momentum: known = {m1,u1,m2,u2,v1,v2} with one key set to null; returns its value (NaN if undefined).
   *   m1 u1 + m2 u2 = m1 v1 + m2 v2
   */
  function solveMomentum(k) {
    var m1 = k.m1, m2 = k.m2, u1 = k.u1, u2 = k.u2, v1 = k.v1, v2 = k.v2, d;
    if (k.unknown === 'v1') return (m1 * u1 + m2 * u2 - m2 * v2) / m1;
    if (k.unknown === 'v2') return (m1 * u1 + m2 * u2 - m1 * v1) / m2;
    if (k.unknown === 'u1') return (m1 * v1 + m2 * v2 - m2 * u2) / m1;
    if (k.unknown === 'u2') return (m1 * v1 + m2 * v2 - m1 * u1) / m2;
    if (k.unknown === 'm1') { d = u1 - v1; return Math.abs(d) < 1e-12 ? NaN : m2 * (v2 - u2) / d; }
    if (k.unknown === 'm2') { d = u2 - v2; return Math.abs(d) < 1e-12 ? NaN : m1 * (v1 - u1) / d; }
    return NaN;
  }

  /** masses are k·(a, b): find k from a stated KE loss (all four velocities known). */
  function massScaleFromLoss(a, u1, b, u2, v1, v2, loss) {
    var per = ke(a, u1) + ke(b, u2) - ke(a, v1) - ke(b, v2);
    return Math.abs(per) < 1e-12 ? NaN : loss / per;
  }

  /**
   * Event timeline on a line: particles [{name, m, x, u}], optional wall {x, speed} on the RIGHT
   * (a particle reaching it rebounds to the left with the given speed — given data, not restitution),
   * outcomes[k] = outcome spec for the k-th particle–particle collision (type, who, v, loss).
   * Returns {segments:[{t0,t1,bodies:[{ids,name,m,x0,v}]}], events:[...], stateAt(t), stopReason}.
   */
  function timeline(spec) {
    var bodies = spec.particles.map(function (p, i) { return { ids: [i], name: p.name, m: p.m, x: p.x, v: p.u }; });
    bodies.sort(function (a, b) { return a.x - b.x; });
    var wall = spec.wall && isFinite(spec.wall.x) ? spec.wall : null;
    var outcomes = spec.outcomes || [], tMax = spec.tMax || 20;
    var t = 0, segs = [], events = [], nColl = 0, stop = null;
    if (wall && bodies.some(function (b) { return b.x > wall.x + 1e-12; })) return { error: 'A particle starts beyond the wall.', segments: [], events: [], stateAt: function () { return []; } };
    for (var i = 0; i + 1 < bodies.length; i++) if (bodies[i + 1].x - bodies[i].x < -1e-12) return { error: 'Particles overlap.', segments: [], events: [], stateAt: function () { return []; } };
    for (var guard = 0; guard < 30; guard++) {
      // next event
      var best = Infinity, kind = null, idx = -1;
      for (var j = 0; j + 1 < bodies.length; j++) {
        var A = bodies[j], B = bodies[j + 1], dv = A.v - B.v;
        if (dv > 1e-12) { var tc = (B.x - A.x) / dv; if (tc < best - 1e-12) { best = tc; kind = 'pair'; idx = j; } }
      }
      if (wall && bodies.length) {
        var R = bodies[bodies.length - 1];
        if (R.v > 1e-12) { var tw = (wall.x - R.x) / R.v; if (tw < best - 1e-12) { best = tw; kind = 'wall'; idx = bodies.length - 1; } }
      }
      var tEnd = Math.min(t + Math.max(0, best), tMax);
      segs.push({ t0: t, t1: tEnd, bodies: bodies.map(function (b) { return { ids: b.ids.slice(), name: b.name, m: b.m, x0: b.x, v: b.v }; }) });
      if (!(best < Infinity) || t + best > tMax) { stop = best < Infinity ? 'time window ends' : 'no further collisions'; break; }
      var dt = Math.max(0, best);
      bodies.forEach(function (b) { b.x += b.v * dt; }); t += dt;
      if (kind === 'wall') {
        var W = bodies[idx], vb = W.v;
        W.x = wall.x; W.v = -Math.abs(wall.speed);
        events.push({ t: t, x: W.x, kind: 'wall', names: [W.name], m: [W.m], u: [vb], v: [W.v],
          note: W.name + ' hits the wall at ' + U.sf(vb) + ' m s⁻¹ and rebounds at ' + U.sf(Math.abs(wall.speed)) + ' m s⁻¹ (given).' });
        continue;
      }
      var L = bodies[idx], Rb = bodies[idx + 1], oc = outcomes[nColl];
      nColl++;
      if (!oc || oc.type === 'none') {
        events.push({ t: t, x: L.x, kind: 'pending', names: [L.name, Rb.name], m: [L.m, Rb.m], u: [L.v, Rb.v], note: 'Collision ' + nColl + ' between ' + L.name + ' and ' + Rb.name + ': outcome not specified — timeline stops.' });
        stop = 'collision ' + nColl + ' outcome not specified';
        segs.push({ t0: t, t1: t, bodies: bodies.map(function (b) { return { ids: b.ids.slice(), name: b.name, m: b.m, x0: b.x, v: b.v }; }) });
        break;
      }
      var r = collide({ m1: L.m, u1: L.v, m2: Rb.m, u2: Rb.v, type: oc.type, who: oc.who, v: oc.v, loss: oc.loss });
      if (r.error) { events.push({ t: t, x: L.x, kind: 'error', names: [L.name, Rb.name], note: r.error }); stop = r.error; segs.push({ t0: t, t1: t, bodies: [] }); break; }
      var ev = { t: t, x: L.x, kind: 'pair', n: nColl, names: [L.name, Rb.name], m: [L.m, Rb.m], u: [L.v, Rb.v], v: [r.v1, r.v2], res: r, coalesced: r.coalesced };
      events.push(ev);
      if (r.coalesced && oc.type === 'coalesce') {
        bodies.splice(idx, 2, { ids: L.ids.concat(Rb.ids), name: L.name + Rb.name, m: L.m + Rb.m, x: L.x, v: r.v1 });
      } else { L.v = r.v1; Rb.v = r.v2; }
      if (!r.valid) { stop = 'collision ' + nColl + ' outcome is physically impossible'; segs.push({ t0: t, t1: t, bodies: bodies.map(function (b) { return { ids: b.ids.slice(), name: b.name, m: b.m, x0: b.x, v: b.v }; }) }); break; }
    }
    var last = segs[segs.length - 1];
    if (last && last.t1 === last.t0 && segs.length > 1) last.frozen = true;
    function stateAt(T) {
      var s = segs[0];
      for (var k = 0; k < segs.length; k++) { if (T >= segs[k].t0 - 1e-12) s = segs[k]; }
      return s.bodies.map(function (b) { var d = Math.min(T, Math.max(s.t1, s.t0)) - s.t0; if (s === last && !last.frozen) d = T - s.t0; return { ids: b.ids, name: b.name, m: b.m, x: b.x0 + b.v * Math.max(0, d), v: b.v }; });
    }
    return { segments: segs, events: events, stateAt: stateAt, stopReason: stop };
  }

  return { ke: ke, checks: checks, collide: collide, keLossSolve: keLossSolve, maxLoss: maxLoss, bothSigns: bothSigns,
    solveMomentum: solveMomentum, massScaleFromLoss: massScaleFromLoss, timeline: timeline };
});
