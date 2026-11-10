// scene 5, "Find the bug": a binary search with an off-by-one loop bound, 10,000 real tests, one character fixes it.
// Colour: red = a test that fails, green = a test that passes, accent = the bug and its fix (the missed cell, the "=").
(window.SCENES = window.SCENES || []).push({ n: 5, build(film, p, G3) {
  const { hash, clamp, lerp } = G3;

  // ---- the two versions of the function, and 10,000 seeded tests run right here, at load
  // The ten lines below are the code panel. The two functions under test are compiled from lines 2 to 9 of the same text,
  // so the code on screen is the code that runs. The fix changes one character of line 3.
  const SRC_LINES = ["function search(a, x) {", "  let lo = 0, hi = a.length - 1;", "  while (lo < hi) {", "    const mid = (lo + hi) >> 1;", "    if (a[mid] === x) return mid;", "    if (a[mid] < x) lo = mid + 1;", "    else hi = mid - 1;", "  }", "  return -1;", "}"];
  const compile = cond => new Function("a", "x", SRC_LINES.slice(1, 9).join("\n").replace("lo < hi", cond));
  const buggy = compile("lo < hi"), fixed = compile("lo <= hi");
  if (SRC_LINES[2] !== "  while (lo < hi) {" || !/lo < hi/.test(buggy.toString()) || !/lo <= hi/.test(fixed.toString())) film.problem("scene 5: the code on screen is not the code under test");
  const TESTS = 10000, SIDE = 100, rnd = Stage.rng(5), fail = new Uint8Array(TESTS);
  let fails = 0, fixedPass = 0, ex = null;
  for (let k = 0; k < TESTS; k++) {
    const len = 1 + Math.floor(rnd() * 40), a = []; let v = Math.floor(rnd() * 20);
    for (let j = 0; j < len; j++) { v += 1 + Math.floor(rnd() * 9); a.push(v); }        // sorted, distinct
    const want = Math.floor(rnd() * len), x = a[want];
    if (fixed(a, x) === want) fixedPass++;
    if (buggy(a, x) !== want) { fail[k] = 1; fails++; if (!ex && len === 5) ex = { k, a, want, x }; }
  }
  if (fixedPass !== TESTS) film.problem(`scene 5: the fixed search passes ${fixedPass} of ${TESTS}, the narration says all`);
  if (fails < 4000 || fails > 5000) film.problem(`scene 5: the buggy search fails ${fails} tests, the narration says nearly half`);
  if (!ex) { film.problem("scene 5: no failing test with a five-item array"); ex = { k: 0, a: [3, 8, 14, 21, 30], want: 4, x: 30 }; }
  const looks = []; { let lo = 0, hi = 4; while (lo < hi) { const mid = (lo + hi) >> 1; looks.push(mid); if (ex.a[mid] < ex.x) lo = mid + 1; else hi = mid - 1; } }   // the cells the buggy loop reads
  if (looks.includes(ex.want)) film.problem("scene 5: the example's wanted cell was looked at");

  // ---- cues
  const tIn = p.start - 0.8, tCode = p.at("I write software"), tGrid = p.at("Ten thousand random tests"), tLoop = p.at("one step too early"),
    tEx = p.at("miss the very item"), tLook1 = p.at("very item"), tLook2 = p.at("it was sent"), tMiss = p.at("to find"), tChar = p.at("One character"),
    tFix = p.at("all ten thousand pass"), tReal = p.at("tests are real"), tThis = p.at("This search function"), tRight = p.after("looks right"),
    tReal2 = Math.max(tReal + 0.35, p.at("reruns them")), tOut = p.end - 0.8;
  const tScan0 = tGrid + 1.0, tScan1 = Math.max(tScan0 + 1.0, p.after("half failed"));              // the tests run, row by row: the count lands on "failed"
  const tWave0 = tFix + 0.1, tWave1 = Math.max(tWave0 + 1.3, p.after("thousand pass") + 0.25);      // the fix sweeps the grid

  // ---- forms. Points 0..9999 are the tests (row by row), 10000..13599 a thin frame, the rest a halo of dust.
  const LV = 1.5;       // G3.level while the grid is the subject: the shader caps one point at 0.62 of its colour, and the level lifts that cap without clipping a channel
  const SWING = 0.3, PITCH = 0.15, HALF = (SIDE - 1) / 2 * PITCH, NB = 3600, EDGE = HALF + 0.42;
  const waveFrac = k => ((k % SIDE) + 0.42 * Math.floor(k / SIDE)) / ((SIDE - 1) * 1.42);            // the wave runs left to right, leaning
  const scanFrac = k => clamp((Math.floor(k / SIDE) + (hash(k, 501) - 0.5) * 3) / SIDE);
  const failWave = []; for (let k = 0; k < TESTS; k++) if (fail[k]) failWave.push(waveFrac(k)); failWave.sort((a, b) => a - b);
  const failByScan = []; for (let k = 0; k < TESTS; k++) if (fail[k]) failByScan.push(scanFrac(k)); failByScan.sort((a, b) => a - b);
  const countLE = (arr, u) => { let lo = 0, hi = arr.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] <= u) lo = mid + 1; else hi = mid; } return lo; };

  const sat = (c, k) => { const m = (c[0] + c[1] + c[2]) / 3; return c.map(v => clamp(m + (v - m) * k)); };
  const gridForm = staged => (f, n) => {
    const base = new Float32Array(n * 3), red = sat(G3.rgb("red"), 1.6), green = sat(G3.rgb("green"), 1.8).map((v, c) => v * [0.6, 1, 0.45][c]), ink = G3.rgb("ink"), blue = G3.rgb("blue");
    const soft = staged ? 1 / LV : 1;                                                                   // the dust, the frame and the dots not yet run stay as quiet as they were at level 1
    const pale = [0.9, 0.95, 1], crest = [0.72, 1, 0.78];                                                // the scan line and the wave front. Colours stay at or under 1 (the shader clamps and the hue would shift): size carries brightness
    for (let i = 0, j = 0; i < n; i++, j += 3) {
      if (i < TESTS) { base[j] = ((i % SIDE) - (SIDE - 1) / 2) * PITCH; base[j + 1] = ((SIDE - 1) / 2 - Math.floor(i / SIDE)) * PITCH; base[j + 2] = 0; }
      else if (i < TESTS + NB) { const u = (i - TESTS) / NB * 4, s = Math.floor(u), q = (u - s) * 2 - 1, e = EDGE + (hash(i, 502) - 0.5) * 0.05;
        base[j] = s === 0 ? q * e : s === 1 ? e : s === 2 ? -q * e : -e; base[j + 1] = s === 0 ? e : s === 1 ? -q * e : s === 2 ? -e : q * e; base[j + 2] = (hash(i, 503) - 0.5) * 0.1; f.size[i] = 0.85; }
      else { const a = hash(i, 505) * 6.2832, d = 0.4 + 3.4 * Math.pow(hash(i, 506), 1.7), sq = 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));   // a halo of dust that thins outward and sits behind the grid
        const r = EDGE * sq + d * (0.4 + 0.6 * sq); let x = Math.cos(a) * r * 1.15, y = Math.sin(a) * r * 0.92, z = -0.4 - 7 * hash(i, 507);
        if (Math.abs(y) > 7.9) { y = (hash(i, 513) * 2 - 1) * 7.9; x = (x < 0 ? -1 : 1) * (EDGE + 0.3 + 2.6 * Math.pow(hash(i, 514), 1.6)); }
        if (Math.abs(x) > 10.6) x = (x < 0 ? -1 : 1) * (EDGE + 0.3 + 2.4 * hash(i, 515));
        if (Math.abs(x) < EDGE && Math.abs(y) < EDGE) z -= 2.5;
        base[j] = x; base[j + 1] = y; base[j + 2] = z;
        G3.tint(f, i, hash(i, 508) < 0.5 ? "blue" : "ink", (0.14 + 0.26 * hash(i, 509)) * soft); f.size[i] = 0.5 + 0.9 * hash(i, 510); }
    }
    return tl => {
      const T = staged ? tl : 1e9, P = f.pos, C = f.col, S = f.size, drift = tl;
      const su = (T - tScan0) / (tScan1 - tScan0), wu = (T - tWave0) / (tWave1 - tWave0), wd = tWave1 - tWave0;
      // the whole form turns about its own upright axis: it lands flat, swings as the wave crosses so the crest shows in relief,
      // then settles square with a small sway. It stays at 0 while the test ring is up (the ring does not know about th).
      const th = staged ? 0.5 * (1 - G3.smooth(tGrid, tScan0, T)) + SWING * G3.smooth(tFix - 0.1, tFix + 0.8, T) * (1 - G3.smooth(tWave1 + 0.3, tWave1 + 1.2, T))
        + 0.05 * Math.sin((T - tWave1) * 0.5) * G3.smooth(tWave1 + 1.2, tWave1 + 2.2, T) : 0.1 * Math.sin(tl * 0.5);
      const ct = Math.cos(th), st = Math.sin(th);
      for (let i = 0, j = 0; i < TESTS; i++, j += 3) {
        const h = hash(i, 511), wf = waveFrac(i), ran = su - scanFrac(i), wv = wu - wf, bad = fail[i] && wv < 0;
        let r, g, b, sz, z = 0;
        if (ran < 0) { const k = (0.5 + 0.25 * h) * soft; r = lerp(ink[0], blue[0], 0.6) * k; g = lerp(ink[1], blue[1], 0.6) * k; b = lerp(ink[2], blue[2], 0.6) * k; sz = 1.5; }
        else if (bad) { const k = 0.9 + 0.1 * Math.sin(drift * 2.6 + h * 6.28); r = red[0] * k; g = red[1] * k; b = red[2] * k; sz = 3.0; }           // a failure: the brightest, largest dot
        else { const lit = staged ? clamp(1 + wv / 0.05) : 1, k = lerp(0.3, 0.85 + 0.05 * h + 0.1 * Math.sin(drift * 1.1 - wf * 9), lit);            // a pass: dim until the fix arrives, then full green
          r = green[0] * k; g = green[1] * k; b = green[2] * k; sz = lerp(1.6, 3.0, lit); }
        if (staged) {
          if (ran >= 0) { const fl = Math.exp(-ran * (tScan1 - tScan0) * 7), w = fl * 0.7; r = lerp(r, pale[0], w); g = lerp(g, pale[1], w); b = lerp(b, pale[2], w); sz += fl * 0.8; }   // the scan line
          if (wv >= -0.05) { const dt = wv * wd, fl = Math.exp(-Math.max(0, dt) * 3.2) * clamp(1 + wv / 0.05), bump = Math.exp(-Math.pow((dt - 0.12) / 0.2, 2));
            const w = clamp(fl * (fail[i] ? 0.85 : 0.3) + bump * 0.15); r = lerp(r, crest[0], w); g = lerp(g, crest[1], w); b = lerp(b, crest[2], w); sz += fl * (fail[i] ? 0.9 : 0.3) + bump * 0.3; z = bump * 1.3 * (1 - 0.75 * G3.smooth(0.8, 1, wf)); }   // the crest flattens as it reaches the far edge, so it stays inside the frame
        }
        C[j] = r; C[j + 1] = g; C[j + 2] = b; S[i] = sz;
        P[j] = base[j] * ct + z * st; P[j + 1] = base[j + 1]; P[j + 2] = -base[j] * st + z * ct;
      }
      const done = staged ? clamp((T - tWave1) / 0.8) : 1;                                               // the frame takes the pass colour once every test passes
      for (let i = TESTS, j = TESTS * 3; i < TESTS + NB; i++, j += 3) { const k = (0.34 + 0.22 * hash(i, 504) + 0.2 * done) * soft; C[j] = lerp(blue[0], green[0], done) * k; C[j + 1] = lerp(blue[1], green[1], done) * k; C[j + 2] = lerp(blue[2], green[2], done) * k;
        P[j] = base[j] * ct + base[j + 2] * st; P[j + 1] = base[j + 1]; P[j + 2] = -base[j] * st + base[j + 2] * ct; }
      for (let i = TESTS + NB, j = i * 3; i < n; i++, j += 3) { const ph = hash(i, 512) * 6.2832, x = base[j] + Math.sin(drift * 0.23 + ph) * 0.3, z = base[j + 2] + Math.sin(drift * 0.15 + ph * 2.3) * 0.6;
        P[j] = x * ct + z * st; P[j + 1] = base[j + 1] + Math.cos(drift * 0.19 + ph * 1.7) * 0.3; P[j + 2] = -x * st + z * ct; }
    };
  };
  G3.form("tests", gridForm(false));                                                                   // public: every test green, a slow shimmer
  G3.form("s5-grid", gridForm(true));
  G3.form("s5-braces", (f, n) => {                                                                     // a deep pair of braces in the blue dress, breathing a little
    G3.textForm("{ }", { font: "mono", width: 15, depth: 3, color: "blue" })(f, n);
    const base = f.pos.slice(), ph = new Float32Array(n); for (let i = 0; i < n; i++) ph[i] = hash(i, 520) * 6.2832;
    return tl => { const P = f.pos; for (let i = 0, j = 0; i < n; i++, j += 3) { P[j] = base[j] + Math.sin(tl * 0.5 + ph[i]) * 0.05; P[j + 1] = base[j + 1] + Math.cos(tl * 0.43 + ph[i] * 1.7) * 0.05; P[j + 2] = base[j + 2] + Math.sin(tl * 0.37 + ph[i] * 2.3) * 0.22; } };
  });

  // ---- the points and the camera
  const AT = [9.6, 1.65, 0];
  G3.cam.to(tIn, { az: -0.45, el: 0.05, dist: 34, look: [0, 0, 0], fov: 40 }, { dur: 1.6 });
  G3.level.to(tIn, 0.6, { dur: 0.8 }); G3.grain.to(tIn, 1, { dur: 0.8 });                                // 30,000 points in two glyphs: held at 0.6 so the blue survives
  G3.morph(tIn, "s5-braces", { dur: 1.7, at: [9.6, 1.2, 0], swirl: 0.9 });                               // (start) the butterfly becomes a pair of braces
  G3.cam.to(tIn + 1.6, { az: 0.3 }, { dur: Math.max(1, tGrid - tIn - 1.6), ease: "sine" });              // the hero move of the first half: a slow orbit that shows the braces in depth
  const seg = G3.morph(tGrid, "s5-grid", { dur: 1.5, at: AT, swirl: 0.5, stagger: 0.5, clock: t => t });   // "Ten thousand random tests": one dot per test
  G3.cam.to(tGrid, { az: 0, el: 0 }, { dur: 1.6 }); G3.level.to(tGrid + 0.5, LV, { dur: 1.0 });
  G3.level.to(tEx, 0.6, { dur: 0.6 }); G3.level.to(tFix - 0.3, LV, { dur: 0.4 });                         // the grid steps back while the example is up, and returns with the wave
  film.hit("thock", tGrid + 1.0); film.hit("chord", tWave1 - 0.2);

  // ---- the 2D layer
  const S = film.scene(p, { fadeOut: 1.2 });
  S.hud.text("Find the bug", { x: 120, y: 96, size: "head", id: "s5-head" });

  // the code: line 3 is the loop condition. Its tail is a separate text so the "=" can push it one character right.
  const FS = 30, CX0 = 120, CY0 = 200, CH = FS * 0.6, SRC = CX0 + FS * 3.6;
  const code = S.code(SRC_LINES.map((l, i) => (i === 2 ? l.slice(0, 13) : l)).join("\n"),
    { x: CX0, y: CY0, w: 800, size: FS, id: "s5-code" }).show(tCode, { by: "wipe", dur: 0.9 });
  code.el.style.fontVariantLigatures = "none";
  const yL3 = code.lineY(3) + FS * 1.55 / 2;
  const tail = S.text(SRC_LINES[2].slice(14), { x: SRC + 14 * CH, y: yL3, size: FS, font: "mono", valign: "middle", overlap: true, id: "s5-tail" }).show(tCode + 0.35, { by: "fade", dur: 0.4 });
  const eq = S.text("=", { x: SRC + 13 * CH, y: yL3, size: FS, font: "mono", weight: 700, valign: "middle", color: "accent", overlap: true, id: "s5-eq" });
  const STEP = Math.min(0.18, (tRight - tThis) / 10.5);                                                 // "This search function looks right": a read-through, line by line
  for (let i = 1; i <= 10; i++) code.focus(tThis + (i - 1) * STEP, i, i, { dur: STEP * 0.85 });
  code.unfocus(tRight);
  tail.to(tThis, { opacity: 0.32 }, { dur: STEP }).to(tThis + 2 * STEP, { opacity: 1 }, { dur: STEP }).to(tThis + 3 * STEP, { opacity: 0.32 }, { dur: STEP }).to(tRight, { opacity: 1 }, { dur: 0.4 });   // the tail of line 3 dims with its line
  code.focus(tLoop, 3); film.hit("tick", tLoop, { pitch: 2 });                                           // "one step too early": the loop condition
  tail.to(tChar, { x: SRC + 15 * CH }, { dur: 0.35 }); eq.show(tChar + 0.15, { by: "pop" }).pulse(tChar + 0.25); film.hit("pluck", tChar + 0.15, { pitch: 6 });   // "One character"
  S.line({ from: [SRC + 12 * CH - 2, yL3 + 21], to: [SRC + 14 * CH + 2, yL3 + 21], stroke: "accent", lw: 4, id: "s5-eq-line" }).show(tChar + 0.3, { by: "draw", dur: 0.4 }).hide(tFix - 0.3);
  code.unfocus(tReal);

  // the count under the grid: failures as the tests run, then passes as the fix sweeps across
  const GX = 960 + AT[0] * 43.6, nf = v => Math.round(v).toLocaleString("en-US");
  const count = S.number(0, { x: GX, y: 846, size: "head", align: "center", color: "red", id: "s5-count",
    fmt: v => (v <= 1 ? nf(countLE(failByScan, v + 1e-9) * (v > 0 ? 1 : 0)) : nf(TESTS - fails + countLE(failWave, v - 1))) })
    .show(tScan0, { by: "fade" }).to(tScan0, { value: 1 }, { dur: tScan1 - tScan0, ease: "linear" })
    .set(tWave0, { value: 1.0001 }).to(tWave0, { value: 2 }, { dur: tWave1 - tWave0, ease: "linear" }).to(tWave0, { color: "green" }, { dur: 0.15 });
  const countLabel = S.text("of 10,000 tests fail", { x: GX, y: 926, size: "label", align: "center", color: "muted", id: "s5-count-label" }).show(tScan0 + 0.2).to(tWave0, { text: "of 10,000 tests pass" });
  count.pulse(tWave1);

  // the five-cell example: a real failing test. The loop reads two cells and stops; the wanted one is never read.
  const CW = 150, CG = 12, cy = 800, cx = i => 120 + i * (CW + CG);
  const exHead = S.text(`test ${nf(ex.k + 1)}: find ${ex.x}`, { x: 120, y: 728, size: "label", font: "mono", color: "muted", id: "s5-ex-head" }).show(tEx);
  const cells = ex.a.map((v, i) => S.box({ x: cx(i), y: cy, w: CW, h: 96, stroke: "faint", lw: 3, label: String(v), labelSize: "label", labelFont: "mono", labelColor: "ink", id: "s5-cell" + i }));
  Stage.each(cells, tEx + 0.1, (c, t) => c.show(t));
  [tLook1, tLook2].forEach((t, n) => { if (looks[n] != null) cells[looks[n]].to(t, { stroke: "muted" }, { dur: 0.3 }).pulse(t); });   // each look: the cell's outline lifts and the bar narrows
  const missNote = S.text("never checked", { x: cx(ex.want) + CW / 2, y: 912, size: "label", align: "center", color: "accent", id: "s5-miss" }).show(tMiss + 0.1);
  cells[ex.want].to(tMiss, { stroke: "accent" }, { dur: 0.3 }).pulse(tMiss + 0.1); film.hit("pop", tMiss);
  const span = S.line({ from: [cx(0), 786], to: [cx(4) + CW, 786], stroke: "ink", lw: 5, id: "s5-span" }).show(tEx + 0.3, { by: "draw" });   // the cells still in play: it narrows to one
  { let lo = 0, hi = 4; looks.forEach((mid, n) => { if (ex.a[mid] < ex.x) lo = mid + 1; else hi = mid - 1; span.to([tLook1, tLook2][n] + 0.25, { x1: cx(lo), x2: cx(hi) + CW }, { dur: 0.45 }); }); }
  span.to(tMiss, { stroke: "accent" }, { dur: 0.3 });
  [exHead, span, ...cells, missNote].forEach(n => n.hide(tFix - 0.3));

  // that test's own dot in the grid, ringed while the example is up
  const exDot = [((ex.k % SIDE) - (SIDE - 1) / 2) * PITCH, ((SIDE - 1) / 2 - Math.floor(ex.k / SIDE)) * PITCH, 0];
  G3.overlay(S, (ctx, t) => { const a = G3.fade(t, tEx + 0.3, tFix - 0.2, 0.3); if (a <= 0) return;
    const q = G3.dot3(ctx, t, seg.world(exDot, t), { ring: true, r: 13, lw: 3, color: "accent", alpha: a });
    G3.text3(ctx, t, "test " + nf(ex.k + 1), q, { size: 30, color: "accent", dy: q.y < 125 ? 36 : -34, alpha: a }); }, { id: "s5-overlay" });

  // "tests are real"
  const real = [S.text("run by the film's own code", { x: 120, y: 770, size: "label", color: "ink", id: "s5-real" }).show(tReal),
    S.text("at every render", { x: 120, y: 813, size: "label", color: "ink", id: "s5-real-2" }).show(tReal2),
    S.text(`seed 5 · ${nf(fails)} failed · then 0`, { x: 120, y: 884, size: FS, font: "mono", color: "muted", id: "s5-real-data" }).show(tReal + 0.6)];
  [count, countLabel, ...real].forEach(n => n.hide(tOut));                                               // the 2D layer clears as the points leave for the next scene
} });
