/* 9702 AS topics 8–11 (2025–27 numbering): superposition, electricity, d.c. circuits, particle physics.
   PLAN section D rows first, then hand-verified extras (working in comments). */
const S = require('../engine/phys-superposition.js');
const C = require('../engine/phys-circuits.js');
const P = require('../engine/phys-particles.js');
const sameArr = (got, exp, rel) => { check(got.length === exp.length, 'length ' + got.length + ' vs ' + exp.length); exp.forEach((e, i) => approx(got[i], e, rel)); };

module.exports = {
  /* ---------------- PLAN section D ---------------- */
  'p8-stationary: string L = 0.8, v = 120 ⇒ f1 = 75': () => approx(S.stationary({ medium: 'string', L: 0.8, v: 120, k: 1 }).f, 75, 1e-9),
  'p8-stationary: closed pipe 0.3 m ⇒ 283.333 then 850': () => {
    approx(S.stationary({ medium: 'closed', L: 0.3, v: 340, k: 1 }).f, 283.333);
    const s2 = S.stationary({ medium: 'closed', L: 0.3, v: 340, k: 2 });
    approx(s2.f, 850, 1e-9); check(s2.harmonic === 3, 'second mode of a closed pipe is the 3rd harmonic');
  },
  'p8-stationary: open pipe 0.3 m ⇒ 566.667': () => approx(S.stationary({ medium: 'open', L: 0.3, v: 340, k: 1 }).f, 566.667),
  'p8-interference: a 0.5 mm, D 2 m, 600 nm ⇒ x = 2.4 mm': () => approx(S.fringeSpacing(600e-9, 0.5e-3, 2), 2.4e-3, 1e-9),
  'p8-grating: 600 /mm, 589 nm ⇒ 20.695°, 44.975°, n_max 2': () => {
    const g = S.grating(S.dFromLinesPerMm(600), 589e-9);
    approx(g.orders[1].deg, 20.695, 1e-4); approx(g.orders[2].deg, 44.975, 1e-4); check(g.nmax === 2 && g.count === 5);
  },
  'p9-current: n 8.5e28, A 1 mm², I 1 A ⇒ v = 7.35294e-5': () => approx(C.driftSpeed(1, 8.5e28, 1e-6), 7.35294e-5),
  'p9-current: ρ 1.7e-8, L 2, d 0.5 mm ⇒ R = 0.173161': () => approx(C.resistivityR(1.7e-8, 2, C.area(0.5e-3)), 0.173161),
  'p10-emf: E 12, r 0.5, R 5.5 ⇒ I 2, V 11, lost 1': () => { const c = C.cell(12, 0.5, 5.5); approx(c.I, 2, 1e-9); approx(c.V, 11, 1e-9); approx(c.lost, 1, 1e-9); },
  'p10-circuits: 12 V + 2 Ω, 6 V + 3 Ω, 6 Ω across ⇒ V 8, I 2, −0.667, 1.333': () => {
    // node equation: (12 − V)/2 + (6 − V)/3 = V/6 ⇒ 8 = V(1/2 + 1/3 + 1/6) = V
    [{ r: 0, R1: 2, r2: 0, R2: 3 }, { r: 2, R1: 0, r2: 3, R2: 0 }].forEach((q) => {
      const net = C.template('twocells', Object.assign({ E: 12, E2: 6, R3: 6, polarity2: 'aid' }, q));
      const s = C.solve(net); check(!s.error, s.error);
      approx(s.V[1], 8, 1e-9); approx(s.I.E1, 2, 1e-9); approx(s.I.E2, -2 / 3, 1e-9); approx(s.I.R3, 4 / 3, 1e-9);
    });
  },
  'p10-divider: 9 V, 1 kΩ / 2 kΩ ⇒ 6 V; 2 kΩ load ⇒ 4.5 V': () => {
    approx(C.divider(9, 1000, 2000).Vout, 6, 1e-9); approx(C.divider(9, 1000, 2000, 2000).Vout, 4.5, 1e-9);
  },
  'p10-divider: potentiometer 1.5 V at 60 cm, 48 cm ⇒ 1.2 V': () => approx(C.compareEmf(1.5, 60, 48), 1.2, 1e-9),
  'p11-nuclear: β⁻ decay udd → uud, A and Z conserved': () => {
    const d = P.decay(14, 6, 'betaMinus');
    check(d.daughter.A === 14 && d.daughter.Z === 7 && d.daughter.label === 'N', 'C-14 → N-14');
    check(d.conserved.A && d.conserved.Z, 'conservation'); check(d.quark.from === 'udd' && d.quark.to === 'uud', 'quarks');
    check(d.products.some((p) => p.label === 'ν̄'), 'antineutrino in β⁻');
  },

  /* ---------------- stationary waves: extras ---------------- */
  'stationary: string k = 2 nodes 0, 0.4, 0.8; antinodes 0.2, 0.6': () => {
    const s = S.stationary({ medium: 'string', L: 0.8, v: 120, k: 2 }); sameArr(s.nodes, [0, 0.4, 0.8]); sameArr(s.antinodes, [0.2, 0.6]); approx(s.spacing, 0.4);
  },
  'stationary: closed k = 2, L 0.3 ⇒ λ 0.4, antinodes 0, 0.2, nodes 0.1, 0.3 (node at closed end)': () => {
    const s = S.stationary({ medium: 'closed', L: 0.3, v: 340, k: 2 }); approx(s.lambda, 0.4); sameArr(s.antinodes, [0, 0.2]); sameArr(s.nodes, [0.1, 0.3]);
  },
  'stationary: open k = 1 ⇒ antinodes at both ends, node in the middle': () => {
    const s = S.stationary({ medium: 'open', L: 0.6, v: 340, k: 1 }); sameArr(s.antinodes, [0, 0.6]); sameArr(s.nodes, [0.3]);
  },
  'stationary: closed-pipe allowed frequencies are odd multiples of v/4L': () => {
    // v/4L = 340/1.2 = 283.33: 283.33, 850, 1416.67
    const f = S.allowedFrequencies('closed', 0.3, 340, 3).map((o) => o.f); sameArr(f, [283.3333, 850, 1416.667]);
  },
  'stationary: 9702/22 O/N 24 Q4 closed pipe 4.5 cm ⇒ 1890 Hz (ms 1900)': () => approx(S.stationary({ medium: 'closed', L: 0.045, v: 340, k: 1 }).f, 1888.889),
  'stationary: 9702/23 O/N 24 Q5 string 0.48 m, 3 loops, 1400 m/s ⇒ λ 0.32, f 4375': () => {
    const s = S.stationary({ medium: 'string', L: 0.48, v: 1400, k: 3 }); approx(s.lambda, 0.32); approx(s.f, 4375);
  },
  'stationary: microwaves λ 3 cm, reflector at 10 cm ⇒ 7 nodes 1.0…10 cm, node spacing 1.5 cm': () => {
    // nodes at 10 − 1.5m ≥ 0 → m = 0..6 → 1, 2.5, …, 10 cm ; antinodes at 10 − 1.5(m + ½) → 0.25 … 9.25 cm
    const s = S.stationary({ medium: 'microwave', L: 0.10, lambda: 0.03, k: 1 });
    sameArr(s.nodes, [0.01, 0.025, 0.04, 0.055, 0.07, 0.085, 0.10]); approx(s.antinodes[0], 0.0025); approx(s.f, 1e10);
    approx(S.lambdaFromNodes(0.075, 5), 0.03);
  },
  'stationary: superposition of the two travelling waves = 2 S(x) cos ωt': () => {
    ['string', 'open', 'closed', 'microwave'].forEach((m) => {
      const tp = S.travellingPair(m, 0.4, 0.3), Sx = S.shapeFn(m, 0.4, 0.3);
      [0.03, 0.11, 0.27].forEach((x) => [0.4, 1.9].forEach((wt) => approx(tp.sum(x, wt), 2 * Sx(x) * Math.cos(wt), 1e-9)));
    });
  },
  'stationary: phase — same loop in phase, adjacent loops antiphase': () => {
    check(S.phaseRelation('string', 0.8, 0.8, 0.1, 0.3).rel === 'in phase');
    check(S.phaseRelation('string', 0.8, 0.8, 0.2, 0.6).rel === 'antiphase');
  },

  /* ---------------- interference: extras ---------------- */
  'interference: 9702/21 M/J 25 Q4 — 9 dark fringes over 3.2 cm, a 0.16 mm, 720 nm ⇒ D = 0.889 m': () => {
    // x = 3.2 cm / 8 = 4.0 mm ; D = ax/λ = 0.16e-3 × 4.0e-3 / 7.2e-7 = 0.88889 m
    const D = 0.16e-3 * 4.0e-3 / 7.2e-7; approx(D, 0.888889); approx(S.fringeSpacing(7.2e-7, 0.16e-3, D), 4.0e-3, 1e-9);
  },
  'interference: exact hyperbola position consistent with path difference': () => {
    // a 0.1, D 0.5, Δ 0.03: y = 0.015 √(1 + 0.25/(0.0025 − 0.000225)) = 0.157956
    const y = S.yForPathDiff(0.03, 0.1, 0.5); approx(y, 0.157956); approx(S.pathDiff(y, 0.1, 0.5), 0.03, 1e-9);
    approx(S.yForPathDiff(600e-9, 0.5e-3, 2), 2.4e-3, 1e-5); // small-angle limit agrees with λD/a
  },
  'interference: intensities — in phase 4, antiphase 0, incoherent 2 at Δ = 0': () => {
    approx(S.intensity(0, 1, 0, 1, 1, true), 4, 1e-12); approx(S.intensity(0, 1, Math.PI, 1, 1, true), 0, 1e-12, 'antiphase'); approx(S.intensity(0.37, 1, 0, 1, 1, false), 2, 1e-12);
    approx(S.intensity(0.5, 1, 0, 1, 0.5, true), 0.25, 1e-12); // (1 − 0.5)² at Δ = λ/2
  },
  'interference: fringes list — antiphase sources put a dark fringe at the centre': () => {
    const fin = S.fringes(600e-9, 0.5e-3, 2, 0, 5e-3), fan = S.fringes(600e-9, 0.5e-3, 2, Math.PI, 5e-3);
    check(fin.bright.some((b) => Math.abs(b.y) < 1e-12), 'central maximum'); check(fan.dark.some((b) => Math.abs(b.y) < 1e-12), 'central minimum');
    approx(fin.bright.find((b) => b.n === 1).y, 2.4e-3, 1e-5);
  },

  /* ---------------- grating: extras ---------------- */
  'grating: 9702/22 M/J 24 Q6 — d 3.8 µm, 520 nm ⇒ n_max 7, 15 bright fringes': () => {
    const g = S.grating(3.8e-6, 520e-9); approx(g.ratio, 7.30769); check(g.nmax === 7 && g.count === 15);
  },
  'grating: 9702/23 M/J 25 Q6 — 2nd orders 52° apart, 720 nm ⇒ 3.04e5 lines per m; 3rd order same angle ⇒ 480 nm': () => {
    // θ2 = 26°, d = 2 × 720e-9 / sin 26° = 3.28489e-6 m, N = 1/d = 3.04424e5 m⁻¹ ; λ' = 2 × 720 / 3 = 480 nm
    const d = S.dFromGrating(720e-9, 2, 26); approx(d, 3.28489e-6); approx(1 / d, 3.04424e5);
    approx(S.lambdaFromGrating(d, 3, 26), 480e-9);
  },
  'grating: 9702/21 O/N 25 Q4 — d 5.0 µm, 540 nm ⇒ 6.20°, 12.47°': () => {
    approx(S.gratingAngle(5e-6, 540e-9, 1), 6.20024); approx(S.gratingAngle(5e-6, 540e-9, 2), 12.4732);
  },
  'grating: d/λ an exact integer ⇒ that order is at 90° and not counted': () => {
    const g = S.grating(1.8e-6, 600e-9); check(g.nmax === 2 && g.atNinety, 'n_max = 2 when d/λ = 3');
  },
  'grating: white light, 300 /mm — 2nd and 3rd orders overlap, 1st and 2nd do not': () => {
    // d = 3.3333 µm: order 1 red asin(0.21) = 12.12°, order 2 violet asin(0.24) = 13.89° (no overlap)
    // order 2 red asin(0.42) = 24.83°, order 3 violet asin(0.36) = 21.10° (overlap)
    const w = S.whiteLight(S.dFromLinesPerMm(300));
    approx(w[0].red, 12.1225); approx(w[1].violet, 13.8865); approx(w[1].red, 24.8346); approx(w[2].violet, 21.1003);
    check(!w[0].overlapsNext && w[1].overlapsNext, 'overlap flags');
  },

  /* ---------------- electricity: extras ---------------- */
  'current: 9702/22 M/J 25 Q6 — 0.030 A for 4.0 min ⇒ 7.2 C; 1 C = 6.25e18 electrons': () => {
    approx(C.charge(0.030, 240), 7.2, 1e-9); approx(C.carriers(1), 6.25e18, 1e-9);
  },
  'current: same I, half the diameter ⇒ 4× drift speed': () => approx(C.driftSpeed(2, 8e28, C.area(0.5e-3)) / C.driftSpeed(2, 8e28, C.area(1e-3)), 4, 1e-9),
  'resistivity: 9702/23 M/J 25 Q7 nichrome 150 cm, 2.45e-7 m², 1.12e-6 Ω m ⇒ 6.86 Ω': () => approx(C.resistivityR(1.12e-6, 1.5, 2.45e-7), 6.857143),
  'I–V models: lamp 12 V ⇒ 2 A (R 6 Ω, cold 1.5 Ω); diode ≈ 5 mA at 0.6 V; NTC and LDR decrease': () => {
    const d = C.IV_DEFAULTS; approx(C.IV.lamp(12, d.lamp), 2, 1e-9); approx(C.IV.lampR(12, d.lamp), 6, 1e-9);
    approx(C.IV.diode(0.6, d.diode), 5e-3, 1e-5); check(Math.abs(C.IV.diode(-1, d.diode)) < 1e-8, 'reverse ≈ 0');
    approx(C.IV.thermistorR(25, d.thermistor), 10000, 1e-9); check(C.IV.thermistorR(60, d.thermistor) < C.IV.thermistorR(20, d.thermistor));
    check(C.IV.ldrR(80, d.ldr) < C.IV.ldrR(5, d.ldr));
  },

  /* ---------------- e.m.f.: extras ---------------- */
  'emf: 9702/21 O/N 24 Q7 — 1.50 V, 0.28 Ω, terminal 1.36 V ⇒ I 0.50 A, R_ext 2.72 Ω': () => {
    // lost volts 0.14 V ⇒ I = 0.14/0.28 = 0.50 A ; R_ext = 1.36/0.50 = 2.72 Ω
    const c = C.cell(1.5, 0.28, 2.72); approx(c.I, 0.5, 1e-9); approx(c.V, 1.36, 1e-9);
  },
  'emf: 9702/21 M/J 24 Q6 — 1.50 V, 10 Ω + 15 Ω, terminal 1.35 V ⇒ r = 2.78 Ω': () => {
    // I = 1.35/25 = 0.054 A ; r = (1.50 − 1.35)/0.054 = 2.7778 Ω
    const r = (1.5 - 1.35) / (1.35 / 25); approx(r, 2.77778); approx(C.cell(1.5, r, 25).V, 1.35, 1e-9);
  },
  'emf: E and r from two readings': () => { const f = C.fromTwoReadings(0.5, 1.36, 1.0, 1.22); approx(f.r, 0.28, 1e-9); approx(f.E, 1.5, 1e-9); },
  'emf: open circuit V = E; ideal short circuit flagged': () => {
    approx(C.cell(9, 2, Infinity).V, 9, 1e-12); check(C.cell(9, 0, 0).invalid, 'short circuit with ideal cell');
  },

  /* ---------------- networks: extras ---------------- */
  'circuits: 9702/22 M/J 25 Q6 — 8.0 V, (210 + 230) ∥ (430 + 240)': () => {
    // I(430+240) = 8/670 = 0.0119403 ; I(210+230) = 8/440 = 0.0181818 ; total 0.0301221 ≈ 0.030 A
    const s = C.solve(C.template('branches', { E: 8, r: 0, R1: 210, R2: 230, R3: 430, R4: 240 }));
    approx(s.I.R3, 8 / 670); approx(s.I.R1, 8 / 440); approx(s.I.E1, 8 / 440 + 8 / 670);
    approx(s.V[2] - s.V[3], 8 * 230 / 440 - 8 * 240 / 670); // p.d. between midpoints
  },
  'circuits: mixed 12 V, r 1, R1 4, R2 6 ∥ R3 3 ⇒ I = 12/7, I2 = 4/7, I3 = 8/7': () => {
    // R_ext = 4 + 2 = 6, I = 12/7 ; V_par = 2 × 12/7 = 24/7 ; I2 = (24/7)/6 = 4/7 ; I3 = (24/7)/3 = 8/7
    const net = C.template('mixed', { E: 12, r: 1, R1: 4, R2: 6, R3: 3 }), s = C.solve(net);
    approx(net.Rext, 6, 1e-12); approx(s.I.E1, 12 / 7, 1e-9); approx(s.I.R2, 4 / 7, 1e-9); approx(s.I.R3, 8 / 7, 1e-9);
  },
  'circuits: parallel 6 V, 2 ∥ 3 ∥ 6 ⇒ R_ext 1 Ω, I 6 A': () => {
    const net = C.template('parallel', { E: 6, r: 0, R1: 2, R2: 3, R3: 6 }), s = C.solve(net); approx(net.Rext, 1, 1e-12); approx(s.I.E1, 6, 1e-9);
  },
  'circuits: series with a 2 kΩ voltmeter across 2 kΩ (9 V, 1 kΩ) reads 4.5 V': () => {
    const s = C.solve(C.template('series', { E: 9, r: 0, R1: 1000, R2: 2000, R3: 0, meter: true, Rv: 2000 }));
    approx(s.V[2] - s.V[3], 4.5, 1e-9);
  },
  'circuits: Kirchhoff junction sums 0 and loop ΣE = ΣIR in every template': () => {
    const base = { E: 9, r: 0.7, R1: 3, R2: 5, R3: 7, R4: 2, E2: 4, r2: 0.4, meter: true, Rv: 40 };
    ['series', 'parallel', 'mixed', 'branches', 'twocells'].forEach((t) => ['aid', 'oppose'].forEach((pol) => {
      const net = C.template(t, Object.assign({ polarity2: pol }, base)), s = C.solve(net), k = C.kirchhoff(net, s, net.loops);
      k.junctions.forEach((j) => approx(j.sum, 0, 1e-9, t + ' junction'));
      check(k.loops.length > 0, 'loops');
      k.loops.forEach((l) => approx(l.sumE - l.sumIR, 0, 1e-9, t + ' ' + l.name));
      if (net.Rext !== null) approx(s.I.E1, 9 / (net.Rext + 0.7), 1e-9, t + ' formula');
    }));
  },
  'circuits: opposing cells — current direction and loop sums': () => {
    // E1 = 9 (r 0) + R1 3 ; E2 = 4 opposing (r 0) + R2 5 ; R3 7. Node T: (9 − V)/3 + (−4 − V)/5 = V/7
    // ⇒ 3 − V/3 − 0.8 − V/5 = V/7 ⇒ 2.2 = V(1/3 + 1/5 + 1/7) = V × 0.676190 ⇒ V = 3.25352
    const s = C.solve(C.template('twocells', { E: 9, r: 0, R1: 3, R2: 5, R3: 7, E2: 4, r2: 0, polarity2: 'oppose' }));
    approx(s.V[1], 3.25352); approx(s.I.R3, 3.25352 / 7);
  },
  'circuits: ideal cell shorted ⇒ error, not NaN': () => {
    const s = C.solve(C.template('series', { E: 6, r: 0, R1: 0, R2: 0, R3: 0 })); check(!!s.error, 'error reported');
  },
  'potentiometer: 9702/23 M/J 25 Q7 — 1.2 V across 150 cm, null at 64 cm ⇒ 0.512 V; galvanometer current 0 at balance': () => {
    const p = { E0: 1.2, r0: 0, Rs: 0, Rw: 6.857, L: 1.5, Ex: 0.512, rx: 0.5, Rg: 50 };
    const at = C.potentiometer(Object.assign({ x: 0.64 }, p)); approx(at.balance, 0.64, 1e-9); approx(at.Ig, 0, 1e-9, 'Ig'); check(at.hasBalance);
    const off = C.potentiometer(Object.assign({ x: 0.5 }, p)); check(Math.abs(off.Ig) > 1e-4, 'current flows away from balance');
    // driver with internal resistance ⇒ smaller wire p.d. ⇒ balance point moves further along (ms: "moves to the right")
    check(C.potentiometer(Object.assign({}, p, { r0: 2 })).balance > 0.64, 'null point moves right');
  },

  /* ---------------- particle physics: extras ---------------- */
  'nuclear: α-decay 238/92 U → 234/90 Th + 4/2 α (syllabus example)': () => {
    const d = P.decay(238, 92, 'alpha'); check(d.daughter.A === 234 && d.daughter.Z === 90 && d.daughter.label === 'Th');
    check(d.sumA === 238 && d.sumZ === 92);
  },
  'nuclear: 9702/21 O/N 24 Q5 — K-40 β⁻ → Ca-40': () => { const d = P.decay(40, 19, 'betaMinus'); check(d.daughter.Z === 20 && d.daughter.label === 'Ca' && d.daughter.A === 40); },
  'nuclear: β⁺ — 18/9 F → 18/8 O + β⁺ + ν; quark u → d': () => {
    const d = P.decay(18, 9, 'betaPlus'); check(d.daughter.label === 'O' && d.daughter.Z === 8); check(d.products.some((p) => p.label === 'ν'));
    check(d.quark.change === 'u → d + e⁺ + ν');
  },
  'nuclear: γ leaves A and Z unchanged': () => { const d = P.decay(60, 28, 'gamma'); check(d.daughter.A === 60 && d.daughter.Z === 28); },
  'nuclear: impossible decays are reported': () => {
    check(P.decay(3, 1, 'alpha').invalid); check(P.decay(1, 1, 'betaMinus').invalid); check(P.decay(1, 0, 'betaPlus').invalid);
    check(P.nuclide(4, 5).invalid); check(P.nuclide(2, 0).invalid);
  },
  'nuclear: quark content of tritium (4 u, 5 d) and of an α-particle (6 u, 6 d)': () => {
    // p = uud, n = udd: up = 2Z + N, down = Z + 2N. ³₁H: N = 2 → 4 up, 5 down. ⁴₂He: 6 up, 6 down.
    const t = P.nuclide(3, 1), a = P.nuclide(4, 2); check(t.up === 4 && t.down === 5); check(a.up === 6 && a.down === 6);
  },
  'nuclear: 1 u = 1.66e-27 kg; α mass 4 u = 6.64e-27 kg; nucleus charge Ze': () => {
    approx(P.uToKg(4), 6.64e-27, 1e-9); approx(P.nuclide(238, 92).charge, 92 * 1.6e-19, 1e-9);
    approx(P.RADIATION.betaMinus.massU, 5.48795e-4); // 9.11e-31 / 1.66e-27
  },
  'nuclear: element symbols': () => { check(P.SYMBOLS.length === 118); ['H', 'He', 'K', 'Ca', 'Cu', 'Sm', 'Au', 'Pb', 'Th', 'U'].forEach((s, i) => check(P.symbol([1, 2, 19, 20, 29, 62, 79, 82, 90, 92][i]) === s, s)); },
  'quarks: proton, neutron, antiproton, meson charges and classes': () => {
    const p = P.hadron(['u', 'u', 'd']); check(p.kind === 'baryon' && p.charge === '+1' && p.named === 'proton');
    check(P.hadron(['u', 'd', 'd']).charge === '0' && P.hadron(['d', 'u', 'd']).named === 'neutron');
    const ap = P.hadron(['ubar', 'ubar', 'dbar']); check(ap.kind === 'antibaryon' && ap.charge === '−1' && ap.named === 'antiproton');
    const m = P.hadron(['u', 'dbar']); check(m.kind === 'meson' && m.charge === '+1');
    check(P.hadron(['s', 'sbar']).charge === '0'); check(!P.hadron(['u', 'u']).hadron, 'qq is not a hadron');
    check(P.hadron(['c', 'none', 'bbar']).charge === '+1');
    check(P.fracCharge(2) === '+2/3' && P.fracCharge(-1) === '−1/3');
  },
  'quarks: 9702/22 M/J 24 Q7 style — meson with charge 0 containing u needs ū, c̄ or t̄': () => {
    ['ubar', 'cbar', 'tbar'].forEach((q) => check(P.hadron(['u', q]).q3 === 0)); check(P.hadron(['u', 'dbar']).q3 !== 0);
  },
  'alpha scattering (scaled): RK4 deflection matches point-charge result; head-on bounces back': () => {
    // b = 1, Ek = 1, K = 1: tan(θ/2) = K/(2 Ek b) = 0.5 ⇒ θ = 53.130°. Long box so the asymptote is reached.
    const tr = P.alphaTrack({ b: 1, Ek: 1, K: 1, xmax: 400 }); approx(tr.deflection, 53.1301, 5e-3);
    approx(P.deflectionPoint(0.5, 1, 1), 90, 1e-9);
    const head = P.alphaTrack({ b: 1e-4, Ek: 1, K: 1, xmax: 30 }); check(head.deflection > 179, 'head-on'); approx(head.rmin, 1 / (1 + 1 / 30), 2e-3); // energy: Ek + K/30 (start at x = −30) = K/r_min
    const spread = P.alphaTrack({ b: 1, Ek: 1, K: 1, model: 'spread', Ra: 6, xmax: 12 }); check(spread.deflection < 3, 'spread-out charge: small deflection');
    const h = P.deflectionHistogram(50, 1, 1, 4000, 10); check(h[0] > 3000 && h[0] > h[17] && h.reduce((s, v) => s + v, 0) === 4000);
  }
};
