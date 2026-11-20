/* SIM.scene — real-life props drawn on a canvas (screen pixels), so a simulation looks like the situation in the question.
   Every page can switch between the "Real life" look and the clean "Diagram" look (exam-style); the choice is remembered.
   Physics drawing (force arrows, labels, dimensions) stays in SIM.view.draw; this file only draws the world.

   SIM.scene.real()                  → true when the real-life look is on (default)
   SIM.scene.onChange(fn)            → called after the look is switched (pages usually just redraw)
   Backdrops:  sky(c, x, y, w, h, {horizon})   ground(c, x1, x2, y, {kind:'grass'|'road'|'floor'|'ice'|'sand'|'table', depth, scroll})
               wall(c, x, y, w, h, {kind:'brick'|'concrete'})   cliff(c, xEdge, yTop, yBottom, side)   water(c, x, y, w, h, t)
               ramp(c, [[x,y],…], {kind:'wood'|'concrete'})     tree(c, x, yBase, h)   table(c, x1, x2, yTop, legH)
   Objects:    crate(c, x, yBase, w, h, angle, {label})  ball(c, x, y, r, {kind:'football'|'tennis'|'cricket'|'steel'|'rubber', color, spin})
               puck(c, x, y, r, color, label)            car(c, x, yBase, len, angle, {kind:'car'|'van'|'truck'|'trailer'|'caravan', color, wheel, facing})
               person(c, x, yBase, h, {pose:'stand'|'push'|'pull'|'sit', color, facing})   lift(c, x, yTop, w, h, {doors, people})
               wheel(c, x, y, r, angle)  rope(c, pts, {width})  shadow(c, x, y, rx, ry)  motionLines(c, x, y, dirX, dirY, speedPx, color)
               impact(c, x, y, size, k)  (k 0→1: a burst that fades)   dust(c, x, y, k)   rocket / cannon helpers: cannon(c, x, y, angle, len)
   All sizes are in screen pixels; `angle` is a math angle in radians (anticlockwise, y up) like SIM.view.draw.block. */
