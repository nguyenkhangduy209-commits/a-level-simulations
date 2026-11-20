/* SIM.statics — 9702 topic 4: turning effects (4.1), equilibrium (4.2), density and pressure (4.3).
   Beam model: a straight rigid beam along the x-axis from x = 0 to x = L (metres). Every force acts at a
   point ON the beam line (y = 0), so the moment of a force about a point O on the line is
       M = (x − x_O) · F sin(ang)        (anticlockwise positive)
   where ang is the direction of the force measured anticlockwise from the +x direction (−90° = straight down).
   The perpendicular distance from O to the line of action is |x − x_O| · |sin ang|.
   Pressure model: a cuboid object with vertical sides (top/bottom face area A, height H, V = A·H) in a fluid. */
(function (root, f) {
  var m = f(typeof require === 'function' && typeof module === 'object' ? require('../core/util.js') : root.SIM.util);
  if (typeof module === 'object' && module.exports) module.exports = m;
  else (root.SIM = root.SIM || {}).statics = m;
})(typeof self !== 'undefined' ? self : this, function (U) {
  'use strict';
  var TOL = 1e-9;

  /* ---------------- moments ---------------- */
  /** components of a force of magnitude F at direction ang (degrees anticlockwise from +x) */
  function comps(F, ang) {
    var a = U.rad(ang), fx = F * Math.cos(a), fy = F * Math.sin(a);
    if (Math.abs(fx) < 1e-12 * Math.max(1, Math.abs(F))) fx = 0;
    if (Math.abs(fy) < 1e-12 * Math.max(1, Math.abs(F))) fy = 0;
    return { x: fx, y: fy };
  }
  /** moment (N m, anticlockwise +) about x_O of a force {x, F, ang} acting on the beam line */
  function momentAbout(f, xO) { return (f.x - xO) * comps(f.F, f.ang).y; }
  /** perpendicular distance from O (on the beam line) to the line of action of f */
  function perpDist(f, xO) { return Math.abs(f.x - xO) * Math.abs(Math.sin(U.rad(f.ang))); }

  /** applied forces + the weight of the beam (acting at its centre of gravity x_G) */
  function appliedForces(m) {
    var list = [];
    (m.loads || []).forEach(function (ld, i) {
      if (ld.on === false) return;
      list.push({ x: ld.x, F: ld.F, ang: m.mode === 'supports' ? -90 : ld.ang, kind: 'load', i: i, name: ld.name || ('F' + (i + 1)) });
    });
    if (m.W > 0) list.push({ x: m.xG, F: m.W, ang: -90, kind: 'weight', name: 'W' });
    return list;
  }
  function sumF(list) {
    var s = { x: 0, y: 0 };
    list.forEach(function (f) { var c = comps(f.F, f.ang); s.x += c.x; s.y += c.y; });
    return s;
  }
  function sumM(list, xO) { var s = 0; list.forEach(function (f) { s += momentAbout(f, xO); }); return s; }

  /**
   * Solve a beam.  m = {L, W, xG, loads:[{x,F,ang,on}], mode:'pin'|'supports', xP, xA, xB}
   *  'pin'      : one frictionless pivot / hinge at x_P that can push in any direction.
   *               Equilibrium needs zero resultant moment about x_P. Reaction = −ΣF (valid when balanced).
   *  'supports' : two supports at x_A, x_B that can only PUSH UP (R ≥ 0). Loads are vertical.
   * Returns { forces, reactions:[{x,F,ang,name}], all, Mnet, balanced, ... }.
   */
  function solveBeam(m) {
    var forces = appliedForces(m), out = { forces: forces, mode: m.mode };
    var S = sumF(forces);
    out.sumApplied = S;
    var scale = 1; forces.forEach(function (f) { scale = Math.max(scale, Math.abs(f.F) * Math.max(1, m.L || 1)); });
    out.scale = scale;
    if (m.mode === 'supports') {
      var span = m.xB - m.xA;
      if (Math.abs(span) < 1e-9) { out.invalid = 'The two supports are at the same point: their reactions cannot be found by moments'; out.reactions = []; out.all = forces; return out; }
      // moments about A:  R_B (x_B − x_A) + Σ(x_i − x_A)F_iy = 0
      var MA = sumM(forces, m.xA);
      var RB = -MA / span, RA = -S.y - RB;
      out.RA = RA; out.RB = RB; out.MA = MA;
      out.reactions = [{ x: m.xA, F: Math.abs(RA), ang: RA >= 0 ? 90 : -90, name: 'R_A', kind: 'reaction', signed: RA },
        { x: m.xB, F: Math.abs(RB), ang: RB >= 0 ? 90 : -90, name: 'R_B', kind: 'reaction', signed: RB }];
      out.all = forces.concat(out.reactions);
      var tol = 1e-9 * scale;
      if (RA < -tol) out.tips = 'B'; else if (RB < -tol) out.tips = 'A'; else out.tips = null;
      out.limiting = !out.tips && (Math.abs(RA) <= tol || Math.abs(RB) <= tol) && forces.length > 0;
      out.balanced = !out.tips;
      return out;
    }
    // pin
    var M = sumM(forces, m.xP);
    out.Mnet = M;
    out.balanced = Math.abs(M) <= 1e-9 * scale;
    var R = { x: -S.x, y: -S.y };
    out.R = R; out.Rmag = Math.hypot(R.x, R.y); out.Rang = out.Rmag > 1e-12 ? U.deg(Math.atan2(R.y, R.x)) : 0;
    out.reactions = out.Rmag > 1e-12 ? [{ x: m.xP, F: out.Rmag, ang: out.Rang, name: 'R', kind: 'reaction' }] : [];
    out.all = forces.concat(out.reactions);
    return out;
  }

  /**
   * Find the value of one parameter that makes a target quantity zero. Every target used here
   * (Mnet about the pin, R_A, R_B) is an affine function of any single parameter (F_i, x_i, W, x_G),
   * so two evaluations give the exact answer; the result is re-checked.
   * key: 'F1'|'F2'|'F3'|'x1'|'x2'|'x3'|'W'|'xG'; target: 'M' | 'RA' | 'RB'.
   * Returns {value} or {value: NaN, why}.
   */
  function solveUnknown(m, key, target) {
    function withVal(v) {
      var c = JSON.parse(JSON.stringify(m));
      var mm = /^([Fx])(\d)$/.exec(key);
      if (mm) c.loads[Number(mm[2]) - 1][mm[1] === 'F' ? 'F' : 'x'] = v; else c[key] = v;
      return c;
    }
    function q(v) {
      var c = withVal(v), r;
      // allow a temporarily negative W in the affine evaluation (appliedForces skips W ≤ 0)
      if (key === 'W') { var forces = appliedForces(Object.assign({}, c, { W: 0 })); forces.push({ x: c.xG, F: v, ang: -90 }); r = evalTarget(c, forces); }
      else r = evalTarget(c, appliedForces(c));
      return r;
    }
    function evalTarget(c, forces) {
      if (target === 'M') return sumM(forces, c.xP);
      var span = c.xB - c.xA; if (Math.abs(span) < 1e-9) return NaN;
      var RB = -sumM(forces, c.xA) / span;
      if (target === 'RB') return RB;
      return -sumF(forces).y - RB;
    }
    var q0 = q(0), q1 = q(1), slope = q1 - q0;
    if (!isFinite(q0) || !isFinite(q1)) return { value: NaN, why: 'supports coincide' };
    if (Math.abs(slope) < 1e-12 * Math.max(1, Math.abs(q0))) return { value: NaN, why: 'changing this quantity does not change the moment (it acts through the point, or its line of action passes through the point)' };
    var v = -q0 / slope;
    var chk = q(v);
    if (Math.abs(chk) > 1e-7 * Math.max(1, Math.abs(q0), Math.abs(q1))) return { value: NaN, why: 'no solution' };
    return { value: v };
  }

  /** couple: two equal, opposite, parallel forces F at the ends of a bar of length d, each at angle θ to the bar */
  function couple(F, d, thetaDeg) {
    var dPerp = d * Math.abs(Math.sin(U.rad(thetaDeg)));
    // forces: at x = 0 direction (θ + 180°), at x = d direction θ  → anticlockwise torque F d sin θ
    var f1 = { x: 0, F: F, ang: thetaDeg + 180 }, f2 = { x: d, F: F, ang: thetaDeg };
    return { dPerp: dPerp, torque: F * dPerp, signedTorque: F * d * Math.sin(U.rad(thetaDeg)), forces: [f1, f2],
      momentAbout: function (xO) { return momentAbout(f1, xO) + momentAbout(f2, xO); }, resultant: sumF([f1, f2]) };
  }

  /* ---------------- density and pressure ---------------- */
  function density(mass, V) { return V > 0 ? mass / V : NaN; }
  function pressure(F, A) { return A > 0 ? F / A : NaN; }
  /** hydrostatic pressure difference Δp = ρ g Δh */
  function hydro(rho, g, dh) { return rho * g * dh; }

  /**
   * Cuboid object in a fluid. p = {rhoF, rhoO, V, H, d, g, p0, mode}
   *  mode 'held': the object hangs from a string / spring balance with its TOP face at depth d
   *               (d < 0 means the top is above the surface: partly submerged).
   *  mode 'free': released; floats (ρ_O < ρ_F), is neutrally buoyant (=) or rests on the floor (>) of a liquid of
   *               depth p.D (if D < H the object is only partly covered).
   *  mode 'released': as 'held' but with no support (instant of release): resultant = U − W.
   * Pressures are absolute when p0 is included (p0 = 0 gives gauge pressures).
   */
  function submerged(p) {
    var A = p.V / p.H, W = p.rhoO * p.V * p.g, out = { A: A, W: W, mass: p.rhoO * p.V };
    var d = p.d, sub;
    if (p.mode === 'free') {
      if (p.rhoO < p.rhoF) { sub = p.H * p.rhoO / p.rhoF; d = sub - p.H; out.state = 'floats'; }
      else if (p.rhoO === p.rhoF) { sub = p.H; out.state = 'neutral'; d = Math.max(0, p.d); }
      else {                                                   // rests on the floor of liquid depth D (top at D − H)
        var Dl = p.D === undefined ? Infinity : p.D;
        if (Dl === Infinity) { d = Math.max(0, p.d); sub = p.H; } else { d = Dl - p.H; sub = Math.min(p.H, Math.max(0, Dl)); }
        out.state = 'sinks';
      }
      out.fraction = sub / p.H;
    } else {
      sub = U.clamp(d + p.H, 0, p.H);
      out.state = sub <= 0 ? 'out' : sub < p.H ? 'partial' : 'full';
      out.fraction = sub / p.H;
    }
    out.d = d; out.sub = sub;
    out.depthTop = Math.max(0, d); out.depthBottom = d + p.H;
    out.pTop = p.p0 + (d > 0 ? hydro(p.rhoF, p.g, d) : 0);     // top face in air ⇒ atmospheric only
    out.pBottom = p.p0 + hydro(p.rhoF, p.g, Math.max(0, d + p.H));
    out.FTop = out.pTop * A; out.FBottom = out.pBottom * A;
    out.U = (out.pBottom - out.pTop) * A;                      // net upward force from pressure on the two faces
    out.Uarch = p.rhoF * p.g * A * sub;                         // ρ g V_submerged (Archimedes) — must equal U
    out.Vsub = A * sub;
    out.apparent = W - out.U;                                   // spring-balance reading (held) / bottom reaction (sinks)
    return out;
  }

  return { comps: comps, momentAbout: momentAbout, perpDist: perpDist, appliedForces: appliedForces, sumF: sumF, sumM: sumM,
    solveBeam: solveBeam, solveUnknown: solveUnknown, couple: couple, density: density, pressure: pressure, hydro: hydro, submerged: submerged };
});
