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
    var r = this.canvas.getBoundingClientRect(), dpr = Math.min(2, root.devicePixelRatio || 1);
    if (r.width < 10) return;
    var w = Math.min(2200, Math.max(80, r.width)), h = Math.min(1600, Math.max(60, r.height || w * 9 / 16));
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
  function isLightTheme() {
    return typeof document !== 'undefined' && document.documentElement && document.documentElement.getAttribute && document.documentElement.getAttribute('data-theme') === 'light';
  }
  function hudBoxesFor(canvas, vw, vh) {
    var out = [];
    if (!canvas || !canvas.getBoundingClientRect || typeof document === 'undefined' || !document.body || !document.body.classList || !document.body.classList.contains('ws-clean')) return out;
    if (canvas.closest && canvas.closest('.ws-drawer, .step-studio')) return out;
    try {
      var cr = canvas.getBoundingClientRect();
      if (!(cr.width > 0 && cr.height > 0)) return out;
      var sx = vw / cr.width, sy = vh / cr.height;
      var nodes = document.querySelectorAll('.ws-pill, .look-switch, .stage-actions, .anim, .mom-hud');
      for (var i = 0; i < nodes.length; i++) {
        var r = nodes[i].getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0)) continue;
        var rx = (r.left - cr.left) * sx - 6, ry = (r.top - cr.top) * sy - 6;
        var rw = r.width * sx + 12, rh = r.height * sy + 12;
        if (rx + rw > 0 && ry + rh > 0 && rx < vw && ry < vh) out.push({ x: rx, y: ry, w: rw, h: rh });
      }
    } catch (e) { /* ignore */ }
    return out;
  }
  /** start a frame: clear and set DPR transform. Returns ctx. */
  Viewport.prototype.begin = function () {
    var c = this.ctx, col = SIM.ui.colors();
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this === firstVp || !firstVp) { firstVp = this; hitsLast = hitsNow || (focus ? hitsLast : 0); hitsNow = 0; }
    c._labelBoxes = []; c._vpW = this.w; c._vpH = this.h;
    c._hudBoxes = hudBoxesFor(this.el, this.w, this.h);
    if (!isLightTheme() && c.createRadialGradient) {
      var bg = c.createRadialGradient(this.w * 0.5, this.h * 0.45, 20, this.w * 0.5, this.h * 0.5, Math.max(this.w, this.h) * 0.72);
      if (bg && bg.addColorStop) { bg.addColorStop(0, '#0b1218'); bg.addColorStop(1, '#04070a'); c.fillStyle = bg; }
      else c.fillStyle = '#080e13';
    } else c.fillStyle = col.panel;
    c.fillRect(0, 0, this.w, this.h);
    c.lineCap = 'round'; c.lineJoin = 'round';
    return c;
  };

  /* ---------------- step focus: the walkthrough highlights what the current step uses ----------------
     setFocus(['X', 'T1']) makes arrows/labels whose symbol matches glow and dims everything else.
     Dimming only happens once a frame has actually found a match, so pages without matching
     labels are never greyed out. */
  var focus = null, hitsLast = 0, hitsNow = 0, firstVp = null, pulse = 0;
  function setPulse(p) { pulse = Math.max(0, Math.min(1, Number(p) || 0)); }
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
    var head = Math.min(opt.head || 11, L * 0.45), ux = dx / L, uy = dy / L, fs = focusState(opt.label);
    c.save();
    if (fs === 'dim') c.globalAlpha = 0.48;
    if (!isLightTheme() && fs !== 'dim') {
      c.strokeStyle = 'rgba(3, 6, 8, 0.78)';
      c.lineWidth = (opt.width || 2.8) + (fs === 'hi' ? 4.2 : 2.6);
      if (opt.dash) c.setLineDash(opt.dash);
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2 - ux * head * 0.72, y2 - uy * head * 0.72); c.stroke();
      c.setLineDash([]);
    }
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = (opt.width || 2.8) + (fs === 'hi' ? 1.8 + pulse * 0.8 : 0);
    if (fs === 'hi') { c.shadowColor = color; c.shadowBlur = 16 + pulse * 12; }
    else { c.shadowColor = color; c.shadowBlur = 5; }
    if (opt.dash) c.setLineDash(opt.dash);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2 - ux * head * 0.72, y2 - uy * head * 0.72); c.stroke();
    c.setLineDash([]);
    c.beginPath(); c.moveTo(x2, y2);
    c.lineTo(x2 - ux * head - uy * head * 0.46, y2 - uy * head + ux * head * 0.46);
    c.lineTo(x2 - ux * head * 0.72, y2 - uy * head * 0.72);
    c.lineTo(x2 - ux * head + uy * head * 0.46, y2 - uy * head - ux * head * 0.46);
    c.closePath(); if (opt.hollow) { c.lineWidth = 1.6; c.stroke(); } else c.fill();
    c.shadowBlur = 0;
    if (opt.label) {
      if (c._labelBoxes && (c._vpW || 0) > 460 && L > 12 && opt.avoidTip !== false) {
        c._labelBoxes.push({ x: x2 - 14, y: y2 - 14, w: 28, h: 28 });
      }
      var align = opt.align || (ux < -0.3 ? 'right' : ux > 0.3 ? 'left' : 'center');
      var base = opt.base || (uy > 0.3 ? 'top' : uy < -0.3 ? 'bottom' : 'middle');
      D.label(c, opt.label, x2 + ux * 18 + (opt.lx || 0), y2 + uy * 18 + (opt.ly || 0), color, { align: align, base: base, bg: true, fs: fs || 'none' });
    }
    c.restore();
  };
  /** arrow from a world point in a world direction (angle rad, standard math angle) with screen length px */
  D.arrowPolar = function (c, sx, sy, ang, len, color, opt) {
    D.arrow(c, sx, sy, sx + Math.cos(ang) * len, sy - Math.sin(ang) * len, color, opt);
  };
  var AVOID_DIRS = [[0, -1], [1, 0], [-1, 0], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]];
  D.label = function (c, text, x, y, color, opt) {
    opt = opt || {};
    text = tidy(text);
    var fs = opt.fs === 'none' ? null : opt.fs || (/=/.test(text) ? focusState(text) : (focus && hitsLast ? 'dim' : null));
    c.save();
    if (fs === 'dim') c.globalAlpha = 0.62;
    var sz = (opt.size || 13) + (fs === 'hi' ? 1.5 : 0);
    c.font = (opt.bold || fs === 'hi' || opt.bg ? '700 ' : '600 ') + sz + 'px "Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif';
    c.textAlign = opt.align || 'center'; c.textBaseline = opt.base || 'middle';
    var m = c.measureText(text), padX = 8, w = m.width + padX * 2, hgt = sz + 8;
    var origBx = opt.align === 'left' ? x - padX : opt.align === 'right' ? x - w + padX : x - w / 2;
    var origBy = opt.base === 'top' ? y - 3 : opt.base === 'bottom' ? y - hgt + 3 : y - hgt / 2;
    var bx = origBx, by = origBy, tx = x, ty = y;

    var boxes = c._labelBoxes, hboxes = opt.avoidHud === false ? null : c._hudBoxes, vw = c._vpW || 0, vh = c._vpH || 0;
    var hudOverlapOnly = !!(boxes && hboxes && hboxes.length && vw > w + 16 && vh > hgt + 16 && !opt.bg && text.length >= 2);
    var checkCollide = !!(boxes && vw > w + 16 && vh > hgt + 16 && (opt.bg || /[=°+−?]/.test(text) || text.length > 2));
    if (checkCollide || hudOverlapOnly) {
      var clampX = function (rx) { return Math.max(8, Math.min(vw - w - 8, rx)); };
      var clampY = function (ry) { return Math.max(8, Math.min(vh - hgt - 8, ry)); };
      var hits = function (rx, ry) {
        if (checkCollide) {
          for (var i = 0; i < boxes.length; i++) {
            var b = boxes[i];
            if (rx < b.x + b.w + 4 && rx + w + 4 > b.x && ry < b.y + b.h + 4 && ry + hgt + 4 > b.y) return true;
          }
        }
        if (hboxes) {
          for (var j = 0; j < hboxes.length; j++) {
            var hb = hboxes[j];
            if (rx < hb.x + hb.w && rx + w > hb.x && ry < hb.y + hb.h && ry + hgt > hb.y) return true;
          }
        }
        return false;
      };
      bx = clampX(origBx); by = clampY(origBy);
      if (hits(bx, by)) {
        var found = false, radii = [20, 36, 54, 76, 102, 132];
        for (var rIdx = 0; rIdx < radii.length && !found; rIdx++) {
          var rad = radii[rIdx];
          for (var dIdx = 0; dIdx < AVOID_DIRS.length; dIdx++) {
            var cx = clampX(origBx + AVOID_DIRS[dIdx][0] * rad), cy = clampY(origBy + AVOID_DIRS[dIdx][1] * rad);
            if (!hits(cx, cy)) { bx = cx; by = cy; found = true; break; }
          }
        }
      }
      tx = x + (bx - origBx); ty = y + (by - origBy);
      if (checkCollide) boxes.push({ x: bx, y: by, w: w, h: hgt });
    }

    var ga = isFinite(c.globalAlpha) ? c.globalAlpha : 1;
    if (opt.bg && Math.hypot(bx - origBx, by - origBy) > 20) {
      c.save();
      c.strokeStyle = color || SIM.ui.colors().muted; c.lineWidth = 1; c.globalAlpha = 0.45 * ga;
      c.beginPath(); c.moveTo(x, y); c.lineTo(bx + w / 2, by + hgt / 2); c.stroke();
      c.restore();
    }
    if (opt.bg) {
      var dk = !isLightTheme();
      c.beginPath();
      if (c.roundRect) c.roundRect(bx, by, w, hgt, Math.min(9, hgt / 2)); else c.rect(bx, by, w, hgt);
      c.fillStyle = dk ? 'rgba(5, 9, 13, 0.94)' : 'rgba(255, 253, 247, 0.96)';
      c.globalAlpha = Math.max(dk ? 0.88 : 0.92, ga);
      if (dk) { c.shadowColor = 'rgba(0,0,0,0.65)'; c.shadowBlur = 8; }
      c.fill();
      c.shadowBlur = 0;
      c.strokeStyle = color || SIM.ui.colors().line; c.lineWidth = fs === 'hi' ? 1.8 : 1.3;
      c.globalAlpha = (fs === 'hi' ? 0.96 : 0.72) * ga; c.stroke();
      c.globalAlpha = ga;
    }
    c.fillStyle = color || SIM.ui.colors().ink; c.fillText(text, tx, ty);
    c.restore();
  };
  /** angle arc centred at (x,y) screen, from angle a0 to a1 (math radians, CCW positive) */
  D.arc = function (c, x, y, r, a0, a1, color, label) {
    c.save();
    c.fillStyle = color; c.globalAlpha = 0.13;
    c.beginPath(); c.moveTo(x, y); c.arc(x, y, r, -a0, -a1, a1 > a0); c.closePath(); c.fill();
    c.globalAlpha = 0.95; c.strokeStyle = color; c.lineWidth = 1.6;
    c.beginPath(); c.arc(x, y, r, -a0, -a1, a1 > a0); c.stroke();
    if (label) { var am = (a0 + a1) / 2; D.label(c, label, x + Math.cos(am) * (r + 16), y - Math.sin(am) * (r + 16), color, { size: 12, bg: true, fs: 'none' }); }
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
    if (opt.label) { c.fillStyle = col.ink; c.font = '600 13px "Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(opt.label, 0, -h / 2); }
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
    function pos(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
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
      if (e.button !== undefined && e.button !== 0) return;
      var p = pos(e), h = hit(p[0], p[1], e.pointerType === 'touch');
      if (h) { drag = { h: h, x0: p[0], y0: p[1], moved: false }; canvas.style.cursor = 'grabbing'; }
      else if (opt.canDraw && opt.canDraw(p[0], p[1])) drawing = { x0: p[0], y0: p[1], moved: false };
      else return;
      e.preventDefault(); if (canvas.setPointerCapture) try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    canvas.addEventListener('pointermove', function (e) {
      var p = pos(e);
      if (drag) { if (!drag.moved && Math.hypot(p[0] - drag.x0, p[1] - drag.y0) < TAP) return; drag.moved = true; if (opt.onDrag) opt.onDrag(drag.h, p[0], p[1], e); return; }
      if (drawing) { if (!drawing.moved && Math.hypot(p[0] - drawing.x0, p[1] - drawing.y0) < TAP) return; drawing.moved = true; if (opt.onDraw) opt.onDraw(drawing.x0, drawing.y0, p[0], p[1]); return; }
      if (e.pointerType !== 'touch') setHover(hit(p[0], p[1], false));
    });
    function end(e) {
      var p = pos(e);
      if (drag) { var d = drag; drag = null; canvas.style.cursor = hover ? 'grab' : ''; if (d.moved) { if (opt.onDrop) opt.onDrop(d.h, p[0], p[1]); } else if (opt.onTap) opt.onTap(d.h, p[0], p[1]); }
      if (drawing) { var w = drawing; drawing = null; if (w.moved && opt.onDrawEnd) opt.onDrawEnd(w.x0, w.y0, p[0], p[1]); }
    }
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', function () { drag = null; drawing = null; });
    canvas.addEventListener('pointerleave', function (e) { if (!drag && !drawing && e.pointerType !== 'touch') setHover(null); });
    return {
      isDragging: function () { return !!drag || !!drawing; },
      /** draw hover-only interactive button controls (hidden at rest, pops up smoothly on hover/drag) */
      paint: function (c) {
        var hs = (opt.handles && opt.handles()) || [], col = SIM.ui.colors(), active = drag ? drag.h.id : hover ? hover.id : null;
        if (!active) return;
        c.save();
        hs.forEach(function (h) {
          if (h.hidden || h.id !== active) return;
          var clr = h.color || col.accent, dk = !isLightTheme(), isDrag = !!(drag && drag.h.id === h.id);
          if (h.kind === 'pill') {
            var pw = h.w || 78, ph = h.h || 24, px = h.x - pw / 2, py = h.y - ph / 2, pr = Math.min(10, ph / 2);
            c.save();
            c.beginPath();
            if (c.roundRect) c.roundRect(px, py, pw, ph, pr);
            else c.rect(px, py, pw, ph);
            c.fillStyle = clr; c.globalAlpha = 0.16; c.fill();
            c.strokeStyle = clr; c.lineWidth = 1.8; c.setLineDash([]); c.globalAlpha = 0.92;
            c.shadowColor = clr; c.shadowBlur = 10; c.stroke();
            c.restore();
            return;
          }
          // circular glass button popping up on hover/drag
          var r = isDrag ? 14 : 12.5;
          c.save();
          c.beginPath(); c.arc(h.x, h.y, r + 4, 0, Math.PI * 2);
          c.fillStyle = clr; c.globalAlpha = isDrag ? 0.22 : 0.15; c.fill();
          c.beginPath(); c.arc(h.x, h.y, r, 0, Math.PI * 2);
          c.fillStyle = dk ? 'rgba(8, 14, 20, 0.94)' : 'rgba(255, 253, 247, 0.96)';
          c.globalAlpha = 1;
          c.shadowColor = clr; c.shadowBlur = isDrag ? 14 : 10; c.fill();
          c.shadowBlur = 0;
          c.strokeStyle = clr; c.lineWidth = 2; c.setLineDash([]); c.stroke();
          // clean 4-dot grip icon inside the circular button
          c.fillStyle = clr;
          [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]].forEach(function (pt) {
            c.beginPath(); c.arc(h.x + pt[0], h.y + pt[1], 1.5, 0, Math.PI * 2); c.fill();
          });
          // compact popup pill badge on hover
          var tip = isDrag ? 'Dragging…' : 'Edit / Drag';
          c.font = '700 11px "Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif';
          var tw = (c.measureText ? c.measureText(tip).width : 62) + 14, th = 22;
          var vw = c._vpW || 800, tx = Math.max(8, Math.min(vw - tw - 8, h.x - tw / 2));
          var ty = h.y - r - th - 6; if (ty < 8) ty = h.y + r + 6;
          c.beginPath();
          if (c.roundRect) c.roundRect(tx, ty, tw, th, 999); else c.rect(tx, ty, tw, th);
          c.fillStyle = dk ? 'rgba(5, 9, 13, 0.96)' : 'rgba(255, 253, 247, 0.98)'; c.fill();
          c.strokeStyle = clr; c.lineWidth = 1.4; c.stroke();
          c.fillStyle = clr; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(tip, tx + tw / 2, ty + th / 2 + 0.5);
          c.restore();
        });
        c.restore();
      }
    };
  }
  /** angle (degrees, anticlockwise from +x) of the screen vector from (x0,y0) to (x,y) */
  function screenAngle(x0, y0, x, y) { var a = Math.atan2(-(y - y0), x - x0) * 180 / Math.PI; return (a + 360) % 360; }

  SIM.view = { Viewport: Viewport, draw: D, forceScale: forceScale, interact: interact, screenAngle: screenAngle, setFocus: setFocus, setPulse: setPulse };
})(typeof self !== 'undefined' ? self : this);
