// gallery scene 6: G3.lib.galaxies. Two discs of stars fall together, pass on "pass each other" and throw out tails.
// It uses only the form's public API: check(), tPass and duration for the clock, cores(), discRadius(), tailStar() and star().
(window.SCENES = window.SCENES || []).push({ n: 6, build(film, p, G3) {
  const { clamp, fade } = G3;
  const gal = G3.lib.galaxies({ eccentricity: 0.5 });
  G3.form("g6-galaxies", gal);
  const ck = gal.check();                                                       // the narration says "pass each other" and "long tails": both are measured on the run
  if (!ck.ok) film.problem(`g6: the galaxies run is off: pass ${ck.pass}, separation ${ck.passSeparation.toFixed(3)}, ${(ck.tails * 100).toFixed(1)}% of stars in tails`);

  const t0 = p.start - 0.8, tRuns = p.at("Galaxies runs"), tPass = p.at("pass each other", 0.3), tTails = p.at("long tails");
  // local time: a fall that gathers speed up to the closest pass, which lands on "pass"; then the tails fly out and settle by the end of the paragraph
  const clock = t => (t < tPass ? gal.tPass * Math.pow(clamp((t - t0) / (tPass - t0)), 1.8)
    : gal.tPass + (gal.duration - gal.tPass) * (1 - Math.pow(1 - clamp((t - tPass) / (p.end - tPass)), 1.3)));
  const seg = G3.morph(t0, "g6-galaxies", { dur: 1.9, swirl: 0.9, clock });     // "Galaxies runs": the points become two discs of stars
  const shot = (dist, px, py) => [-px * dist / 1483, -py * dist / 1483, 0];      // a look point that puts the origin px right of and py above the frame's centre
  const NEAR = 0.75;                                                            // close on the dense discs the outer arms would burn to white at full level
  G3.level.to(t0, NEAR, { dur: 0.8 }); G3.grain.to(t0, 0.8, { dur: 0.8 });
  G3.cam.to(t0, { az: 0.1, el: 0.05, dist: 21, look: shot(21, 190, 70), fov: 40 }, { dur: 1.6 });
  G3.cam.to(tRuns, { az: -0.05, el: 0.12, dist: 20, look: shot(20, 190, 70) }, { dur: tPass - 0.3 - tRuns, ease: "sine" });   // a slow drift while they fall
  // the hero move: back and up as the tails grow
  G3.cam.to(tPass - 0.3, { az: -0.32, el: 0.46, dist: 31, look: shot(31, 110, 50) }, { dur: p.end - tPass + 0.2, ease: "inOut" });
  G3.level.to(tPass, 1, { dur: tTails - tPass + 0.6 }); G3.grain.to(tPass, 1.2, { dur: p.end - tPass });   // keep the thinning tails luminous as the camera backs away
  film.hit("thock", t0 + 1.5); film.hit("rise", tPass - 0.2);

  const S = film.scene(p, { fadeOut: 1.2 });
  S.hud.text("Galaxies", { x: 120, y: 96, size: "head", id: "g6-head" }).show(p.start + 0.3);
  S.text("G3.lib.galaxies({ eccentricity: 0.5 })", { x: 120, y: 900, size: "body", font: "mono", color: "ink", id: "g6-call" }).show(tRuns + 0.3);

  // labels that follow the form's anchors: the two cores while they fall, and one star that ends in a tail
  const star = Math.max(0, gal.tailStar());
  G3.overlay(S, (ctx, t) => {
    const tl = seg.local(t), aCore = fade(t, tRuns + 0.8, tPass - 0.4, 0.35), aRing = fade(t, tRuns + 0.8, p.end - 0.9, 0.35), aStar = fade(t, tPass + 0.5, p.end - 0.9, 0.35);
    const [a, b] = gal.cores(tl).map(c => seg.world(c, t)), pa = G3.project(a, t), pb = G3.project(b, t);
    [pa, pb].forEach(q => { G3.dot3(ctx, t, q, { color: "bg", r: 10, alpha: 0.8 * aCore }); G3.dot3(ctx, t, q, { color: "ink", r: 5, alpha: aCore }); });
    // the cores' label sits just outside the first disc, on the side away from the second, so it never lies on stars
    const d = Math.hypot(pa.x - pb.x, pa.y - pb.y) || 1, off = gal.discRadius(0) * seg.scale * G3.pxPerUnit(a, t) + 34, ux = (pa.x - pb.x) / d, uy = (pa.y - pb.y) / d;
    G3.text3(ctx, t, "cores(tl)", { x: pa.x + ux * off, y: pa.y + uy * off }, { size: 34, font: "mono", color: "muted", dy: 0, align: ux < -0.3 ? "right" : ux > 0.3 ? "left" : "center", alpha: aCore });
    const w = seg.world(gal.star(star, tl), t);
    G3.dot3(ctx, t, w, { ring: true, r: 13, lw: 3, color: "accent", alpha: aRing });
    G3.dot3(ctx, t, w, { r: 4, color: "accent", alpha: aRing });
    G3.text3(ctx, t, "star(i, tl)", w, { size: 34, font: "mono", color: "accent", dx: 26, dy: 0, align: "left", alpha: aStar });   // named once the star is out in the tail, clear of the discs
  }, { id: "g6-overlay" });
} });
