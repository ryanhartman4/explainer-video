// placeholder_repo.mjs: stand-in for data_repo.js (Adam's pixel coder + Contour run) until that script may run.
// Same shapes as tools/make_data_repo.py, flagged placeholder: true. Not for the final render.
import { writeFileSync } from "node:fs";

const W = 64, H = 64, img = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const th = Math.atan2(y - 31.5, x - 33), r = Math.hypot(y - 31.5, x - 33);
  img.push(r < 21 + 3.2 * Math.sin(3 * th + .6) + 2 * Math.sin(5 * th - 1.1) + 1.2 * Math.cos(2 * th) ? 1 : 0);
}
const order = [], seen = new Set(), add = p => { if (!seen.has(p)) { seen.add(p); order.push(p); } };
for (const step of [4, 2, 1]) for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) add(y * W + x);
const edge = p => { const y = (p / W) | 0, x = p % W; return [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([a, b]) => { const yy = y + a, xx = x + b; return yy >= 0 && yy < H && xx >= 0 && xx < W && img[yy * W + xx] !== img[p]; }); };
const cost = order.map((p, i) => +(i < 256 ? 0.35 : edge(p) ? 0.85 : 0.03).toFixed(3));
const pixels = { placeholder: true, w: W, h: H, img: img.join(""), order, cost, total_bits: +cost.reduce((a, b) => a + b, 0).toFixed(1), raw_bits: W * H };

let seed = 5; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const tests = Array.from({ length: 64 }, (_, i) => {
  const x = +rnd().toFixed(3), y = +rnd().toFixed(3);
  const sig = x > .72 && y > .58 ? "oom" : (x - .24) ** 2 + ((y - .3) / 1.3) ** 2 < .022 ? "diverged" : y < .1 && x > .35 ? "slow" : null;
  return { x, y, fail: !!sig, sig, explore: i % 3 === 2 };
});
const contour = { placeholder: true, tests, rounds: tests.filter((_, i) => i % 4 === 3).map((_, i) => ({ n: 4 * (i + 1), gt: +Math.max(0.05, 0.6 - i * 0.04).toFixed(3), unc: +Math.max(0.01, 0.4 - i * 0.03).toFixed(3), modes: Math.min(3, 1 + (i >> 2)) })), snaps: [], grid: [48, 27], stopped: true };

writeFileSync(process.argv[2], "Object.assign(window.FL = window.FL || {}, " + JSON.stringify({ pixels, contour }) + ");\n");
console.log("placeholder pixels total", pixels.total_bits, "bits");
