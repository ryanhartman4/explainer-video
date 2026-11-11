"""tts_local.py: narration with Breeze TTS 2 (MLX, through mlx-audio) on this Mac, the local alternative to ElevenLabs
(no API, no credits). Writes the same files as tts.mjs (narration/audio/sNN.mp3 + sNN.json with word times), so
voice_post.sh, clock.mjs and captions.mjs work unchanged.

  design [count] [--instruct "A calm, middle-aged American man with a low, warm voice."] -> narration/voices/vK.wav + vK.txt
  scenes --ref narration/voices/v1.wav [n ... | all] [--force] [--out DIR] [--seed K]   -> narration/audio/sNN.mp3 + sNN.json

Run it with the mlx-audio uv project (setup in the explainer-video playbook):
  uv run --project ~/Developer/mlx-audio python narration/tts_local.py scenes --ref narration/voices/w_mid.wav all

How it keeps quality and sync:
- One voice for the whole film: `design` makes candidates from a spoken description; the one you pick is then the
  cloning reference (with its known transcript) for every sentence, so the speaker never drifts.
- Every sentence is cloned with a delivery direction (direction_for below; Breeze calls it voice direction) at
  guidance 4. The author picked directed takes in 5 of 7 rows of the 2026-11-04 bake-off (this skill's assets/bakeoff/).
- One sentence per generation: sentence boundaries are exact, pauses between them are set here, and align.py only
  has to place words inside a sentence (measured against ElevenLabs timestamps: 0.17 s mean, 0.38 s p90).
- Seeded per sentence, and each take's seed is stored in its .json: re-running a scene reproduces the chosen take.
- trim() cuts by loudness only and fades the last 20 ms. Breeze sometimes runs on for 1 to 2 s of quiet hiss after the
  words; that take shows as a slow sentence in tools/glitch.py, so record that scene on another seed (--seed K --out DIR).
Breeze TTS 2 weights and self-hosted outputs are research and non-commercial only: fine for personal videos and
unmonetized posts, not for paid work (Higgs TTS 3's Creator Use Grant covers monetized videos with a credit line)."""
import os, sys, re, json, argparse, subprocess
os.environ.setdefault("HF_HUB_OFFLINE", "1")
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from align import align, envelope  # noqa: E402

MODEL = os.environ.get("BREEZE_MODEL", "mlx-community/Breeze-TTS-2-mlx-8bit")
DIRECTION = ("A warm, curious science narrator explaining an idea to a friend. Lively, varied pitch and natural "
             "emphasis; questions sound like real questions.")
GUIDANCE = 4.0                                  # cfg_scale for a direction (Breeze's recommended value)
# The pace limit (film 8, 2026-11-11). Breeze rushed five sentences of one take (185 to 218 words a minute in a take that
# averaged 148), the author heard it, and glitch.py did not flag them: it looks for sentences far from the take's own
# mean. A sentence that comes out faster than LIMIT is taken again with the CALM direction on two seeds, and the take
# nearest TARGET is kept. Tested on those five: a new seed alone left them at 159 to 214 words a minute; the calm
# direction brought them to 106 to 162. Each re-take prints a "pace:" line. The playbook, "Local voice", has the record.
LIMIT, TARGET = 176, 158                        # words a minute
CALM = ("A warm, unhurried science narrator explaining an idea to a friend. A steady, relaxed pace with a clear pause at "
        "every comma; natural emphasis; questions sound like real questions.")
PAUSE = {".": 0.42, "?": 0.5, "!": 0.45}        # silence after a sentence, by its last mark
PAD = 0.04                                      # keep this much silence around each trimmed sentence
FADE = 0.02                                     # fade out the last 20 ms, so a cut never clicks


def script():
    """scene texts as spoken (spellings applied), from SCRIPT.md through narration/script.mjs"""
    js = ("import {scenes, say} from './narration/script.mjs'; import {clips} from './tools/lib/clips.mjs'; const C = clips();"
          "console.log(JSON.stringify(scenes().map(s => ({n: s.n, say: say(s.text), clip: !!C[s.n]}))))")
    return json.loads(subprocess.run(["node", "--input-type=module", "-e", js], cwd=ROOT, capture_output=True, text=True, check=True).stdout)


def sentences(text):
    return [s for s in re.split(r"(?<=[.?!])\s+", text.strip()) if s]


def direction_for(sentence, scene):
    """The delivery direction for one sentence of scene number `scene`, or None to clone with no direction.

    Breeze applies a direction to the whole generation, and the film generates one sentence at a time, so this
    decides how every line is delivered. The default gives every sentence the bake-off's direction.
    A film sets its own rule here when the user asks for one. Options: one direction for every line (the default); a different one for questions
    (sentence.endswith("?")); one per scene (a dict keyed on `scene`, e.g. a quieter close for scene 7); or None
    for lines that should stay plain. Keep each direction one or two plain sentences, as in DIRECTION."""
    return DIRECTION


def trim(x, sr):
    """cut the silence around a sentence by its loudness envelope, then fade the end. Never by pitch: pYIN marks
    long stretches of Breeze's sentence-final words unvoiced, and a pitch-based end cut real words from 18 of film 5's
    23 sentences. A take that runs on into seconds of hiss shows as a slow sentence in
    tools/glitch.py: record that scene on another seed. tools/trim_check.py tests any change here."""
    _, voiced = envelope(x, sr)
    on = np.flatnonzero(voiced)
    if len(on) == 0:
        return x
    a = max(0, int((on[0] * 0.01 - PAD) * sr)); b = min(len(x), int(((on[-1] + 1) * 0.01 + PAD) * sr))
    y = x[a:b].copy()
    n = min(len(y), int(FADE * sr)); y[len(y) - n:] *= np.linspace(1, 0, n, dtype=np.float32)
    return y


