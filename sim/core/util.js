/* SIM.util — pure numeric helpers (browser global + node require). */
(function (root, f) {
  var m = f();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).util = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var DEG = Math.PI / 180;

  /** Cambridge-style: n significant figures, no trailing exponent for normal magnitudes. */
  function sf(x, n) {
    n = n || 3;
    if (x === null || x === undefined || Number.isNaN(x)) return '—';
    if (!isFinite(x)) return x > 0 ? '∞' : '−∞';
    if (Math.abs(x) < 1e-12) return '0';
    x = x * (1 + 1e-12);   // round exact halves away from zero (49.05 → 49.1), not down through float error
    var a = Math.abs(x);
    if (a >= 1e6 || a < 1e-3) {
      var e = Math.floor(Math.log10(a));
      var mant = x / Math.pow(10, e);
      var ms = Number(mant.toPrecision(n));
      if (Math.abs(ms) >= 10) { ms /= 10; e += 1; }
      return ms.toPrecision(n).replace('-', '−') + ' × 10<sup>' + String(e).replace('-', '−') + '</sup>';
    }
    var s = Number(x.toPrecision(n));
    // keep significant trailing zeros for numbers < 10^n
    var digits = Math.floor(Math.log10(Math.abs(s) || 1)) + 1;
    var dp = Math.max(0, n - digits);
    return s.toFixed(dp).replace('-', '−');
  }
  /** fixed decimals helper for angles (Cambridge: 1 d.p.) */
  function dp(x, d) { if (!isFinite(x)) return '—'; x = x * (1 + 1e-12); return (Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x).toFixed(d).replace('-', '−'); }
  /** plain number formatting for slider readouts (strip float noise) */
  function num(x, d) { if (!isFinite(x)) return String(x); d = d === undefined ? 6 : d; return String(Number(x.toFixed(d))); }

  function rad(d) { return d * DEG; }
  function deg(r) { return r / DEG; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function sgn(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }
  function approxEq(a, b, rel, abs) {
    rel = rel === undefined ? 1e-9 : rel; abs = abs === undefined ? 1e-12 : abs;
    return Math.abs(a - b) <= Math.max(abs, rel * Math.max(Math.abs(a), Math.abs(b)));
  }
  /** Real roots of a x^2 + b x + c = 0, ascending; numerically stable. Handles a = 0. */
  function quadratic(a, b, c) {
    if (Math.abs(a) < 1e-14) {
      if (Math.abs(b) < 1e-14) return [];
      return [-c / b];
    }
    var D = b * b - 4 * a * c;
    var scale = Math.max(b * b, Math.abs(4 * a * c), 1e-300);
    if (D < 0 && D > -1e-12 * scale) D = 0;
    if (D < 0) return [];
    if (D === 0) return [-b / (2 * a)];
    var q = -0.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(D));
    var r1 = q / a, r2 = c / q;
    return r1 < r2 ? [r1, r2] : [r2, r1];
  }
  /** bisection on [a,b] assuming sign change */
  function bisect(f, a, b, tol) {
    tol = tol || 1e-12;
    var fa = f(a), fb = f(b);
    if (fa === 0) return a; if (fb === 0) return b;
    if (fa * fb > 0) return NaN;
    for (var i = 0; i < 200; i++) {
      var m = 0.5 * (a + b), fm = f(m);
      if (fm === 0 || (b - a) / 2 < tol * Math.max(1, Math.abs(m))) return m;
      if (fa * fm < 0) { b = m; fb = fm; } else { a = m; fa = fm; }
    }
    return 0.5 * (a + b);
  }
  /** all sign-change roots of f in [a,b] using n samples + bisection. Also reports touching roots (double roots). */
  function scanRoots(f, a, b, n, opts) {
    n = n || 4000; opts = opts || {};
    var roots = [], h = (b - a) / n, x0 = a, f0 = f(a);
    var scale = opts.scale || 1;
    for (var i = 1; i <= n; i++) {
      var x1 = a + i * h, f1 = f(x1);
      if (f0 === 0) roots.push({ x: x0, cross: true });
      else if (f0 * f1 < 0) roots.push({ x: bisect(f, x0, x1), cross: true });
      x0 = x1; f0 = f1;
    }
    if (f0 === 0) roots.push({ x: b, cross: true });
    if (opts.touch) {
      // local minima of |f| that approach zero without sign change
      for (var j = 1; j < n; j++) {
        var xa = a + (j - 1) * h, xb = a + j * h, xc = a + (j + 1) * h;
        var ga = Math.abs(f(xa)), gb = Math.abs(f(xb)), gc = Math.abs(f(xc));
        if (gb <= ga && gb <= gc && gb < 1e-3 * scale) {
          // golden refine for min |f|
          var lo = xa, hi = xc;
          for (var k = 0; k < 100; k++) {
            var m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
            if (Math.abs(f(m1)) < Math.abs(f(m2))) hi = m2; else lo = m1;
          }
          var xm = 0.5 * (lo + hi);
          if (Math.abs(f(xm)) < 1e-9 * scale && !roots.some(function (r) { return Math.abs(r.x - xm) < 1e-6 * Math.max(1, Math.abs(xm)); }))
            roots.push({ x: xm, cross: false });
        }
      }
    }
    roots.sort(function (p, q) { return p.x - q.x; });
    // dedupe
    var out = [];
    roots.forEach(function (r) { if (!out.length || Math.abs(out[out.length - 1].x - r.x) > 1e-9 * Math.max(1, Math.abs(r.x))) out.push(r); });
    return out;
  }
  /** classic RK4 step for vector state y (array), f(t,y) -> dy */
  function rk4(f, t, y, dt) {
    var k1 = f(t, y);
    var y2 = y.map(function (v, i) { return v + dt / 2 * k1[i]; });
    var k2 = f(t + dt / 2, y2);
    var y3 = y.map(function (v, i) { return v + dt / 2 * k2[i]; });
    var k3 = f(t + dt / 2, y3);
    var y4 = y.map(function (v, i) { return v + dt * k3[i]; });
    var k4 = f(t + dt, y4);
    return y.map(function (v, i) { return v + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]); });
  }
  /** nice axis ticks */
  function niceTicks(min, max, count) {
    count = count || 6;
    if (!isFinite(min) || !isFinite(max)) return { min: 0, max: 1, step: 0.2, ticks: [0, 0.2, 0.4, 0.6, 0.8, 1] };
    if (max - min < 1e-12) { var d = Math.abs(min) * 0.1 || 1; min -= d; max += d; }
    var raw = (max - min) / count;
    var p = Math.pow(10, Math.floor(Math.log10(raw)));
    var r = raw / p, step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * p;
    var lo = Math.floor(min / step - 1e-9) * step, hi = Math.ceil(max / step + 1e-9) * step;
    var ticks = [];
    for (var v = lo; v <= hi + step * 1e-6; v += step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : Number(v.toPrecision(12)));
    return { min: lo, max: hi, step: step, ticks: ticks };
  }
  /** solve 2x2 linear system [a b; c d][x y] = [e f] */
  function solve2(a, b, c, d, e, f) {
    var det = a * d - b * c;
    if (Math.abs(det) < 1e-12 * Math.max(1, Math.abs(a * d), Math.abs(b * c))) return null;
    return [(e * d - b * f) / det, (a * f - e * c) / det];
  }
  /** Gaussian elimination with partial pivoting: A (n×n), b (n) */
  function gauss(A, b) {
    var n = b.length, M = A.map(function (r, i) { return r.slice().concat([b[i]]); });
    for (var c = 0; c < n; c++) {
      var p = c;
      for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-14) return null;
      var tmp = M[c]; M[c] = M[p]; M[p] = tmp;
      for (var r2 = 0; r2 < n; r2++) if (r2 !== c) {
        var k = M[r2][c] / M[c][c];
        for (var j = c; j <= n; j++) M[r2][j] -= k * M[c][j];
      }
    }
    return M.map(function (row, i) { return row[n] / M[i][i]; });
  }

  return { DEG: DEG, sf: sf, dp: dp, num: num, rad: rad, deg: deg, clamp: clamp, sgn: sgn, approxEq: approxEq,
    quadratic: quadratic, bisect: bisect, scanRoots: scanRoots, rk4: rk4, niceTicks: niceTicks, solve2: solve2, gauss: gauss };
});
