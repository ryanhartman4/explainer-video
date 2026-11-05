"""make_hits.py HITS.json TIMING.js OUT.wav : the film's sound hits, synthesized (DESIGN.md "Sound").

Each hit starts on the exact sample of its visual event (round(t * SR)): on the frame, never early. Pitched hits use
the music bed's key (D major pentatonic), so they sit inside the score. Every noise source is seeded.

Run: uv run --python 3.12 --with numpy --with scipy python -I tools/make_hits.py video/data/hits.json video/data/timing.js video/assets/audio/hits.wav
"""
import sys, json, re, wave
import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
hits = json.load(open(sys.argv[1]))
total = json.loads(re.search(r"=\s*(\{.*\})\s*;", open(sys.argv[2]).read(), re.S).group(1))["total"]
N = int((total + 1.0) * SR)
L, R = np.zeros(N), np.zeros(N)
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
t_ = lambda d: np.arange(int(d * SR)) / SR
# D major pentatonic up the ladder: rung i -> D4 E4 F#4 A4 B4 D5 E5 F#5 A5
PENTA = [62, 64, 66, 69, 71, 74, 76, 78, 81]

def add(sig, t0, gain=1.0, pan=0.0):
    i = int(round(t0 * SR))
    if i >= N: return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 - pan)); R[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 + pan))

def lp(x, f): return sosfilt(butter(2, f, fs=SR, output="sos"), x)
def bp(x, a, b): return sosfilt(butter(2, [a, b], btype="band", fs=SR, output="sos"), x)

def tick(i):
    """a glassy tick a twelfth above the pluck's pitch: the flat axis's rungs going in"""
    t = t_(0.09); f = hz(PENTA[i] + 19)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 55) + 0.3 * np.sin(2 * np.pi * 2.01 * f * t) * np.exp(-t * 90)) * np.minimum(1, t / 0.0015)

def pluck(i, seed):
    """Karplus-Strong string on the rung's scale degree"""
    f = hz(PENTA[i]); n = int(1.6 * SR); p = int(round(SR / f))
    rng = np.random.default_rng(seed); buf = lp(rng.uniform(-1, 1, p), 4000); out = np.zeros(n)
    for k in range(n):
        out[k] = buf[k % p]
        buf[k % p] = 0.996 * 0.5 * (buf[k % p] + buf[(k + 1) % p])
    return out * np.minimum(1, np.arange(n) / (0.002 * SR))

def bell(m, d, bright=1.0):
    t = t_(d); f = hz(m); out = np.zeros_like(t)
    for k, (r, a, dec) in enumerate([(1, 1, 1.6), (2.01, 0.45 * bright, 2.6), (3.0, 0.18 * bright, 4.0), (4.2, 0.08 * bright, 6.0)]):
        out += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dec)
    return out * np.minimum(1, t / 0.004)

def thump():
    """felt mallet on a low drum: the line entering the band"""
    t = t_(0.9); f = 52 + 22 * np.exp(-t * 18)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = (np.sin(ph) + 0.3 * np.sin(2 * ph)) * np.exp(-t * 5.5)
    felt = lp(np.random.default_rng(3).standard_normal(len(t)), 260) * np.exp(-t * 40) * 0.8
    return (body + felt) * np.minimum(1, t / 0.003)

def stand():
    """a soft wooden thock: the axis lands upright"""
    t = t_(0.35); f = 118 + 40 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t * 14) + bp(np.random.default_rng(4).standard_normal(len(t)), 300, 1500) * np.exp(-t * 60) * 0.4) * np.minimum(1, t / 0.002)

def scratch():
    """a dry pencil stroke: band-passed noise with a grainy envelope"""
    t = t_(0.34); rng = np.random.default_rng(5)
    grain = np.clip(lp(np.abs(rng.standard_normal(len(t))), 60) * 3, 0, 1)
    env = np.sin(np.pi * np.clip(t / 0.34, 0, 1)) ** 0.7
    return bp(rng.standard_normal(len(t)), 2200, 7000) * grain * env

def hop():
    """Claw'd lands: a small, round 'bup'"""
    t = t_(0.12); f = 330 - 90 * (t / 0.12)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 32) * np.minimum(1, t / 0.003)

SOUNDS = {
    "tick": lambda h, k: (tick(h["pitch"]), 0.10, -0.2 + 0.05 * h["pitch"]),
    "pluck": lambda h, k: (pluck(h["pitch"], 100 + k), 0.30 * h.get("gain", 0.7), -0.25 + 0.06 * h["pitch"]),
    "stand": lambda h, k: (stand(), 0.45, -0.1),
    "split": lambda h, k: (np.concatenate([bell(69, 0.14, 0.6)[: int(0.14 * SR)], bell(74, 1.6, 0.6)]), 0.16, 0.0),
    "thump": lambda h, k: (thump(), 0.55, 0.0),
    "merge": lambda h, k: (sum(bell(m, 3.0, 0.7) * (0.9 ** j) for j, m in enumerate([62, 66, 69, 74])), 0.12, 0.0),
    "scratch": lambda h, k: (scratch(), 0.22, -0.15),
    "hop": lambda h, k: (hop(), 0.18, 0.35),
    "card": lambda h, k: (bell(81, 2.0, 0.5) + 0.6 * np.pad(bell(88, 1.6, 0.4), (0, int(0.4 * SR))), 0.07, 0.0),
}
for k, h in enumerate(hits):
    sig, gain, pan = SOUNDS[h["kind"]](h, k)
    add(sig, h["t"], gain, pan)

# a short, dark room so the hits sit with the music bed's reverb
def ir(seed):
    r = np.random.default_rng(seed); n = int(1.2 * SR); t = np.arange(n) / SR
    return lp(r.standard_normal(n) * np.exp(-t * 4.5), 3000) * 0.01
from scipy.signal import fftconvolve
L, R = 0.8 * L + fftconvolve(L, ir(7))[:N], 0.8 * R + fftconvolve(R, ir(8))[:N]
peak = max(np.abs(L).max(), np.abs(R).max(), 1e-9)
if peak > 0.89: L, R = L / peak * 0.89, R / peak * 0.89                       # never above -1 dBFS
pcm = (np.stack([L, R], 1) * 32767).astype("<i2")
with wave.open(sys.argv[3], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f"{sys.argv[3]}: {len(hits)} hits, {N / SR:.1f} s, peak {20 * np.log10(peak):.1f} dBFS")
