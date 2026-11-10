// forms3d/galaxies.js: two discs of stars fall past each other and throw out long tidal tails (a small gravity run).
//   const gal = G3.lib.galaxies({ eccentricity: 0.5 });  G3.form("mine", gal);  G3.morph(t, "mine")
//
// What it is: a restricted N-body run. Two point-mass cores move on a bound Kepler orbit. Each carries a thin spiral
//   disc of stars that have no mass: every star feels both cores and nothing else. The run is computed once, the
//   first time the form is drawn or an anchor is asked for, and then played back.
//
// Options (all optional):
//   eccentricity (0.5)   shape of the cores' orbit, 0 (a circle) to 0.9 (a long fall and a fast pass). Under about
//                        0.3 the cores never get far apart and the discs shred each other into one wide spiral.
//   pericentre (3)       world units between the cores at their closest pass. It is the scale of the whole form.
//   massRatio (1)        mass of the second galaxy over the first, 0.1 to 10. The total mass stays 2, so the timing
//                        does not change. The heavier galaxy gets more of the points and a wider disc.
//   tilts ([{ inc: 0.42, node: 0.6 }, { inc: 1.0, node: 3.9 }])   how each disc leans, in radians: inc is the angle
//                        between the disc's spin and the orbit's spin (0 = flat in the orbit plane, over 1.57 = it
//                        spins against the orbit and throws almost no tail), node turns the lean about the view axis.
//   softening (0.32)     softening length of the force, as a part of the closest pass, 0.15 to 1. The pull of a core
//                        at distance r is m r / (r² + s²)^1.5. Smaller is closer to Newton's law but winds the inner
//                        arms into rings and costs more steps.
//   disc (0.75)          radius of each disc as a part of the closest pass, 0.2 to 1.5.
//   arms (0.55)          share of the stars that start in the two spiral arms; the rest fill the disc evenly.
//   apsides (1.75)       direction in the orbit plane, in radians, of the line from the closest pass to the far point.
//                        It turns the whole encounter on the screen.
//   colors (["blue", "yellow"])   the hue of the stars born in each galaxy.
//   pale ("ink"), warm ("accent")   each star's hue is mixed a little toward pale; half of the second galaxy's stars
//                        are mixed toward warm instead.
//   before (3.5), after (3.3)   how much of the run comes before and after the closest pass, in run-time units
//                        (G = 1, total mass 2, closest pass = 1; one orbit at eccentricity 0.5 takes 12.6). 0.5 to 8.
//   duration (14)        local seconds the run takes from its start to `after` past the pass.
//   still (off)          a number 0 to 1 freezes the form at that part of the run (0.52 = the closest pass with the
//                        default before and after, 1 = tails fully out) and lets it unwind slowly. Use it for a
//                        picture of two galaxies with tails, with no run to stage.
//   drift (0.035)        run-time units a second at which a still, or a run that has finished, keeps unwinding.
//                        0 freezes it. The drift fades out as it uses up the 1.1 units simulated past the end.
//   view ({ az: 0, el: 0 })   turns the form as if the rest camera had moved to that az and el. It is useful with
//                        `fit`, which then measures the box as seen on the screen.
//   fit (off; [27, 13.2] for a still)   [width, height] in world units: the form is scaled and centred so that
//                        nearly all its stars (all but the 0.4% furthest out on each side) fit that box at the end of the run,
//                        or at the frozen moment of a still. It overrides `pericentre`. false turns it off.
//   swell (0.45)         how much the stars that end far out in a tail grow once the tails leave, so the thin far
//                        ends stay visible.
//   seed (0)             another whole number gives another draw of the same discs.
//
// Local time: the form's local time tl (seconds) is progress through the run. tl = 0 is the start, with both discs
//   whole and already turning. The cores are closest at tl = build.tPass (7.2 with the defaults). The run ends at
//   tl = build.duration (14), with the tails out. After that the form slows over about two seconds and keeps
//   unwinding gently. Negative tl holds the start. To land the pass on a spoken word, give the morph a clock:
//     const tWord = p.at("pass each other");
//     G3.morph(t0, "mine", { clock: t => t < tWord ? gal.tPass * (t - t0) / (tWord - t0)
//       : gal.tPass + (gal.duration - gal.tPass) * (1 - Math.pow(1 - Math.min(1, (t - tWord) / (p.end - tWord)), 2)) })
//   (a steady fall to the pass, then tails that fly out fast and settle by the end of the paragraph).
//   With `still`, tl only drives the slow unwinding.
//
// For labels and markers (positions are in the form's own space at scale 1, before the morph's at/scale/rx/ry: pass
//   them through seg.world(p, t), where seg is what G3.morph returned; tl is the form's local time, seg.local(t)):
//   build.duration, build.tPass     local seconds: the length of the run, and when the cores are closest.
//   build.cores(tl)                 -> [[x, y, z], [x, y, z]]: where the two cores are.
//   build.star(i, tl)               -> [x, y, z]: where point i is. It matches the drawn point exactly.
//   build.galaxy(i)                 -> 0 or 1: the galaxy point i was born in.
//   build.discRadius(g)             -> the radius of galaxy g's disc at the start, in the same units as the positions.
//   build.tailStar(g)               -> the index of a star born in galaxy g (0 or 1) that starts in the outer disc and
//                                   ends well out in the tail, or -1 if that galaxy throws none. With no g it tries
//                                   galaxy 0, then galaxy 1.
//   build.pull(i, tl)               -> [a, b]: how hard each core pulls star i, by the same softened law the run uses.
//                                   Use the ratio to weight two pull lines.
//   build.check()                   -> { ok, pass, passAt, passSeparation, tails, tailStar, stars }: facts measured on
//                                   the run, for a film to test before its narration leans on them. pass: the cores
//                                   came closest when and as near as they should. passAt: local seconds. passSeparation:
//                                   in units of the closest pass (1 is right). tails: the part of all stars that end
//                                   more than 1.5 closest passes from both cores (0.14 with the defaults). tailStar:
//                                   what build.tailStar() gives. stars: the point count. ok: pass is true, tails is at
//                                   least 0.05 and there is a tail star.
//                                   e.g. if (!gal.check().ok) film.problem("the galaxies throw no tails")
//
// Size: with the defaults the orbit lies in the screen plane and the cores' centre of mass is the origin. At the
//   start the two discs fit a box 10 x 10 x 4 world units. At tl = duration the stars fit 22 x 15 x 9, and after the
//   slow unwinding 28 x 19 x 11, a little right of centre. The rest camera (az 0, el 0, dist 34) shows it all.
//   A still fits its `fit` box, 27 x 13.2. Seen from closer than the rest camera the discs are bright: lower G3.level
//   to about 0.75 at dist 20. Star size and brightness adjust to the point count (tuned at 30,000).
//
// Cost: the run takes about 100 ms at 30,000 points (150 ms at 60,000) and 18 MB of snapshots; a frame takes 0.2 ms.
//   A small softening or a long before and after cost more, in proportion.
// Source: Toomre and Toomre, "Galactic Bridges and Tails" (1972), the restricted three-body method. Leapfrog steps,
//   a softened point-mass force, snapshots every 0.08 run-time units joined by Catmull-Rom curves.
(function () {
  const G3 = window.G3;
  G3.lib.galaxies = (o = {}) => {
    const { hash, clamp, lerp, smooth } = G3;
    const num = (v, d, a, b) => clamp(typeof v === "number" && isFinite(v) ? v : d, a, b);
    // ---- options. Run units: G = 1, total mass 2, closest approach = 1.
    const ECC = num(o.eccentricity, 0.5, 0, 0.9), SMA = 1 / (1 - ECC), QM = num(o.massRatio, 1, 0.1, 10), MASS = [2 / (1 + QM), 2 * QM / (1 + QM)];
    const EPS = num(o.softening, 0.32, 0.15, 1), EPS2 = EPS * EPS, PHI = num(o.apsides, 1.75, -100, 100);
    const TILTS = [0, 1].map(g => { const d = [{ inc: 0.42, node: 0.6 }, { inc: 1.0, node: 3.9 }][g], t = (o.tilts || [])[g]; return Array.isArray(t) ? { inc: t[0] ?? d.inc, node: t[1] ?? d.node } : { ...d, ...(t || {}) }; });
    const BEFORE = num(o.before, 3.5, 0.5, 8), AFTER = num(o.after, 3.3, 0.5, 8), LEN = BEFORE + AFTER, EXTRA = 1.2, COAST = EXTRA - 0.1;
    const DUR = num(o.duration, 14, 0.1, 1e5), RATE = LEN / DUR, DRIFT = Math.min(num(o.drift, 0.035, 0, 1), RATE), TAU = 1.2;
    const STILL = o.still == null || o.still === false ? null : num(o.still === true ? 1 : o.still, 1, 0, 1);
    const VIEW = { az: 0, el: 0, ...(o.view || {}) }, FIT = o.fit === false ? null : o.fit || (STILL != null ? [27, 13.2] : null);
    const K = num(o.pericentre, 3, 0.01, 1000), SWELL = num(o.swell, 0.45, 0, 3), SEED = Math.round(num(o.seed, 0, 0, 1e6)) * 1000;
    const R_DISC = num(o.disc, 0.75, 0.2, 1.5), R_MIN = 0.01, ARMS = num(o.arms, 0.55, 0, 1), S_OPEN = 0.2;   // the arms are an open two-armed spiral at run time S_OPEN
    const COLORS = o.colors || ["blue", "yellow"], PALE = o.pale || "ink", WARM = o.warm || "accent";
    // steps: snapshots every 0.08; the step is 0.02 or less, small enough for the fastest orbit the softened core allows
    const SNAP = 0.08, EVERY = clamp(Math.ceil(SNAP * Math.sqrt(Math.max(MASS[0], MASS[1])) * Math.pow(EPS, -1.5) / 0.112), 4, 14), DT = SNAP / EVERY;
    const NS = Math.ceil((LEN + EXTRA) / SNAP) + 2, STEPS = (NS - 1) * EVERY, Q = 1 / 1700;                    // snapshot grid (Int16): 19 closest approaches each way
    const rnd = (i, s) => hash(i, s + SEED);

    // ---- the run, once per point count
    let RUN = null;
    function run(n = G3.N) {
      if (RUN && RUN.n === n) return RUN;
      const px = new Float64Array(n), py = new Float64Array(n), pz = new Float64Array(n), vx = new Float64Array(n), vy = new Float64Array(n), vz = new Float64Array(n);
      const snaps = new Int16Array(NS * n * 3), rel = new Float32Array(NS * 2), r0 = new Float32Array(n), gal = new Uint8Array(n);
      // the relative orbit of the cores (core B minus core A), in the x-y plane, `BEFORE` ahead of the closest pass
      const nn = Math.sqrt(2 / (SMA * SMA * SMA)), cph = Math.cos(PHI), sph = Math.sin(PHI), bb = SMA * Math.sqrt(1 - ECC * ECC);
      let MA = -nn * BEFORE; MA -= 6.283185307179586 * Math.round(MA / 6.283185307179586);
      let EA = ECC > 0.8 ? Math.sign(MA) * Math.PI : MA; for (let k = 0; k < 50; k++) EA -= (EA - ECC * Math.sin(EA) - MA) / (1 - ECC * Math.cos(EA));   // Kepler's equation
      const Ed = nn / (1 - ECC * Math.cos(EA)), X = SMA * (Math.cos(EA) - ECC), Y = bb * Math.sin(EA), VX = -SMA * Math.sin(EA) * Ed, VY = bb * Math.cos(EA) * Ed;
      let rx = X * cph - Y * sph, ry = X * sph + Y * cph, wx = VX * cph - VY * sph, wy = VX * sph + VY * cph;
      const fa = MASS[1] / 2, fb = MASS[0] / 2;                                  // core A sits at -fa * rel, core B at +fb * rel
      // each galaxy's share of the points follows its mass; its disc radius goes as the cube root of its mass
      const nB = Math.floor(n * fa), cnt = [n - nB, nB], rg = [R_DISC * Math.cbrt(MASS[0]), R_DISC * Math.cbrt(MASS[1])];
      // inverse CDF of the radial profile r exp(-r / h) on [R_MIN, 1] (in disc radii), h = 0.4
      const H = 0.4, cdf = x => 1 - (1 + x / H) * Math.exp(-x / H), c0 = cdf(R_MIN), c1 = cdf(1);
      const radius = u => { const want = c0 + u * (c1 - c0); let lo = R_MIN, hi = 1; for (let k = 0; k < 26; k++) { const m = (lo + hi) / 2; if (cdf(m) < want) lo = m; else hi = m; } return (lo + hi) / 2; };
      for (let i = 0; i < n; i++) {
        const mB = Math.floor(i * fa), g = Math.floor((i + 1) * fa) - mB, d = TILTS[g], s = g ? fb : -fa, m = g ? mB : i - mB;
        const rn = radius(clamp((m + rnd(i, 601)) / Math.max(1, cnt[g]), 0, 1)), r = rn * rg[g], arm = rnd(i, 602) < ARMS, om = Math.sqrt(MASS[g]) * Math.pow(r * r + EPS2, -0.75);
        const ph = arm ? (rnd(i, 603) < 0.5 ? 0 : Math.PI) - 1.95 * rn - om * S_OPEN + (rnd(i, 604) + rnd(i, 605) - 1) * 0.8 + g * 1.3 : rnd(i, 606) * 6.2832;
        const inc = d.inc + (rnd(i, 607) + rnd(i, 608) - 1) * 0.07, node = d.node + (rnd(i, 609) - 0.5) * 0.14;   // each star's own orbit plane: a thin disc
        const cn = Math.cos(node), sn = Math.sin(node), ci = Math.cos(inc), si = Math.sin(inc);
        const e1x = cn, e1y = sn, e2x = -sn * ci, e2y = cn * ci, e2z = si;       // e1 x e2 = the disc's spin axis, which leans inc away from +z
        const v = r * om, c = Math.cos(ph), sp = Math.sin(ph);
        px[i] = s * rx + r * (c * e1x + sp * e2x); py[i] = s * ry + r * (c * e1y + sp * e2y); pz[i] = r * sp * e2z;
        vx[i] = s * wx + v * (-sp * e1x + c * e2x); vy[i] = s * wy + v * (-sp * e1y + c * e2y); vz[i] = v * c * e2z;
        r0[i] = rn; gal[i] = g;
      }
      const q16 = v => { const u = Math.round(v / Q); return u > 32767 ? 32767 : u < -32767 ? -32767 : u; };
      const store = k => { for (let i = 0, j = k * n * 3; i < n; i++, j += 3) { snaps[j] = q16(px[i]); snaps[j + 1] = q16(py[i]); snaps[j + 2] = q16(pz[i]); } rel[k * 2] = rx; rel[k * 2 + 1] = ry; };
      store(0);
      const h = DT / 2, m1 = MASS[0] * DT, m2 = MASS[1] * DT; let sepMin = 1e9, kMin = 0;
      for (let st = 1; st <= STEPS; st++) {                                      // leapfrog: drift half, kick, drift half
        rx += wx * h; ry += wy * h;
        const rr = rx * rx + ry * ry, ir = 2 / (rr * Math.sqrt(rr)); wx -= rx * ir * DT; wy -= ry * ir * DT;
        const ax = -rx * fa, ay = -ry * fa, bx = rx * fb, by = ry * fb;
        for (let i = 0; i < n; i++) {
          const x = (px[i] += vx[i] * h), y = (py[i] += vy[i] * h), z = (pz[i] += vz[i] * h);
          const d1x = x - ax, d1y = y - ay, d2x = x - bx, d2y = y - by, zz = z * z + EPS2;
          const q1 = d1x * d1x + d1y * d1y + zz, q2 = d2x * d2x + d2y * d2y + zz, i1 = m1 / (q1 * Math.sqrt(q1)), i2 = m2 / (q2 * Math.sqrt(q2));
          const ux = (vx[i] -= d1x * i1 + d2x * i2), uy = (vy[i] -= d1y * i1 + d2y * i2), uz = (vz[i] -= z * (i1 + i2));
          px[i] = x + ux * h; py[i] = y + uy * h; pz[i] = z + uz * h;
        }
        rx += wx * h; ry += wy * h;
        const sep = Math.hypot(rx, ry); if (sep < sepMin) { sepMin = sep; kMin = st; }
        if (st % EVERY === 0) store(st / EVERY);
      }
      // facts a narration may lean on, measured on the run itself at its end (`AFTER` past the closest pass)
      const kEnd = Math.round(LEN / SNAP), oE = kEnd * n * 3, ex = rel[kEnd * 2], ey = rel[kEnd * 2 + 1], reach = new Float32Array(n), cand = [[], []]; let far = 0;
      for (let i = 0; i < n; i++) { const x = snaps[oE + i * 3] * Q, y = snaps[oE + i * 3 + 1] * Q, z = snaps[oE + i * 3 + 2] * Q, g = gal[i];
        const dA = Math.hypot(x + ex * fa, y + ey * fa, z), dB = Math.hypot(x - ex * fb, y - ey * fb, z), own = g ? dB : dA, other = g ? dA : dB;
        if (Math.min(dA, dB) > 1.5) far++;
        reach[i] = smooth(1.2, 2.8, own);                                        // 0..1: how far the star ends from the core it was born around (1 = out in a tail)
        if (r0[i] > 0.667 && r0[i] < 0.88 && own > 1.8 && other > own) cand[g].push([own, i]); }
      const tail = cand.map(c => { c.sort((a, b) => a[0] - b[0]); return c.length ? c[Math.floor(c.length * 0.55)][1] : -1; });
      RUN = { n, snaps, rel, r0, gal, reach, tail, far, sepMin, tMin: kMin * DT, tmp: null, xf: null };
      RUN.xf = frame(RUN);
      return RUN;
    }

    // ---- playback. The state at run time s is a Catmull-Rom curve through four snapshots.
    function weights(s) {
      const u = clamp(s / SNAP, 0, NS - 1.0001), k = Math.floor(u), f = u - k, f2 = f * f, f3 = f2 * f;
      return { a: Math.max(0, k - 1), b: k, c: Math.min(NS - 1, k + 1), d: Math.min(NS - 1, k + 2), w0: -0.5 * f3 + f2 - 0.5 * f, w1: 1.5 * f3 - 2.5 * f2 + 1, w2: -1.5 * f3 + 2 * f2 + 0.5 * f, w3: 0.5 * f3 - 0.5 * f2 };
    }
    function sample(R, s, out) {                                                 // every star, in world units (K a closest approach)
      const W = weights(s), n3 = R.n * 3, sn = R.snaps, a = W.a * n3, b = W.b * n3, c = W.c * n3, d = W.d * n3, w0 = W.w0 * Q * K, w1 = W.w1 * Q * K, w2 = W.w2 * Q * K, w3 = W.w3 * Q * K;
      for (let j = 0; j < n3; j++) out[j] = w0 * sn[a + j] + w1 * sn[b + j] + w2 * sn[c + j] + w3 * sn[d + j];
    }
    // the view turn and the fit, as one map p -> (turn(p) - centre) * scale; null when there is neither
    function frame(R) {
      if (!FIT && !VIEW.az && !VIEW.el) return null;
      const ca = Math.cos(-VIEW.az), sa = Math.sin(-VIEW.az), ce = Math.cos(VIEW.el), se = Math.sin(VIEW.el), xf = { ca, sa, ce, se, cx: 0, cy: 0, sc: 1 };
      if (FIT) {
        const tmp = new Float32Array(R.n * 3), xs = [], ys = []; sample(R, STILL != null ? STILL * LEN : LEN, tmp);
        for (let j = 0; j < R.n * 3; j += 9) { const x = tmp[j], y = tmp[j + 1], z = tmp[j + 2], z1 = -x * sa + z * ca; xs.push(x * ca + z * sa); ys.push(y * ce - z1 * se); }
        xs.sort((a, b) => a - b); ys.sort((a, b) => a - b); const lo = Math.floor(xs.length * 0.004), hi = xs.length - 1 - lo;
        xf.cx = (xs[lo] + xs[hi]) / 2; xf.cy = (ys[lo] + ys[hi]) / 2; xf.sc = Math.min(FIT[0] / Math.max(1e-6, xs[hi] - xs[lo]), FIT[1] / Math.max(1e-6, ys[hi] - ys[lo]));
      }
      return xf;
    }
    function place(xf, p) {
      if (!xf) return p;
      const x1 = p[0] * xf.ca + p[2] * xf.sa, z1 = -p[0] * xf.sa + p[2] * xf.ca;
      return [(x1 - xf.cx) * xf.sc, (p[1] * xf.ce - z1 * xf.se - xf.cy) * xf.sc, (p[1] * xf.se + z1 * xf.ce) * xf.sc];
    }
    // local seconds -> run time. A steady run to LEN, then a soft landing into a slow drift that fades out before
    // the snapshots end. A still starts at its frozen moment and only drifts.
    const coast = y => (y > 0 ? COAST * (1 - Math.exp(-y / COAST)) : 0);
    function runTime(tl) {
      const t = Math.max(0, +tl || 0);
      if (STILL != null) return STILL * LEN + coast(DRIFT * t);
      if (t <= DUR) return t * RATE;
      const x = t - DUR; return LEN + coast(DRIFT * x + (RATE - DRIFT) * TAU * (1 - Math.exp(-x / TAU)));
    }
    const relAt = (R, s) => { const W = weights(s), r = R.rel; return [W.w0 * r[W.a * 2] + W.w1 * r[W.b * 2] + W.w2 * r[W.c * 2] + W.w3 * r[W.d * 2], W.w0 * r[W.a * 2 + 1] + W.w1 * r[W.b * 2 + 1] + W.w2 * r[W.c * 2 + 1] + W.w3 * r[W.d * 2 + 1]]; };
    const coresAt = (R, s) => { const [x, y] = relAt(R, s), fa = MASS[1] / 2, fb = MASS[0] / 2; return [[-x * fa, -y * fa, 0], [x * fb, y * fb, 0]]; };       // in run units
    const starAt = (R, i, s) => { const W = weights(s), n3 = R.n * 3, sn = R.snaps, j = clamp(Math.round(i) || 0, 0, R.n - 1) * 3, a = W.a * n3 + j, b = W.b * n3 + j, c = W.c * n3 + j, d = W.d * n3 + j;
      return [0, 1, 2].map(q => (W.w0 * sn[a + q] + W.w1 * sn[b + q] + W.w2 * sn[c + q] + W.w3 * sn[d + q]) * Q); };                                              // in run units

    // ---- the dress: brightness rises outward, so the outer disc (the stars that become tails) carries the light and
    // the cores do not burn to white; a small nucleus fills the centre
    // The numbers are tuned at 30,000 points. With fewer points each is larger (and a little brighter: more would wash
    // the hues out), with more points each is smaller and dimmer, so the picture carries about the same light at any count.
    const sizeK = n => clamp(Math.pow(30000 / n, n < 30000 ? 0.35 : 0.25), 0.7, 1.6);
    function dress(R, f) {
      const c = COLORS.map(G3.rgb), pale = G3.rgb(PALE), warm = G3.rgb(WARM), bk = clamp(Math.pow(30000 / R.n, R.n < 30000 ? 0.15 : 0.5), 0.5, 1.25), sk = sizeK(R.n);
      for (let i = 0; i < R.n; i++) { const g = R.gal[i], r = R.r0[i], k = rnd(i, 611);
        const b = ((0.25 + 0.65 * smooth(0.05, 0.7, r)) * (0.7 + 0.7 * smooth(0.25, 0.7, r)) + 0.3 * (1 - smooth(0.0, 0.1, r))) * (0.7 + 0.5 * rnd(i, 612)) * bk;
        const c0 = c[g] || c[0], c1 = g ? (k < 0.5 ? warm : pale) : pale, m = g ? 0.1 + 0.45 * k : 0.08 + 0.5 * k * (1 - r * 0.6);
        G3.tint(f, i, [lerp(c0[0], c1[0], m), lerp(c0[1], c1[1], m), lerp(c0[2], c1[2], m)], b);
        f.size[i] = (0.62 + 0.5 * rnd(i, 613) + (rnd(i, 614) > 0.985 ? 1.3 : 0) + 0.35 * smooth(0.5, 0.75, r)) * sk; }
      return Float32Array.from(f.size);
    }

    const build = (f, n) => {
      const R = run(n), base = dress(R, f), reach = R.reach, xf = R.xf, sk = sizeK(n);
      return (tl, f) => {
        const s = runTime(tl), P = f.pos, S = f.size, a = SWELL * sk * smooth(BEFORE + 0.4, BEFORE + 2.4, s);   // the swell comes on as the tails leave
        sample(R, s, P);
        if (xf) { const { ca, sa, ce, se, cx, cy, sc } = xf; for (let j = 0; j < n * 3; j += 3) { const x = P[j], y = P[j + 1], z = P[j + 2], x1 = x * ca + z * sa, z1 = -x * sa + z * ca; P[j] = (x1 - cx) * sc; P[j + 1] = (y * ce - z1 * se - cy) * sc; P[j + 2] = (y * se + z1 * ce) * sc; } }
        for (let i = 0; i < n; i++) S[i] = base[i] + a * reach[i];
      };
    };
    // ---- what a film may ask
    build.duration = DUR; build.tPass = BEFORE / RATE;
    build.cores = tl => { const R = run(); return coresAt(R, runTime(tl)).map(c => place(R.xf, [c[0] * K, c[1] * K, 0])); };
    build.star = (i, tl) => { const R = run(), p = starAt(R, i, runTime(tl)); return place(R.xf, [p[0] * K, p[1] * K, p[2] * K]); };
    build.galaxy = i => run().gal[clamp(Math.round(i) || 0, 0, run().n - 1)];
    build.discRadius = (g = 0) => { const R = run(); return R_DISC * Math.cbrt(MASS[g ? 1 : 0]) * K * (R.xf ? R.xf.sc : 1); };
    build.tailStar = g => { const tail = run().tail; return g == null ? (tail[0] >= 0 ? tail[0] : tail[1]) : tail[g ? 1 : 0]; };
    build.pull = (i, tl) => { const R = run(), s = runTime(tl), p = starAt(R, i, s); return coresAt(R, s).map((c, g) => { const d2 = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + p[2] * p[2]; return MASS[g] * Math.sqrt(d2) / Math.pow(d2 + EPS2, 1.5); }); };
    build.check = () => { const R = run(), pass = Math.abs(R.sepMin - 1) < 0.02 && (ECC < 0.05 || Math.abs(R.tMin - BEFORE) < 0.1), tails = R.far / R.n, tailStar = build.tailStar();
      return { ok: pass && tails >= 0.05 && tailStar >= 0, pass, passAt: R.tMin / RATE, passSeparation: R.sepMin, tails, tailStar, stars: R.n }; };
    return build;
  };
})();
