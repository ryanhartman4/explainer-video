// stage.js: a film is a pure function of time.
//
// Every animated value is a TRACK: a base value plus keyframes "from time t, go to v over dur". film.seek(t) evaluates
// every track at t and writes the result to the page, so any frame can be drawn in any order (a renderer steps through
// frames, a reviewer jumps to one) and always looks the same. There is no playback state, no timers and no randomness.
//
// Times come from the narration: film.paras[i].at("some words") is the second those words are spoken (data/timing.js,
// written by tools/clock.mjs). Never type a clock time; when the voice is re-recorded every cue moves by itself.
//
// API reference: the explainer-video skill's references/stage.md. No dependencies.
(function () {
  "use strict";
  // The frame is 1920 x 1080. A film that was planned with a vertical cut also draws at 1080 x 1920 when the page is
  // opened with ?format=9x16 (the tools do this for "formats" in film.config.json): see film.pick() and film.zones().
  const FORMATS = { "16x9": [1920, 1080], "9x16": [1080, 1920] };
  const asked = new URLSearchParams(location.search).get("format");
  const FORMAT = FORMATS[asked] ? asked : "16x9", [W, H] = FORMATS[FORMAT], PORT = H > W;
  // content area (where the picture lives) and text limits, per frame. The vertical frame keeps clear of the strips a
  // phone app covers: about 150 px at the top and 360 px at the bottom.
  const AREA = PORT ? { x: 72, y: 200, w: 936, h: 1300 } : { x: 120, y: 96, w: 1680, h: 888 };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, u) => a + (b - a) * u;

  // Motion defaults, in seconds. Entrances ease out, moves ease in and out, exits ease in and are shorter.
  const M = { enter: 0.5, exit: 0.25, move: 0.7, camera: 1.2, stagger: 0.08, lead: 0.12, rise: 26, dim: 0.3 };
  const EASE = {
    linear: u => u,
    out: u => 1 - Math.pow(1 - u, 3),
    in: u => u * u * u,
    inOut: u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    out5: u => 1 - Math.pow(1 - u, 5),
    sine: u => 0.5 - Math.cos(Math.PI * u) / 2,
    back: u => 1 + 2.4 * Math.pow(u - 1, 3) + 1.4 * Math.pow(u - 1, 2),   // overshoots: for a character's posture only
  };
  const SIZES = { display: 144, title: 96, head: 64, body: 44, label: 34, note: 26 };
  const COLOR_KEYS = new Set(["fill", "stroke", "color"]);
  const NS = "http://www.w3.org/2000/svg";

  // ---------------------------------------------------------------- tracks
  class Track {
    constructor(v0) { this.v0 = v0; this.keys = []; this.dirty = false; }
    to(t, v, dur = 0, ease = "inOut") {
      if (!(t >= 0) || !isFinite(t)) t = 0;
      this.keys.push({ t, v, dur: Math.max(0, dur), ease: EASE[ease] || EASE.inOut, i: this.keys.length });
      this.dirty = true; return this;
    }
    _prep() {
      this.keys.sort((a, b) => a.t - b.t || a.i - b.i);
      this.dirty = false;
      for (let i = 0; i < this.keys.length; i++) this.keys[i].from = this._eval(i, this.keys[i].t);   // where it starts from
    }
    _eval(n, t) {                                    // value at t using only the first n keys
      let k = null;
      for (let i = n - 1; i >= 0; i--) if (this.keys[i].t <= t) { k = this.keys[i]; break; }
      if (!k) return this.v0;
      if (k.dur === 0 || t >= k.t + k.dur) return k.v;
      return mix(k.from, k.v, k.ease((t - k.t) / k.dur));
    }
    at(t) { if (this.dirty) this._prep(); return this._eval(this.keys.length, t); }
  }
  function mix(a, b, u) {
    if (typeof a === "number") return lerp(a, b, u);
    if (Array.isArray(a)) return a.map((x, i) => lerp(x, b[i], u));
    return u < 1 ? a : b;
  }

  // ---------------------------------------------------------------- colours
  let stageEl = null, probe = null;
  const tokenCache = {};
  function token(name) {                             // "accent" -> "var(--accent)" when the look defines it
    if (typeof name !== "string" || !/^[a-z][a-z0-9-]*$/.test(name)) return null;
    if (!(name in tokenCache)) tokenCache[name] = getComputedStyle(stageEl).getPropertyValue("--" + name).trim();
    return tokenCache[name] ? "var(--" + name + ")" : null;
  }
  const css = c => (c == null || c === false ? "none" : Array.isArray(c) ? `rgba(${c[0].toFixed(1)},${c[1].toFixed(1)},${c[2].toFixed(1)},${c[3].toFixed(3)})` : token(c) || c);
  function rgba(c) {                                 // any colour -> [r, g, b, a] for tweening
    if (Array.isArray(c)) return c;
    if (c == null || c === false || c === "none") return [0, 0, 0, 0];
    probe.style.color = ""; probe.style.color = css(c);
    const m = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);
    return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1];
  }

  // ---------------------------------------------------------------- nodes
  class Node {
    constructor(parent, kind, el, base, o = {}) {
      this.parent = parent; this.film = parent.film; this.kind = kind; this.el = el;
      this.base = Object.assign({ x: 0, y: 0, scale: o.scale ?? 1, rotate: o.rotate ?? 0, opacity: o.opacity ?? 1 }, base);
      this.tracks = {}; this._in = new Track(1); this._out = new Track(1); this._dim = new Track(1); this._pulse = new Track(0);
      this.by = o.by || "fade"; this.ax = 0; this.ay = 0; this.kids = []; this._w = {}; this._first = null; this._from = null;
      this.id = o.id || null; this.shows = []; this.hides = []; this.overlap = !!o.overlap;
      el.classList.add("n");
      if (o.z != null) el.style.zIndex = o.z;
      parent.el.appendChild(el); parent.kids.push(this); this.film.nodes.push(this);
    }
    _tr(k) {
      if (this.tracks[k]) return this.tracks[k];
      let v0 = this.base[k];
      if (COLOR_KEYS.has(k)) v0 = k === "color" && v0 == null ? rgba(getComputedStyle(this.label || this.el).color) : rgba(v0);   // an inherited text colour
      return (this.tracks[k] = new Track(v0));
    }
    // go to these values, starting at t. { dur, ease }: defaults 0.7 s, "inOut".
    _t(t, what) { if (typeof t !== "number" || !isFinite(t)) { this.film.problem(`${this.name()}.${what}(): the first argument must be a time in seconds, like p1.at("some words")`); return 0; } return t; }
    to(t, props, o = {}) {
      t = this._t(t, "to");
      if (!props || typeof props !== "object") { this.film.problem(`${this.name()}.to(t, { ... }): the second argument is the values to go to`); return this; }
      for (const k in props) {
        if (!(k in this.base)) { this.film.problem(`${this.name()}: no property "${k}" to animate`); continue; }
        const text = typeof props[k] === "string" && !COLOR_KEYS.has(k);                 // a label or text switches at t, it cannot tween
        this._tr(k).to(t, COLOR_KEYS.has(k) ? rgba(props[k]) : props[k], text ? 0 : o.dur ?? M.move, o.ease || "inOut");
      }
      return this;
    }
    set(t, props) { return this.to(t, props, { dur: 0 }); }
    // enter at t. { by: "fade" | "rise" | "pop" | "draw" | "wipe" | "words", dur, from: node or [x, y] }
    show(t, o = {}) {
      t = this._t(t, "show");
      if (this._first == null) { this._first = "show"; this._in.v0 = 0; }
      if (o.by) this.by = o.by;
      if (o.from) { const f = o.from.center ? o.from.center() : o.from, c = this.center(); this._from = [f[0] - c[0], f[1] - c[1]]; }
      const dur = o.dur ?? (this.by === "draw" || this.by === "words" ? 0.8 : M.enter);
      this._in.to(t, 0, 0); this._in.to(t, 1, dur, o.ease || (this.by === "draw" ? "inOut" : "out")); this._out.to(t, 1, 0);
      this.shows.push({ t, dur });
      return this;
    }
    hide(t, o = {}) {
      t = this._t(t, "hide");
      if (this._first == null) this._first = "hide";
      this._out.to(t, 0, o.dur ?? M.exit, "in"); this.hides.push(t);
      return this;
    }
    dim(t, level = M.dim, o = {}) { this._dim.to(t, level, o.dur ?? 0.4, "inOut"); return this; }
    undim(t, o = {}) { return this.dim(t, 1, o); }
    // a short swell to pull the eye: use it on the one thing the narrator is naming
    pulse(t, o = {}) { const d = o.dur ?? 0.5; this._pulse.to(t, o.amount ?? 1, d * 0.35, "out"); this._pulse.to(t + d * 0.35, 0, d * 0.65, "inOut"); return this; }
    name() { return this.id || (this.kind === "text" ? JSON.stringify(this.el.textContent.slice(0, 28)) : this.kind); }
    val(k, t) { const tr = this.tracks[k]; return tr ? tr.at(t) : this.base[k]; }
    size() { return [this.base.w ?? this.el.offsetWidth, this.base.h ?? this.el.offsetHeight]; }
    // the resting rectangle in the scene's coordinates (before any tween): { x, y, w, h }
    bounds() {
      const [w, h] = this.size(); let x = this.base.x - this.ax * w, y = this.base.y - this.ay * h;
      for (let p = this.parent; p && p instanceof Node; p = p.parent) { x += p.base.x; y += p.base.y; }
      return { x, y, w, h };
    }
    center() { const b = this.bounds(); return [b.x + b.w / 2, b.y + b.h / 2]; }
    w1(key, value, write) { if (this._w[key] !== value) { this._w[key] = value; write(value); } }
    apply(t) {
      const pin = this._in.at(t), pout = this._out.at(t), by = this.by;
      let op = this.val("opacity", t) * this._dim.at(t) * pout, dx = 0, dy = 0;
      let sc = this.val("scale", t) * (1 + 0.08 * this._pulse.at(t));
      this.p = pin;
      if (by === "rise") { op *= clamp(pin * 1.5); dy = (1 - pin) * M.rise; }
      else if (by === "pop") { op *= clamp(pin * 1.8); sc *= 0.9 + 0.1 * pin; }
      else if (by === "draw" || by === "wipe" || by === "words") op *= pin > 0 ? 1 : 0;
      else op *= pin;
      if (this._from) { dx += (1 - pin) * this._from[0]; dy += (1 - pin) * this._from[1]; if (by !== "rise") sc *= 0.6 + 0.4 * pin; }
      this.op = op;
      this.w1("vis", op <= 0.001 ? "hidden" : "", v => (this.el.style.visibility = v));
      if (op <= 0.001) return;
      this.w1("op", op.toFixed(4), v => (this.el.style.opacity = v));
      const x = this.val("x", t) + dx, y = this.val("y", t) + dy, r = this.val("rotate", t);
      const tf = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)` + (this.ax || this.ay ? ` translate(${-this.ax * 100}%,${-this.ay * 100}%)` : "") +
        (r ? ` rotate(${r.toFixed(3)}deg)` : "") + (sc !== 1 ? ` scale(${sc.toFixed(4)})` : "");
      this.w1("tf", tf, v => (this.el.style.transform = v));
      if (by === "wipe") this.w1("clip", `inset(-20% ${((1 - pin) * 100).toFixed(2)}% -20% -2%)`, v => (this.el.style.clipPath = v));
      if (this.paint) this.paint(t, pin);
      for (const k of this.kids) k.apply(t);
    }
  }

  // ---- creators shared by scenes, groups and the film's own layers
  const make = {
    // text("words", { x, y, size: "display|title|head|body|label|note" or px, font: "display|text|mono", color, weight,
    //                 w: wrap width, align: "left|center|right" (x is that edge), valign: "top|middle|bottom" })
    text(str, o = {}) {
      const el = document.createElement("div");
      el.className = "t " + (typeof o.size === "number" ? "" : "t-" + (o.size || "body")) + (o.font ? " f-" + o.font : "") + (o.w ? " wrap" : "");
      if (typeof o.size === "number") el.style.fontSize = o.size + "px";
      if (o.w) el.style.width = o.w + "px";
      if (o.weight) el.style.fontWeight = o.weight;
      if (o.lineHeight) el.style.lineHeight = o.lineHeight;
      if (o.italic) el.style.fontStyle = "italic";
      el.style.textAlign = o.align || "left";
      el.innerHTML = String(str);
      const n = new Node(this, "text", el, { x: o.x || 0, y: o.y || 0, color: o.color || null, text: String(str) }, { by: "rise", ...o });
      n.ax = o.align === "center" ? 0.5 : o.align === "right" ? 1 : 0; n.ay = o.valign === "middle" ? 0.5 : o.valign === "bottom" ? 1 : 0;
      if (o.color) el.style.color = css(o.color);
      n.marks = [];
      // mark("phrase", t, { color }): when the narrator says the term, it takes the accent colour and an underline draws
      n.mark = (phrase, t, mo = {}) => {
        const i = el.innerHTML.indexOf(phrase);
        if (i < 0) { n.film.problem(`mark: ${JSON.stringify(phrase)} is not in ${n.name()}`); return n; }
        const id = "mk" + n.film.uid++;
        el.innerHTML = el.innerHTML.slice(0, i) + `<span class="mk${mo.strike ? " strike" : ""}" id="${id}">${phrase}</span>` + el.innerHTML.slice(i + phrase.length);
        const tr = new Track(0); tr.to(t, 1, mo.dur ?? 0.45, "out");
        if (mo.until != null) tr.to(mo.until, 0, 0.3, "inOut");
        n.marks.push({ id, tr, color: mo.color }); n._spans = null;
        return n;
      };
      // strike("phrase", t, { color }): a line is drawn through the phrase and it takes the colour (default: accent)
      n.strike = (phrase, t, mo = {}) => n.mark(phrase, t, { dur: 0.35, ...mo, strike: true });
      n.paint = function (t, pin) {
        if (this.tracks.color) this.w1("color", css(this.tracks.color.at(t)), v => (el.style.color = v));
        if (this.tracks.text) this.w1("text", this.tracks.text.at(t), v => (el.innerHTML = v));
        for (const m of this.marks) {
          const s = m.el || (m.el = el.querySelector("#" + m.id));
          if (m.color && !m.done) { s.style.setProperty("--mc", css(m.color)); m.done = true; }
          this.w1(m.id, m.tr.at(t).toFixed(3), v => s.style.setProperty("--m", v));
        }
        if (this.by === "words") {                   // words appear one by one across the entrance
          if (!this._spans) {
            const walk = node => { for (const c of [...node.childNodes]) { if (c.nodeType === 3) { const f = document.createDocumentFragment();
              c.textContent.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) f.appendChild(document.createTextNode(w)); else { const s = document.createElement("span"); s.className = "w"; s.textContent = w; f.appendChild(s); } });
              c.replaceWith(f); } else walk(c); } };
            walk(el); this._spans = [...el.querySelectorAll("span.w")];
          }
          const k = pin * this._spans.length;
          this._spans.forEach((s, i) => { const v = clamp(k - i).toFixed(2); if (s._v !== v) { s._v = v; s.style.opacity = v; } });
        }
      };
      return n;
    },
    // number(1234, { x, y, size, decimals, prefix, suffix, fmt: v => string }), then .to(t, { value: 5678 })
    number(value, o = {}) {
      const n = make.text.call(this, "", { font: "mono", ...o });
      n.kind = "number"; n.base.value = value;
      const fmt = o.fmt || (v => (o.prefix || "") + v.toLocaleString("en-US", { minimumFractionDigits: o.decimals || 0, maximumFractionDigits: o.decimals || 0 }) + (o.suffix || ""));
      const paintText = n.paint;
      n.paint = function (t, pin) { paintText.call(this, t, pin); this.w1("txt", fmt(this.val("value", t)), v => (this.el.textContent = v)); };
      n.el.textContent = fmt(value);
      return n;
    },
    // box({ x, y, w, h, fill, stroke, radius, lw, label, labelSize, labelColor, labelFont }): x, y is the top-left corner
    box(o = {}) {
      const el = document.createElement("div"), lw = o.lw ?? 4;
      const stroke = o.stroke === undefined && o.fill === undefined ? "ink" : o.stroke;
      const rad = o.radius ?? parseFloat(getComputedStyle(stageEl).getPropertyValue("--radius")) ?? 8;
      el.innerHTML = `<div class="fill"></div><svg class="fx" width="100%" height="100%"><rect x="0" y="0" width="100%" height="100%" rx="${rad}" fill="none" pathLength="1" stroke-width="${lw}" stroke-linejoin="round"/></svg><div class="lab t t-${o.labelSize || "label"}${o.labelFont ? " f-" + o.labelFont : ""}"></div>`;
      const n = new Node(this, "box", el, { x: o.x || 0, y: o.y || 0, w: o.w ?? 200, h: o.h ?? 100, fill: o.fill || null, stroke: stroke || null, color: o.labelColor || null, draw: 1, label: o.label ?? "" }, { by: "pop", ...o });
      const fill = el.children[0], rect = el.querySelector("rect"), lab = el.children[2];
      fill.style.borderRadius = rad + "px"; lab.innerHTML = o.label ?? ""; n.label = lab;
      if (o.labelColor) lab.style.color = css(o.labelColor);
      n.paint = function (t, pin) {
        this.w1("w", this.val("w", t).toFixed(2) + "px", v => (el.style.width = v)); this.w1("h", this.val("h", t).toFixed(2) + "px", v => (el.style.height = v));
        this.w1("fill", css(this.val("fill", t)), v => (fill.style.background = v === "none" ? "transparent" : v));
        this.w1("stroke", css(this.val("stroke", t)), v => rect.setAttribute("stroke", v));
        if (this.tracks.color) this.w1("color", css(this.tracks.color.at(t)), v => (lab.style.color = v));
        if (this.tracks.label) this.w1("label", this.tracks.label.at(t), v => (lab.innerHTML = v));
        const d = (this.by === "draw" ? pin : 1) * this.val("draw", t);
        this.w1("dash", d >= 1 ? "" : `1 1|${(1 - d).toFixed(4)}`, v => { const [a, b] = v.split("|"); rect.style.strokeDasharray = a || ""; rect.style.strokeDashoffset = b || ""; });
        if (this.by === "draw") this.w1("fo", clamp(pin * 2 - 1).toFixed(3), v => { fill.style.opacity = v; lab.style.opacity = v; });
      };
      n.paint(0, 1);
      return n;
    },
    // circle({ x, y, r, fill, stroke, lw, label }): x, y is the centre
    circle(o = {}) {
      const el = document.createElement("div"), lw = o.lw ?? 4;
      const stroke = o.stroke === undefined && o.fill === undefined ? "ink" : o.stroke;
      el.innerHTML = `<div class="fill" style="border-radius:50%"></div><svg class="fx" width="100%" height="100%"><circle cx="50%" cy="50%" r="50%" fill="none" pathLength="1" stroke-width="${lw}"/></svg><div class="lab t t-${o.labelSize || "label"}${o.labelFont ? " f-" + o.labelFont : ""}"></div>`;
      const n = new Node(this, "circle", el, { x: o.x || 0, y: o.y || 0, r: o.r ?? 12, fill: o.fill || null, stroke: stroke || null, color: o.labelColor || null, draw: 1, label: o.label ?? "" }, { by: "pop", ...o });
      n.ax = n.ay = 0.5;
      const fill = el.children[0], circ = el.querySelector("circle"), lab = el.children[2];
      lab.innerHTML = o.label ?? ""; lab.style.padding = "0"; n.label = lab;
      if (o.labelColor) lab.style.color = css(o.labelColor);
      n.size = function () { return [this.base.r * 2, this.base.r * 2]; };
      n.paint = function (t, pin) {
        this.w1("w", (this.val("r", t) * 2).toFixed(2) + "px", v => { el.style.width = v; el.style.height = v; });
        this.w1("fill", css(this.val("fill", t)), v => (fill.style.background = v === "none" ? "transparent" : v));
        this.w1("stroke", css(this.val("stroke", t)), v => circ.setAttribute("stroke", v));
        if (this.tracks.color) this.w1("color", css(this.tracks.color.at(t)), v => (lab.style.color = v));
        if (this.tracks.label) this.w1("label", this.tracks.label.at(t), v => (lab.innerHTML = v));
        const d = (this.by === "draw" ? pin : 1) * this.val("draw", t);
        this.w1("dash", d >= 1 ? "" : `1 1|${(1 - d).toFixed(4)}`, v => { const [a, b] = v.split("|"); circ.style.strokeDasharray = a || ""; circ.style.strokeDashoffset = b || ""; });
      };
      n.paint(0, 1);
      return n;
    },
    // path("M0,0 L10,10", { stroke, fill, lw, dash: [8, 8] }): coordinates are the scene's. Enters by drawing itself.
    path(d, o = {}) {
      const el = document.createElement("div");
      el.innerHTML = `<svg class="fx" width="1" height="1"><path fill="none" stroke-linecap="round" stroke-linejoin="round"/><path class="head" stroke="none"/></svg>`;
      const n = new Node(this, o.kind || "path", el, { x: 0, y: 0, d, stroke: o.stroke === undefined ? "ink" : o.stroke, fill: o.fill || null, lw: o.lw ?? 4, draw: 1,
        x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2 }, { by: "draw", ...o });
      const p = el.querySelector("path"), head = el.querySelector(".head");
      n.pathEl = p;
      n.size = () => { const b = p.getBBox(); return [b.width, b.height]; };
      n.bounds = function () { const b = p.getBBox(); let x = b.x + this.base.x, y = b.y + this.base.y; for (let q = this.parent; q && q instanceof Node; q = q.parent) { x += q.base.x; y += q.base.y; } return { x, y, w: b.width, h: b.height }; };
      n.paint = function (t, pin) {
        const dd = o.shape ? o.shape(this.val("x1", t), this.val("y1", t), this.val("x2", t), this.val("y2", t)) : this.val("d", t);
        this.w1("d", dd, v => { p.setAttribute("d", v); this._len = p.getTotalLength(); });
        const col = css(this.val("stroke", t));
        this.w1("stroke", col, v => { p.setAttribute("stroke", v); head.setAttribute("fill", v); });
        this.w1("fill", css(this.val("fill", t)), v => p.setAttribute("fill", v));
        this.w1("lw", this.val("lw", t), v => p.setAttribute("stroke-width", v));
        const L = this._len || 0, prog = (this.by === "draw" ? pin : 1) * this.val("draw", t), hl = o.head ? (o.headSize ?? 26) : 0;
        const shown = Math.max(0, prog * L - hl * 0.55);
        let da = "";
        if (o.dash) { const [a, b] = o.dash, k = Math.floor(shown / (a + b)); da = (a + " " + b + " ").repeat(k) + Math.min(a, shown - k * (a + b)).toFixed(2) + " " + (L + 10); }
        else if (prog < 1 || hl) da = shown.toFixed(2) + " " + (L + 10);
        this.w1("dash", da, v => (p.style.strokeDasharray = v));
        if (hl) {
          const a = p.getPointAtLength(prog * L), b = p.getPointAtLength(Math.max(0, prog * L - 3)), ang = Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI;
          this.w1("head", `translate(${a.x.toFixed(2)} ${a.y.toFixed(2)}) rotate(${ang.toFixed(2)})|${prog * L < hl * 0.6 ? 0 : 1}`, v => { const [tf, o2] = v.split("|"); head.setAttribute("transform", tf); head.setAttribute("opacity", o2); });
          this.w1("hd", hl, v => head.setAttribute("d", `M0,0 L${-v},${-v * 0.42} L${-v * 0.78},0 L${-v},${v * 0.42} Z`));
        }
      };
      n.paint(0, 1);
      return n;
    },
    // line({ from: [x, y], to: [x, y], stroke, lw, dash }); animate the ends with .to(t, { x2, y2 })
    line(o = {}) {
      const [x1, y1] = o.from || [0, 0], [x2, y2] = o.to || [100, 0];
      return make.path.call(this, "", { kind: "line", ...o, x1, y1, x2, y2, shape: (a, b, c, d) => `M${a.toFixed(2)},${b.toFixed(2)} L${c.toFixed(2)},${d.toFixed(2)}` });
    },
    // arrow(a, b, { bend, stroke, lw, gap, dash }): a and b are [x, y] points or nodes (the arrow runs edge to edge).
    // bend curves it: 0.2 bows to the left of travel, -0.2 to the right. Enters by drawing itself, head first.
    arrow(a, b, o = {}) {
      const gap = o.gap ?? 14, pa = a.bounds ? a.bounds() : null, pb = b.bounds ? b.bounds() : null;
      const ca = pa ? [pa.x + pa.w / 2, pa.y + pa.h / 2] : a, cb = pb ? [pb.x + pb.w / 2, pb.y + pb.h / 2] : b;
      const edge = (bx, toward, side, node) => {       // the point where the node's edge faces `toward`
        if (!bx) return null;
        const cx = bx.x + bx.w / 2, cy = bx.y + bx.h / 2, dx = toward[0] - cx, dy = toward[1] - cy;
        if (node.kind === "circle" && !side) { const d = Math.hypot(dx, dy) || 1, r = bx.w / 2 + gap; return [cx + dx / d * r, cy + dy / d * r]; }
        const s = side || (Math.abs(dx) * bx.h > Math.abs(dy) * bx.w ? (dx > 0 ? "right" : "left") : (dy > 0 ? "bottom" : "top"));
        return s === "right" ? [bx.x + bx.w + gap, cy] : s === "left" ? [bx.x - gap, cy] : s === "bottom" ? [cx, bx.y + bx.h + gap] : [cx, bx.y - gap];
      };
      const p1 = edge(pa, cb, o.fromSide, a) || a, p2 = edge(pb, p1, o.toSide, b) || b, bend = o.bend || 0;
      const shape = (x1, y1, x2, y2) => {
        if (!bend) return `M${x1.toFixed(2)},${y1.toFixed(2)} L${x2.toFixed(2)},${y2.toFixed(2)}`;
        const mx = (x1 + x2) / 2 + (y2 - y1) * bend, my = (y1 + y2) / 2 - (x2 - x1) * bend;
        return `M${x1.toFixed(2)},${y1.toFixed(2)} Q${mx.toFixed(2)},${my.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`;
      };
      return make.path.call(this, "", { kind: "arrow", head: o.head !== false, ...o, x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], shape });
    },
    // group({ x, y, w, h }): children are placed relative to the group and move, fade and scale with it
    group(o = {}) {
      const el = document.createElement("div");
      if (o.w) { el.style.width = o.w + "px"; el.style.height = (o.h || 0) + "px"; }
      const n = new Node(this, "group", el, { x: o.x || 0, y: o.y || 0, w: o.w, h: o.h }, o);
      n.size = function () { return [this.base.w || 0, this.base.h || 0]; };
      Object.assign(n, bind(n));
      return n;
    },
    // image("assets/pic.jpg", { x, y, w, h, radius })
    image(src, o = {}) {
      const el = document.createElement("img");
      el.src = src; el.style.width = (o.w ?? 400) + "px"; if (o.h) el.style.height = o.h + "px"; el.style.borderRadius = (o.radius ?? 0) + "px"; el.style.objectFit = "cover";
      this.film.waits.push(el.decode ? el.decode().catch(() => this.film.problem("image did not load: " + src)) : Promise.resolve());
      return new Node(this, "image", el, { x: o.x || 0, y: o.y || 0, w: o.w ?? 400, h: o.h }, o);
    },
    // clip(p, { x, y, w, h, radius, focus, who, source }): the real recording that paragraph p plays (its "@clip" line
    // in SCRIPT.md; tools/clips.py cuts the frames). The picture keeps step with the film's clock, so any frame can be
    // drawn in any order. x, y is the top-left of the picture. focus (0..1, default 0.5) is the part of the width kept
    // when the box is narrower than the recording. who and source are printed under the picture: always credit a clip.
    clip(p, o = {}) {
      const film = this.film, c = p && p.clip, w = o.w ?? 960, h = o.h ?? Math.round(w * 9 / 16);
      const g = make.group.call(this, { ...o, x: o.x || 0, y: o.y || 0, w, h, by: o.by || "fade" });
      g.kind = "clip";
      const img = document.createElement("img");
      img.style.cssText = `display:block;width:${w}px;height:${h}px;object-fit:cover;object-position:${((o.focus ?? 0.5) * 100).toFixed(1)}% 50%;border-radius:${o.radius ?? 6}px;background:var(--panel)`;
      const pic = new Node(g, "image", img, { x: 0, y: 0, w, h }, {});
      if (!c) film.problem(`paragraph ${p ? p.n : "?"} has no clip yet: give it an "@clip file start end" line in SCRIPT.md, then run  sh tools/audio.sh`);
      pic.paint = function (t) {
        if (!c) return;
        const i = Math.max(0, Math.min(c.frames - 1, Math.floor((t - p.voiceStart) * c.fps + 1e-6)));
        this.w1("src", `${c.dir}/${String(i).padStart(5, "0")}.jpg`, v => { img.src = v;
          film.pending.push(img.decode().catch(() => { if (this._w.src === v) film.problem("clip frame did not load: " + v); })); });   // a newer frame replacing this one is not a failure
      };
      g.frame = pic;
      if (o.who) g.who = g.text(o.who, { x: 0, y: h + 14, size: "label" });
      if (o.source) g.source = g.text(o.source, { x: 0, y: h + 14 + (o.who ? 48 : 0), size: "note" });
      return g;
    },
    // code(source, { x, y, w, size, start: first line number, title, lang }), then .focus(t, fromLine, toLine) / .unfocus(t)
    // Syntax stays nearly monochrome (keywords bold, comments and strings muted) so colour keeps its meaning.
    code(src, o = {}) {
      const el = document.createElement("div"), start = o.start ?? 1, fs = o.size ?? 28;
      el.className = "code"; el.style.width = (o.w ?? 900) + "px"; el.style.fontSize = fs + "px";
      const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      const KW = /\b(def|class|return|if|elif|else|for|while|in|not|and|or|import|from|as|with|try|except|finally|raise|yield|lambda|pass|break|continue|function|const|let|var|new|async|await|export|default|switch|case|throw|catch|struct|fn|impl|pub|use|match|type|interface|func|package|go|defer)\b/g;
      const tint = line => {
        const m = line.match(/^(.*?)((?:#|\/\/).*)?$/), code = m[1] || "", cm = m[2] || "";
        if (cm && (code.split('"').length % 2 === 0 || code.split("'").length % 2 === 0)) return esc(line);   // a # inside a string
        const one = new RegExp(`("[^"]*"|'[^']*')|${KW.source}`, "g");                       // strings and keywords in one pass
        return esc(code).replace(one, (m2, str) => (str ? `<span class="st">${str}</span>` : `<span class="kw">${m2}</span>`)) + (cm ? `<span class="cm">${esc(cm)}</span>` : "");
      };
      const lines = String(src).replace(/\n$/, "").split("\n");
      el.innerHTML = (o.title ? `<div class="ttl">${esc(o.title)}</div>` : "") + `<div class="body" style="position:relative"><div class="bar"></div>` +
        lines.map((l, i) => l === "…" || l === "..." ? `<div class="ln gap"><span class="no"></span><span class="src">…</span></div>` : `<div class="ln"><span class="no">${o.numbers === false ? "" : start + i}</span><span class="src">${tint(l) || " "}</span></div>`).join("") + `</div>`;
      const n = new Node(this, "code", el, { x: o.x || 0, y: o.y || 0, w: o.w ?? 900, f0: start, f1: start, focus: 0 }, { by: "rise", ...o });
      const rows = [...el.querySelectorAll(".ln")], bar = el.querySelector(".bar"), lh = fs * 1.55;
      n.lines = lines.length; n.lineY = i => n.base.y + 22 + (o.title ? fs * 0.8 * 1.25 + 14 : 0) + (i - start) * lh;
      n.focus = function (t, a, b = a, fo = {}) { const d = fo.dur ?? 0.5; if (!this.tracks.focus || this.tracks.focus.at(t) < 0.5) this.set(t, { f0: a, f1: b }); else this.to(t, { f0: a, f1: b }, { dur: d });
        return this.to(t, { focus: 1 }, { dur: d, ease: "out" }); };
      n.unfocus = function (t) { return this.to(t, { focus: 0 }, { dur: 0.4 }); };
      n.paint = function (t) {
        const f = this.val("focus", t), a = this.val("f0", t) - start, b = this.val("f1", t) - start;
        this.w1("bar", `${(a * lh).toFixed(1)}|${((b - a + 1) * lh).toFixed(1)}|${f.toFixed(3)}`, v => { const [y, h, op] = v.split("|"); bar.style.top = y + "px"; bar.style.height = h + "px"; bar.style.opacity = op; bar.style.borderLeftWidth = "0"; });
        rows.forEach((r, i) => { const inside = clamp(Math.min(i - a + 1, b - i + 1)); const v = (1 - f * (1 - inside) * 0.68).toFixed(3); if (r._v !== v) { r._v = v; r.style.opacity = v; } });
      };
      n.paint(0);
      return n;
    },
    // canvas((ctx, t) => { ... }, { x, y, w, h }): for pictures with hundreds of parts. draw must depend only on t and on
    // film.value() tracks, never on what it drew before.
    canvas(draw, o = {}) {
      const el = document.createElement("canvas"), w = o.w ?? W, h = o.h ?? H;
      el.width = w; el.height = h; el.style.display = "block";
      const n = new Node(this, "canvas", el, { x: o.x || 0, y: o.y || 0, w, h }, o), ctx = el.getContext("2d");
      n.paint = function (t) { ctx.clearRect(0, 0, w, h); draw(ctx, t); };
      return n;
    },
    // axes({ x, y, w, h, xr: [0, 10], yr: [0, 1], xlabel, ylabel, xticks: [..], yticks: [..], fmt }): x, y is the top-left
    // of the plot area. Returns a group with .px(v) .py(v) (data -> group pixels), .plot(fn or [[x, y]..], opts),
    // .dot(x, y, opts), .bar(x, value, opts), .at(x, y) -> scene coordinates.
    axes(o = {}) {
      const g = make.group.call(this, { x: o.x || 0, y: o.y || 0, w: o.w ?? 800, h: o.h ?? 500, id: o.id }), w = g.base.w, h = g.base.h;
      const [x0, x1] = o.xr || [0, 1], [y0, y1] = o.yr || [0, 1], fmt = o.fmt || (v => String(v));
      g.kind = "axes";
      g.px = v => (v - x0) / (x1 - x0) * w; g.py = v => h - (v - y0) / (y1 - y0) * h;
      g.at = (x, y) => [g.base.x + g.px(x), g.base.y + g.py(y)];
      g.xAxis = g.line({ from: [0, h], to: [w, h], stroke: "muted", lw: 2 }); g.yAxis = g.line({ from: [0, h], to: [0, 0], stroke: "muted", lw: 2 });
      g.ticks = [];
      (o.xticks || []).forEach(v => { g.ticks.push(g.line({ from: [g.px(v), h], to: [g.px(v), h + 10], stroke: "muted", lw: 2 }), g.text(fmt(v), { x: g.px(v), y: h + 18, size: "note", font: "mono", align: "center" })); });
      (o.yticks || []).forEach(v => { g.ticks.push(g.line({ from: [-10, g.py(v)], to: [0, g.py(v)], stroke: "muted", lw: 2 }), g.text(fmt(v), { x: -20, y: g.py(v), size: "note", font: "mono", align: "right", valign: "middle" })); });
      if (o.xlabel) g.xlabel = g.text(o.xlabel, { x: w / 2, y: h + (o.xticks ? 62 : 22), size: "label", color: "muted", align: "center" });
      if (o.ylabel) g.ylabel = g.text(o.ylabel, { x: 0, y: -52, size: "label", color: "muted" });
      g.plot = (f, po = {}) => {
        const pts = typeof f === "function" ? Array.from({ length: 241 }, (_, i) => { const x = x0 + (x1 - x0) * i / 240; return [x, f(x)]; }) : f;
        return g.path("M" + pts.map(p => g.px(p[0]).toFixed(1) + "," + g.py(clamp(p[1], y0 - (y1 - y0), y1 + (y1 - y0))).toFixed(1)).join("L"), { stroke: "accent", lw: 5, ...po });
      };
      g.dot = (x, y, po = {}) => g.circle({ x: g.px(x), y: g.py(y), r: 9, fill: "accent", stroke: null, ...po });
      g.bar = (x, v, po = {}) => { const bw = po.w ?? 60, top = g.py(v), b = g.box({ x: g.px(x) - bw / 2, y: h, w: bw, h: 0, fill: "accent", stroke: null, radius: 4, ...po, by: "fade" });
        b.grow = (t, go = {}) => b.to(t, { y: top, h: h - top }, { dur: go.dur ?? 0.8, ease: "out" }); return b; };
      // show(t): the axes draw themselves, then ticks and labels fade in
      g.show = function (t) { Node.prototype.show.call(this, t, { by: "fade", dur: 0.01 }); this.xAxis.show(t, { dur: 0.7 }); this.yAxis.show(t + 0.1, { dur: 0.7 });
        this.ticks.forEach((k, i) => k.show(t + 0.4 + 0.02 * i, { by: "fade", dur: 0.3 })); if (this.xlabel) this.xlabel.show(t + 0.6, { by: "fade" }); if (this.ylabel) this.ylabel.show(t + 0.6, { by: "fade" }); return this; };
      return g;
    },
    // tex("\\frac{a}{b}", { x, y, size }): needs KaTeX (sh tools/add_katex.sh), see references/stage.md
    tex(src, o = {}) {
      const n = make.text.call(this, "", { size: o.size ?? "head", ...o });
      if (!window.katex) { this.film.problem("tex() needs KaTeX: run sh tools/add_katex.sh and add its two tags to film.html"); n.el.textContent = src; }
      else window.katex.render(src, n.el, { throwOnError: false, displayMode: !!o.display });
      n.kind = "tex";
      return n;
    },
  };
  function bind(owner) { const out = {}; for (const k in make) out[k] = (...a) => make[k].apply(owner, a); return out; }

  // ---------------------------------------------------------------- paragraphs (when) and scenes (where)
  const norm = w => w.toLowerCase().replace(/[^a-z0-9']/g, "");
  class Para {
    constructor(film, s) {
      this.film = film; this.n = s.n; this.title = s.title; this.words = s.words;
      this.start = s.start; this.end = s.start + s.dur;
      this.voiceStart = s.vo ?? s.start + s.lead; this.voiceEnd = this.voiceStart + s.speech;
      this.keys = s.words.map(w => norm(w.w));
      this.clip = s.clip || null;                      // { dir, fps, frames, w, h }: this paragraph is a real recording, not the narrator
    }
    _find(phrase, occ) {
      const want = String(phrase).split(/\s+/).map(norm).filter(Boolean);
      if (!want.length) { this.film.problem(`empty cue phrase in p${this.n}`); return null; }
      let k = 0;
      for (let i = 0; i + want.length <= this.keys.length; i++)
        if (want.every((w, j) => this.keys[i + j] === w) && ++k === occ) return [this.words[i], this.words[i + want.length - 1]];
      this.film.problem(`missing cue p${this.n}: "${phrase}"${occ > 1 ? " #" + occ : ""}`);
      return null;
    }
    // the moment the phrase is spoken (a touch early, so the picture is arriving as the word lands).
    // at("fault lines"), at("guess", -0.3) shifts it, at("the", { occ: 2 }) takes the second time it is said.
    at(phrase, o = 0) { const sh = typeof o === "number" ? o : o.shift || 0, w = this._find(phrase, (o && o.occ) || 1); return Math.max(0, this.voiceStart + (w ? w[0].s : 0) - M.lead + sh); }
    // the moment the phrase has just been said
    after(phrase, o = 0) { const sh = typeof o === "number" ? o : o.shift || 0, w = this._find(phrase, (o && o.occ) || 1); return this.voiceStart + (w ? w[1].e : 0) + sh; }
  }

  class Layer {
    constructor(film, parentEl, cls) { this.film = film; this.el = document.createElement("div"); this.el.className = "layer " + (cls || ""); parentEl.appendChild(this.el); this.kids = []; Object.assign(this, bind(this)); }
    apply(t) { for (const k of this.kids) k.apply(t); }
  }
  class Scene {
    constructor(film, a, b, o = {}) {
      this.film = film; this.from = a; this.to = b; this.start = a.start; this.end = b.end;
      this.el = document.createElement("div"); this.el.className = "layer scene"; film.scenesEl.appendChild(this.el);
      this.world = new Layer(film, this.el, "world"); this.hud = new Layer(film, this.el, "hud");
      Object.assign(this, bind(this.world));
      this.kids = this.world.kids;
      this.fadeIn = o.fadeIn ?? (this.start <= 0.001 ? 0 : 0.4); this.fadeOut = o.fadeOut ?? (this.end >= film.duration - 0.001 ? 0.9 : 0.3);
      this.cam = { x: new Track(W / 2), y: new Track(H / 2), zoom: new Track(1) };
      // camera.to(t, { x, y, zoom }): centre the view on (x, y). camera.frame(t, node or { x, y, w, h }): fit that region.
      const scene = this;
      this.camera = {
        to(t, p, co = {}) { for (const k of ["x", "y", "zoom"]) if (p[k] != null) scene.cam[k].to(t, p[k], co.dur ?? M.camera, co.ease || "inOut"); return this; },
        frame(t, target, co = {}) { const b = target.bounds ? target.bounds() : target, pad = co.pad ?? 120, z = Math.min(W / (b.w + 2 * pad), H / (b.h + 2 * pad), co.max ?? 3);
          return this.to(t, { x: b.x + b.w / 2, y: b.y + b.h / 2, zoom: z }, co); },
        reset(t, co = {}) { return this.to(t, { x: W / 2, y: H / 2, zoom: 1 }, co); },
      };
    }
    apply(t) {
      let op = t < this.start || t > this.end ? 0 : 1;
      if (op && this.fadeIn) op = Math.min(op, EASE.out(clamp((t - this.start) / this.fadeIn)));
      if (op && this.fadeOut) op = Math.min(op, 1 - EASE.in(clamp((t - (this.end - this.fadeOut)) / this.fadeOut)));
      if (t >= this.end && this.end >= this.film.duration - 0.001) op = 0;
      this.op = op;
      this.el.style.visibility = op <= 0.001 ? "hidden" : ""; this.el.style.opacity = op.toFixed(4);
      if (op <= 0.001) return;
      const z = this.cam.zoom.at(t), x = this.cam.x.at(t), y = this.cam.y.at(t);
      this.world.el.style.transform = z === 1 && x === W / 2 && y === H / 2 ? "" : `translate(${W / 2}px,${H / 2}px) scale(${z.toFixed(5)}) translate(${(-x).toFixed(2)}px,${(-y).toFixed(2)}px)`;
      this.world.apply(t); this.hud.apply(t);
    }
  }

  // what the bundled latin subsets cover (fontsource "latin")
  const inLatin = c => c <= 0xff || c === 0x131 || c === 0x152 || c === 0x153 || c === 0x2c6 || c === 0x2da || c === 0x2dc || (c >= 0x2000 && c <= 0x206f) ||
    c === 0x20ac || c === 0x2122 || c === 0x2191 || c === 0x2193 || c === 0x2212 || c === 0x2215;

  // ---------------------------------------------------------------- the film
  class Film {
    constructor(o) {
      this.o = o; this.W = W; this.H = H; this.nodes = []; this.scenes = []; this.problems = []; this.hits = []; this.waits = []; this.uid = 1; this.values = [];
      const T = window.TIMING;
      this.timing = T; this.duration = T.total; this.fps = o.fps || 30;
      this.paras = T.scenes.map(s => new Para(this, s));
      this.back = new Layer(this, stageEl, "back");
      this.scenesEl = document.createElement("div"); this.scenesEl.className = "layer"; stageEl.appendChild(this.scenesEl);
      this.front = new Layer(this, stageEl, "front");
      this.capsEl = document.createElement("div"); this.capsEl.id = "caps"; stageEl.appendChild(this.capsEl);
      this.probEl = document.createElement("div"); this.probEl.id = "problems"; stageEl.appendChild(this.probEl);
      this.format = FORMAT; this.portrait = PORT; this.area = { ...AREA };
      this.safe = { left: AREA.x, top: AREA.y, right: AREA.x + AREA.w, bottom: AREA.y + AREA.h };
      this.pending = [];
      this.t = 0;
    }
    // one film, two frames: film.pick(wide, tall) is `wide` in the 16:9 cut and `tall` in the 9:16 cut.
    //   A.text("Add a word", { x: film.pick(120, 72), y: film.pick(96, 210), size: "head" })
    pick(wide, tall) { return PORT ? tall : wide; }
    // split the content area into parts that sit side by side in 16:9 and stack top to bottom in 9:16.
    //   const [left, right] = film.zones([3, 2]);   -> { x, y, w, h, cx, cy } each; weights set the share of the long side
    //   { gap: 40, top: 0, bottom: 0 }: gap between zones, and room kept free above (a heading) or below
    zones(weights = [1, 1], o = {}) {
      const gap = o.gap ?? 40, top = o.top || 0, a = { x: AREA.x, y: AREA.y + top, w: AREA.w, h: AREA.h - top - (o.bottom || 0) };
      const sum = weights.reduce((s, v) => s + v, 0), free = (PORT ? a.h : a.w) - gap * (weights.length - 1);
      let at = PORT ? a.y : a.x;
      return weights.map(v => { const len = free * v / sum, z = PORT ? { x: a.x, y: at, w: a.w, h: len } : { x: at, y: a.y, w: len, h: a.h };
        at += len + gap; z.cx = z.x + z.w / 2; z.cy = z.y + z.h / 2; return z; });
    }
    // wait for anything a seek started loading (clip frames). The render tools call this before every capture.
    settle() { const p = this.pending; this.pending = []; return Promise.all(p); }
    para(n) { const p = this.paras.find(q => q.n === n); if (!p) this.problem(`no paragraph ${n} in SCRIPT.md`); return p || this.paras[0]; }
    // scene(p): a layer that lives while paragraph p is spoken. scene(p2, p4): one picture across paragraphs 2 to 4.
    scene(a, b, o) { if (b && !(b instanceof Para)) { o = b; b = null; } const s = new Scene(this, a, b || a, o || {}); this.scenes.push(s); return s; }
    // a free-standing animated number for canvas drawings: const k = film.value(0); k.to(t, 1, { dur, ease }); k.at(t)
    value(v0) { const film = this, tr = new Track(v0), v = { to(t, v1, vo = {}) { if (typeof t !== "number" || !isFinite(t)) film.problem("value.to(): the first argument must be a time in seconds"); tr.to(t, v1, vo.dur ?? M.move, vo.ease || "inOut"); return v; }, set(t, v1) { tr.to(t, v1, 0); return v; }, at: t => tr.at(t) }; this.values.push(tr); return v; }
    // a sound on a picture event: film.hit("pluck", t, { pitch: 0..8 }). Kinds: tools/make_hits.py
    hit(kind, t, o = {}) { this.hits.push({ kind, t: +t.toFixed(4), ...o }); return t; }
    problem(msg) { if (!this.problems.includes(msg)) { this.problems.push(msg); console.error("[stage] " + msg); this.probEl.textContent = this.problems.join("\n"); } }
    seek(t) {
      t = clamp(t, 0, this.duration); this.t = t;
      if (this.pending.length > 64) this.pending = this.pending.slice(-8);   // the preview player never calls settle()
      this.back.apply(t); for (const s of this.scenes) s.apply(t); this.front.apply(t);
      if (this.caps) { const c = this.caps.find(c => t >= c.a && t < c.b); const txt = c ? c.text : ""; if (this._cap !== txt) { this._cap = txt; this.capsEl.innerHTML = txt ? "<span></span>" : ""; if (txt) this.capsEl.firstChild.textContent = txt; } }
      return this;
    }
    // ---- what tools/check.mjs and tools/shots.mjs read
    visible(n) { if (!(n.op > 0.02)) return false; for (let p = n.parent; p; p = p.parent) { if (p instanceof Node && !(p.op > 0.02)) return false; } const sc = this.sceneOf(n); return !sc || sc.op > 0.5; }
    sceneOf(n) { let p = n; while (p && p instanceof Node) p = p.parent; return this.scenes.find(s => s.world === p || s.hud === p) || null; }
    inspect() {
      const s = stageEl.getBoundingClientRect(), k = W / s.width, out = [];
      for (const n of this.nodes) {
        if (!this.visible(n)) continue;
        const isText = n.kind === "text" || n.kind === "number" || n.kind === "tex";
        const els = isText ? [n.el] : (n.label && n.label.textContent.trim() ? [n.label] : []);
        for (const el of els) {
          const txt = el.textContent.trim(); if (!txt) continue;
          const range = document.createRange(); range.selectNodeContents(el);
          const r = range.getBoundingClientRect(), er = el.getBoundingClientRect(), cs = getComputedStyle(el);
          const sc = er.width / (parseFloat(cs.width) || el.offsetWidth || 1);
          const top = el === n.el ? er.top : r.top, hgt = el === n.el ? er.height : r.height;    // a text's own line box; a label's inked text
          let op = 1; for (let e = el; e && e !== stageEl; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity);
          let bg = null; for (let p = n; p instanceof Node && !bg; p = p.parent) if (p.kind === "box" || p.kind === "circle") { const f = rgba(p.val("fill", this.t)); if (f[3] > 0.5) bg = f; }
          if (!bg && el.closest(".code")) bg = rgba("panel");
          let inCode = !!el.closest(".code"), inAxes = false; for (let p = n.parent; p instanceof Node; p = p.parent) if (p.kind === "axes") inAxes = true;
          out.push({ id: n.name(), text: txt.replace(/\s+/g, " ").slice(0, 60), words: txt.split(/\s+/).filter(w => /[A-Za-z]{2}/.test(w)).length,
            x: (r.left - s.left) * k, y: (top - s.top) * k, w: r.width * k, h: hgt * k, px: parseFloat(cs.fontSize) * sc * k, weight: +cs.fontWeight || 400,
            color: rgba(cs.color), bg: bg || rgba("bg"), opacity: op, settled: n.p >= 0.99, kind: n.kind, overlap: n.overlap, label: el !== n.el, inCode, inAxes, mono: /mono/i.test(cs.fontFamily),
            chars: [...new Set(txt)].filter(c => !inLatin(c.codePointAt(0))).join("") });
        }
      }
      return out;
    }
    strokes() {                                        // points along every visible line, arrow and path (to find lines that cross text)
      const s = stageEl.getBoundingClientRect(), k = W / s.width, out = [];
      for (const n of this.nodes) {
        if (!n.pathEl || n.overlap || !this.visible(n) || n.p < 0.99 || n.op < 0.5 || !n._len) continue;
        const m = n.pathEl.getScreenCTM(), pts = [], steps = Math.max(8, Math.ceil(n._len / 12));
        for (let i = 0; i <= steps; i++) { const q = n.pathEl.getPointAtLength(n._len * i / steps); pts.push([(m.a * q.x + m.c * q.y + m.e - s.left) * k, (m.b * q.x + m.d * q.y + m.f - s.top) * k]); }
        out.push({ id: n.name(), kind: n.kind, pts });
      }
      return out;
    }
    clipped() {                                        // code lines wider than their panel (the panel cuts them off)
      const out = [];
      for (const n of this.nodes) if (n.kind === "code") [...n.el.querySelectorAll(".ln")].forEach((r, i) => { const src = r.querySelector(".src"), over = Math.ceil(src.getBoundingClientRect().right - n.el.getBoundingClientRect().right + 20);
        if (over > 0) out.push({ id: n.name(), line: i + 1, over, text: src.textContent.trim().slice(0, 40) }); });
      return out;
    }
    usage() {                                          // how much of the frame the scenes' content occupies, on a 20 px grid
      const s = stageEl.getBoundingClientRect(), k = W / s.width, GW = W / 20, GH = H / 20, grid = new Uint8Array(GW * GH);
      const mark = (x0, y0, x1, y1) => { for (let gy = Math.max(0, Math.floor(y0 / 20)); gy <= Math.min(GH - 1, Math.floor((y1 - 0.01) / 20)); gy++) for (let gx = Math.max(0, Math.floor(x0 / 20)); gx <= Math.min(GW - 1, Math.floor((x1 - 0.01) / 20)); gx++) grid[gy * GW + gx] = 1; };
      for (const n of this.nodes) {
        if (!this.sceneOf(n) || !this.visible(n) || n.op < 0.25 || n.kind === "group" || n.kind === "axes") continue;
        if (n.pathEl) { if (!n._len) continue; const m = n.pathEl.getScreenCTM(), steps = Math.max(2, Math.ceil(n._len * (n.by === "draw" ? n.p : 1) / 10));
          for (let i = 0; i <= steps; i++) { const q = n.pathEl.getPointAtLength(n._len * (n.by === "draw" ? n.p : 1) * i / steps), x = (m.a * q.x + m.c * q.y + m.e - s.left) * k, y = (m.b * q.x + m.d * q.y + m.f - s.top) * k; mark(x - 2, y - 2, x + 2, y + 2); } continue; }
        let r;
        if (n.kind === "text" || n.kind === "number" || n.kind === "tex") { const range = document.createRange(); range.selectNodeContents(n.el); r = range.getBoundingClientRect(); }
        else r = n.el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) mark((r.left - s.left) * k, (r.top - s.top) * k, (r.right - s.left) * k, (r.bottom - s.top) * k);
      }
      let used = 0, top = GH, bottom = -1;
      for (let i = 0; i < grid.length; i++) if (grid[i]) { used++; const gy = Math.floor(i / GW); if (gy < top) top = gy; if (gy > bottom) bottom = gy; }
      return { used: used / grid.length, top: top * 20, bottom: (bottom + 1) * 20 };
    }
    signature() {
      let s = "";
      for (const n of this.nodes) if (this.visible(n)) s += n.kind === "canvas" ? n.el.toDataURL().length + ":" + n.el.toDataURL().slice(-64) : Object.values(n._w).join("|");
      for (const sc of this.scenes) s += sc.world.el.style.transform + sc.el.style.opacity;
      let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
      return h;
    }
    events() {                                         // every entrance, for the review tools
      const out = [];
      for (const n of this.nodes) { const sc = this.sceneOf(n), isText = n.kind === "text" || n.kind === "number";
        n.shows.forEach((s, i) => { const off = n.hides.find(h => h > s.t) ?? (sc ? sc.end : this.duration);
          out.push({ t: s.t, dur: s.dur, off, id: n.name(), kind: n.kind, words: isText ? n.el.textContent.split(/\s+/).filter(w => /[A-Za-z]{2}/.test(w)).length : 0, by: n.by }); }); }
      return out.sort((a, b) => a.t - b.t);
    }
    beats() {                                          // the moments something starts to change, merged within 0.35 s
      const ts = [];
      for (const n of this.nodes) { n.shows.forEach(s => ts.push(s.t)); n.hides.forEach(h => ts.push(h)); for (const k in n.tracks) n.tracks[k].keys.forEach(q => ts.push(q.t)); n._dim.keys.forEach(q => ts.push(q.t)); }
      for (const s of this.scenes) for (const k of ["x", "y", "zoom"]) s.cam[k].keys.forEach(q => ts.push(q.t));
      for (const v of this.values) v.keys.forEach(q => ts.push(q.t));
      ts.sort((a, b) => a - b);
      const out = []; for (const t of ts) if (!out.length || t - out[out.length - 1] > 0.35) out.push(t);
      return out;
    }
    wordsAt(t, span = 4) {                              // what the narrator is saying around t
      for (const p of this.paras) if (t >= p.voiceStart - 0.3 && t <= p.voiceEnd + 0.3) {
        let i = p.words.findIndex(w => p.voiceStart + w.e >= t); if (i < 0) i = p.words.length - 1;
        return p.words.slice(Math.max(0, i - span), i).map(w => w.w).join(" ") + " [" + p.words[i].w + "] " + p.words.slice(i + 1, i + 1 + span).map(w => w.w).join(" ");
      }
      return "";
    }
  }

  // ---------------------------------------------------------------- start-up and the preview player
  const Stage = (window.Stage = { M, EASE, SIZES, W, H, FORMAT, PORT, AREA, clamp, lerp });
  // a seeded random source: const r = Stage.rng(7); r() -> 0..1. Math.random would make two renders differ.
  Stage.rng = seed => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // n cells across a width: Stage.cols(4, { x: 120, w: 1680, gap: 40 }) -> [{ x, w, cx }, ...]
  Stage.cols = (n, o = {}) => { const x = o.x ?? AREA.x, w = o.w ?? AREA.w, gap = o.gap ?? 40, cw = (w - gap * (n - 1)) / n; return Array.from({ length: n }, (_, i) => ({ x: x + i * (cw + gap), w: cw, cx: x + i * (cw + gap) + cw / 2 })); };
  // stagger a list: Stage.each(nodes, t, (node, t) => node.show(t)) starts each 0.08 s after the one before
  Stage.each = (list, t, fn, gap = M.stagger) => { list.forEach((n, i) => fn(n, t + i * gap, i)); return list; };

  // Stage.film({ look: "paper" }, film => { ...build the film... })
  Stage.film = function (o, build) {
    if (typeof o === "function") { build = o; o = {}; }
    const q = new URLSearchParams(location.search), render = q.has("render");
    stageEl = document.getElementById("stage") || document.body.appendChild(Object.assign(document.createElement("div"), { id: "stage" }));
    stageEl.dataset.look = q.get("look") || o.look || "paper";
    stageEl.dataset.format = FORMAT; stageEl.style.setProperty("--W", W + "px"); stageEl.style.setProperty("--H", H + "px");
    probe = document.createElement("div"); probe.style.display = "none"; stageEl.appendChild(probe);
    const ready = (async () => {
      const fails = [];
      await Promise.all([...document.fonts].map(f => f.load().catch(() => fails.push(f.family))));
      if (!window.TIMING) { stageEl.innerHTML = '<div style="padding:80px;font:32px monospace;color:#f33">data/timing.js is missing: run  node tools/clock.mjs</div>'; throw new Error("no TIMING"); }
      const film = new Film(o);
      window.__film = film; film.ready = ready;
      fails.forEach(f => film.problem("font did not load: " + f));
      try { build(film); } catch (e) { film.problem("film.html threw: " + (e && e.message)); console.error(e); }
      for (const n of film.nodes) if (n.el.id === "" && n.id) n.el.dataset.id = n.id;
      await Promise.all(film.waits);
      if ((q.get("captions") === "1" || o.captions) && window.CAPS) film.caps = window.CAPS;
      film.seek(+q.get("t") || 0);
      if (!render) player(film, q);
      return film;
    })();
    window.__ready = ready;
    return ready;
  };

  function player(film, q) {
    const bar = document.createElement("div"); bar.id = "player";
    bar.innerHTML = `<button id="pp" title="space">&#9654;</button><div class="bar"><i></i><b></b></div><div class="ww"></div><div class="tm"></div>`;
    document.body.appendChild(bar);
    const track = bar.querySelector(".bar"), fillEl = track.querySelector("b"), tm = bar.querySelector(".tm"), ww = bar.querySelector(".ww"), pp = bar.querySelector("#pp");
    film.paras.forEach(p => { const u = document.createElement("u"); u.style.left = (p.start / film.duration * 100) + "%"; track.appendChild(u); const s = document.createElement("s"); s.style.left = (p.start / film.duration * 100) + "%"; s.textContent = p.n; track.appendChild(s); });
    const fit = () => { const k = Math.min(innerWidth / W, (innerHeight - 56) / H); stageEl.style.transform = `scale(${k})`; stageEl.style.left = (innerWidth - W * k) / 2 + "px"; };
    addEventListener("resize", fit); fit();
    const audio = new Audio("assets/audio/mix.wav"); let hasAudio = false; audio.addEventListener("canplay", () => (hasAudio = true)); audio.addEventListener("error", () => (hasAudio = false));
    let playing = false, t0 = 0, c0 = 0;
    const fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, "0")}`;
    const draw = () => { fillEl.style.width = (film.t / film.duration * 100) + "%"; tm.textContent = `${fmt(film.t)} / ${fmt(film.duration)}`; ww.textContent = film.wordsAt(film.t, 3); };
    const go = t => { film.seek(t); if (hasAudio) audio.currentTime = film.t; t0 = film.t; c0 = performance.now(); draw(); };
    const tick = () => { if (!playing) return; const t = hasAudio && !audio.paused ? audio.currentTime : t0 + (performance.now() - c0) / 1000;
      if (t >= film.duration) { playing = false; pp.innerHTML = "&#9654;"; audio.pause(); film.seek(film.duration); draw(); return; } film.seek(t); draw(); requestAnimationFrame(tick); };
    const toggle = () => { playing = !playing; pp.innerHTML = playing ? "&#10073;&#10073;" : "&#9654;"; if (playing) { if (film.t >= film.duration - 0.05) go(0); t0 = film.t; c0 = performance.now(); if (hasAudio) { audio.currentTime = film.t; audio.play().catch(() => (hasAudio = false)); } tick(); } else audio.pause(); };
    pp.onclick = toggle;
    const scrub = e => { const r = track.getBoundingClientRect(); go(clamp((e.clientX - r.left) / r.width) * film.duration); };
    track.onmousedown = e => { scrub(e); const mv = e2 => scrub(e2); addEventListener("mousemove", mv); addEventListener("mouseup", () => removeEventListener("mousemove", mv), { once: true }); };
    addEventListener("keydown", e => { if (e.code === "Space") { e.preventDefault(); toggle(); } else if (e.code === "ArrowRight") go(film.t + (e.shiftKey ? 1 : 1 / film.fps)); else if (e.code === "ArrowLeft") go(film.t - (e.shiftKey ? 1 : 1 / film.fps));
      else if (e.code === "KeyV") { q.set("format", PORT ? "16x9" : "9x16"); q.set("t", film.t.toFixed(2)); location.search = q.toString(); } });   // V: the other frame
    draw();
  }
})();
