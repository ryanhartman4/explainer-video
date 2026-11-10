// browser.mjs: open video/film.html in a headless Chrome, for render.mjs, shots.mjs, check.mjs and hits.mjs.
// The page is served from a local port (fonts and scripts load the same way on every machine) and opened with ?render,
// which hides the preview player. Chrome is found in this order: $STAGE_CHROME, a Playwright install, HyperFrames'
// cached headless shell, then Chrome, Chromium or Edge as installed on the machine.
import { createServer } from "node:http";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { homedir } from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const VIDEO = join(ROOT, "video");
const require = createRequire(join(ROOT, "package.json"));

const TYPES = { ".js": "text/javascript", ".mjs": "text/javascript", ".html": "text/html", ".css": "text/css", ".woff2": "font/woff2", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".wav": "audio/wav", ".mp3": "audio/mpeg", ".webp": "image/webp" };

export async function serve(dir = VIDEO) {
  const server = createServer((req, res) => {
    const f = join(dir, decodeURIComponent(req.url.split("?")[0]));
    if (!f.startsWith(dir) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(readFileSync(f));
  }).listen(0, "127.0.0.1");
  await new Promise(ok => server.once("listening", ok));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

function findChrome() {
  if (process.env.STAGE_CHROME) return process.env.STAGE_CHROME;
  const h = homedir(), out = [];
  const hf = join(h, ".cache/hyperframes/chrome/chrome-headless-shell");
  if (existsSync(hf)) for (const v of readdirSync(hf).sort().reverse()) for (const d of readdirSync(join(hf, v))) out.push(join(hf, v, d, "chrome-headless-shell"));
  out.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/opt/pw-browsers/chromium", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "C:/Program Files/Google/Chrome/Application/chrome.exe");
  return out.find(p => existsSync(p) && statSync(p).isFile()) || null;
}

export async function launch() {
  let pw = null;
  for (const name of ["playwright", "playwright-core"]) { try { pw = require(name); break; } catch {} }
  if (!pw) throw new Error("Playwright is not installed in this project. Run:  npm install --save-dev playwright-core   (8 MB; it uses the Chrome already on this machine)");
  const args = ["--font-render-hinting=none", "--disable-lcd-text", "--force-color-profile=srgb", "--hide-scrollbars"];
  try { return await pw.chromium.launch({ args }); }                                    // a Playwright-managed Chromium, when there is one
  catch (e) {
    const exe = findChrome();
    if (!exe) throw new Error("No Chrome found. Install Google Chrome, or run  npx playwright install chromium  (about 150 MB), or set STAGE_CHROME to a Chrome binary.");
    return await pw.chromium.launch({ executablePath: exe, args });
  }
}

// open the film; returns { page, info, close }. opts: { captions, scale, query }
export async function openFilm(browser, base, opts = {}) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: opts.scale || 1 });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e.message || e)));
  page.on("console", m => { if (m.type() === "error" && !m.text().startsWith("[stage]") && !m.text().startsWith("Failed to load resource")) errors.push(m.text()); });
  page.on("response", r => { if (r.status() >= 400 && !r.url().endsWith("mix.wav")) errors.push(`could not load ${r.url().replace(base + "/", "video/")} (${r.status()})`); });
  await page.goto(`${base}/film.html?render=1${opts.captions ? "&captions=1" : ""}${opts.look ? "&look=" + opts.look : ""}`);
  await page.waitForFunction("window.__ready", null, { timeout: 30000 }).catch(() => {});
  const info = await page.evaluate(async () => {
    try { const f = await window.__ready; return { ok: true, duration: f.duration, fps: f.fps, problems: f.problems, hits: f.hits, look: document.getElementById("stage").dataset.look,
      placeholder: !!f.timing.placeholder, paras: f.paras.map(p => ({ n: p.n, title: p.title, start: p.start, end: p.end, voiceStart: p.voiceStart, voiceEnd: p.voiceEnd })) }; }
    catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  });
  info.errors = errors;
  return { page, info };
}

// draw the frame at t and wait until it is painted
export async function seek(page, t) {
  await page.evaluate(t => { window.__film.seek(t); return new Promise(r => requestAnimationFrame(() => r())); }, t);
}

export function args(argv = process.argv.slice(2)) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) { const k = a.slice(2); if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) o[k] = argv[++i]; else o[k] = true; }
    else o._.push(a);
  }
  return o;
}
