"""align.py: word timings for speech whose text is known, with no ASR model. Used for local TTS (Breeze TTS 2; before it OmniVoice), which
returns audio only.

Speech is found with an RMS envelope (10 ms frames). Every word that ends in punctuation is a likely pause; those
breaks are matched, in order, to the silent gaps actually found (dynamic programming over expected vs found times).
Between matched anchors, words share the time in proportion to an estimate of their spoken length.

  align(samples, sr, words) -> [{"word", "start", "end"}]      (seconds from the start of `samples`)
  python align.py AUDIO.json-with-words AUDIO.mp3              (accuracy check against known timestamps)"""
import re
import numpy as np

FRAME = 0.01
NUM = {"0": 4, "1": 3, "2": 3, "3": 5, "4": 4, "5": 4, "6": 3, "7": 5, "8": 4, "9": 4}


def spoken_len(word):
    """rough count of spoken letters: digits and symbols are read out as words"""
    n = 0
    for ch in word:
        if ch.isalpha() or ch == "'":
            n += 1
        elif ch.isdigit():
            n += NUM[ch]
        elif ch in ".%" and re.search(r"\d", word):
            n += 5 if ch == "." else 7
    return n + 2                                  # every word costs a little onset time


def envelope(x, sr):
    hop = int(sr * FRAME)
    n = len(x) // hop
    rms = np.sqrt((x[: n * hop].reshape(n, hop).astype(np.float64) ** 2).mean(1) + 1e-12)
    db = 20 * np.log10(rms)
    return db, db > max(db.max() - 38, -50)


def clean(voiced, blip=0.12, quiet=0.25):
    """drop short voiced blips (breaths, clicks) that sit alone between long silences"""
    v = voiced.copy(); n = len(v); i = 0
    while i < n:
        if v[i]:
            j = i
            while j < n and v[j]:
                j += 1
            before = i - (np.flatnonzero(v[:i])[-1] + 1 if v[:i].any() else 0)
            after = (np.flatnonzero(v[j:])[0] if v[j:].any() else n - j)
            if (j - i) * FRAME < blip and before * FRAME >= quiet and after * FRAME >= quiet:
                v[i:j] = False
            i = j
        else:
            i += 1
    return v


def pauses(voiced, min_len=0.09):
    """(start, end) of internal silent runs in seconds, plus the speech span"""
    on = np.flatnonzero(voiced)
    if len(on) == 0:
        return [], 0.0, len(voiced) * FRAME
    first, last = on[0], on[-1]
    out, i = [], first
    while i <= last:
        if not voiced[i]:
            j = i
            while j <= last and not voiced[j]:
                j += 1
            if (j - i) * FRAME >= min_len:
                out.append((i * FRAME, j * FRAME))
            i = j
        else:
            i += 1
    return out, first * FRAME, (last + 1) * FRAME


def align(x, sr, words):
    if x.ndim > 1:
        x = x.mean(1)
    _, voiced = envelope(x, sr)
    voiced = clean(voiced)
    gaps, t0, t1 = pauses(voiced)
    w = np.array([spoken_len(t) for t in words], float)
    frac_word = np.cumsum(w) / w.sum()                       # share of the talking done by the end of each word
    talk = (t1 - t0) - sum(b - a for a, b in gaps)
    frac_gap, seen = [], 0.0
    for a, b in gaps:                                       # share of the talking done when each gap begins
        frac_gap.append((a - t0 - seen) / talk); seen += b - a
    breaks = [i for i, t in enumerate(words[:-1]) if re.search(r"[.,;:?!]$", t)]
    # DP: match breaks to gaps in order, comparing talking-time positions (in seconds of talk)
    U, B, G = 0.6, len(breaks), len(gaps)
    skip_gap = [0.8 * min(b - a, 0.6) for a, b in gaps]      # an unexplained long pause is unlikely
    INF = 1e9
    dp = np.full((B + 1, G + 1), INF); dp[0, 0] = 0
    for j in range(1, G + 1):
        dp[0, j] = dp[0, j - 1] + skip_gap[j - 1]
    move = np.zeros((B + 1, G + 1), int)                 # 0: skip gap, 1: skip break, 2: match
    for i in range(1, B + 1):
        e = frac_word[breaks[i - 1]]
        for j in range(0, G + 1):
            best, how = dp[i - 1, j] + U, 1
            if j > 0:
                c = dp[i, j - 1] + skip_gap[j - 1]
                if c < best:
                    best, how = c, 0
                c = dp[i - 1, j - 1] + talk * abs(e - frac_gap[j - 1])
                if c < best:
                    best, how = c, 2
            dp[i, j], move[i, j] = best, how
    j = G
    for jj in range(G + 1):                              # trailing gaps may stay unmatched, at their skip cost
        if dp[B, jj] + sum(skip_gap[jj:]) < dp[B, j] + sum(skip_gap[j:]):
            j = jj
    anchors, i = {}, B
    while i > 0:
        if move[i, j] == 2:
            anchors[breaks[i - 1]] = gaps[j - 1]; i -= 1; j -= 1
        elif move[i, j] == 1:
            i -= 1
        else:
            j -= 1
    # spread words between anchors in proportion to spoken length, over talking time only
    out, start, seg = [], t0, []
    def flush(seg, a, b):
        tot = sum(w[k] for k in seg); t = a
        for k in seg:
            d = (b - a) * w[k] / tot
            out.append({"word": words[k], "start": round(t, 3), "end": round(t + d, 3)}); t += d
    for k in range(len(words)):
        seg.append(k)
        if k in anchors:
            flush(seg, start, anchors[k][0]); start = anchors[k][1]; seg = []
    flush(seg, start, t1)
    return out


if __name__ == "__main__":
    import sys, json, subprocess
    ref = json.load(open(sys.argv[1]))
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", sys.argv[2], "-ac", "1", "-ar", "24000", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(pcm, np.float32)
    got = align(x, 24000, [w["word"] for w in ref["words"]])
    err = np.array([g["start"] - r["start"] for g, r in zip(got, ref["words"])])
    print(f"{len(err)} words  mean |err| {np.abs(err).mean():.3f} s  p90 {np.percentile(np.abs(err), 90):.3f} s  max {np.abs(err).max():.3f} s")
