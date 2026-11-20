/* SIM.materials — 9702 topic 6: deformation of solids.
   6.1 Hooke's law F = kx (up to the limit of proportionality), stress, strain, Young modulus.
   6.2 Elastic / plastic deformation, elastic limit, work done = area under the force–extension graph,
       E_P = ½Fx = ½kx² (within the limit of proportionality only).
   Force–extension MODEL used for illustration (the shape beyond the limit of proportionality is not
   specified by the syllabus, so a straight line of reduced gradient r·k is used — areas can be checked by hand):
     loading:  F = kx                       for 0 ≤ F ≤ F_P   (limit of proportionality at F_P, x_P = F_P/k)
               F = F_P + r k (x − x_P)       for F > F_P
     elastic limit at load F_E ≥ F_P. Unloading from a load ≤ F_E retraces the loading curve (elastic);
     unloading from a load > F_E follows a line of gradient k (parallel to the initial line) ⇒ permanent extension. */
(function (root, f) {
  var m = f(typeof require === 'function' && typeof module === 'object' ? require('../core/util.js') : root.SIM.util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).materials = m;
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';

  function hookeX(F, k) { return k > 0 ? F / k : NaN; }
  function springConst(F, x) { return x > 0 ? F / x : NaN; }
  function epe(F, x) { return 0.5 * F * x; }
  function epeK(k, x) { return 0.5 * k * x * x; }

  /** s = {k, FP, FE, r} */
  function curve(s) {
    var xP = s.FP / s.k;
    function F(x) { return x <= xP ? s.k * x : s.FP + s.r * s.k * (x - xP); }
    function X(Fv) { return Fv <= s.FP ? Fv / s.k : xP + (Fv - s.FP) / (s.r * s.k); }
    function areaTo(x) { return x <= xP ? 0.5 * s.k * x * x : 0.5 * s.FP * xP + 0.5 * (s.FP + F(x)) * (x - xP); }
    return { xP: xP, xE: X(Math.max(s.FE, s.FP)), F: F, X: X, areaTo: areaTo };
  }

  /** apply a load F then remove it. Returns extension, whether plastic, permanent extension and energies. */
  function loadUnload(s, Fload) {
    var c = curve(s), x = c.X(Fload), out = { curve: c, F: Fload, x: x };
    var tol = 1e-12 * Math.max(1, s.FE);
    out.withinLoP = Fload <= s.FP + tol;
    out.plastic = Fload > Math.max(s.FE, s.FP) + tol;
    out.work = c.areaTo(x);                               // work done stretching = area under loading curve
    out.xPerm = out.plastic ? x - Fload / s.k : 0;
    if (out.xPerm < 0) out.xPerm = 0;
    out.recovered = out.plastic ? 0.5 * Fload * (x - out.xPerm) : out.work; // area under the unloading line
    out.notRecovered = out.work - out.recovered;
    out.epe = out.withinLoP ? epe(Fload, x) : NaN;        // ½Fx only valid within the limit of proportionality
    return out;
  }

  /** wire: L (m), d (m), F (N), x (m). Returns area, stress, strain, Young modulus. */
  function wire(L, d, F, x) {
    var A = Math.PI * d * d / 4, out = { A: A };
    out.stress = A > 0 ? F / A : NaN;
    out.strain = L > 0 ? x / L : NaN;
    out.E = out.strain > 0 ? out.stress / out.strain : NaN;
    return out;
  }
  /** extension of a wire of Young modulus E (Pa) */
  function wireX(L, d, F, E) { var A = Math.PI * d * d / 4; return A > 0 && E > 0 ? F * L / (A * E) : NaN; }
  /** percentage uncertainty in E = FL/(Ax) with A = πd²/4: %F + %L + 2·%d + %x */
  function youngUncertainty(F, dF, L, dL, d, dd, x, dx) {
    var pF = 100 * dF / F, pL = 100 * dL / L, pd = 100 * dd / d, px = 100 * dx / x;
    return { pF: pF, pL: pL, pd: pd, px: px, pE: pF + pL + 2 * pd + px };
  }

  return { hookeX: hookeX, springConst: springConst, epe: epe, epeK: epeK, curve: curve, loadUnload: loadUnload, wire: wire, wireX: wireX, youngUncertainty: youngUncertainty };
});
