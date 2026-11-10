// clips.mjs: which paragraphs of SCRIPT.md play a real recording instead of the narrator. Only films that asked for
// clips have any. A clip paragraph carries one "@clip" line under its heading:
//
//   ## 4. Karpathy on compression
//   @clip clips/karpathy.mp4 5.55 11.2
//   > A trained network is, in some sense, a compressed file.
//
// The file is named from the project folder; the two numbers are where the clip starts and ends in that file, in
// seconds or m:ss.s. The "> " lines are the words spoken in the clip, typed out exactly, so captions and cue phrases
// work as they do for narration. tools/clips.py cuts the sound and the frames; the narrator never records the paragraph.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../../narration/script.mjs";

const secs = v => String(v).split(":").reduce((a, x) => a * 60 + +x, 0);

// { 4: { file, start, end, dur } }, keyed by paragraph number. Throws on an "@clip" line it cannot read.
export function clips() {
  const out = {};
  let n = null;
  for (const line of readFileSync(join(ROOT, "SCRIPT.md"), "utf8").split("\n")) {
    const h = line.match(/^## (\d+)\. /);
    if (h) { n = +h[1]; continue; }
    if (/^## /.test(line)) { n = null; continue; }
    if (!/^@clip\b/.test(line)) continue;
    const c = line.match(/^@clip\s+(\S+)\s+([\d.:]+)\s+([\d.:]+)\s*$/);
    const how = "Write it under the paragraph's heading as  @clip clips/file.mp4 12.5 21.0  (file, start, end)";
    if (n == null || !c) throw new Error(`SCRIPT.md: cannot read "${line.trim()}". ${how}`);
    const start = secs(c[2]), end = secs(c[3]);
    if (!(end > start)) throw new Error(`SCRIPT.md paragraph ${n}: the clip ends (${c[3]}) before it starts (${c[2]}). ${how}`);
    out[n] = { file: c[1], start, end, dur: +(end - start).toFixed(3) };
  }
  return out;
}
