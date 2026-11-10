// gallery scene 3, "Sheets": G3.lib.sheets. The stack lands, each layer takes a label, then one pass of light climbs
// through the layers and the stack stays lit. Everything here uses only the form's public API.
(window.SCENES = window.SCENES || []).push({ n: 3, build(film, p, G3) {
  const tLayers = p.at("in layers"), tPass = p.at("A pass of light"), tTop = p.at("through them");
  const t0 = p.start - 0.8, tOut = p.end - 0.8;                                 // tOut: the next scene takes the points
  const sheets = G3.lib.sheets({ layers: 6 });
  G3.form("g3-sheets", sheets);

  // ---- the points and the camera
  const seg = G3.morph(t0, "g3-sheets", { dur: 2.0, swirl: 0.7, at: [-1.3, 0.9, 0] });     // "Sheets stack": the layers
  G3.cam.to(t0, { az: 0, el: 0.04, dist: 27.5, look: [0, 0, 0], fov: 40 }, { dur: 1.6 });
  G3.level.to(t0, 1, { dur: 0.8 }); G3.grain.to(t0, 1, { dur: 0.8 });

  // "A pass of light": it enters the bottom sheet on "pass", tops out on "them" and the stack stays lit.
  // Pulse times are the form's local time: seconds since its morph began.
  const tIn = tPass + 0.25, climb = G3.clamp(tTop + 0.3 - tIn, 1.0, 1.6);
  sheets.pulse(tIn - t0, { dur: climb, hold: true });
  G3.cam.to(tPass, { dist: 25, az: 0.18, el: 0.1 }, { dur: Math.max(1.5, tOut - tPass), ease: "sine" });   // the push in that the pass rides
  film.hit("rise", tIn); film.hit("chord", tIn + climb);

  // ---- the 2D layer
  const S = film.scene(p, { fadeOut: 1.2 });
  S.hud.text("Sheets", { x: 120, y: 96, size: "head", id: "g3-heading" }).show(p.start + 0.3);
  S.hud.text("G3.lib.sheets({ layers: 6 })", { x: 120, y: 900, size: "body", font: "mono", color: "ink", id: "g3-call" }).show(p.start + 0.3)
    .to(tPass, { text: "sheets.pulse(t, { hold: true })" });

  // a label beside each layer, bottom to top; each takes the light's colour as the pass goes through its layer
  G3.overlay(S, (ctx, t) => {
    const tl = seg.local(t), out = 1 - G3.clamp((t - (tOut - 0.4)) / 0.4);
    for (let k = 0; k < sheets.layers; k++) {
      const a = G3.clamp((t - tLayers - k * 0.12) / 0.4) * out; if (a <= 0) continue;
      const q = seg.world(sheets.side(k, "right", tl), t), g = sheets.glow(k, tl), o = { size: 34, font: "mono", align: "left", dx: 44, dy: 0 };
      G3.text3(ctx, t, "layer " + (k + 1), q, { ...o, color: "muted", alpha: a });
      G3.text3(ctx, t, "layer " + (k + 1), q, { ...o, color: "accent", alpha: a * g, halo: false });
    }
  }, { id: "g3-labels" });
} });
