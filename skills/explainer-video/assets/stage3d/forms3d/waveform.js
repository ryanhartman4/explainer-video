// forms3d/waveform.js: the points line up as a series over time, drawn as a mirrored band (a soundtrack's loudness, a
// signal, the activity of a day). Tall where the series is high, thin where it is low. Chosen stretches take one
// colour, the rest another. The part before "now" is lit, the part after it is dim.
//   G3.form("mine", G3.lib.waveform({ peaks: WAVE.peaks, total: WAVE.total, spans: voiced, window: 20 }));
//   const wave = G3.morph(t, "mine", { clock: t => t });
//
// Options (all optional):
//   peaks ([]): the series, as numbers from 0 up, evenly spaced over `total`. Any length: about 1,500 is plenty. The
//     largest value fills the band's height. With no peaks the form draws a seeded stand-in soundtrack (a music bed
//     with bursts of speech), so a film can be built before its sound exists.
//   total (60): how long the series is. Seconds for sound, but any unit works: every time below uses the same unit.
//   spans ([]): [[a, b], ...], the stretches of the series that take the first colour, for example every spoken
//     word. Everything else takes the second colour.
//   colors (["accent", "blue"]): the colour inside the spans, and the colour of the rest.
//   base ("ink"): the colour of every point while `tint` is 0.
//   tint (1): how far the colours are on. 0 = all `base`, 1 = full colour. A pair [a, b] sets the two colours apart:
//     with [1, 0] the spans are coloured and the rest falls back, dim and neutral. Or a function tl => number or pair.
//   bed (1.5): inside a span, only the points above the "bed" take the first colour. The bed is the lowest value
//     within this long each side: for a soundtrack, the music under the voice. 0 colours the spans top to bottom.
//   window (20): how much of the series the band shows in the close view. null shows the whole series always.
//   zoom (0): 0 = the close view, 1 = the whole series end to end, values between widen the window smoothly about
//     "now". A number, or a function tl => 0..1. See "Local time".
//   nowAt (0.62): where "now" sits across the close view, 0 = left edge, 1 = right edge.
//   played (1): how strongly the part before "now" is lit and the part after it dimmed. 0 = no difference. A number,
//     or a function tl => 0..1.
//   mirror (true): false draws one side only, rising from the bottom of the box.
//   width (38), height (7.8), depth (0.4): the box the band fills, in world units.
//   Option functions must depend on tl alone. They are also sampled once, across the whole series, when the form is
//   first drawn.
//
// Local time: tl is "now", a position in the series (clamped to 0..total). By default it is the seconds since the
//   morph began, so the series plays from its start at one unit a second. To show a film its own soundtrack, make
//   local time the film's time: G3.morph(t, "mine", { clock: t => t }). To play a series of any length between two
//   cues: { clock: t => (t - tA) / (tB - tA) * build.duration }.
//   In the close view the band scrolls: the points travel left with the series while "now" stays put. At the two ends
//   of the series the window stops and "now" runs to the edge instead, so the band never shows emptiness.
//   A fixed scroll is `window: 20`. A zoom out to the whole series is a function of local time, for example
//   zoom: tl => G3.smooth(tZoom, tZoom + 1.6, tl). While it widens, every point keeps its place across the frame and
//   the series slides under it. At zoom 1, x is the series from 0 to total and "now" moves across it.
//
// For labels and markers (world positions at scale 1, before the morph's at/scale: pass them through seg.world(p, t)
// where seg is what G3.morph returned, and tl = seg.local(t)):
//   build.x(time, tl)       world x of that moment of the series at local time tl (outside the band when not in view)
//   build.at(time, tl, v)   [x, y, 0] at that moment. v = 0 is the centre line, 1 the top of the box, -1 the bottom
//   build.now(tl)           the series time of "now" (tl clamped to 0..total): build.at(build.now(tl), tl) is the dot
//   build.span(tl)          [from, to]: the stretch of the series in view
//   build.edge(time, tl)    0..1: 0 when that moment is out of view, fading near the edges of the close view.
//                           Multiply a tick's or label's alpha by it.
//   build.level(time)       0..1: the height of the series at that moment (1 = the tallest point of the band)
//   build.top, build.bottom the band's y extent (height / 2 and -height / 2); the centre line is y = 0
//   build.width, build.height, build.total, build.duration (= total)
//
// Size: fits a box 38 x 7.8 x 0.4 world units (width x height x depth), centred on the origin, facing the rest camera
//   (az 0, el 0, dist 34). At dist 30 the band spans the frame from edge to edge.
//
// Source: an amplitude envelope, mirrored about its centre line, as audio editors draw it. From scene 8 of the film
//   "One Sitting", which showed its own mix. How a real film gets its peaks: tools/wave.mjs (in every project) has ffmpeg
//   decode video/assets/audio/mix.wav to mono samples at 8 kHz, cuts them into 1,500 equal buckets, takes the RMS of
//   each, divides by the 98.5th percentile, takes the square root (so quiet passages stay visible), caps at 1, and
//   writes video/data/wave.js as window.WAVE = { total, peaks }. Load that file before the scenes and pass
//   WAVE.peaks and WAVE.total. The voiced spans are the narration's word times:
//   film.paras.flatMap(q => q.words.map(w => [q.voiceStart + w.s, q.voiceStart + w.e])).
(function () {
  const G3 = window.G3;
  G3.lib.waveform = (o = {}) => {
    const { hash, clamp, lerp, smooth } = G3;
    const total = o.total > 0 ? +o.total : 60, W = o.width ?? 38, H = o.height ?? 7.8, D = o.depth ?? 0.4;
    const win = o.window === null ? total : Math.min(total, o.window > 0 ? +o.window : 20), whole = win >= total;
    const nowAt = clamp(o.nowAt ?? 0.62), mirror = o.mirror !== false, colors = o.colors || ["accent", "blue"];
    const fn = (v, d) => (typeof v === "function" ? v : () => v ?? d), zoomF = fn(o.zoom, 0), tintF = fn(o.tint, 1), playedF = fn(o.played, 1);
    const k01 = v => clamp(+v || 0);

    // the stretch of the series in view at local time tl: { now, k (0 close .. 1 whole), span, start }
    const view = (tl, kFixed) => {
      const now = clamp(+tl || 0, 0, total), k = whole ? 1 : kFixed ?? k01(zoomF(tl)), span = whole ? total : win * Math.pow(total / win, k);
      const start0 = clamp(now - nowAt * win, 0, total - win), a = lerp((now - start0) / win, now / total, k);   // close view: the window stops at the ends of the series
      return { now, k, span, start: clamp(now - a * span, 0, total - span) };
    };

    // the series, resampled finely enough for word-length spans (built once, the first time anything needs it)
    let dat = null;
    function data() {
      if (dat) return dat;
      let pk = o.peaks, spans = o.spans;
      if (!pk || !pk.length) { const s = standIn(total, hash, clamp, smooth); pk = s.peaks; spans = spans || s.spans; }
      const nE = clamp(Math.ceil(total * 50), 2000, 60000) + 1, FS = (nE - 1) / total, env = new Float32Array(nE), mask = new Uint8Array(nE), bed = new Float32Array(nE), L = pk.length;
      let mx = 1e-6;
      for (let j = 0; j < nE; j++) { const x = j / (nE - 1) * (L - 1), a = Math.floor(x), v = lerp(Math.max(0, +pk[a] || 0), Math.max(0, +pk[Math.min(L - 1, a + 1)] || 0), x - a); env[j] = v; if (v > mx) mx = v; }
      for (let j = 0; j < nE; j++) env[j] /= mx;
      for (const s of spans || []) for (let j = Math.max(0, Math.ceil(s[0] * FS)); j <= s[1] * FS && j < nE; j++) mask[j] = 1;
      const HW = Math.round((o.bed ?? 1.5) * FS);                                // the bed: the lowest value within `bed` each side (a sliding minimum)
      if (HW > 0) { const dq = new Int32Array(nE); let hd = 0, tl = 0, r = 0;
        for (let j = 0; j < nE; j++) { const hi = Math.min(nE - 1, j + HW);
          while (r <= hi) { while (tl > hd && env[dq[tl - 1]] >= env[r]) tl--; dq[tl++] = r++; }
          while (dq[hd] < j - HW) hd++;
          bed[j] = env[dq[hd]]; } }
      return (dat = { env, mask, bed, nE, FS });
    }
    const envAt = (d, time) => { if (!(time >= 0 && time <= total)) return 0; const x = time * d.FS, a = Math.min(d.nE - 1, Math.floor(x)); return lerp(d.env[a], d.env[Math.min(d.nE - 1, a + 1)], x - a); };

    const build = (f, N) => {
      const d = data(), { env, mask, bed, nE, FS } = d;
      // how far the points have scrolled by each "now": they travel with the series while the window slides, and keep
      // their place while it widens. Summed once over the series, so update() is a lookup.
      const M = 16384, S = new Float64Array(M + 1);
      for (let j = 0; j < M; j++) { const now = j / M * total, k = whole ? 1 : k01(zoomF(now)), a = view(now, k), b = view(now + total / M, k); S[j + 1] = S[j] + (b.start - a.start) / a.span; }
      const scrollAt = now => { const x = now / total * M, a = Math.min(M - 1, Math.floor(x)); return S[a] + (S[a + 1] - S[a]) * (x - a); };
      // one point per 1/N of the window, in an order unrelated to the point's index; a third of them trace the outline
      let step = Math.max(1, Math.round(N * 4001 / 30000)); const gcd = (a, b) => (b ? gcd(b, a % b) : a); while (gcd(step, N) !== 1) step++;
      const phi = new Float32Array(N), u = new Float32Array(N), br = new Float32Array(N), sz = new Float32Array(N), dens = clamp(Math.sqrt(30000 / N), 0.6, 1.8);
      for (let i = 0; i < N; i++) {
        phi[i] = ((i * step) % N + hash(i, 851)) / N;
        u[i] = (hash(i, 853) < 0.36 ? 0.9 + 0.1 * hash(i, 854) : hash(i, 854)) * (mirror && !(i & 1) ? -1 : 1);
        br[i] = 0.72 + 0.3 * hash(i, 855); sz[i] = 0.5 * hash(i, 856) * dens; f.pos[i * 3 + 2] = (hash(i, 857) - 0.5) * D;
      }
      const INK = G3.rgb(o.base || "ink"), C0 = G3.rgb(colors[0]), C1 = G3.rgb(colors[1] ?? colors[0]), cA = [0, 0, 0], cB = [0, 0, 0];
      return (tl, f) => {
        const { now, k, span, start } = view(tl), tn = tintF(tl), ka = k01(Array.isArray(tn) ? tn[0] : tn), kb = k01(Array.isArray(tn) ? tn[1] : tn), kp = k01(playedF(tl));
        const sc = scrollAt(now), s0 = (0.8 - 0.08 * k) * dens, lit = lerp(1, 1.12, kp), dim = lerp(1, 0.36, kp), mA = lerp(0.5, 1.18, ka), mB = lerp(lerp(0.5, 0.26, ka), 0.95, kb);
        for (let c = 0; c < 3; c++) { cA[c] = lerp(INK[c], C0[c], ka) * mA; cB[c] = lerp(INK[c], C1[c], kb) * mB; }   // the rest steps back while only the spans are coloured
        const P = f.pos, C = f.col, Z = f.size, last = nE - 1;
        for (let i = 0, j = 0; i < N; i++, j += 3) {
          let sl = phi[i] - sc; sl -= Math.floor(sl);
          const time = start + sl * span, x = time * FS, a = Math.min(last, Math.floor(x)), e = env[a] + (env[Math.min(last, a + 1)] - env[a]) * (x - a), h = u[i] * e, q = Math.min(last, Math.round(x));
          const edge = k >= 1 ? 1 : lerp(smooth(0, 0.04, sl) * smooth(1, 0.96, sl), 1, k), ah = h < 0 ? -h : h;
          P[j] = (sl - 0.5) * W; P[j + 1] = mirror ? h * H * 0.5 : (ah - 0.5) * H; Z[i] = s0 + sz[i];
          const col = mask[q] === 1 && ah > bed[q] ? cA : cB, m = br[i] * edge * (time <= now ? lit : dim);   // first colour: inside a span and above the bed
          C[j] = col[0] * m; C[j + 1] = col[1] * m; C[j + 2] = col[2] * m;
        }
      };
    };

    // ---- anchors for a film's own dot, ticks and labels
    build.x = (time, tl) => { const v = view(tl); return ((time - v.start) / v.span - 0.5) * W; };
    build.at = (time, tl, v = 0) => [build.x(time, tl), v * H * 0.5, 0];
    build.now = tl => clamp(+tl || 0, 0, total);
    build.span = tl => { const v = view(tl); return [v.start, v.start + v.span]; };
    build.edge = (time, tl) => { const v = view(tl), sl = (time - v.start) / v.span; return sl < 0 || sl > 1 ? 0 : v.k >= 1 ? 1 : lerp(smooth(0, 0.04, sl) * smooth(1, 0.96, sl), 1, v.k); };
    build.level = time => envAt(data(), time);
    build.top = H / 2; build.bottom = -H / 2; build.width = W; build.height = H; build.total = build.duration = total;
    return build;
  };

  // a seeded stand-in soundtrack for a form given no peaks: a music bed with a beat, and phrases of spoken words with
  // short and long pauses between them. Past ten minutes it stretches, so the phrases stay visible.
  function standIn(total, hash, clamp, smooth) {
    const n = 1500, fs = n / total, un = Math.max(1, total / 600), v = new Float32Array(n), peaks = new Array(n), spans = [], end = total - 2.5 * un;
    let t = 1.2 * un, wi = 0;
    for (let ph = 0; t < end; ph++) {
      const from = t, words = 3 + Math.floor(hash(ph, 861) * 7);
      for (let q = 0; q < words && t < end; q++, wi++) {
        const s = t, e = t + (0.22 + 0.3 * hash(wi, 862)) * un, A = (0.42 + 0.58 * hash(wi, 841)) * (0.8 + 0.2 * Math.sin(s / un * 0.37)), syl = 1 + Math.floor(hash(wi, 842) * 2.6);
        for (let j = Math.max(0, Math.ceil(s * fs)); j <= e * fs && j < n; j++) { const x = clamp((j / fs - s) / (e - s)); v[j] = A * (0.35 + 0.65 * Math.abs(Math.sin(Math.PI * x * syl))) * (0.72 + 0.28 * hash(j, 843)) * Math.pow(Math.sin(Math.PI * x), 0.35); }
        t = e;
      }
      spans.push([from, t]); t += (hash(ph, 863) < 0.22 ? 2.2 + 1.6 * hash(ph, 864) : 0.35 + 0.5 * hash(ph, 864)) * un;
    }
    for (let j = 0; j < n; j++) { const x = (j + 0.5) / fs, y = x / un, beat = Math.pow(Math.abs(Math.cos(Math.PI * y * 1.2)), 10);
      peaks[j] = (0.13 + 0.04 * Math.sin(y * 0.21) + 0.035 * Math.sin(y * 1.7 + 1) + 0.07 * beat) * smooth(0, 1.2 * un, x) * smooth(total, total - 2.5 * un, x) + 0.8 * v[j]; }
    return { peaks, spans };
  }
})();
