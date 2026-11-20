/* SIM.measure — 9702 topic 1: SI base units as exponent vectors, homogeneity, prefixes,
   estimates, errors and uncertainties (1.1, 1.2, 1.3).
   Units are vectors of exponents over the five base units listed in 1.2.1: [kg, m, s, A, K]. */
(function (root, f) {
  var m = f(typeof require === 'function' && typeof module === 'object' ? require('../core/util.js') : root.SIM.util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).measure = m;
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';
  var BASE = ['kg', 'm', 's', 'A', 'K'];
  var TOL = 1e-9;

  /* ---------- unit vector algebra ---------- */
  function vec(kg, m, s, A, K) { return [kg || 0, m || 0, s || 0, A || 0, K || 0]; }
  function mul(a, b) { return a.map(function (x, i) { return x + b[i]; }); }
  function div(a, b) { return a.map(function (x, i) { return x - b[i]; }); }
  function pow(a, n) { return a.map(function (x) { return x * n; }); }
  function equal(a, b) { return a.every(function (x, i) { return Math.abs(x - b[i]) < TOL; }); }
  function isDimensionless(a) { return a.every(function (x) { return Math.abs(x) < TOL; }); }
  function fracStr(x) {
    if (Math.abs(x - Math.round(x)) < TOL) return String(Math.round(x)).replace('-', '−');
    var twice = x * 2;
    if (Math.abs(twice - Math.round(twice)) < TOL) return String(Math.round(twice)).replace('-', '−') + '/2';
    var thrice = x * 3;
    if (Math.abs(thrice - Math.round(thrice)) < TOL) return String(Math.round(thrice)).replace('-', '−') + '/3';
    return String(Number(x.toFixed(4))).replace('-', '−');
  }
  /** HTML in Cambridge style, base order kg m s A K: e.g. "kg m<sup>2</sup> s<sup>−2</sup>". Dimensionless → "no unit". */
  function format(a, opt) {
    opt = opt || {};
    var parts = [];
    a.forEach(function (x, i) {
      if (Math.abs(x) < TOL) return;
      parts.push(BASE[i] + (Math.abs(x - 1) < TOL ? '' : (opt.plain ? '^' + fracStr(x) : '<sup>' + fracStr(x) + '</sup>')));
    });
    return parts.length ? parts.join(' ') : (opt.empty || 'no unit');
  }

  /* ---------- quantities in the AS syllabus (topics 1–11) ---------- */
  // kind: 'S' scalar, 'V' vector, '' not classified here. derived: SI derived unit name if any.
  var Q = {};
  function q(key, name, v, kind, derived) { Q[key] = { key: key, name: name, unit: v, kind: kind, derived: derived || '' }; }
  q('mass', 'mass', vec(1), 'S'); q('length', 'length', vec(0, 1), 'S'); q('time', 'time', vec(0, 0, 1), 'S');
  q('current', 'electric current', vec(0, 0, 0, 1), 'S'); q('temperature', 'temperature', vec(0, 0, 0, 0, 1), 'S');
  q('distance', 'distance', vec(0, 1), 'S'); q('displacement', 'displacement', vec(0, 1), 'V');
  q('area', 'area', vec(0, 2), 'S'); q('volume', 'volume', vec(0, 3), 'S'); q('density', 'density', vec(1, -3), 'S');
  q('speed', 'speed', vec(0, 1, -1), 'S'); q('velocity', 'velocity', vec(0, 1, -1), 'V');
  q('acceleration', 'acceleration', vec(0, 1, -2), 'V');
  q('force', 'force', vec(1, 1, -2), 'V', 'N'); q('weight', 'weight', vec(1, 1, -2), 'V', 'N');
  q('momentum', 'momentum', vec(1, 1, -1), 'V', 'N s');
  q('energy', 'work / energy', vec(1, 2, -2), 'S', 'J'); q('power', 'power', vec(1, 2, -3), 'S', 'W');
  q('pressure', 'pressure', vec(1, -1, -2), 'S', 'Pa'); q('stress', 'stress', vec(1, -1, -2), '', 'Pa');
  q('strain', 'strain', vec(), '', ''); q('young', 'Young modulus', vec(1, -1, -2), '', 'Pa');
  q('springk', 'spring constant', vec(1, 0, -2), '', 'N m<sup>−1</sup>');
  q('moment', 'moment of a force / torque', vec(1, 2, -2), '', 'N m');
  q('charge', 'charge', vec(0, 0, 1, 1), 'S', 'C'); q('pd', 'potential difference / e.m.f.', vec(1, 2, -3, -1), 'S', 'V');
  q('resistance', 'resistance', vec(1, 2, -3, -2), 'S', 'Ω'); q('resistivity', 'resistivity', vec(1, 3, -3, -2), 'S', 'Ω m');
  q('frequency', 'frequency', vec(0, 0, -1), 'S', 'Hz'); q('wavelength', 'wavelength', vec(0, 1), 'S');
  q('intensity', 'intensity', vec(1, 0, -3), 'S', 'W m<sup>−2</sup>');
  q('numdensity', 'number density of charge carriers n', vec(0, -3), 'S', '');
  q('none', 'pure number (π, ½, 2 …)', vec(), 'S', '');

  /* symbols used in the equation templates */
  var SYM = {
    v: 'velocity', u: 'velocity', a: 'acceleration', s: 'displacement', t: 'time', m: 'mass', g: 'acceleration', h: 'length',
    F: 'force', E: 'energy', P: 'power', p: 'pressure', rho: 'density', L: 'length', T: 'time', f: 'frequency', lam: 'wavelength',
    I: 'current', R: 'resistance', V: 'pd', x: 'length', k: 'springk', r: 'length', A: 'area', n: 'numdensity', q: 'charge',
    Q: 'charge', W: 'energy', D: 'force', mom: 'momentum'
  };
  var SYMHTML = { rho: 'ρ', lam: 'λ', mom: 'p', eta: 'η', K: 'k', C: 'C', N: 'n' };
  function symHtml(s) { return SYMHTML[s] || s; }

  /* ---------- homogeneity ---------- */
  /** unit of a term {coef, f:{sym:power}} given a symbol→unit map */
  function termUnit(term, units) {
    var out = vec();
    Object.keys(term.f).forEach(function (s) {
      var u = units[s] || (SYM[s] ? Q[SYM[s]].unit : null);
      if (!u) throw new Error('unknown symbol ' + s);
      out = mul(out, pow(u, term.f[s]));
    });
    return out;
  }
  /** terms[0] is the left-hand side; all terms must have equal units */
  function homogeneity(terms, units) {
    var us = terms.map(function (t) { return termUnit(t, units || {}); });
    var ok = us.every(function (x) { return equal(x, us[0]); });
    return { units: us, homogeneous: ok };
  }
  /** units of an unknown symbol `k` appearing to power `n` in term index `ti`, so that term matches the LHS (term 0) */
  function solveConstant(terms, ti, k, units) {
    var lhs = termUnit(terms[0], units || {});
    var rest = {}; Object.keys(terms[ti].f).forEach(function (s) { if (s !== k) rest[s] = terms[ti].f[s]; });
    var other = termUnit({ f: rest }, units || {});
    return pow(div(lhs, other), 1 / terms[ti].f[k]);
  }
  /** exponent n with target = n × base (vector); null if no single n works */
  function solveExponent(target, base) {
    var n = null;
    for (var i = 0; i < 5; i++) {
      if (Math.abs(base[i]) < TOL) { if (Math.abs(target[i]) > TOL) return { ok: false }; continue; }
      var ni = target[i] / base[i];
      if (n === null) n = ni; else if (Math.abs(ni - n) > 1e-9) return { ok: false };
    }
    if (n === null) return { ok: false, any: isDimensionless(target) };
    return { ok: true, n: n };
  }

  /* ---------- prefixes (1.2.4) ---------- */
  var PREFIX = [
    { key: 'p', name: 'pico', sym: 'p', e: -12 }, { key: 'n', name: 'nano', sym: 'n', e: -9 }, { key: 'u', name: 'micro', sym: 'μ', e: -6 },
    { key: 'm', name: 'milli', sym: 'm', e: -3 }, { key: 'c', name: 'centi', sym: 'c', e: -2 }, { key: 'd', name: 'deci', sym: 'd', e: -1 },
    { key: '', name: '(none)', sym: '', e: 0 }, { key: 'k', name: 'kilo', sym: 'k', e: 3 }, { key: 'M', name: 'mega', sym: 'M', e: 6 },
    { key: 'G', name: 'giga', sym: 'G', e: 9 }, { key: 'T', name: 'tera', sym: 'T', e: 12 }];
  function prefixExp(key) { for (var i = 0; i < PREFIX.length; i++) if (PREFIX[i].key === key) return PREFIX[i].e; return NaN; }
  /** convert value in (fromPrefix unit)^power to (toPrefix unit)^power: factor = 10^((eFrom − eTo)·power) */
  function convertPrefix(value, from, to, power) {
    var n = power === undefined ? 1 : power, ex = (prefixExp(from) - prefixExp(to)) * n;
    return { exponent: ex, factor: Math.pow(10, ex), value: value * Math.pow(10, ex) };
  }

  /* ---------- estimates (1.1.2): accepted ranges deliberately wide, order of magnitude ---------- */
  var ESTIMATES = [
    { key: 'adult', text: 'mass of an adult person', unit: 'kg', lo: 50, hi: 100, typical: 70 },
    { key: 'apple', text: 'weight of an apple', unit: 'N', lo: 0.5, hi: 3, typical: 1 },
    { key: 'door', text: 'height of a room door', unit: 'm', lo: 1.8, hi: 2.5, typical: 2 },
    { key: 'walk', text: 'walking speed of a person', unit: 'm s<sup>−1</sup>', lo: 1, hi: 2, typical: 1.4 },
    { key: 'car', text: 'mass of a family car', unit: 'kg', lo: 800, hi: 2500, typical: 1500 },
    { key: 'paper', text: 'thickness of a sheet of paper', unit: 'm', lo: 5e-5, hi: 2e-4, typical: 1e-4 },
    { key: 'atom', text: 'diameter of an atom', unit: 'm', lo: 5e-11, hi: 5e-10, typical: 1e-10 },
    { key: 'air', text: 'density of air at room conditions', unit: 'kg m<sup>−3</sup>', lo: 1, hi: 1.3, typical: 1.2 },
    { key: 'water', text: 'density of water', unit: 'kg m<sup>−3</sup>', lo: 950, hi: 1050, typical: 1000 },
    { key: 'patm', text: 'atmospheric pressure at sea level', unit: 'Pa', lo: 9e4, hi: 1.1e5, typical: 1e5 },
    { key: 'kettle', text: 'power of an electric kettle', unit: 'W', lo: 1000, hi: 3000, typical: 2000 },
    { key: 'sound', text: 'speed of sound in air', unit: 'm s<sup>−1</sup>', lo: 300, hi: 350, typical: 340 },
    { key: 'light', text: 'wavelength of visible light', unit: 'm', lo: 4e-7, hi: 7e-7, typical: 5e-7 },
    { key: 'runke', text: 'kinetic energy of an adult sprinting', unit: 'J', lo: 1000, hi: 6000, typical: 3000 }
  ];
  /** score an estimate: within [lo,hi] → 'good'; within ×10 of the range → 'order'; else 'off' */
  function judgeEstimate(est, value) {
    if (!(value > 0)) return 'off';
    if (value >= est.lo && value <= est.hi) return 'good';
    if (value >= est.lo / 10 && value <= est.hi * 10) return 'order';
    return 'off';
  }

  /* ---------- uncertainties (1.3.3) ---------- */
  /** product/quotient: Q = k Π x_i^{n_i}. inputs [{x, dx, n}] with dx absolute. Fractional uncertainty = Σ |n_i| dx_i / |x_i|. */
  function uncProduct(k, inputs) {
    var Qv = k, frac = 0, terms = [];
    for (var i = 0; i < inputs.length; i++) {
      var it = inputs[i];
      if (Math.abs(it.x) < 1e-300) return { invalid: 'a measured value is zero: a percentage uncertainty cannot be calculated' };
      Qv *= Math.pow(it.x, it.n);
      var fi = Math.abs(it.n) * Math.abs(it.dx) / Math.abs(it.x);
      terms.push({ frac: Math.abs(it.dx) / Math.abs(it.x), contrib: fi });
      frac += fi;
    }
    if (!isFinite(Qv)) return { invalid: 'the result is not finite' };
    return { Q: Qv, frac: frac, pct: 100 * frac, dQ: Math.abs(Qv) * frac, terms: terms };
  }
  /** sum/difference: Q = Σ s_i x_i (s_i = ±1). Absolute uncertainty = Σ dx_i. */
  function uncSum(inputs) {
    var Qv = 0, dQ = 0;
    inputs.forEach(function (it) { Qv += (it.s < 0 ? -1 : 1) * it.x; dQ += Math.abs(it.dx); });
    return { Q: Qv, dQ: dQ, frac: Math.abs(Qv) > 1e-300 ? dQ / Math.abs(Qv) : Infinity, pct: Math.abs(Qv) > 1e-300 ? 100 * dQ / Math.abs(Qv) : Infinity };
  }
  /** Cambridge-style rounding: uncertainty to `sfU` s.f. (1 by default), value to the same decimal place. Returns strings. */
  function roundWithUnc(Qv, dQ, sfU) {
    sfU = sfU || 1;
    if (!(dQ > 0) || !isFinite(dQ) || !isFinite(Qv)) return null;
    var e = Math.floor(Math.log10(dQ)) - (sfU - 1);   // decimal exponent of last kept digit
    var du = Math.round(dQ / Math.pow(10, e));
    if (String(du).length > sfU) { e += 1; du = Math.round(dQ / Math.pow(10, e)); }
    var qv = Math.round(Qv / Math.pow(10, e));
    var dpN = Math.max(0, -e);
    var fmt = function (n) { return (n * Math.pow(10, e)).toFixed(dpN).replace('-', '−'); };
    return { value: fmt(qv), unc: fmt(du), exp: e };
  }

  /* ---------- repeated readings with systematic + random error (1.3.1, 1.3.2) ---------- */
  function rng(seed) {             // mulberry32: deterministic, so a page can redraw the same data
    var a = (seed >>> 0) || 1;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function gaussian(r) { var u1 = Math.max(1e-12, r()), u2 = r(); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); }
  /** n shots at a 2-D target: offset (bias) along +x, random spread sigma in each direction */
  function targetShots(bias, sigma, n, seed) {
    var r = rng(seed), out = [];
    for (var i = 0; i < n; i++) out.push([bias + sigma * gaussian(r), sigma * gaussian(r)]);
    return out;
  }
  /** readings x_i = trueValue + zeroError + bias + sigma·N(0,1); stats with Cambridge half-range uncertainty */
  function readings(o) {
    var r = rng(o.seed), xs = [];
    for (var i = 0; i < o.n; i++) xs.push(o.trueValue + (o.zero || 0) + (o.bias || 0) + (o.sigma || 0) * gaussian(r));
    return stats(xs);
  }
  function stats(xs) {
    var n = xs.length, mean = 0; xs.forEach(function (x) { mean += x; }); mean /= n;
    var mn = Math.min.apply(null, xs), mx = Math.max.apply(null, xs), ss = 0;
    xs.forEach(function (x) { ss += (x - mean) * (x - mean); });
    return { xs: xs, n: n, mean: mean, min: mn, max: mx, halfRange: (mx - mn) / 2, sd: n > 1 ? Math.sqrt(ss / (n - 1)) : 0 };
  }

  return { BASE: BASE, vec: vec, mul: mul, div: div, pow: pow, equal: equal, isDimensionless: isDimensionless, format: format, fracStr: fracStr,
    Q: Q, SYM: SYM, symHtml: symHtml, termUnit: termUnit, homogeneity: homogeneity, solveConstant: solveConstant, solveExponent: solveExponent,
    PREFIX: PREFIX, prefixExp: prefixExp, convertPrefix: convertPrefix, ESTIMATES: ESTIMATES, judgeEstimate: judgeEstimate,
    uncProduct: uncProduct, uncSum: uncSum, roundWithUnc: roundWithUnc, rng: rng, gaussian: gaussian, targetShots: targetShots, readings: readings, stats: stats };
});
