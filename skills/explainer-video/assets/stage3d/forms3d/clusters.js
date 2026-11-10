// forms3d/clusters.js: the points gather into labelled knots, group by group: words, nodes of a graph, categories.
//   const cl = G3.lib.clusters({ groups: [{ name: "fruit", color: "green", items: [{ label: "apple", pos: [-6, 1, 0] }, ..] }, ..] });
//   G3.form("mine", cl);  const seg = G3.morph(t, "mine");
// Each item is a small turning knot of points with a dense white core and a soft rim in its group's colour. Each
// group has a faint haze in the same colour around its items. The points left over are a dim dust that fills the
// space, so the knots sit in something. With no options it shows sixteen words in four groups (animals, cities,
// royalty, people), placed by hand.
//
// Options (all optional):
//   groups     the data: [{ name, color, at, items: [{ label, pos: [x, y, z], size, color }] }].
//                name    the group's name, for your own label.
//                color   a look token. Default: green, blue, yellow, purple, accent, red, in turn.
//                at      where the group's name goes, [x, y, z]. Default: 2.3 units above the group's top item.
//                label   the item's name: the key for `highlight` and for cl.item().
//                pos     the centre of the knot, world units. Place your items around the origin.
//                size    1: this knot's radius, as a multiple. A larger knot also takes more points.
//                color   the item's own colour, if it differs from its group's.
//              Anything else you put on a group or an item (a label offset, say) comes back on its anchor.
//   knot       1: the radius of every knot, as a multiple of 1.1 world units.
//   haze       1: the brightness of the group haze. 0 = no haze; its points go to the knots and the dust.
//   hazeSize   1: the reach of the haze, as a multiple. At 1 it fits itself to how far apart the group's items are.
//   dust       1: the brightness of the dust. 0 = no dust; its points go to the knots and the haze.
//   dustColor  the dust's colour, a look token. Default: the points' own white-to-blue dress.
//   extent     the dust cloud's half-sizes, [x, y, z]. Default: 2, 1.4 and 2.1 units past the farthest item on
//              each axis, measured from the origin.
//   share      [0.46, 0.28, 0.26]: the parts of the points that go to knots, haze and dust.
//   highlight  the items to keep lit when the rest is dimmed: labels or item numbers, e.g. ["king", "queen"].
//   dim        how far everything but the highlight is turned down: 0 (not at all) to 1 (fully). Give a number, or
//              a function of local time so it happens on a cue: dim: tl => G3.smooth(4, 4.7, tl).
//              Default: 1 when there is a highlight, else 0.
//   dimTo      0.3: the brightness a dimmed knot falls to. (Haze falls to 0.4 of itself and dust to 0.56.)
//   core       "ink": the colour at the centre of each knot.
//   spin       1: how fast the knots and haze turn, as a multiple.
//   breathe    0.05: how much each knot swells and shrinks.
//
// Local time: the knots turn and breathe for as long as you like. Nothing builds or ends, so no clock is needed.
//   The only thing that follows local time is `dim`, when you give it as a function. With the default clock, local
//   time is seconds since the morph, so to dim on a spoken cue tA after a morph at t0:
//     dim: tl => G3.smooth(tA - t0, tA - t0 + 0.7, tl)
//   Another way to the same picture: register a second form with the same groups and `highlight`, and morph to it
//   with { dur: 0.7, swirl: 0, bloom: 0, clock: t => t - t0 }. The same point belongs to the same knot in both, so
//   only the brightness changes.
//
// For labels and markers (ready as soon as G3.lib.clusters returns, before any frame is drawn):
//   cl.items            every item: { label, pos: [x, y, z], group, index, color, size, lit, ..your own fields }.
//                       `group` is the group's number; `lit` is true when the item is in the highlight.
//   cl.groups           every group: { name, color, at, centre, items: [its items], ..your own fields }.
//   cl.item("king")     one item, by label or number.  cl.pos("king") is its pos.
//   cl.link("king", "queen", seg, t)   -> [a, b]: two places on the frame for an arrow from one knot to the other,
//                       pulled in so the arrow clears both knots. Pass them to G3.line3(ctx, t, a, b, { head: 24 }).
//                       A fifth argument sets the gap, in knot radii (default 0.85).
//   cl.dim(tl)          the dim amount (0 to 1) at local time tl, to fade your labels with the knots:
//                       alpha = it.lit ? 1 : 1 - 0.55 * cl.dim(seg.local(t))
//   cl.role(i)          what point i does: an item's number, or items.length + a group's number for its haze, or
//                       items.length + groups.length for dust. For building a second form that reuses a knot's points.
//   cl.size             [w, h, d]: the box, centred on the origin, that holds every point.
//   All positions are at scale 1, before the morph's at/scale: pass them through seg.world(p, t), where seg is what
//   G3.morph returned. A label reads well 52 px above its knot: G3.text3(ctx, t, it.label, seg.world(it.pos, t), { size: 34, dy: -52 }).
//
// Size: with no options it fits a box 30.7 x 16.1 x 13.5 world units, centred on the origin, facing the rest camera
//   (az 0, el 0, dist 34). The knots themselves stay inside 27.6 x 14.5 x 9.2. With your own groups, read cl.size.
// Point count: tuned at 30,000. At other counts each point's brightness and size adjust, so the picture keeps its light.
// Source: the default layout is an illustration placed by hand, after the word-vector pictures of Mikolov, Yih and
//   Zweig (2013), "Linguistic Regularities in Continuous Space Word Representations". The step from man to woman and
//   the step from king to queen are about 12 degrees apart: close to parallel, as the real vectors are only loosely.
//   Say on screen that the positions are placed by hand.
(function () {
  const G3 = window.G3, TAU = 6.2832;

  // the default example: sixteen words in four groups. dx, dy and align are label offsets (pixels) that ride along:
  // the four words of the analogy carry their labels outside the arrows a film may draw between them.
  const example = () => {
    const plus = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], STEP = [5.4, 1.1, 1.0], STEP2 = [5.2, 2.2, 0.7];
    const man = [-4.2, -3.3, 1.6], king = [-2.4, 2.7, 0.4], boy = [-2.8, -5.8, 2.4];
    const L = { dx: -64, dy: 0, align: "right" }, R = { dx: 64, dy: 0, align: "left" };
    return [
      { name: "animals", color: "green", at: [-10.9, 5.5, 0], items: [{ label: "cat", pos: [-12.4, 2.4, 0.8] }, { label: "dog", pos: [-9.4, 3.2, -0.8] }, { label: "horse", pos: [-9.0, -0.2, -1.0] }, { label: "lion", pos: [-12.2, -1.8, 0.6] }] },
      { name: "cities", color: "blue", at: [10.9, 4.3, 0], items: [{ label: "Paris", pos: [9.2, 1.4, 0.8] }, { label: "Rome", pos: [12.4, 2.0, -0.8] }, { label: "Tokyo", pos: [12.6, -1.8, -1.0] }, { label: "Cairo", pos: [9.6, -2.6, 0.6] }] },
      { name: "royalty", color: "yellow", at: [3.4, 6.3, 0.8], align: "left", items: [{ label: "king", pos: king, ...L }, { label: "queen", pos: plus(king, STEP2), ...R }, { label: "prince", pos: [-4.6, 5.1, -0.4] }, { label: "princess", pos: [0.4, 6.2, 0.4] }] },
      { name: "people", color: "purple", at: [4.6, -5.0, 3.2], align: "left", items: [{ label: "man", pos: man, ...L }, { label: "woman", pos: plus(man, STEP), ...R }, { label: "boy", pos: boy }, { label: "girl", pos: plus(boy, STEP) }] },
    ];
  };

  G3.lib.clusters = (o = {}) => {
    const { hash, lerp, clamp } = G3;
    const knot = o.knot ?? 1, haze = Math.max(0, o.haze ?? 1), hazeSize = o.hazeSize ?? 1, dust = Math.max(0, o.dust ?? 1), spin = o.spin ?? 1, breathe = o.breathe ?? 0.05;
    const dimTo = o.dimTo ?? 0.3, core = o.core || "ink", share = o.share || [0.46, 0.28, 0.26], HUES = ["green", "blue", "yellow", "purple", "accent", "red"];

    // ---- the anchors: plain data, ready before the form is built
    const items = [], groups = [];
    (o.groups || example()).forEach((g, gi) => {
      const color = g.color || HUES[gi % HUES.length], mine = [];
      (g.items || []).forEach(it => {
        if (!Array.isArray(it.pos) || it.pos.length < 3 || !it.pos.every(v => isFinite(v))) throw new Error(`clusters: item "${it.label}" needs pos: [x, y, z]`);
        const a = { ...it, label: it.label ?? "", pos: [+it.pos[0], +it.pos[1], +it.pos[2]], group: gi, index: items.length, color: it.color || color, size: it.size ?? 1, lit: false };
        items.push(a); mine.push(a);
      });
      const c = [0, 0, 0]; mine.forEach(a => a.pos.forEach((v, k) => (c[k] += v / mine.length)));
      const spread = Math.sqrt(mine.reduce((s, a) => s + (a.pos[0] - c[0]) ** 2 + (a.pos[1] - c[1]) ** 2 + (a.pos[2] - c[2]) ** 2, 0) / (mine.length || 1));
      const top = mine.length ? Math.max(...mine.map(a => a.pos[1])) : 0;
      groups.push({ ...g, name: g.name ?? "", color, centre: mine.length ? c : (g.at || c).slice(), at: (g.at || [c[0], top + 2.3, c[2]]).slice(), items: mine, spread });
    });
    const nI = items.length, nG = groups.length;
    const item = k => (typeof k === "number" ? items[k] : items.find(a => a.label === k));
    const need = k => { const a = item(k); if (!a) throw new Error(`clusters: no item ${typeof k === "number" ? "number " + k : `labelled "${k}"`}`); return a; };
    (o.highlight || []).forEach(k => (need(k).lit = true));
    const anyLit = items.some(a => a.lit), dimOpt = o.dim ?? (anyLit ? 1 : 0);
    const dim = typeof dimOpt === "function" ? tl => clamp(+dimOpt(tl) || 0) : (d => () => d)(clamp(+dimOpt || 0));
    const far = k => items.reduce((m, a) => Math.max(m, Math.abs(a.pos[k])), 0), extent = o.extent || [far(0) + 2, far(1) + 1.4, far(2) + 2.1];

    // ---- every point's job, the same at any point count: an item's knot, a group's haze, or dust
    const hz = groups.map(g => (g.items.length ? Math.max(0.5, g.spread / 2.9) * hazeSize : 0));      // the haze reaches as far as the group is spread (2.9 = the example's groups)
    const cum = w => { const s = w.reduce((a, b) => a + b, 0) || 1; let a = 0; return w.map(v => (a += v / s)); };
    const cumI = cum(items.map(a => a.size * a.size)), cumG = cum(hz.map(s => s * s));
    const pick = (c, h) => { let lo = 0, hi = c.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (h < c[m]) hi = m; else lo = m + 1; } return lo; };
    const sK = nI ? Math.max(0, share[0]) : 0, sH = nI && haze > 0 ? Math.max(0, share[1]) : 0, sD = dust > 0 ? Math.max(0, share[2]) : 0;
    const tot = sK + sH + sD || 1, pK = sK / tot, pH = (sK + sH) / tot;                              // with nothing to share, every point is dust
    const role = i => { const r = hash(i, 201); return r < pK ? pick(cumI, hash(i, 202)) : r < pH ? nI + pick(cumG, hash(i, 203)) : nI + nG; };
    const unit = (i, s) => { const z = hash(i, s) * 2 - 1, a = hash(i, s + 1) * TAU, r = Math.sqrt(1 - z * z); return [r * Math.cos(a), r * Math.sin(a), z]; };

    const build = (f, n) => {
      const C = new Float32Array(n * 3), O = new Float32Array(n * 3), R = new Float32Array(n), B = new Float32Array(n * 3), K = new Float32Array(n);
      const ink = G3.rgb(core), dustRgb = o.dustColor ? G3.rgb(o.dustColor) : null;
      // tuned at 30,000 points. With fewer, each point is a little brighter and larger; with more, dimmer and smaller: the same light either way
      const dn = clamp(30000 / n, 0.2, 5), kb = Math.sqrt(dn), ks = Math.pow(dn, 0.25);
      for (let i = 0, j = 0; i < n; i++, j += 3) {
        const ro = role(i), u = unit(i, 210);
        if (ro < nI) {                                                             // a knot: dense core, soft rim
          const w = items[ro], q = Math.pow(hash(i, 212), 1.9), r = (0.06 + 1.05 * q) * knot * w.size, hue = G3.rgb(w.color), hot = Math.pow(1 - q, 3) * 0.7, b = 0.5 + 0.45 * hash(i, 213);
          C[j] = w.pos[0]; C[j + 1] = w.pos[1]; C[j + 2] = w.pos[2]; O[j] = u[0] * r; O[j + 1] = u[1] * r * 0.9; O[j + 2] = u[2] * r;
          R[i] = (0.25 + 0.7 * hash(i, 214)) * (hash(i, 215) < 0.5 ? 1 : -1) * spin;
          B[j] = lerp(hue[0], ink[0], hot) * b; B[j + 1] = lerp(hue[1], ink[1], hot) * b; B[j + 2] = lerp(hue[2], ink[2], hot) * b;
          K[i] = w.lit ? 1 : dimTo; f.size[i] = 0.8 + 0.8 * hash(i, 216) + (hash(i, 217) > 0.985 ? 1.4 : 0);
        } else if (ro < nI + nG) {                                                 // haze: a loose tinted halo around a group
          const g = groups[ro - nI], m = g.centre, r = (0.9 + 2.8 * Math.pow(hash(i, 222), 0.8)) * hz[ro - nI], hue = G3.rgb(g.color), b = (0.3 + 0.3 * hash(i, 223)) * Math.min(haze, 3);
          C[j] = m[0]; C[j + 1] = m[1]; C[j + 2] = m[2]; O[j] = u[0] * r * 1.1; O[j + 1] = u[1] * r * 0.8; O[j + 2] = u[2] * r;
          R[i] = (0.05 + 0.05 * hash(i, 224)) * spin;
          B[j] = hue[0] * b; B[j + 1] = hue[1] * b; B[j + 2] = hue[2] * b; K[i] = 0.4; f.size[i] = 0.6 + 0.6 * hash(i, 226);
        } else {                                                                   // dust: the rest of the space
          const r = Math.cbrt(hash(i, 232)), k = 0.32 * Math.min(dust, 3), d = dustRgb ? 0.5 + 0.5 * hash(i, 233) : 1;
          O[j] = u[0] * r * extent[0]; O[j + 1] = u[1] * r * extent[1]; O[j + 2] = u[2] * r * extent[2]; R[i] = 0.012 * (hash(i, 234) - 0.5) * spin;
          B[j] = (dustRgb ? dustRgb[0] * d : f.col[j]) * k; B[j + 1] = (dustRgb ? dustRgb[1] * d : f.col[j + 1]) * k; B[j + 2] = (dustRgb ? dustRgb[2] * d : f.col[j + 2]) * k;
          K[i] = 0.5625; f.size[i] = 0.5 + 0.5 * hash(i, 236);
        }
        B[j] *= kb; B[j + 1] *= kb; B[j + 2] *= kb; f.size[i] *= ks;
      }
      let painted = -1;                                                            // the dim amount the colours were last written for (the same amount always gives the same colours)
      return (tl, ff) => {
        const d = dim(tl), P = ff.pos, col = ff.col;
        if (d !== painted) { painted = d; for (let i = 0, j = 0; i < n; i++, j += 3) { const k = 1 + (K[i] - 1) * d; col[j] = B[j] * k; col[j + 1] = B[j + 1] * k; col[j + 2] = B[j + 2] * k; } }
        for (let i = 0, j = 0; i < n; i++, j += 3) {
          const a = R[i] * tl, c = Math.cos(a), s = Math.sin(a), b = 1 + breathe * Math.sin(tl * 1.1 + i * 0.37);
          P[j] = C[j] + (O[j] * c + O[j + 2] * s) * b; P[j + 1] = C[j + 1] + O[j + 1] * b; P[j + 2] = C[j + 2] + (-O[j] * s + O[j + 2] * c) * b;
        }
      };
    };

    // ---- what a film needs to draw its own labels and arrows
    build.items = items; build.groups = groups; build.item = item; build.pos = k => need(k).pos; build.dim = dim; build.role = role;
    const br = 1 + Math.abs(breathe), sq = [1.1, 0.8, 1], kq = [1, 0.9, 1];
    build.size = [0, 1, 2].map(k => +(2 * Math.max(sD ? extent[k] * br : 0, ...items.map(a => Math.abs(a.pos[k]) + 1.11 * knot * a.size * kq[k] * br), ...(sH ? groups.map((g, i) => (hz[i] ? Math.abs(g.centre[k]) + 3.7 * hz[i] * sq[k] * br : 0)) : [0]))).toFixed(2));
    build.link = (a, b, seg, t, gap = 0.85) => {
      const A = need(a), Bq = need(b), wa = seg ? seg.world(A.pos, t) : A.pos, wb = seg ? seg.world(Bq.pos, t) : Bq.pos, sc = seg ? seg.scale : 1;
      const p = G3.project(wa, t), q = G3.project(wb, t), d = Math.hypot(q.x - p.x, q.y - p.y) || 1, ux = (q.x - p.x) / d, uy = (q.y - p.y) / d;
      const ga = Math.min(d * 0.45, gap * 1.11 * knot * A.size * sc * G3.pxPerUnit(wa, t)), gb = Math.min(d * 0.45, gap * 1.11 * knot * Bq.size * sc * G3.pxPerUnit(wb, t));
      return [{ x: p.x + ux * ga, y: p.y + uy * ga, ok: p.ok }, { x: q.x - ux * gb, y: q.y - uy * gb, ok: q.ok }];
    };
    return build;
  };
})();
