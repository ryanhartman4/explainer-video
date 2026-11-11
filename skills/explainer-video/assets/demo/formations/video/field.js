// field.js: a football field drawn in perspective on one canvas, for both cuts of this film.
// The camera can look straight down (the playbook view, offense facing up the screen) or from the sideline stands
// (the broadcast view, offense facing right), and swing between them. Players are chips that stand up as the camera
// tilts. Highlights are drawn on the turf the way a broadcast telestrator draws them: rings, brackets, arrows.
// Every frame is drawn from the time alone (tracks and time-stamped lists), so frames can be rendered in any order.
//
//   const F = Field(film, scene, { spots, R, SQ, cam: { top: {...}, tv: {...} }, start: "tv" })
//   spots: { name: [yards across from the ball (+ is the offense's right), yards back from the line] } for this frame
//   cam presets: { az, el, dist, f, tx, tz, cx, cy }: degrees, yards, focal length in px, target on the ground, where
//   the target sits on the screen. The scale at the target is f / dist pixels to the yard.
//   numbersX: how far from the middle the painted yard numbers sit, in yards.
//   shadeTop, shadeBottom (px), shadeBottomAlpha, shadeBottomKnee: the soft shades under this frame's type
window.Field = function (film, scene, o) {
  const D = window.SHARED, W = film.W, H = film.H, R = o.R ?? 40, SQ = o.SQ ?? 62;
  const css = getComputedStyle(document.getElementById("stage")), tok = k => css.getPropertyValue("--" + k).trim();
  const C = { bg: tok("bg"), a: tok("turf-a"), b: tok("turf-b"), off: tok("turf-off"), chip: tok("chip"), ink: tok("ink"), muted: tok("muted"), faint: tok("faint"), accent: tok("accent"),
    WR: tok("blue"), TE: tok("red"), RB: tok("purple") };
  for (const k of ["a", "b", "off", "chip"]) if (!C[k]) film.problem("field.js: look.css does not define the turf colour --" + (k === "chip" ? "chip" : "turf-" + k));
  const LETTER = { X: "X", Z: "Z", Y: "Y", B: "RB", QB: "QB" }, JOKER = { WR: "H", TE: "U", RB: "FB" };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = u => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2), out = u => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(1 - u, 3));
  const xz = spot => { const s = o.spots[spot]; if (!s) film.problem("field.js: no spot " + spot); return s ? [s[0], -s[1]] : [0, 0]; };   // z is downfield, so "back" is negative

  // ---------- the camera: eight tracks ----------
  const camKeys = ["az", "el", "dist", "f", "tx", "tz", "cx", "cy"], cam = {};
  const first = o.cam[o.start || "top"];
  for (const k of camKeys) cam[k] = film.value(first[k]);
  const F = { cam: {
    go(name, t, co = {}) { const p = o.cam[name]; if (!p) film.problem("field.js: no camera preset " + name); else for (const k of camKeys) cam[k].to(t, p[k], { dur: co.dur ?? 1.8, ease: "inOut" }); return F; },
    to(t, vals, co = {}) { for (const k in vals) cam[k].to(t, vals[k], { dur: co.dur ?? 1.2, ease: "inOut" }); return F; } } };
  function view(t) {
    const eld = cam.el.at(t), tilt = clamp((90 - eld) / 45, 0, 1);
    const az = (cam.az.at(t) + tilt * (o.drift ?? 1.3) * Math.sin(t * 0.33 + 1)) * Math.PI / 180, el = eld * Math.PI / 180;   // from the stands the camera is never quite still
    const d = cam.dist.at(t) * (1 - tilt * 0.012 * Math.sin(t * 0.21)), f = cam.f.at(t);
    const hx = Math.sin(az), hz = Math.cos(az), ce = Math.cos(el), se = Math.sin(el);
    const fw = [hx * ce, -se, hz * ce], rt = [hz, 0, -hx], up = [hx * se, ce, hz * se];
    const T = [cam.tx.at(t), 0, cam.tz.at(t)], P0 = [T[0] - fw[0] * d, -fw[1] * d, T[2] - fw[2] * d], cx = cam.cx.at(t), cy = cam.cy.at(t);
    const proj = (x, y, z) => { const v0 = x - P0[0], v1 = y - P0[1], v2 = z - P0[2], zc = Math.max(1, v0 * fw[0] + v1 * fw[1] + v2 * fw[2]), s = f / zc;
      return [cx + (v0 * rt[0] + v2 * rt[2]) * s, cy - (v0 * up[0] + v1 * up[1] + v2 * up[2]) * s, s, zc]; };
    return { proj, d, f, se, tilt, base: f / d };
  }

  // ---------- the men: positions are tracks, jobs and looks are time-stamped ----------
  const ids = ["X", "Z", "Y", "J", "B", "QB"], five = ["X", "Z", "Y", "J", "B"];
  const at = { ...D.STATE.base.at }, role = { ...D.STATE.base.role };
  const pos = {}, roles = {}, painted = {}, dims = {}, pulses = {}, accentRing = [];
  for (const id of ids) { const [x, z] = xz(at[id]); pos[id] = { x: film.value(x), z: film.value(z) }; roles[id] = [[-1, role[id]]]; pulses[id] = []; dims[id] = film.value(1); }
  for (const k of D.LINE) { dims[k] = film.value(1); pulses[k] = []; }
  const lineFill = film.value(0), losOn = film.value(0);
  const where = (id, t) => (pos[id] ? [pos[id].x.at(t), pos[id].z.at(t)] : xz(id));
  const roleAt = (id, t) => { let r = roles[id][0][1]; for (const [tt, v] of roles[id]) if (tt <= t) r = v; return r; };
  const marks = [];                                    // everything drawn on the turf or floating over it, each with a start and an end
  F.at = at; F.where = where; F.xz = xz; F.ids = ids; F.five = five;
  F.pulse = (id, t, gap = 0.08) => { (Array.isArray(id) ? id : [id]).forEach((k, i) => pulses[k].push(t + i * gap)); return F; };
  // go(state, t): every man whose spot or job differs travels there, leaving a dashed trail; a change of job switches
  // his colour and letter at once, with a pulse
  F.go = function (key, t, go = {}) {
    const s = D.STATE[key];
    for (const id of ids) {
      if (id !== "QB" && s.role[id] !== role[id]) { roles[id].push([t, s.role[id]]); pulses[id].push(t); role[id] = s.role[id]; }
      if (s.at[id] !== at[id]) {
        const [x0, z0] = xz(at[id]), [x1, z1] = xz(s.at[id]), tt = t + (go.stagger?.[id] ?? 0), dur = go.dur ?? 0.75;
        pos[id].x.to(tt, x1, { dur }); pos[id].z.to(tt, z1, { dur });
        if (Math.hypot(x1 - x0, z1 - z0) > 2.2) marks.push({ kind: "trail", a: [x0, z0], b: [x1, z1], t0: tt, t1: tt + 1.6, dur });
        at[id] = s.at[id];
      }
    }
    return F;
  };
  F.paint = (list, t) => { list.forEach((id, i) => { painted[id] = t + i * 0.1; pulses[id].push(t + i * 0.1); }); return F; };
  F.light = (t, keep) => { for (const k of D.LINE) dims[k].to(t, keep.includes("line") ? 1 : 0.3, { dur: 0.4 }); dims.QB.to(t, keep.includes("QB") ? 1 : 0.3, { dur: 0.4 });
    for (const id of five) dims[id].to(t, keep.includes("five") || keep.includes(id) ? 1 : 0.3, { dur: 0.4 }); return F; };
  F.linemen = t => { lineFill.to(t, 1, { dur: 0.4 }); D.LINE.forEach((k, i) => pulses[k].push(t + i * 0.06)); return F; };
  F.los = t => { losOn.to(t, 1, { dur: 0.5 }); return F; };
  // telestrator marks. who: a man's id, a lineman's spot, or [x, z] in yards (z downfield).
  F.ring = (who, t, until, m = {}) => { (Array.isArray(who) && typeof who[0] === "string" ? who : [who]).forEach((w, i) => marks.push({ kind: "ring", who: w, t0: t + i * (m.gap ?? 0.12), t1: until, r: m.r ?? 1.5, color: m.color || "accent" })); return F; };
  F.bracket = (list, t, until, m = {}) => { marks.push({ kind: "bracket", list, t0: t, t1: until, pad: m.pad ?? 1.35, color: m.color || "accent" }); return F; };
  F.arrow = (a, b, t, until, m = {}) => { marks.push({ kind: "arrow", a, b, t0: t, t1: until, bend: m.bend ?? 0, color: m.color || "accent", dur: m.dur ?? 0.6, head: m.head !== false, lw: m.lw ?? 7 }); return F; };
  // the seven on the line take the accent outline; count: number them 1 to 7, each numeral a step downfield of its man
  F.seven = (t, until = 1e9, m = {}) => { accentRing.push([t, until]); D.read(D.STATE.base).onLine.forEach((id, i) => { pulses[id].push(t + 0.1 + i * 0.09);
    if (m.count) marks.push({ kind: "label", who: id, text: String(i + 1), t0: t + 0.1 + i * 0.09, t1: until, off: [0, m.step ?? 1.8], lift: 1, px: m.px ?? 38, color: "accent", font: "mono" }); }); return F; };
  // a word or number floating over a spot on the field. text: a string, or [[t, "2"], [t2, "3"]] to change it in place.
  // off: [yards across, yards downfield] from the spot. A label on a man floats at his chip's height.
  F.label = (who, text, t, until, m = {}) => { const k = { kind: "label", who, text, t0: t, t1: until ?? 1e9, off: m.off || [0, 0], lift: m.lift ?? (typeof who === "string" ? 1 : 0), px: m.px ?? 34, color: m.color || "ink", font: m.font || "text", align: m.align || "center" }; marks.push(k); return k; };
  // a dimension mark on the turf from the line of scrimmage back to a man (to his chip's front edge with edge: true), with
  // a tick at each end and a label beside it. It follows the man if he moves. x: draw it that far across instead of on
  // him; ext: a dashed line joins it to him.
  F.measure = (who, t, until, text, m = {}) => { marks.push({ kind: "measure", who, t0: t, t1: until, x: m.x, edge: !!m.edge, ext: !!m.ext, color: m.color || "ink" });
    if (text) F.label(who, text, t + 0.3, until, { px: m.px ?? 32, off: m.off || [0, 0], lift: 0, mid: true, align: m.align }).mid = { x: m.x, edge: !!m.edge }; return F; };
  // a defender: a small grey chip at [x, z]; with to and move he slides there at that time
  F.defender = (p, t, until, m = {}) => { marks.push({ kind: "defender", a: p, b: m.to || null, move: m.move ?? t, t0: t, t1: until }); return F; };

  // ---------- things made once ----------
  const rnd = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(7);
  const lights = Array.from({ length: 420 }, () => { const row = rnd(), side = -1; rnd(); return { x: side * (28.6 + row * 13), y: 0.3 + row * 3.6 + rnd(), z: -75 + rnd() * 170, r: 0.5 + rnd() * 1.6, a: 0.16 + rnd() * 0.5, warm: rnd() < 0.3 }; });   // low along the far sideline: benches, boards, cameras
  const grain = document.createElement("canvas"); grain.width = grain.height = 256;
  { const gx = grain.getContext("2d"), im = gx.createImageData(256, 256); for (let i = 0; i < im.data.length; i += 4) { const v = rnd() < 0.5 ? 0 : 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = Math.floor(rnd() * 16); } gx.putImageData(im, 0, 0); }

  // ---------- drawing ----------
  const poly = (ctx, pts, close) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close) ctx.closePath(); };
  const part = (pts, u) => { if (u >= 1) return pts; const n = Math.max(1, Math.floor((pts.length - 1) * u)); return pts.slice(0, n + 1); };   // the first u of a polyline (a stroke drawing itself)
  const life = (m, t) => (t < m.t0 || t >= m.t1 ? 0 : Math.min(1, (m.t1 - t) / 0.25));                     // 1 while alive, fading over the last quarter second
  const fontOf = (k, px) => (k === "mono" ? `600 ${px}px "JetBrains Mono", monospace` : k === "display" ? `600 ${px}px "Space Grotesk", sans-serif` : `600 ${px}px "Instrument Sans", sans-serif`);
  const glow = (ctx, color, blur) => { ctx.shadowColor = color; ctx.shadowBlur = blur; }, noGlow = ctx => { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; };
  function draw(ctx, t) {
    const V = view(t), g = (x, z, y = 0) => V.proj(x, y, z);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; noGlow(ctx); ctx.setLineDash([]); ctx.fillStyle = C.off; ctx.fillRect(0, 0, W, H);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // the turf: a lighter and a darker stripe every five yards, between the sidelines. The ball is on the offense's 35.
    const SIDE = 26.67, Z0 = -45, Z1 = 60;
    for (let z = Z0; z < Z1; z += 5) { poly(ctx, [g(-SIDE - 2, z), g(SIDE + 2, z), g(SIDE + 2, z + 5), g(-SIDE - 2, z + 5)], true); ctx.fillStyle = z < -35 ? C.bg : (Math.round(z / 5) & 1) ? C.a : C.b; ctx.fill(); }
    ctx.strokeStyle = C.ink; ctx.globalAlpha = 0.34;
    for (let z = -35; z <= Z1; z += 5) { const a = g(-SIDE, z), b = g(SIDE, z); ctx.lineWidth = Math.max(1.5, 0.1 * (a[2] + b[2]) / 2); poly(ctx, [a, b]); ctx.stroke(); }
    for (let z = Z0 + 1; z < Z1; z++) if (z % 5) for (const x of [-3.08, 3.08, -SIDE + 0.6, SIDE - 0.6]) { const a = g(x - 0.33, z), b = g(x + 0.33, z); ctx.lineWidth = Math.max(1, 0.08 * a[2]); poly(ctx, [a, b]); ctx.stroke(); }
    ctx.globalAlpha = 0.8;
    for (const x of [-SIDE, SIDE]) { const p = Array.from({ length: 22 }, (_, i) => g(x, Z0 + (Z1 - Z0) * i / 21)); ctx.lineWidth = Math.max(3, 0.3 * g(x, 0)[2]); poly(ctx, p); ctx.stroke(); }
    // yard numbers painted on the turf, each pair facing its own sideline
    ctx.globalAlpha = 0.2; ctx.fillStyle = C.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = '600 110px "Space Grotesk", sans-serif';
    for (const [z, n] of [[-25, 10], [-15, 20], [-5, 30], [5, 40], [15, 50], [25, 40], [35, 30], [45, 20]]) for (const side of [1, -1]) {
      const x = side * (o.numbersX ?? 14.4), digits = String(n).split("");
      digits.forEach((dgt, i) => { const zz = z + side * (i ? 1.3 : -1.3), A = g(x, zz), Bz = g(x, zz + side), Bx = g(x - side, zz);
        ctx.setTransform((Bz[0] - A[0]) / 50, (Bz[1] - A[1]) / 50, -(Bx[0] - A[0]) / 50, -(Bx[1] - A[1]) / 50, A[0], A[1]); ctx.fillText(dgt, 0, 8); });
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // the lights: a soft pool over the formation, darker toward the corners, and a fine grain so the dark gradient does not band
    { const L = g(0, -2), far = Math.hypot(Math.max(L[0], W - L[0]), Math.max(L[1], H - L[1])), gr = ctx.createRadialGradient(L[0], L[1], 0, L[0], L[1], far);
      gr.addColorStop(0, "rgba(255,250,215,0.11)"); gr.addColorStop(0.42, "rgba(255,250,215,0)"); gr.addColorStop(0.55, "rgba(2,14,9,0)"); gr.addColorStop(1, "rgba(2,14,9,0.6)");
      ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }
    // the line of scrimmage: the rule's colour once the rule is stated
    { const a = g(-SIDE, 0), b = g(SIDE, 0), k = losOn.at(t); ctx.globalAlpha = 0.55 + 0.45 * k; ctx.strokeStyle = k > 0.5 ? C.accent : C.ink; if (k > 0.5) glow(ctx, C.accent, 18 * k);
      ctx.lineWidth = Math.max(3, (0.12 + 0.07 * k) * (a[2] + b[2]) / 2); poly(ctx, [a, b]); ctx.stroke(); noGlow(ctx); }

    // marks on the turf
    const col = k => C[k] || k, pt = w => (typeof w === "string" ? where(w, t) : w), yd = R / V.base;      // a chip's radius in yards, seen from above
    const span = m => { const [x, z] = pt(m.who); return { x: m.x ?? x, z1: m.edge ? Math.min(0, z + yd + 0.12) : z }; };   // a dimension mark: from the line back to z1
    for (const m of marks) {
      const a = life(m, t); if (!a) continue;
      ctx.globalAlpha = a;
      if (m.kind === "trail") { const u = out((t - m.t0) / m.dur), p = Array.from({ length: 21 }, (_, i) => g(m.a[0] + (m.b[0] - m.a[0]) * i / 20, m.a[1] + (m.b[1] - m.a[1]) * i / 20));
        ctx.globalAlpha = 0.6 * Math.min(1, (m.t1 - t) / 0.8); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.setLineDash([10, 12]); poly(ctx, part(p, u)); ctx.stroke(); ctx.setLineDash([]); }
      else if (m.kind === "ring") { const [x, z] = pt(m.who), u = out((t - m.t0) / 0.45), p = Array.from({ length: 49 }, (_, i) => { const q = -1.9 + i / 48 * 6.6; return g(x + Math.cos(q) * m.r, z + Math.sin(q) * m.r); });
        ctx.strokeStyle = col(m.color); glow(ctx, col(m.color), 14); ctx.lineWidth = Math.max(5, 0.13 * g(x, z)[2]); poly(ctx, part(p, u)); ctx.stroke(); noGlow(ctx); }
      else if (m.kind === "bracket") { const P = m.list.map(pt), x0 = Math.min(...P.map(q => q[0])) - m.pad, x1 = Math.max(...P.map(q => q[0])) + m.pad, z0 = Math.min(...P.map(q => q[1])) - m.pad, z1 = Math.max(...P.map(q => q[1])) + m.pad;
        const c = [[x0, z1], [x1, z1], [x1, z0], [x0, z0], [x0, z1]], p = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 12; j++) p.push(g(c[i][0] + (c[i + 1][0] - c[i][0]) * j / 12, c[i][1] + (c[i + 1][1] - c[i][1]) * j / 12)); p.push(g(x0, z1));
        ctx.strokeStyle = col(m.color); glow(ctx, col(m.color), 14); ctx.lineWidth = Math.max(5, 0.13 * g(x0, z0)[2]); poly(ctx, part(p, out((t - m.t0) / 0.6))); ctx.stroke(); noGlow(ctx); }
      else if (m.kind === "arrow") { const A = pt(m.a), B = pt(m.b), mx = (A[0] + B[0]) / 2 + (B[1] - A[1]) * m.bend, mz = (A[1] + B[1]) / 2 - (B[0] - A[0]) * m.bend, u = ease((t - m.t0) / m.dur);
        const p = Array.from({ length: 33 }, (_, i) => { const s = i / 32; return g((1 - s) * (1 - s) * A[0] + 2 * s * (1 - s) * mx + s * s * B[0], (1 - s) * (1 - s) * A[1] + 2 * s * (1 - s) * mz + s * s * B[1]); }), q = part(p, u);
        ctx.strokeStyle = ctx.fillStyle = col(m.color); glow(ctx, col(m.color), 12); ctx.lineWidth = m.lw; poly(ctx, q); ctx.stroke();
        if (m.head && q.length > 2) { const e = q[q.length - 1], b = q[q.length - 3], an = Math.atan2(e[1] - b[1], e[0] - b[0]), hl = 24; ctx.beginPath(); ctx.moveTo(e[0] + Math.cos(an) * hl * 0.7, e[1] + Math.sin(an) * hl * 0.7);
          ctx.lineTo(e[0] + Math.cos(an + 2.5) * hl, e[1] + Math.sin(an + 2.5) * hl); ctx.lineTo(e[0] + Math.cos(an - 2.5) * hl, e[1] + Math.sin(an - 2.5) * hl); ctx.closePath(); ctx.fill(); }
        noGlow(ctx); }
      else if (m.kind === "measure") { const s = span(m), u = out((t - m.t0) / 0.5), z1 = s.z1 * u, tick = 0.55;
        if (m.ext) { const [mx] = pt(m.who); ctx.strokeStyle = col(m.color); ctx.globalAlpha = a * 0.55; ctx.lineWidth = 3; ctx.setLineDash([8, 10]); poly(ctx, [g(mx, s.z1), g(s.x, s.z1)]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = a; }
        ctx.strokeStyle = col(m.color); ctx.lineWidth = 5; poly(ctx, [g(s.x, 0), g(s.x, z1)]); ctx.stroke(); poly(ctx, [g(s.x - tick, z1), g(s.x + tick, z1)]); ctx.stroke(); poly(ctx, [g(s.x - tick, 0), g(s.x + tick, 0)]); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;

    { // type sits top left and along the bottom: a soft shade under each, the top one only once the far sideline is in view
      const st = o.shadeTop ?? 230, sb = o.shadeBottom ?? 330;
      const top = ctx.createLinearGradient(0, 0, 0, st); top.addColorStop(0, `rgba(3,16,11,${0.94 * V.tilt})`); top.addColorStop(0.5, `rgba(3,16,11,${0.86 * V.tilt})`); top.addColorStop(1, "rgba(3,16,11,0)"); ctx.fillStyle = top; ctx.fillRect(0, 0, W, st);
      const bot = ctx.createLinearGradient(0, H - sb, 0, H); bot.addColorStop(0, "rgba(3,16,11,0)"); bot.addColorStop(o.shadeBottomKnee ?? 1, `rgba(3,16,11,${o.shadeBottomAlpha ?? 0.5})`); bot.addColorStop(1, `rgba(3,16,11,${o.shadeBottomAlpha ?? 0.5})`); ctx.fillStyle = bot; ctx.fillRect(0, H - sb, W, sb);
      ctx.fillStyle = ctx.createPattern(grain, "repeat"); ctx.fillRect(0, 0, W, H); }
    // beyond the sidelines: the lights of the stands, seen only once the camera tilts
    if (V.tilt > 0.02) for (const L of lights) { const p = g(L.x, L.z, L.y); if (p[0] < -20 || p[0] > W + 20 || p[1] < -20 || p[1] > H + 20) continue;
      ctx.globalAlpha = L.a * V.tilt; ctx.fillStyle = L.warm ? C.accent : C.ink; ctx.beginPath(); ctx.arc(p[0], p[1], clamp(L.r * p[2] * 0.12, 0.8, 7), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;

    // the men, far ones first. A chip keeps its size on screen; it stands a yard off the turf, so it rises as the camera tilts.
    const chips = [];
    for (const k of D.LINE) { const [x, z] = xz(k); chips.push({ id: k, x, z, sq: true }); }
    for (const id of ids) { const [x, z] = where(id, t); chips.push({ id, x, z }); }
    for (const m of marks) if (m.kind === "defender" && life(m, t)) { const u = m.b ? ease((t - m.move) / 0.5) : 0, a = m.a, b = m.b || m.a; chips.push({ def: m, x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u }); }
    for (const c of chips) { c.foot = g(c.x, c.z); c.top = g(c.x, c.z, 1.0); }
    chips.sort((p, q) => q.foot[3] - p.foot[3]);
    const sevenOn = accentRing.some(([a, b]) => t >= a && t < b), onLine = new Set(D.read(D.STATE.base).onLine);
    // a pulse also sends a ripple out across the turf from the man's feet
    for (const c of chips) if (!c.def) for (const tp of pulses[c.id]) { const u = (t - tp) / 0.7; if (u <= 0 || u >= 1) continue; const rr = yd * (1 + 1.5 * out(u));
      const p = Array.from({ length: 37 }, (_, i) => g(c.x + Math.cos(i / 36 * 6.2832) * rr, c.z + Math.sin(i / 36 * 6.2832) * rr)); ctx.globalAlpha = 0.55 * (1 - u) * dims[c.id].at(t); ctx.strokeStyle = C.ink; ctx.lineWidth = 3; poly(ctx, p, true); ctx.stroke(); }
    for (const c of chips) {
      const k = clamp(V.d / c.foot[3], 0.74, 1.3) * (1 - 0.1 * V.tilt), al = c.def ? life(c.def, t) * clamp((t - c.def.t0) / 0.3, 0, 1) : dims[c.id].at(t);
      let pu = 0; if (!c.def) for (const tp of pulses[c.id]) { const u = (t - tp) / 0.5; if (u > 0 && u < 1) pu = Math.max(pu, Math.sin(Math.PI * u)); }
      const r = (c.sq ? SQ / 2 : c.def ? R * 0.74 : R) * k * (1 + 0.16 * pu), [sx, sy] = c.top, [fx, fy] = c.foot;
      ctx.globalAlpha = al * 0.4 * V.tilt; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(fx + r * 0.1, fy, r * 0.95, Math.max(1, r * 0.95 * V.se * 0.9), 0, 0, 7); ctx.fill();   // his shadow on the turf, once the camera tilts
      ctx.globalAlpha = al;
      let fill = C.chip, stroke = C.ink, ink = C.ink, text = "";
      if (c.def) { stroke = C.muted; ink = C.muted; text = "D"; }
      else if (c.sq) { if (lineFill.at(t) > 0.5) { fill = C.ink; stroke = C.off; } }                       // a filled square keeps a dark edge, so five in a row stay five
      else if (c.id === "QB") text = "QB";
      else { const ro = roleAt(c.id, t); text = c.id === "J" ? JOKER[ro] : LETTER[c.id]; if (painted[c.id] != null && t >= painted[c.id]) { fill = stroke = C[ro]; ink = C.off; } }
      const hot = sevenOn && !c.def && onLine.has(c.id); if (hot) stroke = C.accent;
      const shape = () => { ctx.beginPath(); if (c.sq) ctx.roundRect(sx - r, sy - r, 2 * r, 2 * r, r * 0.28); else ctx.arc(sx, sy, r, 0, 7); };
      if (al < 1 && !c.def) { ctx.globalAlpha = 1; ctx.fillStyle = C.b; shape(); ctx.fill(); ctx.globalAlpha = al; }   // a dimmed man is faint, never see-through
      ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = hot ? 6 : 3.5;
      if (hot) glow(ctx, C.accent, 16); else if (fill !== C.chip && !c.sq) glow(ctx, fill, 14 * al);
      shape(); ctx.fill(); noGlow(ctx); ctx.stroke();
      if (text) { ctx.fillStyle = ink; ctx.font = fontOf("mono", Math.round((text.length > 1 ? 0.74 : 0.92) * r)); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, sx, sy + r * 0.04); }
    }
    // words and numbers floating over the field
    for (const m of marks) if (m.kind === "label") { const a = life(m, t); if (!a) continue;
      let [x, z] = pt(m.who); if (m.mid) { const s = span({ who: m.who, ...m.mid }); x = s.x; z = s.z1 / 2; }
      const p = g(x + m.off[0], z + m.off[1], m.lift);
      let text = m.text; if (Array.isArray(text)) { let s = text[0][1]; for (const [tt, v] of text) if (tt <= t) s = v; text = s; }
      const rise = 1 - out((t - m.t0) / 0.4); ctx.globalAlpha = a * (1 - rise); ctx.fillStyle = col(m.color); ctx.font = fontOf(m.font, m.px); ctx.textAlign = m.align; ctx.textBaseline = "middle";
      ctx.lineWidth = clamp(m.px * 0.2, 6, 12); ctx.strokeStyle = "rgba(6,26,19,0.8)"; ctx.strokeText(text, p[0], p[1] + rise * 16); ctx.fillText(text, p[0], p[1] + rise * 16); }
    ctx.globalAlpha = 1;
  }
  scene.canvas(draw, { x: 0, y: 0, w: W, h: H, id: "field", overlap: true });
  return F;
};
