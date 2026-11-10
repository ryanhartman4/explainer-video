// check.mjs: the mechanical review. It steps through the film twice a second and reports what a careful viewer would
// trip over, with the time and the element, so each line is something to fix. It cannot judge whether the film is clear or
// good-looking: that is what the contact sheets (tools/shots.mjs) and your eyes are for.
//   node tools/check.mjs            exit 1 when there is an ERROR
//   node tools/check.mjs --captions also keep text out of the caption strip (for a cut with burned-in captions)
//   node tools/check.mjs --json     the same as JSON
//   node tools/check.mjs --format 9x16   one cut only. With no --format it checks every cut the film lists in
//                                   film.config.json "formats" (16x9 alone unless a vertical cut was planned)
// ERROR  missing cue words, script errors, fonts that did not load, text off the frame, text on top of text,
//        text too small to read, text without contrast
// WARN   nothing moving for too long, a blank frame, too many words on screen, a sentence on screen, text shown too
//        briefly to read, many things entering in the same instant, characters the bundled fonts do not have
import { ROOT, serve, launch, openFilm, seek, args, formats } from "./lib/browser.mjs";

const A = args();
// text must stay inside this: some players crop the outer 2.5%, and a phone app covers the top and bottom of a vertical cut
const safeFor = f => (f === "9x16" ? { l: 48, t: 150, r: 1032, b: A.captions ? 1400 : 1560 } : { l: 48, t: 40, r: 1872, b: A.captions ? 956 : 1040 });
const MIN_PX = 24, WARN_PX = 26;                         // 24 px at 1080p is the floor; under 28 is hard on a phone
const STEP = 0.5;
const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const over = (fg, bg) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
const contrast = (fg, bg) => { const a = lum(over(fg, bg)), b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
const mm = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;

const srv = await serve(), browser = await launch(), cuts = formats(A), reports = [];
try {
 for (const format of cuts) {
  const SAFE = safeFor(format);
  const found = new Map();                                // message -> { level, first, last, count }
  const add = (level, t, key, msg) => { const f = found.get(key); if (f) { f.last = t; f.count++; } else found.set(key, { level, first: t, last: t, count: 1, msg }); };
  const { page, info } = await openFilm(browser, srv.url, { look: A.look, format });
  if (!info.ok) { console.log("ERROR  the film did not build: " + info.error); process.exit(1); }
  const FW = info.W || 1920, FH = info.H || 1080, AR = info.area;
  for (const p of info.problems) add("ERROR", 0, "p:" + p, p);
  for (const e of info.errors) add("ERROR", 0, "e:" + e, "script error: " + e);
  const paraAt = t => info.paras.find(p => t >= p.start && t < p.end) || info.paras.at(-1);
  const speaking = t => info.paras.some(p => t >= p.voiceStart && t <= p.voiceEnd);

  let lastSig = null, stillFrom = 0, blankFrom = null;
  let thin = null;                                      // a stretch where the picture is small or confined to one band of the frame
  const thinMsg = (r, t1) => add("WARN", r.from, "thin:" + r.from, `for ${(t1 - r.from).toFixed(0)} s (${mm(r.from)} to ${mm(t1)}) the picture uses about ${Math.round(100 * r.used / r.n)}% of the frame, between y ${Math.round(r.top / r.n)} and y ${Math.round(r.bottom / r.n)}: small content in a big frame reads as a slide. Enlarge the picture to span the content area (x ${AR.x}..${AR.x + AR.w}, y ${AR.y}..${AR.y + AR.h}; a box that holds a label is 96 px tall or more), or raise the text one size`);
  for (let t = 0; t <= info.duration - 0.2; t += STEP) {
    await seek(page, t);
    const { items, sig, shown, strokes, use } = await page.evaluate(() => ({ items: window.__film.inspect(), sig: window.__film.signature(), strokes: window.__film.strokes(), use: window.__film.usage(), shown: window.__film.nodes.filter(n => window.__film.visible(n)).length }));
    const p = paraAt(t), where = `p${p.n}`;
    // stillness and blank frames
    if (sig !== lastSig) { const from = Math.max(stillFrom, paraAt(stillFrom).voiceStart); if (lastSig !== null && t - from >= 4.5 && speaking(from + 0.5)) add("WARN", from, "still:" + from, `nothing changes for ${(t - from).toFixed(1)} s while the narrator talks (${mm(from)} to ${mm(t)}): cue a change on a word in that stretch (a HOLD is fine for about 4 s, not longer)`); stillFrom = t; lastSig = sig; }
    if (shown === 0 && t > 0.3 && t < info.duration - 1.2) { if (blankFrom == null) blankFrom = t; } else { if (blankFrom != null && t - blankFrom >= 1.5) add("WARN", blankFrom, "blank:" + blankFrom, `the frame is empty for ${(t - blankFrom).toFixed(1)} s`); blankFrom = null; }
    if (t === 0 && shown === 0) add("WARN", 0, "poster", "frame 0 is empty: the first frame is the thumbnail, so open on the title or the key picture already in place");

    // is the frame being used? (small content adrift in a big frame reads as a slide)
    if (speaking(t) && shown > 0 && (use.used < 0.11 || use.bottom - use.top < FH * 0.39)) { thin = thin || { from: t, n: 0, used: 0, top: 0, bottom: 0 }; thin.n++; thin.used += use.used; thin.top += use.top; thin.bottom += use.bottom; }
    else { if (thin && t - thin.from >= 6) thinMsg(thin, t); thin = null; }
    const solid = items.filter(i => i.opacity > 0.9 && i.settled);
    for (const i of items) {
      if (i.opacity < 0.5) continue;
      if (i.x < SAFE.l - 1 || i.y < SAFE.t - 1 || i.x + i.w > SAFE.r + 1 || i.y + i.h > SAFE.b + 1) {
        const zoomed = await page.evaluate(() => window.__film.scenes.some(s => s.op > 0.5 && s.world.el.style.transform));
        const partly = i.x < FW && i.y < FH && i.x + i.w > 0 && i.y + i.h > 0 && (i.x < -2 || i.y < -2 || i.x + i.w > FW + 2 || i.y + i.h > FH + 2);
        if (zoomed && partly) add("WARN", t, "cut:" + i.id, `${where} text ${i.id} is cut by the edge of the frame while the camera is zoomed: put headings and counters on scene.hud (the camera does not move it), or zoom less`);
        if (!zoomed) add("ERROR", t, "off:" + i.id, `${where} text ${i.id} runs off the frame (x ${Math.round(i.x)} to ${Math.round(i.x + i.w)}, y ${Math.round(i.y)} to ${Math.round(i.y + i.h)}; keep text inside ${SAFE.l}..${SAFE.r} by ${SAFE.t}..${SAFE.b}${A.captions ? ", the strip below is for captions" : ""}${format === "9x16" ? "; a phone app covers the rest" : ""})`);
      }
      if (i.chars) add("WARN", t, "chars:" + i.id, `${where} text ${i.id} uses ${[...i.chars].map(c => `"${c}"`).join(" ")}, which the bundled fonts do not have (it falls back to a system font that differs per machine): draw arrows with arrow(), spell out symbols, or use tex()`);
    }
    for (const i of solid) {
      if (i.px < MIN_PX - 0.5) add("ERROR", t, "small:" + i.id, `${where} text ${i.id} is ${i.px.toFixed(0)} px: the floor is ${MIN_PX} px (use size "note" or larger, or zoom the camera in)`);
      else if (i.px < WARN_PX - 0.5 && !i.inAxes && !i.inCode) add("WARN", t, "smallish:" + i.id, `${where} text ${i.id} is ${i.px.toFixed(0)} px: fine on a desktop, hard on a phone (labels a viewer must read: 30 px or more)`);
      const need = i.px >= 32 || (i.px >= 24 && i.weight >= 700) ? 3 : 4.5, c = contrast(i.color, i.bg);
      if (c < need) add("ERROR", t, "contrast:" + i.id, `${where} text ${i.id} has contrast ${c.toFixed(1)}:1 on its background (needs ${need}:1): use ink or a darker/lighter hue`);
      if (i.words > 14 && !i.inCode) add("WARN", t, "sentence:" + i.id, `${where} text ${i.id} is ${i.words} words: the narrator carries sentences, the screen carries labels (8 words or fewer)`);
    }
    // text on text
    for (let a = 0; a < solid.length; a++) for (let b = a + 1; b < solid.length; b++) {
      const A1 = solid[a], B1 = solid[b];
      if (A1.overlap || B1.overlap) continue;
      const w = Math.min(A1.x + A1.w, B1.x + B1.w) - Math.max(A1.x, B1.x), h = Math.min(A1.y + A1.h, B1.y + B1.h) - Math.max(A1.y, B1.y);
      if (w > 4 && h > 4 && (w * h) / Math.min(A1.w * A1.h, B1.w * B1.h) > 0.12) add("ERROR", t, "over:" + A1.id + "|" + B1.id, `${where} text ${A1.id} and text ${B1.id} overlap`);
    }
    // a line or arrow drawn through text
    for (const st of strokes) for (const i of solid) {
      if (i.label || i.overlap) continue;
      const inside = st.pts.filter(q => q[0] > i.x + 3 && q[0] < i.x + i.w - 3 && q[1] > i.y + i.h * 0.18 && q[1] < i.y + i.h * 0.82).length;
      if (inside >= 2) add("ERROR", t, "cross:" + st.id + "|" + i.id, `${where} ${st.kind} ${st.id} runs through text ${i.id}: move the text or bend the ${st.kind}`);
    }
    const words = solid.filter(i => !i.inCode && !i.inAxes).reduce((n, i) => n + i.words, 0);
    if (words > 45) add("WARN", t, "words:" + p.n, `${where} has ${words} words on screen at once: remove what the narrator is no longer talking about, or dim it`);
  }

  if (thin && info.duration - thin.from >= 6) thinMsg(thin, info.duration);
  for (const c of await page.evaluate(() => window.__film.clipped())) add("ERROR", 0, "clip:" + c.id + c.line, `code ${c.id}: line ${c.line} is ${c.over} px wider than its panel and is cut off ("${c.text}"): give code() a larger w, a smaller size, or break the line`);
  // from the timeline itself
  const ev = await page.evaluate(() => window.__film.events());
  for (const e of ev) if (e.words >= 2 && e.kind === "text") { const need = 0.5 + 0.3 * e.words, has = e.off - e.t - e.dur; if (has < need * 0.8) add("WARN", e.t, "brief:" + e.id + e.t, `text ${e.id} is readable for ${Math.max(0, has).toFixed(1)} s; ${e.words} words need about ${need.toFixed(1)} s`); }
  for (let i = 0; i < ev.length; ) { let j = i; while (j < ev.length && ev[j].t - ev[i].t < 0.02) j++; if (j - i >= 5) add("WARN", ev[i].t, "pile:" + ev[i].t.toFixed(2), `${j - i} things enter in the same instant: stagger them with Stage.each(list, t, (n, t) => n.show(t)) or show one group`); i = Math.max(j, i + 1); }

  // the same finding on many like elements (bit0, bit1, ...) is reported once
  const merged = new Map();
  for (const [key, f] of found) {
    const kind = key.split(":")[0], id = key.slice(kind.length + 1), mk = kind + "|" + f.msg.split(id).join("\u0001").replace(/\d+(\.\d+)?/g, "#");
    const g = merged.get(mk);
    if (g && id && kind !== "p" && kind !== "e" && f.msg.includes(id)) { g.ids.push(id); g.first = Math.min(g.first, f.first); g.last = Math.max(g.last, f.last); }
    else merged.set(g ? mk + key : mk, { ...f, ids: [id], id });
  }
  for (const g of merged.values()) if (g.ids.length > 1) g.msg = g.msg.split(g.id).join(g.ids.slice(0, 3).join(", ") + (g.ids.length > 3 ? ` and ${g.ids.length - 3} more like it` : ""));
  const rows = [...merged.values()].sort((a, b) => (a.level < b.level ? -1 : a.level > b.level ? 1 : a.first - b.first));
  const errors = rows.filter(r => r.level === "ERROR").length, warns = rows.length - errors;
  reports.push({ format, duration: info.duration, placeholder: info.placeholder, errors, warnings: warns, findings: rows });
  if (!A.json) {
    if (cuts.length > 1) console.log(`${reports.length > 1 ? "\n" : ""}---- the ${format} cut (${FW} x ${FH}) ----`);
    for (const r of rows) console.log(`${r.level.padEnd(5)}  ${mm(r.first)}${r.last > r.first ? " to " + mm(r.last) : ""}  ${r.msg}`);
    console.log(`\n${errors} errors, ${warns} warnings over ${mm(info.duration)}${info.placeholder ? " (placeholder timing: check again after the voice is recorded)" : ""}.` +
      (errors ? " Fix every ERROR, then run this again." : warns ? " Read each WARN: fix it or be able to say why it is right." : " Clean."));
  }
  await page.close();
 }
  if (A.json) console.log(JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 1));
  process.exitCode = reports.some(r => r.errors) ? 1 : 0;
} finally { await browser.close(); srv.close(); }
