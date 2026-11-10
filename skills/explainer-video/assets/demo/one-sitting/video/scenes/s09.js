// scene 9, "What next": the tally, a five-beat recap of the film's forms, and the closing question spelt by the points.
// Colour: accent is the verb being spoken, then the word "next?" in the closing question. Everything else is ink or grey.
(window.SCENES = window.SCENES || []).push({ n: 9, build(film, p, G3) {
  const { hash, smooth } = G3, SES = window.SESSION || {};

  // ---- forms
  // the held breath before the question: a dense turning ball with a thin disc of points falling in around it
  G3.form("s9-gather", (f, n) => {
    const ang = new Float32Array(n), rad = new Float32Array(n), hgt = new Float32Array(n), spd = new Float32Array(n), ball = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const j = i * 3, a = hash(i, 902) * 6.2832;
      if (hash(i, 901) < 0.62) {                                               // the ball
        const z = hash(i, 903) * 2 - 1, r = 1.7 * Math.pow(hash(i, 904), 0.5), q = Math.sqrt(1 - z * z);
        ang[i] = a; rad[i] = r * q; hgt[i] = r * z; spd[i] = 0.5; ball[i] = 1; f.size[i] = 0.45 + 0.4 * hash(i, 905);
        f.col[j] *= 0.9; f.col[j + 1] *= 0.9; f.col[j + 2] *= 0.9;
      } else {                                                                 // the disc: three thin rings, thinning outward
        const u = hash(i, 904), ring = Math.floor(hash(i, 906) * 3), r = 2.7 + ring * 1.5 + 1.1 * u * u;
        ang[i] = a; rad[i] = r; hgt[i] = (hash(i, 907) - 0.5) * 0.1; spd[i] = 1.5 / Math.sqrt(r); f.size[i] = 0.5 + 0.6 * hash(i, 905);
        const k = 0.95 - 0.16 * ring; f.col[j] *= k; f.col[j + 1] *= k; f.col[j + 2] *= k;
      }
    }
    const tilt = 0.36, ct = Math.cos(tilt), st = Math.sin(tilt);
    return (tl, f) => {
      const pull = 1 - 0.3 * smooth(0, 3.2, tl);                               // the disc draws in as the question nears
      for (let i = 0, j = 0; i < n; i++, j += 3) {
        const a = ang[i] + spd[i] * tl, r = ball[i] ? rad[i] : rad[i] * pull, x = Math.cos(a) * r, z = Math.sin(a) * r, y = hgt[i];
        f.pos[j] = x; f.pos[j + 1] = y * ct - z * st; f.pos[j + 2] = y * st + z * ct;
      }
    };
  });
  // the closing question, in warm white, with its last word in the accent
  const QL = ["What should we", "make next?"], QW = 27;
  G3.form("s9-question", (f, n) => {
    G3.textForm(QL.join("\n"), { width: QW, depth: 0.5 })(f, n);
    const c = document.createElement("canvas").getContext("2d"); c.font = G3.font(220, "display");
    const w1 = c.measureText(QL[0]).width, w2 = c.measureText(QL[1]).width, s = QW / Math.max(w1, w2);
    const xNext = (-w2 / 2 + c.measureText("make").width + c.measureText(" ").width / 2) * s;   // where "next?" begins on line two
    for (let i = 0; i < n; i++) { const hot = f.pos[i * 3 + 1] < 0 && f.pos[i * 3] > xNext; G3.tint(f, i, hot ? "accent" : "ink", (hot ? 0.8 : 0.68) + 0.32 * hash(i, 911)); }
  });

  // ---- cues
  const verbs = ["explain", "calculate", "repair", "simulate", "compose"], recap = ["clusters", "lorenz", "tests", "galaxy", "flower"];
  const t0 = p.start - 0.8, tCam = p.at("No camera"), tSit = p.at("One sitting"), tFrame = p.at("every frame");
  const tV = verbs.map(v => p.at(v)), tAsk = p.at("my question"), tWhat = p.at("What should"), tNext = p.at("make next");

  // ---- the points and the camera
  G3.level.to(t0, 1, { dur: 0.8 }); G3.grain.to(t0, 1, { dur: 0.8 });
  const LEAD = 0.3, tR = tV.map(t => t - LEAD);                                                 // a recap morph starts this long before its verb, so the form is whole on the word
  G3.cam.to(t0, { az: -0.4, el: 0.12, dist: 34, look: [0, 0, 0], fov: 40 }, { dur: 1.6 });
  G3.morph(t0, "sphere", { dur: 2.0, at: [0, 2.3, 0], scale: 0.95, swirl: 0.9 });               // "No camera": back to the resting sphere
  G3.cam.to(t0 + 1.6, { az: 0.2, el: 0.08 }, { dur: tR[0] - t0 - 1.6, ease: "sine" });          // a slow turn under the tally
  const AT = [3.1, 2.1, 0], SC = 0.82;                                                          // the recap sits right of the verb list, above the tally
  recap.forEach((name, i) => {                                                                  // one form on each verb
    G3.morph(tR[i], name, { dur: 0.45, stagger: 0.12, swirl: 0.3, at: AT, scale: SC });
    if (i % 2 === 0) film.hit("pluck", tV[i], { pitch: [0, 2, 4, 5, 7][i] });                   // explain, repair, compose: three plucks leave room for the spoken list
  });
  G3.level.to(tR[2], 0.55, { dur: 0.35 }).to(tR[3], 1, { dur: 0.35 }); G3.grain.to(tR[2], 0.75, { dur: 0.35 }).to(tR[3], 1, { dur: 0.35 });   // the test grid is 10,000 fused dots: bring it down to the brightness of its neighbours
  G3.cam.to(tR[0], { az: -0.1, el: 0.04 }, { dur: 0.5 }).to(tR[0] + 0.5, { az: 0.12, dist: 32.8 }, { dur: tAsk - tR[0] - 0.5, ease: "linear" });
  G3.morph(tAsk, "s9-gather", { dur: 1.2, at: [0, 1.3, 0], scale: 1.7, swirl: 1.0, stagger: 0.5 });         // "my question": the points gather
  G3.cam.to(tAsk, { az: 0.3, el: 0.22, dist: 29 }, { dur: tWhat - tAsk, ease: "sine" });         // push in on the held breath
  G3.morph(tWhat, "s9-question", { dur: 1.5, at: [0, 1.5, 0], swirl: 0.8, stagger: 0.5 }); G3.grain.to(tWhat, 1.2, { dur: 1.5 });      // the question is whole on "make next"
  G3.cam.to(tWhat, { az: 0, el: 0, dist: 36 }, { dur: 1.5 }).to(tWhat + 1.5, { dist: 33 }, { dur: p.end - tWhat - 1.5, ease: "sine" });   // pull back, then the last slow push in

  // ---- the 2D layer
  const S = film.scene(p, { fadeOut: 0 });                                                      // the film ends on the closing frame, held
  const cols = Stage.cols(4, { x: 120, w: 1680, gap: 40 }), fmt = v => Math.round(v).toLocaleString("en-US"), tally = [];
  const stat = (i, value, label, t, count) => {
    const num = S.number(count ? 0 : value, { x: cols[i].x, y: 812, size: "head", font: "mono", fmt, id: "s9-stat-n" + i }).show(t);
    if (count) num.to(t, { value }, { dur: 0.8, ease: "out" });
    tally.push(num, S.text(label, { x: cols[i].x, y: 904, size: "label", color: "muted", id: "s9-stat-l" + i }).show(t + 0.1));
  };
  tally.push(S.line({ from: [120, 780], to: [1800, 780], stroke: "faint", lw: 2, id: "s9-rule" }).show(tCam - 0.3, { by: "draw" }));
  stat(0, 0, "cameras", tCam);
  stat(1, 1, "sitting", tSit);
  const frames = Math.round(film.duration * film.fps);                                           // counted from the film itself, so it cannot go stale
  stat(2, SES.lines || 0, "lines written today", tFrame, true);
  stat(3, frames, "frames", tFrame + 0.15, true);
  if (!(SES.lines > 0)) film.problem("scene 9: SESSION has no lines to count");
  if (SES.placeholder) film.problem("scene 9: SESSION is a placeholder, run node tools/session.mjs");
  if (!SES.placeholder && Math.abs(SES.frames - frames) > 30) film.problem("scene 9: session.js is stale, run node tools/session.mjs again");
  tally.forEach(nd => nd.to(tR[0], { opacity: 0.6 }, { dur: 0.4 }).hide(tAsk - 0.1));          // the tally steps back while the forms are the subject

  const list = verbs.map((v, i) => S.text(v, { x: 120, y: 232 + i * 86, size: "head", font: "display", color: "accent", id: "s9-verb-" + v }).show(tV[i], { dur: 0.3 }));
  list.forEach((nd, i) => { if (i < list.length - 1) nd.to(tV[i + 1], { color: "muted" }, { dur: 0.3 }); nd.hide(tAsk - 0.1); });

  S.text("made by Claude, in one sitting", { x: 960, y: 772, size: "label", font: "mono", align: "center", color: "muted", id: "s9-credit" }).show(tNext + 0.4);
  film.hit("bell", tNext + 0.4);
  S.text("built on three.js, the explainer-video engine, Breeze TTS 2", { x: 960, y: 822, size: "note", font: "mono", align: "center", color: "muted", id: "s9-built" }).show(tNext + 1.0);
} });
