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

  /* ---------- page skeleton ---------- */
  function page(opt) {
    document.title = opt.title;
    var head = h('header', { class: 'sim-head' }, [
      h('a', { class: 'crumb', href: opt.back || '../../index.html', text: '← All simulations' }),
      h('h1', { text: opt.title }),
      h('div', { class: 'tags' }, (opt.tags || []).map(function (t) { return h('span', { class: 'chip', text: t }); })
        .concat(opt.g ? [h('span', { class: 'chip g', html: 'g = ' + opt.g + ' m s<sup>−2</sup>' })] : [])),
      h('button', { class: 'theme-btn', text: 'Light / dark', onclick: function () {
        var d = document.documentElement, cur = d.getAttribute('data-theme');
        var dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
        d.setAttribute('data-theme', dark ? 'light' : 'dark');
        try { localStorage.setItem('sim-theme', dark ? 'light' : 'dark'); } catch (e) { /* storage blocked */ }
        themeChanged();
      } })
    ]);
    try { var saved = localStorage.getItem('sim-theme'); if (saved) document.documentElement.setAttribute('data-theme', saved); } catch (e) { /* ignore */ }
    var left = h('section', { class: 'left' }), right = h('aside', { class: 'right' });
    // ?embed=1: shown as a mode inside a grouped simulation (group.html supplies the header)
    if (query.get('embed') === '1') { document.body.classList.add('embed'); var tg = query.get('theme'); if (tg === 'dark' || tg === 'light') document.documentElement.setAttribute('data-theme', tg); }
    else document.body.appendChild(head);
    document.body.appendChild(h('main', { class: 'sim' }, [left, right]));
    function card(where, title) {
      var c = h('div', { class: 'card' }, title ? [h('h2', { text: title })] : []);
      (where === 'left' ? left : where === 'right' ? right : where).appendChild(c);
      return c;
    }
    return { left: left, right: right, card: card };
  }

  /** canvas inside a container; returns the canvas (sizing handled by SIM.view.Viewport / SIM.plot.Plot) */
  function canvas(container, cls) { var c = h('canvas', { class: cls || '' }); container.appendChild(c); return c; }

  /* ---------- sliders ---------- */
  /** tell the animation clock(s) that an input changed, so the simulation replays from t = 0 */
  function notify() {
    examResets.forEach(function (f) { f(); });   // new numbers: hide exam answers again
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
      ctl.rows[sp.key] = { row: row, range: range, box: box, spec: sp, d: d, step: step };
      range.addEventListener('input', function () { notify(); var v = snapValue(Number(range.value), sp, ctl.rows[sp.key].step); ctl.values[sp.key] = v; box.value = U.num(v, d); onChange && onChange(sp.key); });
      box.addEventListener('change', function () {
        var v = Number(String(box.value).replace(',', '.').replace('−', '-').trim()); if (box.value === '' || !isFinite(v)) { box.value = ctl.values[sp.key]; return; }
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
    return ctl;
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
  /** preset dropdown. presets: [{name, values, note}] ; apply(preset) */
  function presets(container, list, apply) {
    var sel = h('select', { 'aria-label': 'Preset' });
    sel.appendChild(h('option', { value: '', text: 'Choose a preset / exam setup…' }));
    list.forEach(function (p, i) { sel.appendChild(h('option', { value: String(i), text: p.name })); });
    var note = h('div', { class: 'notes', style: 'color:var(--muted);font-size:12.5px' });
    container.appendChild(h('div', { class: 'row' }, [sel]));
    container.appendChild(note);
    sel.addEventListener('change', function () {
      if (sel.value === '') { note.innerHTML = ''; return; }
      var p = list[Number(sel.value)]; note.innerHTML = p.note || ''; apply(p); notify();
    });
    var api = { el: sel, select: function (i) { sel.value = String(i); sel.dispatchEvent(new Event('change')); },
      /** call once at the END of page setup: applies ?preset=N from the URL (used by hub deep links) */
      fromQuery: function () { var q = query.get('preset'); if (q !== null && list[Number(q)]) api.select(Number(q)); } };
    return api;
  }

  /* ---------- readout: "symbol = working = result unit" ---------- */
  function Readout(container) {
    var buf = [], el = h('div', { class: 'readout' });
    container.appendChild(el);
    var api = {
      el: el,
      clear: function () { buf = []; return api; },
      head: function (t) { buf.push('<div class="head">' + t + '</div>'); return api; },
      /** eq('a', 'F/m = 12/3', 4, 'm s<sup>−2</sup>') — value may be a number (formatted 3 s.f.) or html string */
      eq: function (lhs, work, value, unit) {
        var v = typeof value === 'number' ? U.sf(value) : (value === undefined ? '' : value);
        buf.push('<div class="eq"><span class="lhs">' + lhs + '</span><span class="rhs"><span class="res">' + v + '</span>' + (unit ? ' ' + unit : '') + '</span>' +
          (work ? '<span class="work">' + work + '</span>' : '') + '</div>');
        return api;
      },
      badge: function (t, kind) { buf.push('<span class="badge ' + (kind || 'info') + '">' + t + '</span>'); return api; },
      html: function (s) { buf.push(s); return api; },
      render: function () { el.innerHTML = buf.join(''); return api; }
    };
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
      });
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
    examResets.push(function () { if (on) { revealed = {}; apply(); } });
    var t = toggle(container, { label: 'Exam mode: hide answers (tap a line to reveal it)' }, function (v) {
      on = v; revealed = {}; target.classList.toggle('exam-hidden', on); bar.style.display = on ? '' : 'none'; apply();
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

  SIM.ui = { h: h, course: course, gFor: gFor, colors: colors, onTheme: onTheme, page: page, canvas: canvas, params: params, select: select,
    toggle: toggle, presets: presets, Readout: Readout, examToggle: examToggle, notes: notes, legend: legend, readHash: readHash, writeHash: writeHash, esc: esc };
})(typeof self !== 'undefined' ? self : this);
