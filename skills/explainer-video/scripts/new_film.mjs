#!/usr/bin/env node
// new_film.mjs: start a film project from this skill's template.
//   node <skill>/scripts/new_film.mjs <project-folder>            create (never overwrites your SCRIPT.md, DESIGN.md or film.html)
//   node <skill>/scripts/new_film.mjs <project-folder> --update   also refresh the engine and tools from the skill
//   node <skill>/scripts/new_film.mjs <project-folder> --hyperframes   set up the back-up engine instead (after
//        `npx hyperframes@0.9.13 init video` in that folder; see assets/hyperframes/README.md)
// It copies assets/template/ (the stage engine, fonts, tools, narration scripts), the narrator's reference clip, and
// writes package.json. It downloads nothing.
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2), update = argv.includes("--update"), hf = argv.includes("--hyperframes"), target = argv.find(a => !a.startsWith("--"));
if (!target) { console.error("usage: node new_film.mjs <project-folder> [--update] [--hyperframes]"); process.exit(1); }
const DEST = resolve(target);
// yours once they exist: the script, the design, the film, and the two spelling lists
const YOURS = new Set(["SCRIPT.md", "DESIGN.md", "film.config.json", "video/film.html", "narration/script.mjs", "tools/captions.mjs"]);
// with the back-up engine, the stage engine's own files stay out of the project
const STAGE_ONLY = /^(video\/(film\.html|stage\.(js|css))|film\.config\.json|tools\/(clock|render|check|shots|doctor)\.mjs|tools\/(audio\.sh|mix\.py)|tools\/lib\/)/;

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
copyTree(join(SKILL, "assets/template"), rel => join(DEST, rel), rel => hf && (STAGE_ONLY.test(rel) || rel === "tools/hits.mjs"));
for (const d of ["narration/audio", "narration/voices", "video/data", "video/assets/audio", "out"].concat(hf ? [] : ["shots"])) mkdirSync(join(DEST, d), { recursive: true });
for (const f of ["w_mid.wav", "w_mid.txt"]) if (!existsSync(join(DEST, "narration/voices", f))) copyFileSync(join(SKILL, "assets/voices", f), join(DEST, "narration/voices", f));
if (!existsSync(join(DEST, "package.json"))) writeFileSync(join(DEST, "package.json"), JSON.stringify({ name: DEST.split(/[\\/]/).pop().toLowerCase().replace(/[^a-z0-9-]+/g, "-"), private: true, type: "module" }, null, 2) + "\n");
if (!existsSync(join(DEST, ".gitignore"))) writeFileSync(join(DEST, ".gitignore"), "node_modules/\n.env.local\nshots/\nout/frames/\n__pycache__/\n.DS_Store\n");
console.log(`${DEST}: ${copied} files copied, ${kept} kept as they were${hf ? " (HyperFrames back-up engine)" : ""}`);
console.log(hf ? `next: follow assets/hyperframes/README.md from step 4 (node tools/build.mjs builds the clock and index.html)` : `next:  cd "${DEST}"  &&  node tools/doctor.mjs`);