(function (root) {
  'use strict';
  var SIM = root.SIM = root.SIM || {};
  var KEY = 'sim-look', listeners = [], isReal = true;
  try { isReal = (root.localStorage && root.localStorage.getItem(KEY)) !== 'diagram'; } catch (e) { /* storage blocked */ }
  try { var q = new URLSearchParams(root.location ? root.location.search : ''); if (q.get('look') === 'diagram') isReal = false; if (q.get('look') === 'real') isReal = true; } catch (e) { /* old browser */ }

  function dark() {
    if (typeof document === 'undefined' || !document.documentElement) return false;
    var t = document.documentElement.getAttribute && document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return !!(root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function set(v) {
    isReal = !!v;
    try { root.localStorage.setItem(KEY, isReal ? 'real' : 'diagram'); } catch (e) { /* ignore */ }
    listeners.forEach(function (f) { try { f(isReal); } catch (e) { /* a page error must not stop the others */ } });
    if (SIM.ui && SIM.ui.redraw) SIM.ui.redraw();
  }
  // seeded random numbers, so textures do not flicker from frame to frame
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function lin(c, x0, y0, x1, y1, stops) { var g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); return g; }
  function rad(c, x, y, r0, x1, y1, r1, stops) { var g = c.createRadialGradient ? c.createRadialGradient(x, y, r0, x1, y1, r1) : null; if (!g) return stops[stops.length - 1][1]; stops.forEach(function (s) { g.addColorStop(s[0], s[1]); }); return g; }
  function shade(hex, k) {   // k > 0 lighter, k < 0 darker
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()); if (!m) return hex;
    var n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, t = k < 0 ? 0 : 255, p = Math.abs(k);
    r = Math.round(r + (t - r) * p); g = Math.round(g + (t - g) * p); b = Math.round(b + (t - b) * p);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  var S = {};
  S.real = function () { return isReal; };
  S.set = set;
  S.onChange = function (fn) { listeners.push(fn); };
  S.dark = dark;
  S.shade = shade;

  /* ---------------- backdrops ---------------- */
  S.sky = function (c, x, y, w, h, opt) {
    opt = opt || {}; var dk = dark(), hz = opt.horizon !== undefined ? opt.horizon : y + h;
    c.save();
    c.fillStyle = dk ? lin(c, 0, y, 0, hz, [[0, '#1d2342'], [1, '#3b3560']]) : lin(c, 0, y, 0, hz, [[0, '#bcdcf3'], [1, '#f7efe6']]);
    c.fillRect(x, y, w, Math.max(0, hz - y));
    var r = rng(opt.seed || 7);
    if (dk) {   // stars and a moon
      c.fillStyle = 'rgba(255,255,255,.8)';
      for (var i = 0; i < 40; i++) { var sx = x + r() * w, sy = y + r() * (hz - y) * 0.7; c.globalAlpha = 0.3 + 0.6 * r(); c.fillRect(sx, sy, 1.4, 1.4); }
      c.globalAlpha = 1; c.fillStyle = '#e8e6d0'; c.beginPath(); c.arc(x + w * 0.86, y + 28, 11, 0, 2 * Math.PI); c.fill();
    } else {      // sun and soft clouds
      c.fillStyle = rad(c, x + w * 0.86, y + 30, 2, x + w * 0.86, y + 30, 40, [[0, 'rgba(255,248,200,1)'], [0.35, 'rgba(255,236,150,.9)'], [1, 'rgba(255,236,150,0)']]);
      c.beginPath(); c.arc(x + w * 0.86, y + 30, 40, 0, 2 * Math.PI); c.fill();
      c.fillStyle = 'rgba(255,255,255,.7)';
      for (var k = 0; k < 3; k++) {
        var cx = x + w * (0.12 + 0.3 * k + 0.08 * r()), cy = y + 22 + 30 * r(), s = 0.7 + 0.6 * r();
        [[0, 0, 16], [16, -6, 20], [34, 0, 15], [17, 6, 16]].forEach(function (b) { c.beginPath(); c.arc(cx + b[0] * s, cy + b[1] * s, b[2] * s, 0, 2 * Math.PI); c.fill(); });
      }
    }
    c.restore();
  };
  var GROUND = {
    grass: { top: ['#a8dba0', '#8cc98a'], body: ['#e7cfa8', '#d9bb8f'], dtop: ['#4f7a5c', '#42684e'], dbody: ['#4a4038', '#3c342e'] },
    road: { top: ['#a9b1c2', '#959eb1'], body: ['#e3dccf', '#d3cabb'], dtop: ['#4a5064', '#40465a'], dbody: ['#3d3a44', '#33303a'] },
    floor: { top: ['#efc99a', '#e3b884'], body: ['#f2dfc4', '#e8d1b0'], dtop: ['#7a6450', '#6a5644'], dbody: ['#4b4038', '#3e352e'] },
    ice: { top: ['#eef8fd', '#d3ecf8'], body: ['#c5e2f1', '#b0d5ea'], dtop: ['#56758a', '#4a687c'], dbody: ['#33495a', '#2b3f4e'] },
    sand: { top: ['#f6e2b4', '#ecd39d'], body: ['#f1dcae', '#e6cc96'], dtop: ['#857356', '#73634a'], dbody: ['#4d4436', '#41392e'] },
    table: { top: ['#9fd6b4', '#86c6a0'], body: ['#e8c9a2', '#dbb78b'], dtop: ['#3f6b55', '#355c49'], dbody: ['#4a3d33', '#3d322a'] }
  };
  /** horizontal ground from x1 to x2 with its surface at screen y; scroll (px) slides road markings / grass so motion is visible */
  S.ground = function (c, x1, x2, y, opt) {
    opt = opt || {}; var kind = GROUND[opt.kind] ? opt.kind : 'grass', P = GROUND[kind], dk = dark(), depth = opt.depth || 40;
    var top = dk ? P.dtop : P.top, body = dk ? P.dbody : P.body, sc = opt.scroll || 0, w = x2 - x1;
    c.save();
    c.fillStyle = lin(c, 0, y, 0, y + depth, [[0, body[0]], [1, body[1]]]); c.fillRect(x1, y, w, depth);
    var band = kind === 'road' ? 12 : kind === 'grass' ? 7 : 5;
    c.fillStyle = lin(c, 0, y, 0, y + band, [[0, top[0]], [1, top[1]]]); c.fillRect(x1, y, w, band);
    var r = rng(11), i, off;
    if (kind === 'grass') {
      c.strokeStyle = top[0]; c.lineWidth = 1.2;
      off = ((sc % 9) + 9) % 9;
      for (i = x1 - 9 + off; i < x2; i += 4.5) { var hgt = 3 + 4 * r(); c.beginPath(); c.moveTo(i, y + 1); c.lineTo(i + (r() - 0.5) * 3, y - hgt); c.stroke(); }
      c.fillStyle = 'rgba(120,90,60,.10)'; for (i = 0; i < w / 14; i++) c.fillRect(x1 + ((i * 37 + sc) % w + w) % w, y + band + 4 + r() * (depth - band - 8), 3, 2);
    } else if (kind === 'road') {
      c.fillStyle = dk ? '#c9c3a6' : '#ffffff'; off = ((sc % 40) + 40) % 40;
      for (i = x1 - 40 + off; i < x2; i += 40) c.fillRect(i, y + band / 2 - 1, 20, 2);
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x1, y + band, w, 2);
    } else if (kind === 'floor' || kind === 'table') {
      c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1; off = ((sc % 46) + 46) % 46;
      if (kind === 'floor') for (i = x1 - 46 + off; i < x2; i += 46) { c.beginPath(); c.moveTo(i, y); c.lineTo(i, y + band); c.stroke(); }
    } else if (kind === 'ice') {
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1;
      for (i = 0; i < w / 60; i++) { var sx = x1 + ((i * 53 + sc) % w + w) % w; c.beginPath(); c.moveTo(sx, y + 2); c.lineTo(sx + 18, y + 4); c.stroke(); }
    }
    c.strokeStyle = 'rgba(60,50,80,.12)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x1, y); c.lineTo(x2, y); c.stroke();
    c.restore();
  };
  /** an inclined plane / wedge from a polygon of screen points (first edge is usually the sloping surface) */
  S.ramp = function (c, pts, opt) {
    opt = opt || {}; var dk = dark(), kind = opt.kind || 'wood';
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys), minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    c.save(); c.beginPath(); pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath();
    if (kind === 'concrete') c.fillStyle = lin(c, 0, minY, 0, maxY, dk ? [[0, '#5d6274'], [1, '#4a4e5e']] : [[0, '#e4e6ee'], [1, '#cfd3de']]);
    else c.fillStyle = lin(c, minX, minY, maxX, maxY, dk ? [[0, '#86684f'], [1, '#6b5240']] : [[0, '#f6d7ac'], [1, '#ebc28f']]);
    c.fill();
    c.clip();
    if (kind === 'wood') {   // grain parallel to the sloping face
      var a = pts[0], b = pts[1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
      if (ny < 0) { nx = -nx; ny = -ny; }
      c.strokeStyle = dk ? 'rgba(0,0,0,.12)' : 'rgba(160,110,60,.12)'; c.lineWidth = 1;
      for (var s = 6; s < (maxY - minY) + (maxX - minX); s += 7) { c.beginPath(); c.moveTo(a[0] + nx * s - ux * 2000, a[1] + ny * s - uy * 2000); c.lineTo(a[0] + nx * s + ux * 2000, a[1] + ny * s + uy * 2000); c.stroke(); }
    }
    c.restore();
    c.save(); c.strokeStyle = dk ? 'rgba(0,0,0,.25)' : 'rgba(150,100,55,.35)'; c.lineWidth = 1.2; c.beginPath(); pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath(); c.stroke(); c.restore();
  };
  S.wall = function (c, x, y, w, h, opt) {
    opt = opt || {}; var dk = dark(), brick = opt.kind !== 'concrete';
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.fillStyle = brick ? (dk ? '#6e4a48' : '#eeb4a2') : (dk ? '#55596a' : '#dfe2ea'); c.fillRect(x, y, w, h);
    if (brick) {
      c.strokeStyle = dk ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.75)'; c.lineWidth = 1.5;
      for (var row = 0, yy = y; yy < y + h; yy += 12, row++) {
        c.beginPath(); c.moveTo(x, yy); c.lineTo(x + w, yy); c.stroke();
        for (var xx = x + (row % 2 ? 12 : 0); xx < x + w; xx += 24) { c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx, yy + 12); c.stroke(); }
      }
    }
    c.restore();
    c.save(); c.strokeStyle = 'rgba(60,40,40,.15)'; c.lineWidth = 1; c.strokeRect(x, y, w, h); c.restore();
  };
  /** a cliff (or building edge) whose top surface is at yTop; side 'left' means the land is to the left of xEdge */
  S.cliff = function (c, xEdge, yTop, yBottom, side, xFar) {
    var dk = dark(), left = side !== 'right', far = xFar !== undefined ? xFar : (left ? xEdge - 2000 : xEdge + 2000);
    c.save();
    c.beginPath(); c.moveTo(far, yTop); c.lineTo(xEdge, yTop);
    var r = rng(5), steps = 8, dir = left ? 1 : -1;
    for (var i = 1; i <= steps; i++) c.lineTo(xEdge + dir * (r() * 6 - 1), yTop + (yBottom - yTop) * i / steps);
    c.lineTo(far, yBottom); c.closePath();
    c.fillStyle = lin(c, 0, yTop, 0, yBottom, dk ? [[0, '#5e5148'], [1, '#463d36']] : [[0, '#e3c8a4'], [1, '#d2b38c']]); c.fill();
    c.fillStyle = dk ? '#4f7a5c' : '#a8dba0'; c.fillRect(Math.min(far, xEdge), yTop - 1, Math.abs(xEdge - far), 6);
    c.restore();
  };
  S.water = function (c, x, y, w, h, t) {
    var dk = dark(); t = t || 0;
    c.save(); c.fillStyle = lin(c, 0, y, 0, y + h, dk ? [[0, '#34507a'], [1, '#283e60']] : [[0, '#a9d6f0'], [1, '#7fbde3']]); c.fillRect(x, y, w, h);
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.2;
    for (var row = 0; row < 3; row++) { c.beginPath(); for (var xx = x; xx <= x + w; xx += 4) { var yy = y + 3 + row * 7 + 1.5 * Math.sin(xx / 14 + t * 2 + row); if (xx === x) c.moveTo(xx, yy); else c.lineTo(xx, yy); } c.stroke(); }
    c.restore();
  };
  S.tree = function (c, x, yBase, h) {
    var dk = dark(); c.save();
    c.fillStyle = dk ? '#6b5444' : '#c89f7a'; c.fillRect(x - h * 0.05, yBase - h * 0.45, h * 0.1, h * 0.45);
    c.fillStyle = dk ? '#4a7a5e' : '#9fd39a';
    [[0, -0.62, 0.26], [-0.16, -0.5, 0.2], [0.16, -0.5, 0.2], [0, -0.8, 0.2]].forEach(function (b) { c.beginPath(); c.arc(x + b[0] * h, yBase + b[1] * h, b[2] * h, 0, 2 * Math.PI); c.fill(); });
    c.restore();
  };
  S.table = function (c, x1, x2, yTop, legH) {
    var dk = dark(), th = 8; c.save();
    c.fillStyle = dk ? '#7a614c' : '#e6bf92'; c.fillRect(x1, yTop, x2 - x1, th);
    c.fillStyle = dk ? '#634e3e' : '#d4a978'; c.fillRect(x1 + 6, yTop + th, 7, legH - th); c.fillRect(x2 - 13, yTop + th, 7, legH - th);
    c.strokeStyle = 'rgba(120,80,40,.2)'; c.strokeRect(x1, yTop, x2 - x1, th); c.restore();
  };

  /* ---------------- objects ---------------- */
  S.shadow = function (c, x, y, rx, ry) { c.save(); c.fillStyle = 'rgba(70,50,90,.12)'; c.beginPath(); if (c.ellipse) c.ellipse(x, y, Math.max(1, rx), Math.max(1, ry || rx * 0.25), 0, 0, 2 * Math.PI); c.fill(); c.restore(); };
  /** wooden crate centred on (x, yBase) with its base on the surface, rotated by math angle a */
  S.crate = function (c, x, yBase, w, h, a, opt) {
    opt = opt || {}; var dk = dark(), col = SIM.ui ? SIM.ui.colors() : {};
    c.save(); c.translate(x, yBase); c.rotate(-(a || 0));
    var base = opt.color || (dk ? '#a9825e' : '#f3c995');
    var rr = Math.min(6, w * 0.12, h * 0.12);
    c.fillStyle = 'rgba(70,50,90,.10)'; c.beginPath(); if (c.ellipse) c.ellipse(0, 1, w * 0.55, 3, 0, 0, 2 * Math.PI); c.fill();
    c.beginPath(); if (c.roundRect) c.roundRect(-w / 2, -h, w, h, rr); else c.rect(-w / 2, -h, w, h);
    c.fillStyle = lin(c, 0, -h, 0, 0, [[0, shade(base, 0.18)], [1, shade(base, -0.04)]]); c.fill();
    c.strokeStyle = shade(base, -0.28); c.lineWidth = 1.2; c.stroke();
    var b = Math.max(3, Math.min(w, h) * 0.12);   // frame boards and a cross brace
    c.strokeStyle = shade(base, -0.12); c.lineWidth = b * 0.7; c.strokeRect(-w / 2 + b / 2, -h + b / 2, w - b, h - b);
    c.lineWidth = b * 0.55; c.beginPath(); c.moveTo(-w / 2 + b, -b); c.lineTo(w / 2 - b, -h + b); c.stroke();
    c.strokeStyle = 'rgba(150,100,50,.08)'; c.lineWidth = 1; for (var gy = -h + b * 1.6; gy < -b; gy += Math.max(4, h / 6)) { c.beginPath(); c.moveTo(-w / 2 + b, gy); c.lineTo(w / 2 - b, gy); c.stroke(); }
    if (opt.label) {
      c.fillStyle = 'rgba(255,255,255,.88)'; var tw = Math.max(18, opt.label.length * 7.5 + 8); c.fillRect(-tw / 2, -h / 2 - 9, tw, 18);
      c.fillStyle = '#1a1a1a'; c.font = '700 12px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(opt.label, 0, -h / 2);
    }
    c.restore();
  };
  var BALLS = { football: '#fbfbfd', tennis: '#e3ef7e', cricket: '#e0736a', steel: '#c9d1dc', rubber: '#f2958a', golf: '#fafafa', basketball: '#f2a65e' };
  /** a shaded ball; spin (rad) turns its pattern so rolling or spinning is visible */
  S.ball = function (c, x, y, r, opt) {
    opt = opt || {}; var kind = opt.kind || 'rubber', base = opt.color || BALLS[kind] || BALLS.rubber, sp = opt.spin || 0;
    if (r < 1.5) { c.save(); c.fillStyle = base; c.beginPath(); c.arc(x, y, 1.5, 0, 2 * Math.PI); c.fill(); c.restore(); return; }
    c.save();
    c.fillStyle = rad(c, x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r, [[0, shade(base, 0.6)], [0.6, base], [1, shade(base, -0.22)]]);
    c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill();
    c.save(); c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.clip();
    c.translate(x, y); c.rotate(sp);
    if (kind === 'football') { c.fillStyle = 'rgba(70,70,95,.75)'; c.beginPath(); for (var i = 0; i < 5; i++) { var a = i * 2 * Math.PI / 5 - Math.PI / 2; c.lineTo(Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32); } c.closePath(); c.fill();
      for (var j = 0; j < 5; j++) { var b = j * 2 * Math.PI / 5 + Math.PI / 2; c.beginPath(); c.arc(Math.cos(b) * r * 0.95, Math.sin(b) * r * 0.95, r * 0.28, 0, 2 * Math.PI); c.fill(); } }
    else if (kind === 'tennis') { c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = Math.max(1, r * 0.1); c.beginPath(); c.arc(-r * 0.9, 0, r * 0.75, -1.1, 1.1); c.stroke(); c.beginPath(); c.arc(r * 0.9, 0, r * 0.75, Math.PI - 1.1, Math.PI + 1.1); c.stroke(); }
    else if (kind === 'cricket') { c.strokeStyle = 'rgba(255,240,220,.85)'; c.lineWidth = Math.max(1, r * 0.08); c.beginPath(); c.moveTo(-r * 0.12, -r); c.lineTo(-r * 0.12, r); c.moveTo(r * 0.12, -r); c.lineTo(r * 0.12, r); c.stroke(); }
    else if (kind === 'basketball') { c.strokeStyle = 'rgba(30,20,10,.7)'; c.lineWidth = Math.max(1, r * 0.07); c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.moveTo(0, -r); c.lineTo(0, r); c.stroke(); }
    else if (r > 6) { c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(r * 0.45, 0, r * 0.18, 0, 2 * Math.PI); c.fill(); }   // a mark that shows the spin
    c.restore();
    c.strokeStyle = 'rgba(60,40,80,.15)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(x - r * 0.38, y - r * 0.42, r * 0.16, 0, 2 * Math.PI); c.fill();
    c.restore();
  };
  /** an air-hockey / ice puck or billiard ball seen from above, with a number */
  S.puck = function (c, x, y, r, color, label) {
    c.save();
    c.fillStyle = 'rgba(70,50,90,.14)'; c.beginPath(); c.arc(x + r * 0.12, y + r * 0.18, r, 0, 2 * Math.PI); c.fill();
    c.fillStyle = rad(c, x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r, [[0, shade(color, 0.45)], [0.6, color], [1, shade(color, -0.35)]]);
    c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill();
    if (label && r > 9) { c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r * 0.45, 0, 2 * Math.PI); c.fill(); c.fillStyle = '#3a3550'; c.font = '700 ' + Math.round(Math.max(10, r * 0.5)) + 'px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x, y + 0.5); }
    c.strokeStyle = 'rgba(60,40,80,.18)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.stroke();
    c.restore();
  };
  /** a road wheel (tyre + hub with spokes) turned through `angle` so rolling is visible */
  S.wheel = function (c, x, y, r, angle) {
    c.save(); c.translate(x, y);
    c.fillStyle = '#4a4e63'; c.beginPath(); c.arc(0, 0, r, 0, 2 * Math.PI); c.fill();
    c.fillStyle = '#e4e7ef'; c.beginPath(); c.arc(0, 0, r * 0.58, 0, 2 * Math.PI); c.fill();
    c.rotate(-(angle || 0)); c.strokeStyle = '#a3a9ba'; c.lineWidth = Math.max(1, r * 0.12);
    for (var i = 0; i < 5; i++) { var a = i * 2 * Math.PI / 5; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55); c.stroke(); }
    c.fillStyle = '#7d8397'; c.beginPath(); c.arc(0, 0, r * 0.15, 0, 2 * Math.PI); c.fill();
    c.restore();
  };
  /**
   * a vehicle in side view: its body length is `len` px, base (bottom of the tyres) centred at (x, yBase), on a slope of math angle a.
   * opt.kind 'car' | 'van' | 'truck' (lorry cab + box) | 'trailer' | 'caravan'; opt.wheel = wheel turn angle; opt.facing = 1 (right) or −1 (left)
   * returns {front:[x,y], back:[x,y]} tow points (screen) so a tow bar / rope can be drawn between vehicles.
   */
  S.car = function (c, x, yBase, len, a, opt) {
    opt = opt || {}; var kind = opt.kind || 'car', f = opt.facing === -1 ? -1 : 1, col = opt.color || (kind === 'truck' ? '#8fb3e8' : kind === 'trailer' || kind === 'caravan' ? '#f4ede0' : '#f39a86');
    var L = len, wr = L * (kind === 'truck' ? 0.085 : kind === 'trailer' || kind === 'caravan' ? 0.09 : 0.1), H = L * (kind === 'van' ? 0.42 : kind === 'truck' ? 0.45 : kind === 'trailer' ? 0.3 : kind === 'caravan' ? 0.42 : 0.3);
    var ca = Math.cos(a || 0), sa = Math.sin(a || 0);
    c.save(); c.translate(x, yBase); c.rotate(-(a || 0)); c.scale(f, 1);
    var bodyY = -wr * 1.1;   // underside of the body
    c.fillStyle = 'rgba(70,50,90,.12)'; c.beginPath(); if (c.ellipse) c.ellipse(0, 0, L * 0.5, 3, 0, 0, 2 * Math.PI); c.fill();
    c.lineJoin = 'round';
    var body = lin(c, 0, bodyY - H, 0, bodyY, [[0, shade(col, 0.22)], [1, shade(col, -0.06)]]);
    c.fillStyle = body; c.strokeStyle = shade(col, -0.25); c.lineWidth = 1.2;
    c.beginPath();
    if (kind === 'car') {
      c.moveTo(-L / 2, bodyY); c.lineTo(-L / 2, bodyY - H * 0.55); c.lineTo(-L * 0.32, bodyY - H * 0.62); c.lineTo(-L * 0.2, bodyY - H); c.lineTo(L * 0.14, bodyY - H);
      c.lineTo(L * 0.3, bodyY - H * 0.6); c.lineTo(L / 2, bodyY - H * 0.5); c.lineTo(L / 2, bodyY); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(190,225,245,.9)'; c.beginPath(); c.moveTo(-L * 0.17, bodyY - H * 0.93); c.lineTo(-0.02 * L, bodyY - H * 0.93); c.lineTo(-0.02 * L, bodyY - H * 0.62); c.lineTo(-L * 0.28, bodyY - H * 0.62); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(0.01 * L, bodyY - H * 0.93); c.lineTo(L * 0.12, bodyY - H * 0.93); c.lineTo(L * 0.25, bodyY - H * 0.62); c.lineTo(0.01 * L, bodyY - H * 0.62); c.closePath(); c.fill();
      c.fillStyle = '#ffe9a0'; c.fillRect(L / 2 - 4, bodyY - H * 0.45, 4, H * 0.14);
      c.fillStyle = '#c0392b'; c.fillRect(-L / 2, bodyY - H * 0.48, 3, H * 0.14);
    } else if (kind === 'van') {
      c.moveTo(-L / 2, bodyY); c.lineTo(-L / 2, bodyY - H); c.lineTo(L * 0.25, bodyY - H); c.lineTo(L / 2, bodyY - H * 0.5); c.lineTo(L / 2, bodyY); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(190,225,245,.9)'; c.beginPath(); c.moveTo(L * 0.22, bodyY - H * 0.92); c.lineTo(L * 0.27, bodyY - H * 0.92); c.lineTo(L * 0.45, bodyY - H * 0.55); c.lineTo(L * 0.22, bodyY - H * 0.55); c.closePath(); c.fill();
    } else if (kind === 'truck') {
      c.rect(-L / 2, bodyY - H, L * 0.68, H); c.fill(); c.stroke();   // box
      c.fillStyle = lin(c, 0, bodyY - H * 0.8, 0, bodyY, [[0, '#f2f2f2'], [1, '#c9c9c9']]); c.beginPath(); c.moveTo(L * 0.2, bodyY); c.lineTo(L * 0.2, bodyY - H * 0.8); c.lineTo(L * 0.4, bodyY - H * 0.8); c.lineTo(L / 2, bodyY - H * 0.45); c.lineTo(L / 2, bodyY); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(190,225,245,.9)'; c.beginPath(); c.moveTo(L * 0.37, bodyY - H * 0.74); c.lineTo(L * 0.4, bodyY - H * 0.74); c.lineTo(L * 0.47, bodyY - H * 0.48); c.lineTo(L * 0.37, bodyY - H * 0.48); c.closePath(); c.fill();
    } else {   // trailer / caravan
      c.rect(-L / 2, bodyY - H, L, H); c.fill(); c.stroke();
      if (kind === 'caravan') { c.fillStyle = 'rgba(190,225,245,.9)'; c.fillRect(-L * 0.3, bodyY - H * 0.75, L * 0.22, H * 0.3); c.fillRect(L * 0.08, bodyY - H * 0.75, L * 0.22, H * 0.3); c.fillStyle = shade(col, -0.25); c.fillRect(-L / 2, bodyY - H * 0.3, L, H * 0.08); }
      else { c.strokeStyle = shade(col, -0.25); for (var s = -L / 2 + L / 6; s < L / 2; s += L / 6) { c.beginPath(); c.moveTo(s, bodyY - H); c.lineTo(s, bodyY); c.stroke(); } }
    }
    c.restore();
    // wheels (drawn unscaled so they rotate the right way for the direction of travel)
    var wx = kind === 'trailer' || kind === 'caravan' ? [0] : kind === 'truck' ? [-L * 0.32, -L * 0.15, L * 0.33] : [-L * 0.3, L * 0.3];
    var pts = wx.map(function (px) { return [x + px * f * ca, yBase - px * f * sa]; });
    pts.forEach(function (p) { S.wheel(c, p[0] - sa * wr, p[1] - ca * wr, wr, (opt.wheel || 0) * f); });
    var tow = function (px, py) { return [x + px * f * ca + py * sa, yBase - px * f * sa + py * ca]; };
    return { front: tow(L / 2, -wr * 1.4), back: tow(-L / 2, -wr * 1.4), height: H + wr * 1.1 };
  };
  /** a simple person (stick figure with a body), standing on (x, yBase), height h px */
  S.person = function (c, x, yBase, h, opt) {
    opt = opt || {}; var f = opt.facing === -1 ? -1 : 1, col = opt.color || '#8fa8e0', skin = '#f1c7a6', pose = opt.pose || 'stand';
    var lean = pose === 'push' ? 0.28 : pose === 'pull' ? -0.22 : 0;
    c.save(); c.translate(x, yBase); c.scale(f, 1); c.lineCap = 'round'; c.lineJoin = 'round';
    var hip = [lean * h * 0.15, -h * 0.47], neck = [hip[0] + lean * h * 0.45, -h * 0.82];
    c.strokeStyle = '#5d6480'; c.lineWidth = Math.max(2, h * 0.075);   // legs
    c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(hip[0] - h * 0.1 - lean * h * 0.15, 0); c.moveTo(hip[0], hip[1]); c.lineTo(hip[0] + h * 0.1 - lean * h * 0.3, 0); c.stroke();
    c.strokeStyle = col; c.lineWidth = Math.max(3, h * 0.13);   // body
    c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(neck[0], neck[1] + h * 0.04); c.stroke();
    c.strokeStyle = skin; c.lineWidth = Math.max(1.5, h * 0.05);   // arms
    var hand = pose === 'push' || pose === 'pull' ? [neck[0] + h * 0.28, neck[1] + h * 0.12] : [neck[0] + h * 0.05, hip[1] + h * 0.02];
    c.beginPath(); c.moveTo(neck[0], neck[1] + h * 0.06); c.lineTo(hand[0], hand[1]); c.stroke();
    c.fillStyle = skin; c.beginPath(); c.arc(neck[0] + h * 0.01, neck[1] - h * 0.07, h * 0.08, 0, 2 * Math.PI); c.fill();
    c.fillStyle = '#7a5a48'; c.beginPath(); c.arc(neck[0], neck[1] - h * 0.1, h * 0.075, Math.PI, 2 * Math.PI); c.fill();
    c.restore();
    return { hand: [x + f * hand[0], yBase + hand[1]] };
  };
  /** a lift car with its cable; (x, yTop) is the top centre of the car */
  S.lift = function (c, x, yTop, w, h, opt) {
    opt = opt || {}; var dk = dark();
    c.save();
    c.strokeStyle = dk ? '#8c93a8' : '#9aa1b5'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, opt.cableTop !== undefined ? opt.cableTop : yTop - 2000); c.lineTo(x, yTop); c.stroke();
    c.fillStyle = lin(c, x - w / 2, 0, x + w / 2, 0, dk ? [[0, '#5d6378'], [0.5, '#737a90'], [1, '#575d72']] : [[0, '#dfe3ee'], [0.5, '#f4f6fa'], [1, '#d6dbe7']]);
    c.fillRect(x - w / 2, yTop, w, h);
    c.strokeStyle = dk ? '#41465a' : '#b3b9c9'; c.lineWidth = 1.5; c.strokeRect(x - w / 2, yTop, w, h);
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, yTop + h * 0.08); c.lineTo(x, yTop + h); c.stroke();   // door split
    c.fillStyle = dk ? '#41465a' : '#c5cad8'; c.fillRect(x - w / 2, yTop, w, h * 0.06);
    c.restore();
    if (opt.people) S.person(c, x - w * 0.12, yTop + h - 2, h * 0.72, { color: '#f2a08e' });
  };
  /** a pulley wheel with spokes, turned through `angle` (rad) so the string visibly runs over it */
  S.pulley = function (c, x, y, r, angle) {
    c.save(); c.translate(x, y);
    c.fillStyle = rad(c, -r * 0.3, -r * 0.3, 1, 0, 0, r, [[0, '#ffffff'], [1, '#c7cddb']]); c.beginPath(); c.arc(0, 0, r, 0, 2 * Math.PI); c.fill();
    c.strokeStyle = '#8a91a6'; c.lineWidth = Math.max(1.5, r * 0.12); c.beginPath(); c.arc(0, 0, r - c.lineWidth / 2, 0, 2 * Math.PI); c.stroke();
    c.rotate(-(angle || 0)); c.lineWidth = Math.max(1, r * 0.1);
    for (var i = 0; i < 3; i++) { var a = i * Math.PI / 3; c.beginPath(); c.moveTo(-Math.cos(a) * r * 0.8, -Math.sin(a) * r * 0.8); c.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); c.stroke(); }
    c.fillStyle = '#6f7690'; c.beginPath(); c.arc(0, 0, Math.max(2, r * 0.18), 0, 2 * Math.PI); c.fill();
    c.restore();
  };
  /** a rope / string along screen points: a darker core with a light twist pattern */
  S.rope = function (c, pts, opt) {
    opt = opt || {}; var w = opt.width || 2.6, dk = dark();
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = opt.color || (dk ? '#d8c3a0' : '#c59c6c'); c.lineWidth = w;
    c.beginPath(); pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = Math.max(0.8, w * 0.35); c.setLineDash([3, 3]);
    c.beginPath(); pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.stroke();
    c.restore();
  };
  /** speed streaks trailing behind a moving object: (dirX, dirY) is the screen direction of motion */
  S.motionLines = function (c, x, y, dirX, dirY, speedPx, color, size) {
    var L = Math.hypot(dirX, dirY); if (L < 1e-9 || speedPx < 4) return;
    var ux = dirX / L, uy = dirY / L, nx = -uy, ny = ux, len = Math.min(60, speedPx), s = size || 12;
    c.save(); c.strokeStyle = color || 'rgba(120,120,120,.6)'; c.lineCap = 'round';
    [-1, 0, 1].forEach(function (k, i) { c.globalAlpha = 0.25 + 0.2 * (1 - Math.abs(k)); c.lineWidth = 2 - Math.abs(k) * 0.6;
      var ox = x - ux * (s + 4) + nx * k * s * 0.6, oy = y - uy * (s + 4) + ny * k * s * 0.6;
      c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox - ux * len * (0.6 + 0.2 * i), oy - uy * len * (0.6 + 0.2 * i)); c.stroke(); });
    c.restore();
  };
  /** a burst at an impact; k goes 0 → 1 over the burst (draw nothing when k is outside [0, 1]) */
  S.impact = function (c, x, y, size, k) {
    if (!(k >= 0 && k <= 1)) return;
    var r = size * (0.4 + 0.9 * k);
    c.save(); c.globalAlpha = 1 - k; c.strokeStyle = '#ffc56b'; c.lineWidth = 2.5; c.lineCap = 'round';
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4 + 0.3; c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.stroke(); }
    c.fillStyle = 'rgba(255,240,180,.8)'; c.beginPath(); c.arc(x, y, r * 0.3 * (1 - k), 0, 2 * Math.PI); c.fill();
    c.restore();
  };
  /** a little puff of dust (landing, skidding); k 0 → 1 */
  S.dust = function (c, x, y, k) {
    if (!(k >= 0 && k <= 1)) return;
    c.save(); c.globalAlpha = 0.5 * (1 - k); c.fillStyle = dark() ? '#8c8270' : '#c2b49a';
    [[-1, 0.6], [-0.5, 1], [0, 1.2], [0.5, 1], [1, 0.6]].forEach(function (p) { c.beginPath(); c.arc(x + p[0] * 14 * (0.5 + k), y - 4 - p[1] * 8 * k, 4 + 5 * k, 0, 2 * Math.PI); c.fill(); });
    c.restore();
  };
  /** a small cannon / launcher at (x, y) pointing at math angle a, barrel length len px */
  S.cannon = function (c, x, y, a, len) {
    c.save(); c.translate(x, y); c.rotate(-a);
    c.fillStyle = lin(c, 0, -len * 0.14, 0, len * 0.14, [[0, '#9aa1b5'], [0.5, '#c9cede'], [1, '#848ba1']]);
    c.fillRect(-len * 0.15, -len * 0.12, len, len * 0.24); c.strokeStyle = 'rgba(70,70,100,.35)'; c.strokeRect(-len * 0.15, -len * 0.12, len, len * 0.24);
    c.restore();
    c.save(); c.fillStyle = '#c89f7a'; c.beginPath(); c.arc(x, y + len * 0.1, len * 0.2, 0, 2 * Math.PI); c.fill(); c.restore();
  };

  /* ---------------- the "Real life / Diagram" switch on the stage ---------------- */
  /** called by SIM.ui.canvas for the main stage: a small segmented switch in the stage corner */
  S.mountSwitch = function (stageEl) {
    if (!SIM.ui || !SIM.ui.h || !stageEl) return;
    var h = SIM.ui.h;
    var bReal = h('button', { type: 'button', text: 'Real life', 'aria-pressed': String(isReal) }), bDia = h('button', { type: 'button', text: 'Diagram', 'aria-pressed': String(!isReal) });
    var box = h('div', { class: 'look-switch', role: 'group', 'aria-label': 'How the scene is drawn' }, [bReal, bDia]);
    function sync() { bReal.setAttribute('aria-pressed', String(isReal)); bDia.setAttribute('aria-pressed', String(!isReal)); }
    bReal.addEventListener('click', function () { set(true); sync(); });
    bDia.addEventListener('click', function () { set(false); sync(); });
    S.onChange(sync);
    stageEl.appendChild(box);
  };

  SIM.scene = S;
})(typeof self !== 'undefined' ? self : this);
