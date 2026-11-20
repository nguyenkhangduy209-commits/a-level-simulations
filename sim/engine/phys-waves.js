/* SIM.waves — 9702 topic 7: progressive waves (7.1), transverse/longitudinal (7.2), Doppler for a moving
   source and stationary observer (7.3), electromagnetic spectrum (7.4), polarisation / Malus's law (7.5).
   Progressive wave travelling in +x:  y(x, t) = A sin(2π(f t − x/λ))
   (a point further along +x lags behind: its phase is smaller by 2πΔx/λ).
   For a longitudinal wave y is the displacement ALONG x (positive = to the right). */
(function (root, f) {
  var m = f(typeof require === 'function' && typeof module === 'object' ? require('../core/util.js') : root.SIM.util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).waves = m;
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';
  var C = 3.00e8;   // data sheet: speed of light in free space

  /* ---------------- progressive waves ---------------- */
  function speed(f, lambda) { return f * lambda; }
  function period(f) { return f > 0 ? 1 / f : Infinity; }
  function y(A, lambda, f, x, t) { return A * Math.sin(2 * Math.PI * (f * t - x / lambda)); }
  /** phase (rad, unwrapped) of the point at x at time t */
  function phase(lambda, f, x, t) { return 2 * Math.PI * (f * t - x / lambda); }
  /** phase difference between two points Δx apart on the same wave */
  function phaseDiff(dx, lambda) {
    var deg = 360 * Math.abs(dx) / lambda;
    var mod = deg % 360; if (Math.abs(mod - 360) < 1e-9) mod = 0; if (mod < 1e-9) mod = 0;
    var min = Math.min(mod, 360 - mod);
    return { deg: deg, mod: mod, min: min, rad: U.rad(deg), modRad: U.rad(mod), inPhase: Math.abs(mod) < 1e-6 || Math.abs(mod - 360) < 1e-6, anti: Math.abs(mod - 180) < 1e-6 };
  }
  /** phase difference from a time shift Δt between two oscillations of period T */
  function phaseFromTime(dt, T) { return 360 * dt / T; }
  /** longitudinal wave: x positions (equilibrium) of compressions / rarefactions in [x0, x1] at time t */
  function compressions(lambda, f, t, x0, x1) {
    // s = A sin θ, θ = 2π(ft − x/λ); ∂s/∂x = −(2π/λ)A cos θ is most negative (particles closest) when θ = 2πn
    var cs = [], rs = [], base = f * t * lambda;          // θ = 2πn  ⇔  x = λ(ft − n)
    for (var n = Math.floor((base - x1) / lambda) - 1; n <= Math.ceil((base - x0) / lambda) + 1; n++) {
      var xc = base - n * lambda, xr = xc - lambda / 2;
      if (xc >= x0 - 1e-12 && xc <= x1 + 1e-12) cs.push(xc);
      if (xr >= x0 - 1e-12 && xr <= x1 + 1e-12) rs.push(xr);
    }
    return { C: cs.sort(function (a, b) { return a - b; }), R: rs.sort(function (a, b) { return a - b; }) };
  }
  /** intensity = power / area */
  function intensity(P, area) { return area > 0 ? P / area : NaN; }
  /** intensity ∝ amplitude²: new intensity when amplitude changes from A1 to A2 */
  function intensityScale(I1, A1, A2) { return A1 > 0 ? I1 * (A2 / A1) * (A2 / A1) : NaN; }

  /* ---------------- CRO ---------------- */
  /** p = {f, V0, tb (s/div), yg (V/div), nx = 10, ny = 8} */
  function cro(p) {
    var nx = p.nx || 10, ny = p.ny || 8, T = 1 / p.f, out = { T: T };
    out.divPerCycle = T / p.tb;
    out.cycles = nx * p.tb / T;
    out.ampDiv = p.V0 / p.yg;
    out.ppDiv = 2 * out.ampDiv;
    out.clipped = out.ampDiv > ny / 2 + 1e-9;
    out.tooFew = out.cycles < 1 - 1e-9;
    out.tooMany = out.cycles > 40;
    out.fRead = 1 / (out.divPerCycle * p.tb);
    out.ampRead = out.ampDiv * p.yg;
    return out;
  }

  /* ---------------- Doppler (moving source, stationary observer on the line of motion) ---------------- */
  /** observed frequency; approaching ⇒ f_s v/(v − v_s), receding ⇒ f_s v/(v + v_s). NaN if v_s ≥ v approaching. */
  function doppler(fs, v, vs, approaching) {
    var den = approaching ? v - vs : v + vs;
    return den > 0 ? fs * v / den : NaN;
  }
  /** source speed from an observed frequency: f_o > f_s ⇒ approaching, f_o < f_s ⇒ receding */
  function dopplerSourceSpeed(fs, fo, v) {
    if (!(fs > 0 && fo > 0)) return { vs: NaN };
    if (fo > fs) return { vs: v * (1 - fs / fo), approaching: true };
    if (fo < fs) return { vs: v * (fs / fo - 1), approaching: false };
    return { vs: 0, approaching: null };
  }
  /** wavelength observed ahead (approaching) / behind (receding) of a moving source */
  function dopplerWavelength(fs, v, vs, approaching) { return (approaching ? v - vs : v + vs) / fs; }
  /** wavefronts at time t: source at x_s(t) = x0 + vs t, crests emitted at t_n = n / fs. Returns [{cx, r}] with r ≤ rMax */
  function wavefronts(p, t, rMax) {
    var T = 1 / p.fs, list = [], nMax = Math.floor(t / T + 1e-9), nMin = Math.ceil((t - rMax / p.v) / T - 1e-9);
    for (var n = nMax; n >= nMin && list.length < 400; n--) {
      var te = n * T, r = p.v * (t - te);
      if (r < 0 || r > rMax) continue;
      list.push({ cx: p.x0 + p.vs * te, r: r, te: te });
    }
    return list;
  }
  /** observed frequency at time t for a stationary observer at xo on the line (source moving +x) */
  function observedAt(p, xo, t) {
    if (p.vs <= 0) return p.fs;
    var tp = (xo - p.x0) / p.vs;                   // time the source passes the observer
    return t < tp ? doppler(p.fs, p.v, p.vs, true) : doppler(p.fs, p.v, p.vs, false);
  }

  /* ---------------- EM spectrum ---------------- */
  // Approximate free-space wavelength ranges (m). Region boundaries are not sharp and X-rays / γ-rays overlap.
  var EM = [
    { name: 'γ-rays', lo: 1e-16, hi: 1e-11 },
    { name: 'X-rays', lo: 1e-13, hi: 1e-8 },
    { name: 'ultraviolet', lo: 1e-8, hi: 4e-7 },
    { name: 'visible', lo: 4e-7, hi: 7e-7 },
    { name: 'infrared', lo: 7e-7, hi: 1e-3 },
    { name: 'microwaves', lo: 1e-3, hi: 1e-1 },
    { name: 'radio waves', lo: 1e-1, hi: 1e6 }
  ];
  function emRegions(lambda) {
    return EM.filter(function (r) { return lambda >= r.lo * (1 - 1e-12) && lambda <= r.hi * (1 + 1e-12); }).map(function (r) { return r.name; });
  }
  function freq(lambda) { return C / lambda; }

  /* ---------------- polarisation ---------------- */
  /** Malus's law I = I₀ cos²θ */
  function malus(I0, thetaDeg) { var c = Math.cos(U.rad(thetaDeg)); return I0 * c * c; }
  /** plane-polarised light (plane at angle pol from vertical, intensity I0) through filters with axes at angles axes[] (from vertical) */
  function malusChain(I0, pol, axes) {
    var I = I0, dir = pol, steps = [];
    axes.forEach(function (ax) {
      var rel = ax - dir, In = malus(I, rel);
      if (In < 1e-15 * Math.max(1, I0)) In = 0;
      steps.push({ axis: ax, from: dir, rel: rel, Iin: I, Iout: In });
      I = In; dir = ax;
    });
    return { I: I, steps: steps };
  }
  /** angle (0–90°) between polarisation plane and axis giving transmitted intensity Iout from Iin */
  function malusAngle(Iin, Iout) {
    if (!(Iin > 0) || Iout < 0 || Iout > Iin * (1 + 1e-12)) return NaN;
    return U.deg(Math.acos(Math.sqrt(Math.min(1, Iout / Iin))));
  }

  return { C: C, speed: speed, period: period, y: y, phase: phase, phaseDiff: phaseDiff, phaseFromTime: phaseFromTime, compressions: compressions,
    intensity: intensity, intensityScale: intensityScale, cro: cro, doppler: doppler, dopplerSourceSpeed: dopplerSourceSpeed,
    dopplerWavelength: dopplerWavelength, wavefronts: wavefronts, observedAt: observedAt, EM: EM, emRegions: emRegions, freq: freq,
    malus: malus, malusChain: malusChain, malusAngle: malusAngle };
});
