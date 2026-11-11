"""trim_check.py: prove that narration/tts_local.py's trim() keeps every word (playbook "Trim by loudness, never by pitch").
  uv run --project ~/Developer/mlx-audio python tools/trim_check.py gen [n ...] [--ref narration/voices/w_mid.wav]
      untrimmed sentences of scenes n (default all) -> narration/audio/raw_check/sNN_II.wav
  uv run --project ~/Developer/mlx-audio python tools/trim_check.py test [DIR]
      fails (exit 1) if trim() starts a sentence after its first 10 ms frame within 25 dB of its peak, ends it before
      its last such frame, or leaves no fade. One cut is allowed: when more than T.TAIL of quiet (20 to 30 dB under the peak)
      follows the last frame within 20 dB, the take ran on into hiss, and trim() ends it T.HISS after that frame. It finds the trimmed audio inside the raw take, so it does not trust
      trim()'s own arithmetic.
gen once (the raw takes do not depend on trim()), then run test after every change to trim(). gen costs about 2.5
minutes of compute per minute of speech, so name one or two scenes. Film 5's pitch-based trim failed 18 of 23
sentences here; the loudness trim passes 23 of 23."""
import os, sys, glob, argparse
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, os.path.join(ROOT, "narration"))
import tts_local as T  # noqa: E402
from align import envelope  # noqa: E402

RAW = os.path.join(ROOT, "narration/audio/raw_check")


def gen(a):
    import soundfile as sf
    ref_text = open(os.path.splitext(a.ref)[0] + ".txt").read().strip()
    m = T.load(); os.makedirs(RAW, exist_ok=True)
    for sc in T.script():
        if a.which and str(sc["n"]) not in a.which:
            continue
        for i, sent in enumerate(T.sentences(sc["say"])):
            d = T.direction_for(sent, sc["n"])
            kw = dict(instruct=d, cfg_scale=T.GUIDANCE) if d else {}
            x = T.say_one(m, sent, seed=1000 * sc["n"] + i, ref_audio=a.ref, ref_text=ref_text, **kw)
            sf.write(f"{RAW}/s{sc['n']:02d}_{i:02d}.wav", x, m.sample_rate)
            print(f"s{sc['n']:02d}_{i:02d}  {len(x) / m.sample_rate:5.2f} s  {sent[:60]}", flush=True)


def located(x, y):
    """sample offset of y (a trim of x, faded only at its end) inside x, or None"""
    k = min(len(y) // 2, 2048)
    for i in np.flatnonzero(x == y[0]):
        if np.array_equal(x[i:i + k], y[:k]):
            return int(i)
    return None


def check(path):
    """None if trim() keeps the sentence whole, else what it lost"""
    import soundfile as sf
    x, sr = sf.read(path, dtype="float32")
    db, _ = envelope(x, sr)
    loud = np.flatnonzero(db > db.max() - 25)                               # speech-loud 10 ms frames
    first, last = loud[0] * 0.01, (loud[-1] + 1) * 0.01
    e20, e30 = ((np.flatnonzero(db > db.max() - k)[-1] + 1) * 0.01 for k in (20, 30))
    if e30 - e20 > T.TAIL: last = min(last, e20 + T.HISS)                 # the take ran on into hiss: that may go
    y = T.trim(x, sr); a = located(x, y)
    if a is None:
        return "trimmed audio is not a slice of the raw take"
    start, end = a / sr, (a + len(y)) / sr
    problems = [f"starts {start:.2f} s, speech from {first:.2f} s"] if start > first else []
    problems += [f"ends {end:.2f} s, speech runs to {last:.2f} s"] if end < last else []
    problems += ["no fade at the end"] if abs(float(y[-1])) >= 1e-3 else []
    return "; ".join(problems) or None


def test(a):
    files = sorted(glob.glob(os.path.join(a.dir, "s[0-9][0-9]_[0-9][0-9].wav")))
    if not files:
        sys.exit(f"no sNN_II.wav files in {a.dir}: run gen first")
    fails = [(f, why) for f in files if (why := check(f))]
    for f, why in fails:
        print(f"FAIL {os.path.basename(f)}: {why}")
    print(f"{len(files) - len(fails)}/{len(files)} sentences keep all their speech")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = p.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("gen"); g.add_argument("which", nargs="*"); g.add_argument("--ref", default=os.path.join(ROOT, "narration/voices/w_mid.wav"))
    t = sub.add_parser("test"); t.add_argument("dir", nargs="?", default=RAW)
    args = p.parse_args()
    gen(args) if args.cmd == "gen" else test(args)
