// Faultline explainer: helpers shared by every scene. Load after gsap, data/timing.js and data/data*.js.
// Times are seconds from the scene's own start, which is what a sub-composition's timeline uses.
(function () {
  const norm = w => w.toLowerCase().replace(/[^a-z0-9']/g, "");
  const K = (window.K = {});

  K.scene = n => window.TIMING.scenes.find(s => s.n === n);
  K.dur = n => K.scene(n).dur;
  K.speechEnd = n => K.scene(n).lead + K.scene(n).speech;

  // when the occ-th time `word` is spoken in scene n (+ offset). A miss is logged and falls back to the lead-in.
  function find(n, word, occ) {
    const s = K.scene(n), target = norm(word);
    let k = 0;
    for (const w of s.words) if (norm(w.w) === target && ++k === occ) return w;
    const msg = `missing cue s${n}: "${word}" #${occ}`;
    (window.__missingCues = window.__missingCues || []).push(msg);
    console.error(msg);
    // shown in red on the frame so a snapshot catches it
    const root = document.getElementById("film-root") || document.querySelector('[data-composition-id="s' + String(n).padStart(2, "0") + '"]');
    if (root) K.el("div", { text: msg, style: "position:absolute;left:24px;bottom:24px;z-index:99;font:600 24px var(--mono);color:#ff3b30" }, root);
    return null;
  }
  K.cue = (n, word, occ = 1, offset = 0) => { const w = find(n, word, occ); return K.scene(n).lead + (w ? w.s : 0) + offset; };
  K.cueEnd = (n, word, occ = 1, offset = 0) => { const w = find(n, word, occ); return K.scene(n).lead + (w ? w.e : 0) + offset; };
  // (film 5) a continuous film is one composition over all paragraphs (tools/build_continuous.mjs): cues on the root clock
  K.at = (n, word, occ = 1, offset = 0) => K.scene(n).start + K.cue(n, word, occ, offset);
  K.atEnd = (n, word, occ = 1, offset = 0) => K.scene(n).start + K.cueEnd(n, word, occ, offset);
  K.vo = n => K.scene(n).vo;                              // root time paragraph n's voice starts (on a beat)
  // (film 5) a sound hit at root time t: call it where the visual event is scheduled; tools/hits.mjs reads window.__hits and
  // tools/make_hits.py synthesizes them sample-exact, so sound and picture share one clock. opts: { gain, pitch }
  K.hit = (kind, t, opts = {}) => { (window.__hits = window.__hits || []).push({ kind, t: +t.toFixed(4), ...opts }); return t; };

  // (film 5) motion numbers, in frames at 60 fps (one frame 16.7 ms). DESIGN.md's directed prompt names them.
  K.FPS = 60;
  K.f = n => n / K.FPS;
  K.M = {
    enter: "power3.out", exit: "power2.in", cross: "power2.inOut", lin: "none",   // exits shorter than entrances; linear only for progress
    enterDur: K.f(24), exitDur: K.f(16), crossDur: K.f(45),                     // 400 ms, 267 ms, 750 ms
    stagger: K.f(3), hold: K.f(8),                                              // grouped elements 2-4 frames apart; text still 8 frames before it moves
    lag: K.f(9), reach: 0.6,                                                    // secondary moves: 6-12 frames late, 50-70% as far
  };
  // (film 5) the beat grid: 72 BPM (make_music.py) at 60 fps is exactly 50 frames a beat, 200 a bar. From absolute time, never summed.
  K.BPM = 72;
  K.beat = i => (i * 60) / K.BPM;                         // root seconds of beat i (fractions allowed: 0.5 = an eighth)
  K.bar = i => K.beat(4 * i);
  // a root time snapped to the grid: div 2 = eighth notes (moves a cue at most 0.21 s); dir 0 nearest, 1 next, -1 previous
  K.snap = (t, div = 2, dir = 0) => {
    const q = (t * K.BPM * div) / 60, i = dir > 0 ? Math.ceil(q - 1e-6) : dir < 0 ? Math.floor(q + 1e-6) : Math.round(q);
    return (i * 60) / (K.BPM * div);
  };

  // seeded randomness (no Math.random in a render)
  K.rng = seed => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const NS = "http://www.w3.org/2000/svg";
  K.svg = (tag, attrs = {}, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) k === "text" ? (el.textContent = v) : el.setAttribute(k, v);
    if (parent) parent.appendChild(el);
    return el;
  };
  K.el = (tag, attrs = {}, parent) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) k === "text" ? (el.textContent = v) : k === "html" ? (el.innerHTML = v) : el.setAttribute(k, v);
    if (parent) parent.appendChild(el);
    return el;
  };

  // stroke draws itself on, 3Blue1Brown style
  K.drawOn = (tl, el, at, dur = 1, ease = "power2.inOut") => {
    const len = el.getTotalLength();
    el.style.strokeDasharray = `${len} ${len}`;
    el.style.strokeDashoffset = len;
    return tl.fromTo(el, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: dur, ease, immediateRender: false }, at);
  };

  // a canvas (or any imperative picture) whose look is a pure function of `state`; tweens move state keys and the
  // timeline's onUpdate redraws, so any seek order gives the same frame. State keys must not share a name with a
  // GSAP tween option (snap, ease, delay, stagger, repeat, yoyo, ...): GSAP reads those as options, not values.
  K.driver = (tl, state, draw) => {
    // (film 5) several drivers on one timeline share one onUpdate; draw(state, t) also gets the time for ambient motion
    const list = (tl.__draws = tl.__draws || []);
    list.push(() => draw(state, tl.time()));
    if (list.length === 1) tl.eventCallback("onUpdate", () => list.forEach(d => d()));
    draw(state, 0);
    return (key, at, dur, to = 1, ease = "none", from = 0) =>
      tl.fromTo(state, { [key]: from }, { [key]: to, duration: dur, ease, immediateRender: false }, at);
  };
  K.canvas = (parent, w, h, style = "") => {
    const c = K.el("canvas", { width: w, height: h, style }, parent);
    return c.getContext("2d");
  };

  // the corner strip naming this part's proposer and verifier
  K.strip = (parent, proposer, verifier) => {
    const s = K.el("div", { class: "strip" }, parent);
    s.innerHTML = `<span class="role"><span class="dot" style="background:var(--blue)"></span>proposer <b>${proposer}</b></span>` +
      `<span class="role"><span class="dot" style="background:var(--green)"></span>verifier <b>${verifier}</b></span>`;
    return s;
  };

  // scene change: each scene's opaque root fades in over the previous one (index.html overlaps scenes by 0.8 s)
  K.enter = (tl, n, dur = 0.8) => {
    const root = document.querySelector('[data-composition-id="s' + String(n).padStart(2, "0") + '"]');
    return tl.from(root, { opacity: 0, duration: dur, ease: "sine.inOut" }, 0);
  };

  // Model output (or any quoted text), set word by word: K.words(el, text, hl) fills el with one span per word
  // (words whose letters match an entry of hl get the .hl class) and returns the spans; K.typeIn reveals them over
  // [at, at+dur], e.g. from K.cue(N, firstWord) to K.cueEnd(N, lastWord) so the text types in time with the voice.
  K.words = (el, text, hl = []) => {
    const keys = hl.map(norm);
    el.textContent = "";
    return text.split(/\s+/).map((w, i, all) =>
      K.el("span", { text: w + (i < all.length - 1 ? " " : ""), class: keys.includes(norm(w)) ? "hl" : "" }, el));
  };
  K.typeIn = (tl, spans, at, dur, ease = "none") =>
    tl.from(spans, { opacity: 0, duration: 0.18, ease: "power1.out", stagger: { each: Math.max(0.02, (dur - 0.18) / Math.max(1, spans.length - 1)), ease } }, at);

  // the three roles, drawn the same way everywhere: proposer = a die (blue), verifier = a check (green),
  // map = a grid with shaded cells (purple). Returns an <svg> of `size` px.
  K.glyph = (kind, parent, size = 120) => {
    const s = K.svg("svg", { width: size, height: size, viewBox: "0 0 100 100", class: `glyph glyph-${kind}` }, parent);
    const line = { fill: "none", "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" };
    if (kind === "proposer") {
      K.svg("rect", { x: 14, y: 14, width: 72, height: 72, rx: 14, stroke: "var(--blue)", ...line }, s);
      for (const [x, y] of [[33, 33], [67, 33], [50, 50], [33, 67], [67, 67]]) K.svg("circle", { cx: x, cy: y, r: 6, fill: "var(--blue)" }, s);
    } else if (kind === "verifier") {
      K.svg("circle", { cx: 50, cy: 50, r: 38, stroke: "var(--green)", ...line }, s);
      K.svg("path", { d: "M31 51 L45 65 L70 37", stroke: "var(--green)", ...line, "stroke-width": 6 }, s);
    } else if (kind === "map") {
      const shade = [0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0];
      for (let i = 0; i < 16; i++) {
        const x = 14 + (i % 4) * 18, y = 14 + ((i / 4) | 0) * 18;
        K.svg("rect", { x: x + 1.5, y: y + 1.5, width: 15, height: 15, rx: 2, fill: shade[i] ? "var(--purple)" : "none", "fill-opacity": shade[i] ? 0.55 : 0, stroke: "var(--purple)", "stroke-width": 1.5 }, s);
      }
    }
    return s;
  };

  // a vocabulary token as a chip; a leading space shows as a muted "·" so " alien" and "alien" read apart.
  // gloss (optional) puts a small English note under a CJK token. CJK renders through the system font fallback.
  K.tok = (parent, tok, opts = {}) => {
    const t = K.el("span", { class: "tok" + (opts.cls ? " " + opts.cls : "") }, parent), row = K.el("span", { class: "row" }, t);
    if (tok.startsWith(" ")) K.el("span", { class: "sp", text: "·" }, row);
    K.el("span", { text: tok.replace(/^ /, "") }, row);
    if (opts.gloss) K.el("span", { class: "gloss", text: opts.gloss }, t);
    return t;
  };

  K.tex = (el, src, opts = {}) => window.katex.render(src, el, { throwOnError: false, ...opts });
  K.clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  K.lerp = (a, b, t) => a + (b - a) * t;
  K.ease = { inOut: p => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2), out: p => 1 - Math.pow(1 - p, 3) };
})();
