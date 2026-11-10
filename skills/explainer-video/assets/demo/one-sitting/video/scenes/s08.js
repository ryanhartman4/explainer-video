// scene 8, "How this film was made": one ball -> nine scene miniatures with builder rings and reviewer satellites ->
// the film's own soundtrack as a scrolling waveform -> the whole film end to end, with a dot at now.
// Hues in this scene: ink = builders and their progress rings, green = reviewers, accent = the voice, blue = the music.
(window.SCENES = window.SCENES || []).push({ n: 8, build(film, p, G3) {
  const N = G3.N, { hash, clamp, lerp, ease, smooth } = G3, TAU = Math.PI * 2;
  const SES = window.SESSION || {}, WV = window.WAVE || { peaks: [] };
  if (!(SES.builders > 0) || !(SES.reviewers > 0)) film.problem("s8: SESSION has no builder or reviewer count");
  const NB = Math.max(1, Math.round(SES.builders || 1)), NR = Math.max(1, Math.round(SES.reviewers || 1));
  const paras = film.paras, NS = 9, D = film.duration;
  if (paras.length !== NS) film.problem(`s8: the grid is laid out for 9 scenes, the film has ${paras.length}`);

  // ---- cues
  const t0 = p.start + 0.4, tSplit = p.at("split the film"), tCopy = p.at("copies of myself"), tSide = p.at("side by side"), tGather = p.at("more copies"),
    tWave = p.at("sound is computed"), tVoice = p.at("a speech model"), tMus = p.at("music comes"), tMusic = p.at("note by note"), tZoom = p.at("This line"), tWhole = p.at("own soundtrack"), tDot = p.at("and this"),
    tPush = Math.min(p.at("did not make"), t0 + 1.6);                            // the push in starts as the ball lands, or on the words if they come first

  // ---- geometry of the first half: a 3 x 3 grid of scene miniatures on the right two thirds of the frame
  const CX = [-2.98, 6.42, 15.83], CY = [6.3, -0.05, -6.4], RM = 1.6, R1 = 2.12, R2 = 2.5;      // mini radius, builder ring, reviewer orbit
  const cell = k => [CX[k % 3], CY[(k / 3) | 0], 0], BALL = [6.42, 0, 0];
  const perRev = Math.min(230, Math.floor(6000 / NR)), nRev = perRev * NR, M = N - nRev;          // points 0..M-1 are the minis, the rest the reviewers
  const MS = 1.12, SPIN = [1, 1, 0, 0, 0, 0, 1, 0, 0], SWAY = [0, 0, 0.55, 0.2, 0.5, 0.45, 0, 0.4, 0.55], RX = [0.25, 0.2, 0.42, 0.08, 0, 0.1, 1.02, 0, 0], YAW = [0, 0, 0, 0.3, 0, 0, 0, 0, 0];   // YAW: the butterfly sways about the angle that shows both wings
  let base = null;
  function minis() {                                                             // the nine miniatures in their own coordinates, built once
    if (base) return base;
    base = new Float32Array(M * 3);
    const cnt = k => Math.ceil((M - k) / NS), c3 = cnt(3), lz = new Float32Array(c3 * 3);
    { let x = 0.1, y = 0, z = 0; const dt = 0.008, d = (x, y, z) => [10 * (y - x), x * (28 - z) - y, x * y - (8 / 3) * z];   // Lorenz, RK4
      const step = () => { const a = d(x, y, z), b = d(x + a[0] * dt / 2, y + a[1] * dt / 2, z + a[2] * dt / 2), c = d(x + b[0] * dt / 2, y + b[1] * dt / 2, z + b[2] * dt / 2), e = d(x + c[0] * dt, y + c[1] * dt, z + c[2] * dt);
        x += dt * (a[0] + 2 * b[0] + 2 * c[0] + e[0]) / 6; y += dt * (a[1] + 2 * b[1] + 2 * c[1] + e[1]) / 6; z += dt * (a[2] + 2 * b[2] + 2 * c[2] + e[2]) / 6; };
      for (let s = 0; s < 800; s++) step();
      for (let m = 0; m < c3; m++) { step(); step(); step(); step(); lz[m * 3] = x * 0.072; lz[m * 3 + 1] = (z - 25) * 0.062; lz[m * 3 + 2] = y * 0.05; } }
    const c8 = cnt(8), q8 = { pos: new Float32Array(c8 * 3), col: new Float32Array(c8 * 3), size: new Float32Array(c8) };
    G3.textForm("?", { width: 1.5, depth: 0.3 })(q8, c8);
    let qy0 = 1e9, qy1 = -1e9, qx0 = 1e9, qx1 = -1e9; for (let m = 0; m < c8; m++) { const y = q8.pos[m * 3 + 1], x = q8.pos[m * 3]; if (y < qy0) qy0 = y; if (y > qy1) qy1 = y; if (x < qx0) qx0 = x; if (x > qx1) qx1 = x; }
    const qs = 2.9 / Math.max(0.01, qy1 - qy0), qcx = (qx0 + qx1) / 2;
    const KN = [[-0.95, 0.6, 0.2], [0.8, 0.85, -0.3], [0.1, -0.15, 0.9], [-0.55, -0.95, -0.5], [1.0, -0.6, 0.3]];
    for (let i = 0; i < M; i++) {
      const k = i % NS, m = (i / NS) | 0, c = cnt(k), j = i * 3, h1 = hash(i, 801), h2 = hash(i, 802), h3 = hash(i, 803);
      let x = 0, y = 0, z = 0;
      if (k === 0) {                                                             // 1: the globe with its ring
        const n1 = Math.floor(c * 0.76);
        if (m < n1) { const yy = 1 - 2 * (m + 0.5) / n1, r = Math.sqrt(1 - yy * yy), a = m * 2.39996323; x = Math.cos(a) * r * 1.02; y = yy * 1.02; z = Math.sin(a) * r * 1.02; }
        else { const a = h1 * TAU, rr = 1.36 + 0.3 * h2, zz = Math.sin(a) * rr; x = Math.cos(a) * rr; y = -zz * 0.4; z = zz * 0.92; }
      } else if (k === 1) {                                                      // 2: word clusters
        if (h3 < 0.16) { const r = 1.5 * Math.cbrt(h1), a = h2 * TAU, u = hash(i, 804) * 2 - 1, s = Math.sqrt(1 - u * u); x = r * s * Math.cos(a); y = r * u; z = r * s * Math.sin(a); }
        else { const q = KN[m % 5], r = 0.34 * Math.pow(h1, 0.7), a = h2 * TAU, u = hash(i, 804) * 2 - 1, s = Math.sqrt(1 - u * u); x = q[0] + r * s * Math.cos(a); y = q[1] + r * u; z = q[2] + r * s * Math.sin(a); }
      } else if (k === 2) {                                                      // 3: the stacked sheets of a network
        const sh = m % 5, q = (m / 5) | 0, side = Math.ceil(Math.sqrt(c / 5)); x = ((q % side) / (side - 1) - 0.5) * 2.5; z = (((q / side) | 0) / (side - 1) - 0.5) * 2.5; y = (sh - 2) * 0.56;
      } else if (k === 3) { x = lz[m * 3]; y = lz[m * 3 + 1]; z = lz[m * 3 + 2];  // 4: the butterfly
      } else if (k === 4) { const side = Math.ceil(Math.sqrt(c)); x = ((m % side) / (side - 1) - 0.5) * 2.5; y = (((m / side) | 0) / (side - 1) - 0.5) * 2.5; z = 0;   // 5: the grid of tests
      } else if (k === 5) {                                                      // 6: two galaxies and their tails
        const g = m & 1, sg = g ? 1 : -1, ox = sg * 0.72, oy = sg * -0.34;
        if (h3 < 0.2) { const s = h1, a = (g ? 0.5 : 3.64) + 1.9 * s, rr = 0.55 + 1.15 * s; x = ox + Math.cos(a) * rr * 0.9 + (h2 - 0.5) * 0.14 * (1 + s); y = oy + Math.sin(a) * rr * 0.62 + (hash(i, 804) - 0.5) * 0.12; z = (hash(i, 805) - 0.5) * 0.3; }
        else { const r = Math.min(0.75, -0.2 * Math.log(1 - h1 * 0.97)), a = (m & 2 ? Math.PI : 0) + 2.4 * Math.log(1 + r / 0.08) * sg + (h2 - 0.5) * 0.9, ti = g ? 0.9 : -0.7, dx = Math.cos(a) * r, dz = Math.sin(a) * r;
          x = ox + dx; y = oy + dz * Math.sin(ti); z = dz * Math.cos(ti); }
      } else if (k === 6) {                                                      // 7: the flower (Vogel's spiral, lifted into a bowl)
        const a = m * 2.39996323, q = Math.sqrt((m + 0.5) / c), rr = 1.62 * q * (1 + 0.1 * Math.cos(8 * a) * q * q); x = Math.cos(a) * rr; z = Math.sin(a) * rr; y = -0.35 + 0.95 * q * q * q;
      } else if (k === 7) {                                                      // 8: a waveform
        const b = Math.floor(h1 * 34), bx = (b + 0.5) / 34 * 2 - 1, env = 0.16 + 0.84 * Math.pow(Math.abs(Math.sin(bx * 4.1 + 0.6) * Math.cos(bx * 9.7)), 0.8) * (1 - 0.35 * bx * bx);
        x = bx * 1.6 + (h3 - 0.5) * 0.03; y = (h2 * 2 - 1) * env * 1.25; z = 0;
      } else { x = (q8.pos[m * 3] - qcx) * qs; y = (q8.pos[m * 3 + 1] - (qy0 + qy1) / 2) * qs; z = q8.pos[m * 3 + 2]; }   // 9: the question
      base[j] = x; base[j + 1] = y; base[j + 2] = z;
    }
    return base;
  }
  function placeMinis(tl, f) {                                                   // every miniature turns or sways about its own axis
    const b = minis(), cs = [], sn = [], cx = RX.map(Math.cos), sx = RX.map(Math.sin), cl = [];
    for (let k = 0; k < NS; k++) { const a = SPIN[k] ? 0.32 * tl + k * 0.7 : YAW[k] + SWAY[k] * Math.sin(0.55 * tl + k * 1.3); cs[k] = Math.cos(a); sn[k] = Math.sin(a); cl[k] = cell(k); }
    for (let i = 0, j = 0; i < M; i++, j += 3) { const k = i % NS, x = b[j] * MS, y = b[j + 1] * MS, z = b[j + 2] * MS, x1 = x * cs[k] + z * sn[k], z1 = -x * sn[k] + z * cs[k];
      f.pos[j] = x1 + cl[k][0]; f.pos[j + 1] = y * cx[k] - z1 * sx[k] + cl[k][1]; f.pos[j + 2] = y * sx[k] + z1 * cx[k]; }
  }
  const dressMinis = f => { for (let i = 0; i < M; i++) { f.size[i] = 0.58 + 0.45 * hash(i, 806); const j = i * 3, d = 1.0; f.col[j] *= d; f.col[j + 1] *= d; f.col[j + 2] *= d; } };
  const blob = (i, r, out) => { const u = hash(i, 811) * 2 - 1, a = hash(i, 812) * TAU, s = Math.sqrt(1 - u * u), rr = r * Math.pow(hash(i, 813), 0.55); out[0] = rr * s * Math.cos(a); out[1] = rr * u; out[2] = rr * s * Math.sin(a); };

  G3.form("s8-ball", (f, n) => {                                                 // one ball: nine sectors with dark seams between them, around a bright core
    const b = new Float32Array(n * 3), R = 4.1, cntK = Math.ceil(M / NS);
    for (let i = 0; i < n; i++) { const j = i * 3, core = i >= M || hash(i, 822) < 0.2, k = i < M ? i % NS : Math.floor(hash(i, 821) * NS), m = (i / NS) | 0;
      let r, u, lon;
      if (core) { r = R * 0.5 * Math.pow(hash(i, 825), 0.75); u = hash(i, 824) * 2 - 1; lon = hash(i, 823) * TAU; f.size[i] = 0.45 + 0.3 * hash(i, 826); }
      else { u = 1 - 2 * (m + 0.5) / cntK; lon = (k + 0.08 + 0.84 * ((m * 0.61803399) % 1)) / NS * TAU; r = R + 0.05 * (hash(i, 825) - 0.5); f.size[i] = 0.6 + 0.5 * hash(i, 826); }
      const s = Math.sqrt(1 - u * u), d = core ? 0.5 : 0.95;
      b[j] = r * s * Math.cos(lon); b[j + 1] = r * u; b[j + 2] = r * s * Math.sin(lon); f.col[j] *= d; f.col[j + 1] *= d; f.col[j + 2] *= d; }
    return tl => { const a = 0.24 * tl, c = Math.cos(a), s = Math.sin(a), ct = Math.cos(0.5), st = Math.sin(0.5);
      for (let i = 0, j = 0; i < n; i++, j += 3) { const w = 1 + 0.02 * Math.sin(tl * 1.3 + b[j + 1] * 0.9), x = (b[j] * c + b[j + 2] * s) * w, z = (-b[j] * s + b[j + 2] * c) * w, y = b[j + 1] * w;
        f.pos[j] = x + BALL[0]; f.pos[j + 1] = y * ct - z * st; f.pos[j + 2] = y * st + z * ct; } };
  });
  G3.form("s8-scenes", (f, n) => {                                               // nine miniatures; the reviewers' points wait as faint dust behind
    dressMinis(f);
    for (let i = M; i < n; i++) { f.size[i] = 0.5; const j = i * 3; f.col[j] *= 0.3; f.col[j + 1] *= 0.3; f.col[j + 2] *= 0.3; }
    return tl => { placeMinis(tl, f);
      for (let i = M, j = M * 3; i < n; i++, j += 3) { const ph = hash(i, 831) * TAU; f.pos[j] = lerp(-7.5, 20.5, hash(i, 832)) + 0.5 * Math.sin(tl * 0.3 + ph); f.pos[j + 1] = lerp(-11, 11, hash(i, 833)) + 0.5 * Math.cos(tl * 0.26 + ph); f.pos[j + 2] = -3 - 6 * hash(i, 834); } };
  });
  const revHome = j => { const k = j % NS, q = (j / NS) | 0, nk = Math.ceil((NR - k) / NS); return { k, a0: -0.75 + q * TAU / Math.max(1, nk) + k * 0.5 }; };   // reviewer j circles scene j mod 9
  const revPos = (j, tl) => { const h = revHome(j), c = cell(h.k), a = h.a0 - 0.5 * tl; return [c[0] + R2 * Math.cos(a), c[1] + R2 * Math.sin(a), 0]; };
  G3.form("s8-review", (f, n) => {                                               // the same miniatures, each with a small green reviewer in orbit
    dressMinis(f); const o = [0, 0, 0], off = new Float32Array((n - M) * 3);
    for (let i = M; i < n; i++) { blob(i, 0.34, o); off.set(o, (i - M) * 3); f.size[i] = 0.5 + 0.4 * hash(i, 835); G3.tint(f, i, "green", 0.55 + 0.4 * hash(i, 836)); }
    return tl => { placeMinis(tl, f); const c = []; for (let j = 0; j < NR; j++) c[j] = revPos(j, tl);
      for (let i = M, j = M * 3, q = 0; i < n; i++, j += 3, q += 3) { const r = c[(i - M) % NR]; f.pos[j] = r[0] + off[q]; f.pos[j + 1] = r[1] + off[q + 1]; f.pos[j + 2] = off[q + 2]; } };
  });

  // ---- the soundtrack: loudness across the whole film, and which stretches are speech
  const FS = 50, nE = Math.ceil(D * FS) + 1, Y0 = 0.9, AMP = 3.9, WX = 38, WIN = 20, WXD = 40;   // WIN: seconds of film across the close view
  let snd = null;
  function sound() {
    if (snd) return snd;
    const env = new Float32Array(nE), voice = new Uint8Array(nE), v = new Float32Array(nE), PK = WV.peaks || [], real = PK.length > 0, total = WV.total || D;
    let wi = 0;
    for (const q of paras) for (const w of q.words) { const s = q.voiceStart + w.s, e = q.voiceStart + w.e, A = (0.42 + 0.58 * hash(wi, 841)) * (0.8 + 0.2 * Math.sin(s * 0.37)), syl = 1 + Math.floor(hash(wi, 842) * 2.6); wi++;
      for (let j = Math.max(0, Math.ceil(s * FS)); j <= e * FS && j < nE; j++) { const ph = (j / FS - s) / Math.max(0.01, e - s); voice[j] = 1; v[j] = A * (0.35 + 0.65 * Math.abs(Math.sin(Math.PI * ph * syl))) * (0.72 + 0.28 * hash(j, 843)) * Math.pow(Math.sin(Math.PI * clamp(ph)), 0.35); } }
    let mx = 1e-6;
    for (let j = 0; j < nE; j++) { const t = j / FS;
      if (real) { const x = clamp(t / total) * (PK.length - 1), a = Math.floor(x); env[j] = lerp(PK[a], PK[Math.min(PK.length - 1, a + 1)], x - a); }
      else { const bpm = film.timing.bpm || 72, beat = Math.pow(Math.abs(Math.cos(Math.PI * t * bpm / 60)), 10);    // stand-in until the mix exists: a music bed with beats, plus a burst for every word
        env[j] = (0.13 + 0.04 * Math.sin(t * 0.21) + 0.035 * Math.sin(t * 1.7 + 1) + 0.07 * beat) * smooth(0, 1.2, t) * smooth(D, D - 2.5, t) + 0.8 * v[j]; }
      if (env[j] > mx) mx = env[j]; }
    for (let j = 0; j < nE; j++) env[j] /= mx;
    const bed = new Float32Array(nE), HW = Math.round(1.5 * FS);                  // the music under the voice, measured: the quietest moment within 1.5 s each side
    for (let j = 0; j < nE; j++) { let m = 1; for (let q = Math.max(0, j - HW), e = Math.min(nE - 1, j + HW); q <= e; q++) if (env[q] < m) m = env[q]; bed[j] = m; }
    const phi = new Float32Array(N), u = new Float32Array(N);
    for (let i = 0; i < N; i++) { phi[i] = ((i * 4001) % N + hash(i, 851)) / N; u[i] = (hash(i, 853) < 0.36 ? 0.9 + 0.1 * hash(i, 854) : hash(i, 854)) * (i & 1 ? 1 : -1); }
    return (snd = { env, voice, bed, phi, u, real });
  }
  const envAt = (s, t) => { if (t < 0 || t > D) return 0; const x = t * FS, a = Math.floor(x); return lerp(s.env[a], s.env[Math.min(nE - 1, a + 1)], x - a); };
  let INK, ACC, BLU; const hues = () => { if (!INK) { INK = G3.rgb("ink"); ACC = G3.rgb("accent"); BLU = G3.rgb("blue"); } };
  // colour of a waveform point: neutral until the voice is named (accent), then the music (blue); lum scales it
  function paint(f, i, isVoice, kv, km, lum) { const j = i * 3, br = 0.72 + 0.3 * hash(i, 855), tg = isVoice ? ACC : BLU, k = isVoice ? kv : km, base = isVoice ? 0.5 : lerp(0.5, 0.26, kv), top = isVoice ? 1.18 : 0.95, m = br * lerp(base, top, k) * lum;
    f.col[j] = lerp(INK[0], tg[0], k) * m; f.col[j + 1] = lerp(INK[1], tg[1], k) * m; f.col[j + 2] = lerp(INK[2], tg[2], k) * m; }
  // One form for the close view and the whole film. Until tZoom twenty seconds scroll past on the film's clock. From tZoom
  // every point keeps its place across the frame while the stretch of film under it widens from WIN seconds to all D,
  // about the present moment: a zoom, so the band never breaks. At k = 1, x is film time 0..D and what has played is lit.
  const kZoom = film.value(0).to(tZoom, 1, { dur: Math.max(1.2, tWhole - tZoom), ease: "inOut" });
  G3.form("s8-wave", (f, n) => {
    const s = sound(); hues(); const sz = new Float32Array(n), slot = new Float32Array(n), aZ = tZoom - 0.62 * WIN;
    for (let i = 0; i < n; i++) { sz[i] = 0.5 * hash(i, 856); let r = (s.phi[i] * WIN - aZ) % WIN; if (r < 0) r += WIN; slot[i] = r / WIN; }   // where each point sits at tZoom
    return t => { const k = kZoom.at(t), frozen = t >= tZoom, a = t - 0.62 * WIN, kv = smooth(tVoice, tVoice + 0.7, t), km = smooth(tMus, tMus + 0.7, t), kn = smooth(tDot - 0.1, tDot + 0.6, t);
      const span = WIN * Math.pow(D / WIN, k), start = t - lerp(0.62, clamp(t / D), k) * span, wx = lerp(WXD, WX, k), s0 = 0.8 - 0.08 * k;
      for (let i = 0, j = 0; i < n; i++, j += 3) { let sl = slot[i]; if (!frozen) { let r = (s.phi[i] * WIN - a) % WIN; if (r < 0) r += WIN; sl = r / WIN; }
        const tt = start + sl * span, inF = tt >= 0 && tt <= D, q = inF ? Math.round(tt * FS) : 0, h = s.u[i] * envAt(s, tt), edge = lerp(smooth(0, 0.04, sl) * smooth(1, 0.96, sl), 1, k);
        f.pos[j] = (sl - 0.5) * wx; f.pos[j + 1] = Y0 + h * AMP; f.pos[j + 2] = (hash(i, 857) - 0.5) * 0.4; f.size[i] = s0 + sz[i];
        paint(f, i, inF && s.voice[q] === 1 && Math.abs(h) > s.bed[q], kv, km, edge * lerp(1, tt <= t ? 1.12 : 0.36, kn)); } };   // voice: inside a spoken word and above the music bed
  });

  // ---- the points and the camera
  G3.level.to(t0, 1, { dur: 0.8 }); G3.grain.to(t0, 1, { dur: 0.8 });
  G3.morph(t0, "s8-ball", { dur: 1.7, swirl: 0.9 });                             // "did not make this alone": one ball
  G3.cam.to(t0, { az: 0, el: 0, dist: 25, look: BALL, fov: 40 }, { dur: 1.6 });
  G3.cam.to(tPush, { dist: 21 }, { dur: tSplit - tPush, ease: "sine" });                           // a slow push in on the ball until it splits
  G3.morph(tSplit, "s8-scenes", { dur: 2.0, swirl: 0.7, stagger: 0.5, clock: t => t - tSplit });   // "split the film": nine miniatures
  G3.cam.to(tSplit, { az: 0, el: 0, dist: 34, look: [0, 0, 0] }, { dur: 2.2 });                    // hero move one: pull back as the ball divides
  film.hit("rise", tSplit + 0.1);
  G3.morph(tGather, "s8-review", { dur: 1.2, swirl: 0.5, stagger: 0.3, clock: t => t - tSplit });                   // "reviewed their work": the reviewers gather into orbit
  G3.morph(tWave, "s8-wave", { dur: 1.2, swirl: 0.5, stagger: 0.3, clock: t => t });               // "sound is computed": the soundtrack, close
  G3.cam.to(tWave, { az: 0, el: 0, dist: 30, look: [0, 0, 0] }, { dur: 1.8 });
  film.hit("thock", tWave + 1.1);
  G3.cam.to(tZoom, { dist: 34 }, { dur: Math.max(1.4, tWhole - tZoom + 0.4) });                    // "This line is the film's own soundtrack": hero move two, the form itself zooms out (kZoom) and the camera pulls back

  // ---- the 2D layer
  const S = film.scene(p, { fadeOut: 1.2 });
  S.hud.text("How this film was made", { x: 120, y: 96, size: "head", id: "s8-head" }).show(t0 + 0.9);
  const int = v => String(Math.round(v));
  const nb = S.number(0, { x: 120, y: 520, size: "head", font: "mono", fmt: int, id: "s8-builders" }).show(tCopy, { by: "fade" }).to(tCopy, { value: NB }, { dur: 0.9, ease: "out" });
  const lb = S.text("builders", { x: 120, y: 606, size: "label", color: "muted", id: "s8-builders-label" }).show(tCopy + 0.15);
  const nr = S.number(0, { x: 120, y: 720, size: "head", font: "mono", color: "green", fmt: int, id: "s8-reviewers" }).show(tGather + 0.15, { by: "fade" }).to(tGather + 0.15, { value: NR }, { dur: 0.5, ease: "out" });
  const lr = S.text("reviewers", { x: 120, y: 806, size: "label", color: "muted", id: "s8-reviewers-label" }).show(tGather + 0.3);
  [nb, lb, nr, lr].forEach(n => n.hide(tWave + 0.15));
  film.hit("pluck", tCopy + 0.1, { pitch: 3 });
  S.text("voice: speech model, run locally", { x: 120, y: 800, size: "label", color: "accent", id: "s8-voice-label" }).show(tVoice + 0.1);
  S.text("music: a score script, written today", { x: 120, y: 866, size: "label", color: "blue", id: "s8-music-label" }).show(tMusic + 0.1);

  S.text("built on three.js, the explainer-video engine, Breeze TTS 2", { x: 120, y: 932, size: "label", color: "muted", id: "s8-credit" }).show(tWhole - 0.65);
  const kLab = film.value(0).to(tSplit + 1.5, 1, { dur: 0.7 }).to(tWave - 0.05, 0, { dur: 0.3 });  // scene titles under the miniatures
  const dBuild = clamp(tGather - tSide - 0.1, 0.8, 2.2), kBuild = film.value(0).to(tSide, 1, { dur: dBuild, ease: "inOut" });   // every builder ring fills at the same time
  const kRev = film.value(0).to(tGather + 0.1, 1, { dur: 1.1, ease: "inOut" });
  const kRings = film.value(1).to(tWave - 0.05, 0, { dur: 0.3 });
  const kAxis = film.value(0).to(tWhole - 0.1, 1, { dur: 0.5 }), kNow = film.value(0).to(tDot, 1, { dur: 0.3, ease: "out" });   // whole by the word "dot"
  film.hit("chord", tSide + dBuild); film.hit("pop", tDot + 0.05);
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}.${Math.floor(t * 10) % 10}`;   // tenths, so the readout runs with the film
  G3.overlay(S, (ctx, t) => {
    const al = kRings.at(t), la = kLab.at(t);
    if (al > 0.003 && (la > 0.003 || kBuild.at(t) > 0)) for (let k = 0; k < NS; k++) {
      const c = cell(k), q = G3.project(c, t), ppu = G3.pxPerUnit(c, t), kb = kBuild.at(t), kr = kRev.at(t), has = k < NR;
      const ring = (r, k01, color, lw, a) => { if (k01 <= 0.002) return; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = G3.css(color); ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(q.x, q.y, r * ppu, -Math.PI / 2, -Math.PI / 2 + TAU * k01); ctx.stroke(); ctx.restore(); };
      ring(R1, smooth(0, 0.25, kb), "faint", 2, al * 0.9); if (k >= NS - NB) ring(R1, kb, "ink", 2.5, al * 0.8);              // a builder's progress: the last NB scenes (the lead built the first ones itself)
      if (has) ring(R2, kr, "green", 2, al * 0.55);                                                     // the reviewer's orbit
      if (paras[k]) G3.text3(ctx, t, paras[k].title, { x: q.x, y: q.y + R2 * ppu + 30, ok: true }, { size: 26, color: "ink", dy: 0, alpha: la * smooth(k * 0.05, k * 0.05 + 0.5, la * 1.4) });
    }
    const ka = kAxis.at(t), kn = kNow.at(t);
    if (ka > 0.003) {                                                            // where each scene starts along the soundtrack
      for (let k = 0; k < paras.length; k++) { const x = (paras[k].start / D - 0.5) * WX, a = [x, Y0 - AMP - 0.25, 0], b = [x, Y0 - AMP - 0.6, 0];
        G3.line3(ctx, t, a, b, { color: "muted", lw: 2, alpha: ka * 0.8 }); G3.text3(ctx, t, String(paras[k].n), [x, Y0 - AMP - 0.6, 0], { size: 26, color: "muted", dy: 24, dx: 0, alpha: ka, font: "mono" }); }
    }
    if (kn > 0.003) {                                                            // now: x is the film's own time, so the dot moves
      const x = (clamp(t / D) - 0.5) * WX, top = [x, Y0 + AMP + 0.35, 0];
      G3.line3(ctx, t, [x, Y0 - AMP - 0.1, 0], [x, Y0 + (AMP + 0.35) * kn, 0], { color: "ink", lw: 2, alpha: 0.85 * kn });
      G3.dot3(ctx, t, [x, Y0, 0], { color: "bg", r: 13, alpha: kn }); G3.dot3(ctx, t, [x, Y0, 0], { color: "ink", r: 8 * kn + 1, alpha: kn });
      G3.dot3(ctx, t, [x, Y0, 0], { color: "ink", ring: true, r: 13 + 9 * (1 - kn), lw: 2, alpha: kn });
      G3.text3(ctx, t, "now " + mmss(t), top, { size: 34, color: "ink", dy: -30, alpha: smooth(0.5, 1, kn), font: "mono" });
    }
  }, { id: "s8-overlay" });
} });
