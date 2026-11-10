// forms3d/phyllotaxis.js: the points become a seed head grown by one rule, then a flower. Seed n sits at angle
// n x 137.5 degrees and at a distance proportional to sqrt(n). The head can then curl into a bowl and open as a
// flower with 5, 8, 13 and 21 petals.
//   const flower = G3.lib.phyllotaxis();            G3.form("flower", flower);  G3.morph(t, "flower")
//   const life = G3.lib.phyllotaxis({ play: true });  G3.form("life", life);    G3.morph(t, "life")
//
// With no options the form rests as the open flower at every local time, turning slowly, its petals moving a
// little. The growth plays only when you ask for it with play: true.
//
// Options (all optional):
//   angle (137.50776)   degrees turned from one seed to the next. The default is the golden angle. Any angle gives
//                       its true head: 90 makes four spokes, 137.3 makes a pinwheel of curved arms. To show such
//                       a head, add { curl: 0 }: the flower is drawn from the same seeds, so spokes stay spokes.
//   radius (10)         radius of the full head, in world units. The flower and the point sizes scale with it.
//   spacing (0.14 x radius)   distance scale while only the first seeds are out: seed n (0 is the first) sits
//                       spacing x sqrt(n + 1) from the centre. It shrinks as the head grows to its radius.
//   first (12)          how many seeds are placed one at a time before the rest grow. Each is drawn as a bright knot.
//   petals ([5, 8, 13, 21])   petals in each ring of the flower, from the heart outward. One to eight rings.
//   colors (["yellow", "accent", a pale accent, "purple", "blue"] at 0, 0.3, 0.55, 0.8, 1)
//                       colours from the centre of the head to its rim: look tokens, CSS colours or [r, g, b] with
//                       0..1 parts. A plain list is spread evenly. A pair [position, colour] pins a stop, with
//                       position 0 at the centre and 1 at the rim. A seed keeps its colour when the head curls.
//   lean (0.95)         radians the flower leans back as it curls, so the rest camera looks into the cup.
//                       0 keeps it face on: then tilt it with the morph's rx or with the camera.
//   turn (0.07)         radians a second the head turns about its own axis.
//   play (false)        true plays the whole life on the default timeline below.
//   times               seconds for each stage of the default timeline: { core: 2.6, step: 0.45, pause: 0.3,
//                       grow: 3, hold: 1.5, curl: 1.5, open: 3.2 }. Give only the ones you change. core: the
//                       glowing ball before the first seed. step: one seed. pause: between the last of the first
//                       seeds and the growth. grow: the first seeds to the full head. hold: the flat head. curl:
//                       flat head to bowl. open: start of the curl to the open flower (the petals part while it
//                       curls).
//   placed, grow, curl, open   the four stages, each a number (held for good) or a function of local time.
//                       placed: how many of the first seeds are out, 0..first. A fraction is the newest seed
//                       swinging out from the last one's direction. grow: 0 only the first seeds, 1 the full head.
//                       curl: 0 the flat head, 1 the bowl. open: 0 the bowl, 1 the open flower. A stage you do not
//                       give is finished (first, 1, 1, 1), or follows the default timeline when play is true.
//                       The head curls only when it is full: while grow is under 1, curl and open do nothing.
//                       { curl: 0 } rests as the flat head. { open: 0 } rests as the bowl.
//
// Local time, with play: true (seconds, for the default times):
//   0 to build.tSeed (2.6)                      all points glow as one core, which breathes out a corona and draws it back
//   build.tSeed (2.6) to build.tSeeds (8.0)     the first twelve seeds swing out one at a time, each turned from the last
//   build.tGrow (8.3) to build.tFull (11.3)     every other seed is placed; the head grows to its radius and starts to turn
//   build.tCurl (12.8) to build.tBowl (14.3)    the rim curls up first and the head becomes a bowl
//   build.tCurl (12.8) to build.tOpen (16.0)    the petals part and fold out; from tOpen on it is the resting flower
//   build.duration = build.tOpen.
// To land stages on spoken words, pass the morph a clock through pairs of [film time, local time]:
//   G3.morph(t0, "life", { clock: life.clock([[tSeedWord, life.tSeed], [tFullWord, life.tFull], [tFlowerWord, life.tOpen]]) })
// Between pairs local time runs evenly. Before the first and after the last it runs at one second a second. The
// small motions run on local time too, so a stage squeezed to half its length shimmers twice as fast.
// Or keep the default clock and write the stages yourself, e.g. { grow: tl => G3.smooth(4, 6, tl), curl: 0 }.
//
// For labels and markers (world positions at scale 1, before the morph's at/scale: pass them through
// seg.world(p, t), where seg is what G3.morph returned):
//   build.seed(n, tl)    -> [x, y, z]: where seed n (0 is the first) sits in the flat head at local time tl. A seed not
//                        yet placed is at the centre. Any n up to the point count works. It does not follow the curl.
//   build.dir(n, tl)     -> radians: the direction of seed n from the centre, with the head's turn. To draw the turn
//                        from seed n to seed n + 1, run an arc from dir(n, tl) to dir(n + 1, tl): while seed n + 1
//                        swings out, its direction runs from seed n's to its own.
//   build.stage(tl)      -> { placed, grow, curl, open, seeds, rim, turn }: the four stages at tl, how many seeds
//                        are out in all, the head's radius now (world units) and how far it has turned (radians).
//   build.radius, build.spacing, build.angle (degrees), build.first, build.petals   the options as used.
//   build.tSeed, tSeeds, tGrow, tFull, tCurl, tBowl, tOpen, duration   the default timeline, local seconds.
//   build.clock(pairs)   -> the clock function described above.
// Size: the flat head is a disc of radius 10 in the x, y plane, facing the rest camera (az 0, el 0, dist 34). The
//   resting flower fits a box 16 x 10 x 13 world units, centred near the origin, leaning back. The core is a ball
//   of radius 0.9 (its corona reaches 4.6). The first twelve seeds lie within 4.9 of the centre.
// Light: the points are drawn at G3.level 1. The flat head is one point deep, so it is quieter than the flower: a
//   film that dwells on it can raise G3.level to about 1.6 for that stretch.
// Source: H. Vogel, "A better way to construct the sunflower head", Mathematical Biosciences 44 (1979): seed n at
//   angle n x 137.508 degrees and radius c x sqrt(n). Golden angle = 360 (1 - 1/phi) = 137.5078 degrees. The rule
//   places seed n from n alone. It makes no claim about how a living plant does it. The bowl and the petals are a
//   drawing made from the same seeds: they are not part of Vogel's model.
(function () {
  const G3 = window.G3, PI = Math.PI, TAU = PI * 2;
  const GOLDEN = 180 * (3 - Math.sqrt(5));                                       // 360 (1 - 1/phi) = 137.50776 degrees
  // the four petal rings of the tuned flower, heart outward; a different ring count samples these tables
  const RING = { r0: [1.2, 1.4, 1.58, 1.72], L: [3.0, 4.3, 5.4, 6.2], a0: [0.22, 0.6, 0.95, 1.25], a1: [0.8, 1.12, 1.42, 1.72], z0: [0.34, 0.22, 0.1, 0], share: [0.13, 0.21, 0.32, 0.34] };
  const BOWL = { r0: 1.75, L: 7.6, a0: 1.5, a1: 0.25, z0: 0 };
  const HEAD_GRAIN = 1.5, FLOWER_GRAIN = 1.1;                                    // the flat head is one point deep, so its seeds are drawn larger than the flower's (larger, not brighter: a colour over 1 would wash out)
  const RD = 0.27, RDISC = 1.75, R = 10;                                         // the heart: the inner 27% of the head becomes a small dome. All lengths below are for a head of radius 10.
  const sample = (a, u) => { const x = u * (a.length - 1), k = Math.min(a.length - 2, Math.floor(x)); return a[k] + (a[k + 1] - a[k]) * (x - k); };

  G3.lib.phyllotaxis = (o = {}) => {
    const { hash, clamp, lerp, ease, smooth } = G3;
    const DEG = o.angle ?? GOLDEN, GA = DEG * PI / 180, RAD = o.radius ?? 10, sc = RAD / R, C0 = (o.spacing ?? 1.4 * sc) / sc;
    const NS = clamp(Math.round(o.first ?? 12), 1, 60), lean = o.lean ?? 0.95, turn = o.turn ?? 0.07, playing = !!o.play;
    let petals = (Array.isArray(o.petals) ? o.petals : [5, 8, 13, 21]).map(m => Math.round(m)).filter(m => m >= 2).slice(0, 8); if (!petals.length) petals = [5, 8, 13, 21];
    const LAY = petals.map((m, k) => { const u = petals.length > 1 ? k / (petals.length - 1) : 1, Y = { m, off: (k + 1) * 0.71, ph: (k + 1) * 1.3, pa0: new Float32Array(m), pk: new Float32Array(m) };
      for (const key of ["r0", "L", "a0", "a1", "z0", "share"]) Y[key] = sample(RING[key], u);
      Y.hw = 1.2 * (PI / m) * (Y.r0 + 0.55 * Y.L * 0.92); return Y; });
    const shareSum = LAY.reduce((s, Y) => s + Y.share, 0); let acc = 0; LAY.forEach(Y => { acc += Y.share / shareSum; Y.upTo = acc; });

    // ---- the default timeline, local seconds
    const tm = { core: 2.6, step: 0.45, pause: 0.3, grow: 3, hold: 1.5, curl: 1.5, open: 3.2, ...(o.times || {}) };
    const tSeed = tm.core, tSeeds = tSeed + NS * tm.step, tGrow = tSeeds + tm.pause, tFull = tGrow + tm.grow, tCurl = tFull + tm.hold, tBowl = tCurl + tm.curl, tOpen = tCurl + tm.open;
    const stageFn = (v, timeline, done) => (typeof v === "function" ? v : typeof v === "number" ? () => v : playing ? timeline : () => done);
    const placedAt = stageFn(o.placed, tl => (tl - tSeed) / tm.step, NS);
    const growAt = stageFn(o.grow, tl => (tl - tGrow) / tm.grow, 1);
    const curlAt = stageFn(o.curl, tl => ease(clamp((tl - tCurl) / tm.curl)), 1);
    const openAt = stageFn(o.open, tl => smooth(tCurl + tm.curl / 3, tOpen, tl), 1);
    const turnAt = tl => { if (!playing) return turn * tl; const d = tl - tGrow; return d > 0 ? turn * d * d / (d + 1.5) : 0; };   // a playing head starts to turn as it grows

    // the flat stages in one place: the update and the anchors both read them here
    const flat = (tl, s) => {
      const pl = clamp(placedAt(tl), 0, NS), gr = clamp(growAt(tl)), N = s.N; let K = 0;
      for (let k = 0; k < NS; k++) { s.se[k] = ease(clamp((pl - k) / 0.82)); K += s.se[k]; }      // a seed takes 0.82 of a step to swing out
      if (gr > 0) K = NS * Math.pow(N / NS, gr);                                                   // 12 seeds become N: the count multiplies
      s.pl = pl; s.gr = gr; s.K = K; s.rot = turnAt(tl);
      s.c = gr >= 1 ? R / Math.sqrt(N) : gr > 0 ? lerp(C0 * Math.sqrt(NS), R, ease(gr)) / Math.sqrt(K) : C0;
      s.Ke = K * (1 + 0.03 * smooth(0.5, 1, gr)); s.bw = 0.6 + 0.02 * K;
      return s;
    };
    const dirOf = (n, s) => n * GA - (n > 0 && n < NS && s.se[n] < 1 ? GA * (1 - s.se[n]) : 0) + s.rot;
    const scratch = N => ({ N, se: new Float32Array(NS) });
    let SA = scratch(G3.N);                                                                        // for the anchors

    const build = (f, N) => {
      SA = scratch(N);
      const S0 = scratch(N), sqN = Math.sqrt(N), CF = R / sqN, nk = clamp(Math.pow(30000 / N, 0.4), 0.6, 1.8), coreK = clamp(30000 / N, 0.4, 3);   // more points: smaller seeds and a dimmer core, so the light stays the same
      const KN = Math.max(1, Math.min(140, Math.floor(N * 0.25 / NS))), KN0 = N - NS * KN;                                                    // each of the first seeds borrows a knot of points from the rim
      const ct = new Float32Array(N), st = new Float32Array(N), rho = new Float32Array(N), lay = new Uint8Array(N), ps = new Float32Array(N), thc = new Float32Array(N),
        phi = new Float32Array(N), pw = new Float32Array(N), pj = new Uint16Array(N), br = new Float32Array(N), sz = new Float32Array(N), core = new Float32Array(N * 3), cb = new Float32Array(N), csz = new Float32Array(N),
        off = new Float32Array(N * 3), lut = new Float32Array(257 * 3), sx = new Float32Array(NS), sy = new Float32Array(NS), szz = new Float32Array(NS);
      for (let i = 0; i < N; i++) {
        const th = (i * GA) % TAU, r = Math.sqrt((i + 1) / N);                    // the rule: seed i from i alone, turned i x the angle, stepped out to c x sqrt(i + 1)
        ct[i] = Math.cos(th); st[i] = Math.sin(th); rho[i] = r; br[i] = 0.55 + 0.45 * hash(i, 71); sz[i] = 0.72 + 0.5 * hash(i, 72);
        const z = hash(i, 11) * 2 - 1, a = hash(i, 12) * TAU, rr = Math.sqrt(1 - z * z), cr = 0.9 * Math.pow(hash(i, 61), 0.6);   // the same ball as the built-in "core" form
        core[i * 3] = rr * Math.cos(a) * cr; core[i * 3 + 1] = rr * Math.sin(a) * cr; core[i * 3 + 2] = z * cr; cb[i] = (0.08 + 0.12 * hash(i, 63)) * coreK; csz[i] = 0.5 + 0.4 * hash(i, 62);
        const gx = Math.sqrt(-2 * Math.log(1 - hash(i, 73) * 0.999)), ga = hash(i, 74) * TAU;
        off[i * 3] = gx * Math.cos(ga); off[i * 3 + 1] = gx * Math.sin(ga); off[i * 3 + 2] = (hash(i, 75) - 0.5) * 1.4;
        if (r < RD) { lay[i] = 0; continue; }
        const h = hash(i, 76); let l = 0; while (l < LAY.length - 1 && h >= LAY[l].upTo) l++;
        const Y = LAY[l], sec = TAU / Y.m, tt = (((th + Y.off) % TAU) + TAU) % TAU, j = Math.min(Y.m - 1, Math.floor(tt / sec)), s = (r - RD) / (1 - RD);
        lay[i] = l + 1; pj[i] = j; ps[i] = s; phi[i] = (tt / sec - j) * 2 - 1; thc[i] = (j + 0.5) * sec - Y.off;
        pw[i] = Math.pow(Math.sin(PI * Math.pow(0.07 + 0.93 * s, 0.8)), 0.5);     // a petal's outline: narrow base, wide middle, pointed tip
      }
      // colour: distance from the centre of the head, through the stops
      const mix = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)], rgb = c => (typeof c === "string" ? G3.rgb(c) : c);
      const given = Array.isArray(o.colors) && o.colors.length ? o.colors : [[0, "yellow"], [0.3, "accent"], [0.55, mix(G3.rgb("ink"), G3.rgb("accent"), 0.45)], [0.8, "purple"], [1, "blue"]];
      const stops = given.map((e, k) => (Array.isArray(e) && e.length === 2 && typeof e[0] === "number" ? [clamp(e[0]), rgb(e[1])] : [given.length > 1 ? k / (given.length - 1) : 0, rgb(e)])).sort((a, b) => a[0] - b[0]);
      if (stops.length < 2) stops.push([1, stops[0][1]]);
      for (let q = 0; q <= 256; q++) { const u = q / 256; let k = 0; while (k < stops.length - 2 && u > stops[k + 1][0]) k++;
        const c = mix(stops[k][1], stops[k + 1][1], clamp((u - stops[k][0]) / (stops[k + 1][0] - stops[k][0] || 1))); lut[q * 3] = c[0]; lut[q * 3 + 1] = c[1]; lut[q * 3 + 2] = c[2]; }
      const ink = G3.rgb("ink"), warm = [0, 1, 2].map(k => lerp(ink[k], lut[k], 0.8));             // the core takes the colour of the head's heart

      // the full head as a flower: curl 0 is the flat head, curl 1 with q 0 a bowl, q 1 the open flower
      const nR = LAY.length, Lq = new Float32Array(nR), r0q = new Float32Array(nR), z0q = new Float32Array(nR);
      function bloom(tl, curl, q, rot) {
        const P = f.pos, C = f.col, S = f.size, qs = smooth(0.04, 0.62, q), cr = Math.cos(rot), sr = Math.sin(rot), tilt = -lean * curl, ctl = Math.cos(tilt), stl = Math.sin(tilt), zoff = 1.5 * curl;
        for (let l = 0; l < nR; l++) { const Y = LAY[l]; Lq[l] = lerp(BOWL.L, Y.L, q); r0q[l] = lerp(BOWL.r0, Y.r0, q); z0q[l] = lerp(BOWL.z0, Y.z0, q);
          for (let j = 0; j < Y.m; j++) { const fl = 0.05 * q * Math.sin(0.9 * tl + j * 2.4 + Y.ph), a0 = lerp(BOWL.a0, Y.a0, q) + 0.5 * fl, a1 = lerp(BOWL.a1, Y.a1, q) + fl + 0.03 * q * Math.sin(0.55 * tl + l + 1);   // each petal moves a little on its own
            let k = a1 - a0; if (Math.abs(k) < 1e-4) k = 1e-4; Y.pa0[j] = a0; Y.pk[j] = k; } }
        const dome = 0.55 * curl, settle = smooth(0, 0.85, curl), grainK = lerp(1.15 * HEAD_GRAIN, FLOWER_GRAIN, settle) * nk * sc;
        for (let i = 0, j3 = 0; i < N; i++, j3 += 3) {
          const r = rho[i], c0 = ct[i] * cr - st[i] * sr, s0 = st[i] * cr + ct[i] * sr, l = lay[i];
          const u = smooth(0, 1, curl * 1.5 - 0.5 * (1 - r));                     // the rim curls first
          let x = R * r * c0, y = R * r * s0, z = 0, bw = 1;
          if (u > 0) {
            let fx, fy, fz;
            if (l === 0) { const rd = r / RD, rr = rd * RDISC; fx = rr * c0; fy = rr * s0; fz = dome * (1 - rd * rd) - 0.05; }
            else { const Y = LAY[l - 1], a0 = Y.pa0[pj[i]], k = Y.pk[pj[i]], A = a0 + k * ps[i], cA = Math.cos(A), sA = Math.sin(A), L = Lq[l - 1], w = pw[i], ph = phi[i];
              let rc = r0q[l - 1] + L * (Math.cos(a0) - cA) / k, zc = z0q[l - 1] + L * (sA - Math.sin(a0)) / k;
              const cup = qs * 0.3 * Y.hw * ph * ph * w * w; rc -= cup * cA; zc += cup * sA;        // a petal is cupped across its width
              const d = lerp(ph * PI / Y.m, ph * w * Y.hw / Math.max(rc, 0.7), qs), an = thc[i] + d + rot;
              fx = rc * Math.cos(an); fy = rc * Math.sin(an); fz = zc; bw = lerp(1, 0.58 + 0.42 * w, qs); }
            x += (fx - x) * u; y += (fy - y) * u; z = fz * u; bw = lerp(1, bw, u);
          }
          z -= zoff;
          P[j3] = x * sc; P[j3 + 1] = (y * ctl - z * stl) * sc; P[j3 + 2] = (y * stl + z * ctl) * sc;
          const q3 = Math.round(r * 256) * 3, b = br[i] * bw * lerp(1, 0.6, u * smooth(0.75, 1, r)); C[j3] = lut[q3] * b; C[j3 + 1] = lut[q3 + 1] * b; C[j3 + 2] = lut[q3 + 2] * b;
          S[i] = sz[i] * (1 + 0.22 * Math.sin(tl * 2.6 + br[i] * 40)) * grainK;
        }
      }

      // core -> the first seeds -> the growing head
      function grow(tl, s) {
        const P = f.pos, C = f.col, S = f.size, { K, c, Ke, bw, gr, se } = s, cr = Math.cos(s.rot), sr = Math.sin(s.rot);
        const cs = (1 + 0.05 * Math.sin(2.1 * tl)) * Math.cbrt(Math.max(0, 1 - K / N)) * (1 - gr), sf = clamp(Math.sqrt(c / CF) * 1.15, 1.15, 4.6) * lerp(1, nk, smooth(0.2, 1, gr));
        const kap = 1 - smooth(0, 0.3, gr), shim = smooth(0.75, 1, gr), ks = 0.19 * c / C0, cN = c * sqN, sg = sf * lerp(1, HEAD_GRAIN, smooth(0.1, 1, gr));
        const cdim = (1 - 0.4 * smooth(0, 3, K)) * (1 - smooth(0, 0.7, gr));     // the core steps back when the seeds are the subject, and is gone before the head is grown
        const halo = smooth(0.25 * tSeed, 0.6 * tSeed, tl) * (1 - smooth(tSeed - Math.min(1, 0.35 * tSeed), tSeed + 0.2, tl)) * (1 - smooth(0, 1, K));   // the core breathes out a faint corona, then draws it back in
        for (let i = 0, j = 0; i < N; i++, j += 3) {
          const a = Ke - i; let x = core[j] * cs, y = core[j + 1] * cs, z = core[j + 2] * cs, r = 0, w = 0, hb = cdim;
          if (halo > 0 && br[i] < 0.65) { const hk = 1 + halo * (0.6 + 13 * (br[i] - 0.55)) * 2.4, an = (0.25 + 2 * (0.65 - br[i])) * tl, ca = Math.cos(an), sa = Math.sin(an), hx = x * hk, hy = y * hk; x = hx * ca - hy * sa; y = hx * sa + hy * ca; z *= hk; hb *= 1 + 1.8 * halo; }
          if (a > 0) { r = cN * rho[i]; w = smooth(0, bw, a); let c1 = ct[i], s1 = st[i];
            if (i < NS && i > 0 && se[i] < 1) { const an = i * GA - GA * (1 - se[i]); c1 = Math.cos(an); s1 = Math.sin(an); }      // a new seed swings out, turned from the last
            x += (r * (c1 * cr - s1 * sr) - x) * w; y += (r * (s1 * cr + c1 * sr) - y) * w; z *= 1 - w; }
          if (i < NS) { sx[i] = x; sy[i] = y; szz[i] = z; }
          let q3 = Math.round(clamp(r / R) * 256) * 3, b = lerp(cb[i] * hb, br[i], w), size = lerp(csz[i], sz[i] * sg * (i < NS ? 1 + 0.8 * kap : 1), w) * (1 + 0.22 * shim * Math.sin(tl * 2.6 + br[i] * 40));
          if (i >= KN0 && kap > 0) { const k = (i - KN0) % NS, wk = kap * smooth(0, 0.6, se[k]);           // the first seeds are drawn as knots of points
            if (wk > 0) { x += (sx[k] + off[j] * ks - x) * wk; y += (sy[k] + off[j + 1] * ks - y) * wk; z += (szz[k] + off[j + 2] * ks - z) * wk;
              q3 = Math.round(clamp(Math.hypot(sx[k], sy[k]) / R) * 256) * 3; w = Math.max(w, wk); b = lerp(b, 0.95, wk); size = lerp(size, 1.0, wk); } }
          P[j] = x * sc; P[j + 1] = y * sc; P[j + 2] = z * sc; S[i] = size * sc;
          C[j] = lerp(warm[0], lut[q3], w) * b; C[j + 1] = lerp(warm[1], lut[q3 + 1], w) * b; C[j + 2] = lerp(warm[2], lut[q3 + 2], w) * b;
        }
      }

      return tl => { const s = flat(tl, S0); if (s.gr >= 1) bloom(tl, clamp(curlAt(tl)), clamp(openAt(tl)), s.rot); else grow(tl, s); };
    };

    // ---- what a film needs for its own labels
    build.seed = (n, tl) => { const s = flat(tl, SA), a = s.Ke - n; if (a <= 0) return [0, 0, 0];
      const r = s.c * Math.sqrt(n + 1) * (s.gr >= 1 ? 1 : smooth(0, s.bw, a)) * sc, an = dirOf(n, s); return [r * Math.cos(an), r * Math.sin(an), 0]; };
    build.dir = (n, tl) => dirOf(n, flat(tl, SA));
    build.stage = tl => { const s = flat(tl, SA), full = s.gr >= 1;
      return { placed: s.pl, grow: s.gr, curl: full ? clamp(curlAt(tl)) : 0, open: full ? clamp(openAt(tl)) : 0, seeds: Math.min(s.N, s.K), rim: s.c * Math.sqrt(Math.max(1, Math.min(s.N, s.K))) * sc, turn: s.rot }; };
    build.clock = pairs => { const P = pairs.map(q => [q[0], q[1]]).sort((a, b) => a[0] - b[0]), n = P.length - 1;
      return t => { if (t <= P[0][0]) return P[0][1] + (t - P[0][0]); if (t >= P[n][0]) return P[n][1] + (t - P[n][0]);
        let k = 0; while (t > P[k + 1][0]) k++; return P[k][1] + (P[k + 1][1] - P[k][1]) * (t - P[k][0]) / (P[k + 1][0] - P[k][0] || 1e-9); }; };
    Object.assign(build, { radius: RAD, spacing: C0 * sc, angle: DEG, first: NS, petals: petals.slice(), tSeed, tSeeds, tGrow, tFull, tCurl, tBowl, tOpen, duration: tOpen });
    return build;
  };
})();
