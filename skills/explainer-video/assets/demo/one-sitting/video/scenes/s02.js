// scene 2, "Words become geometry": the word "king" becomes a list of numbers, then one point in a space, then
// sixteen words gather into four clusters, and two arrows that point much the same way show that a direction carries meaning.
// Hues: green = animals, blue = cities, yellow = royalty, purple = people. Accent (coral) = the step that carries meaning.
// The layout is an illustration: every position below is placed by hand, and a note on screen says so.
(window.SCENES = window.SCENES || []).push({ n: 2, build(film, p, G3) {
  const { hash, clamp, smooth, lerp } = G3, N = G3.N, TAU = 6.2832;

  // ---- the hand-placed space. woman − man is STEP; queen − king is STEP2, about 12 degrees off it: close to parallel, as in
  // the real vectors, where the relation holds loosely.
  const STEP = [5.4, 1.1, 1.0], STEP2 = [5.2, 2.2, 0.7], plus = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const man = [-4.2, -3.3, 1.6], king = [-2.4, 2.7, 0.4], boy = [-2.8, -5.8, 2.4], prince = [-4.6, 5.1, -0.4];
  const L = [-64, 0, "right"], Rt = [64, 0, "left"];   // the four words of the analogy carry their labels outside the arrows
  const WORDS = [                                   // [label, position, cluster, label offset and side]
    ["cat", [-12.4, 2.4, 0.8], 0], ["dog", [-9.4, 3.2, -0.8], 0], ["horse", [-9.0, -0.2, -1.0], 0], ["lion", [-12.2, -1.8, 0.6], 0],
    ["Paris", [9.2, 1.4, 0.8], 1], ["Rome", [12.4, 2.0, -0.8], 1], ["Tokyo", [12.6, -1.8, -1.0], 1], ["Cairo", [9.6, -2.6, 0.6], 1],
    ["king", king, 2, L], ["queen", plus(king, STEP2), 2, Rt], ["prince", prince, 2], ["princess", [0.4, 6.2, 0.4], 2],
    ["man", man, 3, L], ["woman", plus(man, STEP), 3, Rt], ["boy", boy, 3], ["girl", plus(boy, STEP), 3],
  ];
  const KING = 8, QUEEN = 9, MAN = 12, WOMAN = 13, QUAD = [KING, QUEEN, MAN, WOMAN];
  const HUES = ["green", "blue", "yellow", "purple"];
  const GROUPS = [                                  // [name, anchor of the name, align]
    ["animals", [-10.9, 5.5, 0], "center"], ["cities", [10.9, 4.3, 0], "center"], ["royalty", [3.4, 6.3, 0.8], "left"], ["people", [4.6, -5.0, 3.2], "left"],
  ];
  const CENTRES = [0, 1, 2, 3].map(c => { const w = WORDS.filter(x => x[2] === c), m = [0, 0, 0]; w.forEach(x => x[1].forEach((v, k) => (m[k] += v / w.length))); return m; });
  { const a = WORDS[WOMAN][1], b = WORDS[MAN][1], c = WORDS[QUEEN][1], d = WORDS[KING][1], u = [0, 1, 2].map(k => a[k] - b[k]), v = [0, 1, 2].map(k => c[k] - d[k]);
    const deg = Math.acos((u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v))) * 180 / Math.PI;    // "points much the same way"
    if (!(deg > 6 && deg < 18)) film.problem(`scene 2: the two steps are ${deg.toFixed(1)} degrees apart; they should be close to parallel, not exact`); }

  // every point's job: a word's knot (0..15), the haze of a cluster (16..19), or dust (20)
  const role = i => { const r = hash(i, 201); return r < 0.46 ? Math.floor(hash(i, 202) * 16) : r < 0.74 ? 16 + Math.floor(hash(i, 203) * 4) : 20; };
  const unit = (i, s) => { const z = hash(i, s) * 2 - 1, a = hash(i, s + 1) * TAU, r = Math.sqrt(1 - z * z); return [r * Math.cos(a), r * Math.sin(a), z]; };

  // the clusters: each word a small turning knot of points, each cluster a faint haze in its hue, the rest dust.
  // dim = true is the same picture with everything but man, woman, king, queen turned down (the last beat).
  const clusters = dim => (f, n) => {
    const C = new Float32Array(n * 3), O = new Float32Array(n * 3), R = new Float32Array(n), ink = G3.rgb("ink");
    for (let i = 0, j = 0; i < n; i++, j += 3) {
      const ro = role(i), u = unit(i, 210);
      if (ro < 16) {                                                             // a knot: dense core, soft rim
        const w = WORDS[ro], q = Math.pow(hash(i, 212), 1.9), r = 0.06 + 1.05 * q, hue = G3.rgb(HUES[w[2]]), hot = Math.pow(1 - q, 3) * 0.7;
        const b = (0.5 + 0.45 * hash(i, 213)) * (dim && !QUAD.includes(ro) ? 0.3 : 1);
        C[j] = w[1][0]; C[j + 1] = w[1][1]; C[j + 2] = w[1][2]; O[j] = u[0] * r; O[j + 1] = u[1] * r * 0.9; O[j + 2] = u[2] * r;
        R[i] = (0.25 + 0.7 * hash(i, 214)) * (hash(i, 215) < 0.5 ? 1 : -1);
        f.col[j] = lerp(hue[0], ink[0], hot) * b; f.col[j + 1] = lerp(hue[1], ink[1], hot) * b; f.col[j + 2] = lerp(hue[2], ink[2], hot) * b;
        f.size[i] = 0.8 + 0.8 * hash(i, 216) + (hash(i, 217) > 0.985 ? 1.4 : 0);
      } else if (ro < 20) {                                                      // haze: a loose tinted halo around a cluster
        const c = ro - 16, m = CENTRES[c], r = 0.9 + 2.8 * Math.pow(hash(i, 222), 0.8);
        C[j] = m[0]; C[j + 1] = m[1]; C[j + 2] = m[2]; O[j] = u[0] * r * 1.1; O[j + 1] = u[1] * r * 0.8; O[j + 2] = u[2] * r;
        R[i] = 0.05 + 0.05 * hash(i, 224);
        G3.tint(f, i, HUES[c], (0.3 + 0.3 * hash(i, 223)) * (dim ? 0.4 : 1)); f.size[i] = 0.6 + 0.6 * hash(i, 226);
      } else {                                                                   // dust: the rest of the space
        const r = Math.cbrt(hash(i, 232));
        O[j] = u[0] * r * 14.6; O[j + 1] = u[1] * r * 7.6; O[j + 2] = u[2] * r * 5.5; R[i] = 0.012 * (hash(i, 234) - 0.5);
        const k = (dim ? 0.18 : 0.32); f.col[j] *= k; f.col[j + 1] *= k; f.col[j + 2] *= k; f.size[i] = 0.5 + 0.5 * hash(i, 236);
      }
    }
    return tl => { for (let i = 0, j = 0; i < n; i++, j += 3) {
      const a = R[i] * tl, c = Math.cos(a), s = Math.sin(a), b = 1 + 0.05 * Math.sin(tl * 1.1 + i * 0.37);
      f.pos[j] = C[j] + (O[j] * c + O[j + 2] * s) * b; f.pos[j + 1] = C[j + 1] + O[j + 1] * b; f.pos[j + 2] = C[j + 2] + (-O[j] * s + O[j + 2] * c) * b;
    } };
  };
  G3.form("clusters", clusters(false));             // public: scene 9 reuses it
  G3.form("s2-quad", clusters(true));

  // the word, alive: a slow wave of depth runs through the letters
  G3.form("s2-king", (f, n) => { G3.textForm("king", { width: 16, depth: 0.5 })(f, n); const base = f.pos.slice();
    return tl => { for (let j = 0; j < n * 3; j += 3) { const w = Math.sin(tl * 1.5 - base[j] * 0.55 + base[j + 1] * 0.3); f.pos[j + 1] = base[j + 1] + 0.14 * w; f.pos[j + 2] = base[j + 2] + 0.45 * w; } }; });

  // one bright point (the points that will be king's knot) in a faint, slowly turning cloud
  G3.form("s2-point", (f, n) => {
    const O = new Float32Array(n * 3), R = new Float32Array(n), ink = G3.rgb("ink");
    for (let i = 0, j = 0; i < n; i++, j += 3) {
      const u = unit(i, 240);
      if (role(i) === KING) { const r = 0.02 + 1.8 * Math.pow(hash(i, 242), 3.4); O[j] = u[0] * r; O[j + 1] = u[1] * r; O[j + 2] = u[2] * r; R[i] = -1;
        G3.tint(f, i, ink, 0.5 + 0.4 * hash(i, 243)); f.size[i] = 1.4 + 1.2 * hash(i, 244) + (hash(i, 245) > 0.97 ? 2.2 : 0); }
      else { const r = Math.cbrt(hash(i, 246)); O[j] = u[0] * r * 15.2; O[j + 1] = u[1] * r * 7.8; O[j + 2] = u[2] * r * 8.5; R[i] = 0.03 + 0.03 * hash(i, 247);
        const st = hash(i, 250) > 0.985, k = st ? 1 : 0.36 + 0.2 * hash(i, 248); f.col[j] *= k; f.col[j + 1] *= k; f.col[j + 2] *= k; f.size[i] = st ? 1.9 : 0.5 + 0.6 * hash(i, 249); }
    }
    return tl => { for (let i = 0, j = 0; i < n; i++, j += 3) {
      if (R[i] < 0) { const b = 1 + 0.25 * Math.sin(tl * 1.7 + i); f.pos[j] = king[0] + O[j] * b; f.pos[j + 1] = king[1] + O[j + 1] * b; f.pos[j + 2] = king[2] + O[j + 2] * b; }
      else { const a = R[i] * tl, c = Math.cos(a), s = Math.sin(a); f.pos[j] = O[j] * c + O[j + 2] * s; f.pos[j + 1] = O[j + 1] + 0.25 * Math.sin(tl * 0.5 + i); f.pos[j + 2] = -O[j] * s + O[j + 2] * c; }
    } };
  });

  // ---- the points and the camera, each on its spoken phrase
  const t0 = p.start - 0.8, tList = p.at("a list of numbers"), tPoint = p.at("a point in a space"), tAxes = p.at("Here are three");
  const tNear = p.at("land near each other"), tGather = tNear - 0.9, tDir = p.at("Directions carry meaning");
  const tMW = p.at("man to woman"), tKQ = p.at("king to queen"), tGeo = p.at("Meaning has");   // the last beat starts a word group early so the whole figure holds on "geometry"
  const tOut = p.end - 0.8;                                                                    // scene 3 takes the points here: the overlay fades with them
  const AT = [0, 0.2, 0];
  G3.level.to(t0, 1, { dur: 0.8 }); G3.grain.to(t0, 1, { dur: 0.8 });
  G3.cam.to(t0, { az: -0.2, el: 0, dist: 34, look: [0, 0, 0], fov: 40 }, { dur: 1.6 });
  G3.morph(t0, "s2-king", { dur: 1.9, at: [0, 0.5, 0], swirl: 0.7 });                           // "I begin with words": the points spell king, centred
  G3.cam.to(t0 + 1.6, { az: 0.12, dist: 30.5 }, { dur: tPoint - 0.5 - (t0 + 1.6), ease: "sine" });   // one slow move round and in for the whole hold, so the wave reads as depth
  G3.morph(tList - 0.9, "s2-king", { dur: 0.9, at: [-6.2, 0.5, 0], swirl: 0, stagger: 0.06, bloom: 0, clock: t => t - t0 });   // the word steps left to make room for its numbers
  const segPoint = G3.morph(tPoint - 0.5, "s2-point", { dur: 1.3, at: AT, swirl: 0.4, stagger: 0.2 });   // "a point in a space": the word collapses to one point, landing on the words
  film.hit("pop", tPoint + 0.7);
  G3.cam.to(tPoint - 0.5, { az: 0.6, el: 0.2, dist: 25, look: [-1.4, 1.6, 0] }, { dur: 2.6 });      // push in on the point and swing round, so the axes will read in depth
  G3.cam.to(tAxes, { dist: 31, look: [0, 0, 0] }, { dur: 2.4 });                                  // "Here are three": the pull back shows the axes
  G3.cam.to(tAxes, { az: 0.34, el: 0.16 }, { dur: tGather - tAxes + 2.2 });                       // and the slow orbit begins
  const segCl = G3.morph(tGather, "clusters", { dur: 2.1, at: AT, swirl: 0.35, stagger: 0.6 }); // "land near each other": the cloud gathers
  film.hit("thock", tNear + 0.9);
  G3.cam.to(tDir, { az: 0.14, el: 0.08, dist: 28, look: [-0.2, 0.5, 0.8] }, { dur: tMW - tDir + 1.2 });   // "Directions carry meaning": move in on the four words
  G3.cam.to(tKQ, { az: -0.16, el: 0.06 }, { dur: Math.max(2, p.end - tKQ), ease: "sine" });
  G3.morph(tGeo, "s2-quad", { dur: 0.7, at: AT, swirl: 0, stagger: 0.1, clock: t => t - tGather });         // "Meaning has become geometry": the points of every other word dim
  film.hit("chord", tGeo + 0.2);

  // ---- the 2D layer
  const S = film.scene(p, { fadeOut: 1.2 });
  const head = S.hud.text("Words become numbers", { x: 120, y: 96, size: "head", id: "s2-head" });
  head.hide(tGeo); S.hud.text("Words become geometry", { x: 120, y: 96, size: "head", id: "s2-head-geo" }).show(tGeo, { by: "fade" });

  // "a list of numbers": a column vector beside the word (illustrative numbers)
  const vx = 1200, vy = 336, rowH = 72, vh = 5 * rowH + 16, vw = 300;
  const brL = S.path(`M${vx + 24},${vy} H${vx} V${vy + vh} H${vx + 24}`, { stroke: "muted", lw: 3, fill: "none", id: "s2-bracket-l" }).show(tList, { by: "draw" });
  const brR = S.path(`M${vx + vw - 24},${vy} H${vx + vw} V${vy + vh} H${vx + vw - 24}`, { stroke: "muted", lw: 3, fill: "none", id: "s2-bracket-r" }).show(tList, { by: "draw" });
  const nums = [...king.map(v => (v / 10).toFixed(2).replace("-", "−")), "0.08", "..."].map((v, i) =>   // the first three rows are where the king point sits on the three axes
    S.text(v, { x: vx + vw - 60, y: vy + 20 + i * rowH, size: "body", font: "mono", align: "right", color: i === 4 ? "muted" : "ink", id: "s2-num" + i }));
  Stage.each(nums, tList, (n, t) => n.show(t), 0.1);
  film.hit("pluck", tList, { pitch: 3 });
  const vnote = S.text("illustrative numbers", { x: vx, y: vy + vh + 22, size: "note", color: "muted", id: "s2-vnote" }).show(tList + 0.4);
  nums[4].to(p.at("far more dimensions"), { color: "accent" }).pulse(p.at("far more dimensions"));         // the dots stand for all the other dimensions
  [brL, brR, vnote, ...nums].forEach(n => n.hide(p.at("anyone can draw")));                              // the list stays while the word becomes its point

  S.text("illustration: positions placed by hand", { x: 1800, y: 948, size: "note", align: "right", color: "muted", id: "s2-note" }).show(tNear + 0.9);
  S.text("word2vec, Mikolov et al., 2013", { x: 120, y: 948, size: "note", color: "muted", id: "s2-credit" }).show(p.at("one early word model")).to(tGeo, { color: "ink" });
  film.hit("tick", tAxes, { pitch: 2 }); film.hit("pluck", tMW + 0.1, { pitch: 2 }); film.hit("pluck", tKQ + 0.1, { pitch: 5 });

  // labels, axes and arrows that follow the 3D points
  const AXES = [[15.2, 0, 0], [0, 7.6, 0], [0, 0, 9.5]];
  const world = (q, t) => segCl.world(q, t);
  const trimmed = (a, b, ga, gb) => { const d = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / d, uy = (b.y - a.y) / d; return [{ x: a.x + ux * ga, y: a.y + uy * ga }, { x: b.x - ux * gb, y: b.y - uy * gb }]; };
  G3.overlay(S, (ctx, t) => {
    const out = 1 - smooth(tOut, tOut + 0.45, t);                                // everything here leaves with the points it labels
    if (out <= 0.003) return;
    const W3 = i => G3.project(world(WORDS[i][1], t), t);
    // "Here are three": the axes, drawn outward from the centre one after another; they leave before the arrows
    const aAx = smooth(tAxes, tAxes + 0.3, t) * (1 - 0.45 * smooth(tGather + 0.4, tGather + 1.8, t)) * (1 - smooth(tDir, tDir + 1.0, t)) * out;
    if (aAx > 0.003) AXES.forEach((ax, k) => {
      const d = G3.ease(clamp((t - tAxes - 0.3 * k) / 0.9)), o = world([0, 0, 0], t);
      for (const sg of [1, -1]) {
        G3.line3(ctx, t, o, world(ax.map(v => v * sg), t), { color: "muted", lw: 2.5, alpha: 0.8 * aAx, draw: d });
        for (let m = 2; m < 15; m += 2) { const L = Math.hypot(...ax); if (m > L * d) break; const q = ax.map(v => v / L * m * sg), e = [0, 0, 0]; e[(k + 1) % 3] = 0.16;
          G3.line3(ctx, t, world(plus(q, e), t), world(plus(q, e.map(v => -v)), t), { color: "muted", lw: 2, alpha: 0.7 * aAx }); }
      }
      // three of the listed numbers: a drop line from the king point to its place on this axis
      const foot = [0, 0, 0]; foot[k] = king[k];
      const [s, e] = trimmed(W3(KING), G3.project(world(foot, t), t), 22, 0);
      G3.line3(ctx, t, s, e, { color: "muted", lw: 2, alpha: 0.9 * aAx * (1 - smooth(tGather, tGather + 0.8, t)), dash: [6, 8], draw: G3.ease(clamp((t - tAxes - 0.3 * k - 0.7) / 0.6)) });
    });
    // the dashed sides that close the parallelogram, on the last beat
    const dq = G3.ease(clamp((t - tGeo - 0.15) / 0.6));
    if (dq > 0) for (const [a, b] of [[MAN, KING], [WOMAN, QUEEN]]) { const [s, e] = trimmed(W3(a), W3(b), 54, 54); G3.line3(ctx, t, s, e, { color: "ink", lw: 3, alpha: 0.6 * out, dash: [10, 10], draw: dq }); }
    // the two arrows: the same step twice
    const lw = 6 + 1.5 * smooth(tGeo, tGeo + 0.5, t) + 3 * Math.sin(Math.PI * clamp((t - tGeo) / 0.8));
    ctx.save(); ctx.globalAlpha = out;
    for (const [a, b, ts] of [[MAN, WOMAN, tMW], [KING, QUEEN, tKQ]]) { const d = G3.ease(clamp((t - ts) / 0.8)); if (d <= 0) continue;
      const [s, e] = trimmed(W3(a), W3(b), 46, 50), x2 = lerp(s.x, e.x, d), y2 = lerp(s.y, e.y, d), an = Math.atan2(e.y - s.y, e.x - s.x), h = 26 + (lw - 6) * 2.5, ca = Math.cos(an), sa = Math.sin(an);
      for (const [col, grow] of [["bg", 5], ["accent", 0]]) {                    // a dark edge under the coral keeps the arrow off the points
        ctx.strokeStyle = ctx.fillStyle = G3.css(col); ctx.lineWidth = lw + grow * 2; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(x2 - ca * h * 0.7, y2 - sa * h * 0.7); ctx.stroke();
        if (d > 0.2) { ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - h * Math.cos(an - 0.44), y2 - h * Math.sin(an - 0.44)); ctx.lineTo(x2 - h * Math.cos(an + 0.44), y2 - h * Math.sin(an + 0.44)); ctx.closePath(); ctx.fill(); if (grow) { ctx.lineWidth = grow * 2; ctx.stroke(); } }
      } }
    ctx.restore();
    // word labels: king from the moment it is a point, the rest as the clusters land.
    // On "man to woman" the twelve bystander words and the group names step back, so the eye stays on the four being named.
    const focus = smooth(tMW - 0.3, tMW + 0.5, t);
    WORDS.forEach((w, i) => {
      const a = i === KING ? smooth(tPoint + 0.5, tPoint + 0.9, t) : smooth(tNear + 0.25 + 0.05 * i, tNear + 0.7 + 0.05 * i, t);
      const o = w[3] || [0, -52, "center"];
      G3.text3(ctx, t, w[0], world(w[1], t), { size: 34, dx: o[0], dy: o[1], align: o[2], alpha: a * (QUAD.includes(i) ? 1 : 1 - 0.55 * focus) * out, color: "ink" });
    });
    GROUPS.forEach((g, c) => G3.text3(ctx, t, g[0], world(g[1], t), { size: 26, dy: 0, align: g[2], color: HUES[c], alpha: smooth(tNear + 0.9 + 0.1 * c, tNear + 1.4 + 0.1 * c, t) * (1 - 0.5 * focus) * out }));
  }, { id: "s2-overlay" });
} });
