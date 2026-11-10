// scene 7, "Only because it is beautiful": a core, twelve seeds turned by the golden angle, a sunflower head of
// 30,000 seeds, and the head curled into a flower. Vogel (1979): seed n at angle n × 137.508°, radius c × sqrt(n).
// Colour has one meaning here: distance from the centre, warm (yellow, coral) at the heart to cool (purple, blue) at the rim.
(window.SCENES = window.SCENES || []).push({ n: 7, build(film, p, G3) {
  const N = G3.N, { hash, clamp, lerp, ease, smooth } = G3, PI = Math.PI;
  const GA = PI * (3 - Math.sqrt(5)), DEG = GA * 180 / PI;                       // the golden angle, computed: 360(1 − 1/phi)
  if (Math.abs(DEG - 137.5078) > 2e-4) film.problem("s7: the golden angle is not 137.5078 degrees");
  const R = 10, C0 = 1.4, NS = 12, KN = 140, KN0 = N - NS * KN, CF = R / Math.sqrt(N), RD = 0.27, RDISC = 1.75;

  // ---- cues
  const tSeed = p.at("each new seed"), tAngle = p.at("the golden angle"), tSun = p.at("a sunflower appears"), tRule = p.at("The rule"),
    tNeigh = p.at("a seed's neighbours", -0.4), tSince = p.at("And since"), tPoem = p.at("a poem"), tL1 = p.at("Thirty thousand lights"), tL2 = p.at("None of them"),
    tStill = p.at("Still, the flower"), tFlower = p.at("flower blooms"), tCount = tAngle + 0.15, tHalf = p.after("and a half") - 0.1;
  const step = (tSun - 0.3 - tSeed) / NS, sweep = step * 0.82, tk = k => tSeed + k * step;      // the dozen: one seed a step
  const growDur = clamp(tRule + 0.5 - tSun, 1.6, 3.2);                              // 12 seeds become 30,000
  const tCurl = tPoem - 0.25, curlDur = 1.5, openDur = clamp(tFlower - tStill, 0.5, 0.9);          // the last opening ends on the word "flower", so the open flower holds
  const rotAt = t => { const d = t - tSun; return d > 0 ? 0.045 * d * d / (d + 1.5) : 0; };
  const openAt = t => 0.52 * smooth(tCurl + 0.5, tL2, t) + 0.48 * ease(clamp((t - tStill) / openDur));   // the petals split as the head curls

  const t0 = p.start - 0.8;

  // ---- geometry shared by the scene's form and the public "flower"
  // petal rings from the heart outward: 5, 8, 13, 21 petals (Fibonacci numbers, like the head's own spirals)
  const LAY = [null,
    { m: 5, r0: 1.2, L: 3.0, a0: 0.22, a1: 0.8, z0: 0.34 },
    { m: 8, r0: 1.4, L: 4.3, a0: 0.6, a1: 1.12, z0: 0.22 },
    { m: 13, r0: 1.58, L: 5.4, a0: 0.95, a1: 1.42, z0: 0.1 },
    { m: 21, r0: 1.72, L: 6.2, a0: 1.25, a1: 1.72, z0: 0 }];
  const BOWL = { r0: RDISC, L: 7.6, a0: 1.5, a1: 0.25, z0: 0 };
  LAY.forEach(l => { if (l) l.hw = 1.2 * (PI / l.m) * (l.r0 + 0.55 * l.L * 0.92); });
  let GEO = null;
  function geom() {
    if (GEO) return GEO;
    const g = GEO = { ct: new Float32Array(N), st: new Float32Array(N), rho: new Float32Array(N), lay: new Uint8Array(N), s: new Float32Array(N), thc: new Float32Array(N),
      phi: new Float32Array(N), w: new Float32Array(N), pj: new Uint8Array(N), br: new Float32Array(N), sz: new Float32Array(N), core: new Float32Array(N * 3), cb: new Float32Array(N), csz: new Float32Array(N),
      off: new Float32Array(N * 3), lut: new Float32Array(257 * 3) };
    const TAU = PI * 2;
    for (let i = 0; i < N; i++) {
      const th = (i * GA) % TAU, rho = Math.sqrt((i + 1) / N);                    // the rule: seed i from i alone, turned i × 137.5°, stepped out to c × sqrt(i + 1)
      g.ct[i] = Math.cos(th); g.st[i] = Math.sin(th); g.rho[i] = rho; g.br[i] = 0.55 + 0.45 * hash(i, 71); g.sz[i] = 0.72 + 0.5 * hash(i, 72);
      const z = hash(i, 11) * 2 - 1, a = hash(i, 12) * 6.2832, rr = Math.sqrt(1 - z * z), cr = 0.9 * Math.pow(hash(i, 61), 0.6);   // the same ball as the "core" form
      g.core[i * 3] = rr * Math.cos(a) * cr; g.core[i * 3 + 1] = rr * Math.sin(a) * cr; g.core[i * 3 + 2] = z * cr; g.cb[i] = 0.08 + 0.12 * hash(i, 63); g.csz[i] = 0.5 + 0.4 * hash(i, 62);
      const gx = Math.sqrt(-2 * Math.log(1 - hash(i, 73) * 0.999)), ga = hash(i, 74) * TAU;
      g.off[i * 3] = gx * Math.cos(ga); g.off[i * 3 + 1] = gx * Math.sin(ga); g.off[i * 3 + 2] = (hash(i, 75) - 0.5) * 1.4;
      if (rho < RD) { g.lay[i] = 0; continue; }
      const h = hash(i, 76), l = h < 0.13 ? 1 : h < 0.34 ? 2 : h < 0.66 ? 3 : 4, m = LAY[l].m, sec = TAU / m, tt = (th + l * 0.71) % TAU, j = Math.floor(tt / sec), s = (rho - RD) / (1 - RD);
      g.lay[i] = l; g.pj[i] = j; g.s[i] = s; g.phi[i] = (tt / sec - j) * 2 - 1; g.thc[i] = (j + 0.5) * sec - l * 0.71;
      g.w[i] = Math.pow(Math.sin(PI * Math.pow(0.07 + 0.93 * s, 0.8)), 0.5);     // a petal's outline: narrow base, wide middle, pointed tip
    }
    const mix = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
    const stops = [[0, G3.rgb("yellow")], [0.3, G3.rgb("accent")], [0.55, mix(G3.rgb("ink"), G3.rgb("accent"), 0.45)], [0.8, G3.rgb("purple")], [1, G3.rgb("blue")]];
    for (let q = 0; q <= 256; q++) { const u = q / 256; let k = 0; while (k < stops.length - 2 && u > stops[k + 1][0]) k++;
      const c = mix(stops[k][1], stops[k + 1][1], clamp((u - stops[k][0]) / (stops[k + 1][0] - stops[k][0]))); g.lut[q * 3] = c[0]; g.lut[q * 3 + 1] = c[1]; g.lut[q * 3 + 2] = c[2]; }
    return g;
  }

  // the head as a flower: curl 0 is the flat head, curl 1 with q 0 a bowl, q 1 the open flower. tilt leans the axis back.
  const PA = LAY.map(l => l ? { a0: new Float32Array(l.m), k: new Float32Array(l.m) } : null);
  function bloom(f, g, t, curl, q, rot, tilt, zoff) {
    const P = f.pos, C = f.col, S = f.size, qs = smooth(0.04, 0.62, q), cr = Math.cos(rot), sr = Math.sin(rot), ctl = Math.cos(tilt), stl = Math.sin(tilt), lut = g.lut;
    const Lq = [0], r0q = [0], z0q = [0];
    for (let l = 1; l <= 4; l++) { const Y = LAY[l]; Lq[l] = lerp(BOWL.L, Y.L, q); r0q[l] = lerp(BOWL.r0, Y.r0, q); z0q[l] = lerp(BOWL.z0, Y.z0, q);
      for (let j = 0; j < Y.m; j++) { const fl = 0.05 * q * Math.sin(0.9 * t + j * 2.4 + l * 1.3), a0 = lerp(BOWL.a0, Y.a0, q) + 0.5 * fl, a1 = lerp(BOWL.a1, Y.a1, q) + fl + 0.03 * q * Math.sin(0.55 * t + l);
        PA[l].a0[j] = a0; PA[l].k[j] = a1 - a0; } }
    const dome = 0.55 * curl;
    for (let i = 0, j3 = 0; i < N; i++, j3 += 3) {
      const rho = g.rho[i], c0 = g.ct[i] * cr - g.st[i] * sr, s0 = g.st[i] * cr + g.ct[i] * sr, l = g.lay[i];
      const u = smooth(0, 1, curl * 1.5 - 0.5 * (1 - rho));                       // the rim curls first
      let x = R * rho * c0, y = R * rho * s0, z = 0, bw = 1;
      if (u > 0) {
        let fx, fy, fz;
        if (l === 0) { const rd = rho / RD, rr = rd * RDISC; fx = rr * c0; fy = rr * s0; fz = dome * (1 - rd * rd) - 0.05; }
        else { const Y = LAY[l], pj = g.pj[i], a0 = PA[l].a0[pj], k = PA[l].k[pj], s = g.s[i], A = a0 + k * s, cA = Math.cos(A), sA = Math.sin(A), L = Lq[l], w = g.w[i], ph = g.phi[i];
          let rc = r0q[l] + L * (Math.cos(a0) - cA) / k, zc = z0q[l] + L * (sA - Math.sin(a0)) / k;
          const cup = qs * 0.3 * Y.hw * ph * ph * w * w; rc -= cup * cA; zc += cup * sA;        // a petal is cupped across its width
          const d = lerp(ph * PI / Y.m, ph * w * Y.hw / Math.max(rc, 0.7), qs), an = g.thc[i] + d + rot;
          fx = rc * Math.cos(an); fy = rc * Math.sin(an); fz = zc; bw = lerp(1, 0.58 + 0.42 * w, qs); }
        x += (fx - x) * u; y += (fy - y) * u; z = fz * u; bw = lerp(1, bw, u);
      }
      z -= zoff;
      P[j3] = x; P[j3 + 1] = y * ctl - z * stl; P[j3 + 2] = y * stl + z * ctl;
      const q3 = Math.round(rho * 256) * 3, b = g.br[i] * bw * lerp(1, 0.6, u * smooth(0.75, 1, rho)); C[j3] = lut[q3] * b; C[j3 + 1] = lut[q3 + 1] * b; C[j3 + 2] = lut[q3 + 2] * b;
      S[i] = g.sz[i] * (1 + 0.22 * Math.sin(t * 2.6 + g.br[i] * 40));
    }
  }

  // public: the open flower, leaning back toward the rest camera, turning and breathing
  G3.form("flower", f => { const g = geom(); return tl => bloom(f, g, tl, 1, 1, 0.07 * tl, -0.95, 1.5); });

  // the scene's own form, on the film's clock: core -> twelve seeds -> head -> bowl -> flower
  G3.form("s7-life", f => {
    const g = geom(), sx = new Float32Array(NS), sy = new Float32Array(NS), sz = new Float32Array(NS), se = new Float32Array(NS), lut = g.lut, ink = G3.rgb("ink"), warm = [0, 1, 2].map(k => lerp(ink[k], lut[k], 0.8));     // the core is warm, like the head's heart
    return t => {
      if (t >= tCurl) { bloom(f, g, t, ease(clamp((t - tCurl) / curlDur)), openAt(t), rotAt(t), 0, 0); const k = lerp(1.15, 1, smooth(tCurl, tCurl + 1.0, t)); for (let i = 0; i < N; i++) f.size[i] *= k; return; }
      const P = f.pos, C = f.col, S = f.size;
      let K = 0; for (let k = 0; k < NS; k++) { se[k] = ease(clamp((t - tk(k)) / sweep)); K += se[k]; }
      const gr = clamp((t - tSun) / growDur); if (gr > 0) K = NS * Math.pow(N / NS, gr);
      const c = gr > 0 ? lerp(C0 * Math.sqrt(NS), R, ease(gr)) / Math.sqrt(K) : C0, rot = rotAt(t), cr = Math.cos(rot), sr = Math.sin(rot);
      const cs = (1 + 0.05 * Math.sin(2.1 * t)) * Math.cbrt(Math.max(0, 1 - K / N)) * (1 - gr), sf = clamp(Math.sqrt(c / CF) * 1.15, 1, 4.6), bw = 0.6 + 0.02 * K;
      const Ke = K * (1 + 0.03 * smooth(0.5, 1, gr)), kap = 1 - smooth(0, 0.3, gr), shim = smooth(0.75, 1, gr), ks = 0.19 * c / C0;
      const cdim = (1 - 0.4 * smooth(tSeed - 0.3, tSeed + 1.2, t)) * (1 - smooth(0, 0.7, gr));   // the core steps back when the seeds are the subject, and is gone before the head is grown
      const halo = smooth(t0 + 1.2, t0 + 3.0, t) * (1 - smooth(tSeed - 1.0, tSeed + 0.2, t));      // the core breathes out a faint corona, then draws it back in
      for (let i = 0, j = 0; i < N; i++, j += 3) {
        const a = Ke - i; let x = g.core[j] * cs, y = g.core[j + 1] * cs, z = g.core[j + 2] * cs, r = 0, w = 0, hb = cdim;
        if (halo > 0 && g.br[i] < 0.65) { const hk = 1 + halo * (0.6 + 13 * (g.br[i] - 0.55)) * 2.4, an = (0.25 + 2 * (0.65 - g.br[i])) * (t - t0), ca = Math.cos(an), sa = Math.sin(an), hx = x * hk, hy = y * hk; x = hx * ca - hy * sa; y = hx * sa + hy * ca; z *= hk; hb *= 1 + 1.8 * halo; }
        if (a > 0) { r = c * Math.sqrt(i + 1); w = smooth(0, bw, a); let ct = g.ct[i], st = g.st[i];
          if (i < NS && i > 0 && se[i] < 1) { const an = i * GA - GA * (1 - se[i]); ct = Math.cos(an); st = Math.sin(an); }      // a new seed swings out, turned from the last
          x += (r * (ct * cr - st * sr) - x) * w; y += (r * (st * cr + ct * sr) - y) * w; z *= 1 - w; }
        if (i < NS) { sx[i] = x; sy[i] = y; sz[i] = z; }
        let q3 = Math.round(clamp(r / R) * 256) * 3, b = lerp(g.cb[i] * hb, g.br[i], w), size = lerp(g.csz[i], g.sz[i] * sf * (i < NS ? 1 + 0.8 * kap : 1), w) * (1 + 0.22 * shim * Math.sin(t * 2.6 + g.br[i] * 40));
        if (i >= KN0 && kap > 0) { const k = (i - KN0) % NS, wk = kap * smooth(0, 0.6, se[k]);           // the first twelve seeds are drawn as knots of points
          if (wk > 0) { x += (sx[k] + g.off[j] * ks - x) * wk; y += (sy[k] + g.off[j + 1] * ks - y) * wk; z += (sz[k] + g.off[j + 2] * ks - z) * wk;
            q3 = Math.round(clamp(Math.hypot(sx[k], sy[k]) / R) * 256) * 3; w = Math.max(w, wk); b = lerp(b, 0.95, wk); size = lerp(size, 1.0, wk); } }
        P[j] = x; P[j + 1] = y; P[j + 2] = z; S[i] = size;
        C[j] = lerp(warm[0], lut[q3], w) * b; C[j + 1] = lerp(warm[1], lut[q3 + 1], w) * b; C[j + 2] = lerp(warm[2], lut[q3 + 2], w) * b;
      }
    };
  });

  // ---- the points and the camera
  const PXU = 1483.6;                                          // pixels per world unit at distance 1 (fov 40)
  const lookFor = (az, el, dist, sx, sy) => { const dx = sx * dist / PXU, dy = sy * dist / PXU, rt = [Math.cos(az), 0, -Math.sin(az)], up = [-Math.sin(az) * Math.sin(el), Math.cos(el), -Math.cos(az) * Math.sin(el)];
    return [-(dx * rt[0] + dy * up[0]), -(dx * rt[1] + dy * up[1]), -(dx * rt[2] + dy * up[2])]; };   // puts the origin sx px right and sy px up of the frame's centre
  G3.morph(t0, "s7-life", { dur: 1.9, swirl: 0.9, clock: t => t });               // "Some things I make": everything falls into one core
  G3.cam.to(t0, { az: 0, el: 0, dist: 18, look: [0, 0, 0], fov: 40 }, { dur: 1.6 });
  G3.level.to(t0, 1, { dur: 0.8 }); G3.grain.to(t0, 1, { dur: 0.8 });
  G3.cam.to(t0 + 1.6, { dist: 11 }, { dur: tSeed - 0.3 - (t0 + 1.6) });           // a slow push in on the core
  G3.cam.to(tSeed - 0.3, { dist: 20 }, { dur: 0.3 + 2 * step });                  // back off to make room for the dozen
  G3.cam.to(tSun, { dist: 33.5 }, { dur: growDur + 0.4 });
  G3.level.to(tSun + 0.3, 1.9, { dur: growDur }); G3.grain.to(tSun + 0.3, 1.15, { dur: growDur });                         // "a sunflower appears": back off as the head grows
  G3.cam.to(tNeigh, { dist: 8.2, look: [2.5, 1.25, 0] }, { dur: Math.max(1.2, Math.min(2.3, tSince - tNeigh - 0.1)) });            // "where its neighbours are": in, until the spirals fill the frame
  G3.grain.to(tNeigh, 0.9, { dur: 1.6 });
  const tPull = tSince, pullDur = clamp(tL1 - tSince, 1.8, 2.9), azF = 0.3, elF = -0.88, dF = 32;                   // "a poem": pull back and tilt as the head curls
  G3.cam.to(tPull, { az: azF, el: elF, dist: dF, look: lookFor(azF, elF, dF, 300, 35) }, { dur: pullDur });
  G3.grain.to(tPull, 1.05, { dur: 2.0 }); G3.level.to(tPull, 1.1, { dur: 2.0 });
  G3.cam.to(tPull + pullDur, { az: azF + 0.2, dist: dF - 2, look: lookFor(azF + 0.2, elF, dF - 2, 395, 35) }, { dur: Math.max(1, p.end - tPull - pullDur), ease: "sine" });
  film.hit("pluck", tSeed + 0.1, { pitch: 2 }); film.hit("rise", tSun); film.hit("thock", tPoem); film.hit("chord", tStill + 0.4);

  // ---- the 2D layer
  const S = film.scene(p);
  G3.overlay(S, (ctx, t) => {                                                      // a soft shade under the running head while the spirals fill the frame
    const z = clamp((30 - G3.cam.at(t).dist) / 12) * G3.fade(t, tSun, tL1, 0.4); if (z <= 0) return;
    const gr = ctx.createRadialGradient(1715, 72, 10, 1715, 72, 170); gr.addColorStop(0, `rgba(5,7,12,${0.85 * z})`); gr.addColorStop(0.6, `rgba(5,7,12,${0.5 * z})`); gr.addColorStop(1, "rgba(5,7,12,0)");
    ctx.fillStyle = gr; ctx.fillRect(1520, 0, 400, 250);
  }, { id: "s7-shade" });
  G3.overlay(S, (ctx, t) => {                                                      // the turn from the last seed to the new one, drawn as an arc
    const al = G3.fade(t, tSeed, tSun + 0.5, 0.35); if (al <= 0) return;
    let k = Math.min(NS - 1, Math.floor((t - tSeed) / step)); if (k < 1) return;
    const e = ease(clamp((t - tk(k)) / sweep)), A0 = (k - 1) * GA, A1 = A0 + GA * e, RS = 5.95, RA = 5.45, RI = 1.0;
    const at = (a, r) => G3.project([r * Math.cos(a), r * Math.sin(a), 0], t);
    G3.line3(ctx, t, at(A0, RI), at(A0, RS), { color: "muted", lw: 2, alpha: 0.55 * al, dash: [6, 8] });
    G3.line3(ctx, t, at(A1, RI), at(A1, RS), { color: "accent", lw: 2.5, alpha: 0.9 * al });
    for (let i = 0; i <= k; i++) { const ei = i < k ? 1 : smooth(0.92, 1, e); if (ei > 0) G3.dot3(ctx, t, at(i * GA, C0 * Math.sqrt(i + 1)), { ring: true, r: 28, lw: 2, color: "yellow", alpha: 0.75 * al * ei }); }
    ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = ctx.fillStyle = G3.css("accent"); ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath();
    const n = Math.max(2, Math.ceil(48 * e)); for (let q = 0; q <= n; q++) { const s = at(A0 + GA * e * q / n, RA); q ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); } ctx.stroke();
    if (e > 0.2) { const s = at(A1, RA), d = A1 + PI / 2, h = 15, sxn = Math.cos(d), syn = -Math.sin(d);                    // arrowhead along the turn (screen y points down)
      const bx = s.x - sxn * h * 0.2, by = s.y - syn * h * 0.2, ang = Math.atan2(syn, sxn); ctx.beginPath(); ctx.moveTo(bx + sxn * h, by + syn * h);
      ctx.lineTo(bx - h * Math.cos(ang - 1.1) * 0.9, by - h * Math.sin(ang - 1.1) * 0.9); ctx.lineTo(bx - h * Math.cos(ang + 1.1) * 0.9, by - h * Math.sin(ang + 1.1) * 0.9); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }, { id: "s7-turn" });
  const angle = S.number(0, { x: 120, y: 742, size: "title", font: "mono", fmt: v => v.toFixed(1) + "°", id: "s7-angle" })
    .show(tAngle, { by: "fade" }).to(tCount, { value: Math.round(DEG * 10) / 10 }, { dur: tHalf - tCount, ease: "sine" });     // the count runs under "about one hundred thirty-seven" and lands on "and a half"
  film.hit("pluck", tHalf, { pitch: 5 });
  const angleLabel = S.text("the golden angle", { x: 124, y: 866, size: "label", color: "muted", id: "s7-angle-label" }).show(tAngle + 0.3);
  const credit = S.text("Vogel, 1979", { x: 124, y: 926, size: "note", color: "muted", id: "s7-credit" }).show(p.at("step it outward"));
  [angle, angleLabel, credit].forEach(n => n.hide(tNeigh - 0.15));
  // the poem, lower third, each line arriving on its own words
  // The poem sits on its own layer, which runs on into paragraph 8, so the three lines can stay up with the open flower.
  // The layer fades when the next scene's camera starts to move (that is when its morph takes the flower apart): never
  // before this paragraph's own fade at p.end - 0.3, never later than p.end + POEM_HOLD. The time is read from the camera
  // tracks at draw time, once every scene is built, so it follows wherever scene 8 puts its first move.
  const SP = film.scene(p, film.para(8)), POEM_HOLD = 1.0, azEnd = azF + 0.2, dEnd = dF - 2;
  let tGo = null;
  const goAt = () => { if (tGo != null) return tGo;
    for (let q = p.end - 0.3; q < p.end + POEM_HOLD; q += 1 / 60) { const c = G3.cam.at(q);
      if (Math.abs(c.el - elF) > 0.002 || (q > p.end + 0.02 && (Math.abs(c.az - azEnd) > 0.002 || Math.abs(c.dist - dEnd) > 0.05))) return (tGo = q); }
    return (tGo = p.end + POEM_HOLD); };
  [["Thirty thousand lights.", tL1, p.after("Thirty thousand lights")], ["None of them knows the picture.", tL2, p.after("knows the picture")], ["Still, the flower blooms.", tStill - 0.1, tStill + 0.4]]
    .forEach(([line, a, b], i) => SP.text(line, { x: 120, y: 748 + i * 82, size: "head", font: "display", color: "ink", id: "s7-poem-" + (i + 1) }).show(a, { by: "words", dur: clamp(b - a, 0.5, 1.6) }).hide(p.end + POEM_HOLD));
  SP.canvas((ctx, t) => { if (t > p.end - 0.4) SP.el.style.opacity = (SP.op * (1 - smooth(goAt(), goAt() + 0.3, t))).toFixed(4); }, { w: 2, h: 2, overlap: true, id: "s7-poem-hold" });
} });
