// wave.mjs: the loudness envelope of the finished mix, for a film that shows its own soundtrack (the 3D layer's
// waveform form, video/forms3d/waveform.js, draws it: references/stage3d.md).
//   node tools/wave.mjs        video/assets/audio/mix.wav -> video/data/wave.js   (run after sh tools/audio.sh)
// The film loads data/wave.js and reads window.WAVE = { total: seconds, peaks: 1,500 values from 0 to 1 }.
import { spawnSync } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/browser.mjs";
const mix = join(ROOT, "video/assets/audio/mix.wav"), out = join(ROOT, "video/data/wave.js"), BUCKETS = 1500, SR = 8000;
if (!existsSync(mix)) { console.error("no mix yet: run sh tools/audio.sh first"); process.exit(1); }
const r = spawnSync("ffmpeg", ["-v", "error", "-i", mix, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
if (r.status !== 0) { console.error(String(r.stderr)); process.exit(1); }
const pcm = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4)), total = pcm.length / SR, per = pcm.length / BUCKETS;
const rms = Array.from({ length: BUCKETS }, (_, b) => { let s = 0, n = 0; for (let i = Math.floor(b * per); i < Math.floor((b + 1) * per); i++) { s += pcm[i] * pcm[i]; n++; } return Math.sqrt(s / Math.max(1, n)); });
const top = [...rms].sort((a, b) => a - b)[Math.floor(BUCKETS * 0.985)] || 1;
const peaks = rms.map(v => +Math.min(1, Math.sqrt(v / top)).toFixed(3));
writeFileSync(out, `// the loudness envelope of video/assets/audio/mix.wav (${BUCKETS} buckets, 0..1), written by tools/wave.mjs. Generated: do not edit.\nwindow.WAVE = ${JSON.stringify({ placeholder: false, total: +total.toFixed(3), peaks })};\n`);
console.log(`${out}: ${BUCKETS} buckets over ${total.toFixed(1)} s`);
