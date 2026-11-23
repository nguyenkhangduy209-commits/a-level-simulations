/* ============================================================================
   SIM.PROGRESS — Curriculum Map, Mastery Quests, Unlockables, Audio & Shell
   Zero-dependency learning progression engine backed by localStorage.
   ============================================================================ */
(function (root) {
  'use strict';
  var KEY = 'alevel-progress-v1';
  var UI_KEY = 'alevel-ui-prefs-v1';
  var UI_DEFAULTS = { nav: 'auto', glass: 'matte', fx: true, density: 'comfortable' };

  /* ---------- UI Preferences & Ambient Physics Constellation ---------- */
  function getUiPrefs() {
    var out = { nav: UI_DEFAULTS.nav, glass: UI_DEFAULTS.glass, fx: UI_DEFAULTS.fx, density: UI_DEFAULTS.density };
    try {
      var raw = root.localStorage && root.localStorage.getItem(UI_KEY);
      if (raw) {
        var obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') {
          if (/^(auto|dock|island|orbit|sidebar)$/.test(obj.nav)) out.nav = obj.nav;
          if (/^(matte|glass|cyber)$/.test(obj.glass)) out.glass = obj.glass;
          if (typeof obj.fx === 'boolean') out.fx = obj.fx;
          if (/^(comfortable|compact)$/.test(obj.density)) out.density = obj.density;
        }
      }
    } catch (e) { /* ignore */ }
    return out;
  }
  function setUiPrefs(patch) {
    var cur = getUiPrefs(), p = patch || {};
    if (p.nav && /^(auto|dock|island|orbit|sidebar)$/.test(p.nav)) cur.nav = p.nav;
    if (p.glass && /^(matte|glass|cyber)$/.test(p.glass)) cur.glass = p.glass;
    if (typeof p.fx === 'boolean') cur.fx = p.fx;
    if (p.density && /^(comfortable|compact)$/.test(p.density)) cur.density = p.density;
    try { if (root.localStorage) root.localStorage.setItem(UI_KEY, JSON.stringify(cur)); } catch (e) { /* ignore */ }
    applyUiPrefs();
    return cur;
  }
  var fxState = { raf: null, cv: null, pts: [], mx: -9999, my: -9999 };
  function stopAmbientFx() {
    if (fxState.raf && typeof root.cancelAnimationFrame === 'function') root.cancelAnimationFrame(fxState.raf);
    fxState.raf = null;
    if (fxState.cv && fxState.cv.parentNode) fxState.cv.parentNode.removeChild(fxState.cv);
    fxState.cv = null;
  }
  function startAmbientFx() {
    if (typeof document === 'undefined' || !document.body || typeof root.requestAnimationFrame !== 'function') return;
    if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) { stopAmbientFx(); return; }
    if (!document.body.classList.contains('app-body')) return;
    if (fxState.cv && document.body.contains(fxState.cv)) return;
    var cv = document.createElement('canvas');
    cv.id = 'ambientFxCanvas';
    cv.className = 'ambient-fx-canvas';
    cv.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(cv, document.body.firstChild);
    fxState.cv = cv;
    var ctx = cv.getContext('2d');
    var N = 26;
    function seed() {
      var W = root.innerWidth || 1280, H = root.innerHeight || 800;
      cv.width = W; cv.height = H;
      if (!fxState.pts.length) {
        for (var i = 0; i < N; i++) {
          fxState.pts.push({
            x: Math.random() * W, y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.42, vy: (Math.random() - 0.5) * 0.42,
            r: 1.3 + Math.random() * 1.9, gold: i % 3 === 0
          });
        }
      }
    }
    seed();
    if (!startAmbientFx._bound) {
      startAmbientFx._bound = true;
      root.addEventListener('resize', function () { if (fxState.cv) seed(); });
      document.addEventListener('pointermove', function (e) { fxState.mx = e.clientX; fxState.my = e.clientY; }, { passive: true });
    }
    function tick() {
      if (!fxState.cv) return;
      var W = cv.width, H = cv.height, isLight = document.documentElement.getAttribute('data-theme') === 'light';
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < fxState.pts.length; i++) {
        var a = fxState.pts[i];
        var dxm = fxState.mx - a.x, dym = fxState.my - a.y, dm = Math.hypot(dxm, dym);
        if (dm > 12 && dm < 160) { a.vx += (dxm / dm) * 0.008; a.vy += (dym / dm) * 0.008; }
        a.vx *= 0.992; a.vy *= 0.992;
        if (Math.hypot(a.vx, a.vy) < 0.14) { a.vx += (Math.random() - 0.5) * 0.04; a.vy += (Math.random() - 0.5) * 0.04; }
        a.x = (a.x + a.vx + W) % W; a.y = (a.y + a.vy + H) % H;
        for (var j = i + 1; j < fxState.pts.length; j++) {
          var b = fxState.pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 150) {
            ctx.strokeStyle = isLight ? 'rgba(217, 119, 6, ' + ((1 - d / 150) * 0.14).toFixed(3) + ')' : 'rgba(45, 212, 191, ' + ((1 - d / 150) * 0.16).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        ctx.fillStyle = a.gold ? (isLight ? 'rgba(245, 158, 11, 0.45)' : 'rgba(250, 204, 21, 0.48)') : (isLight ? 'rgba(180, 130, 30, 0.3)' : 'rgba(45, 212, 191, 0.42)');
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
      }
      fxState.raf = root.requestAnimationFrame(tick);
    }
    fxState.raf = root.requestAnimationFrame(tick);
  }
  function applyUiPrefs() {
    if (typeof document === 'undefined' || !document.documentElement) return;
    var p = getUiPrefs(), d = document.documentElement;
    d.setAttribute('data-ui-nav', p.nav);
    d.setAttribute('data-ui-glass', p.glass);
    d.setAttribute('data-ui-density', p.density);
    if (p.fx) startAmbientFx(); else stopAmbientFx();
    if (typeof root.dispatchEvent === 'function' && typeof root.CustomEvent === 'function') {
      try { root.dispatchEvent(new root.CustomEvent('sim-ui-change', { detail: p })); } catch (e) { /* ignore */ }
    }
  }

  /* ---------- SVG Icon Library (crisp 24x24 line icons) ---------- */
  var ICONS = {
    'learn-eq': '<path d="M12 3v5"/><path d="M4 19l8-11 8 11"/><circle cx="12" cy="14" r="2.2"/><path d="M12 16.2V21"/>',
    forces: '<path d="M12 12 L20 6M12 12 L4 9M12 12 V21"/><circle cx="12" cy="12" r="2.2"/>',
    kinematics: '<path d="M3 19 L9 7 L15 7 L21 19"/><path d="M3 19h18"/>',
    newton: '<path d="M3 20 L21 8 V20 Z"/><rect x="10.5" y="9.5" width="5" height="4" transform="rotate(-34 13 12)"/>',
    power: '<rect x="3" y="11" width="11" height="6" rx="1.5"/><circle cx="6.5" cy="18.5" r="1.6"/><circle cx="12" cy="18.5" r="1.6"/><path d="M14 14h4l3 3"/>',
    energy: '<path d="M13 2 L5 14h6l-1 8 8-12h-6z"/>',
    momentum: '<circle cx="7.5" cy="12" r="4"/><circle cx="16.5" cy="12" r="4"/><path d="M1.5 12h2M20.5 12h2"/>',
    uncertainty: '<path d="M4 19h16M7 19V9M12 19V5M17 19v-7"/><path d="M5 9h4M10 5h4M15 12h4"/>',
    kinematics2d: '<path d="M3 20 Q 11 -2 19 20"/><circle cx="4" cy="19" r="1.8"/>',
    dynamics: '<circle cx="7" cy="12" r="4"/><path d="M11 12h10M18 9l3 3-3 3"/>',
    'forces-p': '<path d="M2 14h20"/><path d="M12 14 l-3 6h6z"/><path d="M5 14V7M19 14V9"/>',
    'energy-p': '<path d="M4 18 L10 12 L14 15 L20 6"/><path d="M15 6h5v5"/>',
    deformation: '<path d="M12 3v3M12 6 l-4 2 8 2-8 2 8 2-8 2 4 2v3"/>',
    waves: '<path d="M2 12 q 2.5 -6 5 0 t 5 0 t 5 0 t 5 0"/>',
    superposition: '<path d="M2 9 q 2.5 -4 5 0 t 5 0 t 5 0 t 5 0"/><path d="M2 15 q 2.5 4 5 0 t 5 0 t 5 0 t 5 0"/>',
    electricity: '<path d="M3 12h4M17 12h4M7 9h10v6H7z"/>',
    particles: '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="9" ry="4"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)"/>',
    spark: '<path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>',
    solver: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3"/><path d="M7 9l3 3-3 3M13 15h4"/>',
    map: '<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>',
    vault: '<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1.5"/>',
    trophy: '<path d="M6 9H4a2 2 0 0 1-2-2V5h4M18 9h2a2 2 0 0 0 2-2V5h-4"/><path d="M6 4h12v6a6 6 0 0 1-12 0V4z"/><path d="M12 16v5M8 21h8"/>',
    dash: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    mech: '<path d="M4 18 L20 8 V18 Z"/><circle cx="19" cy="7" r="2"/>',
    phys: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(-30 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(30 12 12)"/>'
  };
  function svg(id, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[id] || ICONS.spark) + '</svg>';
  }

  /* ---------- 17 Curriculum Nodes (matching catalog/groups.js + guided lesson) ---------- */
  var NODES = [
    {
      id: 'learn-eq', course: '9709', title: 'Equilibrium First Lesson', short: 'Two Strings', syllabus: '9709 4.1 Start',
      url: 'learn/equilibrium.html', prereqs: [], pos: { x: 11, y: 24 }, tags: ['#equilibrium', '#basics', '#g=10'],
      modes: [{ id: 'lesson', label: '11-step guided lesson' }],
      relic: { id: 'plummet', name: 'Archimedes Plumb Line', fact: 'Used for 4,000 years to establish true vertical gravity vectors.' },
      quiz: [
        { q: 'A 2 kg mass hangs in equilibrium from two strings at 35° and 40° to the horizontal. What is the horizontal equilibrium equation (g = 10)?', opts: ['T₁ cos 35° = T₂ cos 40°', 'T₁ sin 35° = T₂ sin 40°', 'T₁ + T₂ = 20 N', 'T₁ cos 35° + T₂ cos 40° = 20'], ans: 0, why: 'Horizontal forces must balance: the leftward pull T₁ cos 35° equals the rightward pull T₂ cos 40°.' },
        { q: 'Which string carries the larger tension when one string is steeper than the other?', opts: ['The steeper string (larger angle to horizontal)', 'The shallower string', 'Both tensions are always equal', 'Neither; weight cancels tension'], ans: 0, why: 'Since T₁ cos α = T₂ cos β, a larger angle α means smaller cos α, so T₁ must be larger.' }
      ]
    },
    {
      id: 'forces', course: '9709', title: 'Forces & Equilibrium', short: 'Forces 4.1', syllabus: '9709 4.1',
      url: 'group.html?g=forces', prereqs: ['learn-eq'], pos: { x: 25, y: 18 }, tags: ['#resolving', '#friction', '#strings'],
      relic: { id: 'compass', name: 'Vector Compass', fact: 'Any 2D force vector splits cleanly into perpendicular X and Y components.' },
      quiz: [
        { q: 'A block of mass 5 kg rests on a rough horizontal floor (μ = 0.4, g = 10). What is the maximum friction force F_max?', opts: ['20 N', '50 N', '12.5 N', '2 N'], ans: 0, why: 'R = mg = 50 N, so F_max = μR = 0.4 × 50 = 20 N.' },
        { q: 'If three coplanar forces keep a ring in equilibrium, what must their vector sum equal?', opts: ['Zero in both X and Y directions', 'Equal to mg', 'μR', 'Half the largest force'], ans: 0, why: 'Equilibrium requires ΣF_x = 0 and ΣF_y = 0 simultaneously.' }
      ]
    },
    {
      id: 'kinematics', course: '9709', title: 'Straight-Line Motion', short: 'Kinematics 4.2', syllabus: '9709 4.2',
      url: 'group.html?g=kinematics', prereqs: ['learn-eq'], pos: { x: 25, y: 36 }, tags: ['#suvat', '#vt-graph', '#calculus'],
      relic: { id: 'chronograph', name: 'Galileo Chronograph', fact: 'Area under a velocity–time graph always yields total displacement.' },
      quiz: [
        { q: 'A particle accelerates uniformly from 4 m/s to 16 m/s in 6 s. What distance does it travel?', opts: ['60 m', '48 m', '96 m', '72 m'], ans: 0, why: 'Use s = ½(u + v)t = ½(4 + 16) × 6 = 60 m.' },
        { q: 'Given v = 3t² − 12t, how do you find the acceleration at t = 3 s?', opts: ['Differentiate v to get a = 6t − 12 = 6 m/s²', 'Integrate v with respect to t', 'Divide v by t', 'Set v = 0'], ans: 0, why: 'Acceleration is the time derivative of velocity: a = dv/dt = 6t − 12.' }
      ]
    },
    {
      id: 'newton', course: '9709', title: 'Slopes, Pulleys & Lifts', short: 'Newton 4.4', syllabus: '9709 4.4',
      url: 'group.html?g=newton', prereqs: ['forces', 'kinematics'], pos: { x: 42, y: 20 }, tags: ['#F=ma', '#pulleys', '#slopes'],
      relic: { id: 'pulley', name: 'Atwood Brass Pulley', fact: 'A light smooth pulley transmits equal string tension on both sides.' },
      quiz: [
        { q: 'A 3 kg mass slides down a smooth 30° slope (g = 10). What is its acceleration?', opts: ['5.0 m/s²', '8.66 m/s²', '10.0 m/s²', '3.0 m/s²'], ans: 0, why: 'Along the slope: mg sin 30° = ma, so a = g sin 30° = 10 × 0.5 = 5 m/s².' },
        { q: 'In a lift accelerating upwards at 2 m/s², what is the reaction on a 60 kg passenger (g = 10)?', opts: ['720 N', '600 N', '480 N', '120 N'], ans: 0, why: 'R − mg = ma ⇒ R = 60(10 + 2) = 720 N.' }
      ]
    },
    {
      id: 'power', course: '9709', title: 'Vehicles, Towing & Power', short: 'Power 4.5', syllabus: '9709 4.4–4.5',
      url: 'group.html?g=power', prereqs: ['newton'], pos: { x: 58, y: 14 }, tags: ['#P=Fv', '#towing', '#max-speed'],
      relic: { id: 'turbine', name: 'Watt Governor Gear', fact: 'Maximum speed occurs when driving force F = P/v exactly balances resistance.' },
      quiz: [
        { q: 'A car engine delivers 24 kW while travelling at a steady 20 m/s on a level road. What is the resistance force?', opts: ['1200 N', '480 N', '120 N', '2400 N'], ans: 0, why: 'At steady speed, driving force equals resistance: F = P / v = 24000 / 20 = 1200 N.' },
        { q: 'If a car tows a trailer with a rigid tow-bar, which force acts forward on the trailer?', opts: ['Tension T in the tow-bar', 'Car driving force D directly', 'Normal reaction only', 'Air resistance'], ans: 0, why: 'Only the tow-bar connects the trailer, exerting forward tension T.' }
      ]
    },
    {
      id: 'energy', course: '9709', title: 'Work & Energy', short: 'Energy 4.5', syllabus: '9709 4.5',
      url: 'group.html?g=energy', prereqs: ['newton'], pos: { x: 58, y: 29 }, tags: ['#work-energy', '#GPE', '#KE'],
      relic: { id: 'joule', name: 'Joule Paddle Wheel', fact: 'Work done by non-conservative forces equals ΔKE + ΔPE.' },
      quiz: [
        { q: 'A 4 kg block starts from rest and drops vertically by 5 m with no air resistance (g = 10). What is its KE?', opts: ['200 J', '100 J', '40 J', '400 J'], ans: 0, why: 'Loss in GPE converts to KE: mgh = 4 × 10 × 5 = 200 J.' },
        { q: 'When a block slides up a rough slope, how does friction affect mechanical energy?', opts: ['Reduces total KE + GPE by F × distance', 'Increases GPE', 'Has zero work done', 'Only changes momentum'], ans: 0, why: 'Work done against friction converts mechanical energy into thermal energy.' }
      ]
    },
    {
      id: 'momentum', course: '9709', title: 'Momentum & Collisions', short: 'Momentum 4.3', syllabus: '9709 4.3',
      url: 'group.html?g=momentum', prereqs: ['kinematics'], pos: { x: 42, y: 39 }, tags: ['#impulse', '#collisions', '#coalesce'],
      relic: { id: 'cradle', name: 'Newton’s Cradle Sphere', fact: 'Total linear momentum is conserved in every isolated collision.' },
      quiz: [
        { q: 'A 2 kg trolley moving at 6 m/s hits and sticks to a stationary 4 kg trolley. What is their common speed?', opts: ['2.0 m/s', '3.0 m/s', '4.0 m/s', '1.5 m/s'], ans: 0, why: '2 × 6 = (2 + 4)V ⇒ V = 12 / 6 = 2.0 m/s.' },
        { q: 'In a perfectly inelastic (coalescing) collision between moving objects, what happens to total KE?', opts: ['Total KE decreases', 'Total KE increases', 'Total KE stays identical', 'Momentum becomes zero'], ans: 0, why: 'Kinetic energy is dissipated as sound, heat, and deformation.' }
      ]
    },

    /* ---------------- 9702 AS Physics Nebula ---------------- */
    {
      id: 'uncertainty', course: '9702', title: 'Errors & Uncertainties', short: 'Topic 1', syllabus: '9702 Topic 1',
      url: 'group.html?g=uncertainty', prereqs: [], pos: { x: 11, y: 74 }, tags: ['#precision', '#percentage', '#error-bars'],
      relic: { id: 'vernier', name: 'Vernier Caliper Key', fact: 'When multiplying or dividing quantities, add their percentage uncertainties.' },
      quiz: [
        { q: 'If speed v = d / t where d has ±2% uncertainty and t has ±3% uncertainty, what is the % uncertainty in v?', opts: ['±5%', '±1%', '±6%', '±2.5%'], ans: 0, why: 'Percentage uncertainties add for products and quotients: 2% + 3% = 5%.' },
        { q: 'A set of readings are tightly clustered around 9.10 m/s² when true g = 9.81 m/s². They are:', opts: ['Precise but not accurate', 'Accurate but not precise', 'Both accurate and precise', 'Randomly scattered'], ans: 0, why: 'Small spread = high precision; offset from true value = systematic error (low accuracy).' }
      ]
    },
    {
      id: 'kinematics2d', course: '9702', title: 'Kinematics 1-D & 2-D', short: 'Topic 2', syllabus: '9702 Topic 2',
      url: 'group.html?g=kinematics2d', prereqs: ['uncertainty'], pos: { x: 25, y: 64 }, tags: ['#projectile', '#vectors', '#g=9.81'],
      relic: { id: 'sextant', name: 'Ballistic Sextant', fact: 'In ideal projectile motion, horizontal velocity remains constant while vertical velocity accelerates at g.' },
      quiz: [
        { q: 'At the highest point of an angled projectile’s trajectory, what is its acceleration?', opts: ['9.81 m/s² downwards', 'Zero', 'Horizontal only', '9.81 m/s² upwards'], ans: 0, why: 'Gravity acts downwards continuously at g = 9.81 m/s² even when v_y = 0.' },
        { q: 'Which launch angle gives the maximum horizontal range on level ground (ignoring drag)?', opts: ['45°', '30°', '60°', '90°'], ans: 0, why: 'Range R = (u² sin 2θ)/g peaks when sin 2θ = 1, i.e., θ = 45°.' }
      ]
    },
    {
      id: 'dynamics', course: '9702', title: 'Dynamics & Momentum', short: 'Topic 3', syllabus: '9702 Topic 3',
      url: 'group.html?g=dynamics', prereqs: ['kinematics2d'], pos: { x: 40, y: 60 }, tags: ['#drag', '#terminal-v', '#2D-impact'],
      relic: { id: 'gyro', name: 'Momentum Gyroscope', fact: 'Resultant force equals the rate of change of momentum: F = Δp / Δt.' },
      quiz: [
        { q: 'A skydiver reaches terminal velocity. What is true about the forces acting on them?', opts: ['Air resistance equals weight (net force = 0)', 'Air resistance is zero', 'Weight becomes zero', 'Acceleration equals 9.81 m/s²'], ans: 0, why: 'Zero acceleration at terminal velocity requires balanced drag and weight.' },
        { q: 'In an elastic 1-D collision between two bodies, what equals the relative speed of approach?', opts: ['Relative speed of separation', 'Sum of masses', 'Half the impact speed', 'Zero'], ans: 0, why: 'Conservation of momentum and KE implies u₁ − u₂ = v₂ − v₁.' }
      ]
    },
    {
      id: 'forces-p', course: '9702', title: 'Forces, Moments & Pressure', short: 'Topic 4', syllabus: '9702 Topic 4',
      url: 'group.html?g=forces-p', prereqs: ['uncertainty'], pos: { x: 25, y: 86 }, tags: ['#moments', '#torque', '#upthrust'],
      relic: { id: 'fulcrum', name: 'Archimedes Lever Crown', fact: 'Upthrust on a submerged object equals the weight of fluid it displaces.' },
      quiz: [
        { q: 'What two conditions define complete static equilibrium of a rigid beam?', opts: ['Zero resultant force AND zero resultant moment', 'Zero mass AND zero weight', 'Equal velocities only', 'Horizontal alignment only'], ans: 0, why: 'Both translational equilibrium (ΣF = 0) and rotational equilibrium (ΣM = 0) are needed.' },
        { q: 'Hydrostatic pressure at depth h in a fluid of density ρ is given by:', opts: ['Δp = ρgh', 'Δp = ρg/h', 'Δp = ½ρv²', 'Δp = F × A'], ans: 0, why: 'Column weight per unit area gives Δp = ρgh.' }
      ]
    },
    {
      id: 'energy-p', course: '9702', title: 'Work, Energy & Power', short: 'Topic 5', syllabus: '9702 Topic 5',
      url: 'group.html?g=energy-p', prereqs: ['dynamics', 'forces-p'], pos: { x: 42, y: 80 }, tags: ['#efficiency', '#power', '#conservation'],
      relic: { id: 'dynamo', name: 'Faraday Dynamo Core', fact: 'Efficiency = (useful power output / total power input) × 100%.' },
      quiz: [
        { q: 'A motor takes 500 W electrical power and lifts a 200 N load at 1.5 m/s. What is its efficiency?', opts: ['60%', '75%', '40%', '85%'], ans: 0, why: 'Useful power P_out = Fv = 200 × 1.5 = 300 W; efficiency = 300 / 500 = 60%.' },
        { q: 'Which quantity equals Force × displacement × cos θ?', opts: ['Work done W', 'Impulse J', 'Torque τ', 'Momentum p'], ans: 0, why: 'Only the component of force along the displacement performs mechanical work.' }
      ]
    },
    {
      id: 'deformation', course: '9702', title: 'Deformation of Solids', short: 'Topic 6', syllabus: '9702 Topic 6',
      url: 'group.html?g=deformation', prereqs: ['forces-p'], pos: { x: 56, y: 89 }, tags: ['#hooke', '#young-modulus', '#strain'],
      relic: { id: 'spring', name: 'Hooke Helical Coil', fact: 'The area under a Force–Extension graph stores elastic potential energy ½Fx.' },
      quiz: [
        { q: 'Two identical springs (constant k each) are connected in parallel. What is their combined spring constant?', opts: ['2k', 'k/2', 'k', '4k'], ans: 0, why: 'Parallel springs share load equally, requiring double force for the same extension.' },
        { q: 'What does the gradient of a stress–strain graph in the linear region equal?', opts: ['Young modulus E', 'Spring constant k', 'Elastic potential energy', 'Ultimate tensile strength'], ans: 0, why: 'E = stress / strain inside the proportional limit.' }
      ]
    },
    {
      id: 'waves', course: '9702', title: 'Waves & Doppler', short: 'Topic 7', syllabus: '9702 Topic 7',
      url: 'group.html?g=waves', prereqs: ['dynamics'], pos: { x: 58, y: 63 }, tags: ['#v=fλ', '#CRO', '#doppler'],
      relic: { id: 'tuning', name: 'Resonance Tuning Fork', fact: 'Wave intensity is proportional to the square of amplitude (I ∝ A²).' },
      quiz: [
        { q: 'If a wave’s amplitude is tripled, by what factor does its intensity increase?', opts: ['9×', '3×', '6×', '√3×'], ans: 0, why: 'Intensity I ∝ A², so 3² = 9 times greater.' },
        { q: 'An ambulance siren moves towards a stationary observer. Compared to the source frequency, the observed frequency is:', opts: ['Higher', 'Lower', 'Unchanged', 'Zero'], ans: 0, why: 'Wavefronts compress ahead of the moving source, shortening wavelength and raising frequency.' }
      ]
    },
    {
      id: 'superposition', course: '9702', title: 'Superposition & Gratings', short: 'Topic 8', syllabus: '9702 Topic 8',
      url: 'group.html?g=superposition', prereqs: ['waves'], pos: { x: 74, y: 58 }, tags: ['#standing-waves', '#diffraction', '#d sinθ = nλ'],
      relic: { id: 'prism', name: 'Diffraction Grating Prism', fact: 'Path difference of nλ produces constructive interference maxima.' },
      quiz: [
        { q: 'What is the distance between two adjacent nodes on a stationary wave of wavelength λ?', opts: ['λ / 2', 'λ', 'λ / 4', '2λ'], ans: 0, why: 'Successive nodes are half a wavelength apart.' },
        { q: 'In a double-slit experiment with fringe separation x = λD / a, doubling slit separation a makes fringes:', opts: ['Half as wide', 'Twice as wide', 'Four times wider', 'Unchanged'], ans: 0, why: 'Fringe spacing x is inversely proportional to slit separation a.' }
      ]
    },
    {
      id: 'electricity', course: '9702', title: 'Electricity & D.C. Circuits', short: 'Topics 9–10', syllabus: '9702 Topics 9–10',
      url: 'group.html?g=electricity', prereqs: ['energy-p'], pos: { x: 74, y: 78 }, tags: ['#kirchhoff', '#emf', '#divider'],
      relic: { id: 'volta', name: 'Voltaic Golden Cell', fact: 'Terminal p.d. V = E − Ir drops as current increases across internal resistance r.' },
      quiz: [
        { q: 'Kirchhoff’s Second Law (ΣE = ΣIR around any closed loop) expresses conservation of:', opts: ['Energy', 'Charge', 'Momentum', 'Mass'], ans: 0, why: 'Energy supplied per unit charge equals total p.d. dropped around a closed loop.' },
        { q: 'In a potential divider with R₁ = 3 kΩ and R₂ = 6 kΩ across 9 V, what is V_out across R₂?', opts: ['6.0 V', '3.0 V', '4.5 V', '9.0 V'], ans: 0, why: 'V_out = 9 × (6 / (3 + 6)) = 6.0 V.' }
      ]
    },
    {
      id: 'particles', course: '9702', title: 'Particle Physics', short: 'Topic 11', syllabus: '9702 Topic 11',
      url: 'group.html?g=particles', prereqs: ['superposition', 'electricity'], pos: { x: 89, y: 68 }, tags: ['#quarks', '#alpha', '#beta-decay'],
      relic: { id: 'quark', name: 'Quark Triplet Crystal', fact: 'A proton is uud (+1e) while a neutron is udd (0e).' },
      quiz: [
        { q: 'Which quark composition makes up a neutron?', opts: ['udd', 'uud', 'uuu', 'ddd'], ans: 0, why: 'Charge of udd = +⅔ − ⅓ − ⅓ = 0.' },
        { q: 'In β⁻ decay inside a nucleus, a neutron transforms into a proton, an electron, and an:', opts: ['Antineutrino (ν̄_e)', 'Alpha particle', 'Positron', 'Up quark'], ans: 0, why: 'Lepton number conservation requires an electron antineutrino alongside the electron.' }
      ]
    }
  ];

  var RANKS = [
    { name: 'Curious Apprentice', minXp: 0 },
    { name: 'Vector Cadet', minXp: 80 },
    { name: 'Kinematic Navigator', minXp: 200 },
    { name: 'Force Architect', minXp: 360 },
    { name: 'Wave Harmonist', minXp: 560 },
    { name: 'Circuit Alchemist', minXp: 800 },
    { name: 'Relativity Scholar', minXp: 1020 },
    { name: 'Quantum Legend', minXp: 1250 }
  ];

  var TOYS = [
    { id: 'orbital', name: 'Orbital Slingshot Sandbox', reqXp: 60, reqMastered: 1, desc: 'Launch planets into gravity wells with slingshot velocity vectors and golden trails.', riddle: { q: 'When a satellite moves closer to a planet in an elliptical orbit, its orbital speed:', opts: ['Increases', 'Decreases', 'Remains constant', 'Becomes zero'], ans: 0 } },
    { id: 'pendulum', name: 'Double Pendulum Chaos Studio', reqXp: 180, reqMastered: 3, desc: 'Watch two near-identical chaotic double pendulums diverge in gold & cyan phase trails.', riddle: { q: 'Total mechanical energy of an ideal frictionless pendulum is:', opts: ['Conserved (KE + GPE = constant)', 'Maximum at the bottom only', 'Always increasing', 'Zero at the peak'], ans: 0 } },
    { id: 'ripples', name: 'Harmonic Ripple Tank Synth', reqXp: 320, reqMastered: 5, desc: 'Tap a 2D wave tank to create interference patterns & double-slit fringes with harmonic chimes.', riddle: { q: 'Two coherent waves meet with a path difference of λ/2. They interfere:', opts: ['Destructively (dark/quiet)', 'Constructively (bright/loud)', 'With double frequency', 'Without superposition'], ans: 0 } },
    { id: 'collider', name: 'Particle Collider Fireworks', reqXp: 500, reqMastered: 8, desc: 'Smash relativistic particle beams inside a magnetic bubble chamber.', riddle: { q: 'What is the total electric charge of a proton (quark composition uud)?', opts: ['+1e', '0', '−1e', '+2e'], ans: 0 } }
  ];

  var SKINS = [
    { id: 'gold', name: 'Obsidian Gold', desc: 'Signature charcoal obsidian with radiant golden halos (Default).', sw: 'linear-gradient(135deg, #14151c 45%, #facc15)', theme: 'dark', reqXp: 0 },
    { id: 'cream', name: 'Warm Cream Sunburst', desc: 'Crisp sunlit ivory studio with soft amber gradients.', sw: 'linear-gradient(135deg, #fffdf7 45%, #f59e0b)', theme: 'light', reqXp: 0 },
    { id: 'emerald', name: 'Emerald Optics', desc: 'Laser-table emerald accents for dark laboratory focus.', sw: 'linear-gradient(135deg, #0b1612 45%, #34d399)', theme: 'dark', reqXp: 100 },
    { id: 'cobalt', name: 'Cyber Cobalt', desc: 'Deep aerospace blue-cyan telemetry finish.', sw: 'linear-gradient(135deg, #0b1120 45%, #38bdf8)', theme: 'dark', reqXp: 240 },
    { id: 'supernova', name: 'Sunset Supernova', desc: 'Crimson-amber stellar plasma palette.', sw: 'linear-gradient(135deg, #180c11 45%, #fb7185)', theme: 'dark', reqXp: 400 }
  ];

  var BADGES = [
    { id: 'first-spark', name: 'First Spark', desc: 'Explore your first simulation', icon: 'spark', check: function (s, sum) { return sum.startedCount >= 1; } },
    { id: 'quest-victor', name: 'Quest Victor', desc: 'Master your first topic node', icon: 'trophy', check: function (s, sum) { return sum.masteredCount >= 1; } },
    { id: 'string-scholar', name: 'String Scholar', desc: 'Complete the Equilibrium Guided Lesson', icon: 'learn-eq', check: function (s) { return !!(s.nodes['learn-eq'] && s.nodes['learn-eq'].quizPassed); } },
    { id: 'exam-hunter', name: 'Exam Hunter', desc: 'Load 3 real exam setups', icon: 'forces', check: function (s) { var n = 0; Object.keys(s.nodes).forEach(function (k) { n += s.nodes[k].presets || 0; }); return n >= 3; } },
    { id: 'blind-solver', name: 'Exam Mode Pro', desc: 'Activate Exam Mode inside a sim', icon: 'uncertainty', check: function (s) { return Object.keys(s.nodes).some(function (k) { return s.nodes[k].examUsed; }); } },
    { id: 'mech-trio', name: 'Mechanics Trio', desc: 'Master 3 Mechanics (9709) nodes', icon: 'mech', check: function (s) { return NODES.filter(function (n) { return n.course === '9709' && s.nodes[n.id] && s.nodes[n.id].quizPassed; }).length >= 3; } },
    { id: 'phys-trio', name: 'Physics Explorer', desc: 'Master 3 AS Physics (9702) nodes', icon: 'phys', check: function (s) { return NODES.filter(function (n) { return n.course === '9702' && s.nodes[n.id] && s.nodes[n.id].quizPassed; }).length >= 3; } },
    { id: 'polymath', name: 'Dual-Realm Scholar', desc: 'Visit both 9709 & 9702 sims', icon: 'map', check: function (s) { return NODES.some(function (n) { return n.course === '9709' && s.nodes[n.id]; }) && NODES.some(function (n) { return n.course === '9702' && s.nodes[n.id]; }); } },
    { id: 'streak-3', name: 'Momentum Streak', desc: 'Study on 3+ active days', icon: 'energy', check: function (s, sum) { return sum.activeDays >= 3; } },
    { id: 'vault-key', name: 'Vault Keyholder', desc: 'Unlock 2 Secret Sandbox Toys', icon: 'vault', check: function (s, sum) { return sum.unlockedToysCount >= 2; } },
    { id: 'xp-500', name: '500 XP Club', desc: 'Reach 500 total XP', icon: 'waves', check: function (s) { return s.xp >= 500; } },
    { id: 'grand-master', name: 'Atlas Master', desc: 'Master 10+ curriculum nodes', icon: 'particles', check: function (s, sum) { return sum.masteredCount >= 10; } }
  ];

  /* ---------- Safe Storage & State ---------- */
  function readStore() {
    try {
      var raw = root.localStorage && root.localStorage.getItem(KEY);
      if (raw) {
        var obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') return obj;
      }
    } catch (e) { /* ignore */ }
    return null;
  }
  function defaultState() {
    return { name: 'Scholar', xp: 0, skin: 'gold', sound: true, nodes: {}, days: {}, unlockedToys: {}, createdAt: todayKey() };
  }
  function saveStore(st) {
    try { if (root.localStorage) root.localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ }
    try { if (typeof root.dispatchEvent === 'function' && typeof root.CustomEvent === 'function') root.dispatchEvent(new root.CustomEvent('sim-progress-change')); } catch (e) { /* ignore */ }
  }
  function todayKey(offsetDays) {
    var d = new Date();
    if (offsetDays) d.setDate(d.getDate() + offsetDays);
    var m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }
  function getState() {
    var s = readStore();
    if (!s) s = defaultState();
    s.nodes = s.nodes || {}; s.days = s.days || {}; s.unlockedToys = s.unlockedToys || {};
    if (!s.name) s.name = 'Scholar';
    if (typeof s.xp !== 'number' || !isFinite(s.xp)) s.xp = 0;
    if (s.sound === undefined) s.sound = true;
    return s;
  }
  function touchDay(s, amt) {
    var k = todayKey();
    s.days[k] = (s.days[k] || 0) + (amt || 1);
  }
  function findNode(id) {
    for (var i = 0; i < NODES.length; i++) if (NODES[i].id === id) return NODES[i];
    return null;
  }
  function groupModesCount(id) {
    var G = root.SIM_GROUPS || [];
    for (var i = 0; i < G.length; i++) if (G[i].id === id) return G[i].modes.length;
    var n = findNode(id);
    return (n && n.modes) ? n.modes.length : 1;
  }

  /* ---------- Theme & Skin Application ---------- */
  function applyTheme() {
    if (typeof document === 'undefined' || !document.documentElement) return;
    var d = document.documentElement, s = getState();
    try {
      var th = root.localStorage && root.localStorage.getItem('sim-theme');
      if (th === 'light' || th === 'dark') d.setAttribute('data-theme', th);
      else d.setAttribute('data-theme', 'dark');
    } catch (e) { d.setAttribute('data-theme', 'dark'); }
    if (s.skin && s.skin !== 'gold' && s.skin !== 'cream') d.setAttribute('data-skin', s.skin);
    else d.removeAttribute('data-skin');
    applyUiPrefs();
  }
  function toggleTheme() {
    if (typeof document === 'undefined' || !document.documentElement) return 'dark';
    var d = document.documentElement, cur = d.getAttribute('data-theme');
    var next = cur === 'light' ? 'dark' : 'light';
    d.setAttribute('data-theme', next);
    try { if (root.localStorage) root.localStorage.setItem('sim-theme', next); } catch (e) { /* ignore */ }
    if (root.SIM && root.SIM.ui && root.SIM.ui.redraw) root.SIM.ui.redraw();
    return next;
  }
  function setSkin(skinId) {
    var s = getState();
    s.skin = skinId;
    var sk = SKINS.filter(function (x) { return x.id === skinId; })[0];
    if (sk) {
      try { if (root.localStorage) root.localStorage.setItem('sim-theme', sk.theme); } catch (e) { /* ignore */ }
    }
    saveStore(s);
    applyTheme();
    playChime('unlock');
  }
  function setName(n) {
    var s = getState();
    s.name = String(n || '').trim().slice(0, 28) || 'Scholar';
    saveStore(s);
    return s.name;
  }
  function toggleSound() {
    var s = getState();
    s.sound = !s.sound;
    saveStore(s);
    if (s.sound) playChime('step');
    return s.sound;
  }

  /* ---------- Web Audio Chime & Confetti Celebrations ---------- */
  function playChime(kind) {
    try {
      var s = getState();
      if (!s.sound) return;
      var Ctx = root.AudioContext || root.webkitAudioContext;
      if (!Ctx) return;
      var ctx = playChime._ctx || (playChime._ctx = new Ctx());
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      var notes = kind === 'unlock' ? [523.25, 659.25, 783.99, 1046.5] : kind === 'quest' ? [587.33, 739.99, 880] : [659.25, 880];
      notes.forEach(function (freq, i) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = freq;
        var t0 = ctx.currentTime + i * 0.08;
        g.gain.setValueAtTime(0.001, t0);
        g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
        o.connect(g); g.connect(ctx.destination);
        o.start(t0); o.stop(t0 + 0.3);
      });
    } catch (e) { /* ignore audio blocks */ }
  }

  function burstConfetti() {
    if (typeof document === 'undefined' || !document.body) return;
    if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var cv = document.createElement('canvas');
    cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:200';
    cv.width = root.innerWidth || 1000; cv.height = root.innerHeight || 700;
    document.body.appendChild(cv);
    var c = cv.getContext('2d'), cols = ['#facc15', '#f59e0b', '#34d399', '#38bdf8', '#fb7185'], pts = [];
    for (var i = 0; i < 65; i++) {
      pts.push({ x: cv.width * (0.2 + Math.random() * 0.6), y: cv.height * 0.3, vx: (Math.random() - 0.5) * 9, vy: -4 - Math.random() * 7, sz: 4 + Math.random() * 5, col: cols[i % cols.length], life: 1 });
    }
    var step = function () {
      c.clearRect(0, 0, cv.width, cv.height);
      var alive = false;
      pts.forEach(function (p) {
        p.vy += 0.22; p.x += p.vx; p.y += p.vy; p.life -= 0.016;
        if (p.life > 0) { alive = true; c.globalAlpha = p.life; c.fillStyle = p.col; c.fillRect(p.x, p.y, p.sz, p.sz); }
      });
      if (alive && root.requestAnimationFrame) root.requestAnimationFrame(step);
      else if (cv.parentNode) cv.parentNode.removeChild(cv);
    };
    if (root.requestAnimationFrame) root.requestAnimationFrame(step);
  }

  function celebrate(title, sub, xp) {
    if (typeof document === 'undefined' || !document.body) return;
    var host = document.getElementById('simToastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'simToastHost'; host.className = 'toast-host';
      document.body.appendChild(host);
    }
    var card = document.createElement('div');
    card.className = 'toast-card';
    card.innerHTML = '<div class="kpi-badge">' + svg('spark') + '</div><div style="min-width:0"><div style="font-weight:750;font-size:13.5px">' + esc(title) + '</div><div style="font-size:12px;color:var(--muted)">' + esc(sub || '') + '</div></div>' + (xp ? '<span class="toast-xp">+' + xp + ' XP</span>' : '');
    host.appendChild(card);
    setTimeout(function () { if (card.parentNode) card.parentNode.removeChild(card); }, 4200);
  }

  /* ---------- Progress Recording & Calculation ---------- */
  function recordVisit(groupId, modeId) {
    if (!groupId) return null;
    var s = getState();
    var firstNode = !s.nodes[groupId];
    var rec = s.nodes[groupId] || { visits: 0, modes: [], presets: 0, examUsed: false, quizPassed: false, bestScore: 0, lastAt: null };
    rec.visits = (rec.visits || 0) + 1;
    rec.lastAt = Date.now();
    var addedXp = 0;
    if (firstNode) addedXp += 15;
    if (modeId && rec.modes.indexOf(modeId) < 0) {
      rec.modes.push(modeId);
      addedXp += 10;
    }
    s.nodes[groupId] = rec;
    s.xp += addedXp;
    touchDay(s, 1);
    saveStore(s);
    if (addedXp > 0 && typeof document !== 'undefined') celebrate('Topic Explored', (findNode(groupId) || { title: groupId }).title, addedXp);
    return s;
  }

  function recordPreset(groupId) {
    if (!groupId) return;
    var s = getState();
    var rec = s.nodes[groupId] || { visits: 1, modes: [], presets: 0, examUsed: false, quizPassed: false, bestScore: 0, lastAt: Date.now() };
    rec.presets = (rec.presets || 0) + 1;
    if (rec.presets <= 3) s.xp += 10;
    s.nodes[groupId] = rec;
    touchDay(s, 1);
    saveStore(s);
  }

  function recordExamMode(groupId) {
    if (!groupId) return;
    var s = getState();
    var rec = s.nodes[groupId] || { visits: 1, modes: [], presets: 0, examUsed: false, quizPassed: false, bestScore: 0, lastAt: Date.now() };
    if (!rec.examUsed) { rec.examUsed = true; s.xp += 15; }
    s.nodes[groupId] = rec;
    touchDay(s, 1);
    saveStore(s);
  }

  function completeQuest(groupId, score, total) {
    var s = getState(), beforeSum = getSummary(s);
    var rec = s.nodes[groupId] || { visits: 1, modes: [], presets: 0, examUsed: false, quizPassed: false, bestScore: 0, lastAt: Date.now() };
    var firstPass = !rec.quizPassed && score >= total;
    if (score > (rec.bestScore || 0)) rec.bestScore = score;
    var xpEarned = 0;
    if (firstPass) {
      rec.quizPassed = true;
      xpEarned = 50;
    } else if (score > 0) {
      xpEarned = 15;
    }
    s.nodes[groupId] = rec;
    s.xp += xpEarned;
    touchDay(s, 2);
    saveStore(s);

    var afterSum = getSummary(s);
    var node = findNode(groupId);
    playChime(firstPass ? 'unlock' : 'quest');
    if (firstPass) burstConfetti();
    celebrate(firstPass ? 'Node Mastered!' : 'Quest Practiced!', (node ? node.title : groupId) + (firstPass ? ' · Relic Unlocked' : ''), xpEarned);
    if (afterSum.unlockedToysCount > beforeSum.unlockedToysCount && typeof setTimeout === 'function' && typeof document !== 'undefined') {
      setTimeout(function () { celebrate('Secret Toy Unlocked!', 'Visit Secret Vault to play', 0); }, 700);
    }
    return { xpEarned: xpEarned, newlyMastered: firstPass, summary: afterSum };
  }

  function awardBonusXp(amt, title, sub) {
    var s = getState();
    s.xp += amt;
    touchDay(s, 1);
    saveStore(s);
    playChime('quest');
    celebrate(title || 'Bonus XP!', sub || 'Study Coach challenge', amt);
    return s;
  }

  function unlockToyEarly(toyId) {
    var s = getState();
    s.unlockedToys[toyId] = true;
    s.xp += 25;
    touchDay(s, 1);
    saveStore(s);
    playChime('unlock');
    burstConfetti();
    celebrate('Riddle Solved!', 'Secret Sandbox Toy unlocked early', 25);
  }

  function isToyUnlocked(toy, s, sum) {
    if (s.unlockedToys && s.unlockedToys[toy.id]) return true;
    return s.xp >= toy.reqXp || sum.masteredCount >= toy.reqMastered;
  }

  function getNodeProgress(groupId, optState) {
    var s = optState || getState();
    var node = findNode(groupId);
    var rec = s.nodes[groupId];
    var totalModes = groupModesCount(groupId);
    var modesDone = rec && rec.modes ? rec.modes.length : 0;
    var visited = !!(rec && rec.visits > 0);
    var quizPassed = !!(rec && rec.quizPassed);
    var pct = 0;
    if (quizPassed) pct = 100;
    else if (rec) {
      var modeRatio = totalModes ? Math.min(1, modesDone / totalModes) : 1;
      pct = Math.round(25 + modeRatio * 45 + (rec.presets ? 10 : 0) + (rec.examUsed ? 10 : 0));
      pct = Math.min(90, pct);
    }
    var unlocked = true;
    if (node && node.prereqs && node.prereqs.length) {
      // Frontier unlocked if any prerequisite is visited/started OR for exploration freedom allow viewing all, mark frontier
      unlocked = node.prereqs.some(function (pid) { return !!s.nodes[pid]; });
    }
    return {
      pct: pct, visited: visited, started: visited, mastered: quizPassed,
      modesDone: modesDone, totalModes: totalModes, quizPassed: quizPassed,
      bestScore: rec ? (rec.bestScore || 0) : 0, unlocked: unlocked,
      presets: rec ? (rec.presets || 0) : 0, examUsed: !!(rec && rec.examUsed),
      modesVisited: rec && rec.modes ? rec.modes : []
    };
  }

  function getSummary(optState) {
    var s = optState || getState();
    var masteredCount = 0, startedCount = 0, unlockedRelicsCount = 0;
    NODES.forEach(function (n) {
      var p = getNodeProgress(n.id, s);
      if (p.mastered) { masteredCount++; unlockedRelicsCount++; }
      else if (p.started) startedCount++;
    });
    var rank = RANKS[0], nextRank = RANKS[1] || null;
    for (var i = 0; i < RANKS.length; i++) {
      if (s.xp >= RANKS[i].minXp) { rank = RANKS[i]; nextRank = RANKS[i + 1] || null; }
    }
    var pctToNext = nextRank ? Math.min(100, Math.round(((s.xp - rank.minXp) / (nextRank.minXp - rank.minXp)) * 100)) : 100;

    // Streak & active days
    var streak = 0;
    for (var d = 0; d < 60; d++) {
      if (s.days[todayKey(-d)]) streak++;
      else if (d === 0) continue; // grace if today hasn't logged yet
      else break;
    }
    var activeDays = Object.keys(s.days).filter(function (k) { return s.days[k] > 0; }).length;

    // 7x12 engagement heatmap (84 days ending today)
    var heatmap = [];
    for (var idx = 83; idx >= 0; idx--) {
      var k = todayKey(-idx);
      heatmap.push({ date: k, count: s.days[k] || 0 });
    }
    // Weekly 7-day bar array
    var weekly = [];
    var DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (var w = 6; w >= 0; w--) {
      var dt = new Date(); dt.setDate(dt.getDate() - w);
      var wk = todayKey(-w);
      weekly.push({ label: DAY_NAMES[dt.getDay()], count: s.days[wk] || 0 });
    }

    var unlockedToysCount = 0;
    var sumBase = {
      xp: s.xp, rank: rank, nextRank: nextRank, pctToNext: pctToNext,
      masteredCount: masteredCount, startedCount: startedCount, totalNodes: NODES.length,
      streak: streak, activeDays: activeDays, unlockedRelicsCount: unlockedRelicsCount,
      heatmap: heatmap, weekly: weekly, unlockedToysCount: 0
    };
    TOYS.forEach(function (t) { if (isToyUnlocked(t, s, sumBase)) unlockedToysCount++; });
    sumBase.unlockedToysCount = unlockedToysCount;

    var badgesEarned = BADGES.filter(function (b) { return b.check(s, sumBase); });
    sumBase.badgesEarned = badgesEarned;
    return sumBase;
  }

  function exportReport() {
    var s = getState(), sum = getSummary(s);
    var lines = [
      '# A-Level Simulations Progress Report',
      '- Scholar: ' + s.name,
      '- Rank: ' + sum.rank.name + ' (' + sum.xp + ' XP)',
      '- Mastered Topics: ' + sum.masteredCount + ' / ' + sum.totalNodes,
      '- Study Streak: ' + sum.streak + ' day(s) (' + sum.activeDays + ' total active days)',
      '- Earned Badges: ' + sum.badgesEarned.map(function (b) { return b.name; }).join(', '),
      '',
      '## Topic Breakdown'
    ];
    NODES.forEach(function (n) {
      var p = getNodeProgress(n.id, s);
      lines.push('- [' + (p.mastered ? 'x' : p.started ? '~' : ' ') + '] ' + n.course + ' · ' + n.title + ' — ' + p.pct + '%');
    });
    var text = lines.join('\n');
    try {
      var blob = new Blob([text], { type: 'text/markdown' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'alevel-progress-' + todayKey() + '.md';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) { /* ignore */ }
    celebrate('Report Exported', 'Saved markdown summary', 0);
    return text;
  }

  function resetProgress() {
    saveStore(defaultState());
    if (root.localStorage) root.localStorage.removeItem('recent-sims');
    applyTheme();
  }

  /* ---------- Reusable Visual Helpers ---------- */
  function esc(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function ringHtml(pct, iconId, mastered, started) {
    var r = 24, circ = 2 * Math.PI * r, off = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
    return '<div class="ring-wrap">' +
      '<svg class="ring-svg" viewBox="0 0 58 58"><circle class="ring-bg" cx="29" cy="29" r="' + r + '"/>' +
      '<circle class="ring-fg" cx="29" cy="29" r="' + r + '" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>' +
      '<div class="ring-core">' + svg(iconId) + '</div>' +
      (mastered ? '<span class="tile-star" title="Mastered">★</span>' : '') +
      '</div>';
  }
  function miniRingHtml(pct) {
    var r = 8.5, circ = 2 * Math.PI * r, off = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
    return '<span class="mini-ring"><svg viewBox="0 0 22 22"><circle cx="11" cy="11" r="' + r + '" fill="none" stroke="var(--grid)" stroke-width="2.6"/>' +
      '<circle cx="11" cy="11" r="' + r + '" fill="none" stroke="' + (pct >= 100 ? 'var(--ok)' : 'var(--accent)') + '" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>' + pct + '%</span>';
  }
  function segBarHtml(pct, total) {
    var n = total || 24, filled = Math.round((Math.max(0, Math.min(100, pct)) / 100) * n), out = '<div class="seg-bar">';
    for (var i = 0; i < n; i++) out += '<i class="' + (i < filled ? 'on' : '') + '"></i>';
    return out + '</div>';
  }
  function donutHtml(mastered, started, total) {
    var r = 50, circ = 2 * Math.PI * r, unex = Math.max(0, total - mastered - started);
    var mLen = total ? (mastered / total) * circ : 0, sLen = total ? (started / total) * circ : 0, uLen = Math.max(0, circ - mLen - sLen);
    return '<div class="donut-row">' +
      '  <div class="donut-wrap">' +
      '    <svg viewBox="0 0 124 124" style="width:100%;height:100%;transform:rotate(-90deg)">' +
      '      <circle cx="62" cy="62" r="' + r + '" fill="none" stroke="var(--grid)" stroke-width="14"/>' +
      (uLen > 0 ? '<circle cx="62" cy="62" r="' + r + '" fill="none" stroke="var(--grid)" stroke-width="14" stroke-dasharray="' + uLen.toFixed(1) + ' ' + circ.toFixed(1) + '" stroke-dashoffset="' + (-(mLen + sLen)).toFixed(1) + '"/>' : '') +
      (sLen > 0 ? '<circle cx="62" cy="62" r="' + r + '" fill="none" stroke="var(--accent2)" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + sLen.toFixed(1) + ' ' + circ.toFixed(1) + '" stroke-dashoffset="' + (-mLen).toFixed(1) + '"/>' : '') +
      (mLen > 0 ? '<circle cx="62" cy="62" r="' + r + '" fill="none" stroke="var(--accent)" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + mLen.toFixed(1) + ' ' + circ.toFixed(1) + '" stroke-dashoffset="0"/>' : '') +
      '    </svg>' +
      '    <div class="donut-center" style="position:absolute"><b>' + mastered + '</b><small>of ' + total + ' nodes</small></div>' +
      '  </div>' +
      '  <div class="donut-legend">' +
      '    <div class="donut-item"><span class="donut-bar" style="background:var(--accent)"></span><b>' + mastered + '</b><span style="color:var(--muted)">Mastered</span></div>' +
      '    <div class="donut-item"><span class="donut-bar" style="background:var(--accent2)"></span><b>' + started + '</b><span style="color:var(--muted)">In Progress</span></div>' +
      '    <div class="donut-item"><span class="donut-bar" style="background:var(--grid)"></span><b>' + unex + '</b><span style="color:var(--muted)">Unexplored</span></div>' +
      '  </div>' +
      '</div>';
  }

  /* ---------- Interactive Mastery Quest Modal ---------- */
  function openQuestModal(nodeId, onDone) {
    if (typeof document === 'undefined' || !document.body) return;
    var node = findNode(nodeId);
    if (!node || !node.quiz || !node.quiz.length) return;
    var old = document.getElementById('questModalBack');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var back = document.createElement('div');
    back.id = 'questModalBack'; back.className = 'sim-modal-back';
    var qIdx = 0, score = 0, answered = false;

    function renderQ() {
      var q = node.quiz[qIdx];
      answered = false;
      back.innerHTML =
        '<div class="sim-modal" role="dialog" aria-modal="true">' +
        '  <div class="sim-modal-head">' +
        '    <span class="kpi-badge" style="width:30px;height:30px">' + svg(node.id) + '</span>' +
        '    <h2>Mastery Quest · ' + esc(node.title) + '</h2>' +
        '    <button type="button" class="sim-modal-close" id="qClose">×</button>' +
        '  </div>' +
        '  <div class="sim-modal-body">' +
        '    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
        '      <span class="chip">' + esc(node.syllabus) + '</span>' +
        '      <span style="font-size:12.5px;color:var(--muted);font-weight:700">Question ' + (qIdx + 1) + ' of ' + node.quiz.length + ' · Reward +50 XP</span>' +
        '    </div>' +
        '    <p style="font-size:16px;font-weight:700;margin:0 0 14px">' + esc(q.q) + '</p>' +
        '    <div id="qOpts" style="display:flex;flex-direction:column;gap:8px">' +
        q.opts.map(function (o, i) { return '<button type="button" class="btn" data-i="' + i + '" style="justify-content:flex-start;min-height:46px;text-align:left">' + esc(o) + '</button>'; }).join('') +
        '    </div>' +
        '    <div id="qFb" style="margin-top:12px"></div>' +
        '  </div>' +
        '</div>';

      back.querySelector('#qClose').onclick = function () { back.remove(); };
      back.querySelectorAll('#qOpts button').forEach(function (btn) {
        btn.onclick = function () {
          if (answered) return;
          answered = true;
          var pick = Number(btn.getAttribute('data-i'));
          var ok = pick === q.ans;
          if (ok) score++;
          back.querySelectorAll('#qOpts button').forEach(function (b2) {
            var idx = Number(b2.getAttribute('data-i'));
            if (idx === q.ans) b2.style.borderColor = 'var(--ok)';
            else if (idx === pick) b2.style.borderColor = 'var(--warn)';
          });
          var fb = back.querySelector('#qFb');
          var isLast = qIdx === node.quiz.length - 1;
          fb.innerHTML = '<div class="badge ' + (ok ? 'ok' : 'warn') + '" style="display:block;padding:10px 12px">' +
            '<b>' + (ok ? 'Spot on!' : 'Not quite.') + '</b> ' + esc(q.why) + '</div>' +
            '<div style="display:flex;justify-content:flex-end;margin-top:10px"><button type="button" class="btn primary" id="qNext">' +
            (isLast ? 'Finish Quest & Claim XP →' : 'Next Question →') + '</button></div>';
          fb.querySelector('#qNext').onclick = function () {
            if (!isLast) { qIdx++; renderQ(); }
            else {
              var res = completeQuest(node.id, score, node.quiz.length);
              back.innerHTML =
                '<div class="sim-modal" role="dialog"><div class="sim-modal-head"><h2>Quest Complete</h2><button type="button" class="sim-modal-close" id="qClose2">×</button></div>' +
                '<div class="sim-modal-body" style="text-align:center;padding:26px 20px">' +
                '<div class="kpi-badge" style="width:60px;height:60px;margin:0 auto 12px">' + svg(score === node.quiz.length ? 'trophy' : node.id) + '</div>' +
                '<h3 style="margin:0 0 6px;font-size:22px">' + (score === node.quiz.length ? 'Node Mastered! Relic Unlocked' : 'Good Effort! Keep Exploring') + '</h3>' +
                '<p style="color:var(--muted);margin:0 0 14px">You scored <b>' + score + ' / ' + node.quiz.length + '</b> and earned <b>+' + res.xpEarned + ' XP</b>.</p>' +
                (score === node.quiz.length ? '<div class="badge ok" style="margin:0 auto 16px;padding:8px 14px">Relic Unlocked: ' + esc(node.relic.name) + '</div><br>' : '') +
                '<button type="button" class="btn primary" id="qFinish">Continue</button></div></div>';
              back.querySelector('#qClose2').onclick = function () { back.remove(); if (onDone) onDone(res); };
              back.querySelector('#qFinish').onclick = function () { back.remove(); if (onDone) onDone(res); };
            }
          };
        };
      });
    }
    back.onclick = function (e) { if (e.target === back) back.remove(); };
    document.body.appendChild(back);
    renderQ();
  }

  /* ---------- Newton AI Study Coach (Nudge-inspired Assistant) ---------- */
  function createCoachWidget(host, opts) {
    if (!host) return null;
    opts = opts || {};
    var prefix = opts.prefix || '';
    var wrap = document.createElement('div');
    wrap.className = 'coach-card';
    wrap.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
      '  <span style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em">Study Assistant</span>' +
      (opts.onClose ? '<button type="button" class="icon-circle" id="coachCloseBtn" style="width:28px;height:28px" aria-label="Close coach">×</button>' : '<span class="chip">Offline Ready</span>') +
      '</div>' +
      '<div class="coach-orb-wrap">' +
      '  <div class="coach-orb">' + svg('spark') + '</div>' +
      '  <h3>Welcome to Newton,<br>your Physics Coach!</h3>' +
      '  <p>Ask for formulas, a quick +25 XP pop quiz, or your next map route.</p>' +
      '</div>' +
      '<div class="coach-chips">' +
      '  <button type="button" data-act="next">🧭 Next best step</button>' +
      '  <button type="button" data-act="quiz">⚡ Pop quiz (+25 XP)</button>' +
      '  <button type="button" data-act="formulas">📐 Key formulas</button>' +
      '  <button type="button" data-act="vault">🔓 Secret vault tips</button>' +
      '</div>' +
      '<div class="coach-log" id="coachLog"></div>' +
      '<form class="coach-input-row" id="coachForm">' +
      '  <input type="text" id="coachIn" placeholder="Ask about suvat, P=Fv, quarks, or next step…" autocomplete="off">' +
      '  <button type="submit" class="coach-send" aria-label="Send">➤</button>' +
      '</form>';

    host.innerHTML = '';
    host.appendChild(wrap);
    var log = wrap.querySelector('#coachLog'), form = wrap.querySelector('#coachForm'), input = wrap.querySelector('#coachIn');
    if (opts.onClose) wrap.querySelector('#coachCloseBtn').onclick = opts.onClose;

    function addMsg(html, isUser) {
      var m = document.createElement('div');
      m.className = 'coach-msg' + (isUser ? ' user' : '');
      m.innerHTML = html;
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
      return m;
    }

    function launchPopQuiz() {
      var s = getState();
      var candidates = NODES.filter(function (n) { return !(s.nodes[n.id] && s.nodes[n.id].quizPassed); });
      var node = (candidates.length ? candidates : NODES)[Math.floor(Math.random() * (candidates.length ? candidates.length : NODES.length))];
      var q = node.quiz[Math.floor(Math.random() * node.quiz.length)];
      var m = addMsg('<b>Quick Check (' + esc(node.short) + '):</b> ' + esc(q.q) + '<div class="quiz-opts">' +
        q.opts.map(function (o, i) { return '<button type="button" data-i="' + i + '">' + esc(o) + '</button>'; }).join('') + '</div>', false);
      m.querySelectorAll('button').forEach(function (btn) {
        btn.onclick = function () {
          var pick = Number(btn.getAttribute('data-i'));
          m.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
          if (pick === q.ans) {
            awardBonusXp(25, 'Coach Pop Quiz!', node.title);
            addMsg('<span style="color:var(--ok);font-weight:700">✓ Correct (+25 XP)!</span> ' + esc(q.why), false);
          } else {
            addMsg('<span style="color:var(--warn);font-weight:700">Close!</span> ' + esc(q.why), false);
          }
        };
      });
    }

    function reply(text) {
      var t = String(text || '').toLowerCase(), s = getState(), sum = getSummary(s);
      if (/quiz|test|question|xp/.test(t)) { launchPopQuiz(); return; }
      if (/vault|unlock|toy|secret/.test(t)) {
        var nextToy = TOYS.filter(function (ty) { return !isToyUnlocked(ty, s, sum); })[0];
        if (nextToy) addMsg('Your next Secret Toy is <b>' + esc(nextToy.name) + '</b> (needs ' + nextToy.reqXp + ' XP or ' + nextToy.reqMastered + ' mastered nodes). You can also solve a riddle in the <a href="' + prefix + 'vault.html">Secret Vault →</a>', false);
        else addMsg('All 4 Secret Sandbox Toys are unlocked! Visit the <a href="' + prefix + 'vault.html">Secret Vault →</a> to play.', false);
        return;
      }
      if (/suvat|kinematic/.test(t)) { addMsg('<b>SUVAT (constant a):</b><br>v = u + at · s = ut + ½at² · v² = u² + 2as · s = ½(u + v)t. Try <a href="' + prefix + 'group.html?g=kinematics">Straight-line motion →</a>', false); return; }
      if (/power|p=fv|vehicle/.test(t)) { addMsg('<b>Power &amp; Motion:</b> P = Fv and W = Fd cos θ. Remember g = 10 in 9709 Mechanics and g = 9.81 in 9702 Physics!', false); return; }
      if (/quark|particle|nuclear/.test(t)) { addMsg('<b>Quarks:</b> Proton = uud (+1e), Neutron = udd (0). In β⁻ decay, d → u + e⁻ + ν̄_e. Explore <a href="' + prefix + 'group.html?g=particles">Particle Physics →</a>', false); return; }
      if (/formula|sheet|eq/.test(t)) { addMsg('<b>Core A-Level Pack:</b><br>• F_net = ma, F_max = μR<br>• p = mv, ΔKE + ΔPE = W_nc<br>• v = fλ, d sin θ = nλ<br>• V = E − Ir, E = stress / strain', false); return; }
      if (/next|start|step|recommend|map/.test(t)) {
        var nextN = NODES.filter(function (n) { return !getNodeProgress(n.id, s).mastered; })[0] || NODES[0];
        addMsg('Recommended next node: <b>' + esc(nextN.title) + '</b> (' + esc(nextN.syllabus) + '). <a href="' + prefix + nextN.url + '">Launch simulation →</a> or open the <a href="' + prefix + 'map.html">Journey Map →</a>', false);
        return;
      }
      addMsg('You are at <b>' + sum.xp + ' XP</b> (' + esc(sum.rank.name) + ') with <b>' + sum.masteredCount + '/' + sum.totalNodes + '</b> mastered nodes. Try tapping <b>Pop quiz (+25 XP)</b> or asking about <i>suvat</i>, <i>P=Fv</i>, or <i>quarks</i>!', false);
    }

    wrap.querySelectorAll('.coach-chips button').forEach(function (b) {
      b.onclick = function () {
        var act = b.getAttribute('data-act');
        if (act === 'quiz') launchPopQuiz();
        else if (act === 'next') reply('next');
        else if (act === 'formulas') reply('formula');
        else if (act === 'vault') reply('vault');
      };
    });
    form.onsubmit = function (e) {
      e.preventDefault();
      var val = input.value.trim();
      if (!val) return;
      input.value = '';
      addMsg(esc(val), true);
      reply(val);
    };
    return wrap;
  }

  /* ---------- Interactive UI Customizer Studio ("Different UI Settings") ---------- */
  function openUiStudio() {
    if (typeof document === 'undefined' || !document.body) return;
    var back = document.createElement('div');
    back.className = 'sim-modal-back';

    var MOODS = [
      { id: 'obs', name: 'Midnight Observatory', desc: 'Dark sidebar + constellations', icon: '🌙', apply: function () { try { root.localStorage.setItem('sim-theme', 'dark'); } catch (e) {} setSkin('gold'); setUiPrefs({ nav: 'auto', glass: 'matte', fx: true, density: 'comfortable' }); } },
      { id: 'learnai', name: 'LearnAI Floating Pill', desc: 'Warm cream + top glider bar', icon: '☀️', apply: function () { try { root.localStorage.setItem('sim-theme', 'light'); } catch (e) {} setSkin('cream'); setUiPrefs({ nav: 'island', glass: 'glass', fx: true, density: 'comfortable' }); } },
      { id: 'dockglass', name: 'Magnetic Glass Dock', desc: 'Full-width canvas + bottom dock', icon: '✨', apply: function () { try { root.localStorage.setItem('sim-theme', 'dark'); } catch (e) {} setUiPrefs({ nav: 'dock', glass: 'glass', fx: true, density: 'comfortable' }); } },
      { id: 'cyberorbit', name: 'Cyber Orbit Atom', desc: 'Radial atom launcher + cyber grid', icon: '⚛', apply: function () { try { root.localStorage.setItem('sim-theme', 'dark'); } catch (e) {} setUiPrefs({ nav: 'orbit', glass: 'cyber', fx: true, density: 'compact' }); } }
    ];
    var NAVS = [
      { id: 'auto', name: 'Auto Hybrid', sub: 'Sidebar desktop · Dock mobile' },
      { id: 'dock', name: 'Magnetic Dock', sub: 'Bottom magnifying dock' },
      { id: 'island', name: 'Pill Island', sub: 'Top gliding pill bar' },
      { id: 'orbit', name: 'Orbit Atom', sub: 'Spinning radial launcher' },
      { id: 'sidebar', name: 'Drawer Sidebar', sub: 'Classic + slide drawer' }
    ];
    var GLASSES = [
      { id: 'matte', name: 'Obsidian Matte' },
      { id: 'glass', name: 'Liquid Glass' },
      { id: 'cyber', name: 'Cyber Telemetry' }
    ];

    function renderStudio() {
      var prefs = getUiPrefs(), st = getState();
      var curTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      back.innerHTML =
        '<div class="sim-modal ui-studio-modal" role="dialog" aria-modal="true" aria-label="UI Appearance & Navigation Studio">' +
        '  <div class="sim-modal-head"><h2>🎨 UI Studio — Navigation, Theme &amp; Effects</h2><button type="button" class="sim-modal-close" id="uiCloseBtn" aria-label="Close">×</button></div>' +
        '  <div class="sim-modal-body">' +
        '    <div class="ui-sec-lbl">1-Click UI Presets (Live Preview)</div>' +
        '    <div class="ui-mood-grid">' +
        MOODS.map(function (m) {
          return '<button type="button" class="ui-mood-card" data-mood="' + m.id + '"><span class="ui-mood-ico">' + m.icon + '</span><span><b>' + m.name + '</b><small>' + m.desc + '</small></span></button>';
        }).join('') +
        '    </div>' +
        '    <div class="ui-sec-lbl">Navigation Style (Replaces Static Bars)</div>' +
        '    <div class="ui-nav-grid">' +
        NAVS.map(function (n) {
          return '<button type="button" class="ui-choice-card' + (prefs.nav === n.id ? ' on' : '') + '" data-navmode="' + n.id + '"><span class="ui-wire ' + n.id + '"><i></i><b></b></span><b>' + n.name + '</b><small>' + n.sub + '</small></button>';
        }).join('') +
        '    </div>' +
        '    <div class="ui-two-col">' +
        '      <div>' +
        '        <div class="ui-sec-lbl">Surface Material</div>' +
        '        <div class="ui-seg-row">' + GLASSES.map(function (g) { return '<button type="button" class="ui-seg-btn' + (prefs.glass === g.id ? ' on' : '') + '" data-glass="' + g.id + '">' + g.name + '</button>'; }).join('') + '</div>' +
        '      </div>' +
        '      <div>' +
        '        <div class="ui-sec-lbl">Theme &amp; Density</div>' +
        '        <div class="ui-seg-row">' +
        '          <button type="button" class="ui-seg-btn' + (curTheme === 'dark' ? ' on' : '') + '" data-uitheme="dark">🌙 Dark</button>' +
        '          <button type="button" class="ui-seg-btn' + (curTheme === 'light' ? ' on' : '') + '" data-uitheme="light">☀️ Light</button>' +
        '          <button type="button" class="ui-seg-btn' + (prefs.density === 'compact' ? ' on' : '') + '" id="uiDensityBtn">' + (prefs.density === 'compact' ? '▾ Compact' : '↕ Cozy') + '</button>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '    <div class="ui-sec-lbl">Accent Palette Skins</div>' +
        '    <div class="ui-swatch-row">' +
        SKINS.map(function (sk) {
          var active = (st.skin === sk.id);
          var unlocked = st.xp >= sk.reqXp || sk.reqXp === 0;
          return '<button type="button" class="ui-swatch' + (active ? ' on' : '') + '" data-uiskin="' + sk.id + '" title="' + esc(sk.name) + (unlocked ? '' : ' (' + sk.reqXp + ' XP preview)') + '"><i style="background:' + sk.sw + '"></i><span>' + esc(sk.name) + (unlocked ? '' : ' ★') + '</span></button>';
        }).join('') +
        '    </div>' +
        '    <div class="ui-fx-bar">' +
        '      <label class="toggle" style="margin:0;flex:1"><input type="checkbox" id="uiFxToggle"' + (prefs.fx ? ' checked' : '') + '><span><b>Ambient Physics Constellation</b> — interactive glowing background motes</span></label>' +
        '      <button type="button" class="pill-btn" id="uiResetBtn">↺ Reset</button>' +
        '      <button type="button" class="pill-btn gold" id="uiDoneBtn">Done</button>' +
        '    </div>' +
        '  </div>' +
        '</div>';

      back.querySelector('#uiCloseBtn').onclick = function () { document.body.removeChild(back); };
      back.querySelector('#uiDoneBtn').onclick = function () { document.body.removeChild(back); };
      back.querySelector('#uiResetBtn').onclick = function () {
        setSkin('gold'); setUiPrefs(UI_DEFAULTS); renderStudio();
      };
      back.querySelector('#uiFxToggle').onchange = function (e) { setUiPrefs({ fx: !!e.target.checked }); };
      back.querySelector('#uiDensityBtn').onclick = function () {
        setUiPrefs({ density: getUiPrefs().density === 'compact' ? 'comfortable' : 'compact' }); renderStudio();
      };
      Array.prototype.forEach.call(back.querySelectorAll('[data-mood]'), function (b) {
        b.onclick = function () {
          var m = MOODS.filter(function (x) { return x.id === b.getAttribute('data-mood'); })[0];
          if (m) { m.apply(); renderStudio(); playChime('step'); }
        };
      });
      Array.prototype.forEach.call(back.querySelectorAll('[data-navmode]'), function (b) {
        b.onclick = function () { setUiPrefs({ nav: b.getAttribute('data-navmode') }); renderStudio(); playChime('step'); };
      });
      Array.prototype.forEach.call(back.querySelectorAll('[data-glass]'), function (b) {
        b.onclick = function () { setUiPrefs({ glass: b.getAttribute('data-glass') }); renderStudio(); };
      });
      Array.prototype.forEach.call(back.querySelectorAll('[data-uitheme]'), function (b) {
        b.onclick = function () {
          var t = b.getAttribute('data-uitheme');
          try { root.localStorage.setItem('sim-theme', t); } catch (e) {}
          applyTheme(); renderStudio();
        };
      });
      Array.prototype.forEach.call(back.querySelectorAll('[data-uiskin]'), function (b) {
        b.onclick = function () { setSkin(b.getAttribute('data-uiskin')); renderStudio(); };
      });
    }

    back.onclick = function (e) { if (e.target === back) document.body.removeChild(back); };
    renderStudio();
    document.body.appendChild(back);
  }

  /* ---------- Unified App Shell (Sidebar + Pill Island + Magnetic Dock + Orbit Atom) ---------- */
  function mountShell(opts) {
    if (typeof document === 'undefined' || !document.body) return null;
    applyTheme();
    opts = opts || {};
    var active = opts.active || 'dashboard';
    var prefix = opts.prefix || '';
    var s = getState(), sum = getSummary(s);

    var shell = document.createElement('div');
    shell.className = 'app-shell';
    var navItems = [
      { id: 'dashboard', label: 'Dashboard', href: prefix + 'index.html', icon: 'dash' },
      { id: 'map', label: 'Journey Map', href: prefix + 'map.html', icon: 'map', pill: sum.masteredCount + '/' + sum.totalNodes },
      { id: 'solver', label: 'Question Solver', href: prefix + 'solver.html', icon: 'solver', pill: 'AI' },
      { id: 'course-9709', label: '9709 Mechanics', href: prefix + 'course.html?c=9709', icon: 'mech' },
      { id: 'course-9702', label: '9702 AS Physics', href: prefix + 'course.html?c=9702', icon: 'phys' },
      { id: 'vault', label: 'Secret Vault', href: prefix + 'vault.html', icon: 'vault', pill: sum.unlockedToysCount + '/4' }
    ];

    var side = document.createElement('aside');
    side.className = 'app-side';
    side.innerHTML =
      '<a class="app-brand" href="' + prefix + 'index.html">' +
      '  <span class="logo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18c3-9 8-12 16-12"/><circle cx="4" cy="18" r="1.6" fill="currentColor"/><path d="M15 6h5v5"/></svg></span>' +
      '  <span>A Level Atlas<small>9709 &amp; 9702 Studio</small></span>' +
      '</a>' +
      '<div class="app-nav-label">Menu</div>' +
      '<nav class="app-nav" aria-label="Primary">' +
      navItems.map(function (it) {
        return '<a href="' + it.href + '" data-nav="' + it.id + '" class="' + (active === it.id ? 'active' : '') + '"><span class="nav-ico">' + svg(it.icon) + '</span><span>' + it.label + '</span>' + (it.pill ? '<span class="nav-pill">' + it.pill + '</span>' : '') + '</a>';
      }).join('') +
      '  <button type="button" id="sideCoachBtn"><span class="nav-ico">' + svg('spark') + '</span><span>Newton Coach</span></button>' +
      '</nav>' +
      '<div class="pomo-card">' +
      '  <div class="pomo-head"><span>Focus Timer</span><span id="pomoMode">25m Sprint</span></div>' +
      '  <div class="pomo-time" id="pomoTime">25:00</div>' +
      '  <div class="pomo-btns"><button type="button" class="primary" id="pomoToggle">Start</button><button type="button" id="pomoReset">Reset</button></div>' +
      '</div>' +
      '<div class="side-card">' +
      '  <div class="side-rank"><span class="spark">' + svg('trophy') + '</span><div><div id="sideRankName">' + esc(sum.rank.name) + '</div><small style="color:var(--muted)" id="sideXpNum">' + sum.xp + ' XP</small></div></div>' +
      '  <div class="side-xp-row"><span>Next rank</span><span id="sideXpPct">' + sum.pctToNext + '%</span></div>' +
      '  <div class="xp-bar"><div id="sideXpBar" style="width:' + sum.pctToNext + '%"></div></div>' +
      '</div>';

    var main = document.createElement('div');
    main.className = 'app-main';

    // Integrated Dynamic Pill Island (LearnAI-inspired top floating glider bar)
    var island = document.createElement('nav');
    island.className = 'ui-island';
    island.setAttribute('aria-label', 'Pill navigation');
    island.innerHTML =
      '<div class="ui-island-track">' +
      '  <div class="ui-island-glider" aria-hidden="true"></div>' +
      navItems.map(function (it) {
        return '<a href="' + it.href + '" data-nav="' + it.id + '" class="ui-island-item' + (active === it.id ? ' active' : '') + '">' + svg(it.icon) + '<span>' + it.label + '</span></a>';
      }).join('') +
      '  <button type="button" class="ui-island-item" id="islandCoachBtn">' + svg('spark') + '<span>Coach</span></button>' +
      '  <button type="button" class="ui-island-item" id="islandUiBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg><span>UI</span></button>' +
      '</div>';

    // Floating Magnetic Glass Dock (replaces flat mobile pill strip on tablets/phones & optional desktop dock mode)
    var dock = document.createElement('nav');
    dock.className = 'ui-dock';
    dock.setAttribute('aria-label', 'Floating dock navigation');
    var shortLabels = { dashboard: 'Home', map: 'Map', solver: 'Solver AI', 'course-9709': '9709', 'course-9702': '9702', vault: 'Vault' };
    dock.innerHTML =
      navItems.map(function (it) {
        return '<a href="' + it.href + '" data-nav="' + it.id + '" class="dock-item' + (active === it.id ? ' active' : '') + '" data-tip="' + esc(it.label) + '"><span class="dock-ico">' + svg(it.icon) + '</span><span class="dock-lbl">' + esc(shortLabels[it.id] || it.label) + '</span></a>';
      }).join('') +
      '<span class="dock-sep" aria-hidden="true"></span>' +
      '<button type="button" class="dock-item" id="dockCoachBtn" data-tip="Newton AI Coach"><span class="dock-ico">' + svg('spark') + '</span><span class="dock-lbl">Coach</span></button>' +
      '<button type="button" class="dock-item dock-ui" id="dockUiBtn" data-tip="Customize UI Style"><span class="dock-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg></span><span class="dock-lbl">UI Studio</span></button>';

    // Radial Orbit Atom Launcher (creative orbital menu fan-out)
    var orbit = document.createElement('div');
    orbit.className = 'ui-orbit';
    orbit.innerHTML =
      '<div class="orbit-ring" aria-hidden="true">' +
      navItems.map(function (it, idx) {
        var ang = (-92 - idx * (82 / Math.max(1, navItems.length))) * Math.PI / 180;
        var rx = Math.round(Math.cos(ang) * 142), ry = Math.round(Math.sin(ang) * 142);
        return '<a href="' + it.href + '" data-nav="' + it.id + '" class="orbit-node' + (active === it.id ? ' active' : '') + '" style="--rx:' + rx + 'px;--ry:' + ry + 'px;--oi:' + idx + '" title="' + esc(it.label) + '">' + svg(it.icon) + '<span>' + esc(shortLabels[it.id] || it.label) + '</span></a>';
      }).join('') +
      '<button type="button" class="orbit-node" id="orbitCoachBtn" style="--rx:-142px;--ry:-8px;--oi:' + navItems.length + '" title="Newton Coach">' + svg('spark') + '<span>Coach</span></button>' +
      '<button type="button" class="orbit-node" id="orbitUiBtn" style="--rx:-96px;--ry:-98px;--oi:' + (navItems.length + 1) + '" title="UI Studio">🎨<span>UI</span></button>' +
      '</div>' +
      '<button type="button" class="orbit-fab" id="orbitFabBtn" aria-label="Open Orbital Menu" aria-expanded="false">' +
      '  <span class="orbit-atom" aria-hidden="true"><i></i><i></i><b></b></span>' +
      '</button>';

    var drawerBack = document.createElement('div');
    drawerBack.className = 'ui-drawer-back';
    drawerBack.hidden = true;

    var topbar = document.createElement('header');
    topbar.className = 'app-topbar';
    topbar.innerHTML =
      '<button type="button" class="icon-circle side-drawer-btn" id="sideDrawerBtn" aria-label="Open navigation menu" title="Menu">☰</button>' +
      '<div class="app-greet">' +
      '  <h1><span class="muted-hi">' + esc(opts.greetPrefix || 'Hi, ') + '</span>' +
      (opts.editableName !== false ? '<button type="button" class="name-edit" id="nameEditBtn" title="Click to change your name">' + esc(s.name) + '!</button>' : esc(opts.title || '')) +
      '  </h1>' +
      '  <p>' + esc(opts.subtitle || 'Welcome back — ready to ignite another physics node?') + '</p>' +
      '</div>' +
      island.outerHTML +
      '<div class="top-actions">' +
      '  <div class="cmd-search-wrap">' +
      '    <input type="search" class="cmd-search" id="cmdSearchIn" placeholder="Search topics, forces, waves…" aria-label="Search curriculum">' +
      '    <div class="cmd-results" id="cmdSearchRes" hidden></div>' +
      '  </div>' +
      '  <span class="pill-btn" id="topStreakPill" title="Active study streak">🔥 <b>' + sum.streak + '</b>d</span>' +
      '  <button type="button" class="pill-btn" id="exportReportBtn">⇣ Report</button>' +
      '  <button type="button" class="pill-btn ui-studio-trigger" id="uiStudioBtn" title="Switch Navigation Layout, Theme & Effects">🎨 UI Studio</button>' +
      '  <button type="button" class="icon-circle" id="soundToggleBtn" aria-label="Toggle sound effects" title="Toggle chimes">' + (s.sound ? '🔊' : '🔇') + '</button>' +
      '  <button type="button" class="icon-circle" id="themeToggleBtn" aria-label="Switch Obsidian Dark or Warm Cream Light theme" title="Toggle Obsidian / Cream theme">◐</button>' +
      '  <a class="avatar-pill" href="' + prefix + 'vault.html" title="Open Secret Vault & Profile"><span class="avatar-dot">' + esc(s.name.charAt(0).toUpperCase()) + '</span><span id="topRankName">' + esc(sum.rank.name) + '</span></a>' +
      '</div>';

    var content = document.createElement('main');
    content.className = 'app-content';

    main.appendChild(topbar);
    main.appendChild(content);
    shell.appendChild(side);
    shell.appendChild(main);

    var coachDrawer = document.createElement('div');
    coachDrawer.className = 'coach-drawer';
    coachDrawer.hidden = true;
    document.body.classList.add('app-body');
    document.body.appendChild(drawerBack);
    document.body.appendChild(shell);
    document.body.appendChild(dock);
    document.body.appendChild(orbit);
    document.body.appendChild(coachDrawer);

    // Magnetic dock physics magnification
    var dockItems = Array.prototype.slice.call(dock.querySelectorAll('.dock-item'));
    dock.addEventListener('pointermove', function (e) {
      dockItems.forEach(function (item) {
        var r = item.getBoundingClientRect();
        var dist = Math.abs(e.clientX - (r.left + r.width / 2));
        var scale = 1 + Math.max(0, 1 - dist / 95) * 0.28;
        item.style.setProperty('--mscale', scale.toFixed(3));
      });
    });
    dock.addEventListener('pointerleave', function () {
      dockItems.forEach(function (item) { item.style.removeProperty('--mscale'); });
    });

    // Sliding Pill Island Glider sync
    var liveIsland = topbar.querySelector('.ui-island');
    function positionIslandGlider() {
      if (!liveIsland) return;
      var glider = liveIsland.querySelector('.ui-island-glider');
      var act = liveIsland.querySelector('.ui-island-item.active');
      if (!glider || !act || !act.offsetWidth) return;
      glider.style.width = act.offsetWidth + 'px';
      glider.style.transform = 'translateX(' + act.offsetLeft + 'px)';
    }
    setTimeout(positionIslandGlider, 30);
    if (typeof root.addEventListener === 'function') {
      root.addEventListener('resize', positionIslandGlider);
      root.addEventListener('sim-ui-change', function () { setTimeout(positionIslandGlider, 30); });
    }

    // Orbit FAB controls
    var orbitFab = orbit.querySelector('#orbitFabBtn');
    function closeOrbit() { orbit.classList.remove('open'); orbitFab.setAttribute('aria-expanded', 'false'); }
    orbitFab.onclick = function (e) {
      e.stopPropagation();
      var open = orbit.classList.toggle('open');
      orbitFab.setAttribute('aria-expanded', String(open));
      playChime('step');
    };
    document.addEventListener('click', function (e) { if (!orbit.contains(e.target)) closeOrbit(); });

    // Mobile drawer toggle for Sidebar mode
    function setDrawer(open) {
      side.classList.toggle('drawer-open', !!open);
      drawerBack.hidden = !open;
    }
    topbar.querySelector('#sideDrawerBtn').onclick = function () { setDrawer(!side.classList.contains('drawer-open')); };
    drawerBack.onclick = function () { setDrawer(false); };

    function toggleCoach() {
      closeOrbit();
      coachDrawer.hidden = !coachDrawer.hidden;
      if (!coachDrawer.hidden && !coachDrawer.firstChild) {
        createCoachWidget(coachDrawer, { prefix: prefix, onClose: function () { coachDrawer.hidden = true; } });
      }
    }
    side.querySelector('#sideCoachBtn').onclick = toggleCoach;
    dock.querySelector('#dockCoachBtn').onclick = toggleCoach;
    orbit.querySelector('#orbitCoachBtn').onclick = toggleCoach;
    if (liveIsland && liveIsland.querySelector('#islandCoachBtn')) liveIsland.querySelector('#islandCoachBtn').onclick = toggleCoach;

    topbar.querySelector('#uiStudioBtn').onclick = openUiStudio;
    dock.querySelector('#dockUiBtn').onclick = openUiStudio;
    orbit.querySelector('#orbitUiBtn').onclick = function () { closeOrbit(); openUiStudio(); };
    if (liveIsland && liveIsland.querySelector('#islandUiBtn')) liveIsland.querySelector('#islandUiBtn').onclick = openUiStudio;

    topbar.querySelector('#exportReportBtn').onclick = exportReport;
    topbar.querySelector('#soundToggleBtn').onclick = function () {
      var on = toggleSound();
      topbar.querySelector('#soundToggleBtn').textContent = on ? '🔊' : '🔇';
    };
    topbar.querySelector('#themeToggleBtn').onclick = toggleTheme;
    var cmdIn = topbar.querySelector('#cmdSearchIn'), cmdRes = topbar.querySelector('#cmdSearchRes');
    if (cmdIn && cmdRes) {
      cmdIn.addEventListener('input', function () {
        var q = cmdIn.value.trim().toLowerCase();
        if (!q) { cmdRes.hidden = true; cmdRes.innerHTML = ''; return; }
        var hits = NODES.filter(function (n) {
          return (n.title + ' ' + n.syllabus + ' ' + n.tags.join(' ') + ' ' + n.relic.name).toLowerCase().indexOf(q) >= 0;
        }).slice(0, 6);
        cmdRes.hidden = false;
        cmdRes.innerHTML = hits.length
          ? hits.map(function (n) { return '<a href="' + prefix + n.url + '">' + svg(n.id) + '<span><b>' + esc(n.title) + '</b><br><small style="color:var(--muted)">' + esc(n.syllabus) + '</small></span></a>'; }).join('')
          : '<div style="padding:8px 10px;font-size:12.5px;color:var(--muted)">No matching simulation found</div>';
      });
      document.addEventListener('click', function (e) { if (!topbar.contains(e.target)) cmdRes.hidden = true; });
    }
    var nameBtn = topbar.querySelector('#nameEditBtn');
    if (nameBtn) {
      nameBtn.onclick = function () {
        var next = root.prompt ? root.prompt('Enter your scholar name for dashboard & certificates:', getState().name) : null;
        if (next !== null) {
          var saved = setName(next);
          nameBtn.textContent = saved + '!';
          topbar.querySelector('.avatar-dot').textContent = saved.charAt(0).toUpperCase();
        }
      };
    }

    // Working 25-minute Pomodoro timer
    var pomoSec = 1500, pomoTimer = null;
    function drawPomo() {
      var m = String(Math.floor(pomoSec / 60)).padStart(2, '0'), sec = String(pomoSec % 60).padStart(2, '0');
      side.querySelector('#pomoTime').textContent = m + ':' + sec;
    }
    side.querySelector('#pomoToggle').onclick = function () {
      var btn = side.querySelector('#pomoToggle');
      if (pomoTimer) { clearInterval(pomoTimer); pomoTimer = null; btn.textContent = 'Resume'; return; }
      btn.textContent = 'Pause';
      pomoTimer = setInterval(function () {
        if (pomoSec > 0) { pomoSec--; drawPomo(); }
        else {
          clearInterval(pomoTimer); pomoTimer = null; btn.textContent = 'Start';
          awardBonusXp(20, 'Focus Sprint Complete!', '25 minutes of deep physics study');
          pomoSec = 1500; drawPomo();
        }
      }, 1000);
    };
    side.querySelector('#pomoReset').onclick = function () {
      if (pomoTimer) { clearInterval(pomoTimer); pomoTimer = null; }
      pomoSec = 1500; drawPomo();
      side.querySelector('#pomoToggle').textContent = 'Start';
    };

    function syncShellStats() {
      var st = getState(), sm = getSummary(st);
      var mp = side.querySelector('[data-nav="map"] .nav-pill'); if (mp) mp.textContent = sm.masteredCount + '/' + sm.totalNodes;
      var vp = side.querySelector('[data-nav="vault"] .nav-pill'); if (vp) vp.textContent = sm.unlockedToysCount + '/4';
      var rn = side.querySelector('#sideRankName'); if (rn) rn.textContent = sm.rank.name;
      var xn = side.querySelector('#sideXpNum'); if (xn) xn.textContent = sm.xp + ' XP';
      var xp = side.querySelector('#sideXpPct'); if (xp) xp.textContent = sm.pctToNext + '%';
      var xb = side.querySelector('#sideXpBar'); if (xb) xb.style.width = sm.pctToNext + '%';
      var tr = topbar.querySelector('#topRankName'); if (tr) tr.textContent = sm.rank.name;
      var ts = topbar.querySelector('#topStreakPill b'); if (ts) ts.textContent = String(sm.streak);
    }
    if (typeof root.addEventListener === 'function') root.addEventListener('sim-progress-change', syncShellStats);

    return { shell: shell, content: content, topbar: topbar, side: side, openCoach: toggleCoach };
  }

  root.SIM_PROGRESS = {
    NODES: NODES, RANKS: RANKS, TOYS: TOYS, SKINS: SKINS, BADGES: BADGES, ICONS: ICONS,
    svg: svg, esc: esc, ringHtml: ringHtml, miniRingHtml: miniRingHtml, segBarHtml: segBarHtml, donutHtml: donutHtml,
    getState: getState, getSummary: getSummary, getNodeProgress: getNodeProgress, isToyUnlocked: isToyUnlocked,
    findNode: findNode, setName: setName, setSkin: setSkin, applyTheme: applyTheme, toggleTheme: toggleTheme, toggleSound: toggleSound,
    recordVisit: recordVisit, recordPreset: recordPreset, recordExamMode: recordExamMode,
    completeQuest: completeQuest, awardBonusXp: awardBonusXp, unlockToyEarly: unlockToyEarly,
    exportReport: exportReport, resetProgress: resetProgress,
    playChime: playChime, burstConfetti: burstConfetti, celebrate: celebrate,
    openQuestModal: openQuestModal, createCoachWidget: createCoachWidget, mountShell: mountShell,
    getUiPrefs: getUiPrefs, setUiPrefs: setUiPrefs, applyUiPrefs: applyUiPrefs, openUiStudio: openUiStudio
  };
})(typeof self !== 'undefined' ? self : this);
