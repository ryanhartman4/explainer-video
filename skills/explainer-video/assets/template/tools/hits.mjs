// hits.mjs: read the sound hits the film schedules with film.hit(kind, t) and write video/data/hits.json.
//   node tools/hits.mjs
// The film calls film.hit() at the very line that schedules the picture event, so sound and picture share one clock.
// tools/make_hits.py then synthesizes each hit on its exact sample. tools/audio.sh runs both.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, serve, launch, openFilm } from "./lib/browser.mjs";

const srv = await serve(), browser = await launch();
try {
  const { info } = await openFilm(browser, srv.url);
  if (!info.ok) throw new Error("the film did not build: " + info.error);
  const hits = info.hits.sort((a, b) => a.t - b.t);
  mkdirSync(join(ROOT, "video/data"), { recursive: true });
  writeFileSync(join(ROOT, "video/data/hits.json"), "[" + hits.map(h => JSON.stringify(h)).join(",\n") + "]\n");
  const by = {}; for (const h of hits) by[h.kind] = (by[h.kind] || 0) + 1;
  console.log(`${hits.length} hits -> video/data/hits.json`, hits.length ? by : "");
  if (info.problems.length) console.log("PROBLEMS:\n  " + info.problems.join("\n  "));
} finally { await browser.close(); srv.close(); }
