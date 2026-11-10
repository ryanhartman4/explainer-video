"""clips.py: cut the real recordings SCRIPT.md names, so a paragraph can play a clip in place of the narrator.

  uv run -q --python 3.12 --with numpy python -I tools/clips.py [--force]        (tools/audio.sh runs it for you)

A clip paragraph in SCRIPT.md has an "@clip" line and the clip's own words (see tools/lib/clips.mjs):
  ## 4. Karpathy on compression
  @clip clips/karpathy.mp4 5.55 11.2
  > A trained network is, in some sense, a compressed file.

For paragraph N this writes
  narration/audio/final/sNN.mp3      the clip's sound: mono, at the narrator's level (-20 LUFS), a short fade at each end
  narration/audio/final/sNN.json     word times for the typed words, estimated from the pauses (narration/align.py:
                                     no speech model, so treat them as good to about a third of a second)
  video/assets/clips/sNN/00000.jpg   its frames, 30 a second, at most 1280 px wide
tools/clock.mjs then gives the paragraph the clip's length, and film.html shows it with scene.clip(p, { ... }).
A clip already cut from the same file and times is left alone (--force cuts it again). A paragraph that stopped being
a clip has its cut removed.

Use a clip only when the user asked for clips. Type the words from the recording itself, name the speaker and the
source on screen and under "## Sources", and never have the narrator's voice speak a real person's words."""
import os, sys, re, json, glob, shutil, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "narration"))
import numpy as np                      # noqa: E402
from align import align                 # noqa: E402

FPS, MAXW, LUFS = 30, 1280, -20
FINAL = os.path.join(ROOT, "narration/audio/final")
FRAMES = os.path.join(ROOT, "video/assets/clips")
run = lambda *a, **k: subprocess.run(a, capture_output=True, text=True, **k)


def wanted():
    js = ("import {scenes} from './narration/script.mjs'; import {clips} from './tools/lib/clips.mjs'; const C = clips();"
          "console.log(JSON.stringify(scenes().filter(s => C[s.n]).map(s => ({n: s.n, title: s.title, text: s.text, ...C[s.n]}))))")
    r = run("node", "--input-type=module", "-e", js, cwd=ROOT)
    if r.returncode:
        sys.exit((r.stderr.strip().splitlines() or ["could not read SCRIPT.md"])[-1])
    return json.loads(r.stdout)


def ff(*a):
    r = run("ffmpeg", "-hide_banner", "-nostats", "-y", *a)
    if r.returncode:
        sys.exit("ffmpeg failed: " + (r.stderr.strip().splitlines() or ["?"])[-1])
    return r.stderr


def cut(c, force):
    sid = f"s{c['n']:02d}"; src = os.path.join(ROOT, c["file"]); base = os.path.join(FINAL, sid); fdir = os.path.join(FRAMES, sid)
    if not os.path.exists(src):
        sys.exit(f"paragraph {c['n']}: {c['file']} is not in the project. Put the recording there (ask the user before "
                 f"downloading anything), or fix the path on the @clip line.")
    key = {"file": c["file"], "start": c["start"], "end": c["end"], "text": c["text"], "mtime": int(os.path.getmtime(src))}
    if not force and os.path.exists(base + ".json") and os.path.exists(base + ".mp3"):
        old = json.load(open(base + ".json")).get("clip") or {}
        if old.get("key") == key and len(glob.glob(os.path.join(fdir, "*.jpg"))) == old.get("frames"):
            print(f"{sid}: clip already cut ({old['frames']} frames), skipping"); return
    dur = c["dur"]; at = ["-ss", f"{c['start']:.3f}", "-t", f"{dur:.3f}", "-i", src]
    os.makedirs(FINAL, exist_ok=True)

    # sound: measure, then set the level in one linear step (no pumping), with a fade at each end so the cut never clicks
    shape = f"highpass=f=70,afade=t=in:d=0.06,afade=t=out:st={max(0, dur - 0.12):.3f}:d=0.12"
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", ff(*at, "-vn", "-ac", "1", "-af", shape + f",loudnorm=I={LUFS}:TP=-3:LRA=11:print_format=json", "-f", "null", "-"))
    if not m:
        sys.exit(f"paragraph {c['n']}: {c['file']} has no sound between {c['start']} and {c['end']} s")
    L = json.loads(m.group(0))
    if "inf" in L["input_i"]:
        sys.exit(f"paragraph {c['n']}: {c['file']} is silent between {c['start']} and {c['end']} s")
    gain = min(LUFS - float(L["input_i"]), -3.0 - float(L["input_tp"]))          # reach -20 LUFS unless the peak would pass -3 dBTP
    ff(*at, "-vn", "-ac", "1", "-ar", "44100", "-af", shape + f",volume={gain:.2f}dB", "-c:a", "libmp3lame", "-b:a", "192k", base + ".mp3")

    # picture: every frame as a JPEG, so the film can draw any frame of the clip in any order
    shutil.rmtree(fdir, ignore_errors=True); os.makedirs(fdir)
    ff(*at, "-an", "-vf", f"fps={FPS},scale='min({MAXW},iw)':-2", "-q:v", "3", "-start_number", "0", os.path.join(fdir, "%05d.jpg"))
    frames = sorted(glob.glob(os.path.join(fdir, "*.jpg")))
    if not frames:
        sys.exit(f"paragraph {c['n']}: {c['file']} has no picture between {c['start']} and {c['end']} s")
    w, h = map(int, run("ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", frames[0]).stdout.strip().split(",")[:2])

    # word times for the typed words, from the sound just written
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", base + ".mp3", "-f", "f32le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, "<f4")
    words = [{"word": a["word"], "start": round(float(a["start"]), 3), "end": round(float(a["end"]), 3)} for a in align(x, 16000, c["text"].split())]
    json.dump({"voiceId": "clip:" + c["file"], "text": c["text"], "duration": round(len(x) / 16000, 3), "words": words, "estimated": True,
               "clip": {"dir": f"assets/clips/{sid}", "fps": FPS, "frames": len(frames), "w": w, "h": h, "key": key}}, open(base + ".json", "w"), indent=1)
    print(f"{sid}: {c['file']} {c['start']:.2f} to {c['end']:.2f} s -> {len(frames)} frames at {w} x {h}, {len(words)} words, "
          f"level {float(L['input_i']):.1f} -> {float(L['input_i']) + gain:.1f} LUFS")
    take = os.path.join(ROOT, "narration/audio", sid + ".mp3")
    if os.path.exists(take):
        print(f"  note: narration/audio/{sid}.mp3 is a narrator take of this paragraph. Delete it and its .json: a clip is never re-voiced, "
              f"and tools/voice_post.sh would put that take back in place of the clip.")


def main():
    force = "--force" in sys.argv
    want = wanted(); keep = {f"s{c['n']:02d}" for c in want}
    for f in glob.glob(os.path.join(FINAL, "s[0-9][0-9].json")):       # a paragraph that is no longer a clip
        sid = os.path.basename(f)[:3]
        if sid not in keep and "clip" in json.load(open(f)):
            for p in (f, f[:-5] + ".mp3"):
                if os.path.exists(p): os.remove(p)
            shutil.rmtree(os.path.join(FRAMES, sid), ignore_errors=True)
            print(f"{sid}: no longer a clip, its cut is removed")
    for c in want:
        cut(c, force)
    if not want:
        print("no @clip lines in SCRIPT.md")


if __name__ == "__main__":
    main()
