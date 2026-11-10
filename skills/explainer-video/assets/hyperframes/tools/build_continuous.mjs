// build_continuous.mjs (film 5; copy it to tools/build.mjs for a film that never cuts): lay the narration on the beat grid and write video/data/timing.js + video/index.html.
//   node tools/build.mjs
// The film is ONE continuous composition (compositions/film.html); the seven narration paragraphs only set its clock.
// Each paragraph's voice starts on a beat (72 BPM: 50 frames at 60 fps), the first beat at least GAP after the
// previous paragraph ends, so every line lands on the music's grid. Beats come from absolute time (60 i / BPM).
// Voice from narration/audio/final/sNN.{mp3,json} (or narration/audio/sNN.* before post-processing); a paragraph
// without a take gets placeholder word times, so the picture can be built before the voice.
// Scene fields (TIMING.scenes[i]): start = voice start - lead, so K.at(n, word) = start + K.cue(n, word) is root time.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, scenes, say } from "../narration/script.mjs";

const BPM = 72, BEAT = 60 / BPM;
const beatAt = i => (i * 60) / BPM;
const nextBeat = t => beatAt(Math.ceil((t * BPM) / 60 - 1e-6));
const FIRST = 0.8;                   // seconds of poster before the first word (frame 0 is the X preview)
const GAP = 0.45;                    // at least this much silence between paragraphs
const LEAD = 0.7;                    // a scene's lead: cue times are measured from voice start - LEAD
// extra beats of silence before a paragraph, where the picture needs room (paragraph n: beats)
const PAD = {};                    // film 5 used { 2: 2, 6: 1, 7: 1 }
// paragraphs whose voice starts on a bar line (4 beats): their first word fires a layout change
const ON_BAR = new Set();          // film 5: new Set([2]) (the axis stood up on paragraph 2's first word)
const nextBar = t => beatAt(4 * Math.ceil((t * BPM) / 240 - 1e-6));
const END = 4.5;                     // after the last word: end card, Claw'd turns to the viewer, fade
const PACE = 2.75, COMMA = 0.25, STOP = 0.45;    // placeholder: words per second, pause after , and .
const V = join(ROOT, "video");
const probe = f => +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim();

function placeholder(text) {
  let t = 0;
  return say(text).split(/\s+/).map(w => {
    const s = t; t += 1 / PACE;
    const e = t; t += /[.?!:]$/.test(w) ? STOP : /[,;]$/.test(w) ? COMMA : 0;
    return { w, s: +s.toFixed(3), e: +e.toFixed(3) };
  });
}

mkdirSync(join(V, "assets/audio"), { recursive: true });
let cursor = FIRST, real = 0;
const out = scenes().map(sc => {
  const id = `s${String(sc.n).padStart(2, "0")}`;
  const src = [join(ROOT, "narration/audio/final", id), join(ROOT, "narration/audio", id)].find(p => existsSync(`${p}.json`));
  let words, audio = null, media = null;
  if (src) {
    words = JSON.parse(readFileSync(`${src}.json`, "utf8")).words.map(w => ({ w: w.word, s: w.start, e: w.end }));
    audio = `assets/audio/${id}.mp3`;
    copyFileSync(`${src}.mp3`, join(V, audio));
    media = probe(`${src}.mp3`);
    real++;
  } else words = placeholder(sc.text);
  const speech = words.at(-1).e;
  const after = cursor + (PAD[sc.n] || 0) * BEAT;
  const vo = ON_BAR.has(sc.n) ? nextBar(after) : nextBeat(after);  // voice start, on a beat (or a bar)
  cursor = vo + speech + GAP;
  return { n: sc.n, id, title: sc.title, vo: +vo.toFixed(4), start: +(vo - LEAD).toFixed(4), lead: LEAD,
           speech: +speech.toFixed(3), audio, media, words };
});
for (let i = 0; i < out.length; i++) {                               // a scene runs until the next one's voice
  const end = i + 1 < out.length ? out[i + 1].vo : out[i].vo + out[i].speech + END;
  out[i].dur = +(end - out[i].start).toFixed(3);
}
const last = out.at(-1);
const total = +nextBeat(last.vo + last.speech + END).toFixed(4);
writeFileSync(join(V, "data/timing.js"), "window.TIMING = " + JSON.stringify({ total, bpm: BPM, placeholder: real < out.length, scenes: out }) + ";\n");

