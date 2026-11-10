// render.mjs: draw every frame of video/film.html in headless Chrome and encode out/<name>.mp4.
//   node tools/render.mjs                         1080p30, with video/assets/audio/mix.wav when it exists
//   node tools/render.mjs --fps 60                60 fps (when motion matters)
//   node tools/render.mjs --captions --out out/film-x.mp4     the cut with burned-in captions
//   node tools/render.mjs --from 10 --to 20       a part of the film, to look at motion
//   node tools/render.mjs --format 9x16           one cut only. With no --format it renders every cut the film lists
//                                                 in film.config.json "formats" (16x9 alone unless a vertical cut was planned)
//   options: --workers 4, --crf 16, --png (lossless frames, slower), --scale 2 (4K), --silent (no audio), --force
// Several pages render in parallel. Each page always draws the same frames in the same order (page k takes frames k,
// k + workers, ...) and repaints the whole frame before each capture, so two runs with the same settings give the
// same frames.
// It refuses to render a film with problems (missing cue words, script errors) unless --force.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { cpus } from "node:os";
import { ROOT, serve, launch, openFilm, seek, args, formats, suffix } from "./lib/browser.mjs";

const A = args();
const fps = +A.fps || 30, scale = +A.scale || 1, workers = +A.workers || Math.max(1, Math.min(6, cpus().length));
const cuts = formats(A);
// the vertical cut is named <name>-9x16.mp4; with --out and more than one cut, the suffix goes before the extension
const outFor = f => (A.out ? join(ROOT, cuts.length > 1 ? String(A.out).replace(/(\.\w+)?$/, suffix(f) + "$1") : A.out) : join(ROOT, "out", basename(ROOT) + suffix(f) + (A.captions ? "-captions" : "") + ".mp4"));
const audio = join(ROOT, "video/assets/audio/mix.wav");
mkdirSync(join(ROOT, "out"), { recursive: true });

const srv = await serve(), browser = await launch();
try {
 for (const format of cuts) {
  const out = outFor(format), t00 = Date.now();
  const pages = [];
  for (let i = 0; i < workers; i++) pages.push(await openFilm(browser, srv.url, { captions: !!A.captions, scale, look: A.look, format }));
  const info = pages[0].info;
  if (!info.ok) throw new Error("the film did not build: " + info.error);
  const bad = [...info.problems, ...info.errors];
  if (bad.length && !A.force) { console.error("Not rendering: the film has problems (fix them, or pass --force):\n  " + bad.join("\n  ")); process.exit(1); }
  const from = +A.from || 0, to = Math.min(info.duration, A.to ? +A.to : info.duration);
  const f0 = Math.round(from * fps), n = Math.round((to - from) * fps);
  const withAudio = !A.silent && existsSync(audio);
  const ff = ["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", A.png ? "png" : "mjpeg", "-i", "-"];
  if (withAudio) ff.push("-ss", String(from), "-t", String(to - from), "-i", audio);
  ff.push("-c:v", "libx264", "-preset", "slow", "-crf", String(A.crf || 16), "-pix_fmt", "yuv420p", "-vf", "scale=out_color_matrix=bt709:out_range=tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-r", String(fps));
  if (withAudio) ff.push("-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest");
  ff.push("-movflags", "+faststart", out);
  const enc = spawn("ffmpeg", ff, { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((ok, bad2) => { enc.on("close", c => (c === 0 ? ok() : bad2(new Error("ffmpeg exited " + c)))); enc.on("error", bad2); });
  enc.stdin.on("error", () => {});

  // page k draws frames k, k + workers, ...: a fixed order, so a run can be repeated exactly. Frames are written to
  // ffmpeg strictly in order.
  const ready = new Map(); let write = 0, lastLog = 0;
  const flush = async () => { while (ready.has(write)) { const buf = ready.get(write); ready.delete(write); if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once("drain", r)); write++; } };
  await Promise.all(pages.map(async ({ page }, k) => {
    for (let i = k; i < n; i += pages.length) {
      while (i - write > workers * 6) await new Promise(r => setTimeout(r, 5));          // do not run far ahead of the encoder
      await seek(page, (f0 + i) / fps);
      ready.set(i, await page.screenshot(A.png ? { type: "png" } : { type: "jpeg", quality: 97 }));
      await flush();
      if (Date.now() - lastLog > 5000) { lastLog = Date.now(); process.stdout.write(`  frame ${write} of ${n}\n`); }
    }
  }));
  await flush(); enc.stdin.end(); await done;
  console.log(`${out}: ${info.W * scale} x ${info.H * scale}, ${n} frames at ${fps} fps, ${(n / fps).toFixed(1)} s${withAudio ? ", with audio" : A.silent ? ", silent (--silent)" : ", silent (no video/assets/audio/mix.wav yet: sh tools/audio.sh)"}, rendered in ${((Date.now() - t00) / 1000).toFixed(0)} s`);
  if (info.placeholder) console.log("note: placeholder timing was used for at least one paragraph (no recorded voice yet)");
  for (const { page } of pages) await page.close();
 }
} finally { await browser.close(); srv.close(); }
