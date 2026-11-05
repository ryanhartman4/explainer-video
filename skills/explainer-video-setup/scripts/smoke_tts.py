"""smoke_tts.py: one sentence in the narrator's voice, to prove the local voice works end to end.
  uv run --project ~/Developer/mlx-audio python smoke_tts.py REF.wav OUT.wav
REF.wav needs its transcript beside it as REF.txt (the explainer-video skill's assets/voices/w_mid.wav has one).
Works offline once the Breeze model is downloaded; prints the clip's length, the time it took, and PASS or FAIL."""
import os, sys, time
os.environ.setdefault("HF_HUB_OFFLINE", "1")
import numpy as np
import soundfile as sf

MODEL = "mlx-community/Breeze-TTS-2-mlx-8bit"
TEXT = "Setup check: this is the narrator's voice, cloned on this Mac. Does it sound right?"
DIRECTION = ("A warm, curious science narrator explaining an idea to a friend. Lively, varied pitch and natural "
             "emphasis; questions sound like real questions.")

ref, out = sys.argv[1], sys.argv[2]
ref_text = open(os.path.splitext(ref)[0] + ".txt").read().strip()
from mlx_audio.tts.utils import load_model  # noqa: E402

t0 = time.time(); model = load_model(MODEL); load_s = time.time() - t0
t0 = time.time()
x = np.concatenate([np.asarray(r.audio, np.float32).reshape(-1) for r in
                    model.generate(text=TEXT, ref_audio=ref, ref_text=ref_text, instruct=DIRECTION, cfg_scale=4.0, seed=1)])
gen_s = time.time() - t0
sf.write(out, x, model.sample_rate)
dur = len(x) / model.sample_rate; peak = float(np.abs(x).max()) if len(x) else 0.0
ok = 2.5 <= dur <= 12 and peak > 0.05
print(f"{out}: {dur:.1f} s of audio in {gen_s:.1f} s (model load {load_s:.1f} s), peak {peak:.2f}")
print("PASS: play it and check it sounds like the narrator" if ok else "FAIL: the clip is too short, too long or silent")
sys.exit(0 if ok else 1)
