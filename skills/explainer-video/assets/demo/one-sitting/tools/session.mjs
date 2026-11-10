// session.mjs: the session's real record, for scenes 8 and 9.
//   node tools/session.mjs --builders 8 --reviewers 15 [--lines 1576]     -> video/data/session.js
// lines: the lines written in the sitting (counted from film.html and the scene files, or given with --lines: the
// original session also wrote the 3D layer, which is now the plugin's stage3d.js, 1,576 lines in all). frames: length x 30.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, args } from "./lib/browser.mjs";
const A = args(), V = join(ROOT, "video");
const files = ["film.html", ...readdirSync(join(V, "scenes")).filter(f => f.endsWith(".js")).map(f => "scenes/" + f)];
const lines = +A.lines || files.reduce((n, f) => n + readFileSync(join(V, f), "utf8").split("\n").filter(l => l.trim()).length, 0);
const total = JSON.parse(readFileSync(join(V, "data/timing.js"), "utf8").match(/=\s*(\{.*\})\s*;/s)[1]).total;
const rec = { placeholder: false, builders: +A.builders || 8, reviewers: +A.reviewers || 0, lines, frames: Math.round(total * 30), files: files.length };
writeFileSync(join(V, "data/session.js"), `// the session's real record, written by tools/session.mjs. Generated: do not edit.\nwindow.SESSION = ${JSON.stringify(rec)};\n`);
console.log(rec);
