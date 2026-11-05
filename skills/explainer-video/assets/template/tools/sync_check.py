"""sync_check.py MP4 [KIND] : do the sound hits still land on their frames after AAC encoding? (playbook "Sound hits")

Cross-correlates a window around each hit of KIND (default thump: low and isolated, so the voice does not confuse it) in the
MP4's audio against video/assets/audio/hits.wav, after a low-pass that keeps the hit and drops the voice.
Lag 0 ms (under 8 ms, half a frame at 60 fps) is in sync. Needs numpy and scipy:
  uv run -q --python 3.12 --with numpy --with scipy python -I tools/sync_check.py out/NAME.mp4 [thump] [--lowpass 150]
"""
import sys, os, json, subprocess, tempfile, wave
import numpy as np
from scipy.signal import correlate, butter, sosfilt

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
args = [a for a in sys.argv[1:] if not a.startswith("--")]
lp = float(sys.argv[sys.argv.index("--lowpass") + 1]) if "--lowpass" in sys.argv else 150.0
if "--lowpass" in sys.argv: args.remove(sys.argv[sys.argv.index("--lowpass") + 1])
mp4, kind = args[0], (args[1] if len(args) > 1 else "thump")
SR = 48000
def pcm(path):
    with tempfile.NamedTemporaryFile(suffix=".wav") as f:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-ac", "1", "-ar", str(SR), f.name], check=True)
        w = wave.open(f.name); return np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(float)
mix, ref = pcm(mp4), pcm(os.path.join(ROOT, "video/assets/audio/hits.wav"))
sos = butter(4, lp, fs=SR, output="sos")
hits = [h for h in json.load(open(os.path.join(ROOT, "video/data/hits.json"))) if h["kind"] == kind][:3]
if not hits: sys.exit(f"no '{kind}' hits in video/data/hits.json")
for h in hits:
    a, b = int((h["t"] - 0.3) * SR), int((h["t"] + 0.6) * SR)
    x, y = sosfilt(sos, mix[a:b]), sosfilt(sos, ref[a:b])
    c = correlate(x - x.mean(), y - y.mean(), mode="full"); lag = (np.argmax(c) - (len(y) - 1)) / SR
    print(f"{kind} at {h['t']:.3f} s: lag {lag * 1000:+.1f} ms ({lag * 60:+.2f} frames){'' if abs(lag) < 0.008 else '  <-- out of sync'}")
