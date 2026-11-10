#!/usr/bin/env node
// new_film.mjs: start a film project from this skill's template.
//   node <skill>/scripts/new_film.mjs <project-folder>            create (never overwrites your SCRIPT.md, DESIGN.md or film.html)
//   node <skill>/scripts/new_film.mjs <project-folder> --update   also refresh the engine and tools from the skill
//   node <skill>/scripts/new_film.mjs <project-folder> --vertical  add a vertical cut (only when the user asked for one):
//        video/film-9x16.html, a second film composed for the 1080 x 1920 frame, and "formats" in film.config.json
//   node <skill>/scripts/new_film.mjs <project-folder> --3d       also add the 3D point layer (stage3d.js, three.js, the ready-made
//        forms in video/forms3d/) and start from the 3D film.html. --update refreshes it in a project that has it.
//   node <skill>/scripts/new_film.mjs <project-folder> --hyperframes   set up the back-up engine instead (after
//        `npx hyperframes@0.9.13 init video` in that folder; see assets/hyperframes/README.md)
// It copies assets/template/ (the stage engine, fonts, tools, narration scripts), the narrator's reference clip, and
// writes package.json. It downloads nothing.
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, copyFileSync, readFileSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2), update = argv.includes("--update"), hf = argv.includes("--hyperframes"), target = argv.find(a => !a.startsWith("--"));
const vertical = argv.includes("--vertical");
let threeD = argv.includes("--3d");
if (!target) { console.error("usage: node new_film.mjs <project-folder> [--3d] [--vertical] [--update] [--hyperframes]"); process.exit(1); }
const DEST = resolve(target);
// yours once they exist: the script, the design, the film, and the two spelling lists
const YOURS = new Set(["SCRIPT.md", "DESIGN.md", "film.config.json", "video/film.html", "narration/script.mjs", "tools/captions.mjs"]);
// with the back-up engine, the stage engine's own files stay out of the project
const STAGE_ONLY = /^(video\/(film\.html|stage\.(js|css))|film\.config\.json|tools\/(clock|render|check|shots|doctor|wave)\.mjs|tools\/(audio\.sh|mix\.py)|tools\/lib\/browser\.mjs)/;

let copied = 0, kept = 0;
function copyTree(src, destOf, skip = () => false, force = false) {
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (name === ".DS_Store" || name === "__pycache__") continue;
      const from = join(dir, name), rel = relative(src, from).split("\\").join("/"), to = destOf(rel);
      if (statSync(from).isDirectory()) { walk(from); continue; }
      if (skip(rel)) continue;
      if (existsSync(to) && !force && (YOURS.has(rel) || !update)) { kept++; continue; }
      mkdirSync(dirname(to), { recursive: true }); copyFileSync(from, to); copied++;
    }
  })(src);
}
if (hf) {                                             // the back-up engine's files first, so the shared copy below keeps them
  const H = join(SKILL, "assets/hyperframes");
  copyTree(join(H, "tools"), rel => join(DEST, "tools", rel), () => false, update);
  copyTree(join(H, "lib"), rel => join(DEST, "video/lib", rel), () => false, update);
  copyTree(join(H, "vendor"), rel => join(DEST, "video/assets/vendor", rel), () => false, update);
}
if (!hf && existsSync(join(DEST, "video/stage3d.js"))) threeD = true;     // a project that has the 3D layer keeps it up to date
if (threeD && !hf) {                                  // the 3D layer first, so its film.html is the one a new project starts from
  const D3 = join(SKILL, "assets/stage3d");
  copyTree(D3, rel => join(DEST, "video", rel), rel => rel === "README.md" || (rel === "film.html" && existsSync(join(DEST, "video/film.html"))));   // film.html is yours once it exists
  for (const [from, to] of [["three.min.js", "video/three.min.js"], ["LICENSE", "video/three.LICENSE"]]) {
    const dst = join(DEST, to); if (!existsSync(dst) || update) { mkdirSync(dirname(dst), { recursive: true }); copyFileSync(join(SKILL, "assets/hyperframes/vendor", from), dst); copied++; } else kept++;
  }
}
copyTree(join(SKILL, "assets/template"), rel => join(DEST, rel), rel => hf && (STAGE_ONLY.test(rel) || rel === "tools/hits.mjs"));
for (const d of ["narration/audio", "narration/voices", "video/data", "video/assets/audio", "out"].concat(hf ? [] : ["shots"])) mkdirSync(join(DEST, d), { recursive: true });
for (const f of ["w_mid.wav", "w_mid.txt"]) if (!existsSync(join(DEST, "narration/voices", f))) copyFileSync(join(SKILL, "assets/voices", f), join(DEST, "narration/voices", f));
if (vertical && !hf) {                               // a second film file for the tall frame, and the film's list of cuts
  const tall = join(DEST, "video/film-9x16.html");
  if (existsSync(tall)) kept++; else { copyFileSync(join(SKILL, "assets/vertical/film-9x16.html"), tall); copied++; }
  const cf = join(DEST, "film.config.json"), cfg = existsSync(cf) ? JSON.parse(readFileSync(cf, "utf8")) : {};
  if (!Array.isArray(cfg.formats) || !cfg.formats.includes("9x16")) { cfg.formats = ["16x9", "9x16"]; writeFileSync(cf, JSON.stringify(cfg) + "\n"); }
}
if (!existsSync(join(DEST, "package.json"))) writeFileSync(join(DEST, "package.json"), JSON.stringify({ name: DEST.split(/[\\/]/).pop().toLowerCase().replace(/[^a-z0-9-]+/g, "-"), private: true, type: "module" }, null, 2) + "\n");
if (!existsSync(join(DEST, ".gitignore"))) writeFileSync(join(DEST, ".gitignore"), "node_modules/\n.env.local\nshots/\nout/frames/\n__pycache__/\n.DS_Store\n");
const added = [threeD && !hf && "the 3D point layer: references/stage3d.md", vertical && !hf && "a vertical cut: video/film-9x16.html"].filter(Boolean);
console.log(`${DEST}: ${copied} files copied, ${kept} kept as they were${hf ? " (HyperFrames back-up engine)" : added.length ? ` (with ${added.join("; ")})` : ""}`);
console.log(hf ? `next: follow assets/hyperframes/README.md from step 4 (node tools/build.mjs builds the clock and index.html)` : `next:  cd "${DEST}"  &&  node tools/doctor.mjs`);