def load():
    from mlx_audio.tts.utils import load_model
    return load_model(MODEL)


def say_one(model, text, seed, **kw):
    """one generation; kw: ref_audio + ref_text to clone, instruct (+ cfg_scale) to direct or design"""
    return np.concatenate([np.asarray(r.audio, np.float32).reshape(-1) for r in model.generate(text=text, seed=seed, **kw)])


def write_mp3(x, sr, path):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(sr), "-ac", "1", "-i", "-",
                    "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "192k", path], input=x.astype(np.float32).tobytes(), check=True)


def design(args):
    import soundfile as sf
    text = " ".join(sentences(script()[0]["say"])[:2])      # the film's own opening, so the pick is made on real lines
    os.makedirs(f"{HERE}/voices", exist_ok=True)
    model = load()
    for k in range(1, args.count + 1):
        x = trim(say_one(model, text, seed=7000 + k, instruct=args.instruct, cfg_scale=GUIDANCE), model.sample_rate)
        sf.write(f"{HERE}/voices/v{k}.wav", x, model.sample_rate)
        open(f"{HERE}/voices/v{k}.txt", "w").write(text)
        print(f"narration/voices/v{k}.wav  {len(x) / model.sample_rate:.1f} s  ({args.instruct})")


def scenes(args):
    ref_text = open(os.path.splitext(args.ref)[0] + ".txt").read().strip()
    todo = [s for s in script() if "all" in args.which or not args.which or str(s["n"]) in args.which]
    model, sr = None, None
    for sc in todo:
        base = f"{args.out}/s{sc['n']:02d}"
        if sc.get("clip"):                                   # a real person's words: the clip itself plays, the narrator never speaks them
            print(f"s{sc['n']:02d} is a clip paragraph (@clip in SCRIPT.md): not recorded"); continue
        if os.path.exists(base + ".mp3") and not args.force:
            print(f"{base}.mp3 exists, skipping (--force to redo)"); continue
        model = model or load(); sr = model.sample_rate
        # the take's seed is stored in its .json, so re-recording a scene (after a trim or SAY change) keeps the take
        # that was chosen; --seed K picks a different take and is stored in turn
        prev = json.load(open(base + ".json")) if os.path.exists(base + ".json") else {}
        seed = args.seed if args.seed is not None else prev.get("seed", 0)
        parts, words, t = [], [], 0.0
        for i, sent in enumerate(sentences(sc["say"])):
            d = direction_for(sent, sc["n"])
            kw = dict(instruct=d, cfg_scale=GUIDANCE) if d else {}
            x = trim(say_one(model, sent, seed=1000 * sc["n"] + i + seed, ref_audio=args.ref, ref_text=ref_text, **kw), sr)
            wpm = lambda a: len(sent.split()) / (len(a) / sr) * 60
            if d and wpm(x) > LIMIT:                         # rushed: two calmer takes, keep whichever lands nearest the target pace
                first = wpm(x)
                takes = [x] + [trim(say_one(model, sent, seed=1000 * sc["n"] + i + seed + k, ref_audio=args.ref, ref_text=ref_text, instruct=CALM, cfg_scale=GUIDANCE), sr) for k in (0, 500)]
                x = min(takes, key=lambda a: abs(wpm(a) - TARGET))
                print(f"  pace: {first:.0f} -> {wpm(x):.0f} words a minute  |  {sent[:60]}", flush=True)
            for w in align(x, sr, sent.split()):
                words.append({"word": w["word"], "start": round(t + w["start"], 3), "end": round(t + w["end"], 3)})
            gap = PAUSE.get(sent[-1], 0.42)
            parts += [x, np.zeros(int(gap * sr), np.float32)]; t += len(x) / sr + gap
        audio = np.concatenate(parts[:-1])                   # no pause after the scene's last sentence
        os.makedirs(os.path.dirname(base), exist_ok=True)
        write_mp3(audio, sr, base + ".mp3")
        json.dump({"voiceId": "breeze:" + os.path.basename(args.ref), "model": "Breeze-TTS-2 8-bit (MLX)", "text": sc["say"],
                   "seed": seed, "duration": round(len(audio) / sr, 3), "words": words, "estimated": True},
                  open(base + ".json", "w"), indent=1)
        print(f"{base}.mp3  {len(audio) / sr:.2f} s  {len(words)} words  seed {seed}", flush=True)


if __name__ == "__main__":                       # importable, so tests can call trim() directly
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = p.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("design"); d.add_argument("count", nargs="?", type=int, default=3)
    d.add_argument("--instruct", default="A calm, middle-aged American man with a low, warm voice.")
    s = sub.add_parser("scenes"); s.add_argument("--ref", required=True); s.add_argument("which", nargs="*"); s.add_argument("--force", action="store_true")
    s.add_argument("--out", default=f"{HERE}/audio", help="folder for sNN.mp3/json (default narration/audio)")
    s.add_argument("--seed", type=int, default=None,
                   help="added to every sentence seed: an alternate take of a scene (default: the seed stored in the "
                        "scene's .json in --out, else 0). It re-rolls every sentence of the scene, so re-check any "
                        "word the user already approved there")
    a = p.parse_args()
    design(a) if a.cmd == "design" else scenes(a)
