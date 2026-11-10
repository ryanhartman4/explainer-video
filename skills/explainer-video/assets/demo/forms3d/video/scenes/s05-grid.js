// gallery scene 5: the grid. 100 x 100 cells. A scan gives every cell its state, then a wave flips the cells in
// state 1 back to state 0. The counters read the form's own count, so they match the picture exactly.
(window.SCENES = window.SCENES || []).push({ n: 5, build(film, p, G3) {
  const t0 = p.start - 0.8, tCell = p.at("a cell"), tState = p.at("takes a state"), tWave = p.at("a wave can flip");
  const tScan1 = Math.max(tState + 0.9, tWave - 0.25), tWave0 = tWave + 0.1, tWave1 = Math.max(tWave0 + 1.3, p.at("to another"));

  // ---- the form: the default states (a seeded 3 in 10 in state 1), the scan and the wave on their cues
  const AT = [6.6, 1.0, 0];
  const grid = G3.lib.grid({ reveal: [tState, tScan1], flip: [tWave0, tWave1] });
  G3.form("g5-grid", grid);
  const seg = G3.morph(t0, "g5-grid", { dur: 1.5, at: AT, swirl: 0.5, stagger: 0.5, clock: t => t });   // clock: local time is film time, so the cues above are the form's own times
  G3.cam.to(t0, { az: -0.14, el: 0.06, dist: 37, look: [0, 0, 0], fov: 40 }, { dur: 1.6 });
  G3.level.to(t0, 1, { dur: 0.8 }); G3.grain.to(t0, 1, { dur: 0.8 });
  G3.cam.to(t0 + 1.6, { az: 0, el: 0, dist: 34 }, { dur: Math.max(1, tState - t0 - 1.6), ease: "sine" });   // the hero move: a slow approach to square on, as the form itself squares up for the scan
  film.hit("thock", tState); film.hit("chord", tWave1 - 0.2);

  // ---- the 2D layer
  const S = film.scene(p, { fadeOut: 1.2 }), nf = v => Math.round(v).toLocaleString("en-US");
  S.hud.text("Grid", { x: 120, y: 96, size: "head", id: "g5-head" }).show(p.start + 0.3);
  S.text("G3.lib.grid({ states, reveal, flip })", { x: 120, y: 900, size: "body", font: "mono", color: "ink", id: "g5-call" }).show(p.start + 0.5)
    .mark("reveal", tState, { until: tWave0 }).mark("flip", tWave0, { until: tWave1 + 0.6 });          // the option at work in each beat
  S.text(`${nf(grid.cells)} cells`, { x: 120, y: 330, size: "body", color: "ink", id: "g5-cells" }).show(tCell);

  // the two counters: a number whose value is the film time, formatted by the form's own count at that time
  const counter = (s, y, color) => {
    const n = S.number(tState, { x: 120, y, size: "head", color, id: "g5-count" + s, fmt: v => nf(grid.count(s, seg.local(v))) })
      .show(tState, { by: "fade" }).to(tState, { value: p.end }, { dur: p.end - tState, ease: "linear" });
    S.text("in state " + s, { x: 120, y: y + 80, size: "label", color: "muted", id: "g5-count-label" + s }).show(tState + 0.15);
    return n;
  };
  const c1 = counter(1, 440, "red"), c0 = counter(0, 620, "green");
  c1.to(tWave0, { color: "muted" }, { dur: tWave1 - tWave0 }); c0.pulse(tWave1);                       // one count drains to grey as the wave crosses; the other reaches the total

  // one cell ringed, to show the anchor: the ring follows the form's turn and rides the crest of the wave
  const K = (() => { for (let k = 2 * grid.cols + 18; k < grid.cells; k++) if (grid.state(k, tScan1 + 0.1) === 1) return k; return 0; })();
  G3.overlay(S, (ctx, t) => { const a = G3.fade(t, tCell + 0.2, p.end - 0.9, 0.3); if (a <= 0) return;
    const tl = seg.local(t), q = G3.dot3(ctx, t, seg.world(grid.cell(K, tl), t), { ring: true, r: 13, lw: 3, color: "accent", alpha: a });
    const top = G3.project(seg.world(grid.place(grid.frameCorners[0], tl), t), t), y = Math.min(top.y, q.y - 40) - 32, s = grid.state(K, tl);
    G3.line3(ctx, t, { x: q.x, y: q.y - 15 }, { x: q.x, y: y + 20 }, { color: "accent", lw: 2, alpha: a * 0.8 });
    G3.text3(ctx, t, `cell ${nf(K)}` + (s < 0 ? "" : ": state " + s), { x: q.x, y }, { size: 34, color: "accent", dy: 0, alpha: a }); }, { id: "g5-overlay" });
} });
