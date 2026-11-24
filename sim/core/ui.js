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
        h('button', { type: 'button', class: 'guide-btn', 'aria-label': 'Interactive simulation guide and curriculum lab', html: '<span class="guide-q">?</span><span class="txt">Guide &amp; Learn</span>', onclick: function () { openGuide('tour'); } }),
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
      if (r.renderChip) r.renderChip();
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
  var guideRefreshFn = null, guideProbing = false;
  /** tell the animation clock(s) that an input changed, so the simulation replays from t = 0 */
  function notify() {
    if (!guideProbing) examResets.forEach(function (f) { f(); });   // new numbers: hide exam answers again
    if (allDocked.length) setTimeout(syncChips, 0);
    if (!guideProbing && SIM.anim && SIM.anim.inputChanged) SIM.anim.inputChanged();
    if (!guideProbing && guideRefreshFn) guideRefreshFn();
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

  /* ---------- parameter pods on the stage (Tactile Physics Instrument Deck) ----------
     Every slider whose container is a card becomes a live telemetry pod ("m = 3 kg").
     Displays domain icon/angle dial, live value, inline −/+ micro-steppers, ?x mark button,
     and range progress bar. Tap the pod (or press Enter) for the precision dial editor. */
  var syncTimer = null, allDocked = [];
  function fmtChip(v) { return U.num(v, 4).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, ''); }
  function svgAngleDial(val, unit) {
    var rad = !isFinite(val) ? Math.PI / 6 : (/rad/i.test(unit || '') ? val : val * Math.PI / 180);
    rad = Math.max(-Math.PI, Math.min(Math.PI, rad));
    var x = (11 + 8.5 * Math.cos(rad)).toFixed(1), y = (15 - 8.5 * Math.sin(rad)).toFixed(1);
    return '<svg viewBox="0 0 22 18" class="chip-dial" aria-hidden="true">' +
      '<line x1="3" y1="15" x2="20" y2="15" stroke="currentColor" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/>' +
      '<line x1="11" y1="15" x2="' + x + '" y2="' + y + '" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="11" cy="15" r="2" fill="currentColor"/>' +
      '</svg>';
  }
  function paramMeta(sp, labelText, val) {
    var u = stripTags(sp.unit || '').trim().toLowerCase();
    var sym = stripTags(sp.sym || '').trim();
    var lbl = String(labelText || '').toLowerCase();
    if (/°|deg|rad/.test(u) || /angle|theta|alpha|phi|phase/i.test(lbl) || /^[θαφ]$/.test(sym)) {
      return { col: 'var(--c-velocity)', ico: svgAngleDial(val, u) };
    }
    if (/^k?g$/.test(u) || /\bmass\b/.test(lbl)) return { col: 'var(--c-weight)', ico: '⚖' };
    if (/m\s*s|m\/s|km\/h/.test(u) || /speed|velocity/.test(lbl) || /^[uv]$/.test(sym)) return { col: 'var(--c-velocity)', ico: '➔' };
    if (/^k?n$/.test(u) || /\bforce\b|tension|weight|thrust|drag|load/.test(lbl) || /^[FTR]$/.test(sym)) return { col: 'var(--c-applied)', ico: '⚡' };
    if (/^[jk]?j$|^[mk]?w$/.test(u) || /work|energy|power/.test(lbl) || /^[WEP]/.test(sym)) return { col: 'var(--accent)', ico: '✦' };
    if (/[vω]|ohm|volt|amp/.test(u) || /voltage|current|resist|emf|e\.m\.f|potential/.test(lbl)) return { col: 'var(--accent2)', ico: '⏚' };
    if (/^m?s$|^[mk]?hz$/.test(u) || /time|period|freq/.test(lbl)) return { col: 'var(--c-tension)', ico: '⏱' };
    if (/^[cmnµ]?m$/.test(u) || /length|height|dist|width|wave|slit|radius|diam|depth/.test(lbl) || /^[Lxhdrλ]$/.test(sym)) return { col: 'var(--c-s1)', ico: '📏' };
    return { col: 'var(--c-friction)', ico: '◈' };
  }
  function dockParams(container, ctl, specs) {
    if (!stage || !container || !container.classList || !container.classList.contains('card')) return;
    specs.forEach(function (sp) {
      var r = ctl.rows[sp.key]; if (!r) return;
      r.ctl = ctl; r.vis = !sp.hidden; r.initVal = Number(sp.value); r.labelText = String(sp.label).replace(/<[^>]+>/g, '');
      var ph = h('span', { class: 'ph', 'aria-hidden': 'true', style: 'display:block;height:0' });
      if (r.row.parentNode) { r.row.parentNode.insertBefore(ph, r.row); r.row.parentNode.removeChild(r.row); }
      var chip = h('button', { type: 'button', class: 'pchip', title: r.labelText + ' — tap pod to dial, or use inline − / + and ?x' });
      r.chip = chip; r.ph = ph; r.docked = true;
      function render() {
        var v = r.locked && r.lockedVal !== undefined ? r.lockedVal : ctl.values[sp.key];
        var min = Number(sp.min), max = Number(sp.max);
        var pct = isFinite(v) && max > min ? U.clamp(((v - min) / (max - min)) * 100, 0, 100).toFixed(1) : '0';
        var meta = paramMeta(sp, r.labelText, v);
        var isX = !!(markedX && markedX.row === r);
        if (chip.style && chip.style.setProperty) {
          chip.style.setProperty('--p-col', meta.col);
          chip.style.setProperty('--p-pct', pct + '%');
        }
        chip.classList.toggle('is-x', isX);
        var xTag = !r.locked ? '<span role="button" class="chip-xtag' + (isX ? ' on' : '') + '" data-act="markx" title="' + (isX ? 'Clear unknown x' : 'Mark as unknown x') + '">' + (isX ? '✓x' : '?x') + '</span>' : '';
        var stepGrp = !r.locked
          ? '<span class="chip-step-grp"><span role="button" class="chip-step" data-act="dec" title="Decrease by ' + fmtChip(r.step) + '">−</span><span role="button" class="chip-step" data-act="inc" title="Increase by ' + fmtChip(r.step) + '">+</span><span class="chip-edit" aria-hidden="true">✎</span></span>'
          : '<span class="chip-edit" aria-hidden="true">🔒</span>';
        chip.innerHTML =
          '<span class="chip-top">' +
            '<span class="chip-ico" aria-hidden="true">' + meta.ico + '</span>' +
            '<span class="chip-name">' + esc(r.labelText) + '</span>' +
            (sp.sym ? '<span class="sym">' + sp.sym + '</span>' : '') +
            xTag +
          '</span>' +
          '<span class="chip-main">' +
            '<span class="val">' + (isFinite(v) ? (r.locked ? U.sf(v) : fmtChip(v)) : '—') + '</span>' +
            (sp.unit ? '<span class="unit">' + sp.unit + '</span>' : '') +
            stepGrp +
          '</span>' +
          '<span class="chip-foot" aria-hidden="true">' +
            '<span class="chip-gauge"><i style="width:' + pct + '%"></i></span>' +
            '<span class="chip-bounds"><span>' + fmtChip(min) + '</span><span>' + fmtChip(max) + (sp.unit ? ' ' + sp.unit : '') + '</span></span>' +
          '</span>';
        chip.setAttribute('aria-label', r.labelText + ': ' + (isFinite(v) ? fmtChip(v) : 'not set') + ' ' + String(sp.unit || '').replace(/<[^>]+>/g, '') + (r.locked ? ' (solved)' : ', press Enter to change'));
      }
      r.renderChip = render;
      function commit(v) { r.box.value = v; r.box.dispatchEvent(new Event('change')); render(); }
      chip.addEventListener('click', function (e) {
        if (r.locked) return;
        var actEl = e && e.target && e.target.closest ? e.target.closest('[data-act]') : null;
        if (actEl) {
          var act = actEl.getAttribute('data-act');
          e.stopPropagation();
          if (act === 'dec') { commit(U.clamp(ctl.values[sp.key] - r.step, Number(sp.min), Number(sp.max))); return; }
          if (act === 'inc') { commit(U.clamp(ctl.values[sp.key] + r.step, Number(sp.min), Number(sp.max))); return; }
          if (act === 'markx') { markAsX(r, { toggle: true }); render(); return; }
        }
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
    var bGuide = h('button', { type: 'button', class: 'ws-pill', html: '🎓 <span class="ws-lbl">Guide &amp; Learn</span>', title: 'Open interactive walkthrough, curriculum laws & What-If explorer', onclick: function () { openGuide('tour'); } });
    var bLab = h('button', { type: 'button', class: 'ws-pill', html: '🧪 <span class="ws-lbl">Discovery Lab</span>', title: 'Predict, observe & explain experiments for XP', onclick: function () { openGuide('lab'); } });
    var tl = h('div', { class: 'ws-corner tl' }, [bData]);
    var bl = h('div', { class: 'ws-corner bl' });
    var br = h('div', { class: 'ws-corner br' });
    if (refs.explain.length) bl.appendChild(bExp);
    bl.appendChild(bLab);
    br.appendChild(bCalcX);
    if (solveableParams().length) br.appendChild(bSolve);
    if (refs.calc.length) { br.appendChild(bStudio); br.appendChild(bCalc); }
    if (query.get('embed') === '1') {
      tl.appendChild(h('button', { type: 'button', class: 'ws-pill', html: '⇣ <span class="ws-lbl">Fetch Data</span>', onclick: openDataHub }));
    }
    tl.appendChild(bGuide);
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
      if (e.key === 'Escape' && activeGuide) { activeGuide.close(); return; }
      if (e.key === 'Escape' && activeModal) { closeModal(); return; }
      if (e.key === 'Escape') { var closed = false; wsDrawers.forEach(function (d) { if (d.isOpen()) { d.setOpen(false); closed = true; } }); if (closed) return; }
      if (e.target && /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName || '')) return;
      if (activeModal || pop || activeStudio) return;
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); openGuide('tour'); return; }
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
    var toolbar = h('div', { class: 'dock-toolbar' }, [
      h('div', { class: 'dock-tleft', html: '<span class="dock-pulse" aria-hidden="true"></span><div><b>Instrument Telemetry Deck</b><div class="dock-sub">Tap pod for dial · inline −/+ &amp; ?x</div></div>' }),
      h('div', { class: 'dock-tright' }, [
        h('button', { type: 'button', class: 'dock-tbtn primary', text: '✎ Matrix Edit', title: 'Edit all parameters in one precision grid', onclick: openQuickEntry }),
        h('button', { type: 'button', class: 'dock-tbtn', text: '🎲 Randomize', title: 'Try a fresh random combination of inputs', onclick: function () {
          visibleParams().forEach(function (r) {
            var lo = Number(r.spec.min), hi = Number(r.spec.max);
            if (!isFinite(lo) || !isFinite(hi) || hi <= lo) return;
            var raw = lo + (0.2 + Math.random() * 0.65) * (hi - lo);
            var st = r.step > 0 ? r.step : (hi - lo) / 20;
            var v = U.clamp(Math.round(raw / st) * st, lo, hi);
            r.box.value = v; r.box.dispatchEvent(new Event('change'));
            if (r.renderChip) r.renderChip();
          });
        } }),
        h('button', { type: 'button', class: 'dock-tbtn', text: '↺ Defaults', title: 'Restore initial default parameters', onclick: function () {
          visibleParams().forEach(function (r) {
            if (!isFinite(r.initVal)) return;
            var v = U.clamp(r.initVal, Number(r.spec.min), Number(r.spec.max));
            r.box.value = v; r.box.dispatchEvent(new Event('change'));
            if (r.renderChip) r.renderChip();
          });
        } }),
        h('button', { type: 'button', class: 'dock-tbtn', text: '🔍 Solve x', title: 'Set any input as unknown x and solve', onclick: function () { openSolveForX(); } })
      ])
    ]);
    stage.dock.insertBefore(toolbar, stage.dock.firstChild || null);
    if (query.get('embed') === '1') {
      stage.dock.appendChild(h('button', { type: 'button', class: 'pchip dock-act', text: '⇣ Fetch Data', title: 'Extract from question or export data', onclick: openDataHub }));
      stage.dock.appendChild(h('button', { type: 'button', class: 'pchip dock-act', text: '🎓 Guide & Learn', title: 'Interactive guide, laws & discovery lab', onclick: function () { openGuide('tour'); } }));
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
  /* ---------- Cambridge 9709 & 9702 Curriculum Knowledge Base + Interactive On-Stage Guide & Learning Studio ---------- */
  var CURRICULUM_DB = {
    'm1-resultant': {
      code: '9709 Paper 4 Mechanics · 4.1 Forces & equilibrium',
      law: 'Resolve every coplanar force into perpendicular x and y components: Rx = ΣF cos θ, Ry = ΣF sin θ. Resultant magnitude R = √(Rx² + Ry²) and equilibrium requires ΣFx = 0 and ΣFy = 0 simultaneously.',
      formulas: ['Rx = Σ F cos θ,  Ry = Σ F sin θ', 'R = √(Rx² + Ry²),  tan α = Ry / Rx', 'Equilibrium ⇔ Rx = 0 AND Ry = 0'],
      traps: ['Measure every angle consistently from the positive x-axis (or check quadrant signs carefully).', 'At equilibrium, components along ANY two perpendicular axes must both sum to zero.'],
      quiz: { q: 'If two forces are resolved onto horizontal and vertical axes, when is the particle in complete equilibrium?', opts: ['When both ΣFx = 0 and ΣFy = 0', 'When ΣFx = 0 only', 'When all forces have equal magnitude', 'When Rx equals Ry'], ans: 0, why: 'A resultant exists unless both orthogonal component sums equal zero simultaneously.' }
    },
    'm1-strings': {
      code: '9709 Paper 4 Mechanics · 4.1 Strings, rings & Lami’s theorem',
      law: 'A light inextensible string passing over a smooth peg or ring carries equal tension T throughout. For three coplanar forces in equilibrium, horizontal and vertical components sum to zero (and Lami’s theorem F₁/sin α = F₂/sin β = F₃/sin γ holds).',
      formulas: ['T₁ cos θ₁ = T₂ cos θ₂ (horizontal balance)', 'T₁ sin θ₁ + T₂ sin θ₂ = W (vertical balance)', 'Same continuous string around smooth ring ⇒ T₁ = T₂'],
      traps: ['Two separate strings tied at a knot can have different tensions; one continuous string over a smooth ring has equal tension either side.', 'Do not mix up angle with the horizontal vs angle with the vertical when choosing cos vs sin.'],
      quiz: { q: 'A particle hangs on a smooth ring threaded onto a single continuous string fixed at two walls. How do the tensions in the two segments compare?', opts: ['They are equal in magnitude', 'The steeper segment always has double tension', 'Their difference equals mg', 'Only equal if the walls are level'], ans: 0, why: 'Because the ring is smooth and the string is light, tension stays uniform throughout the single string.' }
    },
    'm1m4-plane': {
      code: '9709 Paper 4 Mechanics · 4.1 & 4.4 Inclined slopes & friction',
      law: 'Resolve perpendicular and parallel to the plane: N = mg cos α ± F_app sin θ. Limiting static friction F_max = μN opposes the tendency to slip; kinetic friction equals μN opposing the direction of motion.',
      formulas: ['R = mg cos θ (if extra forces act parallel only)', 'F_max = μR (limiting equilibrium)', 'Along slope: net force = ma (F = ma parallel to plane)'],
      traps: ['Never assume F = μR automatically — verify the block is moving or on the point of slipping first.', 'Check the sign of extra pushed/pulled forces on normal reaction R before calculating μR.'],
      quiz: { q: 'A block rests stationary on a rough 20° slope well below limiting friction. What equals the actual friction force acting on it?', opts: ['mg sin 20° up the slope', 'μ mg cos 20°', 'mg cos 20°', 'Zero'], ans: 0, why: 'Static friction supplies only whatever force balances the down-slope component mg sin θ, up to a cap of μR.' }
    },
    'm2-journey': {
      code: '9709 Paper 4 Mechanics · 4.2 Kinematics & v–t graphs',
      law: 'Gradient of a velocity–time graph equals acceleration a = dv/dt, while signed area under a velocity–time graph equals displacement s. Speeding-up vs slowing-down stages obey constant-acceleration suvat laws.',
      formulas: ['v = u + at,  s = ½(u + v)t', 's = ut + ½at²,  v² = u² + 2as', 'Acceleration = gradient of v–t; Displacement = area under v–t'],
      traps: ['Total distance travelled sums the magnitudes of triangle/trapezium areas, whereas displacement keeps negative areas when v < 0.', 'Convert km/h to m/s (÷ 3.6) before combining with seconds and metres.'],
      quiz: { q: 'What quantity does the total area between a velocity–time graph and the time axis (above minus below) represent?', opts: ['Net displacement', 'Instantaneous acceleration', 'Average speed squared', 'Change in momentum'], ans: 0, why: 'Integrating velocity with respect to time gives displacement, with negative regions indicating reverse travel.' }
    },
    'm2-vertical': {
      code: '9709 Paper 4 Mechanics · 4.2 Vertical motion under gravity',
      law: 'Taking upwards as positive gives constant downward acceleration a = −g (−10 m s⁻² in 9709, −9.81 m s⁻² in 9702). At maximum height v = 0 while acceleration remains g downwards; two particles collide when s₁(t) = s₂(t) at the same time t.',
      formulas: ['v = u − gt', 'y = ut − ½gt²', 'v² = u² − 2gs'],
      traps: ['Keep a consistent positive sign convention for displacement y, initial velocity u, and g throughout the question.', 'At the highest point v = 0 momentarily, but acceleration is still g downwards — never zero!'],
      quiz: { q: 'A stone is thrown vertically upwards at speed u and lands back at the launch height. Neglecting air resistance, what is its speed just before landing?', opts: ['u (equal magnitude, opposite direction)', '2u', 'Zero', 'u / √2'], ans: 0, why: 'By symmetry under uniform gravity (v² = u² − 2g(0)), the landing speed equals launch speed u.' }
    },
    'm2-calculus': {
      code: '9709 Paper 4 Mechanics · 4.2 Variable acceleration (calculus)',
      law: 'Differentiate displacement s(t) to obtain velocity v = ds/dt and differentiate again for acceleration a = dv/dt. Integrate acceleration to get v(t) + c₁ and integrate velocity to get s(t) + c₂ using initial conditions.',
      formulas: ['v = ds/dt,  a = dv/dt = d²s/dt²', 's = ∫ v dt + c (net change between limits)', 'Maximum/minimum velocity occurs where a = dv/dt = 0'],
      traps: ['Never apply suvat formulas when acceleration a depends on t, v, or s — calculus is mandatory.', 'If velocity changes sign on [t₁, t₂], split the distance integral at roots where v = 0.'],
      quiz: { q: 'Given v(t) = 6t − 2t², how do you find the maximum velocity before stopping?', opts: ['Set dv/dt = 0 and substitute t back into v(t)', 'Use v² = u² + 2as', 'Set v(t) = 0', 'Divide v(t) by t'], ans: 0, why: 'Because acceleration is variable, extrema of velocity occur where acceleration a = dv/dt = 0.' }
    },
    'm3-collisions': {
      code: '9709 Paper 4 Mechanics · 4.3 Momentum & 1-D impacts',
      law: 'In the absence of external horizontal impulse, total linear momentum is conserved in every collision: m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂. Kinetic energy is conserved only in perfectly elastic impacts; in coalescence both bodies share common velocity V.',
      formulas: ['m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂', 'Coalescence: V = (m₁u₁ + m₂u₂) / (m₁ + m₂)', 'KE loss = Σ(½mu²) − Σ(½mv²)'],
      traps: ['Velocity is a vector: give opposite signs (+ / −) to opposing directions before summing momenta.', 'Kinetic energy is always positive (scalar), so add ½mv² without signs for direction.'],
      quiz: { q: 'Two trolleys collide head-on on a smooth horizontal track and coalesce. Which quantity is guaranteed to stay identical before and after impact?', opts: ['Total vector momentum', 'Total kinetic energy', 'Speed of each trolley', 'Force during impact'], ans: 0, why: 'With zero net external impulse, total linear momentum is strictly conserved while KE converts to heat/sound.' }
    },
    'm4-connected': {
      code: '9709 Paper 4 Mechanics · 4.4 Connected particles & pulleys',
      law: 'In connected systems with a light inextensible string over a smooth pulley, both masses share common acceleration magnitude a and string tension T. Write F = ma separately for each body along its direction of motion, then add equations to eliminate T.',
      formulas: ['Heavier mass: m₁g − T = m₁a', 'Slope/lighter mass: T − m₂g sin α − F = m₂a', 'Add equations ⇒ (m₁ + m₂)a = net driving force'],
      traps: ['Check each mass carefully: draw separate free-body diagrams so weight components and friction signs never swap.', 'If the string goes slack (e.g. a mass hits the floor), T drops to 0 and remaining masses move freely at −g sin α.'],
      quiz: { q: 'Two unequal masses hang over a light smooth pulley. How do their acceleration magnitudes and string tensions compare?', opts: ['Same magnitude of acceleration and same tension T', 'Same acceleration, different tensions', 'Different accelerations, same tension', 'Zero acceleration on the lighter mass'], ans: 0, why: 'An inextensible string enforces equal displacement/acceleration magnitudes and a smooth pulley transmits equal tension.' }
    },
    'm4-lift': {
      code: '9709 Mechanics / 9702 Topic 3 · Apparent weight in a lift',
      law: 'Applying Newton’s second law vertically on a passenger of mass m inside an accelerating lift gives R − mg = ma (upwards positive). Upward acceleration or downward deceleration makes apparent weight R > mg; downward acceleration makes R < mg.',
      formulas: ['Upward positive: R − mg = ma ⇒ R = m(g + a)', 'Lift cable tension: T = (M_lift + m_load)(g + a)', 'Steady speed or stationary (a = 0) ⇒ R = mg'],
      traps: ['Upward velocity with downward deceleration means acceleration a points downwards (a < 0), making R < mg!', 'Clearly distinguish forces acting ON the passenger (R, mg) from forces acting ON the lift cabin (cable tension T).'],
      quiz: { q: 'A lift moves upwards while slowing down (decelerating) to stop at the top floor. How does the floor normal reaction R compare with passenger weight mg?', opts: ['R < mg', 'R > mg', 'R = mg', 'R = 0'], ans: 0, why: 'Slowing down while moving upwards means acceleration is downwards, so mg − R = ma ⇒ R = m(g − |a|) < mg.' }
    },
    'm4-vehicle': {
      code: '9709 Mechanics / 9702 Topic 5 · Vehicle dynamics & P = Fv',
      law: 'An engine operating at power P exerts forward driving force D = P / v. Along an incline with tow-bar tension T, write F = ma for car and trailer; maximum steady speed v_max occurs when driving force D balances total resistance plus backward weight component.',
      formulas: ['Driving force D = P / v', 'Car + trailer total: D − R_total − (m_c + m_t)g sin α = (m_c + m_t)a', 'At v_max (a = 0): P / v_max = R_total + M g sin α'],
      traps: ['At constant engine power, as speed v increases, driving force D = P/v decreases until acceleration reaches zero at v_max.', 'A tow-bar can push (negative tension = thrust) when the car brakes hard!'],
      quiz: { q: 'If a car climbs a hill at constant engine power P and steady maximum speed v, what happens if total resistance doubles while climbing?', opts: ['Driving force needed increases, reducing steady v', 'Driving force stays fixed and speed doubles', 'v_max becomes independent of sin θ', 'Power P drops to zero'], ans: 0, why: 'Since steady speed satisfies P / v = R_total + mg sin θ, larger resistance requires a smaller v to raise D = P/v.' }
    },
    'm5-energy': {
      code: '9709 Paper 4 Mechanics · 4.5 Work–energy principle',
      law: 'Total work done by driving/non-conservative forces equals change in total mechanical energy plus work done against resistance: W_engine − W_friction = ΔKE + ΔGPE = ½m(v² − u²) + mgΔh.',
      formulas: ['WD by constant force = F d cos θ', 'W_engine = ΔKE + ΔGPE + F_res × d', 'Average power = Total engine work / time'],
      traps: ['Use vertical height change Δh = d sin α for mgh, NOT slope distance d!', 'Keep clear track of signs for ΔKE (negative if slowing) and W_friction (energy dissipated).'],
      quiz: { q: 'A cyclist coasts freely uphill (engine off) against constant friction. Which energy equation holds?', opts: ['KE loss = GPE gain + work done against friction', 'KE loss = GPE gain − friction', 'KE gain = GPE loss', 'Work against friction equals zero'], ans: 0, why: 'Initial kinetic energy supplies both gravitational potential gain and thermal losses to resistance.' }
    },
    'p1-uncertainty': {
      code: '9702 AS Physics · Topic 1 Physical quantities & uncertainties',
      law: 'Random errors scatter readings unpredictably (reduced by averaging repeats; affect precision), whereas systematic/zero errors shift every reading consistently (affect accuracy). When multiplying/dividing quantities X = A^p B^q / C^r, percentage uncertainties add: %ΔX = p(%ΔA) + q(%ΔB) + r(%ΔC).',
      formulas: ['Addition/Subtraction (Z = A ± B): ΔZ = ΔA + ΔB', 'Product/Quotient (Z = AB/C): ΔZ/Z = ΔA/A + ΔB/B + ΔC/C', 'Power Z = Aⁿ: %ΔZ = |n| × %ΔA'],
      traps: ['Absolute uncertainties add for A ± B (even when subtracting A − B!).', 'Quote absolute uncertainty to 1 significant figure (or 2 s.f. max) and match the decimal places of the mean value.'],
      quiz: { q: 'The diameter d of a wire is measured to ±2% uncertainty to find cross-sectional area A = πd²/4. What is the percentage uncertainty in A?', opts: ['±4%', '±2%', '±1%', '±8%'], ans: 0, why: 'Since A depends on d², the percentage uncertainty in d is multiplied by 2: 2 × 2% = 4%.' }
    },
    'p1-vectors': {
      code: '9702 AS Physics · Topic 1 Vectors & relative velocity',
      law: 'Scalars have magnitude only; vectors have both magnitude and direction. Resultant vectors add tip-to-tail (R = A + B), while subtracting vectors (relative velocity v_A/B = v_A − v_B) adds the opposite vector −v_B.',
      formulas: ['R_x = A_x + B_x,  R_y = A_y + B_y', '|R| = √(R_x² + R_y²)', 'Boat/aircraft crossing: v_ground = v_craft + v_medium'],
      traps: ['Always draw vector arrows head-to-tail for addition — a closed loop means resultant = 0.', 'For shortest crossing time across a river, point straight across perpendicular to banks; for shortest straight path across, aim upstream to cancel drift.'],
      quiz: { q: 'A swimmer in a flowing river wants to cross in the shortest possible time. How should they orient their stroke relative to the bank?', opts: ['Perpendicular (90°) straight across the bank', '45° upstream against the current', '45° downstream with the current', 'Parallel to the current'], ans: 0, why: 'Perpendicular velocity component v sin θ reaches its full speed v only at 90°, minimizing crossing time width/v.' }
    },
    'p2-freefall-exp': {
      code: '9702 AS Physics · Topic 1 & 2 Determining g by free fall',
      law: 'Dropping a dense sphere through height h gives h = ½gt² when starting from rest. Plotting h against t² gives a straight line through the origin of gradient ½g ⇒ g = 2 × gradient (systematic reaction/release delay shifts intercepts or underestimates g).',
      formulas: ['h = ½gt² (starting from u = 0)', 'Gradient of h vs t² graph = g / 2 ⇒ g = 2 × grad', '%Δg = %Δh + 2 × %Δt'],
      traps: ['Double the percentage uncertainty of t because t appears squared in g = 2h/t²!', 'Electronic light gates eliminate human reaction time, while slight air drag reduces measured acceleration slightly below 9.81 m s⁻².'],
      quiz: { q: 'In a free-fall experiment using h = ½gt², time t has 1.5% uncertainty and height h has 1.0% uncertainty. What is the percentage uncertainty in g?', opts: ['4.0%', '2.5%', '3.5%', '2.0%'], ans: 0, why: 'Because g = 2h / t², %Δg = %Δh + 2(%Δt) = 1.0% + 2(1.5%) = 4.0%.' }
    },
    'p2-motion-graphs': {
      code: '9702 AS Physics · Topic 2 Motion graphs & bouncing',
      law: 'Gradient of s–t equals velocity v; gradient of v–t equals acceleration a; area under v–t equals displacement Δs. For an elastic/partially elastic bounce, velocity flips sign sharply while acceleration equals −g throughout airborne flight.',
      formulas: ['v = ds/dt (s–t gradient)', 'a = dv/dt (v–t gradient)', 'e = v_rebound / v_impact (coefficient of restitution)'],
      traps: ['A horizontal line on v–t means constant velocity (zero acceleration), NOT stationary unless v = 0.', 'During free bounce in air, the parallel diagonal segments on v–t all share the identical slope −g.'],
      quiz: { q: 'A rubber ball drops from rest and bounces repeatedly on a hard floor. Ignoring impact duration, how do the downward airborne slopes of its v–t graph compare?', opts: ['All parallel with constant gradient g', 'Steeper after every bounce', 'Zero at the peak', 'Curved inversely with height'], ans: 0, why: 'While airborne between bounces, the only force is gravity, so dv/dt = −g stays constant throughout.' }
    },
    'p2-projectile': {
      code: '9702 AS Physics · Topic 2 Projectile motion',
      law: 'Horizontal and vertical motions are independent: ax = 0 gives constant vx = u cos θ and x = (u cos θ)t, while vertical gravity ay = −g gives vy = u sin θ − gt and y = (u sin θ)t − ½gt².',
      formulas: ['v_x = u cos θ (constant),  x = u cos θ · t', 'v_y = u sin θ − gt,  y = u sin θ · t − ½gt²', 'Range on level ground R = (u² sin 2θ) / g'],
      traps: ['At peak height, v_y = 0 only — total speed equals v_x = u cos θ and acceleration is still 9.81 m s⁻² downwards.', 'With air resistance, maximum height, range, and landing angle symmetry all decrease (descending path becomes steeper).'],
      quiz: { q: 'At the highest point of a projectile fired at 40° with initial speed u, what is the ball’s speed?', opts: ['u cos 40°', 'Zero', 'u sin 40°', 'u'], ans: 0, why: 'Vertical velocity momentarily drops to zero at the vertex, leaving only the unchanged horizontal component u cos 40°.' }
    },
    'p3-drag': {
      code: '9702 AS Physics · Topic 3 Drag & terminal velocity',
      law: 'Viscous/turbulent fluid drag D increases with speed v. As an object accelerates downwards, net force F = mg − D decreases so acceleration decreases smoothly until drag balances weight (D = mg) and constant terminal velocity is reached.',
      formulas: ['F_net = W − Upthrust − D = ma', 'At terminal velocity: a = 0 ⇒ D + U = mg', 'Initial acceleration from rest (v = 0, D = 0): a = g (neglecting upthrust)'],
      traps: ['When terminal velocity is reached, drag does NOT stop and object stays moving at constant maximum speed (F_net = 0).', 'Opening a parachute suddenly makes D > mg, producing upward net force and deceleration to a lower terminal speed.'],
      quiz: { q: 'Right after a skydiver opens their parachute at high speed, what is the direction of net force and acceleration?', opts: ['Upwards (decelerating downwards)', 'Downwards at 9.81 m s⁻²', 'Zero immediately', 'Horizontal'], ans: 0, why: 'Larger parachute area abruptly raises upward drag above weight, creating an upward resultant force that slows descent.' }
    },
    'p3-momentum': {
      code: '9702 AS Physics · Topic 3 Linear momentum & impulse',
      law: 'Newton’s second law states resultant force equals rate of change of momentum F = Δp/Δt. In an isolated collision total momentum is conserved; in a perfectly elastic collision between two objects, relative speed of approach equals relative speed of separation (and total KE is conserved).',
      formulas: ['p = mv,  F = Δp / Δt (area under F–t = Δp)', 'Σ p_before = Σ p_after', 'Elastic ⇔ u₁ − u₂ = v₂ − v₁ and ΣKE_before = ΣKE_after'],
      traps: ['Conservation of momentum holds in ALL isolated collisions (even explosions & inelastic crashes), whereas KE conservation holds ONLY in elastic collisions.', 'Crumple zones lengthen impact time Δt for the same Δp, cutting average force F = Δp/Δt.'],
      quiz: { q: 'How does an airbag reduce peak force on a passenger during a stop with fixed momentum change Δp?', opts: ['Increases collision time Δt, decreasing F = Δp/Δt', 'Eliminates momentum change completely', 'Doubles passenger mass', 'Increases kinetic energy'], ans: 0, why: 'Since impulse FΔt = Δp is fixed, extending stopping duration Δt proportionally reduces average impact force F.' }
    },
    'p3-momentum-2d': {
      code: '9702 AS Physics · Topic 3 Momentum in 2 dimensions',
      law: 'Linear momentum is a vector, so in any 2-D collision or explosion with no external impulse, momentum is conserved independently along both perpendicular x and y axes: Σ m v_x before = Σ m v_x after and Σ m v_y before = Σ m v_y after.',
      formulas: ['Σ p_x,before = Σ m₁ v₁ cos α₁ + Σ m₂ v₂ cos α₂', 'Σ p_y,before = Σ m₁ v₁ sin α₁ + Σ m₂ v₂ sin α₂', 'Elastic equal-mass off-centre collision ⇒ final angle = 90°'],
      traps: ['Check upward vs downward signs in sin θ when one sphere deflects below the x-axis!', 'An object at rest exploding radially must end with opposing y-momenta that cancel to zero.'],
      quiz: { q: 'A stationary firework explodes into two fragments moving in 2-D. How must their momentum vectors relate immediately after explosion?', opts: ['Equal magnitude and exact opposite directions (180°)', 'Equal speeds regardless of masses', 'Perpendicular at 90°', 'Equal kinetic energies always'], ans: 0, why: 'Zero initial momentum requires p₁ + p₂ = 0, so p₂ = −p₁ while lighter pieces gain faster speeds and higher KE.' }
    },
    'p4-moments': {
      code: '9702 AS Physics · Topic 4 Moments, couples & equilibrium',
      law: 'Moment of a force about a pivot = F d⊥ = F r sin θ. A couple is two equal, opposite parallel forces producing pure torque τ = F d (d = perpendicular separation). Equilibrium requires zero resultant force AND zero resultant moment about any point.',
      formulas: ['Moment τ = F d (perpendicular distance from pivot)', 'Principle of moments: Στ_cw = Στ_acw', 'Torque of couple = F × perpendicular separation'],
      traps: ['Always use perpendicular distance to the line of action of the force, NOT just beam length along an angled rod!', 'Taking moments about an unknown pivot support immediately eliminates its unknown reaction force from the moment equation.'],
      quiz: { q: 'When solving for forces on a uniform beam resting on two supports, why is taking moments about one support helpful?', opts: ['The unknown reaction at that support has zero lever arm (moment = 0)', 'It makes weight equal zero', 'It doubles the beam mass', 'It ignores angles'], ans: 0, why: 'Any force whose line of action passes through the chosen pivot contributes zero turning moment.' }
    },
    'p4-pressure': {
      code: '9702 AS Physics · Topic 4 Density, pressure & Archimedes upthrust',
      law: 'Pressure is normal force per unit area p = F/A; hydrostatic pressure change is Δp = ρgh. Upthrust F_u on a submerged or floating body equals the weight of displaced fluid ρ_f V_disp g (from pressure difference between bottom and top faces).',
      formulas: ['p = F / A,  Δp = ρ g h', 'Upthrust F_u = ρ_fluid × V_submerged × g', 'Floating equilibrium ⇒ Upthrust = Weight ⇒ V_sub / V_obj = ρ_obj / ρ_fluid'],
      traps: ['Hydrostatic pressure Δp = ρgh depends ONLY on vertical depth h and fluid density ρ, NOT container shape or cross-section.', 'In a barometer/manometer, add atmospheric pressure p_atm when computing total absolute pressure.'],
      quiz: { q: 'A wooden block floats partially submerged in water, then floats in denser brine. How does the submerged volume in brine compare?', opts: ['Smaller submerged volume in brine', 'Larger submerged volume in brine', 'Identical submerged volume', 'Depends only on block height'], ans: 0, why: 'Upthrust must still balance weight W = ρ_fluid V_sub g, so denser fluid requires less displaced volume V_sub.' }
    },
    'p5-energy': {
      code: '9702 AS Physics · Topic 5 Work, energy & efficiency',
      law: 'Work done W = F s cos θ transfers energy. By energy conservation, input work equals useful ΔKE + ΔGPE + resistive losses, and efficiency η = (useful output energy or power / total input energy or power) × 100%.',
      formulas: ['W = F s cos θ,  P = W / t = F v', 'ΔE_p = m g Δh,  E_k = ½ m v²', 'Efficiency η = (P_out / P_in) × 100%'],
      traps: ['Power P = Fv uses instantaneous speed v; dividing work by time gives average power.', 'Forces perpendicular to motion (e.g. normal reaction on a rigid track) do zero mechanical work because cos 90° = 0.'],
      quiz: { q: 'Why does normal reaction from a curved roller-coaster track do zero work on the cart?', opts: ['Force is always perpendicular (90°) to displacement', 'Normal reaction is zero everywhere', 'Cart speed stays constant', 'Gravity cancels displacement'], ans: 0, why: 'Since W = F s cos θ and θ = 90° between normal reaction and instantaneous motion, cos 90° = 0.' }
    },
    'p6-deformation': {
      code: '9702 AS Physics · Topic 6 Deformation of solids',
      law: 'Within the limit of proportionality, Hooke’s law F = kx holds and elastic potential energy equals E_p = ½Fx = ½kx². Tensile stress σ = F/A and strain ε = x/L define material stiffness via Young modulus E = σ/ε = FL/(Ax).',
      formulas: ['F = k x (up to limit of proportionality)', 'E_p = ½ F x = ½ k x² (area under F–x graph)', 'Stress σ = F/A, Strain ε = x/L, Young modulus E = σ/ε'],
      traps: ['Young modulus E depends ONLY on the material (unlike k, which increases with cross-section A and decreases with length L).', 'Do NOT use ½Fx for non-linear elastic curves beyond proportionality — count area under F–x instead!'],
      quiz: { q: 'Two copper wires have identical length L, but wire B has twice the radius of wire A. How does wire B’s Young modulus E compare to wire A?', opts: ['Identical (same material property)', 'Four times larger', 'Half as large', 'Twice as large'], ans: 0, why: 'Spring constant k = EA/L quadruples with twice radius, while Young modulus E = σ/ε is an intrinsic material constant.' }
    },
    'p7-waves': {
      code: '9702 AS Physics · Topic 7 Progressive waves & intensity',
      law: 'Progressive waves transfer energy without net matter transport via wave speed v = fλ and phase difference Δφ = 2π (Δx / λ) rad = 360° (Δx / λ). Wave intensity I = Power / Area is proportional to amplitude squared (I ∝ A²).',
      formulas: ['v = f λ,  f = 1 / T', 'Phase difference Δφ = (2π Δx) / λ or (2π Δt) / T', 'Intensity I = P / A = P / (4πr²) ∝ A²'],
      traps: ['Doubling amplitude multiplies wave intensity by 4× (I ∝ A²), NOT 2×!', 'Clearly identify y–x (distance) graphs giving wavelength λ vs y–t (time) graphs giving period T.'],
      quiz: { q: 'If the amplitude of a sound wave is tripled while frequency stays constant, by what factor does wave intensity change?', opts: ['9×', '3×', '6×', '1/3×'], ans: 0, why: 'Wave intensity is proportional to amplitude squared (I ∝ A²), so 3² = 9× intensity.' }
    },
    'p7-cro': {
      code: '9702 AS Physics · Topic 7 Cathode-ray oscilloscope (CRO)',
      law: 'A CRO plots instantaneous voltage vertically using Y-gain (V div⁻¹) against horizontal sweep time using time-base (s div⁻¹). Count grid divisions per full cycle N_x ⇒ T = N_x × time-base ⇒ f = 1/T, and vertical peak divisions N_y ⇒ V₀ = N_y × Y-gain.',
      formulas: ['Peak voltage V₀ = peak divisions × Y-gain', 'Period T = cycle width (divs) × time-base', 'Frequency f = 1 / T,  V_rms = V₀ / √2 (sinusoid)'],
      traps: ['Peak-to-peak height is 2V₀ — halve vertical peak-to-peak divisions to get peak amplitude V₀!', 'Watch prefix conversions carefully (ms/div = 10⁻³ s/div, µs/div = 10⁻⁶ s/div).'],
      quiz: { q: 'A sinusoidal trace occupies 4.0 horizontal divisions per complete cycle with time-base set at 5.0 ms div⁻¹. What is the frequency?', opts: ['50 Hz', '200 Hz', '25 Hz', '20 Hz'], ans: 0, why: 'Period T = 4.0 × 5.0 ms = 20 ms = 0.020 s, so f = 1 / 0.020 = 50 Hz.' }
    },
    'p7-doppler': {
      code: '9702 AS Physics · Topic 7 Doppler effect for sound',
      law: 'When a source emitting frequency f_s moves at speed v_s relative to medium wave speed v, wavefronts compress ahead and stretch behind, shifting observed frequency to f_o = f_s v / (v ± v_s) (minus approaching, plus receding).',
      formulas: ['Approaching source: f_o = f_s v / (v − v_s)  (> f_s)', 'Receding source: f_o = f_s v / (v + v_s)  (< f_s)', 'Total shift across pass = f_approach − f_recede'],
      traps: ['Use minus (−) in the denominator when approaching (higher pitch) and plus (+) when receding (lower pitch).', 'If an object passes quickly, observed frequency changes smoothly/rapidly rather than oscillating around the source.'],
      quiz: { q: 'An ambulance siren emits 600 Hz while driving directly AWAY from you. How does the frequency you hear compare to 600 Hz?', opts: ['Lower than 600 Hz', 'Higher than 600 Hz', 'Identical at 600 Hz', 'Drops to zero'], ans: 0, why: 'Receding motion stretches successive wavefronts to larger apparent wavelength, lowering received frequency f_o = f_s v / (v + v_s).' }
    },
    'p7-em-polarisation': {
      code: '9702 AS Physics · Topic 7 EM spectrum & Malus’s law',
      law: 'All electromagnetic waves travel at c ≈ 3.00 × 10⁸ m s⁻¹ in vacuum across orders of magnitude (radio ~10³ m to γ-rays <10⁻¹¹ m). Polarisation proves waves are transverse; transmitted intensity through an analyser at angle θ obeys Malus’s law I = I₀ cos² θ.',
      formulas: ['c = f λ ≈ 3.00 × 10⁸ m s⁻¹ in vacuum', 'Polariser halves unpolarised light: I₁ = ½ I_unpol', 'Malus’s law through analyser: I = I₁ cos² θ'],
      traps: ['Longitudinal waves (like sound) CANNOT be polarised — only transverse waves can be plane-polarised.', 'Remember cos² θ scales amplitude as I₁ cos θ (electric field) and intensity as cos² θ; at θ = 90° transmission vanishes completely.'],
      quiz: { q: 'Plane-polarised light of intensity I₀ passes through an analyser rotated by 60° from its transmission axis. What intensity emerges?', opts: ['0.25 I₀', '0.50 I₀', '0.75 I₀', '0.125 I₀'], ans: 0, why: 'By Malus’s law, I = I₀ cos² 60° = I₀ (0.5)² = 0.25 I₀.' }
    },
    'p8-stationary': {
      code: '9702 AS Physics · Topic 8 Stationary waves & resonance',
      law: 'Two identical coherent waves travelling in opposite directions interfere to form stationary waves with fixed zero-amplitude nodes (N) and maximum-amplitude antinodes (A). Distance between adjacent nodes is λ/2; particles between adjacent nodes vibrate completely in phase.',
      formulas: ['Adjacent N–N or A–A spacing = λ / 2', 'String harmonics (both ends N): f_n = n (v / 2L), λ_n = 2L / n', 'One open + one closed end pipe: odd harmonics only f = (2k−1)v / (4L)'],
      traps: ['In stationary waves, net energy is NOT transferred along the wave — all points in one loop are strictly in phase (or 180° out across a node).', 'Notice an air column closed at one end requires a node at the closed end and an antinode at the open end.'],
      quiz: { q: 'Adjacent nodes along a vibrating stationary wave on a guitar string are 0.15 m apart. What is the wavelength λ?', opts: ['0.30 m', '0.15 m', '0.60 m', '0.075 m'], ans: 0, why: 'Each loop between adjacent nodes spans half a wavelength (λ/2 = 0.15 m), so λ = 0.30 m.' }
    },
    'p8-interference': {
      code: '9702 AS Physics · Topic 8 Two-source interference & diffraction',
      law: 'Coherent waves (constant phase difference and identical frequency) interfere constructively when path difference Δ = nλ and destructively when Δ = (n + ½)λ. Double-slit fringes have uniform spacing x = λD/a (for D ≫ a).',
      formulas: ['Constructive: path difference = nλ; Destructive: (n + ½)λ', 'Double-slit fringe spacing: x = λ D / a', 'Coherence = same frequency + constant phase relationship'],
      traps: ['Slit separation a and screen distance D affect x oppositely: increasing slit separation a squeezes fringes closer together!', 'Single-slit diffraction modulates double-slit intensity so outer fringes fade across the wider central envelope.'],
      quiz: { q: 'In a Young’s double-slit experiment using red laser light, if the slit separation a is halved while screen distance D stays constant, what happens to fringe separation x?', opts: ['Doubles', 'Halves', 'Stays the same', 'Quadruples'], ans: 0, why: 'Fringe spacing x = λD/a is inversely proportional to slit separation a, so halving a doubles x.' }
    },
    'p8-grating': {
      code: '9702 AS Physics · Topic 8 Diffraction grating',
      law: 'Multi-slit interference produces sharp bright maxima satisfying d sin θ = nλ, where grating spacing d = 1 / N (lines per unit length) and maximum observable order satisfies sin θ ≤ 1 ⇒ n_max = floor(d / λ).',
      formulas: ['Grating equation: d sin θ = n λ', 'Grating spacing: d = 1 / (lines per metre)', 'Maximum order: n_max = floor(d / λ)  (total spots = 2 n_max + 1)'],
      traps: ['Be careful converting lines per mm to lines per m (e.g. 500 lines mm⁻¹ = 5.0 × 10⁵ lines m⁻¹ ⇒ d = 2.0 × 10⁻⁶ m).', 'White light disperses each non-zero order into a spectrum with violet (shorter λ) inside and red (longer λ) outside, while n = 0 stays white.'],
      quiz: { q: 'Light of wavelength 500 nm hits a grating of spacing d = 2.0 µm. What is the highest order n visible (total beams)?', opts: ['n_max = 4', 'n_max = 2', 'n_max = 5', 'n_max = 3'], ans: 0, why: 'd / λ = 2.0×10⁻⁶ / 5.0×10⁻⁷ = 4.0 (max order at sin θ ≤ 1; strictly < 90° may limit to order 3 physically). Note how d/λ sets the upper cap!' }
    },
    'p9-current': {
      code: '9702 AS Physics · Topic 9 Current, drift velocity & resistivity',
      law: 'Electric current is charge flow rate I = ΔQ/Δt and relates to charge-carrier number density n, cross-section A, drift velocity v, and elementary charge q via I = nAvq. Wire resistance depends on geometry via R = ρL/A.',
      formulas: ['I = ΔQ / Δt = n A v q', 'V = I R,  P = V I = I² R = V² / R', 'Resistance R = ρ L / A  (ρ = resistivity in Ω m)'],
      traps: ['If wire diameter d doubles, area A = πd²/4 quadruples, so resistance drops to ¼ (and drift speed v drops to ¼ for equal I).', 'Ensure area A is in m² when converting mm² (1 mm² = 10⁻⁶ m²).'],
      quiz: { q: 'A steady current I flows through a cylindrical wire made of one section joined to another section of double diameter (same metal). How does drift speed v change in the wider section?', opts: ['Decreases to ¼', 'Decreases to ½', 'Quadruples', 'Stays the same'], ans: 0, why: 'By I = nAvq with constant I, n, and q, quadrupling cross-sectional area A decreases drift velocity v to one quarter.' }
    },
    'p9-iv': {
      code: '9702 AS Physics · Topic 9 I–V characteristics',
      law: 'Ohmic conductors give straight lines through origin (R = V/I constant). Filament lamps curve toward V-axis because lattice vibration heating increases R; thermistors (NTC) decrease R as temperature rises; diodes conduct above ~0.6–0.7 V forward bias only.',
      formulas: ['Resistance at point = V / I (NOT gradient dv/di for non-ohmic components!)', 'Filament lamp: I rises ⇒ T rises ⇒ lattice scattering ↑ ⇒ R = V/I increases', 'NTC thermistor: T ↑ ⇒ charge carriers n ↑ ⇒ R drops sharply'],
      traps: ['For ANY component at a specific operating point, resistance equals total ratio R = V/I — NEVER take 1/tangent gradient of a curve!', 'Reversing polarity flips I–V identically for ohmic/filament resistors, but blocks current for a diode until breakdown.'],
      quiz: { q: 'How do you find the electrical resistance of a filament lamp at 6.0 V from its curved I–V graph?', opts: ['Divide voltage V by current I at that point (V / I)', 'Take gradient ΔI / ΔV at 6.0 V', 'Find area under the I–V curve', 'Use 1 / gradient at the origin'], ans: 0, why: 'Resistance is defined as the instantaneous ratio V/I at that operating state, whereas tangent gradient reflects dynamic incremental behavior.' }
    },
    'p10-builder': {
      code: '9702 AS Physics · Topic 10 Interactive Circuit Workbench',
      law: 'Every real circuit obeys Kirchhoff’s 1st law (charge conservation ΣI_in = ΣI_out at every node) and Kirchhoff’s 2nd law (energy conservation ΣE = ΣIR around every closed loop). Parallel branches share equal p.d. V; series components share identical current I.',
      formulas: ['Series: I same,  R_tot = R₁ + R₂ + …', 'Parallel: V same,  1/R_tot = 1/R₁ + 1/R₂ + …', 'KCL: ΣI_in = ΣI_out;  KVL: ΣE = ΣIR around closed loop'],
      traps: ['Closing a parallel switch lowers total resistance R_tot, increasing total battery current I — check both branch current AND terminal voltage drop Ir!', 'Use the multimeter in V mode across a component (parallel) and A mode inline inside a loop (series).'],
      quiz: { q: 'Adding an identical resistor in parallel across a single ideal resistor connected to an ideal cell causes total circuit current from the cell to:', opts: ['Double', 'Halve', 'Stay identical', 'Drop to zero'], ans: 0, why: 'Total equivalent resistance halves (R/2) across the same cell p.d. E, so battery current I = E / (R/2) doubles.' }
    },
    'p10-emf': {
      code: '9702 AS Physics · Topic 10 E.m.f. & internal resistance',
      law: 'Real cells convert chemical energy E per unit charge, losing Ir inside internal resistance r so terminal p.d. is V = E − Ir = IR. Plotting V against I yields a straight line with y-intercept E and gradient −r; power delivered to external load R peaks when R = r.',
      formulas: ['E = I(R + r) ⇒ V = E − I r ("lost volts" = Ir)', 'Power to external load P = I²R = E²R / (R + r)²', 'Maximum power transfer theorem: P_max at R = r'],
      traps: ['Open circuit (I = 0) gives V = E (ideal high-resistance voltmeter measures e.m.f. directly).', 'Remember y-intercept of V vs I is E and negative slope magnitude |gradient| equals r.'],
      quiz: { q: 'When a variable external resistor R equals the battery internal resistance r, what happens to the useful power delivered to load R?', opts: ['Load power reaches its maximum possible value', 'Load power becomes zero', 'Efficiency becomes 100%', 'Terminal voltage equals E'], ans: 0, why: 'Though efficiency at R = r is 50%, load power P = E²R/(R+r)² peaks cleanly when load R matches r.' }
    },
    'p10-circuits': {
      code: '9702 AS Physics · Topic 10 Kirchhoff’s laws & resistor networks',
      law: 'Junction conservation of charge gives ΣI_in = ΣI_out at every node (Kirchhoff 1), while loop conservation of energy gives algebraic sum of e.m.f.s equals sum of potential drops ΣE = ΣIR around any closed loop (Kirchhoff 2).',
      formulas: ['KCL (Junction): ΣI_in = ΣI_out (charge conserved)', 'KVL (Loop): ΣE = ΣIR (energy conserved)', 'Balanced Wheatstone bridge: R₁/R₂ = R₃/R₄ ⇒ zero bridge deflection'],
      traps: ['Follow a consistent clockwise or anticlockwise loop traversal direction: crossing a cell − → + adds +E, opposing current adds −IR.', 'Note which quantities come from conservation of charge (1st law) vs conservation of energy (2nd law).'],
      quiz: { q: 'Which fundamental conservation principle underlies Kirchhoff’s second law (ΣE = ΣIR)?', opts: ['Conservation of energy', 'Conservation of electric charge', 'Conservation of momentum', 'Conservation of mass'], ans: 0, why: 'Moving a unit charge completely around any closed loop must result in zero net change in electric potential energy.' }
    },
    'p10-divider': {
      code: '9702 AS Physics · Topic 10 Potential dividers & sensing circuits',
      law: 'Two resistors in series divide supply voltage in direct ratio to resistance: V_out = V_in × R₂/(R₁ + R₂). Replacing one resistor with an LDR or NTC thermistor turns light or temperature changes into automatic output voltage triggers.',
      formulas: ['V_out = V_in × R₂ / (R₁ + R₂)', 'Zero-balance potentiometer: V_x = E_driver × (L_balance / L_total)', 'With parallel load R_L across R₂: combine R₂ ∥ R_L first (R_eff < R₂)'],
      traps: ['Connecting a low-resistance voltmeter or load R_L across R₂ decreases effective bottom resistance and lowers V_out below ideal unloaded ratio!', 'For NTC thermistor / LDR: R drops when T or light intensity rises — check which half of the divider is R₂ before deciding whether V_out rises or falls.'],
      quiz: { q: 'An LDR sits in the LOWER position (R₂) of a potential divider powered by a steady 12 V supply. When bright light shines onto the LDR, what happens to V_out across the LDR?', opts: ['V_out decreases', 'V_out increases', 'V_out stays at 6 V', 'Supply p.d. drops to zero'], ans: 0, why: 'Bright light reduces LDR resistance R₂ dramatically, so its share V_out = 12 R₂/(R₁ + R₂) decreases.' }
    },
    'p11-alpha': {
      code: '9702 AS Physics · Topic 11 Rutherford α-particle scattering',
      law: 'Firing α-particles at thin gold foil showed most pass straight through (atom is mostly empty space), small deflections reveal positive charge repulsion, and rare backscatter (>90°) proves mass and +Ze charge sit inside a tiny dense nucleus (<10⁻¹⁴ m).',
      formulas: ['Most α pass straight (b large) ⇒ empty space ~10⁻¹⁰ m', 'Rare >90° backscatter ⇒ tiny dense positive nucleus ~10⁻¹⁵ m', 'Closest approach distance (head-on): ½mv² = Qq / (4πε₀ r_min)'],
      traps: ['Gold foil must be ultra-thin so each α-particle undergoes at most one significant single collision.', 'Backscatter fraction stays tiny (~1 in 8000–10000); increasing α kinetic energy penetrates closer to the nucleus.'],
      quiz: { q: 'Which observation from Rutherford’s α-scattering experiment directly showed that most of the atom’s mass and positive charge lie in a tiny central nucleus?', opts: ['A very small fraction deflected by more than 90° backwards', 'All α-particles passed straight through without deflection', 'Electrons orbited outside', 'Foil glowed green'], ans: 0, why: 'Deflecting heavy fast α-particles backward requires hitting a much more massive, tiny concentrated positive charge.' }
    },
    'p11-nuclear': {
      code: '9702 AS Physics · Topic 11 Nuclear decay & quark model',
      law: 'In every nuclear reaction, nucleon number A, proton number Z, energy-momentum, and charge are conserved. Protons (uud) and neutrons (udd) are hadrons/baryons built from quarks; β⁻ decay turns d → u + e⁻ + ν̄ₑ while β⁺ turns u → d + e⁺ + νₑ.',
      formulas: ['α-decay: ⁴₂He emitted (A → A−4, Z → Z−2)', 'β⁻ decay: d → u + ⁰₋₁e + ν̄ₑ (A same, Z → Z+1)', 'β⁺ decay: u → d + ⁰₊₁e + νₑ (A same, Z → Z−1)'],
      traps: ['β⁻ particles emerge with a continuous kinetic energy spectrum because energy is shared with an antineutrino ν̄ₑ!', 'Leptons (e⁻, e⁺, ν, ν̄) are fundamental (not made of quarks), whereas hadrons experience the strong nuclear force.'],
      quiz: { q: 'What quark transformation occurs inside a neutron during β⁻ radioactive decay?', opts: ['A down quark converts into an up quark (d → u + e⁻ + ν̄ₑ)', 'An up quark turns into a down quark', 'Two up quarks annihilate', 'Three strange quarks form a proton'], ans: 0, why: 'Neutron (udd) becomes proton (uud) via weak interaction converting one d (−⅓e) into u (+⅔e) while emitting electron and antineutrino.' }
    }
  };
  var CURR_DEFAULT = {
    code: 'Cambridge 9709 / 9702 Interactive Simulation',
    law: 'Experiment systematically by holding one variable steady while changing another, observing how quantities and vector diagrams scale together in real time.',
    formulas: ['g = 10 m s⁻² (9709 Mechanics) · g = 9.81 m s⁻² (9702 AS Physics)', 'SI prefixes & expressions (e.g. 4.7k, 15m, 2*pi) work inside every numeric input'],
    traps: ['Convert cm, mm, ms, kΩ, km/h into standard SI units before substituting into exam formulas.', 'Check both magnitude AND vector direction/sign before finalizing an answer.'],
    quiz: { q: 'Which value of gravitational field strength g is standard in Cambridge 9702 AS Physics vs 9709 Mechanics?', opts: ['9.81 m s⁻² in 9702 and 10 m s⁻² in 9709', '10 m s⁻² in both papers', '9.8 m s⁻² in 9709 and 10 in 9702', '9.81 N in both papers'], ans: 0, why: '9702 uses g = 9.81 m s⁻² from the data booklet whereas 9709 Mechanics uses g = 10 m s⁻² unless stated otherwise.' }
  };
  function simSlug() {
    try {
      var m = /\/([a-z0-9-]+)\.html$/i.exec(location.pathname || '');
      if (m && CURRICULUM_DB[m[1]]) return m[1];
    } catch (e) { /* ignore */ }
    var ttl = String(typeof document !== 'undefined' && document.title || '').toLowerCase();
    var mapTitle = [
      ['resultant', 'm1-resultant'], ['strings and rings', 'm1-strings'], ['slope', 'm1m4-plane'],
      ['journeys', 'm2-journey'], ['vertical motion', 'm2-vertical'], ['variable acceleration', 'm2-calculus'],
      ['collisions on a line', 'm3-collisions'], ['pulleys and connected', 'm4-connected'], ['lift', 'm4-lift'],
      ['car, trailer', 'm4-vehicle'], ['work–energy', 'm5-energy'], ['uncertainty', 'p1-uncertainty'],
      ['vectors', 'p1-vectors'], ['measuring g', 'p2-freefall-exp'], ['motion graphs', 'p2-motion-graphs'],
      ['projectile', 'p2-projectile'], ['drag', 'p3-drag'], ['2-d', 'p3-momentum-2d'], ['1-d', 'p3-momentum'],
      ['moments', 'p4-moments'], ['pressure', 'p4-pressure'], ['efficiency', 'p5-energy'], ['deformation', 'p6-deformation'],
      ['oscilloscope', 'p7-cro'], ['doppler', 'p7-doppler'], ['polarisation', 'p7-em-polarisation'], ['progressive wave', 'p7-waves'],
      ['stationary', 'p8-stationary'], ['interference', 'p8-interference'], ['grating', 'p8-grating'],
      ['resistivity', 'p9-current'], ['i–v', 'p9-iv'], ['circuit builder', 'p10-builder'],
      ['e.m.f', 'p10-emf'], ['kirchhoff', 'p10-circuits'], ['divider', 'p10-divider'],
      ['scattering', 'p11-alpha'], ['quarks', 'p11-nuclear']
    ];
    for (var i = 0; i < mapTitle.length; i++) if (ttl.indexOf(mapTitle[i][0]) >= 0 && CURRICULUM_DB[mapTitle[i][1]]) return mapTitle[i][1];
    return '';
  }
  function getCurriculumEntry() {
    var slug = simSlug();
    return CURRICULUM_DB[slug] || CURR_DEFAULT;
  }
  function grantGuideXp(amt, title, sub) {
    try {
      var P = root.SIM_PROGRESS || (root.parent && root.parent !== root && root.parent.SIM_PROGRESS);
      if (P && P.awardBonusXp) { P.awardBonusXp(amt, title, sub); return true; }
    } catch (e) { /* ignore */ }
    return false;
  }

  var activeGuide = null, guideXpAwarded = {};
  function openGuide(initTab) {
    var startTab = (typeof initTab === 'string' && /^(tour|curriculum|lab|si)$/.test(initTab)) ? initTab : 'tour';
    if (activeGuide) { activeGuide.setTab(startTab); return activeGuide; }

    var tipTxt = stage && stage.tip && stage.tip.textContent ? stage.tip.textContent : 'Drag handles directly on the simulation canvas or tap parameter chips below.';
    var vis = visibleParams();
    var entry = getCurriculumEntry();
    var slugKey = simSlug() || String(document.title || 'sim').slice(0, 24);
    var spotlightedEls = [];

    function clearSpotlights() {
      spotlightedEls.forEach(function (el) {
        if (el && el.classList) el.classList.remove('guide-spotlight');
      });
      spotlightedEls = [];
    }
    function setGuideSpotlight(targetEl) {
      clearSpotlights();
      if (!targetEl) return;
      var el = targetEl;
      if (typeof targetEl === 'string' && typeof document !== 'undefined' && document.querySelector) {
        // Fallback matching safe in fake DOMs too
        if (targetEl === 'canvas') el = stage && stage.canvas;
        else if (targetEl === 'stage') el = stage && stage.el;
        else {
          var cand = Array.prototype.slice.call(document.querySelectorAll ? document.querySelectorAll(targetEl.replace(/^\./, 'div.')) : []);
          el = cand.find ? cand.find(function (x) { return x && x.className && x.className.indexOf(targetEl.replace(/^\./, '')) >= 0; }) : document.querySelector(targetEl);
        }
      }
      if (el && el.classList && el.classList.add) {
        el.classList.add('guide-spotlight');
        spotlightedEls.push(el);
      }
    }

    function setRowValue(r, val) {
      if (!r || !r.spec || !r.box) return;
      var v = U.clamp(val, Number(r.spec.min), Number(r.spec.max));
      r.box.value = v;
      r.box.dispatchEvent(new Event('change'));
      if (r.renderChip) r.renderChip();
    }
    function silentEvalOutput(rP, trialX, targetSym) {
      if (!rP || !rP.spec) return NaN;
      var orig = Number(rP.ctl.values[rP.spec.key]);
      guideProbing = true;
      try {
        setRowValue(rP, trialX);
        var snap = collectSnapshot().filter(function (x) { return x.kind === 'Result' && x.symbol === targetSym && isFinite(x.num); });
        return snap.length ? snap[0].num : NaN;
      } finally {
        setRowValue(rP, orig);
        guideProbing = false;
      }
    }

    // Floating Non-Blocking Interactive Dock (canvas remains 100% live & clickable underneath)
    var curTab = startTab, tourStep = 0, trapDone = {};
    var dock = h('section', { class: 'sim-guide-dock', role: 'dialog', 'aria-label': 'Interactive Guide and Learning Studio' });
    var headTitle = h('h2', { html: '🎓 Guide &amp; Learning Studio <span class="curr-badge">' + esc(entry.code.split('·')[0].trim()) + '</span>' });
    var modeBtn = h('button', { type: 'button', class: 'ws-dbtn', text: '⊡ Mini', title: 'Switch between Normal, Mini Co-Pilot and Wide Studio view' });
    var closeBtn = h('button', { type: 'button', class: 'ws-dbtn', text: '×', 'aria-label': 'Close interactive guide' });
    var head = h('div', { class: 'sim-guide-head', title: 'Drag header to move panel anywhere on stage' }, [headTitle, modeBtn, closeBtn]);
    var tabs = h('div', { class: 'sim-tabs' });
    var pane = h('div', { class: 'sim-guide-body' });

    var sizeState = 0; // 0 = default, 1 = mini, 2 = expanded
    modeBtn.onclick = function () {
      sizeState = (sizeState + 1) % 3;
      dock.classList.toggle('mini', sizeState === 1);
      dock.classList.toggle('expanded', sizeState === 2);
      modeBtn.textContent = sizeState === 1 ? '⛶ Wide' : sizeState === 2 ? '◰ Normal' : '⊡ Mini';
    };

    // Draggable header so student can dock anywhere over the simulation
    var dragging = null;
    if (head.addEventListener && root.addEventListener) {
      head.addEventListener('pointerdown', function (e) {
        if (e.target && e.target.closest && e.target.closest('button')) return;
        var rect = dock.getBoundingClientRect ? dock.getBoundingClientRect() : null;
        if (!rect) return;
        dragging = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, w: rect.width, h: rect.height };
        dock.style.right = 'auto';
        dock.style.left = rect.left + 'px';
        dock.style.top = rect.top + 'px';
      });
      var onMoveDrag = function (e) {
        if (!dragging) return;
        var vw = root.innerWidth || 1200, vh = root.innerHeight || 800;
        var nx = Math.max(8, Math.min(vw - Math.min(dragging.w, vw - 16) - 8, e.clientX - dragging.dx));
        var ny = Math.max(8, Math.min(vh - 90, e.clientY - dragging.dy));
        dock.style.left = nx + 'px';
        dock.style.top = ny + 'px';
      };
      var onUpDrag = function () { dragging = null; };
      root.addEventListener('pointermove', onMoveDrag);
      root.addEventListener('pointerup', onUpDrag);
    }

    function closeGuide() {
      clearSpotlights();
      guideRefreshFn = null;
      if (dragging) dragging = null;
      if (dock.parentNode) dock.parentNode.removeChild(dock);
      activeGuide = null;
    }
    closeBtn.onclick = closeGuide;

    var tabDefs = [
      { id: 'tour', label: '🧭 Interactive Tour' },
      { id: 'curriculum', label: '📚 Curriculum & Laws' },
      { id: 'lab', label: '🧪 Discovery Lab' },
      { id: 'si', label: '📐 SI & Formula Lab' }
    ];
    var tabBtns = {};
    tabDefs.forEach(function (t) {
      var b = h('button', { type: 'button', class: 'sim-tab', text: t.label, onclick: function () { setTab(t.id); } });
      tabBtns[t.id] = b;
      tabs.appendChild(b);
    });

    function liveOutputPills(maxCount) {
      var res = collectSnapshot().filter(function (r) { return r.kind === 'Result'; }).slice(0, maxCount || 6);
      if (!res.length) return '<span style="font-size:12px;color:var(--muted)">Interact on the stage to inspect calculated values.</span>';
      return res.map(function (r) {
        var valStr = (r.value !== undefined && r.value !== '') ? esc(r.value) : '—';
        return '<span class="guide-live-pill"><b>' + esc(r.symbol) + '</b> = ' + valStr + (r.unit ? ' ' + esc(r.unit) : '') + '</span>';
      }).join('');
    }

    function renderTour() {
      pane.innerHTML = '';
      var hasVis = vis.length > 0;
      var curParamIdx = 0;
      var baseVals = vis.map(function (r) { return Number(r.ctl.values[r.spec.key]); });
      var ro = allReadouts[0] || null;
      var roInfo = ro && ro.getStepInfo ? ro.getStepInfo() : { page: 0, count: 1 };

      var stepDefs = [
        {
          title: '1. Direct Canvas & Real-Life / Diagram',
          desc: tipTxt + ' Try an instant animated sweep or flip between Realistic hardware and Exam Vectors.',
          spot: function () { setGuideSpotlight(stage ? stage.canvas : null); },
          build: function (box) {
            var liveBar = h('div', { class: 'guide-live-row', html: liveOutputPills(4) });
            var btnDemo = h('button', { type: 'button', class: 'btn primary', text: '⚡ Animate Canvas Demo', onclick: function () {
              if (hasVis) {
                var r0 = vis[0], lo = Number(r0.spec.min), hi = Number(r0.spec.max), v0 = Number(r0.ctl.values[r0.spec.key]);
                var mid = Number(((lo + hi) * 0.5).toFixed(r0.d || 2));
                var tgt = Math.abs(v0 - lo) > (hi - lo) * 0.25 ? Number((lo + (hi - lo) * 0.22).toFixed(r0.d || 2)) : Number((lo + (hi - lo) * 0.78).toFixed(r0.d || 2));
                if (Math.abs(tgt - v0) < 1e-6) tgt = mid;
                animateParam(v0, tgt, 520, function (x) { setRowValue(r0, x); }, function () {
                  animateParam(tgt, v0, 520, function (x) { setRowValue(r0, x); });
                });
              } else if (SIM.anim && SIM.anim.clocks && SIM.anim.clocks.length) {
                SIM.anim.clocks[0].toggle();
              }
            } });
            var btnLook = h('button', { type: 'button', class: 'btn', text: '👁 Switch View / Play', onclick: function () {
              var lookBtns = stage && stage.el && stage.el.querySelectorAll ? Array.prototype.slice.call(stage.el.querySelectorAll('button')).filter(function (b) { return /Real life|Diagram/i.test(b.textContent || ''); }) : [];
              if (lookBtns.length >= 2) {
                var inactive = lookBtns.find ? lookBtns.find(function (b) { return b.getAttribute('aria-pressed') !== 'true'; }) : lookBtns[1];
                if (inactive && inactive.click) inactive.click();
              } else if (SIM.anim && SIM.anim.clocks && SIM.anim.clocks.length) {
                SIM.anim.clocks[0].toggle();
              }
            } });
            box.appendChild(h('div', { class: 'hub-bar', style: 'margin:8px 0' }, [btnDemo, btnLook]));
            box.appendChild(liveBar);
            guideRefreshFn = function () { liveBar.innerHTML = liveOutputPills(4); };
          }
        },
        {
          title: '2. Live Parameter Control & Chip Nudging',
          desc: hasVis ? 'Pick any value below and adjust it directly — watch vectors, graphs, and calculations update simultaneously.' : 'Interact directly with components on the workbench stage above to build and measure live physics.',
          spot: function () { setGuideSpotlight(wsDrawers[0] ? '.ws-corner' : (stage ? stage.dock : null)); },
          build: function (box) {
            if (!hasVis) return;
            var pSel = h('select', { style: 'width:100%;margin-bottom:8px' }, vis.map(function (r, idx) {
              return h('option', { value: String(idx), text: r.labelText + (r.spec.sym ? ' (' + stripTags(r.spec.sym) + ')' : '') });
            }));
            var curStatus = h('div', { class: 'guide-live-row' });
            function syncTourParam() {
              var r = vis[curParamIdx]; if (!r) return;
              curStatus.innerHTML = '<span class="guide-live-pill"><b>' + esc(r.labelText) + '</b> = ' + fmtChip(r.ctl.values[r.spec.key]) + (r.spec.unit ? ' ' + r.spec.unit : '') + '</span>' + liveOutputPills(3);
            }
            pSel.onchange = function () { curParamIdx = Number(pSel.value) || 0; syncTourParam(); };
            var btns = h('div', { class: 'hub-bar', style: 'margin:6px 0' }, [
              h('button', { type: 'button', class: 'btn', text: '− Step', onclick: function () { var r = vis[curParamIdx]; setRowValue(r, r.ctl.values[r.spec.key] - r.step); syncTourParam(); } }),
              h('button', { type: 'button', class: 'btn', text: '+ Step', onclick: function () { var r = vis[curParamIdx]; setRowValue(r, r.ctl.values[r.spec.key] + r.step); syncTourParam(); } }),
              h('button', { type: 'button', class: 'btn', text: '×2 Double', onclick: function () { var r = vis[curParamIdx], v = r.ctl.values[r.spec.key]; animateParam(v, U.clamp(v * 2, Number(r.spec.min), Number(r.spec.max)), 360, function (x) { setRowValue(r, x); }, syncTourParam); } }),
              h('button', { type: 'button', class: 'btn', text: '↺ Reset', onclick: function () { var r = vis[curParamIdx]; setRowValue(r, baseVals[curParamIdx]); syncTourParam(); } })
            ]);
            box.appendChild(pSel); box.appendChild(btns); box.appendChild(curStatus);
            syncTourParam();
            guideRefreshFn = syncTourParam;
          }
        },
        {
          title: '3. Mark Unknown x & Auto-Solve',
          desc: hasVis ? 'In past-paper questions where one force, angle, or distance is unknown, mark any value as x and let the solver isolate it automatically.' : 'Open Solve for x or Question Solver to jump directly between exam papers and live apparatus.',
          spot: function () { setGuideSpotlight(stage ? stage.el : null); },
          build: function (box) {
            var actions = [];
            if (hasVis) {
              actions.push(h('button', { type: 'button', class: 'btn primary', text: '⚡ Mark "' + esc(vis[0].labelText) + '" as x', onclick: function () {
                markAsX(vis[0], { toggle: false });
              } }));
            }
            if (solveableParams().length) {
              actions.push(h('button', { type: 'button', class: 'btn', text: '🔍 Open Solve for x', onclick: function () { openSolveForX(); } }));
            }
            if (actions.length) box.appendChild(h('div', { class: 'hub-bar', style: 'margin:8px 0' }, actions));
          }
        },
        {
          title: '4. Synchronized Step-by-Step Working',
          desc: roInfo.count > 1 ? 'Walk through each mark-scheme step one line at a time while highlighted vectors glow in sync on the diagram.' : 'Open Fullscreen Step Studio or Calculations & Graphs to trace equations line by line with the animated simulation.',
          spot: function () { setGuideSpotlight(stage ? stage.canvas : null); },
          build: function (box) {
            var stepLbl = h('div', { style: 'font-size:12.5px;color:var(--muted);margin-bottom:6px' });
            function syncRoLbl() {
              if (ro && ro.getStepInfo) {
                var inf = ro.getStepInfo();
                stepLbl.textContent = inf.count > 1 ? 'Currently showing Step ' + (inf.page + 1) + ' of ' + inf.count + ' in Calculations.' : 'Live equation derivation synced with canvas.';
              } else stepLbl.textContent = 'Live working tracks your edits immediately.';
            }
            syncRoLbl();
            var bar = [];
            if (ro && ro.getStepInfo && ro.getStepInfo().count > 1) {
              bar.push(h('button', { type: 'button', class: 'btn', text: '← Prev Step', onclick: function () { var inf = ro.getStepInfo(); ro.setStep(Math.max(0, inf.page - 1)); syncRoLbl(); } }));
              bar.push(h('button', { type: 'button', class: 'btn', text: 'Next Step →', onclick: function () { var inf = ro.getStepInfo(); ro.setStep(Math.min(inf.count - 1, inf.page + 1)); syncRoLbl(); } }));
            }
            if (wsGlobalRefs && wsGlobalRefs.calc && wsGlobalRefs.calc.length) {
              bar.push(h('button', { type: 'button', class: 'btn primary', text: '⛶ Launch Step Studio', onclick: function () { openStepStudio({ autoPlay: true }); } }));
            }
            box.appendChild(stepLbl);
            if (bar.length) box.appendChild(h('div', { class: 'hub-bar', style: 'margin:6px 0' }, bar));
            guideRefreshFn = syncRoLbl;
          }
        },
        {
          title: '5. Cambridge Curriculum & Discovery Challenge',
          desc: 'Ready to learn why the physics works? Test proportional scaling laws in Curriculum & Laws or earn +15 XP in the Predict → Observe → Explain Lab!',
          spot: function () { clearSpotlights(); },
          build: function (box) {
            box.appendChild(h('div', { class: 'hub-bar', style: 'margin:8px 0' }, [
              h('button', { type: 'button', class: 'btn', text: '📚 Explore Syllabus Laws →', onclick: function () { setTab('curriculum'); } }),
              h('button', { type: 'button', class: 'btn primary', text: '🧪 Open Discovery Lab →', onclick: function () { setTab('lab'); } })
            ]));
          }
        }
      ];

      function renderCurrentTourStep() {
        pane.innerHTML = '';
        guideRefreshFn = null;
        var st = stepDefs[tourStep];
        if (st.spot) st.spot();

        var navPills = h('div', { class: 'guide-step-dots' }, stepDefs.map(function (s, idx) {
          return h('button', { type: 'button', class: 'guide-dot' + (idx === tourStep ? ' on' : idx < tourStep ? ' done' : ''), text: String(idx + 1), title: s.title, onclick: function () { tourStep = idx; renderCurrentTourStep(); } });
        }));
        var card = h('div', { class: 'guide-tour-card' }, [
          h('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px' }, [
            h('strong', { style: 'font-size:14.5px', text: st.title }),
            h('span', { class: 'chip', text: (tourStep + 1) + ' / ' + stepDefs.length })
          ]),
          h('p', { style: 'margin:0 0 8px;color:var(--muted);font-size:13px;line-height:1.45', text: st.desc })
        ]);
        st.build(card);

        var foot = h('div', { class: 'hub-bar', style: 'justify-content:space-between;margin-top:10px' }, [
          h('button', { type: 'button', class: 'btn', text: '← Previous', disabled: tourStep === 0, onclick: function () { if (tourStep > 0) { tourStep--; renderCurrentTourStep(); } } }),
          h('button', { type: 'button', class: 'btn primary', text: tourStep < stepDefs.length - 1 ? 'Next Step →' : 'Start Discovery Lab →', onclick: function () {
            if (tourStep < stepDefs.length - 1) { tourStep++; renderCurrentTourStep(); }
            else setTab('lab');
          } })
        ]);

        pane.appendChild(navPills);
        pane.appendChild(card);
        pane.appendChild(foot);
      }
      renderCurrentTourStep();
    }

    function renderCurriculum() {
      pane.innerHTML = '';
      guideRefreshFn = null;
      clearSpotlights();

      var lawCard = h('div', { class: 'guide-card' }, [
        h('div', { class: 'curr-badge', text: entry.code }),
        h('p', { style: 'margin:6px 0 8px;font-size:13px;line-height:1.5', text: entry.law }),
        h('div', { style: 'display:flex;flex-direction:column;gap:4px' }, entry.formulas.map(function (f) {
          return h('div', { class: 'curr-formula', html: '<code>' + esc(f) + '</code>' });
        }))
      ]);
      pane.appendChild(lawCard);

      // Interactive "What-If" Proportionality Explorer
      if (vis.length) {
        var wiIdx = 0;
        var baseMap = null, baseParamVal = Number(vis[0].ctl.values[vis[0].spec.key]);
        var wiSel = h('select', { 'aria-label': 'Parameter to test in What-If explorer' }, vis.map(function (r, idx) {
          return h('option', { value: String(idx), text: r.labelText + (r.spec.sym ? ' (' + stripTags(r.spec.sym) + ')' : '') });
        }));
        var deltaHost = h('div', { style: 'margin-top:8px' });
        function snapMap() {
          var m = {};
          collectSnapshot().filter(function (x) { return x.kind === 'Result' && isFinite(x.num); }).forEach(function (x) {
            if (m[x.symbol] === undefined) m[x.symbol] = x;
          });
          return m;
        }
        function classifyScale(x0, x1, y0, y1) {
          if (!isFinite(y0) || !isFinite(y1)) return '—';
          if (Math.abs(y1 - y0) <= 1e-6 * Math.max(1, Math.abs(y0))) return 'Invariant (constant)';
          if (x0 === 0 || x1 === 0 || y0 === 0 || (x1 / x0) <= 0) return y1 > y0 ? 'Increases (+)' : 'Decreases (−)';
          var rx = x1 / x0, ry = y1 / y0;
          if (Math.abs(rx - 1) < 0.02) return 'Unchanged';
          if (Math.abs(ry - rx) <= 0.08 * Math.abs(rx)) return 'Linear ∝ x';
          if (Math.abs(ry - rx * rx) <= 0.12 * rx * rx) return 'Quadratic ∝ x²';
          if (Math.abs(ry - 1 / rx) <= 0.08 / rx) return 'Inverse ∝ 1/x';
          if (Math.abs(ry - Math.sqrt(rx)) <= 0.08 * Math.sqrt(rx)) return 'Root ∝ √x';
          return ry > 1 ? ('×' + ry.toFixed(2)) : ('×' + ry.toFixed(2));
        }
        function renderDeltaTable(x0, x1, rP, bMap, aMap) {
          var keys = Object.keys(aMap).slice(0, 6);
          if (!keys.length) { deltaHost.innerHTML = '<div style="font-size:12px;color:var(--muted)">Adjust values to compare outputs.</div>'; return; }
          var rowsHtml = keys.map(function (k) {
            var y0 = bMap[k] ? bMap[k].num : NaN, y1 = aMap[k].num;
            var pct = (isFinite(y0) && Math.abs(y0) > 1e-9) ? ((y1 - y0) / Math.abs(y0) * 100) : NaN;
            var pctStr = isFinite(pct) ? ((pct >= 0 ? '+' : '') + pct.toFixed(1) + '%') : '—';
            var rel = classifyScale(x0, x1, y0, y1);
            var u = aMap[k].unit ? ' ' + esc(aMap[k].unit) : '';
            return '<tr><td><b>' + esc(k) + '</b></td><td>' + (isFinite(y0) ? U.sf(y0) + u : '—') + '</td><td><b>' + (isFinite(y1) ? U.sf(y1) + u : '—') + '</b></td><td><span class="curr-rel-tag">' + esc(pctStr) + ' · ' + esc(rel) + '</span></td></tr>';
          }).join('');
          deltaHost.innerHTML = '<div style="font-size:11.5px;color:var(--muted);margin-bottom:4px">Changed <b>' + esc(rP.labelText) + '</b> from <code>' + U.sf(x0) + '</code> to <code>' + U.sf(x1) + '</code>:</div>' +
            '<table class="tbl whatif-delta-tbl"><thead><tr><th>Output</th><th>Before</th><th>After</th><th>Scaling Law</th></tr></thead><tbody>' + rowsHtml + '</tbody></table>';
        }
        function runWhatIf(targetVal) {
          var rP = vis[wiIdx]; if (!rP) return;
          var x0 = Number(rP.ctl.values[rP.spec.key]);
          var bMap = snapMap();
          if (!baseMap) { baseMap = bMap; baseParamVal = x0; }
          var x1 = U.clamp(Number(targetVal), Number(rP.spec.min), Number(rP.spec.max));
          animateParam(x0, x1, 360, function (v) { setRowValue(rP, v); }, function () {
            renderDeltaTable(x0, Number(rP.ctl.values[rP.spec.key]), rP, bMap, snapMap());
          });
        }
        wiSel.onchange = function () {
          wiIdx = Number(wiSel.value) || 0;
          baseMap = snapMap();
          baseParamVal = Number(vis[wiIdx].ctl.values[vis[wiIdx].spec.key]);
          deltaHost.innerHTML = '<div class="guide-live-row">' + liveOutputPills(4) + '</div>';
        };
        var wiBox = h('div', { class: 'whatif-box' }, [
          h('h3', { style: 'margin:0 0 6px;font-size:13.5px', text: '🔬 What-If Proportionality Explorer' }),
          h('p', { style: 'margin:0 0 8px;font-size:12px;color:var(--muted)', text: 'Scale one variable and immediately observe linear, quadratic, inverse, or invariant laws on the live simulation:' }),
          wiSel,
          h('div', { class: 'hub-bar', style: 'margin:8px 0 4px' }, [
            h('button', { type: 'button', class: 'btn', text: '×2 Double', onclick: function () { var r = vis[wiIdx]; runWhatIf(r.ctl.values[r.spec.key] * 2); } }),
            h('button', { type: 'button', class: 'btn', text: '÷2 Halve', onclick: function () { var r = vis[wiIdx]; runWhatIf(r.ctl.values[r.spec.key] * 0.5); } }),
            h('button', { type: 'button', class: 'btn', text: 'Min', onclick: function () { runWhatIf(vis[wiIdx].spec.min); } }),
            h('button', { type: 'button', class: 'btn', text: 'Mid', onclick: function () { var sp = vis[wiIdx].spec; runWhatIf((Number(sp.min) + Number(sp.max)) * 0.5); } }),
            h('button', { type: 'button', class: 'btn', text: 'Max', onclick: function () { runWhatIf(vis[wiIdx].spec.max); } }),
            h('button', { type: 'button', class: 'btn primary', text: '↺ Baseline', onclick: function () { runWhatIf(baseParamVal); } })
          ]),
          deltaHost
        ]);
        deltaHost.innerHTML = '<div class="guide-live-row">' + liveOutputPills(4) + '</div>';
        pane.appendChild(wiBox);
        guideRefreshFn = function () { if (!deltaHost.querySelector('table')) deltaHost.innerHTML = '<div class="guide-live-row">' + liveOutputPills(4) + '</div>'; };
      }

      // Examiner Traps & Mark-Scheme Checklist (merges entry.traps + any explain card bullets)
      var trapsList = entry.traps.slice();
      if (wsGlobalRefs && wsGlobalRefs.explain) {
        wsGlobalRefs.explain.forEach(function (cardEl) {
          Array.prototype.forEach.call(cardEl.querySelectorAll ? cardEl.querySelectorAll('li') : [], function (li) {
            var txt = String(li.textContent || '').trim();
            if (txt && trapsList.length < 5 && trapsList.indexOf(txt) < 0) trapsList.push(txt);
          });
        });
      }
      var trapBox = h('div', { class: 'guide-card', style: 'margin-top:10px' }, [
        h('h3', { style: 'margin:0 0 8px;font-size:13.5px', text: '⚠ Examiner Traps & Mark-Scheme Checklist' })
      ]);
      trapsList.forEach(function (t, i) {
        var id = 'trap_' + i;
        var cb = h('input', { type: 'checkbox' }); cb.checked = !!trapDone[id];
        cb.onchange = function () { trapDone[id] = cb.checked; };
        trapBox.appendChild(h('label', { class: 'curr-trap-item' }, [cb, h('span', { text: t })]));
      });
      pane.appendChild(trapBox);
    }

    function renderLab() {
      pane.innerHTML = '';
      guideRefreshFn = null;
      clearSpotlights();

      // Part A: Live Predict -> Observe -> Explain (POE) Canvas Experiment
      var poeChallengeIdx = 0;
      var poeHost = h('div', { class: 'poe-card' });

      function buildPoeExperiment() {
        poeHost.innerHTML = '';
        var resAll = collectSnapshot().filter(function (x) { return x.kind === 'Result' && isFinite(x.num); });
        if (!vis.length || !resAll.length) {
          poeHost.appendChild(h('div', {}, [
            h('strong', { style: 'font-size:13.5px', text: '🧪 Open-Ended Apparatus Exploration' }),
            h('p', { style: 'margin:6px 0 0;font-size:12.5px;color:var(--muted)', text: 'Build or manipulate components directly on the stage, then answer the Cambridge Concept Check below!' })
          ]));
          return;
        }
        var rP = vis[poeChallengeIdx % vis.length];
        var v0 = Number(rP.ctl.values[rP.spec.key]);
        var lo = Number(rP.spec.min), hi = Number(rP.spec.max), span = hi - lo;
        var v1 = v0 + span * 0.35 <= hi ? Number((v0 + Math.max(rP.step * 2, span * 0.35)).toFixed(rP.d || 2)) : Number((v0 - Math.max(rP.step * 2, span * 0.35)).toFixed(rP.d || 2));
        v1 = U.clamp(v1, lo, hi);
        if (Math.abs(v1 - v0) < 1e-6) v1 = Math.abs(hi - v0) > Math.abs(v0 - lo) ? hi : lo;

        // Probe outputs at v1 silently to select a responsive physical output
        var candidates = [];
        resAll.forEach(function (out) {
          var y1 = silentEvalOutput(rP, v1, out.symbol);
          if (isFinite(y1)) candidates.push({ out: out, y0: out.num, y1: y1, diff: Math.abs(y1 - out.num) });
        });
        candidates.sort(function (a, b) { return b.diff - a.diff; });
        var pick = candidates.length ? candidates[Math.floor(poeChallengeIdx / vis.length) % Math.min(3, candidates.length)] : null;
        if (!pick) {
          poeHost.innerHTML = '<div style="font-size:12.5px;color:var(--muted)">Try adjusting stage values to inspect live responses, or complete the Concept Check below.</div>';
          return;
        }
        var y0 = pick.y0, y1 = pick.y1, uP = rP.spec.unit ? ' ' + stripTags(rP.spec.unit) : '', uO = pick.out.unit ? ' ' + esc(pick.out.unit) : '';
        var tol = 1e-4 * Math.max(1, Math.abs(y0));
        var trueDir = Math.abs(y1 - y0) <= tol ? 'same' : (y1 > y0 ? 'up' : 'down');

        var pickedDir = '';
        var dirBtns = {}, resArea = h('div', {});
        var headRow = h('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px' }, [
          h('strong', { style: 'font-size:13.5px', text: '🧪 Predict → Observe → Explain' }),
          h('button', { type: 'button', class: 'ws-dbtn', text: '🎲 New Experiment', onclick: function () { poeChallengeIdx++; buildPoeExperiment(); } })
        ]);
        var promptEl = h('p', { style: 'margin:0 0 8px;font-size:13px;line-height:1.45', html:
          'Currently <b>' + esc(rP.labelText) + '</b> = <code>' + U.sf(v0) + esc(uP) + '</code> gives <b>' + esc(pick.out.symbol) + '</b> = <code>' + U.sf(y0) + uO + '</code>. ' +
          'If we change <b>' + esc(rP.labelText) + '</b> to <code>' + U.sf(v1) + esc(uP) + '</code>, what happens to <b>' + esc(pick.out.symbol) + '</b>?' });
        var optRow = h('div', { class: 'poe-opts' });
        [['up', '📈 Increases'], ['down', '📉 Decreases'], ['same', '⚖️ Stays constant']].forEach(function (pair) {
          var b = h('button', { type: 'button', class: 'poe-opt', text: pair[1], onclick: function () {
            pickedDir = pair[0];
            Object.keys(dirBtns).forEach(function (k) { dirBtns[k].classList.toggle('on', k === pickedDir); });
          } });
          dirBtns[pair[0]] = b;
          optRow.appendChild(b);
        });
        var runBtn = h('button', { type: 'button', class: 'btn primary', style: 'margin-top:8px;width:100%', text: '🚀 Lock Prediction & Run on Canvas', onclick: function () {
          if (!pickedDir) { resArea.innerHTML = '<div class="poe-result warn">Choose Increases, Decreases, or Stays constant first!</div>'; return; }
          runBtn.disabled = true;
          animateParam(v0, v1, 540, function (x) { setRowValue(rP, x); }, function () {
            if (SIM.view && SIM.view.setFocus) { SIM.view.setFocus([pick.out.symbol]); setTimeout(themeChanged, 0); }
            var correct = pickedDir === trueDir;
            var whyStr = autoWhy(pick.out.symbol) || entry.law;
            var xpMsg = '';
            var xpId = 'poe:' + slugKey + ':' + rP.spec.key + ':' + pick.out.symbol;
            if (correct && !guideXpAwarded[xpId]) {
              guideXpAwarded[xpId] = true;
              if (grantGuideXp(15, 'Discovery Lab Mastered!', esc(rP.labelText) + ' → ' + esc(pick.out.symbol))) xpMsg = ' · +15 XP awarded!';
            }
            resArea.innerHTML =
              '<div class="poe-result ' + (correct ? 'ok' : 'warn') + '">' +
              '<b>' + (correct ? '✓ Correct Observation!' + xpMsg : '✗ Look closely at the canvas!') + '</b><br>' +
              '<span>Observed <b>' + esc(pick.out.symbol) + '</b>: <code>' + U.sf(y0) + uO + '</code> → <code>' + U.sf(y1) + uO + '</code></span>' +
              '<div style="margin-top:4px;color:var(--muted);font-size:12px">' + esc(whyStr) + '</div>' +
              '</div>';
            resArea.appendChild(h('div', { class: 'hub-bar', style: 'margin-top:6px' }, [
              h('button', { type: 'button', class: 'btn', text: '↺ Restore Baseline', onclick: function () { animateParam(v1, v0, 360, function (x) { setRowValue(rP, x); }); } }),
              h('button', { type: 'button', class: 'btn primary', text: '🎲 Next Challenge', onclick: function () { poeChallengeIdx++; buildPoeExperiment(); } })
            ]));
            runBtn.disabled = false;
          });
        } });
        poeHost.appendChild(headRow);
        poeHost.appendChild(promptEl);
        poeHost.appendChild(optRow);
        poeHost.appendChild(runBtn);
        poeHost.appendChild(resArea);
      }
      buildPoeExperiment();
      pane.appendChild(poeHost);

      // Part B: Cambridge Concept Check Quiz
      var qz = entry.quiz || CURR_DEFAULT.quiz;
      var qCard = h('div', { class: 'poe-card', style: 'margin-top:10px' });
      var qFb = h('div', {});
      qCard.appendChild(h('strong', { style: 'font-size:13.5px;display:block;margin-bottom:6px', text: '🎯 Cambridge Concept Check' }));
      qCard.appendChild(h('p', { style: 'margin:0 0 8px;font-size:13px;line-height:1.45', text: qz.q }));
      var qBtns = [];
      qz.opts.forEach(function (opt, idx) {
        var ob = h('button', { type: 'button', class: 'poe-opt', style: 'text-align:left;width:100%', text: String.fromCharCode(65 + idx) + '. ' + opt, onclick: function () {
          qBtns.forEach(function (b, bi) {
            b.classList.toggle('on', bi === idx);
          });
          var ok = idx === qz.ans;
          var qId = 'quiz:' + slugKey;
          var xpNote = '';
          if (ok && !guideXpAwarded[qId]) {
            guideXpAwarded[qId] = true;
            if (grantGuideXp(10, 'Concept Check Cleared!', entry.code)) xpNote = ' (+10 XP)';
          }
          qFb.innerHTML = '<div class="poe-result ' + (ok ? 'ok' : 'warn') + '" style="margin-top:8px"><b>' + (ok ? '✓ Mark-Scheme Match!' + xpNote : '✗ Not quite — review the law:') + '</b><div style="margin-top:3px">' + esc(qz.why) + '</div></div>';
        } });
        qBtns.push(ob);
        qCard.appendChild(h('div', { style: 'margin-bottom:5px' }, [ob]));
      });
      qCard.appendChild(qFb);
      pane.appendChild(qCard);
    }

    function renderSi() {
      pane.innerHTML = '';
      guideRefreshFn = null;
      clearSpotlights();

      // Interactive Expression Sandbox
      var sbIn = h('input', { type: 'text', class: 'scn-search', value: '2*pi/3', placeholder: 'Type expression e.g. 4.7k, 15m, sqrt(2)*10, 2*pi/3', 'aria-label': 'SI and math expression evaluator', style: 'margin-bottom:6px' });
      var sbOut = h('div', { style: 'font-size:13px;font-weight:700;color:var(--accent);margin-bottom:8px' });
      function updateSb() {
        var val = parseNum(sbIn.value);
        sbOut.textContent = isFinite(val) ? '= ' + U.sf(val) + ' (SI base value: ' + val + ')' : 'Enter a valid SI number or math expression (e.g. 4.7k, 15m, sqrt(2)*10)';
      }
      sbIn.oninput = updateSb;
      updateSb();

      var sbCard = h('div', { class: 'guide-card', style: 'margin-bottom:10px' }, [
        h('h3', { style: 'margin:0 0 6px;font-size:13.5px', text: '🧮 Live SI & Math Expression Tester' }),
        sbIn,
        sbOut
      ]);
      if (vis.length) {
        var targetSel = h('select', { 'aria-label': 'Parameter to apply expression value' }, vis.map(function (r, i) {
          return h('option', { value: String(i), text: r.labelText + (r.spec.unit ? ' [' + stripTags(r.spec.unit) + ']' : '') });
        }));
        var applyBtn = h('button', { type: 'button', class: 'btn primary', text: '⚡ Apply to Parameter', onclick: function () {
          var v = parseNum(sbIn.value), r = vis[Number(targetSel.value) || 0];
          if (isFinite(v) && r) setRowValue(r, v);
        } });
        sbCard.appendChild(h('div', { class: 'hub-bar', style: 'margin-top:4px' }, [targetSel, applyBtn]));
      }
      pane.appendChild(sbCard);

      pane.appendChild(h('div', { html:
        '<table class="tbl"><thead><tr><th>Prefix</th><th style="text-align:left">Factor</th><th>Example</th><th>SI Value</th></tr></thead><tbody>' +
        '<tr><td><code>G</code> / <code>M</code> / <code>k</code></td><td class="txt">10⁹ / 10⁶ / 10³</td><td><code>4.7k</code></td><td>4700</td></tr>' +
        '<tr><td><code>c</code> / <code>m</code></td><td class="txt">10⁻² / 10⁻³</td><td><code>15m</code></td><td>0.015</td></tr>' +
        '<tr><td><code>u</code> / <code>µ</code> / <code>n</code> / <code>p</code></td><td class="txt">10⁻⁶ / 10⁻⁹ / 10⁻¹²</td><td><code>550n</code></td><td>5.5×10⁻⁷</td></tr>' +
        '<tr><td>Math</td><td class="txt"><code>+ − * / ^ pi sqrt() sin() cos()</code></td><td><code>2*pi/3</code></td><td>2.094</td></tr>' +
        '</tbody></table>' +
        '<p style="margin:10px 0 0;color:var(--muted);font-size:12px"><b>Keyboard Shortcuts:</b> <span class="guide-kbd">Space</span> Play/Pause · <span class="guide-kbd">?</span> Toggle Guide · <span class="guide-kbd">↑</span>/<span class="guide-kbd">↓</span> Nudge chip (<span class="guide-kbd">Shift</span> ×10) · <span class="guide-kbd">Esc</span> Close</p>'
      }));
    }

    function setTab(id) {
      curTab = /^(tour|curriculum|lab|si)$/.test(id) ? id : 'tour';
      Object.keys(tabBtns).forEach(function (k) { tabBtns[k].classList.toggle('on', k === curTab); });
      if (curTab === 'tour') renderTour();
      else if (curTab === 'curriculum') renderCurriculum();
      else if (curTab === 'lab') renderLab();
      else renderSi();
    }

    dock.appendChild(head);
    dock.appendChild(tabs);
    dock.appendChild(pane);
    document.body.appendChild(dock);
    activeGuide = { el: dock, close: closeGuide, setTab: setTab };
    setTab(startTab);
    return activeGuide;
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
    toggle: toggle, presets: presets, openEditor: openEditor, askNumber: askNumber, parseNum: parseNum, stageTip: stageTip, stageAction: stageAction, placeMode: placeMode, cancelPlace: function () { cancelPlace(false); }, stage: function () { return stage; }, syncChips: function () { syncChips(); }, Readout: Readout, examToggle: examToggle, notes: notes, legend: legend, readHash: readHash, writeHash: writeHash, esc: esc, openSolveForX: openSolveForX, openStepStudio: openStepStudio, openGuide: openGuide,
    markAsX: markAsX, clearMarkedX: clearMarkedX, getMarkedX: getMarkedX, registerXCalculator: registerXCalculator, calculateMarkedX: calculateMarkedX, syncMarkedXPill: syncMarkedXPill, animateParam: animateParam };
})(typeof self !== 'undefined' ? self : this);
