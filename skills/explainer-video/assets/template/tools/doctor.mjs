// doctor.mjs: can this machine make a film? Read-only except for one blank test frame in memory.
//   node tools/doctor.mjs
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir, platform, arch } from "node:os";
import { ROOT, launch } from "./lib/browser.mjs";

let fail = 0;
const ok = (a, b = "") => console.log(`  ok       ${a.padEnd(22)} ${b}`), miss = (a, b) => { fail = 1; console.log(`  MISSING  ${a.padEnd(22)} ${b}`); }, note = (a, b) => console.log(`  note     ${a.padEnd(22)} ${b}`);
const run = (c, a) => { try { return execFileSync(c, a, { stdio: ["ignore", "pipe", "pipe"] }).toString(); } catch { return null; } };

console.log("explainer-video project doctor\n");
const major = +process.versions.node.split(".")[0];
major >= 20 ? ok("Node", process.version) : miss("Node", `${process.version} is too old; need 20 or newer`);
const enc = run("ffmpeg", ["-hide_banner", "-encoders"]);
if (!enc) miss("ffmpeg", "not found (macOS: brew install ffmpeg)");
else { for (const c of ["libx264", "aac", "libmp3lame"]) enc.includes(c) ? 0 : miss("ffmpeg " + c, "this ffmpeg lacks it (macOS: brew install ffmpeg)"); if (["libx264", "aac", "libmp3lame"].every(c => enc.includes(c))) ok("ffmpeg", "libx264, aac, libmp3lame"); }
if (!run("uv", ["--version"])) miss("uv", "not found (macOS: brew install uv): music, sound hits and the mix need it");
else { ok("uv", "for the music, the mix and the local voice");
  run("uv", ["run", "-q", "--offline", "--python", "3.12", "--with", "numpy", "--with", "scipy", "python", "-I", "-c", "import numpy, scipy"]) !== null ? ok("numpy, scipy", "in uv's cache")
    : note("numpy, scipy", "not in uv's cache: the first  sh tools/audio.sh  downloads them (about 60 MB, plus Python 3.12 if uv lacks it). Ask the user first."); }
try {
  const b = await launch(), p = await b.newPage({ viewport: { width: 320, height: 180 } });
  await p.setContent("<body style='background:#123'>"); const shot = await p.screenshot();
  ok("headless Chrome", `${b.version()}, drew a ${shot.length}-byte test frame`); await b.close();
} catch (e) { miss("headless Chrome", String(e.message || e).split("\n")[0]); }
if (existsSync(join(ROOT, "video/stage3d.js"))) {                              // a film with the 3D point layer
  existsSync(join(ROOT, "video/three.min.js")) ? 0 : miss("three.js", "video/three.min.js is missing: rerun the skill's scripts/new_film.mjs with --3d");
  try { const b = await launch(), p = await b.newPage(); await p.setContent("<canvas></canvas>");
    const gl = await p.evaluate(() => { const c = document.querySelector("canvas"), g = c.getContext("webgl2") || c.getContext("webgl"); if (!g) return null; const e = g.getExtension("WEBGL_debug_renderer_info"); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : "WebGL"; });
    gl ? ok("3D layer", `stage3d.js, three.js, ${String(gl).slice(0, 60)}`) : miss("3D layer", "this headless Chrome has no WebGL: set STAGE_CHROME to a full Google Chrome"); await b.close();
  } catch (e) { miss("3D layer", String(e.message || e).split("\n")[0]); }
}
existsSync(join(ROOT, "video/stage.js")) && existsSync(join(ROOT, "video/assets/fonts")) ? ok("engine", "video/stage.js and fonts") : miss("engine", "video/stage.js or video/assets/fonts is missing: rerun the skill's scripts/new_film.mjs with --update");
if (platform() === "darwin" && arch() === "arm64") {
  const tts = process.env.EXPLAINER_TTS_PROJECT || join(homedir(), "Developer/mlx-audio");
  existsSync(join(tts, "pyproject.toml")) ? ok("local voice", tts) : note("local voice", `${tts} not set up: run the explainer-video-setup skill, or narrate with ElevenLabs`);
} else note("local voice", "needs an Apple Silicon Mac; narrate with ElevenLabs here, or build on placeholder timing and record later");
console.log(fail ? "\nFix the MISSING items (ask the user before any install), then run this again." : "\nReady.");
process.exit(fail);
