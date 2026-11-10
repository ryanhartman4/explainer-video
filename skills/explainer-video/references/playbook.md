# Explainer video playbook

**How to read this now.** This is the record of films 1 to 5 and of the Bloom demo, the first film on the new engine: what was made, every setting the author approved by ear
or eye, and what went wrong. Since then the skill's default has moved to its own engine (`stage.js`,
`references/stage.md`) and a design method (`references/method.md`). This playbook stays as the reference for
everything those two do not replace:

- **Applies to both engines:** "Real data", "Voice", "Local voice: Breeze TTS 2", "Music", "Sound hits" (the sounds
  and levels; with `stage.js` the call is `film.hit` and `tools/audio.sh` runs the chain), "Last mile for X",
  "Accuracy", "Environment notes". Where a step says `node tools/build.mjs` or `sh tools/rebuild.sh`, the `stage.js`
  equivalent is `sh tools/audio.sh`; where it says `npx hyperframes render`, it is `node tools/render.mjs`.
- **Back-up engine only (HyperFrames):** "The stack", "Project layout", "The pipeline", "Scene structure",
  "A 3D character", "Parallel build", "HyperFrames gotchas", "Reusing this for the next video". The whole back-up
  process is in `assets/hyperframes/README.md`.
- **Superseded as defaults, kept as the house style of films 1 to 5:** "Visual identity" (now the `chalk` look, one
  of three) and "Directed prompt, motion numbers and the beat grid" (the numbers agree with the method's; the method
  adds the anchor picture, the beat sheet and the review tests).

How we made the Faultline explainer (2026-10-27), written so the next explainer can reuse the stack, the code and the lessons. The result: a 4:35, 1080p30 video in the 3Blue1Brown style, with word-synced ElevenLabs narration, an original music bed and a subtitle file. From first prompt to final render took one long session.

The one idea worth carrying forward: **write the script first, then make every animation fire on a spoken word.** Everything else in the pipeline follows from that.

