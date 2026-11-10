// pace.mjs: one place that turns narration into time, shared by clock.mjs (the real clock) and script_check.mjs (the
// estimate), so the two always agree.
// Settings: film.config.json at the project root (all optional):
//   { "lead": 0.6, "tail": 0.5, "first": 0.8, "end": 3.0, "bpm": 72, "pad": { "3": 1.5 }, "pace": 3.0 }
//   lead/tail: silence before/after each paragraph's voice.  first: seconds of opening frame before the first word.
//   end: seconds after the last word.  bpm: voices start on the music's beats (null turns the grid off).
//   pad: extra seconds before a paragraph, where the picture needs room.
//   pace: placeholder words per second inside a sentence. With the pauses after commas and sentences this comes to
//   about 2.6 words a second of speech (155 words a minute, what films 1 to 5 measured), and about 2.2 words per
//   second of finished film once the silences around paragraphs are counted.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, say } from "../../narration/script.mjs";

const cfgFile = join(ROOT, "film.config.json");
export const C = { lead: 0.6, tail: 0.5, first: 0.8, end: 3.0, bpm: 72, pad: {}, pace: 3.0, ...(existsSync(cfgFile) ? JSON.parse(readFileSync(cfgFile, "utf8")) : {}) };
const COMMA = 0.25, STOP = 0.42;
export const nextBeat = t => (C.bpm ? (Math.ceil((t * C.bpm) / 60 - 1e-6) * 60) / C.bpm : t);   // from absolute time, never summed

// word times for a paragraph that has no recorded take yet. dur: fit them to this many seconds (a clip paragraph,
// whose length is the clip's, known before it is cut)
export function placeholder(text, dur) {
  let t = 0;
  const words = say(text).split(/\s+/).filter(Boolean).map(w => {
    const s = t; t += 1 / C.pace;
    const e = t; t += /[.?!:]["”]?$/.test(w) ? STOP : /[,;]$/.test(w) ? COMMA : 0;
    return { w, s: +s.toFixed(3), e: +e.toFixed(3) };
  });
  if (dur && words.length) { const k = dur / words.at(-1).e; for (const w of words) { w.s = +(w.s * k).toFixed(3); w.e = +(w.e * k).toFixed(3); } }
  return words;
}

// lay paragraphs end to end: [{ n, words }] -> [{ n, start, vo, speech, end }] and the film's total length
export function layout(paras) {
  let cursor = 0;
  const out = paras.map((p, i) => {
    const speech = p.words.at(-1).e, start = cursor;
    const vo = nextBeat(start + (i === 0 ? C.first : C.lead) + (C.pad[p.n] || 0));
    const end = i === paras.length - 1 ? nextBeat(vo + speech + C.end) : vo + speech + C.tail;
    cursor = end;
    return { n: p.n, start, vo, speech, end };
  });
  return { paras: out, total: cursor };
}
