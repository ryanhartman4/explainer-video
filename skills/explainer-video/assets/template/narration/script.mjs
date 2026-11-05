// SCRIPT.md is the single source of the narration: the "> " blockquotes under each "## N. Title" heading.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// spoken spellings, applied only to the text sent to TTS; mirror each in tools/captions.mjs WRITE.
// Faultline used: [/\bFLT4\b/g, "F L T four"], [/\b9B\b/g, "nine B"], [/\bxz\b/g, "X Z"], [/\bKL\b/g, "K L"], [/\bQTIP\b/g, "Q-tip"]
const SAY = [];
export const say = text => SAY.reduce((t, [re, w]) => t.replace(re, w), text);

export function scenes() {
  const out = [];
  let cur = null;
  for (const line of readFileSync(join(ROOT, "SCRIPT.md"), "utf8").split("\n")) {
    const h = line.match(/^## (\d+)\. (.+?)(?: \(|$)/);
    if (h) { cur = { n: +h[1], title: h[2], text: "" }; out.push(cur); continue; }
    if (cur && line.startsWith("> ")) cur.text += (cur.text ? " " : "") + line.slice(2).trim();
  }
  return out.filter(s => s.text);
}
