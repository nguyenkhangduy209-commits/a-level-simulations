/* ============================================================================
   SIM.SOLVER — Past-Paper Archive Matcher, Screenshot OCR, Analytical Physics
   Engine & Gemini Vision AI Integration (9709 Mechanics & 9702 Physics)
   ============================================================================ */
(function (root) {
  'use strict';

  var GEMINI_KEY_STORAGE = 'alevel-gemini-api-key';

  function getCB() {
    if (root.SIM && root.SIM.cbuild) return root.SIM.cbuild;
    if (typeof require === 'function') {
      try { return require('../engine/phys-circuit-builder.js'); } catch (e) { /* ignore */ }
    }
    return null;
  }

  function getBank() {
    if (Array.isArray(root.P4_BANK) && root.P4_BANK.length) return root.P4_BANK;
    if (typeof require === 'function') {
      try {
        var b = require('../data/p4-ms.js');
        if (Array.isArray(b)) return b;
      } catch (e) { /* ignore */ }
    }
    return [];
  }

  var SIM_CATALOG = {
    moments: {
      id: 'moments', title: 'Moments, Beams & Couples', syllabus: '9702 4.1',
      path: 'sims/9702/p4-moments.html?course=9702&embed=1',
      params: [
        { key: 'mode', label: 'Situation' }, { key: 'L', label: 'Beam length L', unit: 'm' },
        { key: 'W', label: 'Beam weight W', unit: 'N' }, { key: 'xG', label: 'Centre of gravity xG', unit: 'm' },
        { key: 'xP', label: 'Pivot / hinge xP', unit: 'm' },
        { key: 'F1', label: 'Force F₁', unit: 'N' }, { key: 'x1', label: 'Position x₁', unit: 'm' }, { key: 'a1', label: 'Angle θ₁', unit: '°' },
        { key: 'F2', label: 'Force F₂', unit: 'N' }, { key: 'x2', label: 'Position x₂', unit: 'm' }, { key: 'a2', label: 'Angle θ₂', unit: '°' },
        { key: 'F3', label: 'Force F₃', unit: 'N' }, { key: 'x3', label: 'Position x₃', unit: 'm' }, { key: 'a3', label: 'Angle θ₃', unit: '°' }
      ],
      keywords: /\b(moment|torque|beam|plank|rod|metre\s*rule|pivot|fulcrum|hinge|support|clockwise|anticlockwise|see-?saw|couple|centre\s+of\s+gravity|uniform)\b/i
    },
    forces: {
      id: 'forces', title: 'Coplanar Forces at a Point', syllabus: '9709 4.1',
      path: 'sims/9709/m1-resultant.html?course=9709&embed=1',
      params: [
        { key: 'n', label: 'Forces n' },
        { key: 'F0', label: 'Force F₁', unit: 'N' }, { key: 'th0', label: 'Angle θ₁', unit: '°' },
        { key: 'F1', label: 'Force F₂', unit: 'N' }, { key: 'th1', label: 'Angle θ₂', unit: '°' },
        { key: 'F2', label: 'Force F₃', unit: 'N' }, { key: 'th2', label: 'Angle θ₃', unit: '°' }
      ],
      keywords: /\b(coplanar|resultant|resolving|equilibrium|polygon\s+of\s+forces|point\s+o|components|anticlockwise\s+from)\b/i
    },
    strings: {
      id: 'strings', title: 'Strings & Rings in Equilibrium', syllabus: '9709 4.1',
      path: 'sims/9709/m1-strings.html?course=9709&embed=1',
      params: [
        { key: 'm', label: 'Hanging mass m', unit: 'kg' },
        { key: 'a1', label: 'Left string angle α', unit: '°' },
        { key: 'a2', label: 'Right string angle β', unit: '°' }
      ],
      keywords: /\b(strings?|ring\s+of\s+mass|smooth\s+ring|suspended|ceiling|two\s+strings|threaded)\b/i
    },
    plane: {
      id: 'plane', title: 'Particle on an Inclined Plane', syllabus: '9709 4.1 / 4.4',
      path: 'sims/9709/m1m4-plane.html?course=9709&embed=1',
      params: [
        { key: 'm', label: 'Particle mass m', unit: 'kg' },
        { key: 'theta', label: 'Slope angle θ', unit: '°' },
        { key: 'mu', label: 'Friction coeff μ' },
        { key: 'P', label: 'Applied force P', unit: 'N' },
        { key: 'phi', label: 'Pull angle φ', unit: '°' }
      ],
      keywords: /\b(inclined\s+plane|slope|incline|rough|friction|coefficient|normal\s+reaction|greatest\s+slope|point\s+of\s+moving)\b/i
    },
    pulley: {
      id: 'pulley', title: 'Connected Particles & Pulleys', syllabus: '9709 4.4',
      path: 'sims/9709/m4-connected.html?course=9709&embed=1',
      params: [
        { key: 'm1', label: 'Mass A m₁', unit: 'kg' },
        { key: 'm2', label: 'Mass B m₂', unit: 'kg' },
        { key: 'th1', label: 'Slope A angle θ₁', unit: '°' },
        { key: 'mu1', label: 'Friction μ₁' }
      ],
      keywords: /\b(pulley|connected\s+particle|inextensible\s+string|over\s+a\s+smooth|particles\s+a\s+and\s+b|passes\s+over)\b/i
    },
    lift: {
      id: 'lift', title: 'Lift / Elevator Dynamics', syllabus: '9709 4.4',
      path: 'sims/9709/m4-lift.html?course=9709&embed=1',
      params: [
        { key: 'M', label: 'Lift mass M', unit: 'kg' },
        { key: 'm', label: 'Load mass m', unit: 'kg' },
        { key: 'a', label: 'Acceleration a', unit: 'm/s²' }
      ],
      keywords: /\b(lift|elevator|cable\s+tension|floor\s+of\s+the\s+lift)\b/i
    },
    vehicle: {
      id: 'vehicle', title: 'Vehicles, Towing & Power P = Fv', syllabus: '9709 4.5',
      path: 'sims/9709/m4-vehicle.html?course=9709&embed=1',
      params: [
        { key: 'm1', label: 'Vehicle mass m₁', unit: 'kg' },
        { key: 'm2', label: 'Trailer mass m₂', unit: 'kg' },
        { key: 'R1', label: 'Resistance R₁', unit: 'N' },
        { key: 'P', label: 'Engine power P', unit: 'W' },
        { key: 'v', label: 'Speed v', unit: 'm/s' }
      ],
      keywords: /\b(car|lorry|van|truck|train|cyclist|trailer|caravan|tow-?bar|driving\s+force|tractive|constant\s+power|power\s+of|kw|mw)\b/i
    },
    energy: {
      id: 'energy', title: 'Work, Energy & Resistance', syllabus: '9709 4.5 / 9702 5',
      path: 'sims/9709/m5-energy.html?course=9709&embed=1',
      params: [
        { key: 'm', label: 'Mass m', unit: 'kg' },
        { key: 'u', label: 'Initial speed u', unit: 'm/s' },
        { key: 'h', label: 'Height change h', unit: 'm' },
        { key: 'theta', label: 'Angle θ', unit: '°' },
        { key: 'F', label: 'Resistance F', unit: 'N' }
      ],
      keywords: /\b(work\s+done|kinetic\s+energy|potential\s+energy|energy\s+method|gain\s+in\s+ke|loss\s+in\s+pe|work-?energy)\b/i
    },
    journey: {
      id: 'journey', title: 'Kinematics, SUVAT & v–t Journeys', syllabus: '9709 4.2',
      path: 'sims/9709/m2-journey.html?course=9709&embed=1',
      params: [
        { key: 'u0', label: 'Initial velocity u', unit: 'm/s' }
      ],
      keywords: /\b(velocity-?time|speed-?time|v-?t\s+graph|decelerat|constant\s+acceleration|suvat|travels\s+in\s+a\s+straight\s+line|comes\s+to\s+rest)\b/i
    },
    vertical: {
      id: 'vertical', title: 'Vertical Motion Under Gravity', syllabus: '9709 4.2',
      path: 'sims/9709/m2-vertical.html?course=9709&embed=1',
      params: [
        { key: 'uA', label: 'Initial speed u', unit: 'm/s' },
        { key: 'hA', label: 'Initial height h', unit: 'm' }
      ],
      keywords: /\b(vertically|projected\s+upwards?|dropped\s+from\s+rest|above\s+ground|greatest\s+height)\b/i
    },
    calculus: {
      id: 'calculus', title: 'Variable Acceleration (Calculus)', syllabus: '9709 4.2',
      path: 'sims/9709/m2-calculus.html?course=9709&embed=1',
      params: [
        { key: 't', label: 'Time t', unit: 's' }
      ],
      keywords: /\b(differentiat|integrat|instantaneous|at\s+time\s+t|t\^2|t2|t3|given\s+by\s+v\s*=|given\s+by\s+a\s*=|given\s+by\s+s\s*=)\b/i
    },
    collisions: {
      id: 'collisions', title: 'Momentum & Collisions', syllabus: '9709 4.3 / 9702 3',
      path: 'sims/9709/m3-collisions.html?course=9709&embed=1',
      params: [
        { key: 'mA', label: 'Mass A m₁', unit: 'kg' },
        { key: 'uA', label: 'Speed A u₁', unit: 'm/s' },
        { key: 'mB', label: 'Mass B m₂', unit: 'kg' },
        { key: 'uB', label: 'Speed B u₂', unit: 'm/s' }
      ],
      keywords: /\b(momentum|collision|coalesce|impulse|restitution|collide|rebound|combine\s+to\s+form)\b/i
    },
    projectile: {
      id: 'projectile', title: 'Projectiles (2D Motion)', syllabus: '9702 Topic 2',
      path: 'sims/9702/p2-projectile.html?course=9702&embed=1',
      params: [
        { key: 'u', label: 'Launch speed u', unit: 'm/s' },
        { key: 'theta', label: 'Projection angle θ', unit: '°' },
        { key: 'h0', label: 'Initial height h₀', unit: 'm' }
      ],
      keywords: /\b(projectile|projected\s+(?:at|with)|trajectory|horizontal\s+range|angle\s+of\s+projection|parabola)\b/i
    },
    circuitBuilder: {
      id: 'circuitBuilder', title: 'Tinkercad Circuit Builder & Kirchhoff Workbench', syllabus: '9702 Topic 10',
      path: 'sims/9702/p10-builder.html?course=9702&embed=1',
      params: [
        { key: 'E', label: 'Supply e.m.f. E', unit: 'V' },
        { key: 'r', label: 'Internal resistance r', unit: 'Ω' },
        { key: 'R1', label: 'Resistor R₁', unit: 'Ω' },
        { key: 'R2', label: 'Resistor R₂', unit: 'Ω' },
        { key: 'R3', label: 'Resistor R₃', unit: 'Ω' }
      ],
      keywords: /\b(circuit|resistor|resistance|ohm|e\.?m\.?f\.?|kirchhoff|ammeter|voltmeter|series|parallel|battery|cell|switch|lamp|diode)\b/i
    },
    circuits: {
      id: 'circuits', title: 'Kirchhoff & Resistor Networks', syllabus: '9702 10.2',
      path: 'sims/9702/p10-circuits.html?course=9702&embed=1',
      params: [
        { key: 'E', label: 'e.m.f. E', unit: 'V' },
        { key: 'r', label: 'Internal r', unit: 'Ω' },
        { key: 'R1', label: 'R₁', unit: 'Ω' },
        { key: 'R2', label: 'R₂', unit: 'Ω' },
        { key: 'R3', label: 'R₃', unit: 'Ω' }
      ],
      keywords: /\b(kirchhoff|junction|closed\s+loop|sum\s+of\s+e\.?m\.?f)\b/i
    },
    divider: {
      id: 'divider', title: 'Potential Divider & Sensors', syllabus: '9702 10.3',
      path: 'sims/9702/p10-divider.html?course=9702&embed=1',
      params: [
        { key: 'Vin', label: 'Input V_in', unit: 'V' },
        { key: 'R1', label: 'Top resistor R₁', unit: 'Ω' },
        { key: 'R2', label: 'Bottom resistor R₂', unit: 'Ω' }
      ],
      keywords: /\b(potential\s+divider|potentiometer|thermistor|ldr|light-?dependent|null\s+method|sliding\s+contact)\b/i
    },
    emf: {
      id: 'emf', title: 'E.M.F. & Internal Resistance', syllabus: '9702 10.1',
      path: 'sims/9702/p10-emf.html?course=9702&embed=1',
      params: [
        { key: 'E', label: 'Cell e.m.f. E', unit: 'V' },
        { key: 'r', label: 'Internal resistance r', unit: 'Ω' },
        { key: 'R', label: 'Load resistance R', unit: 'Ω' }
      ],
      keywords: /\b(internal\s+resistance|terminal\s+potential|terminal\s+p\.?d\.?|lost\s+volts)\b/i
    },
    current: {
      id: 'current', title: 'Current, Drift Velocity & Resistivity', syllabus: '9702 9.1',
      path: 'sims/9702/p9-current.html?course=9702&embed=1',
      params: [
        { key: 'I', label: 'Current I', unit: 'A' },
        { key: 'L', label: 'Wire length L', unit: 'm' },
        { key: 'rho', label: 'Resistivity ρ', unit: 'Ω m' }
      ],
      keywords: /\b(resistivity|drift\s+velocity|number\s+density|charge\s+carriers|cross-?sectional\s+area)\b/i
    },
    iv: {
      id: 'iv', title: 'I–V Characteristics', syllabus: '9702 9.3',
      path: 'sims/9702/p9-iv.html?course=9702&embed=1',
      params: [
        { key: 'V', label: 'Voltage V', unit: 'V' },
        { key: 'R', label: 'Resistance R', unit: 'Ω' }
      ],
      keywords: /\b(i–v|i-v\s+characteristic|filament\s+lamp|ohmic|semiconductor\s+diode)\b/i
    },
    deformation: {
      id: 'deformation', title: 'Deformation, Stress & Young Modulus', syllabus: '9702 Topic 6',
      path: 'sims/9702/p6-deformation.html?course=9702&embed=1',
      params: [
        { key: 'F', label: 'Tensile force F', unit: 'N' },
        { key: 'L', label: 'Original length L', unit: 'm' },
        { key: 'x', label: 'Extension x', unit: 'm' },
        { key: 'E', label: 'Young modulus E', unit: 'Pa' }
      ],
      keywords: /\b(young\s+modulus|tensile\s+stress|tensile\s+strain|hooke|spring\s+constant|elastic\s+potential|extension)\b/i
    },
    pressure: {
      id: 'pressure', title: 'Density, Pressure & Upthrust', syllabus: '9702 4.3',
      path: 'sims/9702/p4-pressure.html?course=9702&embed=1',
      params: [
        { key: 'rhoF', label: 'Fluid density ρ', unit: 'kg/m³' },
        { key: 'V', label: 'Submerged volume V', unit: 'm³' },
        { key: 'h', label: 'Depth h', unit: 'm' }
      ],
      keywords: /\b(upthrust|archimedes|hydrostatic|fluid\s+pressure|submerged)\b/i
    },
    waves: {
      id: 'waves', title: 'Progressive Waves & Superposition', syllabus: '9702 Topic 7',
      path: 'sims/9702/p7-waves.html?course=9702&embed=1',
      params: [
        { key: 'f', label: 'Frequency f', unit: 'Hz' },
        { key: 'lam', label: 'Wavelength λ', unit: 'm' },
        { key: 'A', label: 'Amplitude A', unit: 'm' }
      ],
      keywords: /\b(progressive\s+wave|wavelength|frequency|amplitude|phase\s+difference|period|hertz|crest|trough|wave\s+speed)\b/i
    },
    doppler: {
      id: 'doppler', title: 'Doppler Effect', syllabus: '9702 7.4',
      path: 'sims/9702/p7-doppler.html?course=9702&embed=1',
      params: [
        { key: 'fs', label: 'Source freq f_s', unit: 'Hz' },
        { key: 'v', label: 'Wave speed v', unit: 'm/s' },
        { key: 'vs', label: 'Source speed v_s', unit: 'm/s' }
      ],
      keywords: /\b(doppler|observed\s+frequency|approaching|receding|ambulance|siren|redshift)\b/i
    },
    interference: {
      id: 'interference', title: 'Double-Slit & Two-Source Interference', syllabus: '9702 8.2',
      path: 'sims/9702/p8-interference.html?course=9702&embed=1',
      params: [],
      keywords: /\b(double-?slit|two-?source|fringe\s+separation|interference|path\s+difference|coherent)\b/i
    },
    grating: {
      id: 'grating', title: 'Diffraction Grating', syllabus: '9702 8.3',
      path: 'sims/9702/p8-grating.html?course=9702&embed=1',
      params: [
        { key: 'N', label: 'Lines/mm N' },
        { key: 'lam', label: 'Wavelength λ', unit: 'm' },
        { key: 'n', label: 'Order n' }
      ],
      keywords: /\b(diffraction\s+grating|lines\s+per\s+mm|first-?order|second-?order|maxima)\b/i
    },
    stationary: {
      id: 'stationary', title: 'Stationary Waves', syllabus: '9702 8.1',
      path: 'sims/9702/p8-stationary.html?course=9702&embed=1',
      params: [
        { key: 'L', label: 'Length L', unit: 'm' }
      ],
      keywords: /\b(stationary\s+wave|standing\s+wave|antinode|harmonic|air\s+column|stretched\s+string)\b/i
    },
    cro: {
      id: 'cro', title: 'CRO Time-Base & Y-Gain', syllabus: '9702 7.1',
      path: 'sims/9702/p7-cro.html?course=9702&embed=1',
      params: [
        { key: 'f', label: 'Frequency f', unit: 'Hz' },
        { key: 'V0', label: 'Peak V₀', unit: 'V' },
        { key: 'tb', label: 'Time-base', unit: 'ms/div' },
        { key: 'yg', label: 'Y-gain', unit: 'V/div' }
      ],
      keywords: /\b(cathode-?ray\s+oscilloscope|c\.?r\.?o\.?|time-?base|y-?gain|divisions)\b/i
    },
    em: {
      id: 'em', title: 'EM Spectrum & Polarisation (Malus)', syllabus: '9702 7.5',
      path: 'sims/9702/p7-em-polarisation.html?course=9702&embed=1',
      params: [],
      keywords: /\b(polaris|polaroid|malus|electromagnetic\s+spectrum)\b/i
    },
    uncertainty: {
      id: 'uncertainty', title: 'Physical Quantities & Uncertainties', syllabus: '9702 Topic 1',
      path: 'sims/9702/p1-uncertainty.html?course=9702&embed=1',
      params: [],
      keywords: /\b(percentage\s+uncertainty|absolute\s+uncertainty|base\s+units?|homogeneous|vector\s+quantity|scalar\s+quantity)\b/i
    },
    nuclear: {
      id: 'nuclear', title: 'Nuclear & Particle Physics', syllabus: '9702 Topic 11',
      path: 'sims/9702/p11-nuclear.html?course=9702&embed=1',
      params: [
        { key: 'A', label: 'Nucleon number A' },
        { key: 'Z', label: 'Proton number Z' }
      ],
      keywords: /\b(nucleon|proton\s+number|alpha|beta|gamma|decay|half-?life|binding\s+energy|mass\s+defect|quark|lepton|hadron)\b/i
    }
  };

  var SIM_FILE_MAP = {
    'm1-resultant': SIM_CATALOG.forces,
    'm1-strings': SIM_CATALOG.strings,
    'm1m4-plane': SIM_CATALOG.plane,
    'm2-calculus': SIM_CATALOG.calculus,
    'm2-journey': SIM_CATALOG.journey,
    'm2-vertical': SIM_CATALOG.vertical,
    'm3-collisions': SIM_CATALOG.collisions,
    'm4-connected': SIM_CATALOG.pulley,
    'm4-lift': SIM_CATALOG.lift,
    'm4-vehicle': SIM_CATALOG.vehicle,
    'm5-energy': SIM_CATALOG.energy,
    'p1-uncertainty': SIM_CATALOG.uncertainty,
    'p2-projectile': SIM_CATALOG.projectile,
    'p3-momentum': SIM_CATALOG.collisions,
    'p4-moments': SIM_CATALOG.moments,
    'p4-pressure': SIM_CATALOG.pressure,
    'p5-energy': SIM_CATALOG.energy,
    'p6-deformation': SIM_CATALOG.deformation,
    'p7-waves': SIM_CATALOG.waves,
    'p7-doppler': SIM_CATALOG.doppler,
    'p7-cro': SIM_CATALOG.cro,
    'p7-em-polarisation': SIM_CATALOG.em,
    'p8-interference': SIM_CATALOG.interference,
    'p8-grating': SIM_CATALOG.grating,
    'p8-stationary': SIM_CATALOG.stationary,
    'p9-current': SIM_CATALOG.current,
    'p9-iv': SIM_CATALOG.iv,
    'p10-builder': SIM_CATALOG.circuitBuilder,
    'p10-circuits': SIM_CATALOG.circuits,
    'p10-divider': SIM_CATALOG.divider,
    'p10-emf': SIM_CATALOG.emf,
    'p11-nuclear': SIM_CATALOG.nuclear
  };

  function getApiKey() {
    try { return localStorage.getItem(GEMINI_KEY_STORAGE) || ''; } catch (e) { return ''; }
  }
  function setApiKey(k) {
    try { if (k && k.trim()) localStorage.setItem(GEMINI_KEY_STORAGE, k.trim()); else localStorage.removeItem(GEMINI_KEY_STORAGE); } catch (e) { /* ignore */ }
  }

  function toSI(val, unitRaw) {
    var u = String(unitRaw || '').toLowerCase().trim();
    if (u === 'cm') return { v: val * 0.01, u: 'm' };
    if (u === 'mm') return { v: val * 0.001, u: 'm' };
    if (u === 'nm') return { v: val * 1e-9, u: 'm' };
    if (u === 'km') return { v: val * 1000, u: 'm' };
    if (u === 'km/h') return { v: val / 3.6, u: 'm/s' };
    if (u === 'kn') return { v: val * 1000, u: 'N' };
    if (u === 'g') return { v: val * 0.001, u: 'kg' };
    if (u === 't' || u === 'tonne' || u === 'tonnes') return { v: val * 1000, u: 'kg' };
    if (u === 'kw') return { v: val * 1000, u: 'W' };
    if (u === 'mw') return { v: val * 1e6, u: 'W' };
    if (u === 'khz') return { v: val * 1000, u: 'Hz' };
    if (u === 'mhz') return { v: val * 1e6, u: 'Hz' };
    if (u === 'kω' || u === 'kohm') return { v: val * 1000, u: 'Ω' };
    if (u === 'mω' || u === 'mohm') return { v: val * 1e6, u: 'Ω' };
    if (u === 'ma') return { v: val * 0.001, u: 'A' };
    if (u === 'mv') return { v: val * 0.001, u: 'V' };
    return { v: val, u: unitRaw };
  }

  function sf3(x) {
    if (!isFinite(x)) return String(x);
    if (Math.abs(x) < 1e-9) return '0';
    return Number(x.toPrecision(3)).toString();
  }

  /* ---------- Folder Past-Paper Archive Search & Fuzzy Reference Matching ---------- */
  function tokenize(str) {
    return String(str || '').toLowerCase().replace(/[^a-z0-9.]+/g, ' ').trim().split(/\s+/).filter(function (w) {
      return w.length >= 2 && !/^(the|and|for|with|that|from|find|show|that|calculate|determine|state|what|when|which|into|over|under|each|are|is|of|to|in|on|at|an|by)$/.test(w);
    });
  }

  function searchBank(opts) {
    opts = opts || {};
    var bank = getBank();
    var syl = opts.syllabus || 'all';
    var cat = opts.category || 'all';
    var q = String(opts.query || '').trim().toLowerCase();
    var terms = q ? q.split(/\s+/).filter(Boolean) : [];
    var lim = opts.limit || 60;

    var res = [];
    for (var i = 0; i < bank.length; i++) {
      var item = bank[i];
      if (syl === '9709' && item.s !== '9709') continue;
      if (syl === '9702-p2' && !(item.s === '9702' && item.p === 'P2')) continue;
      if (syl === '9702-p4' && !(item.s === '9702' && item.p === 'P4')) continue;
      if (syl === '9702' && item.s !== '9702') continue;

      if (cat === 'circuits' && !/p10|p9/.test(item.sim || '') && !/9702-10|9702-9|9702-19/.test(item.tp || '')) continue;
      if (cat === 'forces' && !/m1-resultant|m1-strings|p4-moments|p4-pressure/.test(item.sim || '') && item.tp !== '9709-M1') continue;
      if (cat === 'dynamics' && !/m4-|m1m4-/.test(item.sim || '') && item.tp !== '9709-M4') continue;
      if (cat === 'kinematics' && !/m2-|m3-|m5-|p2-|p3-|p5-/.test(item.sim || '') && !/9709-M2|9709-M3|9709-M5/.test(item.tp || '')) continue;
      if (cat === 'waves' && !/p7-|p8-|p11-|p6-/.test(item.sim || '') && !/9702-7|9702-8|9702-22|9702-23/.test(item.tp || '')) continue;

      if (terms.length) {
        var hay = (item.r + ' ' + item.t + ' ' + (item.qt || '') + ' ' + (item.ms || '')).toLowerCase();
        var ok = true;
        for (var j = 0; j < terms.length; j++) {
          if (hay.indexOf(terms[j]) < 0) { ok = false; break; }
        }
        if (!ok) continue;
      }
      res.push(item);
      if (res.length >= lim) break;
    }
    return res;
  }

  function matchPastPapers(queryText, opts) {
    opts = opts || {};
    var bank = getBank();
    var raw = String(queryText || '').trim();
    if (!bank.length || !raw) return { bestMatch: null, references: [] };

    // 1. Exact paper reference check (e.g. "9709/41 M/J 26 Q1", "9702/22 M/J 26 Q3", "9709/42 F/M 18 Q4")
    var mRef = /(\d{4})[\/_](\d{2})\s+(F\/M|M\/J|O\/N)\s+(\d{2})\s+Q?(\d+)/i.exec(raw);
    if (mRef) {
      var targetRef = (mRef[1] + '/' + mRef[2] + ' ' + mRef[3].toUpperCase() + ' ' + mRef[4] + ' Q' + mRef[5]);
      var found = bank.find(function (x) { return x.r.toUpperCase() === targetRef; });
      if (found) {
        var simsSame = bank.filter(function (x) {
          return x !== found && ((found.qt && x.qt === found.qt) || (found.sim && x.sim === found.sim));
        }).slice(0, opts.limit || 4);
        return { bestMatch: found, bestScore: 1, exactRef: true, references: simsSame };
      }
    }

    var qTokens = tokenize(raw);
    var qNums = (raw.match(/\d+(?:\.\d+)?/g) || []).slice(0, 10);
    var qSet = {};
    qTokens.forEach(function (t) { qSet[t] = 1; });

    var scored = [];
    for (var i = 0; i < bank.length; i++) {
      var item = bank[i], txt = (item.t || '').toLowerCase();
      var hits = 0;
      for (var k = 0; k < qTokens.length; k++) {
        if (txt.indexOf(qTokens[k]) >= 0) hits += 1;
      }
      if (!hits) continue;
      var numHits = 0;
      for (var n = 0; n < qNums.length; n++) {
        if (txt.indexOf(qNums[n]) >= 0) numHits += 1;
      }
      var score = (hits / Math.max(4, Math.min(qTokens.length, 14))) * 0.72 + (qNums.length ? (numHits / Math.max(2, qNums.length)) * 0.28 : 0);
      if (item.ms) score += 0.05;
      scored.push({ item: item, score: score, hits: hits });
    }
    scored.sort(function (a, b) { return b.score - a.score; });

    var best = scored.length && (scored[0].score >= 0.62 || scored[0].hits >= 6) ? scored[0].item : null;
    var refs = scored.slice(best ? 1 : 0, (best ? 1 : 0) + (opts.limit || 4)).map(function (s) { return s.item; });
    return { bestMatch: best, bestScore: scored.length ? scored[0].score : 0, exactRef: false, references: refs };
  }

  /* ---------- Past-paper diagram SVG->PNG sample builder ---------- */
  function makeSampleSvg(kind) {
    var svg = '';
    if (kind === 'circuit') {
      svg = '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="240" viewBox="0 0 560 240">' +
        '<rect width="560" height="240" fill="#0d151c"/>' +
        '<text x="20" y="28" fill="#fbbf24" font-family="sans-serif" font-size="13" font-weight="bold">9702 AS Circuit: Mixed Series–Parallel Network</text>' +
        '<rect x="90" y="65" width="380" height="125" fill="none" stroke="#64748b" stroke-width="3"/>' +
        '<line x1="300" y1="65" x2="300" y2="190" stroke="#64748b" stroke-width="3"/>' +
        '<rect x="70" y="110" width="40" height="34" rx="5" fill="#1e293b" stroke="#fbbf24" stroke-width="2"/>' +
        '<text x="90" y="132" fill="#fbbf24" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">12V</text>' +
        '<rect x="170" y="53" width="60" height="24" rx="4" fill="#e7d2ad" stroke="#78350f" stroke-width="2"/>' +
        '<text x="200" y="70" fill="#1e293b" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">4.0 Ω</text>' +
        '<rect x="275" y="110" width="50" height="34" rx="4" fill="#e7d2ad" stroke="#78350f" stroke-width="2"/>' +
        '<text x="300" y="132" fill="#1e293b" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">6.0 Ω</text>' +
        '<rect x="445" y="110" width="50" height="34" rx="4" fill="#facc15" stroke="#ca8a04" stroke-width="2"/>' +
        '<text x="470" y="132" fill="#0f172a" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">X = 3Ω</text>' +
        '<text x="280" y="218" fill="#cbd5e1" font-family="sans-serif" font-size="13" text-anchor="middle">12 V battery, r = 0 Ω · Find total resistance, main current &amp; branch currents</text></svg>';
    } else if (kind === 'seesaw') {
      svg = '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="240" viewBox="0 0 560 240">' +
        '<rect width="560" height="240" fill="#0d151c"/>' +
        '<text x="20" y="28" fill="#fbbf24" font-family="sans-serif" font-size="13" font-weight="bold">9702 Moments: Balanced Plank with Unknown Force X</text>' +
        '<rect x="70" y="102" width="420" height="14" rx="4" fill="#334155" stroke="#94a3b8" stroke-width="2"/>' +
        '<polygon points="280,116 264,148 296,148" fill="#64748b" stroke="#e2e8f0" stroke-width="2"/>' +
        '<text x="280" y="166" fill="#cbd5e1" font-family="sans-serif" font-size="12" text-anchor="middle">Pivot (x = 2.0 m)</text>' +
        '<line x1="122" y1="116" x2="122" y2="188" stroke="#4ade80" stroke-width="3"/><polygon points="122,194 116,182 128,182" fill="#4ade80"/>' +
        '<text x="122" y="214" fill="#4ade80" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">300 N at 0.50 m</text>' +
        '<line x1="385" y1="116" x2="385" y2="188" stroke="#fbbf24" stroke-width="3" stroke-dasharray="5,4"/><polygon points="385,194 379,182 391,182" fill="#fbbf24"/>' +
        '<text x="385" y="214" fill="#fbbf24" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">X = ? at 3.0 m</text></svg>';
    } else if (kind === 'pulley') {
      svg = '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="240" viewBox="0 0 560 240">' +
        '<rect width="560" height="240" fill="#0d151c"/>' +
        '<text x="20" y="28" fill="#38bdf8" font-family="sans-serif" font-size="13" font-weight="bold">9709/42 F/M 18 Q1 — Vertical Pulley System</text>' +
        '<circle cx="280" cy="65" r="22" fill="#334155" stroke="#e2e8f0" stroke-width="3"/>' +
        '<line x1="258" y1="65" x2="258" y2="165" stroke="#fbbf24" stroke-width="3"/>' +
        '<line x1="302" y1="65" x2="302" y2="140" stroke="#fbbf24" stroke-width="3"/>' +
        '<rect x="236" y="165" width="44" height="36" rx="4" fill="#2563eb" stroke="#93c5fd" stroke-width="2"/>' +
        '<text x="258" y="188" fill="#fff" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">A 0.8kg</text>' +
        '<rect x="280" y="140" width="44" height="36" rx="4" fill="#16a34a" stroke="#86efac" stroke-width="2"/>' +
        '<text x="302" y="163" fill="#fff" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">B 0.2kg</text></svg>';
    } else {
      svg = '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="240" viewBox="0 0 560 240">' +
        '<rect width="560" height="240" fill="#0d151c"/>' +
        '<text x="20" y="28" fill="#34d399" font-family="sans-serif" font-size="13" font-weight="bold">9709/42 F/M 18 Q4 — Equilibrium on Rough Inclined Plane</text>' +
        '<polygon points="80,200 440,200 440,80" fill="#1e293b" stroke="#64748b" stroke-width="2"/>' +
        '<rect x="250" y="114" width="44" height="32" rx="4" transform="rotate(-18.4 272 130)" fill="#f59e0b" stroke="#fef3c7" stroke-width="2"/>' +
        '<text x="280" y="224" fill="#cbd5e1" font-family="sans-serif" font-size="13" text-anchor="middle">m = 12 kg, θ = 25°, μ = 0.8 · Horizontal force P = X?</text></svg>';
    }
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function getSamples() {
    return [
      {
        id: 'circuit', label: 'DC Circuit + Tinkercad Builder', badge: '9702 Circuits',
        text: 'A 12 V battery with negligible internal resistance is connected in series with a 4.0 Ω resistor, followed by a parallel combination of 6.0 Ω and 3.0 Ω resistors. Find the total resistance, main current, and branch currents.',
        askX: 'Resistance X (R₃)',
        img: makeSampleSvg('circuit')
      },
      {
        id: 'pulley', label: '9709/42 F/M 18 Q1 Pulley', badge: '9709 Past Paper',
        text: '9709/42 F/M 18 Q1 Two particles A and B, of masses 0.8 kg and 0.2 kg respectively, are connected by a light inextensible string that passes over a fixed smooth pulley. The particles hang vertically. The system is released from rest. Show that the acceleration of A has magnitude 6 m s^-2 and find the tension in the string.',
        askX: 'Tension & Acceleration',
        img: makeSampleSvg('pulley')
      },
      {
        id: 'plane', label: '9709/42 F/M 18 Q4 Inclined Plane', badge: '9709 Past Paper',
        text: '9709/42 F/M 18 Q4 A particle of mass 12 kg is on a rough plane inclined at an angle of 25° to the horizontal. A force of magnitude P N acts on the particle. This force is horizontal and the particle is on the point of moving up a line of greatest slope of the plane. The coefficient of friction between the particle and the plane is 0.8. Find the value of P.',
        askX: 'Horizontal Force P',
        img: makeSampleSvg('plane')
      },
      {
        id: 'seesaw', label: '9702 Moments See-Saw (Find Force X)', badge: '9702 Moments',
        text: 'A light uniform plank of length 4.0 m is pivoted at its midpoint x = 2.0 m. A downward force of 300 N acts at 0.50 m from the left end. Another downward force X acts at 3.0 m from the left end so the beam balances. Calculate X.',
        askX: 'Force F₁ = X',
        img: makeSampleSvg('seesaw')
      }
    ];
  }

  /* ---------- Client-side OCR helper ---------- */
  function ocrImage(imgDataUrl, onProgress) {
    return new Promise(function (resolve, reject) {
      if (!imgDataUrl || typeof document === 'undefined') { reject(new Error('No image')); return; }
      function runTess() {
        if (!root.Tesseract || !root.Tesseract.recognize) { reject(new Error('OCR unavailable')); return; }
        if (onProgress) onProgress('Reading image text via built-in OCR…');
        root.Tesseract.recognize(imgDataUrl, 'eng', {
          logger: function (m) {
            if (onProgress && m && m.status) {
              var pct = m.progress ? ' (' + Math.round(m.progress * 100) + '%)' : '';
              onProgress('OCR: ' + m.status + pct);
            }
          }
        }).then(function (res) {
          resolve(res && res.data && res.data.text ? res.data.text.trim() : '');
        }).catch(reject);
      }
      if (root.Tesseract) { runTess(); return; }
      if (onProgress) onProgress('Loading client-side OCR module…');
      var sc = document.createElement('script');
      sc.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      sc.onload = runTess;
      sc.onerror = function () { reject(new Error('Could not load OCR script cleanly offline')); };
      document.head.appendChild(sc);
    });
  }

  /* ---------- Classification & Individual Analytical Physics Solvers ---------- */
  function classifySim(text, preferredSim) {
    if (preferredSim && SIM_FILE_MAP[preferredSim]) return SIM_FILE_MAP[preferredSim];
    var s = String(text || ''), best = 'forces', bestScore = 0;
    Object.keys(SIM_CATALOG).forEach(function (k) {
      var cat = SIM_CATALOG[k], score = 0;
      var matches = s.match(new RegExp(cat.keywords.source, 'gi'));
      if (matches) score += matches.length * 3;
      if (k === 'circuitBuilder' && /\b(resistor|circuit|ohm|parallel|series|battery|e\.?m\.?f|kirchhoff)\b/i.test(s) && !/potential\s+divider|thermistor|ldr/i.test(s)) score += 6;
      if (k === 'divider' && /\b(potential\s+divider|potentiometer|thermistor|ldr)\b/i.test(s)) score += 9;
      if (k === 'emf' && /\b(internal\s+resistance|lost\s+volts|terminal\s+p\.?d)\b/i.test(s) && !/parallel|two\s+cells/i.test(s)) score += 7;
      if (k === 'moments' && /\b(pivot|hinge|beam|plank|clockwise|moment|torque)\b/i.test(s)) score += 6;
      if (k === 'pulley' && /\b(pulley|passes\s+over|connected\s+particle)\b/i.test(s)) score += 8;
      if (k === 'plane' && /\b(inclined\s+plane|slope|incline|coefficient\s+of\s+friction)\b/i.test(s) && !/pulley/i.test(s)) score += 7;
      if (k === 'vehicle' && /\b(car|lorry|van|train|cyclist|trailer|caravan)\b/i.test(s) && /\b(power|kw|resistance|driving\s+force)\b/i.test(s)) score += 7;
      if (k === 'projectile' && /\b(range|projected\s+at|trajectory|parabola)\b/i.test(s)) score += 6;
      if (k === 'calculus' && /\b(differentiat|integrat|velocity\s+v.*=\s*|v\s*=\s*\d+t|v\s*=\s*[\d.+-]*\s*t)\b/i.test(s)) score += 7;
      if (score > bestScore) { bestScore = score; best = k; }
    });
    return SIM_CATALOG[best];
  }

  function parseCircuitBuilderProblem(text) {
    var s = String(text || ''), CB = getCB();
    var mE = /(\d+(?:\.\d+)?)\s*(?:mV|V)\b/i.exec(s);
    var E = mE ? Number(mE[1]) : 12;
    var mr = /internal\s+resistance\s*(?:of\s*)?(?:r\s*=\s*)?(\d+(?:\.\d+)?)\s*(kΩ|Ω|ohms?)/i.exec(s);
    var r = mr ? toSI(Number(mr[1]), mr[2]).v : 0;

    var resList = [], reR = /(\d+(?:\.\d+)?)\s*(kΩ|kohm|MΩ|Ω|ohms?)(?![A-Za-z0-9])/gi, mR;
    while ((mR = reR.exec(s)) !== null && resList.length < 4) {
      var val = toSI(Number(mR[1]), mR[2]).v;
      if (mr && Math.abs(val - r) < 1e-9 && Math.abs(mR.index - mr.index) < 35) continue;
      resList.push(val);
    }
    if (!resList.length) resList = [10, 20];

    var hasParallel = /parallel/i.test(s);
    var RECT = [[1, 1], [7, 1], [7, 4], [1, 4], [1, 1]];
    var parts = [], desc = '';
    if (CB) {
      var P = CB.make;
      if (hasParallel && resList.length >= 3) {
        parts = CB.build([P('cell', 1, 2, 'v', { E: E, r: r }), P('res', 2, 1, 'h', { R: resList[0] }), P('res', 4, 2, 'v', { R: resList[1] }), P('res', 7, 2, 'v', { R: resList[2] }), P('amm', 3, 4, 'h')], [RECT, [[4, 1], [4, 4]]]);
        desc = 'Mixed circuit: E = ' + sf3(E) + ' V in series with R₁ = ' + sf3(resList[0]) + ' Ω and parallel branch (' + sf3(resList[1]) + ' Ω ∥ ' + sf3(resList[2]) + ' Ω)';
      } else if (hasParallel && resList.length === 2) {
        parts = CB.build([P('cell', 1, 2, 'v', { E: E, r: r }), P('amm', 2, 1, 'h'), P('res', 4, 2, 'v', { R: resList[0] }), P('res', 7, 2, 'v', { R: resList[1] })], [RECT, [[4, 1], [4, 4]]]);
        desc = 'Parallel circuit: E = ' + sf3(E) + ' V across ' + sf3(resList[0]) + ' Ω ∥ ' + sf3(resList[1]) + ' Ω';
      } else if (resList.length >= 2) {
        parts = CB.build([P('cell', 3, 1, 'h', { E: E, r: r }, true), P('amm', 5, 1, 'h'), P('res', 7, 2, 'v', { R: resList[0] }), P('res', 4, 4, 'h', { R: resList[1] })], [RECT]);
        desc = 'Series circuit: E = ' + sf3(E) + ' V with R₁ = ' + sf3(resList[0]) + ' Ω and R₂ = ' + sf3(resList[1]) + ' Ω';
      } else {
        parts = CB.build([P('cell', 3, 1, 'h', { E: E, r: r }, true), P('amm', 5, 1, 'h'), P('res', 7, 2, 'v', { R: resList[0] }), P('volt', 4, 4, 'h')], [RECT, [[7, 2], [4, 4]]]);
        desc = 'Single loop: E = ' + sf3(E) + ' V across R₁ = ' + sf3(resList[0]) + ' Ω';
      }
      // Color-code wires on Tinkercad workbench
      parts.forEach(function (pt, idx) { if (pt.t === 'wire') pt.col = idx % 2 === 0 ? '#ef4444' : '#22c55e'; });
    }

    var Rext = 0, I = 0;
    if (hasParallel && resList.length >= 3) Rext = resList[0] + (resList[1] * resList[2]) / (resList[1] + resList[2]);
    else if (hasParallel && resList.length === 2) Rext = (resList[0] * resList[1]) / (resList[0] + resList[1]);
    else Rext = resList.reduce(function (a, b) { return a + b; }, 0);
    I = (Rext + r) > 0 ? E / (Rext + r) : 0;
    var Vt = E - I * r;

    var enc = CB && parts.length ? CB.encode(parts) : '';
    var resPartsIdx = parts.findIndex ? parts.findIndex(function (p) { return p.t === 'res'; }) : -1;
    var lastResIdx = resPartsIdx;
    parts.forEach(function (p, idx) { if (p.t === 'res') lastResIdx = idx; });

    var steps = [
      { title: 'Construct equivalent DC circuit in Tinkercad Workbench', equation: desc, explanation: 'Color-coded resistors, live current animation and a virtual Digital Multimeter are loaded automatically.' },
      { title: 'Combine external resistances R_ext', equation: hasParallel && resList.length >= 3
        ? 'R_parallel = (' + sf3(resList[1]) + '⁻¹ + ' + sf3(resList[2]) + '⁻¹)⁻¹ = ' + sf3((resList[1] * resList[2]) / (resList[1] + resList[2])) + ' Ω ⇒ R_ext = ' + sf3(Rext) + ' Ω'
        : hasParallel && resList.length === 2
        ? '1/R_ext = 1/' + sf3(resList[0]) + ' + 1/' + sf3(resList[1]) + ' ⇒ R_ext = ' + sf3(Rext) + ' Ω'
        : 'R_ext = ' + resList.map(sf3).join(' + ') + ' = ' + sf3(Rext) + ' Ω',
        explanation: 'Series resistances sum directly; parallel branches share the same p.d., so reciprocals add.' },
      { title: 'Calculate main circuit current I & terminal p.d.', equation: 'I = E / (R_ext + r) = ' + sf3(E) + ' / (' + sf3(Rext) + ' + ' + sf3(r) + ') = ' + sf3(I) + ' A · V_term = ' + sf3(Vt) + ' V',
        explanation: 'Apply Ohm’s law and V = E − Ir for total current leaving the cell.' }
    ];
    if (hasParallel && resList.length >= 3) {
      var Vpar = I * (resList[1] * resList[2]) / (resList[1] + resList[2]);
      steps.push({ title: 'Split branch currents across parallel resistors', equation: 'V_parallel = I × R_p = ' + sf3(Vpar) + ' V ⇒ I₂ = ' + sf3(Vpar / resList[1]) + ' A, I₃ = ' + sf3(Vpar / resList[2]) + ' A', explanation: 'Verify Kirchhoff’s First Law: I₂ + I₃ = ' + sf3(I) + ' A.' });
    }

    return {
      sim: SIM_CATALOG.circuitBuilder,
      title: 'DC Circuit & Tinkercad Workbench Solution',
      circuitHash: enc,
      params: { E: E, r: r, R1: resList[0] || 10, R2: resList[1] || 20, R3: resList[2] || 0 },
      unknownKey: lastResIdx >= 0 ? 'part_' + lastResIdx : 'R1',
      unknownLabel: lastResIdx >= 0 ? 'Unknown Resistor X' : 'R₁',
      steps: steps,
      finalAnswer: 'R_ext = ' + sf3(Rext) + ' Ω, Main Current I = ' + sf3(I) + ' A, Terminal V = ' + sf3(Vt) + ' V'
    };
  }

  function parseDividerProblem(text) {
    var s = String(text || '');
    var mV = /(\d+(?:\.\d+)?)\s*V\b/i.exec(s);
    var Vin = mV ? Number(mV[1]) : 9;
    var rs = [], reR = /(\d+(?:\.\d+)?)\s*(kΩ|kohm|Ω|ohms?)/gi, mr;
    while ((mr = reR.exec(s)) !== null && rs.length < 2) rs.push(toSI(Number(mr[1]), mr[2]).v);
    var R1 = rs[0] || 1000, R2 = rs[1] || 2000;
    var Vout = Vin * R2 / (R1 + R2);
    return {
      sim: SIM_CATALOG.divider,
      title: 'Potential Divider Circuit',
      params: { Vin: Vin, R1: R1, R2: R2 },
      unknownKey: 'R2',
      unknownLabel: 'R₂ (V_out)',
      steps: [
        { title: 'Identify supply V_in and divider resistors', equation: 'V_in = ' + sf3(Vin) + ' V, R₁ = ' + sf3(R1) + ' Ω, R₂ = ' + sf3(R2) + ' Ω', explanation: 'The current through R₁ and R₂ in series is I = V_in / (R₁ + R₂).' },
        { title: 'Apply potential divider equation', equation: 'V_out = V_in × R₂ / (R₁ + R₂) = ' + sf3(Vin) + ' × ' + sf3(R2) + ' / ' + sf3(R1 + R2) + ' = ' + sf3(Vout) + ' V', explanation: 'Voltage divides in proportion to resistance.' }
      ],
      finalAnswer: 'V_out = ' + sf3(Vout) + ' V'
    };
  }

  function parsePulleyProblem(text) {
    var s = String(text || '');
    var masses = [], reM = /(\d+(?:\.\d+)?)\s*(kg|g)\b/gi, mm;
    while ((mm = reM.exec(s)) !== null && masses.length < 2) masses.push(toSI(Number(mm[1]), mm[2]).v);
    var m1 = masses[0] || 0.8, m2 = masses[1] || 0.2;
    var g = /9709/.test(s) || !/9\.81/.test(s) ? 10 : 9.81;
    var a = Math.abs(m1 - m2) * g / (m1 + m2);
    var T = (2 * m1 * m2 * g) / (m1 + m2);
    return {
      sim: SIM_CATALOG.pulley,
      title: 'Connected Particles Over Smooth Pulley',
      params: { m1: Math.min(m1, m2), m2: Math.max(m1, m2) },
      unknownKey: 'm2',
      unknownLabel: 'Acceleration a & Tension T',
      steps: [
        { title: 'Write Newton’s 2nd Law for each hanging particle (g = ' + g + ' m/s²)', equation: Math.max(m1, m2) + 'g − T = ' + Math.max(m1, m2) + 'a   and   T − ' + Math.min(m1, m2) + 'g = ' + Math.min(m1, m2) + 'a', explanation: 'The string is light and inextensible so both particles have the same acceleration a and tension T.' },
        { title: 'Add equations to eliminate T and solve for a', equation: '(' + Math.max(m1, m2) + ' − ' + Math.min(m1, m2) + ') × ' + g + ' = (' + m1 + ' + ' + m2 + ')a ⇒ a = ' + sf3(a) + ' m s⁻²', explanation: 'Sum the driving weight difference divided by total moving mass.' },
        { title: 'Substitute a back into either equation for Tension T', equation: 'T = ' + Math.min(m1, m2) + ' × (' + g + ' + ' + sf3(a) + ') = ' + sf3(T) + ' N', explanation: 'Always substitute the exact value back to avoid premature rounding.' }
      ],
      finalAnswer: 'a = ' + sf3(a) + ' m s⁻², Tension T = ' + sf3(T) + ' N'
    };
  }

  function parsePlaneProblem(text) {
    var s = String(text || '');
    var mm = /(\d+(?:\.\d+)?)\s*(kg|g)\b/i.exec(s);
    var m = mm ? toSI(Number(mm[1]), mm[2]).v : 12;
    var mTh = /(\d+(?:\.\d+)?)\s*°/.exec(s);
    var theta = mTh ? Number(mTh[1]) : 25;
    var mMu = /(?:coefficient\s+of\s+friction|μ|mu)[^0-9]{0,70}(\d+(?:\.\d+)?)/i.exec(s);
    var mu = mMu ? Number(mMu[1]) : 0.4;
    var isHoriz = /\bhorizontal\b/i.test(s) && (!/to\s+the\s+horizontal|horizontal\s+plane|horizontal\s+floor/i.test(s) || /(?:force|P)\s+(?:is|acts)\s+horizontal/i.test(s));
    var g = 10, th = theta * Math.PI / 180;
    var R_norm, P_req;
    if (isHoriz) {
      P_req = (m * g * (Math.sin(th) + mu * Math.cos(th))) / Math.max(0.05, (Math.cos(th) - mu * Math.sin(th)));
      R_norm = m * g * Math.cos(th) + P_req * Math.sin(th);
    } else {
      R_norm = m * g * Math.cos(th);
      P_req = m * g * Math.sin(th) + mu * R_norm;
    }
    return {
      sim: SIM_CATALOG.plane,
      title: 'Rough Inclined Plane Equilibrium',
      params: { m: m, theta: theta, mu: mu, P: Number(P_req.toPrecision(3)), phi: isHoriz ? -theta : 0 },
      unknownKey: 'P',
      unknownLabel: 'Force P',
      steps: [
        { title: 'Resolve perpendicular to the inclined plane (θ = ' + theta + '°)', equation: isHoriz ? 'R = ' + m + 'g cos ' + theta + '° + P sin ' + theta + '°' : 'R = ' + m + 'g cos ' + theta + '° = ' + sf3(R_norm) + ' N', explanation: 'Include P sin θ component in R if the applied force is horizontal!' },
        { title: 'Apply limiting friction F = μR and resolve along slope', equation: (isHoriz ? 'P cos ' + theta + '°' : 'P') + ' = ' + m + 'g sin ' + theta + '° + ' + mu + 'R', explanation: 'When on the point of moving UP the slope, friction opposes motion and acts DOWN the slope.' },
        { title: 'Solve simultaneously for applied force P', equation: 'R = ' + sf3(R_norm) + ' N ⇒ P = ' + sf3(P_req) + ' N', explanation: 'Matches Cambridge 9709 Paper 4 mark scheme method.' }
      ],
      finalAnswer: 'P = ' + sf3(P_req) + ' N (using g = 10 m s⁻²)'
    };
  }

  function parseMomentsProblem(text, askHint) {
    var s = String(text || '');
    var L = 4, W = 0, xP = 2, mode = 'pin', uniform = 1;
    var mL = /(?:length|beam|plank|rod|shelf)\s*(?:of\s*)?(?:is\s*)?(?:=\s*)?(\d+(?:\.\d+)?)\s*(cm|mm|m)\b/i.exec(s) || /(\d+(?:\.\d+)?)\s*(cm|mm|m)\s*(?:long|plank|beam|rod|shelf)/i.exec(s);
    if (mL) L = Number(toSI(Number(mL[1]), mL[2]).v.toFixed(4));
    else if (/metre\s*rule/i.test(s)) L = 1;

    var mW = /(?:weight|mass)\s*(?:of\s*(?:the\s*)?(?:beam|plank|rod|shelf)\s*)?(?:is\s*|of\s*|=\s*)?(\d+(?:\.\d+)?)\s*(kN|N|kg|g)\b/i.exec(s);
    if (mW && !/light|negligible/i.test(s)) {
      var wv = toSI(Number(mW[1]), mW[2]);
      W = wv.u === 'kg' ? Number((wv.v * 9.81).toFixed(3)) : wv.v;
    }
    if (/supports?/i.test(s) && !/supporting\s+wire/i.test(s)) mode = 'supports';
    if (/hinge|hinged/i.test(s)) xP = 0;
    else {
      var mP = /(?:pivot|fulcrum)(?:ed)?\s*(?:at)?\s*(?:x\s*=\s*)?(\d+(?:\.\d+)?)\s*(cm|mm|m)\b/i.exec(s);
      xP = mP ? toSI(Number(mP[1]), mP[2]).v : L / 2;
    }

    var loads = [];
    var rePair = /(\d+(?:\.\d+)?)\s*(kN|N)\b[^.\n;]{0,65}?(?:at\s*(?:x\s*=\s*)?(\d+(?:\.\d+)?)\s*(cm|mm|m)\b|(\d+(?:\.\d+)?)\s*(cm|mm|m)\s*from)/gi;
    var mp;
    while ((mp = rePair.exec(s)) !== null && loads.length < 3) {
      var fv = toSI(Number(mp[1]), mp[2]).v;
      if (Math.abs(fv - W) < 1e-6 && /weight/i.test(s.slice(Math.max(0, mp.index - 20), mp.index + 15))) continue;
      var dv = mp[3] ? toSI(Number(mp[3]), mp[4]).v : toSI(Number(mp[5]), mp[6]).v;
      if (/from\s+(?:the\s+)?pivot/i.test(mp[0]) && dv < L) dv = xP + dv;
      var ang = -90;
      var ctx = s.slice(Math.max(0, mp.index - 25), Math.min(s.length, mp.index + mp[0].length + 40));
      var mAng = /(\d+(?:\.\d+)?)\s*°/.exec(ctx);
      if (/upwards?/i.test(ctx)) ang = 90;
      if (mAng) ang = /above|wire|string|up/i.test(ctx) ? (180 - Number(mAng[1])) : Number(mAng[1]);
      loads.push({ F: fv, x: Math.max(0, Math.min(L, dv)), a: ang });
    }

    var unkForceIdx = -1;
    var reUnkPos = /(?:unknown\s+(?:force|weight|tension|wire|load)?|wire|[fwtpx]\b)[^.\n;]{0,95}?\bat\s*(?:x\s*=\s*)?(\d+(?:\.\d+)?)\s*(cm|mm|m)\b/gi;
    var mu;
    while ((mu = reUnkPos.exec(s)) !== null) {
      var ux = Math.max(0, Math.min(L, toSI(Number(mu[1]), mu[2]).v));
      var uCtx = s.slice(Math.max(0, mu.index - 20), Math.min(s.length, mu.index + mu[0].length + 40));
      var uAng = /upwards?|wire/i.test(uCtx) ? 90 : -90;
      var uAngM = /(\d+(?:\.\d+)?)\s*°/.exec(uCtx);
      if (uAngM) uAng = /above|wire|up/i.test(uCtx) ? (180 - Number(uAngM[1])) : Number(uAngM[1]);
      var existing = loads.findIndex(function (ld) { return Math.abs(ld.x - ux) < 0.02; });
      if (existing >= 0) { unkForceIdx = existing; loads[existing].a = uAng; }
      else if (loads.length < 3) { unkForceIdx = loads.length; loads.push({ F: 40, x: ux, a: uAng }); }
    }
    if (!loads.length) loads.push({ F: 100, x: L * 0.75, a: -90 }, { F: 200, x: L * 0.25, a: -90 });
    while (loads.length < 2) loads.push({ F: 50, x: L * 0.8, a: -90 });

    var unknownKey = unkForceIdx >= 0 ? 'F' + (unkForceIdx + 1) : (/weight|W\b/i.test(askHint || '') ? 'W' : 'F1');
    var cwSum = 0, acwSum = 0, terms = [];
    function mom(F, x, ang) { return (x - xP) * F * Math.sin(ang * Math.PI / 180); }
    if (W > 0 && unknownKey !== 'W') {
      var mw = mom(W, L / 2, -90);
      if (mw < 0) cwSum += -mw; else acwSum += mw;
      terms.push({ name: 'W', F: W, d: Math.abs(L / 2 - xP), dir: mw < 0 ? 'CW' : 'ACW' });
    }
    loads.forEach(function (ld, idx) {
      if (unknownKey === 'F' + (idx + 1)) return;
      var ml = mom(ld.F, ld.x, ld.a);
      if (ml < 0) cwSum += -ml; else acwSum += ml;
      terms.push({ name: 'F' + (idx + 1), F: ld.F, d: Math.abs(ld.x - xP) * Math.abs(Math.sin(ld.a * Math.PI / 180)), dir: ml < 0 ? 'CW' : 'ACW' });
    });
    var uSlot = unknownKey === 'W' ? { x: L / 2, a: -90 } : loads[Number(unknownKey.slice(1)) - 1];
    var lever = Math.abs(uSlot.x - xP) * Math.abs(Math.sin(uSlot.a * Math.PI / 180));
    var solvedVal = lever > 1e-6 ? Math.abs(cwSum - acwSum) / lever : NaN;
    var f1 = loads[0], f2 = loads[1], f3 = loads[2] || { F: 0, x: 0, a: -90 };
    return {
      sim: SIM_CATALOG.moments,
      title: 'Moments Equilibrium Problem',
      params: { mode: mode, uniform: uniform, L: L, W: W, xG: L / 2, xP: xP, xO: xP, F1: f1.F, x1: f1.x, a1: f1.a, F2: f2.F, x2: f2.x, a2: f2.a, F3: f3.F, x3: f3.x, a3: f3.a },
      unknownKey: unknownKey,
      unknownLabel: unknownKey,
      steps: [
        { title: 'Take moments about the pivot (x = ' + sf3(xP) + ' m)', equation: 'Σ clockwise moments = Σ anticlockwise moments', explanation: 'Moments about the pivot eliminate unknown reaction force.' },
        { title: 'Compute moments of known forces', equation: terms.map(function (t) { return t.F + ' × ' + sf3(t.d) + ' (' + t.dir + ')'; }).join(' ; ') || 'Balanced loads', explanation: 'd⊥ = |x − x_pivot| × |sin θ|.' },
        { title: 'Solve for unknown x (' + unknownKey + ')', equation: 'x × ' + sf3(lever) + ' = ' + sf3(Math.abs(cwSum - acwSum)) + ' ⇒ x = ' + sf3(solvedVal) + ' N', explanation: 'Divide balancing moment by perpendicular lever arm.' }
      ],
      finalAnswer: isFinite(solvedVal) ? unknownKey + ' = ' + sf3(solvedVal) + ' N' : 'Inspect on live simulation'
    };
  }

  function parseForcesProblem(text) {
    var s = String(text || '');
    var pairs = [], re = /(\d+(?:\.\d+)?)\s*(kN|N)\s*(?:at|@|acting)?\s*(\d+(?:\.\d+)?)\s*°/gi, m;
    while ((m = re.exec(s)) !== null && pairs.length < 4) pairs.push([toSI(Number(m[1]), m[2]).v, Number(m[3]) % 360]);
    if (!pairs.length) {
      var fs = [], reF = /(\d+(?:\.\d+)?)\s*(kN|N)\b/gi, mf;
      while ((mf = reF.exec(s)) !== null && fs.length < 4) fs.push(toSI(Number(mf[1]), mf[2]).v);
      pairs = fs.map(function (fv, idx) { return [fv, (idx * 60) % 360]; });
    }
    while (pairs.length < 2) pairs.push([15, pairs.length * 90]);
    var n = Math.min(5, pairs.length + (/unknown|equilibrium|find\s+[a-z]/i.test(s) ? 1 : 0));
    var params = { n: n, mode: 'resultant' }, rx = 0, ry = 0;
    pairs.forEach(function (pr, i) {
      params['F' + i] = pr[0]; params['th' + i] = pr[1];
      rx += pr[0] * Math.cos(pr[1] * Math.PI / 180);
      ry += pr[0] * Math.sin(pr[1] * Math.PI / 180);
    });
    if (n > pairs.length) {
      var idx = pairs.length;
      params['F' + idx] = 20;
      params['th' + idx] = ((Math.atan2(-ry, -rx) * 180 / Math.PI) + 360) % 360;
    }
    var eqF = Math.hypot(rx, ry), eqAng = ((Math.atan2(-ry, -rx) * 180 / Math.PI) + 360) % 360;
    var unknownKey = n > pairs.length ? 'F' + pairs.length : 'F0';
    return {
      sim: SIM_CATALOG.forces,
      title: 'Coplanar Forces & Equilibrium',
      params: params,
      unknownKey: unknownKey,
      unknownLabel: 'F' + (Number(unknownKey.slice(1)) + 1),
      steps: [
        { title: 'Resolve known forces into x and y components', equation: 'ΣX_known = ' + sf3(rx) + ' N, ΣY_known = ' + sf3(ry) + ' N', explanation: 'X = ΣF cos θ and Y = ΣF sin θ.' },
        { title: 'Apply equilibrium or resultant Pythagoras', equation: 'R = √(' + sf3(rx) + '² + ' + sf3(ry) + '²) = ' + sf3(eqF) + ' N at ' + sf3(eqAng) + '°', explanation: 'Combine perpendicular components cleanly.' }
      ],
      finalAnswer: (/equilibrium/i.test(s) ? 'Equilibrium Force' : 'Resultant Force') + ' = ' + sf3(eqF) + ' N at ' + sf3(eqAng) + '°'
    };
  }

  function parseProjectileProblem(text) {
    var s = String(text || '');
    var mu = /(?:speed|velocity|u)\s*(?:=|of|is)?\s*(\d+(?:\.\d+)?)\s*(m\/s|ms-1|m\s*s-?1|km\/h)/i.exec(s) || /(\d+(?:\.\d+)?)\s*(m\/s|km\/h)/i.exec(s);
    var u = mu ? Number(toSI(Number(mu[1]), mu[2]).v.toFixed(3)) : 20;
    var mth = /(\d+(?:\.\d+)?)\s*°/.exec(s);
    var theta = mth ? Number(mth[1]) : 30;
    var mh = /(?:cliff|height|tower|from\s*a\s*height)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*(cm|m)\b/i.exec(s);
    var h0 = mh ? toSI(Number(mh[1]), mh[2]).v : 0;
    var g = 9.81, ux = u * Math.cos(theta * Math.PI / 180), uy = u * Math.sin(theta * Math.PI / 180);
    var hMax = h0 + (uy * uy) / (2 * g);
    var tFlight = (uy + Math.sqrt(uy * uy + 2 * g * h0)) / g;
    var range = ux * tFlight;
    return {
      sim: SIM_CATALOG.projectile,
      title: 'Projectile Motion (2D SUVAT)',
      params: { u: u, theta: theta, h0: h0 },
      unknownKey: 'u',
      unknownLabel: 'Launch speed u',
      steps: [
        { title: 'Resolve u = ' + sf3(u) + ' m/s at ' + theta + '°', equation: 'u_x = ' + sf3(ux) + ' m/s · u_y = ' + sf3(uy) + ' m/s', explanation: 'Horizontal and vertical motions are independent.' },
        { title: 'Max height (v_y = 0)', equation: 'h_max = h₀ + u_y² / (2g) = ' + sf3(hMax) + ' m', explanation: 'Vertical speed reaches 0 at the peak.' },
        { title: 'Time of flight & horizontal range', equation: 't = ' + sf3(tFlight) + ' s · Range = u_x t = ' + sf3(range) + ' m', explanation: 'Horizontal acceleration is 0.' }
      ],
      finalAnswer: 'h_max = ' + sf3(hMax) + ' m, Range = ' + sf3(range) + ' m'
    };
  }

  function parseWavesProblem(text) {
    var s = String(text || '');
    var mf = /(\d+(?:\.\d+)?)\s*(MHz|kHz|Hz)\b/i.exec(s);
    var f = mf ? toSI(Number(mf[1]), mf[2]).v : 3.0;
    var ml = /(\d+(?:\.\d+)?)\s*(nm|mm|cm|m)\b/i.exec(s);
    var lam = ml ? toSI(Number(ml[1]), ml[2]).v : 1.5;
    var v = f * lam;
    return {
      sim: SIM_CATALOG.waves,
      title: 'Progressive Waves (v = fλ)',
      params: { f: f, lam: lam, A: 0.4 },
      unknownKey: 'lam',
      unknownLabel: 'Wavelength λ / Speed v',
      steps: [
        { title: 'Period T = 1 / f', equation: 'T = 1 / ' + sf3(f) + ' = ' + sf3(1 / f) + ' s', explanation: 'Frequency is cycles per second.' },
        { title: 'Wave equation v = fλ', equation: 'v = ' + sf3(f) + ' × ' + sf3(lam) + ' = ' + sf3(v) + ' m s⁻¹', explanation: 'Relates wave speed, frequency and wavelength.' }
      ],
      finalAnswer: 'T = ' + sf3(1 / f) + ' s, v = ' + sf3(v) + ' m s⁻¹'
    };
  }

  function genericExtract(sim, text) {
    var s = String(text || ''), params = {}, used = {};
    var reAll = /(-?\d+(?:\.\d+)?)\s*(kN|N|cm|mm|nm|km\/h|m\/s|km|m|kg|g|kHz|MHz|Hz|kΩ|MΩ|Ω|mV|V|°)(?![A-Za-z0-9])/g, tok;
    while ((tok = reAll.exec(s)) !== null) {
      var conv = toSI(Number(tok[1]), tok[2]);
      for (var i = 0; i < sim.params.length; i++) {
        var sp = sim.params[i];
        if (used[sp.key]) continue;
        if (sp.unit === conv.u || (sp.unit === '°' && tok[2] === '°')) {
          params[sp.key] = Number(conv.v.toPrecision(4));
          used[sp.key] = true;
          break;
        }
      }
    }
    return {
      sim: sim,
      title: sim.title,
      params: params,
      unknownKey: sim.params[0] ? sim.params[0].key : '',
      unknownLabel: sim.params[0] ? sim.params[0].label : 'x',
      steps: [
        { title: 'Identify scenario: ' + sim.title, equation: Object.keys(params).map(function (k) { return k + ' = ' + params[k]; }).join(', ') || 'Interactive scenario loaded', explanation: 'Detected values mapped to SI units and launched in the corresponding Cambridge simulation.' },
        { title: 'Verify against interactive stage & mark scheme', equation: 'Run Play / Step Studio / Calculate x inside the live stage', explanation: 'Adjust any parameter or mark an unknown x to verify the exact working.' }
      ],
      finalAnswer: 'Loaded into ' + sim.title + ' (' + Object.keys(params).length + ' parameters extracted)'
    };
  }

  function solveText(txt, opts) {
    opts = opts || {};
    var clean = String(txt || '').trim();
    if (!clean) throw new Error('Please paste question text, pick a folder past paper, or drop a screenshot.');

    // Match against local Cambridge past-paper folder (9709 P4, 9702 P2 AS, 9702 P4 A2)
    var refMatch = opts.forcedRef ? { bestMatch: opts.forcedRef, bestScore: 1, exactRef: true, references: matchPastPapers(opts.forcedRef.t, { limit: 4 }).references } : matchPastPapers(clean, { limit: 4 });
    var matched = refMatch.bestMatch;
    var parseInput = (matched && (opts.forcedRef || refMatch.exactRef) && clean.length < matched.t.length) ? (matched.r + ' ' + matched.t) : clean;
    var preferredSim = matched && (opts.forcedRef || refMatch.exactRef || refMatch.bestScore >= 0.72) ? matched.sim : null;
    var sim = classifySim(parseInput, preferredSim);

    var solved;
    if (sim.id === 'circuitBuilder' || sim.id === 'circuits') solved = parseCircuitBuilderProblem(parseInput);
    else if (sim.id === 'divider') solved = parseDividerProblem(parseInput);
    else if (sim.id === 'pulley') solved = parsePulleyProblem(parseInput);
    else if (sim.id === 'plane') solved = parsePlaneProblem(parseInput);
    else if (sim.id === 'moments') solved = parseMomentsProblem(parseInput, opts.askHint);
    else if (sim.id === 'forces') solved = parseForcesProblem(parseInput);
    else if (sim.id === 'projectile') solved = parseProjectileProblem(parseInput);
    else if (sim.id === 'waves') solved = parseWavesProblem(parseInput);
    else solved = genericExtract(sim, parseInput);

    if (matched) {
      solved.matchedRef = {
        ref: matched.r,
        syllabus: matched.s,
        paper: matched.p,
        topic: matched.tp,
        qtype: matched.qt,
        marks: matched.m,
        ms: matched.ms || ''
      };
      if (matched.ms) {
        solved.steps.unshift({
          title: 'Official Cambridge Mark Scheme (' + matched.r + ' · ' + matched.m + ' marks)',
          equation: matched.ms,
          explanation: 'Matched directly from your local past-paper archive and mark-scheme files.'
        });
      }
    }
    solved.similarRefs = refMatch.references || [];
    return solved;
  }

  function analyzeLocally(questionText, imgDataUrl, askHint, onStatus, forcedRef) {
    var txt = String(questionText || '').trim();
    if (txt) {
      return Promise.resolve(solveText(txt, { askHint: askHint, forcedRef: forcedRef }));
    }
    if (imgDataUrl) {
      return ocrImage(imgDataUrl, onStatus).then(function (ocrText) {
        var r = solveText(ocrText, { askHint: askHint, forcedRef: forcedRef });
        r.ocrText = ocrText;
        return r;
      });
    }
    return Promise.reject(new Error('Upload a screenshot or enter a question to analyze.'));
  }

  function analyzeWithGemini(apiKey, imgDataUrl, questionText, askHint) {
    if (!apiKey || typeof fetch !== 'function') return Promise.reject(new Error('Gemini API key or fetch unavailable'));
    var refMatch = matchPastPapers(questionText || askHint || '', { limit: 4 });
    var msHint = refMatch.bestMatch && refMatch.bestMatch.ms
      ? '\nMatched local Past Paper ' + refMatch.bestMatch.r + ' Official Mark Scheme: ' + refMatch.bestMatch.ms + '\n' : '';

    var parts = [];
    var catalogDesc = Object.keys(SIM_CATALOG).map(function (k) {
      var c = SIM_CATALOG[k];
      return '- id "' + k + '" (' + c.title + '): params = [' + c.params.map(function (p) { return p.key + ' (' + p.label + (p.unit ? ', ' + p.unit : '') + ')'; }).join(', ') + ']';
    }).join('\n');

    var prompt = 'You are an expert Cambridge A-Level (9709 Mechanics & 9702 Physics) examiner and tutor.\n' +
      'Analyze the provided physics/mechanics question screenshot and/or text. Choose the best matching simulation id from the catalog below, extract ALL known values converted to SI units, mark which parameter key is unknown x ("unknownKey"), and produce crisp mark-scheme style step-by-step working.\n\n' +
      'Simulation catalog:\n' + catalogDesc + '\n' + msHint + '\n' +
      (questionText ? 'Student text: ' + questionText + '\n' : '') +
      (askHint ? 'Unknown target: ' + askHint + '\n' : '') +
      '\nReturn STRICT JSON matching this schema:\n' +
      '{"simId":"one of catalog keys","title":"short title","params":{},"unknownKey":"key","unknownLabel":"label","finalAnswer":"e.g. X = 450 N","steps":[{"title":"Step","equation":"formula = sub = ans","explanation":"concise reason"}]}';

    parts.push({ text: prompt });
    if (imgDataUrl && /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(imgDataUrl)) {
      var seg = imgDataUrl.split(';base64,');
      parts.push({ inlineData: { mimeType: seg[0].replace(/^data:/, ''), data: seg[1] } });
    }

    var endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey.trim());
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: parts }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
      })
    }).then(function (resp) {
      if (!resp.ok) throw new Error('Gemini API HTTP ' + resp.status);
      return resp.json();
    }).then(function (json) {
      var raw = json && json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0] && json.candidates[0].content.parts[0].text;
      if (!raw) throw new Error('Empty Gemini response');
      var parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, '').trim());
      var sim = SIM_CATALOG[parsed.simId] || SIM_CATALOG.forces;
      var out = {
        sim: sim,
        title: parsed.title || sim.title,
        params: parsed.params || {},
        unknownKey: parsed.unknownKey || '',
        unknownLabel: parsed.unknownLabel || parsed.unknownKey || 'x',
        steps: Array.isArray(parsed.steps) ? parsed.steps : [],
        finalAnswer: parsed.finalAnswer || '',
        similarRefs: refMatch.references || [],
        usedAi: true
      };
      if (refMatch.bestMatch) {
        out.matchedRef = {
          ref: refMatch.bestMatch.r, syllabus: refMatch.bestMatch.s, paper: refMatch.bestMatch.p,
          topic: refMatch.bestMatch.tp, qtype: refMatch.bestMatch.qt, marks: refMatch.bestMatch.m, ms: refMatch.bestMatch.ms || ''
        };
      }
      if (sim.id === 'circuitBuilder' && getCB()) {
        // Also generate encoded circuit hash for Tinkercad workbench
        var built = parseCircuitBuilderProblem(questionText || (parsed.title + ' ' + JSON.stringify(parsed.params)));
        out.circuitHash = built.circuitHash;
      }
      return out;
    });
  }

  function buildSimUrl(result, opts) {
    opts = opts || {};
    var sim = result && result.sim ? result.sim : SIM_CATALOG.forces;
    var p = result && result.params ? result.params : {};
    var theme = opts.theme || 'dark';
    var pairs = [];
    if (result && result.circuitHash) {
      pairs.push('c=' + encodeURIComponent(result.circuitHash));
    } else {
      Object.keys(p).forEach(function (k) {
        if (p[k] !== undefined && p[k] !== null && p[k] !== '') pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(p[k]));
      });
    }
    if (result && result.unknownKey) pairs.push('markX=' + encodeURIComponent(result.unknownKey));
    if (opts.autoSolve) pairs.push('autoSolve=1');
    else if (opts.autoStudio) pairs.push('autoStudio=1');
    return sim.path + '&theme=' + encodeURIComponent(theme) + '&v=6' + (pairs.length ? '#' + pairs.join('&') : '');
  }

  root.SIM = root.SIM || {};
  root.SIM.SOLVER = {
    SIM_CATALOG: SIM_CATALOG,
    getApiKey: getApiKey,
    setApiKey: setApiKey,
    getBank: getBank,
    searchBank: searchBank,
    matchPastPapers: matchPastPapers,
    getSamples: getSamples,
    solveText: solveText,
    analyzeLocally: analyzeLocally,
    analyzeWithGemini: analyzeWithGemini,
    buildSimUrl: buildSimUrl
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.SIM.SOLVER;
})(typeof self !== 'undefined' ? self : this);
