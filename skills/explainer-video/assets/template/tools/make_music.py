"""make_music.py TIMING.js OUT.wav : an original ambient bed (soft piano arpeggios, warm pad, low bass, room reverb)
as long as the video. Calm and curious, in the spirit of 3Blue1Brown's scores; ducking under the voice happens in
the mix (tools/mix.py's volume lane; with the HyperFrames back-up engine, index.html's), so this file stays at full level.

Run: uv run --python 3.12 --with numpy --with scipy python -I tools/make_music.py video/data/timing.js video/assets/audio/music.wav"""
import sys, json, re, wave
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt

SR = 44100
total = json.loads(re.search(r"=\s*(\{.*\})\s*;", open(sys.argv[1]).read(), re.S).group(1))["total"]
N = int((total + 1.0) * SR)
rng = np.random.default_rng(11)
L, R = np.zeros(N), np.zeros(N)

BPM = 72; BEAT = 60 / BPM; BAR = 4 * BEAT
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)

# D major, one chord per bar: Dadd9, F#m7, Bm7(11), Gmaj7, D/F#, Gadd9, Em7, Asus4 -> A
CHORDS = [
    (38, [50, 57, 64, 66, 69]), (42, [54, 57, 61, 64, 69]), (47, [57, 59, 62, 66, 69]), (43, [55, 59, 62, 66, 71]),
    (42, [57, 62, 66, 69, 74]), (43, [55, 59, 62, 69, 71]), (40, [52, 55, 59, 62, 67]), (45, [57, 62, 64, 69, 74]),
]
A_RES = [57, 61, 64, 69, 73]                                 # the sus4 resolves to A major halfway through bar 8

def add(sig, t0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 - pan)); R[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 + pan))

def piano(m, vel, dur=3.2):
    """additive piano-ish tone: stretched partials, faster decay up the series, soft hammer"""
    n = int(dur * SR); t = np.arange(n) / SR; f0 = hz(m); out = np.zeros(n)
    for k in range(1, 9):
        f = f0 * k * np.sqrt(1 + 0.0004 * k * k)
        if f > 9000: break
        amp = vel / k ** 1.6 * (1.0 if k > 1 else 1.3)
        out += amp * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t * (1.1 + 0.55 * k) * (f0 / 300) ** 0.35)
    att = np.minimum(1, t / 0.006); rel = np.clip((dur - t) / 0.4, 0, 1)
    hammer = rng.standard_normal(n) * np.exp(-t * 90) * 0.02 * vel
    return (out * att + hammer) * rel

def pad(notes, dur):
    """detuned soft-saw stack through a low-pass, slow swell in and out"""
    n = int(dur * SR); t = np.arange(n) / SR; out = np.zeros(n)
    for m in notes:
        for d in (-0.07, 0.0, 0.08):
            f = hz(m) * 2 ** (d / 12); ph = 2 * np.pi * f * t + rng.uniform(0, 6.28)
            out += sum(np.sin(h * ph) / h ** 1.4 for h in range(1, 6))
    out = sosfilt(butter(2, 1400, fs=SR, output="sos"), out)
    env = np.minimum(1, t / (0.45 * dur)) * np.minimum(1, (dur - t) / (0.4 * dur))
    return out * env * 0.012

def bass(m, dur):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m)
    out = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    return out * np.minimum(1, t / 0.08) * np.exp(-t * 0.35) * np.clip((dur - t) / 0.6, 0, 1) * 0.06

nbars = int(np.ceil(total / BAR))
END = total - 7.0                                           # the last chord rings out from here
PATTERNS = [[0, 2, 1, 3, 2, 4, 3, 2], [0, 1, 2, 4, 3, 2, 1, 2], [0, 2, 4, 2, 1, 3, 2, 1]]
for b in range(nbars):
    t0 = b * BAR
    if t0 >= END: break
    root, tones = CHORDS[b % 8]
    cycle = b // 8
    add(pad(tones[:4], BAR * 1.35), t0, pan=-0.1)
    add(bass(root, BAR * 1.2), t0)
    if b >= 2:                                              # piano enters in the third bar
        pat = PATTERNS[cycle % len(PATTERNS)]
        density = 1 if cycle % 4 != 3 else 2                # every fourth cycle breathes: quarter notes only
        for i, j in enumerate(pat):
            if i % density: continue
            tt = t0 + i * BEAT / 2
            notes = A_RES if (b % 8 == 7 and i >= 4) else tones
            m = notes[j % len(notes)] + (12 if (cycle % 2 and i in (3, 7)) else 0)
            vel = 0.20 + 0.08 * rng.random() + (0.06 if i == 0 else 0)
            add(piano(m, vel), tt + rng.normal(0, 0.006), pan=(m - 62) / 30)
    if cycle >= 2 and b % 2 == 0 and rng.random() < 0.7:     # a sparse high voice now and then
        m = rng.choice([t for t in tones if t > 60]) + 12
        add(piano(m, 0.13, 4.0), t0 + BEAT * rng.choice([1, 2, 3]), pan=0.25)

# the ending: Dadd9, held and fading
add(pad([50, 57, 64, 66], 8.0), END, pan=-0.1); add(bass(38, 8.0), END)
for i, m in enumerate([50, 57, 62, 64, 66, 69, 74]):
    add(piano(m, 0.22 - 0.015 * i, 6.5), END + 0.18 * i, pan=(m - 62) / 30)

# room: a stereo noise impulse response, 2.6 s, darker as it decays
def ir(seed):
    r = np.random.default_rng(seed); n = int(2.6 * SR); t = np.arange(n) / SR
    x = r.standard_normal(n) * np.exp(-t * 2.4)
    return sosfilt(butter(1, 3500, fs=SR, output="sos"), x) * 0.012
dry = 0.62
L, R = dry * L + fftconvolve(L, ir(1))[:N], dry * R + fftconvolve(R, ir(2))[:N]
hp = butter(2, 35, btype="high", fs=SR, output="sos"); L, R = sosfilt(hp, L), sosfilt(hp, R)
fade = np.clip((N / SR - np.arange(N) / SR) / 4.0, 0, 1); L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max()); L, R = L / peak * 0.7, R / peak * 0.7   # −3 dB peak

pcm = (np.stack([L, R], 1) * 32767).astype("<i2")
with wave.open(sys.argv[2], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f"{sys.argv[2]}: {N / SR:.1f} s, {nbars} bars at {BPM} BPM")
