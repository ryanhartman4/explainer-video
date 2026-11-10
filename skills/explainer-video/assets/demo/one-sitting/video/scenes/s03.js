// scene 3, "One word at a time": the points are the layers of a network; under them a sentence grows by one word.
// Hues: blue = attention (looking back at earlier words). accent = the next word (empty tile, winner, the pass of light).
(window.SCENES = window.SCENES || []).push({ n: 3, build(film, p, G3) {
  const tWrite = p.at("To write"), tWeigh = p.at("weigh which earlier words"), tAtt = p.at("called attention"), tScore = p.at("score every word"),
    tChoose = p.at("choose a likely one"), tOne = p.at("One word"), tSlide = p.at("Then I do it"), tAgain = p.at("all again"), tWay = p.at("written that way");
  const NEXT = [",", "and", "I", "wrote", "these", "scenes", "today"];
  const STEP = G3.clamp((tWay - 1.5 - tAgain) / (NEXT.length - 1), 0.16, 0.26), tTick = NEXT.map((_, i) => tAgain + i * STEP);   // one new word per tick, done well before "written"
  const tPulse = tTick[NEXT.length - 1] + 0.25, climb = G3.clamp(tWay - tPulse, 0.9, 1.5);   // the light climbs under "sentence you are hearing was", tops out on "written", then holds lit

  // ---- the form: six sheets of points, light climbing between them. Local time is film time, so passes land on cues.
  // A pass of light = one run of the network, bottom sheet to top. ev: t start, dur climb, a attack, ring spread, amp, hold afterglow.
  const EV = [{ t: tScore - 1.0, dur: 0.85, a: 0.11, ring: 0.3, amp: 0.55, hold: 0 },
    ...tTick.map(t => ({ t: t - 0.34, dur: 0.3, a: 0.07, ring: 0.16, amp: 0.5, hold: 0 })),
    { t: tPulse, dur: climb, a: 0.16, ring: 0.36, amp: 1.0, hold: 0.85 }];
  const L = 6, NX = 88, NZ = 50, PER = NX * NZ, SW = 17.5, SD = 8.5, GAP = 1.5, Y0 = -GAP * (L - 1) / 2, NCX = 11, NCZ = 7;
  G3.form("s3-sheets", (f, n) => {
    const bx = new Float32Array(n), bz = new Float32Array(n), rn = new Float32Array(n), ph = new Float32Array(n), bc = new Float32Array(n * 3), bs = new Float32Array(n), HB = new Float32Array(n);
    const blue = G3.rgb("blue"), ink = G3.rgb("ink"), hot = G3.rgb("accent"), nSheet = L * PER, perGap = Math.floor((n - nSheet) / (L - 1));
    const nodeX = c => ((c * 8 + 4) / (NX - 1) - 0.5) * SW, nodeZ = r => ((r * 7 + 3) / (NZ - 1) - 0.5) * SD;
    for (let i = 0; i < n; i++) {
      const j = i * 3; let k, b, c;
      if (i < nSheet) {                                                        // a sheet: a fine lattice, brighter knots (units), a lit rim
        k = Math.floor(i / PER); const q = i % PER, ix = q % NX, iz = Math.floor(q / NX);
        bx[i] = (ix / (NX - 1) - 0.5) * SW; bz[i] = (iz / (NZ - 1) - 0.5) * SD;
        const node = ix % 8 === 4 && iz % 7 === 3, rim = ix === 0 || iz === 0 || ix === NX - 1 || iz === NZ - 1;
        b = node ? 1.3 : rim ? 0.9 : 0.36 + 0.22 * G3.hash(i, 301); bs[i] = node ? 2.5 : rim ? 0.85 : 0.66; c = k / (L - 1);
      } else {                                                                 // a thread: motes that climb from a unit to the sheet above
        const m = i - nSheet; k = Math.min(L - 2, Math.floor(m / perGap)); const col = Math.floor(G3.hash(i, 302) * NCX), row = Math.floor(G3.hash(i, 303) * NCZ);
        bx[i] = nodeX(col) + (G3.hash(i, 304) - 0.5) * 0.07; bz[i] = nodeZ(row) + (G3.hash(i, 305) - 0.5) * 0.07;
        b = 0.75 + 0.4 * G3.hash(i, 306); bs[i] = 0.8 + 0.5 * G3.hash(i, 308); c = (k + 0.5) / (L - 1); ph[i] = G3.hash(i, 307);
      }
      HB[i] = Math.min(1.5, b * 1.5); rn[i] = Math.hypot(bx[i] / (SW / 2), bz[i] / (SD / 2)) / 1.4142;
      bc[j] = G3.lerp(blue[0], ink[0], c * 0.75) * b; bc[j + 1] = G3.lerp(blue[1], ink[1], c * 0.75) * b; bc[j + 2] = G3.lerp(blue[2], ink[2], c * 0.75) * b;
      f.pos[j] = bx[i]; f.pos[j + 2] = bz[i];
    }
    const env = (tau, ev) => (tau <= 0 ? 0 : ev.amp * ((tau / ev.a) * Math.exp(1 - tau / ev.a) + ev.hold * (1 - Math.exp(-tau / 0.5))));
    const act = [];
    return (tl, f2) => {
      const P = f2.pos, C = f2.col, S = f2.size;
      for (let k = 0; k < L; k++) {                                            // sheets
        act.length = 0;
        for (const ev of EV) { const tau = tl - ev.t - ev.dur * k / (L - 1); if (tau > 0 && (ev.hold || tau < ev.ring + ev.a * 9)) act.push(ev, tau); }
        const y0 = Y0 + k * GAP, w1 = tl * 1.1 + k * 1.7, w2 = -tl * 0.8 + k * 2.3;
        for (let i = k * PER, e = i + PER; i < e; i++) {
          const j = i * 3; let m = 0;
          for (let a = 0; a < act.length; a += 2) m += env(act[a + 1] - rn[i] * act[a].ring, act[a]);
          P[j + 1] = y0 + 0.11 * Math.sin(bx[i] * 0.85 + w1) + 0.08 * Math.sin(bz[i] * 1.2 + w2) + 0.3 * Math.min(1.2, m);
          const sh = 0.82 + 0.3 * Math.sin(bx[i] * 0.55 - tl * 0.9 + k * 1.3) * Math.sin(bz[i] * 0.7 + tl * 0.6 + k);       // a slow shimmer: the sheet is never still
          if (m > 0.002) { const u = Math.min(1, m), hb = Math.min(1.1, HB[i] * (1 + 0.55 * Math.min(1.4, m))), v = 1 - u;
            C[j] = bc[j] * sh * v + hot[0] * hb * u; C[j + 1] = bc[j + 1] * sh * v + hot[1] * hb * u; C[j + 2] = bc[j + 2] * sh * v + hot[2] * hb * u; S[i] = bs[i] * (1 + 0.55 * u);
          } else { C[j] = bc[j] * sh; C[j + 1] = bc[j + 1] * sh; C[j + 2] = bc[j + 2] * sh; S[i] = bs[i]; }
        }
      }
      for (let i = L * PER; i < n; i++) {                                      // threads
        const j = i * 3, k = Math.min(L - 2, Math.floor((i - L * PER) / perGap)), s = (ph[i] + tl * 0.21) % 1, lift = Math.sin(Math.PI * s); let m = 0;
        for (const ev of EV) { const tau = tl - ev.t - ev.dur * (k + s) / (L - 1); if (tau > 0 && (ev.hold || tau < ev.a * 9)) m += env(tau, ev); }
        P[j + 1] = Y0 + (k + s) * GAP; const u = Math.min(1, m), g = lift * Math.min(1.3, 0.6 + 1.1 * Math.min(1.4, m));   // capped, so a lit column stays coral
        C[j] = (bc[j] + (hot[0] - bc[j]) * u) * g; C[j + 1] = (bc[j + 1] + (hot[1] - bc[j + 1]) * u) * g; C[j + 2] = (bc[j + 2] + (hot[2] - bc[j + 2]) * u) * g; S[i] = bs[i] * (1 + 0.9 * u);
      }
    };
  });

  // ---- the points and the camera
  const t0 = p.start - 0.8, AT = [-2.6, 3.25, 0];
  G3.morph(t0, "s3-sheets", { dur: 2.0, at: AT, ry: -0.5, spin: 0.034, swirl: 0.7, clock: t => t });   // "To write": the layers, seen from a little above
  G3.cam.to(t0, { az: 0, el: 0.33, dist: 34, look: [0, 0, 0], fov: 40 }, { dur: 1.6 });
  G3.level.to(t0, 0.9, { dur: 0.8 }); G3.grain.to(t0, 1, { dur: 0.8 });
  G3.cam.to(tOne, { look: [-2.6, 0, 0] }, { dur: 1.2 });                        // the bars have left: the layers move to the middle, over the row that is about to grow
  G3.cam.to(tPulse, { dist: 29.5, look: [-2.6, 0.9, 0], el: 0.27 }, { dur: Math.max(1.5, p.end - tPulse), ease: "sine" });   // the push in that the last pass of light rides

  // ---- the 2D layer
  const S = film.scene(p, { fadeOut: 1.2 }), ROWCX = 873;
  S.hud.text("One word at a time", { x: 120, y: 96, size: "head", id: "s3-heading" });

  // the sentence, one tile a word (the line scene 1 spoke). Six tiles sit under the sheets; the row moves left to make room for the rest.
  const WORDS = ["Every", "frame", "is", "drawn", "by", "code", ...NEXT], SLOT = 5, CH = 26.4, GAPX = 8, TH = 96, ROWY = 852;
  const tw = WORDS.map(w => Math.max(48, Math.round(w.length * CH) + 22));
  const rowW = k => tw.slice(0, k).reduce((a, b) => a + b, 0) + GAPX * (k - 1);
  const xA = ROWCX - rowW(SLOT + 1) / 2, xB = 960 - rowW(WORDS.length) / 2, off = WORDS.map((_, i) => (i ? rowW(i) + GAPX : 0));
  if (xB < 120 || xB + rowW(WORDS.length) > 1800) film.problem("scene 3: the full row of tiles is wider than the content area");
  const tiles = WORDS.map((w, i) => {
    const slot = i === SLOT, late = i > SLOT;
    return S.box({ x: (late ? xB : xA) + off[i], y: ROWY, w: tw[i], h: TH, fill: slot ? "bg" : "panel", stroke: slot ? "accent" : "faint", lw: slot ? 4 : 2,
      label: slot ? "" : w, labelFont: "mono", labelSize: "body", labelColor: "ink", id: "s3-tile-" + i });
  });
  Stage.each(tiles.slice(0, SLOT), tWrite, (n, t) => n.show(t, { by: "pop", dur: 0.3 }), 0.03);
  tiles[SLOT].show(tWrite + 0.45, { by: "draw", dur: 0.5 });
  const tBack = p.at("back over") + 0.1;                                       // once the empty tile is whole, a glance runs back along the words, last to first
  [4, 3, 2, 1, 0].forEach((i, k) => tiles[i].to(tBack + k * 0.2, { stroke: "blue" }, { dur: 0.2 }).to(tBack + k * 0.2 + 0.55, { stroke: "faint" }, { dur: 0.6 }));

  // "weigh which earlier words": arcs from the empty tile back to each word, width = weight (illustrative)
  const WEIGHT = [0.06, 0.40, 0.30, 0.14, 0.10], cx = i => xA + off[i] + tw[i] / 2, arcY = ROWY - 12;
  const arcs = WEIGHT.map((w, i) => {
    const sx = cx(SLOT) + 48 - i * 24, dx = sx - cx(i), h = 30 + 0.145 * dx;
    return S.arrow([sx, arcY], [cx(i), arcY], { bend: -2 * h / dx, lw: 2.5 + w * 24, headSize: 15 + w * 36, stroke: "blue", opacity: 0.5 + w, id: "s3-arc-" + i });
  });
  [4, 3, 2, 1, 0].forEach((i, k) => arcs[i].show(tWeigh + k * 0.2, { dur: 0.6 }));
  if (WEIGHT.length !== SLOT || WEIGHT.some((w, i) => i !== 1 && i !== 2 && w >= Math.min(WEIGHT[1], WEIGHT[2])) || WEIGHT.reduce((a, b) => a + b, 0) > 1.0001) film.problem("scene 3: 'frame' and 'is' should carry the heaviest arcs");
  const note = S.text("illustrative weights", { x: 1800, y: ROWY + TH / 2, size: "note", align: "right", valign: "middle", color: "muted", id: "s3-note" }).show(tWeigh + 0.9);

  // "called attention": the name, and who named it
  const ATTY = arcY - 30 - 0.145 * (cx(SLOT) - cx(0)) - 16;
  const attn = S.text("attention", { x: (cx(SLOT) + cx(0)) / 2 + 14, y: ATTY, size: "body", font: "display", italic: true, color: "blue", align: "center", valign: "bottom", id: "s3-attention" }).show(tAtt);
  const credit = S.text("Vaswani et al., 2017", { x: attn.bounds().x + attn.bounds().w + 24, y: ATTY - 9, size: "note", color: "muted", valign: "bottom", id: "s3-credit" }).show(tAtt + 0.4);

  // "score every word": four candidates, scores that sum to under 1 (illustrative)
  const CAND = [["code", 0.62], ["hand", 0.21], ["light", 0.08], ["potato", 0.01]], BX = 1318, BARX = BX + 204, BARW = 250, BY = 318, PITCH = 78;
  if (CAND.reduce((a, c) => a + c[1], 0) >= 1 || CAND.some((c, i) => i && c[1] >= CAND[0][1])) film.problem("scene 3: the candidate scores must sum to under 1 with 'code' on top");
  const cand = CAND.map(([w, v], i) => {
    const y = BY + i * PITCH, tb = tScore + i * 0.16, col = i ? "muted" : "accent";
    const word = S.text(w, { x: BX, y, size: "body", font: "mono", valign: "middle", color: i ? "muted" : "ink", id: "s3-cand-" + i }).show(tb, { by: "fade" });
    const bar = S.box({ x: BARX, y: y - 14, w: 4, h: 28, radius: 5, fill: col, id: "s3-bar-" + i }).show(tb, { by: "fade" }).to(tb + 0.1, { w: Math.max(4, v * BARW) }, { dur: 0.7, ease: "out" });
    const num = S.number(0, { x: BARX + Math.max(4, v * BARW) + 16, y, size: "body", font: "mono", valign: "middle", decimals: 2, color: col, id: "s3-score-" + i }).show(tb + 0.1, { by: "fade" }).to(tb + 0.1, { value: v }, { dur: 0.7, ease: "out" });
    return { word, bar, num };
  });
  note.to(tScore, { text: "illustrative weights and scores" });

  // "choose a likely one": the winner leaves the list and lands in the empty tile
  // the arcs and their label step back first, so the word lands on a clear tile
  arcs.forEach(a => a.to(tChoose, { opacity: 0.2 }, { dur: 0.3 })); [attn, credit].forEach(n => n.to(tChoose, { opacity: 0.3 }, { dur: 0.3 }));
  const wb = cand[0].word.bounds(), slotC = [cx(SLOT), ROWY + TH / 2];
  const win = S.text(CAND[0][0], { x: BX, y: BY, size: "body", font: "mono", valign: "middle", color: "ink", overlap: true, id: "s3-winner" })
    .show(tChoose, { by: "fade", dur: 0.05 }).to(tChoose, { x: slotC[0] - wb.w / 2, y: slotC[1] }, { dur: 0.85 }).hide(tChoose + 0.9);
  tiles[SLOT].to(tChoose + 0.88, { label: CAND[0][0] });                           // from here the word belongs to the tile
  cand[0].word.to(tChoose, { color: "muted" }, { dur: 0.4 });
  film.hit("pluck", tChoose + 0.8, { pitch: 4 });

  // "One word": the filled tile is the subject; arcs and bars leave
  tiles[SLOT].to(tOne, { fill: "accent", color: "bg" }, { dur: 0.3 }).pulse(tOne + 0.05);
  [...arcs, attn, credit, note, ...cand.flatMap(c => [c.word, c.bar, c.num])].forEach(n => n.hide(tOne - 0.05));

  // "Then I do it": the row moves left; "all again": the next words tick in, each after its own quick pass up the sheets
  const slide = G3.clamp(tAgain - tSlide - 0.05, 0.5, 0.9);
  tiles.slice(0, SLOT + 1).forEach((n, i) => n.to(tSlide, { x: xB + off[i] }, { dur: slide }));
  tiles[SLOT].to(tSlide, { fill: "panel", color: "accent" }, { dur: slide });
  tiles.slice(SLOT + 1).forEach((n, i) => { n.show(tTick[i], { by: "pop", dur: 0.2 }); if (i % 2 === 0) film.hit("tick", tTick[i], { pitch: i + 1 }); });   // a tick on every other tile: the sound stays sparse

  // "written that way": one slow pass of light up through every sheet (the form does it); the tiles hold
  film.hit("chord", tWay - 0.1);
} });
