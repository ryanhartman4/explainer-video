// scene 6, "One law": two galaxies of massless stars fall past each other and throw out tidal tails.
// A restricted N-body run after Toomre and Toomre (1972): two point-mass cores on a bound orbit (e = 0.5), each with
// a disc of 15,000 test stars on circular orbits. Every star feels both cores and nothing else. Leapfrog, run once.
// The force is softened, as in most such runs: the pull of a core at distance r is r / (r² + e²)^1.5 with e = 0.32 of
// the closest approach. That is 86% of the on-screen law F = G m M / r² at r = 1, 60% at r = 0.5 (where the tail stars
// start) and 32% at r = 0.3. A smaller e (0.2 was tried) winds the inner arms into rings before the pass. The tails
// are tidal either way.
// Hues: blue = stars born in galaxy A, yellow = stars born in galaxy B, accent = the one marked star and the law.
(window.SCENES = window.SCENES || []).push({ n: 6, build(film, p, G3) {
  const N = G3.N, { hash, clamp, lerp, smooth, fade } = G3;
  if (N !== 30000) film.problem(`s6: the narration says thirty thousand stars, the film has ${N}`);

  // ---- the run. Units: G = 1, each core has mass 1, closest approach = 1.
  const ECC = 0.5, SMA = 1 / (1 - ECC), EPS2 = 0.32 * 0.32, DT = 0.02, EVERY = 4, SNAP = DT * EVERY;
  const T_PERI = 3.5;                                                           // the run starts this long before the closest pass
  const T_AFTER = 3.3, T_EXTRA = 1.2, STEPS = Math.ceil((T_PERI + T_AFTER + T_EXTRA) / DT / EVERY) * EVERY, NS = STEPS / EVERY + 1;
  const Q = 1 / 1700, PHI = 1.75;                                                // snapshot grid (Int16), and the direction of the line of apsides
  const R_MIN = 0.01, R_MAX = 0.75, H_DISC = 0.3;                               // exponential disc, cut at 0.75 of the closest approach
  const K = 3.0, S_OPEN = 0.2;                                                  // world units per closest approach; the arms are an open two-armed spiral at run time S_OPEN
  const DISCS = [{ inc: 0.42, node: 0.6 }, { inc: 1.0, node: 3.9 }];            // both discs turn the way the orbit does, tilted differently
  let RUN = null;
  function run() {
    if (RUN) return RUN;
    const px = new Float64Array(N), py = new Float64Array(N), pz = new Float64Array(N), vx = new Float64Array(N), vy = new Float64Array(N), vz = new Float64Array(N);
    const snaps = new Int16Array(NS * N * 3), cores = new Float32Array(NS * 4), r0 = new Float32Array(N);
    // the relative orbit of the cores (core B minus core A), in the x-y plane, starting at apocentre
    const nn = Math.sqrt(2 / (SMA * SMA * SMA)), MA = -nn * T_PERI, cph = Math.cos(PHI), sph = Math.sin(PHI), bb = SMA * Math.sqrt(1 - ECC * ECC);
    let EA = MA; for (let k = 0; k < 30; k++) EA -= (EA - ECC * Math.sin(EA) - MA) / (1 - ECC * Math.cos(EA));       // Kepler's equation
    const Ed = nn / (1 - ECC * Math.cos(EA)), X = SMA * (Math.cos(EA) - ECC), Y = bb * Math.sin(EA), VX = -SMA * Math.sin(EA) * Ed, VY = bb * Math.cos(EA) * Ed;
    let rx = X * cph - Y * sph, ry = X * sph + Y * cph, wx = VX * cph - VY * sph, wy = VX * sph + VY * cph;
    // inverse CDF of the radial profile r exp(-r / h) on [R_MIN, R_MAX]
    const cdf = x => 1 - (1 + x / H_DISC) * Math.exp(-x / H_DISC), c0 = cdf(R_MIN), c1 = cdf(R_MAX);
    const radius = u => { const want = c0 + u * (c1 - c0); let lo = R_MIN, hi = R_MAX; for (let k = 0; k < 26; k++) { const m = (lo + hi) / 2; if (cdf(m) < want) lo = m; else hi = m; } return (lo + hi) / 2; };
    for (let i = 0; i < N; i++) {
      const g = i & 1, d = DISCS[g], s = g ? 0.5 : -0.5, m = i >> 1;
      const r = radius((m + hash(i, 601)) / (N / 2)), arm = hash(i, 602) < 0.55, om = Math.pow(r * r + EPS2, -0.75);
      const ph = arm ? (hash(i, 603) < 0.5 ? 0 : Math.PI) - 2.6 * r - om * S_OPEN + (hash(i, 604) + hash(i, 605) - 1) * 0.8 + g * 1.3 : hash(i, 606) * 6.2832;
      const inc = d.inc + (hash(i, 607) + hash(i, 608) - 1) * 0.07, node = d.node + (hash(i, 609) - 0.5) * 0.14;   // each star's own orbit plane: a thin disc
      const cn = Math.cos(node), sn = Math.sin(node), ci = Math.cos(inc), si = Math.sin(inc);
      const e1 = [cn, sn, 0], e2 = [-sn * ci, cn * ci, si];                     // e1 x e2 = the disc's spin axis, which leans inc away from +z
      const v = r * om, c = Math.cos(ph), sp = Math.sin(ph);
      px[i] = s * rx + r * (c * e1[0] + sp * e2[0]); py[i] = s * ry + r * (c * e1[1] + sp * e2[1]); pz[i] = r * (c * e1[2] + sp * e2[2]);
      vx[i] = s * wx + v * (-sp * e1[0] + c * e2[0]); vy[i] = s * wy + v * (-sp * e1[1] + c * e2[1]); vz[i] = v * (-sp * e1[2] + c * e2[2]);
      r0[i] = r;
    }
    const store = k => { const o = k * N * 3; for (let i = 0, j = o; i < N; i++, j += 3) { snaps[j] = clamp(Math.round(px[i] / Q), -32767, 32767); snaps[j + 1] = clamp(Math.round(py[i] / Q), -32767, 32767); snaps[j + 2] = clamp(Math.round(pz[i] / Q), -32767, 32767); }
      cores[k * 4] = -rx / 2; cores[k * 4 + 1] = -ry / 2; cores[k * 4 + 2] = rx / 2; cores[k * 4 + 3] = ry / 2; };
    store(0);
    const h = DT / 2; let sepMin = 1e9, kMin = 0;
    for (let st = 1; st <= STEPS; st++) {                                       // leapfrog: drift half, kick, drift half
      rx += wx * h; ry += wy * h;
      const rr = rx * rx + ry * ry, ir = 2 / (rr * Math.sqrt(rr)); wx -= rx * ir * DT; wy -= ry * ir * DT;
      const ax = -rx / 2, ay = -ry / 2, bx = rx / 2, by = ry / 2;
      for (let i = 0; i < N; i++) {
        const x = (px[i] += vx[i] * h), y = (py[i] += vy[i] * h), z = (pz[i] += vz[i] * h);
        const d1x = x - ax, d1y = y - ay, d2x = x - bx, d2y = y - by, zz = z * z + EPS2;
        const q1 = d1x * d1x + d1y * d1y + zz, q2 = d2x * d2x + d2y * d2y + zz, i1 = DT / (q1 * Math.sqrt(q1)), i2 = DT / (q2 * Math.sqrt(q2));
        const ux = (vx[i] -= d1x * i1 + d2x * i2), uy = (vy[i] -= d1y * i1 + d2y * i2), uz = (vz[i] -= z * (i1 + i2));
        px[i] = x + ux * h; py[i] = y + uy * h; pz[i] = z + uz * h;
      }
      rx += wx * h; ry += wy * h;
      const sep = Math.hypot(rx, ry); if (sep < sepMin) { sepMin = sep; kMin = st; }
      if (st % EVERY === 0) store(st / EVERY);
    }
    // facts the narration leans on, checked on the run itself
    const kEnd = Math.round((T_PERI + T_AFTER) / SNAP), oE = kEnd * N * 3, cE = kEnd * 4; let far = 0, best = -1, bestD = 0; const cand = [], reach = new Float32Array(N);
    for (let i = 0; i < N; i++) { const x = snaps[oE + i * 3] * Q, y = snaps[oE + i * 3 + 1] * Q, z = snaps[oE + i * 3 + 2] * Q;
      const dA = Math.hypot(x - cores[cE], y - cores[cE + 1], z), dB = Math.hypot(x - cores[cE + 2], y - cores[cE + 3], z);
      if (Math.min(dA, dB) > 1.5) far++;
      reach[i] = smooth(1.2, 2.8, i & 1 ? dB : dA);                             // 0..1: how far the star ends from the core it was born around (1 = out in a tail)
      if (!(i & 1) && r0[i] > 0.5 && r0[i] < 0.66 && dA > 1.8 && dB > dA) cand.push([dA, i]); }
    cand.sort((a, b) => a[0] - b[0]); if (cand.length) { best = cand[Math.floor(cand.length * 0.55)][1]; bestD = cand[Math.floor(cand.length * 0.55)][0]; }
    if (Math.abs(kMin * DT - T_PERI) > 0.1 || Math.abs(sepMin - 1) > 0.02) film.problem(`s6: the closest pass is off: separation ${sepMin.toFixed(3)} at ${(kMin * DT).toFixed(2)}`);
    if (far < 2000) film.problem(`s6: the tails are not long: only ${far} stars are beyond 1.5 times the closest approach`);
    if (best < 0) film.problem("s6: no star of galaxy A ends in a tail to mark");
    RUN = { snaps, cores, r0, reach, star: Math.max(0, best), far, kEnd };
    return RUN;
  }
  // the state at run time s (0 = apocentre), Catmull-Rom through four snapshots, written as K * position into out
  function sample(s, out) {
    const R = run(), u = clamp(s / SNAP, 0, NS - 1.0001), k = Math.floor(u), f = u - k, f2 = f * f, f3 = f2 * f, n3 = N * 3;
    const w0 = (-0.5 * f3 + f2 - 0.5 * f) * Q * K, w1 = (1.5 * f3 - 2.5 * f2 + 1) * Q * K, w2 = (-1.5 * f3 + 2 * f2 + 0.5 * f) * Q * K, w3 = (0.5 * f3 - 0.5 * f2) * Q * K;
    const a = Math.max(0, k - 1) * n3, b = k * n3, c = Math.min(NS - 1, k + 1) * n3, d = Math.min(NS - 1, k + 2) * n3, sn = R.snaps;
    for (let j = 0; j < n3; j++) out[j] = w0 * sn[a + j] + w1 * sn[b + j] + w2 * sn[c + j] + w3 * sn[d + j];
  }
  function coreAt(s, g) { const R = run(), u = clamp(s / SNAP, 0, NS - 1.0001), k = Math.floor(u), f = u - k, o = k * 4 + g * 2; return [lerp(R.cores[o], R.cores[o + 4], f) * K, lerp(R.cores[o + 1], R.cores[o + 5], f) * K, 0]; }
  function dress(f) {
    const R = run(), blue = G3.rgb("blue"), ink = G3.rgb("ink"), yel = G3.rgb("yellow"), acc = G3.rgb("accent");
    for (let i = 0; i < N; i++) { const g = i & 1, r = R.r0[i] / R_MAX, k = hash(i, 611), b = ((0.25 + 0.65 * smooth(0.05, 0.7, r)) * (0.7 + 0.7 * smooth(0.25, 0.7, r)) + 0.3 * (1 - smooth(0.0, 0.1, r))) * (0.7 + 0.5 * hash(i, 612));
      // brightness rises outward, so the outer disc (the stars that become tails) carries the light and the cores do not burn to white; a small nucleus fills
      // the centre
      const c0 = g ? yel : blue, c1 = g ? (k < 0.5 ? acc : ink) : ink, m = g ? 0.1 + 0.45 * k : 0.08 + 0.5 * k * (1 - r * 0.6);
      G3.tint(f, i, [lerp(c0[0], c1[0], m), lerp(c0[1], c1[1], m), lerp(c0[2], c1[2], m)], b);
      f.size[i] = 0.62 + 0.5 * hash(i, 613) + (hash(i, 614) > 0.985 ? 1.3 : 0) + 0.35 * smooth(0.5, 0.75, r); }
    return Float32Array.from(f.size);
  }
  // stars that end far from their core (the tail ends) grow by up to 0.45 * k: size keeps the thin far ends visible without washing out their hue
  function swell(f, base, k) { const reach = run().reach, a = 0.45 * k; for (let i = 0; i < N; i++) f.size[i] = base[i] + a * reach[i]; }
  // the scene's form: local time is run time
  G3.form("s6-run", f => { const base = dress(f); return (tl, f) => { sample(tl, f.pos); swell(f, base, smooth(T_PERI + 0.4, T_PERI + 2.4, tl)); }; });   // the swell comes on as the tails leave
  // the public form: the two galaxies after the pass, tails out, seen as this scene leaves them, still slowly unwinding
  const VIEW = { az: -0.35, el: 0.5 };
  G3.form("galaxy", f => {
    swell(f, dress(f), 1); const tmp = new Float32Array(N * 3), s0 = T_PERI + T_AFTER;
    const ca = Math.cos(-VIEW.az), sa = Math.sin(-VIEW.az), ce = Math.cos(VIEW.el), se = Math.sin(VIEW.el);
    const turn = (x, y, z) => { const x1 = x * ca + z * sa, z1 = -x * sa + z * ca; return [x1, y * ce - z1 * se, y * se + z1 * ce]; };
    sample(s0, tmp); const xs = [], ys = [];
    for (let i = 0; i < N; i += 3) { const q = turn(tmp[i * 3], tmp[i * 3 + 1], tmp[i * 3 + 2]); xs.push(q[0]); ys.push(q[1]); }
    xs.sort((a, b) => a - b); ys.sort((a, b) => a - b); const lo = Math.floor(xs.length * 0.004), hi = xs.length - 1 - lo;
    const cx = (xs[lo] + xs[hi]) / 2, cy = (ys[lo] + ys[hi]) / 2, sc = Math.min(27 / (xs[hi] - xs[lo]), 13.2 / (ys[hi] - ys[lo]));
    return (tl, f) => { sample(s0 + Math.min(1.1, Math.max(0, tl) * 0.035), tmp);
      for (let j = 0; j < N * 3; j += 3) { const x = tmp[j], y = tmp[j + 1], z = tmp[j + 2], x1 = x * ca + z * sa, z1 = -x * sa + z * ca; f.pos[j] = (x1 - cx) * sc; f.pos[j + 1] = (y * ce - z1 * se - cy) * sc; f.pos[j + 2] = (y * se + z1 * ce) * sc; } };
  });

  // ---- the points and the camera
  const t0 = p.start - 0.8, tUni = p.at("a small universe"), tStars = p.at("thirty thousand stars"), tLaw = p.at("one law"), tPull = p.at("pull of both");
  const tNobody = p.at("Nobody drew"), tTails = p.at("those long tails"), tOut = p.at("out of the law"), tBro = p.at("Two brothers"), tWear = p.at("real galaxies wear");
  const tPass = tNobody - 0.2;                                                  // the closest pass, just as the tails are named
  const clock = t => (t < tPass ? T_PERI * (t - t0) / (tPass - t0) : T_PERI + T_AFTER * (1 - Math.pow(1 - Math.min(1, (t - tPass) / (p.end - tPass)), 2)));
  const AT = [0, 0, 0];
  const seg = G3.morph(t0, "s6-run", { dur: 1.9, at: AT, swirl: 0.9, clock });
  const shot = (dist, px, py) => [-px * dist / 1483, py * dist / 1483, 0];      // a look point that puts the origin px right of and py above the frame's centre
  const L_NEAR = 0.75;                                                          // close on the dense discs the outer arms would burn to white at full level
  G3.level.to(t0, L_NEAR, { dur: 0.8 }); G3.grain.to(t0, 0.8, { dur: 0.8 });
  G3.cam.to(t0, { az: 0.1, el: 0.05, dist: 19, look: shot(19, 190, 0), fov: 40 }, { dur: 1.6 });
  G3.cam.to(tUni, { az: -0.08, el: 0.14, dist: 18, look: shot(18, 190, 0) }, { dur: tPass - tUni, ease: "sine" });       // close on the two discs, drifting
  // the hero move, in two legs that each start and end at rest: back and up across "those long tails. They fall out of the law.", then a slow drift under the credit
  G3.cam.to(tPass - 0.3, { az: -0.25, el: 0.36, dist: 25, look: shot(25, 250, 0) }, { dur: tBro - tPass + 0.4, ease: "inOut" });
  G3.cam.to(tBro + 0.1, { az: VIEW.az, el: VIEW.el, dist: 27, look: shot(27, 300, 0) }, { dur: p.end - tBro - 0.1, ease: "sine" });
  G3.grain.to(tPass, 1.2, { dur: p.end - tPass });                             // keep the thinning tails luminous as the camera backs away
  film.hit("thock", t0 + 1.5); film.hit("thump", tPass);

  // ---- the 2D layer
  const S = film.scene(p, { fadeOut: 1.2 });
  S.hud.text("One law", { x: 120, y: 96, size: "head", id: "s6-head" }).show(tUni);
  const count = S.number(0, { x: 120, y: 612, size: "head", font: "mono", fmt: v => Math.round(v).toLocaleString("en-US"), id: "s6-count" })
    .show(tStars, { by: "fade" }).to(tStars, { value: N }, { dur: 1.3, ease: "out" });
  const countLabel = S.text("stars", { x: 372, y: 636, size: "label", color: "muted", id: "s6-count-label" }).show(tStars + 0.2);
  const lawLabel = S.text("gravity", { x: 120, y: 748, size: "label", color: "muted", id: "s6-law-label" }).show(p.at("gravity"));
  const law = S.text("F = G m M / r²", { x: 120, y: 796, size: "head", font: "mono", id: "s6-law" }).show(tLaw);
  film.hit("pluck", tLaw, { pitch: 2 });
  [count, countLabel].forEach(n => n.hide(tPull - 0.25));
  law.to(tOut, { color: "accent" }, { dur: 0.4 }).pulse(tOut + 0.05);           // "out of the law"
  lawLabel.to(tOut, { color: "ink" }, { dur: 0.4 });
  S.text("Toomre and Toomre, 1972", { x: 120, y: 896, size: "label", color: "ink", id: "s6-credit" }).show(tBro);
  S.text("as in the Antennae galaxies", { x: 120, y: 948, size: "note", color: "muted", id: "s6-note" }).show(p.at("explained the tails"));   // early enough to read before the paragraph ends
  film.hit("pluck", tBro, { pitch: 5 });

  const tLinesOff = tNobody - 0.15;
  const tLift = Math.max(tLinesOff + 0.6, tPass);
  G3.level.to(tPull - 0.1, 0.6 * L_NEAR, { dur: 0.5 }).to(tLinesOff, L_NEAR, { dur: 0.6 })   // the stars step back while the two pulls are the subject
    .to(tLift, 1, { dur: tBro - tLift });                                       // full level as the camera backs away and the stars spread into tails
  // the marked star and its two pulls, drawn over the points
  G3.overlay(S, (ctx, t) => {
    if (t < tPull - 0.05) return;
    const R = run(), s = clock(t), u = clamp(s / SNAP, 0, NS - 1.0001), k = Math.floor(u), f = u - k, j = R.star * 3, o = k * N * 3 + j, sn = R.snaps;
    const sl = [lerp(sn[o], sn[o + N * 3], f) * Q * K, lerp(sn[o + 1], sn[o + N * 3 + 1], f) * Q * K, lerp(sn[o + 2], sn[o + N * 3 + 2], f) * Q * K], star = seg.world(sl, t);
    const a = fade(t, tPull, tLinesOff, 0.35), cl = [coreAt(s, 0), coreAt(s, 1)];
    // each line is as heavy as that core's pull on the star, by the same softened law the run uses: the near core gets the thick arrow
    const w = cl.map(c => { const d2 = (sl[0] - c[0]) ** 2 + (sl[1] - c[1]) ** 2 + (sl[2] - c[2]) ** 2; return Math.sqrt(d2) / Math.pow(d2 + EPS2 * K * K, 1.5); }), wMax = Math.max(w[0], w[1]);
    [0, 1].forEach(g => { const c = seg.world(cl[g], t), ratio = w[g] / wMax;
      const al = clamp((tLinesOff - t) / 0.35), dr = G3.ease(clamp((t - tPull - g * 0.3) / 0.55)), lw = 2.5 + 4 * ratio;
      G3.line3(ctx, t, star, c, { color: "bg", lw: lw + 5, alpha: 0.7 * al, draw: dr });
      G3.line3(ctx, t, star, c, { color: "accent", lw, alpha: al, draw: dr, head: 12 + 8 * ratio });
      G3.dot3(ctx, t, c, { color: "ink", r: 5, alpha: a }); });
    const gone = clamp((p.end - 0.85 - t) / 0.3);                               // the mark leaves before scene 7 takes the points
    G3.dot3(ctx, t, star, { ring: true, r: 13, lw: 3, color: "accent", alpha: clamp((t - tPull) / 0.3) * (t > tLinesOff ? 0.85 : 1) * gone });
    G3.dot3(ctx, t, star, { r: 4, color: "accent", alpha: clamp((t - tPull) / 0.3) * gone });
  }, { id: "s6-overlay" });
} });
