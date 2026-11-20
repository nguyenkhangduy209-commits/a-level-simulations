/* SIM.superpos — 9702 topic 8 Superposition (2025–27 syllabus).
   8.1 stationary waves (strings, air columns, microwaves; end corrections negligible),
   8.2 diffraction (single gap: qualitative only — no numeric output is produced for it),
   8.3 two-source interference (path difference, coherence, λ = ax/D),
   8.4 diffraction grating (d sin θ = nλ).
   Units: SI throughout (m, s, Hz). Angles returned in degrees. Pure functions, no DOM. */
(function (root, f) {
  var m = f(typeof require === 'function' && typeof module === 'object' ? require('../core/util.js') : root.SIM.util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).superpos = m;
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';
  var C = 3.00e8;          // data sheet: speed of light in free space
  var VIS = [400e-9, 700e-9]; // 7.4.3: visible 400–700 nm

  /* ================= 8.1 stationary waves ================= */
  /**
   * p = {medium: 'string'|'open'|'closed'|'microwave', L, v, k (mode number 1,2,3…), lambda (microwave only)}
   * Geometry: x = 0 at the left end, x = L at the right end.
   *  string    : fixed at both ends → nodes at both ends.      f = n v / 2L, n = k
   *  open      : open at both ends → displacement antinodes at both ends. f = n v / 2L, n = k
   *  closed    : open at x = 0, closed at x = L → antinode at 0, node at L.  f = n v / 4L with n = 2k − 1 (odd only)
   *  microwave : transmitter at x = 0, metal reflector at x = L (node at the reflector). λ is set by the source;
   *              there is no resonance condition in this model.
   * Returns {harmonic, lambda, f, f1, nodes:[x], antinodes:[x], spacing (= λ/2), invalid?}.
   */
  function stationary(p) {
    var L = p.L, med = p.medium, k = Math.max(1, Math.round(p.k || 1));
    if (!(L > 0)) return { invalid: 'Length must be greater than zero' };
    var lam, f, f1, h, nodes = [], anti = [], i, x;
    if (med === 'microwave') {
      lam = p.lambda;
      if (!(lam > 0)) return { invalid: 'Wavelength must be greater than zero' };
      f = (p.v || C) / lam; h = null; f1 = null;
      for (i = 0; ; i++) { x = L - i * lam / 2; if (x < -1e-12 * L) break; nodes.push(Math.max(0, x)); }
      for (i = 0; ; i++) { x = L - (i + 0.5) * lam / 2; if (x < -1e-12 * L) break; anti.push(Math.max(0, x)); }
      nodes.reverse(); anti.reverse();
    } else {
      if (!(p.v > 0)) return { invalid: 'Wave speed must be greater than zero' };
      if (med === 'closed') { h = 2 * k - 1; lam = 4 * L / h; f1 = p.v / (4 * L); }
      else { h = k; lam = 2 * L / h; f1 = p.v / (2 * L); }
      f = p.v / lam;
      var half = lam / 2;
      if (med === 'string') {
        for (i = 0; i <= h; i++) nodes.push(i * half);
        for (i = 0; i < h; i++) anti.push((i + 0.5) * half);
      } else if (med === 'open') {
        for (i = 0; i <= h; i++) anti.push(i * half);
        for (i = 0; i < h; i++) nodes.push((i + 0.5) * half);
      } else { // closed at x = L
        for (i = 0; i < k; i++) anti.push(i * half);
        for (i = 0; i < k; i++) nodes.push((i + 0.5) * half);
      }
    }
    return { medium: med, harmonic: h, lambda: lam, f: f, f1: f1, nodes: nodes, antinodes: anti, spacing: lam / 2, L: L };
  }
  /** first `count` allowed frequencies (and harmonic numbers) for string / open / closed */
  function allowedFrequencies(medium, L, v, count) {
    var out = [];
    for (var k = 1; k <= (count || 6); k++) {
      var h = medium === 'closed' ? 2 * k - 1 : k;
      out.push({ k: k, harmonic: h, f: medium === 'closed' ? h * v / (4 * L) : h * v / (2 * L) });
    }
    return out;
  }
  /** shape function S(x) of the stationary wave: displacement y(x,t) = 2A·S(x)·cos ωt */
  function shapeFn(medium, lambda, L) {
    var k = 2 * Math.PI / lambda;
    if (medium === 'string') return function (x) { return Math.sin(k * x); };
    if (medium === 'microwave') return function (x) { return Math.sin(k * (L - x)); };
    return function (x) { return Math.cos(k * x); }; // open and closed (antinode at x = 0)
  }
  /** phase argument φ(x) and function F such that S = F(φ). The two travelling waves are A·F(φ − ωt) and A·F(φ + ωt). */
  function travellingPair(medium, lambda, L) {
    var k = 2 * Math.PI / lambda;
    var F = medium === 'open' || medium === 'closed' ? Math.cos : Math.sin;
    var phi = medium === 'microwave' ? function (x) { return k * (L - x); } : function (x) { return k * x; };
    return {
      a: function (x, wt) { return F(phi(x) - wt); },
      b: function (x, wt) { return F(phi(x) + wt); },
      sum: function (x, wt) { return F(phi(x) - wt) + F(phi(x) + wt); }   // = 2 F(φ) cos ωt
    };
  }
  /** phase relation between two points of a stationary wave: 'in phase' | 'antiphase' | 'node' */
  function phaseRelation(medium, lambda, L, x1, x2) {
    var S = shapeFn(medium, lambda, L), s1 = S(x1), s2 = S(x2), tol = 1e-9;
    if (Math.abs(s1) < tol || Math.abs(s2) < tol) return { rel: 'node', s1: s1, s2: s2 };
    return { rel: s1 * s2 > 0 ? 'in phase' : 'antiphase', deg: s1 * s2 > 0 ? 0 : 180, s1: s1, s2: s2 };
  }
  /** λ from a node-to-node measurement: detector moves distance d across m node spacings → λ = 2d/m */
  function lambdaFromNodes(d, m) { return m > 0 ? 2 * d / m : NaN; }

  /* ================= 8.3 two-source interference ================= */
  /** fringe separation from λ = ax/D → x = λD/a */
  function fringeSpacing(lambda, a, D) { return a > 0 ? lambda * D / a : Infinity; }
  /** exact path difference S2P − S1P for a point a height y on a screen at distance D (sources at y = ±a/2) */
  function pathDiff(y, a, D) {
    return Math.hypot(D, y + a / 2) - Math.hypot(D, y - a / 2);
  }
  /**
   * Resultant intensity (relative units: amplitude A1 = 1) at path difference Δ.
   * phase = phase lead of the second source (rad): 0 (in phase) or π (antiphase).
   * Coherent: I = A1² + A2² + 2A1A2 cos δ, δ = 2πΔ/λ − phase. Incoherent: I = A1² + A2² (no stable pattern).
   */
  function intensity(delta, lambda, phase, A1, A2, coherent) {
    if (!coherent) return A1 * A1 + A2 * A2;
    var d = 2 * Math.PI * delta / lambda - (phase || 0);
    return A1 * A1 + A2 * A2 + 2 * A1 * A2 * Math.cos(d);
  }
  /**
   * Exact screen positions where the path difference equals a given Δ (|Δ| < a): the hyperbola r2 − r1 = Δ
   * with foci (0, ±a/2) meets the screen x = D at y = (Δ/2)·√(1 + D² / ((a/2)² − (Δ/2)²)).
   */
  function yForPathDiff(Delta, a, D) {
    var ah = Delta / 2, c = a / 2;
    if (Math.abs(ah) >= c) return NaN;
    return ah * Math.sqrt(1 + D * D / (c * c - ah * ah));
  }
  /**
   * Bright and dark fringes on a screen of half-height ymax (exact geometry).
   * In-phase sources: bright where Δ = nλ, dark where Δ = (n + ½)λ. Antiphase sources: the other way round.
   * Returns {bright:[{n, y, yApprox}], dark:[...], spacing}.
   */
  function fringes(lambda, a, D, phase, ymax) {
    var off = Math.abs(Math.cos(phase || 0) + 1) < 1e-9 ? 0.5 : 0; // antiphase shifts maxima by λ/2
    var out = { bright: [], dark: [], spacing: fringeSpacing(lambda, a, D) };
    var nmax = Math.floor(a / lambda) + 1;
    function add(list, m) {
      var Delta = m * lambda; if (Math.abs(Delta) >= a) return;
      var y = yForPathDiff(Delta, a, D);
      if (isFinite(y) && Math.abs(y) <= ymax) list.push({ n: m, y: y, yApprox: Delta * D / a });
    }
    for (var n = -nmax; n <= nmax; n++) { add(out.bright, n + off); add(out.dark, n + 0.5 - off); }
    out.bright.sort(function (p, q) { return p.y - q.y; }); out.dark.sort(function (p, q) { return p.y - q.y; });
    return out;
  }
  /** instantaneous displacement at (x, y) from two point sources at (0, ±a/2); amplitude decay with distance ignored */
  function twoSourceField(x, y, t, lambda, a, phase, A2, period) {
    var k = 2 * Math.PI / lambda, w = 2 * Math.PI / (period || 1);
    var r1 = Math.hypot(x, y - a / 2), r2 = Math.hypot(x, y + a / 2);
    return Math.cos(k * r1 - w * t) + A2 * Math.cos(k * r2 - w * t + (phase || 0));
  }

  /* ================= 8.2 single gap (QUALITATIVE ONLY) ================= */
  /**
   * Huygens-sum picture of plane waves passing through a gap of width b centred on y = 0 in a barrier at x = 0.
   * Returns the instantaneous displacement for x > 0 (sum of N secondary sources, normalised). Used only to draw
   * the ripple-tank picture; the page never prints numbers from it.
   */
  function gapField(x, y, t, lambda, b, N, period) {
    var k = 2 * Math.PI / lambda, w = 2 * Math.PI / (period || 1), s = 0;
    N = N || 12;
    for (var i = 0; i < N; i++) {
      var yi = N === 1 ? 0 : -b / 2 + b * i / (N - 1);
      var r = Math.hypot(x, y - yi);
      s += Math.cos(k * r - w * t) / Math.sqrt(1 + r / lambda);
    }
    return s / N * 1.6;
  }

  /* ================= 8.4 diffraction grating ================= */
  /** d from N lines per mm */
  function dFromLinesPerMm(N) { return N > 0 ? 1e-3 / N : Infinity; }
  /**
   * d sin θ = nλ. Returns {ratio: d/λ, nmax, count (total bright maxima incl. zero order), orders:[{n, sin, deg}], atNinety}.
   * n_max is the largest integer with nλ/d < 1. If d/λ is an exact integer, that order would be at 90°: not observed.
   */
  function grating(d, lambda) {
    if (!(d > 0) || !(lambda > 0)) return { invalid: 'd and λ must be greater than zero' };
    var ratio = d / lambda, r = Math.round(ratio), isInt = Math.abs(ratio - r) <= 1e-9 * Math.max(1, ratio);
    var nmax = isInt ? r - 1 : Math.floor(ratio);
    var orders = [];
    for (var n = 0; n <= nmax; n++) { var s = n * lambda / d; orders.push({ n: n, sin: s, deg: U.deg(Math.asin(Math.min(1, s))) }); }
    return { d: d, lambda: lambda, ratio: ratio, nmax: nmax, count: 2 * nmax + 1, orders: orders, atNinety: isInt && r >= 1 };
  }
  /** angle (degrees) of order n, or NaN if nλ/d ≥ 1 */
  function gratingAngle(d, lambda, n) { var s = n * lambda / d; return s < 1 ? U.deg(Math.asin(s)) : NaN; }
  /** λ = d sin θ / n */
  function lambdaFromGrating(d, n, thetaDeg) { return n > 0 ? d * Math.sin(U.rad(thetaDeg)) / n : NaN; }
  /** d = nλ / sin θ */
  function dFromGrating(lambda, n, thetaDeg) { var s = Math.sin(U.rad(thetaDeg)); return s > 0 ? n * lambda / s : Infinity; }
  /**
   * White-light spectra (λ 400–700 nm). For each order n ≥ 1 with nλ_violet/d < 1:
   * {n, violet (deg), red (deg or NaN if cut off at 90°), complete, overlapsNext}
   * Order n overlaps order n+1 when n·700 nm > (n+1)·400 nm, i.e. for n ≥ 2 (independent of d) — provided order n+1 exists.
   */
  function whiteLight(d, lmin, lmax) {
    lmin = lmin || VIS[0]; lmax = lmax || VIS[1];
    var out = [];
    for (var n = 1; n <= 50; n++) {
      var sv = n * lmin / d; if (sv >= 1) break;
      var sr = n * lmax / d;
      out.push({ n: n, violet: U.deg(Math.asin(sv)), red: sr < 1 ? U.deg(Math.asin(sr)) : NaN, complete: sr < 1 });
    }
    out.forEach(function (o, i) {
      var next = out[i + 1];
      o.overlapsNext = !!next && (o.complete ? o.red : 90) > next.violet;
    });
    return out;
  }
  /** position on a flat screen a distance D from the grating */
  function screenPos(D, thetaDeg) { return D * Math.tan(U.rad(thetaDeg)); }

  return { C: C, VIS: VIS, stationary: stationary, allowedFrequencies: allowedFrequencies, shapeFn: shapeFn, travellingPair: travellingPair,
    phaseRelation: phaseRelation, lambdaFromNodes: lambdaFromNodes,
    fringeSpacing: fringeSpacing, pathDiff: pathDiff, intensity: intensity, yForPathDiff: yForPathDiff, fringes: fringes, twoSourceField: twoSourceField,
    gapField: gapField, dFromLinesPerMm: dFromLinesPerMm, grating: grating, gratingAngle: gratingAngle, lambdaFromGrating: lambdaFromGrating,
    dFromGrating: dFromGrating, whiteLight: whiteLight, screenPos: screenPos };
});
