// gallery scene 1: what the points can be with no form file at all. G3.textForm and the three built-in forms.
(window.SCENES = window.SCENES || []).push({ n: 1, build(film, p, G3) {
  G3.form("g1-title", G3.textForm("forms3d", { width: 22, font: "mono", depth: 0.8 }));
  const tGlobe = p.at("a turning globe"), tScatter = p.at("scatter into a cloud"), tCore = p.at("one small core");
  G3.morph(0, "g1-title", { at: [0, 1.5, 0] });                                // (start) frame 0: the points spell the title
  G3.cam.to(0, { dist: 31, az: -0.08 }, { dur: 0 }).to(0.01, { dist: 34, az: 0.08 }, { dur: tGlobe, ease: "linear" });
  G3.morph(tGlobe, "globe", { dur: 1.6, swirl: 1.0, at: [0, 0.8, 0] });        // "a turning globe"
  G3.cam.to(tGlobe, { az: 0.4, el: 0.16, dist: 31 }, { dur: tScatter - tGlobe + 0.6 });
  G3.morph(tScatter, "scatter", { dur: 1.3, scale: 0.5 });                     // "scatter into a cloud" (scale 0.5 keeps it in the frame)
  G3.cam.to(tScatter, { az: 0, el: 0, dist: 34 }, { dur: 1.4 });
  G3.morph(tCore, "core", { dur: 1.2, scale: 2.2, swirl: 0.9 });               // "one small core"
  G3.cam.to(tCore, { dist: 22 }, { dur: p.end - tCore, ease: "sine" });
  film.hit("thock", tGlobe + 0.2); film.hit("rise", tScatter); film.hit("pluck", tCore + 0.9, { pitch: 3 });

  const S = film.scene(p, { fadeOut: 1.2 });
  const label = (text, from, to) => S.text(text, { x: 120, y: 900, size: "body", font: "mono", color: "ink", id: "g1-" + text.match(/[a-z]+/i)[0] }).show(from).hide(to - 0.15);
  label('G3.textForm("forms3d")', 0.4, tGlobe); label('"globe"', tGlobe + 0.3, tScatter); label('"scatter"', tScatter + 0.3, tCore); label('"core"', tCore + 0.3, p.end + 9);
} });
