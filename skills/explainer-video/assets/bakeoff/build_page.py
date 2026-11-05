"""build_page.py: fill page.template.html with the clips, measurements and pitch traces -> page/index.html, and write the reference
clip as page/audio/reference.mp3. Run after bakeoff.py analyze and loudmatch.py:
  uv run --project ~/Developer/mlx-audio python review/tts-bakeoff/build_page.py"""
import os, sys, json, subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from bakeoff import LINES, PARA, CLIPS, REF, REF_TEXT, HIGGS_TAG, BREEZE_DIRECTION, pitch  # noqa: E402

R = json.load(open(f"{HERE}/results.json"))
ENGINES = {
    "omnivoice": {"label": "OmniVoice", "sub": "current engine, 8-bit", "license": "CC-BY-NC"},
    "higgs": {"label": "Higgs TTS 3", "sub": "Boson AI, 4.7B", "license": "Free for creators, with a credit line"},
    "qwen3": {"label": "Qwen3-TTS", "sub": "Alibaba, 1.7B Base", "license": "Apache 2.0"},
    "breeze": {"label": "Breeze TTS 2", "sub": "BreezeBlue, 3.5B, 8-bit", "license": "Non-commercial"},
}
PLAIN = ["omnivoice", "higgs", "qwen3", "breeze"]
ALL = ["omnivoice", "higgs", "higgs__dir", "qwen3", "breeze", "breeze__dir"]
COLS = {k: {"engine": k.split("__")[0], "dir": k.endswith("__dir"),
            "label": ENGINES[k.split("__")[0]]["label"] + (" + direction" if k.endswith("__dir") else "")} for k in ALL}
TARGETS = {"lead_film": ["lead"], "lead_pair": ["Lead", "lead"], "bass": ["bass"], "tear": ["tear"], "wind": ["wind"],
           "read": ["read"]}


def clip(col, row):
    eng = COLS[col]["engine"]; cid = row + ("__dir" if COLS[col]["dir"] else "")
    m = R.get(eng, {}).get(cid)
    if not m:
        return None
    out = {"src": f"audio/{eng}/{cid}.mp3", **m}
    t, st, _ = pitch(f"{CLIPS}/{eng}/{cid}.wav")
    step = max(1, len(t) // 120)
    out["contour"] = [[round(float(a), 2), round(float(b), 1)] for a, b in zip(t[::step], st[::step])]
    return out


meta = {i: (hint, c, t) for i, hint, c, t in LINES}
sections = [
    {"key": "het", "title": "Same spelling, different word", "kind": "verdict", "cols": PLAIN,
     "intro": "Mark each clip Right only if every highlighted word is said the way the hint says.",
     "rows": [{"id": i, "text": meta[i][2], "hint": meta[i][0], "targets": TARGETS[i]}
              for i in ["lead_film", "lead_pair", "bass", "tear", "wind", "read"]]},
    {"key": "q", "title": "Questions and a statement", "kind": "pick", "cols": ALL,
     "intro": "The trace under each clip is its pitch. The last stretch turns green when it goes the expected way "
              "(up by more than 1 semitone for a rise, down by more than 1 for a fall). Pick the best take in each row.",
     "rows": [{"id": i, "text": meta[i][2], "hint": meta[i][0], "expect": meta[i][1]}
              for i in ["q_open", "q_yesno", "q_decl", "q_wh", "q_alt", "s_stmt"]]},
    {"key": "para", "title": "A paragraph from the film", "kind": "pick", "cols": ALL,
     "intro": "Read whole in one generation, or one sentence at a time with fixed pauses, as tts_local.py does now. "
              "Range is the spread of pitch across the clip in semitones; a flat read has a small range.",
     "rows": [{"id": "para_whole", "text": PARA, "hint": "whole paragraph, one generation"},
              {"id": "para_split", "text": PARA, "hint": "sentence by sentence, joined (the film's current method)"}]},
]
clips = {f"{c}/{r['id']}": clip(c, r["id"]) for s in sections for r in s["rows"] for c in s["cols"]}
clips = {k: v for k, v in clips.items() if v}
summary = {e: {"contour": R[e].get("_contour"), "contour_dir": R[e].get("_contour__dir"),
               "range": R[e]["_mean_range_st"], "speed": R[e]["_speed"]["x_realtime"]} for e in PLAIN}
os.makedirs(f"{HERE}/page/audio", exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", REF, "-ar", "44100", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "96k",
                f"{HERE}/page/audio/reference.mp3"], check=True)
data = json.dumps({"engines": ENGINES, "cols": COLS, "sections": sections, "clips": clips, "summary": summary,
                   "reference": {"src": "audio/reference.mp3", "text": REF_TEXT},
                   "directions": {"higgs": HIGGS_TAG, "breeze": BREEZE_DIRECTION}}, separators=(",", ":"))
page = open(f"{HERE}/page.template.html").read().replace("/*DATA*/", data.replace("</", "<\\/"), 1)
open(f"{HERE}/page/index.html", "w").write(page)       # data embedded, so the page needs no fetch
print(len(clips), "clips;", len(page) // 1024, "KB page/index.html")
