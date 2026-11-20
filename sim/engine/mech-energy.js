/* SIM.energy — work–energy along a slope or path (9709 4.5; PLAN S11).
   Energy equation for a leg of path length d (forward = initial direction of motion):
     ½mv² = ½mu² + W_P + W_eng − W_res − mgΔh,
   W_P = P d cos φ (φ = angle between P and the direction of motion), W_res = F_r d (+ any extra work W_x
   given directly), ΔGPE = mgΔh (Δh = rise). Friction model 'mu' only on a straight slope:
   R = mg cos θ − P sin φ (P sin φ = component away from the surface), F_r = μR.
   If the KE would become negative the particle stops; on a straight slope (or a smooth path) with no lump
   work terms, the static test is applied and the return leg is run, with resistance work on both legs. */
(function (root, f) {
  var m = f(typeof require === 'function' && typeof module === 'object' ? require('../core/util.js') : root.SIM.util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).energy = m;
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';

  /**
   * p = { m, g, u (≥0), path:'slope'|'drop'|'curve', theta (deg), dir:'up'|'down' (slope), L (path length),
   *       h (vertical DROP for 'drop'/'curve', negative = rise), resist:'none'|'force'|'mu', F, mu,
   *       P, phi (deg), Wx (extra work against resistance over the leg), Weng (engine work over the leg),
   *       tAvg (time for average power), solve:'v'|'F'|'mu'|'d'|'Wx'|'Weng', vTarget }
   */
  function geometry(p) {
    var rise, cosT = 1;
    if (p.path === 'slope') {
      var th = U.rad(p.theta || 0);
      rise = (p.dir === 'down' ? -1 : 1) * Math.sin(th); cosT = Math.cos(th);
    } else rise = p.L > 0 ? -(p.h || 0) / p.L : 0;   // average rise per metre of path (only Δh matters)
    return { rise: rise, cosT: cosT };
  }

  function leg(p) {
    var g = p.g, m = p.m, L = p.L, u = p.u || 0, geo = geometry(p), out = { warn: [] };
    var P = p.P || 0, ph = U.rad(p.phi || 0), Pf = P * Math.cos(ph), Pn = P * Math.sin(ph);
    if (!(m > 0)) { out.invalid = 'Mass must be positive.'; return out; }
    if (p.path !== 'slope' && Math.abs(p.h || 0) > L + 1e-12) { out.invalid = 'The vertical drop cannot exceed the path length.'; return out; }
    var R = NaN, Fr = 0;
    if (p.path === 'slope') {
      R = m * g * geo.cosT - Pn;
      if (R < -1e-9 * m * g) { out.invalid = 'P sin φ > mg cos θ: the particle would leave the slope.'; return out; }
      R = Math.max(0, R);
    }
    if (p.resist === 'force') Fr = Math.max(0, p.F || 0);
    else if (p.resist === 'mu') {
      if (p.path !== 'slope') { out.warn.push('μR friction only makes sense on a straight slope (R varies on a curve) — resistance ignored.'); Fr = 0; }
      else Fr = (p.mu || 0) * R;
    }
    var Gf = -m * g * geo.rise;          // weight component along the forward direction
    var Wx = p.Wx || 0, We = p.Weng || 0;
    var KE0 = 0.5 * m * u * u;
    Object.assign(out, { R: R, Fr: Fr, Gf: Gf, Pf: Pf, Pn: Pn, KE0: KE0, rise: geo.rise, L: L });

    // ---------- solve modes (single leg, reaching the end of the path) ----------
    var solve = p.solve || 'v', vT = p.vTarget, KE1t = 0.5 * m * (vT || 0) * (vT || 0);
    var net = Gf + Pf - Fr;               // constant force part along the motion
    if (solve === 'F' || solve === 'mu') {
      var Freq = (KE0 - KE1t + (Gf + Pf) * L + We - Wx) / L;
      out.Fsolved = Freq;
      if (Freq < -1e-9) out.warn.push('The required resistance is negative: the stated speeds need extra driving work, not resistance.');
      Fr = Freq; out.Fr = Fr;
      if (solve === 'mu') { out.muSolved = R > 0 ? Freq / R : NaN; if (!(R > 0)) out.warn.push('R = 0: μ cannot be found.'); }
    } else if (solve === 'Wx') {
      out.WxSolved = KE0 - KE1t + net * L + We; Wx = out.WxSolved;
      if (Wx < -1e-9) out.warn.push('Negative work against resistance: impossible — the speeds need a driving force.');
    } else if (solve === 'Weng') {
      out.WengSolved = KE1t - KE0 - net * L + Wx; We = out.WengSolved;
      if (We < -1e-9) out.warn.push('The engine would have to do negative work (act as a brake).');
    } else if (solve === 'd') {
      if (Math.abs(Wx) > 0 || Math.abs(We) > 0) { out.dSolved = NaN; out.warn.push('Cannot solve for d with lump work terms (W_x, W_eng) given for an unknown distance.'); }
      else if (p.path !== 'slope') { out.dSolved = NaN; out.warn.push('Solve for d needs a straight slope (Δh grows with d).'); }
      else {
        out.dSolved = Math.abs(net) > 1e-12 ? (KE1t - KE0) / net : NaN;
        if (!(out.dSolved > 0)) out.warn.push('No positive distance gives this speed (the net force acts the wrong way).');
      }
      if (out.dSolved > 0) L = out.dSolved;
      out.L = L;
    }
    net = Gf + Pf - Fr;
    out.Wx = Wx; out.Weng = We; out.net = net;
    // energy terms over the forward leg (if it reaches the end)
    var dKEperM = net + (We - Wx) / L;        // KE change per metre (lumps spread evenly)
    var KE1 = KE0 + dKEperM * L;
    out.WP = Pf * L; out.Wres = Fr * L + Wx; out.dGPE = -Gf * L; out.KE1 = KE1;
    out.tAvg = p.tAvg; out.powerP = p.tAvg > 0 ? out.WP / p.tAvg : NaN; out.powerEng = p.tAvg > 0 ? We / p.tAvg : NaN;
    // ---------- journey (there, maybe stop, maybe back) ----------
    var J = { legs: [] };
    if (KE1 >= -1e-9 * Math.max(1, KE0) || dKEperM >= 0) {
      J.legs.push({ dir: 1, d: L, KE0: KE0, KE1: Math.max(0, KE1), net: net });
      out.v = Math.sqrt(Math.max(0, 2 * KE1 / m)); out.reachesEnd = true;
    } else {
      var sStop = KE0 / -dKEperM;
      out.reachesEnd = false; out.sStop = sStop; out.v = NaN;
      J.legs.push({ dir: 1, d: sStop, KE0: KE0, KE1: 0, net: net });
      if (Math.abs(Wx) > 0 || Math.abs(We) > 0) {
        out.warn.push('The particle stops ' + U.sf(sStop) + ' m along the path (KE runs out before the end).');
      } else {
        // static test at the stopping point: driving force along the forward direction = Gf + Pf
        var drive = Gf + Pf, cap = Fr;   // friction can act either way up to F_r
        out.stopDrive = drive; out.stopCap = cap;
        if (Math.abs(drive) <= cap + 1e-9 * m * g) { out.staysAtRest = true; }
        else if (drive > 0) { out.staysAtRest = true; } // cannot happen: it stopped while being driven forward
        else {
          out.staysAtRest = false;
          var netBack = -drive - Fr;          // along the backward direction
          var KEb = netBack * sStop;
          J.legs.push({ dir: -1, d: sStop, KE0: 0, KE1: KEb, net: netBack });
          out.vReturn = Math.sqrt(Math.max(0, 2 * KEb / m));
        }
      }
    }
    out.journey = J;
    out.totalDist = J.legs.reduce(function (s, l) { return s + l.d; }, 0);
    // account as a function of total distance travelled σ
    out.at = function (sig) {
      var KE = KE0, pos = 0, Wr = 0, Wp = 0, Wen = 0, rem = Math.max(0, sig);
      for (var i = 0; i < J.legs.length && rem >= 0; i++) {
        var lg = J.legs[i], dd = Math.min(rem, lg.d);
        var wxPer = i === 0 ? Wx / L : 0;   // lump terms spread evenly over the first leg (for plotting only)
        var wePer = i === 0 ? We / L : 0;
        Wr += Fr * dd + wxPer * dd; Wp += Pf * lg.dir * dd; Wen += wePer * dd;
        pos += lg.dir * dd; rem -= lg.d;
        if (rem <= 0) break;
      }
      var GPE = m * g * geo.rise * pos;
      KE = KE0 + Wp + Wen - Wr - GPE;
      return { sigma: sig, pos: pos, KE: Math.max(0, KE), KEraw: KE, GPE: GPE, Wres: Wr, WP: Wp, Weng: Wen, height: geo.rise * pos,
        balance: KE + GPE + Wr - Wp - Wen - KE0 };
    };
    return out;
  }

  /** W = F d cos θ */
  function work(F, d, thetaDeg) { return F * d * Math.cos(U.rad(thetaDeg || 0)); }

  return { leg: leg, work: work, geometry: geometry };
});
