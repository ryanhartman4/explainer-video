// scene 1, "Nobody filmed this": the opening. The worked example for every other scene file.
// Pattern: (1) register this scene's forms, (2) schedule morphs and camera on spoken phrases, (3) build the 2D layer.
(window.SCENES = window.SCENES || []).push({ n: 1, build(film, p, G3) {
  // ---- forms
  G3.form("s1-title", G3.textForm("Nobody filmed this.", { width: 34, depth: 0.6 }));
  G3.form("s1-claude", G3.textForm("Claude", { width: 20, depth: 0.8, color: "accent" }));

  // ---- the points and the camera
  const tCode = p.at("drawn by code"), tClaude = p.at("I am Claude"), tCrazy = p.at("go crazy"), tPoints = p.at("thirty thousand points"), tOut = p.at("what I can do");
  G3.morph(0, "s1-title", { at: [0, 2.6, 0] });                                // (start) frame 0 is the thumbnail
  G3.cam.to(0, { dist: 31.5, az: -0.06 }, { dur: 0 }).to(0.01, { dist: 34, az: 0.06 }, { dur: tCode, ease: "linear" });   // a slow drift back under the first lines
  G3.morph(tCode, "sphere", { dur: 2.2, swirl: 1.1, at: [0, 1.0, 0] });        // "drawn by code": the title flies apart into the resting globe
  G3.cam.to(tCode, { az: 0.4, el: 0.16, dist: 33 }, { dur: tClaude - tCode + 0.5 });
  G3.morph(tClaude, "s1-claude", { dur: 1.3, at: [0, 1.2, 0], swirl: 0.8 });
  G3.cam.to(tClaude, { az: 0, el: 0, dist: 34 }, { dur: 1.3 });
  G3.cam.to(tClaude + 1.3, { az: -0.08, dist: 32.5 }, { dur: tPoints - tClaude - 1.3, ease: "sine" });   // never a frozen frame: a slow drift under "I am Claude"
  G3.morph(tPoints, "sphere", { dur: 1.8, at: [0, 1.2, 0], scale: 0.9, swirl: 1.0, clock: t => t - tCode });
  G3.cam.to(tPoints, { az: -0.45, el: 0.2, dist: 31 }, { dur: tOut - tPoints + 1.5 });   // the hero move: a slow push around the globe
  G3.morph(tOut, "scatter", { dur: Math.min(2.4, p.end - 0.8 - tOut), swirl: 0.4, scale: 0.5 });                         // "what I can do": scatter, ready for scene 2
  film.hit("thock", tCode + 0.2); film.hit("chord", tClaude + 0.5); film.hit("pluck", tPoints + 1.3, { pitch: 5 }); film.hit("rise", tOut);

  // ---- the 2D layer
  const S = film.scene(p);
  const words = [["camera", 500], ["footage", 850], ["editing suite", 1230]].map(([w, x]) =>
    S.text(w, { x, y: 690, size: "body", font: "mono", color: "muted", id: "s1-no-" + w.split(" ")[0] }));
  [["no camera", "camera"], ["no footage", "footage"], ["no editing suite", "editing suite"]].forEach(([cue, w], i) => {
    words[i].show(p.at(cue)); words[i].strike(w, p.at(cue, 0.25)); film.hit("scratch", p.at(cue, 0.3));
  });
  words.forEach(w => w.hide(tCode - 0.2));
  S.text("frame = f(time)", { x: 960, y: 905, size: "body", font: "mono", align: "center", color: "ink", id: "s1-formula" }).show(tCode + 0.6).hide(tPoints - 0.3);
  const quote = S.text("\u201cgo crazy on it\u201d", { x: 960, y: 86, size: "head", align: "center", italic: true, color: "muted", id: "s1-brief" }).show(tCrazy);
  const count = S.number(0, { x: 960, y: 838, size: "title", font: "mono", align: "center", fmt: v => Math.round(v).toLocaleString("en-US"), id: "s1-count" })
    .show(tPoints, { by: "fade" }).to(tPoints, { value: G3.N }, { dur: 1.3, ease: "out" });
  const countLabel = S.text("points of light", { x: 960, y: 952, size: "label", align: "center", color: "muted", id: "s1-count-label" }).show(tPoints + 0.3);
  [count, countLabel, quote].forEach(n => n.hide(tOut - 0.1));
} });
