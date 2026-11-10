// stage3d.js: a 3D layer for stage.js films. One WebGL particle system (30,000 points by default) drawn under every
// scene, plus an orbit camera and helpers for 2D labels that follow 3D points. It needs three.js (video/three.min.js)
// and stage.js, loaded before it. API and method: the skill's references/stage3d.md. Worked example: assets/demo/one-sitting.
//
// Like everything in stage.js it is a pure function of time: G3.render(t) draws frame t from scratch, in any order.
//
//   G3.init(film, opts)             the first line of the film. opts: points (30000), captionLift (px the picture rises
//                                   in the captioned cut, so nothing sits in the caption strip; 0 = off)
//   G3.form(name, build)            register a shape for the points. build(f, N) fills f.pos (x,y,z per point, world
//                                   units), f.col (r,g,b 0..1) and f.size (1 = normal). It runs once, the first time
//                                   the form is drawn. It may return update(tl, f) to move the points with local time
//                                   tl (seconds since the form's morph began): then the form is alive.
//   G3.morph(t, name, opts)         from time t the points fly to that form. opts: dur (1.6), at [x,y,z], scale,
//                                   rx, ry (tilt, radians), spin (radians a second about y), swirl (0.6: how much
//                                   the flight curves), stagger (0.45: how spread out the departures are),
//                                   bloom (0.5: how much points swell in mid-flight; 0 for a small step),
//                                   clock: t => local time for a live form (default t - the morph's time).
//                                   Returns the segment; seg.world([x,y,z], t) places a form point in the world.
//                                   A morph that starts before the last one has landed takes the points from where
//                                   they are in mid-flight.
//   G3.cam.to(t, {az, el, dist, look:[x,y,z], fov}, {dur, ease})   orbit camera: az and el are angles in radians
//                                   around `look`, dist the distance. Rest pose: az 0, el 0, dist 34, look 0,0,0,
//                                   fov 40: the frame then shows 44 x 24.7 world units at the origin, 43.6 px a unit.
//                                   In a vertical cut (1080 x 1920) the rest dist is 76: 31 x 55 units, 34.9 px a unit.
//   G3.level.to(t, v, {dur})        brightness of all points (1 = full, 0.3 = behind a panel)
//   G3.grain.to(t, v, {dur})        size of all points (1 = normal)
//   G3.project([x,y,z], t)          -> { x, y, z, ok }: where a world point is on the 1920 x 1080 frame at time t
//   G3.pxPerUnit([x,y,z], t)        pixels per world unit at that point
//   G3.overlay(scene, (ctx, t) => ..)   a 2D canvas over the points, in a stage.js scene, for labels that follow 3D
//   G3.text3(ctx, t, "label", [x,y,z], {size, color, dx, dy, align, alpha, font, weight, halo})
//   G3.line3(ctx, t, a, b, {color, lw, alpha, draw, dash, head})   a 2D line between two world points (draw 0..1 grows it)
//   G3.dot3(ctx, t, p, {color, r, alpha, ring, lw})
//   G3.add(obj, from, to, fn)       add a THREE object to the world, visible from..to; fn(t, k) runs each frame
//                                   while it is visible (k: 0..1 fade in and out over 0.4 s)
//   G3.onFrame(fn)                  fn(t) before every frame is drawn
//   G3.textForm(text, opts)         -> build function: the points spell the text. opts: width (world units), font
//                                   ("display" | "text" | "mono"), weight, depth, lineGap, align, color
//   G3.lib                          ready-made forms from video/forms3d/*.js: G3.form("name", G3.lib.lorenz({ .. }))
//   G3.rgb("blue"), G3.css("blue")  a look colour (or any CSS colour) as [r, g, b] or as a CSS string
//   G3.tint(f, i, "blue", k)        colour point i of a form (k scales the brightness)
//   G3.hash(i, salt)                0..1, the same every time: the only randomness allowed
//   G3.fade(t, a, b, d)             0..1: rises over d after a, falls over d before b
//   G3.ease(u), G3.clamp, G3.lerp, G3.smooth(a, b, x)
//   Built-in forms: "globe" (a turning ringed globe, the resting state; also registered as "sphere"),
//   "scatter" (a wide drifting cloud), "core" (all points in one small ball).
(function () {
  // the frame is the film's own: 1920 x 1080, or 1080 x 1920 in a vertical cut (film-9x16.html sets STAGE_FORMAT before stage.js)
  const W = (window.Stage && Stage.W) || 1920, H = (window.Stage && Stage.H) || 1080, PORT = H > W, T3 = window.THREE;
  const G3 = (window.G3 = { N: 30000, W, H, lift: 0, on: false, lib: {} });
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), lerp = (a, b, u) => a + (b - a) * u;
  const ease = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  const hash = (i, s = 0) => { let x = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(s + 7, 0x85ebca6b); x ^= x >>> 15; x = Math.imul(x, 0x2c1b3c6d); x ^= x >>> 12; x = Math.imul(x, 0x297a2d39); x ^= x >>> 15; return (x >>> 0) / 4294967296; };
  const fade = (t, a, b, d = 0.4) => clamp(Math.min((t - a) / d, (b - t) / d));
  Object.assign(G3, { clamp, lerp, ease, smooth, hash, fade });

  let N = G3.N, film, renderer, scene, camera, probeCam, points, geo, mat, stageEl, DIR, HSH;
  const forms = {}, segs = [], hooks = [], extras = [], pool = [];
  const buf = () => ({ pos: new Float32Array(N * 3), col: new Float32Array(N * 3), size: new Float32Array(N) });

  // ---- colours of the look
  const rgbCache = {};
  G3.rgb = c => {
    if (rgbCache[c]) return rgbCache[c];
    const el = document.createElement("i"); el.style.color = /^[a-z]+$/.test(c) && getComputedStyle(stageEl).getPropertyValue("--" + c).trim() ? `var(--${c})` : c;
    stageEl.appendChild(el); const m = getComputedStyle(el).color.match(/[\d.]+/g).map(Number); el.remove();
    return (rgbCache[c] = [m[0] / 255, m[1] / 255, m[2] / 255]);
  };
  G3.css = c => { const [r, g, b] = G3.rgb(c); return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`; };
  G3.font = (px, kind = "text", weight) => { const cs = getComputedStyle(stageEl); const fam = cs.getPropertyValue("--" + kind).trim();
    const w = weight || (kind === "display" ? cs.getPropertyValue("--display-weight").trim() : kind === "mono" ? 400 : cs.getPropertyValue("--text-weight").trim()) || 400; return `${w} ${px}px ${fam}`; };
  G3.tint = (f, i, c, k = 1) => { const q = typeof c === "string" ? G3.rgb(c) : c; f.col[i * 3] = q[0] * k; f.col[i * 3 + 1] = q[1] * k; f.col[i * 3 + 2] = q[2] * k; };

  // ---- forms
  G3.form = (name, build) => { forms[name] = { name, build, f: null, update: null }; };
  function getForm(name) {
    let F = forms[name];
    if (!F) { film.problem(`G3: no form called "${name}"`); F = forms.globe; }
    if (!F.f) {
      const f = { pos: new Float32Array(N * 3), col: new Float32Array(N * 3), size: new Float32Array(N).fill(1) };
      const ink = G3.rgb("ink"), blue = G3.rgb("blue"), warm = G3.rgb("accent");            // the default dress: cool white to blue, with one point in twelve warm
      for (let i = 0; i < N; i++) { const k = hash(i, 3), b = 0.5 + 0.5 * hash(i, 4), w = hash(i, 5) < 0.085 ? 1 : 0; const c0 = w ? warm : ink, c1 = w ? warm : blue;
        f.col[i * 3] = lerp(c0[0], c1[0], k) * b; f.col[i * 3 + 1] = lerp(c0[1], c1[1], k) * b; f.col[i * 3 + 2] = lerp(c0[2], c1[2], k) * b; }
      F.f = f;
      try { const u = F.build(f, N); F.update = typeof u === "function" ? u : null; } catch (e) { film.problem(`G3: form "${name}" threw: ${e.message}`); console.error(e); }
    }
    return F;
  }
  G3.morph = (t, name, o = {}) => {
    if (typeof t !== "number" || !isFinite(t)) film.problem(`G3.morph("${name}"): the first argument must be a time in seconds`);
    const seg = { t, name, dur: o.dur ?? 1.6, at: o.at || [0, 0, 0], scale: o.scale ?? 1, rx: o.rx || 0, ry: o.ry || 0, spin: o.spin || 0, swirl: o.swirl ?? 0.6, stagger: o.stagger ?? 0.45, bloom: o.bloom ?? 0.5, clock: o.clock || null };
    seg.local = tt => (seg.clock ? seg.clock(tt) : tt - seg.t);
    seg.world = (p, tt) => { const ry = seg.ry + seg.spin * (tt - seg.t), cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(seg.rx), sx = Math.sin(seg.rx);
      const x = p[0] * seg.scale, y = p[1] * seg.scale, z = p[2] * seg.scale, x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
      return [x1 + seg.at[0], y * cx - z1 * sx + seg.at[1], y * sx + z1 * cx + seg.at[2]]; };
    segs.push(seg); segs.sort((a, b) => a.t - b.t); film.values.push({ keys: [{ t }], at: () => 0 });   // a morph is a beat on the contact sheets
    return seg;
  };
  function evalSeg(seg, t, out) {
    const F = getForm(seg.name), f = F.f;
    if (F.update) { try { F.update(seg.local(t), f); } catch (e) { film.problem(`G3: form "${seg.name}" update threw: ${e.message}`); } }
    const ry = seg.ry + seg.spin * (t - seg.t), cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(seg.rx), sx = Math.sin(seg.rx), s = seg.scale, [ax, ay, az] = seg.at;
    const plain = !ry && !seg.rx, P = f.pos, O = out.pos;
    for (let i = 0, j = 0; i < N; i++, j += 3) {
      const x = P[j] * s, y = P[j + 1] * s, z = P[j + 2] * s;
      if (plain) { O[j] = x + ax; O[j + 1] = y + ay; O[j + 2] = z + az; }
      else { const x1 = x * cy + z * sy, z1 = -x * sy + z * cy; O[j] = x1 + ax; O[j + 1] = y * cx - z1 * sx + ay; O[j + 2] = y * sx + z1 * cx + az; }
    }
    out.col.set(f.col); out.size.set(f.size);
  }
  // where every point is at time t, given that segment k is the latest to have started. If segment k is still in
  // flight, the points come from wherever segment k - 1 had them, which may itself be mid-flight (to a depth of 3).
  function state(k, t, out, depth) {
    const seg = segs[k], u = seg.dur > 0 ? (t - seg.t) / seg.dur : 1;
    if (k === 0 || u >= 1 || depth >= 3) { evalSeg(seg, Math.max(t, seg.t), out); return; }
    const sc = pool[depth] || (pool[depth] = { a: buf(), b: buf() }), A = sc.a, B = sc.b;
    state(k - 1, t, A, depth + 1); evalSeg(seg, t, B);
    const st = seg.stagger, sw = seg.swirl * 0.28, P = out.pos, C = out.col, S = out.size;
    for (let i = 0, j = 0; i < N; i++, j += 3) {
      const e = ease(clamp(u * (1 + st) - st * HSH[i])), dx = B.pos[j] - A.pos[j], dy = B.pos[j + 1] - A.pos[j + 1], dz = B.pos[j + 2] - A.pos[j + 2];
      const arc = Math.sin(Math.PI * e) * sw * Math.sqrt(dx * dx + dy * dy + dz * dz);
      P[j] = A.pos[j] + dx * e + DIR[j] * arc; P[j + 1] = A.pos[j + 1] + dy * e + DIR[j + 1] * arc; P[j + 2] = A.pos[j + 2] + dz * e + DIR[j + 2] * arc;
      C[j] = lerp(A.col[j], B.col[j], e); C[j + 1] = lerp(A.col[j + 1], B.col[j + 1], e); C[j + 2] = lerp(A.col[j + 2], B.col[j + 2], e);
      S[i] = lerp(A.size[i], B.size[i], e) * (1 + seg.bloom * Math.sin(Math.PI * e));
    }
  }

  // ---- camera
  // the rest pose shows a form 30 units wide in either frame: 44 x 24.7 world units at dist 34 (wide), 31 x 55 at dist 76 (tall)
  const camDefaults = { az: 0, el: 0, dist: PORT ? 76 : 34, lx: 0, ly: 0, lz: 0, fov: 40 };
  function camState(t) { const s = {}; for (const k in camDefaults) s[k] = G3.camTracks[k].at(t); return s; }
  function setCam(cam, s) {
    const ce = Math.cos(s.el);
    cam.position.set(s.lx + s.dist * Math.sin(s.az) * ce, s.ly + s.dist * Math.sin(s.el), s.lz + s.dist * Math.cos(s.az) * ce);
    cam.fov = s.fov; cam.up.set(0, 1, 0); cam.lookAt(s.lx, s.ly, s.lz);
    if (G3.lift) cam.setViewOffset(W, H, 0, G3.lift, W, H); else cam.updateProjectionMatrix();          // the captioned cut raises the picture to clear the caption strip
    cam.updateMatrixWorld(true);
  }
  G3.cam = {
    to(t, p, o = {}) {
      if (typeof t !== "number" || !isFinite(t)) film.problem("G3.cam.to(): the first argument must be a time in seconds");
      const q = { ...p }; if (p.look) { q.lx = p.look[0]; q.ly = p.look[1]; q.lz = p.look[2]; }
      for (const k in camDefaults) if (q[k] != null) G3.camTracks[k].to(t, q[k], { dur: o.dur ?? 2, ease: o.ease || "inOut" });
      return G3.cam;
    },
    at: t => camState(t),
  };
  let V;
  G3.project = (p, t) => { setCam(probeCam, camState(t)); V.set(p[0], p[1], p[2]).project(probeCam); return { x: (V.x * 0.5 + 0.5) * W, y: (-V.y * 0.5 + 0.5) * H, z: V.z, ok: V.z > -1 && V.z < 1 }; };
  G3.pxPerUnit = (p, t) => { const s = camState(t); setCam(probeCam, s); V.set(p[0], p[1], p[2]).applyMatrix4(probeCam.matrixWorldInverse); return H / (2 * Math.tan(s.fov * Math.PI / 360) * Math.max(0.01, -V.z)); };

  // ---- 2D overlay helpers
  G3.overlay = (sc, draw, o = {}) => sc.canvas((ctx, t) => { ctx.save(); draw(ctx, t); ctx.restore(); }, { overlap: true, id: o.id || "overlay3d", ...o });
  G3.text3 = (ctx, t, str, p, o = {}) => {
    const q = Array.isArray(p) ? G3.project(p, t) : p; if (q.ok === false || (o.alpha ?? 1) <= 0.003) return q;
    ctx.save(); ctx.globalAlpha = clamp(o.alpha ?? 1); ctx.font = G3.font(o.size || 30, o.font || "text", o.weight); ctx.textAlign = o.align || "center"; ctx.textBaseline = o.baseline || "middle";
    const x = q.x + (o.dx || 0), y = q.y + (o.dy ?? -26);
    if (o.halo !== false) { ctx.lineWidth = o.haloWidth || 8; ctx.lineJoin = "round"; ctx.strokeStyle = G3.css("bg"); ctx.strokeText(str, x, y); }
    ctx.fillStyle = G3.css(o.color || "ink"); ctx.fillText(str, x, y); ctx.restore(); return q;
  };
  G3.line3 = (ctx, t, a, b, o = {}) => {
    const p = Array.isArray(a) ? G3.project(a, t) : a, q = Array.isArray(b) ? G3.project(b, t) : b, d = clamp(o.draw ?? 1); if (d <= 0 || (o.alpha ?? 1) <= 0.003) return;
    const x2 = lerp(p.x, q.x, d), y2 = lerp(p.y, q.y, d);
    ctx.save(); ctx.globalAlpha = clamp(o.alpha ?? 1); ctx.strokeStyle = ctx.fillStyle = G3.css(o.color || "ink"); ctx.lineWidth = o.lw || 3; ctx.lineCap = "round"; if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(x2, y2); ctx.stroke();
    if (o.head && d > 0.15) { const an = Math.atan2(q.y - p.y, q.x - p.x), h = o.head === true ? 16 : o.head; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - h * Math.cos(an - 0.42), y2 - h * Math.sin(an - 0.42)); ctx.lineTo(x2 - h * Math.cos(an + 0.42), y2 - h * Math.sin(an + 0.42)); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  };
  G3.dot3 = (ctx, t, p, o = {}) => { const q = Array.isArray(p) ? G3.project(p, t) : p; if (q.ok === false || (o.alpha ?? 1) <= 0.003) return q; ctx.save(); ctx.globalAlpha = clamp(o.alpha ?? 1);
    if (o.ring) { ctx.strokeStyle = G3.css(o.color || "accent"); ctx.lineWidth = o.lw || 3; ctx.beginPath(); ctx.arc(q.x, q.y, o.r || 12, 0, 6.2832); ctx.stroke(); }
    else { ctx.fillStyle = G3.css(o.color || "accent"); ctx.beginPath(); ctx.arc(q.x, q.y, o.r || 7, 0, 6.2832); ctx.fill(); } ctx.restore(); return q; };

  // ---- extra THREE objects and per-frame hooks
  G3.onFrame = fn => hooks.push(fn);
  G3.add = (obj, from, to, fn) => { obj.visible = false; scene.add(obj); extras.push({ obj, from, to, fn }); return obj; };

  // ---- the points spell a text
  G3.textForm = (text, o = {}) => (f, n) => {
    const lines = String(text).split("\n"), px = 220, cw = 4096, lh = px * (o.lineGap || 1.12), ch = Math.ceil(lh * lines.length + px * 0.5);
    const c = document.createElement("canvas"); c.width = cw; c.height = ch; const x = c.getContext("2d", { willReadFrequently: true });
    x.font = G3.font(px, o.font || "display", o.weight); x.textBaseline = "alphabetic"; x.fillStyle = "#fff";
    const wmax = Math.max(...lines.map(l => x.measureText(l).width)), k = Math.min(1, (cw - 40) / wmax);
    if (k < 1) x.font = G3.font(px * k, o.font || "display", o.weight);
    const ws = lines.map(l => x.measureText(l).width), wm = Math.max(...ws), al = o.align || "center";
    lines.forEach((l, i) => x.fillText(l, 20 + (al === "center" ? (wm - ws[i]) / 2 : al === "right" ? wm - ws[i] : 0), (px * 0.95 + i * lh) * k));
    const d = x.getImageData(0, 0, cw, ch).data, px2 = [];
    let y0 = ch, y1 = 0;
    for (let yy = 0; yy < ch; yy += 2) for (let xx = 0; xx < cw; xx += 2) if (d[(yy * cw + xx) * 4 + 3] > 110) { px2.push(xx, yy); if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    const cnt = px2.length / 2, width = o.width || 30, s = width / wm, cx = 20 + wm / 2, cy = (y0 + y1) / 2, depth = o.depth ?? 0.5;
    if (!cnt) { film.problem(`G3.textForm("${text}"): nothing to draw`); return; }
    for (let i = 0; i < n; i++) {
      const q = Math.min(cnt - 1, Math.floor((i + hash(i, 21)) / n * cnt)) * 2;
      f.pos[i * 3] = (px2[q] + hash(i, 22) * 2 - cx) * s; f.pos[i * 3 + 1] = -(px2[q + 1] + hash(i, 23) * 2 - cy) * s; f.pos[i * 3 + 2] = (hash(i, 24) - 0.5) * depth;
      f.size[i] = 0.75 + 0.5 * hash(i, 25);
    }
    if (o.color) for (let i = 0; i < n; i++) G3.tint(f, i, o.color, 0.6 + 0.4 * hash(i, 26));
  };

  // ---- start: G3.init(film) is the first line of the film
  G3.init = (f, o = {}) => {
    if (!T3) { f.problem("stage3d.js needs three.js: load video/three.min.js before it"); return; }
    film = f; stageEl = document.getElementById("stage"); N = G3.N = o.points || 30000; V = new T3.Vector3();
    DIR = new Float32Array(N * 3); HSH = new Float32Array(N);
    for (let i = 0; i < N; i++) { const z = hash(i, 11) * 2 - 1, a = hash(i, 12) * 6.2832, r = Math.sqrt(1 - z * z); DIR[i * 3] = r * Math.cos(a); DIR[i * 3 + 1] = r * Math.sin(a); DIR[i * 3 + 2] = z; HSH[i] = hash(i, 13); }
    G3.DIR = DIR;                                                                            // a fixed unit vector per point, for forms that need one
    const bgc0 = G3.rgb("bg"); if (0.2126 * bgc0[0] + 0.7152 * bgc0[1] + 0.0722 * bgc0[2] > 0.25) film.problem("stage3d: the points are additive light and need a dark look (night, slate or chalk)");
    // the captioned cut (?captions=1, tools/render.mjs --captions): the 3D camera and the 2D scenes rise together, so
    // labels stay on their points and nothing sits in the caption strip. The main cut is untouched.
    if (o.captionLift && new URLSearchParams(location.search).get("captions") === "1") { G3.lift = o.captionLift; film.scenesEl.style.transform = `translateY(${-o.captionLift}px)`; }
    G3.camTracks = {}; for (const k in camDefaults) G3.camTracks[k] = film.value(camDefaults[k]);
    G3.level = film.value(1); G3.grain = film.value(1);
    renderer = new T3.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(1); renderer.setSize(W, H, false);
    scene = new T3.Scene(); camera = new T3.PerspectiveCamera(40, W / H, 0.1, 600); probeCam = new T3.PerspectiveCamera(40, W / H, 0.1, 600);
    // the ground: the look's background with a soft lift behind the picture (drawn once; seeded noise keeps the ramp
    // from banding in H.264)
    const bw = Math.round(W / 2), bh = Math.round(H / 2), bgc = document.createElement("canvas"); bgc.width = bw; bgc.height = bh; const bx = bgc.getContext("2d");
    const [br, bg, bb] = bgc0.map(v => Math.round(v * 255)); bx.fillStyle = `rgb(${br},${bg},${bb})`; bx.fillRect(0, 0, bw, bh);
    const bl = G3.rgb("blue"), pu = G3.rgb("purple"), gl = bgc0.map((v, i) => Math.round(lerp(v, (bl[i] + pu[i]) / 2, i === 2 ? 0.3 : 0.2) * 255));
    const gr = bx.createRadialGradient(bw / 2, bh * 0.46, 0, bw / 2, bh * 0.46, Math.max(bw, bh) * 0.58); gr.addColorStop(0, `rgba(${gl[0]},${gl[1]},${gl[2]},0.55)`); gr.addColorStop(0.55, `rgba(${gl[0]},${gl[1]},${gl[2]},0.2)`); gr.addColorStop(1, `rgba(${gl[0]},${gl[1]},${gl[2]},0)`);
    bx.fillStyle = gr; bx.fillRect(0, 0, bw, bh);
    const img = bx.getImageData(0, 0, bw, bh), dd = img.data;
    for (let i = 0; i < dd.length; i += 4) { const nz = (hash(i >> 2, 31) - 0.5) * 3; dd[i] += nz; dd[i + 1] += nz; dd[i + 2] += nz; }
    bx.putImageData(img, 0, 0);
    const bgt = new T3.CanvasTexture(bgc); bgt.colorSpace = T3.SRGBColorSpace; scene.background = bgt;
    geo = new T3.BufferGeometry();
    geo.setAttribute("position", new T3.BufferAttribute(new Float32Array(N * 3), 3));
    geo.setAttribute("color", new T3.BufferAttribute(new Float32Array(N * 3), 3));
    geo.setAttribute("size", new T3.BufferAttribute(new Float32Array(N), 1));
    geo.boundingSphere = new T3.Sphere(new T3.Vector3(), 1e6);
    mat = new T3.ShaderMaterial({
      uniforms: { uScale: { value: 1 }, uLevel: { value: 1 }, uSize: { value: 0.1 }, uDist: { value: 34 } },
      // near points are a little brighter and far ones dimmer (depth without fog); a point under 1.6 px keeps its
      // light but not its size, so distant points do not sparkle
      vertexShader: `attribute float size; attribute vec3 color; uniform float uScale, uLevel, uSize, uDist; varying vec3 vC; varying float vA;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; float d = max(0.05, -mv.z);
          float px = size * uSize * uScale / d; float a = uLevel * mix(1.0, 0.16, smoothstep(uDist - 7.0, uDist + 11.0, d)) * mix(1.0, 1.25, smoothstep(uDist - 3.0, uDist - 10.0, d));
          if (px < 1.6) { a *= (px * px) / 2.56; px = 1.6; } if (px > 90.0) { a *= 90.0 / px; px = 90.0; }
          gl_PointSize = px; vC = color; vA = a; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main() { float r = length(gl_PointCoord - 0.5) * 2.0; float a = exp(-r * r * 4.2) * (1.0 - smoothstep(0.82, 1.0, r)); gl_FragColor = vec4(vC, a * vA * 0.62); }`,
      transparent: true, depthTest: false, depthWrite: false, blending: T3.AdditiveBlending,
    });
    points = new T3.Points(geo, mat); points.frustumCulled = false; scene.add(points);
    G3.scene = scene; G3.renderer = renderer; G3.camera = camera; G3.THREE = T3; G3.on = true;

    // ---- the forms every film may use
    const globe = (fm, n) => {                                                 // the resting state: a turning globe of points with a tilted ring
      const base = new Float32Array(n * 3), nShell = Math.floor(n * 0.8), tilt = 0.42, ct = Math.cos(tilt), st = Math.sin(tilt);
      for (let i = 0; i < n; i++) { const j = i * 3;
        if (i < nShell) { const y = 1 - 2 * (i + 0.5) / nShell, r = Math.sqrt(1 - y * y), a = i * 2.39996323, band = 1 + 0.045 * Math.sin(y * 14), sh = 6.6 * band + 0.25 * (hash(i, 41) - 0.5);
          base[j] = Math.cos(a) * r * sh; base[j + 1] = y * sh; base[j + 2] = Math.sin(a) * r * sh; fm.size[i] = 0.6 + 0.6 * hash(i, 43) + (hash(i, 45) > 0.975 ? 1.5 : 0); }
        else { const a = hash(i, 46) * 6.2832, rr = 9.2 + 3.4 * Math.pow(hash(i, 47), 0.8) + (hash(i, 48) < 0.3 ? 0.9 : 0), x = Math.cos(a) * rr, z = Math.sin(a) * rr, y = (hash(i, 49) - 0.5) * 0.12;
          base[j] = x; base[j + 1] = y * ct - z * st; base[j + 2] = y * st + z * ct; fm.size[i] = 0.5 + 0.5 * hash(i, 43); fm.col[j] *= 0.8; fm.col[j + 1] *= 0.8; fm.col[j + 2] *= 0.8; } }
      return tl => { const c = Math.cos(tl * 0.14), s = Math.sin(tl * 0.14);
        for (let i = 0, j = 0; i < n; i++, j += 3) { const w = i < nShell ? 1 + 0.02 * Math.sin(tl * 0.9 + base[j + 1] * 0.8) : 1; const x = base[j] * w, z = base[j + 2] * w;
          fm.pos[j] = x * c + z * s; fm.pos[j + 1] = base[j + 1] * w; fm.pos[j + 2] = -x * s + z * c; } };
    };
    G3.form("globe", globe); G3.form("sphere", globe);
    G3.form("scatter", (fm, n) => {                                            // a wide drifting cloud
      const base = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const r = 6 + 30 * Math.cbrt(hash(i, 51)), j = i * 3; base[j] = DIR[j] * r * 1.5; base[j + 1] = DIR[j + 1] * r * 0.85; base[j + 2] = DIR[j + 2] * r; fm.size[i] = 0.6 + 0.8 * hash(i, 52); }
      return tl => { for (let i = 0, j = 0; i < n; i++, j += 3) { const ph = hash(i, 53) * 6.28; fm.pos[j] = base[j] + Math.sin(tl * 0.21 + ph) * 0.7; fm.pos[j + 1] = base[j + 1] + Math.cos(tl * 0.17 + ph) * 0.7; fm.pos[j + 2] = base[j + 2] + Math.sin(tl * 0.13 + ph * 2) * 0.7; } };
    });
    G3.form("core", (fm, n) => {                                               // all points in one small glowing ball
      for (let i = 0; i < n; i++) { const r = 0.9 * Math.pow(hash(i, 61), 0.6), j = i * 3; fm.pos[j] = DIR[j] * r; fm.pos[j + 1] = DIR[j + 1] * r; fm.pos[j + 2] = DIR[j + 2] * r; fm.size[i] = 0.5 + 0.4 * hash(i, 62); G3.tint(fm, i, "ink", 0.35 + 0.3 * hash(i, 63)); }
    });

    film.back.canvas((ctx, t) => { G3.render(t); ctx.drawImage(renderer.domElement, 0, 0); }, { id: "points3d" });
  };

  // ---- draw frame t
  G3.render = t => {
    if (!segs.length) { film.problem("G3: no morph scheduled: start with G3.morph(0, \"globe\")"); return; }
    let k = 0; while (k + 1 < segs.length && segs[k + 1].t <= t) k++;
    state(k, t, { pos: geo.attributes.position.array, col: geo.attributes.color.array, size: geo.attributes.size.array }, 0);
    geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = geo.attributes.size.needsUpdate = true;
    const cs = camState(t); setCam(camera, cs);
    mat.uniforms.uScale.value = H / (2 * Math.tan(cs.fov * Math.PI / 360)); mat.uniforms.uLevel.value = clamp(G3.level.at(t), 0, 4); mat.uniforms.uSize.value = 0.1 * G3.grain.at(t); mat.uniforms.uDist.value = cs.dist;
    for (const x of extras) { const on = t >= x.from && t <= x.to; x.obj.visible = on; if (on && x.fn) { try { x.fn(t, fade(t, x.from, x.to)); } catch (e) { film.problem("G3.add callback threw: " + e.message); } } }
    for (const h of hooks) { try { h(t); } catch (e) { film.problem("G3.onFrame callback threw: " + e.message); } }
    renderer.render(scene, camera);
  };
})();
