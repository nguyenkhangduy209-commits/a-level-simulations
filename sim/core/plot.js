/* SIM.plot — small 2D graph renderer (s–t, v–t, a–t, etc.) with signed-area shading and a time cursor. */
(function (root) {
  'use strict';
  var SIM = root.SIM = root.SIM || {};
  var U = SIM.util;

  function Plot(canvas, opt) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.opt = opt || {};
    this.w = 0; this.h = 0; this.dpr = 1; this.last = null;
    var self = this;
    if (root.ResizeObserver) new ResizeObserver(function () { self.resize(); if (self.last) self.draw(self.last); }).observe(canvas);
    this.resize();
  }
  Plot.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect(), dpr = root.devicePixelRatio || 1;
    var w = Math.max(80, r.width), h = Math.max(60, r.height || r.width * 0.75);
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.w = w; this.h = h; this.dpr = dpr;
  };
  /**
   * spec = {
   *   x: [x0, x1],                      // x range (required)
   *   y: [y0, y1] | undefined,          // auto if omitted (always includes 0)
   *   series: [{ fn: x=>y | pts: [[x,y],...], color, label, width, dash, shade: true (signed area to y=0), steps: n, breaks: [x...] }],
   *   cursor: x, markers: [{x, y, label, color}], vlines: [{x, label}], hlines: [{y, label}],
   *   xLabel, yLabel, title
   * }
   */
  Plot.prototype.draw = function (spec) {
    this.last = spec;
    var c = this.ctx, col = SIM.ui.colors(), o = this.opt;
    var xLabel = spec.xLabel || o.xLabel || 't / s', yLabel = spec.yLabel || o.yLabel || '';
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = col.panel; c.fillRect(0, 0, this.w, this.h);
    var L = 52, R = 12, T = 22, B = 34, W = this.w - L - R, H = this.h - T - B;
    var x0 = spec.x[0], x1 = spec.x[1];
    if (!(x1 > x0)) x1 = x0 + 1;
    // sample series
    var samples = (spec.series || []).map(function (s) {
      if (s.pts) return s.pts;
      var n = s.steps || 400, pts = [];
      var br = (s.breaks || []).filter(function (b) { return b > x0 && b < x1; }).sort(function (a, b) { return a - b; });
      var xs = [];
      for (var i = 0; i <= n; i++) xs.push(x0 + (x1 - x0) * i / n);
      br.forEach(function (b) { xs.push(b - 1e-9 * (x1 - x0)); xs.push(b + 1e-9 * (x1 - x0)); });
      xs.sort(function (a, b) { return a - b; });
      xs.forEach(function (x) { var y = s.fn(x); pts.push([x, isFinite(y) ? y : NaN]); });
      return pts;
    });
    var yr = spec.y;
    if (!yr) {
      var lo = 0, hi = 0;
      samples.forEach(function (pts) { pts.forEach(function (p) { if (isFinite(p[1]) && p[0] >= x0 - 1e-12 && p[0] <= x1 + 1e-12) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); } }); });
      (spec.markers || []).forEach(function (m) { if (isFinite(m.y)) { lo = Math.min(lo, m.y); hi = Math.max(hi, m.y); } });
      if (hi - lo < 1e-9) { hi += 1; lo -= (lo < 0 ? 1 : 0); }
      var padY = (hi - lo) * 0.08; yr = [lo - (lo < 0 ? padY : 0), hi + (hi > 0 ? padY : 0)];
    }
    var xt = U.niceTicks(x0, x1, Math.max(3, Math.floor(W / 70))), yt = U.niceTicks(yr[0], yr[1], Math.max(3, Math.floor(H / 40)));
    var X0 = x0, X1 = x1, Y0 = yt.min, Y1 = yt.max;
    if (spec.y) { Y0 = spec.y[0]; Y1 = spec.y[1]; }
    function px(x) { return L + (x - X0) / (X1 - X0) * W; }
    function py(y) { return T + (Y1 - y) / (Y1 - Y0) * H; }
    this.px = px; this.py = py; this.box = { L: L, T: T, W: W, H: H };
    // grid
    c.font = '11px system-ui, sans-serif'; c.lineWidth = 1;
    xt.ticks.forEach(function (t) {
      if (t < X0 - 1e-9 || t > X1 + 1e-9) return;
      c.strokeStyle = col.grid; c.beginPath(); c.moveTo(px(t), T); c.lineTo(px(t), T + H); c.stroke();
      c.fillStyle = col.muted; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(U.num(t, 6), px(t), T + H + 4);
    });
    yt.ticks.forEach(function (t) {
      if (t < Y0 - 1e-9 || t > Y1 + 1e-9) return;
      c.strokeStyle = col.grid; c.beginPath(); c.moveTo(L, py(t)); c.lineTo(L + W, py(t)); c.stroke();
      c.fillStyle = col.muted; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(U.num(t, 6), L - 5, py(t));
    });
    // axes (y = 0 line emphasised)
    c.strokeStyle = col.muted; c.lineWidth = 1.2;
    var zy = Y0 <= 0 && Y1 >= 0 ? py(0) : T + H;
    c.beginPath(); c.moveTo(L, zy); c.lineTo(L + W, zy); c.stroke();
    c.beginPath(); c.moveTo(px(Math.max(X0, Math.min(0, X1))), T); c.lineTo(px(Math.max(X0, Math.min(0, X1))), T + H); c.stroke();
    // labels
    c.fillStyle = col.ink; c.font = '12px system-ui, sans-serif';
    c.textAlign = 'right'; c.textBaseline = 'bottom'; c.fillText(xLabel, L + W, T + H + B - 2);
    c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(yLabel, 6, 4);
    if (spec.title) { c.textAlign = 'right'; c.fillStyle = col.muted; c.fillText(spec.title, L + W, 4); }
    // clip to plot area
    c.save(); c.beginPath(); c.rect(L, T, W, H); c.clip();
    (spec.series || []).forEach(function (s, i) {
      var pts = samples[i];
      if (s.shade) {
        // signed area: fill each segment toward y=0 with + / − colours
        for (var k = 1; k < pts.length; k++) {
          var a = pts[k - 1], b = pts[k];
          if (!isFinite(a[1]) || !isFinite(b[1])) continue;
          var sa = a[1] >= 0, sb = b[1] >= 0;
          if (sa === sb) {
            c.fillStyle = sa ? col.pos : col.neg; c.beginPath();
            c.moveTo(px(a[0]), py(0)); c.lineTo(px(a[0]), py(a[1])); c.lineTo(px(b[0]), py(b[1])); c.lineTo(px(b[0]), py(0)); c.closePath(); c.fill();
          } else {
            var xm = a[0] + (b[0] - a[0]) * (a[1] / (a[1] - b[1]));
            c.fillStyle = sa ? col.pos : col.neg; c.beginPath(); c.moveTo(px(a[0]), py(0)); c.lineTo(px(a[0]), py(a[1])); c.lineTo(px(xm), py(0)); c.closePath(); c.fill();
            c.fillStyle = sb ? col.pos : col.neg; c.beginPath(); c.moveTo(px(xm), py(0)); c.lineTo(px(b[0]), py(b[1])); c.lineTo(px(b[0]), py(0)); c.closePath(); c.fill();
          }
        }
      }
      c.strokeStyle = s.color || col.s1; c.lineWidth = s.width || 2; c.setLineDash(s.dash || []);
      c.beginPath(); var pen = false;
      pts.forEach(function (p) {
        if (!isFinite(p[1])) { pen = false; return; }
        if (pen) c.lineTo(px(p[0]), py(p[1])); else { c.moveTo(px(p[0]), py(p[1])); pen = true; }
      });
      c.stroke(); c.setLineDash([]);
    });
    (spec.hlines || []).forEach(function (hl) {
      c.strokeStyle = hl.color || col.muted; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(L, py(hl.y)); c.lineTo(L + W, py(hl.y)); c.stroke(); c.setLineDash([]);
      if (hl.label) { c.fillStyle = hl.color || col.muted; c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText(hl.label, L + 4, py(hl.y) - 2); }
    });
    (spec.vlines || []).forEach(function (vl) {
      c.strokeStyle = vl.color || col.muted; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(px(vl.x), T); c.lineTo(px(vl.x), T + H); c.stroke(); c.setLineDash([]);
      if (vl.label) { c.fillStyle = vl.color || col.muted; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(vl.label, px(vl.x) + 3, T + 2); }
    });
    (spec.markers || []).forEach(function (m) {
      c.fillStyle = m.color || col.ink; c.beginPath(); c.arc(px(m.x), py(m.y), 3.5, 0, Math.PI * 2); c.fill();
      if (m.label) { c.textAlign = 'left'; c.textBaseline = 'bottom'; c.font = '11px system-ui, sans-serif'; c.fillText(m.label, px(m.x) + 5, py(m.y) - 3); }
    });
    if (spec.cursor !== undefined && isFinite(spec.cursor)) {
      c.strokeStyle = col.accent; c.lineWidth = 1.5; c.beginPath(); c.moveTo(px(spec.cursor), T); c.lineTo(px(spec.cursor), T + H); c.stroke();
      (spec.series || []).forEach(function (s) {
        if (!s.fn) return; var y = s.fn(spec.cursor); if (!isFinite(y)) return;
        c.fillStyle = s.color || col.s1; c.beginPath(); c.arc(px(spec.cursor), py(y), 4, 0, Math.PI * 2); c.fill();
      });
    }
    c.restore();
  };

  SIM.plot = { Plot: Plot };
})(typeof self !== 'undefined' ? self : this);
