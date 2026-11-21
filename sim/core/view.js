/* SIM.view — world↔screen viewport and drawing primitives for canvas scenes (browser only).
   World coordinates: metres (or any unit), y up. Uniform scale, so angles look true. */
(function (root) {
  'use strict';
  var SIM = root.SIM = root.SIM || {};

  function Viewport(canvas, opt) {
    opt = opt || {};
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.pad = opt.pad === undefined ? 30 : opt.pad;
    this.scale = 1; this.ox = 0; this.oy = 0; this.w = 0; this.h = 0; this.dpr = 1;
    this.bounds = [0, 1, 0, 1];
    var self = this;
    this.onResize = null;
    if (root.ResizeObserver) new ResizeObserver(function () { self.resize(); if (self.onResize) self.onResize(); }).observe(canvas);
    this.resize();
  }
  Viewport.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect(), dpr = root.devicePixelRatio || 1;
    var w = Math.max(50, r.width), h = Math.max(50, r.height || r.width * 9 / 16);
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    }
    this.w = w; this.h = h; this.dpr = dpr;
    this.fit.apply(this, this.bounds);
  };
  /** fit the world box [x0,x1]×[y0,y1] into the canvas with uniform scale, centred */
  Viewport.prototype.fit = function (x0, x1, y0, y1) {
    this.bounds = [x0, x1, y0, y1];
    var p = this.pad, W = this.w - 2 * p, H = this.h - 2 * p;
    var sx = W / Math.max(1e-9, x1 - x0), sy = H / Math.max(1e-9, y1 - y0);
    this.scale = Math.min(sx, sy);
    this.ox = p + (W - this.scale * (x1 - x0)) / 2 - this.scale * x0;
    this.oy = p + (H - this.scale * (y1 - y0)) / 2 + this.scale * y1;
    return this;
  };
  Viewport.prototype.X = function (x) { return this.ox + this.scale * x; };
  Viewport.prototype.Y = function (y) { return this.oy - this.scale * y; };
  Viewport.prototype.P = function (x, y) { return [this.X(x), this.Y(y)]; };
  Viewport.prototype.toWorld = function (sx, sy) { return [(sx - this.ox) / this.scale, (this.oy - sy) / this.scale]; };
  /** start a frame: clear and set DPR transform. Returns ctx. */
  Viewport.prototype.begin = function () {
    var c = this.ctx, col = SIM.ui.colors();
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this === firstVp || !firstVp) { firstVp = this; hitsLast = hitsNow || (focus ? hitsLast : 0); hitsNow = 0; }
    c.fillStyle = col.panel; c.fillRect(0, 0, this.w, this.h);
    var camera = SIM.ui.cameraTransform(this.canvas, this.w, this.h);
    c.transform(camera[0], 0, 0, camera[0], camera[1], camera[2]);
    c.lineCap = 'round'; c.lineJoin = 'round';
    return c;
  };

  /* ---------------- step focus: the walkthrough highlights what the current step uses ----------------
     setFocus(['X', 'T1']) makes arrows/labels whose symbol matches glow and dims everything else.
     Dimming only happens once a frame has actually found a match, so pages without matching
     labels are never greyed out. */
  var focus = null, hitsLast = 0, hitsNow = 0, firstVp = null;
  var SUBS = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9', 'ₓ': 'x', 'ᵧ': 'y' };
  function symKey(t) {
    t = String(t || '').replace(/<[^>]+>/g, '').split(/\s=\s|=/)[0];
    return t.replace(/[₀-₉ₓᵧ]/g, function (c) { return SUBS[c]; }).replace(/\s+/g, '').replace(/[()]/g, '').toLowerCase();
  }
  function setFocus(list) {
    focus = list && list.length ? list.map(symKey).filter(function (k) { return k && k.length <= 8; }) : null;
    if (focus && !focus.length) focus = null;
    hitsLast = 0; hitsNow = 0;
  }
  /** returns 'hi' (focused), 'dim' or null for something drawn with this label */
  function focusState(label) {
    if (!focus) return null;
    var k = label ? symKey(label) : '';
    if (k && focus.indexOf(k) >= 0) { hitsNow++; return 'hi'; }
    return hitsLast > 0 ? 'dim' : null;
  }
  /** label numbers: long decimals to 3 significant figures (angles keep 1 d.p.), typographic minus */
  function tidy(text) {
    return String(text).replace(/(^|[^\w.])(-?)(\d+\.\d{3,})(?!\s*°)(?=\D|$)/g, function (m, pre, sign, num) {
      var v = Number(num); if (!isFinite(v)) return m;
      var out = Number(v.toPrecision(3)); var str = Math.abs(out) >= 100 ? String(Math.round(out)) : out.toPrecision(3);
      return pre + sign + str;
    }).replace(/(^|[\s(=])-(?=\d)/g, '$1−');
  }

  /* ---------------- primitives (screen-space unless noted) ---------------- */
  var D = {};
  /** arrow from (x1,y1) to (x2,y2) in screen px */
  D.arrow = function (c, x1, y1, x2, y2, color, opt) {
    opt = opt || {};
    var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    if (L < 0.5) return;
    var head = Math.min(opt.head || 10, L * 0.45), ux = dx / L, uy = dy / L, fs = focusState(opt.label);
    c.save();
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = (opt.width || 2.4) + (fs === 'hi' ? 1.6 : 0);
    if (fs === 'hi') { c.shadowColor = color; c.shadowBlur = 14; } else if (fs === 'dim') c.globalAlpha = 0.28;
    if (opt.dash) c.setLineDash(opt.dash);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2 - ux * head * 0.8, y2 - uy * head * 0.8); c.stroke();
    c.setLineDash([]);
    c.beginPath(); c.moveTo(x2, y2);
    c.lineTo(x2 - ux * head - uy * head * 0.45, y2 - uy * head + ux * head * 0.45);
    c.lineTo(x2 - ux * head + uy * head * 0.45, y2 - uy * head - ux * head * 0.45);
    c.closePath(); if (opt.hollow) { c.lineWidth = 1.5; c.stroke(); } else c.fill();
    c.shadowBlur = 0;
    if (opt.label) {
      var strong = opt.strongLabel, gap = strong ? 11 : 6;
      D.label(c, opt.label, x2 + ux * gap + (opt.lx || 0), y2 + uy * gap + (opt.ly || 0), strong ? SIM.ui.colors().ink : color, {
        align: ux < -0.3 ? 'right' : ux > 0.3 ? 'left' : 'center',
        base: uy > 0.3 ? 'top' : uy < -0.3 ? 'bottom' : 'middle',
        bg: true, solid: strong, bold: strong, size: strong ? 15 : 13,
        font: strong ? 'system-ui, sans-serif' : null, fs: fs || 'none'
      });
    }
    c.restore();
  };
  /** arrow from a world point in a world direction (angle rad, standard math angle) with screen length px */
  D.arrowPolar = function (c, sx, sy, ang, len, color, opt) {
    D.arrow(c, sx, sy, sx + Math.cos(ang) * len, sy - Math.sin(ang) * len, color, opt);
  };
  D.label = function (c, text, x, y, color, opt) {
    opt = opt || {};
    text = tidy(text);
    var fs = opt.fs === 'none' ? null : opt.fs || (/=/.test(text) ? focusState(text) : (focus && hitsLast ? 'dim' : null));
    c.save();
    if (fs === 'dim') c.globalAlpha = 0.35;
    c.font = (opt.bold || fs === 'hi' ? '700 ' : '500 ') + ((opt.size || 13) + (fs === 'hi' ? 1.5 : 0)) + 'px ' +
      (opt.font || 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif');
    c.textAlign = opt.align || 'center'; c.textBaseline = opt.base || 'middle';
    if (opt.bg) {
      var m = c.measureText(text), w = m.width + 6, hgt = (opt.size || 13) + 4;
      var bx = opt.align === 'left' ? x - 3 : opt.align === 'right' ? x - w + 3 : x - w / 2;
      var by = opt.base === 'top' ? y - 2 : opt.base === 'bottom' ? y - hgt + 2 : y - hgt / 2;
      var ga = isFinite(c.globalAlpha) ? c.globalAlpha : 1; c.fillStyle = SIM.ui.colors().panel; c.globalAlpha = (opt.solid ? 1 : 0.85) * ga; c.fillRect(bx, by, w, hgt); c.globalAlpha = ga;
    }
    c.fillStyle = color || SIM.ui.colors().ink; c.fillText(text, x, y);
    c.restore();
  };
  /** angle arc centred at (x,y) screen, from angle a0 to a1 (math radians, CCW positive) */
  D.arc = function (c, x, y, r, a0, a1, color, label) {
    c.save(); c.strokeStyle = color; c.lineWidth = 1.4;
    c.beginPath(); c.arc(x, y, r, -a0, -a1, a1 > a0); c.stroke();
    if (label) { var am = (a0 + a1) / 2; D.label(c, label, x + Math.cos(am) * (r + 15), y - Math.sin(am) * (r + 15), color, { size: 12, bg: true, fs: 'none' }); }
    c.restore();
  };
  D.rightAngle = function (c, x, y, a, size, color) {
    var s = size || 8, ux = Math.cos(a), uy = -Math.sin(a), vx = Math.cos(a + Math.PI / 2), vy = -Math.sin(a + Math.PI / 2);
    c.save(); c.strokeStyle = color; c.lineWidth = 1.2; c.beginPath();
    c.moveTo(x + ux * s, y + uy * s); c.lineTo(x + ux * s + vx * s, y + uy * s + vy * s); c.lineTo(x + vx * s, y + vy * s); c.stroke(); c.restore();
  };
  /** hatched ground line between two screen points (hatch below the line on the right-hand side of direction) */
  D.ground = function (c, x1, y1, x2, y2, opt) {
    opt = opt || {}; var col = SIM.ui.colors();
    var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux; // screen-space normal: for a left→right line this points DOWN (hatching below)
    if (opt.flip) { nx = -nx; ny = -ny; }
    c.save();
    c.fillStyle = col.surface; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x2 - nx * 10 * -1, y2 - ny * 10 * -1); c.lineTo(x1 + nx * 10, y1 + ny * 10); c.closePath(); c.fill();
    c.strokeStyle = col['object-line']; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.lineWidth = 1; c.strokeStyle = col.muted;
    for (var s = 6; s < L; s += 10) { var px = x1 + ux * s, py = y1 + uy * s; c.beginPath(); c.moveTo(px, py); c.lineTo(px + nx * 8 - ux * 6, py + ny * 8 - uy * 6); c.stroke(); }
    c.restore();
  };
  /** rectangle block centred at screen (x,y), rotated by math angle a (rad), size w×h px; base sits on the line */
  D.block = function (c, x, y, w, h, a, opt) {
    opt = opt || {}; var col = SIM.ui.colors();
    if (SIM.scene && SIM.scene.real() && !opt.plain && !opt.fill) { SIM.scene.crate(c, x, y, w, h, a, { label: opt.label }); return; }
    c.save(); c.translate(x, y); c.rotate(-a);
    c.fillStyle = opt.fill || col.object; c.strokeStyle = opt.stroke || col['object-line']; c.lineWidth = 1.5;
    c.beginPath(); c.rect(-w / 2, -h, w, h); c.fill(); c.stroke();
    if (opt.label) { c.fillStyle = col.ink; c.font = '600 13px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(opt.label, 0, -h / 2); }
    c.restore();
  };
  D.particle = function (c, x, y, r, opt) {
    opt = opt || {}; var col = SIM.ui.colors();
    if (SIM.scene && SIM.scene.real() && !opt.plain && r >= 3) { SIM.scene.ball(c, x, y, r, { color: opt.fill && /^#/.test(opt.fill) ? opt.fill : undefined, kind: 'steel' }); if (opt.label) D.label(c, opt.label, x, y, '#111', { size: 12, bold: true }); return; }
    c.save(); c.fillStyle = opt.fill || col.object; c.strokeStyle = opt.stroke || col['object-line']; c.lineWidth = 1.5;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.stroke();
    if (opt.label) D.label(c, opt.label, x, y, col.ink, { size: 12, bold: true });
    c.restore();
  };
  D.pulley = function (c, x, y, r, angle) {
    var col = SIM.ui.colors();
    if (SIM.scene && SIM.scene.real()) { SIM.scene.pulley(c, x, y, r, angle); return; }
    c.save(); c.strokeStyle = col['object-line']; c.fillStyle = col.surface; c.lineWidth = 1.6;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.arc(x, y, 2.5, 0, Math.PI * 2); c.fillStyle = col['object-line']; c.fill(); c.restore();
  };
  D.line = function (c, pts, color, opt) {
    opt = opt || {}; c.save(); c.strokeStyle = color; c.lineWidth = opt.width || 1.6; if (opt.dash) c.setLineDash(opt.dash);
    c.beginPath(); pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); if (opt.close) c.closePath(); c.stroke(); c.restore();
  };
  D.spring = function (c, x1, y1, x2, y2, coils, width, color) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux, n = (coils || 10) * 2;
    c.save(); c.strokeStyle = color || SIM.ui.colors()['object-line']; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x1, y1);
    var lead = L * 0.08; c.lineTo(x1 + ux * lead, y1 + uy * lead);
    for (var i = 1; i < n; i++) { var s = lead + (L - 2 * lead) * i / n, o = (i % 2 ? 1 : -1) * (width || 8); c.lineTo(x1 + ux * s + nx * o, y1 + uy * s + ny * o); }
    c.lineTo(x2 - ux * lead, y2 - uy * lead); c.lineTo(x2, y2); c.stroke(); c.restore();
  };

  /** Choose a force-arrow scale (px per newton) so the largest force is maxPx long. Returns px/N. */
  function forceScale(forces, maxPx) { var m = 0; forces.forEach(function (f) { m = Math.max(m, Math.abs(f)); }); return m > 0 ? (maxPx || 110) / m : 1; }

  /* ---------------- direct manipulation on a canvas ----------------
     interact(canvas, {
       handles(): [{ id, x, y, r?, kind? }]   screen px; grab radius defaults to 22 px (a 44 px target)
       onDrag(h, x, y, e)   while a handle is dragged (x, y in canvas px)
       onDrop(h, x, y)      drag finished
       onTap(h, x, y)       a handle was tapped without moving (e.g. open a number editor)
       canDraw(x, y) → bool, onDraw(x0, y0, x, y), onDrawEnd(x0, y0, x, y)   drag on empty space to draw something new
       onHover(h | null)    redraw so paint() can highlight
     })
     paint(ctx): call at the end of a frame to draw grab rings, so students can see what moves.
     Handles snap nothing themselves: the page decides (e.g. round an angle to 1°). */
  function interact(canvas, opt) {
    var drag = null, hover = null, drawing = null, TAP = 6;
    function pos(e) { return SIM.ui.canvasPoint(canvas, e); }
    function hit(x, y, touch) {
      var hs = (opt.handles && opt.handles()) || [], best = null, bd = Infinity, pad = touch ? 8 : 2;
      hs.forEach(function (h) {
        if (h.kind === 'pill') {
          var hw = (h.w || 78) / 2 + pad, hh = (h.h || 24) / 2 + pad;
          if (Math.abs(x - h.x) <= hw && Math.abs(y - h.y) <= hh) {
            var d0 = Math.hypot(h.x - x, h.y - y);
            if (d0 < bd) { bd = d0; best = h; }
          }
          return;
        }
        var d = Math.hypot(h.x - x, h.y - y), r = (h.r || 22) + (touch ? 8 : 0);
        if (d <= r && d < bd) { bd = d; best = h; }
      });
      return best;
    }
    function setHover(h) {
      if ((h && h.id) !== (hover && hover.id)) {
        hover = h;
        canvas.style.cursor = h ? (h.kind === 'pill' ? 'pointer' : 'grab') : (opt.canDraw ? 'crosshair' : '');
        if (opt.onHover) opt.onHover(h);
      }
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (e.isPrimary === false || (e.button !== undefined && e.button !== 0)) return;
      var p = pos(e), h = hit(p[0], p[1], e.pointerType === 'touch');
      if (h) { drag = { h: h, x0: p[0], y0: p[1], moved: false }; canvas.style.cursor = 'grabbing'; }
      else if (opt.canDraw && opt.canDraw(p[0], p[1])) drawing = { x0: p[0], y0: p[1], moved: false };
      else return;
      e.preventDefault(); if (canvas.setPointerCapture) try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (e.isPrimary === false) return;
      var p = pos(e);
      if (drag) { if (!drag.moved && Math.hypot(p[0] - drag.x0, p[1] - drag.y0) < TAP) return; drag.moved = true; if (opt.onDrag) opt.onDrag(drag.h, p[0], p[1], e); return; }
      if (drawing) { if (!drawing.moved && Math.hypot(p[0] - drawing.x0, p[1] - drawing.y0) < TAP) return; drawing.moved = true; if (opt.onDraw) opt.onDraw(drawing.x0, drawing.y0, p[0], p[1]); return; }
      if (e.pointerType !== 'touch') setHover(hit(p[0], p[1], false));
    });
    function end(e) {
      if (e.isPrimary === false) return;
      var p = pos(e);
      if (drag) { var d = drag; drag = null; canvas.style.cursor = hover ? 'grab' : ''; if (d.moved) { if (opt.onDrop) opt.onDrop(d.h, p[0], p[1]); } else if (opt.onTap) opt.onTap(d.h, p[0], p[1]); }
      if (drawing) { var w = drawing; drawing = null; if (w.moved && opt.onDrawEnd) opt.onDrawEnd(w.x0, w.y0, p[0], p[1]); }
    }
    canvas.addEventListener('pointerup', end);
    if (opt.touchClick && opt.onTap) {
      var lastTouchPointer = -Infinity;
      canvas.addEventListener('pointerup', function (e) {
        if (e.pointerType === 'touch') lastTouchPointer = performance.now();
      }, true);
      canvas.addEventListener('click', function (e) {
        // A browser can deliver a touch-generated click without a preceding pointer event.
        if (e.pointerType !== 'touch' || performance.now() - lastTouchPointer < 500) return;
        var p = pos(e), h = hit(p[0], p[1], true);
        if (h) opt.onTap(h, p[0], p[1]);
      });
    }
    canvas.addEventListener('pointercancel', function () {
      var inProgress = drag || drawing;
      drag = null; drawing = null;
      if (inProgress && opt.onCancel) opt.onCancel();
    });
    canvas.addEventListener('pointerleave', function (e) { if (!drag && !drawing && e.pointerType !== 'touch') setHover(null); });
    return {
      isDragging: function () { return !!drag || !!drawing; },
      /** draw creative handle indicators: sleek pill/underline for label handles, precision diamond reticle for drag handles */
      paint: function (c) {
        var hs = (opt.handles && opt.handles()) || [], col = SIM.ui.colors(), active = drag ? drag.h.id : hover ? hover.id : null;
        c.save();
        hs.forEach(function (h) {
          if (h.hidden) return;
          var on = h.id === active, clr = h.color || col.accent;
          if (h.kind === 'pill') {
            var pw = h.w || 78, ph = h.h || 24, px = h.x - pw / 2, py = h.y - ph / 2, pr = Math.min(9, ph / 2);
            c.save();
            c.beginPath();
            if (c.roundRect) c.roundRect(px, py, pw, ph, pr);
            else c.rect(px, py, pw, ph);
            if (on) {
              c.globalAlpha = 0.14; c.fillStyle = clr; c.fill();
              c.globalAlpha = 0.8; c.strokeStyle = clr; c.lineWidth = 1.6; c.setLineDash([]); c.stroke();
            } else {
              c.globalAlpha = 0.22; c.strokeStyle = clr; c.lineWidth = 1; c.setLineDash([]); c.stroke();
              // subtle underline accent below the label (never obscures digits)
              c.globalAlpha = 0.72; c.strokeStyle = clr; c.lineWidth = 2; c.lineCap = 'round';
              c.beginPath(); c.moveTo(px + 8, py + ph - 1); c.lineTo(px + pw - 8, py + ph - 1); c.stroke();
            }
            c.restore();
            return;
          }
          // precision corner-bracket reticle + glowing diamond core
          var r = on ? 13 : 9.5, b = on ? 5.5 : 4;
          c.save();
          if (on) {
            c.globalAlpha = 0.16; c.fillStyle = clr;
            c.beginPath(); c.arc(h.x, h.y, r + 3, 0, Math.PI * 2); c.fill();
          }
          c.strokeStyle = clr; c.lineWidth = on ? 2.2 : 1.5; c.lineCap = 'round'; c.lineJoin = 'round';
          c.setLineDash([]); c.globalAlpha = on ? 0.95 : 0.62;
          // 4 corner L-brackets
          [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (d) {
            var cx = h.x + d[0] * r, cy = h.y + d[1] * r;
            c.beginPath();
            c.moveTo(cx - d[0] * b, cy); c.lineTo(cx, cy); c.lineTo(cx, cy - d[1] * b);
            c.stroke();
          });
          // small central diamond node
          var dr = on ? 4 : 2.6;
          c.beginPath();
          c.moveTo(h.x, h.y - dr); c.lineTo(h.x + dr, h.y); c.lineTo(h.x, h.y + dr); c.lineTo(h.x - dr, h.y); c.closePath();
          c.fillStyle = clr; c.globalAlpha = on ? 0.9 : 0.45; c.fill();
          c.restore();
        });
        c.restore();
      }
    };
  }
  /** angle (degrees, anticlockwise from +x) of the screen vector from (x0,y0) to (x,y) */
  function screenAngle(x0, y0, x, y) { var a = Math.atan2(-(y - y0), x - x0) * 180 / Math.PI; return (a + 360) % 360; }

  SIM.view = { Viewport: Viewport, draw: D, forceScale: forceScale, interact: interact, screenAngle: screenAngle, setFocus: setFocus };
})(typeof self !== 'undefined' ? self : this);
