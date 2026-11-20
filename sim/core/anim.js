/* SIM.anim — play/pause/reset/scrub clock. The model must be analytic: stateAt(t). */
(function (root) {
  'use strict';
  var SIM = root.SIM = root.SIM || {};
  var U = SIM.util;

  /**
   * new Clock(container, { duration: s, onFrame: t => {}, speed: 1, loop: false })
   * clock.setDuration(T) — keeps t within [0,T]; clock.t current time.
   */
  function Clock(container, opt) {
    var h = SIM.ui.h, self = this;
    this.t = 0; this.duration = opt.duration || 5; this.playing = false; this.speed = opt.speed || 1; this.onFrame = opt.onFrame; this.loop = !!opt.loop;
    this.playBtn = h('button', { class: 'btn primary', text: '▶ Play', onclick: function () { self.toggle(); } });
    var reset = h('button', { class: 'btn', text: '⟲ Reset', onclick: function () { self.pause(); self.seek(0); } });
    var end = h('button', { class: 'btn', text: '⇥ End', title: 'Jump to end', onclick: function () { self.pause(); self.seek(self.duration); } });
    this.scrub = h('input', { type: 'range', min: 0, max: 1000, value: 0, 'aria-label': 'Time' });
    this.scrub.addEventListener('input', function () { self.pause(); self.seek(self.duration * Number(self.scrub.value) / 1000); });
    var sp = h('select', { 'aria-label': 'Playback speed' });
    [0.25, 0.5, 1, 2, 4].forEach(function (v) { var o = h('option', { value: v, text: '×' + v }); if (v === self.speed) o.selected = true; sp.appendChild(o); });
    sp.addEventListener('change', function () { self.speed = Number(sp.value); });
    this.tLabel = h('span', { class: 't', text: 't = 0.00 s' });
    // type a time to jump straight to it (data in the Live working panel is shown for that instant)
    this.tBox = h('input', { type: 'text', inputmode: 'decimal', class: 'numbox tbox', value: '0', 'aria-label': 'Go to time t in seconds' });
    var go = function () {
      var v = Number(String(self.tBox.value).replace(',', '.').replace('−', '-').trim());
      if (!isFinite(v) || self.tBox.value === '') { self.tBox.value = self.t.toFixed(2); return; }
      self.pause(); self.seek(v);
    };
    this.tBox.addEventListener('change', go);
    this.tBox.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    var goWrap = h('label', { class: 'goto' }, [h('span', { text: 'Go to t =' }), this.tBox, h('span', { text: 's' })]);
    container.appendChild(h('div', { class: 'anim' }, [this.playBtn, reset, end, this.scrub, sp, this.tLabel, goWrap]));
    this._raf = null; this._last = 0;
    this.autoplay = opt.autoplay !== false;
    clocks.push(this);
    // start playing automatically once the page has drawn its first frame
    if (this.autoplay) setTimeout(function () { if (!self.playing && self.t === 0) self.play(); }, 600);
  }
  var clocks = [], inputTimer = null;
  /** called by SIM.ui whenever a parameter, select, checkbox or preset changes: replay from t = 0 once input settles */
  function inputChanged() {
    clocks.forEach(function (c) { if (c.autoplay) c.pause(); });
    clearTimeout(inputTimer);
    inputTimer = setTimeout(function () { clocks.forEach(function (c) { if (c.autoplay) { c.seek(0); c.play(); } }); }, 350);
  }
  Clock.prototype.toggle = function () { if (this.playing) this.pause(); else this.play(); };
  Clock.prototype.play = function () {
    if (this.t >= this.duration - 1e-9) this.t = 0;
    if (this._raf) cancelAnimationFrame(this._raf);
    this.playing = true; this.playBtn.textContent = '❚❚ Pause';
    var self = this, gen = this._gen = (this._gen || 0) + 1; this._last = performance.now();
    var step = function (now) {
      if (!self.playing || gen !== self._gen) return;   // only the newest loop may advance the clock
      var dt = Math.min(0.1, (now - self._last) / 1000); self._last = now;
      var t = self.t + dt * self.speed;
      if (t >= self.duration) { if (self.loop) t = 0; else { t = self.duration; self.pause(); } }
      self.seek(t);
      if (self.playing) self._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  };
  Clock.prototype.pause = function () { this.playing = false; this._gen = (this._gen || 0) + 1; this.playBtn.textContent = '▶ Play'; if (this._raf) cancelAnimationFrame(this._raf); };
  Clock.prototype.seek = function (t) {
    this.t = U.clamp(t, 0, this.duration);
    this.scrub.value = String(Math.round(1000 * this.t / (this.duration || 1)));
    this.tLabel.textContent = 't = ' + this.t.toFixed(2) + ' s';
    if (typeof document === 'undefined' || document.activeElement !== this.tBox) this.tBox.value = this.t.toFixed(2);
    if (this.onFrame) this.onFrame(this.t);
  };
  Clock.prototype.setDuration = function (T) {
    this.duration = Math.max(1e-3, isFinite(T) ? T : 5);
    if (this.t > this.duration) this.t = this.duration;
    this.scrub.value = String(Math.round(1000 * this.t / this.duration));
  };

  SIM.anim = { Clock: Clock, inputChanged: inputChanged };
})(typeof self !== 'undefined' ? self : this);
