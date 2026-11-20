/* Headless smoke test for simulation pages: `node sim/tests/smoke.js [page-substring]`
   Loads each page in a fake DOM, applies every preset, drags every slider to min / max / mid,
   toggles every checkbox, cycles every select, scrubs the clock — and fails on exceptions or on
   'NaN' / 'undefined' / 'Infinity' appearing in the visible text. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SIM_DIR = path.join(__dirname, '..');

function makeCtx2d() {
  const noop = () => {};
  const target = { measureText: (t) => ({ width: String(t).length * 7 }), createLinearGradient: () => ({ addColorStop: noop }), getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(4 * w * h), width: w, height: h }), putImageData: noop, setLineDash: noop, getLineDash: () => [] };
  return new Proxy(target, {
    get(t, k) { if (k in t) return t[k]; return noop; },
    set(t, k, v) {
      if ((k === 'lineWidth' || k === 'globalAlpha') && !isFinite(v)) throw new Error('canvas ' + String(k) + ' set to ' + v);
      t[k] = v; return true;
    }
  });
}
class Ev { constructor(type) { this.type = type; this.target = null; } preventDefault() {} stopPropagation() {} }
class El {
  constructor(tag, doc) {
    this.tagName = String(tag).toUpperCase(); this.children = []; this.parentNode = null; this.attrs = {}; this.style = {}; this._h = {}; this._doc = doc;
    this.value = ''; this.checked = false; this.disabled = false; this._html = ''; this.width = 300; this.height = 150; this.className = '';
    const self = this;
    this.classList = { add: (c) => { self.className += ' ' + c; }, remove: () => {}, toggle: () => {}, contains: (c) => self.className.split(/\s+/).includes(c) };
    if (this.tagName === 'SELECT') this.options = [];
  }
  get textContent() { return this._text !== undefined ? this._text : this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this._text = String(v); this.children = []; }
  get innerHTML() { return this._html + this.children.map(c => c.innerHTML || c.textContent).join(''); }
  set innerHTML(v) { this._html = String(v); this.children = []; this._doc._texts.add(this); }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'value') this.value = String(v); if (k === 'min') this.min = String(v); if (k === 'max') this.max = String(v); if (k === 'step') this.step = String(v); if (k === 'type') this.type = String(v); }
  getAttribute(k) { return this.attrs[k] !== undefined ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  appendChild(c) { if (c && c.parentNode) c.parentNode.children = c.parentNode.children.filter(x => x !== c); c.parentNode = this; this.children.push(c); if (this.tagName === 'SELECT' && c.tagName === 'OPTION') { this.options.push(c); if (this.value === '' ) this.value = c.value; } this._doc._all.add(c); return c; }
  insertBefore(c) { return this.appendChild(c); }
  removeChild(c) { this.children = this.children.filter(x => x !== c); return c; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  addEventListener(t, f) { (this._h[t] = this._h[t] || []).push(f); }
  removeEventListener() {}
  dispatchEvent(e) { e.target = this; (this._h[e.type] || []).forEach(f => f.call(this, e)); return true; }
  click() { this.dispatchEvent(new Ev('click')); }
  focus() {} blur() {}
  getContext() { return this._ctx || (this._ctx = makeCtx2d()); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 450, right: 800, bottom: 450 }; }
  get clientWidth() { return 800; } get clientHeight() { return 450; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || new El('div', this._doc); }
  querySelectorAll(sel) {
    const out = [], tag = sel.replace(/[.#\[].*$/, '').toUpperCase();
    const walk = (n) => n.children.forEach(c => { if (!tag || c.tagName === tag) out.push(c); walk(c); }); walk(this); return out;
  }
  closest() { return null; }
  set onclick(f) { this.addEventListener('click', f); }
  set oninput(f) { this.addEventListener('input', f); }
  set onchange(f) { this.addEventListener('change', f); }
}
Object.defineProperty(El.prototype, 'selected', { set(v) { if (v && this.parentNode) this.parentNode.value = this.value; }, get() { return false; } });

function runPage(file) {
  const html = fs.readFileSync(file, 'utf8');
  const doc = { _all: new Set(), _texts: new Set() };
  doc.createElement = (t) => { const e = new El(t, doc); doc._all.add(e); return e; };
  doc.createTextNode = (t) => { const e = new El('#text', doc); e._text = String(t); return e; };
  doc.body = doc.createElement('body'); doc.head = doc.createElement('head');
  doc.documentElement = doc.createElement('html');
  doc.getElementById = (id) => [...doc._all].find(e => e.attrs.id === id) || null;
  doc.querySelector = (s) => doc.body.querySelector(s); doc.querySelectorAll = (s) => doc.body.querySelectorAll(s);
  doc.addEventListener = () => {};
  const rafQ = [];
  const win = {
    document: doc, console, Math, Number, String, Array, Object, JSON, Date, Error, Map, Set, Proxy, Symbol, parseFloat, parseInt, isFinite, isNaN, Float64Array, Uint8ClampedArray, Int32Array, Promise,
    location: { search: '', hash: '', pathname: '/x.html', href: 'http://x/x.html' }, history: { replaceState() {} },
    localStorage: { getItem: () => null, setItem() {} }, devicePixelRatio: 1, innerWidth: 1200, innerHeight: 800,
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    getComputedStyle: () => ({ getPropertyValue: () => '#888888', width: '800px' }),
    requestAnimationFrame: (f) => { rafQ.push(f); return rafQ.length; }, cancelAnimationFrame() {},
    setTimeout: (f) => { return 0; }, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    performance: { now: () => Date.now() }, ResizeObserver: class { observe() {} disconnect() {} },
    URLSearchParams, Event: Ev, CustomEvent: Ev, HTMLElement: El, addEventListener() {}, navigator: { userAgent: 'node' }
  };
  win.window = win; win.self = win; win.globalThis = win;
  const ctx = vm.createContext(win);
  // scripts in order
  const re = /<script(?:\s+src="([^"]+)")?[^>]*>([\s\S]*?)<\/script>/g; let m;
  while ((m = re.exec(html))) {
    if (m[1]) { const p = path.resolve(path.dirname(file), m[1]); vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p }); }
    else vm.runInContext(m[2], ctx, { filename: file + ':inline' });
  }
  const problems = [];
  const scan = (when) => {
    for (const e of doc._texts) {
      const t = e._html.replace(/<[^>]+>/g, ' ');
      const bad = t.replace(/\bnull (at|point|deflection|reading|method)\b/g, '').match(/\bNaN\b|\bundefined\b|\bnull\b|Infinity|\[object/);   // "null at 64 cm" is physics, not a bug
      if (bad) problems.push(when + ': "' + t.slice(Math.max(0, bad.index - 60), bad.index + 30).replace(/\s+/g, ' ') + '"');
    }
  };
  const fire = (el, type) => el.dispatchEvent(new Ev(type));
  const all = () => [...doc._all];
  scan('initial');
  // play a few animation frames
  const runFrames = () => { for (let i = 0; i < 5 && rafQ.length; i++) { const f = rafQ.shift(); f(Date.now() + i * 50); } rafQ.length = 0; };
  all().filter(e => e.tagName === 'BUTTON').forEach(b => { if (/Play/.test(b.textContent)) { fire(b, 'click'); runFrames(); fire(b, 'click'); } });
  const selects = all().filter(e => e.tagName === 'SELECT');
  const presetSel = selects.filter(s => s.attrs['aria-label'] === 'Preset');
  presetSel.forEach(s => s.options.slice(1).forEach(o => { s.value = o.value; fire(s, 'change'); scan('preset "' + o.textContent + '"'); }));
  const sliders = all().filter(e => e.tagName === 'INPUT' && e.attrs.type === 'range');
  sliders.forEach(r => {
    const orig = r.value;
    [r.min, r.max, String((Number(r.min) + Number(r.max)) / 2), orig].forEach(v => { if (v === undefined) return; r.value = v; fire(r, 'input'); scan('slider ' + (r.attrs['aria-label'] || '?') + '=' + v); });
  });
  all().filter(e => e.tagName === 'INPUT' && e.attrs.type === 'checkbox').forEach(cb => { cb.checked = !cb.checked; fire(cb, 'change'); scan('checkbox toggled'); cb.checked = !cb.checked; fire(cb, 'change'); });
  selects.filter(s => !presetSel.includes(s)).forEach(s => { const orig = s.value; s.options.forEach(o => { s.value = o.value; fire(s, 'change'); scan('select ' + (s.attrs['aria-label'] || '') + '=' + o.value); }); s.value = orig; fire(s, 'change'); });
  all().filter(e => e.tagName === 'BUTTON' && !/Play|Pause|Light/.test(e.textContent)).forEach(b => { fire(b, 'click'); scan('button ' + b.textContent); });
  return [...new Set(problems)];
}

const filter = process.argv[2] || '';
const pages = [];
['sims/9709', 'sims/9702'].forEach(d => { const dir = path.join(SIM_DIR, d); if (fs.existsSync(dir)) fs.readdirSync(dir).filter(f => f.endsWith('.html')).forEach(f => pages.push(path.join(dir, f))); });
let bad = 0;
pages.filter(p => p.includes(filter)).forEach(p => {
  const rel = path.relative(SIM_DIR, p);
  try {
    const probs = runPage(p);
    if (probs.length) { bad++; console.log('WARN  ' + rel); probs.slice(0, 8).forEach(x => console.log('      ' + x)); if (probs.length > 8) console.log('      … ' + (probs.length - 8) + ' more'); }
    else console.log('ok    ' + rel);
  } catch (e) { bad++; console.log('FAIL  ' + rel + '\n      ' + (e.stack || e).toString().split('\n').slice(0, 4).join('\n      ')); }
});
console.log(`\n${pages.filter(p => p.includes(filter)).length - bad} clean, ${bad} with problems`);
process.exit(bad ? 1 : 0);
