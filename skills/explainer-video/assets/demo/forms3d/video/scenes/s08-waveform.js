// gallery scene 8 (waveform): G3.lib.waveform. A stand-in soundtrack scrolls past in a 20-second window, takes its two
// colours on their words, gets a "now" dot, then the form zooms out to the whole series with the dot still on it.
// This film has no mix to show, so the series is example data, seeded and built here, and marked as such on screen.
(window.SCENES = window.SCENES || []).push({ n: 8, build(film, p, G3) {
  const { hash, clamp, smooth } = G3;

  // ---- example data: 72 seconds of "soundtrack" in 1,500 buckets, the shape tools/wave.mjs writes for a real mix.
  // A music bed with a beat, plus a burst for every spoken word; `spans` are the phrases, as [from, to] in seconds.
  const TOTAL = 72, NB = 1500, peaks = new Array(NB), spans = [];
  { const fs = NB / TOTAL, v = new Float32Array(NB); let t = 0.9, wi = 0;
    for (let ph = 0; t < TOTAL - 3; ph++) {
      const from = t, words = 3 + Math.floor(hash(ph, 881) * 6);
      for (let q = 0; q < words && t < TOTAL - 3; q++, wi++) {
        const s = t, e = t + 0.2 + 0.32 * hash(wi, 882), A = (0.45 + 0.55 * hash(wi, 883)) * (0.82 + 0.18 * Math.sin(s * 0.41)), syl = 1 + Math.floor(hash(wi, 884) * 2.6);
        for (let j = Math.ceil(s * fs); j <= e * fs && j < NB; j++) { const x = clamp((j / fs - s) / (e - s)); v[j] = A * (0.35 + 0.65 * Math.abs(Math.sin(Math.PI * x * syl))) * (0.74 + 0.26 * hash(j, 885)) * Math.pow(Math.sin(Math.PI * x), 0.35); }
        t = e;
      }
      spans.push([from, t]); t += hash(ph, 886) < 0.28 ? 1.9 + 1.5 * hash(ph, 887) : 0.3 + 0.45 * hash(ph, 887);   // now and then a longer rest: music alone
    }
    for (let j = 0; j < NB; j++) { const x = (j + 0.5) / fs, beat = Math.pow(Math.abs(Math.cos(Math.PI * x * 1.5)), 10);
      peaks[j] = (0.14 + 0.045 * Math.sin(x * 0.23) + 0.035 * Math.sin(x * 1.9 + 1) + 0.07 * beat) * smooth(0, 1.2, x) * smooth(TOTAL, TOTAL - 2.5, x) + 0.8 * v[j]; } }

  // ---- cues, and the series' own clock: "now" is 27 s into the example when the points arrive, and runs in real time
  const t0 = p.start - 0.8, tVoice = p.at("marks the voice"), tMusic = p.at("another the music"), tDot = p.at("a dot marks now"), tZoom = p.at("marks now");
  const NOW0 = 27, now = t => NOW0 + (t - t0), filmTime = tl => t0 + (tl - NOW0);
  const kVoice = film.value(0).to(tVoice, 1, { dur: 0.7 }), kMusic = film.value(0).to(tMusic, 1, { dur: 0.7 });
  const kNow = film.value(0).to(tDot, 1, { dur: 0.5, ease: "out" }), kZoom = film.value(0).to(tZoom, 1, { dur: 1.7, ease: "inOut" }), kTicks = film.value(0).to(t0 + 1.5, 1, { dur: 0.6 });

  // ---- the form: every option that changes is a function of the form's local time
  const wave = G3.lib.waveform({ peaks, total: TOTAL, spans, colors: ["accent", "blue"], window: 20,
    tint: tl => [kVoice.at(filmTime(tl)), kMusic.at(filmTime(tl))],              // neutral, then the voice, then the music
    played: tl => kNow.at(filmTime(tl)),                                         // what has played is lit once the dot is there
    zoom: tl => kZoom.at(filmTime(tl)) });                                       // 20 seconds, then the whole series
  G3.form("g8-wave", wave);
  const seg = G3.morph(t0, "g8-wave", { at: [0, 1.1, 0], swirl: 0.5, stagger: 0.3, clock: now });   // "The waveform lines the points up"
  G3.level.to(t0, 1, { dur: 0.8 }); G3.grain.to(t0, 1, { dur: 0.8 });
  G3.cam.to(t0, { az: 0, el: 0, dist: 30, look: [0, 0, 0], fov: 40 }, { dur: 1.6 });
  G3.cam.to(tZoom, { dist: 34 }, { dur: 2.1 });                                  // the hero move: the form widens to the whole series and the camera pulls back
  film.hit("thock", t0 + 1.4); film.hit("pop", tDot + 0.05);

  // ---- the 2D layer
  const S = film.scene(p, { fadeOut: 1.2 });
  S.hud.text("Waveform", { x: 120, y: 96, size: "head", id: "g8-head" }).show(p.start + 0.3);
  S.hud.text("example data", { x: 120, y: 184, size: "note", font: "mono", color: "muted", id: "g8-example" }).show(p.start + 0.5);
  S.text("voice (the spans)", { x: 120, y: 776, size: "label", color: "accent", id: "g8-voice" }).show(tVoice + 0.1);   // "One colour marks the voice"
  S.text("music (the rest)", { x: 120, y: 832, size: "label", color: "blue", id: "g8-music" }).show(tMusic + 0.1);       // "another the music"
  S.hud.text("G3.lib.waveform({ peaks, total, spans, window: 20, zoom })", { x: 120, y: 900, size: "body", font: "mono", id: "g8-call" }).show(p.start + 0.6);

  // ticks and the "now" dot are the film's own drawing, placed with the form's anchors
  const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  G3.overlay(S, (ctx, t) => {
    const tl = seg.local(t), kt = kTicks.at(t), kz = kZoom.at(t), kn = kNow.at(t), at = (time, y) => seg.world([wave.x(time, tl), y, 0], t);
    if (kt > 0.003) for (let s = 0; s <= TOTAL; s++) {                           // a tick a second and a time every five in the close view, every ten in the whole
      const major = s % 5 === 0, a = kt * wave.edge(s, tl) * (s % 10 === 0 ? 1 : 1 - kz); if (a <= 0.003) continue;
      G3.line3(ctx, t, at(s, wave.bottom - 0.25), at(s, wave.bottom - (major ? 0.6 : 0.42)), { color: "muted", lw: 2, alpha: a * (major ? 0.8 : 0.45) });
      if (major) G3.text3(ctx, t, mmss(s), at(s, wave.bottom - 0.6), { size: 26, color: "muted", dy: 24, alpha: a, font: "mono" });
    }
    if (kn > 0.003) {                                                            // "a dot marks now": it stays put while the band scrolls, and moves once the whole series shows
      const n = wave.now(tl), c = at(n, 0);
      G3.line3(ctx, t, at(n, wave.bottom - 0.1), at(n, (wave.top + 0.35) * kn), { color: "ink", lw: 2, alpha: 0.85 * kn });
      G3.dot3(ctx, t, c, { color: "bg", r: 13, alpha: kn }); G3.dot3(ctx, t, c, { color: "ink", r: 8 * kn + 1, alpha: kn });
      G3.dot3(ctx, t, c, { color: "ink", ring: true, r: 13 + 9 * (1 - kn), lw: 2, alpha: kn });
      G3.text3(ctx, t, `now ${mmss(n)}.${Math.floor(n * 10) % 10}`, at(n, wave.top + 0.35), { size: 34, color: "ink", dy: -30, alpha: smooth(0.5, 1, kn), font: "mono" });
    }
  }, { id: "g8-overlay" });
} });
