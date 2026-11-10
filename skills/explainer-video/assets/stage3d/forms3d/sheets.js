// forms3d/sheets.js: the points become a stack of rippling lattice sheets, for any layered thing (the layers of a
// network, a tech stack, strata). Bright knots mark the units on each sheet, motes climb from sheet to sheet, and
// the film can send a pass of light up through the stack.
//   G3.form("mine", G3.lib.sheets({ layers: 6 }));  G3.morph(t, "mine")
// To send the light and to label the layers, keep the form in a variable:
//   const sheets = G3.lib.sheets({ layers: 6 });
//   G3.form("mine", sheets);  const seg = G3.morph(t0, "mine");
//   sheets.pulse(p.at("the word") - t0, { dur: 1.2, hold: true });   // one pass on a spoken word; the stack stays lit
//
// Options (all optional):
//   layers (6)         how many sheets.
//   cols (11), rows (7)   the bright knots (units) on each sheet: cols across the width, rows across the depth. The
//                      fine lattice between them sizes itself to the point count.
//   width (17.5), depth (8.5)   the size of one sheet, in world units.
//   gap (1.5)          the distance between two sheets.
//   color ("blue")     the colour of the bottom sheet.
//   topColor ("ink")   the top sheet leans three quarters of the way to this colour; the sheets between are graded.
//   colors (none)      a list of colours, one a sheet from the bottom up (it repeats if it is short). It replaces
//                      color and topColor: use it when each layer has its own meaning.
//   litColor ("accent")   the colour of the pass of light.
//   motes (0.12)       the share of the points that climb between the sheets, up the columns over the knots. 0 = none.
//   ripple (1)         the height of the waves on the sheets. 0 = flat sheets.
//   speed (1)          the pace of the ripple, the shimmer and the motes. It does not change the pulses or the spin.
//   tilt (0.33)        radians the stack tips toward the camera, so the rest camera sees the faces of the sheets.
//   turn (-0.5)        radians the stack is turned about its own upright axis at local time 0.
//   spin (0.034)       radians a second it keeps turning. 0 = it stays put.
//                      If the film tilts and turns with the camera or the morph instead, pass tilt: 0, turn: 0, spin: 0.
//   pulses ([])        passes of light, as a list of { at, ...the options of pulse() below }. Empty: no light.
//
// The pass of light: sheets.pulse(at, { dur, hold, until, amp, attack, ring, every }) adds one and returns the form,
//   so calls chain. Call it while the film is built, before any frame is drawn.
//   at        local time (seconds) the light enters the bottom sheet.
//   dur (1.2) seconds it takes to climb to the top sheet. 0.3 is a quick flicker, 1.5 a slow rise.
//   hold (0)  how lit the stack stays after the pass, 0 to 1. true = 0.85.
//   until     local time a held light lets go (it fades over 0.8 s). Default: never.
//   amp (1)   the strength of the flash. 0.5 is a quiet pass.
//   attack, ring   seconds the flash takes to peak, and to spread from the middle of a sheet to its corners.
//                  Both follow dur unless given.
//   every     repeat the pass every so many seconds (an idle heartbeat). A repeating pass does not hold.
//
// Local time: the form is alive for as long as tl runs: the sheets ripple and shimmer, the motes climb, the stack
//   turns. Nothing ends, so there is no duration. Pulse times are local time, and local time is seconds since the
//   morph began, so a pass lands on a word with sheets.pulse(p.at("the word") - t0) where t0 is the morph's time.
//   (A morph with clock: t => t makes pulse times film times, but the turn then runs on film time too.)
//
// For labels and markers. Each gives a position [x, y, z] at scale 1, before the morph's at/scale: pass it through
// seg.world(pos, t), where seg is what G3.morph returned. The stack turns, so each takes the local time
// tl = seg.local(t).
//   sheets.layer(k, tl)          the middle of sheet k (0 = bottom); its y is the height of the layer.
//   sheets.point(k, u, v, tl)    a point on sheet k: u from -1 (left edge) to 1 (right edge), v from -1 (back edge)
//                                to 1 (front edge). k may be a fraction: 2.5 is half way between sheets 2 and 3.
//   sheets.side(k, "right", tl)  the place to hang a label beside layer k: level with the middle of the sheet,
//                                as far right ("left": as far left) as the turning stack reaches at that moment.
//                                The labels of all the layers then stand in one column. A near corner looks
//                                bigger in perspective, so give the label 40 px or more of clearance (dx).
//   sheets.corners(tl)           the eight corners of the stack: the bottom sheet's four, then the top sheet's four,
//                                each in the order front left, front right, back right, back left.
//   sheets.unit(k, c, r, tl)     the knot in column c, row r of sheet k (all from 0).
//   sheets.glow(k, tl)           a number from 0 to 1, where the others give a position: how lit sheet k is at
//                                that moment. Use it to light a label as the pass goes through its layer.
//   sheets.layers, .cols, .rows, .width, .depth, .gap, .height (bottom sheet to top sheet)
//
// Size: with the default options the turning stack fits a box 20 x 14 x 21 world units, centred on the origin,
//   facing the rest camera (az 0, el 0, dist 34). Flat (tilt 0) it is width x (layers - 1) * gap x depth.
// Source: no mathematics to cite. The picture is the usual drawing of a layered network; the pass of light stands
//   for one run through the layers, bottom to top. Tuned in scene 3 of the film "One Sitting".
(function () {
  const G3 = window.G3;
  G3.lib.sheets = (o = {}) => {
    const { clamp, lerp, hash } = G3;
    const L = Math.max(1, Math.round(o.layers ?? 6)), LD = Math.max(1, L - 1), NCX = Math.max(1, Math.round(o.cols ?? 11)), NCZ = Math.max(1, Math.round(o.rows ?? 7));
    const SW = o.width ?? 17.5, SD = o.depth ?? 8.5, GAP = o.gap ?? 1.5, Y0 = -GAP * (L - 1) / 2;
    const tilt = o.tilt ?? 0.33, turn = o.turn ?? -0.5, spin = o.spin ?? 0.034, speed = o.speed ?? 1;
    const near = Math.min(1, GAP / 1.5), ripple = (o.ripple ?? 1) * near, moteShare = L > 1 ? clamp(o.motes ?? 0.12, 0, 0.6) : 0;   // sheets closer than the film's 1.5 ripple and lift less, so they never cross
    const ux = c => ((c + 0.5) / NCX - 0.5) * SW, uz = r => ((r + 0.5) / NCZ - 0.5) * SD;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const place = (x, y, z, tl = 0) => { const ry = turn + spin * tl, cy = Math.cos(ry), sy = Math.sin(ry), x1 = x * cy + z * sy, z1 = -x * sy + z * cy; return [x1, y * ct - z1 * st, y * st + z1 * ct]; };

    // ---- the passes of light. A pass = a flash that enters the bottom sheet at `at` and reaches the top `dur` later;
    // on each sheet it spreads from the middle to the corners over `ring`. hold leaves an afterglow.
    const EV = [];
    const env = (tau, a, amp, h) => (tau <= 0 ? 0 : amp * ((tau / a) * Math.exp(1 - tau / a) + h * (1 - Math.exp(-tau / 0.5))));
    const held = (ev, tl) => (!ev.hold ? 0 : ev.until === Infinity ? ev.hold : ev.hold * (1 - G3.smooth(ev.until, ev.until + 0.8, tl)));
    const wrap = (tau, ev) => (ev.every && tau > 0 ? tau % ev.every : tau);

    const build = (f, n) => {
      const bx = new Float32Array(n), bz = new Float32Array(n), rn = new Float32Array(n), ph = new Float32Array(n), bc = new Float32Array(n * 3), bs = new Float32Array(n), HB = new Float32Array(n);
      const hot = G3.rgb(o.litColor || "accent"), c0 = G3.rgb(o.color || "blue"), c1 = G3.rgb(o.topColor || "ink");
      const tone = k => (o.colors && o.colors.length ? G3.rgb(o.colors[k % o.colors.length]) : [0, 1, 2].map(q => lerp(c0[q], c1[q], (k / LD) * 0.75)));
      const tones = Array.from({ length: L }, (_, k) => tone(k));
      // the share of points: `per` a sheet (its knots, then its lattice, then a few spare ones on the rim); the rest are motes
      const per = L > 1 ? Math.floor(n * (1 - moteShare) / L) : n, nSheet = per * L, perGap = Math.max(1, Math.floor((n - nSheet) / LD));
      const K = Math.min(NCX * NCZ, Math.floor(per / 3)), M = per - K, NZ = Math.max(2, Math.round(Math.sqrt(M * SD / SW * 1.19))), NX = Math.max(2, Math.floor(M / NZ));
      const gain = clamp(Math.sqrt(28.9 / (NX * NZ / (SW * SD))), 0.8, 1.5);     // the film had 28.9 lattice points a square unit: a thinner lattice is lit a little more, a denser one less
      const grow = clamp(Math.sqrt(gain), 1, 1.25);                              // and its points are a little larger
      for (let i = 0; i < n; i++) {
        const j = i * 3; let k, b, col;
        if (i < nSheet) {
          k = Math.floor(i / per); const q = i % per; col = tones[k];
          if (q < K) { bx[i] = ux(q % NCX); bz[i] = uz(Math.floor(q / NCX)); b = 1.3; bs[i] = 2.5; }                    // a knot: one unit of the layer
          else if (q - K < NX * NZ) {                                                                                    // the fine lattice, with a lit rim
            const g = q - K, ix = g % NX, iz = Math.floor(g / NX), rim = ix === 0 || iz === 0 || ix === NX - 1 || iz === NZ - 1;
            bx[i] = (ix / (NX - 1) - 0.5) * SW; bz[i] = (iz / (NZ - 1) - 0.5) * SD;
            b = rim ? 0.9 : (0.36 + 0.22 * hash(i, 301)) * gain; bs[i] = rim ? 0.85 : 0.66 * grow;
          } else {                                                                                                       // spare points thicken the rim
            const h = hash(i, 309) * 2 * (SW + SD), s = h < SW ? [h - SW / 2, -SD / 2] : h < SW + SD ? [SW / 2, h - SW - SD / 2] : h < 2 * SW + SD ? [h - SW - SD - SW / 2, SD / 2] : [-SW / 2, h - 2 * SW - SD - SD / 2];
            bx[i] = s[0]; bz[i] = s[1]; b = 0.9; bs[i] = 0.85;
          }
        } else {                                                                 // a mote: it climbs from a knot to the sheet above
          k = Math.min(L - 2, Math.floor((i - nSheet) / perGap)); const a = tones[k], d = tones[k + 1]; col = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2, (a[2] + d[2]) / 2];
          bx[i] = ux(Math.floor(hash(i, 302) * NCX)) + (hash(i, 304) - 0.5) * 0.07; bz[i] = uz(Math.floor(hash(i, 303) * NCZ)) + (hash(i, 305) - 0.5) * 0.07;
          b = 0.75 + 0.4 * hash(i, 306); bs[i] = 0.8 + 0.5 * hash(i, 308); ph[i] = hash(i, 307);
        }
        HB[i] = Math.min(1.5, b * 1.5); rn[i] = Math.hypot(bx[i] / (SW / 2), bz[i] / (SD / 2)) / 1.4142;
        bc[j] = col[0] * b; bc[j + 1] = col[1] * b; bc[j + 2] = col[2] * b;
      }
      const aA = [], aR = [], aM = [], aT = [], aH = [], live = [], liveH = [];
      return (tl, f2) => {
        const P = f2.pos, C = f2.col, S = f2.size, tm = tl * speed, ry = turn + spin * tl, cy = Math.cos(ry), sy = Math.sin(ry);
        live.length = liveH.length = 0;
        for (const ev of EV) if (tl > ev.at) { live.push(ev); liveH.push(held(ev, tl)); }
        for (let k = 0; k < L; k++) {                                            // sheets
          let na = 0;
          for (let e = 0; e < live.length; e++) { const ev = live[e], h = liveH[e], tau = wrap(tl - ev.at - ev.dur * k / LD, ev);
            if (tau > 0 && (h > 0.001 || tau < ev.ring + ev.a * 9)) { aA[na] = ev.a; aR[na] = ev.ring; aM[na] = ev.amp; aT[na] = tau; aH[na] = h; na++; } }
          const y0 = Y0 + k * GAP, w1 = tm * 1.1 + k * 1.7, w2 = -tm * 0.8 + k * 2.3;
          for (let i = k * per, e = i + per; i < e; i++) {
            const j = i * 3, x = bx[i], z = bz[i]; let m = 0;
            for (let a = 0; a < na; a++) m += env(aT[a] - rn[i] * aR[a], aA[a], aM[a], aH[a]);
            const y = y0 + ripple * (0.11 * Math.sin(x * 0.85 + w1) + 0.08 * Math.sin(z * 1.2 + w2)) + 0.3 * near * Math.min(1.2, m);
            const x1 = x * cy + z * sy, z1 = -x * sy + z * cy; P[j] = x1; P[j + 1] = y * ct - z1 * st; P[j + 2] = y * st + z1 * ct;
            const sh = 0.82 + 0.3 * Math.sin(x * 0.55 - tm * 0.9 + k * 1.3) * Math.sin(z * 0.7 + tm * 0.6 + k);          // a slow shimmer: the sheet is never still
            if (m > 0.002) { const u = Math.min(1, m), hb = Math.min(1.1, HB[i] * (1 + 0.55 * Math.min(1.4, m))), v = 1 - u;
              C[j] = bc[j] * sh * v + hot[0] * hb * u; C[j + 1] = bc[j + 1] * sh * v + hot[1] * hb * u; C[j + 2] = bc[j + 2] * sh * v + hot[2] * hb * u; S[i] = bs[i] * (1 + 0.55 * u);
            } else { C[j] = bc[j] * sh; C[j + 1] = bc[j + 1] * sh; C[j + 2] = bc[j + 2] * sh; S[i] = bs[i]; }
          }
        }
        for (let i = nSheet; i < n; i++) {                                       // motes
          const j = i * 3, k = Math.min(L - 2, Math.floor((i - nSheet) / perGap)), x = bx[i], z = bz[i]; let s = ph[i] + tm * 0.21, m = 0; s -= Math.floor(s);
          for (let e = 0; e < live.length; e++) { const ev = live[e], tau = wrap(tl - ev.at - ev.dur * (k + s) / LD, ev); if (tau > 0 && (liveH[e] > 0.001 || tau < ev.a * 9)) m += env(tau, ev.a, ev.amp, liveH[e]); }
          const y = Y0 + (k + s) * GAP, x1 = x * cy + z * sy, z1 = -x * sy + z * cy; P[j] = x1; P[j + 1] = y * ct - z1 * st; P[j + 2] = y * st + z1 * ct;
          const u = Math.min(1, m), g = Math.sin(Math.PI * s) * Math.min(1.3, 0.6 + 1.1 * Math.min(1.4, m));           // capped, so a lit column keeps the light's colour
          C[j] = (bc[j] + (hot[0] - bc[j]) * u) * g; C[j + 1] = (bc[j + 1] + (hot[1] - bc[j + 1]) * u) * g; C[j + 2] = (bc[j + 2] + (hot[2] - bc[j + 2]) * u) * g; S[i] = bs[i] * (1 + 0.9 * u);
        }
      };
    };

    // ---- what a film needs to time the light and to place its labels
    build.pulse = (at, q = {}) => {
      if (typeof at !== "number" || !isFinite(at)) throw new Error("sheets.pulse(at): at must be a local time in seconds");
      const dur = Math.max(0, q.dur ?? 1.2), every = q.every > 0 ? q.every : 0;
      EV.push({ at, dur, a: Math.max(0.01, q.attack ?? clamp(dur * 0.13, 0.07, 0.2)), ring: q.ring ?? clamp(dur * 0.3, 0.16, 0.4), amp: q.amp ?? 1, hold: every ? 0 : q.hold === true ? 0.85 : clamp(+q.hold || 0), until: q.until ?? Infinity, every });
      return build;
    };
    build.glow = (k, tl) => { let m = 0; for (const ev of EV) if (tl > ev.at) m += env(wrap(tl - ev.at - ev.dur * k / LD, ev), ev.a, ev.amp, held(ev, tl)); return Math.min(1, m); };
    build.point = (k, u = 0, v = 0, tl = 0) => place(u * SW / 2, Y0 + k * GAP, v * SD / 2, tl);
    build.layer = (k, tl = 0) => build.point(k, 0, 0, tl);
    build.unit = (k, c, r, tl = 0) => place(ux(c), Y0 + k * GAP, uz(r), tl);
    build.corners = (tl = 0) => [0, L - 1].flatMap(k => [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([u, v]) => build.point(k, u, v, tl)));
    build.side = (k, dir = "right", tl = 0) => { const ry = turn + spin * tl, reach = SW / 2 * Math.abs(Math.cos(ry)) + SD / 2 * Math.abs(Math.sin(ry)), y = Y0 + k * GAP; return [dir === "left" ? -reach : reach, y * ct, y * st]; };
    Object.assign(build, { layers: L, cols: NCX, rows: NCZ, width: SW, depth: SD, gap: GAP, height: GAP * (L - 1) });
    (o.pulses || []).forEach(q => build.pulse(q.at, q));
    return build;
  };
})();
