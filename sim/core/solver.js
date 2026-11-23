/* ============================================================================
   SIM.SOLVER — Custom Question, Screenshot OCR & Gemini Vision AI Engine
   Zero-build browser helper for mapping past-paper screenshots/text to live simulations
   and generating Cambridge A-Level step-by-step working.
   ============================================================================ */
(function (root) {
  'use strict';

  var GEMINI_KEY_STORAGE = 'alevel-gemini-api-key';

  var SIM_CATALOG = {
    moments: {
      id: 'moments', title: 'Moments, Beams & Couples', syllabus: '9702 4.1',
      path: 'sims/9702/p4-moments.html?course=9702&embed=1',
      params: [
        { key: 'mode', label: 'Situation (pin/supports/couple)' },
        { key: 'L', label: 'Beam length L', unit: 'm' },
        { key: 'W', label: 'Beam weight W', unit: 'N' },
        { key: 'xG', label: 'Centre of gravity xG', unit: 'm' },
        { key: 'xP', label: 'Pivot / hinge position xP', unit: 'm' },
        { key: 'F1', label: 'Force F₁', unit: 'N' },
        { key: 'x1', label: 'Position x₁ of F₁', unit: 'm' },
        { key: 'a1', label: 'Angle θ₁ of F₁ (−90° down)', unit: '°' },
        { key: 'F2', label: 'Force F₂', unit: 'N' },
        { key: 'x2', label: 'Position x₂ of F₂', unit: 'm' },
        { key: 'a2', label: 'Angle θ₂ of F₂ (−90° down)', unit: '°' },
        { key: 'F3', label: 'Force F₃', unit: 'N' },
        { key: 'x3', label: 'Position x₃ of F₃', unit: 'm' },
        { key: 'a3', label: 'Angle θ₃ of F₃', unit: '°' }
      ],
      keywords: /\b(moment|torque|beam|plank|rod|metre\s*rule|pivot|fulcrum|hinge|support|clockwise|anticlockwise|see-?saw|couple|centre\s+of\s+gravity|uniform)\b/i
    },
    forces: {
      id: 'forces', title: 'Coplanar Forces at a Point', syllabus: '9709 4.1',
      path: 'sims/9709/m1-resultant.html?course=9709&embed=1',
      params: [
        { key: 'n', label: 'Number of forces n', unit: '' },
        { key: 'F0', label: 'Force F₁ magnitude', unit: 'N' },
        { key: 'th0', label: 'Angle θ₁ from +x', unit: '°' },
        { key: 'F1', label: 'Force F₂ magnitude', unit: 'N' },
        { key: 'th1', label: 'Angle θ₂ from +x', unit: '°' },
        { key: 'F2', label: 'Force F₃ magnitude', unit: 'N' },
        { key: 'th2', label: 'Angle θ₃ from +x', unit: '°' }
      ],
      keywords: /\b(coplanar|resultant|resolving|equilibrium|polygon\s+of\s+forces|point\s+o|components|anticlockwise\s+from)\b/i
    },
    strings: {
      id: 'strings', title: 'Strings & Rings in Equilibrium', syllabus: '9709 4.1',
      path: 'sims/9709/m1-strings.html?course=9709&embed=1',
      params: [
        { key: 'm', label: 'Hanging mass m', unit: 'kg' },
        { key: 'a', label: 'Left string angle α', unit: '°' },
        { key: 'b', label: 'Right string angle β', unit: '°' }
      ],
      keywords: /\b(string|strings|ring|suspended|hangs?|ceiling|tension\s+t1|two\s+strings)\b/i
    },
    plane: {
      id: 'plane', title: 'Particle on a Slope or Floor', syllabus: '9709 4.1 / 4.4',
      path: 'sims/9709/m1m4-plane.html?course=9709&embed=1',
      params: [
        { key: 'm', label: 'Particle mass m', unit: 'kg' },
        { key: 'th', label: 'Slope angle θ', unit: '°' },
        { key: 'mu', label: 'Coefficient of friction μ', unit: '' },
        { key: 'F', label: 'Applied force P', unit: 'N' }
      ],
      keywords: /\b(inclined\s+plane|slope|incline|rough|friction|coefficient|mu|μ|normal\s+reaction)\b/i
    },
    pulley: {
      id: 'pulley', title: 'Connected Particles & Pulleys', syllabus: '9709 4.4',
      path: 'sims/9709/m4-connected.html?course=9709&embed=1',
      params: [
        { key: 'm1', label: 'Mass A m₁', unit: 'kg' },
        { key: 'm2', label: 'Mass B m₂', unit: 'kg' },
        { key: 'mu1', label: 'Table friction μ', unit: '' }
      ],
      keywords: /\b(pulley|connected\s+particle|inextensible\s+string|over\s+a\s+smooth)\b/i
    },
    projectile: {
      id: 'projectile', title: 'Projectiles (2D Motion)', syllabus: '9702 Topic 2',
      path: 'sims/9702/p2-projectile.html?course=9702&embed=1',
      params: [
        { key: 'u', label: 'Launch speed u', unit: 'm/s' },
        { key: 'th', label: 'Projection angle θ', unit: '°' },
        { key: 'h0', label: 'Initial height h₀', unit: 'm' }
      ],
      keywords: /\b(projectile|projected|trajectory|range|maximum\s+height|angle\s+of\s+projection|cliff|parabola)\b/i
    },
    collisions: {
      id: 'collisions', title: 'Momentum & Collisions', syllabus: '9709 4.3',
      path: 'sims/9709/m3-collisions.html?course=9709&embed=1',
      params: [
        { key: 'm1', label: 'Object 1 mass m₁', unit: 'kg' },
        { key: 'u1', label: 'Object 1 speed u₁', unit: 'm/s' },
        { key: 'm2', label: 'Object 2 mass m₂', unit: 'kg' },
        { key: 'u2', label: 'Object 2 speed u₂', unit: 'm/s' }
      ],
      keywords: /\b(momentum|collision|coalesce|impulse|restitution|collide|trolley|rebound)\b/i
    },
    waves: {
      id: 'waves', title: 'Progressive Waves', syllabus: '9702 Topic 7',
      path: 'sims/9702/p7-waves.html?course=9702&embed=1',
      params: [
        { key: 'f', label: 'Frequency f', unit: 'Hz' },
        { key: 'lam', label: 'Wavelength λ', unit: 'm' },
        { key: 'A', label: 'Amplitude A', unit: 'm' }
      ],
      keywords: /\b(wave|frequency|wavelength|amplitude|period|hertz|crest|trough|oscillation)\b/i
    },
    circuits: {
      id: 'circuits', title: 'DC Circuits & Resistance', syllabus: '9702 Topic 10',
      path: 'sims/9702/p10-circuits.html?course=9702&embed=1',
      params: [
        { key: 'V', label: 'Supply EMF V', unit: 'V' },
        { key: 'R1', label: 'Resistor R₁', unit: 'Ω' },
        { key: 'R2', label: 'Resistor R₂', unit: 'Ω' }
      ],
      keywords: /\b(circuit|resistor|resistance|ohm|emf|voltage|current|ampere|series|parallel)\b/i
    }
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
    if (u === 'km') return { v: val * 1000, u: 'm' };
    if (u === 'km/h') return { v: val / 3.6, u: 'm/s' };
    if (u === 'kn') return { v: val * 1000, u: 'N' };
    if (u === 'g') return { v: val * 0.001, u: 'kg' };
    if (u === 'kw') return { v: val * 1000, u: 'W' };
    if (u === 'khz') return { v: val * 1000, u: 'Hz' };
    if (u === 'mhz') return { v: val * 1e6, u: 'Hz' };
    if (u === 'kω' || u === 'kohm') return { v: val * 1000, u: 'Ω' };
    return { v: val, u: unitRaw };
  }

  function sf3(x) {
    if (!isFinite(x)) return String(x);
    if (Math.abs(x) < 1e-9) return '0';
    return Number(x.toPrecision(3)).toString();
  }

  /* ---------- Past-paper diagram SVG->PNG sample builder ---------- */
  function makeSampleSvg(kind) {
    var svg = '';
    if (kind === 'seesaw') {
      svg = '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="240" viewBox="0 0 560 240">' +
        '<rect width="560" height="240" fill="#0d151c"/>' +
        '<text x="20" y="28" fill="#fbbf24" font-family="sans-serif" font-size="13" font-weight="bold">Past Paper Style: Moments on a Balanced Plank</text>' +
        '<rect x="70" y="102" width="420" height="14" rx="4" fill="#334155" stroke="#94a3b8" stroke-width="2"/>' +
        '<polygon points="280,116 264,148 296,148" fill="#64748b" stroke="#e2e8f0" stroke-width="2"/>' +
        '<text x="280" y="166" fill="#cbd5e1" font-family="sans-serif" font-size="12" text-anchor="middle">Pivot (x = 2.0 m)</text>' +
        '<line x1="122" y1="116" x2="122" y2="188" stroke="#4ade80" stroke-width="3"/><polygon points="122,194 116,182 128,182" fill="#4ade80"/>' +
        '<text x="122" y="214" fill="#4ade80" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">300 N at 0.50 m</text>' +
        '<line x1="385" y1="116" x2="385" y2="188" stroke="#fbbf24" stroke-width="3" stroke-dasharray="5,4"/><polygon points="385,194 379,182 391,182" fill="#fbbf24"/>' +
        '<text x="385" y="214" fill="#fbbf24" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">X = ? at 3.0 m</text>' +
        '<line x1="70" y1="78" x2="490" y2="78" stroke="#64748b" stroke-width="1.5"/>' +
        '<text x="280" y="70" fill="#e2e8f0" font-family="sans-serif" font-size="12" text-anchor="middle">L = 4.0 m (light uniform beam)</text></svg>';
    } else if (kind === 'shelf') {
      svg = '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="240" viewBox="0 0 560 240">' +
        '<rect width="560" height="240" fill="#0d151c"/>' +
        '<text x="20" y="28" fill="#38bdf8" font-family="sans-serif" font-size="13" font-weight="bold">Cambridge 9702/22 O/N 24 Q3 — Hinged Wall Shelf</text>' +
        '<rect x="70" y="46" width="16" height="165" fill="#475569"/>' +
        '<rect x="86" y="142" width="380" height="14" rx="3" fill="#334155" stroke="#94a3b8" stroke-width="2"/>' +
        '<circle cx="86" cy="149" r="6" fill="#fbbf24"/><text x="98" y="176" fill="#cbd5e1" font-family="sans-serif" font-size="12">Hinge A (0 m)</text>' +
        '<line x1="276" y1="149" x2="112" y2="54" stroke="#f87171" stroke-width="3"/><text x="215" y="84" fill="#f87171" font-family="sans-serif" font-size="14" font-weight="bold">Wire T = X? (50° at 0.325 m)</text>' +
        '<line x1="276" y1="156" x2="276" y2="212" stroke="#f59e0b" stroke-width="3"/><text x="276" y="228" fill="#f59e0b" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">W = 33 N (0.325 m)</text>' +
        '<line x1="395" y1="156" x2="395" y2="200" stroke="#4ade80" stroke-width="3"/><text x="415" y="216" fill="#4ade80" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">1.5 N (0.53 m)</text></svg>';
    } else if (kind === 'forces') {
      svg = '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="240" viewBox="0 0 560 240">' +
        '<rect width="560" height="240" fill="#0d151c"/>' +
        '<text x="20" y="28" fill="#34d399" font-family="sans-serif" font-size="13" font-weight="bold">Cambridge 9709/41 O/N 24 Q3 — Equilibrium Forces at O</text>' +
        '<line x1="120" y1="125" x2="440" y2="125" stroke="#334155" stroke-dasharray="4,4"/><line x1="280" y1="36" x2="280" y2="220" stroke="#334155" stroke-dasharray="4,4"/>' +
        '<line x1="280" y1="125" x2="395" y2="125" stroke="#60a5fa" stroke-width="3"/><text x="405" y="129" fill="#60a5fa" font-family="sans-serif" font-size="14" font-weight="bold">39 N (0°)</text>' +
        '<line x1="280" y1="125" x2="280" y2="48" stroke="#f87171" stroke-width="3"/><text x="292" y="54" fill="#f87171" font-family="sans-serif" font-size="14" font-weight="bold">52 N (90°)</text>' +
        '<line x1="280" y1="125" x2="195" y2="205" stroke="#fbbf24" stroke-width="3" stroke-dasharray="6,4"/><text x="160" y="216" fill="#fbbf24" font-family="sans-serif" font-size="14" font-weight="bold">X = P N at θ° (find eq.)</text>' +
        '<circle cx="280" cy="125" r="5" fill="#e2e8f0"/></svg>';
    } else {
      svg = '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="240" viewBox="0 0 560 240">' +
        '<rect width="560" height="240" fill="#0d151c"/>' +
        '<text x="20" y="28" fill="#fbbf24" font-family="sans-serif" font-size="13" font-weight="bold">Cambridge 9702 Topic 2 — Projectile Launch</text>' +
        '<line x1="60" y1="196" x2="500" y2="196" stroke="#64748b" stroke-width="2"/>' +
        '<path d="M 80 196 Q 275 40 470 196" fill="none" stroke="#34d399" stroke-width="3" stroke-dasharray="6,5"/>' +
        '<line x1="80" y1="196" x2="155" y2="130" stroke="#fbbf24" stroke-width="3"/>' +
        '<text x="150" y="122" fill="#fbbf24" font-family="sans-serif" font-size="14" font-weight="bold">u = 20 m/s, θ = 30°</text>' +
        '<text x="275" y="105" fill="#38bdf8" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Max height h_max = ?</text>' +
        '<text x="275" y="220" fill="#cbd5e1" font-family="sans-serif" font-size="13" text-anchor="middle">Find max height &amp; range (g = 9.81 m/s²)</text></svg>';
    }
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function getSamples() {
    return [
      {
        id: 'seesaw', label: 'Moments See-Saw (Find Force X)', badge: '9702 Moments',
        text: 'A light uniform plank of length 4.0 m is pivoted at its midpoint x = 2.0 m. A downward force of 300 N acts at 0.50 m from the left end. Another downward force X acts at 3.0 m from the left end so the beam balances. Calculate X.',
        askX: 'Force F₁ = X',
        img: makeSampleSvg('seesaw')
      },
      {
        id: 'shelf', label: '9702/22 O/N 24 Q3 Hinged Shelf', badge: 'Past Paper',
        text: 'A uniform shelf of length 0.65 m and weight 33 N is hinged at wall A (x = 0 m). A load of 1.5 N sits at 0.53 m from the hinge. A supporting wire pulls upwards at 50° above the shelf (130° from +x) attached at 0.325 m. Calculate tension X in the wire.',
        askX: 'Tension X (F₂)',
        img: makeSampleSvg('shelf')
      },
      {
        id: 'forces', label: '9709/41 O/N 24 Q3 Equilibrium Forces', badge: '9709 Forces',
        text: 'Coplanar forces of 39 N at 0° and 52 N at 90° act at point O together with an unknown force X. Find the magnitude and direction of X required for equilibrium.',
        askX: 'Equilibrium Force X',
        img: makeSampleSvg('forces')
      },
      {
        id: 'projectile', label: '9702 Topic 2 Projectile Motion', badge: '9702 Kinematics',
        text: 'A ball is projected from level ground with speed u = 20 m/s at an angle of 30° above the horizontal (g = 9.81 m s⁻²). Calculate the maximum height and horizontal range.',
        askX: 'Max height / Range',
        img: makeSampleSvg('projectile')
      }
    ];
  }

  /* ---------- Client-side OCR helper via lazy CDN Tesseract (if user pastes raw image without Gemini key) ---------- */
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

  /* ---------- Built-in Smart Question Parser & Physics Solver ---------- */
  function classifySim(text) {
    var s = String(text || ''), best = 'forces', bestScore = 0;
    Object.keys(SIM_CATALOG).forEach(function (k) {
      var cat = SIM_CATALOG[k], score = 0;
      var matches = s.match(new RegExp(cat.keywords.source, 'gi'));
      if (matches) score += matches.length * 3;
      if (k === 'moments' && /\b(pivot|hinge|beam|plank|clockwise|support|torque)\b/i.test(s)) score += 6;
      if (k === 'forces' && /\b(coplanar|equilibrium)\b/i.test(s) && !/beam|plank|pivot|hinge|string|slope/.test(s)) score += 4;
      if (k === 'projectile' && /\b(range|height|projected|trajectory)\b/i.test(s)) score += 5;
      if (score > bestScore) { bestScore = score; best = k; }
    });
    return SIM_CATALOG[best];
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
    if (/hinge|hinged/i.test(s)) { xP = 0; }
    else {
      var mP = /(?:pivot|fulcrum)(?:ed)?\s*(?:at)?\s*(?:x\s*=\s*)?(\d+(?:\.\d+)?)\s*(cm|mm|m)\b/i.exec(s);
      if (mP) xP = toSI(Number(mP[1]), mP[2]).v;
      else if (/midpoint|centre/i.test(s)) xP = L / 2;
      else xP = L / 2;
    }

    // Extract force + position pairs near each other
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
      var m130 = /\((\d+(?:\.\d+)?)\s*°\s*from\s*\+x\)/.exec(ctx);
      if (m130) ang = Number(m130[1]);
      loads.push({ F: fv, x: Math.max(0, Math.min(L, dv)), a: ang });
    }

    // Look for explicit unknown X at a position ("force X acts at 3.0 m" or "wire pulls ... at 0.325 m")
    var unkForceIdx = -1;
    var reUnkPos = /(?:unknown\s+(?:force|weight|tension|wire|load)?|wire|[fwtpx]\b)[^.\n;]{0,95}?\bat\s*(?:x\s*=\s*)?(\d+(?:\.\d+)?)\s*(cm|mm|m)\b/gi;
    var mu;
    while ((mu = reUnkPos.exec(s)) !== null) {
      var ux = Math.max(0, Math.min(L, toSI(Number(mu[1]), mu[2]).v));
      var uCtx = s.slice(Math.max(0, mu.index - 20), Math.min(s.length, mu.index + mu[0].length + 40));
      var uAng = /upwards?|wire/i.test(uCtx) ? 90 : -90;
      var uAngM = /(\d+(?:\.\d+)?)\s*°/.exec(uCtx);
      if (uAngM) uAng = /above|wire|up/i.test(uCtx) ? (180 - Number(uAngM[1])) : Number(uAngM[1]);
      var u130 = /\((\d+(?:\.\d+)?)\s*°\s*from\s*\+x\)/.exec(uCtx);
      if (u130) uAng = Number(u130[1]);
      // Attach to an empty slot or replace matching position
      var existing = -1;
      loads.forEach(function (ld, idx) { if (Math.abs(ld.x - ux) < 0.02 && existing < 0) existing = idx; });
      if (existing >= 0) { unkForceIdx = existing; loads[existing].a = uAng; }
      else if (loads.length < 3) { unkForceIdx = loads.length; loads.push({ F: 40, x: ux, a: uAng, isX: true }); }
    }

    if (loads.length === 0) loads.push({ F: 100, x: L * 0.75, a: -90 }, { F: 200, x: L * 0.25, a: -90 });
    while (loads.length < 2) loads.push({ F: 50, x: L * 0.8, a: -90 });

    // Arrange F1, F2, F3
    var f1 = loads[0] || { F: 0, x: 0, a: -90 };
    var f2 = loads[1] || { F: 0, x: 0, a: -90 };
    var f3 = loads[2] || { F: 0, x: 0, a: -90 };
    var unknownKey = 'F1';
    if (unkForceIdx >= 0) unknownKey = 'F' + (unkForceIdx + 1);
    else if (/weight|W\b/i.test(askHint || '') || /find\s+(?:the\s+)?weight/i.test(s)) unknownKey = 'W';
    else if (/tension|wire|F₂|F2/i.test(askHint || '')) unknownKey = 'F2';

    // Exact principle of moments solver preview
    var cwSum = 0, acwSum = 0;
    function mom(F, x, ang) { return (x - xP) * F * Math.sin(ang * Math.PI / 180); }
    var terms = [];
    if (W > 0 && unknownKey !== 'W') {
      var mWeight = mom(W, L / 2, -90);
      if (mWeight < 0) cwSum += -mWeight; else acwSum += mWeight;
      terms.push({ name: 'Beam weight W', F: W, d: Math.abs(L / 2 - xP), dir: mWeight < 0 ? 'CW' : 'ACW', M: Math.abs(mWeight) });
    }
    loads.forEach(function (ld, idx) {
      if (unknownKey === 'F' + (idx + 1)) return;
      var ml = mom(ld.F, ld.x, ld.a);
      if (ml < 0) cwSum += -ml; else acwSum += ml;
      terms.push({ name: 'F' + (idx + 1), F: ld.F, d: Math.abs(ld.x - xP) * Math.abs(Math.sin(ld.a * Math.PI / 180)), dir: ml < 0 ? 'CW' : 'ACW', M: Math.abs(ml) });
    });

    var uSlot = unknownKey === 'W' ? { x: L / 2, a: -90 } : (loads[Number(unknownKey.slice(1)) - 1] || f1);
    var lever = Math.abs(uSlot.x - xP) * Math.abs(Math.sin(uSlot.a * Math.PI / 180));
    var solvedVal = lever > 1e-6 ? Math.abs(cwSum - acwSum) / lever : NaN;
    var steps = [
      { title: 'Take moments about the pivot (x = ' + sf3(xP) + ' m)', equation: 'Σ clockwise moments = Σ anticlockwise moments', explanation: 'Moments about the pivot or hinge eliminate the unknown pivot reaction force cleanly.' },
      { title: 'Compute moments of known forces', equation: terms.map(function (t) { return t.F + ' × ' + sf3(t.d) + ' (' + t.dir + ')'; }).join(' ; ') || 'No other loads', explanation: 'Multiply each force by its perpendicular distance from the pivot: d⊥ = |x − x_pivot| × |sin θ|.' },
      { title: 'Solve for unknown x (' + unknownKey + ')', equation: 'x × ' + sf3(lever) + ' = ' + sf3(Math.abs(cwSum - acwSum)) + ' ⇒ x = ' + sf3(solvedVal) + ' N', explanation: 'Divide the net balancing moment by the perpendicular lever arm of x.' }
    ];
    return {
      sim: SIM_CATALOG.moments,
      title: 'Moments Equilibrium Problem',
      params: { mode: mode, uniform: uniform, L: L, W: W, xG: L / 2, xP: xP, xO: xP, F1: f1.F, x1: f1.x, a1: f1.a, F2: f2.F, x2: f2.x, a2: f2.a, F3: f3.F, x3: f3.x, a3: f3.a },
      unknownKey: unknownKey,
      unknownLabel: unknownKey,
      steps: steps,
      finalAnswer: isFinite(solvedVal) ? unknownKey + ' = ' + sf3(solvedVal) + ' N' : 'Inspect on live simulation'
    };
  }

  function parseForcesProblem(text) {
    var s = String(text || '');
    var pairs = [], re = /(\d+(?:\.\d+)?)\s*(kN|N)\s*(?:at|@|acting)?\s*(\d+(?:\.\d+)?)\s*°/gi, m;
    while ((m = re.exec(s)) !== null && pairs.length < 4) {
      pairs.push([toSI(Number(m[1]), m[2]).v, Number(m[3]) % 360]);
    }
    while (pairs.length < 2) pairs.push([15, pairs.length * 90]);
    var n = Math.min(5, pairs.length + (/unknown|equilibrium|find\s+[a-z]/i.test(s) ? 1 : 0));
    var params = { n: n, mode: 'resultant' };
    var rx = 0, ry = 0;
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
    var eqF = Math.hypot(rx, ry);
    var eqAng = ((Math.atan2(-ry, -rx) * 180 / Math.PI) + 360) % 360;
    var unknownKey = n > pairs.length ? 'F' + pairs.length : 'F0';
    return {
      sim: SIM_CATALOG.forces,
      title: 'Coplanar Forces & Equilibrium',
      params: params,
      unknownKey: unknownKey,
      unknownLabel: 'F' + (Number(unknownKey.slice(1)) + 1),
      steps: [
        { title: 'Resolve known forces horizontally (X) and vertically (Y)', equation: 'ΣX_known = ' + sf3(rx) + ' N, ΣY_known = ' + sf3(ry) + ' N', explanation: 'Split each vector into F cos θ horizontally and F sin θ vertically (θ anticlockwise from +x).' },
        { title: 'Apply equilibrium conditions ΣX = 0 and ΣY = 0', equation: 'X_missing = −' + sf3(rx) + ' N, Y_missing = −' + sf3(ry) + ' N', explanation: 'The unknown force must cancel the resultant of the known forces.' },
        { title: 'Find magnitude and angle via Pythagoras & tan⁻¹', equation: '|X| = √(' + sf3(rx) + '² + ' + sf3(ry) + '²) = ' + sf3(eqF) + ' N at ' + sf3(eqAng) + '°', explanation: 'Combine X and Y perpendicularly to obtain exact equilibrium magnitude and quadrant.' }
      ],
      finalAnswer: 'Equilibrium force = ' + sf3(eqF) + ' N at ' + sf3(eqAng) + '°'
    };
  }

  function parseProjectileProblem(text) {
    var s = String(text || '');
    var mu = /(?:speed|velocity|u)\s*(?:=|of|is)?\s*(\d+(?:\.\d+)?)\s*(m\/s|ms-1|km\/h)/i.exec(s) || /(\d+(?:\.\d+)?)\s*(m\/s|km\/h)/i.exec(s);
    var u = mu ? Number(toSI(Number(mu[1]), mu[2]).v.toFixed(3)) : 20;
    var mth = /(\d+(?:\.\d+)?)\s*°/.exec(s);
    var th = mth ? Number(mth[1]) : 30;
    var mh = /(?:cliff|height|tower|from\s*a\s*height)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*(cm|m)\b/i.exec(s);
    var h0 = mh ? toSI(Number(mh[1]), mh[2]).v : 0;
    var g = 9.81, ux = u * Math.cos(th * Math.PI / 180), uy = u * Math.sin(th * Math.PI / 180);
    var hMax = h0 + (uy * uy) / (2 * g);
    var tFlight = (uy + Math.sqrt(uy * uy + 2 * g * h0)) / g;
    var range = ux * tFlight;
    return {
      sim: SIM_CATALOG.projectile,
      title: 'Projectile Motion (2D SUVAT)',
      params: { u: u, th: th, h0: h0 },
      unknownKey: 'u',
      unknownLabel: 'Launch speed u',
      steps: [
        { title: 'Resolve initial velocity u = ' + sf3(u) + ' m/s at ' + sf3(th) + '°', equation: 'u_x = ' + sf3(u) + ' cos ' + th + '° = ' + sf3(ux) + ' m/s · u_y = ' + sf3(u) + ' sin ' + th + '° = ' + sf3(uy) + ' m/s', explanation: 'Horizontal and vertical motions are independent; only gravity acts vertically.' },
        { title: 'Find maximum height (vertical v_y = 0)', equation: '0 = u_y² − 2g(h − h₀) ⇒ h_max = ' + sf3(hMax) + ' m', explanation: 'At the peak, vertical velocity momentarily drops to zero.' },
        { title: 'Find time of flight and horizontal range', equation: 't = ' + sf3(tFlight) + ' s · Range R = u_x × t = ' + sf3(range) + ' m', explanation: 'Horizontal acceleration is zero, so x = u_x t.' }
      ],
      finalAnswer: 'h_max = ' + sf3(hMax) + ' m, Range = ' + sf3(range) + ' m (t = ' + sf3(tFlight) + ' s)'
    };
  }

  function genericExtract(sim, text) {
    var s = String(text || ''), params = {}, used = {};
    var reAll = /(-?\d+(?:\.\d+)?)\s*(kN|N|cm|mm|km\/h|m\/s|km|m|kg|g|kHz|Hz|kΩ|Ω|V|°)\b/g, tok;
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
        { title: 'Identify scenario: ' + sim.title, equation: Object.keys(params).map(function (k) { return k + ' = ' + params[k]; }).join(', ') || 'Default setup loaded', explanation: 'Detected values converted to SI units and mapped to simulation parameters.' },
        { title: 'Open live simulation & solve unknown x', equation: 'Interactive vector / graph working synced inside stage', explanation: 'Press Play Steps or Calculate x on the simulation stage to inspect the exact derivation.' }
      ],
      finalAnswer: 'Loaded ' + Object.keys(params).length + ' SI parameters into ' + sim.title
    };
  }

  function analyzeLocally(questionText, imgDataUrl, askHint, onStatus) {
    function solveText(txt) {
      var clean = String(txt || '').trim();
      if (!clean) throw new Error('Please paste question text or drop a clearer screenshot image.');
      var sim = classifySim(clean);
      if (sim.id === 'moments') return parseMomentsProblem(clean, askHint);
      if (sim.id === 'forces') return parseForcesProblem(clean);
      if (sim.id === 'projectile') return parseProjectileProblem(clean);
      return genericExtract(sim, clean);
    }
    var txt = String(questionText || '').trim();
    if (txt) {
      return Promise.resolve(solveText(txt));
    }
    if (imgDataUrl) {
      return ocrImage(imgDataUrl, onStatus).then(function (ocrText) {
        var r = solveText(ocrText);
        r.ocrText = ocrText;
        return r;
      });
    }
    return Promise.reject(new Error('Upload a screenshot or enter a question to analyze.'));
  }

  function analyzeWithGemini(apiKey, imgDataUrl, questionText, askHint) {
    if (!apiKey || typeof fetch !== 'function') return Promise.reject(new Error('Gemini API key or fetch unavailable'));
    var parts = [];
    var catalogDesc = Object.keys(SIM_CATALOG).map(function (k) {
      var c = SIM_CATALOG[k];
      return '- id "' + k + '" (' + c.title + '): params = [' + c.params.map(function (p) { return p.key + ' (' + p.label + (p.unit ? ', ' + p.unit : '') + ')'; }).join(', ') + ']';
    }).join('\n');

    var prompt = 'You are an expert Cambridge A-Level (9709 Mechanics & 9702 AS Physics) tutor.\n' +
      'Analyze the provided physics question screenshot and/or text. Choose the best matching simulation from the catalog below, extract ALL known values converted to SI units (N, m, kg, s, °, Hz, Ω, V), mark which single parameter key is the unknown x being solved ("unknownKey"), and produce crisp step-by-step algebraic + numerical working.\n\n' +
      'Simulation catalog:\n' + catalogDesc + '\n\n' +
      (questionText ? 'Student text/notes: ' + questionText + '\n' : '') +
      (askHint ? 'Student is trying to find: ' + askHint + '\n' : '') +
      '\nReturn STRICT JSON matching this schema:\n' +
      '{"simId":"moments|forces|strings|plane|pulley|projectile|collisions|waves|circuits","title":"short title","params":{},"unknownKey":"key from params","unknownLabel":"human label","finalAnswer":"e.g. X = 450 N","steps":[{"title":"Step title","equation":"formula = substitution = result","explanation":"concise reason"}]}';

    parts.push({ text: prompt });
    if (imgDataUrl && /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(imgDataUrl)) {
      var seg = imgDataUrl.split(';base64,');
      var mime = seg[0].replace(/^data:/, '');
      parts.push({ inlineData: { mimeType: mime, data: seg[1] } });
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
      return {
        sim: sim,
        title: parsed.title || sim.title,
        params: parsed.params || {},
        unknownKey: parsed.unknownKey || '',
        unknownLabel: parsed.unknownLabel || parsed.unknownKey || 'x',
        steps: Array.isArray(parsed.steps) ? parsed.steps : [],
        finalAnswer: parsed.finalAnswer || '',
        usedAi: true
      };
    });
  }

  function buildSimUrl(result, opts) {
    opts = opts || {};
    var sim = result && result.sim ? result.sim : SIM_CATALOG.forces;
    var p = result && result.params ? result.params : {};
    var theme = opts.theme || 'dark';
    var pairs = [];
    Object.keys(p).forEach(function (k) {
      if (p[k] !== undefined && p[k] !== null && p[k] !== '') pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(p[k]));
    });
    if (result.unknownKey) pairs.push('markX=' + encodeURIComponent(result.unknownKey));
    if (opts.autoSolve) pairs.push('autoSolve=1');
    else if (opts.autoStudio) pairs.push('autoStudio=1');
    return sim.path + '&theme=' + encodeURIComponent(theme) + '&v=5' + (pairs.length ? '#' + pairs.join('&') : '');
  }

  root.SIM = root.SIM || {};
  root.SIM.SOLVER = {
    SIM_CATALOG: SIM_CATALOG,
    getApiKey: getApiKey,
    setApiKey: setApiKey,
    getSamples: getSamples,
    analyzeLocally: analyzeLocally,
    analyzeWithGemini: analyzeWithGemini,
    buildSimUrl: buildSimUrl
  };
})(typeof self !== 'undefined' ? self : this);
