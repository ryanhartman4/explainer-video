// captions.mjs: out/captions.srt from the narration's word timestamps (video/data/timing.js), in the script's spelling.
//   node tools/captions.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../narration/script.mjs";

const T = JSON.parse(readFileSync(join(ROOT, "video/data/timing.js"), "utf8").replace(/^window\.TIMING = /, "").replace(/;\s*$/, ""));
// undo the spoken spellings from narration/script.mjs
// (the narration spells numbers out so the voice reads them right; captions show digits)
// Faultline: [/\bF L T four\b/g, "FLT4"], ...; neuron explorer: [/twenty-seven forty-two/g, "2742"],
// [/two thousand five hundred and sixty/g, "2,560"], [/\bK L\b/g, "KL"], ... (longer phrases first)
const WRITE = [];
const MAXC = 42, MAXS = 3.6;

// rewrite a scene's words before they are cut into captions, so a spoken number is one timed token and never
// splits across two captions: try each WRITE rule on runs of up to 8 words (case-insensitive, punctuation kept)
function rewrite(words) {
  const out = [];
  for (let i = 0; i < words.length; ) {
    let hit = null;
    for (let j = Math.min(words.length, i + 8); j > i && !hit; j--) {
      const run = words.slice(i, j).map(w => w.w).join(" ");
      for (const [re, rep] of WRITE) {
        const m = run.match(new RegExp(`^(["“]?)(${re.source})([.,:;?!"”]*)$`, "i"));
        if (m) { hit = { w: m[1] + rep + m[3], s: words[i].s, e: words[j - 1].e, n: j - i }; break; }
      }
    }
    if (hit) { out.push(hit); i += hit.n; } else out.push(words[i++]);
  }
  return out;
}

const cues = [];
for (const s of T.scenes) {
  let cur = null;
  for (const w of rewrite(s.words)) {
    const t0 = s.start + s.lead + w.s, t1 = s.start + s.lead + w.e;
    // a sentence's last word may run up to 8 characters over rather than sit alone in a caption of its own
    const len = cur ? cur.text.length + 1 + w.w.length : 0, last = /[.?!]["”]?$/.test(w.w);
    if (cur && ((len > MAXC && !(last && len <= MAXC + 8)) || t1 - cur.a > MAXS + (last ? 0.8 : 0))) { cues.push(cur); cur = null; }
    if (!cur) cur = { a: t0, b: t1, text: w.w };
    else { cur.text += " " + w.w; cur.b = t1; }
    if (/[.?!]["”]?$/.test(w.w)) { cues.push(cur); cur = null; }   // sentences end a caption
  }
  if (cur) cues.push(cur);
}
const ts = x => { const ms = Math.round(x * 1000); const p = (n, k = 2) => String(n).padStart(k, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
// hold each caption a beat past its last word, but never into the next one
cues.forEach((c, i) => (c.end = Math.min(c.b + 0.25, cues[i + 1] ? cues[i + 1].a - 0.02 : Infinity)));
const srt = cues.map((c, i) => `${i + 1}\n${ts(c.a)} --> ${ts(c.end)}\n${c.text}\n`).join("\n");
mkdirSync(join(ROOT, "out"), { recursive: true });
writeFileSync(join(ROOT, "out/captions.srt"), srt);
// (film 5) the same captions for a burned-in X cut: the composition draws them when render --variables '{"captions":true}'
writeFileSync(join(ROOT, "video/data/captions.js"), "window.CAPS = " + JSON.stringify(cues.map(c => ({ a: +c.a.toFixed(3), b: +c.end.toFixed(3), text: c.text }))) + ";\n");
console.log(`out/captions.srt + video/data/captions.js: ${cues.length} captions`);
