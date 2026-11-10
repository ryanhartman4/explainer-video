"""mix.py : voice + music + sound hits -> video/assets/audio/mix.wav (48 kHz stereo), the film's whole soundtrack.

The voice clips sit at full level at their start times from video/data/timing.js (tools/voice_post.sh has already put
each at -20 LUFS). The music bed is ducked under them by a volume lane: 0.5 on the opening frame, 0.13 under the
narration, lifted to 0.3 only in gaps of 2 s or more, a swell after the last word. Those are the levels the author
approved by ear on film 5; change them here, then measure (tools/audio.sh prints the loudness).
Missing parts are skipped: no voice yet gives a music-only preview on the same lane.

Run: uv run -q --python 3.12 --with numpy python -I tools/mix.py
"""
import os, re, json, subprocess, sys, wave
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
A = os.path.join(ROOT, "video/assets/audio")
SR = 48000
UNDER, GAP_LIFT, OPEN, CLOSE = 0.13, 0.30, 0.50, 0.45

T = json.loads(re.search(r"=\s*(\{.*\})\s*;", open(os.path.join(ROOT, "video/data/timing.js")).read(), re.S).group(1))
N = int(round(T["total"] * SR))
mix = np.zeros((N, 2))

def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, "<f4").reshape(-1, 2).astype(np.float64)

def put(sig, t0, gain=1.0):
    i = int(round(t0 * SR))
    if i >= N: return
    sig = sig[: N - i]
    mix[i:i + len(sig)] += sig * gain

voices = []
for s in T["scenes"]:
    f = os.path.join(ROOT, "video", s["audio"]) if s.get("audio") else None
    if f and os.path.exists(f):
        put(load(f), s["vo"]); voices.append(s["id"])

music = os.path.join(A, "music.wav")
if os.path.exists(music):
    sc = T["scenes"]; v0 = sc[0]["vo"]; v_end = sc[-1]["vo"] + sc[-1]["speech"]; total = T["total"]
    pts = [(0, OPEN), (max(0.01, v0 - 0.45), 0.42), (max(0.02, v0 - 0.05), UNDER)]
    for a, b in zip(sc, sc[1:]):                                  # lift only in a gap of 2 s or more
        g0, g1 = a["vo"] + a["speech"], b["vo"]
        if g1 - g0 >= 2: pts += [(g0 + 0.2, UNDER), (g0 + 0.8, GAP_LIFT), (g1 - 0.5, GAP_LIFT), (g1 - 0.05, UNDER)]
    pts += [(v_end + 0.15, UNDER), (min(total - 0.5, v_end + 1.2), CLOSE), (total - 0.4, 0.3), (total, 0.0)]
    pts.sort()
    lane = np.interp(np.arange(N) / SR, [p[0] for p in pts], [p[1] for p in pts])
    m = load(music)[:N]
    mix[: len(m)] += m * lane[: len(m), None]

hits = os.path.join(A, "hits.wav")
if os.path.exists(hits): put(load(hits), 0)

peak = np.abs(mix).max() if N else 0
if peak > 0.98: mix *= 0.98 / peak
with wave.open(os.path.join(A, "mix.wav"), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype("<i2").tobytes())
print(f"video/assets/audio/mix.wav: {N / SR:.1f} s, voice {len(voices)}/{len(T['scenes'])} paragraphs, music {'yes' if os.path.exists(music) else 'no'}, "
      f"hits {'yes' if os.path.exists(hits) else 'no'}, peak {20 * np.log10(max(peak, 1e-9)):.1f} dBFS{' (scaled down to -0.2)' if peak > 0.98 else ''}")
