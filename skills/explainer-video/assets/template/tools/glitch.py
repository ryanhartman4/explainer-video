"""glitch.py : screen a local (Breeze or OmniVoice) take for glitches without listening (playbook "Glitch screen").

Syllables per second for every sentence, from the word times in narration/audio/sNN.json; sentences more than 1.8 sd
from the take's mean are flagged. Short lines and number-heavy text pace oddly without being glitches: regenerate the
flagged sentence's paragraph with `tts_local.py scenes ... N --force --seed K` (it re-seeds every sentence of it; write the
alternate take with --out narration/audio/altK/, inside the project, never the session scratchpad) and keep the take only if the flagged sentence's pace moves.
Run: uv run -q --python 3.12 python -I tools/glitch.py [DIR]   (DIR: an alternate take's folder, default narration/audio)
"""
import json, glob, re, statistics, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
syl = lambda w: max(1, len(re.findall(r"[aeiouy]+", re.sub(r"e\b", "", w.lower()))))
rows = []
DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "narration/audio")
for f in sorted(glob.glob(os.path.join(DIR, "s[0-9][0-9].json"))):
    words = json.load(open(f))["words"]
    cur = []
    for w in words:
        cur.append(w)
        if re.search(r"[.?!]$", w["word"]):
            d = cur[-1]["end"] - cur[0]["start"]
            rows.append((os.path.basename(f)[:3], " ".join(x["word"] for x in cur), sum(syl(x["word"]) for x in cur) / max(d, 0.1), d))
            cur = []
m = statistics.mean(r[2] for r in rows); sd = statistics.pstdev(r[2] for r in rows)
print(f"{len(rows)} sentences, {m:.2f} syllables/s (sd {sd:.2f})")
for sc, text, r, d in rows:
    z = (r - m) / sd if sd else 0
    flag = "  <-- check" if abs(z) > 1.8 else ""
    print(f"{sc} {r:5.2f}/s {d:5.2f}s z={z:+.1f}{flag}  {text[:80]}")
