// script_check.mjs: check SCRIPT.md before anything is built on it.
//   node tools/script_check.mjs [--target 180]      (--target: the length you promised, in seconds)
// It reads the narration ("> " lines under "## N. Title") and the beat sheet (the table under each paragraph):
//   | on the words | change | then on screen |
//   |---|---|---|
//   | picks one bit | ADD three arrows from the hashes to bits 3, 7 and 12 | item, hashes, bit row, arrows |
// ERROR  a cue phrase the narrator never says, a paragraph with no beats, a table row with the wrong columns
// WARN   long sentences, long paragraphs, long stretches with no beat, beats too close together, a slow opening,
//        a cue said more than once, a change that is not one verb, a crowded screen, tokens a voice may misread
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, say } from "../narration/script.mjs";
import { C, placeholder, layout } from "./lib/pace.mjs";

const argv = process.argv.slice(2), target = argv.includes("--target") ? +argv[argv.indexOf("--target") + 1] : null;
const VERBS = ["ADD", "MOVE", "CHANGE", "HIGHLIGHT", "DIM", "REMOVE", "ZOOM", "COUNT", "DRAW", "REPLACE", "HOLD"];
const norm = w => w.toLowerCase().replace(/[^a-z0-9']/g, "");
const out = []; const add = (lvl, where, msg) => out.push({ lvl, where, msg });

const paras = []; let cur = null;
for (const line of readFileSync(join(ROOT, "SCRIPT.md"), "utf8").split("\n")) {
  const h = line.match(/^## (\d+)\. (.+?)(?: \(|$)/);
  if (h) { cur = { n: +h[1], title: h[2], text: "", beats: [], rows: 0 }; paras.push(cur); continue; }
  if (!cur) continue;
  if (line.startsWith("> ")) cur.text += (cur.text ? " " : "") + line.slice(2).trim();
  else if (/^\s*\|/.test(line)) {
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
    if (cells.every(c => /^:?-+:?$/.test(c)) || /^on the words$/i.test(cells[0])) continue;
    cur.rows++;
    if (cells.length !== 3) add("ERROR", `p${cur.n}`, `beat row has ${cells.length} columns, needs 3 (on the words | change | then on screen): ${line.trim().slice(0, 60)}`);
    else cur.beats.push({ cue: cells[0].replace(/^["“]|["”]$/g, ""), change: cells[1], after: cells[2] });
  }
}
const spoken = paras.filter(p => p.text);
if (!spoken.length) { console.log('ERROR  SCRIPT.md has no narration: paragraphs are "## 1. Title" headings followed by "> " lines'); process.exit(1); }

// the same clock tools/clock.mjs will build (placeholder pace, silences from film.config.json), so this estimate is the film's length
const timed = spoken.map(p => ({ n: p.n, words: placeholder(p.text) })), L = layout(timed);
let words = 0;
const clock = L.total;
spoken.forEach((p, pi) => {
  const w = timed[pi].words.map(x => ({ ...x, k: norm(x.w) })), lay = L.paras[pi], LEAD = lay.vo - lay.start;
  p.dur = lay.end - lay.start; p.start = lay.start; words += w.length;
  const where = `p${p.n}`;
  for (const s of p.text.split(/(?<=[.?!])\s+/)) { const n = s.split(/\s+/).length; if (n > 26) add("WARN", where, `a ${n}-word sentence ("${s.slice(0, 44)}…"): the ear loses a sentence past about 25 words; split it`); }
  if (w.length > 75) add("WARN", where, `${w.length} words in one paragraph (${p.dur.toFixed(0)} s): one paragraph is one idea; split it at the turn`);
  const risky = [...new Set((p.text.match(/\b(?:[A-Z]{2,}[0-9]*|[A-Za-z]+[0-9]+[A-Za-z0-9]*|\d+(?:[.,]\d+)+|\d+[A-Za-z]+)\b/g) || []))].filter(x => say(x) === x);
  if (risky.length) add("WARN", where, `a voice may misread ${risky.map(x => `"${x}"`).join(", ")}: add spoken spellings to SAY in narration/script.mjs (and the reverse to WRITE in tools/captions.mjs), or write them as words`);
  if (!p.beats.length) { add("ERROR", where, p.rows ? "no valid beat rows" : "no beat sheet: add the table (on the words | change | then on screen) with a row for each change on screen"); return; }
  const times = [];
  for (const b of p.beats) {
    const want = b.cue.split(/\s+/).map(norm).filter(Boolean); const at = [];
    for (let i = 0; i + want.length <= w.length; i++) if (want.every((x, j) => w[i + j].k === x)) at.push(w[i].s);
    if (/^\(?(start|open|opens)\)?$/i.test(b.cue)) { times.push({ t: 0, b, hold: true }); }
    else if (!at.length) add("ERROR", where, `the cue "${b.cue}" is not in this paragraph's narration as spoken: copy the words exactly from the "> " lines${say(p.text) !== p.text ? `. SAY respells this paragraph for the voice, and cues match what is spoken: "${say(b.cue)}"` : ""}`);
    else { if (at.length > 1 && want.length < 2) add("WARN", where, `the cue "${b.cue}" is said ${at.length} times in this paragraph: use a longer phrase so it names one moment`); times.push({ t: LEAD + at[0], b }); }
    const verb = b.change.split(/\s+/)[0].replace(/[^A-Za-z]/g, "");
    if (!VERBS.includes(verb.toUpperCase())) add("WARN", where, `beat "${b.cue}": start the change with one verb (${VERBS.join(", ")}), so each beat is one change: "${b.change.slice(0, 40)}"`);
    const things = b.after.split(/[,;]/).filter(x => x.trim()).length;
    if (things > 7) add("WARN", where, `beat "${b.cue}" leaves ${things} things on screen: remove or dim what the narrator has finished with (7 or fewer)`);
  }
  times.sort((a, b) => a.t - b.t);
  if (times.length && times[0].t > 3.2) add("WARN", where, `nothing changes for the first ${times[0].t.toFixed(1)} s of this paragraph: put a beat on its opening words`);
  for (let i = 1; i < times.length; i++) {
    const gap = times[i].t - times[i - 1].t;
    if (gap > 6) add("WARN", where, `${gap.toFixed(1)} s with no change between "${times[i - 1].b.cue}" and "${times[i].b.cue}": add a beat in between (a highlight or a count is enough), or cut words`);
    if (gap < 0.7 && gap > 0 && !times[i - 1].hold) add("WARN", where, `"${times[i - 1].b.cue}" and "${times[i].b.cue}" are ${gap.toFixed(1)} s apart: the eye cannot follow two changes that close; merge them or move one`);
  }
  if (times.length) { const tail = p.dur - times.at(-1).t; if (tail > 7.5) add("WARN", where, `${tail.toFixed(1)} s with no change after "${times.at(-1).b.cue}" to the end of the paragraph`); }
});
const first = spoken[0].text.split(/(?<=[.?!])\s+/)[0].split(/\s+/).length;
if (first > 18) add("WARN", "p1", `the opening sentence is ${first} words: open on a short, concrete line (a question, a surprising number, a thing the viewer can picture)`);
if (target && Math.abs(clock - target) > target * 0.1) add("WARN", "film", `estimated length ${clock.toFixed(0)} s against a target of ${target} s: ${clock > target ? "cut" : "add"} about ${Math.abs(Math.round((clock - target) * 2.4))} words`);

const mm = t => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")}`;
for (const o of out.sort((a, b) => (a.lvl < b.lvl ? -1 : a.lvl > b.lvl ? 1 : 0))) console.log(`${o.lvl.padEnd(5)}  ${o.where.padEnd(4)}  ${o.msg}`);
const beats = spoken.reduce((n, p) => n + p.beats.length, 0), errors = out.filter(o => o.lvl === "ERROR").length;
console.log(`\n${spoken.length} paragraphs, ${words} words, ${mm(clock)} as the film will run on placeholder timing (silences included), ${beats} beats (one every ${(clock / Math.max(1, beats)).toFixed(1)} s). ${errors} errors, ${out.length - errors} warnings.`);
for (const p of spoken) console.log(`  p${p.n} ${p.title.slice(0, 26).padEnd(26)} ${String(p.text.split(/\s+/).length).padStart(3)} words  ${p.dur.toFixed(0).padStart(3)} s  ${p.beats.length} beats`);
process.exitCode = errors ? 1 : 0;
