"""bakeoff.py: compare local TTS engines on the film's narrator voice (narration/voices/w_mid.wav).
Lives in a film project as review/tts-bakeoff/ (copy this folder there). The test lines come from film 5; swap in your
own script's hardest lines (questions, twin words like lead/lead) before running.

  uv run --project ~/Developer/OmniVoice-MLX python review/tts-bakeoff/bakeoff.py gen omnivoice   (optional: needs OmniVoice-MLX)
  uv run --project ~/Developer/mlx-audio     python review/tts-bakeoff/bakeoff.py gen higgs|qwen3|breeze
  uv run --project ~/Developer/mlx-audio     python review/tts-bakeoff/bakeoff.py analyze   -> results.json

~/Developer/mlx-audio is a uv project (pyproject.toml + uv.lock: mlx-audio 0.6.4, librosa, soundfile, torch;
torch only because the Higgs codec loader reads its bf16 weights through it). Set HF_HUB_OFFLINE=1 once the
weights are cached.

Every engine clones the same reference with the same transcript. One seeded take per line.
omnivoice uses the film's own settings (narration/tts_local.py: 8-bit, 32 steps, guidance 2.0).
"para_split" mimics tts_local.py: one generation per sentence, joined with its fixed pauses.
"__dir" clips add each engine's delivery control (Higgs: a prosody tag; Breeze: a spoken direction)."""
import os, sys, re, json, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
REF = f"{ROOT}/narration/voices/w_mid.wav"
REF_TEXT = open(f"{ROOT}/narration/voices/w_mid.txt").read().strip()
CLIPS = f"{HERE}/clips"
OMNI_MODEL = os.path.expanduser("~/.cache/huggingface/hub/models--mlx-community--OmniVoice-8bit/snapshots/"
                                "b222e4d82e7bc20323be736ef05fcfc50defb71b")

# (id, what to listen for, expected end contour or None, text)
LINES = [
    ("q_open",    "yes/no question: should rise",               "rise", "Will AI create a permanent underclass?"),
    ("lead_film", "lead = LEED (an advantage)",                 None,   "If the climb stalled there, that lead could harden into a class system."),
    ("lead_pair", "LED pipes, then took the LEED",              None,   "Lead pipes poisoned the town, so the mayor took the lead on replacing them."),
    ("bass",      "BASS (fish, rhymes with mass), then BASE",   None,   "He caught a bass at dawn, then played bass in the band that night."),
    ("tear",      "TEER (crying), then TAIR (a rip)",           None,   "A tear ran down her cheek when she saw the tear in the map."),
    ("wind",      "WIND (air), then WINED (to coil)",           None,   "The wind was too strong to wind the kite string back in."),
    ("read",      "RED (past), then REED (future)",             None,   "I read the paper yesterday, and I will read the sequel tomorrow."),
    ("q_yesno",   "yes/no question: should rise",               "rise", "Does the gap ever close?"),
    ("q_decl",    "statement-shaped question: should rise",     "rise", "So the head start buys nothing?"),
    ("q_wh",      "wh-question: usually falls",                 "fall", "So who reaches each rung first?"),
    ("q_alt",     "either/or: rises on 'climb', falls at end",  "fall", "Is it the speed of the climb, or the height of the band?"),
    ("s_stmt",    "plain statement: should fall",               "fall", "The gap stops closing."),
]
PARA = ("At first the line climbs slowly, and everyone gets new tools at about the same time. Then the line splits. "
        "Capital holders reach each rung first, and the gap is widest inside the band. "
        "If the climb stalled there, that lead could harden into a class system.")
PAUSE = {".": 0.42, "?": 0.5, "!": 0.45}        # tts_local.py's silence after a sentence
HIGGS_TAG = "<|prosody:expressive_high|>"
BREEZE_DIRECTION = ("A warm, curious science narrator explaining an idea to a friend. Lively, varied pitch and natural "
                    "emphasis; questions sound like real questions.")
DIRECTED = {"higgs", "breeze"}


def sentences(text):
    return [s for s in re.split(r"(?<=[.?!])\s+", text.strip()) if s]


