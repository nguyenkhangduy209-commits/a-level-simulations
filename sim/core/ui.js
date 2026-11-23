/* SIM.ui — DOM builders shared by every simulation page (browser only). */
(function (root) {
  'use strict';
  var SIM = root.SIM = root.SIM || {};
  var U = SIM.util;

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else el.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }

  var query = new URLSearchParams(location.search);
  /** course: '9709' (g = 10) or '9702' (g = 9.81). Page sets a default; ?course= overrides. */
  function course(def) { var c = query.get('course') || def || '9709'; return c === '9702' ? '9702' : '9709'; }
  function gFor(c) { return c === '9702' ? 9.81 : 10; }

  /* ---------- colours from CSS variables (re-read on theme change) ---------- */
  var colorCache = null, themeListeners = [];
  function colors() {
    if (colorCache) return colorCache;
    var cs = getComputedStyle(document.documentElement), o = {};
    ['bg', 'panel', 'ink', 'muted', 'line', 'grid', 'accent', 'warn', 'ok', 'c-weight', 'c-normal', 'c-friction', 'c-tension', 'c-applied',
      'c-resultant', 'c-velocity', 'c-accel', 'c-component', 'c-s1', 'c-s2', 'c-s3', 'c-s4', 'c-pos', 'c-neg', 'surface', 'object', 'object-line']
      .forEach(function (k) { o[k.replace(/^c-/, '')] = cs.getPropertyValue('--' + k).trim(); });
    colorCache = o; return o;
  }
  function onTheme(fn) { themeListeners.push(fn); }
  function themeChanged() { colorCache = null; themeListeners.forEach(function (f) { f(); }); }
  if (root.matchMedia) root.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeChanged);

  /* ---------- safe physics/math number parser (SI prefixes + arithmetic) ---------- */
  var SI_MUL = { G: 1e9, M: 1e6, k: 1e3, K: 1e3, c: 1e-2, m: 1e-3, u: 1e-6, 'µ': 1e-6, 'μ': 1e-6, n: 1e-9, p: 1e-12 };
  function parseNum(raw) {
    var s = String(raw === undefined || raw === null ? '' : raw).trim().replace(/,/g, '.').replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, 'pi');
    if (!s) return NaN;
    // simple number with optional SI suffix (e.g. 4.7k, 15m, 200u)
    var ms = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*([GMkKcmuµμnp])$/.exec(s);
    if (ms) return Number(ms[1]) * SI_MUL[ms[2]];
    var plain = Number(s);
    if (isFinite(plain)) return plain;
    // recursive-descent arithmetic parser: + - * / ^ ( ) pi e sqrt sin cos tan
    var idx = 0;
    function skip() { while (idx < s.length && /\s/.test(s[idx])) idx++; }
    function expr() {
      var v = term();
      while (true) { skip(); var ch = s[idx]; if (ch === '+' || ch === '-') { idx++; v = ch === '+' ? v + term() : v - term(); } else break; }
      return v;
    }
    function term() {
      var v = power();
      while (true) {
        skip(); var ch = s[idx];
        if (ch === '*' || ch === '/') { idx++; var r = power(); v = ch === '*' ? v * r : v / r; }
        else break;
      }
      return v;
    }
    function power() {
      var v = unary(); skip();
      if (s[idx] === '^') { idx++; return Math.pow(v, power()); }
      return v;
    }
    function unary() {
      skip();
      if (s[idx] === '+') { idx++; return unary(); }
      if (s[idx] === '-') { idx++; return -unary(); }
      return atom();
    }
    function atom() {
      skip();
      if (s[idx] === '(') { idx++; var v = expr(); skip(); if (s[idx] !== ')') return NaN; idx++; return v; }
      var numM = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(s.slice(idx));
      if (numM) {
        idx += numM[0].length;
        var val = Number(numM[0]);
        if (idx < s.length && SI_MUL[s[idx]] && (idx + 1 >= s.length || !/[a-zA-Z]/.test(s[idx + 1]))) { val *= SI_MUL[s[idx++]]; }
        return val;
      }
      var idM = /^[a-zA-Z]+/.exec(s.slice(idx));
      if (idM) {
        idx += idM[0].length;
        var id = idM[0].toLowerCase();
        if (id === 'pi') return Math.PI;
        if (id === 'e') return Math.E;
        skip();
        if (s[idx] === '(') {
          idx++; var arg = expr(); skip(); if (s[idx] !== ')') return NaN; idx++;
          if (id === 'sqrt') return Math.sqrt(arg);
          if (id === 'abs') return Math.abs(arg);
          if (id === 'sin') return Math.sin(arg);
          if (id === 'cos') return Math.cos(arg);
          if (id === 'tan') return Math.tan(arg);
        }
      }
      return NaN;
    }
    var out = expr(); skip();
    return idx === s.length && isFinite(out) ? out : NaN;
  }

  /* ---------- page skeleton ---------- */
  var LOGO = '<svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink, #111217)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 18c3-9 8-12 16-12"/><circle cx="4" cy="18" r="1.6" fill="var(--accent-ink, #111217)"/><path d="M15 6h5v5"/></svg>';
  function themeButton() {
    return h('button', { class: 'theme-btn', 'aria-label': 'Switch light or dark theme', html: '◐ <span style="margin-left:6px">Theme</span>', onclick: function () {
      var d = document.documentElement, cur = d.getAttribute('data-theme');
      var dark = cur !== 'light';
      d.setAttribute('data-theme', dark ? 'light' : 'dark');
      try { localStorage.setItem('sim-theme', dark ? 'light' : 'dark'); } catch (e) { /* storage blocked */ }
      themeChanged();
    } });
  }
  function pageCourse() { var q = query.get('course'); if (q === '9702' || q === '9709') return q; return /\/9702\//.test(location.pathname) ? '9702' : '9709'; }
  var COURSE_NAME = { '9709': '9709 Mechanics', '9702': '9702 AS Physics' };
  function page(opt) {
    document.title = opt.title;
    var pc = pageCourse(); document.documentElement.setAttribute('data-course', pc);
    var home = opt.back || '../../index.html', courseUrl = home.replace(/index\.html$/, '') + 'course.html?c=' + pc;
    var head = h('header', { class: 'sim-head' }, [
      h('a', { class: 'brand', href: home, 'aria-label': 'Dashboard', html: '<span class="logo">' + LOGO + '</span>' }),
      h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb', html: '<a href="' + home + '">Dashboard</a><span class="sep">›</span><a href="' + courseUrl + '">' + COURSE_NAME[pc] + '</a><span class="sep">›</span>' }),
      h('h1', { text: opt.title }),
      h('div', { class: 'tags' }, (opt.tags || []).map(function (t) { return h('span', { class: 'chip', text: t }); })
        .concat(opt.g ? [h('span', { class: 'chip g', html: 'g = ' + opt.g + ' m s<sup>−2</sup>' })] : [])),
      h('div', { class: 'head-actions' }, [
        h('button', { type: 'button', class: 'data-btn', 'aria-label': 'Fetch or export data', html: '⇣ <span class="txt">Fetch Data</span>', onclick: function () { openDataHub(); } }),
        h('button', { type: 'button', class: 'guide-btn', 'aria-label': 'Simulation guide', html: '<span class="guide-q">?</span><span class="txt">Guide</span>', onclick: function () { openGuide(); } }),
        themeButton()
      ])
    ]);
    try {
      var saved = localStorage.getItem('sim-theme');
      document.documentElement.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');
      var progRaw = localStorage.getItem('alevel-progress-v1');
      if (progRaw) { var ps = JSON.parse(progRaw); if (ps && ps.skin && ps.skin !== 'gold' && ps.skin !== 'cream') document.documentElement.setAttribute('data-skin', ps.skin); }
    } catch (e) { /* ignore */ }
    var left = h('section', { class: 'left' }), right = h('aside', { class: 'right' });
    // ?embed=1: shown as a mode inside a grouped simulation (group.html supplies the header)
    if (query.get('embed') === '1') { document.body.classList.add('embed'); var tg = query.get('theme'); if (tg === 'dark' || tg === 'light') document.documentElement.setAttribute('data-theme', tg); }
    else document.body.appendChild(head);
    var bottom = h('section', { class: 'bottom' });
    document.body.appendChild(h('main', { class: 'sim' }, [left, right, bottom]));
    var wsRefs = { left: left, right: right, bottom: bottom, setup: [], explain: [], calc: [] };
    function card(where, title) {
      // "Live working" sits under the scene and graphs, full width, so the working is big enough to read
      var working = where === 'right' && /^(live working|how to calculate it)/i.test(title || '');
      var c = h('div', { class: 'card' + (working ? ' working' : '') }, title ? [h('h2', { text: title })] : []);
      (working ? bottom : where === 'left' ? left : where === 'right' ? right : where).appendChild(c);
      if (working) wsRefs.calc.push(c);
      else if (where === 'right' && /trap|tip|note/i.test(title || '')) wsRefs.explain.push(c);
      else if (where === 'right') wsRefs.setup.push(c);
      return c;
    }
    setTimeout(function () { initWorkspace(wsRefs); }, 0);
    return { left: left, right: right, bottom: bottom, card: card };
  }

  /* ---------- the stage: the first main canvas, with a dock of parameter chips under it ---------- */
  var stage = null;
  /** canvas inside a container; returns the canvas (sizing handled by SIM.view.Viewport / SIM.plot.Plot) */
  function canvas(container, cls) {
    var c = h('canvas', { class: cls || '' });
    if (!stage && /main-canvas|tall-canvas/.test(cls || '')) {
      var wrap = h('div', { class: 'sim-stage' }), dock = h('div', { class: 'dock', role: 'group', 'aria-label': 'Values in this simulation (tap to change)' });
      wrap.appendChild(c); container.appendChild(wrap); container.appendChild(dock);
      stage = { el: wrap, canvas: c, dock: dock, chips: [] };
      if (SIM.scene && SIM.scene.mountSwitch) SIM.scene.mountSwitch(wrap);   // Real life / Diagram
      return c;
    }
    container.appendChild(c); return c;
  }
  /** a short hint over the stage, e.g. "Drag from the centre to draw a force" */
  function stageTip(text) {
    if (!stage) return null;
    var t = stage.tip || (stage.tip = h('div', { class: 'stage-tip' }));
    if (!t.parentNode) stage.el.appendChild(t);
    t.textContent = text; t.style.display = text ? '' : 'none';
    // the hint has done its job once the student touches the diagram
    if (!stage.tipBound && stage.canvas.addEventListener) { stage.tipBound = true; stage.canvas.addEventListener('pointerdown', function () { if (stage.tip) stage.tip.style.opacity = '0.0'; setTimeout(function () { if (stage.tip) stage.tip.style.display = 'none'; }, 200); }); }
    return t;
  }

  /* ---------- stage tools: a floating "+ Add …" button and tap-to-place ----------
     stageAction({ label: 'Add a ball', icon: '+', onClick }) → button over the top-right of the stage.
     placeMode({ prompt: 'Tap the track to place the ball', onPlace(x, y), onCancel }) → the next tap on the
     main canvas is delivered as a position (canvas px) instead of a drag; Escape cancels. */
  function stageAction(o) {
    if (!stage) return null;
    var bar = stage.actions || (stage.actions = h('div', { class: 'stage-actions' }));
    if (!bar.parentNode) stage.el.appendChild(bar);
    stage.el.classList.add('has-actions');
    var b = h('button', { type: 'button', class: 'stage-act', html: '<b>' + (o.icon || '+') + '</b><span>' + o.label + '</span>', onclick: function () { o.onClick && o.onClick(); } });
    bar.appendChild(b);
    return { el: b, show: function (v) { b.style.display = v ? '' : 'none'; }, label: function (t) { b.querySelector('span').textContent = t; } };
  }
  var placing = null;
  function placeMode(o) {
    if (!stage) return;
    cancelPlace();
    var banner = h('div', { class: 'place-banner', html: '<span>' + o.prompt + '</span>' });
    banner.appendChild(h('button', { type: 'button', text: 'Cancel', onclick: function () { cancelPlace(true); } }));
    stage.el.appendChild(banner); stage.el.classList.add('placing');
    function down(e) {
      e.stopImmediatePropagation(); e.preventDefault();
      var r = stage.canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, cb = o.onPlace;
      cancelPlace(false); if (cb) cb(x, y);
    }
    stage.canvas.addEventListener('pointerdown', down, true);
    placing = { banner: banner, down: down, onCancel: o.onCancel };
  }
  function cancelPlace(user) {
    if (!placing) return;
    var p = placing; placing = null;
    stage.canvas.removeEventListener('pointerdown', p.down, true);
    if (p.banner.parentNode) p.banner.parentNode.removeChild(p.banner);
    stage.el.classList.remove('placing');
    if (user && p.onCancel) p.onCancel();
  }
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && placing) cancelPlace(true); });

  /* ---------- number editor popover (chips and draw-then-type share it) ---------- */
  var pop = null;
  function closePop(restoreFocus) {
    if (!pop) return;
    var p = pop; pop = null;
    if (p.el.parentNode) p.el.parentNode.removeChild(p.el);
    if (p.onClose) p.onClose();
    if (restoreFocus && p.returnFocus && p.returnFocus.focus) p.returnFocus.focus();
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pop) closePop(true); });
    document.addEventListener('pointerdown', function (e) {
      if (!pop || !e.target || !e.target.closest) return;
      if (e.target.closest('.pop') || (pop.owner && pop.owner.contains && pop.owner.contains(e.target))) return;
      closePop(false);
    }, true);
  }
  /* ---------- "Mark as x" workflow (mark any parameter/force as unknown x -> Calculate x) ---------- */
  var markedX = null, xCalculator = null, wsCalcXPill = null;
  function findParamRow(key, ctlHint) {
    for (var i = 0; i < allParamRows.length; i++) {
      var r = allParamRows[i];
      if (r.spec.key === key && (!ctlHint || r.ctl === ctlHint)) return r;
    }
    return null;
  }
  function syncMarkedXPill() {
    allDocked.forEach(function (r) {
      if (r.chip && r.chip.classList) r.chip.classList.toggle('is-x', !!(markedX && markedX.row === r));
    });
    if (wsCalcXPill) {
      wsCalcXPill.hidden = !markedX;
      if (markedX) {
        var symTxt = markedX.sym ? stripTags(markedX.sym) : (markedX.label || 'x');
        wsCalcXPill.innerHTML = '⚡ <span class="ws-lbl">Calculate x (' + esc(symTxt) + ')</span><span class="calc-clear" title="Clear unknown x" role="button" aria-label="Clear unknown x">×</span>';
      }
    }
    themeChanged();
  }
  function markAsX(rowOrKey, opts) {
    opts = opts || {};
    var r = rowOrKey && rowOrKey.spec ? rowOrKey : findParamRow(rowOrKey, opts.ctl);
    var key = opts.key || (r ? r.spec.key : (typeof rowOrKey === 'string' ? rowOrKey : 'x'));
    if (opts.toggle && markedX && ((r && markedX.row === r) || (!r && markedX.key === key))) {
      markedX = null; syncMarkedXPill(); return null;
    }
    var lbl = opts.label || (r ? r.labelText : key);
    var sym = opts.sym || (r && r.spec.sym ? r.spec.sym : lbl);
    markedX = { row: r || null, key: key, label: lbl, sym: sym, meta: opts.meta || null, ctl: opts.ctl || (r ? r.ctl : null) };
    syncMarkedXPill();
    return markedX;
  }
  function clearMarkedX() { markedX = null; syncMarkedXPill(); }
  function getMarkedX() { return markedX; }
  function registerXCalculator(fn) { xCalculator = fn; }
  function calculateMarkedX(opt) {
    if (!markedX) return;
    if (xCalculator) { xCalculator(markedX, opt || {}); return; }
    openSolveForX({ preselectRow: markedX.row, autoSolve: !!(opt && opt.autoSolve) });
  }

  /**
   * openEditor({ title, sub, value, min, max, step, decimals, unit, at: {x, y} (stage px) or anchorEl, quick: [values],
   *              onInput(v) live, onDone(v), onCancel(), doneLabel, paramRow, paramKey, paramCtl, paramSym, meta, onMarkX })
   * Big typed input with − / + steppers (hold to repeat), a slider, "Set as x" action and quick values. Enter = done.
   */
  function openEditor(o) {
    closePop(false);
    var host = stage ? stage.el : document.body, d = o.decimals === undefined ? 2 : o.decimals, step = o.step || 1;
    var pr = o.paramRow || (o.paramKey ? findParamRow(o.paramKey, o.paramCtl) : null);
    var input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': o.title, value: U.num(o.value, d) });
    var range = h('input', { type: 'range', min: o.min, max: o.max, step: 'any', value: o.value, 'aria-label': o.title + ' slider' });
    var cur = Number(o.value), initVal = Number(o.value);
    var hint = h('div', { class: 'pop-hint' });
    function clampSnap(v) { v = U.clamp(v, Number(o.min), Number(o.max)); return Number(v.toFixed(Math.max(0, d))); }
    function set(v, from) {
      if (!isFinite(v)) return; cur = clampSnap(v);
      if (from !== 'input') input.value = U.num(cur, d);
      if (from !== 'range') range.value = cur;
      if (from === 'input') {
        var raw = String(input.value).trim();
        if (v < Number(o.min) || v > Number(o.max)) { hint.textContent = 'clamped to [' + U.num(Number(o.min), 4) + ', ' + U.num(Number(o.max), 4) + ']'; hint.className = 'pop-hint warn'; }
        else if (/[GMkKcmuµμnp*\/+^()]|pi|sqrt/i.test(raw)) { hint.textContent = '= ' + U.num(cur, d); hint.className = 'pop-hint'; }
        else hint.textContent = '';
      } else hint.textContent = '';
      if (o.onInput) o.onInput(cur);
    }
    function parse() { return parseNum(input.value); }
    input.addEventListener('input', function () { var v = parse(); if (input.value !== '' && isFinite(v)) set(v, 'input'); else { hint.textContent = input.value.trim() ? 'e.g. 4.7k, 15m, 1/3, 2*pi' : ''; hint.className = 'pop-hint'; } });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); done(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); set(cur + (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1)); }
    });
    range.addEventListener('input', function () { var v = Number(range.value); set(Math.round(v / step) * step, 'range'); });
    function stepper(sign, label) {
      var b = h('button', { type: 'button', text: label, 'aria-label': (sign > 0 ? 'Increase' : 'Decrease') + ' by ' + step }), timer = null, rep = null;
      function stop() { clearTimeout(timer); clearInterval(rep); timer = rep = null; }
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); set(cur + sign * step); timer = setTimeout(function () { rep = setInterval(function () { set(cur + sign * step); }, 70); }, 380); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (t) { b.addEventListener(t, stop); });
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set(cur + sign * step); } });
      return b;
    }
    function done() { var v = parse(); if (input.value !== '' && isFinite(v)) set(v, 'x'); var cb = o.onDone; closePop(true); if (cb) cb(cur); }
    var canMarkX = !!(pr || o.paramKey || o.onMarkX);
    var isCurX = !!(markedX && ((pr && markedX.row === pr) || (o.paramKey && markedX.key === o.paramKey)));
    var markBtn = canMarkX ? h('button', {
      class: 'btn btn-mark-x' + (isCurX ? ' active' : ''),
      type: 'button',
      text: isCurX ? '✓ Unknown x (Unmark)' : 'Set as x',
      title: 'Mark this quantity as unknown x so you can press Calculate x directly',
      onclick: function () {
        if (isCurX) clearMarkedX();
        else if (o.onMarkX) o.onMarkX(pr);
        else markAsX(pr || o.paramKey, { key: o.paramKey, label: stripTags(o.title || ''), sym: o.paramSym, ctl: o.paramCtl, meta: o.meta });
        closePop(true);
      }
    }) : null;
    var el = h('div', { class: 'pop', role: 'dialog', 'aria-label': o.title }, [
      h('button', { class: 'pop-close', type: 'button', text: '×', 'aria-label': 'Close', onclick: function () { closePop(true); if (o.onCancel) o.onCancel(); } }),
      h('p', { class: 'pop-title', html: o.title }),
      o.sub ? h('p', { class: 'pop-sub', html: o.sub }) : null,
      h('div', { class: 'pop-meta' }, [
        h('span', { html: 'Range: ' + U.num(Number(o.min), 4) + ' – ' + U.num(Number(o.max), 4) + (o.unit ? ' ' + o.unit : '') }),
        h('span', { text: 'Step: ' + U.num(step, 4) })
      ]),
      h('div', { class: 'big' }, [stepper(-1, '−'), h('div', { class: 'numwrap' }, [input, o.unit ? h('span', { class: 'u', html: o.unit }) : null]), stepper(1, '+')]),
      hint,
      range,
      h('div', { class: 'range-ends' }, [h('span', { text: U.num(Number(o.min), 4) }), h('span', { text: 'Tip: 4.7k, 15m, 2*pi, 1/3' }), h('span', { text: U.num(Number(o.max), 4) })]),
      o.quick && o.quick.length ? h('div', { class: 'quick' }, [h('span', { class: 'quick-lbl', text: 'Quick:' })].concat(o.quick.map(function (q) { return h('button', { type: 'button', text: String(q), onclick: function () { set(q); } }); }))) : null,
      h('div', { class: 'pop-actions' }, [
        markBtn,
        h('button', { class: 'btn', type: 'button', text: '↺ Reset', title: 'Restore value', onclick: function () { set(initVal); } }),
        h('button', { class: 'btn primary', type: 'button', text: o.doneLabel || 'Done', onclick: done })
      ])
    ]);
    host.appendChild(el);
    // place next to the anchor inside the stage (desktop); CSS turns it into a bottom sheet on phones
    var hr = host.getBoundingClientRect ? host.getBoundingClientRect() : { left: 0, top: 0, width: 800, height: 450 };
    var x, y;
    if (o.anchorEl && o.anchorEl.getBoundingClientRect) { var ar = o.anchorEl.getBoundingClientRect(); x = ar.left - hr.left; y = ar.top - hr.top - 8; el.style.top = 'auto'; }
    else { x = (o.at ? o.at.x : hr.width / 2) + 14; y = (o.at ? o.at.y : hr.height / 2) - 40; }
    var w = Math.min(390, (root.innerWidth || 800) - 24);
    // beside the point, on whichever side has room, so the popover never covers what was just drawn
    if (!o.anchorEl && o.at && x + w > hr.width - 4 && o.at.x - 14 - w >= 4) x = o.at.x - 14 - w;
    x = Math.max(4, Math.min(x, hr.width - w - 4));
    if (o.anchorEl) { el.style.left = x + 'px'; el.style.bottom = (hr.height - y) + 'px'; }
    else { el.style.left = x + 'px'; el.style.top = Math.max(4, Math.min(y, hr.height - 250)) + 'px'; }
    pop = { el: el, onClose: o.onClose, returnFocus: o.returnFocus || null, owner: o.owner || null };
    setTimeout(function () { if (input.focus) { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } if (input.select) input.select(); } }, 0);
    return { set: set, close: function () { closePop(false); } };
  }
  /** draw-then-type: ask for a number at a stage position. */
  function askNumber(o) { return openEditor(o); }

  /* ---------- sliders ---------- */
  /** tell the animation clock(s) that an input changed, so the simulation replays from t = 0 */
  function notify() {
    examResets.forEach(function (f) { f(); });   // new numbers: hide exam answers again
    if (allDocked.length) setTimeout(syncChips, 0);
    if (SIM.anim && SIM.anim.inputChanged) SIM.anim.inputChanged();
  }
  function decimalsOf(step) { var s = String(step); return s.indexOf('.') < 0 ? 0 : s.length - s.indexOf('.') - 1; }
  /** Slider snapping: whole numbers when the range allows it (≥ 10 wide), otherwise 0.1 or 0.01.
      Exact values (e.g. 0.35, 9.81) are always available by typing in the box. spec.snap overrides. */
  function snapStep(sp) {
    if (sp.snap !== undefined) return sp.snap;
    var span = Number(sp.max) - Number(sp.min), st = Number(sp.step || 1);
    var coarse = span >= 10 ? 1 : span >= 1 ? 0.1 : span >= 0.1 ? 0.01 : st;
    return Math.max(st, coarse);
  }
  function snapValue(v, sp, step) {
    var min = Number(sp.min), max = Number(sp.max);
    var s = Math.round(v / step) * step;
    s = Number(s.toFixed(Math.max(0, decimalsOf(step))));
    if (s < min) s = min; if (s > max) s = max;      // ends of the range stay reachable (e.g. min 0.01)
    if (Math.abs(v - min) < step / 2) s = min; if (Math.abs(v - max) < step / 2) s = max;
    return s;
  }
  var allParamRows = [];
  function params(container, specs, onChange) {
    var ctl = { values: {}, rows: {} };
    specs.forEach(function (sp) {
      var step = snapStep(sp);
      var d = sp.decimals !== undefined ? sp.decimals : Math.max(decimalsOf(step), 0);
      var range = h('input', { type: 'range', min: sp.min, max: sp.max, step: 'any', value: sp.value, 'aria-label': sp.label });
      var box = h('input', { type: 'text', inputmode: 'decimal', class: 'numbox', value: sp.value, 'aria-label': sp.label + ' value' });
      var lab = h('label', { html: sp.label + (sp.sym ? ' <span class="sym">' + sp.sym + '</span>' : '') });
      var right = h('span', {}, [box, sp.unit ? h('span', { class: 'unit', html: sp.unit }) : null]);
      var row = h('div', { class: 'ctrl' + (sp.hidden ? '' : '') }, [lab, right, range]);
      if (sp.hidden) row.style.display = 'none';
      container.appendChild(row);
      ctl.values[sp.key] = Number(sp.value);
      var rec = { row: row, range: range, box: box, spec: sp, d: d, step: step, ctl: ctl, vis: !sp.hidden, labelText: String(sp.label).replace(/<[^>]+>/g, '') };
      ctl.rows[sp.key] = rec;
      allParamRows.push(rec);
      range.addEventListener('input', function () { notify(); var v = snapValue(Number(range.value), sp, ctl.rows[sp.key].step); ctl.values[sp.key] = v; box.value = U.num(v, d); onChange && onChange(sp.key); });
      box.addEventListener('change', function () {
        var v = parseNum(box.value); if (box.value === '' || !isFinite(v)) { box.value = ctl.values[sp.key]; return; }
        v = U.clamp(v, Number(sp.min), Number(sp.max)); box.value = v; range.value = v; ctl.values[sp.key] = v; notify(); onChange && onChange(sp.key);
      });
    });
    ctl.set = function (obj, silent) {
      Object.keys(obj).forEach(function (k) {
        var r = ctl.rows[k]; if (!r) { ctl.values[k] = obj[k]; return; }
        var v = Number(obj[k]); ctl.values[k] = v; r.range.value = v; r.box.value = U.num(v, Math.max(r.d, 4));
      });
      if (!silent && onChange) onChange('*');
    };
    /** show a computed value in a locked slider (used by "solve for" modes) */
    ctl.lock = function (k, locked, value) {
      var r = ctl.rows[k]; if (!r) return;
      r.row.classList.toggle('locked', !!locked); r.range.disabled = !!locked; r.box.disabled = !!locked;
      if (locked && value !== undefined && isFinite(value)) { r.range.value = value; r.box.value = U.num(value, 4); }
    };
    ctl.show = function (k, vis) { var r = ctl.rows[k]; if (r) r.row.style.display = vis ? '' : 'none'; };
    ctl.label = function (k, html) { var r = ctl.rows[k]; if (r) r.row.querySelector('label').innerHTML = html; };
    ctl.range = function (k, min, max, step) {
      var r = ctl.rows[k]; if (!r) return;
      r.range.min = min; r.range.max = max; r.spec.min = min; r.spec.max = max; if (step) r.spec.step = step; r.step = snapStep(r.spec);
      var v = U.clamp(ctl.values[k], min, max); ctl.values[k] = v; r.range.value = v; r.box.value = U.num(v, Math.max(r.d, 4));
    };
    dockParams(container, ctl, specs);
    return ctl;
  }

  /* ---------- parameter chips on the stage ----------
     Every slider whose container is a card becomes a chip under the simulation ("m = 10 kg").
     Tap the chip (or focus it and press Enter) to type a value, use − / + or drag; ↑ / ↓ nudge it directly.
     The original row stays the source of truth (same events), so every page keeps working unchanged. */
  var syncTimer = null, allDocked = [];
  function fmtChip(v) { return U.num(v, 4).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, ''); }
  function dockParams(container, ctl, specs) {
    if (!stage || !container || !container.classList || !container.classList.contains('card')) return;
    specs.forEach(function (sp) {
      var r = ctl.rows[sp.key]; if (!r) return;
      r.ctl = ctl; r.vis = !sp.hidden; r.labelText = String(sp.label).replace(/<[^>]+>/g, '');
      var ph = h('span', { class: 'ph', 'aria-hidden': 'true', style: 'display:block;height:0' });
      if (r.row.parentNode) { r.row.parentNode.insertBefore(ph, r.row); r.row.parentNode.removeChild(r.row); }
      var chip = h('button', { type: 'button', class: 'pchip', title: r.labelText + ' — tap to change' });
      r.chip = chip; r.ph = ph; r.docked = true;
      function render() {
        var v = r.locked && r.lockedVal !== undefined ? r.lockedVal : ctl.values[sp.key];
        chip.innerHTML =
          '<span class="chip-top"><span class="chip-name">' + esc(r.labelText) + '</span>' + (sp.sym ? '<span class="sym">' + sp.sym + '</span>' : '') + '</span>' +
          '<span class="chip-main"><span class="val">' + (isFinite(v) ? (r.locked ? U.sf(v) : fmtChip(v)) : '—') + '</span>' + (sp.unit ? '<span class="unit">' + sp.unit + '</span>' : '') + '<span class="chip-edit" aria-hidden="true">✎</span></span>';
        chip.setAttribute('aria-label', r.labelText + ': ' + (isFinite(v) ? fmtChip(v) : 'not set') + ' ' + String(sp.unit || '').replace(/<[^>]+>/g, '') + (r.locked ? ' (solved)' : ', press Enter to change'));
      }
      r.renderChip = render;
      function commit(v) { r.box.value = v; r.box.dispatchEvent(new Event('change')); render(); }
      chip.addEventListener('click', function () {
        if (r.locked) return;
        chip.classList.add('open');
        openEditor({ title: sp.label + (sp.sym ? ' <span style="font-family:var(--mono);color:var(--muted)">' + sp.sym + '</span>' : ''),
          sub: 'Type a value, use − / +, or mark it as unknown x.', value: ctl.values[sp.key], min: Number(sp.min), max: Number(sp.max),
          step: r.step, decimals: Math.max(r.d, decimalsOf(sp.step || 1), 2), unit: sp.unit, anchorEl: chip, owner: chip, returnFocus: chip,
          paramRow: r, onInput: commit, onClose: function () { chip.classList.remove('open'); } });
      });
      chip.addEventListener('keydown', function (e) {
        if (r.locked || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
        e.preventDefault(); commit(U.clamp(ctl.values[sp.key] + (e.key === 'ArrowUp' ? 1 : -1) * r.step * (e.shiftKey ? 10 : 1), Number(sp.min), Number(sp.max)));
      });
      r.range.addEventListener('input', render); r.box.addEventListener('change', render);
      stage.dock.appendChild(chip); stage.chips.push(r); allDocked.push(r);
      render();
    });
    // keep chips in step with code that changes values, locks, labels or visibility
    var o = { set: ctl.set, lock: ctl.lock, show: ctl.show, label: ctl.label, range: ctl.range };
    ctl.set = function (obj, silent) { o.set(obj, silent); each(); };
    ctl.lock = function (k, locked, value) { o.lock(k, locked, value); var r = ctl.rows[k]; if (r && r.docked) { r.locked = !!locked; r.lockedVal = locked ? value : undefined; r.chip.classList.toggle('locked', !!locked); r.renderChip(); } };
    ctl.show = function (k, vis) { var r = ctl.rows[k]; if (r && r.docked) { r.vis = !!vis; syncChips(); } else o.show(k, vis); };
    ctl.label = function (k, html) { o.label(k, html); var r = ctl.rows[k]; if (r && r.docked) { r.labelText = String(html).replace(/<[^>]+>/g, ''); r.renderChip(); } };
    ctl.range = function (k, a, b, st) { o.range(k, a, b, st); var r = ctl.rows[k]; if (r && r.renderChip) r.renderChip(); };
    function each() { specs.forEach(function (sp) { var r = ctl.rows[sp.key]; if (r && r.renderChip) r.renderChip(); }); }
    syncChips();
    ensureDockTools();
    if (!syncTimer && root.setInterval) syncTimer = setInterval(syncChips, 400);
  }
  /** a chip is shown when its row is visible and the card it came from is visible */
  function syncChips() {
    allDocked.forEach(function (r) {
      var shown = r.vis && (typeof r.ph.getClientRects !== 'function' || r.ph.getClientRects().length > 0 || isShownInEmbed(r.ph));
      var want = shown ? '' : 'none';
      if (r.chip.style.display !== want) r.chip.style.display = want;
    });
  }
  /** an element with height 0 still has a client rect when visible; this covers browsers that report none */
  function isShownInEmbed(el) {
    for (var n = el.parentNode; n && n.style; n = n.parentNode) if (n.style.display === 'none') return false;
    return !!(el.parentNode && el.parentNode.offsetParent !== null);
  }

  function select(container, opt, onChange) {
    var sel = h('select', { 'aria-label': opt.label });
    opt.options.forEach(function (o) { var op = h('option', { value: o.value, text: o.label }); sel.appendChild(op); });
    sel.value = opt.value;
    var row = h('div', { class: 'row' }, [opt.label ? h('label', { text: opt.label, style: 'font-size:13.5px' }) : null, sel]);
    container.appendChild(row);
    sel.addEventListener('change', function () { notify(); onChange && onChange(sel.value); });
    return { get: function () { return sel.value; }, set: function (v, silent) { sel.value = v; if (!silent && onChange) onChange(v); }, el: sel, row: row };
  }
  function toggle(container, opt, onChange) {
    var cb = h('input', { type: 'checkbox' }); cb.checked = !!opt.value;
    var lab = h('label', { class: 'toggle' }, [cb, h('span', { html: opt.label })]);
    container.appendChild(lab);
    cb.addEventListener('change', function () { notify(); onChange && onChange(cb.checked); });
    return { get: function () { return cb.checked; }, set: function (v, silent) { cb.checked = !!v; if (!silent && onChange) onChange(!!v); }, el: lab };
  }
  /* ---------- scenario picker (presets) ----------
     One button opens a grouped list instead of a long dropdown:
       Past-paper questions (the paper reference shown as a tag) · Classic set-ups · What if…?
     The chosen scenario stays on show with its note and a "Change" button.
     A hidden <select> stays the source of truth, so deep links (?preset=N) and tests keep working. */
  var PAPER_RE = /^\s*(\d{4}\/\d{2}\s+(?:[A-Z]\/[A-Z]|[A-Z]{1,2})\s*\d{2}\s+Q[\w().]+)\s*[:–-]?\s*(.*)$/;
  var WHATIF_RE = /\?\s*$|\b(too (large|small|big)|no (valid |unique )?solution|negative|cannot|impossible|vs\.?|versus|same .*as|compar|what if|without|with air|on the moon|both .* horizontal)\b/i;
  function scenarioGroup(name) { return PAPER_RE.test(name) ? 'paper' : WHATIF_RE.test(name) ? 'whatif' : 'classic'; }
  var GROUP_INFO = { paper: ['Past-paper questions', 'Real exam questions, checked against the mark scheme'], classic: ['Classic set-ups', 'Standard situations to explore'], whatif: ['What if…?', 'Edge cases and comparisons to test your understanding'] };
  function presets(container, list, apply) {
    var sel = h('select', { 'aria-label': 'Preset', style: 'display:none' });
    sel.appendChild(h('option', { value: '', text: 'Choose a scenario…' }));
    list.forEach(function (p, i) { sel.appendChild(h('option', { value: String(i), text: p.name })); });
    var note = h('div', { class: 'scn-note' });
    var cur = h('button', { type: 'button', class: 'scn-current', 'aria-expanded': 'false' });
    var panel = h('div', { class: 'scn-panel', role: 'listbox', 'aria-label': 'Scenarios' }); panel.style.display = 'none';
    if (list.length >= 6) {
      var search = h('input', { type: 'search', class: 'scn-search', placeholder: 'Filter setups or paper code…', 'aria-label': 'Filter scenarios' });
      search.addEventListener('input', function () {
        var q = search.value.trim().toLowerCase();
        Array.prototype.forEach.call(panel.querySelectorAll ? panel.querySelectorAll('.scn-group') : [], function (g) {
          var any = false;
          Array.prototype.forEach.call(g.querySelectorAll('.scn-item'), function (b) {
            var hit = !q || b.textContent.toLowerCase().indexOf(q) >= 0;
            b.style.display = hit ? '' : 'none';
            if (hit) any = true;
          });
          g.style.display = any ? '' : 'none';
        });
      });
      panel.appendChild(search);
    }
    function label(p) {
      var m = PAPER_RE.exec(p.name);
      return m ? '<span class="scn-ref">' + esc(m[1]) + '</span><span class="scn-name">' + esc(m[2] || 'Exam question') + '</span>' : '<span class="scn-name">' + esc(p.name) + '</span>';
    }
    var order = ['paper', 'classic', 'whatif'];
    order.forEach(function (gk) {
      var items = list.map(function (p, i) { return { p: p, i: i }; }).filter(function (x) { return scenarioGroup(x.p.name) === gk; });
      if (!items.length) return;
      var grp = h('div', { class: 'scn-group' }, [h('div', { class: 'scn-ghead', html: '<b>' + GROUP_INFO[gk][0] + '</b><span>' + GROUP_INFO[gk][1] + '</span>' })]);
      items.forEach(function (x) {
        grp.appendChild(h('button', { type: 'button', class: 'scn-item scn-' + gk, role: 'option', 'data-i': String(x.i), html: label(x.p), onclick: function () { api.select(x.i); open(false); } }));
      });
      panel.appendChild(grp);
    });
    function open(v) {
      panel.style.display = v ? '' : 'none'; cur.setAttribute('aria-expanded', String(v)); cur.classList.toggle('open', v);
      if (v) { var a = panel.querySelector('.scn-item.on') || panel.querySelector('.scn-item'); if (a && a.focus) try { a.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    }
    cur.addEventListener('click', function () { open(panel.style.display === 'none'); });
    function showCurrent() {
      var i = sel.value === '' ? -1 : Number(sel.value);
      cur.innerHTML = i < 0 ? '<span class="scn-ph">✦ Pick a scenario</span><span class="scn-count">' + list.length + ' ready-made set-ups</span>'
        : '<span class="scn-kicker">Scenario</span>' + label(list[i]) + '<span class="scn-change">Change</span>';
      Array.prototype.forEach.call(panel.querySelectorAll ? panel.querySelectorAll('.scn-item') : [], function (b) { b.classList.toggle('on', b.getAttribute('data-i') === sel.value); });
    }
    container.appendChild(sel); container.appendChild(cur); container.appendChild(panel); container.appendChild(note);
    sel.addEventListener('change', function () {
      showCurrent();
      if (sel.value === '') { note.innerHTML = ''; return; }
      var p = list[Number(sel.value)]; note.innerHTML = p.note || ''; apply(p); notify();
      try {
        var gid = root.parent && root.parent !== root && root.parent.location ? new URLSearchParams(root.parent.location.search).get('g') : null;
        if (gid && root.parent.SIM_PROGRESS) root.parent.SIM_PROGRESS.recordPreset(gid);
      } catch (e) { /* ignore */ }
    });
    showCurrent();
    var api = { el: sel, select: function (i) { sel.value = String(i); sel.dispatchEvent(new Event('change')); },
      /** call once at the END of page setup: applies ?preset=N from the URL (used by hub deep links) */
      fromQuery: function () { var q = query.get('preset'); if (q !== null && list[Number(q)]) api.select(Number(q)); } };
    return api;
  }

  /* ---------- readout: working laid out top to bottom, like a mark scheme ----------
     eq(lhs, work, value, unit) renders
         X  =  ΣF cos θ                     ← each " = " in work starts a new line
            =  10 cos 23° − 15 cos 30°
            =  9.21 − 13.0
            =  −3.79 N                      ← the answer, highlighted
     A plain-words work string ("displacement from O") becomes a small note beside the symbol instead of a step. */
  var MATHWORDS = /^(sin|cos|tan|sec|cot|cosec|sqrt|max|min|log|ln|exp|and|or)$/i;
  function stripTags(t) { return String(t).replace(/<[^>]+>/g, ''); }
  /** is this text words (a description) rather than a formula? */
  function isProse(t) {
    var words = stripTags(t).match(/[A-Za-z]{3,}/g) || [];
    return words.filter(function (w) { return !MATHWORDS.test(w); }).length >= 2;
  }
  /** typographic minus, outside HTML tags only */
  function niceMinus(html) {
    return String(html).split(/(<[^>]+>)/).map(function (part) {
      return part.charAt(0) === '<' ? part : part.replace(/(^|[\s(=+×÷,\[])-(?=[\d.(√a-zA-Zα-ωΣ])/g, '$1−').replace(/ - /g, ' − ');
    }).join('');
  }
  function sameNumber(stepHtml, v) {
    var t = stripTags(stepHtml).replace(/−/g, '-').trim();
    if (!/^-?[\d.]+$/.test(t) || typeof v !== 'number') return false;
    return Math.abs(Number(t) - v) <= 1e-9 + 5e-4 * Math.abs(v);
  }
  /* The working is shown as a walkthrough: the result first, then the method one step at a time.
     Each head() starts a step; everything before the first head is the summary shown above the steps.
     The current step is kept while the readout re-renders (every animation frame), and students can
     tap a step, use Back / Next (or ← / →), or switch to "Show all steps". */
  /* Fallback explanations for common working lines, matched on the left-hand side (pages can pass their own `why`). */
  var WHY = [
    [/^momentum before|^p before|^total momentum before/i, 'Momentum = mass × velocity. Add it for every body, keeping the sign of each velocity (direction matters).'],
    [/^momentum after|^p after|^total momentum after/i, 'With no external impulse, total momentum after the collision equals total momentum before.'],
    [/^KE before/i, 'Kinetic energy = ½mv² for each body. It is a scalar, so just add the values (no directions).'],
    [/^KE after/i, 'Same formula with the speeds after the event. Compare with KE before to see what was lost (or gained).'],
    [/^KE (lost|loss)|^loss of KE|^KE gained/i, 'The difference between the two totals: energy changed into heat, sound and deformation (or released, in an explosion).'],
    [/^V$|^common velocity|^v<sub>common/i, 'They move together, so one velocity: total momentum ÷ total mass.'],
    [/^(a|acceleration)$/i, 'Newton’s second law: acceleration = resultant force ÷ mass, along the direction of motion.'],
    [/^(F|resultant|resultant force|F<sub>net<\/sub>|ΣF)$/i, 'Add the forces along the line of motion, taking one direction as positive.'],
    [/^(R|N|normal reaction|normal contact force)$/i, 'Perpendicular to the surface nothing accelerates, so the forces that way balance.'],
    [/^(F<sub>max<\/sub>|limiting friction|μR|F ?= ?μR)/i, 'Limiting friction = μ × normal reaction: the largest friction the surface can supply.'],
    [/^(W|weight|mg)$/i, 'Weight = mass × g, acting vertically down.'],
    [/^(T|tension)$/i, 'Tension comes from the equation of motion (or equilibrium) of the body the string pulls on.'],
    [/^(v|final velocity|speed)$/i, 'Choose the suvat equation that contains the three quantities you know and the one you want.'],
    [/^(s|displacement|distance)$/i, 'Displacement from suvat, or the area under the velocity–time graph.'],
    [/^(t|time)$/i, 'Solve for the time from the suvat equation (reject any negative root).'],
    [/^(P|power)$/i, 'Power = driving force × speed (or work done ÷ time).'],
    [/^(KE|kinetic energy)$/i, 'Kinetic energy = ½ × mass × speed².'],
    [/^(PE|GPE|ΔGPE|gravitational potential energy)/i, 'Change in gravitational potential energy = mgh, with h the vertical height change.'],
    [/^(WD|work done|work)/i, 'Work done = force × distance moved in the direction of the force.']
  ];
  // the fallback hints are mechanics wording, so only use them on mechanics pages (9709, and 9702 topics 2–5): "R" in a circuit is a resistance
  function mechanicsPage() { try { return /\/9709\/|\/9702\/p[2-5]-/.test(root.location.pathname); } catch (e) { return false; } }
  function autoWhy(lhs) { if (!mechanicsPage()) return ''; var k = stripTags(String(lhs || '')).trim(); for (var i = 0; i < WHY.length; i++) if (WHY[i][0].test(k)) return WHY[i][1]; return ''; }

  var allReadouts = [];
  function isWalkActive() {
    if (typeof document === 'undefined' || !document.body || !document.body.classList) return false;
    if (!document.body.classList.contains('ws-clean')) return true;
    return document.body.classList.contains('ws-calc-open') || !!(document.querySelector && document.querySelector('.step-studio'));
  }
  function Readout(container) {
    var buf = [], el = h('div', { class: 'readout' }), page = 0, showAll = false, lastTitles = '', onDiagram = true, lastFocus = '', shownPage = -1;
    var results = [], curHead = '', lastStepsCount = 0, lastSteps = [];
    container.appendChild(el);
    if (el.addEventListener) {
      el.addEventListener('click', function (e) {
        var b = e.target && e.target.closest ? e.target.closest('[data-walk]') : null; if (!b) return;
        var w = b.getAttribute('data-walk');
        if (w === 'prev') page--; else if (w === 'next') page++; else if (w === 'all') showAll = !showAll; else if (w === 'diag') onDiagram = !onDiagram; else page = Number(w);
        api.render();
        try { el.dispatchEvent(new Event('walkchange', { bubbles: true })); } catch (err) { /* old browsers */ }
        var t = el.querySelector('.walk-page .walk-title'); if (t && w !== 'all' && t.focus) try { t.focus({ preventScroll: true }); } catch (err) { /* ignore */ }
      });
      el.addEventListener('keydown', function (e) {
        if (showAll || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName))) return;
        page += e.key === 'ArrowRight' ? 1 : -1; api.render();
        try { el.dispatchEvent(new Event('walkchange', { bubbles: true })); } catch (err) { /* old browsers */ }
        e.preventDefault();
      });
    }
    var api = {
      el: el,
      clear: function () { buf = []; results = []; curHead = ''; return api; },
      head: function (t) { curHead = stripTags(t); buf.push({ head: t }); return api; },
      /** eq('a', 'F/m = 12/3', 4, 'm s<sup>−2</sup>') — value may be a number (formatted 3 s.f.) or html string */
      eq: function (lhs, work, value, unit, why) {
        var v = typeof value === 'number' ? U.sf(value) : (value === undefined ? '' : String(value));
        if (v !== '') {
          var vPlain = stripTags(v);
          var nVal = typeof value === 'number' ? value : parseNum(vPlain.replace(/−/g, '-'));
          results.push({ name: stripTags(lhs), symbol: stripTags(lhs), value: vPlain, num: nVal, unit: unit ? stripTags(unit) : '', step: curHead, stepIdx: Math.max(0, buf.filter(function (x) { return x && x.head !== undefined; }).length - 1) });
        }
        var wy = why || autoWhy(lhs), whyHtml = wy ? '<div class="why">' + wy + '</div>' : '';
        // no single answer: the work is one or more whole equations (e.g. "−T₁ cos 35° + T₂ cos 40° = 0"); one per line, kept intact
        if (v === '' && work && !isProse(String(work).split(/<br\s*\/?>/i)[0])) {
          var eqs = String(work).split(/<br\s*\/?>/i).filter(function (x) { return stripTags(x).trim() !== ''; });
          var hh = '<div class="eq eqn"><div class="lines">';
          eqs.forEach(function (q, i) { hh += '<span class="lhs">' + (i === 0 ? lhs : '') + '</span><span class="rel">' + (i === 0 && lhs ? ':' : '') + '</span><span class="ex">' + niceMinus(q) + '</span>'; });
          buf.push(hh + '</div>' + whyHtml + '</div>'); return api;
        }
        var note = '', steps = [];
        if (work) {
          var parts = String(work).split(' = ');
          // a leading description ("sum of signed areas = …") becomes the note; formulas become steps
          if (isProse(parts[0])) { note = parts.shift(); }
          parts.forEach(function (p) { if (isProse(p) && !/\d/.test(stripTags(p))) note = note ? note + '; ' + p : p; else steps.push(p); });
        }
        if (steps.length && v !== '' && sameNumber(steps[steps.length - 1], value)) steps.pop();
        var rows = steps.map(function (st) { return '<span class="rel">=</span><span class="ex">' + niceMinus(st) + '</span>'; });
        if (v !== '') {
          var hasRel = /\s=\s|=/.test(stripTags(v)) && typeof value !== 'number';
          rows.push('<span class="rel">' + (hasRel ? '' : '=') + '</span><span class="ex fin"><span class="res">' + niceMinus(v) + '</span>' + (unit ? ' <span class="u">' + unit + '</span>' : '') + '</span>');
        }
        var html = '<div class="eq">' + (note ? '<div class="note">' + note + '</div>' : '') + '<div class="lines">';
        rows.forEach(function (r, i) { html += '<span class="lhs">' + (i === 0 ? lhs : '') + '</span>' + r; });
        if (!rows.length) html += '<span class="lhs">' + lhs + '</span><span class="rel"></span><span class="ex"></span>';
        buf.push(html + '</div>' + whyHtml + '</div>');
        return api;
      },
      /** plain-English reason for the step just added (or a stand-alone explanation line) */
      why: function (t) { var last = buf[buf.length - 1]; if (typeof last === 'string' && /^<div class="eq/.test(last) && last.indexOf('class="why"') < 0) buf[buf.length - 1] = last.replace(/<\/div>$/, '<div class="why">' + t + '</div></div>'); else buf.push('<div class="why solo">' + t + '</div>'); return api; },
      badge: function (t, kind) { buf.push('<span class="badge ' + (kind || 'info') + '">' + t + '</span>'); return api; },
      html: function (s) { buf.push(s); return api; },
      render: function () {
        // split into the summary (before the first head) and steps
        var top = [], steps = [], cur = null;
        buf.forEach(function (x) {
          if (x && x.head !== undefined) { cur = { title: x.head, items: [] }; steps.push(cur); }
          else (cur ? cur.items : top).push(x);
        });
        if (steps.length < 2) { lastStepsCount = steps.length; lastSteps = []; el.innerHTML = top.join('') + steps.map(function (st) { return '<div class="head">' + st.title + '</div>' + st.items.join(''); }).join(''); api.syncFocus(); return api; }
        lastStepsCount = steps.length;
        var titles = steps.map(function (st) { return stripTags(st.title); }).join('|');
        if (titles !== lastTitles && lastTitles) { var keep = lastTitles.split('|')[page]; var k = steps.map(function (st) { return stripTags(st.title); }).indexOf(keep); page = k >= 0 ? k : 0; }
        lastTitles = titles;
        page = Math.max(0, Math.min(steps.length - 1, page));
        var n = steps.length, html = '';
        if (top.length) html += '<div class="walk-top">' + top.join('') + '</div>';
        html += '<div class="walk-bar"><span class="walk-label">' + (showAll ? 'All ' + n + ' steps' : 'How to get it · step ' + (page + 1) + ' of ' + n) + '</span>' +
          '<button type="button" class="walk-all" data-walk="all">' + (showAll ? 'One step at a time' : 'Show all steps') + '</button></div>';
        if (!showAll) html += '<button type="button" class="walk-diag' + (onDiagram ? ' on' : '') + '" data-walk="diag" aria-pressed="' + onDiagram + '"><i></i>Show each step on the simulation</button>';
        if (!showAll) {
          html += '<ol class="walk-steps" role="tablist">' + steps.map(function (st, i) {
            return '<li><button type="button" role="tab" data-walk="' + i + '" aria-selected="' + (i === page) + '" class="' + (i < page ? 'done' : i === page ? 'cur' : '') + '">' +
              '<b>' + (i + 1) + '</b><span>' + stripTags(st.title) + '</span></button></li>';
          }).join('') + '</ol>';
          var st = steps[page];
          html += '<section class="walk-page' + (page !== shownPage ? ' enter' : '') + '" aria-live="polite"><h3 class="walk-title" tabindex="-1"><span class="walk-num">' + (page + 1) + '</span>' + st.title + '</h3>' + st.items.join('') + '</section>';
          html += '<div class="walk-nav"><button type="button" class="btn" data-walk="prev"' + (page === 0 ? ' disabled' : '') + '>← Back</button>' +
            '<span class="walk-dots" aria-hidden="true">' + steps.map(function (x, i) { return '<i class="' + (i === page ? 'on' : '') + '"></i>'; }).join('') + '</span>' +
            (page < n - 1 ? '<button type="button" class="btn primary" data-walk="next">Next: ' + stripTags(steps[page + 1].title) + ' →</button>' : '<span class="walk-end">✓ That’s the whole method</span>') + '</div>';
        } else {
          html += steps.map(function (st2, i) { return '<section class="walk-page all"><h3 class="walk-title"><span class="walk-num">' + (i + 1) + '</span>' + st2.title + '</h3>' + st2.items.join('') + '</section>'; }).join('');
        }
        el.innerHTML = html; shownPage = showAll ? -1 : page; lastSteps = steps;
        api.syncFocus();
        return api;
      },
      syncFocus: function () {
        var keys = [];
        if (onDiagram && !showAll && isWalkActive() && lastSteps && lastSteps[page]) {
          lastSteps[page].items.forEach(function (it) { var m = /<span class="lhs">([\s\S]*?)<\/span>/.exec(it); if (m && m[1]) keys.push(stripTags(m[1])); });
        }
        var fk = keys.join('|');
        if (fk !== lastFocus && SIM.view && SIM.view.setFocus) {
          lastFocus = fk; SIM.view.setFocus(keys.length ? keys : null);
          setTimeout(function () { themeChanged(); setTimeout(themeChanged, 30); }, 0);
        }
      },
      getResults: function () { return results.slice(); },
      getStepInfo: function () { return { page: page, count: lastStepsCount, showAll: showAll }; },
      setStep: function (p) {
        if (lastStepsCount < 2) return;
        showAll = false;
        page = Math.max(0, Math.min(lastStepsCount - 1, p));
        api.render();
        try { el.dispatchEvent(new Event('walkchange', { bubbles: true })); } catch (err) { /* ignore */ }
      }
    };
    allReadouts.push(api);
    return api;
  }
  /** Exam mode: answers are blurred; tap/click a line (or focus it and press Enter/Space) to reveal it,
      or step through with "Reveal next". Works on touch screens and with a keyboard, not only on hover.
      Revealed lines are remembered by position while the readout re-renders, and hidden again when an input changes. */
  var examResets = [];
  function examToggle(container, target) {
    var on = false, revealed = {};
    var count = h('span', { class: 'exam-count', 'aria-live': 'polite' });
    var bar = h('div', { class: 'exam-bar', style: 'display:none' }, [
      h('button', { class: 'btn primary', text: 'Reveal next line', onclick: function () {
        var ls = lines(); for (var i = 0; i < ls.length; i++) if (!revealed[i]) { revealed[i] = true; break; } apply();
      } }),
      h('button', { class: 'btn', text: 'Reveal all', onclick: function () { lines().forEach(function (e, i) { revealed[i] = true; }); apply(); } }),
      h('button', { class: 'btn', text: 'Hide all', onclick: function () { revealed = {}; apply(); } }),
      count]);
    /** only lines that actually have a hidden answer (equation-only lines have nothing to reveal) */
    function lines() {
      return Array.prototype.slice.call(target.querySelectorAll('.eq')).filter(function (e) {
        var r = e.querySelector('.res'); return r && String(r.textContent || '').trim() !== '';
      });   // (only the current walkthrough step is in the page, so these are the lines the student can see)
    }
    function apply() {
      var ls = lines(), n = 0;
      ls.forEach(function (el, i) {
        if (on) {
          var want = !!revealed[i]; if (want) n++;
          if (el.classList.contains('revealed') !== want) el.classList.toggle('revealed', want);
          if (el.getAttribute('tabindex') !== '0') { el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); }
          if (el.getAttribute('aria-pressed') !== String(want)) el.setAttribute('aria-pressed', String(want));
        } else if (el.getAttribute('tabindex') !== null) {
          el.removeAttribute('tabindex'); el.removeAttribute('role'); el.removeAttribute('aria-pressed'); el.classList.remove('revealed');
        }
      });
      var txt = on ? n + ' of ' + ls.length + ' answers shown' : '';
      if (count.textContent !== txt) count.textContent = txt;
    }
    function hit(e) {
      if (!on) return null;
      var eq = e.target.closest && e.target.closest('.eq');
      return eq && target.contains(eq) ? eq : null;
    }
    function flip(eq) { var i = lines().indexOf(eq); if (i >= 0) { revealed[i] = !revealed[i]; apply(); } }
    target.addEventListener('click', function (e) { var eq = hit(e); if (eq) flip(eq); });
    target.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var eq = hit(e); if (eq) { e.preventDefault(); flip(eq); }
    });
    if (root.MutationObserver) new MutationObserver(apply).observe(target, { childList: true, subtree: true });
    target.addEventListener('walkchange', function () { revealed = {}; apply(); });   // a new step starts hidden
    examResets.push(function () { if (on) { revealed = {}; apply(); } });
    var t = toggle(container, { label: 'Exam mode: hide answers (tap a line to reveal it)' }, function (v) {
      on = v; revealed = {}; target.classList.toggle('exam-hidden', on); bar.style.display = on ? '' : 'none'; apply();
      if (v) try {
        var gid = root.parent && root.parent !== root && root.parent.location ? new URLSearchParams(root.parent.location.search).get('g') : null;
        if (gid && root.parent.SIM_PROGRESS) root.parent.SIM_PROGRESS.recordExamMode(gid);
      } catch (e) { /* ignore */ }
    });
    container.appendChild(bar);
    return t;
  }
  function notes(container, items) {
    var ul = h('ul'); items.forEach(function (t) { ul.appendChild(h('li', { html: t })); });
    container.appendChild(h('div', { class: 'notes' }, [ul]));
  }
  function legend(container, items) {
    var d = h('div', { class: 'legend' });
    items.forEach(function (it) { d.appendChild(h('span', { html: '<i style="background:' + it.color + '"></i>' + it.label })); });
    container.appendChild(d); return d;
  }

  /** read numbers from the URL hash (#m=3&theta=30) so a setup can be shared */
  function readHash() {
    var o = {}; (location.hash || '').replace(/^#/, '').split('&').forEach(function (kv) {
      if (!kv) return; var p = kv.split('='); var v = decodeURIComponent(p[1] || ''); o[decodeURIComponent(p[0])] = isFinite(Number(v)) && v !== '' ? Number(v) : v;
    }); return o;
  }
  var hashTimer = null;
  function writeHash(obj) {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(function () {
      var s = Object.keys(obj).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]); }).join('&');
      history.replaceState(null, '', location.pathname + location.search + '#' + s);
    }, 250);
  }

  /** escape for safe HTML interpolation of user-provided text */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- simulation-first workspace: clean hero stage + corner/fullscreen popup drawers ---------- */
  var wsDrawers = [], wsGlobalRefs = null;
  function makeDrawer(cls, title, allowFullscreen, onOpen, extraBtn) {
    var body = h('div', { class: 'ws-dbody' });
    var fsBtn = allowFullscreen ? h('button', { type: 'button', class: 'ws-dbtn', text: '⛶ Fullscreen', title: 'Toggle fullscreen', onclick: function () {
      var fs = box.classList.toggle('fullscreen');
      fsBtn.textContent = fs ? '🗗 Restore' : '⛶ Fullscreen';
      if (onOpen) onOpen();
    } }) : null;
    var box = h('section', { class: 'ws-drawer ' + cls, role: 'dialog', 'aria-label': title }, [
      h('div', { class: 'ws-dhead' }, [
        h('h3', { text: title }),
        extraBtn || null,
        fsBtn,
        h('button', { type: 'button', class: 'ws-dbtn', text: '×', 'aria-label': 'Close ' + title, onclick: function () { setOpen(false); } })
      ]),
      body
    ]);
    box.hidden = true;
    var pill = null;
    function setOpen(v) {
      box.hidden = !v;
      if (pill) pill.classList.toggle('on', v);
      if (cls === 'calc-box' && document.body && document.body.classList) {
        document.body.classList.toggle('ws-calc-open', v);
        allReadouts.forEach(function (r) { if (r.syncFocus) r.syncFocus(); });
      }
      if (v && onOpen) onOpen();
    }
    document.body.appendChild(box);
    var d = { el: box, body: body, isOpen: function () { return !box.hidden; }, setOpen: setOpen, toggle: function () { setOpen(box.hidden); }, bindPill: function (p) { pill = p; } };
    wsDrawers.push(d);
    return d;
  }
  function initWorkspace(refs) {
    if (!stage || !stage.el || !stage.dock || !document.body || !document.body.classList) return;
    if (!refs.setup.length && !refs.explain.length && !refs.calc.length) return;
    wsGlobalRefs = refs;
    document.body.classList.add('ws-clean');
    function fireResize() {
      setTimeout(function () {
        if (typeof root.dispatchEvent === 'function') root.dispatchEvent(new Event('resize'));
        themeChanged();
      }, 30);
    }
    var dData = makeDrawer('top-left', '⚙ Data & Parameters', true, fireResize);
    var dExplain = makeDrawer('bottom-left', '💡 Explanations & Legend', true, fireResize);
    var studioShortcut = h('button', { type: 'button', class: 'ws-dbtn', text: '⚡ Step Studio', title: 'Open Fullscreen Synced Step Studio', onclick: function () { dCalc.setOpen(false); openStepStudio(); } });
    var dCalc = makeDrawer('calc-box', '📊 Calculations & Graphs', true, fireResize, studioShortcut);

    var cnt = visibleParams().length;
    var bData = h('button', { type: 'button', class: 'ws-pill', html: '⚙ <span class="ws-lbl">Data &amp; Setup</span>' + (cnt ? '<span class="ws-cnt">' + cnt + '</span>' : ''), onclick: function () { dData.toggle(); } });
    var bExp = h('button', { type: 'button', class: 'ws-pill', html: '💡 <span class="ws-lbl">Explain</span>', onclick: function () { dExplain.toggle(); } });
    var bCalcX = h('button', { type: 'button', class: 'ws-pill calc-x', hidden: true, html: '⚡ <span class="ws-lbl">Calculate x</span>', onclick: function (e) {
      if (e && e.target && e.target.classList && e.target.classList.contains('calc-clear')) { e.stopPropagation(); clearMarkedX(); return; }
      calculateMarkedX();
    } });
    wsCalcXPill = bCalcX;
    var bSolve = h('button', { type: 'button', class: 'ws-pill', html: '🔍 <span class="ws-lbl">Solve for x</span>', onclick: function () { openSolveForX(); } });
    var bStudio = h('button', { type: 'button', class: 'ws-pill', html: '⛶ <span class="ws-lbl">Step Studio</span>', onclick: function () { openStepStudio(); } });
    var bCalc = h('button', { type: 'button', class: 'ws-pill primary', html: '📊 <span class="ws-lbl">Calculations &amp; Graphs</span>', onclick: function () { dCalc.toggle(); } });
    dData.bindPill(bData); dExplain.bindPill(bExp); dCalc.bindPill(bCalc);

    // Mount floating corner triggers directly over the full-screen stage
    var tl = h('div', { class: 'ws-corner tl' }, [bData]);
    var bl = h('div', { class: 'ws-corner bl' });
    var br = h('div', { class: 'ws-corner br' });
    if (refs.explain.length) bl.appendChild(bExp);
    br.appendChild(bCalcX);
    if (solveableParams().length) br.appendChild(bSolve);
    if (refs.calc.length) { br.appendChild(bStudio); br.appendChild(bCalc); }
    if (query.get('embed') === '1') {
      tl.appendChild(h('button', { type: 'button', class: 'ws-pill', html: '⇣ <span class="ws-lbl">Fetch Data</span>', onclick: openDataHub }));
      tl.appendChild(h('button', { type: 'button', class: 'ws-pill', html: '? <span class="ws-lbl">Guide</span>', onclick: openGuide }));
    }
    stage.el.appendChild(tl);
    if (bl.children.length) stage.el.appendChild(bl);
    if (br.children.length) stage.el.appendChild(br);

    dData.body.appendChild(stage.dock);
    refs.setup.forEach(function (c) { dData.body.appendChild(c); });
    if (refs.left && refs.left.querySelectorAll) {
      Array.prototype.slice.call(refs.left.querySelectorAll('.legend')).forEach(function (lg) {
        if (!bl.children.length) bl.appendChild(bExp);
        if (!bl.parentNode) stage.el.appendChild(bl);
        dExplain.body.appendChild(lg);
      });
      Array.prototype.slice.call(refs.left.querySelectorAll('.plots')).forEach(function (pl) { dCalc.body.appendChild(pl); });
      Array.prototype.slice.call(refs.left.children).slice(1).forEach(function (extra) {
        if (extra.classList && extra.classList.contains('card')) dCalc.body.appendChild(extra);
      });
    }
    refs.explain.forEach(function (c) { dExplain.body.appendChild(c); });
    refs.calc.forEach(function (c) { dCalc.body.appendChild(c); });
    fireResize();
  }

  /* ---------- dock quick-entry & universal modals (? Guide, Quick Edit All, Fetch Data Hub) ---------- */
  var dockToolsAdded = false, activeModal = null;
  function closeModal() {
    if (!activeModal) return;
    if (activeModal.parentNode) activeModal.parentNode.removeChild(activeModal);
    activeModal = null;
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && activeStudio) { activeStudio.close(); return; }
      if (e.key === 'Escape' && activeModal) { closeModal(); return; }
      if (e.key === 'Escape') { var closed = false; wsDrawers.forEach(function (d) { if (d.isOpen()) { d.setOpen(false); closed = true; } }); if (closed) return; }
      if (e.target && /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName || '')) return;
      if (activeModal || pop || activeStudio) return;
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openGuide(); return; }
      if (e.key === ' ' && SIM.anim && SIM.anim.clocks && SIM.anim.clocks.length) { e.preventDefault(); SIM.anim.clocks[0].toggle(); }
    });
  }
  function openModal(title, bodyEl) {
    closeModal();
    var back = h('div', { class: 'sim-modal-back', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    var box = h('div', { class: 'sim-modal' }, [
      h('div', { class: 'sim-modal-head' }, [
        h('h2', { text: title }),
        h('button', { type: 'button', class: 'sim-modal-close', text: '×', 'aria-label': 'Close', onclick: closeModal })
      ]),
      h('div', { class: 'sim-modal-body' }, [bodyEl])
    ]);
    back.appendChild(box);
    back.addEventListener('click', function (e) { if (e.target === back) closeModal(); });
    document.body.appendChild(back);
    activeModal = back;
    return box;
  }
  function ensureDockTools() {
    if (!stage || !stage.dock || dockToolsAdded) return;
    if (allDocked.length < 2) return;
    dockToolsAdded = true;
    var bEdit = h('button', { type: 'button', class: 'pchip dock-act', text: '✎ Edit all', title: 'Edit all parameters at once', onclick: openQuickEntry });
    stage.dock.appendChild(bEdit);
    if (query.get('embed') === '1') {
      stage.dock.appendChild(h('button', { type: 'button', class: 'pchip dock-act', text: '⇣ Fetch Data', title: 'Extract from question or export data', onclick: openDataHub }));
      stage.dock.appendChild(h('button', { type: 'button', class: 'pchip dock-act', text: '? Guide', title: 'How to use this simulation', onclick: openGuide }));
    }
  }
  function visibleParams() {
    return allDocked.filter(function (r) { return !r.locked && r.vis && r.chip && r.chip.style.display !== 'none'; });
  }
  function openQuickEntry() {
    var list = visibleParams();
    if (!list.length) return;
    var wrap = h('div', {}), grid = h('div', { class: 'qentry-grid' }), inputs = [];
    wrap.appendChild(h('p', { style: 'margin:0 0 12px;color:var(--muted)', html: 'Type values directly and press <span class="guide-kbd">Tab</span> to move between fields. Supports SI prefixes (<code>4.7k</code>, <code>15m</code>, <code>200u</code>) and math (<code>2*pi</code>, <code>1/3</code>).' }));
    list.forEach(function (r) {
      var sp = r.spec;
      var inp = h('input', { type: 'text', inputmode: 'decimal', value: fmtChip(r.ctl.values[sp.key]), 'aria-label': r.labelText });
      function applyVal(v) {
        if (!isFinite(v)) { inp.value = fmtChip(r.ctl.values[sp.key]); return; }
        v = U.clamp(v, Number(sp.min), Number(sp.max));
        inp.value = fmtChip(v);
        r.box.value = v; r.box.dispatchEvent(new Event('change'));
        if (r.renderChip) r.renderChip();
      }
      inp.addEventListener('change', function () { applyVal(parseNum(inp.value)); });
      var bDec = h('button', { type: 'button', class: 'qentry-step', text: '−', 'aria-label': 'Decrease ' + r.labelText, onclick: function () { applyVal(r.ctl.values[sp.key] - r.step); } });
      var bInc = h('button', { type: 'button', class: 'qentry-step', text: '+', 'aria-label': 'Increase ' + r.labelText, onclick: function () { applyVal(r.ctl.values[sp.key] + r.step); } });
      inputs.push(inp);
      grid.appendChild(h('div', { class: 'qentry-item' }, [
        h('label', { html: '<span>' + esc(r.labelText) + '</span>' + (sp.sym ? '<span class="qentry-sym">' + sp.sym + '</span>' : '') }),
        h('div', { class: 'qentry-meta', html: 'Range: ' + U.num(Number(sp.min), 4) + ' – ' + U.num(Number(sp.max), 4) + (sp.unit ? ' ' + sp.unit : '') + ' · Step: ' + U.num(r.step, 4) }),
        h('div', { class: 'qentry-in' }, [bDec, inp, bInc, sp.unit ? h('span', { class: 'unit', html: sp.unit }) : null])
      ]));
    });
    wrap.appendChild(grid);
    wrap.appendChild(h('div', { class: 'hub-bar' }, [
      h('button', { type: 'button', class: 'btn primary', text: 'Done', onclick: closeModal })
    ]));
    openModal('Quick Data Entry — all parameters', wrap);
    if (inputs[0] && inputs[0].focus) setTimeout(function () { inputs[0].focus(); if (inputs[0].select) inputs[0].select(); }, 20);
  }
  function openGuide() {
    var tipTxt = stage && stage.tip && stage.tip.textContent ? stage.tip.textContent : 'Drag handles directly on the simulation canvas or tap parameter chips below.';
    var vis = visibleParams();
    var wrap = h('div', {}), tabs = h('div', { class: 'sim-tabs' }), pane = h('div', {});
    var b1 = h('button', { type: 'button', class: 'sim-tab on', text: '🧭 How to use' });
    var b2 = h('button', { type: 'button', class: 'sim-tab', text: '📐 SI Prefixes & Shortcuts' });
    function show(tab) {
      b1.classList.toggle('on', tab === 1); b2.classList.toggle('on', tab === 2);
      if (tab === 1) {
        pane.innerHTML =
          '<p style="margin-top:0"><b>Current simulation:</b> ' + esc(document.title || 'Physics / Mechanics Simulation') + '</p>' +
          '<div class="guide-grid">' +
            '<div class="guide-card"><h3><span class="guide-num">1</span>Interact on the Canvas</h3><p style="margin:0;color:var(--muted)">' + esc(tipTxt) + '</p></div>' +
            '<div class="guide-card"><h3><span class="guide-num">2</span>Enter Data Easily</h3><p style="margin:0;color:var(--muted)">Tap any chip under the stage, or click <b>✎ Edit all</b> to type everything in one grid. Type SI prefixes like <code>4.7k</code>, <code>15m</code>, <code>200u</code> or math like <code>2*pi</code>, <code>1/4</code>.</p></div>' +
            '<div class="guide-card"><h3><span class="guide-num">3</span>Fetch &amp; Export Data</h3><p style="margin:0;color:var(--muted)">Click <b>⇣ Fetch Data</b> to paste an exam question (auto-extracts values &amp; converts units!) or export live results &amp; time-series tables as CSV, JSON, or Markdown.</p></div>' +
            '<div class="guide-card"><h3><span class="guide-num">4</span>Learn &amp; Test Yourself</h3><p style="margin:0;color:var(--muted)">Switch between <b>Real life</b> and <b>Diagram</b> on the stage. Step through <b>Live working</b> below, or toggle <b>Exam mode</b> to hide answers and check your own working.</p></div>' +
          '</div>' +
          (vis.length ? '<p style="margin:10px 0 6px"><b>Editable values on this page:</b> ' + vis.map(function (r) { return '<code>' + esc(r.labelText) + '</code>'; }).join(' · ') + '</p>' : '') +
          '<p style="margin:8px 0 0;color:var(--muted)"><b>Shortcuts:</b> <span class="guide-kbd">Space</span> play/pause · <span class="guide-kbd">?</span> guide · <span class="guide-kbd">↑</span>/<span class="guide-kbd">↓</span> nudge chip (<span class="guide-kbd">Shift</span> ×10) · <span class="guide-kbd">←</span>/<span class="guide-kbd">→</span> step working · <span class="guide-kbd">Esc</span> close</p>';
      } else {
        pane.innerHTML =
          '<p style="margin-top:0;color:var(--muted)">You can type any of these SI prefixes or math expressions directly into any number box or <b>✎ Edit all</b>:</p>' +
          '<table class="tbl"><thead><tr><th>Prefix / Input</th><th style="text-align:left">Meaning</th><th>Example</th><th>Evaluates to</th></tr></thead><tbody>' +
          '<tr><td><code>G</code></td><td class="txt">giga (×10⁹)</td><td><code>2.4G</code></td><td>2.4×10⁹</td></tr>' +
          '<tr><td><code>M</code></td><td class="txt">mega (×10⁶)</td><td><code>1.5M</code></td><td>1.5×10⁶</td></tr>' +
          '<tr><td><code>k</code></td><td class="txt">kilo (×10³)</td><td><code>4.7k</code></td><td>4700</td></tr>' +
          '<tr><td><code>c</code></td><td class="txt">centi (×10⁻²)</td><td><code>25c</code></td><td>0.25</td></tr>' +
          '<tr><td><code>m</code></td><td class="txt">milli (×10⁻³)</td><td><code>15m</code></td><td>0.015</td></tr>' +
          '<tr><td><code>u</code> / <code>µ</code></td><td class="txt">micro (×10⁻⁶)</td><td><code>200u</code></td><td>0.0002</td></tr>' +
          '<tr><td><code>n</code></td><td class="txt">nano (×10⁻⁹)</td><td><code>550n</code></td><td>5.5×10⁻⁷</td></tr>' +
          '<tr><td><code>p</code></td><td class="txt">pico (×10⁻¹²)</td><td><code>10p</code></td><td>1×10⁻¹¹</td></tr>' +
          '<tr><td>Math</td><td class="txt"><code>+ − * / ^ pi sqrt()</code></td><td><code>2*pi/3</code></td><td>2.094</td></tr>' +
          '</tbody></table>';
      }
    }
    b1.onclick = function () { show(1); }; b2.onclick = function () { show(2); };
    tabs.appendChild(b1); tabs.appendChild(b2);
    wrap.appendChild(tabs); wrap.appendChild(pane);
    show(1);
    openModal('Simulation Guide', wrap);
  }

  /* ---------- Fetch Data Hub (Smart Question Extractor + Live/Time-Series Export + Import) ---------- */
  var UNIT_CONV = {
    'm': ['m', 1], 'cm': ['m', 1e-2], 'mm': ['m', 1e-3], 'um': ['m', 1e-6], 'µm': ['m', 1e-6], 'nm': ['m', 1e-9], 'km': ['m', 1e3],
    's': ['s', 1], 'ms': ['s', 1e-3], 'us': ['s', 1e-6], 'µs': ['s', 1e-6], 'min': ['s', 60], 'h': ['s', 3600],
    'hz': ['Hz', 1], 'khz': ['Hz', 1e3], 'mhz': ['Hz', 1e6], 'ghz': ['Hz', 1e9],
    'kg': ['kg', 1], 'g': ['kg', 1e-3], 'mg': ['kg', 1e-6],
    'w': ['W', 1], 'kw': ['W', 1e3], 'mw': ['W', 1e-3],
    'v': ['V', 1], 'kv': ['V', 1e3], 'mv': ['V', 1e-3],
    'a': ['A', 1], 'ma': ['A', 1e-3], 'ua': ['A', 1e-6], 'µa': ['A', 1e-6],
    'ohm': ['Ω', 1], 'Ω': ['Ω', 1], 'kohm': ['Ω', 1e3], 'kΩ': ['Ω', 1e3], 'mohm': ['Ω', 1e6], 'MΩ': ['Ω', 1e6],
    'n': ['N', 1], 'kn': ['N', 1e3], 'j': ['J', 1], 'kj': ['J', 1e3], 'mj': ['J', 1e6],
    'm/s': ['m/s', 1], 'ms-1': ['m/s', 1], 'km/h': ['m/s', 1 / 3.6], 'deg': ['°', 1], '°': ['°', 1], 'rad': ['rad', 1],
    'c': ['°C', 1], '°c': ['°C', 1], 'k': ['K', 1]
  };
  function normUnit(u) {
    var s = String(u || '').replace(/<[^>]+>/g, '').replace(/\s+/g, '').replace(/−/g, '-').toLowerCase();
    return UNIT_CONV[s] || [s, 1];
  }
  function extractQuestionData(text) {
    var list = visibleParams(), matches = [], used = {};
    // 1. Explicit "symbol = value unit" or "keyword ... value unit"
    list.forEach(function (r) {
      var sp = r.spec, sym = String(sp.sym || '').replace(/<[^>]+>/g, '').trim();
      var lblWords = r.labelText.toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3 && w !== 'the' && w !== 'and' && w !== 'for' && w !== 'from' && w !== 'with'; });
      var targetU = normUnit(sp.unit);
      // Try symbol match first: e.g. f = 50 Hz or λ = 1.5 cm
      var patList = [];
      if (sym) patList.push(new RegExp('(?:^|[\\s,;.(])' + sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*(?:=|is|of|:)\\s*(-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\s*([a-zA-Z°Ωµμ/0-9^-]{0,8})', 'i'));
      lblWords.forEach(function (w) {
        patList.push(new RegExp('\\b' + w + '\\b[^\\d\\n.;]{0,24}?(-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\s*([a-zA-Z°Ωµμ/0-9^-]{0,8})', 'i'));
      });
      for (var i = 0; i < patList.length; i++) {
        var m = patList[i].exec(text);
        if (m) {
          var rawVal = Number(m[1]), uInfo = normUnit(m[2]), val = rawVal;
          if (m[2] && targetU[0] && uInfo[0] === targetU[0]) val = rawVal * uInfo[1] / targetU[1];
          val = Number(U.clamp(val, Number(sp.min), Number(sp.max)).toPrecision(4));
          matches.push({ row: r, val: val, snippet: m[0].trim(), raw: m[1] + (m[2] ? ' ' + m[2] : '') });
          used[sp.key] = true;
          return;
        }
      }
    });
    // 2. Unit-based fallback for any remaining unmatched parameters with distinctive units
    var reAll = /(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*(GHz|MHz|kHz|Hz|nm|µm|um|mm|cm|km|m\/s|km\/h|ms|µs|us|kΩ|MΩ|Ω|ohm|kW|mW|W|kV|mV|V|mA|µA|uA|A|kN|N|kJ|MJ|J|kg|g|°C|°|deg|rad|m|s)\b/g;
    var tok;
    while ((tok = reAll.exec(text)) !== null) {
      var uIn = normUnit(tok[2]), vIn = Number(tok[1]);
      for (var j = 0; j < list.length; j++) {
        var r2 = list[j], sp2 = r2.spec;
        if (used[sp2.key]) continue;
        var tU2 = normUnit(sp2.unit);
        if (tU2[0] && uIn[0] === tU2[0]) {
          var vConv = Number(U.clamp(vIn * uIn[1] / tU2[1], Number(sp2.min), Number(sp2.max)).toPrecision(4));
          matches.push({ row: r2, val: vConv, snippet: tok[0], raw: tok[0] });
          used[sp2.key] = true;
          break;
        }
      }
    }
    return matches;
  }
  function collectSnapshot() {
    var rows = [], seen = {};
    visibleParams().forEach(function (r) {
      rows.push({ kind: 'Input', name: r.labelText, symbol: stripTags(r.spec.sym || r.spec.key), value: r.ctl.values[r.spec.key], unit: stripTags(r.spec.unit || '') });
    });
    allReadouts.forEach(function (ro) {
      if (!ro.getResults) return;
      ro.getResults().forEach(function (r) {
        var key = r.symbol + '|' + r.step;
        if (seen[key]) return; seen[key] = true;
        rows.push({ kind: 'Result', name: r.name, symbol: r.symbol, value: r.value, num: r.num, unit: r.unit, step: r.step, stepIdx: r.stepIdx });
      });
    });
    if (!rows.some(function (r) { return r.kind === 'Result'; }) && typeof document !== 'undefined' && document.querySelectorAll) {
      Array.prototype.forEach.call(document.querySelectorAll('.readout .eq'), function (eq) {
        if (!eq.classList || !eq.classList.contains('eq')) return;
        var lhs = eq.querySelector('.lhs'), res = eq.querySelector('.res'), u = eq.querySelector('.u');
        if (lhs && res && String(res.textContent || '').trim() !== '') {
          var txt = stripTags(res.innerHTML);
          rows.push({ kind: 'Result', name: stripTags(lhs.innerHTML), symbol: stripTags(lhs.innerHTML), value: txt, num: parseNum(txt.replace(/−/g, '-')), unit: u ? stripTags(u.innerHTML) : '' });
        }
      });
    }
    return rows;
  }
  function copyText(txt, statusEl, msg) {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () { if (statusEl) statusEl.textContent = msg || 'Copied!'; }).catch(function () { if (statusEl) statusEl.textContent = 'Copy ready'; });
    } else if (statusEl) statusEl.textContent = msg || 'Ready';
  }
  function downloadFile(name, content, mime) {
    if (typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return;
    var a = h('a', { href: URL.createObjectURL(new Blob([content], { type: mime })), download: name });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
  function openDataHub() {
    var wrap = h('div', {}), tabs = h('div', { class: 'sim-tabs' }), pane = h('div', {});
    var tabDefs = [
      { id: 'extract', label: '⚡ Smart Question Extractor' },
      { id: 'export', label: '📊 Live & Time-Series Data' },
      { id: 'import', label: '📥 Paste JSON / Link' }
    ];
    var tabBtns = {}, curTab = 'extract';
    function renderTab(id) {
      curTab = id;
      Object.keys(tabBtns).forEach(function (k) { tabBtns[k].classList.toggle('on', k === id); });
      pane.innerHTML = '';
      if (id === 'extract') renderExtractTab(pane);
      else if (id === 'export') renderExportTab(pane);
      else renderImportTab(pane);
    }
    tabDefs.forEach(function (t) {
      var b = h('button', { type: 'button', class: 'sim-tab' + (t.id === curTab ? ' on' : ''), text: t.label, onclick: function () { renderTab(t.id); } });
      tabBtns[t.id] = b; tabs.appendChild(b);
    });
    wrap.appendChild(tabs); wrap.appendChild(pane);
    renderTab('extract');
    openModal('Fetch & Export Data Hub', wrap);
  }
  function renderExtractTab(pane) {
    var list = visibleParams();
    var sample = list.slice(0, 4).map(function (r) {
      var sym = stripTags(r.spec.sym || r.spec.key), u = stripTags(r.spec.unit || '');
      return r.labelText.toLowerCase() + ' ' + sym + ' = ' + fmtChip(r.ctl.values[r.spec.key]) + (u ? ' ' + u : '');
    }).join(', ');
    var ta = h('textarea', { class: 'hub-ta', placeholder: 'Paste an A-Level physics/mechanics question here (e.g. "A wave has frequency 50 Hz, wavelength 1.5 cm and amplitude 2.0 cm…")' });
    var matchBox = h('div', { class: 'hub-matches' });
    var status = h('span', { class: 'hub-status' });
    var currentMatches = [];
    function runExtract() {
      currentMatches = extractQuestionData(ta.value);
      matchBox.innerHTML = '';
      if (!currentMatches.length) {
        matchBox.innerHTML = '<p style="margin:0;color:var(--muted);grid-column:1/-1">No matching parameters detected yet. Include units (Hz, m, cm, V, Ω, kg, N, s) or symbols (=).</p>';
        return;
      }
      currentMatches.forEach(function (m) {
        var cb = h('input', { type: 'checkbox' }); cb.checked = true; m.use = true;
        cb.addEventListener('change', function () { m.use = cb.checked; });
        var valIn = h('input', { type: 'text', value: String(m.val) });
        valIn.addEventListener('change', function () { var nv = parseNum(valIn.value); if (isFinite(nv)) m.val = nv; });
        matchBox.appendChild(h('div', { class: 'hub-match' }, [
          cb,
          h('div', { style: 'flex:1;min-width:0' }, [
            h('div', { style: 'font-size:12.5px;font-weight:700', text: m.row.labelText }),
            h('div', { style: 'font-size:11px;color:var(--muted)', text: 'matched: "' + m.snippet + '"' })
          ]),
          valIn,
          m.row.spec.unit ? h('span', { class: 'unit', html: m.row.spec.unit }) : null
        ]));
      });
    }
    ta.addEventListener('input', runExtract);
    pane.appendChild(h('p', { style: 'margin:0 0 8px;color:var(--muted)', text: 'Paste any exam question — numbers and units (cm → m, kΩ → Ω, km/h → m/s) are automatically extracted and converted.' }));
    var solverUrl = (typeof location !== 'undefined' && /\/sims\//.test(location.pathname)) ? '../../solver.html' : 'solver.html';
    var imgDrop = h('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:9px 12px;margin:0 0 10px;border-radius:12px;border:1px dashed var(--accent2);background:color-mix(in srgb, var(--accent2) 8%, var(--panel2))' }, [
      h('span', { style: 'font-size:12.5px;color:var(--ink)', html: '📸 <b>Have a question screenshot?</b> Auto-detect sim, extract values &amp; generate AI working' }),
      h('a', { class: 'btn primary', href: solverUrl, target: '_top', text: 'Open AI Screenshot Solver ↗', style: 'min-height:32px;padding:0 12px;font-size:12.5px' })
    ]);
    pane.appendChild(imgDrop);
    if (sample) {
      pane.appendChild(h('div', { class: 'hub-bar', style: 'margin:0 0 8px' }, [
        h('button', { type: 'button', class: 'btn', text: '✦ Fill with sample text', onclick: function () { ta.value = 'Given ' + sample + '.'; runExtract(); } })
      ]));
    }
    pane.appendChild(ta);
    pane.appendChild(matchBox);
    pane.appendChild(h('div', { class: 'hub-bar' }, [
      h('button', { type: 'button', class: 'btn primary', text: '⚡ Apply to Simulation', onclick: function () {
        var count = 0;
        currentMatches.forEach(function (m) {
          if (!m.use) return;
          var sp = m.row.spec, v = U.clamp(m.val, Number(sp.min), Number(sp.max));
          m.row.box.value = v; m.row.box.dispatchEvent(new Event('change'));
          if (m.row.renderChip) m.row.renderChip();
          count++;
        });
        status.textContent = count ? 'Applied ' + count + ' value' + (count > 1 ? 's' : '') + '!' : 'Select at least one match';
      } }),
      status
    ]));
  }
  function renderExportTab(pane) {
    var rows = collectSnapshot(), status = h('span', { class: 'hub-status' });
    var clocks = SIM.anim && SIM.anim.clocks ? SIM.anim.clocks : [];
    var tsRows = null;
    var tblWrap = h('div', { class: 'hub-tblwrap' });
    function showRows(list, cols) {
      var th = '<tr>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr>';
      var tb = list.map(function (r) { return '<tr>' + cols.map(function (c) { return '<td>' + esc(r[c] !== undefined ? r[c] : '') + '</td>'; }).join('') + '</tr>'; }).join('');
      tblWrap.innerHTML = '<table class="tbl"><thead>' + th + '</thead><tbody>' + tb + '</tbody></table>';
    }
    showRows(rows, ['kind', 'name', 'value', 'unit']);
    function toCSV(list, cols) {
      return [cols.join(',')].concat(list.map(function (r) { return cols.map(function (c) { return '"' + String(r[c] !== undefined ? r[c] : '').replace(/"/g, '""') + '"'; }).join(','); })).join('\n');
    }
    function toMD(list, cols) {
      return ['| ' + cols.join(' | ') + ' |', '| ' + cols.map(function () { return '---'; }).join(' | ') + ' |']
        .concat(list.map(function (r) { return '| ' + cols.map(function (c) { return String(r[c] !== undefined ? r[c] : ''); }).join(' | ') + ' |'; })).join('\n');
    }
    function curData() { return tsRows || { list: rows, cols: ['kind', 'name', 'value', 'unit'] }; }
    pane.appendChild(tblWrap);
    if (clocks.length) {
      var clk = clocks[0];
      var nSel = h('select', { 'aria-label': 'Sample count' }, [10, 20, 50].map(function (n) { return h('option', { value: String(n), text: n + ' time points' }); }));
      pane.appendChild(h('div', { class: 'hub-bar', style: 'margin-bottom:6px' }, [
        nSel,
        h('button', { type: 'button', class: 'btn', text: '⏱ Sample Time-Series', onclick: function () {
          var N = Number(nSel.value) || 10, t0 = clk.t, wasPlaying = clk.playing;
          clk.pause();
          var out = [], cols = ['t_s'];
          for (var i = 0; i <= N; i++) {
            var tt = clk.duration * i / N;
            clk.seek(tt);
            var snap = collectSnapshot().filter(function (x) { return x.kind === 'Result'; });
            var rec = { t_s: Number(tt.toFixed(4)) };
            snap.forEach(function (x) { var k = x.symbol || x.name; if (cols.indexOf(k) < 0) cols.push(k); rec[k] = x.value; });
            out.push(rec);
          }
          clk.seek(t0); if (wasPlaying) clk.play();
          tsRows = { list: out, cols: cols };
          showRows(out, cols);
          status.textContent = 'Sampled ' + out.length + ' rows!';
        } })
      ]));
    }
    pane.appendChild(h('div', { class: 'hub-bar' }, [
      h('button', { type: 'button', class: 'btn primary', text: 'Copy CSV', onclick: function () { var d = curData(); copyText(toCSV(d.list, d.cols), status, 'CSV copied!'); } }),
      h('button', { type: 'button', class: 'btn', text: 'Download .csv', onclick: function () { var d = curData(); downloadFile('simulation-data.csv', toCSV(d.list, d.cols), 'text/csv'); status.textContent = 'Downloaded .csv'; } }),
      h('button', { type: 'button', class: 'btn', text: 'Copy JSON', onclick: function () { var d = curData(); copyText(JSON.stringify(d.list, null, 2), status, 'JSON copied!'); } }),
      h('button', { type: 'button', class: 'btn', text: 'Copy Markdown', onclick: function () { var d = curData(); copyText(toMD(d.list, d.cols), status, 'Markdown copied!'); } }),
      h('button', { type: 'button', class: 'btn', text: 'Copy Share Link', onclick: function () {
        var o = {}; visibleParams().forEach(function (r) { o[r.spec.key] = r.ctl.values[r.spec.key]; });
        var url = location.href.split('#')[0] + '#' + Object.keys(o).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(o[k]); }).join('&');
        copyText(url, status, 'Share link copied!');
      } }),
      status
    ]));
  }
  function renderImportTab(pane) {
    var ta = h('textarea', { class: 'hub-ta', placeholder: 'Paste JSON (e.g. {"f": 50, "lam": 0.4}), key=value pairs (f=50, lam=0.4), or a simulation URL (#f=50&lam=0.4)' });
    var status = h('span', { class: 'hub-status' });
    pane.appendChild(h('p', { style: 'margin:0 0 8px;color:var(--muted)', text: 'Load saved or shared parameters directly into this simulation.' }));
    pane.appendChild(ta);
    pane.appendChild(h('div', { class: 'hub-bar' }, [
      h('button', { type: 'button', class: 'btn primary', text: 'Load Data', onclick: function () {
        var s = ta.value.trim(), obj = null;
        if (!s) return;
        try { if (s.charAt(0) === '{') obj = JSON.parse(s); } catch (e) { obj = null; }
        if (!obj) {
          obj = {};
          var raw = s.indexOf('#') >= 0 ? s.split('#')[1] : s;
          raw.split(/[&\n,;]+/).forEach(function (kv) {
            var p = kv.split('=');
            if (p.length === 2) { var v = parseNum(decodeURIComponent(p[1].trim())); if (isFinite(v)) obj[decodeURIComponent(p[0].trim())] = v; }
          });
        }
        var applied = 0;
        allDocked.forEach(function (r) {
          var k = r.spec.key;
          if (obj[k] !== undefined && isFinite(Number(obj[k]))) {
            var v = U.clamp(Number(obj[k]), Number(r.spec.min), Number(r.spec.max));
            r.box.value = v; r.box.dispatchEvent(new Event('change'));
            if (r.renderChip) r.renderChip();
            applied++;
          }
        });
        status.textContent = applied ? 'Loaded ' + applied + ' parameter' + (applied > 1 ? 's' : '') + '!' : 'No matching parameter keys found';
      } }),
      status
    ]));
  }

  /* ---------- "Solve for x" Unknown Finder & Fullscreen Synced Step Studio ---------- */
  var activeStudio = null;
  function solveableParams() {
    var out = [], seen = {};
    var add = function (r) {
      if (!r || !r.ctl || !r.spec || r.locked) return;
      if (r.row && r.row.style && r.row.style.display === 'none') return;
      if (r.row && r.row.parentNode && r.row.parentNode.style && r.row.parentNode.style.display === 'none') return;
      if (r.chip && r.chip.style && r.chip.style.display === 'none') return;
      var k = r.labelText + '|' + stripTags(r.spec.sym || r.spec.key);
      if (seen[k] || r.spec.key === 'n') return;
      seen[k] = true;
      out.push(r);
    };
    visibleParams().forEach(add);
    allParamRows.forEach(add);
    return out;
  }
  function animateParam(from, to, ms, setter, onDone) {
    if (!isFinite(from) || !isFinite(to) || Math.abs(to - from) < 1e-12 || ms <= 0 || typeof requestAnimationFrame !== 'function' || (SIM.anim && SIM.anim.reducedMotion && SIM.anim.reducedMotion())) {
      setter(to); if (onDone) onDone(); return;
    }
    var t0 = performance.now();
    function tick(now) {
      var p = Math.min(1, (now - t0) / ms);
      var ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      setter(from + (to - from) * ease);
      if (p < 1) requestAnimationFrame(tick);
      else { setter(to); if (onDone) onDone(); }
    }
    requestAnimationFrame(tick);
  }

  function openSolveForX(opts) {
    opts = opts || {};
    var paramsList = solveableParams();
    var resList = collectSnapshot().filter(function (r) { return r.kind === 'Result' && isFinite(r.num); });
    if (!paramsList.length && !resList.length) return;

    var wrap = h('div', {});
    wrap.appendChild(h('p', { style: 'margin:0 0 10px;color:var(--muted)', html: 'Pick a force, angle, mass, or distance to set as unknown <b>x</b> and solve for a target condition — or click any output below to inspect its step-by-step derivation in fullscreen.' }));

    var qSearch = h('input', { type: 'search', class: 'scn-search', placeholder: 'What are you trying to find? e.g. force F₁, angle θ, resultant R, velocity v…', 'aria-label': 'Filter outputs' });
    wrap.appendChild(qSearch);

    if (paramsList.length && resList.length) {
      var xSel = h('select', { 'aria-label': 'Unknown parameter x' }, paramsList.map(function (r, idx) {
        return h('option', { value: String(idx), text: r.labelText + (r.spec.sym ? ' (' + stripTags(r.spec.sym) + ')' : '') });
      }));
      if (opts.preselectRow) {
        var preIdx = paramsList.indexOf(opts.preselectRow);
        if (preIdx >= 0) xSel.value = String(preIdx);
      } else if (markedX && markedX.row) {
        var mkIdx = paramsList.indexOf(markedX.row);
        if (mkIdx >= 0) xSel.value = String(mkIdx);
      }
      var tSel = h('select', { 'aria-label': 'Target result quantity' }, resList.map(function (r, idx) {
        return h('option', { value: String(idx), text: r.symbol + (r.unit ? ' [' + r.unit + ']' : '') + (r.step ? ' — ' + r.step : '') });
      }));
      var eqPref = resList.findIndex(function (r) { return /resultant|net|moment|R|Mnet/i.test(r.symbol + ' ' + r.step); });
      if (eqPref >= 0) tSel.value = String(eqPref);
      var tVal = h('input', { type: 'text', value: '0', placeholder: 'Target value (e.g. 0)', 'aria-label': 'Target value' });
      var msg = h('div', { style: 'margin-top:8px;font-size:13px' });

      var grid = h('div', { class: 'solve-x-grid' }, [
        h('div', { class: 'solve-x-box' }, [h('label', { text: '1. Treat this input as x' }), xSel]),
        h('div', { class: 'solve-x-box' }, [h('label', { text: '2. Target output quantity' }), tSel]),
        h('div', { class: 'solve-x-box' }, [h('label', { text: '3. Desired target value' }), tVal,
          h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;margin-top:2px' }, [
            h('button', { type: 'button', class: 'btn', style: 'min-height:28px;padding:0 10px;font-size:12px', text: '= 0 (Equilibrium)', onclick: function () { tVal.value = '0'; } })
          ])])
      ]);
      wrap.appendChild(grid);

      function setParamSilently(r, val) {
        var v = U.clamp(val, Number(r.spec.min), Number(r.spec.max));
        r.box.value = v;
        r.box.dispatchEvent(new Event('change'));
        if (r.renderChip) r.renderChip();
      }
      function evalTarget(rParam, xTrial, targetSymbol) {
        setParamSilently(rParam, xTrial);
        var snap = collectSnapshot().filter(function (r) { return r.kind === 'Result' && r.symbol === targetSymbol; });
        return snap.length && isFinite(snap[0].num) ? snap[0].num : NaN;
      }

      var solveBtn = h('button', { type: 'button', class: 'btn primary', text: '⚡ Calculate x & Play Step-by-Step', onclick: function () {
        var rP = paramsList[Number(xSel.value)], rT = resList[Number(tSel.value)], want = parseNum(tVal.value);
        if (!rP || !rT || !isFinite(want)) { msg.innerHTML = '<span class="badge warn">Enter a valid numeric target value.</span>'; return; }
        var lo = Number(rP.spec.min), hi = Number(rP.spec.max), orig = Number(rP.ctl.values[rP.spec.key]);
        // 40-point coarse grid + bracketed golden-section / bisection refinement
        var N = 40, bestX = orig, bestErr = Infinity, vals = [];
        for (var i = 0; i <= N; i++) {
          var xi = lo + (hi - lo) * i / N;
          var yi = evalTarget(rP, xi, rT.symbol);
          vals.push({ x: xi, y: yi, e: isFinite(yi) ? yi - want : NaN });
          if (isFinite(yi) && Math.abs(yi - want) < bestErr) { bestErr = Math.abs(yi - want); bestX = xi; }
        }
        var bracket = null;
        for (var j = 1; j < vals.length; j++) {
          if (isFinite(vals[j - 1].e) && isFinite(vals[j].e) && vals[j - 1].e * vals[j].e <= 0) {
            bracket = [vals[j - 1].x, vals[j].x, vals[j - 1].e, vals[j].e]; break;
          }
        }
        if (bracket) {
          var a = bracket[0], b = bracket[1], ea = bracket[2];
          for (var k = 0; k < 24; k++) {
            var mid = 0.5 * (a + b), ym = evalTarget(rP, mid, rT.symbol), em = ym - want;
            if (!isFinite(em)) break;
            if (Math.abs(em) < bestErr) { bestErr = Math.abs(em); bestX = mid; }
            if (ea * em <= 0) { b = mid; } else { a = mid; ea = em; }
          }
        } else {
          // Local narrow search around best coarse sample
          var stepW = (hi - lo) / N, sLo = Math.max(lo, bestX - stepW), sHi = Math.min(hi, bestX + stepW);
          for (var m = 0; m < 20; m++) {
            var xm = sLo + (sHi - sLo) * m / 19, ym2 = evalTarget(rP, xm, rT.symbol);
            if (isFinite(ym2) && Math.abs(ym2 - want) < bestErr) { bestErr = Math.abs(ym2 - want); bestX = xm; }
          }
        }
        var dec = rP.spec.decimals === undefined ? 2 : rP.spec.decimals;
        var finalX = Number(bestX.toFixed(Math.max(2, dec)));
        setParamSilently(rP, finalX);
        var finalY = evalTarget(rP, finalX, rT.symbol);
        if (!isFinite(finalY) || bestErr > Math.max(2, Math.abs(want) * 0.25)) {
          setParamSilently(rP, orig);
          msg.innerHTML = '<span class="badge warn">No exact root found for ' + esc(rT.symbol) + ' = ' + esc(want) + ' inside [' + lo + ', ' + hi + ']. Closest was x = ' + U.sf(finalX) + ' giving ' + esc(rT.symbol) + ' = ' + U.sf(finalY) + '.</span>';
          return;
        }
        closeModal();
        clearMarkedX();
        var cleanActual = Math.abs(finalY - want) < 1e-3 && want === 0 ? '0' : U.sf(finalY);
        animateParam(orig, finalX, 460, function (v) { setParamSilently(rP, v); }, function () {
          openStepStudio({
            focusStep: rT.stepIdx || 0,
            autoPlay: true,
            solveX: {
              paramLabel: rP.labelText, paramSym: stripTags(rP.spec.sym || 'x'), unit: stripTags(rP.spec.unit || ''),
              solvedVal: U.sf(finalX), targetSym: rT.symbol, targetVal: U.sf(want), targetUnit: rT.unit, actualVal: cleanActual
            }
          });
        });
      } });
      wrap.appendChild(h('div', { class: 'hub-bar' }, [solveBtn]));
      wrap.appendChild(msg);
    }

    if (resList.length) {
      wrap.appendChild(h('div', { style: 'margin-top:16px;font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em', text: 'Or jump directly to a calculated quantity' }));
      var pillsWrap = h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:8px' });
      function renderResultPills(filter) {
        pillsWrap.innerHTML = '';
        var f = String(filter || '').trim().toLowerCase();
        resList.forEach(function (r) {
          var txt = r.symbol + ' = ' + r.value + (r.unit ? ' ' + r.unit : '');
          if (f && (txt + ' ' + (r.step || '')).toLowerCase().indexOf(f) < 0) return;
          pillsWrap.appendChild(h('button', { type: 'button', class: 'btn', text: txt, onclick: function () { closeModal(); openStepStudio({ focusStep: r.stepIdx || 0 }); } }));
        });
      }
      qSearch.addEventListener('input', function () { renderResultPills(qSearch.value); });
      renderResultPills('');
      wrap.appendChild(pillsWrap);
    }
    openModal('🔍 What are you trying to find? (Solve for x)', wrap);
  }

  function openStepStudio(opts) {
    if (activeStudio) activeStudio.close();
    opts = opts || {};
    wsDrawers.forEach(function (d) { d.setOpen(false); });
    if (!stage || !stage.el || !wsGlobalRefs) return;

    var moved = [];
    function moveNode(el, dest) {
      if (!el || !dest) return;
      moved.push({ el: el, parent: el.parentNode, next: el.nextSibling });
      dest.appendChild(el);
    }

    var ro = allReadouts[0] || null;
    if (ro && opts.focusStep !== undefined && ro.setStep) ro.setStep(opts.focusStep);

    var stepBadge = h('span', { class: 'chip', text: 'Step 1' });
    var syncMsg = h('span', { text: 'Synced mode: smooth animated playback links stage & graphs' });
    var syncStatus = h('b', { text: 'Ready' });
    var playSpeed = 1;
    var speedSel = h('select', { class: 'studio-speed', 'aria-label': 'Step playback speed' }, [0.5, 1, 1.5, 2].map(function (sp) {
      var o = h('option', { value: String(sp), text: sp + '× speed' }); if (sp === 1) o.selected = true; return o;
    }));
    speedSel.addEventListener('change', function () { playSpeed = Number(speedSel.value) || 1; });
    var progFill = h('i', {});
    var syncBar = h('div', { class: 'studio-sync-bar' }, [
      h('div', { class: 'studio-sync-row' }, [syncMsg, syncStatus, speedSel]),
      h('div', { class: 'studio-prog' }, [progFill])
    ]);
    var autoBtn = h('button', { type: 'button', class: 'btn primary', text: '▶ Play Steps' });
    var replayBtn = h('button', { type: 'button', class: 'btn', text: '↺ Replay' });
    var prevBtn = h('button', { type: 'button', class: 'btn', text: '← Prev' });
    var nextBtn = h('button', { type: 'button', class: 'btn', text: 'Next →' });
    var solveShortcut = solveableParams().length ? h('button', { type: 'button', class: 'btn', text: '🔍 Solve for x', onclick: function () { closeStudio(); openSolveForX(); } }) : null;
    var exitBtn = h('button', { type: 'button', class: 'btn', text: '✕ Exit Fullscreen' });

    var stageHost = h('div', { class: 'studio-stage' });
    var graphsHost = h('div', { class: 'studio-graphs' });
    var leftCol = h('div', { class: 'studio-left' }, [stageHost, syncBar, graphsHost]);
    var rightCol = h('div', { class: 'studio-right' });

    if (opts.solveX) {
      var sx = opts.solveX;
      rightCol.appendChild(h('div', { class: 'studio-solve-banner', html:
        '<span class="x-badge">Solved Unknown x</span>' +
        '<div style="font-size:15px;font-weight:750">Let <code>x</code> = ' + esc(sx.paramLabel) + ' (' + esc(sx.paramSym) + ')</div>' +
        '<div style="font-size:13.5px;color:var(--muted);margin:4px 0">Condition: <b>' + esc(sx.targetSym) + ' = ' + sx.targetVal + (sx.targetUnit ? ' ' + esc(sx.targetUnit) : '') + '</b> (achieved ' + sx.actualVal + ')</div>' +
        '<div style="font-size:18px;font-weight:800;color:var(--accent);margin-top:4px">x = ' + sx.solvedVal + (sx.unit ? ' ' + esc(sx.unit) : '') + '</div>'
      }));
    }

    var studio = h('section', { class: 'step-studio', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Fullscreen Synchronized Step Studio' }, [
      h('header', { class: 'studio-head' }, [
        h('h2', { text: (document.title || 'Simulation') + ' — Step-by-Step Studio' }),
        stepBadge,
        h('div', { class: 'studio-controls' }, [prevBtn, nextBtn, autoBtn, replayBtn, solveShortcut, exitBtn])
      ]),
      h('div', { class: 'studio-split' }, [leftCol, rightCol])
    ]);

    document.body.appendChild(studio);
    moveNode(stage.el, stageHost);
    if (typeof document !== 'undefined' && document.querySelectorAll) {
      Array.prototype.slice.call(document.querySelectorAll('.plots')).forEach(function (pl) { moveNode(pl, graphsHost); });
    }
    (wsGlobalRefs.calc || []).forEach(function (c) { moveNode(c, rightCol); });

    var tweenRaf = null, autoRaf = null, isPlayingSteps = false, stepStartMs = 0, lastClockSeek = -1;
    function stopAutoPlay() {
      isPlayingSteps = false;
      if (autoRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(autoRaf);
      autoRaf = null;
      if (SIM.view && SIM.view.setPulse) { SIM.view.setPulse(0); themeChanged(); }
      autoBtn.textContent = '▶ Play Steps';
    }
    function syncToStep() {
      var info = ro && ro.getStepInfo ? ro.getStepInfo() : { page: 0, count: 1 };
      var total = Math.max(1, info.count);
      stepBadge.textContent = total > 1 ? 'Step ' + (info.page + 1) + ' of ' + total : 'Live Working';
      prevBtn.disabled = total < 2 || info.page <= 0;
      nextBtn.disabled = total < 2 || info.page >= total - 1;
      var clks = SIM.anim && SIM.anim.clocks ? SIM.anim.clocks : [];
      if (clks.length && total > 1) {
        var clk = clks[0], targetT = clk.duration * (info.page / (total - 1));
        if (clk.pause) clk.pause();
        if (!isPlayingSteps && clk.seek) {
          var startT = isFinite(clk.t) ? clk.t : 0;
          if (tweenRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(tweenRaf);
          if (Math.abs(targetT - startT) > 1e-4 && typeof requestAnimationFrame === 'function' && !(SIM.anim.reducedMotion && SIM.anim.reducedMotion())) {
            var tw0 = performance.now();
            var twStep = function (now) {
              var p = Math.min(1, (now - tw0) / 380);
              var ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
              clk.seek(startT + (targetT - startT) * ease);
              if (p < 1) tweenRaf = requestAnimationFrame(twStep); else tweenRaf = null;
            };
            tweenRaf = requestAnimationFrame(twStep);
          } else clk.seek(targetT);
        }
        syncStatus.textContent = 't = ' + U.num(targetT, 2) + ' s (Step ' + (info.page + 1) + '/' + total + ')';
      } else {
        syncStatus.textContent = total > 1 ? 'Step ' + (info.page + 1) + '/' + total + ' highlighted' : 'Vector & diagram focus synced';
      }
      if (!isPlayingSteps) progFill.style.width = total > 1 ? Math.round(((info.page + 1) / total) * 100) + '%' : '100%';
      setTimeout(function () {
        if (typeof root.dispatchEvent === 'function') root.dispatchEvent(new Event('resize'));
        allReadouts.forEach(function (r) { if (r.syncFocus) r.syncFocus(); });
        themeChanged();
      }, 20);
    }

    var onWalk = function () { syncToStep(); };
    if (ro && ro.el && ro.el.addEventListener) ro.el.addEventListener('walkchange', onWalk);
    prevBtn.onclick = function () { stopAutoPlay(); if (ro && ro.setStep) ro.setStep(ro.getStepInfo().page - 1); };
    nextBtn.onclick = function () { stopAutoPlay(); if (ro && ro.setStep) ro.setStep(ro.getStepInfo().page + 1); };

    function startAutoPlay(fromBeginning) {
      stopAutoPlay();
      if (!ro || !ro.getStepInfo || typeof requestAnimationFrame !== 'function') return;
      var inf0 = ro.getStepInfo(), clks = SIM.anim && SIM.anim.clocks ? SIM.anim.clocks : [];
      if (inf0.count < 2 && !clks.length) return;
      if (fromBeginning || (inf0.count > 1 && inf0.page >= inf0.count - 1)) {
        if (ro.setStep && inf0.count > 1) ro.setStep(0);
      }
      isPlayingSteps = true;
      autoBtn.textContent = '⏸ Pause';
      stepStartMs = performance.now();
      lastClockSeek = -1;
      function frame(now) {
        if (!isPlayingSteps || !activeStudio) return;
        var inf = ro.getStepInfo(), total = Math.max(1, inf.count);
        var stepMs = 2800 / playSpeed;
        var p = Math.min(1, (now - stepStartMs) / stepMs);
        var ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        var overall = total > 1 ? ((inf.page + p) / total) * 100 : p * 100;
        progFill.style.width = Math.min(100, overall).toFixed(1) + '%';
        if (clks.length) {
          var clk = clks[0];
          var t0 = total > 1 ? clk.duration * (inf.page / (total - 1)) : 0;
          var t1 = total > 1 ? (inf.page < total - 1 ? clk.duration * ((inf.page + 1) / (total - 1)) : clk.duration) : clk.duration;
          var tt = t0 + (t1 - t0) * ease;
          if (Math.abs(tt - lastClockSeek) > 1e-4) {
            clk.seek(tt);
            lastClockSeek = tt;
            syncStatus.textContent = 't = ' + U.num(tt, 2) + ' s (Step ' + (inf.page + 1) + '/' + total + ')';
          }
        } else if (SIM.view && SIM.view.setPulse) {
          SIM.view.setPulse(0.5 - 0.5 * Math.cos(p * Math.PI * 2));
          themeChanged();
        }
        if (p >= 1) {
          if (inf.page < total - 1) {
            ro.setStep(inf.page + 1);
            stepStartMs = now;
            autoRaf = requestAnimationFrame(frame);
          } else {
            stopAutoPlay();
            progFill.style.width = '100%';
            syncStatus.textContent = 'Completed all ' + total + ' steps ✓';
          }
          return;
        }
        autoRaf = requestAnimationFrame(frame);
      }
      autoRaf = requestAnimationFrame(frame);
    }

    autoBtn.onclick = function () { if (isPlayingSteps) stopAutoPlay(); else startAutoPlay(false); };
    replayBtn.onclick = function () { startAutoPlay(true); };

    function closeStudio() {
      stopAutoPlay();
      if (tweenRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(tweenRaf);
      if (ro && ro.el && ro.el.removeEventListener) ro.el.removeEventListener('walkchange', onWalk);
      for (var i = moved.length - 1; i >= 0; i--) {
        var m = moved[i];
        if (m.parent) m.parent.insertBefore(m.el, m.next && m.next.parentNode === m.parent ? m.next : null);
      }
      if (studio.parentNode) studio.parentNode.removeChild(studio);
      activeStudio = null;
      allReadouts.forEach(function (r) { if (r.syncFocus) r.syncFocus(); });
      setTimeout(function () {
        if (typeof root.dispatchEvent === 'function') root.dispatchEvent(new Event('resize'));
        themeChanged();
      }, 25);
    }
    exitBtn.onclick = closeStudio;
    activeStudio = { close: closeStudio, play: function () { startAutoPlay(true); } };
    syncToStep();
    if (opts.autoPlay) setTimeout(function () { if (activeStudio && activeStudio.play) activeStudio.play(); }, 180);
  }

  // Deep-link support from Question Solver (#markX=F1&autoSolve=1&autoStudio=1) + cross-frame control
  if (typeof root !== 'undefined' && root.addEventListener && typeof document !== 'undefined') {
    var applyHashDirectives = function () {
      var hsh = readHash();
      var touched = 0;
      allParamRows.forEach(function (r) {
        var k = r.spec && r.spec.key;
        if (k && hsh[k] !== undefined && isFinite(Number(hsh[k]))) {
          var v = U.clamp(Number(hsh[k]), Number(r.spec.min), Number(r.spec.max));
          if (Math.abs(r.ctl.values[k] - v) > 1e-6) {
            r.box.value = v; r.box.dispatchEvent(new Event('change'));
            if (r.renderChip) r.renderChip();
            touched++;
          }
        }
      });
      if (hsh.markX && findParamRow(String(hsh.markX))) {
        markAsX(String(hsh.markX));
        if (String(hsh.autoSolve) === '1') setTimeout(function () { calculateMarkedX({ immediate: true }); }, 140);
      } else if (String(hsh.autoStudio) === '1' && wsGlobalRefs) {
        setTimeout(function () { openStepStudio({ autoPlay: true }); }, 140);
      }
    };
    setTimeout(applyHashDirectives, 220);
    root.addEventListener('message', function (ev) {
      if (!ev || !ev.data || typeof ev.data !== 'object') return;
      if (ev.data.type === 'sim-play-studio' && wsGlobalRefs) openStepStudio({ autoPlay: true });
      else if (ev.data.type === 'sim-calc-x' && markedX) calculateMarkedX();
    });
  }

  SIM.ui = { redraw: themeChanged, h: h, course: course, gFor: gFor, colors: colors, onTheme: onTheme, page: page, canvas: canvas, params: params, select: select,
    toggle: toggle, presets: presets, openEditor: openEditor, askNumber: askNumber, parseNum: parseNum, stageTip: stageTip, stageAction: stageAction, placeMode: placeMode, cancelPlace: function () { cancelPlace(false); }, stage: function () { return stage; }, syncChips: function () { syncChips(); }, Readout: Readout, examToggle: examToggle, notes: notes, legend: legend, readHash: readHash, writeHash: writeHash, esc: esc, openSolveForX: openSolveForX, openStepStudio: openStepStudio,
    markAsX: markAsX, clearMarkedX: clearMarkedX, getMarkedX: getMarkedX, registerXCalculator: registerXCalculator, calculateMarkedX: calculateMarkedX, syncMarkedXPill: syncMarkedXPill, animateParam: animateParam };
})(typeof self !== 'undefined' ? self : this);
