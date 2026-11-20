/* SIM.proj — projectile motion in a uniform gravitational field (9702 2.1.9; also 9709-style suvat checks).
   Calculations use NO air resistance (syllabus 2.1.9). `dragPath` is a separate, qualitative-only
   illustration for 3.2.2 ("describe and explain qualitatively … with air resistance"); never show its numbers.
   Axes: x horizontal (+ in the direction of launch), y vertically up, launch point (0, h0). Angles in degrees. */
(function (root, f) {
  var m = f(typeof require === 'function' && typeof module === 'object' ? require('../core/util.js') : root.SIM.util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).proj = m;
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';

  /** p = {u, theta, h0, yL, g} → full analysis */
  function solve(p) {
    var g = p.g, th = U.rad(p.theta), h0 = p.h0 || 0, yL = p.yL || 0;
    var ux = p.u * Math.cos(th), uy = p.u * Math.sin(th);
    if (Math.abs(ux) < 1e-12) ux = 0;
    if (Math.abs(uy) < 1e-12) uy = 0;
    function stateAt(t) {
      return { t: t, x: ux * t, y: h0 + uy * t - 0.5 * g * t * t, vx: ux, vy: uy - g * t,
        speed: Math.hypot(ux, uy - g * t), dir: U.deg(Math.atan2(uy - g * t, ux)) };
    }
    // apex (only if moving upwards initially)
    var apex = uy > 0 ? { t: uy / g, H: h0 + uy * uy / (2 * g), x: ux * uy / g } : null;
    // times when y = yL:  -½g t² + uy t + (h0 − yL) = 0
    var disc = uy * uy + 2 * g * (h0 - yL);
    var roots = U.quadratic(-0.5 * g, uy, h0 - yL).filter(function (t) { return t > 1e-9; });
    var land = null, crossings = roots;
    if (roots.length) {
      var tL = roots[roots.length - 1];          // the projectile is coming DOWN through y = yL at the larger root
      var s = stateAt(tL);
      land = { t: tL, x: s.x, vx: s.vx, vy: s.vy, speed: s.speed, angleBelow: U.deg(Math.atan2(-s.vy, Math.abs(s.vx) || 0)) };
    }
    var reason = null;
    if (!land) reason = disc < 0 ? 'never reaches the landing level (it is above the highest point)' : 'starts at the landing level moving downwards / already below it';
    return {
      ux: ux, uy: uy, g: g, h0: h0, yL: yL, apex: apex, land: land, crossings: crossings, disc: disc, reason: reason, stateAt: stateAt,
      // level-ground formulas are only valid when launch and landing heights match
      levelRange: Math.abs(h0 - yL) < 1e-12 && uy > 0 ? p.u * p.u * Math.sin(2 * th) / g : null,
      levelTime: Math.abs(h0 - yL) < 1e-12 && uy > 0 ? 2 * uy / g : null,
      impactSpeedEnergy: h0 - yL >= -uy * uy / (2 * g) ? Math.sqrt(p.u * p.u + 2 * g * (h0 - yL)) : NaN
    };
  }
  /** height of the trajectory at horizontal distance X (for "does it clear the wall?") */
  function heightAt(sol, X) {
    if (sol.ux <= 0) return NaN;
    var t = X / sol.ux; return { t: t, y: sol.stateAt(t).y };
  }
  /** angles (deg) that hit a target at (X, Y) relative to launch with speed u — the two-solution exam case */
  function anglesToHit(u, X, Y, g) {
    // Y = X tanθ − g X² (1 + tan²θ) / (2u²)  →  a T² − X T + (Y + a) = 0 with a = gX²/(2u²)
    var a = g * X * X / (2 * u * u);
    return U.quadratic(a, -X, Y + a).map(function (T) { return U.deg(Math.atan(T)); });
  }
  /** QUALITATIVE ONLY: path with drag force ∝ v² (k/m in m⁻¹). Returns sampled points until y < yL. */
  function dragPath(p, kOverM, dt) {
    dt = dt || 1e-3;
    var th = U.rad(p.theta), y = [0, p.h0 || 0, p.u * Math.cos(th), p.u * Math.sin(th)], t = 0, pts = [[0, y[0], y[1]]];
    var f = function (tt, s) { var v = Math.hypot(s[2], s[3]); return [s[2], s[3], -kOverM * v * s[2], -p.g - kOverM * v * s[3]]; };
    for (var i = 0; i < 200000; i++) {
      var n = U.rk4(f, t, y, dt); t += dt;
      if (n[1] < (p.yL || 0) && n[3] < 0) {
        var fr = (y[1] - (p.yL || 0)) / (y[1] - n[1]); pts.push([t - dt + fr * dt, y[0] + fr * (n[0] - y[0]), p.yL || 0]); break;
      }
      y = n; if (i % 10 === 0) pts.push([t, y[0], y[1]]);
    }
    return pts;
  }
  return { solve: solve, heightAt: heightAt, anglesToHit: anglesToHit, dragPath: dragPath };
});