def jobs(engine):
    """(clip id, text, directed?, split into sentences?)"""
    out = [(i, t, False, False) for i, _, _, t in LINES]
    out += [("para_whole", PARA, False, False), ("para_split", PARA, False, True)]
    if engine in DIRECTED:
        out += [(i + "__dir", t, True, False) for i, _, c, t in LINES if c]
        out += [("para_whole__dir", PARA, True, False)]
    return out


def joined(results):
    return np.concatenate([np.asarray(r.audio, np.float32).reshape(-1) for r in results])


def engine(name):
    """returns say(text, seed, directed) -> float32 mono samples, and the sample rate"""
    import mlx.core as mx
    if name == "omnivoice":
        from omnivoice.mlx import OmniVoiceMLX
        m = OmniVoiceMLX.from_pretrained(OMNI_MODEL, dtype="float16", audio_tokenizer_device="cpu")

        def say(text, seed, directed):
            mx.random.seed(seed); np.random.seed(seed)
            a = m.generate(text=text, language="en", num_step=32, guidance_scale=2.0, speed=1.0,
                           ref_audio=REF, ref_text=REF_TEXT)[0]
            return np.asarray(a, np.float32).reshape(-1)
        return say, m.sampling_rate

    from mlx_audio.tts.utils import load_model
    if name == "higgs":
        m = load_model("bosonai/higgs-tts-3-4b")
        codes = m.encode_reference_audio(REF)

        def say(text, seed, directed):          # sampling: the card's recommendation for cloning
            t = HIGGS_TAG + text if directed else text
            return joined(m.generate(text=t, ref_audio_codes=codes, ref_text=REF_TEXT, temperature=0.8, top_k=50,
                                     max_new_tokens=1024, seed=seed))
    elif name == "qwen3":
        m = load_model("mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16")

        def say(text, seed, directed):
            mx.random.seed(seed)
            return joined(m.generate(text=text, ref_audio=REF, ref_text=REF_TEXT, lang_code="english"))
    elif name == "breeze":
        m = load_model("mlx-community/Breeze-TTS-2-mlx-8bit")

        def say(text, seed, directed):
            kw = dict(instruct=BREEZE_DIRECTION, cfg_scale=4.0) if directed else {}
            return joined(m.generate(text=text, ref_audio=REF, ref_text=REF_TEXT, seed=seed, **kw))
    else:
        sys.exit(f"unknown engine {name}")
    return say, m.sample_rate


def trim(x, sr, pad=0.04):
    import librosa
    _, (a, b) = librosa.effects.trim(x, top_db=40)
    p = int(pad * sr)
    return x[max(0, a - p): b + p]


def gen(name):
    import soundfile as sf
    os.makedirs(f"{CLIPS}/{name}", exist_ok=True)
    t0 = time.time(); say, sr = engine(name); load_s = time.time() - t0
    log = {"engine": name, "sample_rate": sr, "load_s": round(load_s, 1), "clips": {}}
    for k, (cid, text, directed, split) in enumerate(jobs(name)):
        t0 = time.time()
        if split:
            parts = []
            for i, s in enumerate(sentences(text)):
                parts += [trim(say(s, 100 * k + i, directed), sr), np.zeros(int(PAUSE.get(s[-1], 0.42) * sr), np.float32)]
            x = np.concatenate(parts[:-1])
        else:
            x = trim(say(text, 100 * k, directed), sr)
        dt = time.time() - t0
        sf.write(f"{CLIPS}/{name}/{cid}.wav", x, sr)
        log["clips"][cid] = {"text": text, "audio_s": round(len(x) / sr, 2), "gen_s": round(dt, 2)}
        print(f"{name:9s} {cid:16s} {len(x) / sr:5.2f} s audio in {dt:5.2f} s", flush=True)
    json.dump(log, open(f"{CLIPS}/{name}/gen.json", "w"), indent=1)


def syllables(text):
    words = re.findall(r"[A-Za-z']+", text)
    return sum(max(1, len(re.findall(r"[aeiouy]+", re.sub(r"e\b", "", w.lower())))) for w in words)


