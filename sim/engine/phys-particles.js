/* SIM.particles — 9702 topic 11 Particle physics (2025–27 syllabus).
   11.1 nuclear atom, nuclide notation, conservation of nucleon number and charge, α/β⁻/β⁺/γ composition, mass and charge,
   antiparticles, (anti)neutrinos in β decay, discrete α vs continuous β energies, decay equations, unified atomic mass unit;
   11.2 quarks (six flavours, charges), antiquarks, protons/neutrons, baryons (qqq) and mesons (qq̄), quark change in β decay, leptons.
   α-scattering trajectories are in SCALED units (qualitative only). Pure functions, no DOM. */
(function (root, f) {
  var m = f(typeof require === 'function' && typeof module === 'object' ? require('../core/util.js') : root.SIM.util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).particles = m;
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';
  var U_KG = 1.66e-27, E_CHARGE = 1.60e-19; // data sheet values

  var SYMBOLS = ('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr ' +
    'Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg ' +
    'Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og').split(' ');
  function symbol(Z) { return Z >= 1 && Z <= SYMBOLS.length ? SYMBOLS[Z - 1] : (Z === 0 ? 'n' : '?'); }

  /** validity of a nuclide (notation level only — this does not decide whether such a nucleus exists) */
  function checkNuclide(A, Z) {
    if (!(A >= 1) || Math.round(A) !== A || Math.round(Z) !== Z) return 'A and Z must be whole numbers with A ≥ 1';
    if (Z < 0) return 'Z cannot be negative';
    if (Z > A) return 'Z (protons) cannot exceed A (nucleons)';
    if (Z === 0 && A > 1) return 'Z = 0 is only the free neutron (A = 1)';
    if (Z > SYMBOLS.length) return 'Z is beyond the known elements';
    return null;
  }
  /** nuclide summary: N, quark content (p = uud, n = udd), charge, approximate mass */
  function nuclide(A, Z) {
    var err = checkNuclide(A, Z); if (err) return { invalid: err };
    var N = A - Z;
    return { A: A, Z: Z, N: N, sym: symbol(Z), charge: Z * E_CHARGE, massApproxU: A, massApproxKg: A * U_KG,
      up: 2 * Z + N, down: Z + 2 * N };
  }

  /* emitted particles (11.1.7): composition, mass (u, approx) and charge (in e) */
  var RADIATION = {
    alpha: { name: 'α-particle', sym: 'α', A: 4, Z: 2, charge: 2, massU: 4, composition: 'helium nucleus: 2 protons + 2 neutrons', energies: 'discrete' },
    betaMinus: { name: 'β⁻ particle', sym: 'β⁻', A: 0, Z: -1, charge: -1, massU: 9.11e-31 / U_KG, composition: 'electron (fast-moving, from the nucleus)', energies: 'continuous', partner: 'electron antineutrino ν̄' },
    betaPlus: { name: 'β⁺ particle', sym: 'β⁺', A: 0, Z: 1, charge: 1, massU: 9.11e-31 / U_KG, composition: 'positron (antiparticle of the electron: same mass, opposite charge)', energies: 'continuous', partner: 'electron neutrino ν' },
    gamma: { name: 'γ-radiation', sym: 'γ', A: 0, Z: 0, charge: 0, massU: 0, composition: 'electromagnetic radiation (photon), from an excited nucleus', energies: 'discrete' }
  };

  /**
   * Decay of parent (A, Z). type: 'alpha' | 'betaMinus' | 'betaPlus' | 'gamma'.
   * Returns {parent, daughter, products:[{label, A, Z}], conserved:{A, Z}, sums, quark} or {invalid}.
   * Products list everything on the right-hand side, including the (anti)neutrino (A = 0, Z = 0).
   */
  function decay(A, Z, type) {
    var err = checkNuclide(A, Z); if (err) return { invalid: 'Parent: ' + err };
    var R = RADIATION[type]; if (!R) return { invalid: 'Unknown decay type' };
    var dA = A - R.A, dZ = Z - R.Z;
    if (type === 'alpha' && (A < 4 || Z < 2 || A - Z < 2)) return { invalid: 'α-decay needs at least 2 protons and 2 neutrons in the parent' };
    if (type === 'betaMinus' && A - Z < 1) return { invalid: 'β⁻ decay needs a neutron in the parent (N ≥ 1)' };
    if (type === 'betaPlus' && Z < 1) return { invalid: 'β⁺ decay needs a proton in the parent (Z ≥ 1)' };
    var derr = checkNuclide(dA, dZ); if (derr) return { invalid: 'Daughter would be impossible: ' + derr };
    var products = [{ label: symbol(dZ), A: dA, Z: dZ, nucleus: true }, { label: R.sym, A: R.A, Z: R.Z }];
    if (type === 'betaMinus') products.push({ label: 'ν̄', A: 0, Z: 0 });
    if (type === 'betaPlus') products.push({ label: 'ν', A: 0, Z: 0 });
    var sumA = products.reduce(function (s, p) { return s + p.A; }, 0), sumZ = products.reduce(function (s, p) { return s + p.Z; }, 0);
    var quark = null;
    if (type === 'betaMinus') quark = { from: 'udd', to: 'uud', change: 'd → u + e⁻ + ν̄', nucleon: 'neutron → proton + β⁻ + ν̄' };
    if (type === 'betaPlus') quark = { from: 'uud', to: 'udd', change: 'u → d + e⁺ + ν', nucleon: 'proton → neutron + β⁺ + ν' };
    return { parent: { A: A, Z: Z, label: symbol(Z) }, daughter: { A: dA, Z: dZ, label: symbol(dZ) }, radiation: R, products: products,
      sumA: sumA, sumZ: sumZ, conserved: { A: sumA === A, Z: sumZ === Z }, quark: quark };
  }

  /* ================= quarks (11.2) ================= */
  /** charges in units of e, as numerator over 3 */
  var QUARKS = { u: { name: 'up', q3: 2 }, d: { name: 'down', q3: -1 }, s: { name: 'strange', q3: -1 },
    c: { name: 'charm', q3: 2 }, t: { name: 'top', q3: 2 }, b: { name: 'bottom', q3: -1 } };
  /** token: 'u' … 'b' for quarks, 'ubar' … 'bbar' for antiquarks (opposite charge) */
  function quarkCharge3(tok) {
    var anti = /bar$/.test(tok), f = tok.replace(/bar$/, ''), Q = QUARKS[f];
    if (!Q) return NaN;
    return anti ? -Q.q3 : Q.q3;
  }
  /** "+2/3", "−1/3", "+1", "0" … from a charge in thirds of e */
  function fracCharge(q3) {
    if (q3 === 0) return '0';
    var s = q3 > 0 ? '+' : '−', a = Math.abs(q3);
    return s + (a % 3 === 0 ? String(a / 3) : a + '/3');
  }
  /** classify a list of quark tokens (empty entries ignored) */
  function hadron(tokens) {
    var t = tokens.filter(function (x) { return x && x !== 'none'; });
    var nq = t.filter(function (x) { return !/bar$/.test(x); }).length, na = t.length - nq;
    var q3 = t.reduce(function (s, x) { return s + quarkCharge3(x); }, 0);
    var kind;
    if (nq === 3 && na === 0) kind = 'baryon';
    else if (na === 3 && nq === 0) kind = 'antibaryon';
    else if (nq === 1 && na === 1) kind = 'meson';
    else kind = null;
    var named = null, key = t.slice().sort().join(' ');
    if (key === 'd u u') named = 'proton'; else if (key === 'd d u') named = 'neutron';
    else if (key === 'dbar ubar ubar') named = 'antiproton'; else if (key === 'dbar dbar ubar') named = 'antineutron';
    return { tokens: t, nQuarks: nq, nAnti: na, q3: q3, charge: fracCharge(q3), integer: q3 % 3 === 0, kind: kind, hadron: !!kind, named: named };
  }

  /* ================= unified atomic mass unit ================= */
  function uToKg(mu) { return mu * U_KG; }
  function kgToU(kg) { return kg / U_KG; }

  /* ================= α-particle scattering (SCALED UNITS, qualitative) ================= */
  /**
   * Trajectory of an α-particle (mass 1, charge factor K) fired along +x from x0 with impact parameter b and kinetic energy Ek.
   * model 'nucleus': repulsive point charge, a = K r̂ / r².
   * model 'spread' : positive charge spread uniformly through an atom of radius Ra (comparison only): a = K r / Ra³ inside, 0 outside
   *                  (outside, the atom is neutral overall).
   * Adaptive RK4; returns {t:[...], x:[...], y:[...], deflection (deg), rmin}. Stops when it leaves the box |x|,|y| > xmax.
   */
  function alphaTrack(p) {
    var K = p.K === undefined ? 1 : p.K, v0 = Math.sqrt(2 * Math.max(p.Ek, 1e-6)), xmax = p.xmax || 12, Ra = p.Ra || 6;
    var model = p.model || 'nucleus';
    function acc(x, y) {
      var r2 = x * x + y * y, r = Math.sqrt(r2);
      if (r < 1e-9) return [0, 0];
      if (model === 'spread') { if (r >= Ra) return [0, 0]; var s = K / (Ra * Ra * Ra); return [s * x, s * y]; }
      var k = K / (r2 * r); return [k * x, k * y];
    }
    function f(s) { var a = acc(s[0], s[1]); return [s[2], s[3], a[0], a[1]]; }
    var st = [-xmax, p.b, v0, 0], t = 0, T = [0], X = [st[0]], Y = [st[1]], rmin = Infinity;
    for (var i = 0; i < 20000; i++) {
      var r = Math.hypot(st[0], st[1]), v = Math.hypot(st[2], st[3]);
      rmin = Math.min(rmin, r);
      var dt = U.clamp(0.02 * Math.max(r, 0.05) / Math.max(v, 1e-6), 1e-5, 0.25 / Math.max(v, 1e-6));
      var k1 = f(st), s2 = st.map(function (q, j) { return q + dt / 2 * k1[j]; });
      var k2 = f(s2), s3 = st.map(function (q, j) { return q + dt / 2 * k2[j]; });
      var k3 = f(s3), s4 = st.map(function (q, j) { return q + dt * k3[j]; });
      var k4 = f(s4);
      st = st.map(function (q, j) { return q + dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]); });
      t += dt; T.push(t); X.push(st[0]); Y.push(st[1]);
      if ((Math.abs(st[0]) > xmax + 1e-9 || Math.abs(st[1]) > xmax + 1e-9) && i > 2) break;
    }
    var defl = U.deg(Math.atan2(st[3], st[2]));
    return { t: T, x: X, y: Y, deflection: Math.abs(defl), rmin: rmin, tEnd: t };
  }
  /** position on a track at time t (linear interpolation between stored RK4 points) */
  function trackAt(tr, t) {
    var T = tr.t, n = T.length;
    if (t <= 0) return [tr.x[0], tr.y[0]];
    if (t >= T[n - 1]) return [tr.x[n - 1], tr.y[n - 1]];
    var lo = 0, hi = n - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (T[mid] <= t) lo = mid; else hi = mid; }
    var w = (t - T[lo]) / (T[hi] - T[lo]);
    return [tr.x[lo] + w * (tr.x[hi] - tr.x[lo]), tr.y[lo] + w * (tr.y[hi] - tr.y[lo])];
  }
  /** point-nucleus deflection angle (deg) for impact parameter b in the same scaled units: tan(θ/2) = K / (2 Ek b) */
  function deflectionPoint(b, Ek, K) { K = K === undefined ? 1 : K; return U.deg(2 * Math.atan(K / (2 * Ek * Math.abs(b)))); }
  /**
   * Deflection histogram for a beam of half-width B spread over a disc (P(b) ∝ b), deterministic sampling.
   * Returns counts in bins of `binDeg` from 0 to 180°.
   */
  function deflectionHistogram(B, Ek, K, nSample, binDeg) {
    nSample = nSample || 4000; binDeg = binDeg || 10;
    var bins = new Array(Math.ceil(180 / binDeg)).fill(0);
    for (var i = 0; i < nSample; i++) {
      var b = B * Math.sqrt((i + 0.5) / nSample);
      var th = deflectionPoint(b, Ek, K);
      bins[Math.min(bins.length - 1, Math.floor(th / binDeg))]++;
    }
    return bins;
  }

  return { U_KG: U_KG, E_CHARGE: E_CHARGE, SYMBOLS: SYMBOLS, symbol: symbol, checkNuclide: checkNuclide, nuclide: nuclide, RADIATION: RADIATION,
    decay: decay, QUARKS: QUARKS, quarkCharge3: quarkCharge3, fracCharge: fracCharge, hadron: hadron, uToKg: uToKg, kgToU: kgToU,
    alphaTrack: alphaTrack, trackAt: trackAt, deflectionPoint: deflectionPoint, deflectionHistogram: deflectionHistogram };
});
