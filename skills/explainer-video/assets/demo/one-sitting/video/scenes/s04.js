// scene 4, "Three equations": a cloud of 30,000 starting states is stepped through the Lorenz equations and falls onto
// the butterfly; then two markers that start 0.000001 apart in x are integrated side by side until they sit on
// opposite wings. Everything on screen is computed here with RK4. Public form: "lorenz".
// Hues: accent = marker A, blue = marker B (its twin, 0.000001 away). The points keep the film's default dress.
(window.SCENES = window.SCENES || []).push({ n: 4, build(film, p, G3) {
  const N = G3.N, hash = G3.hash, clamp = G3.clamp, lerp = G3.lerp, smooth = G3.smooth;

  // ---- the mathematics: dx/dt = 10(y − x), dy/dt = x(28 − z) − y, dz/dt = xy − (8/3)z, one RK4 step in place
  const step = (s, h) => {
    const x = s[0], y = s[1], z = s[2];
    const k1x = 10 * (y - x), k1y = x * (28 - z) - y, k1z = x * y - (8 / 3) * z;
    let a = x + 0.5 * h * k1x, b = y + 0.5 * h * k1y, c = z + 0.5 * h * k1z;
    const k2x = 10 * (b - a), k2y = a * (28 - c) - b, k2z = a * b - (8 / 3) * c;
    a = x + 0.5 * h * k2x; b = y + 0.5 * h * k2y; c = z + 0.5 * h * k2z;
    const k3x = 10 * (b - a), k3y = a * (28 - c) - b, k3z = a * b - (8 / 3) * c;
    a = x + h * k3x; b = y + h * k3y; c = z + h * k3z;
    const k4x = 10 * (b - a), k4y = a * (28 - c) - b, k4z = a * b - (8 / 3) * c;
    s[0] = x + h / 6 * (k1x + 2 * k2x + 2 * k3x + k4x); s[1] = y + h / 6 * (k1y + 2 * k2y + 2 * k3y + k4y); s[2] = z + h / 6 * (k1z + 2 * k2z + 2 * k3z + k4z);
  };
  // Lorenz state -> form coordinates: z is up, the view is turned TH about the vertical, the whole thing fits 30 x 16
  const KS = 0.33, TH = 0, cT = Math.cos(TH), sT = Math.sin(TH), ZC = 24.5;
  const fx = (x, y) => (x * cT + y * sT) * KS, fy = z => (z - ZC) * KS, fz = (x, y) => (y * cT - x * sT) * KS;

  // ---- the points: one long solution (the attractor), and the real flow of a cloud of starting states onto it
  const TDT = 0.01, M = 10000, PERIOD = 115;    // the long solution: M samples TDT apart (about 130 turns); PERIOD = samples between bright heads
  const FLOW = 1.7, EXTRA = 0.6, FDT = 0.02, SNAP = 0.04, NS = Math.round((FLOW + EXTRA) / SNAP) + 1;
  const PUB_RATE = 0.55;                       // simulated time units per second of local time in the public form
  let DATA = null;
  const data = () => {
    if (DATA) return DATA;
    const TR = new Float32Array(M * 3), s = [1, 1, 1];
    for (let i = 0; i < 1500; i++) step(s, TDT);
    for (let i = 0; i < M; i++) { step(s, TDT); TR[i * 3] = fx(s[0], s[1]); TR[i * 3 + 1] = fy(s[2]); TR[i * 3 + 2] = fz(s[0], s[1]); }
    // the cloud: starting states in a loose ball around the middle of the attractor, each stepped forward for FLOW + EXTRA
    const SN = new Float32Array(NS * N * 3), q = [0, 0, 0], per = Math.round(SNAP / FDT);
    for (let i = 0; i < N; i++) {
      const u = hash(i, 401) * 2 - 1, an = hash(i, 402) * 6.2832, r = 27 * Math.pow(hash(i, 403), 0.7), w = Math.sqrt(1 - u * u);
      q[0] = r * w * Math.cos(an) * 1.15; q[1] = r * w * Math.sin(an) * 1.15; q[2] = ZC + r * u * 0.9;
      for (let k = 0; k < NS; k++) {
        if (k) for (let j = 0; j < per; j++) step(q, FDT);
        const o = (k * N + i) * 3; SN[o] = fx(q[0], q[1]); SN[o + 1] = fy(q[2]); SN[o + 2] = fz(q[0], q[1]);
      }
    }
    // hand each point to the nearest sample of the long solution at time FLOW, so the stream carries on from the flow
    const CELL = 0.4, G = 64, NEAR = 0.2, CAP = 8, key = (x, y, z) => (clamp(Math.floor(x / CELL) + 32, 0, G - 1)) + G * (clamp(Math.floor(y / CELL) + 32, 0, G - 1) + G * clamp(Math.floor(z / CELL) + 32, 0, G - 1));
    const head = new Int32Array(G * G * G).fill(-1), next = new Int32Array(M), used = new Uint8Array(M);
    for (let i = 0; i < M - 400; i++) { const k = key(TR[i * 3], TR[i * 3 + 1], TR[i * 3 + 2]); next[i] = head[k]; head[k] = i; }
    const J = new Float32Array(N), kF = Math.round(FLOW / SNAP); let far = 0;
    for (let i = 0; i < N; i++) {
      const o = (kF * N + i) * 3, x = SN[o], y = SN[o + 1], z = SN[o + 2]; let best = -1, bd = 1e9;
      for (let R = 1; R <= 1 && best < 0; R++) {
        const cx = Math.floor(x / CELL) + 32, cy = Math.floor(y / CELL) + 32, cz = Math.floor(z / CELL) + 32;
        for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) for (let c = -R; c <= R; c++) {
          const X = cx + a, Y = cy + b, Z = cz + c; if (X < 0 || Y < 0 || Z < 0 || X >= G || Y >= G || Z >= G) continue;
          for (let j = head[X + G * (Y + G * Z)]; j >= 0; j = next[j]) { const dx = TR[j * 3] - x, dy = TR[j * 3 + 1] - y, dz = TR[j * 3 + 2] - z, d = dx * dx + dy * dy + dz * dz; if (d < bd && used[j] < CAP) { bd = d; best = j; } }
        }
      }
      if (best < 0 || bd > NEAR * NEAR) { best = Math.floor(hash(i, 404) * (M - 400)); far++; }       // still inside a wing's eye: it joins the stream anywhere
      used[best]++; J[i] = best + hash(i, 405) * 0.98;
    }
    return (DATA = { TR, SN, J });
  };
  const dress = f => { for (let i = 0; i < N; i++) f.size[i] = 0.5 + 0.6 * hash(i, 406) + (hash(i, 407) > 0.972 ? 1.5 : 0); };

  // the cloud and its fall onto the attractor. Local time: under 0 = seconds before the stepping starts (the cloud
  // drifts); 0 and up = simulated time units.
  G3.form("s4-flow", f => {
    const { SN } = data(); dress(f);
    return tl => {
      const k = clamp(tl / SNAP, 0, NS - 1.0001), k0 = Math.floor(k), u = k - k0, A = k0 * N * 3, B = A + N * 3, P = f.pos;
      const wob = 0.9 * (tl < 0 ? 1 : Math.max(0, 1 - tl / 0.3)), tw = Math.min(tl, 0);
      for (let i = 0, j = 0; i < N; i++, j += 3) {
        const ph = hash(i, 408) * 6.2832;
        P[j] = SN[A + j] + (SN[B + j] - SN[A + j]) * u + wob * Math.sin(tw * 1.1 + ph);
        P[j + 1] = SN[A + j + 1] + (SN[B + j + 1] - SN[A + j + 1]) * u + wob * Math.cos(tw * 0.9 + ph * 1.7);
        P[j + 2] = SN[A + j + 2] + (SN[B + j + 2] - SN[A + j + 2]) * u + wob * Math.sin(tw * 0.7 + ph * 2.3);
      }
    };
  });
  // the public form: every point rides the long solution from its own place on it
  G3.form("lorenz", f => {
    const { TR, J } = data(), L = M - 2;
    for (let i = 0; i < N; i++) { const ph = (J[i] / PERIOD) % 1; f.size[i] = 0.42 + 1.15 * Math.exp(-(1 - ph) * 6.5) + (hash(i, 407) > 0.985 ? 0.9 : 0); }   // streaks of light that ride the flow
    return tl => {
      const adv = Math.max(0, tl) * PUB_RATE / TDT, P = f.pos;
      for (let i = 0, j = 0; i < N; i++, j += 3) {
        let q = J[i] + adv; q -= Math.floor(q / L) * L; const a = Math.floor(q), u = q - a, o = a * 3;
        P[j] = TR[o] + (TR[o + 3] - TR[o]) * u; P[j + 1] = TR[o + 1] + (TR[o + 4] - TR[o + 1]) * u; P[j + 2] = TR[o + 2] + (TR[o + 5] - TR[o + 2]) * u;
      }
    };
  });

  // ---- the two markers. A starts where the solution from (1, 1, 1) is after K0 steps; B starts 0.000001 away in x.
  const MDT = 0.005, K0 = 107775, GAP0 = 1e-6, SIM = 22, MS = Math.round(SIM / MDT) + 1;
  const MA = new Float64Array(MS * 3), MB = new Float64Array(MS * 3), GAP = new Float64Array(MS);
  { const a = [1, 1, 1]; for (let i = 0; i < K0; i++) step(a, MDT); const b = [a[0] + GAP0, a[1], a[2]];
    for (let i = 0; i < MS; i++) { if (i) { step(a, MDT); step(b, MDT); } MA.set(a, i * 3); MB.set(b, i * 3); GAP[i] = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); } }
  const samp = (arr, s, k) => { const q = clamp(s / MDT, 0, MS - 1.001), i = Math.floor(q), u = q - i; return arr[i * 3 + k] + (arr[i * 3 + 3 + k] - arr[i * 3 + k]) * u; };
  const gapAt = s => { const q = clamp(s / MDT, 0, MS - 1.001), i = Math.floor(q); return GAP[i] + (GAP[i + 1] - GAP[i]) * (q - i); };
  const opposite = i => MA[i * 3] * MB[i * 3] < 0 && Math.min(Math.abs(MA[i * 3]), Math.abs(MB[i * 3])) > 2.5;
  // what the solutions do: sStill = how long the gap still reads 0.000001, sWings = the first moment from which the
  // two stay on opposite wings for 1.6 time units, sPart = the last moment before that with the gap under 3 (the gap
  // passes 1 earlier and falls back twice; from sPart on it only opens)
  let sStill = 0, sPart = -1, sWings = -1;
  for (let i = 0; i < MS && GAP[i].toFixed(6) === "0.000001"; i++) sStill = i * MDT;
  for (let i = 0, run = 0; i < MS; i++) { run = opposite(i) ? run + 1 : 0; if (run * MDT >= 1.6) { sWings = i * MDT - 1.6; break; } }
  for (let i = 0; i * MDT < sWings; i++) if (GAP[i] < 3) sPart = i * MDT;
  if (sWings < 0 || sPart < 0 || sPart > sWings) film.problem("s4: the two markers do not end on opposite wings");

  // ---- cues
  const t0 = p.start - 0.8, tEq = p.at("three short equations"), tLor = p.at("Edward Lorenz"), tStep = p.at("step them forward"), tFly = p.at("his butterfly"),
    tTwo = p.at("two points"), tMil = p.at("one millionth apart"), tApart = p.after("one millionth apart"), tTog = p.at("fly together"), tPart = p.at("Then they part"), tWings = p.at("opposite wings"), tChaos = p.at("That is chaos");

  // the markers' clock: film time -> simulated time, a cubic Hermite through anchors on the spoken words.
  // The markers creep while the readout holds 0.000001 (to the end of "apart"), run at one steady fast speed V while
  // they fly together (a note on screen says so), slow just before the split so that it opens on "Then they part",
  // and hold on opposite wings. Short ramps (rU, rD) join the speeds.
  const hold = Math.min(0.3 * (p.end - tWings), 1.3);
  const x0 = tTwo + 0.45, x1 = Math.max(tApart, x0 + 0.75), x2 = Math.max(tPart + 0.3, x1 + 1), x3 = Math.max(tWings, x2 + 0.5), x4 = Math.max(p.end, x3 + 0.5);
  const y1 = Math.min(0.9, sStill - 0.04), y2 = sPart - 0.2, y3 = sWings + 0.1, y4 = y3 + hold;
  const m1 = 1.5 * y1 / (x1 - x0), d2 = (y3 - y2) / (x3 - x2), d3 = hold / (x4 - x3), m2 = 1.15 * d2, rU = Math.min(0.25, 0.2 * (x2 - x1)), rD = Math.min(0.35, 0.3 * (x2 - x1));
  const V = Math.max(m1, m2, (y2 - y1 - m1 * rU / 2 - m2 * rD / 2) / (x2 - x1 - rU / 2 - rD / 2));     // time units a second
  const ax = [x0, x1, x1 + rU, x2 - rD, x2, x3, x4], ay = [0, y1, y1 + (m1 + V) / 2 * rU, y2 - (V + m2) / 2 * rD, y2, y3, y4], am = [0, m1, V, V, m2, (d2 + d3) / 2, d3];
  const sim = t => { if (t <= ax[0]) return 0; let i = 0; while (i < ax.length - 2 && t > ax[i + 1]) i++;
    const h = ax[i + 1] - ax[i], u = clamp((t - ax[i]) / h), u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ay[i] + (u3 - 2 * u2 + u) * h * am[i] + (-2 * u3 + 3 * u2) * ay[i + 1] + (u3 - u2) * h * am[i + 1]; };
  { const a = Math.round(sim(tWings) / MDT), b = Math.round(sim(p.end) / MDT); let ok = b < MS;                      // the claims the narration makes
    for (let i = a; i <= b && ok; i++) ok = opposite(i);
    if (!ok) film.problem("s4: the two markers are not on opposite wings from \"opposite wings\" to the end");
    if (sStill < 0.2) film.problem("s4: the gap readout does not start at 0.000001"); }

  // ---- the points and the camera
  const AT = [5.3, -0.2, 0], tHand = tFly - 0.35, rate = FLOW / (tHand - tStep);         // flow speed, in time units a second
  G3.morph(t0, "s4-flow", { dur: 2.0, at: AT, swirl: 0.5, clock: t => (t < tStep ? t - tStep : (t - tStep) * rate) });   // "I can do mathematics": a loose cloud
  G3.cam.to(t0, { az: -1.25, el: 0.2, dist: 44, look: [0, 0, 0], fov: 40 }, { dur: 1.6 });
  G3.level.to(t0, 1, { dur: 0.8 }); G3.grain.to(t0, 1.6, { dur: 0.8 }); G3.grain.to(tStep, 1, { dur: 1.5 });
  G3.cam.to(t0 + 1.6, { az: -0.72, dist: 38 }, { dur: tStep - t0 - 1.6, ease: "linear" });      // a slow orbit round the seething cloud, pushing in
  film.hit("rise", tStep);                                                                // "step them forward": the cloud is stepped through the equations
  const segL = G3.morph(tHand, "lorenz", { dur: 0.55, at: AT, swirl: 0, stagger: 0, bloom: 0, clock: t => (t - tHand) * rate / PUB_RATE });   // the stream carries on
  G3.cam.to(tStep, { az: -0.6, el: 0.3, dist: 37 }, { dur: tFly - tStep, ease: "linear" });     // the orbit carries on at the same rate through the fall
  G3.cam.to(tFly, { az: 0, el: 0.05, dist: 31 }, { dur: 1.8 });                           // "his butterfly": round to the two-winged view
  G3.level.to(tTwo, 0.55, { dur: 0.8 });                                                   // "two points": the markers are the subject
  const tSet = Math.max(tTwo, tFly + 1.8);
  G3.cam.to(tSet, { az: 0.05 }, { dur: Math.max(0.5, tTog - tSet), ease: "linear" });
  G3.cam.to(tTog, { az: 0.1, dist: 30.4 }, { dur: Math.max(0.5, tPart - tTog), ease: "linear" });   // "fly together": ease back to take in both wings
  G3.cam.to(tPart, { az: 0.14, dist: 28.8 }, { dur: 1.6 });                                 // "Then they part": push in on the split
  G3.cam.to(tWings, { az: 0.2, dist: 29.4 }, { dur: p.end - tWings, ease: "linear" });       // "opposite wings": hold, drifting
  G3.level.to(tChaos, 0.75, { dur: 1.2 });
  film.hit("pop", tTwo); film.hit("pluck", tPart, { pitch: 5 }); film.hit("chord", tChaos + 0.2);

  // ---- the 2D layer
  const S = film.scene(p, { fadeOut: 1.2 });
  S.hud.text("Three equations", { x: 120, y: 96, size: "head", id: "s4-head" }).show(p.start + 0.3);
  const eqs = ["dx/dt = 10(y − x)", "dy/dt = x(28 − z) − y", "dz/dt = xy − (8/3)z"].map((e, i) =>
    S.text(e, { x: 120, y: 268 + i * 76, size: "body", font: "mono", id: "s4-eq" + i }).show(tEq + i * 0.28));
  film.hit("pluck", tEq, { pitch: 3 });
  const credit = S.text("Lorenz, 1963", { x: 120, y: 520, size: "label", color: "muted", id: "s4-credit" }).show(tLor);
  credit.hide(tTwo - 0.2);
  S.text("gap", { x: 120, y: 620, size: "label", color: "muted", id: "s4-gap-label" }).show(tMil, { dur: 0.25 });
  // the readout is the true distance between the two solutions, read 8 times a second so that each value can be seen
  const fmtGap = g => (g < 0.9999995 ? g.toFixed(6) : g < 9.995 ? g.toFixed(2) : g.toFixed(1));
  S.number(tMil, { x: 120, y: 664, size: "head", font: "mono", fmt: v => fmtGap(gapAt(sim(Math.floor(v * 8) / 8))), id: "s4-gap" })
    .show(tMil, { dur: 0.25 }).to(tMil, { value: p.end - 0.8 }, { dur: p.end - 0.8 - tMil, ease: "linear" }).pulse(tTog);
  S.text("time sped up", { x: 120, y: 770, size: "label", color: "muted", id: "s4-fast" }).show(ax[1]).hide(tPart);
  S.text("almost the same start, different futures", { x: 120, y: 880, size: "body", id: "s4-line" })
    .show(Math.min(tChaos, p.after("opposite wings") + 0.05), { dur: 0.3 });               // six words: it lands in the breath before "That is chaos", to be read in time

  // the markers and their trails, drawn over the points
  const world = (arr, s, t) => segL.world([fx(samp(arr, s, 0), samp(arr, s, 1)), fy(samp(arr, s, 2)), fz(samp(arr, s, 0), samp(arr, s, 1))], t);
  G3.overlay(S, (ctx, t) => {
    if (t < tTwo) return;
    const s = sim(t), ds = s - sim(t - 1 / 30), fast = smooth(0.05, 0.12, ds);            // ds = simulated time in this frame; fast = the heads are streaks
    const a = clamp((t - tTwo) / 0.35) * (1 - clamp((t - (p.end - 0.8)) / 0.5)), TRAIL = clamp((sim(t + 0.02) - sim(t - 0.02)) / 0.04 * 0.85, 2.6, 5.2), DS = 0.006,   // the trail shows the last 0.85 s
    n = Math.max(2, Math.ceil(Math.min(TRAIL, s) / DS) + 1), s0 = Math.max(0, s - TRAIL);
    const trail = (arr, color, wide) => {
      const pts = []; for (let i = 0; i < n; i++) { const sv = lerp(s0, s, i / (n - 1)); pts.push(G3.project(world(arr, sv, t), t), sv); }
      ctx.strokeStyle = G3.css(color); ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i + 1 < n; i += 12) {             // a soft wide pass, then the core
        const e = Math.min(n - 1, i + 12), k = Math.pow((i + 6) / n, 1.6), sep = smooth(0.25, 2.5, gapAt(pts[i * 2 + 1]));
        const lw = lerp(wide ? 7.5 : 3.2, 5, sep) * (0.35 + 0.65 * k);
        ctx.globalAlpha = a * k * (pass ? 0.95 : 0.16); ctx.lineWidth = pass ? lw : lw * 3.2;
        ctx.beginPath(); ctx.moveTo(pts[i * 2].x, pts[i * 2].y); for (let j = i + 1; j <= e; j++) ctx.lineTo(pts[j * 2].x, pts[j * 2].y); ctx.stroke();
      }
    };
    if (s > 0.01) { trail(MB, "blue", true); trail(MA, "accent", false); }
    const qa = G3.project(world(MA, s, t), t), qb = G3.project(world(MB, s, t), t), d = Math.hypot(qa.x - qb.x, qa.y - qb.y), sp = smooth(6, 26, d);
    const ring = clamp((t - tTwo) / 0.9); if (ring < 1) G3.dot3(ctx, t, qa, { ring: true, color: "ink", r: 14 + 46 * G3.ease(ring), lw: 3, alpha: (1 - ring) * 0.9 });
    // while time runs fast a head is drawn as the stretch of its path covered in this frame, so frames join end to end
    const streak = (arr, color, r) => {
      const m = Math.max(2, Math.ceil(ds / DS) + 1), pts = []; for (let i = 0; i < m; i++) pts.push(G3.project(world(arr, s - ds + ds * i / (m - 1), t), t));
      ctx.lineCap = "round"; ctx.lineJoin = "round"; const dim = lerp(1, 0.35, smooth(0.12, 0.3, ds));   // a long streak is thinner and dimmer, so the fast stretch does not strobe
      for (const [c, w, al] of [[color, r * 4, 0.2], ["bg", r * 1.4 + 4, 0.6], [color, r * 1.4, 1]]) {
        ctx.strokeStyle = G3.css(c); ctx.lineWidth = w; ctx.globalAlpha = al * a * fast * dim;
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < m; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    const dot = (q, color, r) => { const k = a * (1 - fast); G3.dot3(ctx, t, q, { color, r: r * 2.6, alpha: 0.2 * k }); G3.dot3(ctx, t, q, { color: "bg", r: r + 2.5, alpha: 0.8 * k }); G3.dot3(ctx, t, q, { color, r, alpha: k }); };
    const rb = lerp(13, 9.5, sp), ra = lerp(7, 9.5, sp);                                    // one inside the other while they are together
    if (fast > 0) { streak(MB, "blue", rb); streak(MA, "accent", ra); }
    if (fast < 1) { dot(qb, "blue", rb); dot(qa, "accent", ra); }
  }, { id: "s4-markers" });
} });
