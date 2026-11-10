// gallery scene 2, "Clusters": the points gather into the form's default example (sixteen words in four groups),
// the labels arrive group by group, then an arrow joins two knots while the form dims every other knot.
// Everything here comes from the form's public API: cl.items, cl.groups, cl.link, cl.dim.
(window.SCENES = window.SCENES || []).push({ n: 2, build(film, p, G3) {
  const { smooth, clamp, ease } = G3;
  const t0 = p.start - 0.8, tLabels = p.at("labelled knots"), tGroups = p.at("group by group"), tArrow = p.at("An arrow"), tOut = p.end - 0.8;
  const FROM = "king", TO = "queen";

  // the form: the default groups, with two knots to keep lit, and the dimming set on the spoken cue (local time = t - t0)
  const cl = G3.lib.clusters({ highlight: [FROM, TO], dim: tl => smooth(tArrow - t0, tArrow - t0 + 0.7, tl) });
  G3.form("g2-clusters", cl);

  G3.level.to(t0, 1, { dur: 0.8 }); G3.grain.to(t0, 1, { dur: 0.8 });
  const seg = G3.morph(t0, "g2-clusters", { dur: 2.4, at: [0, 0.3, 0], swirl: 0.35, stagger: 0.6 });   // "Clusters gather": the knots are in place as they are named
  G3.cam.to(t0, { az: -0.3, el: 0.02, dist: 35, look: [0, 0, 0], fov: 40 }, { dur: 1.6 });
  G3.cam.to(t0 + 1.6, { az: 0.3, el: 0.12, dist: 31 }, { dur: p.end - (t0 + 1.6), ease: "sine" });       // the one move: a slow orbit in, so the knots read in depth
  film.hit("thock", t0 + 2.2); film.hit("tick", tLabels, { pitch: 2 }); film.hit("pluck", tArrow + 0.1, { pitch: 4 });

  const S = film.scene(p, { fadeOut: 1.2 });
  S.hud.text("Clusters", { x: 120, y: 96, size: "head", id: "g2-head" }).show(p.start + 0.3);
  S.text("G3.lib.clusters()", { x: 120, y: 900, size: "body", font: "mono", color: "ink", id: "g2-call" }).show(p.start + 0.6)
    .to(tArrow, { text: `G3.lib.clusters({ highlight: ["${FROM}", "${TO}"] })` });
  S.text("example layout, placed by hand", { x: 1800, y: 140, size: "note", align: "right", color: "muted", id: "g2-note" }).show(tLabels + 0.6);

  // labels and the arrow follow the 3D points
  G3.overlay(S, (ctx, t) => {
    const out = 1 - smooth(tOut, tOut + 0.45, t);                                 // everything here leaves with the points it labels
    if (out <= 0.003) return;
    const focus = cl.dim(seg.local(t));                                           // 0..1: how far the form has dimmed the other knots
    // "An arrow": from one knot to another, with a dark edge so it stays off the points
    const d = ease(clamp((t - tArrow) / 0.8));
    if (d > 0) { const [a, b] = cl.link(FROM, TO, seg, t);
      G3.line3(ctx, t, a, b, { color: "bg", lw: 16, alpha: out, draw: d, head: 34 });
      G3.line3(ctx, t, a, b, { color: "accent", lw: 6, alpha: out, draw: d, head: 26 }); }
    // "labelled knots": item labels, one group after another
    cl.items.forEach(it => {
      const ts = tLabels + 0.16 * it.group + 0.04 * it.index;
      G3.text3(ctx, t, it.label, seg.world(it.pos, t), { size: 34, dx: it.dx || 0, dy: it.dy ?? -52, align: it.align || "center", alpha: smooth(ts, ts + 0.4, t) * (it.lit ? 1 : 1 - 0.55 * focus) * out });
    });
    // "group by group": the group names, in their hues
    cl.groups.forEach((g, k) => G3.text3(ctx, t, g.name, seg.world(g.at, t), { size: 26, dy: 0, align: g.align || "center", color: g.color, alpha: smooth(tGroups + 0.22 * k, tGroups + 0.22 * k + 0.45, t) * (1 - 0.5 * focus) * out }));
  }, { id: "g2-overlay" });
} });
