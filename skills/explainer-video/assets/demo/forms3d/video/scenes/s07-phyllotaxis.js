// gallery scene 7: forms3d/phyllotaxis.js. A core, twelve seeds turned by the golden angle, the full head, the flower.
// The form plays its default timeline; the morph's clock lands each stage on its spoken word. The arc, the rings and
// the angle label are drawn from the form's anchors (seed, dir, stage) through seg.world.
(window.SCENES = window.SCENES || []).push({ n: 7, build(film, p, G3) {
  const { smooth, clamp } = G3;
  const life = G3.lib.phyllotaxis({ play: true });
  G3.form("g7-life", life);

  // ---- cues
  const tSeeds = p.at("Phyllotaxis places", -0.7), tAngle = p.at("golden angle"), tHead = p.at("The head"), tCurls = p.at("curls up"), tFlower = p.at("flower");
  const t0 = p.start - 0.8, tFull = tCurls - 0.1;                                      // the head grows under "The head grows outward" and is full as "then" ends

  // ---- the points and the camera. The form's centre stays 250 px right of the frame's centre, clear of the text.
  const PXU = 1483.6;                                                                 // pixels per world unit at distance 1 (fov 40)
  const lookFor = (az, dist, sx, sy) => [-sx * dist / PXU * Math.cos(az), -sy * dist / PXU, sx * dist / PXU * Math.sin(az)];
  const seg = G3.morph(t0, "g7-life", { dur: 1.7, swirl: 0.9,
    clock: life.clock([[tSeeds, life.tSeed], [tHead, life.tGrow], [tFull, life.tFull], [tCurls + 0.15, life.tCurl], [tFlower, life.tOpen]]) });
  G3.cam.to(t0, { az: 0, el: 0, dist: 19, look: lookFor(0, 19, 250, 35), fov: 40 }, { dur: 1.6 });
  G3.level.to(t0, 1, { dur: 0.8 }); G3.grain.to(t0, 1, { dur: 0.8 });
  G3.cam.to(tSeeds - 0.2, { dist: 23, look: lookFor(0, 23, 250, 35) }, { dur: 1.4 });                    // room for the dozen
  G3.cam.to(tHead, { dist: 38, look: lookFor(0, 38, 250, 35) }, { dur: tFull - tHead + 0.4 });           // the hero move: back off as the head grows
  G3.cam.to(tCurls + 0.15, { az: 0.22, dist: 26, look: lookFor(0.22, 26, 250, 35) }, { dur: p.end - tCurls - 0.3, ease: "sine" });
  film.hit("pluck", tSeeds + 0.1, { pitch: 2 }); film.hit("chord", tFlower - 0.2);

  // ---- the 2D layer
  const S = film.scene(p, { fadeOut: 1.2 });
  S.hud.text("Phyllotaxis", { x: 120, y: 96, size: "head", id: "g7-heading" }).show(p.start + 0.3);
  S.hud.text("G3.lib.phyllotaxis({ play: true })", { x: 120, y: 900, size: "body", font: "mono", color: "ink", id: "g7-call" }).show(p.start + 0.6);
  G3.overlay(S, (ctx, t) => {                                                         // the turn from the last seed to the new one
    const tl = seg.local(t), st = life.stage(tl), RA = 5.5, RS = 5.9, RI = 1.0, GA = life.angle * Math.PI / 180;
    const la = smooth(tAngle, tAngle + 0.3, t) * (1 - smooth(0, 0.2, st.curl)), L = seg.world([-(Math.max(RS, st.rim) + 0.9), 0.5, 0], t);   // the angle, beside the seeds, until the head curls
    G3.text3(ctx, t, life.angle.toFixed(1) + "°", L, { size: 44, font: "mono", color: "accent", align: "right", alpha: la, dy: 0 });
    G3.text3(ctx, t, "from each seed to the next", L, { size: 26, color: "muted", align: "right", alpha: la, dy: 44 });
    const al = smooth(0.9, 1.3, st.placed) * (1 - smooth(0, 0.1, st.grow)); if (al <= 0) return;
    const k = Math.min(life.first - 1, Math.floor(st.placed));
    const at = (a, r) => G3.project(seg.world([r * Math.cos(a), r * Math.sin(a), 0], t), t);
    const a0 = life.dir(k - 1, tl), a1 = life.dir(k, tl), e = clamp((a1 - a0) / GA);            // how far the newest seed has swung
    for (let i = 0; i <= k; i++) { const ei = i < k ? 1 : smooth(0.92, 1, e); if (ei > 0) G3.dot3(ctx, t, seg.world(life.seed(i, tl), t), { ring: true, r: 24, lw: 2, color: "yellow", alpha: 0.75 * al * ei }); }
    G3.line3(ctx, t, at(a0, RI), at(a0, RS), { color: "muted", lw: 2, alpha: 0.55 * al, dash: [6, 8] });
    G3.line3(ctx, t, at(a1, RI), at(a1, RS), { color: "accent", lw: 2.5, alpha: 0.9 * al });
    ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = ctx.fillStyle = G3.css("accent"); ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath();
    const n = Math.max(2, Math.ceil(48 * e)); for (let q = 0; q <= n; q++) { const s = at(a0 + (a1 - a0) * q / n, RA); q ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); } ctx.stroke();
    if (e > 0.2) { const s = at(a1, RA), d = a1 + Math.PI / 2, h = 15, ux = Math.cos(d), uy = -Math.sin(d), bx = s.x - ux * h * 0.2, by = s.y - uy * h * 0.2, ang = Math.atan2(uy, ux);   // arrowhead along the turn (screen y points down)
      ctx.beginPath(); ctx.moveTo(bx + ux * h, by + uy * h); ctx.lineTo(bx - h * Math.cos(ang - 1.1) * 0.9, by - h * Math.sin(ang - 1.1) * 0.9); ctx.lineTo(bx - h * Math.cos(ang + 1.1) * 0.9, by - h * Math.sin(ang + 1.1) * 0.9); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }, { id: "g7-turn" });
} });
