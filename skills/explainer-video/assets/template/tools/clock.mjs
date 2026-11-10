// clock.mjs: lay the narration on the clock and write video/data/timing.js (window.TIMING), then the captions.
//   node tools/clock.mjs
// Each "## N. Title" paragraph of SCRIPT.md gets a start, a voice start and word times. Word times come from the take
// in narration/audio/final/sNN.json (or narration/audio/sNN.json before post-processing). A paragraph with no take
// yet gets placeholder word times at a normal speaking pace, so the film can be built and checked before the voice
// exists; rerun this after recording and every cue in film.html retimes itself.
// Settings: film.config.json at the project root (all optional):
//   { "lead": 0.6, "tail": 0.5, "first": 0.8, "end": 3.0, "bpm": 72, "pad": { "3": 1.5 }, "pace": 2.75 }
//   lead/tail: silence before/after each paragraph's voice.  first: seconds of opening frame before the first word.
//   end: seconds after the last word.  bpm: voices start on the music's beats (null turns the grid off).
//   pad: extra seconds before a paragraph, where the picture needs room.  pace: placeholder words per second.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, scenes, say } from "../narration/script.mjs";

const cfgFile = join(ROOT, "film.config.json");
const C = { lead: 0.6, tail: 0.5, first: 0.8, end: 3.0, bpm: 72, pad: {}, pace: 2.75, ...(existsSync(cfgFile) ? JSON.parse(readFileSync(cfgFile, "utf8")) : {}) };
const COMMA = 0.25, STOP = 0.45;
const V = join(ROOT, "video");
const nextBeat = t => (C.bpm ? (Math.ceil((t * C.bpm) / 60 - 1e-6) * 60) / C.bpm : t);   // from absolute time, never summed
const probe = f => +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim();

function placeholder(text) {
  let t = 0;
  return say(text).split(/\s+/).filter(Boolean).map(w => {
    const s = t; t += 1 / C.pace;
    const e = t; t += /[.?!:]["”]?$/.test(w) ? STOP : /[,;]$/.test(w) ? COMMA : 0;
    return { w, s: +s.toFixed(3), e: +e.toFixed(3) };
  });
}

mkdirSync(join(V, "assets/audio"), { recursive: true });
mkdirSync(join(V, "data"), { recursive: true });
const list = scenes();
if (!list.length) { console.error('SCRIPT.md has no narration: paragraphs are "## 1. Title" headings followed by "> " lines'); process.exit(1); }
let cursor = 0, real = 0;
const out = list.map((sc, i) => {
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
  const speech = words.at(-1).e;
  const start = cursor;
  const vo = nextBeat(start + (i === 0 ? C.first : C.lead) + (C.pad[sc.n] || 0));
  const last = i === list.length - 1;
  const end = last ? nextBeat(vo + speech + C.end) : vo + speech + C.tail;
  cursor = end;
  return { n: sc.n, id, title: sc.title, start: +start.toFixed(4), vo: +vo.toFixed(4), lead: +(vo - start).toFixed(4), speech: +speech.toFixed(3),
           dur: +(end - start).toFixed(4), audio, media, words };
});
const total = +cursor.toFixed(4);
writeFileSync(join(V, "data/timing.js"), "window.TIMING = " + JSON.stringify({ total, bpm: C.bpm, placeholder: real < out.length, scenes: out }) + ";\n");

const mm = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
const nwords = out.reduce((a, s) => a + s.words.length, 0);
console.log(`${out.length} paragraphs, ${nwords} words, ${real} with a recorded voice${real < out.length ? " (the rest on placeholder timing)" : ""}, total ${mm(total)}`);
for (const s of out) console.log(`  p${s.n} ${s.title.slice(0, 24).padEnd(24)} ${mm(s.start).padStart(6)} to ${mm(s.start + s.dur).padStart(6)}   voice ${s.speech.toFixed(1).padStart(5)} s   ${s.words.length} words`);
await import("./captions.mjs");                                  // captions always follow the clock