A second film reused the pipeline on 2026-10-28: the neuron-explorer explainer (4:39, OmniVoice narration in a woman's voice, three parallel builders). Its lessons are folded into the sections below and marked *(film 2)*.

A third film followed on 2026-10-29: the steering explainer (8:37, 17 scenes, film 2's OmniVoice voice), a sequel that walks through real code on screen. Its lessons are marked *(film 3)*.

A fourth, the dopplergeo explainer (2026-11-03, 5:26), ran the subject's own script for its data; its notes are not folded in here.

A fifth, the permanent underclass explainer (2026-11-04, 1:46, 1080p60, a blog cut and an X cut), redid the author's silent chart animation with a meta-prompt's ideas: a directed prompt (GOAL, FORMAT, SHOTS, TECHNICAL, BAN LIST, MATERIALS, SOUND), motion numbers in frames, a beat grid, frame-exact sound hits, frame 0 as a poster, review rounds pointed at frames, and a 3D character (Claw'd, Three.js) inside HyperFrames. It is one continuous composition, not scenes. Its lessons are marked *(film 5)*; its `DESIGN.md` is `assets/hyperframes/references/design-example-film5.md`.

A sixth, the Bloom filter demo (2026-11-10, 1:27.5, 1080p30, a blog cut and an X cut), was the first film on `stage.js`. It was built in a cloud session on Linux, then voiced with Breeze, rendered and listened to on an Apple Silicon Mac. Its lessons are marked *(Bloom demo, v2)*; the film is `assets/demo/bloom/`.

## The stack

| Job | Tool | Version / setting |
|---|---|---|
| Video engine | HyperFrames: HTML + CSS + GSAP, rendered frame by frame in headless Chrome | `hyperframes@0.9.13` (pinned in `video/package.json`; films 1–5 were made on 0.8.209, and film 5 re-rendered on 0.9.13 matched it: SSIM 0.997, Claw'd's WebGL included) |
| Animation | GSAP timelines, plus canvas for anything with many elements | `gsap@3.14.2` from jsDelivr |
| Math type | KaTeX (Computer Modern fonts, `K.tex`) | `katex@0.16.11` via `npm pack` |
| Data type | IBM Plex Mono 300/400/500/600 | `@fontsource/ibm-plex-mono@5.0.13` |
| Narration | ElevenLabs `eleven_v4`, `convertWithTimestamps` | `@elevenlabs/elevenlabs-js@^2.74.0`, voice Eric `cjVigY5qzO86Huf0OWal` |
| Local narration (alternative) | Breeze TTS 2, 8-bit MLX, through `mlx-audio==0.6.4` in the uv project `~/Developer/mlx-audio`; one voice cloned per sentence with a spoken direction (OmniVoice-MLX before 2026-11-04) | `narration/tts_local.py` + `narration/align.py` |
| Voice shaping | Praat PSOLA through `praat-parselmouth`, then ffmpeg EQ + `loudnorm` | `tools/voice_post.sh` |
| Music | Synthesized in Python (numpy + scipy): piano, pad, bass, reverb | `tools/make_music.py` |
| Scene data | Python (numpy) on real code and real weights | `tools/make_data*.py` |
| Python runs | `uv run --python 3.12 --with <pkgs> python -I ...` | uv 0.9.15 |
| Code on screen *(film 3)* | `K.code` / `K.mark` / `K.term` panels cut from the real files | film 3's `video/lib/fl.js` |
| 3D character *(film 5)* | Three.js 0.160.1 `build/three.min.js` (the last UMD build) + `lib/three-extras.js` (RoundedBox, RoomEnvironment) + `lib/clawd.js` | `assets/hyperframes/vendor/three.min.js` in this skill (first line patched); unpatched source: `npm pack three@0.160.1`, then `package/build/three.min.js` |
| Sound hits *(film 5)* | `K.hit` in the composition, `tools/hits.mjs` (headless Chrome via the cached puppeteer-core), `tools/make_hits.py` | numpy + scipy |
| Design lint *(film 5, optional)* | Impeccable's rule-based detector, `npx -y impeccable@4.8.0 detect` (Apache 2.0, about 18 MB) | on source files and on `tools/harness.html?t=…` |
| Node | scripts, TTS, build | Node 25.2.1 |

## Project layout

```
faultline-explainer/
  SCRIPT.md            narration (the "> " lines are sent to TTS) + what each scene shows
  DESIGN.md            intent, goals, anti-goals, palette, type, what not to do
  PLAYBOOK.md          this file
  .env.local           ELEVENLABS_API_KEY (written by the ElevenLabs CLI; never print it)
  narration/
    script.mjs         parses SCRIPT.md; spoken spellings (FLT4 -> "F L T four")
    tts.mjs            npm run tts -- quota | voices | samples <id...> | scenes <id> [n|all] [--force]
    tts_local.py       the same with Breeze TTS 2 on the Mac: design [count] | scenes --ref voices/vK.wav [n|all]
    align.py           word times for audio whose text is known (no ASR model)
    audio/sNN.mp3/json raw takes + character timestamps; audio/final/ = processed
  tools/
    build.mjs          lays scenes on the clock -> video/data/timing.js + video/index.html
    voice_post.sh      deepen + de-boom + normalize -> narration/audio/final/
    deepen.py          Praat "Change gender" (pitch + formant shift, duration unchanged)
    make_music.py      the music bed, length from timing.js
    make_data.py       scene data from re-implemented formulas on a real tensor
    make_data_repo.py  scene data from running the explained repo's own code
    captions.mjs       out/captions.srt from the word timestamps
  video/               the HyperFrames project
    index.html         generated by build.mjs; do not edit
    lib/fl.js, fl.css  shared helpers and styles (K.cue, K.driver, K.glyph, ...)
    compositions/sNN.html  one sub-composition per scene
    data/              timing.js, data.js, data_repo.js
    BRIEF.md           the brief the scene builders worked from
  out/                 faultline-explainer.mp4, captions.srt
```

## The pipeline, start to finish

1. **Learn the subject and the viewer.** Clone the repo into a scratch folder and read it. Read the viewer's site and repos to set the level (the author knows KL divergence and bits per byte, so there was no ML primer).
2. **Write `DESIGN.md` and `SCRIPT.md`.** Ten scenes, each with exact narration plus Screen notes. Every number on screen cites a file in the repo. *(film 5)* Give DESIGN.md a **Directed prompt** section that fills every slot: GOAL (what the viewer should feel), FORMAT (length, size, fps, engines, scenes or one continuous shot), SHOTS (a table: narration, one hero move, secondary moves, the character's feeling), TECHNICAL, BAN LIST (it grows after each render), MATERIALS / LIGHT / NUMBERS, SOUND. Model: `assets/hyperframes/references/design-example-film5.md`.
3. **Review before spending anything.** Two fresh subagents ran at once: a fact-checker (every claim against the repo, with file:line evidence) and a builder check (what a builder would still have to guess). The fact-check caught missing credit to QTIP and the drafter authors, a misleading perplexity line, and a wrong description of Q4_K. Lock the script after this. *(film 3)* It caught a confidently wrong reason (two hooks called equal "because down_proj has no bias"; linearity gives it, and the real condition is that nothing scales the MLP output before the residual add), results presented as found that the subject's own log already had, and a closing claim wider than one prompt supports. Ask the fact-checker to search the subject's notes for every result the film presents as new, and to test each stated reason, not only each number.
4. **Set up ElevenLabs.** From the project folder: `npx -y @elevenlabs/cli@latest onboard init`, then follow its JSON (`next`, `run`, `say`). It opens an OAuth page, writes the key to `.env.local` and gitignores it. Verify with `onboard check`, never by reading the file.
5. **Pick the voice.** `npm run tts -- voices`, then `samples` for three candidates on one short line with a number in it (about 155 credits each). Variants that only change pitch can be made locally for free (see Voice).
6. **Build the scenes on placeholder timing.** `node tools/build.mjs` invents word times at 2.9 words/s when no take exists, so scenes can be built and checked before the voice is final.
7. **Generate scene data from real sources.** See "Real data".
8. **Build one exemplar scene yourself**, then hand the rest to parallel builders (see "Parallel build"). *(film 5)* A continuous film has one `film.html`: build it yourself from `assets/hyperframes/references/example-film5-continuous.html`; there is nothing to hand to parallel builders.
9. **Record the full take.** Local alternative: see "Local voice: Breeze TTS 2". With ElevenLabs: `npm run tts -- scenes <voiceId> all` (one request per scene, with the neighbouring scenes' text passed as `previousText`/`nextText` so tone carries across). Then `tools/voice_post.sh`, then `node tools/build.mjs`. Every cue retimes itself. *(film 3)* With the local voice, recording before the fact-check costs nothing: afterwards re-record only the scenes whose words changed (compare each take's words with `say(text)`).
10. **Music.** `uv run --python 3.12 --with numpy --with scipy python -I tools/make_music.py video/data/timing.js video/assets/audio/music.wav`, then `node tools/build.mjs` again so `index.html` picks it up. *(film 5)* Sound hits come next (see "Sound hits"); `tools/rebuild.sh` runs voice post, clock, captions, hits, music, hits synthesis, clock again and the glitch screen in the one safe order.
11. **Check.** `npx hyperframes@0.9.13 lint`, `npx hyperframes@0.9.13 check --samples 20 --json`, and snapshots of every scene (`snapshot --composition sNN --frames 9`). Read the contact sheets. *(film 3)* `dead_stretch` is real when the stillness is DOM: a line that arrives seconds before its words are spoken leaves nothing new to see. Cue a line on the words it shows. *(film 5)* Review in rounds pointed at frames (see "Review in rounds"); optionally run Impeccable's detector (see there).
12. **Render.** In `video/`: `npx hyperframes@0.9.13 render --quality high --fps 30 --output ../out/<name>.mp4`. About 2 minutes for 8,240 frames on the author's Mac (4 workers, hardware GPU), 37 MB. *(film 5)* At 60 fps a 1:46 film (6,350 frames, WebGL included) rendered in about 85 s. For X, render a second cut with `--variables '{"captions":true}'` and master it (see "Last mile for X").
13. **Measure the audio** (it cannot be heard from here): `ffmpeg -i out.mp4 -af ebur128=peak=true -f null -`, plus a band-limited pass for bass (`lowpass=f=120`). Then send it and ask for a listen. *(film 5)* Targets: blog cut about −18 LUFS; X cut −16 LUFS, true peak about −1.5. Check that hits still line up after AAC (cross-correlate a low-passed window around one hit against `hits.wav`; film 5 measured 0.0 ms in both cuts).
14. **Captions.** `node tools/captions.mjs` writes `out/captions.srt` (42 characters or 3.6 s per line, sentences end a line, spoken spellings turned back into written ones). *(film 2)* When the narration spells numbers out ("twenty-seven forty-two"), list each phrase in `WRITE`; the script merges a matched phrase into one timed token before cutting lines, so a number never splits across two captions. A sentence ending in `."` also ends its caption.
   *(film 3)* A spoken number followed by "'s" needs its own WRITE rule. A sentence's last word may run up to 8 characters past the line rather than sit alone in a 0.3 s caption.

## Decisions and why

### Timing: cue by word
- Each scene's timeline positions tweens with `K.cue(scene, "word", occurrence, offset)`, which reads ElevenLabs' character timestamps (grouped into words) from `timing.js`. Clock times appear nowhere.
- Result: switching from placeholder pacing to the real voice, and later re-processing the voice, needed no hand retiming.
- A cue word that is not in the narration prints a red "missing cue" line on the frame and a console error, so a snapshot catches it.
- Cue on words the TTS actually says: `FLT4` is spoken as "F L T four", so cue on a neighbouring word.

### Scene structure
- One HyperFrames sub-composition per scene (`compositions/sNN.html`), each about 25 to 32 s.
- `build.mjs` overlaps scenes by 0.8 s; each scene's opaque `#root` fades in over the previous one (`K.enter`), which gives a clean crossfade with no exit animations.
- Lead-in 0.7 s before the voice, 1.1 s after it, 2.5 s extra on the last scene for the fade to black.

### Visual identity (3Blue1Brown look)
- Canvas `#0b0c10` with a soft radial glow (no full-screen linear gradients: they band in H.264).
- Color carries meaning everywhere: blue `#58c4dd` true data and proposer, yellow `#f7d96f` the guess or chosen path, green `#83c167` pass and verifier, red `#fc6255` fail, purple `#b48fc4` map. Muted text `#8a909b` (passes contrast); `#3a3f48` for grids only.
- Two type voices: Computer Modern serif (KaTeX_Main) for ideas, IBM Plex Mono for bits, numbers and code.
- Recurring motifs tie the film together: the three role glyphs (`K.glyph`: die, check, shaded grid), a corner strip naming each part's proposer and verifier, and scene 1's pixel picture returning in scene 10.
- Motion: things draw themselves on (`K.drawOn`), dots glide; `power2/3`, `expo`, `sine` eases only, never bounce.

### Real data
- Whatever is on screen should come from running the real thing. We computed the 3INST codebook, a real Viterbi encode, the rotation's effect on a real weight matrix, Adam's pixel coder and a real Contour run.
- One weight tensor (8 MB) came from a 2.3 GB `model.safetensors` by HTTP range request: read the first 8 bytes (header length), fetch the JSON header, then fetch only the chosen tensor's byte range.
- Measuring it ourselves also checked the source: our FLT4 error (0.00455 over 96 blocks) matched Adam's roadmap (0.00462).
- Where a visual could not be real (scene 9's token probabilities), it says "illustrative" on screen.
- *(film 2)* When the repo ships only derived caches (neuron-explorer shipped `explorer/cache/*.npz` but not its sweep outputs), read the caches with numpy in your own script (`tools/make_data.py`) and quote the research log for everything else, never inventing rows. Where the log gives only ranges, draw ranges (boxes spanning lo to hi). Where it gives only a count, draw count-to-scale with positions labelled arbitrary.
- *(film 3)* When the film shows code, cut it from the real files by line range in `make_data.py`, so panels carry real line numbers, and lock those files first (a later docstring fix kept its line count so no cited line moved). Quote only runs made by the code on screen: rerun anything older on the final code before quoting it.
- *(film 3)* A measurement script that imports the explained code's own hooks (`tools/measure.py`; model in `assets/hyperframes/examples/film3/tools/`) keeps the film's numbers and the code it shows on one path.
- *(film 2)* A model's shape can come from its Hugging Face `config.json`, read through the Hugging Face MCP (`hf_fs cat`) without downloading anything.

### Voice
- **ElevenLabs set-up, per project:** `npm install @elevenlabs/elevenlabs-js`, `npm pkg set scripts.tts="node --env-file=.env.local narration/tts.mjs"`, then `npx -y @elevenlabs/cli@latest onboard init` and follow its JSON (it opens an OAuth page and writes the key to `.env.local`; verify with `onboard check`, never by printing the file). Ask before each download and before spending credits. Then `npm run tts -- voices`, `npm run tts -- samples <ids>` (about 150 credits each), `npm run tts -- scenes <voiceId> all`, and `sh tools/audio.sh` (with `stage.js`; pass `-1.5 0.97` to deepen as below) or `tools/voice_post.sh` and `node tools/build.mjs` (back-up engine).
- `eleven_v4` with stability 0.7, similarity 0.5 (the ElevenLabs narration preset). v4 has no speed or pitch control.
- The author wanted Eric "a little deeper": Praat PSOLA, −1.5 semitones with formants ×0.97 (`tools/deepen.py`). It keeps duration to the millisecond, so timestamps stay valid. Version b was −3 / 0.94.
- Raw v4 output is quiet, about −25 LUFS. Our first fix normalized to −16 LUFS, and with the deepened voice the bass nearly blew out the author's speakers. The settled chain: high-pass 90 Hz, −4 dB at 170 Hz, +2 dB at 3 kHz, `loudnorm` to −20 LUFS with true peak −3 dB. The final mix is −18 LUFS.
- Voice pace came out at about 155 words per minute: 680 words took 261 s of speech, 4:35 with gaps.

### Local voice: Breeze TTS 2 (free, offline) *(2026-11-04)*
- **When:** no credits, offline work, many re-takes, or any film the user wants made locally (the author's films 2 to 5 all were). ElevenLabs remains the engine with exact timestamps. Breeze's weights and self-hosted outputs are licensed for research and non-commercial use only, so personal and unmonetized posts. For a monetized video (X's creator revenue sharing counts; it is enrolled per account) use Higgs TTS 3 (its Creator Use Grant needs "Boson AI's Higgs Audio" credited in the audio or prominently in the post text or description) or Qwen3-TTS (Apache 2.0). `tts_local.py` runs Breeze only; port the engine from `bakeoff.py`, which has working adapters: Higgs is `load_model("bosonai/higgs-tts-3-4b")`, `encode_reference_audio()` once, then `generate(text, ref_audio_codes, ref_text, temperature=0.8, top_k=50, max_new_tokens=1024, seed)` (9.3 GB; needs torch). Higgs left a pop at the end of most clips; `trim()`'s 20 ms fade may cover it, but nobody has listened since, so have the user check. For paid work, design a new reference voice instead of cloning `w_mid.wav`, which OmniVoice (CC-BY-NC) made. `tts_local.py design` runs Breeze, which is non-commercial; Qwen3-TTS's VoiceDesign model (`mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16`, Apache 2.0, in mlx-audio as `generate_voice_design`) makes a voice from a description, but nobody has tried it here yet, so send the user the clips.
- **Why Breeze:** on 2026-11-04 the author found OmniVoice flat, wrong on "lead", and falling at the end of questions. A bake-off cloned `w_mid.wav` with four engines, one seeded take per line, loudness-matched to −20 LUFS, on a listening page where the author marked each clip. By the author's ear: heteronyms right Breeze 5/6, Higgs TTS 3 4/6, Qwen3-TTS 4/6, OmniVoice 2/6 (only OmniVoice read the film's "that lead could harden" as the metal); best take per row Breeze 6 of 7 (5 of them directed), Higgs 1. Pitch tracks: question and statement endings in the expected direction OmniVoice 3/6, Higgs 6/6, Breeze 5/6, Qwen3 4/6; mean pitch range per line 5.2, 7.0, 6.9 and 6.2 semitones. Higgs left a pop at the end of most clips. For a new model, rerun the bake-off: copy this skill's `assets/bakeoff/` into the project as `review/tts-bakeoff/`, add the engine to `bakeoff.py`, then run `bakeoff.py gen ENGINE`, `bakeoff.py analyze`, `loudmatch.py` and `build_page.py`, and give the user `review/tts-bakeoff/page/index.html` to listen to (a published page, or the folder served locally).
- **Setup (the `explainer-video-setup` skill does all of this):** an Apple Silicon Mac. The uv project `~/Developer/mlx-audio` comes from the setup skill's `tts-env/` (`pyproject.toml` named `tts-bench`, since a project named mlx-audio cannot depend on mlx-audio; a `uv.lock` pinning `mlx-audio==0.6.4`, librosa, soundfile and torch; and `.python-version` 3.12, since without it a fresh `uv sync` picks the newest Python), installed with `uv sync --frozen`. Torch is there only because mlx-audio's Higgs codec loader reads bf16 weights through it. Model: `uv run --project ~/Developer/mlx-audio hf download mlx-community/Breeze-TTS-2-mlx-8bit` (4.6 GB). Ask before each download. Run every Python step through `uv run --project ~/Developer/mlx-audio`, never the venv's own `python`.
- **Run:** `uv run --project ~/Developer/mlx-audio python narration/tts_local.py scenes --ref narration/voices/w_mid.wav all` (or `vK.wav` from `design`) (it sets `HF_HUB_OFFLINE=1`, so cache the model first), then `sh tools/rebuild.sh` for a continuous film, or `tools/voice_post.sh 0` and `node tools/build.mjs`. Film 5's seven scenes (85.5 s of speech) recorded in 3.5 minutes on the M5, model load included (about 2.5 minutes of compute per minute of speech), so record in the background while you work. The Breeze cut ran 1:46.7 against OmniVoice's 1:46, with the same cues retiming themselves; the cuts measured −18.1 and −16.0 LUFS and the hits stayed at 0.0 ms.
- **Direction:** every sentence is cloned with `instruct=direction_for(sentence, scene)` at `cfg_scale` 4. Keep the default unless the user asks for a per-line rule. The default is one direction for all lines: "A warm, curious science narrator explaining an idea to a friend. Lively, varied pitch and natural emphasis; questions sound like real questions." `direction_for()` is where a film sets its own rule (questions, a quieter close, a per-scene mood). The pitch tracker scored two of Breeze's directed takes as ending the wrong way; both were 6-semitone jumps inside 30 ms, most likely misreads, and the author picked both. Trust the user's ear over the contour number.
- **Trim by loudness, never by pitch:** Breeze sometimes runs on for 1 to 2 s of quiet hiss after the words. A first fix ended each sentence 0.18 s after its last pitched frame; the author heard words cut ("permanent undercl-"), worst near the film's end. Regenerating every sentence with its seed (generation is deterministic) showed the rule cut 0.06 to 0.77 s of speech from 18 of 23 sentences: pYIN marks long stretches of Breeze's sentence-final words unvoiced under every setting tried. `trim()` now cuts by the loudness envelope only and fades the last 20 ms. A take that ends in hiss shows as a slow sentence in `glitch.py`: re-seed it. `tools/trim_check.py` checks it: run `gen [scenes]` once (it writes untrimmed sentences, which do not depend on `trim()`), then `test` after every change to `trim()`. `test` finds the trimmed audio inside each raw take and fails if it starts after or ends before any frame within 25 dB of the sentence's peak, or has no fade; it fails the old pitch trim on 18 of film 5's 23 sentences.
- **Design:** `tts_local.py design 3 --instruct "A calm, middle-aged American man with a low, warm voice."` uses Breeze's voice design (a spoken description, no reference). Films 2 to 5 cloned `w_mid.wav`, an OmniVoice design, so Breeze's design mode has not been judged yet.
- **Why design-then-clone:** a design alone gives a slightly different speaker on every call. Cloning the chosen clip keeps one speaker across the film. Generation is seeded per sentence, so a re-run reproduces a scene.
- **Word timing without ASR:** each sentence is generated alone (exact boundaries; pauses of 0.42 s after "." and 0.5 s after "?" are set by the script), then `align.py` places its words: pauses are found with an RMS envelope, matched in order to the sentence's punctuation by dynamic programming over talking-time position, and words between anchors share time by estimated spoken length (digits read out). Checked against ElevenLabs' timestamps on this film: 0.17 s mean error, 0.38 s at p90, 77% of words within 0.25 s. Fine for cues that ease in; for frame-tight cues, run `npx hyperframes transcribe` (Whisper, one model download) on the audio and map its words onto the script.
- **Levels:** raw Breeze scenes measure −20.0 to −21.7 LUFS (OmniVoice's were about −25.5); `voice_post.sh` brings each to −20.
- **Mix level *(Bloom demo, v2)*:** the first `stage.js` mix read −20.6 LUFS, peak −4.9 dBFS, against the −18 target. `mix.py` decoded every file with ffmpeg's `-ac 2`, which takes 3 dB off a mono source, and voice takes are mono. Decoding a mono file as mono and copying it to both channels gave −17.4 LUFS, peak −2.5. The X master of that mix read −16.0 LUFS, true peak −1.5, and the thump hit stayed at 0.0 ms in both cuts. When a mix reads about 3 dB under target with the approved levels untouched, check the channel conversion first.
- **Women's voices *(film 2, OmniVoice)*:** OmniVoice's pitch tags barely moved a female voice. Nine designs ("female, middle-aged, {low, moderate, high} pitch, american accent", three each) landed between 147 and 190 Hz median F0, with "moderate" lowest, and one "high" clip came out broken. For pitch options, take one design and shift it with `tools/deepen.py`: −2.5 st with formants ×0.98, unshifted, and +2.5 st with formants ×1.02 gave 153, 177 and 204 Hz from one speaker. Measure F0 with parselmouth (`to_pitch(pitch_floor=75, pitch_ceiling=500)`) and send the clips for the user to pick. Clone the unshifted clip; if they pick a shifted one, pass the shift to `voice_post.sh ST FR` so the whole take moves together. The author picked the unshifted 177 Hz voice.
- **Pace and alternate takes *(film 3)*:** the same cloned voice read 1,325 words at 163 words a minute (494 s of speech, 8:37 with gaps). `tts_local.py scenes … --seed K --out DIR` renders an alternate take; a fast sentence that paces the same across seeds comes from the text (letter spellings like "C P U"), not a glitch.
- **Speed and pace *(film 2, OmniVoice)*:** about a minute of compute per scene (10 scenes, 266 s of speech, about 10 minutes), so record in the background while the scenes are built. The cloned voice spoke at about 163 words a minute: 721 words fit in 4:39.
- **Glitch screen *(film 2)*:** you cannot listen, so compute syllables per second for each sentence from the word times (mean 4.3, sd 0.5 on film 2). Look for outliers past about 1.8 sd. Short lines and deliberate slow lines ("Push, read, compare.") are false alarms; a long sentence far off the mean is worth regenerating with a new seed. Pitch tracks and syllable rates cannot hear a word read as its twin (lead/lead, tear/tear): ask the user to listen, and respell any such word in `SAY`.
- **Alternate takes *(local voice)*:** `tts_local.py scenes … N --force --seed K --out narration/audio/altK` re-seeds every sentence of scene N, so re-check any word the user already approved in that scene; screen it with `glitch.py narration/audio/altK`; to use it, copy its `sNN.mp3` and `sNN.json` over `narration/audio/` and run `sh tools/rebuild.sh`. Each take's `.json` stores its `seed`, and `scenes` without `--seed` reuses it, so re-recording after a trim or `SAY` change keeps the chosen takes. Compare paces across seeds only on takes trimmed correctly: film 5's first seed comparison ran on clipped takes and proved nothing. Because generation is deterministic, rerunning `scenes` with the same seeds after a `trim()` change rebuilds the same takes with the new trim.
- **A line heard as fast can be a quiet ending *(Bloom demo, v2)*:** the author heard "Sometimes a false yes." come in fast. Its seed 0 take ran 1.25 s, and an RMS envelope of the raw take in 50 ms windows showed the cause: the first 0.7 s peaked at −14 to −18 dB, and the last 0.55 s, most likely the word "yes", never rose above −27 dB. On seed 3 the line ran 1.58 s with peaks of −12 and −15 dB in its second half, and the author called it "way better". When a line is called fast, look at the envelope of its last word before treating it as pace.
- **Choosing among seeds *(Bloom demo, v2)*:** a new seed re-records every sentence of the scene, so record three or four seeds (a 5 s scene takes about 15 s each), list every sentence's duration per seed, and take the seed that moves the flagged line and leaves its neighbours where they were. For the demo's close the three lines ran 1.25, 1.25 and 1.73 s on seed 0. Seed 1 left the flagged line unchanged (1.26 s). Seeds 2 and 4 slowed it but also moved the last line by 0.33 and 0.68 s. Seed 3 gave 1.25, 1.58 and 1.72 s, so only the flagged line changed. Keep the replaced take in its own `narration/audio/altN_K` folder, and tell the user the neighbouring lines are new takes too.
- **The syllable counter overcounts *(Bloom demo, v2)*:** `glitch.py` counts vowel groups, so "Sometimes" scores 4 and "switched" 2. It flagged "Sometimes a false yes." at 5.6 syllables a second when the true rate was 4.0 (5 syllables in 1.25 s). Recount a flagged short line by hand before reading the number as pace. That flag still found the one line the author heard as wrong, for the reason in "A line heard as fast", so a flagged short line earns a look at its envelope. The other two flags were false alarms by the author's ear: "Add cat: three bits." (2.22 s on seed 0, 2.42 s on seed 1, so the pace comes from the text) and "Nothing ever switched it on, so owl was never added." (about 5.1 a second).
- **OmniVoice (the local voice until 2026-11-04):** runtime at `~/Developer/OmniVoice-MLX` (`git clone https://github.com/ailuntx/OmniVoice-MLX`, `uv sync --extra mlx --python 3.12`), model `mlx-community/OmniVoice-8bit` (1.4 GB), CC-BY-NC. Its voice tags (male/female, age, pitch, accent) made `w_mid.wav`. It also takes CMU phonemes inline (`[L IY1 D]`), but those split into three words for `align.py`; respell in `SAY` instead.

### Music
- Synthesized in code so there is nothing to license or download (3Blue1Brown's own music by Vince Rubinetti is copyrighted). D major, 72 BPM, one chord per bar: Dadd9, F#m7, Bm7, Gmaj7, D/F#, Gadd9, Em7, Asus4 to A. Additive-synthesis piano arpeggios, a detuned low-passed pad, a soft bass, and a 2.6 s noise-impulse reverb. Full level is about −15.7 LUFS.
- Ducking is a HyperFrames `data-automation` volume lane written by `build.mjs` from the word timings: 0.55 at the start, 0.11 under the voice, 0.4 between scenes, a swell before the end, then 0. The author approved this level.

### Directed prompt, motion numbers and the beat grid *(film 5)*
- **One hero move per shot.** Secondary moves travel 50–70% as far and start 6–12 frames later; ambient motion (Claw'd breathes at 1.2%, sways its arms at 3%) stays under 5% of the hero's and never stops.
- **Numbers in frames at 60 fps**, kept in `K.M` (`lib/fl.js`): enter `power3.out` 24 frames, exit `power2.in` 16 (exits shorter), across the screen `power2.inOut` 45, stagger 3, text holds still 8 frames before it moves, linear only for progress. Only a character's posture springs (`back.out`); chart elements, opacity and colour never bounce.
- **Beat grid.** 72 BPM at 60 fps is exactly 50 frames a beat and 200 a bar, so every beat is a frame. Compute beats from absolute time (`K.beat(i) = 60 i / 72`), never by summing. `build_continuous.mjs` starts each paragraph's voice on a beat (or a bar, for a paragraph whose first word fires a layout change); `K.snap(t)` moves layout cues to the nearest eighth note (at most 0.21 s, inside `align.py`'s word-time error). `make_music.py`'s bars start at t = 0 on the same grid. Events that follow a curve (where a line crosses a rung) stay off the grid.
- **Ban list** (film 5's): purple-to-blue gradients, glow, lens flares, decorative particles, everything fading in at once, fade-and-slide-up on every element, centred-everything, text that moves while it is read, bounce on chart elements, more than 3 flashes a second. Text writes on with a clip-path reveal or fades in place.
- **Accessibility.** Text contrast at least 4.5:1 on every frame; no label changes colour more than once per 20 frames.

### Sound hits *(film 5)*
- The composition calls `K.hit(kind, t, opts)` exactly where it schedules each visual event (a dot landing on a rung, the line entering the band, a strike-through). `tools/hits.mjs` mounts the film through `tools/harness.html` in HyperFrames' own headless Chrome (the puppeteer-core in `~/.npm/_npx`, SwiftShader WebGL; nothing downloaded), reads `window.__hits` and writes `video/data/hits.json`. `tools/make_hits.py` synthesizes each hit on its exact sample: glassy ticks, Karplus-Strong plucks on D major pentatonic up the ladder, a felt-mallet thump, a wooden thock, a pencil scratch, bells. `hits.wav` is one more audio clip in `index.html`.
- Order after any timing change: `build.mjs`, `hits.mjs`, `make_hits.py`, `build.mjs` (or `tools/rebuild.sh`).
- Picture first: the film must work muted (X autoplays muted). Hits sit about 12 dB under the voice: the gains in `make_hits.py`'s `SOUNDS` table set the level (film 5's `hits.wav` peaked at −6.2 dBFS); the script only caps the peak at −1 dBFS.

### A 3D character *(film 5)*
- Three.js renders inside a HyperFrames composition like any canvas: the look is a pure function of a pose object and t, and `K.driver` redraws the WebGL canvas on the timeline's onUpdate. `WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true })`, rendered at 2× and shown at 1×. Two renders of the spike matched MD5 on all 540 frames.
- `lib/clawd.js` builds Claw'd from the Claude Code terminal glyph (`▐▛███▜▌ / ▝▜█████▛▘ / ▘▘ ▝▝`; a quadrant is 1 wide and 2 tall): body 12×8×5, eye slits 1×2, arm stubs, four legs. Material per the meta-prompt cookbook: non-metal, IOR 1.5 (4% reflectance), satin roughness 0.5, thin clearcoat; glossy eyes. Light: key 2.2, fill 1.1 (2:1, soft), a rim from behind to separate it from the dark canvas; RoomEnvironment at 0.45; FOV 35°, camera 12° above.
- What the spike's frames taught: keep the body within a quarter radian of the camera (a −0.5 rad turn hid the face and the arm read as a snout); depth 5, not 7 (a cube loses the glyph); linear tone mapping at 0.9 (ACES and AgX wash Claude's coral toward peach); keep slits slit-shaped (squashed and tilted they read as dead pixels); gaze reach 0.7 across, 0.5 up or down, saturating at 900 px across and 600 px up.
- Expression without a mouth: the eyes carry it (height, width, tilt, gaze), posture backs it up smaller. `K.EMOTIONS` (neutral, curious, uneasy, tense, alarmed, glad, attentive, lift, relieved, calm), `K.feel` (tweens from the last emotion; calls in time order), `K.feelInit` (frame 0, no tween), `K.hop`, `K.sigh` (an exhale), `K.relief` (lift, exhale with the eyes shut, eyes open: the author's pick), a seeded blink schedule with a `blink` weight to hold the eyes on key beats.
- When an expression is the user's call, render two or three candidates side by side and let them pick (`spike/relief/` in film 5, where the author combined two of them). Asking the author to fill pose numbers in code did not work.
- A character that stands for the AI needs a staging check: film 5's fact-check found that serious, then relieved, a glad hop and a stare at the camera read as the AI pleased to escape control. Name what the character must never read as in DESIGN.md's anti-goals.

### Last mile for X *(film 5)*
- Frame 0 is the preview: compose it as a poster (the question, the key image, the character), with no fade-in from black.
- X autoplays muted, so the X cut burns captions in. This ffmpeg has no libass, so the composition draws them: `captions.mjs` also writes `video/data/captions.js`, `index.html` declares a `captions` variable (`data-composition-variables`) and hands it to the film as `window.__FILM_VARS`, and `render --variables '{"captions":true}'` turns them on. Keep a strip (film 5: y 982–1058) clear in both cuts, and give captions at least 0.3 em of padding.
- Master: `sh tools/master_x.sh out/NAME-x-raw.mp4 out/NAME-x.mp4` (two-pass `loudnorm` to −16 LUFS, TP −1.5, LRA 7, `linear=true`, video copied, AAC 192k at 48 kHz, `-movflags +faststart`). Then `uv run -q --python 3.12 --with numpy --with scipy python -I tools/sync_check.py out/NAME-x.mp4` (thump hits, low-passed at 150 Hz; under 8 ms is in sync). Typed by hand in zsh, write `${VAR}` inside filter strings: `$OFF:linear` reads as a `:l` modifier and eats the `l`.

### Review in rounds, and Impeccable *(film 5)*
- Each round: snapshot the moments that changed (`--at`), read them, write one or two follow-ups as frames and numbers ("the arrowhead shows at 71.6 s, before the line arrives"), fix, re-snapshot only those moments. Film 5 took four rounds; every fix was a number or a cue word.
- `tools/harness.html` mounts the film in any browser (serve the project root, open `/tools/harness.html`); `?t=62` freezes 62 s and `?captions=1` turns captions on. It expects `compositions/film.html` to follow the contract in `assets/hyperframes/references/example-film5-continuous.html` (a nested `<template>`, `#film-root`, `window.__timelines["film"]`).
- Impeccable (`npx -y impeccable@4.8.0 detect <files or URL> --viewport 1920x1080 --json`): 62 rules, no model. Source scan of `compositions/` and `lib/`; URL scan of `harness.html?t=…` at a few moments (about 10 s each). On film 5 it caught real things (captions with cramped padding; a one-side accent border on code lines, its "side-tab" tell, in film 3's `K.code` CSS) and agreed with HyperFrames on contrast and type size. Two findings are always false for a video: `content-hidden-at-rest` (later text waits at opacity 0) and `shape-assembled-illustration` (a data chart). Its model-based `critique` needs `npx impeccable install`, which adds skills and hooks to Claude Code: ask the user first.

### Real clips *(the engine's `clip()`, 2026-11-10; only when the user asked for clips)*
- The idea and the fetching method come from Adam Hartman's explainer kit, which used real quotes in its films. The cutting and the on-screen node are this skill's own (`tools/clips.py`, `references/stage.md` "Clips").
- **Find the words first.** `yt-dlp --skip-download --write-auto-subs --sub-format vtt -o clips/talk URL` writes the talk's automatic subtitles; search the `.vtt` for the phrase to get its time. Then confirm by listening or by reading around it that the speaker is the person and not a host quoting them.
- **Fetch only the seconds needed.** `yt-dlp --download-sections "*326-346" --force-keyframes-at-cuts -f mp4 -o clips/karpathy.mp4 URL` takes a 20 s piece: pad the quote by about 2.5 s each side, then set the exact start and end on the `@clip` line. `yt-dlp` is a download (`brew install yt-dlp`): ask the user first, with the name, source and size. Video sites refuse cloud machines, so fetch on the user's own computer, or have them hand you the file.
- **Never synthesize a real person's voice.** Use their recording with their name and the source on screen, or paraphrase in the narrator's own words and say who said it.
- **What was tested:** one clip cut from a local file, in both the 16:9 and the 9:16 cut: the picture matched its source frames, the render repeated exactly with 1, 3 and 6 workers, and the cut's sound measured −20.4 LUFS. Not tested: a clip fetched from a video site, a clip whose sound is noisy (the word times come from pauses and get worse with noise), and a published film that used one.

### Parallel build
- *(film 5)* Applies to scene films only. A continuous film is one composition; build it yourself and give subagents the reviews (fact-check, builder check, skill test).
- First build the shared library (`lib/fl.js`, `lib/fl.css`), the data, the timing pipeline and one finished exemplar scene. Prove the pipeline with a snapshot before anyone else starts.
- Then write `video/BRIEF.md` (file contract, helpers, data fields, craft bar, check loop, boundaries) and start three builder subagents, each owning separate scene files and its own snapshot folder. They only edit their own files and report shared-file problems instead of fixing them.
- Review every contact sheet yourself, send fixes back to the builder that owns the scene (it keeps its context), and re-check on the real voice timing at the end.
- *(film 2)* Builders can start as soon as the script is locked and the exemplar works, while the voice is still recording: cue-placed tweens retime when `build.mjs` reruns. Fold the builder check's per-scene notes (layouts, which occurrence of a repeated cue word, where a value comes from) into BRIEF.md as a "Scene notes" section. One canonical owner per shared motif (cards reused in a later scene go to the same builder).
- *(film 2)* Builders check facts too: placing each token on screen, one caught that a word was in a neuron's logit lens and not its steer lens, which the fact-checker missed. Answer such questions fast and fix SCRIPT.md and BRIEF.md to match.
- *(film 3)* Two exemplars, one per kind of scene (a stack-and-cards scene and a code-and-equation scene), and a shared lib holding the film's motifs (`K.card`, `K.code`, `K.term`, `K.row`) let three builders pass review on their first report. The builder check's per-scene notes carried the traps: which occurrence of a repeated cue word, cues on spelled-out acronyms ("MPS" is spoken "M P S", so it can't be a cue), and code widths (a panel needs about 36 + size × (3.2 + 0.6 × characters) px, and nothing wraps).
- *(film 3)* Builders found shared-file bugs and worked around them locally; collect them from their reports into the project's PLAYBOOK before the next film.

### Accuracy
- Credit borrowed ideas on screen and in narration (here: QTIP for the trellis, hash and rotation; LiquidAI and z-lab for the drafters).
- Use the metric that does not flatter: top-1 agreement beside KL divergence instead of a near-identical perplexity.
- Show real numbers as they are, even when they are awkward (Contour's Good-Turing estimate jumps from 1.0 to 0 at the last round; the panel shows all three stop conditions so that makes sense).
- *(film 2)* Check the git history for co-authors: 15 of 20 neuron-explorer commits were co-authored by Claude, and the research log's first-person author spoke of the owner in the third person, so the narration said "Lyra's neuron explorer, built with Claude".
- *(film 2)* Every quote carries its own provenance: which run, which prompt, which dose and in which units. Neuron-explorer's quotes came from three runs (a first-contact run in abs-max units, a 21-neuron pilot and the main sweep), and the draft had merged them. Tag each card with its dose and run.
- *(film 2)* Read early log entries against later corrections. The draft described weight links from an entry written before the repo's sign audit; with signs applied, one link pointed at the opposite pole and another at unrelated tokens.
- *(film 3)* Test the reasons as well as the numbers: a mechanism stated as fact ("exactly equal because there is no bias") can be wrong while every number around it is right.
- *(film 3)* When the film reproduces someone's results, say so on screen with line numbers ("Lyra's log records the same opening lines"), and credit their method where the film's test follows it.
- *(film 3)* Scope the closing claim to what was tested ("needs N8347 to finish the name", on one prompt), label weaker evidence as weaker on screen, and keep units honest (GiB vs GB; a parameter count that includes a vision encoder).
- *(film 2)* Name things by measurement, never by meaning, when the source does ("L22 N2742, whose lens reads alien", never "the alien neuron"). Neuron-explorer's own copy rule says it presents information and makes no claims.
- *(film 5)* For an argument (not a repo), check the narration against the chart it draws ("human labor stops mattering" contradicted a rung above the band), keep conditional claims conditional ("if takeoff is fast"), and find the premise the ending rests on (relief that an AI nobody owns treats people well). The author chose to name it in the film as an open question.
- *(film 5)* A brace or span must measure the honest interval (time in the band runs from the first line's entry to the last line's exit, twice what the blue line alone gave).
- *(film 5)* Verify citations carried in from earlier AI answers: two in the author's April notes did not exist under those titles.
- *(film 5)* A mascot that is someone's brand gets an on-screen fan-art notice (Claw'd: "not made or endorsed by Anthropic").

## HyperFrames gotchas we hit

- A sub-composition is wrapped in `<template id="sNN-template">`, and its root is `<div data-composition-id="sNN" id="root" ...>`. Style the root with `#root { ... }` inside the template's own `<style>`; a `#root` rule in a linked stylesheet is not rewritten and lint warns.
- Every `font-family` name needs an `@font-face` or lint fails, fallbacks included (a bare "Newsreader" fallback broke lint).
- `K.driver` state keys must not share a name with a GSAP option (`snap`, `ease`, `delay`, `stagger`, `repeat`, `yoyo`): GSAP reads them as options and the key never animates.
- The renderer drops whitespace between inline elements in static markup ("Step one:" + "rotate" rendered as "Step one:rotate").
- Two tweens on the same property of the same element that overlap in time trigger `gsap_tween_tail`; the earlier one can win.
- An `<audio>` slot (`data-duration`) longer than its file triggers `clip_media_fit`; `build.mjs` probes the real length with ffprobe.
- `check`'s `dead_stretch` cannot see canvas changes, so canvas-heavy scenes get false "nothing moves" warnings. Trust the contact sheet.
- Snapshots: `--composition sNN --frames 9 -o .hyperframes/<dir>` samples one scene; `--at` uses root-timeline seconds.
- Deterministic only: no `Math.random()` (use `K.rng(seed)`), no `Date.now()`, no async timeline construction, no `repeat: -1`.
- *(film 2)* In a full-page render, scenes are built while hidden. GSAP then reads CSS percent transforms as 0 and drops `translate(-50%)` on the first tween, and `offsetWidth` returns 0. Use `xPercent`/`yPercent` and keep layout reads out of draw functions. `--composition` snapshots hide this; full-page `--at` snapshots and the render show it, so check every scene at least once with `--at` (root seconds) before rendering.
- *(film 3)* `K.drawOn` animates only the stroke: a filled shape shows its fill from frame 0 (start `fill-opacity` at 0), and it replaces `stroke-dasharray`, so a dashed line turns solid (reveal it with `scaleY`).
- *(film 3)* Every scene root has `id="root"`; never look one up by id in the shared DOM.
- *(film 3)* Mono text wraps at hyphens (`Xeno-|888`): wrap hyphenated words in a nowrap span. Chips in a narrow grid column wrap too and break a row's height.
- *(film 3)* Code panels: keep syntax nearly monochrome (keywords bold, comments and strings muted) so colour keeps its meaning, and never elide silently: film 3's `K.code` inserts a "…" row wherever shown line numbers jump.
- *(film 3)* The last scene needs about 5 s past the voice for credits and a fade; `build.mjs` now adds 5 s (it was 2.5).
- *(film 2)* `document.querySelector('[data-composition-id="sNN"]')` matches the host clip in `index.html` before the scene's own root. `K.enter` still works (it fades the host), but DOM appended there escapes the scene's styles. Append to an element of your own.
- *(film 2)* Images over 2 MB are not inlined. Convert screenshots to JPEG at about 1.35× display width (`sips -s format jpeg -s formatOptions 88 --resampleWidth 2600`), which leaves headroom for a push-in.
- *(film 2)* CJK tokens render through the system font fallback with no declared font, and lint stays clean.
- *(film 5)* 0.9 lint rejects a template literal inside a selector (`template_literal_selector`: "the HTML bundler's CSS parser crashes on these"), and it inlines `lib/` scripts when it checks a composition: build selectors by concatenation (`fl.js` now does). After a bump, `npx hyperframes@latest upgrade --project video` moves `package.json`'s pins.
- *(film 5)* HeyGen's skills (`hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use`, `gsap`, `website-to-hyperframes`) live in `~/.agents/skills`, some linked from `~/.claude/skills`; `npx hyperframes skills update` (0.9.11+) refreshes them at the CLI's release tag and overwrites both copies. Back up with `cp -RL` (a plain `cp -R` copies the links). Never edit them: keep our lessons in this playbook.
- *(film 5)* `check` skips WebGL draws, so its `dead_stretch` cannot see a 3D character move, and its `text_occluded` treats a transparent canvas as opaque: keep text out of the character's canvas box.
- *(film 5)* Composition variables from `render --variables` reach the top level only; read them in `index.html` and pass them on (`window.__FILM_VARS`). `snapshot` takes no `--variables`: flip the default in the generated `index.html`, snapshot, then rerun `build.mjs`.
- *(film 5)* `three.min.js` r160 opens with `console.warn(...),` as the first operand of a comma expression: replace the call with `0`; deleting the line breaks the script.
- *(film 5)* Inserting a segment into a schedule array shifted `SEG[4]` (the arrowhead fired at the wrong segment's end): index from the end (`SEG.at(-1)`). Appending a comment to a line that holds two statements turned the second into comment text (Claw'd's vertical gaze died); one statement per line.
- *(film 2)* `check` craft warnings flag text under a 28 px phone floor. These films are watched on a desktop, so 22 px footnotes can stay; text below 22 px should only be texture (e.g. cards shrunk to a faded row).

## Environment notes (macOS)

- zsh: `echo =====` is an error (`=` expansion); quote globs like `--include='*.md'`; `set -- $var` does not split words. macOS has no `timeout`.
- Keep video projects off the iCloud-synced Desktop; renders write thousands of files. Default to `~/Movies/<name>`. *(film 2)* If the user asks for the project elsewhere (film 2 went on the Desktop), say what iCloud will sync and follow their call. With the local voice there is no `node_modules`, so the cost is mainly the MP4 and `music.wav`.
- *(film 2)* Never `uv run` inside a cloned repo: uv syncs that repo's `pyproject.toml` and downloads its dependencies (it pulled torch on film 2). Run from your own folder with `--no-project` and pass the repo's paths as arguments.
- Auto mode blocks running code from a cloned outside repo until the user approves it in chat. Re-implementing the formulas in our own script is the fallback; running the real code needs the user's OK.
- Downloads (packages, model files) need the user's explicit OK with name, source and size; put them in their own scratch folder, run Python on them with `-I`.
- ElevenLabs free plan: 10,000 credits a month (renews the 11th). This video used 3,692: three-voice samples, a Brian sample, a test clip and the full 3,800-character take.
- *(film 3)* Keep one torch install per machine. Before installing, look in the uv cache (`~/.cache/uv/archive-v0/*/torch-*.dist-info/WHEEL`, note its Python tag) and run `uv sync --offline --python <that version>`; share the env with `uv run --frozen --project <its project>`.
- *(film 3)* A dev server launched by the app's browser pane from a project under `~/Desktop` hung in `getcwd` (macOS privacy control). Start it from Bash and attach the pane by URL.
- *(film 5)* Never keep video work in the session scratchpad (`/private/tmp/claude-501/...`): macOS cleared it, and the 2026-10-19 ManimGX draft was lost. Film 5 rebuilt it from the session transcript by replaying its Write and Edit calls. Spikes go in the project (`spike/`).
- *(film 5)* zsh's `${VAR}` vs `$VAR:x` modifiers (see "Last mile for X"); a background `http.server` for a scan is stopped with `lsof -ti tcp:PORT | xargs kill`.
- *(Bloom demo, v2)* A render test that passes on Linux says nothing about macOS: run it on both. To test that renders repeat, render `--from A --to B --silent` twice over a stretch where text enters, and compare `ffmpeg -v error -i X.mp4 -f framemd5 -` for the two files; then compare `--workers 1` against the default. The first `stage.js` engine passed on Linux and failed on macOS: where "definitely not" entered at a fractional pixel offset (`translate(960px, 844.64px)`), Chrome's pixels depended on the frame that page had drawn before, and `render.mjs` handed frames to pages in a different order each run. The difference was invisible (PSNR 76 dB), and neither a second `requestAnimationFrame` nor `--disable-gpu` removed it. The fix is in `tools/lib/browser.mjs` (`seek()` repaints the whole stage) and `tools/render.mjs` (page k always draws frames k, k + workers, ...). After it, 6 workers against 2 gave 0 differing frames of 2,625, for 2 s more on a 22 s render. To find such a cause, test one page: reach the same time directly and by way of a nearby earlier time, and compare the two images.
- *(Bloom demo, v2)* In zsh a variable holding a command with its arguments (`PY="uv run -q --python 3.12 python -I"`, then `$PY script.py`) runs as one word and fails with "command not found". Write the command out, or split it with `${=PY}`. `tools/audio.sh` is safe because it runs under `sh`.

## Reusing this for the next video (back-up engine)

1. Set the project up as `assets/hyperframes/README.md` step 4 says (`node scripts/new_film.mjs <project> --hyperframes` after `hyperframes init`), and copy `assets/hyperframes/references/builder-brief-example.md` as the start of `video/BRIEF.md`.
2. Run the ElevenLabs onboarding in the new folder (keys are per project).
3. Rewrite `DESIGN.md` and `SCRIPT.md`; keep the "> " narration format and the Screen notes.
4. Update spoken spellings in `narration/script.mjs` and their reverse in `tools/captions.mjs`.
5. Replace the data scripts with ones for the new subject; keep the rule that on-screen numbers are computed or cited.
   *(film 3)* Start `lib/` from the newest film whose motifs fit (film 3's, in `assets/hyperframes/examples/film3/lib/`, has the code, terminal, card and row helpers), not only from the template.
6. Follow the pipeline above from step 3.
7. *(film 5)* For a film that never cuts (a chart, one diagram): copy `tools/build_continuous.mjs` over `tools/build.mjs`, write one `compositions/film.html` with `id="film-root"` on its container, and cue with `K.at` (root time). `tools/hits.mjs`, `harness.html` and `rebuild.sh` assume that layout. For a character, start from `lib/clawd.js` and `assets/hyperframes/vendor/three.min.js`.
