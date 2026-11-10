// gallery scene 4, "Lorenz": G3.lib.lorenz. A cloud of starting states is stepped through the equations and falls
// onto the attractor, then the points stream along one long solution. Two markers that start 0.05 apart ride their
// own solutions and end on different wings. The markers, their trails and the gap readout use only the form's
// public helpers: L.path, L.gap and seg.world. Hues: accent = marker a, blue = marker b.
(window.SCENES = window.SCENES || []).push({ n: 4, build(film, p, G3) {
  const { clamp, lerp, smooth } = G3;
  const t0 = p.start - 0.8, tForm = p.at("The Lorenz form"), tStream = p.at("lets the points"), tTwo = p.at("Two markers"), tDrift = p.at("drift apart");

  // ---- the form: the fall starts on "The Lorenz form" and has landed by "lets the points stream"
  const fall = +clamp(tStream - tForm - 0.3, 1.5, 3).toFixed(1), AT = [2.6, 0.3, 0];
  const L = G3.lib.lorenz({ fall });
  G3.form("g4-lorenz", L);
  const seg = G3.morph(t0, "g4-lorenz", { dur: 1.6, at: AT, swirl: 0.5, clock: t => t - tForm });   // a loose cloud first: local time is under 0 until the cue
  G3.level.to(t0, 1, { dur: 0.8 }); G3.grain.to(t0, 1, { dur: 0.8 });
  G3.cam.to(t0, { az: -0.8, el: 0.22, dist: 42, look: [0, 0, 0], fov: 40 }, { dur: 1.6 });
  const tLand = tForm + fall;
  G3.cam.to(t0 + 1.6, { az: -0.55, el: 0.26, dist: 38 }, { dur: Math.max(0.5, tLand - 0.2 - t0 - 1.6), ease: "linear" });   // a slow orbit round the cloud while it falls
  G3.cam.to(tLand - 0.2, { az: 0, el: 0.05, dist: 31.5 }, { dur: 1.8 });                              // the one move: round to the two-winged view
  const tSet = Math.max(tTwo, tLand + 1.6);
  G3.cam.to(tSet, { az: 0.06 }, { dur: Math.max(0.5, tDrift - tSet), ease: "linear" });              // a slow drift while the markers fly together
  G3.cam.to(tDrift, { az: 0.16, dist: 30.4 }, { dur: Math.max(0.5, p.end - tDrift), ease: "sine" });  // "drift apart": ease in on the split
  G3.level.to(tTwo, 0.6, { dur: 0.8 });                                                              // "Two markers": the markers are the subject
  film.hit("rise", tForm); film.hit("pluck", tDrift, { pitch: 5 });

  // ---- the two markers: a starts on the attractor (the solution from (1, 1, 1) after 29.9 time units), b starts
  // 0.05 away in x. Both are integrated by the form; the gap is the true distance between the two solutions.
  const SPAN = 9, A = L.path(1, 1, 1, { skip: 29.9, span: SPAN }), a0 = A.state(0), B = L.path(a0[0] + 0.05, a0[1], a0[2], { span: SPAN }), gap = L.gap(A, B);
  const opposite = s => { const xa = A.state(s)[0], xb = B.state(s)[0]; return xa * xb < 0 && Math.min(Math.abs(xa), Math.abs(xb)) > 2.5; };
  // sWings = the first moment from which the two stay on different wings for 1.6 time units; sPart = the last moment
  // before it with the gap under 3
  let sWings = -1, sPart = -1;
  for (let s = 0, run = 0; s <= SPAN && sWings < 0; s += 0.01) { run = opposite(s) ? run + 0.01 : 0; if (run >= 1.6) sWings = s - 1.6; }
  for (let s = 0; s < sWings; s += 0.01) if (gap(s) < 3) sPart = s;
  if (sWings < 0 || sPart < 0) film.problem("g4: the two markers do not end on different wings");
  // the markers' clock, film time -> simulated time: they fly together from "Two markers", the gap opens on "drift
  // apart", and they are on different wings 0.7 s later. A monotone cubic through those anchors.
  const x0 = tTwo + 0.35, x1 = Math.max(tDrift, x0 + 0.6), x2 = Math.max(x1 + 0.7, Math.min(x1 + 1.0, p.end - 1.3)), x3 = Math.max(p.end, x2 + 0.3);
  const ax = [x0, x1, x2, x3], ay = [0, sPart - 0.15, sWings + 0.2, sWings + 0.2 + 0.45 * (x3 - x2)];
  const dd = [0, 1, 2].map(i => (ay[i + 1] - ay[i]) / (ax[i + 1] - ax[i])), am = [0, 2 * dd[0] * dd[1] / (dd[0] + dd[1]), 2 * dd[1] * dd[2] / (dd[1] + dd[2]), dd[2]];
  const sim = t => { if (t <= x0) return 0; if (t >= x3) return ay[3]; let i = 0; while (i < 2 && t > ax[i + 1]) i++;
    const h = ax[i + 1] - ax[i], u = (t - ax[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ay[i] + (u3 - 2 * u2 + u) * h * am[i] + (-2 * u3 + 3 * u2) * ay[i + 1] + (u3 - u2) * h * am[i + 1]; };
  { let ok = sim(p.end) <= SPAN; for (let s = sim(x2); s <= sim(p.end) && ok; s += 0.01) ok = opposite(s);
    if (!ok) film.problem("g4: the two markers are not on different wings from the highlight to the end"); }

  // ---- the 2D layer
  const S = film.scene(p, { fadeOut: 1.2 });
  S.hud.text("Lorenz", { x: 120, y: 96, size: "head", id: "g4-head" }).show(p.start + 0.3);
  S.hud.text(`G3.lib.lorenz({ fall: ${fall} })`, { x: 120, y: 900, size: "body", font: "mono", color: "ink", id: "g4-call" }).show(p.start + 0.3)
    .to(tTwo, { text: "L.path(x0, y0, z0)" });
  S.text("gap", { x: 120, y: 620, size: "label", color: "muted", id: "g4-gap-label" }).show(tTwo + 0.3, { dur: 0.25 });
  // the readout is read 8 times a second so that each value can be seen
  S.number(tTwo, { x: 120, y: 664, size: "head", font: "mono", fmt: v => { const g = gap(sim(Math.floor(v * 8) / 8)); return g < 9.995 ? g.toFixed(2) : g.toFixed(1); }, id: "g4-gap" })
    .show(tTwo + 0.3, { dur: 0.25 }).to(tTwo, { value: p.end }, { dur: p.end - tTwo, ease: "linear" }).pulse(x2);

  // the markers and their trails, drawn over the points
  G3.overlay(S, (ctx, t) => {
    if (t < tTwo) return;
    const s = sim(t), a = clamp((t - tTwo) / 0.35), DS = 0.012, TRAIL = Math.min(s, 1.5), n = Math.max(2, Math.ceil(TRAIL / DS) + 1);
    const at = (path, sv) => G3.project(seg.world(path(sv), t), t);
    const trail = (path, color, wide) => {
      const pts = [], gs = []; for (let i = 0; i < n; i++) { const sv = lerp(s - TRAIL, s, i / (n - 1)); pts.push(at(path, sv)); gs.push(gap(sv)); }
      ctx.strokeStyle = G3.css(color); ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i + 1 < n; i += 8) {               // a soft wide pass, then the core
        const e = Math.min(n - 1, i + 8), k = Math.pow((i + 4) / n, 1.6), lw = lerp(wide ? 7.5 : 3.2, 5, smooth(0.25, 2.5, gs[i])) * (0.35 + 0.65 * k);
        ctx.globalAlpha = a * k * (pass ? 0.95 : 0.16); ctx.lineWidth = pass ? lw : lw * 3.2;
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); for (let j = i + 1; j <= e; j++) ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    if (s > 0.01) { trail(B, "blue", true); trail(A, "accent", false); }
    const qa = at(A, s), qb = at(B, s), sp = smooth(6, 26, Math.hypot(qa.x - qb.x, qa.y - qb.y));
    const dot = (q, color, r) => { G3.dot3(ctx, t, q, { color, r: r * 2.6, alpha: 0.2 * a }); G3.dot3(ctx, t, q, { color: "bg", r: r + 2.5, alpha: 0.8 * a }); G3.dot3(ctx, t, q, { color, r, alpha: a }); };
    dot(qb, "blue", lerp(13, 9.5, sp)); dot(qa, "accent", lerp(7, 9.5, sp));                    // one inside the other while they are together
    const ring = clamp((t - tTwo) / 0.9); if (ring < 1) G3.dot3(ctx, t, qa, { ring: true, color: "ink", r: 14 + 46 * G3.ease(ring), lw: 3, alpha: (1 - ring) * 0.9 });
    const hi = clamp((t - x2) / 0.8);                                                         // on different wings: a ring opens round each
    if (hi > 0 && hi < 1) for (const [q, color] of [[qa, "accent"], [qb, "blue"]]) G3.dot3(ctx, t, q, { ring: true, color, r: 12 + 40 * G3.ease(hi), lw: 3, alpha: (1 - hi) * 0.9 });
  }, { id: "g4-markers" });
} });
