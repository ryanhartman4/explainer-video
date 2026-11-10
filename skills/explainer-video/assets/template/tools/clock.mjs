// clock.mjs: lay the narration on the clock and write video/data/timing.js (window.TIMING), then the captions.
//   node tools/clock.mjs
// Each "## N. Title" paragraph of SCRIPT.md gets a start, a voice start and word times. Word times come from the take
// in narration/audio/final/sNN.json (or narration/audio/sNN.json before post-processing). A paragraph with no take
// yet gets placeholder word times at a normal speaking pace, so the film can be built and checked before the voice
// exists; rerun this after recording and every cue in film.html retimes itself.
// Settings (silences, the beat grid, the placeholder pace): film.config.json, described in tools/lib/pace.mjs.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, scenes } from "../narration/script.mjs";
import { C, placeholder, layout } from "./lib/pace.mjs";

const V = join(ROOT, "video");
const probe = f => +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim();

mkdirSync(join(V, "assets/audio"), { recursive: true });
mkdirSync(join(V, "data"), { recursive: true });
const list = scenes();
if (!list.length) { console.error('SCRIPT.md has no narration: paragraphs are "## 1. Title" headings followed by "> " lines'); process.exit(1); }
let real = 0;
const takes = list.map(sc => {
  const id = `s${String(sc.n).padStart(2, "0")}`;
  const src = [join(ROOT, "narration/audio/final", id), join(ROOT, "narration/audio", id)].find(p => existsSync(`${p}.json`) && existsSync(`${p}.mp3`));
  let words, audio = null, media = null;
  if (src) {
    words = JSON.parse(readFileSync(`${src}.json`, "utf8")).words.map(w => ({ w: w.word, s: w.start, e: w.end }));
    audio = `assets/audio/${id}.mp3`;
    copyFileSync(`${src}.mp3`, join(V, audio));
    media = probe(`${src}.mp3`);
    real++;
  } else words = placeholder(sc.text);
  return { n: sc.n, id, title: sc.title, audio, media, words };
});
const L = layout(takes);
const out = takes.map((t, i) => { const p = L.paras[i]; return { n: t.n, id: t.id, title: t.title, start: +p.start.toFixed(4), vo: +p.vo.toFixed(4), lead: +(p.vo - p.start).toFixed(4),
  speech: +p.speech.toFixed(3), dur: +(p.end - p.start).toFixed(4), audio: t.audio, media: t.media, words: t.words }; });
const total = +L.total.toFixed(4);
writeFileSync(join(V, "data/timing.js"), "window.TIMING = " + JSON.stringify({ total, bpm: C.bpm, placeholder: real < out.length, scenes: out }) + ";\n");

const mm = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
const nwords = out.reduce((a, s) => a + s.words.length, 0);
console.log(`${out.length} paragraphs, ${nwords} words, ${real} with a recorded voice${real < out.length ? " (the rest on placeholder timing)" : ""}, total ${mm(total)}`);
for (const s of out) console.log(`  p${s.n} ${s.title.slice(0, 24).padEnd(24)} ${mm(s.start).padStart(6)} to ${mm(s.start + s.dur).padStart(6)}   voice ${s.speech.toFixed(1).padStart(5)} s   ${s.words.length} words`);
await import("./captions.mjs");                                  // captions always follow the clock
