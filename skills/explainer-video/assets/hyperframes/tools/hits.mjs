// hits.mjs: read the sound hits the film schedules (K.hit) and write video/data/hits.json.
//   node tools/hits.mjs
// The composition calls K.hit(kind, t) where it places each visual event, so its hit list is exact. This loads
// compositions/film.html in HyperFrames' own headless Chrome (through the puppeteer-core in the npx cache: nothing
// is downloaded), builds the timeline once, and saves window.__hits. Rerun after any change to timing or the film.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";
import { homedir } from "node:os";
import { createRequire } from "node:module";
import { ROOT } from "../narration/script.mjs";

const npx = join(homedir(), ".npm/_npx");
const dir = readdirSync(npx).map(d => join(npx, d, "node_modules")).find(d => existsSync(join(d, "puppeteer-core")) && existsSync(join(d, "hyperframes")));
if (!dir) throw new Error("no puppeteer-core next to hyperframes in ~/.npm/_npx: run any `npx hyperframes@0.9.13` command first");
const puppeteer = createRequire(join(dir, "x.js"))("puppeteer-core");
const chromeRoot = join(homedir(), ".cache/hyperframes/chrome/chrome-headless-shell");
const build = readdirSync(chromeRoot).sort().at(-1);
const chrome = join(chromeRoot, build, "chrome-headless-shell-mac-arm64/chrome-headless-shell");

// tools/harness.html mounts the film's <template> outside HyperFrames (also useful by hand: harness.html?t=62 freezes 62 s)
const HARNESS = readFileSync(join(ROOT, "tools/harness.html"), "utf8");

const TYPES = { ".js": "text/javascript", ".html": "text/html", ".css": "text/css", ".woff2": "font/woff2", ".json": "application/json" };
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/harness.html") { res.writeHead(200, { "content-type": "text/html" }); return res.end(HARNESS); }
  const f = join(ROOT, url);
  if (!f.startsWith(ROOT) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
}).listen(0, "127.0.0.1");
await new Promise(ok => server.once("listening", ok));
const port = server.address().port;

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("console", m => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", e => errors.push(String(e)));
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`http://127.0.0.1:${port}/harness.html`);
  await page.waitForFunction("window.__done || window.__err", { timeout: 60000 });
  const err = await page.evaluate("window.__err");
  if (err) throw new Error(err);
  const hits = (await page.evaluate("window.__hits || []")).sort((a, b) => a.t - b.t);
  const missing = await page.evaluate("window.__missingCues || []");
  writeFileSync(join(ROOT, "video/data/hits.json"), JSON.stringify(hits, null, 0).replace(/},{/g, "},\n{") + "\n");
  const by = {};
  for (const h of hits) by[h.kind] = (by[h.kind] || 0) + 1;
  console.log(`${hits.length} hits -> video/data/hits.json`, by);
  if (missing.length) console.log("MISSING CUES:", missing);
  if (errors.length) console.log("page errors:", errors.slice(0, 5));
} finally { await browser.close(); server.close(); }
