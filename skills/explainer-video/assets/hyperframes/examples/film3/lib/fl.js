// Steering explainer (film 3, after the neuron-explorer explainer): helpers shared by every scene.
// Load after gsap, data/timing.js and data/data.js.
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
    const root = document.querySelector(`[data-composition-id="s${String(n).padStart(2, "0")}"]`);
    if (root) K.el("div", { text: msg, style: "position:absolute;left:24px;bottom:24px;z-index:99;font:600 24px var(--mono);color:#ff3b30" }, root);
    return null;
  }
  K.cue = (n, word, occ = 1, offset = 0) => { const w = find(n, word, occ); return K.scene(n).lead + (w ? w.s : 0) + offset; };
  K.cueEnd = (n, word, occ = 1, offset = 0) => { const w = find(n, word, occ); return K.scene(n).lead + (w ? w.e : 0) + offset; };

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
    tl.eventCallback("onUpdate", () => draw(state));
    draw(state);
    return (key, at, dur, to = 1, ease = "none", from = 0) =>
      tl.fromTo(state, { [key]: from }, { [key]: to, duration: dur, ease, immediateRender: false }, at);
  };
  K.canvas = (parent, w, h, style = "") => {
    const c = K.el("canvas", { width: w, height: h, style }, parent);
    return c.getContext("2d");
  };

  // scene change: each scene's opaque root fades in over the previous one (index.html overlaps scenes by 0.8 s)
  K.enter = (tl, n, dur = 0.8) => {
    const root = document.querySelector(`[data-composition-id="s${String(n).padStart(2, "0")}"]`);
    return tl.from(root, { opacity: 0, duration: dur, ease: "sine.inOut" }, 0);
  };

  // Model output, set word by word in mono: K.words(el, text, hl) fills el with one span per word (words whose
  // letters match an entry of hl get the .hl class) and returns the spans; K.typeIn reveals them over [at, at+dur].
  K.words = (el, text, hl = []) => {
    const keys = hl.map(norm);
    el.textContent = "";
    return text.split(/\s+/).map((w, i, all) => {
      const s = K.el("span", { text: w + (i < all.length - 1 ? " " : ""), class: keys.includes(norm(w)) ? "hl" : "" }, el);
      return s;
    });
  };
  K.typeIn = (tl, spans, at, dur, ease = "none") =>
    tl.from(spans, { opacity: 0, duration: 0.18, ease: "power1.out", stagger: { each: Math.max(0.02, (dur - 0.18) / Math.max(1, spans.length - 1)), ease } }, at);

  // ---------- the model as a stack of neuron sheets ----------
  // Qwen3.5-4B: 32 layers, each MLP a 96 x 96 sheet of neurons. A sheet is drawn as a parallelogram: point (col, row)
  // of layer l sits at O_l + (col/96) U + (row/96) V. Edge-on, the 32 sheets stand in a row left to right (layer 0 at
  // the left); `focus` lifts one layer out and turns it face-on. Dots are a cached texture, so a frame costs 32
  // drawImage calls. All look is a function of the options, so it works inside K.driver.
  const SIDE = 96, CELL = 4, TEX = SIDE * CELL;
  const textures = {};
  function texture(rgb, seed) {
    const key = rgb.join(",") + "/" + seed;
    if (textures[key]) return textures[key];
    const c = document.createElement("canvas"); c.width = c.height = TEX;
    const g = c.getContext("2d"), r = K.rng(seed);
    for (let y = 0; y < SIDE; y++) for (let x = 0; x < SIDE; x++) {
      const a = 0.35 + 0.65 * Math.pow(r(), 2.2);
      g.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a.toFixed(3)})`;
      g.fillRect(x * CELL + 1, y * CELL + 1, 2, 2);
    }
    return (textures[key] = c);
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

  // default geometry for a 1920 x 1080 frame; override any field
  K.STACK = {
    x0: 300, y0: 330, dx: 41, dy: 0,           // layer 0's top-left corner, step per layer
    U: [32, -66], V: [0, 380],                 // edge-on basis: columns recede up-right, rows run down
    faceO: [740, 250], faceU: [440, 0], faceV: [0, 440],   // where the focused layer lands, face-on
    rgb: [88, 196, 221],                       // --blue
  };

  // o: { reveal 0..1 (layers appear left to right), alpha, focusLayer, focus 0..1, dim 0..1 (others fade while focused),
  //      frames 0..1 (outline each sheet, full-attention layers brighter), labels 0..1, glow: [{l,row,col,amt,rgb}],
//      rings: [{l,row,col,amt,color}] (hollow ring: a zeroed neuron), links: [{a:{l,row,col}, b:{l,row,col}, amt 0..1, lift}],
//      keep: [layers not dimmed by dim], layers: [draw only these layers] }
  K.stack = (ctx, o) => {
    const G = Object.assign({}, K.STACK, o.geo || {});
    const L = 32, reveal = o.reveal ?? 1, alpha = o.alpha ?? 1, F = o.focusLayer ?? -1, f = o.focus || 0, dim = o.dim || 0;
    const tex = texture(G.rgb, 11);
    const basis = l => {
      let O = [G.x0 + l * G.dx, G.y0 + l * G.dy], U = G.U, V = G.V;
      if (l === F && f > 0) { O = lerp2(O, G.faceO, f); U = lerp2(U, G.faceU, f); V = lerp2(V, G.faceV, f); }
      return { O, U, V };
    };
    const at = (b, col, row) => [b.O[0] + (col / SIDE) * b.U[0] + (row / SIDE) * b.V[0], b.O[1] + (col / SIDE) * b.U[1] + (row / SIDE) * b.V[1]];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const only = o.layers ? new Set(o.layers) : null, keep = new Set(o.keep || []);
    const order = [...Array(L).keys()].filter(l => l !== F && (!only || only.has(l))).concat(F >= 0 ? [F] : []);
    for (const l of order) {
      const show = K.clamp(reveal * (L + 6) - l, 0, 6) / 6;     // a soft wave left to right
      if (show <= 0) continue;
      const b = basis(l);
      let a = alpha * show * (l === F || keep.has(l) ? 1 : 1 - 0.8 * dim);
      ctx.globalAlpha = Math.min(1, a);
      ctx.setTransform(b.U[0] / TEX, b.U[1] / TEX, b.V[0] / TEX, b.V[1] / TEX, b.O[0], b.O[1]);
      ctx.drawImage(tex, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const fr = Math.max(o.frames || 0, o.edges ?? 0.35);
      if (fr > 0) {
        const full = l % 4 === 3 && (o.frames || 0) > 0;
        ctx.globalAlpha = a * fr * (full ? 0.9 : 0.4);
        ctx.strokeStyle = full ? "#ece6d8" : "#58c4dd";
        ctx.lineWidth = full ? 2 : 1;
        const p = [at(b, 0, 0), at(b, SIDE, 0), at(b, SIDE, SIDE), at(b, 0, SIDE)];
        ctx.beginPath(); p.forEach((q, i) => (i ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.closePath(); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "source-over";
    if (o.labels > 0) {
      ctx.font = "300 22px 'Plex Mono'"; ctx.fillStyle = "#8a909b"; ctx.textAlign = "center";
      for (const l of o.labelLayers || [0, 31]) {
        const b = basis(l), p = at(b, SIDE / 2, SIDE);
        ctx.globalAlpha = o.labels * (l === F ? 1 - f : 1 - dim);
        ctx.fillText(`L${l}`, p[0], p[1] + 34);
      }
    }
    for (const g of o.glow || []) {
      if (!(g.amt > 0)) continue;
      const p = at(basis(g.l), g.col + 0.5, g.row + 0.5), rgb = g.rgb || [247, 217, 111];
      const R = 10 + 26 * g.amt;
      const grad = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], R);
      grad.addColorStop(0, `rgba(${rgb},${0.95 * Math.min(1, g.amt)})`);
      grad.addColorStop(0.25, `rgba(${rgb},${0.5 * Math.min(1, g.amt)})`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      ctx.globalAlpha = 1; ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(p[0], p[1], R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgb(${rgb})`; ctx.beginPath(); ctx.arc(p[0], p[1], 3.2, 0, Math.PI * 2); ctx.fill();
    }
    for (const g of o.rings || []) {                                     // a zeroed neuron: a hollow ring in ink
      if (!(g.amt > 0)) continue;
      const p = at(basis(g.l), g.col + 0.5, g.row + 0.5);
      ctx.globalAlpha = Math.min(1, g.amt); ctx.strokeStyle = g.color || "#ece6d8"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(p[0], p[1], 11, 0, Math.PI * 2); ctx.stroke();
    }
    for (const k of o.links || []) {                                     // a weight link, drawn on from a to b
      if (!(k.amt > 0)) continue;
      const p = at(basis(k.a.l), k.a.col + 0.5, k.a.row + 0.5), q = at(basis(k.b.l), k.b.col + 0.5, k.b.row + 0.5);
      const t = Math.min(1, k.amt), lift = k.lift ?? 120;
      const mx = (p[0] + q[0]) / 2, my = Math.min(p[1], q[1]) - lift;      // a quadratic arc above the sheets
      ctx.globalAlpha = k.alpha ?? 1; ctx.strokeStyle = "#b48fc4"; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(p[0], p[1]);
      const N = 40;
      for (let i = 1; i <= Math.round(N * t); i++) {
        const u = i / N;
        ctx.lineTo((1 - u) * (1 - u) * p[0] + 2 * (1 - u) * u * mx + u * u * q[0], (1 - u) * (1 - u) * p[1] + 2 * (1 - u) * u * my + u * u * q[1]);
      }
      ctx.stroke();
    }
    ctx.restore();
    return { point: (l, col, row) => at(basis(l), col, row) };
  };

  // a vocabulary token as a chip; a leading space is shown as a muted "·" so " alien" and "alien" read apart.
  // gloss (optional) adds a small English note under CJK tokens. Returns the chip element.
  K.tok = (parent, tok, opts = {}) => {
    const t = K.el("span", { class: "tok" + (opts.cls ? " " + opts.cls : "") }, parent), row = K.el("span", { class: "row" }, t);
    if (tok.startsWith(" ")) K.el("span", { class: "sp", text: "·" }, row);
    K.el("span", { text: tok.replace(/^ /, "") }, row);
    if (opts.gloss) K.el("span", { class: "gloss", text: opts.gloss }, t);
    return t;
  };

  // ---------- film 3: cards, code, terminal, batch rows ----------
  // an answer card (film 2's): o = { id, x, y, w, h (min height), src, rand, meta, body, hl, cls }; positioned
  // absolutely when x is given. .csrc names what was pushed (blue neuron, grey random/control); .hl words lit yellow.
  K.card = (parent, o) => {
    const pos = o.x != null ? `position:absolute;left:${o.x}px;top:${o.y}px;` : "";
    const el = K.el("div", { class: "card" + (o.cls ? " " + o.cls : ""), id: o.id || "", style: `${pos}${o.w ? `width:${o.w}px;` : ""}${o.h ? `min-height:${o.h}px;` : ""}` }, parent);
    const head = K.el("div", { class: "chead" }, el);
    K.el("span", { class: "csrc" + (o.rand ? " rand" : ""), text: o.src || "" }, head);
    K.el("span", { class: "cmeta", text: o.meta || "" }, head);
    const body = K.el("div", { class: "cbody" }, el);
    const spans = K.words(body, o.body, o.hl || []);
    return { el, head, body, spans, hl: spans.filter(s => s.classList.contains("hl")) };
  };

  // Python, nearly monochrome: keywords at weight 600, comments and strings muted (DESIGN.md "Code panels")
  const KW = new Set("def return if else elif for in not is and or None True False with as import from class lambda while yield assert try except raise pass".split(" "));
  const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  K.py = line => {
    let out = "", i = 0;
    const re = /(#.*$)|([rbfu]{0,2}"(?:[^"\\]|\\.)*"|[rbfu]{0,2}'(?:[^'\\]|\\.)*')|([A-Za-z_][A-Za-z0-9_]*)|(\s+|.)/gy;
    let m;
    while (i < line.length && (m = re.exec(line))) {
      if (m[1]) out += `<span class="c-com">${esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="c-str">${esc(m[2])}</span>`;
      else if (m[3]) out += KW.has(m[3]) ? `<span class="c-kw">${m[3]}</span>` : m[3];
      else out += esc(m[4]);
      i = re.lastIndex;
    }
    return out;
  };
  // a code panel from an SX.code excerpt ({file, a, b, lines:[{n,t}]}; n null = an elision "…").
  // opts: { x, y, w, size (px, default 26), label (default "file:a–b"), only: [line numbers to keep] }.
  // Returns { el, line(n), bar(n) }; light a line with K.hl. Nothing wraps; pick size/w so the longest line fits.
  K.code = (parent, ex, opts = {}) => {
    const pos = opts.x != null ? `position:absolute;left:${opts.x}px;top:${opts.y}px;` : "";
    const el = K.el("div", { class: "code", id: opts.id || "", style: `${pos}${opts.w ? `width:${opts.w}px;` : ""}--code-size:${opts.size || 26}px;` }, parent);
    K.el("div", { class: "code-label", text: opts.label || `${ex.file}:${ex.a}${ex.b > ex.a ? "–" + ex.b : ""}` }, el);
    const body = K.el("div", { class: "code-body" }, el), lines = {}, bars = {}, srcs = {}, raw = {};
    const cut = opts.dedent || 0;
    let shown = ex.lines.filter(L => L.n == null || !opts.only || opts.only.includes(L.n));
    // never elide silently: a "…" row goes wherever shown line numbers jump and no "…" row is already there
    shown = shown.reduce((acc, L) => {
      const prev = acc[acc.length - 1];
      if (prev && prev.n != null && L.n != null && L.n > prev.n + 1) acc.push({ n: null, t: "…" });
      if (!(prev && prev.n == null && L.n == null)) acc.push(L);
      return acc;
    }, []);
    for (const L of shown) {
      const row = K.el("div", { class: "code-line" }, body);
      const bar = K.el("span", { class: "code-bar" }, row);
      K.el("span", { class: "code-no", text: L.n == null ? "" : String(L.n) }, row);
      const t = L.n == null ? L.t : L.t.slice(Math.min(cut, L.t.length - L.t.trimStart().length));
      const src = K.el("span", { class: "code-src", html: L.n == null ? `<span class="c-com">${esc(t)}</span>` : K.py(t) || " " }, row);
      if (L.n != null) { lines[L.n] = row; bars[L.n] = bar; srcs[L.n] = src; raw[L.n] = t; }
    }
    return { el, body, line: n => lines[n], bar: n => bars[n], src: n => srcs[n], raw: n => raw[n] };
  };
  // K.mark(code, n, substr): wrap the first `substr` in line n in a mark (returns the span); K.markOn lights it
  K.mark = (code, n, substr) => {
    const t = code.raw(n), i = t.indexOf(substr);
    if (i < 0) { console.error(`K.mark: "${substr}" not in line ${n}`); return null; }
    code.src(n).innerHTML = K.py(t.slice(0, i)) + `<span class="code-mark">${K.py(substr)}</span>` + K.py(t.slice(i + substr.length));
    return code.src(n).querySelector(".code-mark");
  };
  K.markOn = (tl, span, at, dur = 0.45) => tl.to(span, { backgroundColor: "rgba(247,217,111,0.26)", color: "#f7d96f", duration: dur, ease: "power2.out" }, at);

  // model text helpers: plain (no markdown bold or backticks), first sentence, first n words + "…"
  K.plain = t => t.replace(/\*\*/g, "").replace(/`/g, "");
  K.first = t => { const m = K.plain(t).match(/^[\s\S]*?[.?!](?=\s|$)/); return (m ? m[0] : K.plain(t)).replace(/\s+/g, " ").trim(); };
  K.clip = (t, n) => { const w = t.split(/\s+/); return w.length <= n ? t : w.slice(0, n).join(" ") + "…"; };
  // a signed number with a real minus: K.num(-8.29, 2) -> "−8.29"; K.num(0.8, 1) -> "+0.8"
  K.num = (x, d = 2, sign = true) => (x < 0 ? "\u2212" : sign && x > 0 ? "+" : "") + Math.abs(x).toFixed(d);
  // English notes under CJK tokens (K.tok's gloss)
  K.GLOSS = { "外星": "extraterrestrial", "外星人": "alien", "度量": "measure", "指标": "indicator", "分解": "decompose",
              "衡量": "measure", "消": "eliminate", "的外": "(particle) outer", "科幻": "sci-fi" };
  // light (on = 1) or clear (on = 0) code line n's yellow bar at `at`
  K.hl = (tl, code, n, at, on = 1, dur = 0.45) => tl.to(code.bar(n), { opacity: on, duration: dur, ease: "power2.out" }, at);

  // a terminal panel: entries [{cmd, out: [[text, "" | "red" | "green"]]}]. Returns the line elements in order
  // ({el, lines}) so a scene can reveal them one by one.
  K.term = (parent, entries, opts = {}) => {
    const pos = opts.x != null ? `position:absolute;left:${opts.x}px;top:${opts.y}px;` : "";
    const el = K.el("div", { class: "code term", id: opts.id || "", style: `${pos}${opts.w ? `width:${opts.w}px;` : ""}--code-size:${opts.size || 26}px;` }, parent);
    if (opts.label) K.el("div", { class: "code-label", text: opts.label }, el);
    const body = K.el("div", { class: "code-body" }, el), lines = [];
    for (const e of entries) {
      lines.push(K.el("div", { class: "term-line", html: `<span class="term-ps">$ </span>${esc(e.cmd)}` }, body));
      for (const [t, c] of e.out) lines.push(K.el("div", { class: "term-line term-out" + (c ? " " + c : ""), text: t }, body));
    }
    return { el, lines };
  };

  // one row of a batch: o = { label, dose, vec: "neuron" | "rand" | "none" | "zero", zid (zeroed neuron id),
  // text, stat, cls }. Rows stack in a .rows flex column; the text never wraps (it ends in an ellipsis).
  // o.chips (optional) = [{ kind: "neuron" | "rand" | "none" | "zero", text, ctl }] for rows with several chips
  // (a push and a zeroed neuron); ctl greys a zeroed control. cls "compact" makes a shorter row.
  K.row = (parent, o) => {
    const el = K.el("div", { class: "rowstrip" + (o.cls ? " " + o.cls : "") }, parent);
    K.el("span", { class: "r-lab", text: o.label }, el);
    const v = K.el("span", { class: "r-vec" }, el);
    const chips = o.chips || (o.vec && o.vec !== "none" ? [{ kind: o.vec, text: o.vec === "zero" ? (o.zid || "") : (o.dose ?? "") }]
                                                         : o.dose != null ? [{ kind: "none", text: String(o.dose) }] : []);
    for (const ch of chips) K.el("span", { class: `vchip ${ch.kind}${ch.ctl ? " ctl" : ""}`, text: ch.text ?? "" }, v);
    const t = K.el("span", { class: "r-txt" }, el);
    const spans = o.text ? K.words(t, o.text, o.hl || []) : [];
    K.el("span", { class: "r-stat", text: o.stat || "" }, el);
    return { el, txt: t, spans };
  };

  K.tex = (el, src, opts = {}) => window.katex.render(src, el, { throwOnError: false, ...opts });
  K.clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  K.ease = { inOut: p => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2), out: p => 1 - Math.pow(1 - p, 3) };
})();
