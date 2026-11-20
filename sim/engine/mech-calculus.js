/* SIM.calc — variable acceleration in a straight line (9709 4.2, PLAN S6). P1-level calculus only:
   terms c·(pt + q)^n, differentiate / integrate (+C), n = −1 under ∫ is BLOCKED (needs ln — beyond 9709 P4).
   Expressions may contain up to two named constants (k, b, c) as coefficients. Integration constants are
   symbols C1, C2, …; everything is linear in these unknowns, so conditions + continuity give a linear system.
   term = { c: number, sym: null | 'k' | 'b' | 'c' | 'C1' …, p, q, n } meaning c·sym·(p t + q)^n. */
(function (root, f) {
  var m = f(typeof require === 'function' && typeof module === 'object' ? require('../core/util.js') : root.SIM.util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).calc = m;
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';
  var NAMED = ['k', 'b', 'c'];
  var LN_MSG = '∫(pt + q)⁻¹ dt needs ln — beyond 9709 P4 (only powers of t are allowed)';

  function isInt(n) { return Math.abs(n - Math.round(n)) < 1e-12; }
  function T(c, sym, p, q, n) { return norm({ c: c, sym: sym || null, p: p, q: q, n: n }); }
  /** normalise: constant terms → p = 1, q = 0, n = 0 */
  function norm(t) {
    if (t.n === 0 || t.p === 0) {
      var val = t.p === 0 ? powSafe(t.q, t.n) : 1;
      return { c: t.c * val, sym: t.sym, p: 1, q: 0, n: 0 };
    }
    return t;
  }
  function powSafe(b, n) {
    if (n === 0) return 1;
    if (isInt(n)) return Math.pow(b, Math.round(n));
    if (b < 0) return NaN;
    if (b === 0) return n > 0 ? 0 : Infinity;
    return Math.pow(b, n);
  }
  function sameKind(a, b) { return a.sym === b.sym && Math.abs(a.p - b.p) < 1e-12 && Math.abs(a.q - b.q) < 1e-12 && Math.abs(a.n - b.n) < 1e-12; }
  /** merge like terms (keeps first-occurrence order) and drop zero coefficients */
  function simplify(terms) {
    var out = [];
    terms.forEach(function (t) {
      t = norm(t);
      for (var i = 0; i < out.length; i++) if (sameKind(out[i], t)) { out[i] = Object.assign({}, out[i], { c: out[i].c + t.c }); return; }
      out.push(Object.assign({}, t));
    });
    return out.filter(function (t) { return Math.abs(t.c) > 1e-13; });
  }
  function diff(terms) {
    return simplify(terms.filter(function (t) { return t.n !== 0; }).map(function (t) { return { c: t.c * t.n * t.p, sym: t.sym, p: t.p, q: t.q, n: t.n - 1 }; }));
  }
  /** antiderivative WITHOUT the constant; throws on n = −1 */
  function integ(terms) {
    return simplify(terms.map(function (t) {
      if (Math.abs(t.n + 1) < 1e-12) { var e = new Error(LN_MSG); e.code = 'ln'; throw e; }
      return { c: t.c / (t.p * (t.n + 1)), sym: t.sym, p: t.p, q: t.q, n: t.n + 1 };
    }));
  }
  function evalTerms(terms, t, vals) {
    var s = 0;
    for (var i = 0; i < terms.length; i++) {
      var x = terms[i], k = x.sym ? (vals && vals[x.sym] !== undefined ? vals[x.sym] : NaN) : 1;
      s += x.c * k * powSafe(x.p * t + x.q, x.n);
    }
    return s;
  }
  /** affine form at t: {k0, co:{sym: coef}} */
  function affineAt(terms, t) {
    var r = { k0: 0, co: {} };
    terms.forEach(function (x) {
      var v = x.c * powSafe(x.p * t + x.q, x.n);
      if (x.sym) r.co[x.sym] = (r.co[x.sym] || 0) + v; else r.k0 += v;
    });
    return r;
  }
  function substitute(terms, vals) {
    return simplify(terms.map(function (x) { return x.sym ? { c: x.c * vals[x.sym], sym: null, p: x.p, q: x.q, n: x.n } : x; }));
  }
  function syms(terms) { var o = []; terms.forEach(function (x) { if (x.sym && o.indexOf(x.sym) < 0) o.push(x.sym); }); return o; }

  /* ---------------- parser ---------------- */
  /** parse "−0.1t^3 + 1.8t^2 − 6t + 5.6", "t − 7t^(1/2) + 12", "9/4 + b/(t+1)^2 − ct^2", "0.2(t−9)^2 + 1.8", "k√t" */
  function parse(str) {
    var s = String(str || '').replace(/[−–—]/g, '-').replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/√/g, 'sqrt')
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4').replace(/½/g, '(1/2)').replace(/\s+/g, '').toLowerCase();
    if (!s) throw new Error('empty expression');
    var i = 0;
    function peek() { return s[i]; }
    function err(m) { throw new Error(m + ' (at "' + s.slice(i, i + 8) + '")'); }
    function number() {
      var m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(s.slice(i));
      if (!m) err('number expected'); i += m[0].length; return parseFloat(m[0]);
    }
    // monomial: {c, sym, base:{p,q}|null, n}
    function mono(c, sym, base, n) { return { c: c, sym: sym || null, base: base || null, n: n || 0 }; }
    function mul(a, b) {
      var r = mono(a.c * b.c, a.sym || b.sym, a.base, a.n);
      if (a.sym && b.sym) err('only one named constant per term');
      if (b.base) {
        if (!a.base) { r.base = b.base; r.n = b.n; }
        else if (Math.abs(a.base.p - b.base.p) < 1e-12 && Math.abs(a.base.q - b.base.q) < 1e-12) r.n = a.n + b.n;
        else err('product of two different brackets — expand it first');
      }
      return r;
    }
    function power(a, e) {
      if (a.sym && e !== 1) err('a named constant cannot be raised to a power');
      if (!a.base) return mono(Math.pow(a.c, e), a.sym, null, 0);
      return mono(Math.pow(a.c, e), a.sym, a.base, a.n * e);
    }
    function exponent() {
      var sign = 1;
      if (peek() === '-') { sign = -1; i++; } else if (peek() === '+') i++;
      if (peek() === '(') {
        i++; var sg = 1; if (peek() === '-') { sg = -1; i++; }
        var a = number(), b = 1;
        if (peek() === '/') { i++; b = number(); }
        if (peek() !== ')') err('")" expected in exponent'); i++;
        return sign * sg * a / b;
      }
      return sign * number();
    }
    function primary() {
      var ch = peek();
      if (ch === undefined) err('unexpected end');
      if (/[\d.]/.test(ch)) return mono(number(), null, null, 0);
      if (s.slice(i, i + 4) === 'sqrt') {
        i += 4; if (peek() !== '(' && peek() !== 't') err('"(" expected after √');
        var inner = peek() === 't' ? (i++, mono(1, null, { p: 1, q: 0 }, 1)) : bracket();
        return power(inner, 0.5);
      }
      if (ch === 't') { i++; return mono(1, null, { p: 1, q: 0 }, 1); }
      if (NAMED.indexOf(ch) >= 0) { i++; return mono(1, ch, null, 0); }
      if (ch === '(') return bracket();
      err('unexpected "' + ch + '"');
    }
    function bracket() {
      i++;
      var terms = expr();
      if (peek() !== ')') err('")" expected'); i++;
      // must be a constant or linear (pt + q) with no named constants
      var p = 0, q = 0;
      for (var j = 0; j < terms.length; j++) {
        var x = terms[j];
        if (x.sym) err('named constants inside brackets are not supported');
        if (!x.base || x.n === 0) { q += x.c; continue; }
        if (Math.abs(x.base.p - 1) < 1e-12 && Math.abs(x.base.q) < 1e-12 && Math.abs(x.n - 1) < 1e-12) { p += x.c; continue; }
        if (Math.abs(x.n - 1) < 1e-12) { p += x.c * x.base.p; q += x.c * x.base.q; continue; }
        err('only brackets of the form (pt + q) are allowed — expand powers first');
      }
      if (Math.abs(p) < 1e-14) return mono(q, null, null, 0);
      return mono(1, null, { p: p, q: q }, 1);
    }
    function factor() {
      var a = primary();
      if (peek() === '^') { i++; a = power(a, exponent()); }
      return a;
    }
    function term() {
      var a = factor();
      for (;;) {
        var ch = peek();
        if (ch === '*') { i++; a = mul(a, factor()); continue; }
        if (ch === '/') {
          i++; var b = factor();
          if (b.sym) err('cannot divide by a named constant');
          if (b.c === 0) err('division by zero');
          a = mul(a, mono(1 / b.c, null, b.base, -b.n)); continue;
        }
        if (ch !== undefined && /[\d.t(]/.test(ch) || (ch !== undefined && NAMED.indexOf(ch) >= 0) || s.slice(i, i + 4) === 'sqrt') { a = mul(a, factor()); continue; }
        return a;
      }
    }
    function expr() {
      var out = [], sign = 1;
      if (peek() === '-') { sign = -1; i++; } else if (peek() === '+') i++;
      for (;;) {
        var m = term(); m.c *= sign; out.push(m);
        if (peek() === '+') { sign = 1; i++; } else if (peek() === '-') { sign = -1; i++; } else break;
      }
      return out;
    }
    var res = expr();
    if (i < s.length) err('unexpected "' + s[i] + '"');
    var terms = res.map(function (m) {
      if (!isFinite(m.c)) throw new Error('coefficient is not finite');
      if (!m.base) return T(m.c, m.sym, 1, 0, 0);
      return T(m.c, m.sym, m.base.p, m.base.q, m.n);
    });
    terms = simplify(terms);
    var named = syms(terms);
    if (named.length > 2) throw new Error('at most two named constants (k, b, c)');
    return terms;
  }

  /* ---------------- formatting ---------------- */
  function frac(x, maxDen) {
    maxDen = maxDen || 1000;
    for (var d = 1; d <= maxDen; d++) { var n = Math.round(x * d); if (Math.abs(n / d - x) < 1e-9 * Math.max(1, Math.abs(x))) return [n, d]; }
    return null;
  }
  function trimNum(x) { return String(Number(x.toPrecision(6))); }
  /** coefficient magnitude as text: integer, short decimal (≤ 4 dp), fraction, else 6 s.f. */
  function fmtMag(a, html) {
    if (isInt(a)) return String(Math.round(a));
    for (var k = 1; k <= 4; k++) { var m = a * Math.pow(10, k); if (Math.abs(m - Math.round(m)) < 1e-7) return String(Number(a.toFixed(k))); }
    var f = frac(a, 1000);
    if (f) return '(' + f[0] + '/' + f[1] + ')';
    return trimNum(a);
  }
  function fmtExp(n, html) {
    var t;
    if (isInt(n)) t = String(Math.round(n));
    else { var f = frac(n, 12); t = f ? f[0] + '/' + f[1] : trimNum(n); }
    t = t.replace('-', html ? '−' : '-');
    return html ? '<sup>' + t + '</sup>' : (isInt(n) && n >= 0 ? '^' + t : '^(' + t + ')');
  }
  function fmtSym(sym, html) {
    if (!sym) return '';
    var m = /^C(\d+)$/.exec(sym);
    if (m) return html ? 'C<sub>' + m[1] + '</sub>' : 'C' + m[1];
    return sym;
  }
  function fmtLinear(p, q, html) {
    var mi = html ? '−' : '-';
    var a = Math.abs(p - 1) < 1e-12 ? 't' : Math.abs(p + 1) < 1e-12 ? mi + 't' : (p < 0 ? mi : '') + fmtMag(Math.abs(p)) + 't';
    if (Math.abs(q) < 1e-14) return a;
    return a + (q < 0 ? ' ' + mi + ' ' : ' + ') + fmtMag(Math.abs(q));
  }
  /** format a term list: html (default) for display, or plain text that parse() accepts */
  function format(terms, opt) {
    opt = opt || {}; var html = opt.html !== false, mi = html ? '−' : '-';
    var v = opt.v || 't';
    if (!terms.length) return '0';
    return terms.map(function (x, idx) {
      var neg = x.c < 0, a = Math.abs(x.c), body = '', isConst = x.n === 0;
      var sym = fmtSym(x.sym, html);
      if (!isConst) {
        if (Math.abs(x.p - 1) < 1e-12 && Math.abs(x.q) < 1e-12) body = v + (Math.abs(x.n - 1) < 1e-12 ? '' : fmtExp(x.n, html));
        else body = '(' + fmtLinear(x.p, x.q, html).replace(/t/g, v) + ')' + (Math.abs(x.n - 1) < 1e-12 ? '' : fmtExp(x.n, html));
      }
      var coef = Math.abs(a - 1) < 1e-12 && (body || sym) ? '' : fmtMag(a, html);
      if (!html && coef && (sym || body)) coef += '*';
      if (!html && sym && body) sym += '*';
      var txt = coef + sym + body;
      if (idx === 0) return (neg ? mi : '') + txt;
      return (neg ? ' ' + mi + ' ' : ' + ') + txt;
    }).join('');
  }

  /* ---------------- model ---------------- */
  /**
   * analyse(model)
   * model = { pieces: [{t0, t1, given:'s'|'v'|'a', expr: string | terms}], conds: [{q:'s'|'v'|'a', t, val}] }
   * Returns { ok, error, pieces:[{t0,t1,given,sym:{s,v,a}, num:{s,v,a}, newC:[]}], unknowns, named, values, equations, needed,
   *           notes[], warnings[], s(t), v(t), a(t), j(t) }
   */
  function analyse(model) {
    var out = { ok: false, error: null, pieces: [], unknowns: [], named: [], values: {}, equations: [], notes: [], warnings: [], needed: 0 };
    var P = model.pieces || [];
    if (!P.length) { out.error = 'no expression'; return out; }
    var cCount = 0;
    try {
      for (var i = 0; i < P.length; i++) {
        var pc = P[i], terms = typeof pc.expr === 'string' ? parse(pc.expr) : simplify(pc.expr);
        if (!(pc.t1 > pc.t0)) throw new Error('interval ' + (i + 1) + ': end time must be greater than start time');
        syms(terms).forEach(function (n) { if (NAMED.indexOf(n) >= 0 && out.named.indexOf(n) < 0) out.named.push(n); });
        var sy = {}, newC = [];
        if (pc.given === 's') { sy.s = terms; sy.v = diff(terms); sy.a = diff(sy.v); }
        else if (pc.given === 'v') {
          sy.v = terms; sy.a = diff(terms);
          var Cs = 'C' + (++cCount); newC.push({ name: Cs, of: 's' });
          sy.s = simplify(integ(terms).concat([T(1, Cs, 1, 0, 0)]));
        } else {
          sy.a = terms;
          var Cv = 'C' + (++cCount); newC.push({ name: Cv, of: 'v' });
          sy.v = simplify(integ(terms).concat([T(1, Cv, 1, 0, 0)]));
          var Cs2 = 'C' + (++cCount); newC.push({ name: Cs2, of: 's' });
          sy.s = simplify(integ(sy.v).concat([T(1, Cs2, 1, 0, 0)]));
        }
        sy.j = diff(sy.a);
        out.pieces.push({ t0: pc.t0, t1: pc.t1, given: pc.given, sym: sy, newC: newC });
      }
    } catch (e) { out.error = e.message; out.lnBlocked = e.code === 'ln'; return out; }
    if (out.named.length > 2) { out.error = 'at most two named constants'; return out; }
    for (var b = 1; b < out.pieces.length; b++) {
      if (Math.abs(out.pieces[b].t0 - out.pieces[b - 1].t1) > 1e-9) { out.error = 'intervals must join up: interval ' + (b + 1) + ' starts at ' + U.sf(out.pieces[b].t0) + ' but interval ' + b + ' ends at ' + U.sf(out.pieces[b - 1].t1); return out; }
    }
    // unknowns
    out.unknowns = out.named.slice();
    out.pieces.forEach(function (pc) { pc.newC.forEach(function (c) { out.unknowns.push(c.name); }); });
    var first = out.pieces[0];
    out.needed = out.named.length + first.newC.length;
    function pieceIndex(t) {
      for (var k = 0; k < out.pieces.length; k++) if (t < out.pieces[k].t1 || k === out.pieces.length - 1) return k;
      return out.pieces.length - 1;
    }
    /** for conditions: the piece whose interval contains t, preferring the LEFT piece at a join */
    function condPiece(t) {
      for (var k = 0; k < out.pieces.length; k++) if (t <= out.pieces[k].t1 + 1e-12) return k;
      return out.pieces.length - 1;
    }
    var rows = [], rhs = [], eqs = [];
    function addEq(aff, target, label, kind) {
      rows.push(out.unknowns.map(function (u) { return aff.co[u] || 0; }));
      rhs.push(target - aff.k0);
      eqs.push({ label: label, aff: aff, target: target, kind: kind });
    }
    var conds = (model.conds || []).slice(0, out.needed);
    if (conds.length < out.needed) { out.error = 'need ' + out.needed + ' condition' + (out.needed > 1 ? 's' : '') + ' to find ' + out.unknowns.slice(0, out.needed).map(function (u) { return fmtSym(u, true); }).join(', '); return out; }
    conds.forEach(function (c) {
      if (!isFinite(c.t) || !isFinite(c.val)) return;
      var k = condPiece(c.t), pc = out.pieces[k];
      if (c.t < out.pieces[0].t0 - 1e-12 || c.t > out.pieces[out.pieces.length - 1].t1 + 1e-12) out.notes.push('condition at t = ' + U.sf(c.t) + ' lies outside the time interval: the formula is extended to it');
      addEq(affineAt(pc.sym[c.q], c.t), c.val, c.q + '(' + U.num(c.t, 6) + ') = ' + (c.val < 0 ? '−' : '') + fmtMag(Math.abs(c.val)), 'cond');
    });
    // continuity at joins
    for (var j2 = 1; j2 < out.pieces.length; j2++) {
      var L = out.pieces[j2 - 1], R = out.pieces[j2], tau = R.t0;
      R.newC.forEach(function (c) {
        var aL = affineAt(L.sym[c.of], tau), aR = affineAt(R.sym[c.of], tau);
        var diffAff = { k0: aR.k0 - aL.k0, co: {} };
        out.unknowns.forEach(function (u) { diffAff.co[u] = (aR.co[u] || 0) - (aL.co[u] || 0); });
        addEq(diffAff, 0, c.of + ' continuous at t = ' + U.num(tau, 6), 'cont');
      });
    }
    out.equations = eqs;
    for (var zr = 0; zr < rows.length; zr++) {
      if (eqs[zr].kind === 'cond' && rows[zr].every(function (x) { return Math.abs(x) < 1e-12; })) {
        out.error = 'the condition ' + eqs[zr].label + ' does not involve any of the unknown constants (' + out.unknowns.map(function (u) { return fmtSym(u, true); }).join(', ') +
          ') — e.g. a condition on v cannot find the constant in s. Choose a different condition.';
        return out;
      }
    }
    var sol = out.unknowns.length ? (rows.length === out.unknowns.length ? U.gauss(rows, rhs) : null) : [];
    if (!sol || sol.some(function (x) { return !isFinite(x); })) {
      out.error = rows.length !== out.unknowns.length ? 'conditions incomplete' : 'these conditions do not determine the constants (the equations are dependent or inconsistent — e.g. two conditions at the same instant on s, or a condition where the expression is not defined)';
      return out;
    }
    out.unknowns.forEach(function (u, k) { out.values[u] = Math.abs(sol[k]) < 1e-12 ? 0 : sol[k]; });
    out.pieces.forEach(function (pc) {
      pc.num = { s: substitute(pc.sym.s, out.values), v: substitute(pc.sym.v, out.values), a: substitute(pc.sym.a, out.values), j: substitute(pc.sym.j, out.values) };
    });
    // domain checks and jumps
    out.pieces.forEach(function (pc, idx) {
      ['s', 'v', 'a'].forEach(function (q) {
        pc.num[q].forEach(function (x) {
          if (x.n === 0) return;
          var b0 = x.p * pc.t0 + x.q, b1 = x.p * pc.t1 + x.q, lo = Math.min(b0, b1), hi = Math.max(b0, b1);
          var where = 'interval ' + (idx + 1) + ' (' + U.num(pc.t0, 4) + ' ≤ t ≤ ' + U.num(pc.t1, 4) + ')';
          var lin = fmtLinear(x.p, x.q, true), nm = (lin === 't' ? 't' : '(' + lin + ')') + fmtExp(x.n, true);
          if (!isInt(x.n) && lo < -1e-12) { if (!out.error) out.error = q + '(t) contains ' + nm + ', which is not defined when ' + fmtLinear(x.p, x.q, true) + ' is negative — not allowed in ' + where; }
          if (x.n < 0) {
            var tz = -x.q / x.p;
            if (lo < -1e-12 && hi > 1e-12) { if (!out.error) out.error = q + '(t) contains ' + nm + ', which is infinite at t = ' + U.sf(tz) + ' inside ' + where; }
            else if (Math.abs(b0) < 1e-12 || Math.abs(b1) < 1e-12) out.notes.push(q + '(t) is not defined at t = ' + U.sf(tz) + ' (' + nm + ')');
          }
        });
      });
      if (idx > 0) {
        var L = out.pieces[idx - 1], tau = pc.t0;
        var sj = evalTerms(pc.num.s, tau) - evalTerms(L.num.s, tau), vj = evalTerms(pc.num.v, tau) - evalTerms(L.num.v, tau);
        var sc = 1 + Math.abs(evalTerms(L.num.s, tau)) + Math.abs(evalTerms(L.num.v, tau));
        if (Math.abs(sj) > 1e-9 * sc) out.warnings.push('displacement jumps by ' + U.sf(sj) + ' m at t = ' + U.sf(tau) + ' (impossible for a real particle)');
        if (Math.abs(vj) > 1e-9 * sc) out.warnings.push('velocity jumps by ' + U.sf(vj) + ' m s⁻¹ at t = ' + U.sf(tau) + ' (a sudden change in velocity)');
      }
    });
    if (out.error) return out;
    out.ok = true;
    function fn(q) {
      return function (t) { var pc = out.pieces[pieceIndex(t)]; return evalTerms(pc.num[q], t); };
    }
    out.pieceIndex = pieceIndex;
    out.s = fn('s'); out.v = fn('v'); out.a = fn('a'); out.j = fn('j');
    return out;
  }

  /** roots of f on [lo, hi]: sign changes (bisection to 1e-12) and touching roots (|f| minima ≈ 0). Each {x, cross}. */
  function roots(f, lo, hi, n) {
    n = n || 4000;
    var h = (hi - lo) / n, xs = [], fs = [], scale = 0, i;
    for (i = 0; i <= n; i++) { var x = lo + h * i; xs.push(x); var y = f(x); fs.push(y); if (isFinite(y)) scale = Math.max(scale, Math.abs(y)); }
    if (scale === 0) return { list: [], zero: fs.every(function (y) { return y === 0; }), scale: 0 };
    var found = [];
    function add(x) {
      if (!isFinite(x)) return;
      if (found.some(function (r) { return Math.abs(r - x) < 1e-7 * Math.max(1, Math.abs(x)); })) return;
      found.push(x);
    }
    for (i = 0; i <= n; i++) {
      if (fs[i] === 0) add(xs[i]);
      if (i < n && isFinite(fs[i]) && isFinite(fs[i + 1]) && fs[i] * fs[i + 1] < 0) add(U.bisect(f, xs[i], xs[i + 1], 1e-13));
    }
    for (i = 1; i < n; i++) {
      var a = Math.abs(fs[i - 1]), b = Math.abs(fs[i]), c = Math.abs(fs[i + 1]);
      if (isFinite(a) && isFinite(b) && isFinite(c) && b <= a && b <= c && b < 1e-3 * scale) {
        var L = xs[i - 1], R = xs[i + 1];
        for (var k = 0; k < 120; k++) { var m1 = L + (R - L) / 3, m2 = R - (R - L) / 3; if (Math.abs(f(m1)) < Math.abs(f(m2))) R = m2; else L = m1; }
        var xm = 0.5 * (L + R);
        if (Math.abs(f(xm)) < 1e-9 * scale) add(xm);
      }
    }
    if (isFinite(fs[0]) && Math.abs(fs[0]) < 1e-9 * scale) add(lo);
    if (isFinite(fs[n]) && Math.abs(fs[n]) < 1e-9 * scale) add(hi);
    found.sort(function (p, q) { return p - q; });
    var d = Math.max(1e-7, 1e-6 * (hi - lo));
    var list = found.map(function (x) {
      var fl = x - d >= lo ? f(x - d) : NaN, fr = x + d <= hi ? f(x + d) : NaN;
      var cross = isFinite(fl) && isFinite(fr) ? (fl * fr < 0) : null;    // null = at an end of the range
      return { x: x, cross: cross };
    });
    return { list: list, zero: false, scale: scale };
  }

  /**
   * interval analysis on [ta, tb] for an analysed model M:
   * rest points (crossing / touching / at an end), distance = Σ|Δs| between direction changes, displacement,
   * max/min v (ends, joins, a = 0), max/min a (ends, joins, da/dt = 0), table of sub-intervals.
   */
  function intervalAnalysis(M, ta, tb) {
    var res = { ok: false };
    if (!M.ok || !(tb > ta)) { res.error = !M.ok ? M.error : 'empty interval'; return res; }
    var joins = [];
    M.pieces.forEach(function (pc, i) { if (i > 0 && pc.t0 > ta + 1e-12 && pc.t0 < tb - 1e-12) joins.push(pc.t0); });
    var bounds = [ta].concat(joins).concat([tb]);
    var rest = [], aRoots = [], jRoots = [], restAll = [];
    for (var i = 0; i + 1 < bounds.length; i++) {
      var lo = bounds[i], hi = bounds[i + 1], pc = M.pieces[M.pieceIndex(0.5 * (lo + hi))];
      var vf = function (t) { return evalTerms(pc.num.v, t); }, af = function (t) { return evalTerms(pc.num.a, t); }, jf = function (t) { return evalTerms(pc.num.j, t); };
      var n = Math.max(400, Math.round(4000 * (hi - lo) / (tb - ta)));
      var rv = roots(vf, lo, hi, n);
      if (rv.zero || (pc.num.v.length === 0)) restAll.push([lo, hi]);
      else rv.list.forEach(function (r) { rest.push({ t: r.x, cross: r.cross, kind: r.cross === true ? 'reverses' : r.cross === false ? 'touch' : 'end' }); });
      // roots of a (and of da/dt) strictly inside each piece; the ends are always candidates anyway
      if (pc.num.a.length) roots(af, lo, hi, n).list.forEach(function (r) { if (r.cross !== null) aRoots.push(r.x); });
      if (pc.num.j.length) roots(jf, lo, hi, n).list.forEach(function (r) { if (r.cross !== null) jRoots.push(r.x); });
    }
    // a velocity sign change across a join (velocity jump) also counts as a reversal
    joins.forEach(function (tj) {
      var vl = M.pieces[M.pieceIndex(tj) - 1] ? evalTerms(M.pieces[M.pieceIndex(tj) - 1].num.v, tj) : NaN, vr = M.v(tj);
      if (isFinite(vl) && isFinite(vr) && vl * vr < 0) rest.push({ t: tj, cross: true, kind: 'jump' });
    });
    // a touching root of v is also a root of a: snap to the (more precise) root of a
    rest.forEach(function (r) {
      if (r.kind !== 'touch') return;
      aRoots.forEach(function (ta2) { if (Math.abs(ta2 - r.t) < 1e-4 * Math.max(1, r.t)) r.t = ta2; });
    });
    rest.sort(function (a, b) { return a.t - b.t; });
    // dedupe rest points at joins
    var rr = [];
    rest.forEach(function (r) { var L = rr[rr.length - 1]; if (L && Math.abs(L.t - r.t) < 1e-7 * Math.max(1, r.t)) { if (r.cross) { L.cross = true; L.kind = r.kind; } } else rr.push(r); });
    // at an internal join a root reported as 'end' of one piece may be a genuine reversal: test across the join
    rr.forEach(function (r) {
      if (r.kind !== 'end' || r.t <= ta + 1e-9 || r.t >= tb - 1e-9) return;
      var d = Math.max(1e-7, 1e-6 * (tb - ta)), fl = M.v(r.t - d), fr = M.v(r.t + d);
      if (isFinite(fl) && isFinite(fr)) { r.cross = fl * fr < 0; r.kind = r.cross ? 'reverses' : 'touch'; }
    });
    res.rest = rr; res.restAll = restAll;
    var cuts = [ta, tb].concat(joins).concat(rr.filter(function (r) { return r.cross === true && r.t > ta + 1e-12 && r.t < tb - 1e-12; }).map(function (r) { return r.t; }));
    cuts.sort(function (a, b) { return a - b; });
    var cc = []; cuts.forEach(function (t) { if (!cc.length || t - cc[cc.length - 1] > 1e-10) cc.push(t); });
    res.table = []; var dist = 0;
    for (var k = 0; k + 1 < cc.length; k++) {
      var t0 = cc[k], t1 = cc[k + 1], s0 = M.s(t0 + (k > 0 ? 0 : 0)), s1 = sLeft(M, t1);
      var ds = s1 - s0, vm = M.v(0.5 * (t0 + t1));
      res.table.push({ t0: t0, t1: t1, s0: s0, s1: s1, ds: ds, dir: vm > 0 ? 1 : vm < 0 ? -1 : 0 });
      dist += Math.abs(ds);
    }
    res.distance = dist;
    res.displacement = sLeft(M, tb) - M.s(ta);
    // max / min v
    var cand = [ta, tb].concat(joins).concat(aRoots), vals = [];
    cand.forEach(function (t) { vals.push({ t: t, v: M.v(t) }); });
    joins.forEach(function (tj) { var pc = M.pieces[M.pieceIndex(tj) - 1]; if (pc) vals.push({ t: tj, v: evalTerms(pc.num.v, tj) }); });
    vals = vals.filter(function (x) { return isFinite(x.v); });
    res.vmax = vals.reduce(function (b, x) { return !b || x.v > b.v ? x : b; }, null);
    res.vmin = vals.reduce(function (b, x) { return !b || x.v < b.v ? x : b; }, null);
    res.speedMax = vals.reduce(function (b, x) { return !b || Math.abs(x.v) > Math.abs(b.v) ? x : b; }, null);
    res.turning = aRoots.map(function (t) { return { t: t, v: M.v(t) }; });
    var acand = [ta, tb].concat(joins).concat(jRoots), avals = [];
    acand.forEach(function (t) { avals.push({ t: t, a: M.a(t) }); });
    joins.forEach(function (tj) { var pc = M.pieces[M.pieceIndex(tj) - 1]; if (pc) avals.push({ t: tj, a: evalTerms(pc.num.a, tj) }); });
    res.aInf = [];
    avals.forEach(function (x) {
      if (isFinite(x.a)) return;
      var d = 1e-6 * (tb - ta), tt = x.t <= ta + 1e-12 ? x.t + d : x.t - d, av = M.a(tt);
      if (!res.aInf.some(function (y) { return Math.abs(y.t - x.t) < 1e-9; })) res.aInf.push({ t: x.t, sign: av > 0 ? 1 : -1 });
    });
    avals = avals.filter(function (x) { return isFinite(x.a); });
    res.amax = res.aInf.some(function (x) { return x.sign > 0; }) ? null : avals.reduce(function (b, x) { return !b || x.a > b.a ? x : b; }, null);
    res.amin = res.aInf.some(function (x) { return x.sign < 0; }) ? null : avals.reduce(function (b, x) { return !b || x.a < b.a ? x : b; }, null);
    res.ok = true;
    return res;
  }
  /** times in [ta, tb] at which quantity q ('s' | 'v' | 'a') equals V */
  function timesWhen(M, q, V, ta, tb) {
    var out = [];
    if (!M.ok || !(tb > ta)) return out;
    var cuts = [ta];
    M.pieces.forEach(function (pc, i) { if (i > 0 && pc.t0 > ta && pc.t0 < tb) cuts.push(pc.t0); });
    cuts.push(tb);
    for (var i = 0; i + 1 < cuts.length; i++) {
      var pc = M.pieces[M.pieceIndex(0.5 * (cuts[i] + cuts[i + 1]))];
      var f = function (t) { return evalTerms(pc.num[q], t) - V; };
      roots(f, cuts[i], cuts[i + 1], Math.max(400, Math.round(4000 * (cuts[i + 1] - cuts[i]) / (tb - ta)))).list.forEach(function (r) {
        if (!out.some(function (x) { return Math.abs(x - r.x) < 1e-7 * Math.max(1, r.x); })) out.push(r.x);
      });
    }
    return out.sort(function (a, b) { return a - b; });
  }
  /** s evaluated with the piece to the LEFT of t (equal to s(t) when s is continuous) */
  function sLeft(M, t) {
    var k = M.pieceIndex(t);
    if (k > 0 && Math.abs(M.pieces[k].t0 - t) < 1e-12) return evalTerms(M.pieces[k - 1].num.s, t);
    return M.s(t);
  }

  return { parse: parse, format: format, fmtMag: fmtMag, fmtSym: fmtSym, diff: diff, integ: integ, evalTerms: evalTerms, simplify: simplify,
    substitute: substitute, affineAt: affineAt, analyse: analyse, roots: roots, intervalAnalysis: intervalAnalysis, timesWhen: timesWhen, LN_MSG: LN_MSG, NAMED: NAMED, term: T };
});