def pitch(path):
    """F0 contour in semitones re the clip's median (pYIN, 10 ms hop, bounds set around the 177 Hz reference)"""
    import librosa
    y, sr = librosa.load(path, sr=16000)
    f0, voiced, _ = librosa.pyin(y, fmin=100, fmax=420, sr=sr, frame_length=1024, hop_length=160)
    t = np.arange(len(f0)) * 0.01
    ok = voiced & ~np.isnan(f0) & (np.nan_to_num(f0) > 103)     # values pinned at the floor are tracking errors
    keep = np.zeros_like(ok)                                    # drop voiced blips shorter than 80 ms (clicks, breaths)
    i = 0
    while i < len(ok):
        j = i
        while j < len(ok) and ok[j] == ok[i]:
            j += 1
        if ok[i] and j - i >= 8:
            keep[i:j] = True
        i = j
    return t[keep], 12 * np.log2(f0[keep] / np.median(f0[keep])), len(y) / sr


def analyze():
    """end move: median pitch of the last 200 ms of voicing minus the 400 ms before it (semitones; + = rising).
    range: 5th to 95th percentile of pitch over the clip (semitones). A flat read has a small range."""
    res = {}
    for name in sorted(os.listdir(CLIPS)):
        meta = f"{CLIPS}/{name}/gen.json"
        if not os.path.exists(meta):
            continue
        g = json.load(open(meta)); res[name] = {}
        audio = sum(c["audio_s"] for c in g["clips"].values()); work = sum(c["gen_s"] for c in g["clips"].values())
        res[name]["_speed"] = {"audio_s": round(audio, 1), "gen_s": round(work, 1), "x_realtime": round(audio / work, 2)}
        for cid, c in g["clips"].items():
            t, st, dur = pitch(f"{CLIPS}/{name}/{cid}.wav")
            end = t[-1]
            last = st[t > end - 0.2]; before = st[(t <= end - 0.2) & (t > end - 0.6)]
            res[name][cid] = {
                "end_move_st": round(float(np.median(last) - np.median(before)), 1) if len(before) and len(last) else None,
                "range_st": round(float(np.percentile(st, 95) - np.percentile(st, 5)), 1),
                "syl_per_s": round(syllables(c["text"]) / max(t[-1] - t[0], 0.1), 2),   # over the voiced span
                "audio_s": c["audio_s"],
                "tail_s": round(dur - t[-1], 2),                 # time after the last voicing (long = trailing noise)
            }
    expect = {i: c for i, _, c, _ in LINES}
    for name, r in res.items():                          # contour hits: rise > +1 st where a rise is due, fall < -1 st
        for tag in ("", "__dir"):
            due = [(i + tag, c) for i, c in expect.items() if c and i + tag in r]
            if due:
                hits = sum((r[i]["end_move_st"] or 0) > 1 if c == "rise" else (r[i]["end_move_st"] or 0) < -1 for i, c in due)
                r["_contour" + tag] = f"{hits}/{len(due)}"
        lines = [r[i]["range_st"] for i in expect if i in r]
        r["_mean_range_st"] = round(float(np.mean(lines)), 1)
    json.dump(res, open(f"{HERE}/results.json", "w"), indent=1)
    for name, r in res.items():
        print(f"\n{name}: {r['_speed']['x_realtime']}x real time, contour {r.get('_contour')} "
              f"(directed {r.get('_contour__dir', '-')}), mean range {r['_mean_range_st']} st")
        for cid, v in r.items():
            if cid.startswith("_"):
                continue
            e = expect.get(cid.replace("__dir", ""))
            print(f"  {cid:16s} end {v['end_move_st'] if v['end_move_st'] is not None else '-':>5} st"
                  f"  range {v['range_st']:4.1f} st  {v['syl_per_s']:4.2f} syl/s  {('expect ' + e) if e else ''}")


if __name__ == "__main__":
    if sys.argv[1] == "gen":
        gen(sys.argv[2])
    elif sys.argv[1] == "analyze":
        analyze()
