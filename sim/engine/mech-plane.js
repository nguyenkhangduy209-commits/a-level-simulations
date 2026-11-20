/* SIM.plane — particle on a (rough) inclined plane / horizontal surface / ring on a rod.
   9709 4.1 (friction, limiting equilibrium) + 4.4 (F = ma on a plane) + 4.2 (suvat follow-on).
   Sign convention: s, v, a, D, friction all positive UP the slope (or to the right when θ = 0).
   P acts at angle φ to the up-slope direction, φ > 0 means tilted AWAY from the plane. */
(function (root, f) {
  var m = f(typeof require === 'function' && typeof module === 'object' ? require('../core/util.js') : root.SIM.util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).plane = m;
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';
  var TOL = 1e-9;

  /** forces for a given state; p = {m, g, theta, mu, P, phi, contact} (angles in degrees) */
  function forces(p) {
    var th = U.rad(p.theta), ph = U.rad(p.phi || 0), W = p.m * p.g;
    var Wpar = W * Math.sin(th), Wperp = W * Math.cos(th);
    var Ppar = (p.P || 0) * Math.cos(ph), Pperp = (p.P || 0) * Math.sin(ph);
    var Nraw = Wperp - Pperp;               // reaction needed from a one-sided surface
    var lostContact = p.contact !== 'ring' && Nraw < -TOL * Math.max(1, W);
    var R = p.contact === 'ring' ? Math.abs(Nraw) : Math.max(0, Nraw);
    var mu = p.smooth ? 0 : p.mu;
    var D = Ppar - Wpar;                     // net driving force up-slope, excluding friction
    return { W: W, Wpar: Wpar, Wperp: Wperp, Ppar: Ppar, Pperp: Pperp, Nraw: Nraw, R: R, mu: mu, Fmax: mu * R, D: D,
      lostContact: lostContact, ringReactionSide: Nraw >= 0 ? 'below' : 'above' };
  }

  /**
   * Phases of motion from initial velocity u (up-slope +). Each phase has constant acceleration.
   * Returns {f, phases:[{t0,t1,s0,v0,a,F,kind}], stateAt(t)}.
   */
  function simulate(p) {
    var f = forces(p), m = p.m;
    var phases = [], t = 0, s = 0, v = p.u || 0;
    if (f.lostContact) return { f: f, phases: [], invalid: 'P sin φ > mg cos θ: the particle would leave the surface', stateAt: function () { return { s: 0, v: 0, a: 0, F: 0, kind: 'invalid' }; } };
    var scale = Math.max(f.W, Math.abs(f.Ppar), 1e-9);
    for (var guard = 0; guard < 4; guard++) {
      var a, F, kind;
      if (Math.abs(v) < 1e-12) {
        v = 0;
        if (Math.abs(f.D) <= f.Fmax + TOL * scale) {
          F = -f.D; a = 0;
          kind = f.Fmax > 0 && Math.abs(Math.abs(f.D) - f.Fmax) <= 1e-6 * scale && Math.abs(f.D) > 0 ? 'limiting' : 'static';
          phases.push({ t0: t, t1: Infinity, s0: s, v0: 0, a: 0, F: F, kind: kind });
          break;
        }
        F = -U.sgn(f.D) * f.Fmax; a = (f.D + F) / m; kind = 'sliding';
        phases.push({ t0: t, t1: Infinity, s0: s, v0: 0, a: a, F: F, kind: kind });
        break;
      }
      F = -U.sgn(v) * f.Fmax; a = (f.D + F) / m; kind = 'sliding';
      if (a * v < 0) {                       // decelerating: comes to instantaneous rest
        var dt = -v / a;
        phases.push({ t0: t, t1: t + dt, s0: s, v0: v, a: a, F: F, kind: kind });
        s += v * dt + 0.5 * a * dt * dt; t += dt; v = 0;
        continue;
      }
      phases.push({ t0: t, t1: Infinity, s0: s, v0: v, a: a, F: F, kind: kind });
      break;
    }
    function stateAt(T) {
      for (var i = 0; i < phases.length; i++) {
        var ph = phases[i];
        if (T <= ph.t1 || i === phases.length - 1) {
          var d = Math.max(0, T - ph.t0);
          return { s: ph.s0 + ph.v0 * d + 0.5 * ph.a * d * d, v: ph.v0 + ph.a * d, a: ph.a, F: ph.F, kind: ph.kind, phase: i };
        }
      }
      return { s: 0, v: 0, a: 0, F: 0, kind: 'none', phase: -1 };
    }
    return { f: f, phases: phases, stateAt: stateAt };
  }

  /** time to travel a distance d along the path (counts distance, not displacement) — numeric via phases */
  function distanceAt(sim, T) {
    var dist = 0, ph = sim.phases;
    for (var i = 0; i < ph.length; i++) {
      var p = ph[i], te = Math.min(T, p.t1); if (te <= p.t0) break;
      var d = te - p.t0, s1 = p.v0 * d + 0.5 * p.a * d * d;
      dist += Math.abs(s1);   // within a phase velocity does not change sign (phases split at v = 0)
      if (T <= p.t1) break;
    }
    return dist;
  }

  /** intersect constraints of the form a·P ≤ b with P ≥ 0. Returns [lo, hi] or null. */
  function solveIneq(list) {
    var lo = 0, hi = Infinity;
    for (var i = 0; i < list.length; i++) {
      var a = list[i][0], b = list[i][1];
      if (Math.abs(a) < 1e-12) { if (b < -1e-9) return null; continue; }
      if (a > 0) hi = Math.min(hi, b / a); else lo = Math.max(lo, b / a);
    }
    return lo <= hi + 1e-9 ? [lo, hi] : null;
  }
  /** range of P (magnitude, fixed direction φ) keeping the particle in equilibrium. Union of intervals. */
  function equilibriumRange(p) {
    var th = U.rad(p.theta), ph = U.rad(p.phi || 0), W = p.m * p.g, mu = p.smooth ? 0 : p.mu;
    var s = Math.sin(th), c = Math.cos(th), cp = Math.cos(ph), sp = Math.sin(ph);
    var out = [];
    // case N_raw >= 0 (pressed onto the surface from below / ring bears on lower side)
    var A = solveIneq([[cp + mu * sp, W * (s + mu * c)], [mu * sp - cp, W * (mu * c - s)], [sp, W * c]]);
    if (A) out.push(A);
    if (p.contact === 'ring') {
      var B = solveIneq([[cp - mu * sp, W * (s - mu * c)], [-cp - mu * sp, -W * (s + mu * c)], [-sp, -W * c]]);
      if (B) out.push(B);
    }
    // merge
    out.sort(function (x, y) { return x[0] - y[0]; });
    var merged = [];
    out.forEach(function (iv) { var L = merged[merged.length - 1]; if (L && iv[0] <= L[1] + 1e-9) L[1] = Math.max(L[1], iv[1]); else merged.push(iv.slice()); });
    // textbook closed forms for display
    var upDen = cp + mu * sp, downDen = cp - mu * sp;
    return {
      intervals: merged,
      Pup: upDen > 1e-12 ? W * (s + mu * c) / upDen : Infinity,       // on the point of moving UP
      Pdown: Math.abs(downDen) > 1e-12 ? W * (s - mu * c) / downDen : NaN // on the point of moving DOWN (≤ 0 ⇒ rests with P = 0)
    };
  }
  /** least coefficient of friction for equilibrium in the current configuration */
  function leastMu(p) { var f = forces(p); return f.R > 0 ? Math.abs(f.D) / f.R : (Math.abs(f.D) < 1e-12 ? 0 : Infinity); }

  return { forces: forces, simulate: simulate, distanceAt: distanceAt, equilibriumRange: equilibriumRange, leastMu: leastMu, solveIneq: solveIneq };
});
