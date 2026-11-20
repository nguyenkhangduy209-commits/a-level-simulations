/* SIM.energy — 9702 topic 5: work, energy conservation, efficiency, power (5.1) and ΔE_P = mgΔh, E_K = ½mv² (5.2).
   Slope model: an object moves a distance s along a straight incline at angle θ (θ = 90° is vertical),
   direction 'up' or 'down', starting with speed u. Forces along the motion are all CONSTANT:
     driving force F_d (along the direction of motion), resistive force F_r (opposing motion, e.g. friction
     or air resistance, given directly in N), and the weight component mg sin θ.
   Energy equation:  ½mu² + F_d·s = ½mv² + mgΔh + F_r·s   (Δh = +s sin θ going up, −s sin θ going down). */
(function (root, f) {
  var m = f(typeof require === 'function' && typeof module === 'object' ? require('../core/util.js') : root.SIM.util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).energy = m;
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';

  /** work done by a constant force F over displacement s when the angle between them is φ (degrees) */
  function work(F, s, phiDeg) { var c = Math.cos(U.rad(phiDeg || 0)); if (Math.abs(c) < 1e-12) c = 0; return F * s * c; }
  function gpe(m, g, dh) { return m * g * dh; }
  function ke(m, v) { return 0.5 * m * v * v; }

  /** p = {m, g, theta, s, u, dir:'up'|'down', Fr, Fd} */
  function slope(p) {
    var th = U.rad(p.theta), st = Math.sin(th);
    if (Math.abs(st) < 1e-15) st = 0;
    var sign = p.dir === 'down' ? -1 : 1;               // +1: moving up (gains height)
    var Wpar = p.m * p.g * st;                          // weight component along the slope (down the slope)
    var Fnet = p.Fd - p.Fr - sign * Wpar;               // resultant force in the direction of motion (while moving)
    var a = Fnet / p.m;
    var out = { Wpar: Wpar, Fnet: Fnet, a: a, sign: sign, sinT: st };
    out.dhPerMetre = sign * st;
    // does it start / keep moving?
    if (p.u <= 1e-12 && Fnet <= 1e-12 * Math.max(1, p.m * p.g)) {
      out.noStart = true; out.tEnd = 0; out.dEnd = 0; out.stops = true;
    } else {
      // distance actually travelled before stopping (if decelerating)
      var dStop = a < 0 ? p.u * p.u / (-2 * a) : Infinity;
      out.dStop = dStop;
      out.stops = dStop < p.s - 1e-12;
      out.dEnd = Math.min(p.s, dStop);
      if (out.stops) out.tEnd = -p.u / a;
      else out.tEnd = timeFor(p.u, a, p.s);
    }
    out.dh = sign * st * out.dEnd;
    out.KE0 = ke(p.m, p.u);
    out.Wd = p.Fd * out.dEnd;
    out.Wr = p.Fr * out.dEnd;
    out.dGPE = gpe(p.m, p.g, out.dh);
    out.KE1 = out.KE0 + out.Wd - out.Wr - out.dGPE;
    if (out.KE1 < 0 && out.KE1 > -1e-9 * Math.max(1, out.KE0 + out.Wd)) out.KE1 = 0;
    out.v = Math.sqrt(Math.max(0, out.KE1) * 2 / p.m);
    out.stateAt = function (t) {
      t = U.clamp(t, 0, out.tEnd || 0);
      var d = out.noStart ? 0 : p.u * t + 0.5 * a * t * t;
      d = U.clamp(d, 0, out.dEnd);
      var v = out.noStart ? 0 : Math.max(0, p.u + a * t);
      return { t: t, d: d, v: v, KE: ke(p.m, v), dGPE: gpe(p.m, p.g, sign * st * d), Wd: p.Fd * d, Wr: p.Fr * d };
    };
    return out;
  }
  /** smallest positive t with u t + ½ a t² = s (u ≥ 0); Infinity if never */
  function timeFor(u, a, s) {
    if (s <= 0) return 0;
    if (Math.abs(a) < 1e-14) return u > 0 ? s / u : Infinity;
    var r = U.quadratic(0.5 * a, u, -s).filter(function (t) { return t > 1e-12; });
    return r.length ? Math.min.apply(null, r) : Infinity;
  }

  /** motor lifting a load at constant speed. p = {m, g, v, h, Pin} */
  function motor(p) {
    var Pout = p.m * p.g * p.v, out = { Pout: Pout };
    out.eta = p.Pin > 0 ? Pout / p.Pin : NaN;
    out.t = p.v > 0 ? p.h / p.v : Infinity;
    out.Euseful = p.m * p.g * p.h;
    out.Ein = p.Pin * out.t;
    out.Ewasted = out.Ein - out.Euseful;
    out.impossible = p.Pin > 0 && Pout > p.Pin * (1 + 1e-12);
    return out;
  }

  /** vehicle on a slope (θ ≥ 0 uphill) with constant resistive force. p = {m, g, theta, Fr, P, v} */
  function vehicle(p) {
    var st = Math.sin(U.rad(p.theta)); if (Math.abs(st) < 1e-15) st = 0;
    var resist = p.Fr + p.m * p.g * st, out = { resist: resist, Wpar: p.m * p.g * st };
    out.Fdrive = p.v > 0 ? p.P / p.v : Infinity;
    out.a = p.v > 0 ? (out.Fdrive - resist) / p.m : NaN;
    out.Pconst = resist * p.v;                          // power needed to keep a constant speed v
    out.vmax = resist > 0 ? p.P / resist : Infinity;
    return out;
  }

  function efficiency(useful, total) { return total > 0 ? useful / total : NaN; }
  function power(W, t) { return t > 0 ? W / t : NaN; }

  return { work: work, gpe: gpe, ke: ke, slope: slope, timeFor: timeFor, motor: motor, vehicle: vehicle, efficiency: efficiency, power: power };
});