// music: up for the poster, down under the whole narration (the gaps are too short to lift between), a swell at the end
const music = existsSync(join(V, "assets/audio/music.wav"));
const hits = existsSync(join(V, "assets/audio/hits.wav"));
const v0 = out[0].vo, vEnd = last.vo + last.speech;
const pts = [{ t: 0, v: 0.5 }, { t: +(v0 - 0.45).toFixed(2), v: 0.42 }, { t: +(v0 - 0.05).toFixed(2), v: 0.13 }];
for (let i = 0; i + 1 < out.length; i++) {                           // lift only in a gap of 2 s or more
  const a = out[i].vo + out[i].speech, b = out[i + 1].vo;
  if (b - a >= 2) pts.push({ t: +(a + 0.2).toFixed(2), v: 0.13 }, { t: +(a + 0.8).toFixed(2), v: 0.3 }, { t: +(b - 0.5).toFixed(2), v: 0.3 }, { t: +(b - 0.05).toFixed(2), v: 0.13 });
}
pts.push({ t: +(vEnd + 0.15).toFixed(2), v: 0.13 }, { t: +(vEnd + 1.2).toFixed(2), v: 0.45 }, { t: +(total - 0.4).toFixed(2), v: 0.3 }, { t: total, v: 0 });
const automation = JSON.stringify({ version: 1, lanes: [{ target: "volume", points: pts }] }).replace(/"/g, "&quot;");

const f = x => x.toFixed(3);
const html = `<!doctype html>
<!-- generated by tools/build.mjs: edit compositions/film.html, not this file -->
<html lang="en" data-composition-variables='[{"id":"captions","type":"boolean","label":"Burn in captions (X cut)","default":false}]'>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <link rel="stylesheet" href="lib/fl.css" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: var(--canvas); }
      #root { position: relative; width: 1920px; height: 1080px; background: var(--canvas); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${f(total)}" data-width="1920" data-height="1080">
      <div id="film" class="clip" data-composition-id="film" data-composition-src="compositions/film.html" data-start="0" data-duration="${f(total)}" data-track-index="1" data-width="1920" data-height="1080"></div>
${out.filter(s => s.audio).map(s => `      <audio id="vo-${s.id}" src="${s.audio}" data-start="${f(s.vo)}" data-duration="${f(s.media)}" data-track-index="3" data-volume="1"></audio>`).join("\n")}
${music ? `      <audio id="music" src="assets/audio/music.wav" data-start="0" data-duration="${f(total)}" data-track-index="4" data-volume="1" data-automation="${automation}"></audio>` : "      <!-- music: assets/audio/music.wav not made yet -->"}
${hits ? `      <audio id="hits" src="assets/audio/hits.wav" data-start="0" data-duration="${f(total)}" data-track-index="5" data-volume="1"></audio>` : "      <!-- hits: assets/audio/hits.wav not made yet (tools/hits.mjs, then tools/make_hits.py) -->"}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
      // the film reads this: render --variables '{"captions":true}' for the X cut
      window.__FILM_VARS = (window.__hyperframes && window.__hyperframes.getVariables && window.__hyperframes.getVariables()) || {};
    </script>
  </body>
</html>
`;
writeFileSync(join(V, "index.html"), html);
console.log(`${out.length} paragraphs, ${real} with narration, total ${Math.floor(total / 60)}:${(total % 60).toFixed(2).padStart(5, "0")} (${Math.round(total * 60)} frames)`);
for (const s of out) console.log(`  ${s.id} ${s.title.padEnd(16)} voice ${f(s.vo).padStart(7)} (beat ${Math.round(s.vo / BEAT)})  speech ${f(s.speech)}`);
