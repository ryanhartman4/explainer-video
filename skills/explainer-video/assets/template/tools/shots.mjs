// shots.mjs: look at the film without rendering it. Writes JPEGs to shots/ and prints their paths; open them and look.
//   node tools/shots.mjs                 one contact sheet per paragraph, a frame at every beat (shots/p01.jpg ...)
//   node tools/shots.mjs 3               only paragraph 3
//   node tools/shots.mjs --film          the whole film on one sheet, 12 frames: the "mute test"
//   node tools/shots.mjs --at 12.4,31    full-size frames at those seconds (shots/at-12.40.jpg): read small text here
//   node tools/shots.mjs --cue "3:fault lines"   a full-size frame 0.6 s after paragraph 3 says "fault lines"
//   options: --captions (draw the burned-in captions), --cols 3
// On a contact sheet each frame is taken 0.6 s after a beat (when the entrance has landed) and is labelled with the
// time and the words being spoken, the word in [brackets] being the one on the narrator's tongue. The picture in each
// frame should show what those words say.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, serve, launch, openFilm, seek, args } from "./lib/browser.mjs";

const A = args(), OUT = join(ROOT, "shots");
mkdirSync(OUT, { recursive: true });
const srv = await serve(), browser = await launch();
try {
  const { page, info } = await openFilm(browser, srv.url, { captions: !!A.captions, look: A.look });
  if (!info.ok) throw new Error("the film did not build: " + info.error);
  const grab = async t => { await seek(page, t); return (await page.screenshot({ type: "jpeg", quality: 90 })).toString("base64"); };
  const label = t => page.evaluate(t => window.__film.wordsAt(t, 4), t);
  const mm = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;

  async function sheet(name, times, title) {
    const cols = +A.cols || 3, cells = [];
    for (const t of times) cells.push({ t, img: await grab(t), words: await label(t) });
    const sp = await browser.newPage({ viewport: { width: 1920, height: 400 } });
    await sp.setContent(`<body style="margin:0;background:#16181c;color:#e6e8eb;font:22px/1.3 ui-monospace,Menlo,monospace">
      <div style="padding:16px 20px 4px;font-size:24px">${title}</div>
      <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:14px;padding:14px 20px 20px">
      ${cells.map(c => `<div><img src="data:image/jpeg;base64,${c.img}" style="width:100%;display:block;border:1px solid #333"><div style="padding:6px 2px 0"><b style="color:#ffcf5c">${mm(c.t)}</b> ${c.words.replace(/</g, "&lt;").replace(/\[(.+?)\]/, '<b style="color:#fff">[$1]</b>')}</div></div>`).join("")}
      </div></body>`);
    const file = join(OUT, name + ".jpg");
    writeFileSync(file, await sp.screenshot({ type: "jpeg", quality: 86, fullPage: true }));
    await sp.close();
    console.log(file);
  }

  if (A.at) {
    for (const t of String(A.at).split(",").map(Number)) { await seek(page, t); const f = join(OUT, `at-${t.toFixed(2)}.jpg`); writeFileSync(f, await page.screenshot({ type: "jpeg", quality: 92 })); console.log(f, " ", await label(t)); }
  } else if (A.cue) {
    const [n, phrase] = String(A.cue).split(/:(.*)/);
    const t = await page.evaluate(([n, phrase]) => window.__film.para(+n).at(phrase) + 0.6, [n, phrase]);
    await seek(page, t); const f = join(OUT, `cue-p${n}-${phrase.replace(/\W+/g, "-")}.jpg`); writeFileSync(f, await page.screenshot({ type: "jpeg", quality: 92 })); console.log(f, " t =", t.toFixed(2));
  } else if (A.film) {
    const n = +A.frames || 12, times = Array.from({ length: n }, (_, i) => +(info.duration * (i + 0.5) / n).toFixed(2));
    await sheet("film", times, `whole film, ${mm(info.duration)}: can you follow the story from these frames alone?`);
  } else {
    const beats = await page.evaluate(() => window.__film.beats());
    const want = A._.map(Number);
    for (const p of info.paras) {
      if (want.length && !want.includes(p.n)) continue;
      let ts = beats.filter(b => b >= p.start - 0.05 && b < p.end - 0.1).map(b => Math.min(b + 0.6, p.end - 0.35));
      ts.unshift(p.start + 0.45); ts.push(p.end - 0.35);                    // how the paragraph opens and how it ends
      ts = ts.filter((t, i) => i === 0 || t - ts[i - 1] > 0.5);
      if (ts.length > 12) { const k = ts.length / 12; ts = Array.from({ length: 12 }, (_, i) => ts[Math.floor(i * k)]); }
      await sheet(`p${String(p.n).padStart(2, "0")}`, ts.map(t => +t.toFixed(2)), `paragraph ${p.n}: ${p.title} (${mm(p.start)} to ${mm(p.end)})${info.placeholder ? " — placeholder timing" : ""}`);
    }
  }
  if (info.problems.length) console.log("PROBLEMS:\n  " + info.problems.join("\n  "));
  if (info.errors.length) console.log("PAGE ERRORS:\n  " + info.errors.slice(0, 5).join("\n  "));
} finally { await browser.close(); srv.close(); }
