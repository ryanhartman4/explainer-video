// forms3d/grid.js: the points become a grid of cells, one cell for one unit of something (a test, a pixel, a person,
// a day). Every cell has a state, and a state has a colour. A scan can reveal the cells and a wave can flip them.
//   const tests = G3.lib.grid({ states: fail, reveal: [tA, tB], flip: [tC, tD] });      // fail: a Uint8Array from the film's own data
//   G3.form("mine", tests);  const seg = G3.morph(t0, "mine", { at: [6, 1, 0], clock: t => t });
//
// Options (all optional):
//   cols (100), rows (100)   the grid. Cell k sits in column k % cols of row floor(k / cols), row 0 at the top. The film
//                         needs at least cols x rows points (the form reports a problem if it has fewer).
//   size (14.85)          the longer side of the grid in world units, first cell centre to last. Cells are square.
//   states                the state of each cell before the wave: a Uint8Array or array (one entry a cell), a function
//                         (k, col, row) => state, or one number for all. Default: a seeded stand-in, 3 cells in 10 in state 1.
//   to (0)                the state of each cell after the wave, given the same way. Default: every cell ends in state 0.
//   colors (["green", "red", "yellow", "purple", "accent", "blue", "ink"])   the colour of state 0, 1, 2 ... Look tokens,
//                         CSS colours, or [r, g, b] (0 to 1, used as given).
//   vivid (1.6)           how far each colour is pushed from grey, so that thousands of overlapping points keep their hue.
//                         1 = the look's own colour. The "green" token gets the film's deeper green as well.
//   weight ([0, 1])       how much each state stands out before the wave, 0 to 1. 0 = small and dim (the many), 1 = large,
//                         bright and twinkling (the few). States past the end of the list are 1.
//   weightTo (1)          the same for the states the wave leaves behind: a number for all, or a list.
//   reveal (1)            the scan that shows each cell's state: how much of the grid has been revealed. A number 0 to 1
//                         (held), a pair [from, to] of local times (the scan runs between them), or a function
//                         tl => 0 to 1 that never falls. A cell not yet revealed is a small pale dot.
//   flip (0)              the wave that moves each cell from `states` to `to`, given the same way as reveal. flip: 1 shows
//                         the grid after the wave: every cell in its `to` state, a slow shimmer.
//   revealOrder ("rows")  the order of the scan: "rows" (top to bottom, a little ragged), "cols" (left to right), "random",
//                         or a function (k, col, row) => 0 to 1 (when the scan reaches that cell).
//   flipOrder             the order of the wave: a function (k, col, row) => 0 to 1. Default: a front that runs left to
//                         right and leans by `lean`.
//   lean (0.42)           how far the wave front leans: columns of lead per row. 0 = an upright front.
//   ripple (1.3)          how far the crest of the wave lifts the cells toward the camera, world units. 0 = flat.
//   swing (0.3)           the grid turns about its upright axis by this angle (radians) while the wave crosses, so the
//                         crest shows in relief, then squares up again. 0 = it stays square.
//   turn (0.5)            the grid waits turned by this angle and squares up in the second before the scan starts.
//                         Only seen when reveal starts below 1. 0 = it waits square.
//   sway (0.1)            a slow rocking about the upright axis whenever the grid is at rest, radians. 0 = still.
//   frame (true)          a thin frame of points around the grid. When the wave has left every cell in one state, the
//                         frame takes that state's colour. false: those points join the dust.
//   dust (1)              brightness of the halo of dust made of the spare points. 0 hides it.
//   spread ([2.75, 0.05]) how far the dust reaches beyond the frame, sideways and up and down, world units. The default
//                         keeps the space above and below the grid clear for a heading and a counter.
//   trim ("blue")         the colour of the frame, of half the dust, and (mixed with ink) of the cells not yet revealed.
//   level (1)             the G3.level the film holds while the grid is on. A cell is tuned to give half as much light
//                         again as one point can at level 1. At level 1 the form stacks two points on each cell to get
//                         there, when cols x rows is at most 35% of the film's points; with fewer points the cells are
//                         dimmer. Or hold G3.level.to(t, 1.5) and pass level: 1.5, as the film did: then one point a
//                         cell is enough, more points go to the dust, and the dust, the frame and the unrevealed cells
//                         stay as quiet as they are at level 1.
//
// Local time: the form is a pure function of its local time tl (seconds). The scan and the wave run when `reveal` and
//   `flip` say. The simplest way to put them on the narration: give the morph `clock: t => t`, so local time is film
//   time, and pass cue times: reveal: [p.at("ran the tests"), p.after("half failed")], flip: [p.at("all pass"), ...].
//   With a number or no option the grid is at rest: it shimmers, sways and the dust drifts, for as long as it is held.
//
// For counters, labels and markers (build is what G3.lib.grid() returned; tl is a local time, seg.local(t)):
//   build.count(state, tl)   how many cells show that state at tl. It counts what the picture shows, so a counter fed
//                            from it is exact: a cell not yet revealed counts for no state.
//   build.counts(tl)         the same for every state at once, as an array. build.shown(tl): cells revealed so far.
//   build.state(k, tl)       the state cell k shows at tl, or -1 if it is not yet revealed.
//   build.cell(k, tl)        the position of cell k at tl, with the form's own turn and the lift of the wave, so a ring
//                            drawn there stays on its cell. build.cell(k) alone is its resting place.
//   build.corners, build.frameCorners   the four corner cells' centres and the frame's corners at rest: top left, top
//                            right, bottom right, bottom left. build.place(p, tl) turns any resting point as the form
//                            is turned at tl.
//   build.cells, build.cols, build.rows, build.pitch (world units between cells), build.width, build.height (of the frame).
//   All positions are at scale 1 before the morph's at and scale: pass them through seg.world(p, t).
//
// Size: with the defaults the frame is 15.7 x 15.7 world units and the dust reaches 21.2 wide, 15.8 high and 10 deep,
//   all of it behind the grid. Centred on the origin, facing the rest camera (az 0, el 0, dist 34).
// Points: each cell takes one point or two, the frame about 57 for each world unit of its length, the dust the rest.
// With fewer cells the cells grow: under about 35 cells a side each cell becomes a small disc of several points.
// Source: scene 5 of the film "One Sitting" (10,000 seeded tests of a binary search, run at load). No mathematics
//   beyond the counting: the states are the film's data.
(function () {
  const G3 = window.G3;
  const PALETTE = ["green", "red", "yellow", "purple", "accent", "blue", "ink"];
  G3.lib.grid = (o = {}) => {
    const { hash, clamp, lerp, smooth } = G3;
    const cols = Math.max(1, Math.round(o.cols ?? 100)), rows = Math.max(1, Math.round(o.rows ?? 100)), cells = cols * rows;
    const pitch = (o.size ?? 14.85) / Math.max(1, Math.max(cols, rows) - 1), g = pitch / 0.15;
    const halfW = (cols - 1) / 2 * pitch, halfH = (rows - 1) / 2 * pitch, margin = 0.42 + 0.45 * Math.max(0, pitch - 0.15), EW = halfW + margin, EH = halfH + margin;
    const colOf = k => k % cols, rowOf = k => Math.floor(k / cols);

    // ---- the cells: their two states, and when the scan and the wave reach each one (0..1]
    const read = (v, fill) => { const a = new Uint8Array(cells);
      if (typeof v === "function") for (let k = 0; k < cells; k++) a[k] = v(k, colOf(k), rowOf(k)) | 0;
      else if (typeof v === "number") a.fill(v);
      else if (v && v.length != null) for (let k = 0; k < cells; k++) a[k] = v[k] | 0;
      else if (fill) fill(a);
      return a; };
    const from = read(o.states, a => { for (let k = 0; k < cells; k++) a[k] = hash(k, 531) < 0.3 ? 1 : 0; }), to = read(o.to);
    let nStates = 2; for (let k = 0; k < cells; k++) nStates = Math.max(nStates, from[k] + 1, to[k] + 1);
    let oneEnd = to[0]; for (let k = 1; k < cells; k++) if (to[k] !== oneEnd) { oneEnd = -1; break; }      // the state every cell ends in, if there is one
    const order = fn => { const a = new Float32Array(cells); for (let k = 0; k < cells; k++) a[k] = clamp(+fn(k, colOf(k), rowOf(k)) || 0, 1e-6, 1); return a; };
    const jr = 3 * Math.min(1, rows / 100), jc = 3 * Math.min(1, cols / 100), ro = o.revealOrder || "rows";
    const scanF = order(typeof ro === "function" ? ro : ro === "cols" ? (k, c) => (c + (hash(k, 501) - 0.5) * jc) / cols : ro === "random" ? k => hash(k, 501) : (k, c, r) => (r + (hash(k, 501) - 0.5) * jr) / rows);
    const lean = o.lean ?? 0.42, w0 = Math.min(0, lean * (rows - 1)), w1 = Math.max(cols - 1, cols - 1 + lean * (rows - 1));
    const waveF = order(typeof o.flipOrder === "function" ? o.flipOrder : (k, c, r) => (c + lean * r - w0) / (w1 - w0 || 1));
    const list = (v, d) => { const a = new Float32Array(nStates); for (let s = 0; s < nStates; s++) a[s] = clamp(typeof v === "number" ? v : v && v[s] != null ? v[s] : d); return a; };
    const wtA = list(o.weight || [0, 1], 1), wtB = list(o.weightTo, 1);
    const ripple = o.ripple ?? 1.3, swing = o.swing ?? 0.3, turn = o.turn ?? 0.5, sway = o.sway ?? 0.1;

    // ---- the scan and the wave as progress over local time. Each gives, for a local time: p (0..1), u (the same, but
    // running on below 0 and past 1 where that is known), since0 and since1 (seconds since it started and since it
    // finished; negative before), and age(frac): seconds since it reached that fraction (negative: until it does).
    const progress = (v, d) => {
      if (v == null) v = d;
      if (Array.isArray(v)) { const a = v[0], dur = Math.max(1e-6, v[1] - v[0]);
        return tl => { const u = (tl - a) / dur; return { p: clamp(u), u, since0: tl - a, since1: tl - a - dur, age: fr => (u - fr) * dur }; }; }
      if (typeof v === "function") { const at = tl => clamp(+v(tl) || 0), STEP = 0.05, J = 46, H = new Float64Array(J + 1);
        const since = (tl, hit) => { let lo = tl - 2.4, hi = tl + 1.1; if (!hit(at(hi))) return -1.1; if (hit(at(lo))) return 2.4;
          for (let n = 0; n < 16; n++) { const m = (lo + hi) / 2; if (hit(at(m))) hi = m; else lo = m; } return tl - hi; };
        return tl => { for (let j = 0; j <= J; j++) H[j] = at(tl - j * STEP); const p = H[0], rate = (at(tl + STEP) - p) / STEP;
          return { p, u: p > 0 ? p : -1, since0: since(tl, x => x > 0), since1: since(tl, x => x >= 1),
            age: fr => { if (fr > p) return rate > 1e-9 ? (p - fr) / rate : -1e9; if (fr <= H[J]) return J * STEP;
              let j = 0; while (H[j + 1] >= fr) j++; return (j + (H[j] - fr) / (H[j] - H[j + 1])) * STEP; } }; }; }
      const p = clamp(+v || 0), fixed = { p, u: p > 0 ? p : -1, since0: p > 0 ? 1e9 : -1e9, since1: p >= 1 ? 1e9 : -1e9, age: fr => (fr <= p ? 1e9 : -1e9) };
      return () => fixed;
    };
    const reveal = progress(o.reveal, 1), flip = progress(o.flip, 0);
    let memo = null;
    const at = tl => {                                                        // everything about one local time, worked out once
      if (memo && memo.tl === tl) return memo;
      const r = reveal(tl), w = flip(tl), sIn = smooth(-0.2, 0.7, w.since0), square = smooth(-1, 0, r.since0);
      // the turn about the form's own upright axis: it waits turned, squares up for the scan, swings while the wave
      // crosses so the crest shows in relief, and rocks slowly whenever it is at rest
      const th = turn * (1 - square) + swing * sIn * (1 - smooth(0.3, 1.2, w.since1)) + sway * Math.sin(tl * 0.5) * square * (1 - sIn * (1 - smooth(1.2, 2.2, w.since1)));
      return (memo = { tl, r, w, R: r.p, W: w.p, ct: Math.cos(th), st: Math.sin(th), counts: null });
    };
    const lift = (wf, w) => { if (!ripple || w.u - wf < -0.05) return 0; const dt = w.age(wf); if (dt > 1.2 || dt < -1) return 0;
      const q = (dt - 0.12) / 0.2; return Math.exp(-q * q) * ripple * (1 - 0.75 * smooth(0.8, 1, wf)); };   // the crest flattens as it reaches the far edge, so it stays inside the frame

    const build = (f, N) => {
      if (N < cells) throw new Error(`grid: ${cols} x ${rows} is ${cells} cells and the film has ${N} points`);
      // ---- how the points are shared out: `per` points a cell, then the frame, then the dust
      // The film's cell is one point of size 3 on a 0.15 pitch, at G3.level 1.5: `want` is how many points' worth of light
      // a cell needs at this film's level to match it. A small cell is one point, or two stacked; a large cell is a disc
      // of `per` points, as dense as the film's grid. gain and hidGain scale the colours of shown and unrevealed cells.
      const level = Math.max(0.05, o.level ?? 1), soft = 1 / level, want = 1.5 / level, full = Math.round(0.42 * g * g), room = Math.floor(0.7 * N / cells), disc = full >= 4 && room >= 4;
      const per = disc ? Math.min(room, Math.ceil(full * Math.max(1, want))) : want > 1.01 && room >= 2 ? 2 : 1, rad = 0.36 * pitch;
      const grow = disc ? clamp(Math.sqrt(want * full / per), 1, 2.2) : clamp(g, 0.6, 2), eff = disc ? per * grow * grow / full : per, gain = Math.min(1, want / eff), hidGain = Math.min(1, soft / eff);
      const nCell = cells * per, spare = N - nCell, round = 4 * (EW + EH), NB = o.frame === false ? 0 : Math.min(Math.round(57.36 * round), Math.floor(spare * 0.45)), nDust = spare - NB;
      const dustK = o.dust ?? 1, sx = (o.spread || [])[0] ?? 2.75, sy = (o.spread || [])[1] ?? 0.05;
      const sat = (c, k) => { const m = (c[0] + c[1] + c[2]) / 3; return c.map(v => clamp(m + (v - m) * k)); };
      const vivid = o.vivid ?? 1.6, names = o.colors || PALETTE;
      const shade = c => (Array.isArray(c) ? c : c === "green" && vivid > 1 ? sat(G3.rgb(c), vivid + 0.2).map((v, i) => v * [0.6, 1, 0.45][i]) : sat(G3.rgb(c), vivid));
      const COL = [], CREST = []; for (let s = 0; s < nStates; s++) { const c = shade(names[s] ?? PALETTE[s % PALETTE.length]); COL.push(c); CREST.push(c.map(v => lerp(v, 1, 0.67))); }   // the wave front: the new colour, most of the way to white
      const ink = G3.rgb("ink"), trim = G3.rgb(o.trim || "blue"), hid = ink.map((v, i) => lerp(v, trim[i], 0.6)), pale = [0.9, 0.95, 1];   // pale: the scan line. Colours stay at or under 1 (the shader clamps and the hue would shift): size carries brightness
      const done = oneEnd >= 0 ? COL[oneEnd] : trim;
      const base = new Float32Array(N * 3), H11 = new Float32Array(cells), HB = new Float32Array(NB), PH = new Float32Array(nDust);
      for (let k = 0; k < cells; k++) H11[k] = hash(k, 511);
      const dens = nDust / Math.max(1, 4 * (EH + sy) * (sx + 0.4)) / 164.9, thin = clamp(Math.pow(Math.max(dens, 1e-3), -0.6), 0.3, 1.6);   // the film's halo: 16,400 points in two wings
      const frameSize = 0.85 * clamp(Math.sqrt(57.36 * round / Math.max(1, NB)), 1, 2.2);
      for (let i = 0, j = 0; i < N; i++, j += 3) {
        if (i < nCell) { const k = i % cells, n = Math.floor(i / cells), a = n * 2.39996323 + hash(k, 516) * 6.2832, r = disc ? rad * Math.sqrt(n / (per - 1)) * (0.92 + 0.16 * hash(i, 517)) : 0;
          base[j] = (colOf(k) - (cols - 1) / 2) * pitch + Math.cos(a) * r; base[j + 1] = ((rows - 1) / 2 - rowOf(k)) * pitch + Math.sin(a) * r; }
        else if (i < nCell + NB) { const m = i - nCell, e = (hash(i, 502) - 0.5) * 0.05, ex = EW + e, ey = EH + e; let u = m / NB * round, x, y;   // the frame, clockwise from the top left
          if (u < 2 * EW) { x = (u / EW - 1) * ex; y = ey; } else if ((u -= 2 * EW) < 2 * EH) { x = ex; y = -(u / EH - 1) * ey; }
          else if ((u -= 2 * EH) < 2 * EW) { x = -(u / EW - 1) * ex; y = -ey; } else { u -= 2 * EW; x = -ex; y = (u / EH - 1) * ey; }
          base[j] = x; base[j + 1] = y; base[j + 2] = (hash(i, 503) - 0.5) * 0.1; f.size[i] = frameSize; HB[m] = hash(i, 504); }
        else { const a = hash(i, 505) * 6.2832, d = 0.4 + 3.4 * Math.pow(hash(i, 506), 1.7), ca = Math.cos(a), sa = Math.sin(a), sq = 1 / Math.max(Math.abs(ca), Math.abs(sa));   // a halo of dust that thins outward and sits behind the grid
          const out = d * (0.4 + 0.6 * sq); let x = (EW * sq + out) * ca * 1.15, y = (EH * sq + out) * sa * 0.92, z = -0.4 - 7 * hash(i, 507);
          if (Math.abs(y) > EH + sy) { y = (hash(i, 513) * 2 - 1) * (EH + sy); x = (x < 0 ? -1 : 1) * (EW + 0.3 + (sx - 0.15) * Math.pow(hash(i, 514), 1.6)); }
          if (Math.abs(x) > EW + sx) x = (x < 0 ? -1 : 1) * (EW + 0.3 + (sx - 0.35) * hash(i, 515));
          if (Math.abs(x) < EW && Math.abs(y) < EH) z -= 2.5;
          base[j] = x; base[j + 1] = y; base[j + 2] = z; PH[i - nCell - NB] = hash(i, 512) * 6.2832;
          G3.tint(f, i, hash(i, 508) < 0.5 ? trim : ink, (0.14 + 0.26 * hash(i, 509)) * soft * dustK * thin); f.size[i] = dustK > 0 ? 0.5 + 0.9 * hash(i, 510) : 0; }
      }
      return (tl, fm) => {
        const P = fm.pos, C = fm.col, S = fm.size, F = at(tl), r = F.r, w = F.w, R = F.R, W = F.W, ct = F.ct, st = F.st;
        for (let k = 0; k < cells; k++) {
          const h = H11[k], wf = waveF[k], sf = scanF[k], wv = w.u - wf, a = from[k], b = to[k];
          let cr, cg, cb, sz, z = 0, k0 = gain;
          if (!(sf <= R)) { const q = 0.5 + 0.25 * h; k0 = hidGain; cr = hid[0] * q; cg = hid[1] * q; cb = hid[2] * q; sz = 1.5; }             // not yet revealed
          else { const lit = clamp(1 + wv / 0.05), c = wf <= W ? COL[b] : COL[a], wt = lerp(wtA[a], wtB[b], lit);                        // the wave lights each cell just before it arrives
            const q = lerp(lerp(0.3, 0.9 + 0.1 * Math.sin(tl * 2.6 + h * 6.28), wtA[a]), lerp(0.3, 0.85 + 0.05 * h + 0.1 * Math.sin(tl * 1.1 - wf * 9), wtB[b]), lit);
            cr = c[0] * q; cg = c[1] * q; cb = c[2] * q; sz = lerp(1.6, 3.0, wt);
            const dt = r.age(sf); if (dt < 1.2) { const fl = Math.exp(-dt * 7), m = fl * 0.7; cr = lerp(cr, pale[0], m); cg = lerp(cg, pale[1], m); cb = lerp(cb, pale[2], m); sz += fl * 0.8; } }   // the scan line
          if (wv >= -0.05) { const dt = w.age(wf);
            if (dt < 3) { const ch = a !== b, fl = Math.exp(-Math.max(0, dt) * 3.2) * clamp(1 + wv / 0.05), q = (dt - 0.12) / 0.2, bump = dt > -1 ? Math.exp(-q * q) : 0, c = CREST[b];
              const m = clamp(fl * (ch ? 0.85 : 0.3) + bump * 0.15); cr = lerp(cr, c[0], m); cg = lerp(cg, c[1], m); cb = lerp(cb, c[2], m); sz += fl * (ch ? 0.9 : 0.3) + bump * 0.3;
              z = bump * ripple * (1 - 0.75 * smooth(0.8, 1, wf)); } }
          sz *= grow; cr *= k0; cg *= k0; cb *= k0;
          for (let n = 0, i = k, j = k * 3; n < per; n++, i += cells, j += cells * 3) { C[j] = cr; C[j + 1] = cg; C[j + 2] = cb; S[i] = sz;
            P[j] = base[j] * ct + z * st; P[j + 1] = base[j + 1]; P[j + 2] = -base[j] * st + z * ct; }
        }
        const fin = oneEnd >= 0 ? clamp(w.since1 / 0.8) : 0;                                              // the frame takes the end colour once every cell has it
        for (let m = 0, i = nCell, j = nCell * 3; m < NB; m++, i++, j += 3) { const q = (0.34 + 0.22 * HB[m] + 0.2 * fin) * soft;
          C[j] = lerp(trim[0], done[0], fin) * q; C[j + 1] = lerp(trim[1], done[1], fin) * q; C[j + 2] = lerp(trim[2], done[2], fin) * q;
          P[j] = base[j] * ct + base[j + 2] * st; P[j + 1] = base[j + 1]; P[j + 2] = -base[j] * st + base[j + 2] * ct; }
        for (let m = 0, i = nCell + NB, j = i * 3; m < nDust; m++, i++, j += 3) { const ph = PH[m], x = base[j] + Math.sin(tl * 0.23 + ph) * 0.3, z = base[j + 2] + Math.sin(tl * 0.15 + ph * 2.3) * 0.6;
          P[j] = x * ct + z * st; P[j + 1] = base[j + 1] + Math.cos(tl * 0.19 + ph * 1.7) * 0.3; P[j + 2] = -x * st + z * ct; }
      };
    };

    // ---- what a film needs for its counter, labels and markers
    build.cells = cells; build.cols = cols; build.rows = rows; build.pitch = pitch; build.width = 2 * EW; build.height = 2 * EH;
    build.corners = [[-halfW, halfH, 0], [halfW, halfH, 0], [halfW, -halfH, 0], [-halfW, -halfH, 0]];
    build.frameCorners = [[-EW, EH, 0], [EW, EH, 0], [EW, -EH, 0], [-EW, -EH, 0]];
    build.state = (k, tl) => { const F = at(tl); return scanF[k] <= F.R ? (waveF[k] <= F.W ? to[k] : from[k]) : -1; };
    build.counts = tl => { const F = at(tl); if (F.counts) return F.counts; const c = new Array(nStates).fill(0); let n = 0;
      for (let k = 0; k < cells; k++) if (scanF[k] <= F.R) { c[waveF[k] <= F.W ? to[k] : from[k]]++; n++; }
      c.shown = n; return (F.counts = c); };
    build.count = (s, tl) => build.counts(tl)[s] || 0;
    build.shown = tl => build.counts(tl).shown;
    build.place = (p, tl) => { if (tl == null) return [p[0], p[1], p[2] || 0]; const F = at(tl), z = p[2] || 0; return [p[0] * F.ct + z * F.st, p[1], -p[0] * F.st + z * F.ct]; };
    build.cell = (k, tl) => { const x = (colOf(k) - (cols - 1) / 2) * pitch, y = ((rows - 1) / 2 - rowOf(k)) * pitch; return tl == null ? [x, y, 0] : build.place([x, y, lift(waveF[k], at(tl).w)], tl); };
    return build;
  };
})();
